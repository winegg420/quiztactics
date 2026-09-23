// Ana sayfa seçenekleri — paylaşılan görsel parçalar (veri `veri.jsx`'ten gelir).
import { Link } from "react-router-dom";
import AvatarCerceve from "../../components/AvatarCerceve.jsx";
import Avatar from "../../../src/components/Avatar.jsx";
import SeriRozeti from "../../components/SeriRozeti.jsx";
import Countdown from "../../components/Countdown.jsx";
import { TurnuvaSaatEtiketi } from "../../components/TurnuvaSaatleri.jsx";
import { QtIkon, QtIlerleme } from "../../tasarim/index.js";
import { LIG_ADLARI } from "../../lib/lig.js";
import { tt, ttSunucu } from "../../lib/dil.js";
import { y } from "../../lib/yol.js";

const sayi = (n) => new Intl.NumberFormat("tr-TR").format(Number(n) || 0);

/** Level halkası: avatarın çevresinde XP ilerlemesi (SVG, yalnız stroke-dashoffset başta çizilir). */
export function LevelHalkasi({ oran = 0, boyut = 168, kalinlik = 10, children }) {
  const r = (boyut - kalinlik) / 2;
  const cevre = 2 * Math.PI * r;
  const dolu = Math.max(0, Math.min(1, oran));
  return (
    <span className="as-halka" style={{ "--as-halka": `${boyut}px` }}>
      <svg viewBox={`0 0 ${boyut} ${boyut}`} aria-hidden="true">
        <circle cx={boyut / 2} cy={boyut / 2} r={r} className="as-halka-iz" strokeWidth={kalinlik} />
        <circle cx={boyut / 2} cy={boyut / 2} r={r} className="as-halka-dolu" strokeWidth={kalinlik}
                strokeDasharray={cevre} strokeDashoffset={cevre * (1 - dolu)} />
      </svg>
      <span className="as-halka-ic">{children}</span>
    </span>
  );
}

/** Oyuncu avatarı + level halkası + level rozeti. */
export function OyuncuAvatari({ v, boyut = 168 }) {
  const { oyuncu, profile, user } = v;
  const oran = oyuncu.xpGereken > 0 ? oyuncu.xp / oyuncu.xpGereken : 1;
  return (
    <span className="as-oyuncu-avatar">
      <LevelHalkasi oran={oran} boyut={boyut} kalinlik={Math.round(boyut / 16)}>
        <AvatarCerceve profile={profile} boyut={Math.round(boyut * 0.74)} userId={user?.id} />
      </LevelHalkasi>
      <span className="as-level-rozet" aria-label={tt("Level {n}", { n: oyuncu.level })}>
        <small>{tt("LV")}</small>{oyuncu.level}
      </span>
    </span>
  );
}

export function XpSatiri({ v }) {
  const { oyuncu } = v;
  return (
    <div className="as-xp">
      <QtIlerleme deger={oyuncu.xp} en={oyuncu.xpGereken > 0 ? oyuncu.xpGereken : 1} etiket={tt("Seviye ilerlemesi")} />
      <span className="as-xp-metin">
        {oyuncu.xpGereken > 0
          ? tt("Level {n} için {xp} XP", { n: oyuncu.level + 1, xp: sayi(Math.max(0, oyuncu.xpGereken - oyuncu.xp)) })
          : tt("Level {n}", { n: oyuncu.level })}
      </span>
    </div>
  );
}

/** Lig rozeti (kademe + sıra) — lig sayfasına gider. */
export function LigCipi({ v, as = "link" }) {
  const lig = v.lig?.lig ?? "bronz";
  const icerik = (
    <>
      <span className={`as-lig-kalkan as-lig--${lig}`} aria-hidden="true"><QtIkon ad="kalkan" boyut={18} /></span>
      <span className="as-cip-metin">
        <b>{LIG_ADLARI[lig] ?? lig}</b>
        <small>{v.lig?.sira ? tt("{n}. sıra", { n: v.lig.sira }) : tt("Lig")}</small>
      </span>
    </>
  );
  return as === "link"
    ? <Link to={y("/siralama")} className="as-cip as-cip--lig">{icerik}</Link>
    : <span className="as-cip as-cip--lig">{icerik}</span>;
}

export function CoinCipi({ v }) {
  return (
    <Link to={y("/joker?sekme=coin")} className="as-cip as-cip--coin">
      <span className="as-coin-para" aria-hidden="true"><QtIkon ad="coin" boyut={18} /></span>
      <span className="as-cip-metin"><b className="qt-sayi">{sayi(v.oyuncu.coin)}</b><small>{tt("Coin")}</small></span>
    </Link>
  );
}

export function RutbeCipi({ v }) {
  return (
    <span className="as-cip as-cip--rutbe">
      <span className="as-rutbe-yildiz" aria-hidden="true"><QtIkon ad="yildiz" boyut={18} /></span>
      <span className="as-cip-metin"><b>{v.oyuncu.rutbe.ad}</b><small>{tt("Rütbe")}</small></span>
    </span>
  );
}

export function SeriCipi() {
  return <span className="as-seri"><SeriRozeti bicim="rozet" /></span>;
}

/** Oyna dışındaki mod kısayolları (hepsi var olan sayfalara gider). */
export function modListesi(v, b) {
  return [
    { anahtar: "turnuva", ad: tt("Turnuva"), ikon: "kupa", alt: v.turnuva.canli ? tt("Şimdi canlı") : tt("Günde 7 seans"),
      rozet: v.turnuva.canli ? tt("CANLI") : null, git: () => b.git("/turnuva") },
    { anahtar: "grup", ad: tt("Grup Maçı"), ikon: "grup", alt: tt("3–5 kişi"), git: () => b.git("/meydan") },
    { anahtar: "saf", ad: tt("Saf Bilgi"), ikon: "safBilgi", alt: tt("Skill yok"), git: () => b.safBilgi() },
    { anahtar: "calisma", ad: tt("Hatalarım"), ikon: "kitap", alt: tt("Yanlışlarını çalış"),
      rozet: v.banka > 0 ? String(v.banka) : null, git: () => b.git("/calisma") },
  ];
}

/** Etkinlik akışı: yalnız gerçekten olan kayıtlar. `sinir` ile kısaltılabilir. */
export function etkinlikler(v) {
  const liste = [];
  for (const m of v.kabuller) {
    liste.push({ id: `k-${m.id}`, ton: "acil", ikon: "duello", yol: `/mac/${m.id}`,
      baslik: tt("{ad} meydan okumanı kabul etti", { ad: m.rakipAd || tt("Rakibin") }), alt: tt("Maç ekranında seni bekliyor — hemen gir"),
      avatar: { gorunen_ad: m.rakipAd, avatar_url: m.rakipAvatar } });
  }
  for (const m of v.siraSende) {
    liste.push({ id: `s-${m.id}`, ton: "sira", ikon: "oyna", yol: `/mac/${m.id}`,
      baslik: tt("{ad} ile maçın sürüyor", { ad: m.rakipAd || tt("Rakibin") }),
      alt: tt("Soru {n}/{t}", { n: m.benimSoru + 1, t: m.soru_ids?.length ?? 20 }),
      avatar: { gorunen_ad: m.rakipAd, avatar_url: m.rakipAvatar } });
  }
  for (const d of v.davetlerim) {
    liste.push({ id: `d-${d.tur}-${d.kayit_id}`, ton: "bekle", ikon: "saat", yol: "/meydan",
      baslik: tt("{ad} davetine cevap bekleniyor", { ad: d.gorunen_ad || tt("Rakibin") }), alt: tt("Meydan okumalar") });
  }
  return liste;
}

export function EtkinlikSatiri({ e }) {
  return (
    <Link to={y(e.yol)} className={`as-etkinlik as-etkinlik--${e.ton}`}>
      <span className="as-etkinlik-bas">
        {e.avatar ? <Avatar profile={e.avatar} boyut={40} /> : <QtIkon ad={e.ikon} boyut={22} />}
      </span>
      <span className="as-etkinlik-metin"><b>{e.baslik}</b><small>{e.alt}</small></span>
      <QtIkon ad="ileri" boyut={20} className="as-etkinlik-ok" />
    </Link>
  );
}

/** Turnuva kartı: canlı / sıradaki seans geri sayımı / lobi durumu. */
export function TurnuvaKarti({ v, kucuk = false }) {
  const t = v.turnuva;
  return (
    <div className={`as-turnuva ${kucuk ? "as-turnuva--kucuk" : ""}`}>
      <span className="as-turnuva-kupa" aria-hidden="true"><QtIkon ad="kupa" boyut={kucuk ? 22 : 30} /></span>
      <div className="as-turnuva-govde">
        <b>{t.canli ? tt("Turnuva şu an canlı") : tt("Sıradaki turnuva")}</b>
        {t.canli ? <small>{tt("Katıl, son kalan kazansın")}</small> : <small><TurnuvaSaatEtiketi /></small>}
        {!t.canli && !kucuk && <Countdown bicim="qt" />}
        {t.lobiSayisi > 0 && <small>{tt("Lobide {n} oyuncu", { n: t.lobiSayisi })}</small>}
      </div>
      {t.lobide
        ? <Link to={y("/turnuva")} className="as-mini-dugme as-mini-dugme--tamam"><QtIkon ad="onay" boyut={16} />{tt("Lobidesin")}</Link>
        : (t.canli || t.lobiId)
          ? <button type="button" className="as-mini-dugme" onClick={v.lobiyeKatil}>{tt("Katıl")}</button>
          : <Link to={y("/turnuva")} className="as-mini-dugme">{tt("Aç")}</Link>}
    </div>
  );
}

export function GorevListesi({ v, sinir = 3 }) {
  if (!v.gorevler.length) return null;
  return (
    <ul className="as-gorevler">
      {v.gorevler.slice(0, sinir).map((g) => {
        const tamam = g.ilerleme >= g.hedef;
        return (
          <li key={g.quest_id} className={`as-gorev ${tamam ? "as-gorev--tamam" : ""}`}>
            <span className="as-gorev-metin">
              <b>{ttSunucu(g.ad)}</b>
              <QtIlerleme deger={Math.min(g.ilerleme, g.hedef)} en={g.hedef || 1} ton={tamam ? "dogru" : "mor"}
                          etiket={ttSunucu(g.ad)} />
            </span>
            {g.alindi
              ? <span className="as-gorev-odul as-gorev-odul--alindi"><QtIkon ad="onay" boyut={16} />+{g.odul}</span>
              : tamam
                ? <button type="button" className="as-mini-dugme as-mini-dugme--coin" onClick={() => v.odulAl(g.quest_id)}>
                    <QtIkon ad="coin" boyut={16} />{tt("+{n} al", { n: g.odul })}
                  </button>
                : <span className="as-gorev-odul"><QtIkon ad="coin" boyut={16} />{g.odul}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Dekor: uçuşan soru işaretleri, yıldız ve konfeti (CSS ile yavaşça süzülür). */
export function Susleme({ tur = "lobi" }) {
  return (
    <span className={`as-susleme as-susleme--${tur}`} aria-hidden="true">
      <i className="as-s as-s1">?</i><i className="as-s as-s2">★</i><i className="as-s as-s3">!</i>
      <i className="as-s as-s4">?</i><i className="as-s as-s5">✦</i><i className="as-s as-s6">★</i>
      <i className="as-k as-k1" /><i className="as-k as-k2" /><i className="as-k as-k3" /><i className="as-k as-k4" />
    </span>
  );
}
