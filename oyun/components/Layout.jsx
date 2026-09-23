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
import { QtUstCubuk, QtUstMenu, QtAltMenu, QtMarka, QtIkonDugme } from "../tasarim/index.js";
import "../tasarim/ekranlar/a-kabuk.css";
import CoinHapi from "./CoinHapi.jsx";
import AvatarMenu from "./AvatarMenu.jsx";
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
    <div className="app qt-sayfa a-kabuk">
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

      {/* ============ ÜST ÇUBUK (Tasarım Adım 2 · Yön A, Şerit A) ============
          QtUstCubuk: marka + masaüstü menü (≥ 850 px) + sağda eylemler.
          Yapışkan kap `.a-ust-blok` davet bandını ve bildirim şeridini de
          taşır; sayfa kaydırılsa da ikisi çubuğun altında kalır.
          Maç ekranlarında gizlenir: body.bd-oyun-modu (oyun/lib/oyunModu.js). */}
      <div className="a-ust-blok">
        <QtUstCubuk
          marka={<QtMarka as={Link} to={y()} aria-label={tt("Quiz Tactics ana sayfa")} />}
          menu={
            <QtUstMenu
              Baglanti={NavLink}
              etiket={tt("Ana menü")}
              ogeler={[
                { kod: "ana", ad: tt("Ana Sayfa"), to: y(), end: true },
                { kod: "modlar", ad: tt("Oyun Modları"), to: y("/modlar") },
                { kod: "lig", ad: tt("Lig"), to: y("/siralama") },
                // Bekleyen meydan okuma/arkadaş isteği: sayı değil nokta
                { kod: "arkadas", ad: tt("Arkadaşlar"), to: y("/arkadaslar"), rozet: bekleyen > 0 },
                // DÜKKÂN masaüstünde de menüde: alt menü 850 px üstünde gizli,
                // yoksa büyük ekranda dükkâna tek yol coin hapı kalırdı.
                { kod: "dukkan", ad: tt("Dükkân"), to: y("/joker") },
              ]}
            />
          }
          sag={
            profile ? (
              <>
                <BildirimZili />
                <CoinHapi />
                {/* GÖRÜNÜM KISAYOLU — gardırop DONDURULDU (bkz.
                    oyun/lib/ozellikBayraklari.js). Bayrak true olunca geri gelir. */}
                {GARDIROP_ACIK && (
                  <QtIkonDugme as={Link} to={y("/gorunum")} ikon="tisort" etiket={tt("Görünüm — karakterini giydir")} />
                )}
                {/* Avatar kısayol menüsü (Profilim · Ayarlar · Ses · Dil · Çıkış) */}
                <AvatarMenu profile={profile} />
              </>
            ) : <span />
          }
        />
        {/* Masaüstü menüdeki bekleyen noktası yalnız görsel; sayı ekran okuyucuya burada */}
        {bekleyen > 0 && <span className="qt-gizli">{tt("{n} bekleyen istek", { n: bekleyen })}</span>}

        {profile && <DavetBandi />}
        <BildirimToast />
      </div>

      {/* Kabuk 1180 px. `.shell` sınıfı henüz yeniden yazılmamış sayfaların
          eski düzeni için duruyor (Faz 4'te temizlenir). */}
      <main className="shell a-icerik qt-altmenu-payi">
        <Outlet />
      </main>

      {/* ============ ALT MENÜ — yalnız 850 px altında ============
          Beş sekme: Ana Sayfa · Arkadaşlar · Lig · Dükkân · Profil.
          MEYDAN SEKMESİ YOK — 3B meydan donduruldu (ozellikBayraklari.js).
          `mobile-nav` EK sınıfı korunur: MacSonuSahnesi eylem çubuğunu bu
          çubuğun üst kenarına göre ölçüyor. iOS: sabit öğede ve atalarında
          transform yok (basma hareketi içteki ikonda). */}
      <QtAltMenu
        sabit
        yalnizMobil
        className="mobile-nav a-altmenu"
        Baglanti={NavLink}
        etiket={tt("Mobil menü")}
        sekmeler={[
          { kod: "ana", ad: tt("Ana Sayfa"), ikon: "ev", to: y(), end: true },
          {
            kod: "arkadas", ad: tt("Arkadaşlar"), ikon: "kisiler", to: y("/arkadaslar"),
            rozet: bekleyen > 0, rozetEtiketi: tt("{n} bekleyen istek", { n: bekleyen }),
          },
          { kod: "lig", ad: tt("Lig"), ikon: "lig", to: y("/siralama") },
          { kod: "dukkan", ad: tt("Dükkân"), ikon: "dukkan", to: y("/joker") },
          { kod: "profil", ad: tt("Profil"), ikon: "kisi", to: y("/profil") },
        ]}
      />
    </div>
  );
}
