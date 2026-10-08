// Ana sayfa seçenekleri — paylaşılan görsel parçalar (veri `veri.jsx`'ten gelir).
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AvatarCerceve from "../../components/AvatarCerceve.jsx";
import { LigAmblemi } from "../../tasarim/premium/ligAmblemi.jsx";
import CerceveliAvatar from "../../components/CerceveliAvatar.jsx";
import { KartArkaPlanKatmani, kartArkaPlanSinifi, useKartArkaPlani } from "../../tasarim/arka-plan/kayit.jsx";
import IsimEfekti from "../../components/IsimEfekti.jsx";
import OyuncuAdiDugmesi from "../../components/OyuncuAdiDugmesi.jsx";
import Avatar from "../../../src/components/Avatar.jsx";
import { SezonMiniRozet } from "../../components/sezon/SezonRozeti.jsx";
import SeriRozeti from "../../components/SeriRozeti.jsx";
import Countdown from "../../components/Countdown.jsx";
import { TurnuvaSaatEtiketi, useSaatAyari } from "../../components/TurnuvaSaatleri.jsx";
import { QtIkon, QtIlerleme } from "../../tasarim/index.js";
import { LIG_ADLARI } from "../../lib/lig.js";
import { tt, ttSunucu } from "../../lib/dil.js";
import { geriSayim, sonrakiTurnuva, turnuvaSaatleri, turnuvaSaatiGoster, yerelSaatGoster } from "../../lib/zaman.js";
import { y } from "../../lib/yol.js";
import { CoinIkon } from "../../components/ParaIkonlari.jsx";
import { useGorevler, gorevOzeti } from "../../lib/gorevler.js";
import { AMBLEMLER } from "../../tasarim/rozet/amblemler.jsx";

const sayi = (n) => new Intl.NumberFormat("tr-TR").format(Number(n) || 0);
const MADALYA_TON = ["altin", "gumus", "bronz"];   // turnuva ödül sırası: 1. 2. 3.

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
      <span className="as-lig-amblem" aria-hidden="true"><LigAmblemi lig={lig} boyut={30} /></span>
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
    <Link to={y("/joker")} className="as-cip as-cip--coin">
      <span className="as-coin-para" aria-hidden="true"><CoinIkon boyut={18} /></span>
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

/** Rozette gösterilecek sayı: 99'dan büyükse "99+" (dar kısayolda taşmasın). */
const rozetSayi = (n) => (n > 0 ? (n > 99 ? "99+" : String(n)) : null);

/**
 * Oyna dışındaki mod kısayolları (hepsi var olan sayfalara gider). Turnuva burada
 * değil: avatar kartının altındaki şeritte (TurnuvaSeridi). Meydan Okumalar ve Grup
 * Maçı aynı sayfadadır (/meydan); Grup Maçı o sayfanın grup bölümünü açar.
 */
export function modListesi(v, b) {
  return [
    { anahtar: "meydan", ad: tt("Meydan Okumalar"), ikon: "kilic",
      alt: v.davetSayisi > 0 ? tt("{n} davet bekliyor", { n: v.davetSayisi }) : tt("Arkadaşına meydan oku"),
      rozet: rozetSayi(v.davetSayisi), rozetEtiketi: tt("{n} bekleyen davet", { n: v.davetSayisi }),
      git: () => b.git("/meydan") },
    { anahtar: "grup", ad: tt("Grup Maçı"), ikon: "grup", alt: tt("3–5 kişi"), git: () => b.git("/meydan?bolum=grup") },
    { anahtar: "saf", ad: tt("Saf Bilgi"), ikon: "safBilgi", alt: tt("Skill yok"), git: () => b.safBilgi() },
    // KASA (950): kapalıyken AnaSayfaA süzer (oyun_ayarlari.kasa_modu_acik)
    { anahtar: "kasa", ad: tt("Ortak Hazine"), ikon: "coin", alt: tt("Soruyu tek başına bilen hazineyi alır."), git: () => b.git("/kasa") },
    { anahtar: "calisma", ad: tt("Hatalarım"), ikon: "kitap", alt: tt("Yanlışlarını çalış"),
      rozet: rozetSayi(v.banka), rozetEtiketi: tt("{n} soru bekliyor", { n: v.banka }), git: () => b.git("/calisma") },
  ];
}

/** Etkinlik akışı: yalnız gerçekten olan kayıtlar. `sinir` ile kısaltılabilir. */
export function etkinlikler(v) {
  const liste = [];
  for (const m of v.kabuller) {
    liste.push({ id: `k-${m.id}`, ton: "acil", ikon: "duello", yol: `/mac/${m.id}`,
      baslik: tt("{ad} meydan okumanı kabul etti", { ad: m.rakipAd || tt("Rakibin") }), alt: tt("Maç ekranında seni bekliyor — hemen gir"),
      avatar: { gorunen_ad: m.rakipAd, gorunen_avatar: m.rakipAvatar } });
  }
  for (const m of v.siraSende) {
    liste.push({ id: `s-${m.id}`, ton: "sira", ikon: "oyna", yol: `/mac/${m.id}`,
      baslik: tt("{ad} ile maçın sürüyor", { ad: m.rakipAd || tt("Rakibin") }),
      alt: tt("Soru {n}/{t}", { n: m.benimSoru + 1, t: m.soru_ids?.length ?? 20 }),
      avatar: { gorunen_ad: m.rakipAd, gorunen_avatar: m.rakipAvatar } });
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

const DEVAM_MOD_BILGI = {
  klasik: { ikon: "oyna", baslik: () => tt("Klasik Maç") },
  saf: { ikon: "safBilgi", baslik: () => tt("Saf Bilgi") },
  duello: { ikon: "duello", baslik: () => tt("Düello") },
  grup: { ikon: "grup", baslik: () => tt("Grup Maçı") },
  turnuva: { ikon: "kupa", baslik: () => tt("Turnuva") },
  kasa: { ikon: "coin", baslik: () => tt("Ortak Hazine") },
};

/**
 * Ana sayfa açılır açılmaz görünen "devam eden maçın var" kartı (bütün modlar).
 * `useDevamEdenMaclar()`'dan gelen listeyi çizer; liste boşsa hiçbir şey çizmez.
 */
export function DevamEdenMaclarKarti({ liste }) {
  if (!liste?.length) return null;
  return (
    <div className="as-devam" role="list" aria-label={tt("Devam eden maçların")}>
      {liste.map((m) => {
        const bilgi = DEVAM_MOD_BILGI[m.mod] ?? DEVAM_MOD_BILGI.klasik;
        return (
          <Link key={m.id} to={y(m.yol)} className="as-devam-satir" role="listitem">
            <span className="as-devam-ikon"><QtIkon ad={bilgi.ikon} boyut={22} /></span>
            <span className="as-devam-metin">
              <b>{m.rakipAd ? tt("{ad} ile {mod} sürüyor", { ad: m.rakipAd, mod: bilgi.baslik() }) : tt("{mod} sürüyor", { mod: bilgi.baslik() })}</b>
              <small>{m.alt}</small>
            </span>
            <span className="as-devam-devam">{tt("Devam et")}<QtIkon ad="ileri" boyut={18} /></span>
          </Link>
        );
      })}
    </div>
  );
}

const iki = (n) => String(n).padStart(2, "0");
/** UTC ms → TSİ "HH:MM" (Türkiye yıl boyu UTC+3; gece yarısı listedeki gibi "24:00"). */
const tsiSaat = (ms) => {
  const d = new Date(ms + 3 * 3600 * 1000);
  const s = d.getUTCHours(), dk = d.getUTCMinutes();
  return `${iki(s === 0 && dk === 0 ? 24 : s)}:${iki(dk)}`;
};

/**
 * Turnuva şeridi (ana sayfa, avatar kartının altı). Üç hâl, hepsi gerçek veriden:
 * - bekleme: sıradaki seans + geri sayım + ilk üç ödülü (oyun_ayarlari.coin_turnuva_1..3)
 * - lobi: başlangıca turnuva_lobi_acilis_dk ya da daha az kaldı → nabız + KATIL
 * - canli: aktif turnuva var → CANLI rozeti, turnuva sayfasına gider
 * Tek düğmedir (iç içe etkileşim yok); dokununca lobiye katılır / turnuvaya gider.
 */
export function TurnuvaSeridi({ v, git }) {
  const t = v.turnuva;
  const { oduller, lobiAcilisDk } = v.turnuvaAyar ?? {};
  const [simdi, setSimdi] = useState(() => Date.now());
  const [katiliyor, setKatiliyor] = useState(false);
  useEffect(() => {
    const id = setInterval(() => setSimdi(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const sonraki = sonrakiTurnuva(new Date(simdi));
  const hedefMs = sonraki.an.getTime();
  const kalan = geriSayim(sonraki.an);
  // Lobi hâli sunucudaki lobi satırının kendi başlangıç anına göre (istemci listesine göre değil).
  const lobiKalanMs = t.lobiAn != null ? t.lobiAn - simdi : null;
  const hal = t.canli ? "canli"
    : (t.lobiId && lobiAcilisDk != null && lobiKalanMs > 0 && lobiKalanMs <= lobiAcilisDk * 60000) ? "lobi"
    : "bekleme";

  // Seans başlayınca (sıradaki an ileri atlar) sunucu dakikalık zamanlayıcıyla
  // başlatır: birkaç saniye ve bir dakika sonra durum yeniden okunur.
  const { turnuvaYukle } = v;
  const oncekiHedef = useRef(hedefMs);
  useEffect(() => {
    if (oncekiHedef.current === hedefMs) return undefined;
    oncekiHedef.current = hedefMs;
    const z1 = setTimeout(() => turnuvaYukle?.(), 5000);
    const z2 = setTimeout(() => turnuvaYukle?.(), 70000);
    return () => { clearTimeout(z1); clearTimeout(z2); };
  }, [hedefMs, turnuvaYukle]);
  // Canlıyken bitişi yakalamak için seyrek yoklama (turnuva birkaç dakika sürer).
  useEffect(() => {
    if (!t.canli) return undefined;
    const id = setInterval(() => { if (!document.hidden) turnuvaYukle?.(); }, 30000);   // gizli sekmede yoklama yok
    return () => clearInterval(id);
  }, [t.canli, turnuvaYukle]);

  const sayac = hal === "lobi" ? geriSayim(new Date(t.lobiAn)) : kalan;
  const lobiSaat = hal === "lobi" ? tsiSaat(t.lobiAn) : null;
  const sure = sayac.saat > 0
    ? `${iki(sayac.saat)}:${iki(sayac.dakika)}:${iki(sayac.saniye)}`
    : `${iki(sayac.dakika)}:${iki(sayac.saniye)}`;

  const tikla = async () => {
    if (hal === "lobi" && !t.lobide) {
      if (katiliyor) return;
      setKatiliyor(true);
      const tamam = await v.lobiyeKatil();
      setKatiliyor(false);
      if (!tamam) return;
    }
    git("/turnuva");
  };

  const odulMetni = oduller?.length ? oduller.slice(0, 3) : null;
  const odulEtiketi = oduller?.length
    ? tt("Ödüller: {liste} coin", { liste: oduller.map((o, i) => `${i + 1}. ${sayi(o)}`).join(", ") })
    : undefined;

  return (
    <button type="button" className={`as-serit as-serit--${hal}`} onClick={tikla} aria-busy={katiliyor || undefined}>
      <span className="as-serit-kupa" aria-hidden="true"><QtIkon ad="kupa" boyut={26} /></span>
      <span className="as-serit-metin">
        {hal === "canli" && (
          <>
            <b>{tt("Turnuva şu an canlı")}</b>
            <small>{tt("Turnuvaya git")}</small>
          </>
        )}
        {hal === "lobi" && (
          <>
            <b>{tt("{saat} turnuvası", { saat: lobiSaat })}</b>
            <small>
              <span className="qt-sayi" role="timer">{sure}</span>
              <span aria-hidden="true">·</span>
              <span className="as-serit-lobi-bilgi">{t.lobiSayisi > 0 ? tt("Lobide {n} oyuncu", { n: t.lobiSayisi }) : tt("Lobi açık")}</span>
            </small>
          </>
        )}
        {hal === "bekleme" && (
          <>
            <b>{tt("Sonraki turnuva {saat}", { saat: turnuvaSaatiGoster(sonraki.saat) })}</b>
            <small>
              <span className="qt-sayi" role="timer" aria-label={tt("Turnuvaya kalan süre")}>{sure}</span>
              {odulMetni && (
                <span className="as-serit-odul" role="img" aria-label={odulEtiketi}>
                  {odulMetni.map((o, i) => (
                    <span key={i} className={`as-odul-madalya as-odul-madalya--${MADALYA_TON[i]}`} aria-hidden="true">
                      <QtIkon ad="madalya" boyut={15} />{sayi(o)}
                    </span>
                  ))}
                  <CoinIkon boyut={14} />
                </span>
              )}
            </small>
          </>
        )}
      </span>
      {hal === "canli" && <span className="as-serit-canli"><span className="as-canli-nokta" aria-hidden="true" />{tt("CANLI")}</span>}
      {hal === "lobi" && (t.lobide
        ? <span className="as-serit-katil as-serit-katil--tamam"><QtIkon ad="onay" boyut={16} />{tt("Lobidesin")}</span>
        : <span className="as-serit-katil">{katiliyor ? tt("Katılıyor…") : tt("KATIL")}</span>)}
      {hal === "bekleme" && <QtIkon ad="ileri" boyut={22} className="as-serit-ok" />}
    </button>
  );
}

/** Günün seans listesi (masaüstü sağ panel): saatler oyun_ayarlari.turnuva_saatleri'nden. */
export function TurnuvaSeansListesi() {
  useSaatAyari();
  const [, setTik] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTik((x) => x + 1), 30000);
    return () => clearInterval(id);
  }, []);
  const saatler = turnuvaSaatleri();
  const siradaki = sonrakiTurnuva().saat;
  return (
    <div className="as-panel">
      <h2 className="as-panel-baslik"><QtIkon ad="kupa" boyut={20} />{tt("Günde {n} turnuva", { n: saatler.length })}</h2>
      <ul className="as-seanslar">
        {saatler.map((s) => (
          <li key={s} className={s === siradaki ? "as-seans as-seans--siradaki" : "as-seans"}
              aria-current={s === siradaki ? "true" : undefined}>
            {turnuvaSaatiGoster(s)}
          </li>
        ))}
      </ul>
      <small className="as-seans-not">{yerelSaatGoster() ? tt("Saatler cihazının saat dilimine göre") : tt("Türkiye saati")}</small>
    </div>
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
                    <CoinIkon boyut={16} />{tt("+{n} al", { n: g.odul })}
                  </button>
                : <span className="as-gorev-odul"><CoinIkon boyut={16} />{g.odul}</span>}
          </li>
        );
      })}
    </ul>
  );
}

/** Amblem sembolü (rozet setinin kalın konturlu çizimi) tek başına, ±17 birimlik tuvalde. */
function AmblemSembolu({ ad, className }) {
  const Sembol = AMBLEMLER[ad]?.Sembol;
  if (!Sembol) return null;
  return <svg className={className} viewBox="-17 -17 34 34" aria-hidden="true" focusable="false"><Sembol /></svg>;
}

/**
 * Mod kartı sahne figürü (8 Eki 2026, onaylı eskiz): yalnız mevcut varlıklar — rozet amblemleri
 * (soru, kılıçlar) ve dükkân/kozmetik görselleri (sandık, şimşek, parıltı; Noto Emoji 3D, Apache 2.0).
 * Süs; düğmenin etiketi aria-label'da.
 */
export function ModFiguru({ tur }) {
  if (tur === "klasik") {
    return (
      <span className="as-figur as-figur--klasik" aria-hidden="true">
        <AmblemSembolu ad="soru" className="as-figur-ana" />
        <img className="as-figur-yan" src="/dukkan/parilti.webp" alt="" width="40" height="40" decoding="async" />
      </span>
    );
  }
  if (tur === "duello") {
    return (
      <span className="as-figur as-figur--duello" aria-hidden="true">
        <img className="as-figur-arka" src="/kozmetik/simsek.webp" alt="" width="48" height="48" decoding="async" />
        <AmblemSembolu ad="kiliclar" className="as-figur-ana" />
      </span>
    );
  }
  return (
    <span className="as-figur as-figur--kasa" aria-hidden="true">
      <img className="as-figur-ana" src="/dukkan/sandik.webp" alt="" width="64" height="64" decoding="async" />
    </span>
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

// ============================================================
// ROZET + ÇERÇEVE PAKETİ — yeni ana sayfa parçaları (23 Eyl 2026)
// Kompakt oyuncu kartı · canlı lig kartı · günlük görev şeridi
// ============================================================

/** Kompakt oyuncu kartı: çerçeveli avatar, ad, rütbe, level + XP, lig rozeti, seri. Dokununca profil. */
export function KompaktOyuncu({ v }) {
  const { oyuncu, profile, user, ligOzet } = v;
  const benPuan = ligOzet?.satirlar?.find((r) => r.ben)?.puan;
  const arkaPlan = useKartArkaPlani(user?.id);   // 30 Eyl: takılı arka plan kartın arkasında (hareketli, ~100 px)
  return (
    <Link to={y("/profil")} className={`as-ko${kartArkaPlanSinifi(arkaPlan)}`} aria-label={tt("Profilim: {ad}, Level {n}", { ad: oyuncu.ad, n: oyuncu.level })}>
      <KartArkaPlanKatmani sanat={arkaPlan} hareketli yukseklik={100} />
      <CerceveliAvatar profile={profile} userId={user?.id} boyut={64} hareketli />
      <span className="as-ko-govde">
        <span className="as-ko-ust">
          {/* Ajan C: ada dokununca kendi oyuncu kartın (kartın geri kalanı profile gider) */}
          <OyuncuAdiDugmesi userId={user?.id} profil={profile} oge="b" className="as-ko-ad" dugmeSinifi="ls-ad-dugme--esnek">{oyuncu.ad}</OyuncuAdiDugmesi>
          {/* Lig amblemi kartın altındaki lig kartında; burada yıldız yalnız etiketli Puan (30 Eyl) */}
        </span>
        <span className="as-ko-alt">
          <b className="as-ko-lv">{tt("Lv {n}", { n: oyuncu.level })}</b>
          <span className="as-ko-rutbe">{oyuncu.rutbe.ad}</span>
          <SezonMiniRozet />
        </span>
        {/* XP çubuğu + yanında "91/101" sayısı (profile.level_xp / level_gereken; yeni sorgu yok) */}
        <span className="as-ko-xp">
          <QtIlerleme deger={oyuncu.xp} en={oyuncu.xpGereken > 0 ? oyuncu.xpGereken : 1} etiket={tt("Seviye ilerlemesi")} />
          {oyuncu.xpGereken > 0 && <span className="as-ko-xp-sayi qt-sayi">{oyuncu.xp}/{oyuncu.xpGereken}</span>}
        </span>
      </span>
      {/* İki ETİKETLİ istatistik: Puan (haftalık lig puanı, lig kartıyla aynı veri) ve Seri */}
      <span className="as-ko-stat">
        {benPuan != null && (
          <span className="as-ko-stat-oge">
            <span className="as-ko-stat-etiket"><QtIkon ad="yildiz" boyut={13} />{tt("Puan")}</span>
            <b className="qt-sayi">{sayi(benPuan)}</b>
          </span>
        )}
        <span className="as-ko-seri"><SeriRozeti bicim="kart" /></span>
      </span>
    </Link>
  );
}

/** Hafta bitimine kalan: "3g 4s" (1 günden azsa "4s 12dk"). */
function haftaKalan(bitis) {
  const ms = new Date(bitis).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const g = Math.floor(ms / 86400000);
  const s = Math.floor((ms % 86400000) / 3600000);
  const dk = Math.floor((ms % 3600000) / 60000);
  return g > 0 ? tt("{g}g {s}s", { g, s }) : tt("{s}s {dk}dk", { s, dk });
}

/**
 * Canlı lig kartı (lig_grubum_ozet): başlık "Gümüş Lig · 8/25 · Hafta bitimine 3g 4s",
 * 5 satır (üstümdeki 2, ben, altımdaki 2), yükselme çizgisi yeşil, düşme çizgisi kırmızı,
 * alt satır "Altın'a çıkmana 40 puan". Dokununca lig sayfası. Kısa ekranda 3 satıra iner (CSS).
 * Grup yoksa (yeni oyuncu) tek satırlık "lige katıl" kartı.
 */
export function LigKarti({ v }) {
  const o = v.ligOzet;
  if (!o) {
    return (
      <Link to={y("/siralama")} className="as-lk as-lk--bos">
        <span className="as-lig-amblem" aria-hidden="true"><LigAmblemi lig="bronz" boyut={32} /></span>
        <span className="as-lk-bos-metin">
          <b>{tt("Haftalık lig")}</b>
          <small>{tt("Dereceli bir maç oyna, lig grubuna katıl.")}</small>
        </span>
        <QtIkon ad="ileri" boyut={20} />
      </Link>
    );
  }
  const satirlar = [...(o.satirlar ?? [])].sort((a, b) => a.sira - b.sira);
  const kalan = o.hafta_bitis ? haftaKalan(o.hafta_bitis) : null;
  const alt = o.bolge === "yukselme" && o.ust_lig
    ? tt("Yükselme bölgesindesin")
    : o.ust_lig && o.yukselme_cizgisine_fark > 0
      ? tt("Yükselmeye {n} puan kaldı", { n: sayi(o.yukselme_cizgisine_fark) })
      : o.ust_siraya_fark > 0 ? tt("Bir üst sıraya {n} puan", { n: sayi(o.ust_siraya_fark) })
        : o.sira === 1 ? tt("Grubun zirvesindesin") : null;
  // Kısa ekran başlığı için kısaltılmış alt metin: "75 puan · 2g 1s" (TR/EN taşmasın)
  const yukFark = o.bolge !== "yukselme" && o.ust_lig && o.yukselme_cizgisine_fark > 0;
  const altKisa = yukFark
    ? <>
        <QtIkon ad="yukari" boyut={13} className="as-lk-yuk-ok" />
        <span className="as-lk-yuk-uzun">{tt("Yükselme: {n} P", { n: sayi(o.yukselme_cizgisine_fark) })}</span>
        <span className="as-lk-yuk-dar">{tt("{n} P", { n: sayi(o.yukselme_cizgisine_fark) })}</span>
      </>
    : alt;
  // Kısa ekranda yalnız 2 satır: ben + yanındaki (üstündeki; ben 1. ise altındaki) — yarım satır kalmaz.
  const benI = satirlar.findIndex((x) => x.ben);
  const komsuI = benI > 0 ? benI - 1 : benI === 0 && satirlar.length > 1 ? 1 : -1;
  return (
    <Link to={y("/siralama")} className={`as-lk as-lk--${o.lig}`}
          aria-label={tt("{lig} Lig, {s}. sıra. Lig sayfasına git", { lig: LIG_ADLARI[o.lig] ?? o.lig, s: o.sira })}>
      <span className="as-lk-bas">
        <span className="as-lig-amblem" aria-hidden="true"><LigAmblemi lig={o.lig} boyut={26} /></span>
        <b>{tt("{lig} Lig", { lig: LIG_ADLARI[o.lig] ?? o.lig })}</b>
        <span className="as-lk-sira qt-sayi">{tt("Sıra {n}/{m}", { n: o.sira, m: o.grup_boyu })}</span>
        {kalan && !alt && <small className="as-lk-kalan">{tt("Hafta bitimine {k}|ana", { k: kalan })}</small>}
        {alt && <small className="as-lk-alt-kisa" aria-hidden="true">{altKisa}{kalan && ` · ${kalan}`}</small>}   {/* kısa ekranda alt satır başlığa girer (ellipsis; çakışmaz) */}
      </span>
      {alt && (
        <span className="as-lk-alt">
          <span className="as-lk-alt-metin">{alt}</span>
          {/* hafta bitimine kalan süre (hafta_bitis, aynı özet verisi): "Yükselmeye N puan" ile aynı satırda */}
          {kalan && <span className="as-lk-alt-sure qt-sayi" title={tt("Hafta bitimine {k}|ana", { k: kalan })}>{kalan}</span>}
          <QtIkon ad="ileri" boyut={16} />
        </span>
      )}
      <ol className="as-lk-liste" aria-hidden="true">
        {satirlar.map((r, i) => {
          // 661: sıra gerçek (gizli üyeler boşluk bırakır) → sınır işareti tam sıraya değil, sınırı geçen ilk/son GÖRÜNEN satıra düşer.
          const onceki = satirlar[i - 1], sonraki = satirlar[i + 1];
          const yukSiniri = o.yukselme_sirasi != null && r.sira <= o.yukselme_sirasi && (!sonraki || sonraki.sira > o.yukselme_sirasi);
          const dusSiniri = o.dusme_sirasi != null && r.sira >= o.dusme_sirasi && onceki && onceki.sira < o.dusme_sirasi;
          const uzak = Math.abs(i - satirlar.findIndex((x) => x.ben)) >= 2;
          return (
            <li key={r.user_id ?? r.sira}
                className={`as-lk-satir${r.ben ? " as-lk-satir--ben" : ""}${i === komsuI ? " as-lk-satir--komsu" : ""}${uzak ? " as-lk-satir--uzak" : ""}${yukSiniri ? " as-lk-satir--yukselme-siniri" : ""}${dusSiniri ? " as-lk-satir--dusme-siniri" : ""}`}>
              <span className="as-lk-no qt-sayi">{r.sira}</span>
              <CerceveliAvatar profile={{ gorunen_ad: r.ad, gorunen_avatar: r.avatar }} userId={r.user_id}
                               cerceve={r.cerceve ?? null} kart={{ cerceve: r.cerceve ?? null, cerceve_nadirlik: r.cerceve_nadirlik,
                                 // 560: premium alanlar satırda varsa (lig_grubum_ozet) ek sorgu yok
                                 ...("premium_cerceve" in r ? { premium_cerceve: r.premium_cerceve ?? null, premium_aura: r.premium_aura ?? null } : {}) }} boyut={28} />
              {/* Ajan C: ada dokununca oyuncu kartı (satırın geri kalanı lig sayfasına gider). Liste aria-hidden:
                  klavye/ekran okuyucu aynı kartı lig sayfasındaki satırdan açar. */}
              <OyuncuAdiDugmesi userId={r.user_id} profil={{ gorunen_ad: r.ad, gorunen_avatar: r.avatar }} ad={r.ad}
                                className="as-lk-ad" odaklanmaz><IsimEfekti ef={r.isim_efekti ?? null}>{r.ben ? tt("Sen") : r.ad}</IsimEfekti></OyuncuAdiDugmesi>
              <span className="as-lk-puan qt-sayi">{sayi(r.puan)}</span>
              {yukSiniri && <span className="as-lk-cizgi-etiket">{tt("Yükselme çizgisi")}</span>}
            </li>
          );
        })}
      </ol>
    </Link>
  );
}

/**
 * Görev şeridi (tek satır): "Görevler · Günlük 1/3 · Haftalık 2/3", alınabilir ödül varsa sessiz nokta (sayı yok;
 * sayı yalnız ekran okuyucuda), dokununca /gorevler (ödül alma orada). Veri gorevlerim() RPC'sinden (lib/gorevler.js).
 * Veri gelmezse sahte "0/3" gösterilmez: yalnız başlık durur, şerit yine sayfaya götürür.
 */
export function GorevSeridi() {
  const { veri } = useGorevler();
  const o = veri ? gorevOzeti(veri) : null;
  const bekleyen = (o?.alinabilir ?? 0) > 0;
  const sayilar = o ? { a: o.gunTamam, b: o.gunToplam, c: o.hftTamam, d: o.hftToplam } : null;
  const etiket = sayilar
    ? `${tt("Görevler. Günlük {a}/{b}, haftalık {c}/{d}.", sayilar)}${bekleyen ? ` ${tt("Alınabilir ödül var.")}` : ""}`
    : tt("Görevler");
  return (
    <Link to={y("/gorevler")} className="as-gs" aria-label={etiket}>
      <span className="as-gs-ikon" aria-hidden="true"><QtIkon ad="hediye" boyut={18} /></span>
      <span className="as-gs-metin" aria-hidden="true">
        <b>{tt("Görevler")}</b>
        {/* Günlük görev parçaları: tamamlanan kadarı dolu (en çok 6 parça; veri yoksa çubuk çizilmez) */}
        {sayilar && sayilar.b > 0 && (
          <span className="as-gs-parcalar">
            {Array.from({ length: Math.min(sayilar.b, 6) }, (_, i) => (
              <i key={i} className={i < sayilar.a ? "as-gs-parca as-gs-parca--dolu" : "as-gs-parca"} />
            ))}
          </span>
        )}
        {sayilar && <small>{tt("Günlük {a}/{b} · Haftalık {c}/{d}", sayilar)}</small>}
      </span>
      {bekleyen && <span className="as-gs-nokta" aria-hidden="true" />}
      <QtIkon ad="ileri" boyut={18} className="as-gs-ok" />
    </Link>
  );
}
