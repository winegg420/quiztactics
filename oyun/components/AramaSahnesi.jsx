// ============================================================
// ARAMA SAHNESİ — tam ekran rakip arama (Ajan I, I.2 — Ida onayladı)
//
// GÖRÜNÜM (24 Eyl 2026, Ida seçti — /tasarim-onizleme › arama › B "Güneş Halkası"): gök mavisi zemin,
// ortada dönen halka + slot makarası + yörüngede avatarlar; bulununca makara rakipte durur, iki avatar
// yanlardan gelir, VS. Çizim TEMBEL parçada: AramaGunesHalkasi.jsx (+ arama-gunes-halkasi.css). Bu dosyada
// yalnız ortak davranış kalır (kaydırma kilidi, Esc, VS sesi, başlık) + VsKarti (maç kapısı/dükkân kullanır).
// Aşağıdaki eski tarif (mor zemin, kartlar) VsKarti ve a-arama-sahnesi.css için geçerli.
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
import { lazy, Suspense, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../src/context/AuthContext.jsx";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import { KartArkaPlanKatmani, kartArkaPlanSinifi, useKartArkaPlani } from "../tasarim/arka-plan/kayit.jsx";
import IsimEfekti from "./IsimEfekti.jsx";
import OyuncuAdiDugmesi from "./OyuncuAdiDugmesi.jsx";
import Bayrak from "./Bayrak.jsx";
import { adKisalt } from "../lib/adKisalt.js";
import OyuncuLigAmblemi from "./OyuncuLigAmblemi.jsx";
import { kozmetikTemasi } from "../lib/kozmetik.js";
import { useOyuncuSeviyeleri } from "../lib/oyuncuSeviye.js";
import { sesVsAni } from "../lib/ses.js";
import { tt } from "../lib/dil.js";
import { QtDugme, QtRozet, sinif } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-arama-sahnesi.css";

// Güneş Halkası görünümü tembel parçada; tarayıcı boşta kalınca önceden indirilir (arama açılınca beklemesin).
const sahneYukle = () => import("./AramaGunesHalkasi.jsx");
const AramaGunesHalkasi = lazy(sahneYukle);
// 7 Eki 2026: açılıştan 5 sn sonra başlar — parça 31 avatarı da önden indiriyor; hemen başlayınca
// yavaş ağda ilk ekranın veri istekleriyle bant yarışıyordu. Arama erken açılırsa lazy zaten indirir.
if (typeof window !== "undefined") {
  const bosta = window.requestIdleCallback ?? ((f) => window.setTimeout(f, 4000));
  window.setTimeout(() => {
    bosta(() => { sahneYukle().catch(() => { /* açılınca yeniden denenir */ }); }, { timeout: 12000 });
  }, 5000);
}

/** Parça inene kadar (ilk açılışta kısa an): aynı gök zemini + başlık + İptal. */
function YukleniyorYedek({ baslik, onIptal, iptalEdilebilir }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ara-baslik"
         style={{ position: "fixed", inset: 0, height: "100dvh", zIndex: "var(--qt-z-ortu, 90)", display: "flex",
                  flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24, padding: 16,
                  background: "linear-gradient(180deg, #74c1ff 0%, #dff0ff 78%, #eef8ff 100%)", color: "#1d2152" }}>
      <h1 id="ara-baslik" style={{ margin: 0, fontFamily: "var(--qt-f-baslik)", fontSize: 26 }}>{baslik}</h1>
      {iptalEdilebilir && (
        // 8 Eki 2026: maç akışında tek kelime + tek stil — "Vazgeç", QtDugme ikincil (Hazır kapısı, mod seçimi ile aynı)
        <div style={{ width: "min(100%, 420px)" }}>
          <QtDugme tur="ikincil" tamGenislik onClick={onIptal}>{tt("Vazgeç")}</QtDugme>
        </div>
      )}
    </div>
  );
}

/** Rakip bulunduktan sonra maça/kapıya geçmeden önce VS anının süresi (ms). */
export const ARAMA_GECIS_MS = 2000;
/** VS sesi rakip kartı yerine oturduğunda çalar (ms, bulunma anından). */
const VS_SES_MS = 450;

const LIGLER = ["bronz", "gumus", "altin", "elmas", "efsane"];

/**
 * Oyuncu kartı: temalı çerçeveli avatar, ad, level, lig. Kapıdaki VS kartıyla aynı dil.
 * 540: kartın arka planı oyuncunun VS kartı teması (kart.vs_karti), adı isim efektiyle (kart.isim_efekti) —
 * ikisi de oyuncu kartından (oyuncu_kartlari; ek sorgu yok). `vsKarti` / `isimEfekti` verilirse onlar (önizleme).
 * Ada dokununca oyuncu kartı açılır; önizlemede (vsKarti/isimEfekti verilince) kapalı — `adDokunur` ile zorlanır.
 * `acik`: kart açık zeminde (Hazır kapısı, 8 Eki 2026) — isim efekti açık paletle çizilir (tema/arka plan yoksa).
 */
export function VsKarti({ profil, kart, taraf = "ben", className, children, vsKarti, isimEfekti, adDokunur, arkaPlan, acik = false }) {
  // 30 Eyl: herkes KENDİ kart arka planıyla (oyuncu kartından; ek sorgu yok). `arkaPlan` verilirse (dükkân önizlemesi) o.
  const kartArkaPlani = useKartArkaPlani(arkaPlan !== undefined ? null : profil?.id, kart ?? undefined);
  const arkaPlanSanat = arkaPlan !== undefined ? arkaPlan : kartArkaPlani;
  const adAcik = adDokunur ?? (vsKarti === undefined && isimEfekti === undefined);
  const lig = LIGLER.includes(kart?.lig ?? profil?.lig) ? (kart?.lig ?? profil?.lig) : null;
  const level = kart?.level ?? profil?.level;
  const ulke = kart?.ulke ?? profil?.ulke;
  const vsTema = kozmetikTemasi(vsKarti !== undefined ? vsKarti : kart?.vs_karti);
  const ef = isimEfekti !== undefined ? isimEfekti : kart && "isim_efekti" in kart ? kart.isim_efekti : undefined;
  return (
    <div className={sinif("ara-kart", `ara-kart--${taraf}`, vsTema && "qt-vs", className) + kartArkaPlanSinifi(arkaPlanSanat)} data-vs={vsTema ?? undefined}>
      <KartArkaPlanKatmani sanat={arkaPlanSanat} hareketli yukseklik={200} duzen="dikey" />
      <CerceveliAvatar profile={profil} userId={profil?.id} boyut={92} hareketli className="ara-kart-avatar" {...(kart ? { kart } : {})} />
      {/* Ajan C: ada dokununca oyuncu kartı (önizlemelerde — vsKarti/isimEfekti verilince — kapalı) */}
      <OyuncuAdiDugmesi userId={adAcik ? profil?.id : null} profil={profil} className="ara-kart-ad">
        <IsimEfekti userId={profil?.id} {...(ef !== undefined ? { ef } : {})} koyu={!acik || Boolean(vsTema) || Boolean(arkaPlanSanat)} hareketli>{adKisalt(profil?.gorunen_ad) ?? tt("Sen")}</IsimEfekti>
      </OyuncuAdiDugmesi>
      <span className="ara-kart-rozetler">
        {/* 8 Eki 2026: maç şeridiyle tek biçim — bayrak · Lv · lig amblemi (ülke yoksa bayrak çizilmez) */}
        {ulke ? <Bayrak kod={ulke} boyut={18} className="ara-kart-bayrak" /> : null}
        {level != null && <QtRozet boyut="k" ton="koyu">{tt("Lv {0}", { 0: level })}</QtRozet>}
        {/* 560: lig amblemi (önizlemedeki gibi, isim yanında; lig adı erişilebilir adında) */}
        {lig && <OyuncuLigAmblemi lig={lig} boyut={24} />}
      </span>
      {children}
    </div>
  );
}

/**
 * @param {object} p
 * @param {"klasik"|"saf"|"duello"|"grup"} p.mod   grup: çok oyunculu kuyruk (ChallengesPage — VS anı yok, bulununca sayfa geçer)
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
      : durum === "hazirlaniyor" ? tt("Maç hazırlanıyor…") : mod === "grup" ? tt("Oyuncu aranıyor…") : tt("Rakip aranıyor…");

  // Görünüm: Güneş Halkası (tembel parça). Davranış (yukarıdaki etkiler) burada kalır.
  return createPortal(
    <Suspense fallback={<YukleniyorYedek baslik={baslik} onIptal={onIptal} iptalEdilebilir={iptalEdilebilir} />}>
      <AramaGunesHalkasi
        mod={mod} dereceli={dereceli} gecen={gecen} durum={durum} rakip={rakip} ezeli={ezeli} bilgi={bilgi}
        alt={alt} hata={hata} onIptal={onIptal} onTekrar={onTekrar} baslik={baslik}
        ben={profile ? { ...profile, id: user?.id } : { id: user?.id }} kartlar={kartlar}
        gecisMs={ARAMA_GECIS_MS} iptalRef={iptalRef}
      />
    </Suspense>,
    document.body,
  );
}
