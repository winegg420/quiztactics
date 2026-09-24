-- ============================================================
-- 560 · PREMIUM KOZMETİK — hareketli çerçeve + iç arka plan aurası (Ida onayı, 24 Eyl 2026)
--
-- Ida /premium-onizleme'de seçti, "girsin":
--   Premium çerçeve (hareketli)      : Sonbahar · Galaksi · Sakura                       → 500 elmas (TEST)
--   Premium aura (avatarın İÇ zemini) : Düşen Sonbahar Yaprakları · Yağan Kar · Yükselen Köz ·
--                                       Yıldızlı Gece · Kuzey Işıkları · Su Altı          → 300 elmas (TEST)
-- Sanat istemcide (oyun/tasarim/premium/): anahtarın öneki atılınca sanat anahtarı (pc_sonbahar → sonbahar).
--
-- Kurallar (540/550 ile aynı; kod değil, veri):
--   · Satış: kozmetik_satista = aktif + onay 'girsin' + fiyat + kozmetik_satis_acik. Satış kapalıyken
--     normal oyuncu görmez; sahip olunan kalem görünür/takılır.
--   · Sahip test modu (sahip_mi): satın almadan takar, maçta rakibe de görünür — yalnız AKTİF kalemlerde.
--   · Gizli botlar premium TAKMAZ: bot_kozmetik premium türler için null; oyuncu_kartlari gizli bot
--     dalında premium alanlar null. Açık botlar zaten kozmetik takmaz.
--   · Eski dükkân auraları (auralar tablosu, 552 ile pasif) ve takili_aura DOKUNULMAZ.
--   · Etkinlik/turnuva ödülü: kozmetik_ver(p_user, p_anahtar, p_kaynak) — iç yardımcı, istemciye kapalı.
--
-- Değişenler:
--   kozmetikler.tur kısıtı  + 'premium_cerceve', 'premium_aura' (kısıt güvenle yeniden kurulur)
--   profiles                + takili_premium_cerceve, takili_premium_aura (FK kozmetikler, on delete set null;
--                             kolon bazlı SELECT yetkisi nedeniyle istemciye kapalı doğar — yetki değişmez)
--   oyun_ayarlari           + elmas_premium_cerceve 500, elmas_premium_aura 300 (TEST; varsa dokunulmaz)
--   kozmetikler             + 9 kalem (onay 'girsin', aktif)
--   kozmetik_katalogu       takılı işareti yeni yuvaları da okur (dönüş tipi aynı)
--   kozmetik_tak            yeni türler takılır (dönüş tipi aynı)
--   bot_kozmetik            premium türler → null
--   oyuncu_kartlari         + premium_cerceve, premium_aura (dönüş tipi değişti → DROP + CREATE;
--                             yetkiler 541'dekiyle BİREBİR aynı yeniden verilir)
--   lig_grubum_ozet         satırlara premium_cerceve, premium_aura (dönüş tipi aynı jsonb)
--   kozmetik_ver            YENİ iç yardımcı (security definer, public/anon/authenticated'a kapalı)
--
-- Tekrar çalıştırılabilir. Yıkıcı değil: satır silinmez, kolon düşmez, politika/yetki değişmez.
-- Migration uygulanmadan dağıtılan istemci eski görünümde kalır (premium alanı yoksa eski çizim).
-- ============================================================

-- ---------- 1. Tür kısıtı (vs_karti … tepki_paketi + premium) ----------
do $$
declare r record;
begin
  -- 540'taki satır içi kısıt (adı ne olursa olsun) 'tur' kolonundaki IN listesi: bulunur, düşürülür
  for r in
    select c.conname
      from pg_constraint c
     where c.conrelid = 'public.kozmetikler'::regclass
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) like '%vs_karti%'
       and pg_get_constraintdef(c.oid) not like '%premium_aura%'
  loop
    execute format('alter table public.kozmetikler drop constraint %I', r.conname);
  end loop;
  if not exists (
    select 1 from pg_constraint c
     where c.conrelid = 'public.kozmetikler'::regclass and c.contype = 'c'
       and pg_get_constraintdef(c.oid) like '%premium_aura%'
  ) then
    alter table public.kozmetikler add constraint kozmetikler_tur_check
      check (tur in ('vs_karti', 'isim_efekti', 'zafer_efekti', 'tepki_paketi', 'premium_cerceve', 'premium_aura'));
  end if;
end $$;

-- ---------- 2. Takılı yuvalar ----------
alter table public.profiles add column if not exists takili_premium_cerceve text
  references public.kozmetikler(anahtar) on delete set null;
alter table public.profiles add column if not exists takili_premium_aura text
  references public.kozmetikler(anahtar) on delete set null;

-- ---------- 3. Fiyatlar (TEST) — kozmetik_fiyati 'elmas_' || tur ----------
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('elmas_premium_cerceve', '500', 'TEST — Premium hareketli çerçeve fiyatı (elmas).'),
  ('elmas_premium_aura', '300', 'TEST — Premium aura (avatarın iç arka planı) fiyatı (elmas).')
on conflict (anahtar) do nothing;

-- ---------- 4. 9 kalem (Ida: girsin) ----------
-- onay yalnız İLK eklemede 'girsin'; sonradan Ida değiştirirse tekrar çalıştırma ezmez.
insert into public.kozmetikler (anahtar, tur, ad_tr, ad_en, icerik, bot_min_level, aktif, onay, onay_zamani, sira) values
  ('pc_sonbahar', 'premium_cerceve', 'Sonbahar',                  'Autumn',               '{"sanat": "sonbahar"}', 999, true, 'girsin', now(), 501),
  ('pc_galaksi',  'premium_cerceve', 'Galaksi',                   'Galaxy',               '{"sanat": "galaksi"}',  999, true, 'girsin', now(), 502),
  ('pc_sakura',   'premium_cerceve', 'Sakura',                    'Sakura',               '{"sanat": "sakura"}',   999, true, 'girsin', now(), 503),
  ('pa_yaprak',   'premium_aura',    'Düşen Sonbahar Yaprakları', 'Falling Autumn Leaves', '{"sanat": "yaprak"}',  999, true, 'girsin', now(), 601),
  ('pa_kar',      'premium_aura',    'Yağan Kar',                 'Falling Snow',         '{"sanat": "kar"}',      999, true, 'girsin', now(), 602),
  ('pa_kor',      'premium_aura',    'Yükselen Köz',              'Rising Embers',        '{"sanat": "kor"}',      999, true, 'girsin', now(), 603),
  ('pa_gece',     'premium_aura',    'Yıldızlı Gece',             'Starry Night',         '{"sanat": "gece"}',     999, true, 'girsin', now(), 604),
  ('pa_kuzey',    'premium_aura',    'Kuzey Işıkları',            'Northern Lights',      '{"sanat": "kuzey"}',    999, true, 'girsin', now(), 605),
  ('pa_sualti',   'premium_aura',    'Su Altı',                   'Underwater',           '{"sanat": "sualti"}',   999, true, 'girsin', now(), 606)
on conflict (anahtar) do update
  set tur = excluded.tur, ad_tr = excluded.ad_tr, ad_en = excluded.ad_en, icerik = excluded.icerik,
      bot_min_level = excluded.bot_min_level, sira = excluded.sira;

-- ---------- 5. Katalog: takılı işareti yeni yuvaları da okur (550'deki kural aynen) ----------
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
  select pr.takili_vs_karti, pr.takili_isim_efekti, pr.takili_zafer_efekti,
         pr.takili_premium_cerceve, pr.takili_premium_aura into p
    from public.profiles pr where pr.id = v_me;
  return query
  select k.anahtar, k.tur, case when v_en then k.ad_en else k.ad_tr end, k.ad_tr, k.ad_en,
         public.kozmetik_fiyati(k.tur, k.fiyat_elmas), k.icerik, k.sira,
         public.kozmetik_satista(k.anahtar),
         exists (select 1 from public.oyuncu_kozmetikleri o where o.user_id = v_me and o.kozmetik = k.anahtar),
         coalesce(k.anahtar in (p.takili_vs_karti, p.takili_isim_efekti, p.takili_zafer_efekti,
                                p.takili_premium_cerceve, p.takili_premium_aura), false),
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

-- ---------- 6. Tak / çıkar: yeni türler (yalnız AKTİF kalem; sahip olunan ya da sahip test modu) ----------
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
  if p_tur not in ('vs_karti', 'isim_efekti', 'zafer_efekti', 'premium_cerceve', 'premium_aura') then
    raise exception 'Bu tür takılmaz';
  end if;
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
     set takili_vs_karti        = case when p_tur = 'vs_karti'        then p_anahtar else takili_vs_karti end,
         takili_isim_efekti     = case when p_tur = 'isim_efekti'     then p_anahtar else takili_isim_efekti end,
         takili_zafer_efekti    = case when p_tur = 'zafer_efekti'    then p_anahtar else takili_zafer_efekti end,
         takili_premium_cerceve = case when p_tur = 'premium_cerceve' then p_anahtar else takili_premium_cerceve end,
         takili_premium_aura    = case when p_tur = 'premium_aura'    then p_anahtar else takili_premium_aura end
   where id = v_me;
  return jsonb_build_object('tur', p_tur, 'takili', p_anahtar);
end;
$$;

-- ---------- 7. Bot kozmetiği: premium türler gizli botlarda YOK (540'ın gövdesi + ilk satır) ----------
create or replace function public.bot_kozmetik(p_id uuid, p_level integer, p_tur text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_olasilik numeric;
  v_adaylar text[];
begin
  if p_id is null then return null; end if;
  if p_tur in ('premium_cerceve', 'premium_aura') then return null; end if;   -- 560: botlar premium takmaz
  v_olasilik := least(public.ayar_ondalik('bot_kozmetik_max_yuzde', 55),
                      public.ayar_ondalik('bot_kozmetik_taban_yuzde', 10)
                      + public.ayar_ondalik('bot_kozmetik_level_yuzde', 0.6) * coalesce(p_level, 1)) / 100.0;
  if public.bot_rasgele('bk:' || p_tur || ':' || p_id::text) >= v_olasilik then return null; end if;

  if p_tur = 'aura' then
    select array_agg(a.anahtar order by a.sira) into v_adaylar
      from public.auralar a
     where a.aktif and a.kaynak = 'dukkan' and a.onay = 'girsin' and public.aura_fiyati(a.nadirlik) is not null
       and coalesce(p_level, 1) >= case a.nadirlik when 'siradan' then 1 when 'nadir' then 10
                                                   when 'epik' then 20 else 35 end;
  else
    if not public.kozmetik_satis_acik_mi() then return null; end if;
    select array_agg(k.anahtar order by k.sira) into v_adaylar
      from public.kozmetikler k
     where k.tur = p_tur and k.aktif and k.onay = 'girsin' and coalesce(p_level, 1) >= k.bot_min_level
       and public.kozmetik_fiyati(k.tur, k.fiyat_elmas) is not null;
  end if;
  if v_adaylar is null or cardinality(v_adaylar) = 0 then return null; end if;
  return v_adaylar[1 + floor(public.bot_rasgele('bks:' || p_tur || ':' || p_id::text) * cardinality(v_adaylar))::int];
end;
$$;
revoke all on function public.bot_kozmetik(uuid, integer, text) from public, anon, authenticated;

-- ---------- 8. Oyuncu kartı: + premium_cerceve, premium_aura (DROP + CREATE; yetkiler 541 ile aynı) ----------
drop function if exists public.oyuncu_kartlari(uuid[]);
create function public.oyuncu_kartlari(p_idler uuid[])
returns table(id uuid, ad text, avatar text, level integer, lig text, cerceve text, cerceve_nadirlik text,
              vitrin jsonb, aura text, vs_karti text, isim_efekti text, zafer_efekti text,
              premium_cerceve text, premium_aura text)
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
                     where k.anahtar = p.takili_zafer_efekti and k.aktif and k.onay = 'girsin') end,
         -- 560: premium — gizli botta her zaman null; insanda yalnız aktif ('girsin') kalem
         case when gb.gizli then null
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_premium_cerceve and k.tur = 'premium_cerceve'
                       and k.aktif and k.onay = 'girsin') end,
         case when gb.gizli then null
              else (select k.anahtar from public.kozmetikler k
                     where k.anahtar = p.takili_premium_aura and k.tur = 'premium_aura'
                       and k.aktif and k.onay = 'girsin') end
    from public.profiles p
    left join public.cerceveler c on c.anahtar = p.takili_cerceve
    cross join lateral (select coalesce(p.is_bot, false) and not public.acik_bot_mu(p.is_bot, p.bot_turu)
                               and not coalesce(p.acik_bot, false) as gizli) gb
   where auth.uid() is not null
     and p.id = any(p_idler[1:200]);
$function$;
revoke all on function public.oyuncu_kartlari(uuid[]) from public, anon;
grant execute on function public.oyuncu_kartlari(uuid[]) to authenticated;

-- ---------- 9. lig_grubum_ozet satırlarına premium alanlar (541'in gövdesi; yalnız satır nesnesi genişledi) ----------
CREATE OR REPLACE FUNCTION public.lig_grubum_ozet()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_tum jsonb;
  v_satirlar jsonb;
  v_ben record;
  v_boyu int; v_lig text; v_yuk int; v_dus int; v_bitis timestamptz;
  v_ust_puan int; v_cizgi_puan int;
  v_yuk_sira int; v_dus_sira int;
  v_bolge text;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Mevcut lig_grubum() (görünürlük kuralları onda) tek kez çağrılır
  select coalesce(jsonb_agg(jsonb_build_object(
           'sira', g.sira, 'user_id', g.user_id, 'puan', g.puan, 'ben', g.ben, 'lig', g.lig,
           'yukselen', g.yukselen, 'dusen', g.dusen, 'sezon_bitis', g.sezon_bitis)), '[]'::jsonb)
    into v_tum
    from public.lig_grubum() g;

  select * into v_ben from jsonb_to_recordset(v_tum) as o(sira bigint, user_id uuid, puan int, ben boolean,
    lig text, yukselen int, dusen int, sezon_bitis timestamptz) where o.ben limit 1;
  if not found then return null; end if;

  v_lig := v_ben.lig; v_yuk := v_ben.yukselen; v_dus := v_ben.dusen; v_bitis := v_ben.sezon_bitis;
  v_boyu := jsonb_array_length(v_tum);   -- oyuncunun gördüğü tablo boyu

  v_yuk_sira := case when v_lig = 'efsane' then null else least(v_yuk, v_boyu) end;
  v_dus_sira := case when v_lig = 'bronz' or v_boyu <= v_dus then null else v_boyu - v_dus + 1 end;

  select o.puan into v_ust_puan from jsonb_to_recordset(v_tum) as o(sira bigint, puan int) where o.sira = v_ben.sira - 1;
  select o.puan into v_cizgi_puan from jsonb_to_recordset(v_tum) as o(sira bigint, puan int) where o.sira = v_yuk_sira;

  v_bolge := case
    when v_yuk_sira is not null and v_ben.sira <= v_yuk_sira and coalesce(v_ben.puan, 0) > 0 then 'yukselme'
    when v_dus_sira is not null and v_ben.sira >= v_dus_sira then 'dusme'
    else 'guvenli' end;

  select coalesce(jsonb_agg(jsonb_build_object(
           'sira', o.sira, 'user_id', o.user_id, 'puan', o.puan, 'ben', o.ben,
           'ad', k.ad, 'avatar', k.avatar, 'level', k.level, 'lig', k.lig,
           'cerceve', k.cerceve, 'cerceve_nadirlik', k.cerceve_nadirlik, 'vitrin', k.vitrin,
           'aura', k.aura, 'isim_efekti', k.isim_efekti,
           'premium_cerceve', k.premium_cerceve, 'premium_aura', k.premium_aura)
           order by o.sira), '[]'::jsonb)
    into v_satirlar
    from jsonb_to_recordset(v_tum) as o(sira bigint, user_id uuid, puan int, ben boolean)
    left join lateral public.oyuncu_kartlari(array[o.user_id]) k on true
   where o.sira between v_ben.sira - 2 and v_ben.sira + 2;

  return jsonb_build_object(
    'lig', v_lig,
    'ust_lig', case when v_lig = 'efsane' then null else public.lig_adi(public.lig_sirasi(v_lig) + 1) end,
    'alt_lig', case when v_lig = 'bronz' then null else public.lig_adi(public.lig_sirasi(v_lig) - 1) end,
    'grup_boyu', v_boyu,
    'sira', v_ben.sira,
    'puan', v_ben.puan,
    'yukselen', v_yuk,
    'dusen', v_dus,
    'yukselme_sirasi', v_yuk_sira,
    'dusme_sirasi', v_dus_sira,
    'bolge', v_bolge,
    'ust_siraya_fark', case when v_ust_puan is null then null else greatest(v_ust_puan - v_ben.puan, 0) + 1 end,
    'yukselme_cizgisine_fark', case
        when v_yuk_sira is null then null
        when v_bolge = 'yukselme' then 0
        else greatest(coalesce(v_cizgi_puan, 0) - coalesce(v_ben.puan, 0), 0) + 1 end,
    'hafta_bitis', v_bitis,
    'satirlar', v_satirlar);
end;
$function$;

-- ---------- 10. Etkinlik / turnuva ödülü: iç yardımcı (istemciye KAPALI) ----------
-- Sunucudaki başka bir fonksiyon (turnuva sonu, etkinlik) çağırır. Botlara vermez. Aktif olmayan
-- (pasif) kalem de verilebilir — sahiplik kaydı durur, kalem açılınca görünür. Dönüş: yeni verildiyse true.
create or replace function public.kozmetik_ver(p_user uuid, p_anahtar text, p_kaynak text default 'etkinlik')
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bot boolean;
  v_n int;
begin
  if p_user is null or p_anahtar is null then return false; end if;
  if coalesce(p_kaynak, '') not in ('dukkan', 'hediye', 'etkinlik') then raise exception 'Geçersiz kaynak'; end if;
  select coalesce(p.is_bot, false) into v_bot from public.profiles p where p.id = p_user;
  if v_bot is null or v_bot then return false; end if;               -- profil yok ya da bot → verilmez
  if not exists (select 1 from public.kozmetikler k where k.anahtar = p_anahtar) then
    raise exception 'Böyle bir kozmetik yok';
  end if;
  insert into public.oyuncu_kozmetikleri (user_id, kozmetik, kaynak)
  values (p_user, p_anahtar, p_kaynak)
  on conflict (user_id, kozmetik) do nothing;
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;
revoke all on function public.kozmetik_ver(uuid, text, text) from public, anon, authenticated;

-- ---------- 11. Rapor ----------
do $$
declare v_k text;
begin
  select string_agg(anahtar || ' ' || public.kozmetik_fiyati(tur, fiyat_elmas)::text, ', ' order by sira) into v_k
    from public.kozmetikler where tur in ('premium_cerceve', 'premium_aura') and aktif and onay = 'girsin';
  raise notice '560 aktif premium kalemler (elmas): %', coalesce(v_k, '(yok)');
end $$;
