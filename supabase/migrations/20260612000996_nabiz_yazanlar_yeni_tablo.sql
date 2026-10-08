-- ============================================================
-- 996 · Oyuncu nabzı ayrı tabloda (2/2): yazanlar
--       (Supabase Aşama 2 devamı, 8 Eki 2026; 995'in üstüne)
--
-- nabiz_yaz(uid): her çağrıda oyuncu_nabiz'e yazar; profiles.last_seen'i YALNIZ son yazmadan
-- 50 sn geçtiyse günceller.
--   KARAR — neden "hiç" değil de "seyrek": OyuncuKarti istemciden doğrudan profiles.last_seen
--   okuyor (çevrimiçi rozeti, eşik 120 sn). Hiç yazmasak rozet ölür ya da istemci değişmesi
--   gerekir. 50 sn süzgeçle: AuthContext'in 60 sn'lik nabzı her seferinde yazar (önceki gibi
--   dakikada ~1), Düello/Kasa'nın 10 sn'lik nabzı ve kilitle çağrıları ise artık profiles'a
--   ~50-60 sn'de bir yazar (önce 5-10 sn'de bir). Rozet için en kötü bayatlık ~60 sn < 120 sn.
--   Kopukluk kararı (25 sn) profiles'a değil nabiz_son() = greatest(...) değerine bakar (995).
--
-- DEĞİŞEN YAZANLAR (RPC adları ve yetkileri aynı → istemci değişikliği GEREKMEZ; eski açık
-- sekmeler de aynı kalp_at'ı çağırdığı için otomatik yeni tabloya yazar):
--   kalp_at, duello_kilitle, kasa_kilitle, gizli_bot_nabiz (bot nabzı da tabloya yazar;
--   profiles'a 994'teki 50 sn süzgeci aynen kalır).
--
-- GERİ ALMA: kalp_at → "update public.profiles set last_seen = now() where id = auth.uid();"
--   (language sql); kilitle fonksiyonlarında 5 sn süzgeçli profiles güncellemesi; gizli_bot_nabiz
--   → 994 tanımı; drop function public.nabiz_yaz(uuid).
-- ============================================================

create or replace function public.nabiz_yaz(p_uid uuid)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if p_uid is null then return; end if;
  -- profiles'ta olmayan kimlik için sessizce hiçbir şey yapma (eski kalp_at da no-op'tu; FK hatası yok)
  insert into public.oyuncu_nabiz (user_id, son_gorulme)
  select p.id, now() from public.profiles p where p.id = p_uid
  on conflict (user_id) do update set son_gorulme = excluded.son_gorulme;
  update public.profiles set last_seen = now()
   where id = p_uid and (last_seen is null or last_seen < now() - interval '50 seconds');
end $function$;
revoke all on function public.nabiz_yaz(uuid) from public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.kalp_at()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.nabiz_yaz(auth.uid());   -- 996
end $function$;

CREATE OR REPLACE FUNCTION public.gizli_bot_nabiz()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_n int;
begin
  -- Paket 26 E: aynı işin iki kopyası aynı anda çalışmasın. Ölçüldü (17 Eyl 15:00 UTC):
  -- migration uygulanırken fonksiyon derlemesi kilitlenince 2 saniyelik işler birikti ve
  -- 9 koşu 120 sn'lik ifade zaman aşımına düştü. Kilidi alamayan koşu sessizce atlar.
  if not pg_try_advisory_xact_lock(hashtext('gizli_bot_nabiz')) then return 0; end if;
  with aktif as (
    select x.id from public.profiles x
     where coalesce(x.is_bot, false) and x.bot_turu = 'gizli' and coalesce(x.bot_aktif, true)
       and (
         exists (select 1 from public.meydan_bot_nobeti n where n.bot_id = x.id and n.bitis > now())
         or exists (select 1 from public.matches m
                     where m.durum in ('aktif','bekliyor') and x.id in (m.oyuncu1, m.oyuncu2))
         or exists (select 1 from public.duellolar d
                     where d.durum = 'aktif' and x.id in (d.oyuncu1, d.oyuncu2))
         or exists (select 1 from public.kasa_maclari km   -- 957
                     where km.durum = 'aktif' and x.id in (km.oyuncu1, km.oyuncu2))
         or exists (select 1 from public.group_match_players gp
                      join public.group_matches g on g.id = gp.group_match_id
                     where gp.user_id = x.id and g.durum in ('lobi','bekliyor','aktif')
                       and gp.terk_at is null)
         or exists (select 1 from public.hizli_oyuncular ho
                      join public.hizli_maclar h on h.id = ho.hizli_mac_id
                     where ho.user_id = x.id and h.durum in ('lobi','bekliyor','aktif')
                       and ho.terk_at is null)
         or exists (select 1 from public.tournament_players tp
                      join public.tournaments t on t.id = tp.tournament_id
                     where tp.user_id = x.id
                       and (t.durum = 'aktif'
                            or (t.durum = 'lobi'
                                and public.turnuva_an(t.id) <= now() + interval '10 minutes')))   -- 994
       )
  ), kalp as (   -- 996: nabız ayrı tabloya
    insert into public.oyuncu_nabiz (user_id, son_gorulme)
    select id, now() from aktif
    on conflict (user_id) do update set son_gorulme = excluded.son_gorulme
    returning user_id
  )
  update public.profiles p
     set last_seen = now()
   where p.id in (
     select x.id from public.profiles x
      where x.id in (select id from aktif)
        and (x.last_seen is null or x.last_seen < now() - interval '50 seconds')   -- 994
      order by x.id
      for update of x skip locked
   );
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;

CREATE OR REPLACE FUNCTION public.duello_kilitle(p_id uuid)
 RETURNS duellolar
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d public.duellolar%rowtype;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select * into d from public.duellolar where id = p_id for update;
  if not found then raise exception 'Düello bulunamadı'; end if;
  if auth.uid() not in (d.oyuncu1, d.oyuncu2) then raise exception 'Bu düelloda değilsin'; end if;

  -- 410: ilk geliş anı (yalnız bir kez yazılır)
  if d.oyuncu1 = auth.uid() and d.giris1 is null then
    update public.duellolar set giris1 = now() where id = p_id;
  elsif d.oyuncu2 = auth.uid() and d.giris2 is null then
    update public.duellolar set giris2 = now() where id = p_id;
  end if;

  -- Düelloya bakan oyuncu bağlıdır (Paket 24 · A.4)
  perform public.nabiz_yaz(auth.uid());   -- 996: eskiden profiles.last_seen (5 sn süzgeçli)

  perform public.duello_ilerlet(p_id);
  select * into d from public.duellolar where id = p_id;
  return d;
end;
$function$;

CREATE OR REPLACE FUNCTION public.kasa_kilitle(p_id uuid)
 RETURNS kasa_maclari
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare k public.kasa_maclari%rowtype;
begin
  if auth.uid() is null then raise exception 'Giriş gerekli'; end if;
  select * into k from public.kasa_maclari where id = p_id for update;
  if not found then raise exception 'Maç bulunamadı'; end if;
  if auth.uid() not in (k.oyuncu1, k.oyuncu2) then raise exception 'Bu maçta değilsin'; end if;
  if k.oyuncu1 = auth.uid() and k.giris1 is null then
    update public.kasa_maclari set giris1 = now() where id = p_id;
  elsif k.oyuncu2 = auth.uid() and k.giris2 is null then
    update public.kasa_maclari set giris2 = now() where id = p_id;
  end if;
  perform public.nabiz_yaz(auth.uid());   -- 996: eskiden profiles.last_seen (5 sn süzgeçli)
  perform public.kasa_ilerlet(p_id);
  select * into k from public.kasa_maclari where id = p_id;
  return k;
end $function$;

