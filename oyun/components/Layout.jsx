import { Outlet, NavLink, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { supabase } from "../../src/lib/supabase.js";
import RankUpOverlay from "./RankUpOverlay.jsx";

import BildirimZili from "./BildirimZili.jsx";
import KurulumSihirbazi from "./KurulumSihirbazi.jsx";
import DavetBandi from "./DavetBandi.jsx";
import Tanitim from "./Tanitim.jsx";
import { useBildimManifest } from "../lib/manifest.js";
import BildirimToast from "./BildirimToast.jsx";
import Ikon from "./Ikon.jsx";
import CoinHapi from "./CoinHapi.jsx";
import AvatarMenu from "./AvatarMenu.jsx";
import Logo from "./Logo.jsx";
// SADELEŞTİRME: tema ve ses düğmeleri üst bardan Profil sayfasına
// taşındı (sadeleştirme). Bileşenler silinmedi; geri istenirse tek satır.
import { y } from "../lib/yol.js";
// Meydan/gardirop dondurma bayraklari (Arayuz Yenileme, 20 Eyl 2026)
import { GARDIROP_ACIK } from "../lib/ozellikBayraklari.js";
import { cihazBildir } from "../lib/cihaz.js";
import { ayarlar } from "../lib/ayarlar.js";
import { turnuvaSaatleriniAyarla, turnuvaListesiniAyarla } from "../lib/zaman.js";
import { tt } from "../lib/dil.js";
import { useDil } from "../lib/dilKanca.js";

export default function Layout() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  // Profildeki dil tercihi bu tarayıcıdaki sayfa dilinden farklıysa bir kez eşitler.
  useDil();
  const [bekleyen, setBekleyen] = useState(0);

  // Bildim rotalarında PWA kimliği Bildim'in kendi manifesti olsun
  useBildimManifest();
  // Tanıtım yalnız ilk girişte, kurulumdan ÖNCE gösterilir
  const [tanitimGosterildi, setTanitimGosterildi] = useState(() => {
    try {
      return localStorage.getItem("bildim_tanitim") === "1";
    } catch {
      return true; // özel mod: tanıtımı zorlamayalım
    }
  });

  // Cihaz kimliği oturum başına bir kez bildirilir (sıralı maç koruması).
  useEffect(() => {
    if (!user) return;
    cihazBildir();
  }, [user?.id]);

  // İLK GİRİŞ: karakterini henüz seçmemiş oyuncu bir kez Görünüm
  // sayfasına yönlendirilir. ENGELLEME YOK — hesap açılışta rastgele bir
  // bedava karakterle geliyor (bkz. migration 158), oyuncu isterse
  // dokunmadan oynamaya devam eder.
  //
  // KURULUM BİTMEDEN YÖNLENDİRME YOK: takma ad / avatar / şehir sihirbazı
  // tam ekran bir modal katmanıdır (bd-modal-katman, position:fixed). Görünüm
  // sayfası altında açılırsa kartlar görünür ama tıklama sihirbaza gider —
  // oyuncu "karakter seçemiyorum" der. Önce sihirbaz bitsin.
  useEffect(() => {
    // GARDIROP DONDURULDU (Arayüz Yenileme, 20 Eyl 2026): görünüm sayfası
    // kapalıyken ilk girişte oraya yönlendirme de yapılmaz.
    if (!GARDIROP_ACIK) return;
    if (!profile) return;
    if (!profile.takma_ad_secildi || !profile.avatar_onayli || !profile.ulke) return;
    let gosterildi = true;
    try { gosterildi = localStorage.getItem("bildim_karakter_secildi") === "1"; }
    catch { /* özel mod: yönlendirme yapılmaz */ }
    if (gosterildi) return;
    try { localStorage.setItem("bildim_karakter_secildi", "1"); } catch { /* yut */ }
    navigate(y("/gorunum"));
  }, [profile?.id, profile?.takma_ad_secildi, profile?.avatar_onayli, profile?.ulke]);

  // Turnuva saatleri sunucudan (oyun_ayarlari) okunur; geri sayımlar ve
  // meydandaki kupa binası bu değerleri kullanır.
  useEffect(() => {
    ayarlar()
      .then((o) => {
        // Günde 7 turnuva (Paket 12, madde 7): liste tek kaynak. Eski
        // sabah/akşam değerleri yalnız eski çağrılar için saklanır.
        if (Array.isArray(o?.turnuva_saatleri)) turnuvaListesiniAyarla(o.turnuva_saatleri);
        if (o?.turnuva_saat_sabah && o?.turnuva_saat_aksam) {
          turnuvaSaatleriniAyarla(o.turnuva_saat_sabah, o.turnuva_saat_aksam);
        }
      })
      .catch((e) => console.error("[Bildim] turnuva saatleri okunamadi:", e));
  }, []);

  useEffect(() => {
    if (!user) return;
    let aktif = true;

    // Bekleyen sayısı TEK sunucu çağrısıyla gelir (bkz. migration 122).
    // Eskiden iki ayrı PostgREST HEAD isteği (count=exact) atılıyordu; canlı
    // denetimde ikisi de 503 dönüyor, sayı null geliyor ve rozet hiç
    // görünmüyordu. Üstelik `error` hiç okunmadığı için hata sessizce
    // yutuluyordu — bu yüzden aylarca fark edilmemişti.
    const yukle = async () => {
      try {
        const { data, error } = await supabase.rpc("bekleyen_sayim");
        if (error) throw error;
        if (aktif) setBekleyen(Number(data) || 0);
      } catch (e) {
        // Hata olursa ÖNCEKİ değer korunur; rozet sıfıra düşüp kaybolmasın.
        console.error("[Bildim] bekleyen sayısı alınamadı:", e);
      }
    };
    yukle();

    const kanal = supabase
      .channel("bildirimler")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `oyuncu2=eq.${user.id}` },
        yukle
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships", filter: `addressee=eq.${user.id}` },
        yukle
      )
      .subscribe();

    return () => {
      aktif = false;
      supabase.removeChannel(kanal);
    };
  }, [user]);

  // Zorunlu kurulum: takma ad → avatar → şehir tamamlanmadan oyun açılmaz.
  const kurulumEksik =
    Boolean(profile) &&
    (!profile.takma_ad_secildi || !profile.avatar_onayli || !profile.ulke);

  return (
    <div className="app">
      <RankUpOverlay />
      {kurulumEksik && !tanitimGosterildi ? (
        <Tanitim
          onBitti={() => {
            try {
              localStorage.setItem("bildim_tanitim", "1");
            } catch { /* özel mod */ }
            setTanitimGosterildi(true);
          }}
        />
      ) : (
        kurulumEksik && <KurulumSihirbazi />
      )}

      {/* ============ ÜST ÇUBUK (Arayüz Yenileme, 20 Eyl 2026) ============
          Prototipin iskeleti: marka + masaüstü menü + sağda eylemler.
          Sticky kabuk `.bd-ust-blok` KORUNDU — davet bandı ve bildirim
          toast'ı onun içinde duruyor; kaldırılsa ikisi de akışta kayardı.
          Maç ekranlarında gizlenir: body.bd-oyun-modu (oyun/lib/oyunModu.js). */}
      <div className="bd-ust-blok">
        <header className="topbar">
          <div className="topbar-inner">
            <Link className="brand" to={y()} aria-label={tt("Quiz Tactics ana sayfa")}>
              <Logo boyut={42} className="brand-logo brand-logo--tam" />
              <Logo boyut={36} className="brand-logo brand-logo--ikon" sadeceIkon />
            </Link>

            {/* Masaüstü menü — 850 px altında gizlenir, yerini alt menü alır.
                Dördü de var olan rotalar; yeni rota açılmadı. */}
            <nav className="desktop-nav" aria-label={tt("Ana menü")}>
              <NavLink to={y()} end className={({ isActive }) => (isActive ? "active" : "")}>
                {tt("Ana Sayfa")}
              </NavLink>
              <NavLink to={y("/modlar")} className={({ isActive }) => (isActive ? "active" : "")}>
                {tt("Oyun Modları")}
              </NavLink>
              <NavLink to={y("/siralama")} className={({ isActive }) => (isActive ? "active" : "")}>
                {tt("Lig")}
              </NavLink>
              <NavLink to={y("/arkadaslar")} className={({ isActive }) => (isActive ? "active" : "")}>
                {tt("Arkadaşlar")}
                {bekleyen > 0 && <span className="bd-menu-nokta" aria-label={`${bekleyen} ${tt("bekleyen")}`} />}
              </NavLink>
              {/* DÜKKÂN — masaüstünde de menüde (20 Eyl 2026).
                  Alt menü 850 px üstünde gizli olduğu için büyük ekranda
                  "Dükkân" kelimesi hiçbir yerde görünmüyordu; joker ve coin
                  almanın tek yolu coin hapına basmaktı. */}
              <NavLink to={y("/joker")} className={({ isActive }) => (isActive ? "active" : "")}>
                {tt("Dükkân")}
              </NavLink>
            </nav>

            {profile && (
              <div className="top-actions">
                <BildirimZili />
                <CoinHapi />
                {/* GÖRÜNÜM KISAYOLU — gardırop DONDURULDU (bkz.
                    oyun/lib/ozellikBayraklari.js). Bayrak true olunca geri gelir. */}
                {GARDIROP_ACIK && (
                  <Link to={y("/gorunum")} className="circle-btn bd-gorunum-kisayol"
                        aria-label={tt("Görünüm — karakterini giydir")} title={tt("Görünüm")}>
                    <Ikon ad="tisort" boyut={20} />
                  </Link>
                )}
                {/* Avatar kısayol menüsü (Profilim · Ayarlar · Ses · Dil · Çıkış) */}
                <AvatarMenu profile={profile} />
              </div>
            )}
          </div>
        </header>

        {profile && <DavetBandi />}
        <BildirimToast />
      </div>

      {/* Kabuk 1180 px (prototip `.shell`). Eski 540 px `.app` sınırı
          oyun/styles/yeni.css'te kaldırıldı. */}
      <main className="shell">
        <Outlet />
      </main>

      {/* ============ ALT MENÜ — yalnız 850 px altında ============
          Beş sekme: Ana Sayfa · Arkadaşlar · Lig · Dükkân · Profil.
          MEYDAN SEKMESİ YOK — 3B meydan donduruldu (ozellikBayraklari.js).
          iOS: `position: fixed` ile `transform` aynı öğede KULLANILMAZ;
          güvenli alan payı prototipten geldiği gibi korundu. */}
      <nav className="mobile-nav" aria-label={tt("Mobil menü")}>
        <NavLink to={y()} end className={({ isActive }) => (isActive ? "active" : "")}>
          <span><Ikon ad="ev" boyut={22} /></span>{tt("Ana Sayfa")}
        </NavLink>
        <NavLink to={y("/arkadaslar")} className={({ isActive }) => (isActive ? "active" : "")}>
          <span><Ikon ad="kisiler" boyut={22} /></span>{tt("Arkadaşlar")}
          {/* Bekleyen meydan okuma/arkadaş isteği: sayı değil nokta */}
          {bekleyen > 0 && <span className="bd-menu-nokta" aria-label={`${bekleyen} ${tt("bekleyen")}`} />}
        </NavLink>
        <NavLink to={y("/siralama")} className={({ isActive }) => (isActive ? "active" : "")}>
          <span><Ikon ad="grafik" boyut={22} /></span>{tt("Lig")}
        </NavLink>
        <NavLink to={y("/joker")} className={({ isActive }) => (isActive ? "active" : "")}>
          <span><Ikon ad="yildiz" boyut={22} /></span>{tt("Dükkân")}
        </NavLink>
        <NavLink to={y("/profil")} className={({ isActive }) => (isActive ? "active" : "")}>
          <span><Ikon ad="kisi" boyut={22} /></span>{tt("Profil")}
        </NavLink>
      </nav>
    </div>
  );
}
