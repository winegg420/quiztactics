import { useState } from "react";
import { QtDugme, QtIkon, QtModal } from "../tasarim/index.js";
import { tt } from "../lib/dil.js";

/**
 * Paket 20 IV.1 — Düello'ya ilk girişte kısa, atlanabilir tanıtım.
 * Maçın İÇİNDE değil, "Rakip ara"ya ilk basışta açılır: sayaç işlemezken okunur.
 * Bir kez gösterilir; kapatınca / "Geç" deyince saklanır. Lobi altındaki "Kurallar" yeniden açar.
 * Tasarım A: QtModal (body'ye portal, odak tuzağı, Esc). Stiller DuelloPage.a.css › m2-tanitim.
 * Metinlerin İngilizcesi: ceviri/hakimiyet.js.
 */
// 680: Hâkimiyet kuralları (puansız, 4 yuva, Baskın/Kalkan) → yeni anahtar; herkes bir kez görür.
const DEPO = "bildim_duello_tanitim_v9";

export function duelloTanitimGoruldu() {
  try { return localStorage.getItem(DEPO) === "1"; } catch (e) { console.warn("[Bildim] localStorage okunamadı:", e?.message ?? e); return false; }
}
function isaretle() {
  try { localStorage.setItem(DEPO, "1"); } catch (e) { console.warn("[Bildim] localStorage yazılamadı:", e?.message ?? e); }
}

// Kurallar sunucuda (Hâkimiyet, migration 680); puan yok — yuva sayılır.
const ADIMLAR = [
  { ikon: "duello", baslik: "Aynı soru, aynı anda", metin: "Her turda soru ikinize aynı anda açılır, ikiniz de cevaplarsınız (süre dolarsa yanlış sayılır). Saldıran kategoriyi seçer (15 sn; dolarsa rastgele). Savunan beklemez: saldıranın dokunduğu kartı canlı görür ve sıradaki saldırısına şimdiden hazırlanır." },
  { ikon: "bayrak", baslik: "4 yuva: ilk dolduran kazanır", metin: "Herkes 0-0 başlar, 10 kategorinin hepsi boştur. Kazandığın kategoriler senin yuvandır. 4 yuvaya ilk ulaşan maçı anında kazanır." },
  { ikon: "onay", baslik: "Hamle kuralı", metin: "Hamlenin tutması için saldıran doğru, savunan yanlış bilmelidir. Boş kategoride kural biraz farklı: sen yanlış, rakip doğru bilirse kategoriyi rakip alır. Yani boşta bilen alır." },
  { ikon: "kilit", baslik: "Elinden al · Al · Pekiştir", metin: "Rakibin kategorisi: hamle tutarsa \"Elinden al\" ile sana geçer. Boş kategori: tutarsa \"Al\" ile yuvan olur. Kendi kategorin: tutarsa \"Pekiştir\" ile kilitlenir. Sahibi değişen ya da pekiştirilen kategori 2 tur kimse tarafından seçilemez; tutmayan hamlede kilit yok." },
  { ikon: "terazi", baslik: "10 tur ve Altın Soru", metin: "Maç en çok 10 tur sürer; her tur bir hamledir ve saldıran/savunan her tur el değiştirir. 10. tur sonunda kimse 4 yuvaya ulaşamadıysa yuvası çok olan kazanır. Yuvalar eşitse Altın Soru gelir: zor soru, joker yok, yalnız biriniz bilene kadar sürer. Sahiplik değişmez." },
  { ikon: "kalkan", baslik: "Baskın ve Kalkan", metin: "Baskın (saldırırken, soru ekranında): bu hamlede rakibin cevabı sayılmaz; sen doğruysan hamle tutar. Kalkan (savunurken, kendi kategorine saldırılırken): rakibin hamlesi tutmaz, kategori sende kalır. Her biri maçta 1 kez. Basılan joker tur sonuna kadar rakipten gizlidir; ikisi aynı hamlede basılırsa birbirini götürür ve ikisi de harcanır." },
  { ikon: "yariyari", baslik: "Joker sınırları", metin: "Maçta toplam 4 joker kullanımın var; aynı joker en çok 2 kez, bir soruda en çok 1. Baskın ve Kalkan dükkândan alınır, Düello joker setine seçilir." },
];

export default function DuelloTanitim({ onKapat }) {
  const [adim, setAdim] = useState(0);
  const kapat = () => { isaretle(); onKapat?.(); };
  const a = ADIMLAR[adim];
  const son = adim === ADIMLAR.length - 1;

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
      <div className="m2-tanitim-noktalar" role="img" aria-label={tt("Adım {n}/{t}", { n: adim + 1, t: ADIMLAR.length })}>
        {ADIMLAR.map((_, i) => <span key={i} className={i === adim ? "aktif" : ""} />)}
      </div>
    </QtModal>
  );
}
