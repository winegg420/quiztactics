/**
 * PAYLAŞ — sistem paylaşım menüsü (navigator.share: telefonda Instagram, TikTok, WhatsApp …).
 * Paylaşılan: 1080×1920 davet kartı PNG'si (lib/paylasKarti.js) + metin + davet bağlantısı.
 * Dosya paylaşımı desteklenmiyorsa yalnız metin + bağlantı; navigator.share yoksa bağlantı panoya
 * kopyalanır ve "Bağlantı kopyalandı" görünür.
 * Kart dokunuştan ÖNCE hazırlanır (Safari paylaşımı ancak dokunuşun hemen ardından açar; uzun bekleme
 * kullanıcı etkileşimini düşürür). Davet kodu modül içinde bir kez alınır.
 * @param {{ tur?: "davet"|"sonuc", sonuc?: { ad?: string, avatar?: string|null, benSkor?: number, rakipSkor?: number,
 *           durum?: "kazandi"|"kaybetti"|"berabere", rakipAd?: string }, className?: string, tamGenislik?: boolean,
 *           boyut?: "k"|"o"|"b", tur2?: string }} p   tur2 = QtDugme türü (varsayılan "ikincil")
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { davetKodum, davetBaglantisi } from "../lib/davet.js";
import { paylasKartiCiz } from "../lib/paylasKarti.js";
import { tt } from "../lib/dil.js";
import { QtDugme } from "../tasarim/index.js";
import "../tasarim/ekranlar/paylas.css";

let davetSozu = null;
/** Davet kodu + tam bağlantı; hata olursa sitenin kökü (kodsuz) döner ve sonraki çağrı yeniden dener. */
async function davetBilgisi() {
  if (!davetSozu) {
    davetSozu = davetKodum()
      .then((d) => ({ kod: d?.kod ?? null, baglanti: davetBaglantisi(d?.yol) ?? window.location.origin }))
      .catch((e) => {
        console.error("[Bildim] davet kodu alınamadı:", e?.message ?? e);
        davetSozu = null;
        return { kod: null, baglanti: window.location.origin };
      });
  }
  return davetSozu;
}

export default function PaylasDugmesi({ tur = "davet", sonuc, className, tamGenislik = false, boyut = "k", tur2 = "ikincil" }) {
  const { profile } = useAuth();
  const [calisiyor, setCalisiyor] = useState(false);
  const [bilgi, setBilgi] = useState(null);
  const hazir = useRef(null);   // { bilgi, dosya } — dokunuştan önce hazırlanan kart
  const bilgiZamani = useRef(0);

  const ad = tur === "sonuc" ? sonuc?.ad : profile?.gorunen_ad;
  const anahtar = JSON.stringify([tur, ad, sonuc?.avatar, sonuc?.benSkor, sonuc?.rakipSkor, sonuc?.durum, sonuc?.rakipAd]);

  const hazirla = useCallback(async () => {
    const d = await davetBilgisi();
    let dosya = null;
    try {
      const blob = await paylasKartiCiz({
        tur, ad, avatar: sonuc?.avatar ?? null, benSkor: sonuc?.benSkor, rakipSkor: sonuc?.rakipSkor,
        durum: sonuc?.durum, rakipAd: sonuc?.rakipAd, kod: d.kod, baglanti: d.baglanti,
      });
      dosya = new File([blob], tur === "sonuc" ? "quiztactics-mac.png" : "quiztactics-davet.png", { type: "image/png" });
    } catch (e) {
      console.error("[Bildim] paylaşım kartı çizilemedi:", e?.message ?? e);
    }
    return { bilgi: d, dosya };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anahtar]);

  // Ekran sakinleşince (maç sonu sahnesinin animasyonlarına karışmasın) kartı arka planda hazırla.
  useEffect(() => {
    let aktif = true;
    hazir.current = null;
    if (!navigator.share) return undefined;   // paylaşım yoksa kart gerekmez (pano yolu)
    const t = setTimeout(() => {
      hazirla().then((h) => { if (aktif) hazir.current = h; }).catch(() => {});
    }, 2500);
    return () => { aktif = false; clearTimeout(t); };
  }, [hazirla]);

  useEffect(() => () => clearTimeout(bilgiZamani.current), []);
  const goster = (m) => {
    setBilgi(m);
    clearTimeout(bilgiZamani.current);
    bilgiZamani.current = setTimeout(() => setBilgi(null), 2800);
  };

  const paylas = async () => {
    if (calisiyor) return;
    setCalisiyor(true);
    try {
      const h = hazir.current ?? (navigator.share ? await hazirla() : { bilgi: await davetBilgisi(), dosya: null });
      const { kod, baglanti } = h.bilgi;
      const metin = tur === "sonuc"
        ? tt("Quiz Tactics'te beni yenebilir misin? Davet kodum: {kod}", { kod: kod ?? "—" })
        : tt("Quiz Tactics'te bana meydan oku! Davet kodum: {kod}", { kod: kod ?? "—" });
      if (navigator.share) {
        try {
          if (h.dosya && navigator.canShare?.({ files: [h.dosya] })) {
            // Bazı uygulamalar dosyayla gelen url alanını düşürür → bağlantı metnin içinde
            await navigator.share({ files: [h.dosya], title: "Quiz Tactics", text: `${metin} ${baglanti}` });
          } else {
            await navigator.share({ title: "Quiz Tactics", text: metin, url: baglanti });
          }
        } catch (e) {
          if (e?.name === "AbortError") return;   // oyuncu menüyü kapattı
          throw e;
        }
        return;
      }
      await navigator.clipboard.writeText(baglanti);
      goster(tt("Bağlantı kopyalandı"));
    } catch (e) {
      console.error("[Bildim] paylaşım başarısız:", e?.message ?? e);
      goster(tt("Paylaşılamadı, tekrar dene"));
    } finally {
      setCalisiyor(false);
    }
  };

  return (
    <span className={["qt-paylas", className].filter(Boolean).join(" ")}>
      <QtDugme tur={tur2} boyut={boyut} ikon="paylas" tamGenislik={tamGenislik} yukleniyor={calisiyor} onClick={paylas}>
        {tt("Paylaş")}
      </QtDugme>
      {bilgi && <span className="qt-paylas-bilgi" role="status">{bilgi}</span>}
    </span>
  );
}
