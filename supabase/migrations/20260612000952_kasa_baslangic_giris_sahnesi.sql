-- 952: KASA maç başı süresi — 3-2-1 geri sayımının "3"ü hiç görünmüyordu (canlı test, 4 Eki 2026).
--
-- KÖK: 951 maç başına 3 sn'lik giriş sahnesi ekledi ve sahneyi ilk sorunun gösterim başlangıcına (soru açılışı +
--    gösterim payı) bitecek şekilde yerleştirdi; 3-2-1 sahneden ÖNCEKİ 3 sn'de sayar. Başlangıç fazı ise Klasik ile
--    aynı kaldı (mac_geri_sayim_sn 3 + mac_geri_sayim_payi_ms 2000 = 5 sn). Pay, arama ekranındaki "Rakip bulundu"
--    geçişini (ARAMA_GECIS_MS 2 sn) + sayfa açılışını karşılamak içindir; sahne bu payın 3 sn'sini yedi.
--    Ölçüm (iki gerçek hesap + bot, canlı): maç sayfası kuruluştan ~2,3–3,3 sn sonra açılıyor, 3-2-1 penceresi
--    kuruluştan 0,5 sn sonra başlıyordu → "3" hiç, "2" 70–280 ms görünüyordu.
-- DÜZELTME: başlangıç fazına giriş sahnesinin süresi (kasa_giris_sahne_ms, 3000 — KasaPage GIRIS_SAHNE_MS ile aynı)
--    eklenir: 3-2-1 yine tam 3 sn, sahne yine 3 sn, ilk sorunun sayacı sahne bitince başlar. Kural, puan, süre
--    (soru/karar/sonuç) DEĞİŞMEZ; yalnız ilk sorunun açılışı 3 sn sonra.
-- SÜREN MAÇLAR: etkilenmez (faz_bitis kuruluşta yazılır).
-- GERİ ALMA: docs/kasa-geri-alma-952.sql (951 tanımı).

insert into public.oyun_ayarlari (anahtar, deger, aciklama) values
  ('kasa_giris_sahne_ms', '3000'::jsonb,
   'KASA: maç başı giriş sahnesi süresi (ms) — başlangıç fazına eklenir; KasaPage GIRIS_SAHNE_MS ile aynı olmalı (952).')
on conflict (anahtar) do nothing;

create or replace function public.kasa_olustur(p_a uuid, p_b uuid, p_dereceli boolean, p_davetli boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_x uuid;
  v_bot uuid;
  v_max int := greatest(1, public.ayar_sayi('kasa_max_tur', 36)::int);
begin
  if not public.kasa_acik_mi() then raise exception 'Bu mod şu an kapalı'; end if;
  if random() < 0.5 then v_x := p_a; p_a := p_b; p_b := v_x; end if;
  select p.id into v_bot from public.profiles p where p.id in (p_a, p_b) and coalesce(p.is_bot, false) limit 1;

  insert into public.kasa_maclari (
    oyuncu1, oyuncu2, dereceli, davetli, faz, faz_bitis,
    hedef, max_tur, artis, ikisi_artis, soru_sn, karar_sn, sonuc_sn, acma_min, jokerli,
    soru_ids, bot, bot_tarz)
  values (
    p_a, p_b, coalesce(p_dereceli, true), coalesce(p_davetli, false), 'baslangic',
    -- Klasik 3-2-1 (651): ilk soru now + geri sayım + gösterim payı; 952: + giriş sahnesi
    now() + make_interval(secs => public.ayar_sayi('mac_geri_sayim_sn', 3)
                                  + greatest(0, public.ayar_sayi('mac_geri_sayim_payi_ms', 2000)) / 1000.0
                                  + greatest(0, public.ayar_sayi('kasa_giris_sahne_ms', 3000)) / 1000.0),
    greatest(1, public.ayar_sayi('kasa_hedef_puan', 50)::int), v_max,
    greatest(0, public.ayar_sayi('kasa_artis', 2)::int),
    greatest(0, public.ayar_sayi('kasa_ikisi_dogru_artis', 6)::int),
    greatest(5, public.ayar_sayi('kasa_soru_sn', 15)::int),
    greatest(3, public.ayar_sayi('kasa_karar_sn', 8)::int),
    greatest(1, public.ayar_sayi('kasa_sonuc_sn', 3)::int),
    greatest(0, public.ayar_sayi('kasa_acma_min', 10)::int),
    true,
    coalesce(public.soru_sec(null::text, v_max + 2, array[p_a, p_b]), '{}'::uuid[]),
    v_bot, case when v_bot is not null then public.kasa_bot_tarz(v_bot) end)
  returning id into v_id;

  insert into public.kasa_sinyal (kasa_id, oyuncu1, oyuncu2) values (v_id, p_a, p_b);
  delete from public.kasa_kuyrugu where user_id in (p_a, p_b);
  return v_id;
end $$;
