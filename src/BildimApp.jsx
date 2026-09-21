// ============================================================
// BİLDİM — BAĞIMSIZ SİTE KÖKÜ
//
// Aynı depo iki siteyi besler:
//   • VITE_MOD tanımsız  → src/App.jsx  (idaGG Game Center hub, quiz /oyun/*)
//   • VITE_MOD=bildim    → BU DOSYA     (yalnız Bildim, rotalar KÖKTE)
//
// App.jsx'e hiç dokunulmadı: hub aynen çalışmaya devam eder. Buradaki rota
// ağacı App.jsx'teki /bildim bloğunun birebir aynısıdır, yalnız kökte durur.
// Linkler oyun/lib/yol.js içindeki y() ile üretildiği için ikisi de doğru.
// ============================================================

import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { girisHedefiniAl, bilinenYol } from "./lib/girisHedefi.js";
import { useAuth } from "./context/AuthContext.jsx";
import { supabaseHazir } from "./lib/supabase.js";
import Login from "./pages/Login.jsx";
// Meydan (3B harita) ve gardırop DONDURULDU (Arayüz Yenileme, 20 Eyl 2026).
// Rotalar SİLİNMEDİ; bayrak kapalıyken "Bu bölüm şu an kapalı" notu gösterip
// ana sayfaya yönlendiriyorlar. Geri açma: oyun/lib/ozellikBayraklari.js.
import { MEYDAN_ACIK, GARDIROP_ACIK } from "../oyun/lib/ozellikBayraklari.js";

import Layout from "../oyun/components/Layout.jsx";
import AnaEkranaEkle from "../oyun/components/AnaEkranaEkle.jsx";
import Home from "../oyun/pages/Home.jsx";
import ChallengesPage from "../oyun/pages/ChallengesPage.jsx";
import MatchPage from "../oyun/pages/MatchPage.jsx";
import GroupMatchPage from "../oyun/pages/GroupMatchPage.jsx";
// DONDURULDU (Paket 24 B): HizliMacPage dosyasi duruyor, hicbir rota cagirmiyor.
// Geri acmak: bu import + asagidaki rotayi geri koy, oyun_ayarlari.hizli_mac_acik = true.
const TournamentPage = lazy(() => import("../oyun/pages/TournamentPage.jsx"));
const LeaderboardPage = lazy(() => import("../oyun/pages/LeaderboardPage.jsx"));
const FriendsPage = lazy(() => import("../oyun/pages/FriendsPage.jsx"));
const MesajlarPage = lazy(() => import("../oyun/pages/MesajlarPage.jsx"));   // Paket 35 E
const ProfilePage = lazy(() => import("../oyun/pages/ProfilePage.jsx"));
const BulunamadiPage = lazy(() => import("../oyun/pages/BulunamadiPage.jsx"));   // Paket 41 I
const DavetPage = lazy(() => import("../oyun/pages/DavetPage.jsx"));
const JokerDukkani = lazy(() => import("../oyun/pages/JokerDukkani.jsx"));
// Arayüz Yenileme (20 Eyl 2026): prototipin "Oyun Modları" sayfası.
// YENİ MOD YOK — yalnız var olan rotalara götüren bir katalog sayfası.
const ModlarPage = lazy(() => import("../oyun/pages/ModlarPage.jsx"));
// DONDURULDU (Paket 24 B): HizliModPage dosyasi duruyor, hicbir rota cagirmiyor.
// Geri acmak: bu satir + rota geri konur, oyun_ayarlari.hizli_mod_acik = true.
const DuelloPage = lazy(() => import("../oyun/pages/DuelloPage.jsx"));
const CalismaPage = lazy(() => import("../oyun/pages/CalismaPage.jsx"));
// Meydan (3B): three.js yalniz bu rotaya girilince iner (ayri chunk)
const HaritaSayfasi = lazy(() => import("../oyun/harita/HaritaSayfasi.jsx"));
// Harita yenileme Aşama 1 test sahnesi (STIL.md) — oyunu etkilemez, ayrı rota
const HaritaDeneme = lazy(() => import("../oyun/harita/deneme/DenemeSayfasi.jsx"));
const HazirInsanPrototipi = lazy(() => import("../oyun/harita/aday/HazirInsanPrototipi.jsx"));
// Görünüm = 3B GARDIROP (oyun/avatar3d/gardrop.html). Ayrı giriş noktası
// olduğu için rota bileşen değil, yönlendirmedir (bkz. GardropaGit.jsx).
// 2B KARAKTER SİSTEMİ TAMAMEN KALKTI: sayfası da rotadan çıktı, dosyaları
// oyun/karakter/ altında duruyor. Eski 3B görünüm sayfası yedekte:
//   /gorunum-3b  → eski 3B görünüm sayfası
// Paket 17 §D: eski gardırop DONDURULDU (dosyalar duruyor, arayüzden giriş yok). /gorunum yeni karakter vitrini;
// /gorunum-3b ve eski HTML girişleri (oyun/avatar3d/*.html) buraya yönlenir. Geri açma: oyun/CLAUDE.md.
const KarakterVitrini = lazy(() => import("../oyun/vitrin/KarakterVitrini.jsx"));
const GorunumPage = lazy(() => import("../oyun/pages/GorunumPage.jsx"));
// Yasal metinler giriş duvarının ÖNÜNDE olmalı (Play Store + reklam ağları).
const GizlilikPage = lazy(() => import("../oyun/pages/GizlilikPage.jsx"));
const KosullarPage = lazy(() => import("../oyun/pages/KosullarPage.jsx"));
// Üretim akışından bağımsız, menüde görünmeyen avatar görsel laboratuvarı.
const AvatarLabPage = lazy(() => import("../oyun/pages/AvatarLabPage.jsx"));
const AvatarLabV2Page = lazy(() => import("../oyun/pages/AvatarLabV2Page.jsx"));
const AvatarPreviewProPage = lazy(() => import("../oyun/pages/AvatarPreviewProPage.jsx"));
const LogoExplorationPage = lazy(() => import("../oyun/pages/LogoExplorationPage.jsx"));

// Eski hub adresleri (/oyun/...) bu sitede köke indirilir. Bookmark, push
// bildirimi deep-link'i ve paylaşılmış davet linkleri kırılmasın diye.
function OnekiAt() {
  const { pathname, search } = useLocation();
  // Sunucu bildirim yollarını hâlâ eski hub önekiyle yazıyor ('/bildim/duello', '/bildim/mac/…');
  // o önek de atılır (Paket 38 A — önceden '/bildim/*' ana sayfaya düşüyordu).
  const kalan = pathname.replace(/^\/(oyun|bildim)(?=\/|$)/, "") || "/";
  return <Navigate to={kalan + search} replace />;
}

export default function BildimApp() {
  const { session, loading } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Giriş sonrası derin bağlantıyı geri yükle (bkz. src/lib/girisHedefi.js).
  useEffect(() => {
    if (!session || loading) return;
    const hedef = girisHedefiniAl();
    if (hedef && hedef !== pathname) navigate(hedef, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, loading]);

  const bagimsizModul =
    pathname.startsWith("/insan-prototip") ||
    pathname.startsWith("/preview/avatar-lab") ||
    pathname.startsWith("/preview/avatar-pro") ||
    pathname.startsWith("/preview/logo-exploration") ||
    pathname.startsWith("/gizlilik") || pathname.startsWith("/kosullar");

  if (!supabaseHazir && !bagimsizModul) {
    return (
      <div className="giris">
        <div className="buyuk-logo">Quiz Tactics</div>
        <div className="hata-kutu">
          Supabase yapılandırması eksik. <code>.env</code> dosyasına
          VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ekleyin.
        </div>
      </div>
    );
  }

  if (loading && !bagimsizModul)
    return <div className="yukleniyor">Yükleniyor…</div>;

  // iPhone yönlendirmesi giriş ekranında da çıkmalı: kullanıcı Safari'de
  // siteyi ilk açtığında karşılaştığı ekran burası.
  // Paket 41 I: oturumsuzken bilinmeyen adrese gelen giriş ekranını kökte görür;
  // giriş sonrası ana sayfaya iner (adres /asdasd'de kalıp belirsizleşmez).
  if (!session && !bagimsizModul && !bilinenYol(pathname))
    return <Navigate to="/" replace />;

  if (!session && !bagimsizModul)
    return (
      <>
        <Login />
        <AnaEkranaEkle />
      </>
    );

  return (
    <Suspense fallback={<div className="yukleniyor">Yükleniyor…</div>}>
      <Routes>
        <Route path="/gizlilik" element={<GizlilikPage />} />
        <Route path="/kosullar" element={<KosullarPage />} />
        <Route path="/insan-prototip" element={<HazirInsanPrototipi />} />
        <Route path="/preview/avatar-lab" element={<AvatarLabPage />} />
        <Route path="/preview/avatar-lab-v2" element={<AvatarLabV2Page />} />
        <Route path="/preview/avatar-pro" element={<AvatarPreviewProPage />} />
        <Route path="/preview/logo-exploration" element={<LogoExplorationPage />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="turnuva" element={<TournamentPage />} />
          <Route path="meydan" element={<ChallengesPage />} />
          <Route path="mac/:id" element={<MatchPage />} />
          <Route path="grup-mac/:id" element={<GroupMatchPage />} />
          {/* DONDURULDU (Paket 24 B): sayfa duruyor, giris yok - ana sayfaya yonlendirir. */}
          {/* Paket 41 I: sessiz yönlendirme yerine "Bu mod şu an kapalı" notu, sonra ana sayfa */}
          <Route path="hizli-mac/:id" element={<BulunamadiPage kapaliMod />} />
          <Route path="siralama" element={<LeaderboardPage />} />
          <Route path="arkadaslar" element={<FriendsPage />} />
          <Route path="mesajlar" element={<MesajlarPage />} />
          <Route path="mesajlar/:kisi" element={<MesajlarPage />} />
          <Route path="davet/:kod" element={<DavetPage />} />
          <Route path="joker" element={<JokerDukkani />} />
          <Route path="hizli-mod" element={<BulunamadiPage kapaliMod />} />
          <Route path="duello" element={<DuelloPage />} />
          <Route path="duello/:id" element={<DuelloPage />} />
          <Route path="calisma" element={<CalismaPage />} />
          <Route path="modlar" element={<ModlarPage />} />
          {/* DONDURULDU — dosyalar ve veri yerinde; yalnız giriş kapalı. */}
          <Route path="harita" element={MEYDAN_ACIK ? <HaritaSayfasi /> : <BulunamadiPage kapaliMod kapaliOzellik />} />
          <Route path="harita-deneme" element={MEYDAN_ACIK ? <HaritaDeneme /> : <BulunamadiPage kapaliMod kapaliOzellik />} />
          <Route path="gorunum" element={GARDIROP_ACIK ? <KarakterVitrini /> : <BulunamadiPage kapaliMod kapaliOzellik />} />
          <Route path="gorunum-3b" element={GARDIROP_ACIK ? <Navigate to="../gorunum" replace /> : <BulunamadiPage kapaliMod kapaliOzellik />} />
          <Route path="profil" element={<ProfilePage />} />
          {/* Paket 41 I: bilinmeyen adres → 404 (eskiden sessizce ana sayfa) */}
          <Route path="*" element={<BulunamadiPage />} />
        </Route>

        {/* Geriye uyumluluk: hub adresleri → kök */}
        <Route path="/oyun/*" element={<OnekiAt />} />
        <Route path="/bildim/*" element={<OnekiAt />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AnaEkranaEkle />
    </Suspense>
  );
}
