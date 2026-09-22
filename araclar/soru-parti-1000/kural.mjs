// Soru kural kontrolü — veritabanındaki public.soru_kural_isaretleri()'nin JS aynası.
//
// Neden ayna: soru yazılırken (yüzlerce taslak) her seferinde veritabanına
// gitmeden hızlı geri bildirim almak için. KESİN kapı veritabanındaki
// fonksiyondur (kapi.mjs onu çağırır); bu dosya yalnız ön elemedir.
// Eşikler oyun_ayarlari'ndaki varsayılanlarla aynı: soru_uzun_sik_oran 1.4,
// soru_uzun_sik_fark 3. Ağırlıklar soru_isaret_agirligi() ile aynı.

const CEVIRI_KAYNAK = 'İIŞĞÜÖÇÂÎÛâîû';
const CEVIRI_HEDEF = 'iışğüöçaiuaiu';

function cevir(p) {
  let o = '';
  for (const ch of String(p ?? '')) {
    const i = CEVIRI_KAYNAK.indexOf(ch);
    o += i >= 0 ? CEVIRI_HEDEF[i] : ch;
  }
  return o.toLowerCase();
}

/** public.soru_normalize */
export const normalize = (p) => cevir(p).replace(/[^a-z0-9çğıöşü]+/g, '');
/** public.soru_kelimeler */
export const kelimeler = (p) => cevir(p).replace(/[^a-z0-9çğıöşü]+/g, ' ').trim();
/** public.soru_kelime_sayisi */
export const kelimeSayisi = (p) => kelimeler(p).split(' ').filter(Boolean).length;

export const AGIRLIK = {
  sik_sayisi: 3, ayni_sik: 3, cevap_sizmasi: 2, hepsi_hicbiri: 2,
  dogru_en_uzun: 2, dogru_coklu_kelime: 2, sayisal_uc: 1,
};

/** public.soru_kural_isaretleri(soru, secenekler, dogru) aynası. */
export function kuralIsaretleri(soru, secenekler, dogru, { oran = 1.4, fark = 3 } = {}) {
  const isaret = [];
  if (!Array.isArray(secenekler) || secenekler.length !== 4 || !(dogru >= 0 && dogru < 4)) return ['sik_sayisi'];
  const d = secenekler[dogru];
  const digerleri = secenekler.filter((_, i) => i !== dogru);
  if (new Set(secenekler.map(normalize)).size < 4) isaret.push('ayni_sik');

  const dUz = String(d).trim().length;
  const ort = digerleri.reduce((t, x) => t + String(x).trim().length, 0) / digerleri.length;
  if (dUz > oran * Math.max(ort, 1) && dUz - ort > fark) isaret.push('dogru_en_uzun');

  if (kelimeSayisi(d) > Math.max(...digerleri.map(kelimeSayisi))) isaret.push('dogru_coklu_kelime');

  const sk = ` ${kelimeler(soru)} `;
  const icerir = (x) => normalize(x).length >= 4 && sk.includes(` ${kelimeler(x)} `);
  if (icerir(d) && !digerleri.some(icerir)) isaret.push('cevap_sizmasi');

  const hh = /(^| )(hiçbiri|hicbiri|yukarıdakilerin|all of the above|none of the above)( |$)/;
  if (secenekler.some((x) => hh.test(kelimeler(x)) || ['hepsi', 'tümü', 'hepsi doğru', 'ikisi de', 'hiçbiri'].includes(kelimeler(x)))) {
    isaret.push('hepsi_hicbiri');
  }

  const sayi = /^-?[0-9]+([.,][0-9]+)?$/;
  if (secenekler.every((x) => sayi.test(String(x).trim()))) {
    const v = secenekler.map((x) => Number(String(x).trim().replace(',', '.')));
    const dv = v[dogru];
    if (dv === Math.min(...v) || dv === Math.max(...v)) isaret.push('sayisal_uc');
  }
  return isaret;
}

/** Rekabetçi havuzdan düşüren (ağırlık ≥ 2) işaretler. */
export const agirIsaretler = (isaretler) => isaretler.filter((i) => (AGIRLIK[i] ?? 1) >= 2);
