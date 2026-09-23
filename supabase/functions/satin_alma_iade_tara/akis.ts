// İade taraması — saf mantık, dış bağımlılık YOK (testte sahte Play ile çalışır).
//
// Voided Purchases API son 30 günü verir. Tarama durumsuzdur: her çalışmada son
// 30 gün baştan okunur; aynı iade DB'de iki kez işlenmez (satin_alma_iade_isle
// defter satırını kilitler, 'zaten_iade' döner). Günlük bir çalışma yeter
// (API kotası: günde 6000, 30 sn'de 30 istek).

import type { IadeKaydi, PlaySonuc } from "../satin_alma_dogrula/play.ts";

export type IadeBagimliliklari = {
  bayrakAcik: () => Promise<boolean>;
  iadeleriListele: (
    baslangicMs: number,
    sayfa?: string,
  ) => Promise<PlaySonuc<{ voidedPurchases?: IadeKaydi[]; tokenPagination?: { nextPageToken?: string } }>>;
  iadeIsle: (p: {
    p_token: string;
    p_iade_ms: number | null;
    p_neden: number | null;
    p_kaynak: number | null;
  }) => Promise<{ data: { durum: string; geri_alinan?: number; eksik?: number } | null; error: { message: string } | null }>;
  kaydet: (olay: string, ayrinti: Record<string, unknown>) => void;
  simdiMs?: () => number;
};

export type TaramaSonucu = {
  durum: "kapali" | "tamam" | "hata";
  okunan: number;
  iade_edildi: number;
  zaten_iade: number;
  bilinmiyor: number;
  hatali: number;
  geri_alinan_coin: number;
  eksik_coin: number;
  hata?: string;
};

const OTUZ_GUN_MS = 30 * 24 * 60 * 60 * 1000;
const EN_FAZLA_SAYFA = 50;

export async function iadeTara(d: IadeBagimliliklari): Promise<TaramaSonucu> {
  const s: TaramaSonucu = {
    durum: "tamam",
    okunan: 0,
    iade_edildi: 0,
    zaten_iade: 0,
    bilinmiyor: 0,
    hatali: 0,
    geri_alinan_coin: 0,
    eksik_coin: 0,
  };
  if (!(await d.bayrakAcik())) return { ...s, durum: "kapali" };

  // API sınırı tam 30 gün; saat kaymasına karşı 1 dk içeriden başla
  const baslangic = (d.simdiMs ?? Date.now)() - OTUZ_GUN_MS + 60_000;
  let sayfa: string | undefined;
  for (let i = 0; i < EN_FAZLA_SAYFA; i++) {
    const r = await d.iadeleriListele(baslangic, sayfa);
    if (!r.tamam) {
      d.kaydet("iade_listesi_hatasi", { durum: r.durum, hata: r.hata });
      return { ...s, durum: "hata", hata: `Play ${r.durum}: ${r.hata}` };
    }
    for (const v of r.veri.voidedPurchases ?? []) {
      if (!v?.purchaseToken) continue;
      s.okunan++;
      const ms = Number(v.voidedTimeMillis);
      const { data, error } = await d.iadeIsle({
        p_token: v.purchaseToken,
        p_iade_ms: Number.isFinite(ms) && ms > 0 ? ms : null,
        p_neden: typeof v.voidedReason === "number" ? v.voidedReason : null,
        p_kaynak: typeof v.voidedSource === "number" ? v.voidedSource : null,
      });
      if (error || !data) {
        s.hatali++;
        d.kaydet("iade_isleme_hatasi", { orderId: v.orderId ?? null, hata: error?.message ?? "boş yanıt" });
        continue;
      }
      if (data.durum === "iade_edildi") {
        s.iade_edildi++;
        s.geri_alinan_coin += Number(data.geri_alinan ?? 0);
        s.eksik_coin += Number(data.eksik ?? 0);
        if (Number(data.eksik ?? 0) > 0) {
          d.kaydet("iade_bakiye_yetmedi", { orderId: v.orderId ?? null, eksik: data.eksik });
        }
      } else if (data.durum === "zaten_iade") s.zaten_iade++;
      else s.bilinmiyor++;
    }
    sayfa = r.veri.tokenPagination?.nextPageToken;
    if (!sayfa) break;
  }
  return s;
}
