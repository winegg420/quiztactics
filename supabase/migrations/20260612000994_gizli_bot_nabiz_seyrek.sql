-- ============================================================
-- 994 · Gizli bot nabzı: turnuva lobisi yalnız son 10 dk'da sayılır; taze last_seen yeniden yazılmaz
--       (Supabase Aşama 2, 8 Eki 2026)
--
-- NEDEN (ölçüm 8 Eki, canlı pg_stat_user_tables, Postgres yeniden başlangıcından 13,6 sa):
-- cron_gizli_bot_nabiz'in boşta-çık kapısı hiç tutmuyordu — günün turnuva lobisi sabahtan açık,
-- içinde 7 bot → her dakika ~16 profiles.last_seen yazması. profiles 14.886 güncelleme, yalnız %4
-- HOT (last_seen indeksli + tabloda 15 indeks) → her yazma tüm indeksleri yeniden yazıyor,
-- 115 autovacuum.
--
-- DEĞİŞEN (yalnız bu iki koşul; diğer nabız yerleri — nöbet, maç, düello, kasa, grup, hızlı — aynı):
--   1) Turnuva LOBİSİ yalnız başlangıca (turnuva_an) 10 dk'dan az kaldıysa sayılır; AKTİF turnuva
--      eskisi gibi her zaman. Hem kapıda hem asıl fonksiyonda.
--   2) last_seen son 50 sn içinde yazılmışsa o bot güncellenmez (gereksiz UPDATE yok).
-- ETKİ: lobideki gizli bot, başlangıca 10 dk'dan fazla varken oyuncu kartında "çevrimiçi"
-- görünmez (eşik 120 sn); son 10 dk'da ve maçta eskisi gibi.
--
-- GERİ ALMA: 850'deki cron_gizli_bot_nabiz ve 957'deki gizli_bot_nabiz tanımlarını yeniden çalıştır.
-- ============================================================

CREATE OR REPLACE FUNCTION public.cron_gizli_bot_nabiz()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not exists (select 1 from public.meydan_bot_nobeti where bitis > now())
     and not exists (select 1 from public.matches where durum in ('aktif', 'bekliyor'))
     and not exists (select 1 from public.duellolar where durum = 'aktif')
     and not exists (select 1 from public.group_matches where durum in ('lobi', 'bekliyor', 'aktif'))
     and not exists (select 1 from public.hizli_maclar where durum in ('lobi', 'bekliyor', 'aktif'))
     and not exists (select 1 from public.tournament_players tp
                       join public.tournaments t on t.id = tp.tournament_id
                      where t.durum = 'aktif'
                         or (t.durum = 'lobi' and public.turnuva_an(t.id) <= now() + interval '10 minutes')) then
    return 0;
  end if;
  return public.gizli_bot_nabiz();
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
  update public.profiles p
     set last_seen = now()
   where p.id in (
     select x.id from public.profiles x
      where coalesce(x.is_bot, false) and x.bot_turu = 'gizli' and coalesce(x.bot_aktif, true)
        and (x.last_seen is null or x.last_seen < now() - interval '50 seconds')   -- 994
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
      order by x.id
      for update of x skip locked
   );
  get diagnostics v_n = row_count;
  return v_n;
end;
$function$;
