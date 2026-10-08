-- ============================================================
-- Ses adayları kovası (8 Eki 2026) — dist/ küçülsün diye.
--
-- /ses-secim adayları (Kenney WAV, Pixabay MP3, müziklerin 30 sn AAC önizlemesi; 142 dosya,
-- 8,5 MB) eskiden public/ses/adaylar/ altındaydı ve her dağıtıma giriyordu. Artık Supabase
-- Storage `ses-adaylar` kovasından herkese okunur (desen: migration 450 › `muzik` kovası).
-- `muzik` kovası yalnız audio/aac kabul ettiği için ayrı kova.
--
-- Dosya adı içerik sürümlü (<aday>-<sha10>.<uzantı>), yükleme cacheControl = 1 yıl.
-- Yükleme: araclar/ses-adaylari-yukle.mjs (servis anahtarıyla, yalnız bakım). Eşleme:
-- oyun/lib/sesAdayKova.js. Kaynak/lisans: docs/ses-kaynaklari.md.
--
-- Yazma politikası YOK: istemci (anon/authenticated) yükleyemez, silemez.
-- İdempotent: tekrar çalışırsa kova değişmez, politika aynı adla yeniden kurulur.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ses-adaylar', 'ses-adaylar', true, 10485760,
        array['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/aac'])
on conflict (id) do nothing;

drop policy if exists ses_adaylar_okuma on storage.objects;
create policy ses_adaylar_okuma on storage.objects
  for select using (bucket_id = 'ses-adaylar');
