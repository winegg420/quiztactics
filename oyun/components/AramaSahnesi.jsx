// ============================================================
// ARAMA SAHNESİ — tam ekran rakip arama (Ajan I, I.2 — Ida onayladı)
//
// Eski arama ekranın ortasında küçük bir pencereydi (QtModal + KarsilasmaSahnesi).
// Artık "Hazır mısın?" kapısıyla AYNI sahne: mor maç zemini, solda oyuncu kartı,
// ortada VS, sağda rakip yeri. Rakip bulununca silüet açılır, rakip kartı kayarak
// gelir, VS parlar; ~2 sn sonra çağıran ekran maça/kapıya geçer.
//
// YALNIZ SUNUM: eşleştirme mantığı (kuyruga_gir / quick_match / duello_ara, E'nin
// rastgele eşleşme süresi, ~3 sn yoklama) çağıran ekranda (RakipAra, DuelloArama) kalır.
// Bütün aranan modlar aynı bileşeni kullanır: Klasik (Serbest/Dereceli), Saf Bilgi, Düello.
//
// iOS: kök katman `position: fixed` ve body'ye portal; kökte transform YOK, hareket
// yalnız iç öğelerde (transform/opacity). Yükseklik 100dvh. Azaltılmış harekette durağan.
// Ekranda "bot" kelimesi GEÇMEZ.
// ============================================================
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../src/context/AuthContext.jsx";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import { useOyuncuSeviyeleri } from "../lib/oyuncuSeviye.js";
import { sesVsAni } from "../lib/ses.js";
import { tt } from "../lib/dil.js";
import { QtDugme, QtIkon, QtLigRozeti, QtRozet, sinif } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-arama-sahnesi.css";

/** Rakip bulunduktan sonra maça/kapıya geçmeden önce VS anının süresi (ms). */
export const ARAMA_GECIS_MS = 2000;
/** VS sesi rakip kartı yerine oturduğunda çalar (ms, bulunma anından). */
const VS_SES_MS = 450;

const MOD_AD = { klasik: "Klasik", saf: "Saf Bilgi", duello: "Düello" };
const MOD_IKON = { klasik: "klasik", saf: "kitap", duello: "duello" };
const LIGLER = ["bronz", "gumus", "altin", "elmas", "efsane"];

function sureYaz(sn) {
  const s = Math.max(0, Math.floor(sn));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Oyuncu kartı: temalı çerçeveli avatar, ad, level, lig. Kapıdaki VS kartıyla aynı dil. */
export function VsKarti({ profil, kart, taraf = "ben", className, children }) {
  const lig = LIGLER.includes(kart?.lig ?? profil?.lig) ? (kart?.lig ?? profil?.lig) : null;
  const level = kart?.level ?? profil?.level;
  return (
    <div className={sinif("ara-kart", `ara-kart--${taraf}`, className)}>
      <CerceveliAvatar profile={profil} userId={profil?.id} boyut={92} hareketli />
      <span className="ara-kart-ad">{profil?.gorunen_ad ?? tt("Sen")}</span>
      <span className="ara-kart-rozetler">
        {level != null && <QtRozet boyut="k" ton="koyu">{tt("Lv {0}", { 0: level })}</QtRozet>}
        {lig && <QtLigRozeti lig={lig} boyut="k" />}
      </span>
      {children}
    </div>
  );
}

/** Sağdaki boş yer: dönen silüetler + soru işareti. */
function RakipYeri({ etiket }) {
  return (
    <div className="ara-kart ara-kart--bos" aria-hidden="true">
      <span className="ara-siluet">
        <span className="ara-siluet-serit">
          {[0, 1, 2, 0].map((v, i) => (
            <svg key={i} className={`ara-siluet-sekil ara-siluet-sekil--${v}`} viewBox="0 0 64 64">
              {v === 1 && <path d="M18 27c0-10 6-17 14-17s14 7 14 17v8H18z" className="sac" />}
              <circle cx="32" cy="25" r="11" />
              {v === 2 && <path d="M19 21c2-8 8-12 13-12s11 4 13 12l4 1H15z" className="sac" />}
              <path d="M12 60c1-12 9-20 20-20s19 8 20 20z" />
            </svg>
          ))}
        </span>
        <span className="ara-siluet-soru"><QtIkon ad="soru" boyut={30} /></span>
      </span>
      <span className="ara-kart-ad ara-kart-ad--soluk">{etiket}</span>
    </div>
  );
}

/**
 * @param {object} p
 * @param {"klasik"|"saf"|"duello"} p.mod
 * @param {boolean} p.dereceli
 * @param {number}  p.gecen          geçen süre (sn, yukarı sayar — hedef süre sunucuda)
 * @param {"ariyor"|"hazirlaniyor"|"bulundu"|"hata"} p.durum
 * @param {object|null} p.rakip      bulunduysa rakibin profili (id, gorunen_ad, gorunen_avatar…)
 * @param {string|null} [p.ezeli]    "Bu oyuncuyla 7-4 öndesin"
 * @param {string|null} [p.bilgi]    üstte kısa bilgi ("Rakip bağlanamadı, yeni rakip aranıyor")
 * @param {React.ReactNode} [p.alt]  başlığın altındaki satır (kategori / ipucu)
 * @param {string|null} [p.hata]
 * @param {() => void} p.onIptal
 * @param {() => void} [p.onTekrar]
 */
export default function AramaSahnesi({
  mod = "klasik", dereceli = true, gecen = 0, durum = "ariyor", rakip = null,
  ezeli = null, bilgi = null, alt = null, hata = null, onIptal, onTekrar,
}) {
  const { user, profile } = useAuth();
  const kartlar = useOyuncuSeviyeleri([user?.id, rakip?.id]);
  const iptalRef = useRef(null);
  const bulundu = durum === "bulundu";
  const iptalEdilebilir = !bulundu;

  // Kaydırmayı kilitle (arka sayfa kaymasın); ilk odak İptal'de.
  useEffect(() => {
    const kok = document.documentElement;
    const onceki = kok.style.overflow;
    kok.style.overflow = "hidden";
    iptalRef.current?.focus?.();
    return () => { kok.style.overflow = onceki; };
  }, []);

  // Esc = İptal (yalnız arama sürerken)
  const iptalFn = useRef(onIptal);
  iptalFn.current = onIptal;
  useEffect(() => {
    if (!iptalEdilebilir) return undefined;
    const tus = (e) => { if (e.key === "Escape") iptalFn.current?.(); };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [iptalEdilebilir]);

  // VS anı sesi: rakip kartı yerine oturunca bir kez
  useEffect(() => {
    if (!bulundu) return undefined;
    const t = window.setTimeout(() => sesVsAni(), VS_SES_MS);
    return () => window.clearTimeout(t);
  }, [bulundu]);

  const baslik = bulundu
    ? tt("Rakip bulundu!")
    : durum === "hata"
      ? tt("Rakip bulunamadı")
      : durum === "hazirlaniyor" ? tt("Maç hazırlanıyor…") : tt("Rakip aranıyor…");

  return createPortal(
    <div className={sinif("ara qt-sahne-mac", bulundu && "ara--bulundu")}
         role="dialog" aria-modal="true" aria-labelledby="ara-baslik">
      <div className="ara-isik" aria-hidden="true"><span /><span /></div>

      <header className="ara-ust">
        <span className="ara-ust-rozetler">
          <QtRozet ton="koyu" ikon={MOD_IKON[mod]}>{tt(MOD_AD[mod] ?? MOD_AD.klasik)}</QtRozet>
          <QtRozet ton={dereceli ? "coin" : "notr"} ikon={dereceli ? "lig" : undefined}>
            {dereceli ? tt("Dereceli") : tt("Serbest")}
          </QtRozet>
        </span>
        <span className="ara-sure qt-sayi" role="timer" aria-label={tt("{0} saniye geçti", { 0: gecen })}>
          <QtIkon ad="saat" boyut={18} /> {sureYaz(gecen)}
        </span>
      </header>

      <main className="ara-govde">
        {bilgi && !bulundu && (
          <p className="ara-bilgi" role="status"><QtIkon ad="bilgi" boyut={18} /> {bilgi}</p>
        )}
        <h1 id="ara-baslik" className="ara-baslik" aria-live="polite">{baslik}</h1>

        <div className="ara-vs">
          <VsKarti profil={profile ? { ...profile, id: user?.id } : { id: user?.id }} kart={kartlar[user?.id]} taraf="ben" />
          <span className="ara-vs-rozet" aria-hidden="true"><span>VS</span></span>
          {rakip
            ? <VsKarti profil={rakip} kart={kartlar[rakip.id]} taraf="rakip" />
            : <RakipYeri etiket={durum === "hata" ? tt("Rakip bulunamadı") : bulundu ? tt("Rakip bulundu!") : tt("Aranıyor")} />}
        </div>

        {ezeli && <p className="ara-ezeli">{ezeli}</p>}
        {!bulundu && !hata && alt && <div className="ara-alt-satir">{alt}</div>}
        {hata && <p className="ara-hata" role="alert"><QtIkon ad="uyari" boyut={18} /> {hata}</p>}
      </main>

      <footer className="ara-alt">
        {hata && onTekrar && (
          <QtDugme tamGenislik ikon="yenile" onClick={onTekrar}>{tt("Tekrar dene")}</QtDugme>
        )}
        {iptalEdilebilir && (
          <QtDugme ref={iptalRef} tur="ikincil" tamGenislik onClick={onIptal}>{tt("İptal")}</QtDugme>
        )}
      </footer>
    </div>,
    document.body,
  );
}
