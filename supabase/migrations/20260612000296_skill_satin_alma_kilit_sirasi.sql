-- ============================================================
-- 296 — Skill satın alma: kilit sırası (deadlock düzeltmesi)
--
-- KUSUR (23 Eyl 2026, oyuncu testi): Düello'da coin'le skill alınırken
-- `joker_al_ve_kullan` ÖNCE profiles satırını, SONRA (duello_*_jokeri →
-- duello_kilitle) düello satırını kilitliyordu. Aynı anda gelen durum
-- sorgusu (duello_durum → duello_kilitle) ise ÖNCE düello satırını, SONRA
-- profiles.last_seen'i kilitliyor. Ters sıra → 40P01 deadlock; ya satın
-- alma ya ekran yenilemesi hata veriyordu. Klasik'te aynı döngü
-- (use_joker: matches → profiles) mümkündü.
--
-- ÇÖZÜM: satın almada önce MAÇ satırı kilitlenir, sonra profil. Böylece
-- bütün yollar aynı sırayla (Düello: rpc_sayac duello_eylem → maç → profil)
-- kilitler. Başka değişiklik yok.
-- ============================================================
CREATE OR REPLACE FUNCTION public.joker_al_ve_kullan(p_mac_tur text, p_mac_id uuid, p_soru_index integer, p_tur text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_fiyat bigint;
  v_adet int;
  v_satin boolean := false;
  v_sonuc jsonb;
begin
  -- Arka arkaya basılıp coin boşaltılamasın.
  perform public.hiz_siniri('joker_al_ve_kullan', 10, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;
  if p_mac_tur not in ('1v1', 'grup', 'hizli', 'turnuva', 'duello') then
    raise exception 'Geçersiz maç türü';
  end if;

  v_fiyat := public.joker_fiyati(p_tur);
  if v_fiyat is null or v_fiyat <= 0 then raise exception 'Bu joker satın alınamaz'; end if;

  -- Hak kapısı satın almadan ÖNCE: hakkı dolmuş oyuncudan coin alınmasın.
  -- (Aynı kapı kullanım fonksiyonunda tekrar çalışır; burada erken dönmek için.)
  perform public.joker_hak_kontrol(p_mac_tur, p_mac_id, p_tur);

  -- Kilit sırası (296): önce maç satırı, sonra profil — durum/cevap yolları da bu sırayla
  -- kilitler (duello_kilitle: duellolar → profiles). Ters sıra deadlock üretiyordu.
  if p_mac_tur = 'duello' then
    -- duello2_skill ve duello_cevap önce bu sayaç satırını, sonra düelloyu kilitler; aynı sıra.
    perform public.hiz_siniri('duello_eylem', 90, interval '60 seconds');
    perform 1 from public.duellolar where id = p_mac_id for update;
  elsif p_mac_tur = '1v1' then
    perform 1 from public.matches where id = p_mac_id for update;
  end if;

  -- Profil kilidi: iki sekmeden aynı anda satın alma aynı coin'i harcayamaz.
  perform 1 from public.profiles where id = v_me for update;

  select coalesce(e.adet, 0) into v_adet
    from public.joker_envanter e where e.user_id = v_me and e.tur = p_tur;

  -- Ücretsiz 50:50 hakkı duruyorsa satın almaya gerek yok — coin boşa gitmesin.
  -- Paket 34: ücretsiz modda hiçbir şey satın alınmaz, coin düşmez
  if not public.jokerler_serbest() and coalesce(v_adet, 0) <= 0 and not (p_tur = 'elli'
      and public.joker_ucretsiz_elli_hakki(p_mac_tur, p_mac_id)) then
    perform public.coin_harca(v_fiyat, 'joker', 'joker_mac_ici:' || p_mac_id::text);
    perform public.joker_hareket(v_me, p_tur, 1, 'mac_ici', p_mac_tur || ':' || p_mac_id::text);
    v_satin := true;
  end if;

  -- Kullanım: buradan sonra bir hata çıkarsa İŞLEMİN TAMAMI geri alınır,
  -- yani coin de joker de geri gelir.
  if p_mac_tur = 'duello' then
    if p_tur in ('zaman_baskisi', 'saldiri_degistir', 'savunma_kilidi') then
      perform public.duello_saldiri_jokeri(p_mac_id, p_tur);
    else
      perform public.duello_savunma_jokeri(p_mac_id, p_tur);
    end if;
    v_sonuc := jsonb_build_object('tur', p_tur);
  else
    v_sonuc := public.joker_kullan(p_mac_tur, p_mac_id, p_soru_index, p_tur);
  end if;

  return v_sonuc
    || jsonb_build_object(
         'satin_alindi', v_satin,
         'odenen', case when v_satin then v_fiyat else 0 end,
         'coin', (select pr.coin from public.profiles pr where pr.id = v_me));
end;
$function$;

revoke all on function public.joker_al_ve_kullan(text, uuid, integer, text) from public, anon;
grant execute on function public.joker_al_ve_kullan(text, uuid, integer, text) to authenticated;
