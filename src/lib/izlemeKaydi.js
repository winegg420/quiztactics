// ============================================================
// İZLEME KAYDI (Paket 4, 14 Eki 2026 — migration 1097)
//
// Yakalanmamış JS hataları, React sınırı hataları ve başarısız Supabase çağrıları
// (rpc/rest) → public.istemci_hata; temel olaylar (giris, kurulum, davet_eslesti)
// → public.olay_kaydi. Tek yazma yolu: istemci_kayit_yaz RPC'si (yalnız authenticated).
//
// HAFİFLİK (nano veritabanı):
//   • Kuyruk bellekte; ilk kayıttan 15 sn sonra ya da sayfa gizlenince TEK çağrıyla gönderilir.
//     Sürekli yoklama yok; boş kuyrukta hiç istek yok.
//   • Aynı hata aynı oturumda 1 kez (burada + sunucuda unique); dakikada en çok 5 hata.
//   • Kaydın kendisi başarısız olursa yeniden denenmez ve hata olarak kaydedilmez (döngü yok).
//   • Oturum yoksa (giriş öncesi tanıtım/kurulum sayfası) hatalar atılır — Ida kararı.
// GİZLİLİK: mesaj ve sayfa hataIzleme.temizleMetin'den geçer (e-posta, davet kodu, UUID);
// sayfanın sorgu dizgisi gönderilmez. Sunucu aynı temizliği bir kez daha yapar.
// ============================================================
import { supabase, supabaseHazir } from "./supabase.js";
import { temizleMetin } from "./hataIzleme.js";
import { cihazTipi, uygulamaIcindeMi } from "./uygulamaKipi.js";

const BEKLEME_MS = 15000;
const DAKIKA_HATA = 5;
const PAKET = 10;
const OTURUM_ANAHTARI = "qt_izleme_oturum";
const KURULUM_BEKLEYEN = "qt_izleme_kurulum_bekliyor";
const KURULUM_BILDIRILDI = "qt_izleme_kurulum_bildirildi";
export const KAYIT_RPC = "istemci_kayit_yaz";

let hatalar = [];
let olaylar = [];
const gorulenHata = new Set();
const gorulenOlay = new Set();
let dakikaBasi = 0;
let dakikaSayi = 0;
let zamanlayici = null;
let gonderiliyor = false;
let kuruldu = false;

const surum = () => {
  try { return typeof __QT_SURUM__ !== "undefined" ? String(__QT_SURUM__) : "bilinmiyor"; } catch { return "bilinmiyor"; }
};

/** Sekme oturumu kimliği (sessionStorage; yoksa bellekte). Aynı-hata-tek-kez bu kimliğe göre. */
let bellekOturum = null;
export function oturumKimligi() {
  try {
    let id = window.sessionStorage.getItem(OTURUM_ANAHTARI);
    if (!id) { id = crypto.randomUUID(); window.sessionStorage.setItem(OTURUM_ANAHTARI, id); }
    return id;
  } catch {
    if (!bellekOturum) {
      try { bellekOturum = crypto.randomUUID(); } catch { bellekOturum = "00000000-0000-4000-8000-" + String(Date.now()).padStart(12, "0").slice(-12); }
    }
    return bellekOturum;
  }
}

const sayfaYolu = () => {
  try { return temizleMetin(window.location.pathname).slice(0, 120); } catch { return "/"; }
};

function planla() {
  if (zamanlayici || typeof window === "undefined") return;
  zamanlayici = window.setTimeout(() => { zamanlayici = null; gonder(); }, BEKLEME_MS);
}

/**
 * Hata kaydı. tur: js | soz | react | rpc | rest. Aynı (tur, sayfa, mesaj) oturumda bir kez;
 * dakikada en çok 5. Hiçbir koşulda fırlatmaz.
 */
export function hataKaydet(tur, mesaj, sayfa) {
  try {
    if (!supabaseHazir) return;
    const m = temizleMetin(String(mesaj ?? "")).trim().slice(0, 300);
    if (!m) return;
    const s = sayfa ? temizleMetin(String(sayfa)).split("?")[0].slice(0, 120) : sayfaYolu();
    const imza = `${tur}|${s}|${m}`;
    if (gorulenHata.has(imza)) return;
    const simdi = Date.now();
    if (simdi - dakikaBasi > 60000) { dakikaBasi = simdi; dakikaSayi = 0; }
    if (dakikaSayi >= DAKIKA_HATA) return;
    dakikaSayi++;
    gorulenHata.add(imza);
    hatalar.push({ tur, sayfa: s, mesaj: m });
    if (hatalar.length > PAKET) hatalar = hatalar.slice(-PAKET);
    planla();
  } catch { /* kayıt oyunu asla bozmaz */ }
}

/** Olay kaydı (giris | kurulum | davet_eslesti). Aynı olay+anahtar oturumda bir kez. */
export function olayKaydet(olay, anahtar = "") {
  try {
    if (!supabaseHazir) return;
    const a = String(anahtar ?? "").slice(0, 64);
    const k = `${olay}|${a}`;
    if (gorulenOlay.has(k)) return;
    gorulenOlay.add(k);
    olaylar.push({ olay, anahtar: a });
    if (olaylar.length > PAKET) olaylar = olaylar.slice(-PAKET);
    planla();
  } catch { /* sessiz */ }
}

/** Kuyruğu tek çağrıyla gönderir. Oturum yoksa hatalar atılır, olaylar oturum gelene kadar bekler. */
export async function gonder() {
  if (gonderiliyor || !supabaseHazir || (!hatalar.length && !olaylar.length)) return;
  gonderiliyor = true;
  try {
    const { data } = await supabase.auth.getSession();
    if (!data?.session) { hatalar = []; return; }
    const h = hatalar; const o = olaylar;
    hatalar = []; olaylar = [];
    const { error } = await supabase.rpc(KAYIT_RPC, {
      p_oturum: oturumKimligi(), p_surum: surum(), p_cihaz: cihazTipi(), p_hatalar: h, p_olaylar: o,
    });
    if (error) console.warn("[İzleme] kayıt gönderilemedi:", error.message);
  } catch (e) {
    console.warn("[İzleme] kayıt gönderilemedi:", e?.message ?? e);
  } finally {
    gonderiliyor = false;
  }
}

// Tarayıcı eklentisi, çapraz köken "Script error." ve bilinen zararsız gürültü kaydedilmez.
function gurultuMu(mesaj, dosya) {
  if (!mesaj || mesaj === "Script error." || mesaj === "Script error") return true;
  if (/ResizeObserver loop/i.test(mesaj)) return true;
  if (dosya && /^(chrome|moz|safari)(-web)?-extension:/i.test(dosya)) return true;
  return false;
}

/** Supabase fetch sarmalayıcısından çağrılır: başarısız rpc/rest yanıtı. */
export function supabaseHatasiKaydet(adres, yanit) {
  try {
    if (!adres || adres.includes(`/rpc/${KAYIT_RPC}`)) return;
    const m = /\/rest\/v1\/(rpc\/)?([^?/]+)/.exec(adres);
    if (!m) return;
    const tur = m[1] ? "rpc" : "rest";
    const ad = m[2];
    if (yanit instanceof Error) {
      if (yanit.name === "AbortError") return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;   // çevrimdışı gürültü
      hataKaydet(tur, `${ad} ağ: ${yanit.message || yanit.name}`);
      return;
    }
    // Gövde kopyadan okunur; çağıranın yanıtına dokunulmaz.
    yanit.clone().json().then(
      (g) => {
        if (g?.code === "PGRST116") return;   // .single() satır bulamadı — çağıran bekliyor, hata değil
        hataKaydet(tur, `${ad} ${yanit.status}${g?.code ? " " + g.code : ""}: ${g?.message ?? ""}`.trim());
      },
      () => hataKaydet(tur, `${ad} ${yanit.status}`),
    );
  } catch { /* sessiz */ }
}

/** main.jsx'ten bir kez: global hata dinleyicileri + kurulum olayı. */
export function izlemeKur() {
  if (kuruldu || typeof window === "undefined" || !supabaseHazir) return;
  kuruldu = true;
  try {
    window.addEventListener("error", (e) => {
      const mesaj = e?.error?.message || e?.message;
      if (gurultuMu(mesaj, e?.filename)) return;
      hataKaydet("js", `${e?.error?.name ? e.error.name + ": " : ""}${mesaj}`);
    });
    window.addEventListener("unhandledrejection", (e) => {
      const r = e?.reason;
      const mesaj = r?.message || (typeof r === "string" ? r : "");
      if (gurultuMu(mesaj)) return;
      hataKaydet("soz", `${r?.name ? r.name + ": " : ""}${mesaj}`);
    });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") gonder(); });

    // Kurulum: tarayıcıda appinstalled genelde girişsiz tanıtım sayfasında olur → bayrak bırakılır;
    // uygulamanın cihazdaki ilk açılışı (iOS dahil) olayı tek kez yazar. Anahtar = cihaz tipi.
    window.addEventListener("appinstalled", () => {
      try { window.localStorage.setItem(KURULUM_BEKLEYEN, "1"); } catch { /* özel mod */ }
    });
    let bildirildi = false;
    try { bildirildi = window.localStorage.getItem(KURULUM_BILDIRILDI) === "1"; } catch { bildirildi = true; }
    if (!bildirildi && (uygulamaIcindeMi() || localStorage.getItem(KURULUM_BEKLEYEN) === "1")) {
      supabase.auth.onAuthStateChange((_olay, oturum) => {
        if (!oturum || bildirildi) return;
        bildirildi = true;
        try { localStorage.setItem(KURULUM_BILDIRILDI, "1"); localStorage.removeItem(KURULUM_BEKLEYEN); } catch { /* sessiz */ }
        olayKaydet("kurulum", cihazTipi());
      });
    }
  } catch { /* dinleyici kurulamazsa oyun etkilenmez */ }
}

/** Test için: iç durumu sıfırlar. */
export function _sifirla() {
  hatalar = []; olaylar = []; gorulenHata.clear(); gorulenOlay.clear(); dakikaBasi = 0; dakikaSayi = 0;
  if (zamanlayici) { clearTimeout(zamanlayici); zamanlayici = null; }
}
export function _kuyruk() { return { hatalar: [...hatalar], olaylar: [...olaylar] }; }
