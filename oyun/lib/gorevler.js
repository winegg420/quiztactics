// ============================================================
// GÖREVLER (740–744) — istemci. Bütün mantık SUNUCUDA; istemci yalnız okur ve RPC çağırır.
//
// RPC'ler (yalnız authenticated):
//   gorevlerim() → { gunluk:{ yenilenme_sn, gorevler:[{ quest_id, ad_tr, ad_en, zorluk:'kolay'|'orta'|'zor', sayac, hedef,
//                    parametre, ilerleme, alindi, alinabilir, odul:{coin, sp} }] },
//                    haftalik:{ yenilenme_sn, gorevler:[… zorluk null …], sandik:{ tamam, hedef:3, alindi, alinabilir, sp,
//                    joker:{tur, adet} } }, alinabilir_sayi }       (volatile — ÖNBELLEĞE ALINMAZ)
//   gorev_al(p_kapsam 'gunluk'|'haftalik', p_quest_id) → { alindi, zaten, kapsam, quest_id, coin (gerçekten verilen), sp (gerçek|null) }
//   haftalik_sandik_al() → { alindi, zaten, sp, joker:{tur, adet} }
// Görev lig puanı VERMEZ (Ida): yalnız coin + SP (+ sandıkta joker). SP yalnız sezon sistemi açıkken işler.
// Bir alım sonrası `gorevTazele()` çağrılır: görev sayfası ve ana sayfa şeridi kendini yeniler.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { tt } from "./dil.js";
import { useAuth } from "../../src/context/AuthContext.jsx";

// Önbellek (anında açılış): son başarılı okuma kullanıcı kimliğine bağlı saklanır; sayfa onu hemen çizer, arka planda yeniler.
// `okunma` önbelleğe yazıldığı andır → geri sayım (yenilenme_sn − geçen süre) eski veride de doğru kalır.
const ONBELLEK_ANAHTAR = "bildim_gorevler:";
const ONBELLEK_OMUR_MS = 36 * 3600 * 1000;
function onbellekOku(uid) {
  try {
    if (!uid) return null;
    const o = JSON.parse(window.localStorage.getItem(ONBELLEK_ANAHTAR + uid) || "null");
    if (!o?.gunluk || !o?.haftalik || !(Date.now() - Number(o.okunma) < ONBELLEK_OMUR_MS)) return null;
    return o;
  } catch { return null; }
}
function onbellekYaz(uid, veri) {
  try { if (uid) window.localStorage.setItem(ONBELLEK_ANAHTAR + uid, JSON.stringify(veri)); } catch { /* dolu/engelli: önbellek şart değil */ }
}

const OLAY = "bildim-gorev-degisti";

/** Görevleri gösteren her yere "yeniden oku" der. */
export function gorevTazele() {
  try { window.dispatchEvent(new Event(OLAY)); } catch { /* pencere yok */ }
}

async function rpc(ad, arg) {
  const { data, error } = await supabase.rpc(ad, arg);
  if (error) throw error;
  return data;
}

/** Tam görev verisi. Hata fırlatır (çağıran kendi hata hâlini gösterir). */
export async function gorevlerimOku() {
  const d = await rpc("gorevlerim");
  if (!d || typeof d !== "object" || !d.gunluk || !d.haftalik) throw new Error("Görev verisi boş geldi");
  return d;
}

/** Bir görevin ödülünü al. */
export function gorevAl(kapsam, questId) {
  return rpc("gorev_al", { p_kapsam: kapsam, p_quest_id: questId });
}

/** Haftalık sandığı aç. */
export function sandikAl() {
  return rpc("haftalik_sandik_al");
}

/** Görev tamamlandı mı (alınmış ya da alınabilir). */
export const gorevTamam = (g) => Boolean(g?.alindi || g?.alinabilir || (Number(g?.ilerleme) >= Number(g?.hedef) && Number(g?.hedef) > 0));

/** Ana sayfa şeridi ve sayfa üstü için sayılar. */
export function gorevOzeti(veri) {
  const gun = veri?.gunluk?.gorevler ?? [];
  const hft = veri?.haftalik?.gorevler ?? [];
  return {
    gunTamam: gun.filter(gorevTamam).length,
    gunToplam: gun.length,
    hftTamam: hft.filter(gorevTamam).length,
    hftToplam: hft.length,
    alinabilir: Number(veri?.alinabilir_sayi) || 0,
  };
}

/**
 * Görev verisi hook'u: { veri, hata, yukle }.
 * Açılışta, sekme öne gelince, bağlantı dönünce ve `gorevTazele()` ile yeniden okur.
 * Hata olursa eski veri ekranda kalır (hata yalnız hiç veri yokken `hata=true`).
 */
export function useGorevler() {
  const { user } = useAuth();
  const uid = user?.id ?? null;
  const uidRef = useRef(uid);
  uidRef.current = uid;
  const [veri, setVeri] = useState(() => onbellekOku(uid));
  const [hata, setHata] = useState(false);
  const istek = useRef(0);
  const canli = useRef(true);

  const sonOkuma = useRef(0);
  // Kimlik sonradan gelirse (oturum geç çözülürse) önbellek o zaman okunur; taze veri varsa dokunulmaz.
  useEffect(() => { if (uid) setVeri((v) => v ?? onbellekOku(uid)); }, [uid]);

  const yukle = useCallback(async () => {
    const no = ++istek.current;
    try {
      const d = await gorevlerimOku();
      if (no !== istek.current || !canli.current) return;
      sonOkuma.current = Date.now();
      const taze = { ...d, okunma: Date.now() };
      setVeri(taze);
      setHata(false);
      onbellekYaz(uidRef.current, taze);
    } catch (e) {
      console.error("[Bildim] görevler alınamadı:", e?.message ?? e);
      if (no === istek.current && canli.current) setHata(true);
    }
  }, []);

  useEffect(() => {
    canli.current = true;
    yukle();
    const f = () => { yukle(); };
    // Sekme öne gelince: son başarılı okuma 60 sn'den yeniyse yeniden okunmaz (gorevlerim ağır bir RPC;
    // ilerleme bu cihazda yalnız maçla değişir, o da gorevTazele() / yeni açılışla okunur).
    const gorunur = () => { if (document.visibilityState === "visible" && Date.now() - sonOkuma.current > 60000) yukle(); };
    window.addEventListener(OLAY, f);
    window.addEventListener("online", f);
    document.addEventListener("visibilitychange", gorunur);
    return () => {
      canli.current = false;
      window.removeEventListener(OLAY, f);
      window.removeEventListener("online", f);
      document.removeEventListener("visibilitychange", gorunur);
    };
  }, [yukle]);

  return { veri, hata: hata && !veri, yukle };
}

/** "6 sa 12 dk" · "4 gün 6 sa" · "12 dk" — kalan saniyeden kısa süre metni. */
export function kalanMetni(sn) {
  const toplamDk = Math.max(1, Math.ceil(Math.max(0, sn) / 60));
  const gun = Math.floor(toplamDk / 1440);
  const saat = Math.floor((toplamDk % 1440) / 60);
  const dk = toplamDk % 60;
  if (gun >= 1) return tt("{g} gün {s} sa", { g: gun, s: saat });
  if (saat >= 1) return tt("{s} sa {d} dk", { s: saat, d: dk });
  return tt("{d} dk", { d: dk });
}

/**
 * Geri sayım: yenilenme_sn'yi okunma anından geriye sayar (dakikada bir güncellenir).
 * Süre bitince `bitti` çağrılır (veri yeniden okunur). Dönüş: kalan saniye.
 */
export function useKalanSn(yenilenmeSn, okunma, bitti) {
  const [simdi, setSimdi] = useState(() => Date.now());
  const bitiste = useRef(bitti);
  bitiste.current = bitti;
  useEffect(() => {
    const t = setInterval(() => setSimdi(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  const kalan = Math.max(0, Math.round(Number(yenilenmeSn ?? 0) - (simdi - Number(okunma ?? simdi)) / 1000));
  const bitti0 = useRef(false);
  useEffect(() => {
    if (yenilenmeSn == null) return;
    if (kalan <= 0 && !bitti0.current) { bitti0.current = true; try { bitiste.current?.(); } catch { /* yoksay */ } }
    if (kalan > 0) bitti0.current = false;
  }, [kalan, yenilenmeSn]);
  return kalan;
}
