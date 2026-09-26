-- 657 — Bota karşı Rövanş anında başlar (D-402).
-- Sorun: gizli bota rövanş 'bekliyor' davetiydi; bot_oyna daveti 8–90 sn gecikmeyle kabul ediyordu
-- (179, gizli bot anında kabul etmesin). Oyuncu ~49 sn bekliyordu; ekran da "Maç açılamadı" diyordu.
-- Karar (Ida, D-402): bot rakipte rövanş anında kabul edilir. Açık botta zaten öyleydi; gizli bot da
-- artık aynı yolu izler — maç aynı transaction'da 'aktif' açılır, Hazır kapısı hemen çıkar.
-- Geri alma: oyun_ayarlari.bot_rovans_anlik = 0 → gizli bota rövanş eski gecikmeli davet olur (179).
-- Gerçek oyuncu rövanşı değişmez (istek). Yalnız rovans_iste gövdesi; yetki/RLS/GRANT değişmez.

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('bot_rovans_anlik', '1'::jsonb,
   'Bota (gizli bot dahil) rövanş anında başlar (1) ya da gizli bota gecikmeli davet olur (0).')
on conflict (anahtar) do nothing;

create or replace function public.rovans_iste(p_mac_id uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_me uuid := auth.uid();
  m public.matches%rowtype;
  v_rakip uuid;
  v_bot boolean;
  v_acik_bot boolean;
  v_id uuid;
begin
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  select * into m from public.matches where id = p_mac_id;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if v_me not in (m.oyuncu1, m.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  if m.durum <> 'bitti' then raise exception 'Maç henüz bitmedi'; end if;
  if m.kazanan is null or m.kazanan = v_me then
    raise exception 'Rövanş yalnızca kaybettiğin maç için istenebilir';
  end if;
  if m.bitis is null or m.bitis < now() - interval '24 hours' then
    raise exception 'Rövanş süresi doldu (24 saat)';
  end if;

  v_rakip := case when m.oyuncu1 = v_me then m.oyuncu2 else m.oyuncu1 end;
  select coalesce(is_bot, false),
         coalesce(is_bot, false) and coalesce(bot_turu, 'acik') = 'acik'
    into v_bot, v_acik_bot from public.profiles where id = v_rakip;

  if exists (
    select 1 from public.matches x
    where x.durum in ('bekliyor','aktif')
      and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me))
  ) then
    raise exception 'Bu oyuncuyla zaten devam eden bir maçın var';
  end if;

  perform public.mac_kotasi_kontrol();

  if coalesce(v_acik_bot, false)
     or (coalesce(v_bot, false) and public.ayar_ondalik('bot_rovans_anlik', 1) >= 1) then
    -- Bot rakip (açık ya da gizli): rövanş anında başlar, kabul beklenmez.
    insert into public.matches (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic,
                                rovans, dereceli, jokersiz)
    values (
      v_me, v_rakip, 'aktif', m.kategori,
      public.soru_sec(m.kategori, 20, array[v_me], p_serbest_klasik => not coalesce(m.dereceli, true)),
      0, now(), true,
      coalesce(m.dereceli, true),     -- rövanş aynı tür: serbest → serbest
      coalesce(m.jokersiz, false)     -- Paket 31 B: rövanş aynı modda
    )
    returning id into v_id;
  else
    -- Gerçek oyuncu (ve bot_rovans_anlik = 0'da gizli bot): davet olarak açılır.
    -- Bildirimi trg_matches_davet_bildir yazar (tek kaynak); gizli botun
    -- kabulünü bot_oyna gecikmeyle yapar (soruları m.dereceli'ye göre seçer).
    insert into public.matches (oyuncu1, oyuncu2, kategori, rovans, dereceli, jokersiz)
    values (v_me, v_rakip, m.kategori, true, coalesce(m.dereceli, true), coalesce(m.jokersiz, false))
    returning id into v_id;
  end if;

  return v_id;
end;
$function$;
