// ============================================================
// EŞ ZAMANLI MAÇ EKRANLARI — üç modun ortak parçaları
//   HazirKapisi : maç başlamadan önce "Hazır" onayı ve rakip beklemesi
//   KopukPerde  : maç sırasında rakip koptuğunda ekranı kilitleyen perde
// ============================================================
import { useEffect, useRef, useState } from "react";
import { ayar } from "../lib/ayarlar.js";
import { QtDugme, QtIkon, QtKart, QtRozet } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import { tt } from "../lib/dil.js";
import SkillSeti from "./SkillSeti.jsx";

/** Rakip dönmezse maçın hükmen biteceği süre (sunucudaki değerle aynı). */
export const TERK_SN = 45;

/** Bu süre sonunda "Asenkron bırak" seçeneği çıkar (oyun_ayarlari ile aynı). */
export const LOBI_BEKLEME_SN = 120;

/** Loadout süresi varsayılanı; asıl değer oyun_ayarlari.loadout_secim_sn (migration 410). */
const LOADOUT_VARSAYILAN_SN = 20;

/**
 * Loadout geri sayımı (Ajan I, I.1). Kural SUNUCUDA (mac_nabiz): süre dolunca bağlı iki taraf
 * hazır sayılır ve son kayıtlı setle maç başlar. Burada yalnız kalan süre çizilir: sunucunun
 * `lobi_saniye`'si (nabızla ~3 sn'de bir gelir) arada yerel saatle akıtılır.
 */
function useLoadoutKalan(lobiSn) {
  const [sure, setSure] = useState(LOADOUT_VARSAYILAN_SN);
  const [simdi, setSimdi] = useState(() => Date.now());
  const ornekRef = useRef({ sn: lobiSn, an: Date.now() });
  if (ornekRef.current.sn !== lobiSn) ornekRef.current = { sn: lobiSn, an: Date.now() };

  useEffect(() => {
    let aktif = true;
    ayar("loadout_secim_sn", LOADOUT_VARSAYILAN_SN)
      .then((v) => { if (aktif && Number.isFinite(v) && v > 0) setSure(v); })
      .catch(() => {});
    const t = setInterval(() => setSimdi(Date.now()), 250);
    return () => { aktif = false; clearInterval(t); };
  }, []);

  const gecen = ornekRef.current.sn + Math.max(0, simdi - ornekRef.current.an) / 1000;
  return { kalan: Math.max(0, sure - gecen), sure };
}

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
 * @param {{ ikon: string, metin: string }[]} [p.bilgiler]  maç bilgisi hapları (soru sayısı, süre, mod…)
 * @param {string} [p.ipucu]  kısa ipucu (bilgi kartının altında)
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
  bilgiler = [],
  ipucu = null,
}) {
  const hepsiHazir = toplamOyuncu > 0 && hazirSayisi >= toplamOyuncu;
  const { kalan, sure } = useLoadoutKalan(bekleyenSn);
  const sayacGorunur = !hepsiHazir && kalan > 0;
  return (
    <div className="m1-mesaj m1-hazir">
      {/* Baykuş maskot kaldırıldı (Ida, 24 Eyl 2026): başlık doğrudan sahnenin üstünde */}
      <h1 className="qt-baslik-1">{hepsiHazir ? tt("Maç başlıyor…") : benHazir ? tt("Rakip bekleniyor") : tt("Hazır mısın?")}</h1>
      <p>
        {tt("Herkes aynı soruyu aynı anda görür. Maç hepiniz hazır olunca başlar.")}
      </p>

      {tabela}

      {skillSecimi && <SkillSeti macTur={macTur} />}

      {/* 410: loadout süresi — dolunca sunucu son kayıtlı setle maçı başlatır */}
      {sayacGorunur && (
        <div className="m1-loadout-sayac" role="timer" aria-live="off">
          <span className="m1-loadout-sayac-yazi">
            <QtIkon ad="saat" boyut={18} />
            {tt("Maç {0} sn içinde başlıyor", { 0: Math.ceil(kalan) })}
          </span>
          <span className="m1-loadout-cubuk" aria-hidden="true">
            <span style={{ transform: `scaleX(${Math.min(1, kalan / sure)})` }} />
          </span>
          {skillSecimi && !benHazir && (
            <span className="m1-loadout-not">{tt("Süre dolunca seçili setinle başlarsın.")}</span>
          )}
        </div>
      )}

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

      {/* Alt kısım boş kalmasın: maç bilgisi + kısa ipucu (yalnız sunum; değerler sayfadan gelir) */}
      {(bilgiler.length > 0 || ipucu) && (
        <div className="m1-hazir-bilgi">
          {bilgiler.length > 0 && (
            <ul className="m1-hazir-haplar" aria-label={tt("Maç bilgisi")}>
              {bilgiler.map((b) => (
                <li key={b.metin} className="m1-hazir-hap"><QtIkon ad={b.ikon} boyut={16} />{b.metin}</li>
              ))}
            </ul>
          )}
          {ipucu && (
            <p className="m1-hazir-ipucu"><QtIkon ad="ampul" boyut={18} /><span>{ipucu}</span></p>
          )}
        </div>
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
