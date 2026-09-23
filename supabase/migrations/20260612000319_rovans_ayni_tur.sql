-- Rövanş ilk maçla AYNI türde açılır: serbest → serbest, dereceli → dereceli.
--
-- HATA: rovans_iste yeni maçı `dereceli` kolonu vermeden yazıyordu; kolonun
-- varsayılanı true olduğu için serbest maçın rövanşı dereceli açılıyordu.
-- Açık bot yolunda soru havuzu da serbest bayrağını (p_serbest_klasik) almıyordu.
-- jokersiz (Saf Bilgi) zaten korunuyordu (Paket 31 B); o davranış aynen durur.
--
-- Düello: duello_rovans_baslat zaten d.dereceli'yi duello_olustur'a geçiriyor —
-- değişiklik yok; test (_test/sunucu/rovans-ayni-tur.test.mjs) ikisini de korur.
--
-- İmza, dönüş tipi, security definer ve yetkiler (yalnız authenticated) aynı.

CREATE OR REPLACE FUNCTION public.rovans_iste(p_mac_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  m public.matches%rowtype;
  v_rakip uuid;
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
  -- ESKİDEN: her bot için anında başlıyordu. Artık yalnız AÇIK bot.
  select coalesce(is_bot, false) and coalesce(bot_turu, 'acik') = 'acik'
    into v_acik_bot from public.profiles where id = v_rakip;

  if exists (
    select 1 from public.matches x
    where x.durum in ('bekliyor','aktif')
      and ((x.oyuncu1 = v_me and x.oyuncu2 = v_rakip) or (x.oyuncu1 = v_rakip and x.oyuncu2 = v_me))
  ) then
    raise exception 'Bu oyuncuyla zaten devam eden bir maçın var';
  end if;

  perform public.mac_kotasi_kontrol();

  if coalesce(v_acik_bot, false) then
    -- Açık bot: rövanş anında başlar (oyuncu bot olduğunu biliyor).
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
    -- Gerçek oyuncu VE gizli bot: davet olarak açılır.
    -- Bildirimi trg_matches_davet_bildir yazar (tek kaynak); gizli botun
    -- kabulünü bot_oyna gecikmeyle yapar (soruları m.dereceli'ye göre seçer).
    insert into public.matches (oyuncu1, oyuncu2, kategori, rovans, dereceli, jokersiz)
    values (v_me, v_rakip, m.kategori, true, coalesce(m.dereceli, true), coalesce(m.jokersiz, false))
    returning id into v_id;
  end if;

  return v_id;
end;
$function$;

revoke all on function public.rovans_iste(uuid) from public, anon;
grant execute on function public.rovans_iste(uuid) to authenticated;
