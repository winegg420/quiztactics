// Taşma ödülü (28. seviyeden sonra her N SP) yardımcıları. Sunucu `tasma_sp`'yi ayrıca VERMEZ; N, verilen alanlardan türetilir:
//   sonraki_icin_sp = esik28 + (kazanilan + 1) × N − sp   →   N = (sonraki_icin_sp + sp − esik28) / (kazanilan + 1)
// Azami'ya ulaşınca sonraki_icin_sp null olur ve N o anda türetilemez → oturumda daha önce türetilen değer kullanılır,
// o da yoksa null (arayüz "Her N SP" yerine sayısız metin gösterir). Sunucu alanı eklenirse bu dosya tek satıra iner.
let sonAdim = null;

export function tasmaAdimi(durum) {
  const t = durum?.tasma;
  if (!t) return null;
  if (t.sonraki_icin_sp != null) {
    const esik28 = Number(durum.esikler?.[Number(durum.seviye_sayisi ?? 28) - 1]);
    const n = (Number(t.sonraki_icin_sp) + Number(durum.sp) - esik28) / (Number(t.kazanilan ?? 0) + 1);
    if (Number.isFinite(n) && n > 0) sonAdim = Math.round(n);
  }
  return sonAdim;
}
