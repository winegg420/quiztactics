// Sezon Yolu yatay yolu: üstte ücretsiz kol, ortada numaralı duraklar, altta ücretli (Battle Pass) kol; sonda "28+" taşma sütunu.
// Yuva kenarı NADİRLİK rengiyle (null = sıradan); kilometre taşı (her 5. seviye ve son) büyük yuva + yıldızlı daire;
// ücretli kol altın zemin ve RENKLİ (kilit yalnız küçük rozet); alınabilir: turuncu çerçeve + hediye rozeti + nabız; alınan: yeşil tik.
// Mevcut seviye işaretçisi oyuncunun KENDİ çerçeveli avatarı (hareketsiz).
import { QtIkon, sayiBicim } from "../index.js";
import { tt } from "../../lib/dil.js";
import { odulAdi } from "../../lib/sezonYolu.js";
import { CoinIkon } from "../../components/ParaIkonlari.jsx";
import CerceveliAvatar from "../../components/CerceveliAvatar.jsx";
import { OdulGorsel, kisaYazi, anahtar, tasMi } from "./OdulGorsel.jsx";
import { SonsuzIkon } from "./simgeler.jsx";
import { tasmaAdimi } from "./tasma.js";

function Yuva({ odul, durum, yeniAlindi, yeniAcildi, bpVar, onSec, toplam }) {
  const acik = odul.seviye <= durum.seviye;
  const bpKilit = odul.kol === "ucretli" && !bpVar;
  const s = odul.alindi ? "alindi" : odul.alinabilir ? "alinabilir" : "kilitli";
  const tas = tasMi(odul.seviye, toplam);
  const d = [
    "sy-yuva", `sy-yuva--${odul.kol}`, `sy-yuva--${s}`, tas && "sy-yuva--tas",
    acik && "sy-yuva--acik", bpKilit && "sy-yuva--bp-kilit", odul.seviye === toplam && "sy-yuva--final",
    yeniAlindi && "sy-yuva--doldu", yeniAcildi && "sy-yuva--acildi",
  ].filter(Boolean).join(" ");
  const kolAdi = odul.kol === "ucretli" ? tt("Battle Pass kolu") : tt("Ücretsiz kol");
  const durumYazi = odul.alindi ? tt("alındı") : odul.alinabilir ? tt("alınabilir") : tt("kilitli");
  return (
    <>
      <button type="button" className={d} data-nadirlik={odul.nadirlik ?? "siradan"} data-yuva={anahtar(odul)}
        aria-label={`${tt("{n}. seviye", { n: odul.seviye })}, ${kolAdi}: ${odul.placeholder ? tt("Yakında") : odulAdi(odul, durum.dil)}, ${durumYazi}`}
        onClick={() => onSec(odul)}>
        <OdulGorsel odul={odul} boyut={tas ? 40 : 34} />
        {odul.alindi && <span className="sy-yuva-rozet sy-yuva-rozet--alindi" aria-hidden="true"><QtIkon ad="onay" boyut={12} /></span>}
        {!odul.alindi && odul.alinabilir && <span className="sy-yuva-rozet sy-yuva-rozet--al" aria-hidden="true"><QtIkon ad="hediye" boyut={13} /></span>}
        {!odul.alindi && !odul.alinabilir && bpKilit && <span className="sy-yuva-rozet sy-yuva-rozet--kilit" aria-hidden="true"><QtIkon ad="kilit" boyut={11} /></span>}
      </button>
      <span className={`sy-yuva-yazi${odul.placeholder ? " sy-yuva-yazi--kucuk" : ""}`} aria-hidden="true">{kisaYazi(odul)}</span>
    </>
  );
}

/** 28+ sütununun bir kolu: "Her N SP" yuvası + alınabilir taşma sayısı rozeti. */
function TasmaYuva({ kol, durum, bpVar, onTasma }) {
  const t = durum.tasma;
  const adim = tasmaAdimi(durum);
  const alinabilir = Number(kol === "ucretli" ? t?.alinabilir_ucretli : t?.alinabilir_ucretsiz) || 0;
  const bpKilit = kol === "ucretli" && !bpVar;
  const yazi = adim ? tt("Her {n} SP", { n: sayiBicim(adim) }) : tt("Taşma ödülü");
  const kolAdi = kol === "ucretli" ? tt("Battle Pass kolu") : tt("Ücretsiz kol");
  const d = ["sy-yuva", "sy-yuva--tasma", `sy-yuva--${kol}`, alinabilir > 0 ? "sy-yuva--alinabilir" : "sy-yuva--kilitli", bpKilit && "sy-yuva--bp-kilit"].filter(Boolean).join(" ");
  return (
    <>
      <button type="button" className={d} data-nadirlik="siradan" data-yuva={`tasma:${kol}`}
        aria-label={`${tt("Taşma ödülü")}, ${kolAdi}: ${yazi}${alinabilir ? `, ${tt("{n} ödül alınabilir", { n: alinabilir })}` : ""}`}
        onClick={() => onTasma(kol)}>
        <CoinIkon boyut={34} />
        {alinabilir > 0 && <span className="sy-yuva-rozet sy-yuva-rozet--al sy-yuva-rozet--sayi" aria-hidden="true">{alinabilir}</span>}
        {alinabilir === 0 && bpKilit && <span className="sy-yuva-rozet sy-yuva-rozet--kilit" aria-hidden="true"><QtIkon ad="kilit" boyut={11} /></span>}
      </button>
      <span className="sy-yuva-yazi" aria-hidden="true">{yazi}</span>
    </>
  );
}

export default function YolSeridi({ durum, toplam, bpVar, harita, yeniAlinan, yeniAcilan, onSec, onTasma, profile, userId, yolRef }) {
  const duraklar = Array.from({ length: toplam }, (_, i) => i + 1);
  const sablon = `${duraklar.map((n) => (tasMi(n, toplam) ? "var(--sy-tas)" : "var(--sy-kol)")).join(" ")} var(--sy-tasma)`;
  const tasmaCol = toplam + 1;
  return (
    <div className="sy-yol-kaydirma" ref={yolRef} tabIndex={0} role="region" aria-label={tt("Yatay kaydırılan seviye yolu")}>
      <div className="sy-yol" style={{ gridTemplateColumns: sablon }}>
        <span className="sy-bant sy-bant--ucretsiz" aria-hidden="true" />
        <span className="sy-bant sy-bant--ucretli" aria-hidden="true" />
        {duraklar.map((n) => {
          const acik = n <= durum.seviye;
          const simdi = n === durum.seviye;
          const tas = tasMi(n, toplam);
          const c = [
            "sy-durak", acik && "sy-durak--acik", simdi && "sy-durak--simdi", tas && "sy-durak--tas",
            n < durum.seviye && "sy-durak--gecildi", n === 1 && "sy-durak--ilk", yeniAcilan.has(n) && "sy-durak--acildi",
            n === toplam && simdi && "sy-durak--tam",
          ].filter(Boolean).join(" ");
          return (
            <div key={`d${n}`} className={c} data-durak={n} style={{ gridColumn: n }}>
              <span className={`sy-daire${simdi ? " sy-daire--ben" : ""}`} aria-label={simdi ? tt("{n}. seviye, şu anki seviyen", { n }) : tt("{n}. seviye", { n })}
                    aria-current={simdi ? "step" : undefined}>
                {simdi ? <CerceveliAvatar profile={profile} userId={userId} boyut={42} /> : <b>{n}</b>}
                {tas && !simdi && <span className="sy-daire-yildiz" aria-hidden="true"><QtIkon ad={n === toplam ? "kupa" : "yildiz"} boyut={13} /></span>}
              </span>
            </div>
          );
        })}
        <div className={`sy-durak sy-durak--tasma${durum.seviye >= toplam ? " sy-durak--gecildi" : ""}`} data-durak="tasma" style={{ gridColumn: tasmaCol }}>
          <span className="sy-daire sy-daire--tasma" aria-label={tt("28 sonrası taşma ödülleri")}><SonsuzIkon boyut={24} /></span>
        </div>
        {duraklar.flatMap((n) => ["ucretsiz", "ucretli"].map((kol) => {
          const o = harita.get(`${n}:${kol}`);
          if (!o) return null;
          return (
            <div key={`${n}:${kol}`} className={`sy-hucre sy-hucre--${kol}`} style={{ gridColumn: n }}>
              <Yuva odul={o} durum={durum} bpVar={bpVar} toplam={toplam} yeniAlindi={yeniAlinan.has(`${n}:${kol}`)}
                yeniAcildi={yeniAcilan.has(n)} onSec={onSec} />
            </div>
          );
        }))}
        {durum.tasma && ["ucretsiz", "ucretli"].map((kol) => (
          <div key={`t:${kol}`} className={`sy-hucre sy-hucre--${kol}`} style={{ gridColumn: tasmaCol }}>
            <TasmaYuva kol={kol} durum={durum} bpVar={bpVar} onTasma={onTasma} />
          </div>
        ))}
      </div>
    </div>
  );
}
