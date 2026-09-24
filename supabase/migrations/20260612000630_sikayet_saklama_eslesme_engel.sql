-- ============================================================
-- 630 · ŞİKÂYET SAKLAMA SÜRESİ (1 yıl) + RASTGELE EŞLEŞMEDE ENGEL (Ida, 25 Eyl 2026)
--
-- 1) Hakkında şikâyet olan hesap silinince (sikayet_edilen → NULL, 620) silinme anı sikayetler.edilen_silindi_at'e
--    yazılır. Günlük iş (bildim-sikayet-saklama, 03:35 UTC) silinmeden bu yana oyun_ayarlari.sikayet_saklama_gun
--    (365) gün geçmiş kayıtları — kanıt metni dahil — siler. Hesabı duran kişinin şikâyetleri hesap açık kaldıkça
--    kalır (genel kural). Şikâyeti AÇAN silinince kaydı zaten CASCADE ile gider (620).
-- 2) Rastgele eşleşme (Klasik kuyruga_gir + quick_match, Düello duello_ara, Grup grup_ara): birbirini (herhangi bir
--    yönde) engellemiş iki oyuncu eşleşmez. Grup: yalnız aramayı yapanla engelli olanlar dışarıda kalır.
--    Fonksiyonların geri kalanı canlı tanımla birebir; yalnız işaretli satır eklendi. Yetki değişmez.
-- Tekrar çalıştırılabilir.
-- ============================================================

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('sikayet_saklama_gun', '365', 'Hesabı silinen oyuncu hakkındaki şikâyet kayıtlarının (kanıt metni dahil) saklama süresi, gün (630). Gizlilik Politikası''nda yazılı.')
on conflict (anahtar) do nothing;

alter table public.sikayetler add column if not exists edilen_silindi_at timestamptz;
update public.sikayetler set edilen_silindi_at = now() where sikayet_edilen is null and edilen_silindi_at is null;

create or replace function public.trg_sikayet_edilen_silindi()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- FK "on delete set null" bu satırı günceller: hesabın silindiği an saklama süresinin başlangıcıdır
  if old.sikayet_edilen is not null and new.sikayet_edilen is null then
    new.edilen_silindi_at := coalesce(new.edilen_silindi_at, now());
  end if;
  return new;
end;
$$;
revoke all on function public.trg_sikayet_edilen_silindi() from public, anon, authenticated;
drop trigger if exists trg_sikayet_edilen_silindi on public.sikayetler;
create trigger trg_sikayet_edilen_silindi before update of sikayet_edilen on public.sikayetler
  for each row execute function public.trg_sikayet_edilen_silindi();

create or replace function public.sikayet_saklama_temizle()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v int;
begin
  delete from public.sikayetler
   where sikayet_edilen is null
     and edilen_silindi_at < now() - make_interval(days => public.ayar_sayi('sikayet_saklama_gun', 365)::int);
  get diagnostics v = row_count;
  return v;
end;
$$;
revoke all on function public.sikayet_saklama_temizle() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'bildim-sikayet-saklama') then
    perform cron.unschedule('bildim-sikayet-saklama');
  end if;
  perform cron.schedule('bildim-sikayet-saklama', '35 3 * * *', 'select public.sikayet_saklama_temizle()');
end $$;

-- ---------- Rastgele eşleşme: engelli çift eşleşmez ----------
CREATE OR REPLACE FUNCTION public.kuyruga_gir(p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true, p_jokersiz boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_kat text;
  v_id uuid;
  v_rakip uuid;
  v_rakip_kat text;
  v_secilen_kat text;
  v_puan int;
  v_bekleme int;
  v_bas timestamptz;
begin
  perform public.hiz_siniri('kuyruga_gir', 30, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  v_kat := coalesce(
    nullif(btrim(coalesce(p_kategori, '')), ''),
    (select pr.tercih_kategori from public.profiles pr where pr.id = auth.uid())
  );
  select coalesce(pr.puan, 0) into v_puan from public.profiles pr where pr.id = auth.uid();

  -- Devam eden aktif maçım varsa ona dön
  select m.id into v_id from public.matches m
  where m.durum = 'aktif' and auth.uid() in (m.oyuncu1, m.oyuncu2)
  limit 1;
  if found then
    delete from public.matchmaking_queue where user_id = auth.uid();
    return v_id;
  end if;

  delete from public.matchmaking_queue where created_at < now() - interval '90 seconds';

  -- Kuyrukta ne kadardır bekliyorum? (saniye) Aralık buna göre genişler.
  select q.created_at into v_bas
    from public.matchmaking_queue q where q.user_id = auth.uid();
  v_bekleme := coalesce(extract(epoch from (now() - v_bas))::int, 0);

  -- 1) Aynı kategori + (dereceliyse) uygun seviye
  select q.user_id, q.kategori into v_rakip, v_rakip_kat
  from public.matchmaking_queue q
  join public.profiles pr on pr.id = q.user_id
  where q.user_id <> auth.uid()
       and not public.iletisim_engelli(auth.uid(), q.user_id)   -- 630: engelli çift eşleşmez
    and q.kategori is not distinct from v_kat
    and coalesce(q.jokersiz, false) = coalesce(p_jokersiz, false)   -- Paket 31 B: jokerli ≠ jokersiz
    and (
      not p_dereceli
      or coalesce(q.dereceli, true) = p_dereceli
    )
    and (
      not p_dereceli
      -- DERECELİ: kendi basamağım ya da ALTI. Yukarı çıkma yok.
      -- 20 sn'den fazla bekledimse bir basamak daha aşağı açılır.
      or public.seviye_basamagi(pr.puan) between
           greatest(0, public.seviye_basamagi(v_puan) - (case when v_bekleme > 20 then 2 else 1 end))
           and public.seviye_basamagi(v_puan)
    )
  order by
    -- En yakın seviyeden başla
    abs(public.seviye_basamagi(pr.puan) - public.seviye_basamagi(v_puan)),
    q.created_at
  limit 1
  for update skip locked;

  -- 2) Yoksa: 20 saniyedir bekleyen herhangi bir rakip (karışık kategori)
  if not found then
    select q.user_id, null::text into v_rakip, v_rakip_kat
    from public.matchmaking_queue q
    join public.profiles pr on pr.id = q.user_id
    where q.user_id <> auth.uid()
       and not public.iletisim_engelli(auth.uid(), q.user_id)   -- 630: engelli çift eşleşmez
      and q.created_at < now() - interval '20 seconds'
      and (not p_dereceli or coalesce(q.dereceli, true) = p_dereceli)
      and coalesce(q.jokersiz, false) = coalesce(p_jokersiz, false)
      and (
        not p_dereceli
        or public.seviye_basamagi(pr.puan) <= public.seviye_basamagi(v_puan)
      )
    order by q.created_at
    limit 1
    for update skip locked;
  end if;

  if found and v_rakip is not null then
    v_secilen_kat := v_rakip_kat;
    delete from public.matchmaking_queue where user_id in (v_rakip, auth.uid());

    if not public.hileli_mi() then
      perform public.mac_kotasi_kontrol();
    end if;

    insert into public.matches
      (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
    values (
      v_rakip, auth.uid(), 'aktif', v_secilen_kat,
      public.soru_sec(v_secilen_kat, 20, array[auth.uid(), v_rakip], p_serbest_klasik => not coalesce(p_dereceli, true)),
      0, now(), p_dereceli, coalesce(p_jokersiz, false)
    )
    returning id into v_id;
    return v_id;
  end if;

  -- 370: gerçek rakip yok ve bu aramanın bot süresi doldu → mevcut bot yolu (quick_match).
  if v_bas is not null and public.eslesme_bot_hazir(auth.uid(), v_bas, public.eslesme_klasik_pay_sn()) then
    return public.quick_match(p_kategori, p_dereceli, p_jokersiz);
  end if;

  -- Eşleşme yok: kuyruğa gir (varsa süreyi koru — 20 sn sayacı sıfırlanmasın)
  insert into public.matchmaking_queue (user_id, kategori, dereceli, jokersiz)
  values (auth.uid(), v_kat, p_dereceli, coalesce(p_jokersiz, false))
  on conflict (user_id) do update
    set kategori = excluded.kategori,
        dereceli = excluded.dereceli,
        jokersiz = excluded.jokersiz;

  return null;
end;
$function$;

CREATE OR REPLACE FUNCTION public.quick_match(p_kategori text DEFAULT NULL::text, p_dereceli boolean DEFAULT true, p_jokersiz boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id uuid;
  v_rakip uuid;
  v_bot uuid;
  v_kat text;
  v_puan int;
  v_arama_bas timestamptz;
begin
  perform public.hiz_siniri('quick_match', 30, interval '60 seconds');
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;

  v_kat := coalesce(
    nullif(btrim(coalesce(p_kategori, '')), ''),
    (select pr.tercih_kategori from public.profiles pr where pr.id = auth.uid())
  );
  select coalesce(pr.puan, 0) into v_puan from public.profiles pr where pr.id = auth.uid();

  select m.id into v_id from public.matches m
  where m.durum = 'aktif' and auth.uid() in (m.oyuncu1, m.oyuncu2)
  limit 1;
  if found then
    delete from public.matchmaking_queue where user_id = auth.uid();
    return v_id;
  end if;

  perform public.mac_kotasi_kontrol();

  delete from public.matchmaking_queue where created_at < now() - interval '90 seconds';

  -- ÖNCE GERÇEK OYUNCU: bot yalnız kuyruk boşsa devreye girer.
  select q.user_id into v_rakip
  from public.matchmaking_queue q
  join public.profiles pr on pr.id = q.user_id
  where q.user_id <> auth.uid()
       and not public.iletisim_engelli(auth.uid(), q.user_id)   -- 630: engelli çift eşleşmez
    and (not p_dereceli or coalesce(q.dereceli, true) = p_dereceli)
    and coalesce(q.jokersiz, false) = coalesce(p_jokersiz, false)   -- Paket 31 B
    and (
      not p_dereceli
      or public.seviye_basamagi(pr.puan) <= public.seviye_basamagi(v_puan)
    )
  order by abs(public.seviye_basamagi(pr.puan) - public.seviye_basamagi(v_puan)), q.created_at
  limit 1
  for update skip locked;

  if found then
    delete from public.matchmaking_queue where user_id in (v_rakip, auth.uid());
    insert into public.matches
      (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
    values (
      v_rakip, auth.uid(), 'aktif', v_kat,
      public.soru_sec(v_kat, 20, array[auth.uid(), v_rakip], p_serbest_klasik => not coalesce(p_dereceli, true)),
      0, now(), p_dereceli, coalesce(p_jokersiz, false)
    )
    returning id into v_id;
    return v_id;
  end if;

  -- ---- ARAMA GECİKMESİ ----
  -- Oyuncu "rakip aranıyor" der demez bota bağlanırsa sahte olduğu anlaşılır.
  select q.created_at into v_arama_bas
    from public.matchmaking_queue q where q.user_id = auth.uid();

  if v_arama_bas is null then
    insert into public.matchmaking_queue (user_id, kategori, dereceli, jokersiz)
    values (auth.uid(), v_kat, p_dereceli, coalesce(p_jokersiz, false))
    on conflict (user_id) do update set created_at = now()
    returning created_at into v_arama_bas;
    return null;                     -- aranıyor
  end if;

  -- 370: aramaya özgü rastgele süre (üçgen 3-6-15 sn), kuyruga_gir ile aynı pay
  if not public.eslesme_bot_hazir(auth.uid(), v_arama_bas, public.eslesme_klasik_pay_sn()) then
    return null;                     -- hâlâ aranıyor
  end if;

  delete from public.matchmaking_queue where user_id = auth.uid();

  -- Bot: bant + lig sınırı + tekrar engeli (bkz. bot_sec).
  v_bot := public.bot_sec(auth.uid());

  insert into public.matches
    (oyuncu1, oyuncu2, durum, kategori, soru_ids, aktif_soru, soru_baslangic, dereceli, jokersiz)
  values (
    auth.uid(), v_bot, 'aktif', v_kat,
    public.soru_sec(v_kat, 20, array[auth.uid()], p_serbest_klasik => not coalesce(p_dereceli, true)),
    0, now(), p_dereceli, coalesce(p_jokersiz, false)
  )
  returning id into v_id;
  return v_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.duello_ara(p_dereceli boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_lig int;
  v_rakip uuid;
  v_bas timestamptz;
  v_bot uuid;
begin
  perform public.hiz_siniri('duello_ara', 90, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Devam eden düellom varsa ona dön
  select x.id into v_id from public.duellolar x
   where x.durum = 'aktif' and v_me in (x.oyuncu1, x.oyuncu2) limit 1;
  if found then
    delete from public.duello_kuyrugu where user_id = v_me;
    return v_id;
  end if;

  delete from public.duello_kuyrugu where created_at < now() - interval '90 seconds';
  select public.lig_sirasi(coalesce(lig, 'bronz')) into v_lig from public.profiles where id = v_me;
  v_lig := coalesce(v_lig, 1);

  -- Gerçek rakip: aynı giriş türü, kendi ligi ± 1
  select q.user_id into v_rakip
    from public.duello_kuyrugu q
    join public.profiles pr on pr.id = q.user_id
   where q.user_id <> v_me
       and not public.iletisim_engelli(v_me, q.user_id)   -- 630: engelli çift eşleşmez
     and q.dereceli = coalesce(p_dereceli, true)
     and public.lig_sirasi(coalesce(pr.lig, 'bronz')) between v_lig - 1 and v_lig + 1
   order by q.created_at
   limit 1
   for update of q skip locked;

  if v_rakip is not null then
    perform public.mac_kotasi_kontrol();
    return public.duello_olustur(v_rakip, v_me, p_dereceli);
  end if;

  select q.created_at into v_bas from public.duello_kuyrugu q where q.user_id = v_me;
  if v_bas is null then
    insert into public.duello_kuyrugu (user_id, dereceli) values (v_me, coalesce(p_dereceli, true))
    on conflict (user_id) do update set dereceli = excluded.dereceli, created_at = now();
    return null;
  end if;
  update public.duello_kuyrugu set dereceli = coalesce(p_dereceli, true) where user_id = v_me;

  -- 370: kimse yoksa aramaya özgü rastgele sürede (üçgen 3-6-15 sn) gizli bot (lig ± 1).
  if not public.eslesme_bot_hazir(v_me, v_bas, 0.5) then
    return null;
  end if;

  v_bot := public.bot_sec(v_me);
  if v_bot is null then raise exception 'Şu an uygun rakip yok, birazdan tekrar dene.'; end if;
  perform public.mac_kotasi_kontrol();
  perform public.bot_kisilik_tohumla(v_bot);
  return public.duello_olustur(v_me, v_bot, p_dereceli);
end $function$;

CREATE OR REPLACE FUNCTION public.grup_ara(p_kategori text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_me uuid := auth.uid();
  v_id uuid;
  v_bas timestamptz;
  v_hedef int := greatest(3, least(5, public.ayar_sayi('grup_hedef_kisi', 3)::int));
  v_liste uuid[];
  v_bot uuid;
  v_deneme int;
begin
  perform public.hiz_siniri('grup_ara', 90, interval '60 seconds');
  if v_me is null then raise exception 'Giriş gerekli'; end if;

  -- Devam eden grup maçım varsa ona dön (kuyrukta kalmayayım)
  select g.id into v_id
    from public.group_matches g
    join public.group_match_players gp on gp.group_match_id = g.id
   where gp.user_id = v_me and gp.davet_durumu = 'kabul' and gp.terk_at is null
     and g.durum in ('bekliyor', 'lobi', 'aktif')
   limit 1;
  if v_id is not null then
    delete from public.grup_kuyrugu where user_id = v_me;
    return v_id;
  end if;

  -- Eski kuyruk kayıtları düşer (duello_kuyrugu ile aynı ilke)
  delete from public.grup_kuyrugu
   where created_at < now() - make_interval(secs => public.ayar_sayi('grup_kuyruk_omru_sn', 90));

  -- Kuyruğa gir / kaydı tazele
  select q.created_at into v_bas from public.grup_kuyrugu q where q.user_id = v_me;
  if v_bas is null then
    insert into public.grup_kuyrugu (user_id, kategori) values (v_me, p_kategori)
    on conflict (user_id) do update set kategori = excluded.kategori, created_at = now();
    return null;
  end if;
  update public.grup_kuyrugu set kategori = p_kategori where user_id = v_me;

  -- Yeterli gerçek oyuncu var mı? (kategori uyumlu: aynı kategori ya da ikisinden biri "farketmez")
  select coalesce(array_agg(q.user_id), '{}'::uuid[]) into v_liste
    from (
      select q.user_id
        from public.grup_kuyrugu q
       where q.user_id <> v_me
       and not public.iletisim_engelli(v_me, q.user_id)   -- 630: benimle engelli olan gruba girmez
         and (p_kategori is null or q.kategori is null or q.kategori = p_kategori)
       order by q.created_at
       limit v_hedef - 1
       for update skip locked
    ) q;

  if coalesce(array_length(v_liste, 1), 0) >= v_hedef - 1 then
    perform public.mac_kotasi_kontrol();
    v_id := public.grup_kur_kuyruktan(array_prepend(v_me, v_liste), coalesce(p_kategori, (select kategori from public.grup_kuyrugu where user_id = v_liste[1])));
    delete from public.grup_kuyrugu where user_id = v_me or user_id = any(v_liste);
    return v_id;
  end if;

  -- 370: arama süresi aramaya özgü rastgele (üçgen 3-6-15 sn); dolmadıysa beklemeye devam
  if not public.eslesme_bot_hazir(v_me, v_bas, 0.5) then
    return null;
  end if;

  -- Süre doldu: kalan yerleri GİZLİ botlarla tamamla (1v1'deki "kimse yoksa botla başla"
  -- davranışının aynısı). Aynı bot iki kez seçilmesin diye tekrar denenir.
  v_liste := coalesce(v_liste, '{}'::uuid[]);
  while coalesce(array_length(v_liste, 1), 0) < v_hedef - 1 loop
    v_bot := null;
    for v_deneme in 1..6 loop
      v_bot := public.bot_sec(v_me);
      exit when v_bot is not null and not (v_bot = any(v_liste));
      v_bot := null;
    end loop;
    if v_bot is null then
      -- Son çare: seviyeye bakmadan uygun bir gizli bot
      select p.id into v_bot from public.profiles p
       where p.is_bot and coalesce(p.bot_aktif, true) and p.bot_turu = 'gizli'
         and p.id <> all(v_liste)
       order by random() limit 1;
    end if;
    if v_bot is null then
      raise exception 'Şu an uygun oyuncu yok, birazdan tekrar dene.';
    end if;
    perform public.bot_kisilik_tohumla(v_bot);
    v_liste := array_append(v_liste, v_bot);
  end loop;

  perform public.mac_kotasi_kontrol();
  v_id := public.grup_kur_kuyruktan(array_prepend(v_me, v_liste), p_kategori);
  delete from public.grup_kuyrugu where user_id = v_me or user_id = any(v_liste);
  return v_id;
end;
$function$;
