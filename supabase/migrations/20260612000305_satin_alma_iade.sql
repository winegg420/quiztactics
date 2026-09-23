-- Şerit S4 — Satın alma güvenliği, 2/3: iade (voided purchase) takibi
-- (docs/SATIN_ALMA_DENETIMI.md §3.3-C)
--
-- Play'den iade alan oyuncunun coin'i geri alınır. Edge Function
-- `satin_alma_iade_tara` Voided Purchases API'yi okur, her iade için
-- satin_alma_iade_isle'yi çağırır.
--
-- Kural: geri alınan = min(bakiye, satın alınan coin). Bakiye yetmezse sıfırda
-- durur (eksiye düşmez), yetmeyen kısım defterde `iade_eksik` olarak işaretlenir.
-- Aynı iade iki kez işlenmez (defter satırı kilitli + coin_hareketleri tekil indeks).
--
-- Play anahtarı olmadığı için takip bayrakla KAPALI başlar. Cron işi bu
-- migration'da KURULMAZ; açılış günü eklenecek komut
-- supabase/functions/satin_alma_iade_tara/index.ts başındadır.
-- 304'e bağlıdır (coin_satin_alma_defteri).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('satin_alma_iade_takibi', 'false'::jsonb,
   'Şerit S4: Play Voided Purchases taraması açık mı (satin_alma_iade_tara Edge Function). Play servis hesabı girilince true yapılır.')
on conflict (anahtar) do nothing;

-- İade hareketi aynı jeton için tek kez yazılır (hesaptan bağımsız)
create unique index if not exists coin_hareketleri_satin_alma_iade_tek
  on public.coin_hareketleri (referans)
  where tur = 'satin_alma_iade' and referans is not null;

-- Dönüş: { durum: 'iade_edildi' | 'zaten_iade' | 'bilinmiyor', geri_alinan, eksik, bakiye }
--   'bilinmiyor' = jeton coin defterinde yok (ör. eski joker satın alması) — dokunulmaz.
create or replace function public.satin_alma_iade_isle(
  p_token text,
  p_iade_ms bigint default null,
  p_neden int default null,
  p_kaynak int default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_kayit public.coin_satin_alma_defteri%rowtype;
  v_bakiye bigint;
  v_geri bigint;
  v_eksik bigint;
begin
  select * into v_kayit
    from public.coin_satin_alma_defteri
   where purchase_token = p_token
   for update;
  if not found then
    return jsonb_build_object('durum', 'bilinmiyor');
  end if;
  if v_kayit.durum = 'iade' then
    return jsonb_build_object('durum', 'zaten_iade', 'geri_alinan', v_kayit.iade_geri_alinan,
                              'eksik', v_kayit.iade_eksik);
  end if;

  -- Bakiye yarışına karşı profil satırı kilitli
  select coin into v_bakiye from public.profiles where id = v_kayit.user_id for update;
  v_bakiye := coalesce(v_bakiye, 0);
  v_geri := least(greatest(v_bakiye, 0), v_kayit.coin);
  v_eksik := v_kayit.coin - v_geri;

  if v_geri > 0 then
    perform set_config('app.coin_izin', '1', true);
    update public.profiles set coin = coin - v_geri where id = v_kayit.user_id
    returning coin into v_bakiye;
  end if;

  -- Geri alınan 0 olsa da iz kalsın (miktar 0, tekil indeks tekrarı engeller)
  insert into public.coin_hareketleri (user_id, miktar, tur, referans, bakiye_sonra)
  values (v_kayit.user_id, -v_geri, 'satin_alma_iade', p_token, v_bakiye);

  update public.coin_satin_alma_defteri
     set durum = 'iade',
         iade_zamani = case when p_iade_ms is null then now() else to_timestamp(p_iade_ms / 1000.0) end,
         iade_nedeni = p_neden,
         iade_kaynagi = p_kaynak,
         iade_geri_alinan = v_geri,
         iade_eksik = v_eksik
   where id = v_kayit.id;

  return jsonb_build_object('durum', 'iade_edildi', 'geri_alinan', v_geri, 'eksik', v_eksik,
                            'bakiye', v_bakiye);
end;
$$;

revoke all on function public.satin_alma_iade_isle(text, bigint, int, int) from public, anon, authenticated;
grant execute on function public.satin_alma_iade_isle(text, bigint, int, int) to service_role;
