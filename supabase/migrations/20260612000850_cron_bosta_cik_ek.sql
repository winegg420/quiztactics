-- 850 — Boşta-çık kapılarının eksikleri (830/831'in devamı; Supabase ücretsiz plan disk IO / CPU).
--
-- ÖLÇÜLEN DURUM (2 Eki 2026, canlı cron.job + pg_stat_statements, salt okunur; docs/YUK_AZALTMA.md):
--   · 28 iş; 830/831 çalışıyor: duello_tik ve bildim-bot-oyna boşta '15 seconds'.
--   · Boşta-çık kapısı OLMAYAN tek sık iş: bildim-gizli-bot-nabiz (dakikada bir; 155 gizli botu
--     6 alt sorguyla tarar, çoğu zaman 0 satır günceller).
--   · cron_bot_oyna kapısındaki iki açık:
--       a) `matches.durum = 'bekliyor'` HER bekleyen daveti iş sayıyordu. bot_oyna bekleyen 1v1
--          davetle yalnız davet edilen (oyuncu2) BOT ise ilgilenir (1. adım). İnsana giden ve
--          yanıtlanmayan bir davet 24 saate kadar (eski_davetleri_temizle) işi 2 sn'de tutuyor,
--          21 KB'lik bot_oyna her 2 sn'de boşuna çalışıyordu (günde 43.200 koşu).
--       b) Bekleyen bot tepki/mesaj kuyruğu (bot_tepki_bekleyen, 673; bot_oyna 0. adım) kapıda yoktu:
--          maç bitince kuyrukta kalan gecikmeli tepki bir sonraki maça kadar gönderilmiyordu.
--
-- BU DOSYA NE YAPIYOR (asıl fonksiyonlar — bot_oyna, gizli_bot_nabiz — DEĞİŞMEZ; zamanlama DEĞİŞMEZ):
--   1) cron_bot_oyna(): aynı imza; bekleyen 1v1 davet yalnız oyuncu2 bot ise iş sayılır; tepki kuyruğu eklenir.
--      Grup / Hızlı 'bekliyor' aynen kalır (bot_oyna 7. ve 11. adım insanlardan oluşan lobiyi de başlatır).
--   2) cron_gizli_bot_nabiz(): gizli botun nabız atacağı hiçbir yer yoksa (nöbet, maç, düello, grup,
--      hızlı maç, turnuva lobisi/maçı) çıkar; varsa asıl gizli_bot_nabiz() aynen çalışır. Kapı, asıl
--      fonksiyonun koşullarının ÜST KÜMESİDİR (bot süzgeci yok) → nabız atılacak bir bot hiç kaçmaz.
--   3) bildim-gizli-bot-nabiz işinin yalnız KOMUTU sarmalayıcıya bağlanır (zamanlama '* * * * *' aynı).
--
-- GERİ ALMA:
--   select cron.alter_job((select jobid from cron.job where jobname = 'bildim-gizli-bot-nabiz'),
--                         command := 'select public.gizli_bot_nabiz()');
--   cron_bot_oyna için 830'daki tanımı yeniden çalıştır.

set local lock_timeout = '10s';

-- ───── 1) Klasik/Grup/Hızlı/Turnuva botları ─────
create or replace function public.cron_bot_oyna()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.matches where durum = 'aktif')
     or exists (select 1 from public.matches m
                  join public.profiles p on p.id = m.oyuncu2 and p.is_bot
                 where m.durum = 'bekliyor')
     or exists (select 1 from public.tournaments where durum = 'aktif')
     or exists (select 1 from public.group_matches where durum in ('bekliyor', 'aktif'))
     or exists (select 1 from public.hizli_maclar where durum in ('bekliyor', 'aktif'))
     or exists (select 1 from public.bot_tepki_bekleyen) then
    perform public.cron_aralik_ayarla('bildim-bot-oyna', '2 seconds');
    perform public.bot_oyna();
    return;
  end if;
  perform public.cron_aralik_ayarla('bildim-bot-oyna', '15 seconds');
end $$;

-- ───── 2) Gizli bot nabzı ─────
create or replace function public.cron_gizli_bot_nabiz()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.meydan_bot_nobeti where bitis > now())
     and not exists (select 1 from public.matches where durum in ('aktif', 'bekliyor'))
     and not exists (select 1 from public.duellolar where durum = 'aktif')
     and not exists (select 1 from public.group_matches where durum in ('lobi', 'bekliyor', 'aktif'))
     and not exists (select 1 from public.hizli_maclar where durum in ('lobi', 'bekliyor', 'aktif'))
     and not exists (select 1 from public.tournament_players tp
                       join public.tournaments t on t.id = tp.tournament_id
                      where t.durum in ('lobi', 'aktif')) then
    return 0;
  end if;
  return public.gizli_bot_nabiz();
end $$;

revoke all on function public.cron_bot_oyna() from public, authenticated, anon;
revoke all on function public.cron_gizli_bot_nabiz() from public, authenticated, anon;

-- ───── 3) Komutu bağla (zamanlama aynı) ─────
do $$
begin
  perform cron.alter_job(j.jobid, command := 'select public.cron_gizli_bot_nabiz()')
     from cron.job j where j.jobname = 'bildim-gizli-bot-nabiz';
end $$;
