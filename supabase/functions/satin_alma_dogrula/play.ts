// Google Play Developer API istemcisi — dış bağımlılık YOK.
// Deno (Edge Function) ve Node (testler, sahte fetch ile) aynı dosyayı kullanır.
//
// Kullanılan uçlar (androidpublisher v3):
//   GET  …/purchases/products/{urun}/tokens/{jeton}            → makbuz
//   POST …/purchases/products/{urun}/tokens/{jeton}:consume    → tüketim (onayı da kapsar)
//   GET  …/purchases/voidedpurchases                           → iade/iptal listesi (son 30 gün)

export type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export type ServisHesabi = { client_email: string; private_key: string };

const API = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/";

function b64url(bayt: Uint8Array): string {
  let s = "";
  for (const b of bayt) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Servis hesabı JSON'undan Google erişim jetonu (JWT bearer akışı). */
export async function googleErisimJetonu(sa: ServisHesabi, fetchFn: FetchFn = fetch): Promise<string> {
  const simdi = Math.floor(Date.now() / 1000);
  const kodla = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const govde = `${kodla({ alg: "RS256", typ: "JWT" })}.${kodla({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    exp: simdi + 3600,
    iat: simdi,
  })}`;

  const ham = sa.private_key.replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const ikili = Uint8Array.from(atob(ham), (c) => c.charCodeAt(0));
  const anahtar = await crypto.subtle.importKey(
    "pkcs8",
    ikili,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const imza = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", anahtar, new TextEncoder().encode(govde));

  const cevap = await fetchFn("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${govde}.${b64url(new Uint8Array(imza))}`,
    }),
  });
  if (!cevap.ok) {
    throw new Error("Google jetonu alınamadı: " + (await cevap.text()).slice(0, 200));
  }
  const veri = await cevap.json();
  if (!veri?.access_token) throw new Error("Google jetonu boş döndü");
  return veri.access_token as string;
}

/** Play yanıtı: tamam değilse `hata` Play'in döndürdüğü metnin başı. */
export type PlaySonuc<T> = { tamam: true; veri: T } | { tamam: false; durum: number; hata: string };

export type Makbuz = {
  purchaseState?: number; // 0 satın alındı, 1 iptal, 2 beklemede
  consumptionState?: number; // 0 tüketilmedi, 1 tüketildi
  acknowledgementState?: number; // 0 onaylanmadı, 1 onaylandı
  orderId?: string;
  purchaseType?: number; // yok = gerçek; 0 test, 1 promosyon, 2 ödüllü
  purchaseTimeMillis?: string;
  regionCode?: string;
  quantity?: number;
  obfuscatedExternalAccountId?: string;
};

export type IadeKaydi = {
  purchaseToken: string;
  orderId?: string;
  voidedTimeMillis?: string;
  voidedReason?: number;
  voidedSource?: number;
};

export function playIstemcisi(paket: string, erisimJetonu: string, fetchFn: FetchFn = fetch) {
  const kok = `${API}${encodeURIComponent(paket)}/purchases/`;
  const baslik = { Authorization: `Bearer ${erisimJetonu}` };

  async function cagir<T>(url: string, init: RequestInit = {}): Promise<PlaySonuc<T>> {
    const cevap = await fetchFn(url, { ...init, headers: { ...baslik, ...(init.headers ?? {}) } });
    const metin = await cevap.text();
    if (!cevap.ok) return { tamam: false, durum: cevap.status, hata: metin.slice(0, 300) };
    let veri = {} as T;
    if (metin.trim()) {
      try {
        veri = JSON.parse(metin) as T;
      } catch {
        return { tamam: false, durum: 502, hata: "Play yanıtı JSON değil" };
      }
    }
    return { tamam: true, veri };
  }

  const urunYolu = (urun: string, jeton: string) =>
    `${kok}products/${encodeURIComponent(urun)}/tokens/${encodeURIComponent(jeton)}`;

  return {
    urunGetir: (urun: string, jeton: string) => cagir<Makbuz>(urunYolu(urun, jeton)),
    tuket: (urun: string, jeton: string) => cagir<unknown>(`${urunYolu(urun, jeton)}:consume`, { method: "POST" }),
    iadeleriListele: (baslangicMs: number, sayfa?: string) => {
      const p = new URLSearchParams({ startTime: String(baslangicMs), maxResults: "1000", type: "0" });
      if (sayfa) p.set("token", sayfa);
      return cagir<{ voidedPurchases?: IadeKaydi[]; tokenPagination?: { nextPageToken?: string } }>(
        `${kok}voidedpurchases?${p}`,
      );
    },
  };
}

export type PlayIstemcisi = ReturnType<typeof playIstemcisi>;
