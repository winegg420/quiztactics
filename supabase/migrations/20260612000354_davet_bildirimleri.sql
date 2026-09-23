-- 354 · Davet bildirimleri (Ida kararı, 23 Eyl 2026). Mevcut altyapı: bildirim_anahtarla →
-- zil listesi (bildirimler, Realtime → BildirimToast) + izin verildiyse telefon bildirimi
-- (push_gonder → Edge Function send-push, oyuncunun dilinde). Rakamlar ayardan okunur.
--   1. Davet edilen kayıt olup bağlanınca davet edene (tip 'davet_katildi'):
--      "{ad} davetinle katıldı! Level 5'e ulaşınca +300 coin kazanacaksın."
--      Aynı cihaz (ödülsüz) bağlamada eski "arkadaşın oldu" bildirimi kalır — ödül vaadi yalan olmasın.
--   2. Davet eden ödülü aldığı anda (tip 'davet_odul'): "{ad} Level 5'e ulaştı! +300 coin"
--      İstemci bu tipte coin sesi + bakiye tazeleme + coin animasyonu yapar.
-- Sayıya Türkçe yönelme eki (5'e, 6'ya, 10'a) tr_yonelme_eki ile.

create or replace function public.tr_yonelme_eki(p_sayi int)
returns text
language sql
immutable
set search_path = public
as $$
  -- Sayının okunuşunun son hecesine göre: bir'e, iki'ye, üç'e, dört'e, beş'e, altı'ya, yedi'ye,
  -- sekiz'e, dokuz'a; on'a, yirmi'ye, otuz'a, kırk'a, elli'ye, altmış'a, yetmiş'e, seksen'e,
  -- doksan'a; yüz'e, bin'e.
  select p_sayi::text || case
    when p_sayi % 10 <> 0 then (array['''e','''ye','''e','''e','''e','''ya','''ye','''e','''a'])[abs(p_sayi % 10)]
    when p_sayi % 100 <> 0 then (array['''a','''ye','''a','''a','''ye','''a','''e','''e','''a'])[abs(p_sayi % 100) / 10]
    else '''e' end;
$$;

insert into public.push_metinleri (anahtar, dil, baslik, govde) values
  ('davet_katildi', 'tr', '🎉 Davetin işe yaradı', '%1 davetinle katıldı! Level %4 ulaşınca +%3 coin kazanacaksın.'),
  ('davet_katildi', 'en', '🎉 Your invite worked', '%1 joined with your invite! Reach Level %2 to earn +%3 coins.'),
  ('davet_odul', 'tr', '🪙 Davet ödülü', '%1 Level %4 ulaştı! +%3 coin'),
  ('davet_odul', 'en', '🪙 Invite reward', '%1 reached Level %2! +%3 coins')
on conflict (anahtar, dil) do update set baslik = excluded.baslik, govde = excluded.govde;

-- Parametre dizisi: [ad, level, coin, "level + yönelme eki"]
create or replace function public.davet_bildirim_parametre(p_ad text)
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_array(
    coalesce(nullif(trim(p_ad), ''), 'Bir oyuncu'),
    public.ayar_sayi('davet_gereken_level', 5)::int::text,
    public.ayar_sayi('davet_odul_davet_eden', 300)::int::text,
    public.tr_yonelme_eki(public.ayar_sayi('davet_gereken_level', 5)::int));
$$;
revoke all on function public.davet_bildirim_parametre(text) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.davet_bagla_ic(p_edilen uuid, p_eden uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_edilen public.profiles%rowtype;
  v_ayni boolean;
  v_coin int := public.ayar_sayi('davet_odul_davet_edilen', 100)::int;
  v_saat int := public.ayar_sayi('davet_baglama_saat', 72)::int;
  v_f uuid;
begin
  if p_edilen is null or p_eden is null then return 'gecersiz_kod'; end if;
  if p_edilen = p_eden then return 'kendi_kodun'; end if;
  if not exists (select 1 from public.profiles e where e.id = p_eden and not coalesce(e.is_bot, false)) then
    return 'gecersiz_kod';
  end if;

  select * into v_edilen from public.profiles where id = p_edilen for update;
  if not found or coalesce(v_edilen.is_bot, false) then return 'gecersiz_kod'; end if;
  if v_edilen.davet_eden is not null or exists (select 1 from public.davetler d where d.davet_edilen = p_edilen) then
    return 'zaten_bagli';
  end if;
  if v_edilen.created_at < now() - make_interval(hours => v_saat) then return 'sure_doldu'; end if;

  v_ayni := public.ayni_cihaz_mi(p_edilen, p_eden);

  insert into public.davetler (davet_eden, davet_edilen, durum, gecersiz_neden, edilen_coin, odul_at)
  values (p_eden, p_edilen,
          case when v_ayni then 'gecersiz' else 'bekliyor' end,
          case when v_ayni then 'ayni_cihaz' end,
          case when v_ayni then 0 else greatest(v_coin, 0) end,
          case when v_ayni then now() end);

  update public.profiles set davet_eden = p_eden where id = p_edilen;
  update public.profiles set davet_sayisi = coalesce(davet_sayisi, 0) + 1 where id = p_eden;

  if not v_ayni and v_coin > 0 then
    perform public.coin_ekle(p_edilen, v_coin, 'davet', 'davet_edilen:' || p_eden::text);
  end if;

  -- Otomatik arkadaşlık (varsa bekleyen isteği kabul eder)
  select f.id into v_f from public.friendships f
   where (f.requester = p_eden and f.addressee = p_edilen) or (f.requester = p_edilen and f.addressee = p_eden)
   limit 1;
  if v_f is not null then
    update public.friendships set durum = 'arkadas' where id = v_f and durum is distinct from 'arkadas';
  else
    insert into public.friendships (requester, addressee, durum) values (p_eden, p_edilen, 'arkadas')
    on conflict (requester, addressee) do update set durum = 'arkadas';
  end if;

  begin
    if v_ayni then
      perform public.bildirim_anahtarla(p_eden, 'arkadas_kabul', 'arkadas_kabul',
        jsonb_build_array(coalesce(v_edilen.gorunen_ad, 'Bir oyuncu')), '/bildim/arkadaslar');
    else
      -- 354: "{ad} davetinle katıldı! Level 5'e ulaşınca +300 coin kazanacaksın."
      perform public.bildirim_anahtarla(p_eden, 'davet_katildi', 'davet_katildi',
        public.davet_bildirim_parametre(v_edilen.gorunen_ad), '/bildim/arkadaslar');
    end if;
  exception when others then
    raise warning 'davet bildirimi gönderilemedi: %', sqlerrm;
  end;

  -- Hızlı oyuncu 72 saat içinde zaten Level 5 olmuş olabilir
  if not v_ayni then perform public.davet_odul_kontrol(p_edilen); end if;

  return case when v_ayni then 'ayni_cihaz' else 'baglandi' end;
end;
$function$;

CREATE OR REPLACE FUNCTION public.davet_odul_kontrol(p_edilen uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  d public.davetler%rowtype;
  v_level int;
  v_sinir int := public.ayar_sayi('davet_aylik_sinir', 10)::int;
  v_coin int := public.ayar_sayi('davet_odul_davet_eden', 300)::int;
  v_ay_basi timestamptz := (date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul');
  v_bu_ay int;
begin
  select * into d from public.davetler where davet_edilen = p_edilen for update;
  if not found then return null; end if;
  if d.durum <> 'bekliyor' then return d.durum; end if;

  select coalesce(level, 1) into v_level from public.profiles where id = p_edilen;
  if v_level < public.ayar_sayi('davet_gereken_level', 5)::int then return 'bekliyor'; end if;

  if public.ayni_cihaz_mi(p_edilen, d.davet_eden) then
    update public.davetler set durum = 'gecersiz', gecersiz_neden = 'ayni_cihaz', odul_at = now() where id = d.id;
    return 'gecersiz';
  end if;

  -- Aylık sınır: davet edenin satırı kilitlenir, eşzamanlı iki ödül sırayla sayılır.
  perform 1 from public.profiles where id = d.davet_eden for update;
  select count(*) into v_bu_ay from public.davetler x
   where x.davet_eden = d.davet_eden and x.durum = 'odullendi' and x.odul_at >= v_ay_basi;

  if v_bu_ay >= v_sinir then
    update public.davetler set durum = 'sinir_asildi', odul_at = now() where id = d.id;
  else
    if v_coin > 0 then
      perform public.coin_ekle(d.davet_eden, v_coin, 'davet', 'davet_eden:' || p_edilen::text);
    end if;
    update public.davetler set durum = 'odullendi', eden_coin = greatest(v_coin, 0), odul_at = now() where id = d.id;
    -- 354: ödül anında davet edene bildirim (zil + izin varsa telefon). Bildirim hatası ödülü geri almaz.
    begin
      perform public.bildirim_anahtarla(d.davet_eden, 'davet_odul', 'davet_odul',
        public.davet_bildirim_parametre((select gorunen_ad from public.profiles where id = p_edilen)),
        '/bildim/arkadaslar');
    exception when others then
      raise warning 'davet ödül bildirimi gönderilemedi: %', sqlerrm;
    end;
  end if;

  perform public.rozet_kontrol_guvenli(d.davet_eden, array['davet']);
  return (select durum from public.davetler where id = d.id);
end;
$function$;
