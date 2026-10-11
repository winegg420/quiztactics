// ============================================================
// POSTA DETAYI (1060) — Quiz Tactics'ten gelen ödüllü posta / duyuru penceresi.
// Başlık · gönderen · metin · ödül kalemleri (görsel + miktar) · yeşil "AL".
// Alınınca "Alındı" yazar; kutlama (ses + konfeti + kalemlerin sıçraması) posta başına bu oturumda bir kez.
// onizleme: yönetim sayfasındaki önizleme — AL basılmaz, istek atılmaz.
// ============================================================
import { useState } from "react";
import { QtDugme, QtIkon, QtModal } from "../tasarim/index.js";
import { OdulGorsel } from "../tasarim/sezon-yolu/OdulGorsel.jsx";
import Konfeti from "./Konfeti.jsx";
import { tt, aktifDil } from "../lib/dil.js";
import { hataMesaji } from "../lib/hata.js";
import { sesCoin } from "../lib/ses.js";
import {
  POSTA_GONDEREN, postaBaslik, postaMetin, odulAdi, odulGorselVeri, odulBekliyor, postaOdulAl,
} from "../lib/posta.js";
import "../tasarim/ekranlar/posta.css";

// Kutlaması oynamış postalar (oturum boyunca; pencere yeniden açılınca tekrar oynamaz).
const kutlanan = new Set();

function kalanMetni(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return tt("Süresi doldu");
  const saat = Math.floor(ms / 3600000);
  if (saat < 1) return tt("{0} dk kaldı", { 0: Math.max(1, Math.floor(ms / 60000)) });
  if (saat < 48) return tt("{0} saat kaldı", { 0: saat });
  return tt("{0} gün kaldı", { 0: Math.floor(saat / 24) });
}

function tarihMetni(iso) {
  try {
    return new Date(iso).toLocaleDateString(aktifDil() === "en" ? "en-GB" : "tr-TR", { day: "numeric", month: "short" });
  } catch { return ""; }
}

export default function PostaDetay({ posta, onKapat, onAlindi, onizleme = false, onizlemeUst = null, onizlemeAltlik = null }) {
  const [isleniyor, setIsleniyor] = useState(false);
  const [hata, setHata] = useState(null);
  const [kutlama, setKutlama] = useState(false);
  if (!posta) return null;

  const oduller = Array.isArray(posta.oduller) ? posta.oduller : [];
  const verilen = Array.isArray(posta.verilen) ? posta.verilen : null;
  const bekliyor = odulBekliyor(posta);
  const alindi = oduller.length > 0 && Boolean(posta.alindi);
  const zatenSende = (k) => Boolean(verilen?.find((v) => v.tur === k.tur && (v.anahtar ?? null) === (k.anahtar ?? null))?.zaten_sende);

  const al = async () => {
    if (onizleme || isleniyor || !bekliyor) return;
    setIsleniyor(true);
    setHata(null);
    try {
      const ver = await postaOdulAl(posta.id);
      if (!kutlanan.has(posta.id)) {
        kutlanan.add(posta.id);
        setKutlama(true);
        try { sesCoin(); } catch { /* ses kritik değil */ }
      }
      onAlindi?.(posta.id, ver);
    } catch (e) {
      console.warn("[Bildim] posta ödülü alınamadı:", e?.message ?? e);
      setHata(hataMesaji(e, tt("Ödül alınamadı. Tekrar dene.")));
    } finally {
      setIsleniyor(false);
    }
  };

  return (
    <QtModal
      acik
      className="pd-modal"
      baslik={postaBaslik(posta)}
      onKapat={onKapat}
      altlik={onizlemeAltlik ?? (oduller.length > 0 ? (
        bekliyor ? (
          <QtDugme tur="dogru" boyut="b" tamGenislik ikon="hediye" yukleniyor={isleniyor}
                   disabled={onizleme} onClick={al} data-qt-ilk-odak>
            {tt("AL|posta")}
          </QtDugme>
        ) : (
          <QtDugme tur="ikincil" tamGenislik ikon="tik" disabled>{tt("Alındı")}</QtDugme>
        )
      ) : (
        <QtDugme tur="ikincil" tamGenislik onClick={onKapat} data-qt-ilk-odak>{tt("Kapat")}</QtDugme>
      ))}
    >
      <div className="pd">
        {onizlemeUst}
        <p className="pd-gonderen">
          <span className="pd-gonderen-ikon" aria-hidden="true"><QtIkon ad={oduller.length ? "hediye" : "bildirim"} boyut={16} /></span>
          <span className="pd-gonderen-ad">{POSTA_GONDEREN}</span>
          <span className="pd-gonderen-zaman">{tarihMetni(posta.olusturuldu ?? Date.now())}</span>
        </p>
        <p className="pd-metin">{postaMetin(posta)}</p>
        {oduller.length > 0 && (
          <section className="pd-oduller" aria-label={tt("Ödüller")}>
            <h3 className="pd-oduller-baslik">{tt("Ödüller")}</h3>
            <ul className={`pd-izgara${kutlama ? " pd-izgara--kutlama" : ""}`}>
              {oduller.map((k, i) => (
                <li key={`${k.tur}:${k.anahtar ?? ""}`} className={`pd-kalem${zatenSende(k) ? " pd-kalem--sende" : ""}`}
                    style={{ "--pd-gecikme": `${i * 90}ms` }}>
                  <span className="pd-kalem-gorsel"><OdulGorsel odul={odulGorselVeri(k)} boyut={44} /></span>
                  <span className="pd-kalem-ad">{odulAdi(k)}</span>
                  {zatenSende(k) && <span className="pd-kalem-not">{tt("Zaten sende")}</span>}
                </li>
              ))}
            </ul>
            <Konfeti aktif={kutlama} adet={18} tur="patlama" />
          </section>
        )}
        {hata && <p className="pd-hata" role="alert"><QtIkon ad="uyari" boyut={16} /> <span>{hata}</span></p>}
        {alindi && <p className="pd-durum pd-durum--alindi"><QtIkon ad="tik" boyut={16} /> {tt("Ödüller hesabına eklendi.")}</p>}
        {!alindi && posta.bitis && <p className="pd-durum">{kalanMetni(posta.bitis)}</p>}
        {onizleme && oduller.length > 0 && (
          <QtDugme tur="dogru" boyut="b" tamGenislik ikon="hediye" disabled className="pd-onizleme-al" aria-hidden="true" tabIndex={-1}>{tt("AL|posta")}</QtDugme>
        )}
        {onizleme && <p className="pd-durum">{tt("Önizleme — oyuncu böyle görecek.")}</p>}
      </div>
    </QtModal>
  );
}
