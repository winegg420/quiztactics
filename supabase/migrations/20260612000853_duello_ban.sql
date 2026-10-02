-- 853 · Düello: SAVUNMA BANI (Ida, 2 Eki 2026)
--
-- Kural: her normal turda, saldıran kategori seçmeden ÖNCE savunan 1 kategoriyi banlar (duello_ban_sn, 5 sn).
-- Savunan, kendi bir önceki savunmasında banladığı kategoriyi arka arkaya banlayamaz (sonraki savunmada yine
-- banlayabilir). Saldıran kalan kategorilerden seçer; banlı kategori seçilemez. Süre dolarsa ban yok, tur normal
-- devam eder. Altın Soru turlarında ban yok. Hamle / kilit / Kalkan / joker kuralları DEĞİŞMEZ.
--
-- Faz makinesi: sonuc → ban → kategori → cevap → sonuc. Yeni faz 'ban' yalnız Hâkimiyet maçında (surum 2) açılır.
-- Bayrak duello_ban_acik = 0 iken 'ban' fazına hiç girilmez: eski akış AYNEN (sonuc → kategori).
--
-- Veri: duellolar.ban_kategori (bu turun banı; yeni tur başında boşalır), son_ban1 / son_ban2 (oyuncunun EN SON
-- savunmasındaki banı; o savunmada ban yapmadıysa boş).
-- Yetki: duello_ban_sec yalnız authenticated; iç yardımcılar kimseye açık değil. Mevcut fonksiyonlar CREATE OR
-- REPLACE ile değişir (yetkileri aynen kalır). Canlıdaki son tanımlardan hedefli yamayla üretildi.

-- ---------------------------------------------------------------- veri
alter table public.duellolar
  add column if not exists ban_kategori text,
  add column if not exists son_ban1 text,
  add column if not exists son_ban2 text;

comment on column public.duellolar.ban_kategori is '853: bu turda savunanın banladığı kategori (yeni tur başında boşalır)';
comment on column public.duellolar.son_ban1 is '853: oyuncu1''in en son savunmasındaki banı (arka arkaya aynı ban yasağı)';
comment on column public.duellolar.son_ban2 is '853: oyuncu2''nin en son savunmasındaki banı (arka arkaya aynı ban yasağı)';

alter table public.duellolar drop constraint if exists duellolar_faz_check;
alter table public.duellolar add constraint duellolar_faz_check
  check (faz = any (array['kategori'::text, 'hazirlik'::text, 'cevap'::text, 'sonuc'::text, 'altin'::text, 'ban'::text]));

-- ---------------------------------------------------------------- ayarlar (koda gömülmez)
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_ban_acik', '1'::jsonb, 'Düello: savunma banı açık mı (1/0). 0 iken ban fazı hiç açılmaz, eski akış aynen'),
  ('duello_ban_sn', '5'::jsonb, 'Düello: savunanın ban seçme süresi (sn); dolarsa ban yok'),
  ('duello_ban_ilk_tur_ek_sn', '3'::jsonb, 'Düello: yalnız 1. turda ban süresine eklenen pay (sn) — maç açılışı / VS ekranı')
on conflict (anahtar) do nothing;

-- ---------------------------------------------------------------- kategori kapıları: banlı kategori seçilemez
create or replace function public.duello2_kategori_uygun_mu(p_id uuid, p_kategori text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p_kategori = any(public.duello_kategorileri())
     and p_kategori is distinct from public.duello2_aktif_kalkan(p_id)          -- 650 (kapalı; geçmiş için)
     and public.duello_kategori_kapsam_uygun(p_id, p_kategori)                  -- 652
     and not exists (select 1 from public.duellolar d                           -- 680: kilit
                      where d.id = p_id and coalesce(d.hakimiyet, false)
                        and coalesce((d.kilitler ->> p_kategori)::int, 0) >= d.tur)
     and not exists (select 1 from public.duellolar d                           -- 853: savunma banı
                      where d.id = p_id and d.ban_kategori = p_kategori);
$function$;

-- Eski (surum 1) kapı: aynı dışlama (yeni maç bu yoldan geçmez; ban_kategori orada hep boştur).
create or replace function public.duello_kategori_uygun_mu(p_id uuid, p_user uuid, p_kategori text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p_kategori = any(public.duello_kategorileri())
     and p_kategori is distinct from (select h.kategori from public.duello_hamleler h
                                       where h.duello_id = p_id and h.saldiran = p_user
                                       order by h.id desc limit 1)
     and (select count(*) from public.duello_hamleler h
           where h.duello_id = p_id and h.saldiran = p_user and h.kategori = p_kategori)
         < public.ayar_sayi('duello_kategori_max', 2)
     and not exists (select 1 from public.duellolar d                           -- 853: savunma banı
                      where d.id = p_id and d.ban_kategori = p_kategori);
$function$;

create or replace function public.duello2_otomatik_kategori(p_id uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare v_kat text;
begin
  -- Süre doldu: uygun kategorilerden rastgele (853: banlı kategori uygun değildir).
  select k into v_kat from unnest(public.duello_kategorileri()) k
   where public.duello2_kategori_uygun_mu(p_id, k)
   order by random() limit 1;
  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where k is distinct from public.duello2_aktif_kalkan(p_id)
       and k is distinct from (select x.ban_kategori from public.duellolar x where x.id = p_id)   -- 853
     order by random() limit 1;
  end if;
  return v_kat;
end $function$;

-- ---------------------------------------------------------------- ban fazı
-- Ban fazını açar: yeni tur 'kategori' fazına geçtikten hemen sonra çağrılır. Bayrak kapalıysa, maç Hâkimiyet
-- değilse ya da Altın Soru'daysa hiçbir şey değişmez (yalnız önceki turun banı temizlenir).
create or replace function public.duello2_ban_baslat(p_id uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare d public.duellolar%rowtype;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found then return; end if;
  if d.ban_kategori is not null then
    update public.duellolar set ban_kategori = null where id = p_id;
  end if;
  if public.ayar_sayi('duello_ban_acik', 1) <> 1 then return; end if;
  if d.durum <> 'aktif' or d.faz <> 'kategori' or not coalesce(d.hakimiyet, false) or coalesce(d.uzatma, false) then
    return;
  end if;
  update public.duellolar
     set faz = 'ban',
         faz_bitis = now()
           + make_interval(secs => public.ayar_sayi('duello_ban_sn', 5)
               + case when d.tur = 1 then public.ayar_sayi('duello_ban_ilk_tur_ek_sn', 3) else 0 end)
           + public.duello2_gosterim_payi()
   where id = p_id;
end $function$;

-- Ban fazını kapatır: p_kategori = banlanan kategori; null = ban yok (süre doldu / bot pas geçti).
-- Savunanın "son banı" bu savunmanın sonucuyla yazılır (ban yoksa boşalır → bir sonraki savunmada her şey serbest).
create or replace function public.duello2_ban_bitir(p_id uuid, p_kategori text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_savunan1 boolean;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'ban' then return; end if;
  v_savunan1 := d.saldiran <> d.oyuncu1;
  update public.duellolar
     set ban_kategori = p_kategori,
         son_ban1 = case when v_savunan1 then p_kategori else son_ban1 end,
         son_ban2 = case when v_savunan1 then son_ban2 else p_kategori end,
         faz = 'kategori',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
         son_hareket = now()
   where id = p_id;
end $function$;

-- Kural kapısı: kategori şu an saldıranın seçebileceği bir kategori olmalı (kilitli / kapsam dışı banlanmaz),
-- savunanın bir önceki savunmasındaki banı olmamalı ve ban sonrası saldırana en az 1 kategori kalmalı.
create or replace function public.duello2_ban_uygun_mu(p_id uuid, p_user uuid, p_kategori text)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select p_kategori = any(public.duello_kategorileri())
     and public.duello2_kategori_uygun_mu(p_id, p_kategori)
     and exists (select 1 from public.duellolar d
                  where d.id = p_id
                    and p_kategori is distinct from (case when p_user = d.oyuncu1 then d.son_ban1 else d.son_ban2 end))
     and exists (select 1 from unnest(public.duello_kategorileri()) k
                  where k <> p_kategori and public.duello2_kategori_uygun_mu(p_id, k));
$function$;

-- Savunanın ban seçimi (istemci RPC'si). Kural doğrulaması sunucuda; maç satırı duello_kilitle ile FOR UPDATE kilitli.
create or replace function public.duello_ban_sec(p_id uuid, p_kategori text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare d public.duellolar%rowtype;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz <> 'ban' or d.saldiran = auth.uid() then raise exception 'Şu an ban sırası sende değil'; end if;
  if p_kategori is not distinct from (case when auth.uid() = d.oyuncu1 then d.son_ban1 else d.son_ban2 end) then
    raise exception 'Aynı kategoriyi arka arkaya banlayamazsın';
  end if;
  if not public.duello2_ban_uygun_mu(p_id, auth.uid(), p_kategori) then
    raise exception 'Bu kategori şu an banlanamaz';
  end if;
  perform public.duello2_ban_bitir(p_id, p_kategori);
  perform public.duello_sinyal_ver(p_id);
end $function$;

-- Botun banı (bot savunanken): saldıranın en değerli hamlesini kapatır. Değer botun saldırı hesabının aynası:
-- saldıranın isabeti × (1 − botun isabeti); saldıranın kendi kategorisi (pekiştir) × duello_bot_pekistir_agirlik.
-- Saldıran eşiğe 1 kala ise yuva getirecek (boş / botun) kategoriler önce gelir. duello_bot_hamle_en_iyi_yuzde
-- olasılıkla en iyiyi, kalanında banlanabilir başka bir kategoriyi seçer. Aday yoksa null (ban yok).
create or replace function public.duello2_bot_ban_kategori(p_id uuid, p_bot uuid)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_rakip uuid;
  v_rakip_oran jsonb;
  v_kritik boolean;
  v_pekistir double precision := public.ayar_ondalik('duello_bot_pekistir_agirlik', 0.5);
  v_en_iyi double precision := public.ayar_sayi('duello_bot_hamle_en_iyi_yuzde', 70);
  v_en_iyi_k text;
  v_kat text;
begin
  select * into d from public.duellolar where id = p_id;
  if not found then return null; end if;
  v_rakip := case when d.oyuncu1 = p_bot then d.oyuncu2 else d.oyuncu1 end;
  v_rakip_oran := coalesce(case when d.oyuncu1 = p_bot then d.profil2 else d.profil1 end -> 'oranlar', '{}'::jsonb);
  v_kritik := (case when d.oyuncu1 = p_bot then coalesce(d.yuva2, 0) else coalesce(d.yuva1, 0) end)
              >= coalesce(d.hakimiyet_esik, 4) - 1;

  select a.k into v_en_iyi_k
    from (select k,
                 (case when jsonb_typeof(v_rakip_oran -> k) = 'number' then (v_rakip_oran ->> k)::double precision / 100.0 else 0.5 end)
                   * (1 - public.bot_kategori_isabet(p_bot, k))
                   * (case when d.sahiplik ->> k = v_rakip::text then v_pekistir else 1 end) as v,
                 (d.sahiplik ->> k) is distinct from v_rakip::text as yuva_getirir
            from unnest(public.duello_kategorileri()) k
           where public.duello2_ban_uygun_mu(p_id, p_bot, k)) a
   order by (v_kritik and a.yuva_getirir) desc, a.v desc, a.k
   limit 1;
  if v_en_iyi_k is null or v_kritik or random() * 100 < v_en_iyi then
    return v_en_iyi_k;
  end if;
  select k into v_kat from unnest(public.duello_kategorileri()) k
   where k <> v_en_iyi_k and public.duello2_ban_uygun_mu(p_id, p_bot, k)
   order by random() limit 1;
  return coalesce(v_kat, v_en_iyi_k);
end $function$;

-- ---------------------------------------------------------------- yetkiler (yalnız YENİ fonksiyonlar)
revoke all on function public.duello2_ban_baslat(uuid) from public, anon, authenticated;
revoke all on function public.duello2_ban_bitir(uuid, text) from public, anon, authenticated;
revoke all on function public.duello2_ban_uygun_mu(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.duello2_bot_ban_kategori(uuid, uuid) from public, anon, authenticated;
revoke all on function public.duello_ban_sec(uuid, text) from public, anon;
grant execute on function public.duello_ban_sec(uuid, text) to authenticated;

-- ---------------------------------------------------------------- faz makinesi (canlı tanım + hedefli ek)
-- Yeni tur: 'kategori' fazı kurulduktan sonra ban fazı açılır (duello2_ban_baslat).
CREATE OR REPLACE FUNCTION public.duello2_sonraki(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_altin uuid;
begin
  select * into d from public.duellolar where id = p_id for update;

  if d.uzatma then
    v_altin := (d.son_hamle ->> 'altin_kazanan')::uuid;
    if v_altin is not null then
      perform public.duello_bitir(p_id, v_altin);
    else
      perform public.duello2_uzatma_ac(p_id);   -- kazanan çıkana kadar yeni Altın Soru
    end if;
    return;
  end if;

  -- 680 · Hâkimiyet: 1 tur = 1 hamle, roller her tur el değiştirir (tek tur oyuncu1, çift tur oyuncu2 saldırır;
  -- saldiri_sirasi soru indeksini tur*2+sıra benzersiz tutmak için korunur). Eşiğe ilk ulaşan ANINDA kazanır;
  -- son turdan sonra yuvası çok olan kazanır, eşitse Altın Soru (sahiplik değişmez).
  if coalesce(d.hakimiyet, false) then
    if coalesce(d.yuva1, 0) >= d.hakimiyet_esik or coalesce(d.yuva2, 0) >= d.hakimiyet_esik then
      perform public.duello_bitir(p_id, case when coalesce(d.yuva1, 0) >= d.hakimiyet_esik then d.oyuncu1 else d.oyuncu2 end);
    elsif d.tur < public.ayar_sayi('duello_max_tur', 10) then
      update public.duellolar
         set tur = tur + 1,
             saldiri_sirasi = case when (tur + 1) % 2 = 1 then 0 else 1 end,
             saldiran = case when (tur + 1) % 2 = 1 then oyuncu1 else oyuncu2 end,
             faz = 'kategori', kategori = null, soru_id = null, cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
             faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
             son_hareket = now()
       where id = p_id;
      perform public.duello2_ban_baslat(p_id);   -- 853: savunma banı (bayrak kapalıysa faz 'kategori' kalır)
    elsif coalesce(d.yuva1, 0) <> coalesce(d.yuva2, 0) then
      perform public.duello_bitir(p_id, case when coalesce(d.yuva1, 0) > coalesce(d.yuva2, 0) then d.oyuncu1 else d.oyuncu2 end);
    else
      perform public.duello2_uzatma_ac(p_id);
    end if;
    return;
  end if;

  if d.saldiri_sirasi = 0 then
    update public.duellolar
       set saldiri_sirasi = 1, saldiran = oyuncu2, faz = 'kategori', kategori = null, soru_id = null,
           cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
           son_hareket = now()
     where id = p_id;
    return;
  end if;

  if d.tur < public.ayar_sayi('duello_max_tur', 10) then
    update public.duellolar
       set tur = tur + 1, saldiri_sirasi = 0, saldiran = oyuncu1, faz = 'kategori',
           kategori = null, soru_id = null, cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
           son_hareket = now()
     where id = p_id;
  elsif coalesce(d.puan1, 0) <> coalesce(d.puan2, 0) then
    perform public.duello_bitir(p_id, case when d.puan1 > d.puan2 then d.oyuncu1 else d.oyuncu2 end);
  else
    perform public.duello2_uzatma_ac(p_id);   -- eşitlik: Altın Soru
  end if;
end $function$;

-- Maç başı: 1. tur da banla başlar.
CREATE OR REPLACE FUNCTION public.duello_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_onceki uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_p1 jsonb;
  v_p2 jsonb;
  v_x uuid;
begin
  if random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil, oranlar ve kategori yıldızları MAÇ BAŞINDA sabitlenir (yoklamalarda yeniden hesaplanmaz).
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;
  v_p1 := coalesce(v_p1, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_a));
  v_p2 := coalesce(v_p2, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_b));

  -- 680: Hâkimiyet — puan/yıldız/çarpan yok; oranlar kart yüzdeleri için profil içinde kalır.
  -- Eşik ve kilit süresi maç başında sabitlenir (ayar değişse de devam eden maç etkilenmez).
  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, puan1, puan2,
                                yildiz1, yildiz2, puan_degerleri, carpanli_turlar, carpan_katsayi,
                                hakimiyet, sahiplik, kilitler, hakimiyet_esik, kilit_tur, yuva1, yuva2,
                                saldiran, faz, faz_bitis,
                                profil1, profil2, onceki_id, surum)
  values (p_a, p_b, coalesce(p_dereceli, true), null, null, 0, 0,   -- puan kolonu 0 kalır (eski "puan1 boş = can maçı" ayrımı bozulmasın)
          null, null, null, null, null,
          true, '{}'::jsonb, '{}'::jsonb,
          greatest(1, public.ayar_sayi('duello_hakimiyet_esik', 4)::int),
          greatest(0, public.ayar_sayi('duello_kilit_tur', 2)::int), 0, 0,
          p_a, 'kategori',
          now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
          v_p1, v_p2, p_onceki, 2)
  returning id into v_id;
  perform public.duello2_ban_baslat(v_id);   -- 853: ilk tur da savunma banıyla başlar (bayrak kapalıysa 'kategori' kalır)

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;

-- İlerletme: ban süresi dolunca ban yok → 'kategori'. Kopukluk kapısı faz_bitis üzerinden çalışır (ban fazı da donar).
CREATE OR REPLACE FUNCTION public.duello2_ilerlet(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_adim int := 0;
  v_kopuk uuid;
  v_kat text;
  v_tol interval := make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1));
  v_taban interval := make_interval(secs => public.ayar_sayi('duello_kopuk_taban_sn', 3));
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' then return; end if;

  -- ---------- KOPUKLUK KAPISI (eski akışla aynı; kişisel bitişler de donar) ----------
  v_kopuk := public.duello_kopuk_kim(p_id);
  if v_kopuk is not null then
    if d.kopuk_at is null then
      update public.duellolar
         set kopuk_at = now(),
             kopuk_kalan = greatest(coalesce(d.faz_bitis, now()) - now(), v_taban),
             kopuk_kalan1 = case when d.bitis1 is not null then greatest(d.bitis1 - now(), v_taban) end,
             kopuk_kalan2 = case when d.bitis2 is not null then greatest(d.bitis2 - now(), v_taban) end
       where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      select * into d from public.duellolar where id = p_id;
    end if;

    if d.kopuk_at < now() - make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)) then
      perform public.duello_bitir(p_id, case when v_kopuk = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end);
      perform public.duello_sinyal_ver(p_id);
      return;
    end if;

    update public.duellolar
       set faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end
     where id = p_id;
    return;
  end if;

  if d.kopuk_at is not null then
    update public.duellolar
       set kopuk_at = null, kopuk_kalan = null, kopuk_kalan1 = null, kopuk_kalan2 = null,
           faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
           bitis1 = case when d.kopuk_kalan1 is not null then now() + greatest(d.kopuk_kalan1, v_taban) else bitis1 end,
           bitis2 = case when d.kopuk_kalan2 is not null then now() + greatest(d.kopuk_kalan2, v_taban) else bitis2 end,
           son_hareket = now()
     where id = p_id;
    perform public.duello_sinyal_ver(p_id);
  end if;
  -- ---------- /KOPUKLUK KAPISI ----------

  loop
    v_adim := v_adim + 1;
    exit when v_adim > 12;
    select * into d from public.duellolar where id = p_id;
    exit when not found or d.durum <> 'aktif';

    if d.son_hareket < now() - make_interval(mins => public.ayar_sayi('duello_zaman_asimi_dk', 60)::int) then
      update public.duellolar set durum = 'iptal', bitis = now() where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      exit;
    end if;

    if d.faz = 'kategori' then
      exit when now() < d.faz_bitis;
      -- Süre doldu: uygun kategorilerden RASTGELE; 470: savunanın zayıf kategorisi başka seçenek
      -- varsa seçilmez (saldıran seçmediği bir risk yüzünden can kaybetmesin).
      v_kat := public.duello2_otomatik_kategori(p_id);
      perform public.duello2_soru_ac(p_id, v_kat);
    elsif d.faz = 'cevap' then
      -- Her oyuncu ya cevapladı ya da kişisel süresi (+ tolerans) doldu → çözümle.
      exit when not ((d.cevaplar ? d.oyuncu1::text) or now() > d.bitis1 + v_tol)
             or not ((d.cevaplar ? d.oyuncu2::text) or now() > d.bitis2 + v_tol);
      perform public.duello2_cozumle(p_id);
    elsif d.faz = 'sonuc' then
      exit when now() < d.faz_bitis;
      perform public.duello2_sonraki(p_id);
    elsif d.faz = 'ban' then
      -- 853: savunma banı süresi doldu → ban yok, saldıran bütün uygun kategorilerden seçer.
      exit when now() < d.faz_bitis;
      perform public.duello2_ban_bitir(p_id, null);
    else
      exit;
    end if;
    perform public.duello_sinyal_ver(p_id);
  end loop;
end $function$;

-- Bot: savunanken ban seçer. Saldırırken duello2_bot_kategori zaten duello2_kategori_uygun_mu'dan geçer (banlıyı görmez).
CREATE OR REPLACE FUNCTION public.duello2_bot_tik(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

    -- ---------- 853: savunma banı (bot savunanken) ----------
    -- An: fazın 1–2,5. saniyesi (tik aralığıyla en geç ~+2 sn). Aday yoksa ban boş geçilir.
    if d.faz = 'ban' and d.saldiran <> v_bot
       and now() >= d.faz_bitis - public.duello2_gosterim_payi() - make_interval(secs => public.ayar_sayi('duello_ban_sn', 5))
                    + make_interval(secs => 1 + 1.5 * public.bot_rasgele('d2ban:' || p_id::text || ':' || d.tur)) then
      v_kat := public.duello2_bot_ban_kategori(p_id, v_bot);
      perform public.duello2_ban_bitir(p_id, v_kat);
      perform public.duello_sinyal_ver(p_id);
      v_n := v_n + 1;
      select * into d from public.duellolar where id = p_id;
    end if;

    -- ---------- 650: kategori kalkanı (bot savunanken, hakkı duruyorsa) ----------
    -- Her kategori fazında bir kez zar (tohum: maç + tur indeksi); an fazın 1–4. saniyesi
    -- (tik aralığı yüzünden en geç +6 sn). Saldıran ondan önce seçtiyse faz geçmiştir — normal.
    if d.faz = 'kategori' and d.saldiran <> v_bot and not d.uzatma
       and public.duello_kalkan_kalan(d.tur, jsonb_array_length(case when v_bot = d.oyuncu1 then d.kalkanlar1 else d.kalkanlar2 end)) > 0   -- 666: 2 hak, iki pencere
       and public.ayar_sayi('duello2_kalkan_acik', 1) = 1 then
      v_idx := d.tur * 2 + d.saldiri_sirasi;
      v_kat_bas := d.faz_bitis - make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8));
      if now() >= v_kat_bas + make_interval(secs => 1 + 3 * public.bot_rasgele('d2klkz:' || p_id::text || ':' || v_idx))
         and now() < v_kat_bas + interval '6 seconds'
         and public.bot_rasgele('d2klk:' || p_id::text || ':' || v_idx) * 100
             < (case when d.tur > public.ayar_sayi('duello_kalkan_pencere1_son_tur', 5)   -- 666: 2. pencerede puanda gerideyse
                      and (case when v_bot = d.oyuncu1 then coalesce(d.puan1, 0) - coalesce(d.puan2, 0)
                                else coalesce(d.puan2, 0) - coalesce(d.puan1, 0) end) < 0
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
        if not d.uzatma and public.duello2_bot_skill_dene(p_id, v_bot) then   -- 666: Altın Soru jokersiz
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
end $function$;

-- Durum: sureler.ban, sayaç başlangıcı ve 'ban' nesnesi.
CREATE OR REPLACE FUNCTION public.duello2_durum(p_id uuid)
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
  v_hk jsonb;
  v_rol text;
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
             'yildiz', h.yildiz, 'deger', h.deger, 'carpan', h.carpan, 'altin_kazanan', h.altin_kazanan,   -- 666/667
             'benim_puanim', case when h.saldiran = v_me then h.puan_saldiran else h.puan_savunan end,
             'rakip_puani', case when h.saldiran = v_me then h.puan_savunan else h.puan_saldiran end,
             'kalkan', h.kalkan, 'savunan', h.savunan, 'hakimiyet', h.hakimiyet) order by h.id), '[]'::jsonb)   -- 650: kalkan
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
   where k.user_id = v_rakip and k.mac_tur = 'duello' and k.mac_id = p_id and k.soru_index = v_idx
     and k.tur not in ('baskin', 'kalkan'));   -- 680: rol jokerleri tur sonuna kadar rakibe gizli
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

  -- 680 · Hâkimiyet tahtası. kilitler: yalnız süren kilitler, değer = kalan tur (sonuç fazında bu tur sayılmaz).
  -- rol_joker: bu an bana gösterilecek rol jokeri (saldırıyorsam Baskın, kendi kategorime saldırılıyorsa Kalkan).
  if coalesce(d.hakimiyet, false) then
    v_rol := case when d.durum <> 'aktif' or d.faz <> 'cevap' or d.uzatma or d.kategori is null then null
                  when d.saldiran = v_me then 'baskin'
                  when (d.sahiplik ->> d.kategori) = v_me::text then 'kalkan' end;
    v_hk := jsonb_build_object(
      'acik', true,
      'esik', d.hakimiyet_esik,
      'kilit_tur', d.kilit_tur,
      'sahiplik', coalesce(d.sahiplik, '{}'::jsonb),
      'kilitler', (select coalesce(jsonb_object_agg(e.key, x.kalan), '{}'::jsonb)
                     from jsonb_each_text(coalesce(d.kilitler, '{}'::jsonb)) e
                     cross join lateral (select e.value::int - d.tur + case when d.faz = 'sonuc' then 0 else 1 end as kalan) x
                    where x.kalan > 0 and not d.uzatma),
      'yuvalar', jsonb_build_object(d.oyuncu1::text, coalesce(d.yuva1, 0), d.oyuncu2::text, coalesce(d.yuva2, 0)),
      'rol_joker', v_rol,
      'rol_joker_hak', public.ayar_sayi('duello_rol_joker_mac_hak', 1),
      'avantaj_esik', public.ayar_sayi('duello_kat_esik_yuzde', 10));
  else
    v_hk := jsonb_build_object('acik', false);
  end if;

  return jsonb_build_object(
    'surum', 2,
    'hakimiyet', v_hk,
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'tur', d.tur, 'max_tur', public.ayar_sayi('duello_max_tur', 10), 'saldiri_sirasi', d.saldiri_sirasi,
    'uzatma', d.uzatma,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', clock_timestamp(),   -- 325: yanıtın çıktığı an
    'ben', v_me, 'saldiran', d.saldiran, 'savunan', v_savunan,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'puan', coalesce(d.puan1, 0), 'yildizlar', d.yildiz1, 'dogru', d.dogru1, 'profil', d.profil1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'puan', coalesce(d.puan2, 0), 'yildizlar', d.yildiz2, 'dogru', d.dogru2, 'profil', d.profil2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'puan_degerleri', coalesce(d.puan_degerleri, public.duello_puan_degerleri()),   -- 666
    -- 667: son 2 tur ×çarpan — maç başında sabitlenen liste/katsayı; tur_carpani = bu an geçerli çarpan.
    'tur_carpani', case when d.uzatma or coalesce(d.hakimiyet, false) then 1 else public.duello_tur_carpani(d.tur, d.carpanli_turlar, d.carpan_katsayi) end,
    'carpanli_turlar', case when coalesce(d.hakimiyet, false) then '[]'::jsonb else coalesce(d.carpanli_turlar,
       (select deger from public.oyun_ayarlari where anahtar = 'duello_carpanli_turlar'), '[9,10]'::jsonb) end,
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
       'ban', public.ayar_sayi('duello_ban_sn', 5),   -- 853
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
          when 'ban' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello_ban_sn', 5))   -- 853
          when 'cevap' then d.soru_baslangic + public.duello2_gosterim_payi() end),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  )
  -- 666: Kategori Kalkanı — maçta 2 hak (Tur 1–pencere1: 1 açık; pencere2'ye kadar: 2, kullanılmayan kaybolmaz).
  -- kullanilan: [{kategori, idx, tur}]; kalan: şu an kullanılabilecek hak; aktif: bu seçimde korunan kategori.
  || jsonb_build_object('kalkan', jsonb_build_object(
       'acik', d.surum = 2 and public.ayar_sayi('duello2_kalkan_acik', 1) = 1,
       'son_sn', public.ayar_sayi('duello2_kalkan_son_sn', 5),
       'toplam_hak', 2,
       'pencere1_son', public.ayar_sayi('duello_kalkan_pencere1_son_tur', 5),
       'pencere2_son', public.ayar_sayi('duello_kalkan_pencere2_son_tur', 10),
       'oyuncular', jsonb_build_object(
          d.oyuncu1::text, jsonb_build_object('kullanilan', d.kalkanlar1,
             'kalan', case when d.uzatma then 0 else public.duello_kalkan_kalan(d.tur, jsonb_array_length(d.kalkanlar1)) end),
          d.oyuncu2::text, jsonb_build_object('kullanilan', d.kalkanlar2,
             'kalan', case when d.uzatma then 0 else public.duello_kalkan_kalan(d.tur, jsonb_array_length(d.kalkanlar2)) end)),
       'aktif', public.duello2_aktif_kalkan(p_id)))
  -- 853: savunma banı. kategori: bu turun banı (ban fazı bitince, tur sonuna kadar); onceki: savunanın bir önceki
  -- savunmasındaki banı (arka arkaya banlanamaz); uygun: ban fazında banlanabilecek kategoriler.
  || jsonb_build_object('ban', jsonb_build_object(
       'acik', coalesce(d.hakimiyet, false) and public.ayar_sayi('duello_ban_acik', 1) = 1,
       'sure', public.ayar_sayi('duello_ban_sn', 5),
       'kategori', case when d.durum = 'aktif' and not d.uzatma and d.faz <> 'ban' then d.ban_kategori end,
       'onceki', case when d.durum = 'aktif' and d.faz = 'ban'
                      then (case when v_savunan = d.oyuncu1 then d.son_ban1 else d.son_ban2 end) end,
       'uygun', case when d.durum = 'aktif' and d.faz = 'ban' then
           (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from unnest(public.duello_kategorileri()) k
             where public.duello2_ban_uygun_mu(p_id, v_savunan, k)) end));
end $function$;
