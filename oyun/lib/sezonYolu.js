// ============================================================
// SEZON YOLU (Battle Pass, 720) — istemci. Bütün mantık SUNUCUDA; istemci yalnız okur ve RPC çağırır.
//
// RPC'ler (yalnız authenticated):
//   sezon_ozetim()            → { gorunur, sezon, seviye, seviye_sayisi, sp, onceki_esik, sonraki_esik|null, bp, alinabilir }
//   sezon_yolu_durumum()      → { gorunur, acik, test, sahip, sezon:{id,no,baslangic,bitis,kalan_gun}, sp, seviye,
//                                 seviye_sayisi, esikler[], onceki_esik, sonraki_esik|null,
//                                 bp:{aktif, satin_alma_at, fiyat, sp_carpan}, elmas,
//                                 oduller:[{seviye, kol:'ucretsiz'|'ucretli', tur, veri, placeholder, ad_tr, ad_en,
//                                           nadirlik, alindi, alinabilir}],
//                                 bonus_gorev:{hedef, ilerleme, sp, alindi}, final_unvan:{anahtar, ad_tr, ad_en, kazanildi},
//                                 bugun_mac_sp, gunluk_mac_tavan }
//   bp_satin_al()             → { ok, elmas_bakiye, verilen:[ödül satırı] }   hata: 'Yetersiz elmas' | 'Battle Pass zaten sende'
//   bp_odul_al(p_seviye, p_kol) → { ok, odul }                                hata: 'Bu ödülü zaten aldın' | …
//   bp_toplu_al()             → { ok, verilen:[…] }
//   bp_bonus_gorev_al()       → { ok, sp }
//   sezon_sahip_sp_ekle(p_miktar) / sezon_sahip_test_sifirla()   (yalnız sahip, sistem kapalıyken test sezonu)
// Kartlar: oyuncu_kartlari.sezon_bp (altın halka) ve isim_efekti = 'isim_altin' (BP sahibi).
// ============================================================
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { oyuncuKartiUnut } from "./cerceve.js";
import { elmasTazele } from "./elmas.js";
import { coinTazele } from "./coin.js";

const OLAY = "bildim-sezon-degisti";
let sonOzet = null;          // son okunan özet (rozet, bildirim ve maç sonu aynı veriyi kullanır)
let bekleyen = null;

/** Sezon Yolu verisini gösteren her yere "yeniden oku" der. */
export function sezonTazele() {
  sonOzet = null;
  try { window.dispatchEvent(new Event(OLAY)); } catch { /* pencere yok */ }
}

async function rpc(ad, arg) {
  const { data, error } = await supabase.rpc(ad, arg);
  if (error) throw error;
  return data;
}

/** Hafif özet (üst çubuk rozeti). Hata olursa null; aynı anda gelen istekler tek çağrıda birleşir. */
export async function sezonOzeti({ taze = false } = {}) {
  if (!taze && sonOzet) return sonOzet;
  if (bekleyen) return bekleyen;
  bekleyen = (async () => {
    try {
      sonOzet = await rpc("sezon_ozetim");
      return sonOzet;
    } catch (e) {
      console.error("[Bildim] sezon özeti alınamadı:", e?.message ?? e);
      return null;
    } finally {
      bekleyen = null;
    }
  })();
  return bekleyen;
}

/** Son okunan özet (senkron; yoksa null). */
export function sezonOzetiOnbellek() {
  return sonOzet;
}

/** Özet hook'u: { ozet, tazele }. Sezon değişince (satın alma, ödül, maç sonu) kendini yeniler. */
export function useSezonOzeti() {
  const [ozet, setOzet] = useState(sonOzet);
  const oku = useCallback(async () => setOzet(await sezonOzeti({ taze: true })), []);
  useEffect(() => {
    let iptal = false;
    sezonOzeti().then((o) => { if (!iptal) setOzet(o); });
    const f = () => { sezonOzeti({ taze: true }).then((o) => { if (!iptal) setOzet(o); }); };
    window.addEventListener(OLAY, f);
    return () => { iptal = true; window.removeEventListener(OLAY, f); };
  }, []);
  return { ozet, tazele: oku };
}

/** Tam sayfa verisi. Hata fırlatır (sayfa kendi hata hâlini gösterir). */
export async function sezonDurumu() {
  return rpc("sezon_yolu_durumum");
}

function sonrasiTazele(userId) {
  sezonTazele();
  elmasTazele();
  coinTazele();
  oyuncuKartiUnut(userId);   // altın isim + altın halka anında görünsün
}

/** Battle Pass satın al (elmas). Dönüş: { ok, elmas_bakiye, verilen } */
export async function bpSatinAl(userId) {
  const d = await rpc("bp_satin_al");
  sonrasiTazele(userId);
  return d;
}

/** Tek yuvayı al. Dönüş: { ok, odul } */
export async function bpOdulAl(seviye, kol, userId) {
  const d = await rpc("bp_odul_al", { p_seviye: seviye, p_kol: kol });
  sonrasiTazele(userId);
  return d;
}

/** Hak edilen bütün yuvaları al. Dönüş: { ok, verilen } */
export async function bpTopluAl(userId) {
  const d = await rpc("bp_toplu_al");
  sonrasiTazele(userId);
  return d;
}

/** BP günlük bonus görevi. Dönüş: { ok, sp } */
export async function bpBonusGorevAl() {
  const d = await rpc("bp_bonus_gorev_al");
  sezonTazele();
  return d;
}

/** Sahip test: SP ekle (yalnız sistem kapalıyken). */
export async function sahipSpEkle(miktar) {
  const d = await rpc("sezon_sahip_sp_ekle", { p_miktar: miktar });
  sezonTazele();
  return d;
}

/** Sahip test: kendi test sezonu kaydını sıfırla (BP elması iade edilir). */
export async function sahipTestSifirla(userId) {
  const d = await rpc("sezon_sahip_test_sifirla");
  sonrasiTazele(userId);
  return d;
}

/** Ödülün oyuncuya görünen adı (dil: 'tr' | 'en'). */
export function odulAdi(odul, dil = "tr") {
  if (!odul) return "";
  return (dil === "en" ? odul.ad_en : odul.ad_tr) || odul.ad_tr || "";
}

/** Sonraki seviyeye ilerleme oranı 0..1 (son seviyede 1). */
export function seviyeOrani(o) {
  if (!o) return 0;
  if (o.sonraki_esik == null) return 1;
  const alt = Number(o.onceki_esik ?? 0);
  const ust = Number(o.sonraki_esik);
  if (ust <= alt) return 1;
  return Math.max(0, Math.min(1, (Number(o.sp ?? 0) - alt) / (ust - alt)));
}
