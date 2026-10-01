// Quiz Tactics tasarım sistemi — HAREKET YARDIMCILARI.
// CSS tarafı: oyun/tasarim/hareket.css (qt-h-* sınıfları). Buradaki süreler
// CSS'teki animasyonlarla eşleşir; zamanlayıcı kuran ekranlar bunları kullanır.
// Oyun hissi (1 Eki 2026): dokunuş/ödül hissinin TEK KAPISI (dokunus, odulHissi, titresim) ve sıralı giriş yardımcıları da burada.
import { useEffect, useState } from "react";
import { sesAcikMi, sesDokunus, sesCoin, sesRozet, sesSatinAlma } from "../lib/ses.js";

/** 50:50 kırılma animasyonunun toplam süresi (ms). Bu süre sonunda şıkkı "elendi"ye çevir. */
export const QT_KIRILMA_MS = 760;
/** Doğru/yanlış anı animasyonu (ms). */
export const QT_AN_MS = 420;
/** Soru kartı çıkışı (Soru Değiştir) — yeni soruyu bu süreden sonra koy. */
export const QT_KART_CIKIS_MS = 200;

/** Kullanıcı azaltılmış hareket istiyor mu? (JS ile hareket eden yerler için) */
export function hareketAzaltildiMi() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Aynı CSS animasyonunu yeniden oynatır (sınıfı kaldır → yeniden hesaplat → ekle).
 * React'te çoğu zaman `key` değiştirmek yeterlidir; bu, DOM'a doğrudan erişilen yerler içindir.
 */
export function animasyonuYenidenOynat(el, sinifAdi) {
  if (!el) return;
  el.classList.remove(sinifAdi);
  void el.offsetWidth; // yeniden yerleşimi zorla
  el.classList.add(sinifAdi);
}

const TITRESIM = {
  dokunus: [8],
  dogru: [14, 50, 22],
  yanlis: [45],
  sayac: [12],
  skill: [10, 30, 10],
  kirilma: [18, 40, 18],
};

/**
 * Dokunsal his TEK KAPISI (titreşim ayrı ayar değildir; "Efektler" anahtarına bağlıdır — Ida, 1 Eki 2026):
 * Efektler açık + hareket azaltılmamış + sayfaya en az bir kez dokunulmuş (yoksa Chrome engelleyip konsola yazar).
 */
export function hisAcikMi() {
  try {
    if (!sesAcikMi() || hareketAzaltildiMi()) return false;
    if (typeof navigator === "undefined") return false;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return false;
    return true;
  } catch {
    return false;
  }
}

/**
 * Haptik geri bildirim (Android / TWA). iOS Safari desteklemez; sessizce geçer.
 * tur: dokunus · dogru · yanlis · sayac (son 5 sn, saniyede bir) · skill · kirilma
 * Kapıyı kendi denetler (hisAcikMi): Efektler kapalıyken ya da hareket azaltılmışken çalmaz — çağıran ayrıca bakmaz.
 */
export function titresim(tur = "dokunus") {
  try {
    if (!hisAcikMi() || typeof navigator.vibrate !== "function") return false;
    return navigator.vibrate(TITRESIM[tur] ?? TITRESIM.dokunus);
  } catch {
    return false;
  }
}

/**
 * Dokunuş hissi: kısa ses + kısa titreşim. YALNIZ seçim ve eylem düğmelerinde çağır (mod kartı, satın al, kabul, al).
 * Gezinme, sekme ve geri düğmesinde çağırma (alt menünün kendi sayfa geçiş sesi var).
 */
export function dokunus() {
  try { sesDokunus(); } catch { /* ses kritik değil */ }
  return titresim("dokunus");
}

const ODUL_HISSI = {
  odul: [sesCoin, "dogru"],          // coin / görev ödülü
  buyuk: [sesRozet, "kirilma"],      // sandık, kozmetik, lig yükselişi
  satinAlma: [sesSatinAlma, "dogru"],
};

/** Ödül anı hissi: ses + titreşim tek çağrıda. tur: odul · buyuk · satinAlma */
export function odulHissi(tur = "odul") {
  const [ses, titreme] = ODUL_HISSI[tur] ?? ODUL_HISSI.odul;
  try { ses(); } catch { /* ses kritik değil */ }
  return titresim(titreme);
}

/** Üst çubuktaki coin hapının seçicisi (ziplat hedefi). */
export const QT_COIN_HAPI = ".bd-coin-hap";

/**
 * Bir öğeyi yerleşimini değiştirmeden tek kez zıplatır (.qt-h-zipla-an). hedef: öğe ya da CSS seçici.
 * Ödül anında üst çubuktaki coin hapı için: ziplat(QT_COIN_HAPI). Azaltılmış harekette bir şey yapmaz.
 */
export function ziplat(hedef) {
  try {
    if (hareketAzaltildiMi()) return;
    const el = typeof hedef === "string" ? document.querySelector(hedef) : hedef;
    if (!el) return;
    animasyonuYenidenOynat(el, "qt-h-zipla-an");
    const bitti = (e) => {
      if (e.target !== el) return;   // çocuğun animasyonu değil
      el.classList.remove("qt-h-zipla-an");
      el.removeEventListener("animationend", bitti);
    };
    el.addEventListener("animationend", bitti);
  } catch { /* öğe yok: görsel ipucu, kritik değil */ }
}

const SIRALI_EN_COK = 8;   // sıralı girişte gecikme alan öğe sayısı (8 × 60 ms = 480 ms); sonrası gecikmesiz

/** Sıralı giriş için öğe stili: <li className={sirali} style={siraStili(i)}>. İlk 8 öğe 60 ms arayla, kalanlar gecikmesiz. */
export function siraStili(i) {
  return { "--sira": i >= 0 && i < SIRALI_EN_COK ? i : 0 };
}

/**
 * Sıralı giriş sınıfını YALNIZ ilk açılışta verir: içerik hazır olunca "qt-h-sirali", giriş bitince "".
 * Sonradan eklenen öğeler (sekme değişimi, veri yenileme) sınıfı almaz → giriş yeniden oynamaz.
 * hazir: içerik çizildi mi (veri yüklenene kadar false ver).
 */
export function useSiraliGiris(hazir = true, sureMs = 900) {
  const [bitti, setBitti] = useState(false);
  useEffect(() => {
    if (!hazir || bitti) return undefined;
    const t = setTimeout(() => setBitti(true), sureMs);
    return () => clearTimeout(t);
  }, [hazir, bitti, sureMs]);
  return bitti ? "" : "qt-h-sirali";
}
