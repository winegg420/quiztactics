// ============================================================
// GERİ TUŞU ONAYI (Ida, 24 Eyl 2026) — Turnuva ve Grup maçında tarayıcı/telefon geri tuşu çıkış onayı açar.
//
// useGeriTusuOnayi(etkin, onGeri): `etkin` iken geçmişe aynı adresle bir "kilit" girdisi eklenir. Geri tuşu
// bu girdiyi tüketir (popstate) → kilit yeniden eklenir ve onGeri() çağrılır (sayfa onay penceresini açar);
// sayfa değişmez, maç sürer. `etkin` false olunca (maç bitti, terk edildi, sayfadan çıkıldı) kilit hâlâ en
// üstteyse geri alınır → geçmişte fazladan girdi kalmaz. Sunucudaki terk kuralına dokunmaz; yalnız arayüz.
// StrictMode'daki çift effect için: yeniden bağlanan effect mevcut kilidi kullanır, geri alma bir tik sonra
// ve yalnız hiçbir effect etkin değilse yapılır.
// ============================================================
import { useEffect, useRef } from "react";

const ISARET = "qtGeriKilidi";
let etkinKimlik = 0;   // şu an kilidi tutan effect (0 = yok)
let sayac = 0;

const kilitUstte = () => {
  try { return Boolean(window.history.state?.[ISARET]); } catch { return false; }
};
function kilitEkle() {
  try {
    window.history.pushState({ ...(window.history.state ?? {}), [ISARET]: true }, "", window.location.href);
  } catch (e) {
    console.warn("[Bildim] geri tuşu kilidi eklenemedi:", e?.message ?? e);
  }
}

export function useGeriTusuOnayi(etkin, onGeri) {
  const geriRef = useRef(onGeri);
  geriRef.current = onGeri;

  useEffect(() => {
    if (!etkin || typeof window === "undefined") return undefined;
    const benim = ++sayac;
    etkinKimlik = benim;
    if (!kilitUstte()) kilitEkle();
    const dinle = () => {
      if (etkinKimlik !== benim) return;
      // Geri tuşu kilidi tüketti (artık alttaki girdideyiz) → kilidi yeniden ekle, onay sor.
      if (!kilitUstte()) {
        kilitEkle();
        try { geriRef.current?.(); } catch (e) { console.error("[Bildim] geri tuşu onayı:", e); }
      }
    };
    window.addEventListener("popstate", dinle);
    return () => {
      window.removeEventListener("popstate", dinle);
      if (etkinKimlik === benim) etkinKimlik = 0;
      setTimeout(() => {
        if (etkinKimlik === 0 && kilitUstte()) {
          try { window.history.back(); } catch { /* geçmiş yok */ }
        }
      }, 0);
    };
  }, [etkin]);
}
