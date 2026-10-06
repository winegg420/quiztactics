-- ============================================================
-- 970 · DÜELLO — YENİ PUAN VE KAZANMA KURALI (Ida, 6 Eki 2026)
--
-- DEĞİŞMEYEN: seçim fazı (draft, 10 kategori, yılan 5-5), kart yüzdeleri, ban, kilit, Baskın/Kalkan, Altın Soru, maç sonu.
--
-- YENİ TUR KURALI (puan modu): saldıran YALNIZ rakibin (savunanın) kategorilerinden birini seçer — kendi kategorisine
-- saldırı sunucuda reddedilir (duello2_kategori_uygun_mu → duello2_puan_hedefler). İki oyuncu aynı soruyu cevaplar:
--   · ikisi doğru            → ikisi de +1, kategori el değiştirmez
--   · saldıran doğru, savunan yanlış → saldıran +2 VE kategoriyi alır (kilit duello_kilit_tur aynen)
--   · saldıran yanlış, savunan doğru → savunan +1, el değişmez
--   · ikisi yanlış           → kimse puan almaz
--   Jokerler: Baskın → savunanın cevabı sayılmaz (puan da almaz); saldıran doğruysa +2 ve alır.
--             Kalkan → kategori el değiştirmez, ek puan yok (saldıran doğruysa yalnız +1). İkisi birden → normal kural.
-- KAZANMA (hangisi önce olursa, sonuç fazından sonra ANINDA):
--   · puan yolu: duello_puan_hedef (12) puana ilk ulaşan
--   · kategori yolu: rakibin BAŞLANGIÇTAKİ (seçimdeki) kategorilerinden duello_puan_kategori_yolu (4) tanesini elinde tutan
--   · ikisi aynı turda iki oyuncu için birden gerçekleşirse → Altın Soru
--   · duello_puan_max_tur (20) tur bitince puanı çok olan; eşitse Altın Soru
--   "7 yuva" eşiği bu modda YOK (yuva sayıları yalnız gösterim için güncellenir).
-- Kilit: kilitli kategori seçilemez; savunanın bütün kategorileri kilitliyse kilit o tur yok sayılır (saldırı hep mümkün).
--
-- BAYRAK: duello_puan_modu = "yeni" | "eski" (varsayılan "yeni"). Yalnız seçim modunda açılan maçta geçerlidir.
-- Mod, hedef, kategori yolu ve tur sayısı maç satırına sabitlenir (puan_modu, puan_hedef, kategori_yolu, max_tur):
-- süren maçlar kendi kuralıyla biter. "eski" → 960 hâkimiyet akışı aynen (7 yuva, 20 tur).
-- Geri alma: docs/duello-geri-alma-puan.sql (yalnız bayrak). İstemci yeni RPC çağırmaz → yeni GRANT yok;
-- yeni iç fonksiyonlar istemciye kapalı (960 deseni).
-- ============================================================

-- ---------------------------------------------------------------- şema
alter table public.duellolar
  add column if not exists puan_modu boolean not null default false,
  add column if not exists puan_hedef smallint,
  add column if not exists kategori_yolu smallint;

comment on column public.duellolar.puan_modu is '970: maç yeni puan kuralıyla açıldı mı (yalnız rakibin kategorisine saldırı, 12 puan / 4 kategori)';
comment on column public.duellolar.puan_hedef is '970: kazanma puanı (açılışta duello_puan_hedef''ten sabitlenir)';
comment on column public.duellolar.kategori_yolu is '970: rakibin başlangıç kategorilerinden bu kadarını elinde tutan kazanır (açılışta sabitlenir)';

-- ---------------------------------------------------------------- ayarlar
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_puan_modu', '"yeni"'::jsonb,
   'Düello (970): "yeni" → puan kuralı (yalnız rakibin kategorisine saldırı; doğru +1, alırsan +2; 12 puan ya da 4 kategori kazanır). "eski" → 960 hâkimiyet (7 yuva). Yalnız seçim modunda geçerli; maç satırına sabitlenir.'),
  ('duello_puan_hedef', '12'::jsonb, 'Düello puan modu (970): bu puana ilk ulaşan kazanır'),
  ('duello_puan_kategori_yolu', '4'::jsonb, 'Düello puan modu (970): rakibin başlangıçtaki kategorilerinden bu kadarını elinde tutan kazanır'),
  ('duello_puan_max_tur', '20'::jsonb, 'Düello puan modu (970): tur sayısı; bitince puanı çok olan kazanır, eşitse Altın Soru')
on conflict (anahtar) do nothing;

-- ---------------------------------------------------------------- yardımcılar
create or replace function public.duello_puan_modu_acik()
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select coalesce((select a.deger #>> '{}' from public.oyun_ayarlari a where a.anahtar = 'duello_puan_modu'), 'eski') = 'yeni';
$function$;

-- Oyuncunun rakibin BAŞLANGIÇ (seçim) kategorilerinden şu an elinde tuttuğu sayı. Geri alınan kategori düşer.
create or replace function public.duello2_puan_alinan(p_secimler jsonb, p_sahiplik jsonb, p_user uuid)
 returns integer
 language sql
 immutable
 set search_path to 'public'
as $function$
  select count(*)::int
    from jsonb_array_elements(coalesce(p_secimler, '[]'::jsonb)) s
   where (s ->> 'u') is distinct from p_user::text
     and (coalesce(p_sahiplik, '{}'::jsonb) ->> (s ->> 'k')) = p_user::text;
$function$;

-- Puan modunda saldıranın seçebileceği kategoriler: YALNIZ savunanın kategorileri. Katmanlı — boş kalırsa sırayla
-- kilit, kapsam, ban yok sayılır (savunanın en az bir kategorisi her zaman vardır: kategori yolu < 5 iken maç biter).
create or replace function public.duello2_puan_hedefler(p_id uuid)
 returns text[]
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  d public.duellolar%rowtype;
  v_ks text[];
  v text[];
begin
  select * into d from public.duellolar where id = p_id;
  if not found then return '{}'; end if;
  select coalesce(array_agg(e.key order by e.key), '{}') into v_ks
    from jsonb_each_text(coalesce(d.sahiplik, '{}'::jsonb)) e
   where e.value is distinct from d.saldiran::text;
  -- 1: ban + kapsam + kilit
  select coalesce(array_agg(k order by k), '{}') into v from unnest(v_ks) k
   where k is distinct from d.ban_kategori
     and public.duello_kategori_kapsam_uygun(p_id, k)
     and coalesce((d.kilitler ->> k)::int, 0) < d.tur;
  if cardinality(v) > 0 then return v; end if;
  -- 2: kilit yok sayılır
  select coalesce(array_agg(k order by k), '{}') into v from unnest(v_ks) k
   where k is distinct from d.ban_kategori and public.duello_kategori_kapsam_uygun(p_id, k);
  if cardinality(v) > 0 then return v; end if;
  -- 3: kapsam da yok sayılır
  select coalesce(array_agg(k order by k), '{}') into v from unnest(v_ks) k where k is distinct from d.ban_kategori;
  if cardinality(v) > 0 then return v; end if;
  return v_ks;
end $function$;

-- ---------------------------------------------------------------- fonksiyonlar (canlı gövdeler + 970 dalları)

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
  v_secim boolean;
begin
  if random() < 0.5 then
    v_x := p_a; p_a := p_b; p_b := v_x;
  end if;

  -- Profil, oranlar ve kategori yıldızları MAÇ BAŞINDA sabitlenir (yoklamalarda yeniden hesaplanmaz).
  select public.oyuncu_kategori_profili_ic(p_a) into v_p1;
  select public.oyuncu_kategori_profili_ic(p_b) into v_p2;
  v_p1 := coalesce(v_p1, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_a));
  v_p2 := coalesce(v_p2, '{}'::jsonb) || jsonb_build_object('oranlar', public.duello_oranlar_ic(p_b));
  v_secim := public.duello_secim_modu_acik();   -- 960

  -- 680: Hâkimiyet — puan/yıldız/çarpan yok; oranlar kart yüzdeleri için profil içinde kalır.
  -- Eşik ve kilit süresi maç başında sabitlenir (ayar değişse de devam eden maç etkilenmez).
  -- 960: mod + eşik + tur sayısı da satıra sabitlenir. Seçim modunda maç 'secim' fazıyla açılır: ilk seçen oyuncu2
  -- (sıra zaten rastgele), böylece tur 1'de ilk saldıran oyuncu1 = ilk seçmeyen. Bayrak kapalıysa eski akış (eski değerler).
  insert into public.duellolar (oyuncu1, oyuncu2, dereceli, can1, can2, puan1, puan2,
                                yildiz1, yildiz2, puan_degerleri, carpanli_turlar, carpan_katsayi,
                                hakimiyet, sahiplik, kilitler, hakimiyet_esik, kilit_tur, yuva1, yuva2,
                                saldiran, faz, faz_bitis,
                                profil1, profil2, onceki_id, surum,
                                secim_modu, max_tur, ilk_secen, secim_sira, secimler)
  values (p_a, p_b, coalesce(p_dereceli, true), null, null, 0, 0,   -- puan kolonu 0 kalır (eski "puan1 boş = can maçı" ayrımı bozulmasın)
          null, null, null, null, null,
          true, '{}'::jsonb, '{}'::jsonb,
          greatest(1, case when v_secim then public.ayar_sayi('duello_hakimiyet_esik', 7)
                           else public.ayar_sayi('duello_bos_mod_esik', 5) end::int),
          greatest(0, public.ayar_sayi('duello_kilit_tur', 2)::int), 0, 0,
          case when v_secim then p_b else p_a end,
          case when v_secim then 'secim' else 'kategori' end,
          case when v_secim
               then now() + make_interval(secs => public.ayar_sayi('duello_secim_sn', 5) + public.ayar_sayi('duello_secim_ilk_ek_sn', 3))
                    + public.duello2_gosterim_payi()
               else now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi() end,
          v_p1, v_p2, p_onceki, 2,
          v_secim,
          greatest(1, case when v_secim then public.ayar_sayi('duello_max_tur', 20)
                           else public.ayar_sayi('duello_bos_mod_max_tur', 16) end)::smallint,
          case when v_secim then p_b end, 0, '[]'::jsonb)
  returning id into v_id;
  -- 970: yeni puan kuralı (yalnız seçim modunda — başlangıç kategorileri draft'tan gelir). Hedef, kategori yolu ve
  -- tur sayısı maç satırına sabitlenir; bayrak 'eski' ise satır puan_modu = false kalır (960 hâkimiyet akışı aynen).
  if v_secim and public.duello_puan_modu_acik() then
    update public.duellolar
       set puan_modu = true,
           puan_hedef = greatest(1, public.ayar_sayi('duello_puan_hedef', 12))::smallint,
           kategori_yolu = greatest(1, public.ayar_sayi('duello_puan_kategori_yolu', 4))::smallint,
           max_tur = greatest(1, public.ayar_sayi('duello_puan_max_tur', 20))::smallint
     where id = v_id;
  end if;
  if not v_secim then
    perform public.duello2_ban_baslat(v_id);   -- 853: ilk tur da savunma banıyla başlar (bayrak kapalıysa 'kategori' kalır)
  end if;

  insert into public.duello_sinyal (duello_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.duello_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.duello2_kategori_uygun_mu(p_id uuid, p_kategori text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when exists (select 1 from public.duellolar d where d.id = p_id and coalesce(d.puan_modu, false) and not d.uzatma)
    -- 970: puan modunda saldırı YALNIZ rakibin (savunanın) kategorisine; kilit / ban / kapsam katmanlı (duello2_puan_hedefler)
    then p_kategori = any(public.duello2_puan_hedefler(p_id))
    else p_kategori = any(public.duello_kategorileri())
     and p_kategori is distinct from public.duello2_aktif_kalkan(p_id)          -- 650 (kapalı; geçmiş için)
     and public.duello_kategori_kapsam_uygun(p_id, p_kategori)                  -- 652
     and not exists (select 1 from public.duellolar d                           -- 680: kilit
                      where d.id = p_id and coalesce(d.hakimiyet, false)
                        and coalesce((d.kilitler ->> p_kategori)::int, 0) >= d.tur)
     and not exists (select 1 from public.duellolar d                           -- 853: savunma banı
                      where d.id = p_id and d.ban_kategori = p_kategori) end;
$function$;

CREATE OR REPLACE FUNCTION public.duello2_otomatik_kategori(p_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_kat text;
begin
  -- Süre doldu: uygun kategorilerden rastgele (853: banlı kategori uygun değildir).
  select k into v_kat from unnest(public.duello_kategorileri()) k
   where public.duello2_kategori_uygun_mu(p_id, k)
   order by random() limit 1;
  if v_kat is null and exists (select 1 from public.duellolar x where x.id = p_id and coalesce(x.puan_modu, false) and not x.uzatma) then
    -- 970: puan modunda yedek de yalnız savunanın kategorileri (kendi kategorisine saldırı yok).
    select k into v_kat from unnest(public.duello_kategorileri()) k
      join public.duellolar x on x.id = p_id
     where (x.sahiplik ->> k) is distinct from x.saldiran::text and (x.sahiplik ->> k) is not null
     order by random() limit 1;
  end if;
  if v_kat is null then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where k is distinct from public.duello2_aktif_kalkan(p_id)
       and k is distinct from (select x.ban_kategori from public.duellolar x where x.id = p_id)   -- 853
     order by random() limit 1;
  end if;
  return v_kat;
end $function$;

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
    --   870: boşta ikisi de doğru → saldıran alır (ayar duello_bos_ikisi_dogru_saldiran = 1).
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
    elsif v_eylem = 'al' and v_d_sal and v_sav_sayilir
          and public.ayar_sayi('duello_bos_ikisi_dogru_saldiran', 1) >= 1 then
      -- 870: boş kategoride ikisi de doğru → saldıran alır (Baskın varsa üstteki dal tutar, neden baskin).
      v_tuttu := true;
      v_yeni_sahip := d.saldiran::text;
      v_kilit := true;
      v_neden := 'bos_ikisi_dogru';
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
    -- 970 · PUAN MODU: doğru cevap +1 (savunanınki Baskın'da sayılmaz), kategori alınırsa saldırana +1 ek (toplam +2).
    --   ikisi doğru → +1/+1, el değişmez · saldıran doğru + savunan yanlış → saldıran +2 ve alır ·
    --   saldıran yanlış + savunan doğru → savunan +1 · ikisi yanlış → 0. Kalkan: alma ve ek puan yok (saldıran +1).
    if coalesce(d.puan_modu, false) then
      v_p_sal := (case when v_d_sal then 1 else 0 end) + (case when v_tuttu then 1 else 0 end);
      v_p_sav := case when v_sav_sayilir then 1 else 0 end;
    end if;
    select count(*) filter (where e.value #>> '{}' = d.oyuncu1::text),
           count(*) filter (where e.value #>> '{}' = d.oyuncu2::text)
      into v_y1, v_y2 from jsonb_each(v_sahiplik) e;
    v_hk := jsonb_build_object(
      'eylem', v_eylem, 'tuttu', v_tuttu, 'neden', v_neden,
      'sahip_once', v_sahip, 'sahip_sonra', v_yeni_sahip,
      'kilit', case when v_kilit and coalesce(d.kilit_tur, 0) > 0 then d.kilit_tur else 0 end,
      'baskin', v_baskin, 'kalkan', v_kalkan, 'cakisma', v_cakisma,
      'yuvalar', jsonb_build_object(d.oyuncu1::text, v_y1, d.oyuncu2::text, v_y2),
      'esik', d.hakimiyet_esik)
      || case when coalesce(d.puan_modu, false) then jsonb_build_object(
           'puan_modu', true, 'hedef', d.puan_hedef, 'kategori_yolu', d.kategori_yolu,
           'kazanilan', jsonb_build_object(d.saldiran::text, v_p_sal, v_savunan::text, v_p_sav),
           'puanlar', jsonb_build_object(
              d.oyuncu1::text, coalesce(d.puan1, 0) + case when d.oyuncu1 = d.saldiran then v_p_sal else v_p_sav end,
              d.oyuncu2::text, coalesce(d.puan2, 0) + case when d.oyuncu2 = d.saldiran then v_p_sal else v_p_sav end),
           'alinan', jsonb_build_object(
              d.oyuncu1::text, public.duello2_puan_alinan(d.secimler, v_sahiplik, d.oyuncu1),
              d.oyuncu2::text, public.duello2_puan_alinan(d.secimler, v_sahiplik, d.oyuncu2)))
         else '{}'::jsonb end;
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
end $function$;

CREATE OR REPLACE FUNCTION public.duello2_sonraki(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_altin uuid;
  v_b1 boolean := false;   -- 970: oyuncu1 kazanma koşulunu sağladı mı (puan ya da kategori yolu)
  v_b2 boolean := false;
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
  -- 970 · PUAN MODU: hedef puana ya da rakibin başlangıçtaki kategorilerinden kategori_yolu kadarına ilk ulaşan ANINDA kazanır.
  -- İkisi aynı turda sağlarsa Altın Soru. Son turdan sonra puanı çok olan; eşitse Altın Soru. Yuva eşiği bu modda yok.
  if coalesce(d.puan_modu, false) then
    v_b1 := coalesce(d.puan1, 0) >= d.puan_hedef
            or public.duello2_puan_alinan(d.secimler, d.sahiplik, d.oyuncu1) >= d.kategori_yolu;
    v_b2 := coalesce(d.puan2, 0) >= d.puan_hedef
            or public.duello2_puan_alinan(d.secimler, d.sahiplik, d.oyuncu2) >= d.kategori_yolu;
  end if;
  if coalesce(d.hakimiyet, false) then
    if v_b1 and v_b2 then
      perform public.duello2_uzatma_ac(p_id);
    elsif v_b1 or v_b2 then
      perform public.duello_bitir(p_id, case when v_b1 then d.oyuncu1 else d.oyuncu2 end);
    elsif not coalesce(d.puan_modu, false)
          and (coalesce(d.yuva1, 0) >= d.hakimiyet_esik or coalesce(d.yuva2, 0) >= d.hakimiyet_esik) then
      perform public.duello_bitir(p_id, case when coalesce(d.yuva1, 0) >= d.hakimiyet_esik then d.oyuncu1 else d.oyuncu2 end);
    elsif d.tur < coalesce(d.max_tur, public.ayar_sayi('duello_max_tur', 10)) then   -- 960: tur sayısı satırda
      update public.duellolar
         set tur = tur + 1,
             saldiri_sirasi = case when (tur + 1) % 2 = 1 then 0 else 1 end,
             saldiran = case when (tur + 1) % 2 = 1 then oyuncu1 else oyuncu2 end,
             faz = 'kategori', kategori = null, soru_id = null, cevaplar = '{}'::jsonb, bitis1 = null, bitis2 = null,
             faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 15)) + public.duello2_gosterim_payi(),
             son_hareket = now()
       where id = p_id;
      perform public.duello2_ban_baslat(p_id);   -- 853: savunma banı (bayrak kapalıysa faz 'kategori' kalır)
    elsif coalesce(d.puan_modu, false) then
      if coalesce(d.puan1, 0) <> coalesce(d.puan2, 0) then
        perform public.duello_bitir(p_id, case when coalesce(d.puan1, 0) > coalesce(d.puan2, 0) then d.oyuncu1 else d.oyuncu2 end);
      else
        perform public.duello2_uzatma_ac(p_id);   -- puan eşit: Altın Soru
      end if;
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

CREATE OR REPLACE FUNCTION public.duello2_bot_kategori(p_id uuid, p_bot uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_kat text;
  d public.duellolar%rowtype;
  v_rakip_oran jsonb;
  v_rakip_yildiz jsonb;
  v_carpan numeric;
  v_r double precision := random() * 100;
  v_akilli double precision := public.ayar_sayi('duello2_bot_zayif_secim_yuzde', 65);
  v_guclu double precision := public.ayar_sayi('duello2_bot_guclu_secim_yuzde', 20);
  v_fark int;
  v_risk_tur int := public.ayar_sayi('duello2_bot_risk_esik_tur', 8)::int;
  v_risk_fark int := public.ayar_sayi('duello2_bot_risk_puan_farki', 6)::int;
  v_risk_modu text := 'normal';
  -- 681: Hâkimiyet dalı
  v_ks text[] := '{}';
  v_deger numeric[] := '{}';
  v_tur text[] := '{}';
  v_k text;
  v_bot_p numeric;
  v_rak_p numeric;
  v_sahip text;
  v_esik int;
  v_ben_yuva int;
  v_rakip_yuva int;
  v_en_iyi numeric := public.ayar_sayi('duello_bot_hamle_en_iyi_yuzde', 70);
  v_pekistir numeric := public.ayar_ondalik('duello_bot_pekistir_agirlik', 0.5);
  v_en_iyi_k text;
  v_bos_yeni boolean := public.ayar_sayi('duello_bos_ikisi_dogru_saldiran', 1) >= 1;   -- 890
  v_puan boolean;   -- 970
begin
  select * into d from public.duellolar where id = p_id;

  if coalesce(d.hakimiyet, false) then
    v_esik := coalesce(d.hakimiyet_esik, 4);
    v_ben_yuva := case when d.oyuncu1 = p_bot then coalesce(d.yuva1, 0) else coalesce(d.yuva2, 0) end;
    v_rakip_yuva := case when d.oyuncu1 = p_bot then coalesce(d.yuva2, 0) else coalesce(d.yuva1, 0) end;
    v_rakip_oran := coalesce(case when d.oyuncu1 = p_bot then d.profil2 else d.profil1 end -> 'oranlar', '{}'::jsonb);
    -- 970 · puan modu: adaylar zaten yalnız rakibin kategorileri (duello2_kategori_uygun_mu). "Eşiğe 1 kala" yerine
    -- bitişe yakınlık: bot hedefe ≤ 2 puan ya da kategori yolunda 1 eksik → en değerli hamle (rastgelelik yok);
    -- rakip aynı yakınlıktaysa da en değerli hamle (puan farkını kapatmak için en çok beklenen kazanç).
    v_puan := coalesce(d.puan_modu, false) and not d.uzatma;
    if v_puan then
      v_esik := 2;   -- bayraklar 0/1: "eşik − 1" = 1
      v_ben_yuva := case when (case when d.oyuncu1 = p_bot then coalesce(d.puan1, 0) else coalesce(d.puan2, 0) end) >= d.puan_hedef - 2
                          or public.duello2_puan_alinan(d.secimler, d.sahiplik, p_bot) >= d.kategori_yolu - 1 then 1 else 0 end;
      v_rakip_yuva := case when (case when d.oyuncu1 = p_bot then coalesce(d.puan2, 0) else coalesce(d.puan1, 0) end) >= d.puan_hedef - 2
                          or public.duello2_puan_alinan(d.secimler, d.sahiplik, case when d.oyuncu1 = p_bot then d.oyuncu2 else d.oyuncu1 end)
                             >= d.kategori_yolu - 1 then 1 else 0 end;
    end if;

    -- Aday: kilitsiz (uygun) kategoriler; her biri için tür (bos/rakip/kendi) ve hedef değer.
    for v_k in select k from unnest(public.duello_kategorileri()) k
                where public.duello2_kategori_uygun_mu(p_id, k) loop
      v_bot_p := public.bot_kategori_isabet(p_bot, v_k);
      v_rak_p := case when jsonb_typeof(v_rakip_oran -> v_k) = 'number' then (v_rakip_oran ->> v_k)::numeric / 100.0 else 0.5 end;
      v_sahip := d.sahiplik ->> v_k;
      v_ks := v_ks || v_k;
      if v_sahip is null then
        v_tur := v_tur || 'bos'::text;
        -- 890: boşta ikisi de bilirse saldıran alır → kazanç p_s − (1 − p_s)·p_d.
        v_deger := v_deger || (case when v_bos_yeni then v_bot_p - (1 - v_bot_p) * v_rak_p
                                    else v_bot_p * (1 - v_rak_p) end);
      elsif v_sahip = p_bot::text then
        v_tur := v_tur || 'kendi'::text;
        v_deger := v_deger || (v_bot_p * (1 - v_rak_p) * v_pekistir);
      else
        v_tur := v_tur || 'rakip'::text;
        -- 970: puan modunda net beklenen kazanç = bot +1 doğru, +1 alma (rakip yanlışsa) − rakibin +1'i (bot yanlışken).
        v_deger := v_deger || (case when v_puan then v_bot_p * (2 - v_rak_p) - (1 - v_bot_p) * v_rak_p
                                    else v_bot_p * (1 - v_rak_p) end);
      end if;
    end loop;

    if coalesce(array_length(v_ks, 1), 0) > 0 then
      -- ÖNCELİK 1: nakavt (bot eşiğe 1 kala) — yalnız boş + rakip kategorisi, en yüksek değer, rastgelelik yok.
      if v_ben_yuva >= v_esik - 1 then
        select t.k into v_kat from unnest(v_ks, v_deger, v_tur) as t(k, v, tr)
         where t.tr in ('bos', 'rakip') order by t.v desc, t.k limit 1;
        if v_kat is not null then return v_kat; end if;
      end if;
      -- ÖNCELİK 2: kritik geri alma (rakip eşiğe 1 kala) — rakibin kategorilerinden en yüksek değer.
      if v_rakip_yuva >= v_esik - 1 then
        select t.k into v_kat from unnest(v_ks, v_deger, v_tur) as t(k, v, tr)
         where t.tr = 'rakip' order by t.v desc, t.k limit 1;
        if v_kat is not null then return v_kat; end if;
      end if;
      -- Normal: %en_iyi → en yüksek değerli; kalan → en iyi dışındaki uygunlardan rastgele.
      select t.k into v_en_iyi_k from unnest(v_ks, v_deger, v_tur) as t(k, v, tr)
       order by t.v desc, t.k limit 1;
      if v_r < v_en_iyi or array_length(v_ks, 1) = 1 then
        return v_en_iyi_k;
      end if;
      select t.k into v_kat from unnest(v_ks, v_deger, v_tur) as t(k, v, tr)
       where t.k <> v_en_iyi_k order by random() limit 1;
      return coalesce(v_kat, v_en_iyi_k);
    end if;

    -- Hiç aday yok (pratikte olmaz): yedek — rastgele kategori.
    select k into v_kat from unnest(public.duello_kategorileri()) k order by random() limit 1;
    return v_kat;
  end if;

  -- ===== Eski (puan) maçlar: 680 öncesi gövde AYNEN =====
  v_rakip_oran := coalesce(case when d.oyuncu1 = p_bot then d.profil2 else d.profil1 end -> 'oranlar', '{}'::jsonb);
  v_rakip_yildiz := coalesce(case when d.oyuncu1 = p_bot then d.yildiz2 else d.yildiz1 end, '{}'::jsonb);
  v_carpan := public.duello_tur_carpani(d.tur, d.carpanli_turlar, d.carpan_katsayi);

  -- 667: maç sonu risk — Tur risk_tur'dan sonra belirgin gerideyse yüksek değerliye (★★★/×2), öndeyse güvenliye (★).
  if not d.uzatma and d.tur > v_risk_tur then
    v_fark := (case when d.oyuncu1 = p_bot then coalesce(d.puan1, 0) - coalesce(d.puan2, 0)
                     else coalesce(d.puan2, 0) - coalesce(d.puan1, 0) end);
    if v_fark <= -v_risk_fark then v_risk_modu := 'riskli';
    elsif v_fark >= v_risk_fark then v_risk_modu := 'guvenli';
    end if;
  end if;

  if v_risk_modu = 'riskli' then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by coalesce((v_rakip_yildiz ->> k)::int, 2) desc, random() limit 1;
  elsif v_risk_modu = 'guvenli' then
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where public.duello2_kategori_uygun_mu(p_id, k)
     order by coalesce((v_rakip_yildiz ->> k)::int, 2) asc, random() limit 1;
  elsif v_r < v_akilli then
    -- 667: net avantaj artık saldıranın eksi riskini de sayar: değer(çarpanlı) × (2×botun isabeti − 1 − rakip oranı).
    select z.k into v_kat from (
      select k from unnest(public.duello_kategorileri()) k
       where public.duello2_kategori_uygun_mu(p_id, k)
       order by (coalesce((d.puan_degerleri ->> coalesce(v_rakip_yildiz ->> k, '2'))::numeric, 3) * v_carpan)
                * (2 * public.bot_kategori_isabet(p_bot, k) - 1
                   - coalesce(case when jsonb_typeof(v_rakip_oran -> k) = 'number' then (v_rakip_oran ->> k)::numeric end, 50) / 100.0)
                desc, random()
       limit 2) z
     order by random() limit 1;
  elsif v_r >= v_akilli + v_guclu then
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
    select k into v_kat from unnest(public.duello_kategorileri()) k
     where k is distinct from public.duello2_aktif_kalkan(p_id)
     order by random() limit 1;
  end if;
  return v_kat;
end $function$;

CREATE OR REPLACE FUNCTION public.duello2_bot_ban_kategori(p_id uuid, p_bot uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.duellolar%rowtype;
  v_rakip uuid;
  v_rakip_oran jsonb;
  v_kritik boolean;
  v_pekistir double precision := public.ayar_ondalik('duello_bot_pekistir_agirlik', 0.5);
  v_en_iyi double precision := public.ayar_sayi('duello_bot_hamle_en_iyi_yuzde', 70);
  v_en_iyi_k text;
  v_kat text;
  v_bos_yeni boolean := public.ayar_sayi('duello_bos_ikisi_dogru_saldiran', 1) >= 1;   -- 890
begin
  select * into d from public.duellolar where id = p_id;
  if not found then return null; end if;
  v_rakip := case when d.oyuncu1 = p_bot then d.oyuncu2 else d.oyuncu1 end;
  v_rakip_oran := coalesce(case when d.oyuncu1 = p_bot then d.profil2 else d.profil1 end -> 'oranlar', '{}'::jsonb);
  v_kritik := (case when d.oyuncu1 = p_bot then coalesce(d.yuva2, 0) else coalesce(d.yuva1, 0) end)
              >= coalesce(d.hakimiyet_esik, 4) - 1;
  if coalesce(d.puan_modu, false) then
    -- 970: saldıran bitişe yakınsa (hedefe ≤ 2 puan ya da kategori yolunda 1 eksik) bot en değerli hamlesini banlar.
    v_kritik := (case when d.oyuncu1 = v_rakip then coalesce(d.puan1, 0) else coalesce(d.puan2, 0) end) >= d.puan_hedef - 2
                or public.duello2_puan_alinan(d.secimler, d.sahiplik, v_rakip) >= d.kategori_yolu - 1;
  end if;

  select a.k into v_en_iyi_k
    from (select o.k,
                 (case when (d.sahiplik ->> o.k) is null and v_bos_yeni
                         then o.ps - (1 - o.ps) * o.pd                              -- 890: boşta saldıran bilirse alır
                       when coalesce(d.puan_modu, false)
                         then o.ps * (2 - o.pd) - (1 - o.ps) * o.pd                -- 970: saldıranın net beklenen puanı
                       when d.sahiplik ->> o.k = v_rakip::text
                         then o.ps * (1 - o.pd) * v_pekistir
                       else o.ps * (1 - o.pd) end) as v,
                 (d.sahiplik ->> o.k) is distinct from v_rakip::text as yuva_getirir
            from (select k,
                         (case when jsonb_typeof(v_rakip_oran -> k) = 'number' then (v_rakip_oran ->> k)::double precision / 100.0 else 0.5 end) as ps,
                         public.bot_kategori_isabet(p_bot, k) as pd
                    from unnest(public.duello_kategorileri()) k
                   where public.duello2_ban_uygun_mu(p_id, p_bot, k)) o) a
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
    'tur', d.tur, 'max_tur', coalesce(d.max_tur, public.ayar_sayi('duello_max_tur', 10)), 'saldiri_sirasi', d.saldiri_sirasi,   -- 960: satırdan
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
       'secim', public.ayar_sayi('duello_secim_sn', 5),   -- 960
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
          when 'secim' then d.faz_bitis - make_interval(secs => public.ayar_sayi('duello_secim_sn', 5))   -- 960
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
             where public.duello2_ban_uygun_mu(p_id, v_savunan, k)) end))
  -- 960: sıralı kategori seçimi. sira: yapılmış seçim sayısı; toplam: havuz (10); sirasi: her seçim sırasının oyuncusu
  -- (yılan A-B-B-A…); secimler: [{k, u, oto, sira}] — oto = süre doldu, sunucu seçti; kalan: henüz alınmamışlar.
  || jsonb_build_object('secim', case when coalesce(d.secim_modu, false) then jsonb_build_object(
       'acik', true,
       'sira', d.secim_sira,
       'toplam', coalesce(array_length(public.duello2_secim_havuzu(p_id), 1), 0),
       'ilk_secen', d.ilk_secen,
       'sure', public.ayar_sayi('duello_secim_sn', 5),
       'sirasi', (select coalesce(jsonb_agg(case when public.duello2_secim_sirasi(i) = 0 then d.ilk_secen
                                                 when d.ilk_secen = d.oyuncu1 then d.oyuncu2 else d.oyuncu1 end order by i), '[]'::jsonb)
                    from generate_series(0, coalesce(array_length(public.duello2_secim_havuzu(p_id), 1), 0) - 1) i),
       'secimler', coalesce(d.secimler, '[]'::jsonb),
       'kalan', case when d.faz = 'secim' then
           (select coalesce(jsonb_agg(k order by k), '[]'::jsonb) from unnest(public.duello2_secim_havuzu(p_id)) k
             where not (coalesce(d.sahiplik, '{}'::jsonb) ? k)) end)
     else jsonb_build_object('acik', false) end)
  -- 970: puan modu. puanlar: anlık puan; alinan: rakibin BAŞLANGIÇTAKİ (seçimdeki) kategorilerinden şu an elinde tuttuğun sayı;
  -- baslangic: seçim sonundaki sahiplik {kategori: oyuncu}.
  || jsonb_build_object('puan', case when coalesce(d.puan_modu, false) then jsonb_build_object(
       'acik', true,
       'hedef', d.puan_hedef,
       'kategori_yolu', d.kategori_yolu,
       'puanlar', jsonb_build_object(d.oyuncu1::text, coalesce(d.puan1, 0), d.oyuncu2::text, coalesce(d.puan2, 0)),
       'alinan', jsonb_build_object(
          d.oyuncu1::text, public.duello2_puan_alinan(d.secimler, d.sahiplik, d.oyuncu1),
          d.oyuncu2::text, public.duello2_puan_alinan(d.secimler, d.sahiplik, d.oyuncu2)),
       'baslangic', (select coalesce(jsonb_object_agg(s ->> 'k', s ->> 'u'), '{}'::jsonb)
                       from jsonb_array_elements(coalesce(d.secimler, '[]'::jsonb)) s))
     else jsonb_build_object('acik', false) end);
end $function$;

-- ---------------------------------------------------------------- erişim (yeni iç fonksiyonlar istemciye kapalı)
revoke all on function public.duello_puan_modu_acik() from public, anon, authenticated;
revoke all on function public.duello2_puan_alinan(jsonb, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.duello2_puan_hedefler(uuid) from public, anon, authenticated;
