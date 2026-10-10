// ============================================================
// 1039 · Sıradaki 3 level ödülü (Profil › level alanı, LevelCubugu'nun altında).
// "Lv 15 · Dedektif (avatar)" · "Lv 20 · Skill hakkı" · "Lv 25 · Üstat rütbesi + 100 coin".
// Kaynaklar: level avatarları sunucudan (avatar_sahiplik_durumu: edinme 'level'), skill aralığı ve rütbe coini
// oyun_ayarlari'ndan (level_skill_aralik, rutbe_odul_coin, level_avatar_sahipse_coin), rütbe eşikleri ranks.js.
// Her level'in 20 coini her satırda tekrar yazılmaz (her level verir).
// `vurgu` (Profil, 10 Eki 2026): en yakın ÖNEMLİ ödül büyük kart — öncelik avatar > rütbe > joker ("Skill hakkı"
// arayüzde "Joker"dir; ayrı skill ödülü yok). Solda görsel (avatar 56 px), sağda ad + "Lv X'te · N level kaldı" + mavi
// çubuk; altında tek satır "Yolda: …" (diğer yakın ödüller). Varsayılan liste görünümü aynen durur.
// ============================================================
import { useMemo } from "react";
import { RUTBELER } from "../lib/ranks.js";
import { useAyar } from "../lib/ayarlar.js";
import { aktifDil, tt } from "../lib/dil.js";
import { useAvatarSahiplik, useHazirAvatarlar, useKatalogAvatarlari } from "../lib/avatarKatalogu.js";
import { NadirlikImg } from "./AvatarNadirlikGoruntu.jsx";
import { QtIkon, QtIlerleme } from "../tasarim/index.js";

// Türkçe bulunma eki sayının okunuşuna göre: Lv 28'de · Lv 30'da · Lv 40'ta · Lv 25'te
const EK_BIRLER = ["", "de", "de", "te", "te", "te", "da", "de", "de", "da"];
const EK_ONLAR = ["", "da", "de", "da", "ta", "de", "ta", "te", "de", "da"];
function bulunmaEki(n) {
  const x = Math.abs(Math.trunc(Number(n) || 0));
  if (x === 0) return "da";
  if (x % 10) return EK_BIRLER[x % 10];
  if (x % 100) return EK_ONLAR[(x % 100) / 10];
  return "de";   // yüz, bin
}
const ONCELIK = { avatar: 0, rutbe: 1, skill: 2 };
const PENCERE = 30;   // vurgu: bu kadar level içinde en önemli ödül aranır

export default function LevelOdulleri({ level, adet = 3, vurgu = false }) {
  const sahiplik = useAvatarSahiplik();
  const hazir = useHazirAvatarlar();
  const katalog = useKatalogAvatarlari();
  const aralik = useAyar("level_skill_aralik", 5);
  const rutbeCoin = useAyar("rutbe_odul_coin", 100);
  const sahipCoin = useAyar("level_avatar_sahipse_coin", 200);
  const en = aktifDil() === "en";

  const satirlar = useMemo(() => {
    const adlar = new Map([...hazir, ...katalog].map((a) => [a.url, a.ad]));
    const avatarlar = new Map();   // level → [{url, ad, sahibim}]
    for (const s of sahiplik.values()) {
      if (s?.edinme !== "level" || !s.edinme_level) continue;
      const l = Number(s.edinme_level);
      avatarlar.set(l, [...(avatarlar.get(l) ?? []), { url: s.url, ad: adlar.get(s.url) ?? s.anahtar, sahibim: s.sahibim }]);
    }
    const sonuc = [];
    const kalemler = [];   // vurgu: { level, tur: avatar|rutbe|skill, ad, url, ikon }
    const bas = (Number(level) || 1) + 1;
    for (let l = bas; l < bas + 200 && (sonuc.length < adet || (vurgu && l < bas + PENCERE)); l++) {
      const parcalar = [];
      const av = avatarlar.get(l) ?? [];
      for (const a of av) {
        parcalar.push(a.sahibim ? tt("{ad} sende · +{n} coin", { ad: a.ad, n: sahipCoin }) : tt("{ad} (avatar)", { ad: a.ad }));
        if (!a.sahibim) kalemler.push({ level: l, tur: "avatar", ad: a.ad, url: a.url });
      }
      if (aralik > 0 && l % aralik === 0) {
        parcalar.push(tt("Skill hakkı"));
        kalemler.push({ level: l, tur: "skill", ad: tt("Skill hakkı") });
      }
      const rutbe = RUTBELER.find((r) => r.min === l && l > 1);
      if (rutbe) {
        parcalar.push(rutbeCoin > 0 ? tt("{ad} rütbesi + {n} coin", { ad: rutbe.ad, n: rutbeCoin }) : tt("{ad} rütbesi", { ad: rutbe.ad }));
        kalemler.push({ level: l, tur: "rutbe", ad: rutbeCoin > 0 ? tt("{ad} rütbesi + {n} coin", { ad: rutbe.ad, n: rutbeCoin }) : tt("{ad} rütbesi", { ad: rutbe.ad }), rutbeAd: rutbe.ad, ikon: rutbe.ikon });
      }
      if (parcalar.length && sonuc.length < adet) sonuc.push({ level: l, metin: parcalar.join(" · "), avatar: av[0]?.url ?? null });
    }
    if (!vurgu) return sonuc;
    // En yakın önemli ödül: pencere içinde en yüksek öncelikli türün en yakını
    const ana = [...kalemler].sort((a, b) => (ONCELIK[a.tur] - ONCELIK[b.tur]) || (a.level - b.level))[0] ?? null;
    const yolda = kalemler.filter((k) => k !== ana).sort((a, b) => a.level - b.level).slice(0, 2);
    return { ana, yolda };
  }, [sahiplik, hazir, katalog, aralik, rutbeCoin, sahipCoin, level, adet, en]);

  if (vurgu) {
    const { ana, yolda } = satirlar;
    if (!ana) return null;
    const simdi = Number(level) || 1;
    const kalan = Math.max(0, ana.level - simdi);
    // Çubuk: son 5'lik basamaktan ödül level'ine (Lv 27 → Lv 30: 25'ten 30'a, %40); yalnız görsel ölçek
    const bas5 = Math.min(Math.floor((simdi - 1) / 5) * 5, ana.level - 1);
    const kisa = (k) => (k.tur === "skill" ? tt("Lv {n} joker", { n: k.level })
      : k.tur === "rutbe" ? tt("Lv {n} {ad} rütbesi", { n: k.level, ad: k.rutbeAd }) : tt("Lv {n} {ad}", { n: k.level, ad: k.ad }));
    return (
      <div className="qt-dk-sodul">
        <div className="qt-dk-sodul-ust">
          <span className={`qt-dk-sodul-gorsel qt-dk-sodul-gorsel--${ana.tur}`} aria-hidden="true">
            {ana.tur === "avatar" && ana.url
              ? <NadirlikImg src={ana.url} alt="" width="56" height="56" loading="lazy" decoding="async" />
              : <QtIkon ad={ana.tur === "rutbe" ? (ana.ikon ?? "yildiz") : ana.tur === "avatar" ? "kisi" : "yildiz"} boyut={28} />}
          </span>
          <div className="qt-dk-sodul-metin">
            <b className="qt-dk-sodul-ad">{ana.tur === "avatar" ? tt("{ad} (avatar)", { ad: ana.ad }) : ana.ad}</b>
            <span className="qt-dk-sodul-kalan">{tt("Lv {n}'{ek} · {k} level kaldı", { n: ana.level, ek: bulunmaEki(ana.level), k: kalan })}</span>
            <QtIlerleme deger={Math.max(0, simdi - bas5)} en={Math.max(1, ana.level - bas5)} ton="mor" etiket={tt("Sıradaki ödül")} />
          </div>
        </div>
        {yolda.length > 0 && <p className="qt-dk-sodul-yolda">{tt("Yolda:")} {yolda.map(kisa).join(" · ")}</p>}
      </div>
    );
  }
  if (!satirlar.length) return null;
  return (
    <div className="qt-dk-level-odul">
      <span className="qt-dk-level-odul-baslik">{tt("Sıradaki ödüller")}</span>
      <ul>
        {satirlar.map((s) => (
          <li key={s.level}>
            <b className="qt-dk-level-odul-lv">{tt("Lv {n}", { n: s.level })}</b>
            {s.avatar && <NadirlikImg src={s.avatar} alt="" width="28" height="28" loading="lazy" decoding="async" className="qt-dk-level-odul-av" />}
            <span>{s.metin}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
