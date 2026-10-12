-- 1076: arkadaşlık isteği + engel (telefon denetimi 12 Eki, madde 1)
-- Engel ilişkisinde (iki yön) istek zaten trg_iletisim_engel ile reddediliyordu ama
-- mesaj ("Bu oyuncuyla iletişim kuramazsın.") engeli sızdırıyordu. İstek yollarında
-- açık kontrol + genel mesaj. İmza, yetki (GRANT), RLS değişmez.

CREATE OR REPLACE FUNCTION public.send_friend_request(p_target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_ters uuid;
begin
  perform public.hiz_siniri('send_friend_request', 30, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  if p_target = auth.uid() then raise exception 'Kendini ekleyemezsin'; end if;
  -- 1076: engel (iki yön) → genel mesaj; engel bilgisi sızmaz, hedef/günlük sayaçlara girmez
  if public.iletisim_engelli(auth.uid(), p_target) then raise exception 'İstek gönderilemedi.'; end if;

  -- Karşı taraf zaten istek gönderdiyse direkt arkadaş yap
  select id into v_ters from public.friendships
  where requester = p_target and addressee = auth.uid();
  if found then
    update public.friendships set durum = 'arkadas' where id = v_ters;
    return;
  end if;

  -- 1053: aynı kişiye 60 sn'de bir, 24 saatte en fazla 100 istek
  perform public.hiz_siniri_mesajli('arkadas_hedef:' || p_target::text, 1, interval '60 seconds',
    'Bu oyuncuya az önce istek gönderdin, biraz bekle.');
  perform public.hiz_siniri_mesajli('arkadas_istek_gunluk', 100, interval '24 hours',
    'Bugün çok fazla arkadaşlık isteği gönderdin, daha sonra tekrar dene.');

  insert into public.friendships (requester, addressee)
  values (auth.uid(), p_target)
  on conflict (requester, addressee) do nothing;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.arkadas_davet_kodu_ile_ekle(p_kod text)
 RETURNS TABLE(durum text, gorunen_ad text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare
  v_hedef public.profiles%rowtype;
  v_kod text;
  v_ters uuid;
  v_mevcut text;
  v_ben_ad text;
  v_bag text;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  perform public.hiz_siniri('arkadas_davet_kodu_ile_ekle', 10, interval '60 seconds');   -- 1053
  v_kod := upper(btrim(coalesce(p_kod, '')));
  if length(v_kod) <> 8 then raise exception 'Davet kodu 8 karakter olmalı.'; end if;

  select * into v_hedef from public.profiles p where p.davet_kodu = v_kod;
  if not found then raise exception 'Böyle bir davet kodu yok.'; end if;
  if v_hedef.id = auth.uid() then raise exception 'Kendi davet kodunu kullanamazsın.'; end if;
  if coalesce(v_hedef.is_bot, false) then raise exception 'Bu kod kullanılamaz.'; end if;
  -- 1076: engel (iki yön) → genel mesaj
  if public.iletisim_engelli(auth.uid(), v_hedef.id) then raise exception 'İstek gönderilemedi.'; end if;

  -- 335: yeni hesap (≤ davet_baglama_saat) bu kodla geldiyse davet bağlanır ve doğrudan arkadaş olunur.
  v_bag := public.davet_bagla_ic(auth.uid(), v_hedef.id);
  if v_bag in ('baglandi', 'ayni_cihaz') then
    return query select 'arkadas_oldu'::text, v_hedef.gorunen_ad;
    return;
  end if;

  -- Kendi görünen adımızı bir kez, NİTELİKLİ olarak alalım
  select me.gorunen_ad into v_ben_ad
    from public.profiles me where me.id = auth.uid();

  select f.durum into v_mevcut from public.friendships f
  where (f.requester = auth.uid() and f.addressee = v_hedef.id)
     or (f.requester = v_hedef.id and f.addressee = auth.uid());

  if v_mevcut = 'arkadas' then
    return query select 'zaten_arkadas'::text, v_hedef.gorunen_ad;
    return;
  end if;

  -- Karşı taraf zaten istek gönderdiyse doğrudan arkadaş ol
  select f.id into v_ters from public.friendships f
  where f.requester = v_hedef.id and f.addressee = auth.uid();
  if found then
    update public.friendships f set durum = 'arkadas' where f.id = v_ters;
    perform public.bildirim_anahtarla(
      v_hedef.id, 'arkadas_kabul', 'arkadas_kabul',
      jsonb_build_array(coalesce(v_ben_ad, 'Bir oyuncu')),
      '/bildim/arkadaslar'
    );
    return query select 'arkadas_oldu'::text, v_hedef.gorunen_ad;
    return;
  end if;

  perform public.hiz_siniri_mesajli('arkadas_istek_gunluk', 100, interval '24 hours',
    'Bugün çok fazla arkadaşlık isteği gönderdin, daha sonra tekrar dene.');   -- 1053

  insert into public.friendships (requester, addressee)
  values (auth.uid(), v_hedef.id)
  on conflict (requester, addressee) do nothing;

  perform public.bildirim_anahtarla(
      v_hedef.id, 'arkadas_istek', 'arkadas_istek',
      jsonb_build_array(coalesce(v_ben_ad, 'Bir oyuncu')),
      '/bildim/arkadaslar'
    );

  return query select 'istek_gonderildi'::text, v_hedef.gorunen_ad;
end;
$function$
;

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

  -- 1076: engel varsa arkadaşlık kurulmaz (davet yine bağlanır)
  if not public.iletisim_engelli(p_edilen, p_eden) then
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
$function$
;

