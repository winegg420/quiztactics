import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { rutbeBul } from "../lib/ranks.js";
import { SKILL_TANIMLARI } from "../lib/jokerler.js";
import { hareketAzalt } from "../lib/geriBildirim.js";
import { tt } from "../lib/dil.js";
import "./level.css";

/**
 * P2A — Maç sonu XP / level göstergesi (Klasik, Düello v1+v2, turnuva).
 * Her şey SUNUCUDAN (`level_kazancim`): XP'yi maçı bitiren fonksiyon yazar, burada hiçbir
 * sayı hesaplanmaz. Level atlandıysa kısa bir bildirim satırı; level/rütbe coini üstteki
 * coin hapının toplamına zaten dahildir (odul_dokumu), burada yalnız açıklanır.
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

  if (!v?.hazir) return null;

  const level = Number(v.level) || 1;
  const gereken = Math.max(1, Number(v.level_gereken) || 1);
  const simdi = Math.max(0, Number(v.level_xp) || 0);
  const xp = Number(v.xp) || 0;
  const atladi = (v.level_sonra ?? level) > (v.level_once ?? level);
  const rutbe = rutbeBul(level);
  const rutbeAtladi = v.rutbe_once && v.rutbe_sonra && v.rutbe_once !== v.rutbe_sonra;
  // Çubuk maç öncesi değerden başlar (level atlandıysa yeni levelin başından)
  const oncesi = atladi ? 0 : Math.max(0, simdi - xp);
  const yuzde = (x) => Math.max(0, Math.min(100, (x / gereken) * 100));
  const levelCoin = (Number(v.level_coin) || 0) + (Number(v.rutbe_coin) || 0);
  const skiller = Array.isArray(v.skiller) ? v.skiller : [];

  return (
    <div className="bd-level-kazanc mss-sira" style={{ "--rutbe": rutbe.renk, "--rutbe-metin": rutbe.metinRenk }}
         aria-label={tt("Level ilerlemesi")}>
      <div className="bd-level-ust">
        <span className="bd-level-xp">{tt("+{xp} XP", { xp })}</span>
        <span className="bd-level-ad">{tt("Level {n}", { n: level })} · {rutbe.ad}</span>
      </div>
      {v.indirim && INDIRIM[v.indirim] && <span className="bd-level-not">{tt(INDIRIM[v.indirim])}</span>}
      {v.oynamadi && <span className="bd-level-not">{tt("Maçta cevap vermediğin için XP yok")}</span>}
      {atladi && (
        <div className="bd-level-atlama" role="status">
          <span><b>{tt("Level atladın: {n}!", { n: v.level_sonra })}</b>{levelCoin > 0 ? ` ${tt("+{coin} coin", { coin: levelCoin })}` : ""}</span>
          {rutbeAtladi && <span>{tt("Yeni rütbe: {ad}", { ad: rutbe.ad })}</span>}
          {skiller.map((s) => (
            <span key={s.level}>{tt("Level {n} ödülü: {adet} {skill} hakkı", { n: s.level, adet: s.adet ?? 1, skill: SKILL_TANIMLARI[s.skill]?.ad ?? s.skill })}</span>
          ))}
        </div>
      )}
      <div className="bd-sonuc-rutbe-bar" role="progressbar" aria-valuemin={0} aria-valuemax={gereken} aria-valuenow={simdi}>
        <div className="eski" style={{ width: `${yuzde(oncesi)}%` }} />
        <div
          className={`dolgu ${hareketAzalt() ? "" : "artiyor"}`}
          style={{ "--baslangic": `${yuzde(oncesi)}%`, "--bitis": `${yuzde(simdi)}%`, width: `${yuzde(simdi)}%` }}
        />
      </div>
      <span className="bd-level-kalan">{tt("Level {n} için {xp} XP", { n: level + 1, xp: Math.max(0, gereken - simdi) })}</span>
    </div>
  );
}
