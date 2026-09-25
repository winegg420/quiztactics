-- 645: Grup eşleşmesinde birbirini engellemiş oyuncular aynı gruba düşmesin (Ida, 25 Eyl 2026).
-- Önce yalnız aramayı başlatan (v_me) ile adaylar kontrol ediliyordu; seçilen adaylar KENDİ ARALARINDA engelli olabiliyordu.
-- Şimdi kuyruk sırasıyla her aday ben + o ana dek seçilenlerle engelli mi diye bakılır; engelli olan atlanır (kuyrukta kalır,
-- başka grupla eşleşir). Gövde canlı grup_ara + yalnız bu seçim. Yetki/RLS değişikliği yok (create or replace: ACL korunur).
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
  v_aday uuid;
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
  -- 645: grup içinde HİÇBİR iki oyuncu birbirini engellememiş olmalı — yalnız aramayı başlatanla değil, seçilenlerin
  -- kendi aralarında da bakılır (sırayla: aday, ben ve o ana dek seçilenlerle engelli değilse alınır).
  v_liste := '{}'::uuid[];
  for v_aday in
    select q.user_id
      from public.grup_kuyrugu q
     where q.user_id <> v_me
       and not public.iletisim_engelli(v_me, q.user_id)
       and (p_kategori is null or q.kategori is null or q.kategori = p_kategori)
     order by q.created_at
     limit 20
       for update skip locked
  loop
    exit when coalesce(array_length(v_liste, 1), 0) >= v_hedef - 1;
    continue when exists (select 1 from unnest(v_liste) x where public.iletisim_engelli(x, v_aday));
    v_liste := array_append(v_liste, v_aday);
  end loop;

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
$function$

