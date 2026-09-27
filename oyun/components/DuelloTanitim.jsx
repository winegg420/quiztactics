import { useState } from "react";
import { QtDugme, QtIkon, QtModal } from "../tasarim/index.js";
import { tt } from "../lib/dil.js";

/**
 * Paket 20 IV.1 — Düello'ya ilk girişte kısa, atlanabilir tanıtım.
 * Maçın İÇİNDE değil, "Rakip ara"ya ilk basışta açılır: sayaç işlemezken okunur.
 * Bir kez gösterilir; kapatınca / "Geç" deyince saklanır. Lobi altındaki "Kurallar" yeniden açar.
 * Tasarım A: QtModal (body'ye portal, odak tuzağı, Esc). Stiller DuelloPage.a.css › m2-tanitim.
 * Metinlerin İngilizcesi: ceviri/mac.js › Düello (M2).
 */
// 669: yıldız anlatımı kalktı, kategori kartı rengi (yeşil/gri/kırmızı) geldi → yeni anahtar.
const DEPO = "bildim_duello_tanitim_v7";

export function duelloTanitimGoruldu() {
  try { return localStorage.getItem(DEPO) === "1"; } catch (e) { console.warn("[Bildim] localStorage okunamadı:", e?.message ?? e); return false; }
}
function isaretle() {
  try { localStorage.setItem(DEPO, "1"); } catch (e) { console.warn("[Bildim] localStorage yazılamadı:", e?.message ?? e); }
}

// Kurallar sunucuda (migration 666); sayılar oyun_ayarlari varsayılanları.
const ADIMLAR = [
  { ikon: "duello", baslik: "Aynı soru, aynı anda", metin: "Kategoriyi sırayla biriniz seçer (15 sn; dolarsa rastgele). Soru ikinize aynı anda açılır, 15 sn'niz var. Rakibin cevapladığını görürsün ama ne cevapladığını göremezsin." },
  { ikon: "palet", baslik: "Kartın rengi", metin: "Rakibin iyi olduğu konuda puan almak zor, bu yüzden daha değerlidir. Kartın rengi o konuda kimin daha iyi olduğunu gösterir: yeşil sen, kırmızı rakip, gri denk." },
  { ikon: "onay", baslik: "Doğru bilen alır, saldıran yanlış bilirse kaybeder", metin: "Soruyu doğru bilen kategorinin puanını alır. Kategoriyi SEÇEN (saldıran) yanlış bilir ya da süresi dolarsa aynı puanı kaybeder — puanın SIFIRIN ALTINA inmez. Savunan hiçbir zaman puan kaybetmez. İkiniz de doğruysanız ikiniz de alırsınız." },
  { ikon: "yildiz", baslik: "Son 2 tur: puanlar ×2", metin: "9. ve 10. turda kategori değerleri iki katıdır — kazanç da saldıranın cezası da ×2. Altın Soru bundan etkilenmez." },
  { ikon: "kalkan", baslik: "Kategori Kalkanı", metin: "Rakip kategori seçerken kendi kategorilerinden birini o seçim için kapatırsın. Maçta 2 hakkın var ve ikisi de ücretsiz: 1. hak Tur 1–5'te, 2. hak Tur 6–10'da açılır. İlk hakkı kullanmazsan kaybolmaz; Tur 6'dan sonra iki hakkı da istediğin zaman kullanırsın." },
  { ikon: "terazi", baslik: "10 tur ve Altın Soru", metin: "Maç her zaman 10 tur sürer; sonunda puanı yüksek olan kazanır. Puanlar eşitse Altın Soru gelir: zor, daha önce sorulmamış bir soru, joker yok. Yalnız biriniz bilene kadar sürer." },
  { ikon: "yariyari", baslik: "Joker", metin: "Maçta toplam 4 joker kullanımın var; aynı joker en çok 2 kez, bir soruda en çok 1. Soru Değiştir yalnız ikiniz de cevaplamamışken ve rakip o soruda joker kullanmamışken çalışır. Jokerin yoksa maçın içinden satın alabilirsin." },
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
