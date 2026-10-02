import { useState } from "react";
import { QtDugme, QtIkon, QtModal } from "../tasarim/index.js";
import { tt } from "../lib/dil.js";
import { useAyar } from "../lib/ayarlar.js";

/**
 * Paket 20 IV.1 — Düello'ya ilk girişte kısa, atlanabilir tanıtım.
 * Maçın İÇİNDE değil, "Rakip ara"ya ilk basışta açılır: sayaç işlemezken okunur.
 * Bir kez gösterilir; kapatınca / "Geç" deyince saklanır. Lobi altındaki "Kurallar" yeniden açar.
 * Tasarım A: QtModal (body'ye portal, odak tuzağı, Esc). Stiller DuelloPage.a.css › m2-tanitim.
 * Metinlerin İngilizcesi: ceviri/hakimiyet.js.
 */
// 680: Hâkimiyet kuralları (puansız, yuva, Baskın/Kalkan) → yeni anahtar; herkes bir kez görür.
// 870: eşik 5 yuva + "boşta ikiniz de bilirseniz saldıran alır" → v10 (herkes yeniden görür).
// 900: savunma banı adımı (7 sn, banlayınca tur ilerler) + soru ekranı çerçeve renkleri adımı → v11 (herkes yeniden görür).
const DEPO = "bildim_duello_tanitim_v11";

export function duelloTanitimGoruldu() {
  try { return localStorage.getItem(DEPO) === "1"; } catch (e) { console.warn("[Bildim] localStorage okunamadı:", e?.message ?? e); return false; }
}
function isaretle() {
  try { localStorage.setItem(DEPO, "1"); } catch (e) { console.warn("[Bildim] localStorage yazılamadı:", e?.message ?? e); }
}

// Kurallar sunucuda (Hâkimiyet, migration 680/870); puan yok — yuva sayılır. {n} = kazanma eşiği (duello_hakimiyet_esik),
// {t} = tur sayısı, {b} = ban süresi (duello_ban_sn); `ek` satırı yalnız duello_bos_ikisi_dogru_saldiran = 1 iken
// gösterilir, `not` her zaman. Çerçeve renkleri adımı soru ekranındaki durumun (DuelloTahta › hkKategoriDurumu) uzun
// açıklamasıdır — o cümleler soru ekranında yazılmaz. Metinler duello2_cozumle (680/870) ile doğrulandı.
const ADIMLAR = [
  { ikon: "duello", baslik: "Aynı soru, aynı anda", metin: "Her turda soru ikinize aynı anda açılır, ikiniz de cevaplarsınız (süre dolarsa yanlış sayılır). Saldıran kategoriyi seçer (15 sn; dolarsa rastgele). Savunan beklemez: saldıranın dokunduğu kartı canlı görür ve sıradaki saldırısına şimdiden hazırlanır." },
  { ikon: "bayrak", baslik: "{n} yuva: ilk dolduran kazanır", metin: "Herkes 0-0 başlar, 10 kategorinin hepsi boştur. Kazandığın kategoriler senin yuvandır. {n} yuvaya ilk ulaşan maçı anında kazanır." },
  { ikon: "onay", baslik: "Hamle kuralı", metin: "Hamlenin tutması için saldıran doğru, savunan yanlış bilmelidir. Boş kategoride kural biraz farklı: sen yanlış, rakip doğru bilirse kategoriyi rakip alır. Yani boşta bilen alır.", ek: "Boş kategoride ikiniz de bilirseniz saldıran alır." },
  { ikon: "hedef", baslik: "Soru ekranında çerçeve rengi", metin: "Sorulan kategori renkli çerçeveyle gösterilir. Kırmızı: rakip senin kategorine saldırıyor; yanlış bilirsen ve rakip bilirse kaybedersin. Mavi: fırsat; saldırıyorsan hamlen tutabilir, savunurken boş kategoride rakip yanlış yapar ve sen bilirsen kategori senin olur. Gri: rakip kendi kategorisini pekiştiriyor; kategori el değiştirmez, doğru bilirsen kilitlenmesini önlersin.", not: "Kalkan kırmızı çerçevedeki hamleyi durdurur. Rakip Baskın kullandıysa cevabın sayılmaz." },
  { ikon: "ban", baslik: "Savunma banı", metin: "Her turda saldıran seçmeden önce savunan 1 kategoriyi banlar ({b} sn). Banladığın an tur ilerler; süre dolarsa ban kullanılmaz. Rakip o tur banlı kategoriyi seçemez. Aynı kategoriyi arka arkaya banlayamazsın." },
  { ikon: "kilit", baslik: "Elinden al · Al · Pekiştir", metin: "Rakibin kategorisi: hamle tutarsa \"Elinden al\" ile sana geçer. Boş kategori: tutarsa \"Al\" ile yuvan olur. Kendi kategorin: tutarsa \"Pekiştir\" ile kilitlenir. Sahibi değişen ya da pekiştirilen kategori 2 tur kimse tarafından seçilemez; tutmayan hamlede kilit yok." },
  { ikon: "terazi", baslik: "{t} tur ve Altın Soru", metin: "Maç en çok {t} tur sürer; her tur bir hamledir ve saldıran/savunan her tur el değiştirir. {t}. tur sonunda kimse {n} yuvaya ulaşamadıysa yuvası çok olan kazanır. Yuvalar eşitse Altın Soru gelir: zor soru, joker yok, yalnız biriniz bilene kadar sürer. Sahiplik değişmez." },
  { ikon: "kalkan", baslik: "Baskın ve Kalkan", metin: "Baskın (saldırırken, soru ekranında): bu hamlede rakibin cevabı sayılmaz; sen doğruysan hamle tutar. Kalkan (savunurken, kendi kategorine saldırılırken): rakibin hamlesi tutmaz, kategori sende kalır. Her biri maçta 1 kez. Basılan joker tur sonuna kadar rakipten gizlidir; ikisi aynı hamlede basılırsa birbirini götürür ve ikisi de harcanır." },
  { ikon: "yariyari", baslik: "Joker sınırları", metin: "Maçta toplam 4 joker kullanımın var; aynı joker en çok 2 kez, bir soruda en çok 1. Baskın ve Kalkan dükkândan alınır, Düello joker setine seçilir." },
];

export default function DuelloTanitim({ onKapat }) {
  const [adim, setAdim] = useState(0);
  const turSayisi = useAyar("duello_max_tur", 16);   // tur sayısı metne gömülmez (1 Eki 2026: 16 tur)
  const esik = useAyar("duello_hakimiyet_esik", 5);
  const bosSaldiran = useAyar("duello_bos_ikisi_dogru_saldiran", 1) >= 1;
  const banSn = useAyar("duello_ban_sn", 7);
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
        <h3 className="qt-baslik-2">{tt(a.baslik, { t: turSayisi, n: esik })}</h3>
        <p>{tt(a.metin, { t: turSayisi, n: esik, b: banSn })}</p>
        {a.ek && bosSaldiran && <p><b>{tt(a.ek)}</b></p>}
        {a.not && <p><b>{tt(a.not)}</b></p>}
      </div>
      <div className="m2-tanitim-noktalar" role="img" aria-label={tt("Adım {n}/{t}", { n: adim + 1, t: ADIMLAR.length })}>
        {ADIMLAR.map((_, i) => <span key={i} className={i === adim ? "aktif" : ""} />)}
      </div>
    </QtModal>
  );
}
