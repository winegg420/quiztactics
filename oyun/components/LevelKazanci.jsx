import { useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { rutbeBul } from "../lib/ranks.js";
import { SKILL_TANIMLARI } from "../lib/jokerler.js";
import { QtIlerleme, QtRozet } from "../tasarim/index.js";
import { sesLevel } from "../lib/ses.js";
import { tt } from "../lib/dil.js";
import "../tasarim/ekranlar/m1-sonuc.css";

/**
 * P2A — Maç sonu XP / level göstergesi (Klasik, Düello v1+v2, turnuva).
 * Her şey SUNUCUDAN (`level_kazancim`): XP'yi maçı bitiren fonksiyon yazar, burada hiçbir
 * sayı hesaplanmaz. Level atlandıysa kısa bir bildirim satırı; level/rütbe coini üstteki
 * coin hapının toplamına zaten dahildir (odul_dokumu), burada yalnız açıklanır.
 * Tasarım A (Şerit M1): QtIlerleme (mor, maç öncesi değer işaretli) + QtRozet.
 *
 * kaynak: "mac:<id>" · "duello:<id>" · "turnuva:<id>"
 */
const INDIRIM = {
  cift_yari: "çift koruması — XP yarı",
  cift_odulsuz: "aynı rakiple bugün çok maç — XP yok",
  acik_bot: "açık bot — XP yarı",
};

export default function LevelKazanci({ kaynak }) {
  const [v, setV] = useState(null);
  const sesRef = useRef(false);

  useEffect(() => {
    if (!kaynak) return undefined;
    let aktif = true;
    let zamanlayici = null;
    // XP maçı bitiren işlemle yazılır; ekran erken açılırsa iki kez daha bakılır (OdulDokumu ile aynı).
    const bekle = [0, 1500, 4000];
    const dene = async (i) => {
      try {
        const { data, error } = await supabase.rpc("level_kazancim", { p_kaynak: kaynak });
        if (error) throw error;
        if (!aktif) return;
        setV(data ?? null);
        if (!data?.hazir && i + 1 < bekle.length) zamanlayici = setTimeout(() => dene(i + 1), bekle[i + 1]);
      } catch (e) {
        console.error("[Bildim] level_kazancim başarısız:", e);
      }
    };
    dene(0);
    return () => { aktif = false; if (zamanlayici) clearTimeout(zamanlayici); };
  }, [kaynak]);

  // Level atlandıysa bir kez level sesi (rozet belirdiği an).
  const atladiMi = Boolean(v?.hazir) && (v.level_sonra ?? v.level) > (v.level_once ?? v.level);
  useEffect(() => {
    if (!atladiMi || sesRef.current) return;
    sesRef.current = true;
    sesLevel();
  }, [atladiMi]);

  if (!v?.hazir) return null;

  const level = Number(v.level) || 1;
  const gereken = Math.max(1, Number(v.level_gereken) || 1);
  const simdi = Math.max(0, Number(v.level_xp) || 0);
  const xp = Number(v.xp) || 0;
  const atladi = atladiMi;
  const rutbe = rutbeBul(level);
  const rutbeAtladi = v.rutbe_once && v.rutbe_sonra && v.rutbe_once !== v.rutbe_sonra;
  // Çubuk maç öncesi değeri işaretler (level atlandıysa yeni levelin başı)
  const oncesi = atladi ? 0 : Math.max(0, simdi - xp);
  const yuzde = (x) => Math.max(0, Math.min(100, (x / gereken) * 100));
  const levelCoin = (Number(v.level_coin) || 0) + (Number(v.rutbe_coin) || 0);
  const skiller = Array.isArray(v.skiller) ? v.skiller : [];

  return (
    <div className="m1-level m1-ss-sira" aria-label={tt("Level ilerlemesi")}>
      <div className="m1-level-ust">
        <span className="m1-level-xp">{tt("+{xp} XP", { xp })}</span>
        <QtRozet ton="mor" boyut="k">{tt("Level {n}", { n: level })} · {rutbe.ad}</QtRozet>
      </div>
      {v.indirim && INDIRIM[v.indirim] && <span className="m1-level-not">{tt(INDIRIM[v.indirim])}</span>}
      {v.oynamadi && <span className="m1-level-not">{tt("Maçta cevap vermediğin için XP yok")}</span>}
      {atladi && (
        <div className="m1-level-atlama" role="status">
          <span><b>{tt("Level atladın: {n}!", { n: v.level_sonra })}</b>{levelCoin > 0 ? ` ${tt("+{coin} coin", { coin: levelCoin })}` : ""}</span>
          {rutbeAtladi && <span>{tt("Yeni rütbe: {ad}", { ad: rutbe.ad })}</span>}
          {skiller.map((s) => (
            <span key={s.level}>{tt("Level {n} ödülü: {adet} {skill} hakkı", { n: s.level, adet: s.adet ?? 1, skill: SKILL_TANIMLARI[s.skill]?.ad ?? s.skill })}</span>
          ))}
        </div>
      )}
      <QtIlerleme
        deger={simdi}
        en={gereken}
        ton="mor"
        isaret={oncesi > 0 ? yuzde(oncesi) : undefined}
        etiket={tt("Level ilerlemesi")}
      />
      <span className="m1-level-kalan">{tt("Level {n} için {xp} XP", { n: level + 1, xp: Math.max(0, gereken - simdi) })}</span>
    </div>
  );
}
