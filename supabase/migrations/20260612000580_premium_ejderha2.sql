-- ============================================================
-- 580 · PREMIUM ÇERÇEVE 2. TUR — Ejderha (Ida onayı, 24 Eyl 2026)
--
-- Ida /premium-onizleme 2. turda Ejderha çerçevesine (WebGL efektli) "girsin" dedi:
--   pc_ejderha2   Ejderha / Dragon   → 500 elmas (TEST; elmas_premium_cerceve, 560)
-- Sanat istemcide: oyun/tasarim/premium/tur2/ (PremiumAvatarCizim › TUR2_SANAT: ejderha2 → "ejderha").
-- public/kozmetik/premium/ejderha.png konursa oyunda da kod çizimi yerine o görsel kullanılır
-- (Cerceve2 › PNG_YUVALARI; dosya yoksa kod çizimi — veritabanında ayar yok).
--
-- Kurallar 560/570 ile AYNI (yalnız veri; fonksiyon, kolon, kısıt, politika, yetki DEĞİŞMEZ):
--   · Satış: kozmetik_satista = aktif + onay 'girsin' + fiyat + kozmetik_satis_acik.
--   · Sahip test modu (sahip_mi): satın almadan takar — yalnız aktif kalemlerde (560 kozmetik_tak).
--   · Gizli botlar premium TAKMAZ (560 bot_kozmetik / oyuncu_kartlari premium alanları null); bot_min_level 999.
--   · Fiyat satırı yok (fiyat_elmas null) → kozmetik_fiyati 'elmas_premium_cerceve' ayarından (500).
--
-- Önkoşul: 560 (premium_cerceve türü, takili_premium_cerceve). Tekrar çalıştırılabilir; yıkıcı değil.
-- onay/aktif yalnız İLK eklemede yazılır; Ida sonradan değiştirirse tekrar çalıştırma ezmez.
-- İstemci bu migration'dan ÖNCE dağıtılabilir: kalem katalogda/kartta yoksa hiçbir şey değişmez.
-- ============================================================

insert into public.kozmetikler (anahtar, tur, ad_tr, ad_en, icerik, bot_min_level, aktif, onay, onay_zamani, sira) values
  ('pc_ejderha2', 'premium_cerceve', 'Ejderha', 'Dragon', '{"sanat": "ejderha2"}', 999, true, 'girsin', now(), 507)
on conflict (anahtar) do update
  set tur = excluded.tur, ad_tr = excluded.ad_tr, ad_en = excluded.ad_en, icerik = excluded.icerik,
      bot_min_level = excluded.bot_min_level, sira = excluded.sira;

-- Fiyat ayarı 560'ta var; yoksa (560 eksik uygulanmışsa) aynı TEST değeriyle eklenir, varsa dokunulmaz.
insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('elmas_premium_cerceve', '500', 'TEST — Premium hareketli çerçeve fiyatı (elmas).')
on conflict (anahtar) do nothing;

do $$
begin
  raise notice '580 premium ejderha2: %', (
    select format('aktif=%s onay=%s fiyat_ayari=%s', k.aktif, k.onay,
                  (select deger from public.oyun_ayarlari where anahtar = 'elmas_premium_cerceve'))
    from public.kozmetikler k where k.anahtar = 'pc_ejderha2');
end $$;
