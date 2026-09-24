import { useState } from "react";
import { QtDugme, QtIkon, QtModal } from "../tasarim/index.js";
import { tt } from "../lib/dil.js";

/**
 * Paket 20 IV.1 — Düello'ya ilk girişte kısa, atlanabilir tanıtım (4 adım).
 * Maçın İÇİNDE değil, "Rakip ara"ya ilk basışta açılır: sayaç işlemezken okunur.
 * Bir kez gösterilir; kapatınca / "Geç" deyince saklanır. Lobi altındaki "Kurallar" yeniden açar.
 * Tasarım A: QtModal (body'ye portal, odak tuzağı, Esc). Stiller DuelloPage.a.css › m2-tanitim.
 * Metinlerin İngilizcesi: v1 dil.js, v2 ceviri/mac.js › Düello (M2).
 */
const DEPO = "bildim_duello_tanitim_v1";
// Düello 1.0 (surum = 2) kuralları farklı: eskiyi görmüş oyuncuya yeni tanıtım bir kez daha açılır.
// 470: zayıf nokta + kategori limiti geldi → yeni anahtar, tanıtım herkese bir kez daha açılır.
const DEPO_V2 = "bildim_duello_tanitim_v3";
const depo = (surum) => (surum === 2 ? DEPO_V2 : DEPO);

export function duelloTanitimGoruldu(surum = 1) {
  try { return localStorage.getItem(depo(surum)) === "1"; } catch (e) { console.warn("[Bildim] localStorage okunamadı:", e?.message ?? e); return false; }
}
function isaretle(surum) {
  try { localStorage.setItem(depo(surum), "1"); } catch (e) { console.warn("[Bildim] localStorage yazılamadı:", e?.message ?? e); }
}

const ADIMLAR = [
  { ikon: "kalp", baslik: "3 can", metin: "Savunmada yanlış bilirsen ya da süren dolarsa can kaybedersin. Canı biten kaybeder; en çok 10 tur." },
  { ikon: "kilic", baslik: "Sırayla saldır, savun", metin: "Her turda önce biri, sonra öbürü saldırır. Tur her zaman iki tarafça tamamlanır: canı biten rakip de o turdaki saldırısını yapar (eşit hamle kuralı)." },
  { ikon: "kalkan", baslik: "Saldırı riski", metin: "Rakibin EN ZAYIF kategorisi maç başında sabitlenir (yüzdeler eşitse biri seçilip kilitlenir) ve kırmızı çerçeveyle görünür. Oradan saldırırsan ve rakip bilirse canı SEN kaybedersin." },
  // Joker sayıları burada TEKRARLANMAZ; kural metni lib/jokerKurallari.js'te
  // tek yerde duruyor (Paket 28 B). Burada yalnız düelloya özel olan anlatılır.
  { ikon: "yildiz", baslik: "Jokerler", metin: "Saldırı jokerleri soruyu gördüğün Saldırı Hazırlığı'nda, savunma jokerleri soru sana gelince açılır. Düelloda hiçbir joker ücretsiz değil; jokerin yoksa maçın içinden satın alabilirsin. Maç eşit biterse Altın Soru sorulur: bilen kazanır, joker yok." },
];

// Düello 1.0 (surum = 2) — kurallar sunucuda (migration 268); sayılar oyun_ayarlari varsayılanları.
const ADIMLAR_V2 = [
  { ikon: "duello", baslik: "Aynı soru, aynı anda", metin: "Kategoriyi sırayla biriniz seçer (15 sn; dolarsa rastgele). Soru ikinize aynı anda açılır, 15 sn'niz var. Rakibin cevapladığını görürsün ama ne cevapladığını göremezsin." },
  { ikon: "kalp", baslik: "Can tablosu", metin: "Yalnız biri doğruysa öteki 1 can kaybeder. İkiniz de doğru ya da ikiniz de yanlışsanız nötr: can değişmez. Süre dolarsa 'Yanıtsız' sayılır. 3 can, en çok 10 tur; tur iki tarafça tamamlanır." },
  // 470 (Ida, 24 Eyl 2026)
  { ikon: "uyari", baslik: "Zayıf nokta", metin: "Maç başında ikinizin de en zayıf kategorisi sabitlenir ve ikinize de görünür (en az 5 cevap verdiğin kategoriler arasından doğru oranı en düşük olan; henüz yoksa zayıf noktan yok). Rakibin zayıf noktasını seçersen ve rakip bilirse canı SEN kaybedersin — sen de bilsen bile. İkiniz de yanlışsanız kimse kaybetmez; yalnız sen bilirsen rakip kaybeder. Uzatmada bu kural yok." },
  { ikon: "kilit", baslik: "Kategori sınırı", metin: "Her kategori maçta en çok 3 kez seçilebilir (zayıf nokta dahil) ve bir önceki seçilen kategori hemen tekrar seçilemez. Seçilemeyenler soluk görünür. Süre dolunca gelen rastgele kategori rakibin zayıf noktası olmaz." },
  { ikon: "terazi", baslik: "Uzatma", metin: "Beraberlik yok. Can eşitse uzatma başlar: kategori rastgele gelir, biri doğru öteki yanlış yapana kadar sürer." },
  { ikon: "yildiz", baslik: "Skill", metin: "Maçta toplam 4 skill; aynı skill en çok 2 kez, bir soruda en çok 1. Soru Değiştir yalnız ikiniz de cevaplamamışken ve rakip o soruda skill kullanmamışken çalışır. Skill'in yoksa maçın içinden satın alabilirsin." },
];

export default function DuelloTanitim({ onKapat, surum = 1 }) {
  const [adim, setAdim] = useState(0);
  const kapat = () => { isaretle(surum); onKapat?.(); };
  const adimlar = surum === 2 ? ADIMLAR_V2 : ADIMLAR;
  const a = adimlar[adim];
  const son = adim === adimlar.length - 1;

  return (
    <QtModal acik onKapat={kapat} className="m2-tanitim" baslik={tt("Düello nasıl oynanır")}
             altlik={
               <div className="m2-tanitim-eylem">
                 {/* Sıra bilerek: birincil üstte, "Geç" altta (oyuncu testi son düğmeyi "Geç" bekler) */}
                 <QtDugme tamGenislik data-qt-ilk-odak ikonSag={son ? undefined : "ileri"} onClick={() => (son ? kapat() : setAdim(adim + 1))}>
                   {son ? tt("Anladım, başla") : tt("İleri")}
                 </QtDugme>
                 {!son && <QtDugme tur="hayalet" boyut="k" tamGenislik onClick={kapat}>{tt("Geç")}</QtDugme>}
               </div>
             }>
      <div key={adim} className="m2-tanitim-adim qt-h-gir">
        <span className="m2-tanitim-ikon" aria-hidden="true"><QtIkon ad={a.ikon} boyut={36} /></span>
        <h3 className="qt-baslik-2">{tt(a.baslik)}</h3>
        <p>{tt(a.metin)}</p>
      </div>
      <div className="m2-tanitim-noktalar" role="img" aria-label={tt("Adım {n}/{t}", { n: adim + 1, t: adimlar.length })}>
        {adimlar.map((_, i) => <span key={i} className={i === adim ? "aktif" : ""} />)}
      </div>
    </QtModal>
  );
}
