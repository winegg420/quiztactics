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

import { Suspense, useEffect } from "react";
// D-103/D-201: tembel sayfalar 1 yeniden denemeyle iner; inemezse Layout içindeki HataSiniri kartı.
import { tembelYukle } from "./lib/tembelYukle.js";
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { girisHedefiniAl, bilinenYol } from "./lib/girisHedefi.js";
import { useAuth } from "./context/AuthContext.jsx";
import { supabaseHazir } from "./lib/supabase.js";
import Login from "./pages/Login.jsx";
import { QtMarka, QtKart, QtBosDurum } from "../oyun/tasarim/index.js";
import { tt } from "../oyun/lib/dil.js";
import SahipKapisi from "./components/SahipKapisi.jsx";
import YukleniyorEkrani from "../oyun/components/YukleniyorEkrani.jsx";
// Meydan (3B harita) ve gardırop DONDURULDU (Arayüz Yenileme, 20 Eyl 2026).
// Rotalar SİLİNMEDİ; bayrak kapalıyken "Bu bölüm şu an kapalı" notu gösterip
// ana sayfaya yönlendiriyorlar. Geri açma: oyun/lib/ozellikBayraklari.js.
import { MEYDAN_ACIK, GARDIROP_ACIK } from "../oyun/lib/ozellikBayraklari.js";

import Layout from "../oyun/components/Layout.jsx";
import AnaEkranaEkle from "../oyun/components/AnaEkranaEkle.jsx";
import TaniPaneli from "../oyun/components/TaniPaneli.jsx";
// Ana sayfa = seçenek A (23 Eyl 2026, Ida kararı). Eski oyun/pages/Home.jsx ve B/C/seçim
// dosyaları silinmedi; hiçbir rota çağırmıyor.
import AnaSayfa from "../oyun/pages/anasayfa/AnaSayfaA.jsx";
import ChallengesPage from "../oyun/pages/ChallengesPage.jsx";
import MatchPage from "../oyun/pages/MatchPage.jsx";
// Ajan H: grup maçı tembel (nadir mod) — ses/müzik eklerinin ana paketi büyütmemesi için.
const GroupMatchPage = tembelYukle(() => import("../oyun/pages/GroupMatchPage.jsx"));
// DONDURULDU (Paket 24 B): HizliMacPage dosyasi duruyor, hicbir rota cagirmiyor.
// Geri acmak: bu import + asagidaki rotayi geri koy, oyun_ayarlari.hizli_mac_acik = true.
const TournamentPage = tembelYukle(() => import("../oyun/pages/TournamentPage.jsx"));
const LeaderboardPage = tembelYukle(() => import("../oyun/pages/LeaderboardPage.jsx"));
const FriendsPage = tembelYukle(() => import("../oyun/pages/FriendsPage.jsx"));
const MesajlarPage = tembelYukle(() => import("../oyun/pages/MesajlarPage.jsx"));   // Paket 35 E
const ProfilePage = tembelYukle(() => import("../oyun/pages/ProfilePage.jsx"));
const BulunamadiPage = tembelYukle(() => import("../oyun/pages/BulunamadiPage.jsx"));   // Paket 41 I
const DavetPage = tembelYukle(() => import("../oyun/pages/DavetPage.jsx"));
const JokerDukkani = tembelYukle(() => import("../oyun/pages/JokerDukkani.jsx"));
// Arayüz Yenileme (20 Eyl 2026): prototipin "Oyun Modları" sayfası.
// YENİ MOD YOK — yalnız var olan rotalara götüren bir katalog sayfası.
const ModlarPage = tembelYukle(() => import("../oyun/pages/ModlarPage.jsx"));
// DONDURULDU (Paket 24 B): HizliModPage dosyasi duruyor, hicbir rota cagirmiyor.
// Geri acmak: bu satir + rota geri konur, oyun_ayarlari.hizli_mod_acik = true.
const DuelloPage = tembelYukle(() => import("../oyun/pages/DuelloPage.jsx"));
const CalismaPage = tembelYukle(() => import("../oyun/pages/CalismaPage.jsx"));
// Meydan (3B): three.js yalniz bu rotaya girilince iner (ayri chunk)
const HaritaSayfasi = tembelYukle(() => import("../oyun/harita/HaritaSayfasi.jsx"));
// Harita yenileme Aşama 1 test sahnesi (STIL.md) — oyunu etkilemez, ayrı rota
const HaritaDeneme = tembelYukle(() => import("../oyun/harita/deneme/DenemeSayfasi.jsx"));
const HazirInsanPrototipi = tembelYukle(() => import("../oyun/harita/aday/HazirInsanPrototipi.jsx"));
// Görünüm = 3B GARDIROP (oyun/avatar3d/gardrop.html). Ayrı giriş noktası
// olduğu için rota bileşen değil, yönlendirmedir (bkz. GardropaGit.jsx).
// 2B KARAKTER SİSTEMİ TAMAMEN KALKTI: sayfası da rotadan çıktı, dosyaları
// oyun/karakter/ altında duruyor. Eski 3B görünüm sayfası yedekte:
//   /gorunum-3b  → eski 3B görünüm sayfası
// Paket 17 §D: eski gardırop DONDURULDU (dosyalar duruyor, arayüzden giriş yok). /gorunum yeni karakter vitrini;
// /gorunum-3b ve eski HTML girişleri (oyun/avatar3d/*.html) buraya yönlenir. Geri açma: oyun/CLAUDE.md.
const KarakterVitrini = tembelYukle(() => import("../oyun/vitrin/KarakterVitrini.jsx"));
const GorunumPage = tembelYukle(() => import("../oyun/pages/GorunumPage.jsx"));
// Yasal metinler giriş duvarının ÖNÜNDE olmalı (Play Store + reklam ağları).
const GizlilikPage = tembelYukle(() => import("../oyun/pages/GizlilikPage.jsx"));
const KosullarPage = tembelYukle(() => import("../oyun/pages/KosullarPage.jsx"));
// Üretim akışından bağımsız, menüde görünmeyen avatar görsel laboratuvarı.
const AvatarLabPage = tembelYukle(() => import("../oyun/pages/AvatarLabPage.jsx"));
const AvatarLabV2Page = tembelYukle(() => import("../oyun/pages/AvatarLabV2Page.jsx"));
const AvatarPreviewProPage = tembelYukle(() => import("../oyun/pages/AvatarPreviewProPage.jsx"));
const LogoExplorationPage = tembelYukle(() => import("../oyun/pages/LogoExplorationPage.jsx"));
const LogoExplorationV2Page = tembelYukle(() => import("../oyun/pages/LogoExplorationV2Page.jsx"));
const LogoExplorationV4Page = tembelYukle(() => import("../oyun/pages/LogoExplorationV4Page.jsx"));
const LogoExplorationV5Page = tembelYukle(() => import("../oyun/pages/LogoExplorationV5Page.jsx"));
const LogoFinalistsVNextPage = tembelYukle(() => import("../oyun/pages/LogoFinalistsVNextPage.jsx"));
const QLogoLabPage = tembelYukle(() => import("../oyun/pages/QLogoLabPage.jsx"));
const TasarimYonleriPage = tembelYukle(() => import("../oyun/tasarim-yonleri/TasarimYonleriPage.jsx"));   // Tasarım Adım 1 — yalnız adresle
const TasarimSistemiPage = tembelYukle(() => import("../oyun/tasarim/TasarimSistemiPage.jsx"));   // Tasarım Adım 2 — yalnız adresle
const KozmetikOnizlemePage = tembelYukle(() => import("../oyun/tasarim/cerceveler/KozmetikOnizlemePage.jsx"));   // çerçeve + rozet önizleme — yalnız adresle
const MacSonuOnizlemePage = tembelYukle(() => import("../oyun/pages/MacSonuOnizlemePage.jsx"));   // maç sonu kutlama önizlemesi (Ajan G) — yalnız adresle
const SesSecimPage = tembelYukle(() => import("../oyun/tasarim/ses-secim/SesSecimPage.jsx"));   // ses seçimi — yalnız sahip, yalnız adresle (girişli)
const AvatarOnizlemePage = tembelYukle(() => import("../oyun/tasarim/avatar-onizleme/AvatarOnizlemePage.jsx"));   // yeni avatar onayı (Ajan A) — yalnız sahip, yalnız adresle (girişli)
const CerceveOnizlemePage = tembelYukle(() => import("../oyun/tasarim/cerceveler/deneme/CerceveOnizlemePage.jsx"));   // çerçeve tarzı seçimi (Ajan B) — yalnız sahip, yalnız adresle (girişli)
const PremiumOnizlemePage = tembelYukle(() => import("../oyun/tasarim/premium/PremiumOnizlemePage.jsx"));   // premium kozmetik önizlemesi — yalnız sahip, yalnız adresle (girişli)
const IkonOnizlemePage = tembelYukle(() => import("../oyun/tasarim/ikon/IkonOnizlemePage.jsx"));   // uygulama ikonu adayları (Ajan B) — yalnız sahip, yalnız adresle (girişli)
const TasarimOnizlemePage = tembelYukle(() => import("../oyun/tasarim/onizleme/TasarimOnizlemePage.jsx"));   // altın isim + rakip arama ekranı adayları — yalnız sahip, yalnız adresle (girişli)
const StilRehberiPage = tembelYukle(() => import("../oyun/tasarim/stil-rehberi/StilRehberiPage.jsx"));   // kalıcı stil rehberi (görsel revizyon 0; Ida onayı) — girişli herkes, menüde yok
const GorselRevizyonPage = tembelYukle(() => import("../oyun/tasarim/gorsel-revizyon/GorselRevizyonPage.jsx"));   // görsel revizyon adayları (tasarim/BRIEF_GORSEL_REVIZYON.md) — girişli herkes, menüde yok
const YonetimSikayetlerPage = tembelYukle(() => import("../oyun/pages/YonetimSikayetlerPage.jsx"));   // 620: şikâyet yönetimi — yalnız yönetici (sunucu), menüde yok

// Maç sayfası maç kimliğine anahtarlı: rövanş / yeni maç aynı rotada /mac/eski → /mac/yeni geçince React
// bileşeni yeniden kurmuyordu; eski maçın durumu (ilerleme damgası, kanallar, zamanlayıcılar) yeni maça
// taşınıyor, bitmiş maçın damgası yeni maçın bütün güncellemelerini "eski" sayıp atıyordu → iki tarafta da
// ekran eski maçın sonuç sahnesinde donuyordu (canlı, 24 Eyl). Her maç temiz bir sayfayla başlar.
function MacAnahtarli({ Sayfa }) {
  const { id } = useParams();
  return <Sayfa key={id ?? "lobi"} />;
}

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

  // Müzik + /ses-secim seçimleri (Ajan H) — tembel modül, ana pakete girmez.
  useEffect(() => {
    import("../oyun/lib/sesArkaPlan.js").then((m) => m.muzikRota(pathname)).catch(() => { /* müzik kritik değil */ });
  }, [pathname]);

  const bagimsizModul =
    // Geliştirici/tasarım sayfaları (insan-prototip, preview/*, tasarim-yonleri, tasarim-sistemi,
    // kozmetik-onizleme, mac-sonu-onizleme) artık bağımsız DEĞİL: giriş + sahip kapısı (SahipKapisi).
    // Yalnız yerel geliştirme (.env yok): önizlemeleri ölçmek için; üretimde DEV false → girişli + sahip kontrolü
    (import.meta.env.DEV && !supabaseHazir && (
      pathname.startsWith("/premium-onizleme") || pathname.startsWith("/tasarim-onizleme") || pathname.startsWith("/gorsel-revizyon") ||
      pathname.startsWith("/insan-prototip") || pathname.startsWith("/preview/") || pathname.startsWith("/tasarim-yonleri") ||
      pathname.startsWith("/tasarim-sistemi") || pathname.startsWith("/kozmetik-onizleme") || pathname.startsWith("/mac-sonu-onizleme"))) ||
    pathname.startsWith("/gizlilik") || pathname.startsWith("/kosullar");

  if (!supabaseHazir && !bagimsizModul) {
    return (
      <div className="qt-sayfa g-yedek">
        <QtMarka boyut="b" />
        <QtKart dolgu="b" className="g-yedek-kart">
          <QtBosDurum
            ikon="uyari"
            ton="yanlis"
            baslik={tt("Supabase yapılandırması eksik.")}
            metin={tt(".env dosyasına VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY ekleyin.")}
          />
        </QtKart>
      </div>
    );
  }

  if (loading && !bagimsizModul) return <YukleniyorEkrani />;

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
    <Suspense fallback={<YukleniyorEkrani />}>
      <Routes>
        <Route path="/gizlilik" element={<GizlilikPage />} />
        <Route path="/kosullar" element={<KosullarPage />} />
        {/* Dondurulmuş (22 Eyl 2026): meydan prototipi; varlıkları varliklar-dondurulmus/meydan/. Geri açma: MEYDAN_ACIK + klasörü public/meydan/ olarak geri taşı. */}
        <Route path="/insan-prototip" element={<SahipKapisi>{MEYDAN_ACIK ? <HazirInsanPrototipi /> : <BulunamadiPage kapaliMod kapaliOzellik />}</SahipKapisi>} />
        <Route path="/preview/avatar-lab" element={<SahipKapisi><AvatarLabPage /></SahipKapisi>} />
        <Route path="/preview/avatar-lab-v2" element={<SahipKapisi><AvatarLabV2Page /></SahipKapisi>} />
        <Route path="/preview/avatar-pro" element={<SahipKapisi><AvatarPreviewProPage /></SahipKapisi>} />
        <Route path="/preview/logo-exploration" element={<SahipKapisi><LogoExplorationPage /></SahipKapisi>} />
        <Route path="/preview/logo-exploration-v2" element={<SahipKapisi><LogoExplorationV2Page /></SahipKapisi>} />
        <Route path="/preview/logo-exploration-v4" element={<SahipKapisi><LogoExplorationV4Page /></SahipKapisi>} />
        <Route path="/preview/logo-exploration-v5" element={<SahipKapisi><LogoExplorationV5Page /></SahipKapisi>} />
        <Route path="/preview/logo-finalists-vnext" element={<SahipKapisi><LogoFinalistsVNextPage /></SahipKapisi>} />
        <Route path="/preview/q-logo-lab" element={<SahipKapisi><QLogoLabPage /></SahipKapisi>} />
        <Route path="/tasarim-yonleri" element={<SahipKapisi><TasarimYonleriPage /></SahipKapisi>} />
        <Route path="/tasarim-sistemi" element={<SahipKapisi><TasarimSistemiPage /></SahipKapisi>} />
        <Route path="/kozmetik-onizleme" element={<SahipKapisi><KozmetikOnizlemePage /></SahipKapisi>} />
        <Route path="/mac-sonu-onizleme" element={<SahipKapisi><MacSonuOnizlemePage /></SahipKapisi>} />
        <Route path="/ses-secim" element={<SesSecimPage />} />
        <Route path="/avatar-onizleme" element={<AvatarOnizlemePage />} />
        <Route path="/cerceve-onizleme" element={<CerceveOnizlemePage />} />
        <Route path="/premium-onizleme" element={<PremiumOnizlemePage />} />
        <Route path="/ikon-onizleme" element={<IkonOnizlemePage />} />
        <Route path="/tasarim-onizleme" element={<TasarimOnizlemePage />} />
        <Route path="/gorsel-revizyon" element={<GorselRevizyonPage />} />
        <Route path="/stil-rehberi" element={<StilRehberiPage />} />

        <Route path="/" element={<Layout />}>
          <Route index element={<AnaSayfa />} />
          <Route path="turnuva" element={<TournamentPage />} />
          <Route path="meydan" element={<ChallengesPage />} />
          <Route path="mac/:id" element={<MacAnahtarli Sayfa={MatchPage} />} />
          <Route path="grup-mac/:id" element={<MacAnahtarli Sayfa={GroupMatchPage} />} />
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
          <Route path="duello/:id" element={<MacAnahtarli Sayfa={DuelloPage} />} />
          <Route path="calisma" element={<CalismaPage />} />
          <Route path="modlar" element={<ModlarPage />} />
          {/* DONDURULDU — dosyalar ve veri yerinde; yalnız giriş kapalı. */}
          <Route path="harita" element={MEYDAN_ACIK ? <HaritaSayfasi /> : <BulunamadiPage kapaliMod kapaliOzellik />} />
          <Route path="harita-deneme" element={MEYDAN_ACIK ? <HaritaDeneme /> : <BulunamadiPage kapaliMod kapaliOzellik />} />
          <Route path="gorunum" element={GARDIROP_ACIK ? <KarakterVitrini /> : <BulunamadiPage kapaliMod kapaliOzellik />} />
          <Route path="gorunum-3b" element={GARDIROP_ACIK ? <Navigate to="../gorunum" replace /> : <BulunamadiPage kapaliMod kapaliOzellik />} />
          <Route path="profil" element={<ProfilePage />} />
          <Route path="yonetim/sikayetler" element={<YonetimSikayetlerPage />} />
          {/* Paket 41 I: bilinmeyen adres → 404 (eskiden sessizce ana sayfa) */}
          <Route path="*" element={<BulunamadiPage />} />
        </Route>

        {/* Geriye uyumluluk: hub adresleri → kök */}
        <Route path="/oyun/*" element={<OnekiAt />} />
        <Route path="/bildim/*" element={<OnekiAt />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <AnaEkranaEkle />
      {/* Yalnız ?tani=1 ile açılır (telefonda dokunma tanısı) */}
      <TaniPaneli />
    </Suspense>
  );
}
