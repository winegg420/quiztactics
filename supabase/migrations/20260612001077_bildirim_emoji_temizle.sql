-- 1077: anlık bildirim (push) ve açılır uyarı metinlerinde sunucu emojileri kalkar
-- (telefon denetimi 12 Eki, madde 2). Kaynağında temizlenir: push_metinleri şablonları,
-- bildirim_yaz başlıkları + metni, haftalik_sonuc_bildir başlığı. Eski kayıtlı
-- bildirimlere dokunulmaz (istemcide gösterim temizliği var). RLS değişmez.

create or replace function public.emoji_temizle(p text)
returns text language sql immutable set search_path = public as $$
  select case when p is null then null else
    btrim(regexp_replace(regexp_replace(p,
      '[U0001F000-U0001FAFF☀-➿⬀-⯿⌀-⏿️‍⃣]', '', 'g'),
      '[ 	]{2,}', ' ', 'g'))
  end;
$$;
-- Yalnız sunucu içinde kullanılır; istemciye açık RPC değil.
revoke execute on function public.emoji_temizle(text) from public, anon, authenticated;

update public.push_metinleri
   set baslik = public.emoji_temizle(baslik), govde = public.emoji_temizle(govde)
 where baslik is distinct from public.emoji_temizle(baslik) or govde is distinct from public.emoji_temizle(govde);

CREATE OR REPLACE FUNCTION public.bildirim_yaz(p_user uuid, p_tip text, p_metin text, p_yol text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_bot boolean;
  v_baslik text;
begin
  if p_user is null then return; end if;

  select coalesce(is_bot, false) into v_bot from public.profiles where id = p_user;
  if coalesce(v_bot, false) then return; end if;

  p_metin := public.emoji_temizle(p_metin);   -- 1077: emoji kaynağında atılır

  insert into public.bildirimler (user_id, tip, metin, yol)
  values (p_user, p_tip, p_metin, p_yol);

  v_baslik := case p_tip
    when 'mac_daveti'      then 'Meydan okuma!'
    when 'meydan_kabul'    then 'Meydan okuman kabul edildi!'
    when 'rovans'          then 'Rövanş isteği'
    when 'grup_daveti'     then 'Grup maçı daveti'
    when 'grup_kabul'      then 'Grup maçın başlıyor!'
    when 'hizli_daveti'    then 'Hızlı maç daveti'
    when 'duello_daveti'   then 'Düello daveti'
    when 'duello_kabul'    then 'Düello kabul edildi'
    when 'kasa_daveti'     then 'Ortak Hazine daveti'
    when 'kasa_kabul'      then 'Ortak Hazine daveti kabul edildi'
    when 'sira_sende'      then 'Sıra sende!'
    when 'arkadas_istek'   then 'Arkadaşlık isteği'
    when 'arkadas_kabul'   then 'Yeni arkadaş'
    when 'gecildin'        then 'Sıran düştü'
    when 'hafta_sonuc'     then 'Hafta bitti'
    when 'ustalik'         then 'Ustalık'
    when 'seri'            then 'Serin'
    when 'lige_girdin'     then 'Ligdesin'
    else 'Quiz Tactics'
  end;

  begin
    perform net.http_post(
      url := 'https://zfpnxzybcpkxsotwdsey.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'x-cron-secret', public.gizli_al('cron_secret'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'user_ids', jsonb_build_array(p_user),
        'baslik', v_baslik,
        'govde', p_metin,
        'url', coalesce(p_yol, '/bildim')
      )
    );
  exception when others then
    null;
  end;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.haftalik_sonuc_bildir()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_hafta date;
  r record;
begin
  v_hafta := (date_trunc('week', (now() at time zone 'Europe/Istanbul')) - interval '7 days')::date;

  for r in
    select a.user_id, a.sira_sehir, a.sira_ulke, a.sira_global, a.sehir, a.puan
    from public.lig_arsiv a
    where a.hafta = v_hafta
      and exists (select 1 from public.push_subscriptions ps where ps.user_id = a.user_id)
      and (a.sira_sehir <= 10 or a.sira_global <= 100)
  loop
    begin
      perform net.http_post(
        url := 'https://zfpnxzybcpkxsotwdsey.supabase.co/functions/v1/send-push',
        headers := jsonb_build_object(
          'x-cron-secret', public.gizli_al('cron_secret'),
          'Content-Type', 'application/json'
        ),
        body := jsonb_build_object(
          'user_ids', jsonb_build_array(r.user_id),
          'baslik', 'Haftalık lig sonuçlandı!',
          'govde', case
            when r.sira_sehir is not null
              then 'Geçen hafta ' || coalesce(r.sehir, 'şehrinde') || ' liginde ' ||
                   r.sira_sehir || '. oldun (' || r.puan || ' puan). Yeni hafta başladı!'
            else 'Geçen hafta dünya ligindeki sıran: ' || r.sira_global ||
                 ' (' || r.puan || ' puan). Yeni hafta başladı!'
          end,
          'url', '/bildim/siralama'
        )
      );
    exception when others then
      -- Tek bir bildirim hatası tüm işi düşürmesin
      raise notice 'haftalik_sonuc_bildir hata (%): %', r.user_id, sqlerrm;
    end;
  end loop;
end;
$function$
;

