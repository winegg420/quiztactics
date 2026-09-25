-- 650 · DÜELLO "KATEGORİ KALKANI" (Ida onayı, 25 Eyl 2026)
--
-- Kural: her oyuncunun maç başına 1 ücretsiz kalkan hakkı var (joker/skill sistemine girmez,
-- envanterde değil, sayaçlarını etkilemez). Rakip kategori seçerken (kategori fazı, sen
-- SAVUNANSIN) uygun kategorilerinden birini o seçim için kapatırsın. Rakip seçince (ya da süre
-- dolup otomatik seçilince) kalkan biter; kategori sonraki turlarda normal açılır.
--   · Maçta 1 kez; yalnız "uygun" kategori (duello2_kategori_uygun_mu) korunabilir.
--   · Koruma saldırana en az 1 uygun kategori bırakmıyorsa red.
--   · Kategori fazında en az duello2_kalkan_son_sn (5) sn kalmışken; faz ilerlediyse red, hak harcanmaz.
--   · Uzatmada yok. Zayıf nokta kuralı AYNEN (savunan kendi zayıfını da koruyabilir).
--   · Yalnız surum = 2 maçlar.
--
-- Veri: duellolar.kalkan1 / kalkan2 (jsonb; null = hak duruyor, dolu = {kategori, idx, tur}).
-- "Aktif kalkan" ayrı kolon değil: savunanın kalkanı ŞU ANKİ tur indeksine (tur*2 + saldiri_sirasi)
-- aitse ve faz 'kategori' ise o kategori kapalıdır (duello2_aktif_kalkan). Tur indeksi ilerleyince
-- kalkan kendiliğinden biter. duello_hamleler.kalkan: o turda korunan kategori (maç sonu özeti).
--
-- Kapı TEK yerde: duello2_kategori_uygun_mu aktif kalkanı uygun saymaz → saldıranın seçimi,
-- süre dolunca otomatik seçim ve bot seçimi hep birlikte uyar. Uygunluğu atlayan iki "son yedek"
-- dal (duello2_otomatik_kategori, duello2_bot_kategori) da kalkanlı kategoriyi dışlar.
--
-- Fonksiyon gövdeleri CANLIDAN (pg_get_functiondef, 25 Eyl 2026) alındı; yalnız işaretli satırlar yeni.
-- Yetki: yeni RPC duello2_kalkan yalnız authenticated (Ida'nın görev tanımı); yeni iç fonksiyonlar
-- istemciye kapalı (mevcut kalıp). Var olan hiçbir yetki değişmedi (CREATE OR REPLACE ACL'yi korur).

-- ---------------------------------------------------------------- kolonlar + ayarlar
alter table public.duellolar add column if not exists kalkan1 jsonb;
alter table public.duellolar add column if not exists kalkan2 jsonb;
alter table public.duello_hamleler add column if not exists kalkan text;

comment on column public.duellolar.kalkan1 is '650 Kategori Kalkanı (oyuncu1): null = hak duruyor; {kategori, idx, tur} = kullanıldı (idx = tur*2 + saldiri_sirasi)';
comment on column public.duellolar.kalkan2 is '650 Kategori Kalkanı (oyuncu2): null = hak duruyor; {kategori, idx, tur} = kullanıldı';
comment on column public.duello_hamleler.kalkan is '650: bu hamlede savunanın kalkanla koruduğu kategori (yoksa null)';

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello2_kalkan_acik', '1', 'Düello Kategori Kalkanı açık mı (1/0). Maç başına 1 ücretsiz hak (650)'),
  ('duello2_kalkan_son_sn', '5', 'Kategori Kalkanı: kategori fazında en az bu kadar sn kalmışken kullanılabilir (650)'),
  ('duello2_bot_kalkan_yuzde', '12', 'Bot savunanken kalkan kullanma olasılığı (%, canı 1 değilken; her kategori fazında bir kez zar) (650)'),
  ('duello2_bot_kalkan_kritik_yuzde', '45', 'Bot savunanken canı 1 ise kalkan kullanma olasılığı (%) (650)')
on conflict (anahtar) do nothing;

-- ---------------------------------------------------------------- aktif kalkan
create or replace function public.duello2_aktif_kalkan(p_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select k ->> 'kategori'
    from (select x.*, case when x.saldiran = x.oyuncu1 then x.kalkan2 else x.kalkan1 end k
            from public.duellolar x where x.id = p_id) s
   where s.surum = 2 and s.faz = 'kategori' and not coalesce(s.uzatma, false)
     and (s.k ->> 'idx')::int = s.tur * 2 + s.saldiri_sirasi;
$$;
revoke all on function public.duello2_aktif_kalkan(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- uygunluk (470 + 650)
create or replace function public.duello2_kategori_uygun_mu(p_id uuid, p_kategori text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_kategori = any(public.duello_kategorileri())
     and p_kategori is distinct from (select h.kategori from public.duello_hamleler h
                                       where h.duello_id = p_id order by h.id desc limit 1)
     and (select count(*) from public.duello_hamleler h
           where h.duello_id = p_id and h.kategori = p_kategori and not h.uzatma)
         < public.ayar_sayi('duello_kategori_max', 2)
     -- 650: savunanın bu seçim için kalkanla koruduğu kategori seçilemez
     and p_kategori is distinct from public.duello2_aktif_kalkan(p_id);
$$;

-- ---------------------------------------------------------------- kalkan kapısı (insan + bot)
-- null = kullanılabilir; değilse oyuncuya gösterilecek Türkçe neden. Çağıran satırı kilitlemiş olmalı.
create or replace function public.duello2_kalkan_engel(p_id uuid, p_user uuid, p_kategori text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.duellolar%rowtype;
  v_savunan uuid;
  v_diger int;
begin
  select * into d from public.duellolar where id = p_id;
  if not found then return 'Düello bulunamadı'; end if;
  if d.durum <> 'aktif' then return 'Düello bitti'; end if;
  if coalesce(d.surum, 1) <> 2 or public.ayar_sayi('duello2_kalkan_acik', 1) <> 1 then
    return 'Kategori Kalkanı bu maçta yok';
  end if;
  if d.uzatma then return 'Uzatmada Kategori Kalkanı kullanılamaz'; end if;
  if d.faz <> 'kategori' then return 'Kategori Kalkanı yalnız rakip kategori seçerken kullanılır'; end if;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  if p_user is distinct from v_savunan then return 'Kategori Kalkanı yalnız rakip kategori seçerken kullanılır'; end if;
  if (case when p_user = d.oyuncu1 then d.kalkan1 else d.kalkan2 end) is not null then
    return 'Kategori Kalkanını bu maçta zaten kullandın';
  end if;
  if d.faz_bitis - clock_timestamp() < make_interval(secs => public.ayar_sayi('duello2_kalkan_son_sn', 5)) then
    return 'Kategori Kalkanı için süre çok az kaldı';
  end if;
  if p_kategori is null or not public.duello2_kategori_uygun_mu(p_id, p_kategori) then
    return 'Bu kategori zaten seçilemez, korumaya gerek yok';
  end if;
  select count(*) into v_diger from unnest(public.duello_kategorileri()) k
   where k <> p_kategori and public.duello2_kategori_uygun_mu(p_id, k);
  if v_diger < 1 then return 'Rakibe seçebileceği kategori kalmaz, bu kategori korunamaz'; end if;
  return null;
end $$;
revoke all on function public.duello2_kalkan_engel(uuid, uuid, text) from public, anon, authenticated;

create or replace function public.duello2_kalkan_uygula(p_id uuid, p_user uuid, p_kategori text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.duellolar
     set kalkan1 = case when oyuncu1 = p_user
                        then jsonb_build_object('kategori', p_kategori, 'idx', tur * 2 + saldiri_sirasi, 'tur', tur)
                        else kalkan1 end,
         kalkan2 = case when oyuncu2 = p_user
                        then jsonb_build_object('kategori', p_kategori, 'idx', tur * 2 + saldiri_sirasi, 'tur', tur)
                        else kalkan2 end,
         son_hareket = now()
   where id = p_id;
end $$;
revoke all on function public.duello2_kalkan_uygula(uuid, uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------- RPC (istemci)
create or replace function public.duello2_kalkan(p_id uuid, p_kategori text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.duellolar%rowtype;
  v_engel text;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);   -- FOR UPDATE: kategori seçimiyle aynı kilit → yarış yok
  v_engel := public.duello2_kalkan_engel(p_id, auth.uid(), p_kategori);
  if v_engel is not null then raise exception '%', v_engel; end if;
  perform public.duello2_kalkan_uygula(p_id, auth.uid(), p_kategori);
  perform public.duello_sinyal_ver(p_id);
end $$;
revoke all on function public.duello2_kalkan(uuid, text) from public, anon;
grant execute on function public.duello2_kalkan(uuid, text) to authenticated;

-- ---------------------------------------------------------------- süre dolunca otomatik seçim
create or replace function public.duello2_otomatik_kategori(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.duellolar%rowtype;
  v_zayif text;
  v_kat text;
begin
  select * into d from public.duellolar where id = p_id;
  v_zayif := (case when d.saldiran = d.oyuncu1 then d.profil2 else d.profil1 end) ->> 'zayif';
  select k into v_kat from unnest(public.duello_kategorileri()) k
   where public.duello2_kategori_uygun_mu(p_id, k)
   order by (k is not distinct from v_zayif), random() limit 1;   -- zayıf kategori en sona
  if v_kat is null then
    -- 650: son yedek de kalkanlı kategoriyi seçmez
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where k is distinct from public.duello2_aktif_kalkan(p_id)
     order by random() limit 1;
  end if;
  return v_kat;
end $$;

-- ---------------------------------------------------------------- bot kategori seçimi
create or replace function public.duello2_bot_kategori(p_id uuid, p_bot uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kat text;
  d public.duellolar%rowtype;
  v_rakip_oran jsonb;
  v_r double precision := random() * 100;
  v_zayif double precision := public.ayar_sayi('duello2_bot_zayif_secim_yuzde', 65);
  v_guclu double precision := public.ayar_sayi('duello2_bot_guclu_secim_yuzde', 20);
begin
  select * into d from public.duellolar where id = p_id;
  v_rakip_oran := case when d.oyuncu1 = p_bot then d.profil2 else d.profil1 end -> 'oranlar';

  if v_r < v_zayif and v_rakip_oran is not null then
    -- Rakibin en zayıf iki uygun kategorisinden biri (hep aynısı olmasın).
    select z.k into v_kat from (
      select k from unnest(public.duello_kategorileri()) k
       where public.duello2_kategori_uygun_mu(p_id, k)
         and jsonb_typeof(v_rakip_oran -> k) = 'number'
       order by (v_rakip_oran ->> k)::int asc, random()
       limit 2) z
     order by random() limit 1;
  elsif v_r >= v_zayif + v_guclu then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by random() limit 1;
  end if;

  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by public.bot_kategori_isabet(p_bot, k) desc, random()
     limit 1;
  end if;
  if v_kat is null then
    -- 650: son yedek de kalkanlı kategoriyi seçmez
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where k is distinct from public.duello2_aktif_kalkan(p_id)
     order by random() limit 1;
  end if;
  return v_kat;
end $$;

-- ---------------------------------------------------------------- botun koruyacağı kategori
-- Botun kendi en zayıf İKİNCİ kategorisi (en zayıf = zayıf noktası; onu korumak saldıranın riskini
-- kaldırır, akıllı oyuncu genelde yapmaz). Oranı yoksa rastgele uygun kategori. Güvenlik kapısı
-- (≥ 1 uygun kalır) çağıranda duello2_kalkan_engel ile.
create or replace function public.duello2_bot_kalkan_kategori(p_id uuid, p_bot uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.duellolar%rowtype;
  v_profil jsonb;
  v_oran jsonb;
  v_zayif text;
  v_kat text;
begin
  select * into d from public.duellolar where id = p_id;
  v_profil := case when d.oyuncu1 = p_bot then d.profil1 else d.profil2 end;
  v_oran := v_profil -> 'oranlar';
  v_zayif := v_profil ->> 'zayif';
  if v_oran is not null and jsonb_typeof(v_oran) = 'object' then
    if v_zayif is null then
      select k into v_zayif from unnest(public.duello_kategorileri()) k
       where jsonb_typeof(v_oran -> k) = 'number'
       order by (v_oran ->> k)::numeric asc, k limit 1;
    end if;
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where jsonb_typeof(v_oran -> k) = 'number'
       and k is distinct from v_zayif
       and public.duello2_kategori_uygun_mu(p_id, k)
     order by (v_oran ->> k)::numeric asc, random() limit 1;
  end if;
  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by random() limit 1;
  end if;
  return v_kat;
end $$;
revoke all on function public.duello2_bot_kalkan_kategori(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- bot tiki (269/351 + 650)
create or replace function public.duello2_bot_tik(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.duellolar%rowtype;
  v_bot uuid;
  v_n int := 0;
  v_kat text;
  v_gecikme double precision;
  v_min double precision := public.ayar_ondalik('duello2_bot_kategori_min_sn', 1.5);
  v_max double precision := public.ayar_ondalik('duello2_bot_kategori_max_sn', 4);
  v_dc smallint;
  v_cevap smallint;
  v_kat_bas timestamptz;
  v_idx int;
begin
  -- Maç satırı kilitliyse (oyuncu eylemi / başka tik) bu tikte atla.
  select * into d from public.duellolar where id = p_id and surum = 2 for update skip locked;
  if not found or d.durum <> 'aktif' then return 0; end if;
  perform public.duello2_ilerlet(p_id);

  for v_bot in select p.id from public.profiles p
                where p.id in (d.oyuncu1, d.oyuncu2) and coalesce(p.is_bot, false) loop
    select * into d from public.duellolar where id = p_id;
    -- Kopuk oyuncu varken maç donar; bot da bekler.
    exit when d.durum <> 'aktif' or d.kopuk_at is not null;

    -- ---------- 650: kategori kalkanı (bot savunanken, hakkı duruyorsa) ----------
    -- Her kategori fazında bir kez zar (tohum: maç + tur indeksi); an fazın 1–4. saniyesi
    -- (tik aralığı yüzünden en geç +6 sn). Saldıran ondan önce seçtiyse faz geçmiştir — normal.
    if d.faz = 'kategori' and d.saldiran <> v_bot and not d.uzatma
       and (case when v_bot = d.oyuncu1 then d.kalkan1 else d.kalkan2 end) is null
       and public.ayar_sayi('duello2_kalkan_acik', 1) = 1 then
      v_idx := d.tur * 2 + d.saldiri_sirasi;
      v_kat_bas := d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8));
      if now() >= v_kat_bas + make_interval(secs => 1 + 3 * public.bot_rasgele('d2klkz:' || p_id::text || ':' || v_idx))
         and now() < v_kat_bas + interval '6 seconds'
         and public.bot_rasgele('d2klk:' || p_id::text || ':' || v_idx) * 100
             < (case when (case when v_bot = d.oyuncu1 then d.can1 else d.can2 end) <= 1
                     then public.ayar_sayi('duello2_bot_kalkan_kritik_yuzde', 45)
                     else public.ayar_sayi('duello2_bot_kalkan_yuzde', 12) end) then
        v_kat := public.duello2_bot_kalkan_kategori(p_id, v_bot);
        if v_kat is not null and public.duello2_kalkan_engel(p_id, v_bot, v_kat) is null then
          perform public.duello2_kalkan_uygula(p_id, v_bot, v_kat);
          perform public.duello_sinyal_ver(p_id);
          v_n := v_n + 1;
          select * into d from public.duellolar where id = p_id;
        end if;
      end if;
    end if;

    -- ---------- kategori ----------
    if d.faz = 'kategori' and d.saldiran = v_bot
       and now() >= d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8))
                    + make_interval(secs => v_min + (v_max - v_min)
                        * public.bot_rasgele('d2kat:' || p_id::text || ':' || d.tur || ':' || d.saldiri_sirasi)) then
      v_kat := public.duello2_bot_kategori(p_id, v_bot);
      perform public.duello2_soru_ac(p_id, v_kat);
      perform public.duello_sinyal_ver(p_id);
      v_n := v_n + 1;
      select * into d from public.duellolar where id = p_id;
    end if;

    -- ---------- skill + cevap (saldırı, savunma, uzatma) ----------
    if d.faz = 'cevap' and not (d.cevaplar ? v_bot::text) and d.soru_baslangic is not null then
      v_gecikme := public.duello2_bot_cevap_gecikme(p_id, v_bot);
      -- Skill anı: cevap gecikmesinin %35–75'i (bot cevapladıktan sonra skill kullanılamaz).
      if now() >= d.soru_baslangic + make_interval(secs => v_gecikme * (0.35 + 0.4
             * public.bot_rasgele('d2skz:' || p_id::text || ':' || (d.tur * 2 + d.saldiri_sirasi) || ':' || v_bot::text))) then
        if public.duello2_bot_skill_dene(p_id, v_bot) then
          v_n := v_n + 1;
          select * into d from public.duellolar where id = p_id;
          v_gecikme := public.duello2_bot_cevap_gecikme(p_id, v_bot);   -- Soru Değiştir süreyi baştan başlatır
        end if;
      end if;

      if now() >= d.soru_baslangic + make_interval(secs => v_gecikme) then
        -- İsabet KATEGORİYE göre (botun kişiliği: güçlü/zayıf kategoriler).
        select dogru_cevap into v_dc from public.questions where id = d.soru_id;
        if random() < public.bot_soru_isabet(v_bot, d.kategori, d.soru_id) then
          v_cevap := v_dc;
        else
          select x into v_cevap from generate_series(0, 3) x
           where x <> v_dc and not (x = any(coalesce(case when v_bot = d.oyuncu1 then d.elli1 else d.elli2 end, '{}')))
           order by random() limit 1;
        end if;
        begin
          perform public.duello2_bot_cevap(p_id, v_bot, v_cevap);
          v_n := v_n + 1;
        exception when others then
          -- Süre kaçtıysa soru "Yanıtsız" çözümlenir (duello2_ilerlet).
          raise warning 'duello2_bot_tik % cevap: %', p_id, sqlerrm;
        end;
      end if;
    end if;
  end loop;
  return v_n;
end $$;

-- ---------------------------------------------------------------- çözümle (600 + 650: hamleye kalkan)
create or replace function public.duello2_cozumle(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.duellolar%rowtype;
  v_dc smallint;
  v_savunan uuid;
  v_c_sal smallint;
  v_c_sav smallint;
  v_d_sal boolean;
  v_d_sav boolean;
  v_kaybeden uuid;
  v_idx int;
  v_o uuid;
  v_c smallint;
  v_zayif_saldiri boolean;
  v_kalkan jsonb;
  v_kalkan_kat text;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'cevap' then return; end if;

  v_idx := d.tur * 2 + d.saldiri_sirasi;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  select dogru_cevap into v_dc from public.questions where id = d.soru_id;
  v_c_sal := (d.cevaplar -> d.saldiran::text ->> 'cevap')::smallint;
  v_c_sav := (d.cevaplar -> v_savunan::text ->> 'cevap')::smallint;
  v_d_sal := v_c_sal is not null and v_c_sal = v_dc;   -- Yanıtsız = doğru değil
  v_d_sav := v_c_sav is not null and v_c_sav = v_dc;

  -- 650: bu hamlenin kategori seçiminde savunanın kalkanı (maç sonu özeti için)
  v_kalkan := case when v_savunan = d.oyuncu1 then d.kalkan1 else d.kalkan2 end;
  v_kalkan_kat := case when not d.uzatma and (v_kalkan ->> 'idx')::int = v_idx then v_kalkan ->> 'kategori' end;

  -- 470: saldıran savunanın ZAYIF kategorisini seçtiyse (uzatma hariç — orada kimse seçmez).
  -- 600: zayıf noktası olmayan savunanda ->> 'zayif' NULL → karşılaştırma NULL → riskli (NOT NULL) yazılamıyor,
  -- tur çözülemiyor, maç 'aktif' asılı kalıyordu. NULL = zayıf yok = false.
  v_zayif_saldiri := coalesce(not d.uzatma and d.kategori is not null
    and d.kategori = (case when v_savunan = d.oyuncu1 then d.profil1 else d.profil2 end) ->> 'zayif', false);

  v_kaybeden := case when v_zayif_saldiri and v_d_sav then d.saldiran   -- savunan bildi → saldıran (ikisi doğru olsa da)
                     when v_d_sal and not v_d_sav then v_savunan
                     when v_d_sav and not v_d_sal then d.saldiran
                     else null end;

  update public.duellolar
     set can1 = greatest(can1 - (case when v_kaybeden = oyuncu1 then 1 else 0 end), 0),
         can2 = greatest(can2 - (case when v_kaybeden = oyuncu2 then 1 else 0 end), 0),
         dogru1 = dogru1 + (case when (oyuncu1 = d.saldiran and v_d_sal) or (oyuncu1 = v_savunan and v_d_sav) then 1 else 0 end),
         dogru2 = dogru2 + (case when (oyuncu2 = d.saldiran and v_d_sal) or (oyuncu2 = v_savunan and v_d_sav) then 1 else 0 end),
         faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello_sonuc_sn', 3)),
         son_hamle = jsonb_build_object(
           'surum', 2, 'tur', d.tur, 'saldiri_sirasi', d.saldiri_sirasi, 'uzatma', d.uzatma,
           'saldiran', d.saldiran, 'savunan', v_savunan, 'kategori', d.kategori,
           'soru_id', d.soru_id, 'dogru_cevap', v_dc, 'can_kaybeden', v_kaybeden,
           'zayif_saldiri', v_zayif_saldiri, 'kalkan', v_kalkan_kat,
           'cevaplar', jsonb_build_object(
             d.saldiran::text, jsonb_build_object('cevap', v_c_sal, 'dogru', v_d_sal, 'yanitsiz', v_c_sal is null),
             v_savunan::text, jsonb_build_object('cevap', v_c_sav, 'dogru', v_d_sav, 'yanitsiz', v_c_sav is null))),
         son_hareket = now()
   where id = p_id;

  insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, cevap, dogru,
                                      riskli, can_kaybeden, zaman_baskisi, savunma_kilidi,
                                      surum, uzatma, cevap_saldiran, dogru_saldiran,
                                      yanitsiz_saldiran, yanitsiz_savunan, kalkan)
  values (p_id, d.tur, d.saldiran, v_savunan, d.kategori, d.soru_id, v_c_sav, v_d_sav,
          v_zayif_saldiri, v_kaybeden, d.zaman_baskisi, false,
          2, d.uzatma, v_c_sal, v_d_sal, v_c_sal is null, v_c_sav is null, v_kalkan_kat);

  foreach v_o in array array[d.saldiran, v_savunan] loop
    v_c := case when v_o = d.saldiran then v_c_sal else v_c_sav end;
    perform public.kategori_istatistik_yaz(v_o, d.kategori, v_c is not null and v_c = v_dc);
    if v_c is not null and v_c = v_dc then perform public.kategori_dogru_arttir(v_o, d.kategori); end if;
    if v_c is not null then perform public.soru_sayac(d.soru_id, v_c = v_dc); end if;
  end loop;

  delete from public.skill_ikinci_sans_denemeleri
   where mac_tur = 'duello' and mac_id = p_id and soru_index = v_idx;
end $$;

-- ---------------------------------------------------------------- durum (327/470 + 650: kalkan)
-- Gövde canlıdan; yeni: gecmis satırında kalkan + savunan, sonda kalkan nesnesi.
create or replace function public.duello2_durum(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_savunan uuid;
  v_ben1 boolean;
  v_idx int;
  v_dil text := public.oyuncu_dili();
  v_soru jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_gecmis jsonb;
  v_sayim jsonb;
  v_benim jsonb;
  v_bu_soruda int;
  v_rakip_soruda boolean;
  v_ilk smallint;
  v_kilit text;
begin
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  v_idx := d.tur * 2 + d.saldiri_sirasi;

  -- Soru iki oyuncuya AYNI ANDA görünür: yalnız cevap/sonuç fazında (saldıran önceden görmez).
  if d.soru_id is not null and (d.faz in ('cevap', 'sonuc') or d.durum <> 'aktif') then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(d.soru_id, v_dil) sd;
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object('ben', count(*) filter (where x.kazanan = v_me),
                              'rakip', count(*) filter (where x.kazanan = v_rakip))
      into v_ezeli
      from public.duellolar x
     where x.durum = 'bitti'
       and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me));
  end if;

  if d.durum = 'bitti' then
    v_odul := jsonb_build_object(
      'lig_puan', case when d.dereceli and d.kazanan = v_me
                       then floor(public.ayar_sayi('lig_duello_galibiyet', 50) * d.odul_carpan)::int else 0 end,
      'coin', coalesce((select sum(h.miktar) from public.coin_hareketleri h
                         where h.user_id = v_me and h.tur = 'mac' and h.referans = 'duello:' || p_id::text), 0));
  end if;

  -- Maç sonu özeti: her soru, doğru cevap ve "şık işaretlenmedi" (yanitsiz) bilgisi.
  if d.durum <> 'aktif' then
    select coalesce(jsonb_agg(jsonb_build_object(
             'tur', h.tur, 'uzatma', h.uzatma, 'kategori', h.kategori, 'saldiran', h.saldiran,
             'soru', sd.soru, 'secenekler', sd.secenekler, 'dogru_cevap', q.dogru_cevap,
             'benim_cevabim', case when h.saldiran = v_me then h.cevap_saldiran else h.cevap end,
             'ben_dogru', case when h.saldiran = v_me then h.dogru_saldiran else h.dogru end,
             'ben_yanitsiz', case when h.saldiran = v_me then h.yanitsiz_saldiran else h.yanitsiz_savunan end,
             'rakip_dogru', case when h.saldiran = v_me then h.dogru else h.dogru_saldiran end,
             'rakip_yanitsiz', case when h.saldiran = v_me then h.yanitsiz_savunan else h.yanitsiz_saldiran end,
             'can_kaybeden', h.can_kaybeden,
             'kalkan', h.kalkan, 'savunan', h.savunan) order by h.id), '[]'::jsonb)   -- 650: kalkan
      into v_gecmis
      from public.duello_hamleler h
      join public.questions q on q.id = h.soru_id
      left join lateral public.soru_dilinde(h.soru_id, v_dil) sd on true
     where h.duello_id = p_id;
  end if;

  select coalesce(jsonb_object_agg(s.kategori, s.n), '{}'::jsonb) into v_sayim
    from (select h.kategori, count(*) n from public.duello_hamleler h
           where h.duello_id = p_id and not h.uzatma group by h.kategori) s;

  select jsonb_build_object('kullanilan', coalesce(sum(s.n), 0),
                            'sayilar', coalesce(jsonb_object_agg(s.tur, s.n), '{}'::jsonb))
    into v_benim
    from (select k.tur, count(*) n from public.joker_kullanimlari k
           where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id group by k.tur) s;
  select count(*) into v_bu_soruda from public.joker_kullanimlari k
   where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = v_idx;
  v_rakip_soruda := exists (select 1 from public.joker_kullanimlari k
   where k.user_id = v_rakip and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = v_idx);
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = v_idx;

  v_kilit := case
    when d.faz <> 'cevap' or d.durum <> 'aktif' then 'Soru açık değil'
    when d.cevaplar <> '{}'::jsonb or v_ilk is not null
      or exists (select 1 from public.skill_ikinci_sans_denemeleri s
                  where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx)
      then 'Cevap verildikten sonra soru değiştirilemez'
    when v_rakip_soruda then 'Rakibin bu soruda skill kullandı, soru değiştirilemez'
    when v_bu_soruda >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then 'Bu soruda skill hakkını kullandın'
    else null end;

  return jsonb_build_object(
    'surum', 2,
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'tur', d.tur, 'max_tur', public.ayar_sayi('duello_max_tur', 10), 'saldiri_sirasi', d.saldiri_sirasi,
    'uzatma', d.uzatma,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', clock_timestamp(),   -- 325: yanıtın çıktığı an
    'ben', v_me, 'saldiran', d.saldiran, 'savunan', v_savunan,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can1, 'dogru', d.dogru1, 'profil', d.profil1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can2, 'dogru', d.dogru2, 'profil', d.profil2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'kategori_max', public.ayar_sayi('duello_kategori_max', 2),
    'kategori_sayim', v_sayim,
    'uygun_kategoriler', case when d.faz = 'kategori' then
        (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from unnest(public.duello_kategorileri()) k
          where public.duello2_kategori_uygun_mu(p_id, k)) end,
    'kategori', d.kategori,
    'soru', v_soru,
    -- Rakibin CEVAPLADIĞI görünür, NE cevapladığı görünmez.
    'cevap', case when d.faz = 'cevap' then jsonb_build_object(
        'benim_bitis', case when v_ben1 then d.bitis1 else d.bitis2 end,
        'rakip_bitis', case when v_ben1 then d.bitis2 else d.bitis1 end,
        'ben_cevapladim', d.cevaplar ? v_me::text,
        'benim_cevabim', d.cevaplar -> v_me::text -> 'cevap',
        'rakip_cevapladi', d.cevaplar ? v_rakip::text,
        'elli_kapali', to_jsonb(case when v_ben1 then d.elli1 else d.elli2 end),
        'ikinci_sans_ilk_cevap', v_ilk) end,
    'son_hamle', d.son_hamle,
    'skill', jsonb_build_object(
       'set', to_jsonb(public.skill_setim('duello')),   -- 327: Düello seti
       'izinli', to_jsonb(public.duello2_izinli_skiller()),
       'toplam_hak', public.ayar_sayi('duello2_skill_toplam_hak', 4),
       'tur_basi_hak', public.ayar_sayi('duello2_skill_tur_basi_hak', 2),
       'soru_basi_hak', public.ayar_sayi('duello2_skill_soru_basi_hak', 1),
       'kullanilan', v_benim -> 'kullanilan',
       'sayilar', v_benim -> 'sayilar',
       'bu_soruda', v_bu_soruda,
       'rakip_bu_soruda', v_rakip_soruda,
       'soru_degistir_kilit', v_kilit,
       'envanter', (select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb)
                      from public.joker_envanter e where e.user_id = v_me),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me)),
    'sureler', jsonb_build_object(
       'kategori', public.ayar_sayi('duello2_kategori_sn', 8),
       'cevap', public.ayar_sayi('duello2_cevap_sn', 15),
       'ek_sure', public.ayar_sayi('duello_ek_sure_sn', 5),
       'zaman_baskisi_eksi', public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5),
       'sonuc', public.ayar_sayi('duello_sonuc_sn', 3),
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25),
       -- 325: sayaç bu andan önce tam süreyi gösterir (ekran fazı geç görse de hızlanmaz).
       'gosterim_payi_ms', public.ayar_sayi('duello_gosterim_payi_ms', 1200),
       'gosterim_bas', case d.faz
          when 'kategori' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8))
          when 'cevap' then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  )
  -- 650: Kategori Kalkanı — iki oyuncunun hakkı (null = hazır; dolu = kullanıldı + kategori) ve
  -- varsa şu anki seçimde korunan kategori (uygun_kategoriler onu zaten içermez).
  || jsonb_build_object('kalkan', jsonb_build_object(
       'acik', d.surum = 2 and public.ayar_sayi('duello2_kalkan_acik', 1) = 1,
       'son_sn', public.ayar_sayi('duello2_kalkan_son_sn', 5),
       'oyuncular', jsonb_build_object(d.oyuncu1::text, d.kalkan1, d.oyuncu2::text, d.kalkan2),
       'aktif', public.duello2_aktif_kalkan(p_id)));
end $function$;
