// Satın alma doğrulama akışı — saf mantık, dış bağımlılık YOK.
// index.ts gerçek Play ve Supabase bağımlılıklarını verir; testler sahtelerini.
//
// Sıra: girdi → Play makbuzu → makbuz kuralları → katalog → coin/joker yazımı
//       (DB: jeton hesaptan bağımsız tekil, kilitli) → SUNUCUDA tüketim (consume).
// Tüketim başarısız olsa da coin yazılmıştır: yanıt `tuketildi:false` döner,
// istemci yedek olarak kendisi tüketir; hata defterde (`tuketim_hatasi`) kalır.
// Aynı hesap aynı jetonla tekrar gelirse coin yazılmaz, tüketim yeniden denenir.

import type { Makbuz, PlaySonuc } from "./play.ts";

export type RpcSonuc<T> = { data: T | null; error: { message: string } | null };

export type Bagimliliklar = {
  play: {
    urunGetir: (urun: string, jeton: string) => Promise<PlaySonuc<Makbuz>>;
    tuket: (urun: string, jeton: string) => Promise<PlaySonuc<unknown>>;
  };
  /** Ürün coin paketi mi (aktif), değilse eski joker yolu. */
  coinPaketiMi: (urun: string) => Promise<boolean>;
  coinKaydet: (p: {
    p_user: string;
    p_urun_id: string;
    p_token: string;
    p_order_id: string | null;
    p_satin_alma_turu: number | null;
    p_bolge: string | null;
    p_satin_alma_ms: number | null;
  }) => Promise<RpcSonuc<{ durum: "yeni" | "tekrar"; coin: number; bakiye: number; tuketildi: boolean }>>;
  jokerIsle: (p: { p_user: string; p_urun_id: string; p_play_token: string }) => Promise<RpcSonuc<unknown>>;
  tuketimYaz: (jeton: string, hata: string | null) => Promise<RpcSonuc<unknown>>;
  kaydet: (olay: string, ayrinti: Record<string, unknown>) => void;
};

export type Yanit = { durum: number; govde: Record<string, unknown> };

const URUN_KALIBI = /^[a-z0-9][a-z0-9._]{0,99}$/;

/** Play'e verilecek hesap kimliği: kullanıcı kimliğinin SHA-256 özeti (64 hex, kişisel veri değil). */
export async function hesapKimligi(userId: string): Promise<string> {
  const ozet = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(userId));
  return Array.from(new Uint8Array(ozet), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function girdiDogrula(govde: unknown): { urun_id: string; purchase_token: string } | string {
  const g = (govde ?? {}) as Record<string, unknown>;
  const urun = typeof g.urun_id === "string" ? g.urun_id.trim() : "";
  const jeton = typeof g.purchase_token === "string" ? g.purchase_token.trim() : "";
  if (!urun || !jeton) return "urun_id ve purchase_token zorunlu";
  if (!URUN_KALIBI.test(urun)) return "Geçersiz ürün kimliği";
  if (jeton.length > 2000) return "Geçersiz satın alma jetonu";
  return { urun_id: urun, purchase_token: jeton };
}

/** Makbuzun coin'e çevrilebilir olup olmadığı. null = uygun. */
export function makbuzDegerlendir(makbuz: Makbuz, beklenenHesap: string): Yanit | null {
  if (makbuz.purchaseState !== 0) {
    return { durum: 402, govde: { hata: "Satın alma tamamlanmamış", durum: makbuz.purchaseState ?? null } };
  }
  // Play satın almayı bir hesaba bağlamışsa (obfuscatedAccountId) bu hesap olmalı.
  // Bugün TWA/Digital Goods API bu alanı göndermiyor; alan yoksa jetonun
  // hesaptan bağımsız tekilliği (DB) korur: ilk işleyen hesap sahibidir.
  const bagli = makbuz.obfuscatedExternalAccountId;
  if (bagli && bagli !== beklenenHesap) {
    return { durum: 403, govde: { hata: "Bu satın alma başka bir hesaba ait" } };
  }
  if ((makbuz.quantity ?? 1) !== 1) {
    return { durum: 400, govde: { hata: "Çoklu adet satın alma desteklenmiyor" } };
  }
  return null;
}

function rpcHataDurumu(mesaj: string): number {
  if (/başka bir hesaba ait|başka bir jetonla/i.test(mesaj)) return 403;
  if (/zaten işlendi|iade edilmiş|duplicate key/i.test(mesaj)) return 409;
  return 400;
}

export async function satinAlmaDogrula(
  userId: string,
  govde: unknown,
  d: Bagimliliklar,
): Promise<Yanit> {
  const girdi = girdiDogrula(govde);
  if (typeof girdi === "string") return { durum: 400, govde: { hata: girdi } };
  const { urun_id, purchase_token } = girdi;

  const play = await d.play.urunGetir(urun_id, purchase_token);
  if (!play.tamam) {
    d.kaydet("play_dogrulama_hatasi", { userId, urun_id, durum: play.durum, hata: play.hata });
    return { durum: 402, govde: { hata: "Satın alma doğrulanamadı", detay: play.hata } };
  }
  const makbuz = play.veri;

  const red = makbuzDegerlendir(makbuz, await hesapKimligi(userId));
  if (red) {
    d.kaydet("makbuz_reddedildi", { userId, urun_id, orderId: makbuz.orderId ?? null, ...red.govde });
    return red;
  }

  // Hangi yazım yolu? Ürün kimliği değil KATALOG karar verir.
  const coinMi = await d.coinPaketiMi(urun_id);

  let bakiye: unknown = null;
  let tekrar = false;
  let zatenTuketildi = makbuz.consumptionState === 1;

  if (coinMi) {
    const ms = Number(makbuz.purchaseTimeMillis);
    const { data, error } = await d.coinKaydet({
      p_user: userId,
      p_urun_id: urun_id,
      p_token: purchase_token,
      p_order_id: makbuz.orderId ?? null,
      p_satin_alma_turu: typeof makbuz.purchaseType === "number" ? makbuz.purchaseType : null,
      p_bolge: makbuz.regionCode ?? null,
      p_satin_alma_ms: Number.isFinite(ms) && ms > 0 ? ms : null,
    });
    if (error || !data) {
      const mesaj = error?.message ?? "Satın alma kaydedilemedi";
      d.kaydet("coin_kayit_hatasi", { userId, urun_id, orderId: makbuz.orderId ?? null, hata: mesaj });
      return { durum: rpcHataDurumu(mesaj), govde: { hata: mesaj } };
    }
    bakiye = data.bakiye;
    tekrar = data.durum === "tekrar";
    zatenTuketildi = zatenTuketildi || data.tuketildi === true;
  } else {
    // Eski joker yolu (satin_alma_isle) — davranışı değişmedi.
    const { data, error } = await d.jokerIsle({ p_user: userId, p_urun_id: urun_id, p_play_token: purchase_token });
    if (error) {
      d.kaydet("joker_kayit_hatasi", { userId, urun_id, hata: error.message });
      return { durum: rpcHataDurumu(error.message), govde: { hata: error.message } };
    }
    bakiye = data;
  }

  // --- Sunucuda tüketim (consume). Tüketim onayı da kapsar; onaylanmayan
  // satın almayı Google 3 gün sonra iade eder. ---
  let tuketildi = zatenTuketildi;
  if (!tuketildi) {
    let hata: string | null = null;
    try {
      const t = await d.play.tuket(urun_id, purchase_token);
      if (t.tamam) tuketildi = true;
      else hata = `Play ${t.durum}: ${t.hata}`;
    } catch (e) {
      hata = e instanceof Error ? e.message : String(e);
    }
    if (hata) d.kaydet("tuketim_hatasi", { userId, urun_id, orderId: makbuz.orderId ?? null, hata });
    if (coinMi) {
      const { error } = await d.tuketimYaz(purchase_token, hata);
      if (error) d.kaydet("tuketim_yazim_hatasi", { userId, urun_id, hata: error.message });
    }
  } else if (coinMi && makbuz.consumptionState === 1) {
    // Play'de tüketilmiş ama defter bilmiyor olabilir (ör. istemci yedeği tüketti)
    const { error } = await d.tuketimYaz(purchase_token, null);
    if (error) d.kaydet("tuketim_yazim_hatasi", { userId, urun_id, hata: error.message });
  }

  return { durum: 200, govde: { tamam: true, sonuc: bakiye, tekrar, tuketildi } };
}
