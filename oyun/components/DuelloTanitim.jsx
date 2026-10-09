import { useState } from "react";
import { QtDugme, QtIkon, QtModal } from "../tasarim/index.js";
import { tt } from "../lib/dil.js";
import { useAyar } from "../lib/ayarlar.js";
import { useDuelloKurallari } from "../lib/duelloKurallari.js";

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
// 960: maç başında sırayla kategori seçimi (draft), 7 yuva, 20 tur → v12 (herkes yeniden görür).
// 970: yeni puan kuralı (yalnız rakibin kategorisine saldırı, +1/+2, 12 puan ya da 4 kategori) → v13 (herkes yeniden görür).
// 982: savunma banı kaldırıldı — ban adımı yalnız duello_ban_acik açıkken → v14 (herkes yeniden görür).
const DEPO = "bildim_duello_tanitim_v14";

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
  { ikon: "duello", baslik: "Aynı soru, aynı anda", metin: "Her turda soru ikinize aynı anda açılır, ikiniz de cevaplarsınız (süre dolarsa yanlış sayılır). Saldıran kategoriyi seçer (15 sn; dolarsa rastgele). Savunan beklemez: saldıranın dokunduğu kartı canlı görür ve sıradaki saldırısına şimdiden hazırlanır.",
    pMetin: "Soru ikinize aynı anda gelir. Saldıran, rakibin bir kategorisini seçer. Süre dolarsa yanlış sayılır." },
  { ikon: "liste", secim: true, baslik: "Önce sırayla seçim", metin: "Maç başında 10 kategori ortadadır. Sırayla seçersiniz (A-B-B-A-A…), her biriniz {k} kategori; seçtiğin kategori anında senin yuvan olur. Her seçim için {s} sn var; süre dolarsa en iyi bildiğin kalan kategori otomatik seçilir. İlk seçmeyen ilk saldırır.",
    pMetin: "Önce 10 kategoriyi sırayla seçersiniz. Herkes {k} kategori alır. Süre dolarsa en iyi bildiğin seçilir.", not: "En iyi bildiğin kategorileri seç, onları sen savunursun." },
  { ikon: "bayrak", baslik: "{n} yuva: ilk dolduran kazanır", metin: "Herkes 0-0 başlar, 10 kategorinin hepsi boştur. Kazandığın kategoriler senin yuvandır. {n} yuvaya ilk ulaşan maçı anında kazanır.",
    sMetin: "Seçimden sonra {k}-{k} başlarsınız, boş kategori yoktur. Yuva kazanmanın tek yolu rakibin kategorisini elinden almaktır. {n} yuvaya ilk ulaşan maçı anında kazanır.",
    pBaslik: "{h} puan ya da {y} kategori", pMetin: "{h} puan ya da rakibin {y} kategorisini alan kazanır. Aynı anda olursa Altın Soru." },
  { ikon: "onay", baslik: "Hamle kuralı", metin: "Hamlenin tutması için saldıran doğru, savunan yanlış bilmelidir. Boş kategoride kural biraz farklı: sen yanlış, rakip doğru bilirse kategoriyi rakip alır. Yani boşta bilen alır.", ek: "Boş kategoride ikiniz de bilirseniz saldıran alır.",
    sMetin: "Hamlenin tutması için saldıran doğru, savunan yanlış bilmelidir. Tutarsa rakibin kategorisi sana geçer; tutmazsa kategori savunanda kalır.",
    pBaslik: "Puan kuralı", pMetin: "Bildiğin her soru +1. Sen bilip rakip bilemezse +2 ve kategori senin. Kendi kategorine saldıramazsın." },
  { ikon: "hedef", baslik: "Soru ekranında çerçeve rengi", metin: "Sorulan kategori renkli çerçeveyle gösterilir. Kırmızı: rakip senin kategorine saldırıyor; yanlış bilirsen ve rakip bilirse kaybedersin. Mavi: fırsat; saldırıyorsan hamlen tutabilir, savunurken boş kategoride rakip yanlış yapar ve sen bilirsen kategori senin olur. Gri: rakip kendi kategorisini pekiştiriyor; kategori el değiştirmez, doğru bilirsen kilitlenmesini önlersin.",
    sMetin: "Sorulan kategori renkli çerçeveyle gösterilir. Kırmızı: rakip senin kategorine saldırıyor; yanlış bilirsen ve rakip bilirse kaybedersin. Mavi: saldırıyorsun; doğru bilirsen ve rakip yanlış yaparsa hamlen tutar. Gri: rakip kendi kategorisini pekiştiriyor; kategori el değiştirmez, doğru bilirsen kilitlenmesini önlersin.",
    pMetin: "Kırmızı: kategorin saldırı altında. Mavi: sen saldırıyorsun, fırsat.", not: "Kalkan kırmızı çerçevedeki hamleyi durdurur. Rakip Baskın kullandıysa cevabın sayılmaz." },
  { ikon: "ban", ban: true, baslik: "Savunma banı", metin: "Her turda saldıran seçmeden önce savunan 1 kategoriyi banlar ({b} sn). Banladığın an tur ilerler; süre dolarsa ban kullanılmaz. Rakip o tur banlı kategoriyi seçemez. Aynı kategoriyi arka arkaya banlayamazsın.",
    pMetin: "Her turda saldıran seçmeden önce savunan kendi kategorilerinden 1 tanesini banlar ({b} sn). Banladığın an tur ilerler; süre dolarsa ban kullanılmaz. Rakip o tur banlı kategoriye saldıramaz. Aynı kategoriyi arka arkaya banlayamazsın." },
  { ikon: "kilit", baslik: "Elinden al · Al · Pekiştir", metin: "Rakibin kategorisi: hamle tutarsa \"Elinden al\" ile sana geçer. Boş kategori: tutarsa \"Al\" ile yuvan olur. Kendi kategorin: tutarsa \"Pekiştir\" ile kilitlenir. Sahibi değişen ya da pekiştirilen kategori 2 tur kimse tarafından seçilemez; tutmayan hamlede kilit yok.",
    pBaslik: "Kilit", pMetin: "El değiştiren kategori 2 tur seçilemez.",
    sBaslik: "Elinden al · Pekiştir", sMetin: "Rakibin kategorisi: hamle tutarsa \"Elinden al\" ile sana geçer. Kendi kategorin: tutarsa \"Pekiştir\" ile kilitlenir. Sahibi değişen ya da pekiştirilen kategori 2 tur kimse tarafından seçilemez; tutmayan hamlede kilit yok." },
  { ikon: "terazi", baslik: "{t} tur ve Altın Soru", metin: "Maç en çok {t} tur sürer; her tur bir hamledir ve saldıran/savunan her tur el değiştirir. {t}. tur sonunda kimse {n} yuvaya ulaşamadıysa yuvası çok olan kazanır. Yuvalar eşitse Altın Soru gelir: zor soru, joker yok, yalnız biriniz bilene kadar sürer. Sahiplik değişmez.",
    pMetin: "Maç en çok {t} tur sürer. Sonunda puanı çok olan kazanır. Eşitlikte Altın Soru." },
  { ikon: "kalkan", baslik: "Baskın ve Kalkan", metin: "Baskın (saldırırken, soru ekranında): bu hamlede rakibin cevabı sayılmaz; sen doğruysan hamle tutar. Kalkan (savunurken, kendi kategorine saldırılırken): rakibin hamlesi tutmaz, kategori sende kalır. Her biri maçta 1 kez. Basılan joker tur sonuna kadar rakipten gizlidir; ikisi aynı hamlede basılırsa birbirini götürür ve ikisi de harcanır.",
    pMetin: "Baskın: rakibin cevabı sayılmaz. Kalkan: kategori sende kalır. Her biri maçta 1 kez." },
  { ikon: "yariyari", baslik: "Joker sınırları", metin: "Maçta 4 joker, aynısı en çok 2 kez. Soru başına 1 joker." },
];

// 7 Eki 2026 (Ida): puan modunda (970) tanıtım EN FAZLA 5 kısa adım — kurallar aynı, yalnız anlatım kısaldı.
// Ban adımı (982'den beri kapalı) yalnız duello_ban_acik açılırsa araya girer.
const P_ADIMLAR = [
  { ikon: "liste", secim: true, baslik: "Önce sırayla seçim", metin: "10 kategoriyi sırayla seçersiniz, herkes {k} alır. Süre dolarsa en iyi bildiğin seçilir." },
  { ikon: "duello", baslik: "Saldır, puan topla", metin: "Saldıran rakibin bir kategorisini seçer, soru ikinize aynı anda gelir. Doğru +1. Sen bilip rakip bilemezse +2 ve kategori senin." },
  { ...ADIMLAR.find((x) => x.ban), metin: ADIMLAR.find((x) => x.ban).pMetin },
  { ikon: "bayrak", baslik: "{h} puan ya da {y} kategori", metin: "{h} puan ya da rakibin {y} kategorisini alan kazanır. {t} tur bitince puanı çok olan; eşitlikte Altın Soru." },
  { ikon: "hedef", baslik: "Renkler ve kilit", metin: "Kırmızı: kategorin saldırı altında. Mavi: saldırı sende. El değiştiren kategori 2 tur seçilemez." },
  { ikon: "kalkan", baslik: "Jokerler", metin: "Baskın: rakibin cevabı sayılmaz. Kalkan: kategorin sende kalır. İkisi de maçta 1 kez; toplam 4 joker, soru başına 1." },
];

// Düello v4 (1013–1018): kontrol / kart / 3 seri / Son Düello — eski yuva-puan anlatımı v4 açıkken gösterilmez.
const V4_ADIMLAR = [
  { ikon: "duello", baslik: "Nötr soru, tek bilen kontrolü alır", metin: "İkinize aynı soru gelir. Yalnız biriniz bilirse kontrol onda olur." },
  { ikon: "liste", baslik: "Kartlar: rakibe gönder, kendine seç", metin: "Kontrol sende: 4 karttan birini rakibe gönderir, birini kendine seçersin. Her biriniz kendi kategorinizin sorusunu cevaplarsınız." },
  { ikon: "bayrak", baslik: "Üst üste 3 doğru", metin: "Kontrolü al, üst üste 3 doğru yap, düelloyu kazan." },
  { ikon: "terazi", baslik: "Son Düello", metin: "Tur sınırına ya da art arda 5 nötr soruya gelinirse Son Düello başlar: aynı soru, joker yok, tek bilen kazanır." },
  { ikon: "yariyari", baslik: "Jokerler", metin: "50:50, Ek Süre, İkinci Şans, Zaman Baskısı ve Soru Değiştir. Soru başına en çok 1 joker; Son Düello'da joker yok." },
];

export default function DuelloTanitim({ onKapat }) {
  const [adim, setAdim] = useState(0);
  // 960: tur sayısı ve eşik metne gömülmez; seçim modu açıksa seçim adımı + boşsuz metinler (sMetin/sBaslik).
  const { secim: secimModu, puan: puanModu, esik, tur: turSayisi, hedef, yol, ban: banAcik, v4 } = useDuelloKurallari();   // 970: puan modu · 982: ban
  const secimSn = useAyar("duello_secim_sn", 5);
  const bosSaldiran = useAyar("duello_bos_ikisi_dogru_saldiran", 1) >= 1;
  const banSn = useAyar("duello_ban_sn", 7);
  const kapat = () => { isaretle(); onKapat?.(); };
  // 982: ban adımı yalnız ban açıkken (kapalı: tur akışı sonuç → saldırı seçimi → soru)
  const uygun = (x) => (!x.secim || secimModu) && (!x.ban || banAcik);
  const adimlar = v4 ? V4_ADIMLAR : puanModu ? P_ADIMLAR.filter(uygun) : ADIMLAR.filter(uygun)
    .map((x) => (secimModu ? { ...x, baslik: x.sBaslik ?? x.baslik, metin: x.sMetin ?? x.metin, ek: x.sMetin ? null : x.ek } : x))
    // 970: puan modu metinleri (pBaslik/pMetin) seçim metinlerinin üstüne; boş kategori satırı (ek) yok
    .map((x, i) => { const o = ADIMLAR.filter(uygun)[i]; return puanModu ? { ...x, baslik: o.pBaslik ?? x.baslik, metin: o.pMetin ?? x.metin, ek: null } : x; });
  const a = adimlar[Math.min(adim, adimlar.length - 1)];
  const son = adim >= adimlar.length - 1;
  const p = { t: turSayisi, n: esik, b: banSn, s: secimSn, k: 5, h: hedef, y: yol };

  return (
    <QtModal acik onKapat={kapat} className="m2-tanitim" baslik={tt("Düello nasıl oynanır")}
             altlik={
               <div className="m2-tanitim-eylem">
                 {/* Sıra bilerek: birincil üstte, "Geç" altta (oyuncu testi son düğmeyi "Geç" bekler) */}
                 <QtDugme tamGenislik className="m2-duello-dugme" data-qt-ilk-odak ikonSag={son ? undefined : "ileri"} onClick={() => (son ? kapat() : setAdim(adim + 1))}>
                   {son ? tt("Anladım, başla") : tt("İleri")}
                 </QtDugme>
                 {!son && <QtDugme tur="hayalet" boyut="k" tamGenislik onClick={kapat}>{tt("Geç")}</QtDugme>}
               </div>
             }>
      <div key={adim} className="m2-tanitim-adim qt-h-gir">
        <span className="m2-tanitim-ikon" aria-hidden="true"><QtIkon ad={a.ikon} boyut={36} /></span>
        <h3 className="qt-baslik-2">{tt(a.baslik, p)}</h3>
        <p>{tt(a.metin, p)}</p>
        {a.ek && bosSaldiran && <p><b>{tt(a.ek)}</b></p>}
        {a.not && <p><b>{tt(a.not)}</b></p>}
      </div>
      <div className="m2-tanitim-noktalar" role="img" aria-label={tt("Adım {n}/{t}", { n: adim + 1, t: adimlar.length })}>
        {adimlar.map((_, i) => <span key={i} className={i === adim ? "aktif" : ""} />)}
      </div>
    </QtModal>
  );
}
