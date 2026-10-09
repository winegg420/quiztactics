-- 1013 · DÜELLO v4 — şema + ayarlar (Ida, 9 Eki 2026).
-- Yeni çekirdek: nötr soru → KONTROL · kontrol sahibi 4 karttan birini rakibe gönderir, birini kendine seçer (7 sn)
-- · iki oyuncuya farklı kategoriden, aynı zorlukta iki farklı soru · aynı kontrol döneminde seri 3/3 kazanır
-- · 15 saldırı turunda çıkmazsa (ya da art arda 5 nötr soru) SON DÜELLO: aynı soru, jokersiz, tek bilen kazanır.
-- Maç satırı aynı tabloda (duellolar) `surum = 4` ile durur; eşleştirme, davet, rövanş, kopukluk/terk, duello_bitir
-- (ödül/XP/lig), sezon/rozet tetikleyicileri ve realtime sinyali değişmeden çalışır. Eski (surum 2) maçlar eski kodla biter.
-- Bayrak `duello_v4_acik`: "kapali" | "test" (yalnız duello_v2_test_kullanicilari listesindeki gerçek oyuncular) | "acik".
-- Bu dosya yalnız kolon/kısıt/ayar ekler; fonksiyonlar 1014, mevcut fonksiyonlara bağlantı 1015.
-- Geri alma: docs/duello-geri-alma-v4.sql.

alter table public.duellolar
  add column if not exists v4_kontrol uuid,                                  -- kontrol kimde (null = nötr)
  add column if not exists v4_seri smallint not null default 0,             -- bu kontrol dönemindeki başarılı saldırı
  add column if not exists v4_tur smallint not null default 0,              -- saldırı turu (nötr/Son Düello sayılmaz)
  add column if not exists v4_max_tur smallint,                              -- maça sabit (15)
  add column if not exists v4_seri_hedef smallint,                           -- maça sabit (3)
  add column if not exists v4_notr_seri smallint not null default 0,        -- art arda nötr soru
  add column if not exists v4_notr_max smallint,                             -- maça sabit (5)
  add column if not exists v4_kart_sayisi smallint,                          -- maça sabit (4)
  add column if not exists v4_kullanilan text[] not null default '{}',      -- bu kontrol döneminde kullanılan kategoriler
  add column if not exists v4_kartlar text[],                                -- bu turun kartları
  add column if not exists v4_gonderilen text,                               -- rakibe gönderilen kategori
  add column if not exists v4_secilen text,                                  -- kontrol sahibinin kendine seçtiği kategori
  add column if not exists v4_kart_oto boolean not null default false,      -- süre doldu, sunucu seçti
  add column if not exists v4_soru_no integer not null default 0,           -- her açılan soruda +1 (joker/İkinci Şans dizini)
  add column if not exists v4_son boolean not null default false,          -- Son Düello
  add column if not exists soru_id1 uuid,                                    -- oyuncu1'in sorusu
  add column if not exists soru_id2 uuid,                                    -- oyuncu2'nin sorusu
  add column if not exists kategori1 text,
  add column if not exists kategori2 text;

alter table public.duello_hamleler add column if not exists v4 jsonb;

alter table public.duellolar drop constraint if exists duellolar_surum_kontrol;
alter table public.duellolar add constraint duellolar_surum_kontrol check (surum = any (array[1, 2, 4]));
alter table public.duellolar drop constraint if exists duellolar_faz_check;
alter table public.duellolar add constraint duellolar_faz_check
  check (faz = any (array['kategori', 'hazirlik', 'cevap', 'sonuc', 'altin', 'ban', 'secim', 'notr', 'kart', 'son']));

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('duello_v4_acik', '"kapali"'::jsonb, 'Düello v4 (kontrol + seri 3/3): "kapali" | "test" (duello_v2_test_kullanicilari) | "acik". Maç açılırken satıra sabitlenir (surum 4).'),
  ('duello4_kart_sn', '7', 'Düello v4: kart seçimi (rakibe gönder + kendine seç) toplam süre, sn'),
  ('duello4_cevap_sn', '15', 'Düello v4: soru süresi, sn'),
  ('duello4_sonuc_sn', '3', 'Düello v4: tur sonucu gösterimi, sn'),
  ('duello4_giris_sn', '3', 'Düello v4: ilk sorudan önce giriş (3-2-1), sn'),
  ('duello4_max_tur', '15', 'Düello v4: saldırı turu sınırı (nötr sorular sayılmaz); dolunca Son Düello'),
  ('duello4_seri_hedef', '3', 'Düello v4: aynı kontrol döneminde kazandıran seri'),
  ('duello4_notr_max', '5', 'Düello v4: art arda bu kadar nötr soruda kontrol alınamazsa Son Düello'),
  ('duello4_kart_sayisi', '4', 'Düello v4: her saldırı turunda kart sayısı'),
  ('duello4_oran_varsayilan', '50', 'Düello v4: verisi yetersiz kategoride (duello_oran_min_cevap altı) bot/otomatik seçimde varsayılan oran, %'),
  ('duello4_bot_kart_min_sn', '1.2', 'Düello v4 botu: kart seçim gecikmesi alt sınır, sn'),
  ('duello4_bot_kart_max_sn', '3', 'Düello v4 botu: kart seçim gecikmesi üst sınır, sn'),
  ('duello4_bot_en_iyi_yuzde', '75', 'Düello v4 botu: kartta en iyi seçimi yapma olasılığı, %')
on conflict (anahtar) do nothing;
