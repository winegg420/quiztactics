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
// 666: puan sistemi geldi → yeni anahtar, tanıtım herkese bir kez daha açılır.
const DEPO = "bildim_duello_tanitim_v5";

export function duelloTanitimGoruldu() {
  try { return localStorage.getItem(DEPO) === "1"; } catch (e) { console.warn("[Bildim] localStorage okunamadı:", e?.message ?? e); return false; }
}
function isaretle() {
  try { localStorage.setItem(DEPO, "1"); } catch (e) { console.warn("[Bildim] localStorage yazılamadı:", e?.message ?? e); }
}

// Kurallar sunucuda (migration 666); sayılar oyun_ayarlari varsayılanları.
const ADIMLAR = [
  { ikon: "duello", baslik: "Aynı soru, aynı anda", metin: "Kategoriyi sırayla biriniz seçer (15 sn; dolarsa rastgele). Soru ikinize aynı anda açılır, 15 sn'niz var. Rakibin cevapladığını görürsün ama ne cevapladığını göremezsin." },
  { ikon: "yildiz", baslik: "Yıldızlı kategoriler", metin: "Maç başında her kategori, rakibin o kategorideki doğru oranına göre yıldızlanır ve maç boyunca değişmez: %45'e kadar ★ zayıf (1 puan), %70'e kadar ★★ orta (3 puan), üstü ★★★ güçlü (6 puan). Rakibin o kategoride 5'ten az cevabı varsa ★★ sayılır." },
  { ikon: "onay", baslik: "Doğru bilen alır", metin: "Saldıran ya da savunan fark etmez: soruyu doğru bilen kategorinin puanını alır. İkiniz de doğruysanız ikiniz de alırsınız, ikiniz de yanlışsanız kimse alamaz. Süre dolarsa 'Yanıtsız' sayılır." },
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
