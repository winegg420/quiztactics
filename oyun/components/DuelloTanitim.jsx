import { useState } from "react";
import { createPortal } from "react-dom";
import Ikon from "./Ikon.jsx";
import { tt } from "../lib/dil.js";
import { tt2 } from "./DuelloV2.jsx";

/**
 * Paket 20 IV.1 — Düello'ya ilk girişte kısa, atlanabilir tanıtım (4 adım).
 * Maçın İÇİNDE değil, "Rakip ara"ya ilk basışta açılır: sayaç işlemezken okunur.
 * Bir kez gösterilir; kapatınca / "Geç" deyince saklanır. Lobi altındaki "Kurallar" yeniden açar.
 * Katman position:fixed, transform yok (iOS).
 */
const DEPO = "bildim_duello_tanitim_v1";
// Düello 1.0 (surum = 2) kuralları farklı: eskiyi görmüş oyuncuya yeni tanıtım bir kez daha açılır.
const DEPO_V2 = "bildim_duello_tanitim_v2";
const depo = (surum) => (surum === 2 ? DEPO_V2 : DEPO);

export function duelloTanitimGoruldu(surum = 1) {
  try { return localStorage.getItem(depo(surum)) === "1"; } catch (e) { console.warn("[Bildim] localStorage okunamadı:", e?.message ?? e); return false; }
}
function isaretle(surum) {
  try { localStorage.setItem(depo(surum), "1"); } catch (e) { console.warn("[Bildim] localStorage yazılamadı:", e?.message ?? e); }
}

const ADIMLAR = [
  { ikon: "uyari", baslik: "3 can", metin: "Savunmada yanlış bilirsen ya da süren dolarsa can kaybedersin. Canı biten kaybeder; en çok 10 tur." },
  { ikon: "kilic", baslik: "Sırayla saldır, savun", metin: "Her turda önce biri, sonra öbürü saldırır. Tur her zaman iki tarafça tamamlanır: canı biten rakip de o turdaki saldırısını yapar (eşit hamle kuralı)." },
  { ikon: "kalkan", baslik: "Saldırı riski", metin: "Rakibin EN ZAYIF kategorisi maç başında sabitlenir (yüzdeler eşitse biri seçilip kilitlenir) ve kırmızı çerçeveyle görünür. Oradan saldırırsan ve rakip bilirse canı SEN kaybedersin." },
  // Joker sayıları burada TEKRARLANMAZ; kural metni lib/jokerKurallari.js'te
  // tek yerde duruyor (Paket 28 B). Burada yalnız düelloya özel olan anlatılır.
  { ikon: "yildiz", baslik: "Jokerler", metin: "Saldırı jokerleri soruyu gördüğün Saldırı Hazırlığı'nda, savunma jokerleri soru sana gelince açılır. Düelloda hiçbir joker ücretsiz değil; jokerin yoksa maçın içinden satın alabilirsin. Maç eşit biterse Altın Soru sorulur: bilen kazanır, joker yok." },
];

// Düello 1.0 (surum = 2) — kurallar sunucuda (migration 268); sayılar oyun_ayarlari varsayılanları.
const ADIMLAR_V2 = [
  { ikon: "kilic", baslik: "Aynı soru, aynı anda", metin: "Kategoriyi sırayla biriniz seçer (8 sn; dolarsa rastgele). Soru ikinize aynı anda açılır, 15 sn'niz var. Rakibin cevapladığını görürsün ama ne cevapladığını göremezsin." },
  { ikon: "uyari", baslik: "Can tablosu", metin: "Yalnız biri doğruysa öteki 1 can kaybeder. İkiniz de doğru ya da ikiniz de yanlışsanız nötr: can değişmez. Süre dolarsa 'Yanıtsız' sayılır. 3 can, en çok 10 tur; tur iki tarafça tamamlanır." },
  { ikon: "kalkan", baslik: "Uzatma", metin: "Beraberlik yok. Can eşitse uzatma başlar: kategori rastgele gelir, biri doğru öteki yanlış yapana kadar sürer." },
  { ikon: "yildiz", baslik: "Skill", metin: "Maçta toplam 4 skill; aynı skill en çok 2 kez, bir soruda en çok 1. Soru Değiştir yalnız ikiniz de cevaplamamışken ve rakip o soruda skill kullanmamışken çalışır. Skill'in yoksa maçın içinden satın alabilirsin." },
];

export default function DuelloTanitim({ onKapat, surum = 1 }) {
  const [adim, setAdim] = useState(0);
  const kapat = () => { isaretle(surum); onKapat?.(); };
  const adimlar = surum === 2 ? ADIMLAR_V2 : ADIMLAR;
  const c = surum === 2 ? tt2 : tt;
  const a = adimlar[adim];
  const son = adim === adimlar.length - 1;

  return createPortal(
    <div className="bd-arama-katman bd-duello-tanitim" role="dialog" aria-modal="true" aria-label={tt("Düello nasıl oynanır")}>
      <div className="bd-arama-kutu">
        <div className="bd-duello-tanitim-ikon" aria-hidden="true"><Ikon ad={a.ikon} boyut={34} /></div>
        <div className="bd-arama-baslik">{c(a.baslik)}</div>
        <p className="bd-duello-tanitim-metin">{c(a.metin)}</p>
        <div className="bd-duello-tanitim-noktalar" aria-label={tt("Adım {n}/{t}", { n: adim + 1, t: adimlar.length })}>
          {adimlar.map((_, i) => <span key={i} className={i === adim ? "aktif" : ""} />)}
        </div>
        <div className="bd-konum-butonlar">
          <button type="button" className="btn" onClick={() => (son ? kapat() : setAdim(adim + 1))}>
            {son ? tt("Anladım, başla") : tt("İleri")}
          </button>
          {!son && <button type="button" className="btn ikincil" onClick={kapat}>{tt("Geç")}</button>}
        </div>
      </div>
    </div>,
    document.body
  );
}
