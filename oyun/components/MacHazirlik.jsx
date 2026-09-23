// ============================================================
// EŞ ZAMANLI MAÇ EKRANLARI — üç modun ortak parçaları
//   HazirKapisi : maç başlamadan önce "Hazır" onayı ve rakip beklemesi
//   KopukPerde  : maç sırasında rakip koptuğunda ekranı kilitleyen perde
// ============================================================
import Maskot from "./Maskot.jsx";
import { QtDugme, QtKart, QtRozet } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import { tt } from "../lib/dil.js";
import SkillSeti from "./SkillSeti.jsx";

/** Rakip dönmezse maçın hükmen biteceği süre (sunucudaki değerle aynı). */
export const TERK_SN = 45;

/** Bu süre sonunda "Asenkron bırak" seçeneği çıkar (oyun_ayarlari ile aynı). */
export const LOBI_BEKLEME_SN = 120;

/**
 * Maç başlamadan önceki ekran.
 *
 * @param {object} p
 * @param {boolean} p.benHazir
 * @param {number}  p.hazirSayisi   hazır olan oyuncu sayısı
 * @param {number}  p.toplamOyuncu
 * @param {string[]} p.bekleyenAdlar  henüz hazır olmayan/ekranda olmayanlar
 * @param {() => void} p.onHazir
 * @param {() => void} p.onCik
 * @param {React.ReactNode} p.tabela  oyuncu kartları (moda özel)
 */
export function HazirKapisi({
  benHazir,
  hazirSayisi,
  toplamOyuncu,
  bekleyenAdlar = [],
  onHazir,
  onCik,
  onAsenkron = null,
  bekleyenSn = 0,
  tabela = null,
  skillSecimi = true,
  macTur = "1v1",
}) {
  const hepsiHazir = toplamOyuncu > 0 && hazirSayisi >= toplamOyuncu;
  return (
    <div className="m1-mesaj">
      <Maskot poz={benHazir ? "kutluyor" : "selam"} boyut={96} />
      <h1 className="qt-baslik-1">{hepsiHazir ? tt("Maç başlıyor…") : benHazir ? tt("Rakip bekleniyor") : tt("Hazır mısın?")}</h1>
      <p>
        {tt("Herkes aynı soruyu aynı anda görür. Maç hepiniz hazır olunca başlar.")}
      </p>

      {tabela}

      {skillSecimi && <SkillSeti macTur={macTur} />}

      <div className="m1-hazir-durum">
        <QtRozet ton={hepsiHazir ? "dogru" : "koyu"} ikon={hepsiHazir ? "onay" : "kisiler"}>
          {tt("{0}/{1} hazır", { 0: hazirSayisi, 1: toplamOyuncu })}
        </QtRozet>
        {!hepsiHazir && bekleyenAdlar.length > 0 && (
          <span>{tt("Beklenen: {0}", { 0: bekleyenAdlar.join(", ") })}</span>
        )}
      </div>

      {/* Rakip 2 dakikadır gelmedi: oyuncu seçsin — iptal mi, sıra tabanlı
          (asenkron) oyun mu. Beklemeye mahkûm bırakılmıyor. Yalnız BEN hazırken:
          hazır olmayan bensem "rakibin gelmedi" demek yanlış (rakip hazırken çıkıyordu). */}
      {onAsenkron && benHazir && bekleyenSn >= LOBI_BEKLEME_SN && !hepsiHazir && (
        <QtKart className="m1-kart-metin">
          <p>
            <b>{tt("Rakibin {0} dakikadır gelmedi.", { 0: Math.floor(bekleyenSn / 60) })}</b>{" "}
            {tt("İstersen maçı sıra tabanlı bırak: sen kendi bölümünü şimdi oynarsın, rakibin kendi zamanında oynar.")}
          </p>
          <QtDugme tur="mor" boyut="k" onClick={onAsenkron}>{tt("Asenkron bırak")}</QtDugme>
        </QtKart>
      )}

      <div className="m1-dugmeler">
        {!benHazir ? (
          <QtDugme tamGenislik boyut="b" ikon="onay" onClick={onHazir}>
            {tt("Hazırım")}
          </QtDugme>
        ) : (
          <div className="m1-hazir-bekle" role="status">
            <span className="m1-hazir-nokta" aria-hidden="true" />
            {tt("Hazırsın — diğerleri bekleniyor")}
          </div>
        )}
        <QtDugme tur="hayalet" tamGenislik onClick={onCik}>
          {bekleyenSn >= LOBI_BEKLEME_SN ? tt("İptal et") : tt("Vazgeç")}
        </QtDugme>
      </div>
    </div>
  );
}

/**
 * Maç başlarken 3-2-1 geri sayımı.
 * Sayıyı SUNUCU belirler: soru saati geri sayım kadar ileri kurulur, iki
 * istemci de aynı anı görür. Burada yalnız kalan saniye çizilir.
 */
export function GeriSayim({ kalan }) {
  const n = Math.max(1, Math.ceil(kalan));
  return (
    <div className="m1-sayim" role="status" aria-live="assertive">
      <div className="m1-sayim-kutu">
        <span className="m1-sayim-sayi" key={n}>{n}</span>
        <span className="m1-sayim-not">{tt("Hazır ol!")}</span>
      </div>
    </div>
  );
}

/**
 * Maç sırasında rakip kopunca ekranı kilitleyen perde.
 * Maç duraklamıştır: süre işlemez, cevap gönderilemez.
 *
 * @param {string[]} p.bekleyenAdlar
 * @param {number} p.gecenSn  kopmadan bu yana geçen saniye
 */
export function KopukPerde({ bekleyenAdlar = [], gecenSn = 0 }) {
  const kalan = Math.max(0, TERK_SN - gecenSn);
  const kim = bekleyenAdlar.length ? bekleyenAdlar.join(", ") : tt("Rakibin");
  return (
    <div className="m1-kopuk" role="alert" aria-live="assertive">
      <QtKart className="m1-kopuk-kutu">
        <span className="m1-kopuk-halka" aria-hidden="true" />
        <h2 className="qt-baslik-2">{tt("Rakip bekleniyor")}</h2>
        <p className="qt-kucuk">
          {tt("{0} oyundan ayrıldı. Maç duraklatıldı — süre işlemiyor, bu yüzden bir şey kaybetmiyorsun.", { 0: kim })}
        </p>
        <span className="m1-kopuk-sayac">
          {kalan > 0
            ? tt("{0} sn içinde dönmezse maçı terk etmiş sayılacak", { 0: kalan })
            : tt("Maç sonlandırılıyor…")}
        </span>
      </QtKart>
    </div>
  );
}
