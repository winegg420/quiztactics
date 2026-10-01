-- 830 — Ücretsiz plan (Supabase Nano) için arka plan yükünü azalt: BOŞTA ÇIK + DİNAMİK ARALIK.
--
-- ÖLÇÜLEN DURUM (1 Eki 2026, canlı cron.job / cron.job_run_details, salt okunur):
--   · duello_tik (2 sn) ve bildim-bot-oyna (2 sn) günde ~43.000 koşu yapıyor; son 30 günde
--     toplam 264 düello ve 288 klasik maç var → koşuların neredeyse tamamı BOŞ dönüyor.
--     Her koşu pg_cron'da bir arka plan işçisi (max_worker_processes = 6) ve cron.job_run_details'e
--     2 yazma demek; dakikalık 4-5 iş aynı saniyede başlayınca işçiler yetişmiyor
--     ("job startup timeout": 24 saatte 28 koşu, hepsi 14:03 TSİ çevresindeki takılmada).
--   · Eşzamanlılık kilidi (237) duello_tik_hepsi / bot_oyna / gizli_bot_nabiz / bot_puan_tik'te ZATEN var.
--
-- BU DOSYA NE YAPIYOR (hiçbir mevcut fonksiyon DEĞİŞMEZ; asıl mantık aynen durur):
--   1) cron_aralik_ayarla(): bir cron işinin aralığını (yalnız izinli iki iş) değiştirir; hata vermez.
--   2) İnce SARMALAYICILAR (cron_*): "yapılacak iş var mı" kontrolü; yoksa hemen çıkar.
--      Düello/Klasik tikleri iş yokken aralığı 15 sn'ye çeker, iş varken 2 sn'de tutar.
--      Sık dakikalık işlere (turnuva zamanlayıcı, bot turnuva katılım) boşta-çık kapısı + try-lock,
--      sezon_tik'e (bloklayan kilit kullanıyordu) try-lock.
--   3) Uyandırma tetikleyicileri: düello/maç/turnuva/grup/hızlı maç İŞ DOĞURDUĞU AN aralık hemen 2 sn'ye
--      döner (oyun hissi eskisi gibi). Tetikleyici hatası asla oyunu bozmaz (try/catch).
--   Sarmalayıcılar cron'a 831'de bağlanır; bu dosya tek başına zararsızdır.

-- Kilit güvenliği: tetikleyici oluşturma kısa bir tablo kilidi ister; bekleme uzarsa migration geri alınır.
set local lock_timeout = '10s';

-- ───── 1) Aralık ayarlayıcı ─────
create or replace function public.cron_aralik_ayarla(p_isim text, p_aralik text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_mevcut text;
begin
  -- Yalnız bu iki iş (savunma derinliği: yanlış ada dokunulmaz).
  if p_isim not in ('duello_tik', 'bildim-bot-oyna') then return; end if;
  if p_aralik not in ('2 seconds', '15 seconds') then return; end if;
  select j.jobid, j.schedule into v_id, v_mevcut from cron.job j where j.jobname = p_isim;
  if v_id is null or v_mevcut = p_aralik then return; end if;
  perform cron.alter_job(v_id, schedule := p_aralik);
exception when others then
  raise warning 'cron_aralik_ayarla(%, %): %', p_isim, p_aralik, sqlerrm;
end $$;

-- ───── 2) Sarmalayıcılar ─────
-- Düello: aktif düello ya da bota gelmiş (60 sn içindeki) rövanş isteği varsa iş var.
create or replace function public.cron_duello_tik()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.duellolar where durum = 'aktif')
     or exists (select 1 from public.duellolar x
                 where x.durum = 'bitti' and x.rovans_isteyen is not null and x.rovans_id is null
                   and x.rovans_at > now() - make_interval(secs => public.ayar_sayi('duello_rovans_sn', 60))) then
    perform public.cron_aralik_ayarla('duello_tik', '2 seconds');
    return public.duello_tik_hepsi();
  end if;
  perform public.cron_aralik_ayarla('duello_tik', '15 seconds');
  return 0;
end $$;

-- Klasik/Grup/Hızlı/Turnuva botları: bot_oyna'nın baktığı her tablonun "canlı" durumu.
create or replace function public.cron_bot_oyna()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.matches where durum in ('aktif', 'bekliyor'))
     or exists (select 1 from public.tournaments where durum = 'aktif')
     or exists (select 1 from public.group_matches where durum in ('bekliyor', 'aktif'))
     or exists (select 1 from public.hizli_maclar where durum in ('bekliyor', 'aktif')) then
    perform public.cron_aralik_ayarla('bildim-bot-oyna', '2 seconds');
    perform public.bot_oyna();
    return;
  end if;
  perform public.cron_aralik_ayarla('bildim-bot-oyna', '15 seconds');
end $$;

-- Turnuva zamanlayıcı: zamanı gelmiş lobi yoksa VE sıradaki lobi kaydı zaten varsa yapacak iş yok
-- (asıl fonksiyonun yaptığı iki şey bu: zamanı gelmiş lobiyi başlat/iptal et; sıradaki lobiyi aç).
create or replace function public.cron_turnuva_zamanlayici_tik()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not pg_try_advisory_xact_lock(hashtext('cron_turnuva_zamanlayici_tik')) then return 0; end if;
  if not exists (select 1 from public.tournaments t
                  where t.durum = 'lobi' and public.turnuva_an(t.id) <= now())
     and exists (select 1 from public.tournaments t2
                   join public.sonraki_turnuva_bilgi() s on s.o_tarih = t2.tarih and s.o_seans = t2.seans) then
    return 0;
  end if;
  return public.turnuva_zamanlayici_tik();
end $$;

-- Bot turnuva katılımı: açık lobide bot sayısı hedefe ulaştıysa katılacak bot kalmadı.
create or replace function public.cron_bot_turnuva_katilim_tik()
returns integer
language plpgsql
security definer
set search_path = public
as $$
begin
  if not pg_try_advisory_xact_lock(hashtext('cron_bot_turnuva_katilim_tik')) then return 0; end if;
  if not exists (
    select 1 from public.tournaments t
     where t.durum = 'lobi'
       and (select count(*) from public.tournament_players tp
              join public.profiles p on p.id = tp.user_id
             where tp.tournament_id = t.id and coalesce(p.is_bot, false))
           < public.turnuva_hedef_bot(t.id)
  ) then
    return 0;
  end if;
  return public.bot_turnuva_katilim_tik();
end $$;

-- Sezon tiki: asıl fonksiyon BLOKLAYAN kilit alıyordu (takılırsa sonraki koşular kuyruğa girerdi).
-- Burada aynı anahtar try-lock ile alınır; ayrıca yapacak iş yoksa çıkılır.
create or replace function public.cron_sezon_tik()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not pg_try_advisory_xact_lock(hashtext('quiztactics:sezon_tik')) then return; end if;
  if not exists (select 1 from public.sezonlar where kapandi_at is null and bitis <= now())
     and (not public.sezon_yolu_acik_mi()
          or (exists (select 1 from public.sezonlar where kapandi_at is null and not test)
              and not exists (select 1 from public.sezonlar where kapandi_at is null and test))) then
    return;
  end if;
  perform public.sezon_tik();
end $$;

revoke all on function public.cron_aralik_ayarla(text, text) from public, authenticated, anon;
revoke all on function public.cron_duello_tik() from public, authenticated, anon;
revoke all on function public.cron_bot_oyna() from public, authenticated, anon;
revoke all on function public.cron_turnuva_zamanlayici_tik() from public, authenticated, anon;
revoke all on function public.cron_bot_turnuva_katilim_tik() from public, authenticated, anon;
revoke all on function public.cron_sezon_tik() from public, authenticated, anon;

-- Bekleyen rövanş sorgusu (cron_duello_tik) tablo büyüse de ucuz kalsın: küçük kısmi indeks.
create index if not exists idx_duello_rovans_bekleyen
  on public.duellolar (rovans_at)
  where durum = 'bitti' and rovans_isteyen is not null and rovans_id is null;

-- ───── 3) Uyandırma tetikleyicileri ─────
create or replace function public.cron_hizlandir_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.cron_aralik_ayarla(tg_argv[0], '2 seconds');
  return null;
exception when others then
  raise warning 'cron_hizlandir_trg(%): %', tg_argv[0], sqlerrm;
  return null;
end $$;
revoke all on function public.cron_hizlandir_trg() from public, authenticated, anon;

-- Düello: aktif düello doğdu / aktife geçti; bitmiş düelloda rövanş istendi.
create or replace trigger trg_cron_hizlan_duello_ekle after insert on public.duellolar
  for each row when (new.durum = 'aktif') execute function public.cron_hizlandir_trg('duello_tik');
create or replace trigger trg_cron_hizlan_duello_durum after update of durum on public.duellolar
  for each row when (new.durum = 'aktif' and old.durum is distinct from new.durum)
  execute function public.cron_hizlandir_trg('duello_tik');
create or replace trigger trg_cron_hizlan_duello_rovans after update of rovans_isteyen on public.duellolar
  for each row when (new.rovans_isteyen is not null and old.rovans_isteyen is distinct from new.rovans_isteyen)
  execute function public.cron_hizlandir_trg('duello_tik');

-- Klasik maç / Grup / Hızlı: bekliyor ya da aktif satır doğdu.
create or replace trigger trg_cron_hizlan_matches_ekle after insert on public.matches
  for each row when (new.durum in ('bekliyor', 'aktif')) execute function public.cron_hizlandir_trg('bildim-bot-oyna');
create or replace trigger trg_cron_hizlan_matches_durum after update of durum on public.matches
  for each row when (new.durum in ('bekliyor', 'aktif') and old.durum is distinct from new.durum)
  execute function public.cron_hizlandir_trg('bildim-bot-oyna');

create or replace trigger trg_cron_hizlan_grup_ekle after insert on public.group_matches
  for each row when (new.durum in ('bekliyor', 'aktif')) execute function public.cron_hizlandir_trg('bildim-bot-oyna');
create or replace trigger trg_cron_hizlan_grup_durum after update of durum on public.group_matches
  for each row when (new.durum in ('bekliyor', 'aktif') and old.durum is distinct from new.durum)
  execute function public.cron_hizlandir_trg('bildim-bot-oyna');

create or replace trigger trg_cron_hizlan_hizli_ekle after insert on public.hizli_maclar
  for each row when (new.durum in ('bekliyor', 'aktif')) execute function public.cron_hizlandir_trg('bildim-bot-oyna');
create or replace trigger trg_cron_hizlan_hizli_durum after update of durum on public.hizli_maclar
  for each row when (new.durum in ('bekliyor', 'aktif') and old.durum is distinct from new.durum)
  execute function public.cron_hizlandir_trg('bildim-bot-oyna');

-- Turnuva: lobi → aktif geçişi (bot_oyna turnuva sorularını yalnız aktifken oynatır).
create or replace trigger trg_cron_hizlan_turnuva_durum after update of durum on public.tournaments
  for each row when (new.durum = 'aktif' and old.durum is distinct from new.durum)
  execute function public.cron_hizlandir_trg('bildim-bot-oyna');
