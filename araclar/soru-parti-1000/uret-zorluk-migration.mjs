// Migration 274'ü üretir: Jev havuz taramasındaki zorluk puanlarını sıralamaya göre
// questions.zorluk'a yazar. Veritabanına dokunmaz; yalnız SQL dosyası yazar.
// Kullanım: node araclar/soru-parti-1000/uret-zorluk-migration.mjs
import fs from 'node:fs';
import { havuzPuanlari, esikleriHesapla, seviye, PAYLAR } from './zorluk.mjs';

const HEDEF = new URL('../../supabase/migrations/20260612000274_soru_zorluk_jev.sql', import.meta.url);
const ESIK_DOSYA = new URL('./zorluk-esikler.json', import.meta.url);

const puanlar = havuzPuanlari();
const esikler = esikleriHesapla(puanlar);
const gruplar = [[], [], [], [], []];
for (const p of puanlar) gruplar[seviye(p.puan, esikler) - 1].push(p.id);
for (const g of gruplar) g.sort();

fs.writeFileSync(ESIK_DOSYA, JSON.stringify({
  kaynak: 'araclar/jev-tarama/ozet.csv (Jev havuz taraması, 22 Eyl 2026)',
  paylar: PAYLAR,
  esikler: { 2: esikler[0], 3: esikler[1], 4: esikler[2], 5: esikler[3] },
  aciklama: 'Jev puanı >= esikler[s] ise seviye en az s. Eşitlik blokları bölünmedi.',
  dagilim: gruplar.map((g) => g.length),
}, null, 2) + '\n');

const dizi = (ids) => `'{${ids.map((id, i) => (i % 4 === 0 ? '\n  ' : '') + id).join(',')}\n}'::uuid[]`;
const sql = `-- ============================================================
-- 274 — Soru zorluğu: Jev havuz taramasından SIRALAMAYA göre (Şerit D, 22 Eyl 2026)
--
-- Kaynak: araclar/jev-tarama/ozet.csv — ${puanlar.length} aktif TR soru, Jev zorluk puanı (1–5 sürekli).
-- Karar (Ida): zorluk mutlak değil sıralamaya göre, dengeli:
--   en kolay %10 → 1 · sonraki %20 → 2 · orta %40 → 3 · sonraki %20 → 4 · en zor %10 → 5
-- Eşik puanları (aynı puan hep aynı seviyede): 2 ≥ ${esikler[0]} · 3 ≥ ${esikler[1]} · 4 ≥ ${esikler[2]} · 5 ≥ ${esikler[3]}
-- Dağılım: ${gruplar.map((g, i) => `${i + 1}=${g.length}`).join(' · ')}
--
-- Kolon ZATEN VAR (migration 147: smallint, not null, default 3, check 1–5) — şema değişmez.
-- Taramada olmayan (pasif) sorulara dokunulmaz. Turnuva soru sırası (turnuva_soru_sec:
-- 1–5 → zorluk 1-2, 6–10 → 3, 11+ → 4-5) DEĞİŞMEZ; yalnız artık gerçek veriyle çalışır.
--
-- DİKKAT — soru_sec (Klasik/Düello/Grup) \`zorluk >= 2\` filtresi uygular: zorluk 1 olan
-- sorular yalnız turnuvanın ilk 5 sorusunda çıkar. Bu migration'dan sonra en kolay %10
-- (${gruplar[0].length} soru) normal maç havuzundan çıkar. Bu, 147'deki "zorluk 1 = ısınma
-- sorusu, normal maçta yok" tasarımıyla uyumludur; istenmezse 1'ler 2'ye çekilir.
--
-- Oyuncu verisi biriktikçe günlük soru_zorluk_kalibre() (≥30 cevaplı soru) bu değerlerin
-- üzerine doğru oranına göre yazar — bilinçli: gerçek veri Jev tahmininden üstündür.
--
-- Üretici: node araclar/soru-parti-1000/uret-zorluk-migration.mjs
-- ============================================================

${gruplar.map((g, i) => `update public.questions set zorluk = ${i + 1}
 where id = any(${dizi(g)})
   and zorluk is distinct from ${i + 1};`).join('\n\n')}
`;
fs.writeFileSync(HEDEF, sql);
console.log(`Yazıldı: ${HEDEF.pathname} · eşikler ${esikler.join(' / ')} · dağılım ${gruplar.map((g) => g.length).join('/')}`);
