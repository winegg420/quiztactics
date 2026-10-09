// ============================================================
// 1039 · Sıradaki 3 level ödülü (Profil › level alanı, LevelCubugu'nun altında).
// "Lv 15 · Dedektif (avatar)" · "Lv 20 · Skill hakkı" · "Lv 25 · Üstat rütbesi + 100 coin".
// Kaynaklar: level avatarları sunucudan (avatar_sahiplik_durumu: edinme 'level'), skill aralığı ve rütbe coini
// oyun_ayarlari'ndan (level_skill_aralik, rutbe_odul_coin, level_avatar_sahipse_coin), rütbe eşikleri ranks.js.
// Her level'in 20 coini her satırda tekrar yazılmaz (her level verir).
// ============================================================
import { useMemo } from "react";
import { RUTBELER } from "../lib/ranks.js";
import { useAyar } from "../lib/ayarlar.js";
import { aktifDil, tt } from "../lib/dil.js";
import { useAvatarSahiplik, useHazirAvatarlar, useKatalogAvatarlari } from "../lib/avatarKatalogu.js";
import { NadirlikImg } from "./AvatarNadirlikGoruntu.jsx";

export default function LevelOdulleri({ level, adet = 3 }) {
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
    const bas = (Number(level) || 1) + 1;
    for (let l = bas; l < bas + 200 && sonuc.length < adet; l++) {
      const parcalar = [];
      const av = avatarlar.get(l) ?? [];
      for (const a of av) {
        parcalar.push(a.sahibim ? tt("{ad} sende · +{n} coin", { ad: a.ad, n: sahipCoin }) : tt("{ad} (avatar)", { ad: a.ad }));
      }
      if (aralik > 0 && l % aralik === 0) parcalar.push(tt("Skill hakkı"));
      const rutbe = RUTBELER.find((r) => r.min === l && l > 1);
      if (rutbe) parcalar.push(rutbeCoin > 0 ? tt("{ad} rütbesi + {n} coin", { ad: rutbe.ad, n: rutbeCoin }) : tt("{ad} rütbesi", { ad: rutbe.ad }));
      if (parcalar.length) sonuc.push({ level: l, metin: parcalar.join(" · "), avatar: av[0]?.url ?? null });
    }
    return sonuc;
  }, [sahiplik, hazir, katalog, aralik, rutbeCoin, sahipCoin, level, adet, en]);

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
