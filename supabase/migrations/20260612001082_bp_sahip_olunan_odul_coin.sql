-- 1082 — Sezon Yolu: sahip olunan çerçeve / tepki paketi / unvan / arka plan ödülü yerine sembolik coin
-- Önceki durum: yalnız avatar ödülü (1039) zaten sahipse coin veriyordu; diğer türlerde oyuncu sessizce hiçbir şey almıyordu.
-- Yeni: çerçeve → bp_cerceve_sahipse_coin (100) · tepki paketi / unvan / arka plan → bp_diger_sahipse_coin (50) · avatar 1039'daki gibi
--   (bp_avatar_sahipse_coin, 200). Değerler oyun_ayarlari'ndan ayar_sayi ile okunur, varsayılanlar kodda (satır eklenmedi).
-- coin_ekle kaynak 'sezon_yolu' (günlük tavandan muaf: coin_ekle + 1080 coin_gunluk_kalan), referans tekil: v_ref || ':sahip'.
-- Elmas verilmez. 1039'daki bp_odul_uygula / bp_odul_ver_ic gövdeleri birebir alındı; yalnız sahiplik dalı genişledi.
-- bp_odul_sahip_mi yalnız iç yardımcı (istemciye kapalı, GRANT/REVOKE değişmedi); sezon_yolu_durumum'daki 'sahip' bayrağı
-- artık bu türler için de doğru (istemci "Zaten sahipsin" rozeti + "Alınca yerine N coin").
-- Geri alma: üç fonksiyonu 822 (bp_odul_sahip_mi) ve 1039 (bp_odul_uygula, bp_odul_ver_ic) tanımlarıyla yeniden oluştur;
--   bp_sahip_coin yardımcısı silinebilir.

-- ---------- 1. Sahip olunan ödül yerine verilecek coin (tür → ayar) ----------
create or replace function public.bp_sahip_coin(p_tur text)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select case p_tur
    when 'avatar' then public.ayar_sayi('bp_avatar_sahipse_coin', 200)::int
    when 'cerceve' then public.ayar_sayi('bp_cerceve_sahipse_coin', 100)::int
    when 'tepki_paketi' then public.ayar_sayi('bp_diger_sahipse_coin', 50)::int
    when 'unvan' then public.ayar_sayi('bp_diger_sahipse_coin', 50)::int
    when 'arka_plan' then public.ayar_sayi('bp_diger_sahipse_coin', 50)::int
    else 0 end;
$$;
revoke all on function public.bp_sahip_coin(text) from public, anon, authenticated;
grant execute on function public.bp_sahip_coin(text) to service_role;

-- ---------- 2. Oyuncu bu ödüle zaten sahip mi (822'deki avatar / arka_plan + çerçeve / tepki paketi / unvan) ----------
create or replace function public.bp_odul_sahip_mi(p_user uuid, p_tur text, p_veri jsonb)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case p_tur
    when 'avatar' then exists (
      select 1 from public.oyuncu_avatarlari o
        join public.avatar_nitelikleri n on n.anahtar = o.avatar
       where o.user_id = p_user and (n.anahtar = p_veri->>'anahtar' or n.url = p_veri->>'url'))
    when 'arka_plan' then exists (
      select 1 from public.oyuncu_kozmetikleri o
       where o.user_id = p_user and o.kozmetik = p_veri->>'anahtar')
    when 'tepki_paketi' then exists (
      select 1 from public.oyuncu_kozmetikleri o
       where o.user_id = p_user and o.kozmetik = p_veri->>'anahtar')
    when 'cerceve' then
      -- 780: premium çerçeve kozmetik olarak, lig/level/rozet çerçevesi oyuncu_cerceveleri'nde tutulur
      exists (select 1 from public.oyuncu_kozmetikleri o
               where o.user_id = p_user and o.kozmetik = p_veri->>'anahtar')
      or exists (select 1 from public.oyuncu_cerceveleri o
                  where o.user_id = p_user and o.cerceve = p_veri->>'anahtar')
    when 'unvan' then exists (
      select 1 from public.oyuncu_unvanlari o
       where o.user_id = p_user and o.unvan = p_veri->>'anahtar')
    else false end;
$$;

-- ---------- 3. Ödülü uygula (1039'un gövdesi; avatar dalı aynı, diğer türlerde sahipse coin) ----------
create or replace function public.bp_odul_uygula(p_user uuid, p_sezon bigint, p_seviye integer, p_kol text, p_odul jsonb)
returns boolean
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_tur text := p_odul->>'tur';
  v_veri jsonb := coalesce(p_odul->'veri', '{}'::jsonb);
  v_ref text := 'sezon:' || p_sezon || ':' || p_seviye || ':' || p_kol;
  v_n int;
begin
  if coalesce((p_odul->>'placeholder')::boolean, false) then return false; end if;
  case v_tur
    when 'coin'  then perform public.coin_ekle(p_user, (v_veri->>'miktar')::bigint, 'sezon_yolu', v_ref);
    when 'elmas' then perform public.elmas_ekle(p_user, (v_veri->>'miktar')::int, 'sezon_yolu', v_ref);
    when 'joker' then perform public.joker_hareket(p_user, v_veri->>'tur', (v_veri->>'adet')::int, 'hediye', v_ref);
    when 'tepki_paketi' then
      -- 1082: zaten sahipse paket yerine bp_diger_sahipse_coin (tavan dışı, referans tekil)
      if public.bp_odul_sahip_mi(p_user, v_tur, v_veri) then
        perform public.coin_ekle(p_user, public.bp_sahip_coin(v_tur), 'sezon_yolu', v_ref || ':sahip');
      else
        perform public.kozmetik_ver(p_user, v_veri->>'anahtar', 'etkinlik');
      end if;
    when 'unvan' then
      if public.bp_odul_sahip_mi(p_user, v_tur, v_veri) then
        perform public.coin_ekle(p_user, public.bp_sahip_coin(v_tur), 'sezon_yolu', v_ref || ':sahip');
      else
        insert into public.oyuncu_unvanlari (user_id, unvan) values (p_user, v_veri->>'anahtar') on conflict do nothing;
      end if;
    when 'avatar' then
      -- 822: sahiplik anahtarla tutulur (820). 1039: zaten sahipse avatar yerine bp_avatar_sahipse_coin (tavan dışı, referans tekil)
      insert into public.oyuncu_avatarlari (user_id, avatar, kaynak)
      select p_user, n.anahtar, 'etkinlik'
        from public.avatar_nitelikleri n
       where n.anahtar = v_veri->>'anahtar' or n.url = v_veri->>'url'
      on conflict do nothing;
      get diagnostics v_n = row_count;
      if v_n = 0 then
        perform public.coin_ekle(p_user, public.ayar_sayi('bp_avatar_sahipse_coin', 200), 'sezon_yolu', v_ref || ':sahip');
      end if;
    when 'arka_plan' then
      if public.bp_odul_sahip_mi(p_user, v_tur, v_veri) then
        perform public.coin_ekle(p_user, public.bp_sahip_coin(v_tur), 'sezon_yolu', v_ref || ':sahip');
      else
        perform public.kozmetik_ver(p_user, v_veri->>'anahtar', 'etkinlik');   -- 822; idempotent
      end if;
    when 'cerceve' then
      if public.bp_odul_sahip_mi(p_user, v_tur, v_veri) then
        perform public.coin_ekle(p_user, public.bp_sahip_coin(v_tur), 'sezon_yolu', v_ref || ':sahip');
      -- 780: premium çerçeve (kozmetik) → sahiplik kozmetik_ver ile; lig/level/rozet çerçevesi → eski yol
      elsif exists (select 1 from public.kozmetikler k where k.anahtar = v_veri->>'anahtar' and k.tur = 'premium_cerceve') then
        perform public.kozmetik_ver(p_user, v_veri->>'anahtar', 'etkinlik');
      else
        perform public.cerceve_ver(p_user, v_veri->>'anahtar', 'etkinlik');
      end if;
    else raise exception 'Bilinmeyen ödül türü: %', v_tur;
  end case;
  return true;
end $function$;

-- ---------- 4. Ödülü ver (1039'un gövdesi; sahip_coin artık sahip olunan her tür için döner) ----------
create or replace function public.bp_odul_ver_ic(p_user uuid, p_sezon bigint, p_seviye integer, p_kol text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_odul jsonb;
  v_n int;
  v_verildi boolean;
begin
  select to_jsonb(o) into v_odul from public.bp_seviye_odulleri o where o.seviye = p_seviye and o.kol = p_kol;
  if v_odul is null then return null; end if;
  v_verildi := not coalesce((v_odul->>'placeholder')::boolean, false);
  -- 822: ödül verilmeden ÖNCE bakılır; zaten sahipse çift satır yok. 1039/1082: sahip olunan ödülde yerine coin (bp_odul_uygula)
  if v_verildi and public.bp_odul_sahip_mi(p_user, v_odul->>'tur', v_odul->'veri') then
    v_odul := v_odul || jsonb_build_object('zaten_sahip', true);
    if public.bp_sahip_coin(v_odul->>'tur') > 0 then
      v_odul := v_odul || jsonb_build_object('sahip_coin', public.bp_sahip_coin(v_odul->>'tur'));
    end if;
  end if;
  insert into public.oyuncu_bp_odul_alimi (sezon, user_id, seviye, kol, odul, verildi)
  values (p_sezon, p_user, p_seviye, p_kol, v_odul, v_verildi)
  on conflict do nothing;
  get diagnostics v_n = row_count;
  if v_n = 0 then return null; end if;
  perform public.bp_odul_uygula(p_user, p_sezon, p_seviye, p_kol, v_odul);
  return v_odul;
end $function$;

-- Doğrulama notu (uygulamadan sonra, salt okuma):
--   select public.bp_sahip_coin('avatar'), public.bp_sahip_coin('cerceve'), public.bp_sahip_coin('unvan'), public.bp_sahip_coin('tepki_paketi');
--   → 200, 100, 50, 50 (oyun_ayarlari satırı yoksa varsayılanlar)
