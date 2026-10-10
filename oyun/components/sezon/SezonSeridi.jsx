/**
 * ANA SAYFA SEZON YOLU KARTI (1 Eki 2026) — Görevler ile tek satırda iki yarım karttan SOL olanı, tek dokunuşla /sezon-yolu.
 * İçerik: "Sezon N" · "Seviye X/28" · ince ilerleme çubuğu. Battle Pass sahibi DEĞİLSE küçük altın "BP" çipi (satın alma
 * /sezon-yolu'nda kalır); alınabilir ödül varsa altın nokta + sayı. Kalan gün yalnız ekran okuyucu etiketinde.
 * Bütün kart tek bağlantıdır (iç içe etkileşim yok).
 * Yalnız sezon sistemi AÇIKKEN (`sezon_yolu_durumum().acik`, test sezonu değil) çizilir; yükleme/hata/kapalı → hiçbir şey çizmez.
 * Veri: sezon_ozetim (hafif, seviye · SP · BP · alınabilir; sezonYolu.js önbelleği) + sezon_yolu_durumum (sezon no, kalan gün,
 * sıradaki ödül; seviye/BP/sezon değişince bir kez, 5 dk önbellekli). YENİ RPC YOK; ödül/BP mantığına dokunulmaz.
 */
import { Component, lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { odulAdi, sezonDurumu, useSezonOzeti } from "../../lib/sezonYolu.js";
import { QtIkon } from "../../tasarim/index.js";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import { aktifDil, tt } from "../../lib/dil.js";
import { y } from "../../lib/yol.js";
import "./sezon.css";

// Ejderha çerçevesi (pc_ejderha2) ağır sanattır: tembel yüklenir; inerken/hatada taç görseli yedeği (ana paket büyümez).
const PremiumAvatarCizim = lazy(() => import("../PremiumAvatarCizim.jsx"));
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

/** Taç görseli (dekoratif); yüklenemezse eski yıldız ikonu yedeği. */
function TacIkon() {
  const [yok, setYok] = useState(false);
  if (yok) return <QtIkon ad="yildiz" boyut={28} />;
  return <img className="sz-ser-tac" src="/dukkan/tac.webp" alt="" aria-hidden="true" width="32" height="32" decoding="async" onError={() => setYok(true)} />;
}

class Sinir extends Component {
  state = { hata: false };
  static getDerivedStateFromError() { return { hata: true }; }
  componentDidCatch(e) { console.error("[Bildim] Sezon kartı çerçeve çizimi başarısız:", e?.message ?? e); }
  render() { return this.state.hata ? this.props.yedek : this.props.children; }
}

/** Kartın ortasındaki küçük Ejderha çerçevesi (oyuncunun kendi avatarıyla; hareketsiz çizim, süzülmeyi CSS yapar). */
function EjderhaGorsel({ profil }) {
  return (
    <Sinir yedek={<TacIkon />}>
      <Suspense fallback={<TacIkon />}>
        <PremiumAvatarCizim profile={profil ?? null} boyut={46} premiumCerceve="ejderha2" />
      </Suspense>
    </Sinir>
  );
}

export default function SezonSeridi() {
  const { ozet } = useSezonOzeti();
  const { profile } = useAuth();
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
    // Sıradaki ödül: durumdaki (zaten okunan) ödül listesinden, mevcut seviyenin üstündeki en yakın yuva (yeni sorgu yok).
    const siradaki = (Array.isArray(durum.oduller) ? durum.oduller : [])
      .filter((o) => Number(o?.seviye) > seviye && !o.placeholder)
      .sort((a, b) => Number(a.seviye) - Number(b.seviye) || (a.kol === "ucretsiz" ? -1 : 1))[0] ?? null;
    const siradakiAd = siradaki ? odulAdi(siradaki, aktifDil()) : "";
    const siradakiYazi = siradaki && siradakiAd ? tt("Sv {n}: {ad}", { n: siradaki.seviye, ad: siradakiAd }) : null;
    const etiket = [
      tt("Sezon {n}", { n: no }), tt("Seviye {n}/{m}", { n: seviye, m: toplam }), kalanYazi, siradakiYazi,
      alinabilir > 0 ? tt("Alınabilir ödül: {n}", { n: alinabilir }) : null,
      tt("Sezon Yolu"),
    ].filter(Boolean).join(". ");
    const durumYazi = alinabilir > 0 ? tt("Ödül hazır") : siradakiAd ? tt("Sıradaki: {ad}", { ad: siradakiAd }) : kalanYazi;
    return (
      <Link to={y("/sezon-yolu")} className={`sz-ser oc oc--sezon${bp ? " sz-ser--bp" : ""}${alinabilir > 0 ? " oc--hazir" : ""}`} aria-label={etiket}>
        {alinabilir > 0 && <span className="oc-nokta" aria-hidden="true" />}
        <span className="oc-gorsel" aria-hidden="true"><EjderhaGorsel profil={profile} /></span>
        <b className="oc-baslik" aria-hidden="true">{tt("Sezon · Sv {n}", { n: seviye })}</b>
        <span className="oc-cubuk" aria-hidden="true"><span className="oc-dolgu" style={{ "--sz-oran": oran.toFixed(3) }} /></span>
        <span className={`oc-durum${alinabilir > 0 ? " oc-durum--altin" : ""}`} aria-hidden="true">
          <span>{durumYazi}</span>
        </span>
      </Link>
    );
  } catch (e) {
    console.error("[Bildim] Sezon şeridi çizilemedi:", e?.message ?? e);
    return null;
  }
}
