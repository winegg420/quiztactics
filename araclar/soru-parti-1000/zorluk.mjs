// Zorluk seviyesi — Jev zorluk puanını (1–5 sürekli) SIRALAMAYA göre 1–5 seviyeye çevirir.
//
// Karar (Ida): zorluk mutlak değil sıralamaya göre, dengeli:
//   en kolay %10 → 1 · sonraki %20 → 2 · orta %40 → 3 · sonraki %20 → 4 · en zor %10 → 5
// Referans havuz: araclar/jev-tarama/ozet.csv (9.290 aktif TR soru, 22 Eyl 2026 taraması).
// Eşikler PUAN değerleridir: aynı puanı alan iki soru her zaman aynı seviyeye düşer
// (eşitlik bloğu, hedef sayıya hangi taraf daha yakınsa o tarafa bırakılır). Yeni soru
// aynı eşiklerle seviyelenir → havuzla tutarlı.
import fs from 'node:fs';

export const PAYLAR = [0.1, 0.2, 0.4, 0.2, 0.1];

/** ozet.csv → [{id, puan}] */
export function havuzPuanlari(csvYolu = new URL('../jev-tarama/ozet.csv', import.meta.url)) {
  const satirlar = fs.readFileSync(csvYolu, 'utf8').trim().split(/\r?\n/);
  const bas = satirlar[0].split(',');
  const iId = bas.indexOf('id');
  const iZ = bas.indexOf('zorluk');
  if (iId < 0 || iZ < 0) throw new Error('ozet.csv başlığında id/zorluk yok');
  return satirlar.slice(1).map((l) => {
    const p = l.split(',');
    return { id: p[iId], puan: Number(p[iZ]) };
  }).filter((x) => /^[0-9a-f-]{36}$/.test(x.id) && Number.isFinite(x.puan));
}

/**
 * Eşik puanları: seviye s (2..5) için puan >= esik[s-2] ise en az s.
 * Eşitlik blokları bölünmez.
 */
export function esikleriHesapla(puanlar) {
  const z = puanlar.map((x) => x.puan).sort((a, b) => a - b);
  const n = z.length;
  const esikler = [];
  let birikim = 0;
  for (let s = 0; s < 4; s++) {
    birikim += PAYLAR[s];
    const hedef = Math.round(birikim * n); // bu sınırdan önce kalması gereken adet
    const v = z[hedef];
    const ilk = z.indexOf(v);            // v bloğunun başı
    const son = z.lastIndexOf(v) + 1;    // v bloğunun sonu
    // blok ya tamamen üst seviyeye (eşik = v) ya tamamen alt seviyeye (eşik = bloktan sonraki değer)
    esikler.push(hedef - ilk <= son - hedef ? v : z[son]);
  }
  return esikler;
}

export function seviye(puan, esikler) {
  let s = 1;
  for (const e of esikler) if (puan >= e) s++;
  return s;
}
