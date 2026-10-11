-- 1066: GÜVENLİK C — kalan öneriler (docs/GUVENLIK-DENETIMI-2026-10-10.md › C.3 + C.4; 11 Eki 2026)
--
-- 1) meydan_turnuva_damgasi (C.3, "Düşük"): turnuvadan 10 dk önce çağırmak tek başına coin veriyordu, gerçek katılım
--    şartı yoktu. Meydan (3B harita) 20 Eyl 2026'dan beri DONDURULMUŞ — arayüzden çağıran yok, ama RPC açık olduğu için
--    elle çağrılıp turnuva başına coin alınabiliyordu. Dondurulmuş modüllerin deseniyle sunucu kapısı eklendi:
--    oyun_ayarlari.meydan_damga_acik (0 = kapalı). Kapalıyken hiçbir şey yazmaz, coin vermez (false, null, 0 döner).
--    Meydan geri açılırken ayar 1 yapılır. İmza, dönüş ve açıkken davranış aynı.
-- 2) avatar3d_portre_kaydet (C.4): URL deseni herhangi bir *.supabase.co projesini kabul ediyordu → bu projenin
--    kimliğine sabitlendi (zfpnxzybcpkxsotwdsey). Dondurulmuş modül; yalnız girdi doğrulaması daraldı.
-- Yetki/RLS/GRANT değişmez (create or replace mevcut EXECUTE yetkilerini korur).
-- Geri alma: ayarı 1 yap; portre deseninde proje kimliği yerine eski '[a-z0-9]+' (aynı fonksiyon, tek satır).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('meydan_damga_acik', '0', 'Meydan turnuva damgası ve coin ödülü (1066). Meydan dondurulmuşken 0; geri açılınca 1.')
on conflict (anahtar) do nothing;

CREATE OR REPLACE FUNCTION public.meydan_turnuva_damgasi()
 RETURNS TABLE(damgalandi boolean, turnuva_id uuid, coin bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_dakika int := public.ayar_sayi('meydan_kapi_dakika', 10)::int;
  v_odul bigint := public.ayar_sayi('coin_meydan_katilim', 50);
  t public.tournaments%rowtype;
  v_yeni boolean := false;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('meydan_turnuva_damgasi', 20, interval '60 seconds');

  -- 1066: Meydan dondurulmuş — kapı kapalıyken damga ve coin yok
  if public.ayar_sayi('meydan_damga_acik', 0) <> 1 then
    return query select false, null::uuid, 0::bigint;
    return;
  end if;

  -- PENCERE KONTROLÜ: kapı açılma anından turnuva bitene kadar.
  -- İstemciye güvenilmez; zamanı sunucu ölçer.
  select * into t
    from public.tournaments
   where durum in ('lobi', 'aktif')
     and now() >= baslangic - (v_dakika || ' minutes')::interval
   order by baslangic asc
   limit 1;

  if not found then
    return query select false, null::uuid, 0::bigint;
    return;
  end if;

  insert into public.meydan_katilim (user_id, turnuva_id)
  values (v_me, t.id)
  on conflict do nothing;
  v_yeni := found;

  -- Ödül yalnız İLK damgada (coin_hareketleri tekilliği de ayrıca korur)
  if v_yeni then
    perform public.coin_ekle(v_me, v_odul, 'etkinlik', 'meydan:' || t.id::text);
    perform public.award_badge(v_me, 'meydanda_toplandin');
  end if;

  return query select v_yeni, t.id, case when v_yeni then v_odul else 0::bigint end;
end;
$function$

;

CREATE OR REPLACE FUNCTION public.avatar3d_portre_kaydet(p_url text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_sonuc jsonb;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('avatar3d_portre_kaydet', 30, interval '60 seconds');
  -- Yalnız kendi Storage kovamızdaki adres kabul edilir: istemci buraya
  -- rastgele bir adres yazamasın (listelerde herkese gösteriliyor).
  -- 1066: yalnız BU projenin kovası (önce herhangi bir *.supabase.co kabul ediliyordu).
  if p_url is null or p_url !~ '^https://zfpnxzybcpkxsotwdsey\.supabase\.co/storage/v1/object/public/avatarlar/' then
    raise exception 'Geçersiz portre adresi';
  end if;

  update public.profiles
     set gorunum = coalesce(gorunum, '{}'::jsonb) || jsonb_build_object('portre_url', p_url)
   where id = v_me
  returning gorunum into v_sonuc;

  return v_sonuc;
end;
$function$

;
