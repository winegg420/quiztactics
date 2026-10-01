/**
 * ANA SAYFA SEZON YOLU KARTI (1 Eki 2026) — Görevler ile tek satırda iki yarım karttan SOL olanı, tek dokunuşla /sezon-yolu.
 * İçerik: "Sezon N" · "Seviye X/28" · ince ilerleme çubuğu. Battle Pass sahibi DEĞİLSE küçük altın "BP" çipi (satın alma
 * /sezon-yolu'nda kalır); alınabilir ödül varsa altın nokta + sayı. Kalan gün yalnız ekran okuyucu etiketinde.
 * Bütün kart tek bağlantıdır (iç içe etkileşim yok).
 * Yalnız sezon sistemi AÇIKKEN (`sezon_yolu_durumum().acik`, test sezonu değil) çizilir; yükleme/hata/kapalı → hiçbir şey çizmez.
 * Veri: sezon_ozetim (hafif, seviye · SP · BP · alınabilir; sezonYolu.js önbelleği) + sezon_yolu_durumum (sezon no, kalan gün,
 * sıradaki ödül; seviye/BP/sezon değişince bir kez, 5 dk önbellekli). YENİ RPC YOK; ödül/BP mantığına dokunulmaz.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { sezonDurumu, useSezonOzeti } from "../../lib/sezonYolu.js";
import { tt } from "../../lib/dil.js";
import { y } from "../../lib/yol.js";
import "./sezon.css";

const ONBELLEK_MS = 5 * 60 * 1000;
let onbellek = null;   // { anahtar, durum, an } — sayfalar arası dönüşte aynı RPC'yi yinelememek için

/** Sezon durumu (sezon no, kalan gün, ödüller). Hata → null (şerit çizilmez). */
function useSeridiDurumu(ozet) {
  const anahtar = ozet?.gorunur ? `${ozet.sezon ?? "-"}:${ozet.seviye ?? 0}:${ozet.bp ? 1 : 0}` : null;
  const [durum, setDurum] = useState(() => (anahtar && onbellek?.anahtar === anahtar ? onbellek.durum : null));
  useEffect(() => {
    if (!anahtar) { setDurum(null); return undefined; }
    if (onbellek?.anahtar === anahtar && Date.now() - onbellek.an < ONBELLEK_MS) { setDurum(onbellek.durum); return undefined; }
    let iptal = false;
    (async () => {
      try {
        const d = await sezonDurumu();
        if (iptal) return;
        if (!d || typeof d !== "object" || d.gorunur === false) { setDurum(null); return; }
        onbellek = { anahtar, durum: d, an: Date.now() };
        setDurum(d);
      } catch (e) {
        console.error("[Bildim] Sezon şeridi verisi alınamadı:", e?.message ?? e);
        if (!iptal) setDurum(null);
      }
    })();
    return () => { iptal = true; };
  }, [anahtar]);
  return durum;
}

export default function SezonSeridi() {
  const { ozet } = useSezonOzeti();
  const durum = useSeridiDurumu(ozet);
  try {
    if (!ozet?.gorunur || !durum || durum.acik !== true || durum.test) return null;
    const no = durum.sezon?.no;
    const seviye = Math.max(0, Number(ozet.seviye) || 0);
    const toplam = Number(ozet.seviye_sayisi ?? durum.seviye_sayisi ?? 28) || 28;
    if (no == null || !Number.isFinite(Number(no))) return null;
    const bp = Boolean(ozet.bp);
    const alinabilir = Math.max(0, Number(ozet.alinabilir) || 0);
    const kalanGun = Math.max(0, Number(durum.sezon?.kalan_gun) || 0);
    const onceki = Number(ozet.onceki_esik) || 0;
    const sonraki = ozet.sonraki_esik == null ? null : Number(ozet.sonraki_esik);
    const oran = sonraki == null ? 1 : Math.max(0, Math.min(1, ((Number(ozet.sp) || 0) - onceki) / Math.max(1, sonraki - onceki)));
    const kalanYazi = kalanGun <= 0 ? tt("Bugün bitiyor") : tt("{n} gün kaldı", { n: kalanGun });
    const etiket = [
      tt("Sezon {n}", { n: no }), tt("Seviye {n}/{m}", { n: seviye, m: toplam }), kalanYazi,
      alinabilir > 0 ? tt("Alınabilir ödül: {n}", { n: alinabilir }) : null,
      tt("Sezon Yolu"),
    ].filter(Boolean).join(". ");
    return (
      <Link to={y("/sezon-yolu")} className={`sz-ser${bp ? " sz-ser--bp" : ""}`} aria-label={etiket}>
        <span className="sz-ser-metin" aria-hidden="true">
          <b>{tt("Sezon {n}", { n: no })}</b>
          <span className="sz-ser-seviye qt-sayi">{tt("Seviye {n}/{m}", { n: seviye, m: toplam })}</span>
          <span className="sz-ser-cubuk"><span className="sz-ser-dolgu" style={{ "--sz-oran": oran.toFixed(3) }} /></span>
        </span>
        {(!bp || alinabilir > 0) && (
          <span className="sz-ser-yan" aria-hidden="true">
            {!bp && <span className="sz-ser-bp">{tt("BP")}</span>}
            {alinabilir > 0 && <span className="sz-ser-adet">{alinabilir > 99 ? "99+" : alinabilir}</span>}
          </span>
        )}
      </Link>
    );
  } catch (e) {
    console.error("[Bildim] Sezon şeridi çizilemedi:", e?.message ?? e);
    return null;
  }
}
