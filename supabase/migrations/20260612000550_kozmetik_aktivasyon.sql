-- ============================================================
-- 550 · KOZMETİK AKTİVASYONU (Ida, 24 Eyl 2026)
--
-- A1  Aktif / pasif — LİSTE KODDA DEĞİL, SEÇİM TABLOSUNDA:
--       elmas kozmetikleri : kozmetikler.onay = 'girsin'           (/kozmetik-onizleme)
--       dükkân auraları    : auralar.onay = 'girsin'               (/kozmetik-onizleme; Ida: aura da aynı kural)
--       çerçeve tarzı      : sahip_tasarim_secimleri 'cerceve_tarzi' (/cerceve-onizleme — seçilen tarz)
--     İşaretsiz ('bekliyor') ya da 'girmesin' olan her kalem PASİF: dükkânda, koleksiyonda, oyunda
--     (oyuncu_kartlari) ve botlarda görünmez; satın alınamaz, takılamaz. Satın alınmış/takılı olsa da
--     görünmez ama KAYIT SİLİNMEZ (oyuncu_kozmetikleri, oyuncu_auralari, profiles.takili_* aynen durur).
--     Kural dinamiktir: Ida önizlemede seçimi değiştirirse ek migration gerekmez.
--     Sahip test modu yalnız AKTİF kalemlerde sürer (satış kapalı olsa da satın almadan takabilir).
-- A2  27 yeni avatar (13 günlük + 14 kostümlü) herkese ÜCRETSİZ: avatar_katalogu.aktif yeter;
--     /avatar-onizleme onayı ve kozmetik_satis_acik bu karar için dikkate alınmaz, elmas fiyatı kalkar.
-- A3  Gizli botlar 31 + 27 avatarı kullanır: 461'deki kural aynen (profesyonel avatarlı gizli botlar
--     id sırasıyla döngüsel) — liste 31 sabit + avatar_katalogu (aktif, sira) olarak genişler.
-- A4  kozmetik_satis_acik = true: yalnız aktif kalemlerin satışını açar (kozmetik_satista zaten
--     aktif + 'girsin' + bayrak ister); pasifler bayraktan bağımsız gizli. Aura satışı bayraktan
--     bağımsız sürer, yalnız 'girsin' auralar.
--
-- Tekrar çalıştırılabilir: create or replace + koşullu update. Yıkıcı değişiklik yok (satır silinmez,
-- kolon düşmez, yetki/politika değişmez; yeni cerceve_tarzi_aktif() mevcut kalıpla yalnız authenticated).
-- ============================================================

-- ---------- 1. Aktiflik yardımcıları (iç; istemciye kapalı) ----------
create or replace function public.kozmetik_aktif_mi(p_anahtar text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select k.aktif and k.onay = 'girsin' from public.kozmetikler k where k.anahtar = p_anahtar), false);
$$;
revoke all on function public.kozmetik_aktif_mi(text) from public, anon, authenticated;

-- Aura: dükkân aurası Ida'nın 'girsin'iyle aktif; etkinlik aurası önizlemede yok → kural dışı (aktif sütunu yeter)
create or replace function public.aura_aktif_mi(p_anahtar text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select a.aktif and (a.kaynak <> 'dukkan' or a.onay = 'girsin')
                     from public.auralar a where a.anahtar = p_anahtar), false);
$$;
revoke all on function public.aura_aktif_mi(text) from public, anon, authenticated;

-- ---------- 2. Elmas kozmetikleri: katalog / tak / tepki listesi ----------
-- Katalog: yalnız aktif kalemler. Normal oyuncu: satıştakiler + aktif olup sahip oldukları.
-- Sahip: bütün aktif kalemler (satış kapalıysa kapali = true işaretli).
create or replace function public.kozmetik_katalogu()
returns table(anahtar text, tur text, ad text, ad_tr text, ad_en text, fiyat integer, icerik jsonb, sira integer,
              satilik boolean, sahip boolean, takili boolean, kapali boolean, onay text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_en boolean;
  v_sahip_hesap boolean;
  p record;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);
  v_sahip_hesap := public.sahip_mi();
  select pr.takili_vs_karti, pr.takili_isim_efekti, pr.takili_zafer_efekti into p
    from public.profiles pr where pr.id = v_me;
  return query
  select k.anahtar, k.tur, case when v_en then k.ad_en else k.ad_tr end, k.ad_tr, k.ad_en,
         public.kozmetik_fiyati(k.tur, k.fiyat_elmas), k.icerik, k.sira,
         public.kozmetik_satista(k.anahtar),
         exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = k.anahtar),
         k.anahtar in (p.takili_vs_karti, p.takili_isim_efekti, p.takili_zafer_efekti),
         not public.kozmetik_satista(k.anahtar),
         case when v_sahip_hesap then k.onay end
    from public.kozmetikler k
   where k.aktif and k.onay = 'girsin'
     and (v_sahip_hesap
          or public.kozmetik_satista(k.anahtar)
          or exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = k.anahtar))
   order by k.sira;
end;
$$;

-- Tak / çıkar: yalnız AKTİF kalem (sahip olunan ya da sahip test modu). Çıkarmak (null) her zaman serbest.
create or replace function public.kozmetik_tak(p_tur text, p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_tur text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('kozmetik_tak', 30, interval '60 seconds');
  if p_tur not in ('vs_karti', 'isim_efekti', 'zafer_efekti') then raise exception 'Bu tür takılmaz'; end if;
  p_anahtar := nullif(btrim(coalesce(p_anahtar, '')), '');
  if p_anahtar is not null then
    select k.tur into v_tur from public.kozmetikler k where k.anahtar = p_anahtar and k.aktif and k.onay = 'girsin';
    if v_tur is null or v_tur <> p_tur then raise exception 'Böyle bir kozmetik yok'; end if;
    if not public.sahip_mi() and not exists (
         select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = p_anahtar) then
      raise exception 'Bu kozmetik sende yok';
    end if;
  end if;
  update public.profiles
     set takili_vs_karti     = case when p_tur = 'vs_karti'     then p_anahtar else takili_vs_karti end,
         takili_isim_efekti  = case when p_tur = 'isim_efekti'  then p_anahtar else takili_isim_efekti end,
         takili_zafer_efekti = case when p_tur = 'zafer_efekti' then p_anahtar else takili_zafer_efekti end
   where id = v_me;
  return jsonb_build_object('tur', p_tur, 'takili', p_anahtar);
end;
$$;

-- Tepkilerim: bedava 4 + AKTİF paketlerden sahip olunanlar (sahip hesabı: bütün aktif paketler)
create or replace function public.tepkilerim_liste(p_me uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(distinct t), '[]'::jsonb) from (
    select jsonb_array_elements_text(coalesce((select deger from public.oyun_ayarlari where anahtar = 'tepki_bedava'),
                                              '["alkis","havali","terli","dusunen"]'::jsonb)) t
    union
    select jsonb_array_elements_text(k.icerik -> 'tepkiler')
      from public.kozmetikler k
     where k.tur = 'tepki_paketi' and k.aktif and k.onay = 'girsin'
       and (public.sahip_mi()
            or exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = p_me and o.kozmetik = k.anahtar))
  ) x;
$$;
revoke all on function public.tepkilerim_liste(uuid) from public, anon, authenticated;

-- ---------- 3. Auralar: yalnız 'girsin' dükkân auraları ----------
create or replace function public.aura_katalogu()
returns table(anahtar text, ad text, ad_tr text, ad_en text, nadirlik text, kaynak text, fiyat integer,
              kosul text, sira integer, satilik boolean, sahip boolean, takili boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_en boolean;
  v_takili text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  v_en := public.rozet_dil_en(v_me);
  select p.takili_aura into v_takili from public.profiles p where p.id = v_me;
  return query
  select a.anahtar, case when v_en then a.ad_en else a.ad_tr end, a.ad_tr, a.ad_en, a.nadirlik, a.kaynak,
         case when a.kaynak = 'dukkan' then public.aura_fiyati(a.nadirlik) end,
         a.kosul, a.sira,
         (a.kaynak = 'dukkan' and a.aktif and a.onay = 'girsin' and public.aura_fiyati(a.nadirlik) is not null),
         exists (select 1 from public.oyuncu_auralari o where o.user_id = v_me and o.aura = a.anahtar),
         (a.anahtar = v_takili)
    from public.auralar a
   where (a.kaynak <> 'dukkan' or a.onay = 'girsin')
     and (a.aktif
          or exists (select 1 from public.oyuncu_auralari o where o.user_id = v_me and o.aura = a.anahtar))
   order by a.sira;
end;
$$;

create or replace function public.aura_satin_al(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_a public.auralar%rowtype;
  v_fiyat int;
  v_bakiye int;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('aura_satin_al', 20, interval '60 seconds');
  select * into v_a from public.auralar a where a.anahtar = p_anahtar;
  if not found or not v_a.aktif then raise exception 'Böyle bir aura yok'; end if;
  v_fiyat := public.aura_fiyati(v_a.nadirlik);
  if v_a.kaynak <> 'dukkan' or v_a.onay <> 'girsin' or v_fiyat is null then raise exception 'Bu aura satılmıyor'; end if;

  -- Kilit: aynı anda iki satın alma sırayla işlensin (elmas_harca da aynı satırı kilitler)
  perform 1 from public.profiles p where p.id = v_me for update;
  if exists (select 1 from public.oyuncu_auralari o where o.user_id = v_me and o.aura = v_a.anahtar) then
    raise exception 'Bu aura zaten sende';
  end if;

  v_bakiye := public.elmas_harca(v_fiyat, 'aura', v_a.anahtar);   -- yetersizse 'Yetersiz elmas'
  insert into public.oyuncu_auralari (user_id, aura, kaynak) values (v_me, v_a.anahtar, 'dukkan');
  return jsonb_build_object('anahtar', v_a.anahtar, 'fiyat', v_fiyat, 'bakiye', v_bakiye, 'sahip', true);
end;
$$;

create or replace function public.aura_tak(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('aura_tak', 20, interval '60 seconds');
  p_anahtar := nullif(btrim(coalesce(p_anahtar, '')), '');
  if p_anahtar is not null and not exists (
       select 1 from public.oyuncu_auralari o where o.user_id = v_me and o.aura = p_anahtar) then
    raise exception 'Bu aura sende yok';
  end if;
  if p_anahtar is not null and not public.aura_aktif_mi(p_anahtar) then
    raise exception 'Bu aura şu an kullanılamıyor';
  end if;
  update public.profiles set takili_aura = p_anahtar where id = v_me;
  return jsonb_build_object('takili', p_anahtar);
end;
$$;

-- ---------- 4. Oyuncu kartı: pasif kalem oyunda görünmez (dönüş tipi 541 ile aynı → yetkiler aynen) ----------
create or replace function public.oyuncu_kartlari(p_idler uuid[])
returns table(id uuid, ad text, avatar text, level integer, lig text, cerceve text, cerceve_nadirlik text,
              vitrin jsonb, aura text, vs_karti text, isim_efekti text, zafer_efekti text)
language sql
stable
security definer
set search_path = public
as $function$
  select p.id, p.gorunen_ad, p.gorunen_avatar, coalesce(p.level, 1), coalesce(p.lig, 'bronz'),
         case when c.aktif then p.takili_cerceve end, case when c.aktif then c.nadirlik end,
         coalesce((
           select jsonb_agg(jsonb_build_object('anahtar', t.anahtar, 'grup', t.grup, 'kademe', t.kademe, 'ikon', t.ikon)
                            order by v.ord)
             from unnest(p.vitrin_rozetleri) with ordinality as v(anahtar, ord)
             join public.rozet_tanimlari t on t.anahtar = v.anahtar
             join public.oyuncu_rozetleri r on r.user_id = p.id and r.rozet = v.anahtar
         ), '[]'::jsonb),
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'aura')
              when public.aura_aktif_mi(p.takili_aura) then p.takili_aura end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'vs_karti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_vs_karti and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'isim_efekti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_isim_efekti and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then public.bot_kozmetik(p.id, p.level, 'zafer_efekti')
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_zafer_efekti and k.aktif and k.onay = 'girsin') end
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
    cross join lateral (select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                               and not coalesce(p.acik_bot, false) as gizli) gb
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$;
-- bot_kozmetik (540) zaten yalnız 'girsin' kalemlerden seçer (elmas kozmetiği ayrıca bayrak ister) — değişmedi.

-- ---------- 5. 27 yeni avatar: herkese ücretsiz ----------
update public.oyun_ayarlari
   set deger = '0'::jsonb,
       aciklama = 'KULLANILMIYOR (550) — 27 yeni avatar ücretsiz. Eski: kostümlü avatar fiyatı (elmas).'
 where anahtar = 'elmas_avatar_kostumlu'
   and (deger is distinct from '0'::jsonb or aciklama not like 'KULLANILMIYOR (550)%');

create or replace function public.avatar_fiyati(p_tur text, p_fiyat integer)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select 0;   -- 550: 27 avatarın hepsi ücretsiz (günlük + kostümlü)
$$;
revoke execute on function public.avatar_fiyati(text, integer) from public, anon, authenticated;

-- Oyuncuya açık mı: yalnız teknik anahtar (aktif). /avatar-onizleme onayı ve satış bayrağı bakılmaz.
create or replace function public.avatar_acik_mi(p_anahtar text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select k.aktif from public.avatar_katalogu k where k.anahtar = p_anahtar), false);
$$;
revoke execute on function public.avatar_acik_mi(text) from public, anon, authenticated;

create or replace function public.avatar_katalogu_oyun()
returns table (anahtar text, url text, ad_tr text, ad_en text, tur text, fiyat_elmas integer,
               sira integer, sahibim boolean, kullanabilir boolean, kapali boolean)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  return query
    select k.anahtar, k.url, k.ad_tr, k.ad_en, k.tur,
           public.avatar_fiyati(k.tur, k.fiyat_elmas),
           k.sira,
           (o.user_id is not null),
           true,
           false
      from public.avatar_katalogu k
      left join public.oyuncu_avatarlari o on o.user_id = v_me and o.avatar = k.anahtar
     where k.aktif
     order by k.sira, k.anahtar;
end;
$$;

-- Ücretsiz avatar satın alınmaz (eski istemci çağırırsa açık hata).
create or replace function public.avatar_satin_al(p_anahtar text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  raise exception 'Bu avatar bedava — satın alınmaz';
end;
$$;

-- avatar_onayla: katalog avatarı aktifse herkes seçer (sahiplik şartı kalktı). 31 profesyonel avatar ve
-- https fotoğrafları AYNEN.
create or replace function public.avatar_onayla(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_k public.avatar_katalogu%rowtype;
begin
  perform public.hiz_siniri('avatar_onayla', 10, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  v_url := nullif(btrim(coalesce(p_url, '')), '');

  if v_url is null then
    update public.profiles set avatar_url = null, avatar_onayli = false where id = auth.uid();
    return;
  end if;

  if length(v_url) > 500 then raise exception 'Avatar adresi çok uzun'; end if;
  if v_url !~ '^(/[A-Za-z0-9._/-]+|https://[A-Za-z0-9._~:/?#@!$&''()*+,;=%-]+)$' then
    raise exception 'Geçersiz avatar adresi';
  end if;

  if left(v_url, 1) = '/' then
    select * into v_k from public.avatar_katalogu k where k.url = v_url;
    if found then
      if not public.avatar_acik_mi(v_k.anahtar) and not public.sahip_mi() then
        raise exception 'Bu avatar henüz kullanılamıyor';
      end if;
    elsif v_url not in (
      '/avatars/pro/kedi-k01.svg', '/avatars/pro/kopek-k02.svg',
      '/avatars/pro/baykus-k03.svg', '/avatars/pro/tilki-k04.svg',
      '/avatars/pro/panda-k05.svg', '/avatars/pro/penguen-k06.svg',
      '/avatars/pro/kurbaga-k07.svg', '/avatars/pro/ayi-k08.svg',
      '/avatars/pro/maymun-k09.svg', '/avatars/pro/dinozor-k10.svg',
      '/avatars/pro/ejderha-k11.svg', '/avatars/pro/kopekbaligi-k12.svg',
      '/avatars/pro/ahtapot-k13.svg', '/avatars/pro/ari-k14.svg',
      '/avatars/pro/robot-k15.svg', '/avatars/pro/uzayli-k16.svg',
      '/avatars/pro/astronot-k17.svg', '/avatars/pro/ninja-k18.svg',
      '/avatars/pro/korsan-k19.svg', '/avatars/pro/sovalye-k20.svg',
      '/avatars/pro/buyucu-k21.svg', '/avatars/pro/dedektif-k22.svg',
      '/avatars/pro/asci-k23.svg', '/avatars/pro/profesor-k24.svg',
      '/avatars/pro/viking-k25.svg', '/avatars/pro/hayalet-k26.svg',
      '/avatars/pro/zombi-k27.svg', '/avatars/pro/mumya-k28.svg',
      '/avatars/pro/kahraman-k29.svg', '/avatars/pro/palyaco-k30.svg',
      '/avatars/pro/kral-k31.svg'
    ) then
      raise exception 'Bu hazır avatar artık kullanılamıyor';
    end if;
  end if;

  update public.profiles set avatar_url = v_url, avatar_onayli = true where id = auth.uid();
end;
$$;

-- ---------- 6. Gizli botlar: 461'in kuralı aynen, liste 31 + 27 ----------
-- Profesyonel avatarlı (pro ya da pro2) gizli botlar id sırasıyla listeye döngüsel dağılır. Açık botlar
-- (/avatars/botN.svg) ve avatarsız (baş harf) botlar değişmez. Aynı veride tekrar çalışınca aynı sonuç.
with liste as (
  select array[
    '/avatars/pro/kedi-k01.svg', '/avatars/pro/kopek-k02.svg', '/avatars/pro/baykus-k03.svg',
    '/avatars/pro/tilki-k04.svg', '/avatars/pro/panda-k05.svg', '/avatars/pro/penguen-k06.svg',
    '/avatars/pro/kurbaga-k07.svg', '/avatars/pro/ayi-k08.svg', '/avatars/pro/maymun-k09.svg',
    '/avatars/pro/dinozor-k10.svg', '/avatars/pro/ejderha-k11.svg', '/avatars/pro/kopekbaligi-k12.svg',
    '/avatars/pro/ahtapot-k13.svg', '/avatars/pro/ari-k14.svg', '/avatars/pro/robot-k15.svg',
    '/avatars/pro/uzayli-k16.svg', '/avatars/pro/astronot-k17.svg', '/avatars/pro/ninja-k18.svg',
    '/avatars/pro/korsan-k19.svg', '/avatars/pro/sovalye-k20.svg', '/avatars/pro/buyucu-k21.svg',
    '/avatars/pro/dedektif-k22.svg', '/avatars/pro/asci-k23.svg', '/avatars/pro/profesor-k24.svg',
    '/avatars/pro/viking-k25.svg', '/avatars/pro/hayalet-k26.svg', '/avatars/pro/zombi-k27.svg',
    '/avatars/pro/mumya-k28.svg', '/avatars/pro/kahraman-k29.svg', '/avatars/pro/palyaco-k30.svg',
    '/avatars/pro/kral-k31.svg'
  ] || coalesce((select array_agg(k.url order by k.sira, k.anahtar) from public.avatar_katalogu k where k.aktif),
                array[]::text[]) as a
), sira as (
  select p.id, row_number() over (order by p.id) - 1 as i
    from public.profiles p
   where coalesce(p.is_bot, false)
     and not public.acik_bot_mu(p.is_bot, p.bot_turu)
     and not coalesce(p.acik_bot, false)
     and (p.avatar_url like '/avatars/pro/%' or p.avatar_url like '/avatars/pro2/%')
)
update public.profiles p
   set avatar_url = liste.a[(sira.i % cardinality(liste.a)) + 1]
  from sira, liste
 where p.id = sira.id
   and p.avatar_url is distinct from liste.a[(sira.i % cardinality(liste.a)) + 1];

-- ---------- 7. Çerçeve tarzı: Ida'nın /cerceve-onizleme seçimi oyunda ----------
-- Seçim yoksa null → istemci bugünkü çerçeveyi çizer. Yalnız okur; bir tasarım adı döner (gizli veri yok).
create or replace function public.cerceve_tarzi_aktif()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select s.secim from public.sahip_tasarim_secimleri s
   where s.konu = 'cerceve_tarzi' and s.secim in ('cizgi', 'mucevher', 'isik');
$$;
revoke execute on function public.cerceve_tarzi_aktif() from public, anon;
grant execute on function public.cerceve_tarzi_aktif() to authenticated;

-- ---------- 8. Satış bayrağı (Ida: açılsın) ----------
update public.oyun_ayarlari
   set deger = 'true'::jsonb,
       aciklama = 'Elmas kozmetiklerinin (VS kartı, isim/zafer efekti, tepki paketi) satışı açık mı. Yalnız aktif (Ida ''girsin'') kalemleri açar; pasifler bayraktan bağımsız gizli (550).'
 where anahtar = 'kozmetik_satis_acik'
   and deger is distinct from 'true'::jsonb;

-- ---------- 9. Rapor (uygulanınca günlüğe) ----------
do $$
declare v_k text; v_a text; v_t text;
begin
  select string_agg(anahtar, ', ' order by sira) into v_k from public.kozmetikler where aktif and onay = 'girsin';
  select string_agg(anahtar, ', ' order by sira) into v_a from public.auralar where aktif and kaynak = 'dukkan' and onay = 'girsin';
  select public.cerceve_tarzi_aktif() into v_t;
  raise notice '550 aktif kozmetikler: %', coalesce(v_k, '(yok)');
  raise notice '550 aktif auralar: %', coalesce(v_a, '(yok)');
  raise notice '550 çerçeve tarzı: %', coalesce(v_t, '(seçim yok — bugünkü çerçeve)');
end $$;
