// Düello joker şeridi (soru ekranı). 680: DuelloV2.jsx'ten ayrıldı — ekran (DuelloV2) ile joker ön yüzü
// ayrı dosyalarda gelişsin diye. Davranış taşınırken DEĞİŞMEDİ.
import { JOKER_BILGI } from "../lib/jokerler.js";
import SkillRozeti from "./SkillRozeti.jsx";
import { QtIkon, QtSkill, QtSkillCubugu, sinif } from "../tasarim/index.js";

// Klasik'e özel skill'ler Düello şeridinde gösterilmez (sunucu da reddeder).
const DUELLODA_YOK = new Set(["sigorta", "cifte_puan"]);
// Tasarım sistemi ikonları (DuelloV2 ile aynı eşleme)
const SKILL_IKON = { elli: "yariyari", sure: "ekSure", soru_degistir: "degistir", zaman_baskisi: "baski", ikinci_sans: "ikinciSans" };

// ---------------------------------------------------------------- skill şeridi
/**
 * sonKullanilan = { tur, anahtar } → o skill'de kullanma anı (patlama + halka) yeniden oynar.
 * Kapalı skill gerçekten `disabled` (test kancası) ve aria-disabled; nedeni üstteki satırda.
 */
export function V2Skill({ d, calisan, kalanSn, serbest, sonKullanilan, onKullan, c }) {
  const s = d.skill ?? {};
  const izinli = Array.isArray(s.izinli) ? s.izinli : [];
  const set = Array.isArray(s.set) ? s.set : [];
  const liste = set.filter((t) => izinli.includes(t) && !DUELLODA_YOK.has(t));
  const toplam = Number(s.toplam_hak ?? 4);
  const turBasi = Number(s.tur_basi_hak ?? 2);
  const soruBasi = Number(s.soru_basi_hak ?? 1);
  const kullanilan = Number(s.kullanilan ?? 0);
  const sayilar = s.sayilar ?? {};
  const env = s.envanter ?? {};
  const fiyatlar = s.fiyatlar ?? {};
  const coin = s.coin === null || s.coin === undefined ? null : Number(s.coin);
  const cv = d.cevap ?? {};
  const soruAcik = d.faz === "cevap" && d.durum === "aktif";
  const cevapladim = Boolean(cv.ben_cevapladim);
  const hakBitti = kullanilan >= toplam;
  const soruHakBitti = Number(s.bu_soruda ?? 0) >= soruBasi;
  const elliVar = Array.isArray(cv.elli_kapali) && cv.elli_kapali.length > 0;

  const genelEngel = !soruAcik ? c("Soru açılınca kullanılır.")
    : d.uzatma ? c("Altın Soru'da joker kullanılamaz.")
    : hakBitti ? c("Bu maçtaki joker kullanımın doldu.")
    : cevapladim ? c("Cevap verdikten sonra joker kullanılamaz.")
    : soruHakBitti ? c("Bu soruda joker hakkını kullandın")
    : kalanSn <= 0 ? c("Süren doldu — sonuç bekleniyor.")
    : null;
  // Soru Değiştir kilidi sunucudan gelir (ör. "Rakibin bu soruda skill kullandı…").
  const sdKilit = s.soru_degistir_kilit && s.soru_degistir_kilit !== "Soru açık değil" ? c(s.soru_degistir_kilit) : null;

  return (
    <section className={sinif("m2-skill bd-d2-skill", genelEngel ? "m2-skill--kapali" : "m2-skill--acik")} aria-label={c("Joker")}>
      <div className="m2-skill-ust">
        <span className="m2-skill-ipucu" role="status">
          {liste.length === 0 ? c("Setinde Düello'da kullanılabilen joker yok.") : (genelEngel ?? c("Şimdi kullanabilirsin."))}
        </span>
        <span className="m2-hak" role="img" aria-label={c("{k}/{t} kullanıldı", { k: kullanilan, t: toplam })}>
          {Array.from({ length: toplam }).map((_, i) => <i key={i} className={i < kullanilan ? "dolu" : ""} />)}
          <b className="qt-sayi">{kullanilan}/{toplam}</b>
        </span>
      </div>
      {liste.length > 0 && (
        <QtSkillCubugu etiket={c("Joker")}>
          {liste.map((tur) => {
            const bilgi = JOKER_BILGI[tur] ?? {};
            const n = Number(sayilar[tur] ?? 0);
            const adet = Number(env[tur] ?? 0);
            const fiyat = Number(fiyatlar[tur] ?? 0);
            const turBitti = n >= turBasi;
            let ozel = null;
            if (tur === "soru_degistir" && sdKilit) ozel = sdKilit;
            else if (tur === "zaman_baskisi" && cv.rakip_cevapladi) ozel = c("Rakibin bu soruyu zaten cevapladı");
            else if (tur === "elli" && elliVar) ozel = c("Bu soruda joker hakkını kullandın");
            const fiyatGoster = !serbest && adet <= 0 && fiyat > 0;
            const coinYetmez = fiyatGoster && coin !== null && coin < fiyat;
            const acik = !genelEngel && !turBitti && !ozel && !coinYetmez && (serbest || adet > 0 || fiyatGoster);
            const kapali = !acik || !!calisan;
            const an = sonKullanilan?.tur === tur;
            return (
              <QtSkill key={an ? `${tur}-${sonKullanilan.anahtar}` : tur}
                       ikon={SKILL_IKON[tur] ?? bilgi.ikon ?? "soru"}
                       rozet={<SkillRozeti tur={tur} boyut={34} />}
                       ad={c(bilgi.ad ?? tur)}
                       adet={serbest ? undefined : adet}
                       fiyat={fiyatGoster ? fiyat : undefined}
                       durum={turBitti ? "kullanildi" : "hazir"}
                       className={sinif(kapali && !turBitti && "m2-skill-kapali", an && "qt-h-skill-an")}
                       disabled={kapali}
                       aria-disabled={kapali || undefined}
                       aria-busy={calisan === `joker-${tur}` || undefined}
                       title={ozel ?? (coinYetmez ? c("Yetersiz coin") : c(bilgi.aciklama ?? ""))}
                       onClick={() => onKullan(tur, { satinAl: fiyatGoster, adet })} />
            );
          })}
        </QtSkillCubugu>
      )}
      <p className="m2-skill-kural">
        {c("Aynı joker en çok {n} kez, soru başına {s}.", { n: turBasi, s: soruBasi })}
        {liste.includes("soru_degistir") && sdKilit && soruAcik && !cevapladim && (
          <span className="m2-skill-kilit"><QtIkon ad="kilit" boyut={12} /> {sdKilit}</span>
        )}
      </p>
    </section>
  );
}

