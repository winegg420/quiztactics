-- ============================================================
-- 680 · DÜELLO HÂKİMİYET ÇEKİRDEĞİ + BASKIN / KALKAN JOKERLERİ (Ida, 30 Eyl 2026)
--
-- Puan sistemi (666/667/671) YENİ maçlarda kalkar. 10 tur (1 tur = 1 hamle; roller her tur
-- el değiştirir), 10 kategori, herkes 0-0 ve bütün kategoriler boş başlar.
-- HAMLE KURALI: hamle yalnız "saldıran doğru + savunan yanlış" ise tutar.
--   · rakibin kategorisi → tutarsa saldırana geçer
--   · boş kategori → tutarsa saldıran alır; saldıran yanlış + savunan doğru → savunan alır
--   · kendi kategorisi (pekiştir) → tutarsa kilitlenir
-- KİLİT: sahipliği değişen / pekiştirilen kategori duello_kilit_tur (2) tur seçilemez.
-- KAZANMA: duello_hakimiyet_esik (4) yuvaya ilk ulaşan kazanır; 10. tur sonunda çok yuva,
-- eşitse Altın Soru (sahiplik değişmez). Hesap tamamen sunucuda (FOR UPDATE).
-- JOKERLER: Baskın (saldıran; savunanın cevabı sayılmaz) · Kalkan (savunan, yalnız kendi kategorisine
-- saldırılırken; hamle tutmaz). Maçta 1'er kez, Düello joker limiti (4) içinde; tur sonuna kadar
-- rakibe gizli; ikisi aynı hamlede → birbirini götürür, ikisi de harcanır.
-- ESKİ Kategori Kalkanı (650) KAPANDI: ayar 0 + RPC reddeder. Kolonları/geçmiş veri durur.
-- Eski puan maçları (hakimiyet = false) eski kodla çözülür — dallar korunur.
-- ============================================================

-- ---------------------------------------------------------------- şema
alter table public.duellolar
  add column if not exists hakimiyet boolean not null default false,
  add column if not exists sahiplik jsonb not null default '{}'::jsonb,     -- {kategori: sahip uuid}
  add column if not exists kilitler jsonb not null default '{}'::jsonb,     -- {kategori: son kilitli tur}
  add column if not exists hakimiyet_esik smallint,
  add column if not exists kilit_tur smallint,
  add column if not exists yuva1 smallint,
  add column if not exists yuva2 smallint;

alter table public.duello_hamleler
  add column if not exists hakimiyet jsonb;   -- {eylem, tuttu, neden, sahip_once, sahip_sonra, kilit, baskin, kalkan, cakisma, yuvalar, esik}

alter table public.joker_envanter drop constraint if exists joker_envanter_tur_check;
alter table public.joker_envanter add constraint joker_envanter_tur_check check (tur = any (array[
  'elli', 'sure', 'pas', 'seri_koruma', 'soru_degistir', 'zaman_baskisi', 'saldiri_degistir',
  'savunma_kilidi', 'sis', 'sigorta', 'cifte_puan', 'ikinci_sans', 'baskin', 'kalkan']::text[]));

insert into public.skill_katalogu (tur, aktif, kilit_fiyati, gereken_level, sira, aciklama) values
  ('baskin', true, 0, 1, 8, 'Baskın (yalnız Düello, saldıran)'),
  ('kalkan', true, 0, 1, 9, 'Kalkan (yalnız Düello, savunan)')
on conflict (tur) do update set aktif = excluded.aktif, sira = excluded.sira, aciklama = excluded.aciklama;

-- ---------------------------------------------------------------- ayarlar (koda gömülmez)
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_hakimiyet_esik', '4'::jsonb, 'Düello Hâkimiyet: bu kadar kategoriye (yuva) ilk ulaşan kazanır'),
  ('duello_kilit_tur', '2'::jsonb, 'Düello Hâkimiyet: sahipliği değişen/pekiştirilen kategori bu kadar tur seçilemez'),
  ('duello_rol_joker_mac_hak', '1'::jsonb, 'Düello: Baskın ve Kalkan maçta en fazla kaç kez (her biri)'),
  ('coin_joker_baskin', '70'::jsonb, 'Baskın jokeri tek fiyatı (test)'),
  ('coin_joker_baskin_10', '595'::jsonb, 'Baskın jokeri 10''lu paket (%15 indirim)'),
  ('coin_joker_kalkan', '50'::jsonb, 'Kalkan jokeri tek fiyatı (test)'),
  ('coin_joker_kalkan_10', '425'::jsonb, 'Kalkan jokeri 10''lu paket (%15 indirim)'),
  ('rozet_geri_donus_yuva_farki', '2'::jsonb, 'Büyük Geri Dönüş rozeti (Hâkimiyet): rakip bu kadar yuva öndeyken kazanmak')
on conflict (anahtar) do update set deger = excluded.deger, aciklama = excluded.aciklama;

update public.oyun_ayarlari set deger = '0'::jsonb,
       aciklama = 'KAPALI (680): eski ücretsiz Kategori Kalkanı Hâkimiyet ile kalktı; yeni Kalkan jokeri ayrıdır'
 where anahtar = 'duello2_kalkan_acik';
update public.oyun_ayarlari
   set aciklama = 'KULLANILMIYOR (680, Hâkimiyet): ' || regexp_replace(coalesce(aciklama, ''), '^KULLANILMIYOR \([0-9]+\): ', '')
 where anahtar in ('duello_puan_yildiz1', 'duello_puan_yildiz2', 'duello_puan_yildiz3', 'duello_carpanli_turlar',
                   'duello_carpan_katsayi', 'duello_yildiz_ust_yuzde', 'duello_yildiz_alt_yuzde',
                   'duello2_bot_risk_esik_tur', 'duello2_bot_risk_puan_farki', 'duello_kalkan_pencere1_son_tur',
                   'duello_kalkan_pencere2_son_tur', 'duello2_kalkan_son_sn', 'duello2_bot_kalkan_yuzde',
                   'duello2_bot_kalkan_kritik_yuzde', 'rozet_kil_payi_puan', 'rozet_geri_donus_puan_farki')
   and coalesce(aciklama, '') not like 'KULLANILMIYOR (680%';

-- ---------------------------------------------------------------- küçük fonksiyonlar
CREATE OR REPLACE FUNCTION public.duello2_izinli_skiller()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$ select array['elli','sure','soru_degistir','zaman_baskisi','ikinci_sans','baskin','kalkan']::text[] $function$;

-- Kilitli kategori (kilitler[k] >= bu tur) seçilemez.
CREATE OR REPLACE FUNCTION public.duello2_kategori_uygun_mu(p_id uuid, p_kategori text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p_kategori = any(public.duello_kategorileri())
     and p_kategori is distinct from public.duello2_aktif_kalkan(p_id)          -- 650 (kapalı; geçmiş için)
     and public.duello_kategori_kapsam_uygun(p_id, p_kategori)                  -- 652
     and not exists (select 1 from public.duellolar d                           -- 680: kilit
                      where d.id = p_id and coalesce(d.hakimiyet, false)
                        and coalesce((d.kilitler ->> p_kategori)::int, 0) >= d.tur);
$function$;

-- Eski ücretsiz Kategori Kalkanı: sunucuda kullanılamaz (ayar kapalı olsa da açık kapı bırakılmaz).
CREATE OR REPLACE FUNCTION public.duello2_kalkan(p_id uuid, p_kategori text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  raise exception 'Kategori Kalkanı kaldırıldı';
end $function$;

-- ---------------------------------------------------------------- duello_olustur
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

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$
;

-- ---------------------------------------------------------------- duello2_skill_kapisi
CREATE OR REPLACE FUNCTION public.duello2_skill_kapisi(p_id uuid, p_user uuid, p_index integer, p_tur text, p_bot boolean)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  select * into d from public.duellolar where id = p_id for update;
  if not found or d.durum <> 'aktif' or d.faz <> 'cevap' then raise exception 'Şu an skill kullanılamaz'; end if;
  if p_user not in (d.oyuncu1, d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;
  if not (p_tur = any(public.duello2_izinli_skiller())) then   -- 680: liste tek yerde (Baskın/Kalkan dahil)
    if p_bot then return false; end if;
    raise exception 'Bu skill Düello modunda kullanılamaz';
  end if;
  if p_index is distinct from d.tur * 2 + d.saldiri_sirasi then raise exception 'Soru değişti, tekrar dene'; end if;
  perform public.duello2_skill_hak_kontrol(p_id, p_user, p_tur);
  return true;
end $function$
;

-- ---------------------------------------------------------------- duello2_skill_hak_kontrol
CREATE OR REPLACE FUNCTION public.duello2_skill_hak_kontrol(p_id uuid, p_user uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_idx int;
  v_toplam int;
  v_tur int;
  v_soru int;
begin
  select * into d from public.duellolar where id = p_id;
  if not (p_tur = any(public.duello2_izinli_skiller())) then   -- 680: liste tek yerde
    raise exception 'Bu skill Düello modunda kullanılamaz';
  end if;
  if coalesce(d.uzatma, false) then raise exception 'Altın Soru''da joker kullanılamaz'; end if;   -- 666
  -- 680: Hâkimiyet rol jokerleri — Baskın yalnız saldıran, Kalkan yalnız kendi kategorisine saldırılan
  -- savunan. Bot ve satın alma yolu da bu kapıdan geçer (joker_hak_kontrol / duello2_skill_kapisi).
  if p_tur in ('baskin', 'kalkan') then
    if not coalesce(d.hakimiyet, false) then raise exception 'Bu joker bu maçta kullanılamaz'; end if;
    if d.faz <> 'cevap' or d.kategori is null then raise exception 'Bu joker yalnız soru açıkken kullanılır'; end if;
    if p_tur = 'baskin' and p_user is distinct from d.saldiran then
      raise exception 'Baskın yalnız saldırırken kullanılır';
    end if;
    if p_tur = 'kalkan' then
      if p_user = d.saldiran then raise exception 'Kalkan yalnız savunurken kullanılır'; end if;
      if (d.sahiplik ->> d.kategori) is distinct from p_user::text then
        raise exception 'Kalkan yalnız senin kategorine saldırılırken kullanılır';
      end if;
    end if;
  end if;
  v_idx := d.tur * 2 + d.saldiri_sirasi;
  select count(*), count(*) filter (where k.tur = p_tur), count(*) filter (where k.soru_index = v_idx)
    into v_toplam, v_tur, v_soru
    from public.joker_kullanimlari k
   where k.user_id = p_user and k.mac_tur = 'duello' and k.mac_id = p_id;
  if v_toplam >= public.ayar_sayi('duello2_skill_toplam_hak', 4) then
    raise exception 'Bu maçta en fazla % skill kullanabilirsin', public.ayar_sayi('duello2_skill_toplam_hak', 4);
  end if;
  if v_tur >= (case when p_tur in ('baskin', 'kalkan') then public.ayar_sayi('duello_rol_joker_mac_hak', 1)
                  else public.ayar_sayi('duello2_skill_tur_basi_hak', 2) end) then
    raise exception 'Bu skill için maç hakkın doldu';
  end if;
  if v_soru >= public.ayar_sayi('duello2_skill_soru_basi_hak', 1) then
    raise exception 'Bu soruda skill hakkını kullandın';
  end if;
end $function$
;

-- ---------------------------------------------------------------- duello2_skill
CREATE OR REPLACE FUNCTION public.duello2_skill(p_id uuid, p_tur text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- 680: Hâkimiyet rol jokerleri. Etkisi tur sonunda (duello2_cozumle); o ana kadar rakibe gizli.
  if p_tur in ('baskin', 'kalkan') then
    if not coalesce(d.hakimiyet, false) or d.uzatma then raise exception 'Bu joker bu maçta kullanılamaz'; end if;
    if p_tur = 'baskin' and v_me <> d.saldiran then raise exception 'Baskın yalnız saldırırken kullanılır'; end if;
    if p_tur = 'kalkan' then
      if v_me = d.saldiran then raise exception 'Kalkan yalnız savunurken kullanılır'; end if;
      if (d.sahiplik ->> d.kategori) is distinct from v_me::text then
        raise exception 'Kalkan yalnız senin kategorine saldırılırken kullanılır';
      end if;
    end if;
  end if;
  if p_tur = 'soru_degistir' then
    if d.cevaplar <> '{}'::jsonb or exists (select 1 from public.skill_ikinci_sans_denemeleri s
         where s.mac_tur = 'duello' and s.mac_id = p_id and s.soru_index = v_idx) then
      raise exception 'Cevap verildikten sonra soru değiştirilemez';
    end if;
    if exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                 and k.user_id = v_rakip and k.soru_index = v_idx
                 and k.tur not in ('baskin', 'kalkan')) then   -- 680: rol jokerleri gizli, soruya dokunmaz
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
    v_yeni := now() + make_interval(secs => public.ayar_sayi('duello2_cevap_sn', 15)) + public.duello2_gosterim_payi();
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
end $function$
;

-- ---------------------------------------------------------------- skill_setimi_kaydet
CREATE OR REPLACE FUNCTION public.skill_setimi_kaydet(p_skiller text[], p_mod text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_slot int := public.ayar_sayi('skill_seti_slot', 3)::int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_mod not in ('1v1', 'duello') then raise exception 'Geçersiz mod'; end if;
  if p_skiller is null or cardinality(p_skiller) = 0 or cardinality(p_skiller) > v_slot then
    raise exception 'En fazla % skill seçebilirsin', v_slot;
  end if;
  if cardinality(p_skiller) <> (select count(distinct x) from unnest(p_skiller) x)
     or exists (select 1 from unnest(p_skiller) x where not public.skill_aktif(x)) then
    raise exception 'Geçersiz skill seti';
  end if;
  if p_mod = 'duello' and exists (select 1 from unnest(p_skiller) x where not (x = any(public.duello2_izinli_skiller()))) then
    raise exception 'Bu skill Düello''da kullanılamaz';
  end if;
  -- 680: Baskın/Kalkan yalnız Düello (Hâkimiyet) jokeridir.
  if p_mod = '1v1' and exists (select 1 from unnest(p_skiller) x where x in ('baskin', 'kalkan')) then
    raise exception 'Bu skill yalnız Düello''da kullanılır';
  end if;
  if exists (select 1 from unnest(p_skiller) x where not public.skill_kilidi_acik(v_me, x)) then
    raise exception 'Bu skill kilitli';
  end if;
  if p_mod = 'duello' then
    insert into public.oyuncu_skill_setleri(user_id, skiller, skiller_duello, guncellendi)
    values (v_me, array['elli','sure','soru_degistir']::text[], p_skiller, now())
    on conflict (user_id) do update set skiller_duello = excluded.skiller_duello, guncellendi = now();
  else
    insert into public.oyuncu_skill_setleri(user_id, skiller, guncellendi)
    values (v_me, p_skiller, now())
    on conflict (user_id) do update set skiller = excluded.skiller, guncellendi = now();
  end if;
  return p_skiller;
end;
$function$
;

-- ---------------------------------------------------------------- duello2_cozumle
CREATE OR REPLACE FUNCTION public.duello2_cozumle(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_dc smallint;
  v_savunan uuid;
  v_c_sal smallint;
  v_c_sav smallint;
  v_d_sal boolean;
  v_d_sav boolean;
  v_idx int;
  v_o uuid;
  v_c smallint;
  v_kalkan_kat text;
  v_yildiz smallint;
  v_deger_taban int;
  v_carpan numeric;
  v_deger int;
  v_p_sal int := 0;
  v_p_sav int := 0;
  v_sal_once int;
  v_altin uuid;
  -- 680: Hâkimiyet
  v_hk jsonb;
  v_sahip text;
  v_eylem text;
  v_baskin boolean := false;
  v_kalkan boolean := false;
  v_cakisma boolean := false;
  v_sav_sayilir boolean;
  v_tuttu boolean := false;
  v_yeni_sahip text;
  v_neden text;
  v_kilit boolean := false;
  v_sahiplik jsonb;
  v_kilitler jsonb;
  v_y1 int;
  v_y2 int;
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
  v_sal_once := case when d.saldiran = d.oyuncu1 then coalesce(d.puan1, 0) else coalesce(d.puan2, 0) end;

  if coalesce(d.hakimiyet, false) and not d.uzatma then
    -- 680 · HAMLE KURALI: hamle yalnız "saldıran doğru + savunan yanlış" ise tutar.
    --   Rakibin kategorisi (elinden_al): tutarsa saldırana geçer. Boş (al): tutarsa saldıran alır;
    --   saldıran yanlış + savunan doğru → savunan alır (kontra). Kendi kategorisi (pekistir): tutarsa kilitlenir.
    --   Sahipliği değişen ya da pekiştirilen kategori kilit_tur tur seçilemez (kilitler[k] = son kilitli tur).
    -- Jokerler (bu soru indeksinde): Baskın (saldıran) → savunanın cevabı sayılmaz; Kalkan (savunan, yalnız
    --   elinden_al) → hamle tutmaz. İkisi birden → birbirini götürür, ikisi de harcanmış olur, normal kural.
    v_sahip := d.sahiplik ->> d.kategori;
    v_eylem := case when v_sahip is null then 'al' when v_sahip = d.saldiran::text then 'pekistir' else 'elinden_al' end;
    v_baskin := exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello' and k.mac_id = p_id
                          and k.soru_index = v_idx and k.user_id = d.saldiran and k.tur = 'baskin');
    v_kalkan := v_eylem = 'elinden_al' and exists (select 1 from public.joker_kullanimlari k where k.mac_tur = 'duello'
                          and k.mac_id = p_id and k.soru_index = v_idx and k.user_id = v_savunan and k.tur = 'kalkan');
    v_cakisma := v_baskin and v_kalkan;
    v_sav_sayilir := v_d_sav and not (v_baskin and not v_cakisma);
    v_tuttu := v_d_sal and not v_sav_sayilir and not (v_kalkan and not v_cakisma);
    v_yeni_sahip := v_sahip;
    if v_tuttu then
      v_yeni_sahip := d.saldiran::text;
      v_kilit := true;                                     -- el değişti ya da pekiştirildi
      v_neden := case when v_baskin and not v_cakisma and v_d_sav then 'baskin' else 'tuttu' end;
    elsif v_eylem = 'al' and not v_d_sal and v_sav_sayilir then
      v_yeni_sahip := v_savunan::text;                     -- boşta bilen alır
      v_kilit := true;
      v_neden := 'kontra';
    else
      v_neden := case when v_kalkan and not v_cakisma and v_d_sal then 'kalkan'
                      when v_d_sal and v_d_sav then 'ikisi_dogru'
                      when not v_d_sal and not v_d_sav then 'ikisi_yanlis'
                      else 'saldiran_yanlis' end;
    end if;
    v_sahiplik := case when v_yeni_sahip is null then coalesce(d.sahiplik, '{}'::jsonb)
                       else coalesce(d.sahiplik, '{}'::jsonb) || jsonb_build_object(d.kategori, v_yeni_sahip) end;
    v_kilitler := case when v_kilit and coalesce(d.kilit_tur, 0) > 0
                       then coalesce(d.kilitler, '{}'::jsonb) || jsonb_build_object(d.kategori, d.tur + d.kilit_tur)
                       else coalesce(d.kilitler, '{}'::jsonb) end;
    select count(*) filter (where e.value #>> '{}' = d.oyuncu1::text),
           count(*) filter (where e.value #>> '{}' = d.oyuncu2::text)
      into v_y1, v_y2 from jsonb_each(v_sahiplik) e;
    v_hk := jsonb_build_object(
      'eylem', v_eylem, 'tuttu', v_tuttu, 'neden', v_neden,
      'sahip_once', v_sahip, 'sahip_sonra', v_yeni_sahip,
      'kilit', case when v_kilit and coalesce(d.kilit_tur, 0) > 0 then d.kilit_tur else 0 end,
      'baskin', v_baskin, 'kalkan', v_kalkan, 'cakisma', v_cakisma,
      'yuvalar', jsonb_build_object(d.oyuncu1::text, v_y1, d.oyuncu2::text, v_y2),
      'esik', d.hakimiyet_esik);
  elsif d.uzatma then
    -- Altın Soru: puan yok, çarpan/ceza yok; yalnız biri doğruysa o kazanır.
    v_altin := case when v_d_sal and not v_d_sav then d.saldiran
                    when v_d_sav and not v_d_sal then v_savunan end;
  else
    select e ->> 'kategori' into v_kalkan_kat
      from jsonb_array_elements(case when v_savunan = d.oyuncu1 then d.kalkanlar1 else d.kalkanlar2 end) e
     where (e ->> 'idx')::int = v_idx limit 1;
    -- Değer: savunanın (rakibin) maç başında sabitlenen kategori yıldızı; son 2 turda ×çarpan (667).
    v_yildiz := coalesce((case when v_savunan = d.oyuncu1 then d.yildiz1 else d.yildiz2 end ->> d.kategori)::smallint, 2);
    v_deger_taban := coalesce((d.puan_degerleri ->> v_yildiz::text)::int, (public.duello_puan_degerleri() ->> v_yildiz::text)::int);
    v_carpan := public.duello_tur_carpani(d.tur, d.carpanli_turlar, d.carpan_katsayi);
    v_deger := round(v_deger_taban * v_carpan)::int;
    -- 667: saldıran yanlış/yanıtsız → kategori değeri kadar kayıp (taban 0'da durur); savunan hiç kaybetmez.
    v_p_sal := case when v_d_sal then v_deger else greatest(-v_deger, -v_sal_once) end;
    v_p_sav := case when v_d_sav then v_deger else 0 end;
  end if;

  update public.duellolar
     set sahiplik = coalesce(v_sahiplik, sahiplik),
         kilitler = coalesce(v_kilitler, kilitler),
         yuva1 = coalesce(v_y1, yuva1),
         yuva2 = coalesce(v_y2, yuva2),
         puan1 = greatest(0, coalesce(puan1, 0) + (case when oyuncu1 = d.saldiran then v_p_sal else v_p_sav end)),
         puan2 = greatest(0, coalesce(puan2, 0) + (case when oyuncu2 = d.saldiran then v_p_sal else v_p_sav end)),
         dogru1 = dogru1 + (case when (oyuncu1 = d.saldiran and v_d_sal) or (oyuncu1 = v_savunan and v_d_sav) then 1 else 0 end),
         dogru2 = dogru2 + (case when (oyuncu2 = d.saldiran and v_d_sal) or (oyuncu2 = v_savunan and v_d_sav) then 1 else 0 end),
         faz = 'sonuc',
         faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello_sonuc_sn', 3)),
         son_hamle = jsonb_build_object(
           'surum', 2, 'tur', d.tur, 'saldiri_sirasi', d.saldiri_sirasi, 'uzatma', d.uzatma,
           'saldiran', d.saldiran, 'savunan', v_savunan, 'kategori', d.kategori,
           'soru_id', d.soru_id, 'dogru_cevap', v_dc,
           'yildiz', v_yildiz, 'deger', v_deger, 'carpan', coalesce(v_carpan, 1), 'altin_kazanan', v_altin, 'kalkan', v_kalkan_kat,
           'hakimiyet', v_hk,
           'puanlar', jsonb_build_object(d.saldiran::text, v_p_sal, v_savunan::text, v_p_sav),
           'cevaplar', jsonb_build_object(
             d.saldiran::text, jsonb_build_object('cevap', v_c_sal, 'dogru', v_d_sal, 'yanitsiz', v_c_sal is null),
             v_savunan::text, jsonb_build_object('cevap', v_c_sav, 'dogru', v_d_sav, 'yanitsiz', v_c_sav is null))),
         son_hareket = now()
   where id = p_id;

  insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, soru_id, cevap, dogru,
                                      riskli, can_kaybeden, zaman_baskisi, savunma_kilidi,
                                      surum, uzatma, cevap_saldiran, dogru_saldiran,
                                      yanitsiz_saldiran, yanitsiz_savunan, kalkan,
                                      yildiz, deger, carpan, puan_saldiran, puan_savunan, altin_kazanan, hakimiyet)
  values (p_id, d.tur, d.saldiran, v_savunan, d.kategori, d.soru_id, v_c_sav, v_d_sav,
          false, null, d.zaman_baskisi, false,
          2, d.uzatma, v_c_sal, v_d_sal, v_c_sal is null, v_c_sav is null, v_kalkan_kat,
          v_yildiz, v_deger, coalesce(v_carpan, 1), v_p_sal, v_p_sav, v_altin, v_hk);

  foreach v_o in array array[d.saldiran, v_savunan] loop
    v_c := case when v_o = d.saldiran then v_c_sal else v_c_sav end;
    perform public.kategori_istatistik_yaz(v_o, d.kategori, v_c is not null and v_c = v_dc);
    if v_c is not null and v_c = v_dc then perform public.kategori_dogru_arttir(v_o, d.kategori); end if;
    if v_c is not null then perform public.soru_sayac(d.soru_id, v_c = v_dc); end if;
  end loop;

  delete from public.skill_ikinci_sans_denemeleri
   where mac_tur = 'duello' and mac_id = p_id and soru_index = v_idx;
end $function$
;

-- ---------------------------------------------------------------- duello2_sonraki
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
end $function$
;

-- ---------------------------------------------------------------- duello2_durum
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
       'aktif', public.duello2_aktif_kalkan(p_id)));
end $function$
;

-- ---------------------------------------------------------------- rozet_olcut
CREATE OR REPLACE FUNCTION public.rozet_olcut(p_user uuid, p_olcut text)
 RETURNS bigint
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v bigint := 0;
  v_fark int;
  v_min int;
begin
  if p_user is null or p_olcut is null then return 0; end if;

  if p_olcut = 'level' then
    select coalesce(level, 1) into v from public.profiles where id = p_user;

  elsif p_olcut = 'klasik_galibiyet' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and m.kazanan = p_user;

  elsif p_olcut = 'saf_bilgi_galibiyet' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and m.kazanan = p_user and coalesce(m.jokersiz, false);

  elsif p_olcut = 'duello_galibiyet' then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user;

  elsif p_olcut = 'seri' then
    select greatest(coalesce(seri_gun, 0), coalesce(seri_en_uzun, 0), coalesce(seri, 0))
      into v from public.profiles where id = p_user;

  elsif p_olcut like 'kategori:%' then
    select coalesce(max(kd.dogru_sayisi), 0) into v from public.kategori_dogru kd
     where kd.user_id = p_user and kd.kategori = substr(p_olcut, 10);

  elsif p_olcut = 'kasif' then
    v_min := public.ayar_sayi('rozet_kasif_min_dogru', 10)::int;
    select count(*) into v from public.kategori_dogru kd
     where kd.user_id = p_user and kd.dogru_sayisi >= v_min;

  elsif p_olcut = 'turnuva_katilim' then
    select count(*) into v from public.tournament_players tp
      join public.tournaments t on t.id = tp.tournament_id
     where tp.user_id = p_user and t.durum = 'bitti' and tp.terk_at is null;

  elsif p_olcut in ('turnuva_ilk10', 'turnuva_ilk3') then
    -- Sıra, ödül dağıtımıyla aynı düzen (turnuva_odullerini_dagit)
    select count(*) into v from (
      select tp.user_id,
             row_number() over (partition by tp.tournament_id
                                order by tp.elendi asc, tp.elenme_sorusu desc nulls first,
                                         tp.dogru_sayisi desc, tp.user_id) as sira
        from public.tournament_players tp
        join public.tournaments t on t.id = tp.tournament_id and t.durum = 'bitti'
       where tp.terk_at is null and tp.tournament_id in (select x.tournament_id from public.tournament_players x where x.user_id = p_user)
    ) s
     where s.user_id = p_user and s.sira <= case when p_olcut = 'turnuva_ilk3' then 3 else 10 end;

  elsif p_olcut = 'turnuva_sampiyon' then
    select count(*) into v from public.tournaments t
     where t.durum = 'bitti' and t.kazanan = p_user;

  elsif p_olcut = 'turnuva_seans' then
    select count(distinct t.seans) into v
      from public.tournament_players tp
      join public.tournaments t on t.id = tp.tournament_id
     where tp.user_id = p_user and tp.terk_at is null
       and t.seans in (select jsonb_array_elements_text(o.deger) from public.oyun_ayarlari o
                        where o.anahtar = 'turnuva_saatleri' and jsonb_typeof(o.deger) = 'array');

  elsif p_olcut in ('lig_gumus', 'lig_altin', 'lig_elmas', 'lig_efsane') then
    -- Bir kez çıkılan lig sayılır (düşse de rozet kalır): profil + kalıcı lig çerçeveleri
    select case when greatest(
             public.lig_sirasi(coalesce(p.lig, 'bronz')),
             coalesce((select max(public.lig_sirasi(c.lig)) from public.lig_cerceveleri c where c.user_id = p_user), 1)
           ) >= public.lig_sirasi(substr(p_olcut, 5)) then 1 else 0 end
      into v from public.profiles p where p.id = p_user;

  elsif p_olcut = 'klasik_tam' then
    select count(*) into v from public.matches m
     where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
       and coalesce(array_length(m.soru_ids, 1), 0) > 0
       and (select count(distinct a.soru_index) from public.match_answers a
             where a.match_id = m.id and a.user_id = p_user and a.dogru) >= array_length(m.soru_ids, 1);

  elsif p_olcut = 'duello_son_can' then
    -- 666: puan sisteminde "Son Nefes" = en çok rozet_kil_payi_puan (3) farkla kazanılan düello
    -- (Altın Soru'suz, terksiz). Eski can maçları (puan1 boş) eski kuralla sayılmaya devam eder.
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user
       and ((d.puan1 is null and ((d.oyuncu1 = p_user and d.can1 = 1) or (d.oyuncu2 = p_user and d.can2 = 1)))
         or (d.puan1 is not null and not coalesce(d.hakimiyet, false) and not coalesce(d.uzatma, false) and d.terk_eden is null
             and abs(d.puan1 - d.puan2) between 1 and public.ayar_sayi('rozet_kil_payi_puan', 3))
         -- 680 · Hâkimiyet: rakip eşiğin bir altındayken (bir yuva daha alsa kazanacakken) kazanmak; terksiz.
         or (coalesce(d.hakimiyet, false) and d.terk_eden is null
             and (case when d.oyuncu1 = p_user then d.yuva2 else d.yuva1 end) >= d.hakimiyet_esik - 1));

  elsif p_olcut = 'duello_geri_donus' then
    -- 666: puan maçında rakip en az rozet_geri_donus_puan_farki (10) öndeyken kazanmak; eski maçlarda can farkı.
    v_fark := public.ayar_sayi('rozet_geri_donus_can_farki', 2)::int;
    v_min := public.ayar_sayi('rozet_geri_donus_puan_farki', 10)::int;
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user
       and (exists (
         select 1 from (
           select case when d.puan1 is null then
                    sum(case when h.can_kaybeden = p_user then 1
                             when h.can_kaybeden is not null then -1 else 0 end) over (order by h.id)
                  else
                    sum(case when h.saldiran = p_user then coalesce(h.puan_savunan, 0) - coalesce(h.puan_saldiran, 0)
                             else coalesce(h.puan_saldiran, 0) - coalesce(h.puan_savunan, 0) end) over (order by h.id)
                  end as fark
             from public.duello_hamleler h where h.duello_id = d.id
         ) x where not coalesce(d.hakimiyet, false) and x.fark >= case when d.puan1 is null then v_fark else v_min end)
       -- 680 · Hâkimiyet: bir an rakip rozet_geri_donus_yuva_farki (2) yuva öndeyken kazanmak.
       or (coalesce(d.hakimiyet, false) and exists (
             select 1 from public.duello_hamleler h
              where h.duello_id = d.id and h.hakimiyet is not null
                and coalesce((h.hakimiyet -> 'yuvalar' ->> (case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end)::text)::int, 0)
                  - coalesce((h.hakimiyet -> 'yuvalar' ->> p_user::text)::int, 0)
                  >= public.ayar_sayi('rozet_geri_donus_yuva_farki', 2))));

  elsif p_olcut = 'uzatma_galibiyet' then
    select count(*) into v from public.duellolar d
     where d.durum = 'bitti' and d.kazanan = p_user and coalesce(d.uzatma, false);

  elsif p_olcut = 'rovans_galibiyet' then
    select (select count(*) from public.matches m
             where m.durum = 'bitti' and m.kazanan = p_user and coalesce(m.rovans, false))
         + (select count(*) from public.duellolar d
             where d.durum = 'bitti' and d.kazanan = p_user and d.onceki_id is not null)
      into v;

  elsif p_olcut = 'galibiyet_serisi' then
    -- Klasik + Düello, bitiş sırasıyla; beraberlik ve mağlubiyet seriyi keser.
    with g as (
      select coalesce(m.bitis, m.created_at) as t, coalesce(m.kazanan = p_user, false) as w
        from public.matches m
       where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2)
      union all
      select coalesce(d.bitis, d.son_hareket, d.created_at), coalesce(d.kazanan = p_user, false)
        from public.duellolar d
       where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2)
    ), n as (
      select w, sum(case when w then 0 else 1 end) over (order by t rows unbounded preceding) as grp from g
    )
    select coalesce(max(c), 0) into v from (select count(*) as c from n where w group by grp) x;

  elsif p_olcut = 'arkadas' then
    select count(*) into v from public.friendships f
     where f.durum = 'arkadas' and p_user in (f.requester, f.addressee);

  elsif p_olcut = 'arkadas_mac' then
    with ark as (
      select case when f.requester = p_user then f.addressee else f.requester end as id
        from public.friendships f
       where f.durum = 'arkadas' and p_user in (f.requester, f.addressee)
    )
    select (select count(*) from public.matches m
             where m.durum = 'bitti' and p_user in (m.oyuncu1, m.oyuncu2) and m.terk_eden is distinct from p_user
               and (case when m.oyuncu1 = p_user then m.oyuncu2 else m.oyuncu1 end) in (select id from ark))
         + (select count(*) from public.duellolar d
             where d.durum = 'bitti' and p_user in (d.oyuncu1, d.oyuncu2) and d.terk_eden is distinct from p_user
               and (case when d.oyuncu1 = p_user then d.oyuncu2 else d.oyuncu1 end) in (select id from ark))
      into v;

  elsif p_olcut = 'davet' then
    select count(*) into v from public.davetler dv
     where dv.davet_eden = p_user and dv.durum in ('odullendi', 'sinir_asildi');

  elsif p_olcut = 'mac_mesaji' then
    select case when exists (select 1 from public.match_messages mm where mm.user_id = p_user) then 1 else 0 end into v;

  else
    v := 0;   -- 'olay' ve bilinmeyenler: yalnız olay anında verilir
  end if;

  return coalesce(v, 0);
end;
$function$
;

-- ---------------------------------------------------------------- rozet açıklamaları (son metin ALT AJAN C: 682)
update public.rozet_tanimlari
   set aciklama_tr = 'Rakibin 3 yuvadayken Düello''yu kazan',
       aciklama_en = 'Win a Duel while your opponent holds 3 slots'
 where anahtar = 'ozel_son_can';
update public.rozet_tanimlari
   set aciklama_tr = 'Düello''da 2 yuva gerideyken maçı kazan',
       aciklama_en = 'Win a Duel after trailing by 2 slots'
 where anahtar = 'ozel_geri_donus';
