-- Düello 1.0 (sürüm 2) — SUNUCU. Oturum 1/3 (arayüz 2/3, botlar 3/3).
--
-- BAYRAK: oyun_ayarlari.duello_surum — 1 = eski akış (Saldırı Hazırlığı), 2 = Düello 1.0.
-- VARSAYILAN 1. Sürüm maç OLUŞTURULURKEN duellolar.surum'a yazılır; bayrak sonradan
-- değişse de her maç kendi sürümünde biter. Eski RPC adları korunur: istemci aynı
-- fonksiyonları çağırır, surum = 2 olan maçta yeni mantığa yönlenir. surum = 1 olan
-- maçta hiçbir satır değişmedi.
--
-- DÜELLO 1.0 KURALLARI (Ida onaylı):
--  · Saldıran da savunan da AYNI soruyu AYNI ANDA cevaplar; saldıranın tek avantajı
--    kategori seçimi. Hız puan vermez. Saldırı Hazırlığı fazı yok.
--  · İlk turda saldıran rastgele, sonra sırayla. Kategori 8 sn (dolarsa rastgele),
--    cevap 15 sn, iki oyuncuya aynı anda başlar.
--  · Rakibin CEVAPLADIĞI görünür, NE cevapladığı görünmez. Süre dolarsa "Yanıtsız".
--  · Simetrik can tablosu: yalnız biri doğruysa öteki 1 can kaybeder; ikisi de doğru
--    ya da ikisi de yanlış → nötr. Eski "en zayıf kategori" riski KALKTI.
--  · 3 can, en çok 10 tur, tur çift hâlinde tamamlanır. Her kategori maçta en çok 2 kez.
--  · Beraberlik yok: can eşitse uzatma — kategori rastgele, 2 kez sınırı yok, biri doğru
--    öteki yanlış yapana kadar. Ödüller değişmez.
--  · Skill: maçta 4, aynı skill en çok 2, aynı soruda en çok 1. Sigorta ve 2X yok.
--    Soru Değiştir yalnız ikisi de cevaplamamışken ve rakip o soruda skill kullanmamışken.
--
-- YARIŞ DURUMLARI: her eylem (cevap, skill, kategori, faz ilerlemesi) duellolar satırını
-- FOR UPDATE ile kilitleyen duello_kilitle() içinden geçer; iki oyuncunun aynı anda
-- gelen çağrıları sıraya girer. Çözümleme faz = 'cevap' iken tek kez yapılır ve fazı
-- 'sonuc'a çevirir; ikinci çağrı kilidi aldığında faz değişmiş olur.

-- ---------------------------------------------------------------- ayarlar
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_surum', '1', 'Düello sürümü: 1 = eski akış (Saldırı Hazırlığı), 2 = Düello 1.0 (aynı soru aynı anda). Yeni maç oluşturulurken okunur; oynanan maç kendi sürümünde biter.'),
  ('duello2_kategori_sn', '8', 'Düello 1.0: kategori seçme süresi (dolunca rastgele kategori)'),
  ('duello2_cevap_sn', '15', 'Düello 1.0: iki oyuncunun aynı anda başlayan cevap süresi'),
  ('duello2_cevap_tolerans_sn', '1', 'Düello 1.0: süre bittikten sonra ağ gecikmesi için kabul edilen pay'),
  ('duello2_zaman_baskisi_eksi_sn', '5', 'Düello 1.0: Zaman Baskısı rakibin kalan süresinden bu kadar düşer'),
  ('duello2_zaman_baskisi_taban_sn', '3', 'Düello 1.0: Zaman Baskısı sonrası rakibe kalan en az süre'),
  ('duello2_skill_toplam_hak', '4', 'Düello 1.0: oyuncu başına maçtaki toplam skill (uzatmada yenilenmez)'),
  ('duello2_skill_tur_basi_hak', '2', 'Düello 1.0: aynı skill maçta en çok'),
  ('duello2_skill_soru_basi_hak', '1', 'Düello 1.0: aynı soruda oyuncu başına en çok skill')
on conflict (anahtar) do nothing;
-- Tekrar kullanılanlar: duello_can (3) · duello_max_tur (10) · duello_kategori_max (2) ·
-- duello_sonuc_sn (3) · duello_ek_sure_sn (5) · duello_kopuk_* · coin/lig_duello_galibiyet.

-- ---------------------------------------------------------------- kolonlar
alter table public.duellolar
  add column if not exists surum smallint not null default 1,
  add column if not exists uzatma boolean not null default false,
  add column if not exists cevaplar jsonb not null default '{}'::jsonb,   -- {uid: {cevap, at}} — istemciye verilmez
  add column if not exists soru_baslangic timestamptz,
  add column if not exists bitis1 timestamptz,                           -- oyuncu1'in kişisel cevap bitişi
  add column if not exists bitis2 timestamptz,
  add column if not exists elli1 integer[],
  add column if not exists elli2 integer[],
  add column if not exists kopuk_kalan1 interval,
  add column if not exists kopuk_kalan2 interval;

do $$ begin
  alter table public.duellolar add constraint duellolar_surum_kontrol check (surum in (1, 2));
exception when duplicate_object then null; end $$;

-- Eski kolonlar (cevap, dogru) SAVUNANIN cevabı olarak kalır; saldıranınki yeni kolonlarda.
alter table public.duello_hamleler
  add column if not exists surum smallint not null default 1,
  add column if not exists uzatma boolean not null default false,
  add column if not exists cevap_saldiran smallint,
  add column if not exists dogru_saldiran boolean,
  add column if not exists yanitsiz_saldiran boolean,
  add column if not exists yanitsiz_savunan boolean;

-- ---------------------------------------------------------------- oluşturma
-- Sürüm 2'de ilk saldıran RASTGELE: oyuncu1 her zaman turun ilk saldıranıdır, bu yüzden
-- rastgelelik oyuncuların sırası değiştirilerek sağlanır.
create or replace function public.duello_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_onceki uuid default null)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id uuid;
  v_can int := public.ayar_sayi('duello_can', 3)::int;
  v_surum smallint := case when public.ayar_sayi('duello_surum', 1) = 2 then 2 else 1 end;
  v_p1 jsonb;
  v_p2 jsonb;
  v_x uuid;
begin
  if v_surum = 2 and random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil ve en zayıf kategori MAÇ BAŞINDA sabitlenir.
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;

  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, saldiran, faz, faz_bitis,
                                profil1, profil2, zayif1, zayif2, onceki_id, surum)
  values (p_a, p_b, coalesce(p_dereceli, true), v_can, v_can, p_a, 'kategori',
          now() + make_interval(secs => case when v_surum = 2
                                             then public.ayar_sayi('duello2_kategori_sn', 8)
                                             else public.duello_kategori_suresi(p_a) end),   -- Paket 20 IV.3
          v_p1, v_p2, public.duello_en_zayif(p_a), public.duello_en_zayif(p_b), p_onceki, v_surum)
  returning id into v_id;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;

-- ---------------------------------------------------------------- yardımcılar (v2)
-- Normal turda kategori uygun mu: MAÇ genelinde en çok duello_kategori_max kez (iki
-- oyuncunun saldırıları birlikte), önceki sorunun kategorisi üst üste gelmez. Uzatma
-- soruları sayılmaz.
create or replace function public.duello2_kategori_uygun_mu(p_id uuid, p_kategori text)
returns boolean
language sql
stable security definer
set search_path to 'public'
as $function$
  select p_kategori = any(public.duello_kategorileri())
     and p_kategori is distinct from (select h.kategori from public.duello_hamleler h
                                       where h.duello_id = p_id order by h.id desc limit 1)
     and (select count(*) from public.duello_hamleler h
           where h.duello_id = p_id and h.kategori = p_kategori and not h.uzatma)
         < public.ayar_sayi('duello_kategori_max', 2);
$function$;

-- Soruyu iki oyuncuya AYNI ANDA açar. Çağıran satırı kilitlemiş olmalı.
create or replace function public.duello2_soru_ac(p_id uuid, p_kategori text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_soru uuid;
  v_kat text := p_kategori;
  v_bitis timestamptz := now() + make_interval(secs => public.ayar_sayi('duello2_cevap_sn', 15));
begin
  select * into d from public.duellolar where id = p_id for update;
  v_soru := public.duello_soru_bul(p_id, v_kat, array[d.oyuncu1, d.oyuncu2], d.kullanilan_sorular);
  if v_soru is null and d.uzatma then
    -- Uzatmada kategori zaten rastgele: o kategoride soru kalmadıysa herhangi biri.
    select q.id, q.kategori into v_soru, v_kat from public.questions q
     where q.aktif and not (q.id = any(d.kullanilan_sorular))
     order by random() limit 1;
  end if;
  if v_soru is null then raise exception 'Bu kategoride soru kalmadı'; end if;

  update public.duellolar
     set kategori = v_kat, soru_id = v_soru, faz = 'cevap',
         soru_baslangic = now(), bitis1 = v_bitis, bitis2 = v_bitis, faz_bitis = v_bitis,
         cevaplar = '{}'::jsonb, elli1 = null, elli2 = null, elli_kapali = null,
         zaman_baskisi = false, ek_sure = false,
         soru_degisti_saldiri = false, soru_degisti_savunma = false,
         kullanilan_sorular = kullanilan_sorular || v_soru,
         son_hareket = now()
   where id = p_id;
end $function$;

-- Soruyu çözümler: simetrik can tablosu. Çağıran satırı kilitlemiş olmalı; faz 'cevap'
-- değilse hiçbir şey yapmaz (aynı soru iki kez çözümlenemez).
create or replace function public.duello2_cozumle(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  v_kaybeden := case when v_d_sal and not v_d_sav then v_savunan
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
           'cevaplar', jsonb_build_object(
             d.saldiran::text, jsonb_build_object('cevap', v_c_sal, 'dogru', v_d_sal, 'yanitsiz', v_c_sal is null),
             v_savunan::text, jsonb_build_object('cevap', v_c_sav, 'dogru', v_d_sav, 'yanitsiz', v_c_sav is null))),
         son_hareket = now()
   where id = p_id;

  insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, cevap, dogru,
                                      riskli, can_kaybeden, zaman_baskisi, savunma_kilidi,
                                      surum, uzatma, cevap_saldiran, dogru_saldiran,
                                      yanitsiz_saldiran, yanitsiz_savunan)
  values (p_id, d.tur, d.saldiran, v_savunan, d.kategori, d.soru_id, v_c_sav, v_d_sav,
          false, v_kaybeden, d.zaman_baskisi, false,
          2, d.uzatma, v_c_sal, v_d_sal, v_c_sal is null, v_c_sav is null);

  foreach v_o in array array[d.saldiran, v_savunan] loop
    v_c := case when v_o = d.saldiran then v_c_sal else v_c_sav end;
    perform public.kategori_istatistik_yaz(v_o, d.kategori, v_c is not null and v_c = v_dc);
    if v_c is not null and v_c = v_dc then perform public.kategori_dogru_arttir(v_o, d.kategori); end if;
    if v_c is not null then perform public.soru_sayac(d.soru_id, v_c = v_dc); end if;
  end loop;

  delete from public.skill_ikinci_sans_denemeleri
   where mac_tur = 'duello' and mac_id = p_id and soru_index = v_idx;
end $function$;

-- Uzatma sorusu: rolleri sırayla değiştirir, kategori RASTGELE (2 kez sınırı yok),
-- kategori fazı olmadan doğrudan cevaba geçer.
create or replace function public.duello2_uzatma_ac(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_kat text;
begin
  select * into d from public.duellolar where id = p_id for update;
  update public.duellolar
     set uzatma = true,
         tur = case when saldiri_sirasi = 1 then tur + 1 else tur end,
         saldiri_sirasi = case when saldiri_sirasi = 1 then 0 else 1 end,
         saldiran = case when saldiri_sirasi = 1 then oyuncu1 else oyuncu2 end,
         son_hareket = now()
   where id = p_id;
  select k into v_kat from unnest(public.duello_kategorileri()) k order by random() limit 1;
  perform public.duello2_soru_ac(p_id, v_kat);
exception when raise_exception then
  -- Havuzda kullanılmamış hiç soru kalmadı (pratikte olmaz): eski altın sorunun
  -- son çaresi gibi ilk oyuncu kazanır ki maç asılı kalmasın.
  perform public.duello_bitir(p_id, d.oyuncu1);
end $function$;

-- Sonuç fazı bitince sıradaki adım.
create or replace function public.duello2_sonraki(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_kaybeden uuid;
begin
  select * into d from public.duellolar where id = p_id for update;

  if d.uzatma then
    v_kaybeden := (d.son_hamle ->> 'can_kaybeden')::uuid;
    if v_kaybeden is not null then
      perform public.duello_bitir(p_id, case when v_kaybeden = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end);
    else
      perform public.duello2_uzatma_ac(p_id);
    end if;
    return;
  end if;

  if d.saldiri_sirasi = 0 then
    -- Tur çift hâlinde tamamlanır: ilk saldırıdan sonra can bitse bile ikinci saldırı oynanır.
    update public.duellolar
       set saldiri_sirasi = 1, saldiran = oyuncu2, faz = 'kategori', kategori = null, soru_id = null,
           cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8)),
           son_hareket = now()
     where id = p_id;
    return;
  end if;

  if d.can1 > 0 and d.can2 > 0 and d.tur < public.ayar_sayi('duello_max_tur', 10) then
    update public.duellolar
       set tur = tur + 1, saldiri_sirasi = 0, saldiran = oyuncu1, faz = 'kategori',
           kategori = null, soru_id = null, cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
           faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8)),
           son_hareket = now()
     where id = p_id;
  elsif d.can1 <> d.can2 then
    perform public.duello_bitir(p_id, case when d.can1 > d.can2 then d.oyuncu1 else d.oyuncu2 end);
  else
    perform public.duello2_uzatma_ac(p_id);   -- beraberlik yok
  end if;
end $function$;

-- Faz makinesi (v2). duello_ilerlet, surum = 2 olan maçta buraya yönlenir.
create or replace function public.duello2_ilerlet(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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
      -- Süre doldu: uygun kategorilerden RASTGELE (saldıranın zayıflığına bakılmaz).
      select k into v_kat from unnest(public.duello_kategorileri()) k
       where public.duello2_kategori_uygun_mu(p_id, k) order by random() limit 1;
      if v_kat is null then
        select k into v_kat from unnest(public.duello_kategorileri()) k order by random() limit 1;
      end if;
      perform public.duello2_soru_ac(p_id, v_kat);
    elsif d.faz = 'cevap' then
      -- Her oyuncu ya cevapladı ya da kişisel süresi (+ tolerans) doldu → çözümle.
      exit when not ((d.cevaplar ? d.oyuncu1::text) or now() > d.bitis1 + v_tol)
             or not ((d.cevaplar ? d.oyuncu2::text) or now() > d.bitis2 + v_tol);
      perform public.duello2_cozumle(p_id);
    elsif d.faz = 'sonuc' then
      exit when now() < d.faz_bitis;
      perform public.duello2_sonraki(p_id);
    else
      exit;
    end if;
    perform public.duello_sinyal_ver(p_id);
  end loop;
end $function$;

-- ---------------------------------------------------------------- oyuncu eylemleri (v2)
create or replace function public.duello2_kategori_sec(p_id uuid, p_kategori text)
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
  if d.faz <> 'kategori' or d.saldiran <> auth.uid() then raise exception 'Şu an kategori seçme sırası sende değil'; end if;
  if not public.duello2_kategori_uygun_mu(p_id, p_kategori) then
    raise exception 'Bu kategori şu an seçilemez';
  end if;
  perform public.duello2_soru_ac(p_id, p_kategori);
  perform public.duello_sinyal_ver(p_id);
end $function$;

create or replace function public.duello2_cevap(p_id uuid, p_cevap smallint)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_bitis timestamptz;
  v_dogru boolean;
  v_index int;
  v_ilk smallint;
  v_ikinci boolean;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  d := public.duello_kilitle(p_id);   -- FOR UPDATE: iki oyuncunun cevabı sıraya girer
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz <> 'cevap' then raise exception 'Şu an cevap verilemez'; end if;
  if d.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  v_bitis := case when v_me = d.oyuncu1 then d.bitis1 else d.bitis2 end;
  if now() > v_bitis + make_interval(secs => public.ayar_sayi('duello2_cevap_tolerans_sn', 1)) then
    raise exception 'Süre doldu';
  end if;

  v_index := d.tur * 2 + d.saldiri_sirasi;
  v_dogru := p_cevap = (select dogru_cevap from public.questions where id = d.soru_id);

  -- İkinci Şans: bu soruda kullanıldıysa ilk yanlış kaydedilir, aynı sayaçla bir cevap daha.
  v_ikinci := exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                        and k.user_id = v_me and k.soru_index = v_index and k.tur = 'ikinci_sans');
  select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s
   where s.mac_tur = 'duello' and s.mac_id = p_id and s.user_id = v_me and s.soru_index = v_index for update;
  if v_ikinci and not v_dogru and v_ilk is null then
    insert into public.skill_ikinci_sans_denemeleri (mac_tur, mac_id, user_id, soru_index, ilk_cevap)
    values ('duello', p_id, v_me, v_index, p_cevap);
    perform public.duello_sinyal_ver(p_id);
    return jsonb_build_object('tekrar_hakki', true, 'ilk_yanlis_cevap', p_cevap);
  end if;
  if v_ilk is not null and p_cevap = v_ilk then raise exception 'Başka bir cevap seç'; end if;

  update public.duellolar
     set cevaplar = cevaplar || jsonb_build_object(v_me::text, jsonb_build_object('cevap', p_cevap, 'at', now())),
         son_hareket = now()
   where id = p_id;

  perform public.gorulen_kaydet(d.soru_id);
  if not v_dogru then perform public.yanlis_kaydet(d.soru_id); end if;

  -- İkisi de cevapladıysa ya da rakibin süresi dolduysa soru hemen çözümlenir
  -- (koşul tek yerde: duello2_ilerlet).
  perform public.duello2_ilerlet(p_id);
  perform public.duello_sinyal_ver(p_id);
  -- Doğru/yanlış burada SÖYLENMEZ: rakip daha cevaplamamış olabilir.
  return jsonb_build_object('tekrar_hakki', false, 'cevaplandi', true);
end $function$;

-- Skill hak kapısı (v2): satın almadan ÖNCE de çağrılır (joker_hak_kontrol).
create or replace function public.duello2_skill_hak_kontrol(p_id uuid, p_user uuid, p_tur text)
returns void
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_idx int;
  v_toplam int;
  v_tur int;
  v_soru int;
begin
  select * into d from public.duellolar where id = p_id;
  if p_tur not in ('elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'ikinci_sans') then
    raise exception 'Bu skill Düello modunda kullanılamaz';
  end if;
  v_idx := d.tur * 2 + d.saldiri_sirasi;
  select count(*), count(*) filter (where k.tur = p_tur), count(*) filter (where k.soru_index = v_idx)
    into v_toplam, v_tur, v_soru
    from public.joker_kullanimlari k
   where k.user_id = p_user and k.mac_tur = 'duello' and k.mac_id = p_id;
  if v_toplam >= public.ayar_sayi('duello2_skill_toplam_hak', 4) then
    raise exception 'Bu maçta en fazla % skill kullanabilirsin', public.ayar_sayi('duello2_skill_toplam_hak', 4);
  end if;
  if v_tur >= public.ayar_sayi('duello2_skill_tur_basi_hak', 2) then
    raise exception 'Bu skill için maç hakkın doldu';
  end if;
  if v_soru >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then
    raise exception 'Bu soruda skill hakkını kullandın';
  end if;
end $function$;

-- joker_kullanimlari tetikleyicisinin v2 kolu. İnsan için hata fırlatır; bot için
-- yasak skill'de false döner (satır sessizce düşer).
create or replace function public.duello2_skill_kapisi(p_id uuid, p_user uuid, p_index integer, p_tur text, p_bot boolean)
returns boolean
language plpgsql
security definer
set search_path to 'public'
as $function$
declare d public.duellolar%rowtype;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'cevap' then raise exception 'Şu an skill kullanılamaz'; end if;
  if p_user not in (d.oyuncu1, d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;
  if p_tur not in ('elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'ikinci_sans') then
    if p_bot then return false; end if;
    raise exception 'Bu skill Düello modunda kullanılamaz';
  end if;
  if p_index is distinct from d.tur * 2 + d.saldiri_sirasi then raise exception 'Soru değişti, tekrar dene'; end if;
  perform public.duello2_skill_hak_kontrol(p_id, p_user, p_tur);
  return true;
end $function$;

-- Skill kullanımı (v2). Saldırı/savunma ayrımı yok: soru açıkken ve oyuncu henüz
-- cevaplamamışken. duello_saldiri_jokeri / duello_savunma_jokeri buraya yönlenir.
create or replace function public.duello2_skill(p_id uuid, p_tur text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_rakip uuid;
  v_ben1 boolean;
  v_idx int;
  v_ucretsiz boolean;
  v_dogru smallint;
  v_kapali int[];
  v_soru uuid;
  v_bitis timestamptz;
  v_yeni timestamptz;
begin
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);   -- FOR UPDATE
  if d.durum <> 'aktif' or d.faz <> 'cevap' then raise exception 'Skill yalnız soru açıkken kullanılır'; end if;
  v_ben1 := d.oyuncu1 = v_me;
  v_rakip := case when v_ben1 then d.oyuncu2 else d.oyuncu1 end;
  v_idx := d.tur * 2 + d.saldiri_sirasi;
  v_bitis := case when v_ben1 then d.bitis1 else d.bitis2 end;
  if d.cevaplar ? v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
  if now() > v_bitis then raise exception 'Süre doldu'; end if;

  if p_tur = 'zaman_baskisi' and d.cevaplar ? v_rakip::text then
    raise exception 'Rakibin bu soruyu zaten cevapladı';
  end if;
  if p_tur = 'soru_degistir' then
    if d.cevaplar <> '{}'::jsonb or exists (select 1 from public.skill_ikinci_sans_denemeleri s
         where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx) then
      raise exception 'Cevap verildikten sonra soru değiştirilemez';
    end if;
    if exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                 and k.user_id = v_rakip and k.soru_index = v_idx) then
      raise exception 'Rakibin bu soruda skill kullandı, soru değiştirilemez';
    end if;
    -- Yeni soru ÖNCE bulunur: bulunamazsa skill harcanmaz.
    v_soru := public.duello_soru_bul(p_id, d.kategori, array[d.oyuncu1, d.oyuncu2], d.kullanilan_sorular);
    if v_soru is null then raise exception 'Bu kategoride başka soru kalmadı'; end if;
  end if;

  perform public.duello2_skill_hak_kontrol(p_id, v_me, p_tur);
  v_ucretsiz := public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me, p_tur, -1, 'kullanim', 'duello:' || p_id::text);
  end if;
  insert into public.joker_kullanimlari (user_id, mac_tur, mac_id, soru_index, tur, ucretsiz)
  values (v_me, 'duello', p_id, v_idx, p_tur, v_ucretsiz);

  if p_tur = 'elli' then
    select dogru_cevap into v_dogru from public.questions where id = d.soru_id;
    select array_agg(x) into v_kapali
      from (select x from generate_series(0, 3) x where x <> v_dogru order by random() limit 2) s;
    update public.duellolar
       set elli1 = case when v_ben1 then v_kapali else elli1 end,
           elli2 = case when v_ben1 then elli2 else v_kapali end,
           son_hareket = now()
     where id = p_id;
  elsif p_tur = 'sure' then
    update public.duellolar
       set bitis1 = case when v_ben1 then bitis1 + make_interval(secs => public.ayar_sayi('duello_ek_sure_sn', 5)) else bitis1 end,
           bitis2 = case when v_ben1 then bitis2 else bitis2 + make_interval(secs => public.ayar_sayi('duello_ek_sure_sn', 5)) end,
           ek_sure = true, son_hareket = now()
     where id = p_id;
  elsif p_tur = 'zaman_baskisi' then
    v_yeni := greatest(
      (case when v_ben1 then d.bitis2 else d.bitis1 end) - make_interval(secs => public.ayar_sayi('duello2_zaman_baskisi_eksi_sn', 5)),
      now() + make_interval(secs => public.ayar_sayi('duello2_zaman_baskisi_taban_sn', 3)));
    update public.duellolar
       set bitis1 = case when v_ben1 then bitis1 else least(bitis1, v_yeni) end,
           bitis2 = case when v_ben1 then least(bitis2, v_yeni) else bitis2 end,
           zaman_baskisi = true, son_hareket = now()
     where id = p_id;
  elsif p_tur = 'soru_degistir' then
    -- Kategori aynı kalır; yeni soruyu ikisi de görür, süre ikisi için baştan başlar.
    v_yeni := now() + make_interval(secs => public.ayar_sayi('duello2_cevap_sn', 15));
    update public.duellolar
       set soru_id = v_soru, kullanilan_sorular = kullanilan_sorular || v_soru,
           soru_baslangic = now(), bitis1 = v_yeni, bitis2 = v_yeni,
           elli1 = null, elli2 = null, cevaplar = '{}'::jsonb,
           soru_degisti_saldiri = soru_degisti_saldiri or v_me = d.saldiran,
           soru_degisti_savunma = soru_degisti_savunma or v_me <> d.saldiran,
           son_hareket = now()
     where id = p_id;
  else   -- ikinci_sans: etkisi cevapta (duello2_cevap)
    update public.duellolar set son_hareket = now() where id = p_id;
  end if;

  update public.duellolar set faz_bitis = greatest(bitis1, bitis2) where id = p_id;
  perform public.duello_sinyal_ver(p_id);
end $function$;

-- ---------------------------------------------------------------- durum (v2)
create or replace function public.duello2_durum(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
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
             'can_kaybeden', h.can_kaybeden) order by h.id), '[]'::jsonb)
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
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', now(),
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
       'set', to_jsonb(public.skill_setim()),
       'izinli', jsonb_build_array('elli', 'sure', 'soru_degistir', 'zaman_baskisi', 'ikinci_sans'),
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
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25)),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli, 'gecmis', v_gecmis,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  );
end $function$;

-- ---------------------------------------------------------------- yetkiler
-- v2 fonksiyonları yalnız eski giriş noktalarından (security definer) çağrılır;
-- istemci doğrudan çağıramaz. Eski RPC'lerin yetkileri değişmedi.
revoke all on function public.duello2_kategori_uygun_mu(uuid, text) from public, anon, authenticated;
revoke all on function public.duello2_soru_ac(uuid, text) from public, anon, authenticated;
revoke all on function public.duello2_cozumle(uuid) from public, anon, authenticated;
revoke all on function public.duello2_uzatma_ac(uuid) from public, anon, authenticated;
revoke all on function public.duello2_sonraki(uuid) from public, anon, authenticated;
revoke all on function public.duello2_ilerlet(uuid) from public, anon, authenticated;
revoke all on function public.duello2_kategori_sec(uuid, text) from public, anon, authenticated;
revoke all on function public.duello2_cevap(uuid, smallint) from public, anon, authenticated;
revoke all on function public.duello2_skill_hak_kontrol(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.duello2_skill_kapisi(uuid, uuid, integer, text, boolean) from public, anon, authenticated;
revoke all on function public.duello2_skill(uuid, text) from public, anon, authenticated;
revoke all on function public.duello2_durum(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- eski giriş noktaları
-- Aşağıdakiler canlıdaki tanımların BİREBİR kopyasıdır; yalnız başlarına "surum = 2 ise
-- yeni fonksiyona git" satırı eklendi. surum = 1 maçta davranış aynıdır.

CREATE OR REPLACE FUNCTION public.duello_ilerlet(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_kat text;
  v_adim int := 0;
  v_savunan uuid;
  v_kopuk uuid;
  v_bekleyen uuid;
  v_taban interval := make_interval(secs => public.ayar_sayi('duello_kopuk_taban_sn', 3));
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then perform public.duello2_ilerlet(p_id); return; end if;
  -- ---------- KOPUKLUK KAPISI (Paket 24 · A.4) ----------
  select * into d from public.duellolar where id = p_id;
  if not found or d.durum <> 'aktif' then return; end if;

  v_kopuk := public.duello_kopuk_kim(p_id);

  if v_kopuk is not null then
    if d.kopuk_at is null then
      -- Yeni koptu: o andaki kalan süreyi dondur. Süre zaten dolmuşsa taban kadar ver
      -- (yoksa geri dönen oyuncu ekranı görmeden hamlesini kaybediyordu).
      update public.duellolar
         set kopuk_at = now(),
             kopuk_kalan = greatest(coalesce(d.faz_bitis, now()) - now(), v_taban)
       where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      select * into d from public.duellolar where id = p_id;
    end if;

    if d.kopuk_at < now() - make_interval(secs => public.ayar_sayi('duello_kopuk_bekleme_sn', 45)) then
      -- Dönmedi: bekleyen kazanır. duello_terk ile aynı yol — yeni ödül yolu yok.
      v_bekleyen := case when v_kopuk = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
      perform public.duello_bitir(p_id, v_bekleyen);
      perform public.duello_sinyal_ver(p_id);
      return;
    end if;

    -- FAZ İLERLEMESİ DURSUN: süre kopuk boyunca ileri itilir, hiçbir faz dolmaz.
    update public.duellolar
       set faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban)
     where id = p_id;
    return;
  end if;

  if d.kopuk_at is not null then
    -- Geri döndü: kaldığı yerden, dondurulan süreyle devam
    update public.duellolar
       set kopuk_at = null,
           kopuk_kalan = null,
           faz_bitis = now() + greatest(coalesce(d.kopuk_kalan, v_taban), v_taban),
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

    -- Zaman aşımı SON HAREKET'ten sayılır (Paket 24 · A.4.5)
    if d.son_hareket < now() - make_interval(mins => public.ayar_sayi('duello_zaman_asimi_dk', 60)::int) then
      update public.duellolar set durum = 'iptal', bitis = now() where id = p_id;
      perform public.duello_sinyal_ver(p_id);
      exit;
    end if;

    exit when d.faz_bitis is not null and now() < d.faz_bitis
              and not (d.faz = 'cevap');
    if d.faz = 'cevap' then
      exit when now() <= d.faz_bitis + interval '1 second';
    end if;

    if d.faz = 'kategori' then
      v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
      select k into v_kat from unnest(public.duello_kategorileri()) k
       where public.duello_kategori_uygun_mu(p_id, d.saldiran, k)
       order by (k is not distinct from (case when v_savunan = d.oyuncu1 then d.zayif1 else d.zayif2 end)), random()
       limit 1;
      perform public.duello_kategori_uygula(p_id, v_kat);
    elsif d.faz = 'hazirlik' then
      update public.duellolar
         set faz = 'cevap',
             faz_bitis = greatest(d.faz_bitis, now()) + make_interval(secs =>
               case when d.zaman_baskisi then public.ayar_sayi('duello_zaman_baskisi_sn', 10)
                    else public.ayar_sayi('duello_cevap_sn', 15) end),
             son_hareket = now()
       where id = p_id;
    elsif d.faz = 'cevap' then
      perform public.duello_cozumle(p_id, null);
    elsif d.faz = 'sonuc' then
      if d.saldiri_sirasi = 0 then
        update public.duellolar
           set saldiri_sirasi = 1, saldiran = oyuncu2, faz = 'kategori', kategori = null, soru_id = null,
               faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello_kategori_sn', 20)),
               son_hareket = now()
         where id = p_id;
      else
        perform public.duello_tur_sonu(p_id);
      end if;
    elsif d.faz = 'altin' then
      perform public.duello_altin_degerlendir(p_id);
    end if;
    perform public.duello_sinyal_ver(p_id);
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.duello_cevap(p_id uuid, p_cevap smallint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype; v_me uuid:=auth.uid(); v_dogru boolean; v_index int; v_ilk smallint; v_ikinci boolean;
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then return public.duello2_cevap(p_id, p_cevap); end if;
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  if p_cevap is null or p_cevap not between 0 and 3 then raise exception 'Geçersiz cevap'; end if;
  d:=public.duello_kilitle(p_id);
  if d.durum<>'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz='cevap' then
    if d.saldiran=v_me then raise exception 'Kendi saldırını cevaplayamazsın'; end if;
    v_index:=d.tur*2+d.saldiri_sirasi;
    v_dogru:=p_cevap=(select dogru_cevap from public.questions where id=d.soru_id);
    v_ikinci:=exists(select 1 from public.joker_kullanimlari k where k.mac_tur='duello' and k.mac_id=p_id
      and k.user_id=v_me and k.soru_index=v_index and k.tur='ikinci_sans');
    select s.ilk_cevap into v_ilk from public.skill_ikinci_sans_denemeleri s where s.mac_tur='duello'
      and s.mac_id=p_id and s.user_id=v_me and s.soru_index=v_index for update;
    if v_ikinci and not v_dogru and v_ilk is null then
      insert into public.skill_ikinci_sans_denemeleri(mac_tur,mac_id,user_id,soru_index,ilk_cevap)
      values('duello',p_id,v_me,v_index,p_cevap);
      return jsonb_build_object('tekrar_hakki',true,'ilk_yanlis_cevap',p_cevap);
    end if;
    if v_ilk is not null and p_cevap=v_ilk then raise exception 'Başka bir cevap seç'; end if;
    delete from public.skill_ikinci_sans_denemeleri where mac_tur='duello' and mac_id=p_id
      and user_id=v_me and soru_index=v_index;
    perform public.gorulen_kaydet(d.soru_id); perform public.duello_cozumle(p_id,p_cevap);
  elsif d.faz='altin' then
    if d.altin_cevaplar?v_me::text then raise exception 'Bu soruyu zaten cevapladın'; end if;
    v_dogru:=p_cevap=(select dogru_cevap from public.questions where id=d.soru_id);
    update public.duellolar set altin_cevaplar=altin_cevaplar||jsonb_build_object(v_me::text,
      jsonb_build_object('cevap',p_cevap,'dogru',v_dogru)),son_hareket=now() where id=p_id;
    perform public.gorulen_kaydet(d.soru_id); perform public.kategori_istatistik_yaz(v_me,d.kategori,v_dogru);
    if v_dogru then perform public.kategori_dogru_arttir(v_me,d.kategori); end if;
    select * into d from public.duellolar where id=p_id;
    if (d.altin_cevaplar?d.oyuncu1::text) and (d.altin_cevaplar?d.oyuncu2::text) then
      perform public.duello_altin_degerlendir(p_id); end if;
  else raise exception 'Şu an cevap verilemez'; end if;
  perform public.duello_sinyal_ver(p_id);
  return jsonb_build_object('tekrar_hakki',false);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.duello_durum(p_id uuid)
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
  v_dil text := public.oyuncu_dili();
  v_soru_goster boolean;
  v_soru jsonb;
  v_arkadas boolean;
  v_ezeli jsonb;
  v_odul jsonb;
  v_envanter jsonb;
  v_kullanim jsonb;
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then return public.duello2_durum(p_id); end if;
  perform public.hiz_siniri('duello_durum', 400, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  v_rakip := case when d.oyuncu1 = v_me then d.oyuncu2 else d.oyuncu1 end;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;

  v_soru_goster := d.soru_id is not null and (
       (d.faz = 'hazirlik' and d.saldiran = v_me)
    or d.faz in ('cevap','sonuc','altin')
    or d.durum <> 'aktif');
  if v_soru_goster then
    select jsonb_build_object('soru', sd.soru, 'secenekler', sd.secenekler, 'kategori', sd.kategori)
      into v_soru from public.soru_dilinde(d.soru_id, v_dil) sd;
  end if;

  v_arkadas := exists (select 1 from public.friendships f where f.durum = 'arkadas'
     and ((f.requester = v_me and f.addressee = v_rakip) or (f.requester = v_rakip and f.addressee = v_me)));
  if v_arkadas then
    select jsonb_build_object(
             'ben', count(*) filter (where x.kazanan = v_me),
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

  select coalesce(jsonb_object_agg(e.tur, e.adet), '{}'::jsonb) into v_envanter
    from public.joker_envanter e where e.user_id = v_me;
  select jsonb_build_object(
           'saldiri', count(*) filter (where k.tur in ('zaman_baskisi','saldiri_degistir','savunma_kilidi')),
           'saldiri_ucretsiz', count(*) filter (where k.ucretsiz and k.tur in ('zaman_baskisi','saldiri_degistir','savunma_kilidi')),
           'savunma', count(*) filter (where k.tur in ('elli','sure','soru_degistir')),
           'elli_ucretsiz', bool_or(k.tur = 'elli' and k.ucretsiz),
           'soru_degistir', bool_or(k.tur = 'soru_degistir'),
           -- Paket 27 B: aynı tür maçta bir kez — istemci hangi türün
           -- tükendiğini bilsin ki düğmeyi boşuna açmasın.
           'turler', coalesce(jsonb_agg(distinct k.tur) filter (where k.tur is not null), '[]'::jsonb))
    into v_kullanim
    from public.joker_kullanimlari k where k.user_id = v_me and k.mac_tur = 'duello' and k.mac_id = p_id;

  return jsonb_build_object(
    'id', d.id, 'durum', d.durum, 'dereceli', d.dereceli,
    'tur', d.tur, 'max_tur', public.ayar_sayi('duello_max_tur', 10), 'saldiri_sirasi', d.saldiri_sirasi,
    'faz', d.faz, 'faz_bitis', d.faz_bitis, 'sunucu_zamani', now(),
    'ben', v_me, 'saldiran', d.saldiran, 'savunan', v_savunan,
    'oyuncular', jsonb_build_array(
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can1, 'dogru', d.dogru1, 'profil', d.profil1, 'zayif', d.zayif1,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu1),
      (select jsonb_build_object('id', p.id, 'gorunen_ad', p.gorunen_ad, 'gorunen_avatar', p.gorunen_avatar,
               'gorunum', p.gorunum, 'can', d.can2, 'dogru', d.dogru2, 'profil', d.profil2, 'zayif', d.zayif2,
               'unvan', public.oyuncu_unvani(p.id))
         from public.profiles p where p.id = d.oyuncu2)),
    'kategoriler', to_jsonb(public.duello_kategorileri()),
    'kategori_max', public.ayar_sayi('duello_kategori_max', 2),
    'kullanim', jsonb_build_object(d.oyuncu1::text, public.duello_kategori_kullanimi(p_id, d.oyuncu1),
                                   d.oyuncu2::text, public.duello_kategori_kullanimi(p_id, d.oyuncu2)),
    'kategori', d.kategori,
    'soru', v_soru,
    'elli_kapali', case when v_me = v_savunan and d.faz = 'cevap' then to_jsonb(d.elli_kapali) end,
    'zaman_baskisi', d.zaman_baskisi, 'savunma_kilidi', d.savunma_kilidi, 'ek_sure', d.ek_sure,
    'soru_degisti_saldiri', d.soru_degisti_saldiri,
    'son_hamle', case when d.faz in ('sonuc','kategori','altin') or d.durum <> 'aktif' then d.son_hamle end,
    'altin', case when d.faz = 'altin' then jsonb_build_object(
                    'ben_cevapladim', d.altin_cevaplar ? v_me::text,
                    'benim_cevabim', d.altin_cevaplar -> v_me::text -> 'cevap',
                    'rakip_cevapladi', d.altin_cevaplar ? v_rakip::text) end,
    'jokerler', jsonb_build_object(
       'envanter', v_envanter, 'kullanim', v_kullanim,
       -- Paket 27 B: tek toplam hak. Eski alanlar (saldiri_siniri/savunma_siniri/
       -- ucretsiz_saldiri) eski istemci sürümü kırılmasın diye aynı yapıda
       -- doldurulmaya devam ediyor; yeni istemci 'hak' ve 'kullanilan'a bakar.
       'hak', public.ayar_sayi('duello_joker_hak', 4),
       'kullanilan', (select count(*) from public.joker_kullanimlari k2
                       where k2.user_id = v_me and k2.mac_tur = 'duello' and k2.mac_id = p_id),
       'fiyatlar', public.joker_fiyatlari(),
       'coin', (select coalesce(pr.coin, 0) from public.profiles pr where pr.id = v_me),
       'saldiri_siniri', public.ayar_sayi('duello_joker_hak', 4),
       'savunma_siniri', public.ayar_sayi('duello_joker_hak', 4),
       'ucretsiz_saldiri', public.ayar_sayi('duello_ucretsiz_saldiri_joker', 0)),
    'sureler', jsonb_build_object('cevap', public.ayar_sayi('duello_cevap_sn', 15),
       'zaman_baskisi', public.ayar_sayi('duello_zaman_baskisi_sn', 10),
       'hazirlik', public.ayar_sayi('duello_hazirlik_sn', 4),
       'kategori', public.ayar_sayi('duello_kategori_sn', 20),
       'altin', public.ayar_sayi('duello_altin_sn', 15),
       -- Paket 28 A: düello ekranının kendi nabız aralığı. Sunucu hesaplıyor ki
       -- istemci kopukluk eşiğinden yavaş atıp kendini "kopuk" göstermesin.
       'nabiz', public.duello_nabiz_sn(),
       'kopuk', public.ayar_sayi('duello_kopuk_sn', 25)),
    'kazanan', d.kazanan, 'odul', v_odul, 'ezeli', v_ezeli,
    'rovans', jsonb_build_object('isteyen', d.rovans_isteyen, 'id', d.rovans_id,
       'gecerli', d.rovans_at is not null and d.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60)))
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.duello_kategori_sec(p_id uuid, p_kategori text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then perform public.duello2_kategori_sec(p_id, p_kategori); return; end if;
  perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
  d := public.duello_kilitle(p_id);
  if d.durum <> 'aktif' then raise exception 'Düello bitti'; end if;
  if d.faz <> 'kategori' or d.saldiran <> auth.uid() then raise exception 'Şu an kategori seçme sırası sende değil'; end if;
  if not public.duello_kategori_uygun_mu(p_id, auth.uid(), p_kategori) then
    raise exception 'Bu kategori şu an seçilemez';
  end if;
  perform public.duello_kategori_uygula(p_id, p_kategori);
  select * into d from public.duellolar where id = p_id;
  perform public.gorulen_kaydet(d.soru_id);
  perform public.duello_sinyal_ver(p_id);
end $function$
;

CREATE OR REPLACE FUNCTION public.duello_saldiri_jokeri(p_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_me uuid := auth.uid();
  v_ucretsiz boolean;
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then perform public.duello2_skill(p_id, p_tur); return; end if;
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  if p_tur <> 'zaman_baskisi' then raise exception 'Bu saldırı skill''i artık aktif değil'; end if;
  d := public.duello_kilitle(p_id);
  if d.durum<>'aktif' or d.faz<>'hazirlik' or d.saldiran<>v_me or now()>=d.faz_bitis then
    raise exception 'Saldırı skilleri yalnız Saldırı Hazırlığı sırasında kullanılır';
  end if;
  if d.zaman_baskisi then raise exception 'Bu skill bu saldırıda zaten kullanıldı'; end if;
  perform public.joker_hak_kontrol('duello',p_id,p_tur);
  v_ucretsiz := public.jokerler_serbest();
  if not v_ucretsiz then
    perform public.joker_hareket(v_me,p_tur,-1,'kullanim','duello:'||p_id::text);
  end if;
  insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
  values(v_me,'duello',p_id,d.tur*2+d.saldiri_sirasi,p_tur,v_ucretsiz);
  update public.duellolar set zaman_baskisi=true,son_hareket=now() where id=p_id;
  perform public.duello_sinyal_ver(p_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.duello_savunma_jokeri(p_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype; v_me uuid:=auth.uid(); v_ucretsiz boolean:=false;
  v_dogru smallint; v_soru uuid;
begin
  -- Düello 1.0: surum = 2 maçta yeni akış.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then perform public.duello2_skill(p_id, p_tur); return; end if;
  perform public.hiz_siniri('duello_eylem',90,interval '60 seconds');
  if p_tur not in ('elli','sure','soru_degistir','ikinci_sans') then raise exception 'Geçersiz skill'; end if;
  d:=public.duello_kilitle(p_id);
  if d.durum<>'aktif' or d.faz<>'cevap' or d.saldiran=v_me or now()>d.faz_bitis then
    raise exception 'Savunma skilleri yalnız cevap verirken kullanılır';
  end if;
  if p_tur='elli' and d.elli_kapali is not null then raise exception 'Bu soruda 50:50 zaten kullanıldı'; end if;
  if p_tur='sure' and d.ek_sure then raise exception 'Bu soruda Ek Süre zaten kullanıldı'; end if;
  if p_tur='soru_degistir' and d.soru_degisti_savunma then raise exception 'Bu soruda Soru Değiştir zaten kullanıldı'; end if;
  perform public.joker_hak_kontrol('duello',p_id,p_tur);
  v_ucretsiz:=public.jokerler_serbest();
  if not v_ucretsiz then perform public.joker_hareket(v_me,p_tur,-1,'kullanim','duello:'||p_id::text); end if;
  insert into public.joker_kullanimlari(user_id,mac_tur,mac_id,soru_index,tur,ucretsiz)
  values(v_me,'duello',p_id,d.tur*2+d.saldiri_sirasi,p_tur,v_ucretsiz);
  if p_tur='elli' then
    select dogru_cevap into v_dogru from public.questions where id=d.soru_id;
    update public.duellolar set elli_kapali=(select array_agg(x) from
      (select x from generate_series(0,3)x where x<>v_dogru order by random() limit 2)s),son_hareket=now() where id=p_id;
  elsif p_tur='sure' then
    update public.duellolar set ek_sure=true,
      faz_bitis=faz_bitis+make_interval(secs=>public.ayar_sayi('duello_ek_sure_sn',5)),son_hareket=now() where id=p_id;
  elsif p_tur='soru_degistir' then
    v_soru:=public.duello_soru_bul(p_id,d.kategori,array[v_me,d.saldiran],d.kullanilan_sorular);
    if v_soru is null then raise exception 'Bu kategoride başka soru kalmadı'; end if;
    update public.duellolar set soru_id=v_soru,soru_degisti_savunma=true,elli_kapali=null,
      kullanilan_sorular=kullanilan_sorular||v_soru,
      faz_bitis=now()+make_interval(secs=>case when zaman_baskisi then public.ayar_sayi('duello_zaman_baskisi_sn',10)
        else public.ayar_sayi('duello_cevap_sn',15) end),son_hareket=now() where id=p_id;
  else
    update public.duellolar set son_hareket=now() where id=p_id;
  end if;
  perform public.duello_sinyal_ver(p_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.duello_cozumle(p_id uuid, p_cevap smallint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_savunan uuid;
  v_dogru_cevap smallint;
  v_dogru boolean;
  v_riskli boolean;
  v_kaybeden uuid;
begin
  -- Düello 1.0: eski çözümleyici surum = 2 maça dokunmaz (eski bot bu yoldan
  -- cevap veriyordu; v2 botu Oturum 3'te). Yeni çözümleyici: duello2_cozumle.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then return; end if;
  select * into d from public.duellolar where id = p_id;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  select dogru_cevap into v_dogru_cevap from public.questions where id = d.soru_id;
  v_dogru := p_cevap is not null and p_cevap = v_dogru_cevap;
  v_riskli := d.kategori is not distinct from (case when v_savunan = d.oyuncu1 then d.zayif1 else d.zayif2 end)
              and d.kategori is not null;

  if v_dogru then
    v_kaybeden := case when v_riskli then d.saldiran else null end;
  else
    v_kaybeden := v_savunan;
  end if;

  update public.duellolar
     set can1 = can1 - (case when v_kaybeden = oyuncu1 then 1 else 0 end),
         can2 = can2 - (case when v_kaybeden = oyuncu2 then 1 else 0 end),
         dogru1 = dogru1 + (case when v_dogru and v_savunan = oyuncu1 then 1 else 0 end),
         dogru2 = dogru2 + (case when v_dogru and v_savunan = oyuncu2 then 1 else 0 end),
         faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello_sonuc_sn', 3)),
         son_hamle = jsonb_build_object(
           'tur', d.tur, 'saldiran', d.saldiran, 'savunan', v_savunan, 'kategori', d.kategori,
           'soru_id', d.soru_id, 'cevap', p_cevap, 'dogru', v_dogru, 'dogru_cevap', v_dogru_cevap,
           'riskli', v_riskli, 'can_kaybeden', v_kaybeden),
         son_hareket = now()
   where id = p_id;

  insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, cevap, dogru,
                                      riskli, can_kaybeden, zaman_baskisi, savunma_kilidi)
  values (p_id, d.tur, d.saldiran, v_savunan, d.kategori, d.soru_id, p_cevap, v_dogru,
          v_riskli, v_kaybeden, d.zaman_baskisi, d.savunma_kilidi);

  perform public.kategori_istatistik_yaz(v_savunan, d.kategori, v_dogru);
  -- Paket 20 I.2: Düello doğrusu kategori ustalığını besler (eskiden yalnız yüzde tablosu yazılıyordu)
  if v_dogru then perform public.kategori_dogru_arttir(v_savunan, d.kategori); end if;
  if p_cevap is not null then perform public.soru_sayac(d.soru_id, v_dogru); end if;
  if not v_dogru and auth.uid() = v_savunan then perform public.yanlis_kaydet(d.soru_id); end if;
end $function$
;

CREATE OR REPLACE FUNCTION public.duello_kategori_uygula(p_id uuid, p_kategori text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_savunan uuid;
  v_soru uuid;
begin
  -- Düello 1.0: surum = 2 maçta soru iki oyuncuya aynı anda açılır. Eski yoldan
  -- (ör. bot) gelen kategori v2 kuralına uymuyorsa uygun olanlardan rastgele seçilir.
  if exists (select 1 from public.duellolar where id = p_id and surum = 2) then
    if not public.duello2_kategori_uygun_mu(p_id, p_kategori) then
      select k into p_kategori from unnest(public.duello_kategorileri()) k
       where public.duello2_kategori_uygun_mu(p_id, k) order by random() limit 1;
    end if;
    perform public.duello2_soru_ac(p_id, p_kategori);
    return;
  end if;
  select * into d from public.duellolar where id = p_id;
  v_savunan := case when d.saldiran = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end;
  v_soru := public.duello_soru_bul(p_id, p_kategori, array[v_savunan, d.saldiran], d.kullanilan_sorular);
  if v_soru is null then raise exception 'Bu kategoride soru kalmadı'; end if;

  update public.duellolar
     set kategori = p_kategori, soru_id = v_soru, faz = 'hazirlik',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello_hazirlik_sn', 4)),
         soru_degisti_saldiri = false, soru_degisti_savunma = false,
         zaman_baskisi = false, savunma_kilidi = false, ek_sure = false, elli_kapali = null,
         kullanilan_sorular = kullanilan_sorular || v_soru,
         son_hareket = now()
   where id = p_id;
end $function$
;

CREATE OR REPLACE FUNCTION public.joker_hak_kontrol(p_mac_tur text, p_mac_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_sinir int;
  v_kullanilan int;
  v_tur_kullanilan int;
begin
  -- Düello 1.0: surum = 2 maçta 4 toplam / aynı skill 2 / soruda 1.
  if p_mac_tur = 'duello' and exists (select 1 from public.duellolar where id = p_mac_id and surum = 2) then
    perform public.duello2_skill_hak_kontrol(p_mac_id, v_me, p_tur);
    return;
  end if;
  if p_mac_tur = '1v1' and exists (
    select 1 from public.matches m where m.id = p_mac_id and coalesce(m.jokersiz, false)
  ) then
    raise exception 'Bu modda skill kullanılamaz';
  end if;

  if p_mac_tur = '1v1' then
    v_sinir := public.ayar_sayi('klasik_skill_toplam_hak', 6)::int;
    select count(*), count(*) filter (where tur = p_tur)
      into v_kullanilan, v_tur_kullanilan
      from public.joker_kullanimlari
     where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id;
    if v_kullanilan >= v_sinir then
      raise exception 'Bu maçta en fazla % skill kullanabilirsin', v_sinir;
    end if;
    if v_tur_kullanilan >= public.ayar_sayi('klasik_skill_tur_basi_hak', 2)::int then
      raise exception 'Bu skill için maç hakkın doldu';
    end if;
    return;
  end if;

  -- Grup/turnuva/düello kuralları değişmedi.
  if exists (
    select 1 from public.joker_kullanimlari
     where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id and tur = p_tur
  ) then
    raise exception 'Bu skill''i bu maçta zaten kullandın';
  end if;
  if p_mac_tur = 'duello' then
    v_sinir := public.ayar_sayi('duello_joker_hak', 4)::int;
  else
    v_sinir := public.joker_mac_siniri(p_mac_tur, p_mac_id);
  end if;
  if v_sinir = 0 then raise exception 'Turnuva finalinde skill kullanılamaz'; end if;
  if v_sinir is null then return; end if;
  select count(*) into v_kullanilan from public.joker_kullanimlari
   where user_id = v_me and mac_tur = p_mac_tur and mac_id = p_mac_id;
  if v_kullanilan >= v_sinir then
    raise exception 'Bu maçta en fazla % skill kullanabilirsin', v_sinir;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.skill_kullanim_kapisi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_bot boolean := false;
  v_secili text[];
  v_soru uuid;
  v_bas timestamptz;
  v_m public.matches%rowtype;
  v_aktif_soru int;
  v_rakip uuid;
begin
  select coalesce(p.is_bot, false) into v_bot from public.profiles p where p.id = new.user_id;
  if not public.skill_aktif(new.tur) then
    if v_bot then return null; end if;
    raise exception 'Bu skill artık aktif değil';
  end if;

  if not v_bot then
    select coalesce(s.skiller, array['elli','sure','soru_degistir']::text[])
      into v_secili from (select 1) z
      left join public.oyuncu_skill_setleri s on s.user_id = new.user_id;
    if not (new.tur = any(v_secili)) then raise exception 'Bu skill maç setinde değil'; end if;
  end if;

  if new.mac_tur = '1v1' then
    select * into v_m from public.matches where id = new.mac_id for update;
    if not found or v_m.durum <> 'aktif' then raise exception 'Maç aktif değil'; end if;
    if new.user_id not in (v_m.oyuncu1, v_m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
    if coalesce(v_m.jokersiz, false) then raise exception 'Bu modda skill kullanılamaz'; end if;
    v_aktif_soru := case when coalesce(v_m.senkron, false) then v_m.aktif_soru
      when v_m.oyuncu1 = new.user_id then coalesce(v_m.oyuncu1_soru, 0)
      else coalesce(v_m.oyuncu2_soru, 0) end;
    if new.soru_index <> v_aktif_soru then raise exception 'Soru değişti, tekrar dene'; end if;
    if exists (select 1 from public.match_answers a
      where a.match_id = new.mac_id and a.user_id = new.user_id and a.soru_index = new.soru_index)
    then raise exception 'Bu soruyu zaten cevapladın'; end if;
    if (select count(*) from public.joker_kullanimlari k
      where k.user_id=new.user_id and k.mac_tur='1v1' and k.mac_id=new.mac_id)
      >= public.ayar_sayi('klasik_skill_toplam_hak',6)::int
    then raise exception 'Bu maçtaki skill hakkın doldu'; end if;
    if (select count(*) from public.joker_kullanimlari k
      where k.user_id=new.user_id and k.mac_tur='1v1' and k.mac_id=new.mac_id and k.tur=new.tur)
      >= public.ayar_sayi('klasik_skill_tur_basi_hak',2)::int
    then raise exception 'Bu skill için maç hakkın doldu'; end if;
    if (select count(*) from public.joker_kullanimlari k
      where k.user_id=new.user_id and k.mac_tur='1v1' and k.mac_id=new.mac_id and k.soru_index=new.soru_index)
      >= public.ayar_sayi('klasik_skill_soru_basi_hak',1)::int
    then raise exception 'Bu soruda skill hakkını kullandın'; end if;
    if new.tur = 'zaman_baskisi' then
      v_rakip := case when v_m.oyuncu1=new.user_id then v_m.oyuncu2 else v_m.oyuncu1 end;
      if exists (select 1 from public.match_answers a
        where a.match_id=new.mac_id and a.user_id=v_rakip and a.soru_index=new.soru_index)
      then raise exception 'Rakibin bu soruyu zaten cevapladı'; end if;
    end if;
  end if;

  -- Düello 1.0: surum = 2 maçta skill sınırları tetikleyicide de uygulanır (bot dahil).
  if new.mac_tur = 'duello' and exists (select 1 from public.duellolar where id = new.mac_id and surum = 2) then
    if not public.duello2_skill_kapisi(new.mac_id, new.user_id, new.soru_index, new.tur, v_bot) then
      return null;
    end if;
  end if;

  if new.tur = 'sure' and new.mac_tur <> 'turnuva' then
    if new.mac_tur = '1v1' then
      v_soru := public.soru_id_coz('1v1', new.mac_id, new.user_id, new.soru_index,
        v_m.soru_ids[new.soru_index + 1]);
      v_bas := public.soru_baslangic_coz('1v1', new.mac_id, new.user_id, new.soru_index,
        case when coalesce(v_m.senkron,false) then v_m.soru_baslangic
             when v_m.oyuncu1 = new.user_id then v_m.oyuncu1_baslangic else v_m.oyuncu2_baslangic end);
    elsif new.mac_tur = 'grup' then
      select public.soru_id_coz('grup',g.id,new.user_id,new.soru_index,g.soru_ids[new.soru_index+1]),
             public.soru_baslangic_coz('grup',g.id,new.user_id,new.soru_index,g.soru_baslangic)
        into v_soru,v_bas from public.group_matches g where g.id=new.mac_id;
    elsif new.mac_tur = 'hizli' then
      select public.soru_id_coz('hizli',h.id,new.user_id,new.soru_index,h.soru_ids[new.soru_index+1]),
             public.soru_baslangic_coz('hizli',h.id,new.user_id,new.soru_index,h.soru_baslangic)
        into v_soru,v_bas from public.hizli_maclar h where h.id=new.mac_id;
    end if;
    if v_soru is not null and v_bas is not null then
      insert into public.soru_degisimleri(mac_tur,mac_id,user_id,soru_index,question_id,baslangic)
      values(new.mac_tur,new.mac_id,new.user_id,new.soru_index,v_soru,v_bas)
      on conflict(mac_tur,mac_id,user_id,soru_index) do nothing;
    end if;
  end if;
  return new;
end;
$function$
;
