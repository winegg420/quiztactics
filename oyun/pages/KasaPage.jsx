// ============================================================
// KASA (deneysel) — migration 950
//
// Kurallar ve süreler SUNUCUDA (kasa_*). Bu sayfa yalnız kasa_durum()'un oyuncuya süzülmüş görünümünü
// çizer ve eylemleri (cevap, AÇ/DEVAM, terk) iletir. Canlılık Düello ile aynı kalıp: kasa_sinyal (Realtime,
// yalnız sürüm) + faz bitişinde tek okuma + seyrek yedek yoklama + geri çekilmeli yeniden deneme + nabız.
//
// Gizlilik: rakibin bot olup olmadığı istemciye hiç gelmez; bu sayfada "bot" kelimesi geçmez. Rakibin
// cevabı yalnız "cevapladı" olarak görünür; doğru cevap yalnız sonuç fazında gelir.
// Kapalıyken (oyun_ayarlari.kasa_modu_acik = 0) giriş ekranı kapalı-mod notunu gösterir; süren maç sürer.
// iOS: position:fixed + transform aynı öğede YOK (kasa.css).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import MacUstSerit from "../components/MacUstSerit.jsx";
import MacYukleniyor from "../components/MacYukleniyor.jsx";
import MacSonuKutlama from "../components/MacSonuKutlama.jsx";
import OdulDokumu from "../components/OdulDokumu.jsx";
import DereceliAnahtari from "../components/DereceliAnahtari.jsx";
import AramaSahnesi from "../components/AramaSahnesi.jsx";
import { GeriSayim } from "../components/MacHazirlik.jsx";
import BulunamadiPage from "./BulunamadiPage.jsx";
import { KasaKadran, KasaSkor, KasaUst, KasaKarar, KasaSonucBandi, KasaAcKilit, kasaKararMetni, kasaSonucArtisi, carpanYazisi,
         kasaSavunma, SavunmaRozeti, SAVUNMA_HAKKI, SAVUNMA_SORUSU, KasaJokerBilgi, KasaDevamOdul, KasaRakipJokerAn } from "../components/KasaParcalari.jsx";
import JokerCubugu from "../components/JokerCubugu.jsx";
import CerceveliAvatar from "../components/CerceveliAvatar.jsx";
import OrtCevapSatiri from "../components/OrtCevapSatiri.jsx";
import KategoriIkon from "../components/KategoriIkon.jsx";
import { TepkiCubugu, useMacTepki } from "../components/Tepki.jsx";
import { useOyuncuSeviyeleri } from "../lib/oyuncuSeviye.js";
import { useMacSonuOzet, ozettenSahne } from "../lib/macSonuOzet.js";
import { useDereceliTercih } from "../lib/dereceli.js";
import { useDil } from "../lib/dilKanca.js";
import { hataMesaji, hataTuru, islemHatasi } from "../lib/hata.js";
import { zamanAsimindaYenidenDene } from "../lib/yenidene.js";
import { y } from "../lib/yol.js";
import { useAyar } from "../lib/ayarlar.js";
import { rpcDene } from "../lib/rpcDene.js";
import { sure, sureOlcek, varsayilanSure } from "../lib/sureler.js";
import { aramaAraligiSn } from "../lib/gorunurluk.js";
import { useOyunModu, useMacSonuGecisi } from "../lib/oyunModu.js";
import { sonModuYaz } from "../lib/sonMod.js";
import { sayacKaymasi, sayacGoster, sayacSinirMs, tikBasligiEkle } from "../lib/zaman.js";
import { saatOrnegiEkle, saatFarkiMs, sayimFarkiMs } from "../lib/sunucuSaati.js";
import { soruUzunlukSinifi } from "../lib/soruUzunluk.js";
import { BasiliTut } from "../lib/useBasiliTut.js";
import { useDonukSayac } from "../lib/useDonukSayac.js";
import { kategoriAdi } from "../lib/kategoriler.js";
import { titret } from "../lib/geriBildirim.js";
import { sesKilidiAc, sesTik, sesDogru, sesYanlis, sesDokunus, sesRakipBulundu, sesSoruGeldi,
  sesTurGecis, sesRakipCevapladi, sesCoin, sesRozet, sesJoker, sesXpDolma, sesSkill, sesOnYukle, sesKalpAtisi, macSesleriniOnYukle, sesCanKaybi,
  sesFazDegisti, fazdaCal, sesMacSonu } from "../lib/ses.js";
import { akis } from "../lib/akisGunlugu.js";
import { KasaAcAni, KasaAltinYagmuru, UcanParcalar, kasaSeviye, KasaGirisSahnesi, KasaFinalSahnesi,
  KasaCifteBandi, KasaRakipKarar, KasaSavunmaAni } from "../components/KasaEfekt.jsx";
import Konfeti from "../components/Konfeti.jsx";
import CevapImzasi from "../components/CevapImzasi.jsx";
import { useTakiliImza } from "../lib/cevapImzasi.js";
import { hareketAzaltildiMi, QT_KIRILMA_MS } from "../tasarim/hareket.js";
import { QtDugme, QtIkon, QtIskelet, QtModal, QtSayac, QtSik, QtSikler, QtSoruKarti, sinif } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";   // GeriSayim (3-2-1) görünümü
import "./DuelloPage.a.css";              // m2-bant / m2-hata / m2-onay-eylem / m2-giris ortak kalıpları
import "../styles/kasa.css";
import LobiKurallari from "../components/LobiKurallari.jsx";
import RehberBalonu from "../components/RehberBalonu.jsx";
import { useIlkMacRehberi } from "../lib/ilkMacRehberi.js";
import { modKurallari } from "../lib/modAciklamalari.js";
import PaylasDugmesi from "../components/PaylasDugmesi.jsx";
import "../tasarim/ekranlar/mac-sonu-kutlama.css";   // Paket B/5: maç sonu stili ana stil paketinden çıktı (yalnız bu ekranlarla iner)

const HARFLER = ["A", "B", "C", "D"];
// 987: Savunma Sorusu aynı turun içinde ayrı olay — tek sefer anahtarlarına "-s" eki (soru + sonucu; tetik bandı normal tur)
const turAnahtari = (d) => `${d.tur}-${d.altin}${d.savunma && d.savunma.durum !== "bekliyor" ? "-s" : ""}`;
const SAVUNMA_AN_MS = varsayilanSure("kasa_savunma");   // sunum süreleri lib/sureler.js; geçerli değer sure(anahtar)
// 980: gizli sekme (iOS'ta uygulama değiştirme dahil) — ses/an başlatılmaz
const gorunurDegil = () => typeof document !== "undefined" && document.visibilityState === "hidden";
// Şıklar dizi ya da JSON metni gelebilir (Düello ile aynı çözüm; Düello paketini bu parçaya çekmemek için yerel).
function secenekleriCoz(s) {
  if (Array.isArray(s)) return s;
  if (typeof s === "string") { try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return []; } }
  return [];
}
// Canlılık sabitleri Düello ile aynı (DuelloPage.jsx — ölçülmüş değerler).
const YEDEK_YOKLAMA_MS = 4000;
const KANALSIZ_YOKLAMA_MS = 1000;
const SON_YOKLAMA_PENCERE_MS = 1500;
const SON_YOKLAMA_MS = 500;
const CEVAP_TOLERANS_MS = 1100;   // kasa_cevap_tolerans_sn (1 sn) + pay
const SINYAL_BIRLESTIR_MS = 30;
const HATA_GERI_CEKILME_MS = [1000, 2000, 4000, 8000];
const DURUM_ZAMAN_ASIMI_MS = 10000;   // statement_timeout 8 sn + ağ payı; daha uzun süren kasa_durum kesilir
// 1055: sunucu/ağ yetişemedi mi (iş kuralı hatası değil) — cevap gönderimi yalnız bunda yeniden denenir
const sunucuYetisemedi = (e) => ["zaman_asimi", "sunucu", "ag"].includes(hataTuru(e));
const GECIKMIS_YOKLAMA_MS = 2000;
const GECIKMIS_PENCERE_MS = 30000;
const BANT_SESSIZLIK_MS = 10000;   // "Bağlantı yeniden kuruluyor" yalnız bu kadar süre başarılı yanıt gelmediyse
const KASA_ARAMA_SINIR_SN = 60;
const IPUCU_SN = 3;
// 951 anları (kasa-efekt.css süreleriyle eşleşir)
// 955: giriş sahnesi TEK KATMAN — sandık düşüşü + sandığın üstünde 3-2-1; ilk sorunun gösterim başlangıcında biter.
// Süre sunucu ayarından gelir (oyun_ayarlari.kasa_giris_sahne_ms, tek kaynak — 1038); okunamazsa bu varsayılan.
// 4000 = ~1 sn sandık düşüşü + 3 sn tam 3-2-1.
const GIRIS_SAHNE_VARSAYILAN_MS = 4000;
const DEVAM_AN_MS = varsayilanSure("kasa_devam_an");      // 955: DEVAM ×1,25 anı (mini sandık sarsılır, çarpan patlar, kasa sayarak yükselir); 980: 1700 → 1400 (gösterim payında biter)
const AC_AN_MS = varsayilanSure("kasa_ac_an");         // 980: AÇ anı (1600 → 1280) — soru gösterim payının (1,5 sn) içinde biter
// 990: AÇ / DEVAM anı geç veride bile en az AN_TABAN_MS GÖRÜNÜR (atlanmaz; 980'deki %40 sıkıştırma kalktı). An bitene
// kadar yeni sorunun sayacı gizli, AÇ'ta şıklar örtülü — sayaç an bitince sunucunun gerçek kalanını gösterir (kayma yok).
// Pay yetmezse soru süresinden yer: ölçüm + öneri PROGRESS.md (kasa_gosterim_payi değiştirilmedi).
const AN_TABAN_MS = varsayilanSure("kasa_an_taban");
const KAPALI_KARAR_MS = varsayilanSure("kasa_kapali_karar");   // 990: rakibin kararı önce kapalı kart (ne olduğu görünmez)
const DEVAM_VURUS_MS = varsayilanSure("kasa_devam_vurus");    // 990: DEVAM ETTİ vuruşu (AÇ'ta vuruş AÇ anının kendi yazısıdır)
const FINAL_SAHNE_MS = varsayilanSure("kasa_final_sahne");   // maç sonu açılış sahnesi (kazanan) — sonra MacSonuKutlama
const FINAL_KAPANIS_MS = varsayilanSure("kasa_final_kapanis"); // kaybeden: kasa kapanır/kararır
const CIFTE_MS = varsayilanSure("kasa_cifte");
// 14 Eki 2026 · karar gerilimi: sandık seviyesi → kademe (1–4) → kalp atışı aralığı (60 → 120 vuruş/dk) ve karar başı titreşimi
const KALP_KADEME = { az: 1, orta: 2, dolu: 3, tavan: 4 };
const KALP_ARALIK_MS = [0, 1000, 820, 650, 500];
const KARAR_TITRESIM = [0, 12, [16, 60, 16], [24, 50, 24], [32, 40, 32, 40, 32]];
// 15 Eki 2026 (senkron): kalp atışının ilk vuruşu karar fazının açılış sesinden (tur_gecis ~0,4 sn) SONRA; son 3 sn'de
// susar (o süre sayım tikinin) — iki ses aynı anda çalmaz.
const KALP_ILK_MS = 600;
// 15 Eki 2026 (senkron): sonuç anı (+2/+6 uçuşu, anahtar el değiştirir) KALAN sonuç fazına sığar — sunucunun faz_bitis'inden
// bu pay kadar önce biter (saat örneği + çizim payı); yeni faz geldiğinde an çoktan bitmiştir, yarıda sökülmez.
const SONUC_AN_PAY_MS = 150;
const SONUC_AN_EN_AZ = 0.45;   // kalan süre tabanın bu oranından azsa an çizilmez, değerler doğrudan görünür (sesler yine çalar)
const ANAHTAR_PATLA_MS = 1400;  // kasa-efekt.css › .ks-avatar--anahtar::after (700 ms × 2)
const ARAMA_IPUCLARI = [
  "Aynı soruyu aynı anda cevaplarsınız.",
  "Tek başına bilen hazinenin sahibi olur.",
  "İkiniz de bilirseniz hazine daha çok büyür.",
  "Hazine sendeyse soru gelmeden AÇ ya da DEVAM de.",
  "{h} puana ilk ulaşan kazanır.",
];

/** 951: maç sonu açılış sahnesinin verisi — yalnız AÇ (ya da son tur aktarımı) maçı bitirdiyse ve açan kazandıysa. */
function kasaFinalVerisi(d) {
  const k = d?.son_karar;
  if (!d?.kazanan || !k?.ac || k.veren !== d.kazanan || !["hedef", "tur_siniri"].includes(d.sonuc_neden)) return null;
  const veren = (d.oyuncular ?? []).find((o) => o.id === k.veren);
  const puanSonra = Number(veren?.puan ?? 0);
  const deger = Number(k.deger ?? 0);
  return { kazandim: d.kazanan === d.ben, deger, puanSonra, puanOnce: Math.max(0, puanSonra - deger), hedef: Number(d.hedef ?? 50) };
}

// ------------------------------------------------------------ giriş
function KasaGiris() {
  const navigate = useNavigate();
  const { ceviri } = useDil();
  // Ayar satırı yoksa (migration 950 uygulanmamış) mod kurulmamış sayılır: kapalı-mod notu.
  // 7 Eki 2026: ayar henüz gelmediyse (-1) "kapalı" sayılmaz — yavaş Supabase'de /kasa doğrudan açılınca
  // kapalı-mod notu 2,5 sn sonra ana sayfaya atıyordu. En çok 15 sn iskelet, sonra eski davranış.
  const acikAyar = useAyar("kasa_modu_acik", -1);
  const acik = acikAyar >= 1;
  const [ayarBekle, setAyarBekle] = useState(true);
  useEffect(() => { const t = setTimeout(() => setAyarBekle(false), 15000); return () => clearTimeout(t); }, []);
  const hedef = useAyar("kasa_hedef_puan", 80);
  const artis = useAyar("kasa_artis", 2);
  const ikisi = useAyar("kasa_ikisi_dogru_artis", 6);
  const maxTur = useAyar("kasa_max_tur", 36);
  const acmaMin = useAyar("kasa_acma_min", 0);
  // 987: DEVAM ödülü Savunma Hakkı (954 ücretsiz 50:50 yerine)
  const savunmaAcik = useAyar("kasa_savunma_acik", 0) >= 1;
  const devamBirakir = useAyar("kasa_devam_birakir", 0) >= 1;
  // 955: tavan (0 = yok) · DEVAM çarpanı (1 = yok) · karar süresi
  const tavan = useAyar("kasa_tavan", 0);
  const carpan = useAyar("kasa_devam_carpan", 1);
  const kararSn = useAyar("kasa_karar_sn", 5);
  // 11 Eki 2026: karar sayacı gösterim payını da sayar (gerçek süre) — kuraldaki sayı ekrandaki sayaçla aynı
  const kararPayMs = useAyar("kasa_gosterim_payi_ms", 2000);
  const { dil } = useDil();
  const carpanX = carpanYazisi(carpan, dil);
  const [dereceli, setDereceli] = useDereceliTercih();
  const location = useLocation();
  const [aramaBilgi] = useState(() => (location.state?.yenidenAra ? ceviri("Rakip bağlanamadı, yeni rakip aranıyor") : null));
  const [arama, setArama] = useState(() => Boolean(location.state?.yenidenAra));
  useEffect(() => {
    if (location.state?.yenidenAra) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // 957: süren Kasa maçın varsa (davet kabulü, rövanş, başka sekme) lobide "Maça dön"
  const [surenMac, setSurenMac] = useState(null);
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("kasa_aktif_benim");
        if (error) throw error;
        if (aktif) setSurenMac(data?.[0]?.id ?? null);
      } catch (e) {
        console.warn("[Bildim] kasa_aktif_benim:", e?.message ?? e);
      }
    })();
    return () => { aktif = false; };
  }, []);

  if (acikAyar < 0 && ayarBekle) {
    return (
      <div className="m1-yukleniyor" aria-busy="true" aria-label={ceviri("Yükleniyor…")}>
        <QtIskelet tur="satir" />
        <QtIskelet tur="kart" yukseklik={140} />
        <QtIskelet tur="dugme" adet={2} />
      </div>
    );
  }
  if (!acik) return <BulunamadiPage kapaliMod />;
  return (
    <div className="m2-giris ks-giris">
      <header className="m2-giris-kafa ks-giris-kafa qt-h-gir">
        {/* 8 Eki 2026: ana sayfa Ortak Hazine kartıyla aynı ikon (sandık) */}
        <span className="m2-giris-ikon" aria-hidden="true"><QtIkon ad="sandik" boyut={40} /></span>
        <div className="m2-giris-yazi">
          <h1 className="qt-baslik-1">{ceviri("Ortak Hazine")}</h1>
          <p>{ceviri("Ortada ikinizin ortak hazinesi büyür.")}</p>
        </div>
      </header>
      {/* 990: mobilde ilk ekran — 3 maddelik özet + "Rakip ara" görünür; tam kural listesi aşağıda açılır alanda */}
      {/* 12 Eki 2026: ortak bileşen (Düello lobisi de aynı düzen); maddeler lib/modAciklamalari.js */}
      <LobiKurallari mod="kasa" className="ks-ozet" maddeler={modKurallari("kasa", { hedef })} />
      <DereceliAnahtari dereceli={dereceli} onDegistir={setDereceli} />
      {surenMac && (
        <p className="m2-bant ks-suren-mac" role="status">
          <QtIkon ad="oyna" boyut={18} />
          <span>{ceviri("Devam eden bir Ortak Hazine maçın var.")}</span>
          <QtDugme boyut="k" onClick={() => navigate(y(`/kasa/${surenMac}`))}>{ceviri("Maça dön")}</QtDugme>
        </p>
      )}
      <div className="m2-giris-eylem">
        <QtDugme tamGenislik boyut="b" ikon="coin" onClick={() => { sesKilidiAc(); sesDokunus(); setArama(true); }}>
          {ceviri("Rakip ara")}
        </QtDugme>
      </div>
      <details className="ks-kurallar-tum">
        <summary>
          <QtIkon ad="bilgi" boyut={18} />
          <span>{ceviri("Tüm kurallar")}</span>
          <QtIkon ad="asagi" boyut={18} className="ks-kurallar-ok" />
        </summary>
      <ul className="ks-kurallar">
        <li>{ceviri("Her soru hazineye +{n} ekler; ikiniz de bilirseniz +{m}.", { n: artis, m: ikisi })}</li>
        <li>{ceviri("Soruyu tek başına bilen hazinenin sahibi olur.")}</li>
        <li>{devamBirakir && carpanX
          ? ceviri("AÇ: hazine puanına yazılır. DEVAM: hazine {x} büyür, sahipsiz kalır.", { x: carpanX })
          : devamBirakir
          ? ceviri("AÇ: hazine puanına yazılır. DEVAM: hazine büyür, sahipsiz kalır.")
          : ceviri("AÇ: hazine puanına yazılır. DEVAM: hazine büyür ama kaybedebilirsin.")}</li>
        {acmaMin > 0 && <li>{ceviri("Hazine en az {m} olunca açılabilir.", { m: acmaMin })}</li>}
        {/* 956: tavan hedefe eşit/üstündeyse tek AÇ maçı bitirebilir — "bitirmez" yalnız tavan < hedef iken */}
        {tavan > 0 && <li>{tavan < hedef
          ? ceviri("Hazine en çok {t} olur: tek AÇ maçı bitirmez.", { t: tavan })
          : ceviri("Hazine en çok {t} olur.", { t: tavan })}</li>}
        <li>{ceviri("Karar süresi {s} sn; dolarsa DEVAM sayılır.", { s: kararSn + Math.round(kararPayMs / 1000) })}</li>
        <li>{ceviri("Jokerler: 50:50, Ek Süre, Zaman Baskısı, İkinci Şans.")}</li>
        {savunmaAcik && <li>{ceviri("Bilerek DEVAM dersen {h} kazanırsın: hazine rakibe geçecekken sana {s} gelir.",
          { h: ceviri(SAVUNMA_HAKKI), s: ceviri(SAVUNMA_SORUSU) })}</li>}
        <li>{ceviri("{t} tur sonunda hazine sahibine yazılır; eşitlikte Altın Soru.", { t: maxTur })}</li>
      </ul>
      </details>
      {arama && (
        <KasaArama dereceli={dereceli} bilgi={aramaBilgi}
                   onBulundu={(id) => navigate(y(`/kasa/${id}`))} onIptal={() => setArama(false)} />
      )}
    </div>
  );
}

// ------------------------------------------------------------ arama (Düello ile aynı kalıp)
function KasaArama({ dereceli, onBulundu, onIptal, bilgi = null }) {
  const { ceviri } = useDil();
  const hedef = useAyar("kasa_hedef_puan", 80);
  const [gecen, setGecen] = useState(0);
  const ipucu = Math.floor(gecen / IPUCU_SN) % ARAMA_IPUCLARI.length;
  const [hata, setHata] = useState(null);
  const [bulundu, setBulundu] = useState(false);
  const [rakip, setRakip] = useState(null);
  const bittiRef = useRef(false);
  const [deneme, setDeneme] = useState(0);
  const bulunduRef = useRef(onBulundu);
  bulunduRef.current = onBulundu;
  const gecisRef = useRef(null);

  const karsilas = useCallback(async (kasaId) => {
    setBulundu(true);
    sesRakipBulundu();
    gecisRef.current = window.setTimeout(() => bulunduRef.current(kasaId), sure("ortak_arama_gecis"));
    try {
      const { data, error } = await supabase.rpc("kasa_durum", { p_id: kasaId });
      if (error) throw error;
      const r = data?.oyuncular?.find((o) => o.id !== data.ben);
      if (r) setRakip(r);
    } catch (e) {
      console.warn("[Bildim] kasa karşılaşma kartı okunamadı:", e?.message ?? e);
    }
  }, []);
  useEffect(() => () => window.clearTimeout(gecisRef.current), []);

  useEffect(() => {
    let iptal = false;
    let istekte = false;
    const dene = async () => {
      if (iptal || bittiRef.current || istekte) return;
      istekte = true;
      try {
        const { data, error } = await supabase.rpc("kasa_ara", { p_dereceli: dereceli });
        if (error) throw error;
        if (data && !bittiRef.current) { bittiRef.current = true; karsilas(data); }
      } catch (e) {
        console.error("[Bildim] kasa_ara:", e);
        setHata(islemHatasi(e, "Rakip aranamadı."));
        bittiRef.current = true;
        clearInterval(zaman);
      } finally {
        istekte = false;
      }
    };
    dene();
    let sn = 0;
    let sonrakiSn = aramaAraligiSn(0);   // Aşama 2: yoklama 2 → 3 → 5 sn (sayaç yine saniyede bir)
    const zaman = setInterval(() => {
      sn += 1;
      if (sn >= KASA_ARAMA_SINIR_SN && !bittiRef.current) {
        clearInterval(zaman);
        bittiRef.current = true;
        setHata(ceviri("Şu an rakip bulunamadı. Birazdan tekrar dene."));
        rpcDene("kasa_aramadan_cik");
        return;
      }
      setGecen((g) => g + 1);
      if (sn >= sonrakiSn) { sonrakiSn = sn + aramaAraligiSn(sn); dene(); }
    }, 1000);
    return () => {
      iptal = true;
      clearInterval(zaman);
      if (!bittiRef.current) rpcDene("kasa_aramadan_cik");
    };
  }, [dereceli, ceviri, karsilas, deneme]);

  const yenidenDene = () => { bittiRef.current = false; setHata(null); setGecen(0); setDeneme((n) => n + 1); };
  return (
    <AramaSahnesi mod="kasa" dereceli={dereceli} gecen={gecen}
                  durum={bulundu ? "bulundu" : hata ? "hata" : "ariyor"}
                  rakip={bulundu ? rakip : null} bilgi={bilgi} hata={hata}
                  alt={<p key={ipucu} className="qt-h-gir" aria-live="polite">{ceviri(ARAMA_IPUCLARI[ipucu], { h: hedef })}</p>}
                  onIptal={onIptal} onTekrar={yenidenDene} />
  );
}

// ------------------------------------------------------------ maç
function KasaMac({ id }) {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { ceviri: c, dil } = useDil();
  const [d, setD] = useState(null);
  const dGuncelRef = useRef(null);
  dGuncelRef.current = d;
  const seviyeler = useOyuncuSeviyeleri((d?.oyuncular ?? []).map((o) => o.id));
  const [hata, setHata] = useState(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(null);
  const [simdi, setSimdi] = useState(Date.now());
  const [secim, setSecim] = useState(null);
  const [calisan, setCalisan] = useState(null);
  const [terkOnay, setTerkOnay] = useState(false);
  useOyunModu(d?.durum === "aktif");
  useMacSonuGecisi(d?.durum === "bitti");   // 11 Eki 2026: final sahnesi (sandık) kutlamaya dek oyun modunda
  // 11 Eki 2026 (mod paritesi — Klasik/Düello/Grup/Turnuva gibi): maç bitince profil (level/coin/rütbe) tazelenir;
  // değişen level/lig oyuncu kartı önbelleğini de düşürür (AuthContext → qt-profil olayı → cerceve.js).
  const bitisTazeleRef = useRef(false);
  useEffect(() => {
    if (d?.durum !== "bitti" || bitisTazeleRef.current || !user?.id) return;
    bitisTazeleRef.current = true;
    refreshProfile?.(user.id);
  }, [d?.durum, refreshProfile, user?.id]);
  useEffect(() => { if (d?.id && d.durum === "aktif") sonModuYaz("kasa"); }, [d?.id, d?.durum]);
  const { ozet: macSonuOzet, hata: macSonuHata } = useMacSonuOzet(d?.durum === "bitti" && d?.id ? `kasa:${d.id}` : null);
  const sonFinRef = useRef(null);   // 10 Eki 2026: final sahnesi bitti ama özet gelmediyse sahne ekranda kalır
  // 957: maç içi tepki (Klasik/Düello ile aynı; yalnız tepki_acik_modlar'daki modda — bugün Antrenman). Sunucu
  // özel kanalı ('tepki-kasa-<id>', yalnız iki oyuncu) verir; sayfanın kasa kanalı tepki taşımaz.
  const tepkiRakipId = (d?.oyuncular ?? []).find((o) => o.id !== d?.ben)?.id ?? null;
  const tepki = useMacTepki({ macTur: "kasa", macId: id, benId: user?.id, rakipId: tepkiRakipId,
                             kanal: () => null, etkin: d?.durum === "aktif" });
  // 957: rövanş (Düello ile aynı akış): bekleme penceresi, red / yanıtsız ayrımı, kabulde iki taraf yeni maça geçer
  const [rovBas, setRovBas] = useState(null);
  const [rovVazgec, setRovVazgec] = useState(false);
  const [rovSonuc, setRovSonuc] = useState(null);   // null | "cevapsiz" | "red"

  // Aramayla kurulan maçta rakip hiç gelmezse sunucu cezasız iptal eder (kasa_giris); bekleyen yeniden aramaya döner.
  useEffect(() => {
    let aktif = true;
    let zamanlayici = null;
    const sor = async () => {
      if (!aktif) return;
      try {
        const { data, error } = await supabase.rpc("kasa_giris", { p_id: id });
        if (error) throw error;
        if (!aktif) return;
        if (data?.durum === "iptal" && data?.baglanmayan && data.baglanmayan !== user?.id) {
          navigate(y("/kasa"), { replace: true, state: { yenidenAra: true } });
          return;
        }
        if (data?.rakip_geldi || data?.durum !== "aktif") return;
      } catch (e) {
        console.warn("[Bildim] kasa_giris:", e?.message ?? e);
      }
      zamanlayici = window.setTimeout(sor, 2000);
    };
    sor();
    return () => { aktif = false; window.clearTimeout(zamanlayici); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const farkRef = useRef(saatFarkiMs() ?? 0);   // 1092: ortak sunucu saati modülünden
  const fazBitisRef = useRef(null);
  const dImzaRef = useRef("");
  const kanalHazirRef = useRef(false);
  const sinyalZamanRef = useRef(null);
  const yukleSozRef = useRef(null);
  const tekrarSozRef = useRef(null);
  const yukleRef = useRef(null);
  const sonYukleRef = useRef(0);
  const hataSayisiRef = useRef(0);
  const yenidenDeneRef = useRef(null);
  const sonBasariRef = useRef(Date.now());   // son başarılı kasa_durum yanıtı (bant yalnız ≥ 10 sn sessizlikte)
  const [yenidenBaglaniyor, setYenidenBaglaniyor] = useState(false);
  // 1055: ilk veri 8 sn'de gelmezse yükleniyor ikonu yerine okunur "Maç açılamadı" + "Tekrar dene" (arka planda deneme sürer)
  const [yuklemeGecikti, setYuklemeGecikti] = useState(false);
  const veriVar = Boolean(d);
  useEffect(() => {
    if (veriVar) { setYuklemeGecikti(false); return undefined; }
    const z = window.setTimeout(() => setYuklemeGecikti(true), 8000);
    return () => window.clearTimeout(z);
  }, [veriVar, id]);

  const yukleTek = useCallback(async () => {
    sonYukleRef.current = Date.now();
    // 1055: yanıtsız kalan istek kesilir. Eskiden askıda kalan tek istek yukleSozRef'i tutuyordu; sonraki bütün
    // yoklamalar ona zincirlendiği için sunucu düzelse de ekran donuyordu (10 Eki, 16:02 UTC'den sonra istek yok).
    const kes = new AbortController();
    const kesZamani = window.setTimeout(() => kes.abort(), DURUM_ZAMAN_ASIMI_MS);
    try {
      const gonderildi = Date.now();
      const { data, error } = await supabase.rpc("kasa_durum", { p_id: id }).abortSignal(kes.signal);
      const alindi = Date.now();
      if (error) throw error;
      sonBasariRef.current = Date.now();
      if (data) {
        // 980: istek/yanıt orta noktası + penceredeki en kısa gidiş-dönüş (eskisi yanıt anı + en büyük farktı:
        // giriş geri sayımı ve sayaç dönüş gecikmesi kadar geride kalıyor, örnek pencereden düşünce sıçrıyordu)
        // 1092: örnek penceresi ortak sunucu saati modülünde (lib/sunucuSaati.js; yöntem aynı).
        farkRef.current = saatOrnegiEkle(gonderildi, alindi, data.sunucu_zamani) ?? farkRef.current;
        const imza = JSON.stringify({ ...data, sunucu_zamani: null });
        if (imza !== dImzaRef.current) { dImzaRef.current = imza; setD(data); }
        setYuklemeHatasi(null);
      }
      if (hataSayisiRef.current) {
        hataSayisiRef.current = 0;
        window.clearTimeout(yenidenDeneRef.current);
        yenidenDeneRef.current = null;
        setYenidenBaglaniyor(false);
      }
    } catch (e) {
      console.error("[Bildim] kasa yüklenemedi:", e);
      if (!dImzaRef.current) setYuklemeHatasi(true);
      setYenidenBaglaniyor(true);
      const n = hataSayisiRef.current++;
      if (!yenidenDeneRef.current) {
        const ms = HATA_GERI_CEKILME_MS[Math.min(n, HATA_GERI_CEKILME_MS.length - 1)];
        yenidenDeneRef.current = window.setTimeout(() => { yenidenDeneRef.current = null; yukleRef.current?.(); }, ms);
      }
    } finally {
      window.clearTimeout(kesZamani);
    }
  }, [id]);

  const yukle = useCallback(() => {
    if (yukleSozRef.current) {
      if (!tekrarSozRef.current) {
        tekrarSozRef.current = yukleSozRef.current.then(() => { tekrarSozRef.current = null; return yukleRef.current(); });
      }
      return tekrarSozRef.current;
    }
    const soz = yukleTek().finally(() => { yukleSozRef.current = null; });
    yukleSozRef.current = soz;
    return soz;
  }, [yukleTek]);
  yukleRef.current = yukle;

  // İlk yükleme + Realtime sinyali + yedek yoklama + görünürlük/ağ dönüşü
  useEffect(() => {
    sesKilidiAc();
    // maç sesleri önceden insin (ilk soru/tik sessiz kalmasın) — Paket B/13: gerisi ilk soru görününce
    // 15 Eki: giriş sahnesinin düşüş sesleri (tur_gecis + rozet) ilk listede — rozet ertelenince 7,8 sn'de iniyor, çalmıyordu
    sesOnYukle(["rozet"]);
    const sesErtele = macSesleriniOnYukle(["skill", ["coin", "xp_dolma", "can_kaybi"]]);
    // Giriş sahnesinin önceden çizilmiş ışık görseli (kasa-efekt.css › .ks-giris-isik) sahne açılmadan insin
    try { new Image().src = "/hazine/giris-isik.webp"; } catch { /* görsel yoksa sahne ışıksız açılır */ }
    yukle();
    const kanal = supabase
      .channel(`kasa-${id}`)
      .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "kasa_sinyal", filter: `kasa_id=eq.${id}` },
          () => {
            // 1059: gizli sekmede Realtime sinyaliyle okuma YOK — okuma (kilitle) nabız yazar ve kopuk sayılması gereken
            // oyuncuyu "döndü" gösterip donmayı çözüyordu (canlı ölçüm 11 Eki). Görünür olunca hemen tazelenir (visibilitychange).
            if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
            if (sinyalZamanRef.current) return;
            sinyalZamanRef.current = setTimeout(() => { sinyalZamanRef.current = null; yukle(); }, SINYAL_BIRLESTIR_MS);
          })
      .subscribe((durum) => {
        const hazir = durum === "SUBSCRIBED";
        if (hazir && !kanalHazirRef.current) yukle();
        kanalHazirRef.current = hazir;
      });
    const yoklama = setInterval(() => {
      if (document.visibilityState !== "visible" || hataSayisiRef.current) return;
      const kalanMs = fazBitisRef.current == null ? Infinity : fazBitisRef.current - (Date.now() + farkRef.current);
      const bitiseYakin = kalanMs <= SON_YOKLAMA_PENCERE_MS && kalanMs > -2000;
      const gecikmis = kalanMs <= -2000 && kalanMs > -GECIKMIS_PENCERE_MS;
      const aralik = bitiseYakin ? SON_YOKLAMA_MS
        : kanalHazirRef.current ? (gecikmis ? GECIKMIS_YOKLAMA_MS : YEDEK_YOKLAMA_MS) : KANALSIZ_YOKLAMA_MS;
      if (Date.now() - sonYukleRef.current >= aralik - 50) yukle();
    }, SON_YOKLAMA_MS);
    const tazeleHemen = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(yenidenDeneRef.current);
      yenidenDeneRef.current = null;
      yukle();
    };
    const gorunur = () => { if (document.visibilityState === "visible") tazeleHemen(); };
    document.addEventListener("visibilitychange", gorunur);
    window.addEventListener("pageshow", tazeleHemen);
    window.addEventListener("online", tazeleHemen);
    // 14 Eki (Paket A): giriş sahnesi (sandık + 3-2-1) boyunca sayfa saati DURUR — sahne kendi sayacıyla akar ve bitince
    // girisBitti ile saati bir kez ilerletir. Eskiden 200 ms'de bir bütün KasaPage yeniden çiziliyordu (CPU 6x'te kasma).
    // Sigorta: sahnenin sunucu bitişi geçtiyse saat yine işler (sahne kendi bitişini bildiremese de 200 ms içinde kalkar).
    const saat = setInterval(() => {
      const bitis = girisBitisRef.current;
      if (girisAktifRef.current && bitis != null && Date.now() + farkRef.current < bitis) return;
      // 15 Eki: sahne öncesi bekleme katmanında da saat durur (katman kendi CSS animasyonuyla canlı); sahne zamanına
      // ~60 ms kala yeniden işler. Başlangıç bilinmiyorsa (rakip gelmedi) yeni durum verisi zaten yeniden çizer.
      if (girisBekleRef.current && (bitis == null || Date.now() + farkRef.current < bitis - girisSureRef.current - 60)) return;
      setSimdi(Date.now());
    }, 200);
    return () => {
      sesErtele();
      clearInterval(yoklama);
      clearInterval(saat);
      window.clearTimeout(yenidenDeneRef.current);
      yenidenDeneRef.current = null;
      document.removeEventListener("visibilitychange", gorunur);
      window.removeEventListener("pageshow", tazeleHemen);
      window.removeEventListener("online", tazeleHemen);
      clearTimeout(sinyalZamanRef.current);
      sinyalZamanRef.current = null;
      kanalHazirRef.current = false;
      supabase.removeChannel(kanal);
    };
  }, [id, yukle]);

  // 957: rövanş kabul edildiyse iki taraf da yeni maça geçer
  useEffect(() => {
    if (d?.rovans?.id && d.rovans.id !== id) navigate(y(`/kasa/${d.rovans.id}`), { replace: true });
  }, [d?.rovans?.id, id, navigate]);
  const rovIsteyen = d?.rovans?.isteyen ?? null;
  const rovGecerli = Boolean(d?.rovans?.gecerli);
  const rovId = d?.rovans?.id ?? null;
  const benIstedim = Boolean(d && rovIsteyen === d.ben && rovGecerli && !rovId);
  useEffect(() => {
    if (benIstedim) {
      if (rovBas == null && !rovVazgec) setRovBas(Date.now());   // sayfa yeniden açıldıysa ilk görüldüğü an
      return;
    }
    if (rovBas == null || rovId) { if (rovId) setRovBas(null); return; }
    setRovBas(null);
    if (!rovVazgec) setRovSonuc(rovIsteyen == null ? "red" : "cevapsiz");
  }, [benIstedim, rovBas, rovVazgec, rovId, rovIsteyen]);

  // Rövanş RPC'leri sunucuda idempotent: zaman aşımında yeniden denenir (Düello eylem() ile aynı).
  const rovansEylem = async (ad, fn, params = {}) => {
    setHata(null);
    setCalisan(ad);
    try {
      const { data, error } = await zamanAsimindaYenidenDene(() => supabase.rpc(fn, { p_id: id, ...params }));
      if (error) throw error;
      if (typeof data === "string" && data && data !== id) { navigate(y(`/kasa/${data}`), { replace: true }); return true; }
      await yukle();
      return true;
    } catch (e) {
      setHata(c(hataMesaji(e)));
      return false;
    } finally {
      setCalisan(null);
    }
  };
  const rovansIste = () => {
    setRovVazgec(false);
    setRovSonuc(null);
    setRovBas(Date.now());
    rovansEylem("rovans", "kasa_rovans_iste").then((tamam) => { if (!tamam) setRovBas(null); });
  };
  const rovansVazgec = async () => {
    const tamam = await rovansEylem("rovans-iptal", "kasa_rovans_iptal");
    if (tamam) { setRovVazgec(true); setRovBas(null); }
  };

  // Faz bitişinde tek okuma (sunucu fazı tembel ilerletir). Kopukken bitiş gerçek değildir: zamanlayıcı kurulmaz.
  // 951: cevap fazında Ek Süre / Zaman Baskısı kişisel bitişi değiştirir; faz iki bitişin geç olanında çözülür (faz_son).
  const bitisAnahtar = d?.durum === "aktif" && !d.kopuk
    ? `${d.faz}|${d.faz === "cevap" && d.sureler?.faz_son ? d.sureler.faz_son : d.faz_bitis}` : "";
  useEffect(() => {
    if (!bitisAnahtar) { fazBitisRef.current = null; return undefined; }
    const [faz, zaman] = bitisAnahtar.split("|");
    const t = new Date(zaman).getTime();
    if (!Number.isFinite(t)) { fazBitisRef.current = null; return undefined; }
    const hedef = t + (faz === "cevap" ? CEVAP_TOLERANS_MS : 60);
    fazBitisRef.current = hedef;
    const bekleMs = hedef - (Date.now() + farkRef.current);
    if (bekleMs < -2000 || bekleMs > 10 * 60 * 1000) return undefined;
    const z = setTimeout(() => { if (document.visibilityState === "visible") yukle(); }, Math.max(0, bekleMs));
    return () => clearTimeout(z);
  }, [bitisAnahtar, yukle]);

  // Maçın kendi nabzı (kopukluk eşiğinin yarısından kısa — sunucu sureler.nabiz ile kırpar).
  const nabizSn = Number(d?.sureler?.nabiz) > 0 ? Number(d.sureler.nabiz) : 10;
  useEffect(() => {
    let durdu = false;
    const at = async () => {
      if (durdu || document.visibilityState !== "visible") return;
      try { await supabase.rpc("kalp_at"); } catch (e) { console.warn("[Bildim] kasa nabzı atılamadı:", e?.message ?? e); }
    };
    at();
    const z = setInterval(at, nabizSn * 1000);
    document.addEventListener("visibilitychange", at);
    window.addEventListener("pageshow", at);
    window.addEventListener("online", at);
    return () => {
      durdu = true;
      clearInterval(z);
      document.removeEventListener("visibilitychange", at);
      window.removeEventListener("pageshow", at);
      window.removeEventListener("online", at);
    };
  }, [id, nabizSn]);

  // ---------------- sayaç (Düello 325 deseni: gösterim payı + sayacGoster) ----------------
  const gosterimBas = d?.sureler?.gosterim_bas && ["karar", "cevap"].includes(d?.faz) ? new Date(d.sureler.gosterim_bas).getTime() : null;
  // Sayaç benim KİŞİSEL bitişime göre işler (Ek Süre uzatır, rakibin Zaman Baskısı kısaltır)
  const benimBitis = d?.faz === "cevap" && d?.sureler?.benim_bitis ? d.sureler.benim_bitis : d?.faz_bitis;
  const kalanSn = useMemo(() => {
    if (!benimBitis) return 0;
    const sunucuSimdi = Math.max(simdi, Date.now()) + farkRef.current;
    // Yayın öncesi tarama (11 Eki 2026): KARAR sayacı gösterim payında donmaz — karar sahibi pay boyunca da AÇ/DEVAM
    // diyebilir (sunucu kabul eder), yani gerçek süre karar_sn + pay. Sayaç sunucu faz_bitis'e kalanı sayar (5'te ~2,5 sn
    // bekleyip sonra saymıyordu); 0 = sunucunun süre bitişi. Cevap fazında pay sayacı aynen gizler (soru sahnesi).
    const bas = gosterimBas && d?.faz !== "karar" ? Math.max(sunucuSimdi, gosterimBas) : sunucuSimdi;
    return Math.max(0, (new Date(benimBitis).getTime() - bas) / 1000);
  }, [benimBitis, gosterimBas, simdi, d?.faz]);
  const fazKaymaRef = useRef({ anahtar: null, k0: 0, kayma: 0 });
  const akisSayacRef = useRef(null);   // tanı: sayacın her fazda ilk göründüğü an
  const kopukDonukSn = d?.kopuk && Number.isFinite(Number(d.kopuk.faz_kalan_sn)) ? Math.max(0, Number(d.kopuk.faz_kalan_sn)) : null;
  const gosterSn = useMemo(() => {
    if (kopukDonukSn != null) return kopukDonukSn;
    if (!(kalanSn > 0) || !d) return 0;
    const anahtar = `${turAnahtari(d)}-${d.faz}-${benimBitis}`;
    if (fazKaymaRef.current.anahtar !== anahtar) fazKaymaRef.current = { anahtar, ...sayacKaymasi(kalanSn) };
    return sayacGoster(kalanSn, fazKaymaRef.current);
  }, [kalanSn, kopukDonukSn, d?.tur, d?.altin, d?.savunma?.durum, d?.faz, benimBitis]);   // eslint-disable-line react-hooks/exhaustive-deps
  // 10 Eki 2026 (Düello ile aynı): cevap verilince (istek yoldayken de) sayaç o anki değerde durur.
  const cevapSayacSn = useDonukSayac(gosterSn, d?.faz === "cevap" && (Boolean(d?.cevap?.ben_cevapladim) || secim !== null),
    d ? `${turAnahtari(d)}-${d.savunma?.durum ?? ""}` : "");
  useEffect(() => {
    if (kalanSn <= 0 || kopukDonukSn != null) return undefined;
    const z = setTimeout(() => setSimdi(Date.now()), sayacSinirMs(kalanSn, fazKaymaRef.current) + 5);
    return () => clearTimeout(z);
  }, [kalanSn, gosterSn, kopukDonukSn]);

  // Yayın öncesi tarama (11 Eki 2026): karar süresi doldu → düğmeler HEMEN pasif + "Süre doldu · DEVAM" (0'da basılan AÇ
  // yükleniyor gösterip sayılmıyordu). 0 = sunucu faz_bitis; oyuncunun süresi kısalmaz.
  const kararSureDoldu = d?.durum === "aktif" && d?.faz === "karar" && kopukDonukSn == null && Boolean(benimBitis) && kalanSn <= 0;
  // Ölü bekleme yok: karar sahibi hiç dokunmadıysa KENDİ istemcisi süre bitince sunucuya bildirir (kasa_karar p_ac = null →
  // sunucu faz_bitis geçtiyse süre dolumunu hemen uygular; 1063). Eskiden panel geç varış payı (3 sn) + yoklama kadar, ~4 sn
  // 0'da donuk kalıyordu. Rakibin istemcisi bildirmez — karar sahibinin ağda yolda olan dokunuşunu kesmesin (pay onun için).
  const calisanRef = useRef(null);
  calisanRef.current = calisan;
  const sureDolduRef = useRef(null);
  useEffect(() => {
    if (!d || d.durum !== "aktif" || d.faz !== "karar" || d.karar?.veren !== d.ben || kopukDonukSn != null || !d.faz_bitis) return undefined;
    const anahtar = `${turAnahtari(d)}-${d.faz_bitis}`;
    if (sureDolduRef.current === anahtar) return undefined;
    let iptal = false;
    const zamanlar = [];
    const bildir = async (deneme) => {
      if (iptal || calisanRef.current || dGuncelRef.current?.faz !== "karar") return;
      sureDolduRef.current = anahtar;
      try {
        const { error } = await supabase.rpc("kasa_karar", { p_id: id, p_ac: null });
        if (error) throw error;
        await yukle();
      } catch (e) {
        // Saat farkıyla sunucuya erken vardıysa bir kez daha; faz zaten geçtiyse yalnız tazelenir (hata gösterilmez)
        if (deneme === 0 && /dolmad/i.test(e?.message ?? "")) { sureDolduRef.current = null; zamanlar.push(setTimeout(() => bildir(1), 600)); return; }
        yukle().catch(() => {});
      }
    };
    const ms = new Date(d.faz_bitis).getTime() - (Date.now() + farkRef.current) + 150;
    zamanlar.push(setTimeout(() => bildir(0), Math.max(0, ms)));
    return () => { iptal = true; zamanlar.forEach(clearTimeout); };
  }, [d?.durum, d?.faz, d?.faz_bitis, d?.tur, d?.karar?.veren, kopukDonukSn, id, yukle]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- anlar (yalnız sunum): ses + titreşim + efekt ----------------
  // an: { id, tip: "sonuc" | "ac", … , varis, anahtarVaris, sars } — efekt sürerken eski değerler gösterilir,
  // altın hedefe ulaşınca gerçek değere sayarak geçilir. Zamanlar kasa-efekt.css animasyonlarıyla eşleşir.
  const [an, setAn] = useState(null);
  // 990: rakibin AÇ/DEVAM kararının açıklanışı { id, asama: "kapali" | "acik", ac, sureDoldu, deger, carpan, eskiPuan, eskiKasa }
  const [rakipKarar, setRakipKarar] = useState(null);
  const kararZamanRef = useRef([]);
  const [turBant, setTurBant] = useState(null);
  // 958: karar her turda gelebilir — band açıldığı fazda kalır; hızlı AÇ/DEVAM'da yeni soru sahnesinde ikinci kez belirmez
  const turBantFazRef = useRef(null);
  const anZamanRef = useRef([]);
  const iyimserAcRef = useRef(null);   // 12 Eki · M3: iyimser başlatılan AÇ anının tur anahtarı
  const acBasildiRef = useRef(null);   // 13 Eki: AÇ'a basılan turun anahtarı (iyimser AÇ + final) — yanıt gelene kadar sayim_son tiki susar
  const iyimserAcBittiRef = useRef(false);   // 13 Eki: iyimser AÇ anı sunucu yanıtından ÖNCE bitti mi (soru sesi yanıtta çalınır)
  const kokRef = useRef(null);
  const imza = useTakiliImza();   // 1040: takılı Cevap İmzası — yalnız kendi profilimden, rakip görmez
  // 980: her ses/efekt bir OLAY anahtarına (tur/altın/faz, AÇ, DEVAM, 3-2-1 rakamı, maç sonu…) bağlı, maç sayfasının
  // ömründe TEK SEFER. Yeniden çizim, Realtime tekrarı, StrictMode'un çift effect'i, sekme dönüşü tekrar tetiklemez.
  const calinanRef = useRef(new Set());
  // 15 Eki 2026 (senkron, kök düzeltme) — TUR ÇİZELGESİ: her faz (sunucunun faz_bitis / gosterim_bas'ı) kendi seslerini ve
  // zamanlayıcılarını taşır. Yeni faz gelince öncekinin bekleyen BÜTÜN sesleri ve ses zamanlayıcıları düşer (sesFazDegisti +
  // fazZamanRef); geç inen ses sonraki faza taşmaz. Animasyonlar kendi fazına sığacak kadar kısalır (sonuç anı:
  // SONUC_AN_PAY_MS; AÇ/DEVAM: gösterim payı), yarıda sökülmez. Sıra: karar → tur_gecis, kalp (600 ms sonra), son 3 sn tik ·
  // AÇ/DEVAM anı → kendi sesleri, soru sesi an bitince · soru → soru_geldi · sonuç → doğru/yanlış, rakip kaybı (480 ms),
  // altın varışı, XP (büyük artış), anahtar.
  const fazZamanRef = useRef([]);
  const fazZaman = (f, ms) => { fazZamanRef.current.push(setTimeout(fazdaCal(f), ms)); };
  useEffect(() => () => fazZamanRef.current.forEach(clearTimeout), []);
  const birKez = useCallback((anahtar) => {
    if (calinanRef.current.has(anahtar)) return false;
    calinanRef.current.add(anahtar);
    return true;
  }, []);
  // Soru sesi TEK kaynak: giriş sahnesi kalkışı / faz gelişi / AÇ anı bitişi — hangisi soruyu görünür kıldıysa o çalar, sorunun anahtarıyla bir kez
  const soruSesi = useCallback((dd) => { if (birKez(`soru:${turAnahtari(dd)}`) && !gorunurDegil()) sesSoruGeldi(); }, [birKez]);
  const anBaslat = useCallback((yeni, adimlar) => {
    anZamanRef.current.forEach(clearTimeout);
    anZamanRef.current = [];
    // 980: gizli sekmede an başlamaz (dönüşte kısılmış zamanlayıcılar sesleri üst üste çalıyordu)
    if (gorunurDegil()) { setAn(null); return; }
    if (hareketAzaltildiMi()) {   // azaltılmış hareket: uçuş yok, yalnız sesler sırayla
      setAn(null);
      adimlar.forEach(([ms, , ses]) => { if (ses) anZamanRef.current.push(setTimeout(ses, ms)); });
      return;
    }
    const id = Date.now();
    setAn({ ...yeni, id });
    akis("an:basladi", { tip: yeni.tip, olcek: yeni.olcek ?? 1, bitisMs: Math.max(0, ...adimlar.map(([ms]) => ms)) });
    adimlar.forEach(([ms, yama, ses]) => {
      anZamanRef.current.push(setTimeout(() => {
        if (yama) setAn((a) => (a?.id === id ? (yama === "bitir" ? null : { ...a, ...yama }) : a));
        if (yama === "bitir" || yama?.bitti) akis("an:bitti", { tip: yeni.tip });
        else if (yama?.varis) akis("an:varis", { tip: yeni.tip });
        if (ses) ses();
      }, ms));
    });
  }, []);
  useEffect(() => () => anZamanRef.current.forEach(clearTimeout), []);
  useEffect(() => () => kararZamanRef.current.forEach(clearTimeout), []);

  // ---------------- 951/955: maç başı giriş sahnesi (sunucu saatine bağlı) ----------------
  // İlk sorunun gösterim başlangıcı (soru açılışı + gösterim payı) sahnenin bitişidir. 955: TEK KATMAN — sahne son 6 sn'yi
  // kaplar (sandık düşer, sonra 3-2-1 sandığın üstünde sayar); bu sırada soru ekranı ÇİZİLMEZ. Sahne erken açılırsa
  // (arama geçişi) bitişe kadar ekranda kalır. Sunucu süreleri 952 ile aynı: sayaç sahne bitince başlar (kayıp süre yok).
  const payiMs = Number(d?.sureler?.gosterim_payi_ms ?? 1500);
  const girisBitisHam = d && d.durum === "aktif" && !d.altin && Number(d.tur) <= 1
    ? (d.faz === "baslangic" && d.faz_bitis ? new Date(d.faz_bitis).getTime() + payiMs
      : d.faz === "cevap" && d.sureler?.gosterim_bas ? new Date(d.sureler.gosterim_bas).getTime() : null)
    : null;
  const sunucuSimdiMs = simdi + farkRef.current;
  // 980 KÖK: sahnenin bitişi iki kaynaktan gelir — başlangıç fazında "faz_bitis + pay", ilk soru açılınca "gosterim_bas".
  // Sunucu fazı TEMBEL ilerletir: soru, faz_bitis'ten sonraki ilk okumada (gecikme kadar geç) açılır, gosterim_bas da o
  // kadar ileri kayar. Bitiş her okumada yeniden hesaplanınca 3-2-1 ortasında kayıyor; sahne bittikten sonra kayarsa
  // sahne YENİDEN açılıp sandık düşüşü ve 3-2-1 sesleri tekrar çalıyordu. Artık: sahne başlayana kadar sunucuyu izler,
  // başladığı an SABİTLENİR; bitince (ya da yarıda kalırsa) bu maçta bir daha açılmaz. Sorunun sayacı yine sunucunun
  // gosterim_bas'ına bağlıdır (aradaki birkaç yüz ms'de 15'te bekler — süre kaybı yok).
  const girisDurumRef = useRef({ bitis: null, basladi: false, bitti: false });
  const gd = girisDurumRef.current;
  if (!gd.basladi && girisBitisHam != null) gd.bitis = girisBitisHam;
  // Sahne süresi sunucu ayarından; sahne başlayınca SABİT (bitiş gibi), maç ortasında ayar değişse sahne kaymaz
  const girisAyarMs = useAyar("kasa_giris_sahne_ms", GIRIS_SAHNE_VARSAYILAN_MS);
  const girisSureRef = useRef(GIRIS_SAHNE_VARSAYILAN_MS);
  if (!gd.basladi && girisAyarMs > 0) girisSureRef.current = girisAyarMs;
  const GIRIS_SAHNE_MS = girisSureRef.current;
  const girisBitis = gd.bitti ? null : gd.bitis;
  const girisGecen = girisBitis != null ? sunucuSimdiMs - (girisBitis - GIRIS_SAHNE_MS) : null;
  // Sahne erken açılırsa (arama geçişi) bitişe kadar ekranda kalır (gecikme 0'dan başlar)
  // 15 Eki 2026: sahne YALNIZ kendi zamanında açılır (girisGecen ≥ 0). Eskiden erken açılıp (arama geçişi / gösterim payı)
  // animasyonları bitince "Hazır ol!"da donuk kalıyordu; o süre artık sahnenin canlı bekleme hâli (KasaGirisSahnesi bekle).
  const girisAktif = girisGecen != null && girisGecen >= 0 && girisGecen < GIRIS_SAHNE_MS && !d?.kopuk;
  if (girisAktif) gd.basladi = true;
  else if (gd.basladi) gd.bitti = true;
  // Sahne öncesi bekleme: rakip maç ekranına gelmedi (faz_bitis yok) ya da sahne zamanı henüz gelmedi (gösterim payı)
  const girisBekle = !girisAktif && !gd.basladi && d?.durum === "aktif" && !d.altin && Number(d.tur) <= 1
    && d.faz === "baslangic" && !d?.kopuk && (girisGecen == null || girisGecen < 0);
  const girisAktifRef = useRef(false);
  const girisBekleRef = useRef(false);
  girisBekleRef.current = girisBekle;
  girisAktifRef.current = girisAktif;
  const girisBitisRef = useRef(null);   // sunucu saatiyle sahne bitişi (200 ms saatinin sigortası)
  girisBitisRef.current = girisBitis;
  useEffect(() => {
    if (!girisAktif || !birKez("giris:dusus")) return;
    // düşüş (kasa-efekt.css ks-giris-in: yere ~%20'de oturur) — geç gelen istemcide / gizli sekmede düşüş sesi atlanır
    akis("giris:sahne", { gecenMs: girisGecen });
    if ((girisGecen != null && girisGecen > 900) || gorunurDegil()) return;
    sesTurGecis();
    // zamanlayıcılar an listesinde: sekme gizlenince / sayfa kapanınca temizlenir (StrictMode temizliği sesi yutmasın)
    // 14 Eki: coin sesi yalnız oyuncu hazineyi AÇINCA (giriş düşüşünde, tur sonunda, rakibin AÇ'ında çalmaz)
    anZamanRef.current.push(setTimeout(() => titret([10, 30, 10]), 650),
                            setTimeout(() => { sesRozet(); titret(20); }, 1300));
  }, [girisAktif]);   // eslint-disable-line react-hooks/exhaustive-deps
  // 3-2-1: her rakam maçta bir kez (sahne yeniden kurulsa da), gizli sekmede sessiz
  const girisSayi = useCallback((n) => {
    if (!birKez(`giris:${n}`) || gorunurDegil()) return;
    akis("giris:sayi", { n });
    sesTik(n); titret(n === 1 ? 24 : 12);
  }, [birKez]);
  const girisBitti = useCallback(() => setSimdi(Date.now()), []);
  // Sahne kalkınca (soru görünür) soru sesi — sahne kendi bitişini görmeden kalksa da bir kez çalar
  const girisOncekiRef = useRef(false);
  useEffect(() => {
    const once = girisOncekiRef.current;
    girisOncekiRef.current = girisAktif;
    if (once && !girisAktif && d?.durum === "aktif" && d?.faz === "cevap") soruSesi(d);
  }, [girisAktif]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- 951: maç sonu açılış sahnesi (aktif → bitti geçişi görüldüyse) ----------------
  const [finalAn, setFinalAn] = useState(null);
  const oncekiDurumRef = useRef(null);
  const finalZamanRef = useRef([]);
  useEffect(() => () => finalZamanRef.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!d) return;
    const once = oncekiDurumRef.current;
    oncekiDurumRef.current = d.durum;
    if (once !== "aktif" || d.durum !== "bitti") return;
    const f = kasaFinalVerisi(d);
    if (!f || !birKez("final")) return;
    // 980: gizli sekmede maç bittiyse sahne/ses yok — dönüşte doğrudan maç sonu (sesler üst üste çalmasın)
    if (gorunurDegil()) return;
    finalOynat(f);
  }, [d]);   // eslint-disable-line react-hooks/exhaustive-deps
  // 12 Eki · M3: final sahnesi tek yerden — sunucu bitişi ya da maçı bitiren AÇ'ın iyimser başlangıcı (kararVer)
  function finalOynat(f) {
    sesFazDegisti();   // 15 Eki: maçın bekleyen sesleri maç sonu sahnesine taşmaz
    fazZamanRef.current.forEach(clearTimeout); fazZamanRef.current = [];
    akis("final", { kazandim: f.kazandim });
    const kazandim = f.kazandim;
    const sahneMs = hareketAzaltildiMi() ? 1500 : kazandim ? sure("kasa_final_sahne") : sure("kasa_final_kapanis");
    const fk = sureOlcek(kazandim ? "kasa_final_sahne" : "kasa_final_kapanis");   // ses adımları sahneyle ölçeklenir
    setFinalAn(f);
    // Zamanlayıcılar ref'te: d sonradan değişse de sahne yarıda kalmaz (yalnız sayfa kapanınca temizlenir)
    const sesler = kazandim
      // 14 Eki: joker sesi yalnız joker kullanımında, coin sesi yalnız kendi AÇ'ında — final sahnesi ikisini de çalmaz
      ? [[150, sesTurGecis], [1150, () => { sesRozet(); titret([30, 50, 40]); }],
         [2300, () => titret([40, 30, 60])], [2450, () => sesMacSonu("xp_dolma")]]
      : [[200, sesTurGecis], [1350, () => { sesYanlis(); titret(40); }]];
    // Sahne bitince sesi de biter: kısalmış sahnede (hareket azaltma 1,5 sn) sonraki sesler kutlamanın seslerine binmesin
    const z = sesler.map(([ms, f]) => [Math.round(ms * fk), f]).filter(([ms]) => ms < sahneMs).map(([ms, f]) => setTimeout(f, ms));
    z.push(setTimeout(() => setFinalAn(null), sahneMs));
    finalZamanRef.current.push(...z);
  }

  // ---------------- 951: jokerler (yalnız sunum; etkiler sunucuda) ----------------
  const [kirilan, setKirilan] = useState([]);
  const [ekBalon, setEkBalon] = useState(null);
  const [elenenYerel, setElenenYerel] = useState(null);
  const [jokerBilgiMetni, setJokerBilgiMetni] = useState(null);
  const [rakipJokerAn, setRakipJokerAn] = useState(null);
  const [cifteAn, setCifteAn] = useState(null);
  const [savunmaAn, setSavunmaAn] = useState(null);   // 987: tetik / savundu / düştü anı
  const savunmaZamanRef = useRef([]);   // 12 Eki · M5: sıralı tetik anının zamanlayıcıları
  useEffect(() => () => savunmaZamanRef.current.forEach(clearTimeout), []);
  // 953: DEVAM ödülü anı — yalnız kendi DEVAM'ımın açtığı soruda, sunucunun devam_odul kaydına göre (rakip görmez)
  const [devamAn, setDevamAn] = useState(null);
  const devamBekleRef = useRef(null);
  const jokerZamanRef = useRef([]);
  const jokerZaman = (f, ms) => { jokerZamanRef.current.push(setTimeout(f, ms)); };
  useEffect(() => () => jokerZamanRef.current.forEach(clearTimeout), []);
  // 15 Eki 2026 (senkron): AÇ anında altın skora varınca çubuğun parlaması (kasa-efekt.css ks-cubuk-parla, 700 ms) anın bitişine
  // bağlı değil — yavaş telefonda varış geç tetiklenip an hemen bitince parlama yarıda kesiliyordu; kendi süresini tamamlar.
  const [skorParla, setSkorParla] = useState(null);
  const parlaKim = an?.tip === "ac" && an.varis ? an.kim : null;
  useEffect(() => {
    if (!parlaKim) return;
    setSkorParla(parlaKim);
    jokerZaman(() => setSkorParla((x) => (x === parlaKim ? null : x)), 800);
  }, [parlaKim]);   // eslint-disable-line react-hooks/exhaustive-deps
  // 980: tek seferlik anları bitir — dokunarak geçme (sonuç uçuşu, AÇ, DEVAM ×2, ÇİFTE, maç sonu sahnesi) ve sekme
  // gizlenince. Gösterilen değerler gerçeğe atlar, kalan sesler çalmaz (dönüşte kısılmış zamanlayıcılar patlamaz).
  const anlariBitir = useCallback(() => {
    anZamanRef.current.forEach(clearTimeout);
    anZamanRef.current = [];
    finalZamanRef.current.forEach(clearTimeout);
    finalZamanRef.current = [];
    kararZamanRef.current.forEach(clearTimeout);
    kararZamanRef.current = [];
    savunmaZamanRef.current.forEach(clearTimeout);
    savunmaZamanRef.current = [];
    setAn(null); setCifteAn(null); setFinalAn(null); setRakipKarar(null); setSavunmaAn(null);
  }, []);
  useEffect(() => {
    const gizlenince = () => { if (gorunurDegil()) anlariBitir(); };
    document.addEventListener("visibilitychange", gizlenince);
    window.addEventListener("pagehide", anlariBitir);
    return () => {
      document.removeEventListener("visibilitychange", gizlenince);
      window.removeEventListener("pagehide", anlariBitir);
    };
  }, [anlariBitir]);
  useEffect(() => { setKirilan([]); setEkBalon(null); setElenenYerel(null); }, [d?.tur, d?.altin, d?.savunma?.durum === "soru"]);
  const jokerEtkisi = useCallback((sonuc) => {
    if (!sonuc) return;
    if (sonuc.tur === "elli" && Array.isArray(sonuc.kapali)) {
      setKirilan(sonuc.kapali);
      jokerZaman(() => setKirilan([]), QT_KIRILMA_MS);
    } else if (sonuc.tur === "sure") {
      setEkBalon({ anahtar: Date.now(), metin: `+${Number(sonuc.eklenen_sn ?? 10)}` });
    } else if (sonuc.tur === "zaman_baskisi" && sonuc.rakip) {
      setEkBalon({ anahtar: Date.now(), metin: `−${Number(sonuc.azaltildi ?? 5)}` });
      sesSkill("zaman_baskisi"); titret([20, 40, 20]);
    }
    yukleRef.current?.();
  }, []);
  const jokerBilgiGoster = useCallback((b) => {
    if (!b?.metin) return;
    setJokerBilgiMetni(b);
    jokerZaman(() => setJokerBilgiMetni((x) => (x?.anahtar === b.anahtar ? null : x)), sure("kasa_joker_bilgi"));
  }, []);
  useEffect(() => {
    const bek = devamBekleRef.current;
    if (!d || bek == null || d.faz !== "cevap") return;
    devamBekleRef.current = null;
    const o = d.devam_odul;
    if (d.durum !== "aktif" || !o || Number(o.tur) !== bek) return;
    const an = { kazandi: Boolean(o.kazandi), joker: o.joker ?? null, anahtar: Date.now() };
    setDevamAn(an);
    if (an.kazandi) { sesRozet(); titret([14, 40, 20]); }   // ödül jokeri kazanıldı (kullanılmadı) → ödül sesi; kaybedince sessiz
    jokerZaman(() => setDevamAn((x) => (x?.anahtar === an.anahtar ? null : x)), an.kazandi ? sure("kasa_devam_odul") : Math.round(1200 * sureOlcek("kasa_devam_odul")));
  }, [d]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Rakip yeni joker kullandı → ikon + kısa efekt (rakip avatarının altında)
  const rakipJokerSayiRef = useRef({ tur: null, n: 0 });
  useEffect(() => {
    if (!d || d.durum !== "aktif") return;
    const liste = Array.isArray(d.rakip_joker) ? d.rakip_joker : [];
    const anahtar = `${turAnahtari(d)}`;
    const r = rakipJokerSayiRef.current;
    if (r.tur !== anahtar) { rakipJokerSayiRef.current = { tur: anahtar, n: liste.length }; if (!liste.length) return; }
    else if (liste.length <= r.n) return;
    rakipJokerSayiRef.current = { tur: anahtar, n: liste.length };
    const tur = liste[liste.length - 1];
    if (r.tur !== anahtar && d.faz !== "cevap") return;
    setRakipJokerAn({ tur, anahtar: Date.now() });
    sesJoker(); titret(12);
    jokerZaman(() => setRakipJokerAn((x) => (x?.tur === tur ? null : x)), sure("kasa_rakip_joker"));
  }, [d]);   // eslint-disable-line react-hooks/exhaustive-deps

  const anRef = useRef({ faz: null, rakip: false, tur: null });
  useEffect(() => {
    if (!d || d.durum !== "aktif") return;
    const anahtar = `${turAnahtari(d)}-${d.faz}`;
    if (anRef.current.faz !== anahtar) {
      const onceki = anRef.current.faz;
      const oncekiTur = anRef.current.tur;
      anRef.current = { faz: anahtar, rakip: false, tur: `${turAnahtari(d)}` };
      setSecim(null);
      // 15 Eki: önceki fazın bekleyen sesleri / ses zamanlayıcıları düşer (TUR ÇİZELGESİ, bkz. fazZamanRef)
      sesFazDegisti();
      fazZamanRef.current.forEach(clearTimeout); fazZamanRef.current = [];
      akis("faz", { anahtar, faz: d.faz, tur: d.tur, faz_bitis: d.faz_bitis, gosterim_bas: d.sureler?.gosterim_bas ?? null,
                    sunucuSimdi: Date.now() + farkRef.current });
      if (!onceki) return;
      // 980: faz olayı (tur-altın-faz) maçta tek sefer; gizli sekmede açılan fazın sesi/anı çalınmaz (dönüşte patlamasın)
      if (!birKez(`faz:${anahtar}`)) return;
      if (gorunurDegil()) {
        anZamanRef.current.forEach(clearTimeout); anZamanRef.current = []; setAn(null);
        kararZamanRef.current.forEach(clearTimeout); kararZamanRef.current = []; setRakipKarar(null);
        return;
      }
      const acildi = d.faz === "cevap" && d.son_karar?.ac && !d.son_karar.son && !kasaSavunma(d);
      // 12 Eki · M3: kendi AÇ'ım iyimser başladıysa (kararVer) sunucu yanıtı geldiğinde an sürer — yeniden başlamaz, sökülmez
      const iyimserAc = acildi && d.son_karar.veren === d.ben && iyimserAcRef.current === `${turAnahtari(d)}`;
      iyimserAcRef.current = null;
      // 13 Eki: yanıt iyimser AÇ anı bittikten SONRA geldi → "bitir" adımı faz hâlâ karar iken geçmişti; soru sesi burada (birKez: çift çalmaz)
      if (iyimserAc && iyimserAcBittiRef.current && d.faz === "cevap" && !girisAktifRef.current) soruSesi(d);
      if (d.faz !== "sonuc" && !iyimserAc) { anZamanRef.current.forEach(clearTimeout); setAn(null); }
      const yeniTur = oncekiTur !== `${turAnahtari(d)}`;
      // Giriş sahnesi sürerken ilk sorunun bandı/sesi sahnenin altında kalmasın (sahne kendi sesini çalar)
      if (yeniTur && (d.faz === "karar" || d.faz === "cevap") && !girisAktifRef.current) { turBantFazRef.current = d.faz; setTurBant(Date.now()); }
      // 15 Eki: kendi/rakibin DEVAM anı varsa soru sesi an bitince çalar (AÇ ile aynı) — an sesiyle aynı anda çalmasın
      const skO = d.son_karar;
      const devamAnVar = d.faz === "cevap" && onceki === `${turAnahtari(d)}-karar` && skO && !skO.ac && !skO.son
        && skO.yeni != null && Number(skO.yeni) !== Number(skO.deger);
      if (d.faz === "cevap" && !acildi) { if (!girisAktifRef.current && !devamAnVar) soruSesi(d); }
      else if (d.faz === "karar") sesTurGecis();
      else if (d.faz === "sonuc" && d.sonuc) {
        const s = d.sonuc;
        // 987: Savunma sonucu izleyen için tersine iyi/kötü (rakip savunamazsa karar bende)
        const sv = s.savunma;
        const svSonuc = sv && (sv.durum === "basarili" || sv.durum === "basarisiz");
        const iyi = svSonuc ? (sv.sahip === d.ben) === (sv.durum === "basarili") : Boolean(s.ben_dogru);
        if (iyi) sesDogru(); else sesYanlis();
        titret(iyi ? 12 : 30);
        // 15 Eki 2026 (Ida): rakip yanlış bildiyse (ya da cevapsız kaldıysa) kendi sesimden sonra kısık "rakip kaybetti" sesi —
        // Düello'nun rakip can sesi (sesCanKaybi(false)); Altın Soru ve Savunma sonucunda kendi anları var, çalmaz.
        if (!s.altin && !sv && s.rakip_dogru === false && birKez(`rakip-yanlis:${turAnahtari(d)}`)) {
          fazZaman(() => { if (!gorunurDegil()) sesCanKaybi(false); }, 480);   // sonuç fazı biterse düşer
        }
        if (sv) {
          // tetik (bekliyor) ya da sonuç — olay anahtarı faz olayının kendisi (tek sefer); dokunarak geçilir
          const sa = { tip: svSonuc ? sv.durum : "tetik", benim: sv.sahip === d.ben, anahtar: Date.now() };
          // 12 Eki · M5: tetik anı SIRAYLA — önce cevap sonucu + altın uçuşu (varış ~950 ms) ve Cevap İmzası (≤ 1400 ms),
          // sonra "Savunma Hakkı". Sonuç fazı (kasa_sonuc_sn) bitince an yeni sorunun gösterim payında tamamlanır (bkz. sahne anahtarı).
          const svGec = svSonuc ? 0 : Math.max(kasaSonucArtisi(s) > 0 ? Math.round(1000 * sureOlcek("kasa_sonuc_ucus")) : 0,
                                               s.ben_dogru && imza ? 1400 : 0);
          const svSes = fazdaCal(() => { sesTurGecis(); return true; });   // 15 Eki: sonuç fazı bittiyse ses düşer
          const svGoster = () => {
            setSavunmaAn(sa);
            if (!svSonuc && svSes()) titret([16, 30, 16]);
            savunmaZamanRef.current.push(setTimeout(() => setSavunmaAn((x) => (x?.anahtar === sa.anahtar ? null : x)), sure("kasa_savunma")));
          };
          if (svGec > 0 && !hareketAzaltildiMi()) savunmaZamanRef.current.push(setTimeout(svGoster, svGec)); else svGoster();
        }
        // 951: ikisi de bildi → "ÇİFTE" patlama bandı
        if (!s.altin && s.ben_dogru && s.rakip_dogru && !hareketAzaltildiMi()) {
          const an = Date.now();
          setCifteAn(an);
          jokerZaman(() => setCifteAn((x) => (x === an ? null : x)), sure("kasa_cifte") + 1500);   // sigorta; bant animasyonu bitince kalkar (onBitti)
        }
        const gercekArtis = kasaSonucArtisi(s);
        if (!s.altin && gercekArtis > 0) {
          // +2 / +6: bant → mini kasa altın uçuşu; sahip değiştiyse anahtar uçar.
          const buyuk = Number(s.artis) >= Number(d.ikisi_artis ?? 6);
          const sahipDegisti = Boolean(s.sahip_sonra) && s.sahip_sonra !== s.sahip_once;
          // 15 Eki 2026 (senkron): an KALAN sonuç fazına sığar — eskiden 2,91 sn'lik an (anahtar halkasıyla 3,3 sn) 3 sn'lik
          // fazda veri geç gelince yeni fazda yarıda sökülüyordu. Taban uzunluk = son adım (anahtar halkası dahil); ölçek seçili
          // süreyi (sureler.js) aşmaz; kalan çok azsa an çizilmez, değerler doğrudan görünür.
          const tabanMs = sahipDegisti ? 1900 + ANAHTAR_PATLA_MS : 2600;
          const sonucKalanMs = new Date(d.faz_bitis).getTime() - (Date.now() + farkRef.current) - SONUC_AN_PAY_MS;
          const olcek = Math.min(sureOlcek("kasa_sonuc_ucus"), sonucKalanMs / tabanMs);
          const su = (ms) => Math.round(ms * olcek);
          const kim = (u) => (!u ? null : u === d.ben ? "ben" : "rakip");
          if (olcek >= SONUC_AN_EN_AZ) {
            anBaslat({ tip: "sonuc", kasaOnce: Number(s.kasa_once ?? 0), artis: gercekArtis, buyuk, olcek,
                       sahipOnce: s.sahip_once ?? null, sahipDegisti, anahtarDen: kim(s.sahip_once), anahtarA: kim(s.sahip_sonra) }, [
              // her turun altın uçuşu sessiz (coin yalnız AÇ'ta)
              [su(950), { varis: true }, () => { akis("puan:hazinede", { kasa: Number(s.kasa_sonra ?? 0) }); titret(buyuk ? [12, 40, 18] : 10); }],
              ...(buyuk ? [[su(1180), null, sesXpDolma]] : []),
              ...(sahipDegisti ? [[su(1900), { anahtarVaris: true }, () => { sesTurGecis(); titret(14); }]] : []),
              [su(tabanMs), { bitti: true }],
            ]);
          } else akis("an:atlandi", { tip: "sonuc", kalanMs: Math.round(sonucKalanMs) });
        }
      }
      // 980: AÇ / DEVAM anı SUNUCU ZAMANINA bağlı — yeni sorunun sayacı (gosterim_bas) başlamadan biter. Veri geç geldiyse
      // (Realtime gecikmesi, sekme dönüşü) an kalan paya sığacak kadar hızlanır (olcek < 1, CSS süreleri de ölçeklenir);
      // pay çok azsa görsel atlanır, değer doğrudan görünür. Ölçüm: rakipte AÇ anı sayaç başladıktan 0,46–2 sn sonra kalkıyordu.
      const gbMs = d.faz === "cevap" && d.sureler?.gosterim_bas ? new Date(d.sureler.gosterim_bas).getTime() : null;
      const payKalanMs = gbMs != null ? gbMs - (Date.now() + farkRef.current) - 60 : Infinity;
      // 990: rakibin kararı önce KAPALI kart (KAPALI_KARAR_MS), sonra vuruş — AÇ/DEVAM anı bu kadar geç başlar.
      // Zamanlayıcılar ayrı listede (anBaslat kendi listesini temizler); dokunarak geçme / sekme gizlenince hepsi biter.
      const skR = d.son_karar;
      const rakipKararMi = d.faz === "cevap" && onceki === `${turAnahtari(d)}-karar` && skR && !skR.son
        && skR.veren && skR.veren !== d.ben;
      const kapaliMs = rakipKararMi ? sure("kasa_kapali_karar") : 0;
      const olcekle = (sureMs) => Math.min(1, (payKalanMs - kapaliMs) / sureMs);
      const kararZaman = (f, ms) => { kararZamanRef.current.push(setTimeout(f, ms)); };
      kararZamanRef.current.forEach(clearTimeout);
      kararZamanRef.current = [];
      if (rakipKararMi) {
        const rid = Date.now();
        const verenR = d.oyuncular.find((o) => o.id === skR.veren);
        const azalt = hareketAzaltildiMi();
        setRakipKarar({ id: rid, asama: "kapali", ac: Boolean(skR.ac), sureDoldu: Boolean(skR.sure_doldu),
                        deger: Number(skR.deger ?? 0), carpan: skR.ac ? null : carpanYazisi(skR.carpan, dil),
                        eskiPuan: skR.ac ? Math.max(0, Number(verenR?.puan ?? 0) - Number(skR.deger ?? 0)) : null,
                        eskiKasa: Number(skR.deger ?? 0) });
        const sonra = (yama) => setRakipKarar((x) => (x?.id === rid ? (yama ? { ...x, ...yama } : null) : x));
        // AÇ: kapalı karttan sonra AÇ anı kendi "Rakip hazineyi açtı!" vuruşuyla gelir (hareket azaltmada an çizilmez → kart açılır)
        if (skR.ac && !azalt) kararZaman(() => sonra(null), kapaliMs);
        else {
          kararZaman(() => sonra({ asama: "acik" }), kapaliMs);
          kararZaman(() => sonra(null), kapaliMs + (skR.ac ? sure("kasa_an_taban") : sure("kasa_devam_vurus")));
        }
      } else setRakipKarar(null);
      if (acildi && !iyimserAc) {
        // AÇ anı: kapı açılır, ışık patlar, altın açanın skor çubuğuna uçar (980: 1,6 → 1,28 sn; kasa-efekt.css ks-ac-*)
        const k = d.son_karar;
        const benim = k.veren === d.ben;
        const veren = d.oyuncular.find((o) => o.id === k.veren);
        // 990: taban AN_TABAN_MS — geç veride en çok bu kadar kısalır, hiç atlanmaz
        const acMs = sure("kasa_ac_an");
        const payO = Math.max(sure("kasa_an_taban") / acMs, olcekle(acMs));
        const olcek = payO * sureOlcek("kasa_ac_an");   // sureler.js: adımlar + CSS seçili süreye göre ölçeklenir (varsayılanda 1)
        const m = (ms) => Math.round(ms * olcek);
        const basla = () => anBaslat({ tip: "ac", benim, deger: Number(k.deger ?? 0), seviye: kasaSeviye(k.deger, d.hedef, d.tavan), olcek,
                     kim: benim ? "ben" : "rakip", eskiPuan: Math.max(0, Number(veren?.puan ?? 0) - Number(k.deger ?? 0)) }, [
            [m(340), { sars: true }, () => { if (benim) sesRozet(); else sesTurGecis(); titret(benim ? [20, 40, 30] : 20); }],
            [m(690), { sars: false }],
            // kısalmış anda coin sesi düşer (sesler üst üste binmesin; açılış + soru sesi kalır)
            [m(980), { varis: true }, benim && payO >= 0.75 ? sesCoin : null],   // rakibin AÇ'ında coin sesi yok
            [m(AC_AN_MS), "bitir", () => soruSesi(d)],
          ]);
        if (kapaliMs) kararZaman(basla, kapaliMs); else basla();
      }
      // 955: DEVAM ×1,25 — karar fazından soruya geçişte (iki oyuncu da görür): mini sandık sarsılır, "×1,25" patlar,
      // kasa eski değerden yeniye SAYARAK yükselir. Sunucu son_karar.deger (eski) / yeni / carpan yazar.
      const sk = d.son_karar;
      if (d.faz === "cevap" && onceki === `${turAnahtari(d)}-karar` && sk && !sk.ac && !sk.son
          && sk.yeni != null && Number(sk.yeni) !== Number(sk.deger)) {
        // DEVAM anı soruyu örtmez (şeridin ortasındaki sandık): 990 taban AN_TABAN_MS, atlanmaz
        const devamMs = sure("kasa_devam_an");
        const payO = Math.max(sure("kasa_an_taban") / devamMs, olcekle(devamMs));
        const olcek = payO * sureOlcek("kasa_devam_an");
        const m = (ms) => Math.round(ms * olcek);
        const basla = () => anBaslat({ tip: "devam", eski: Number(sk.deger ?? 0), yeni: Number(sk.yeni), tavan: Boolean(sk.tavan), olcek,
                   metin: carpanYazisi(sk.carpan, dil) ?? "" }, [
          // kısalmış anda tek ses (coin): soru sesiyle birlikte üç ses 400 ms'ye sıkışıyordu (sekme dönüşü ölçümü)
          ...(payO >= 0.75 ? [[m(60), null, () => { sesRozet(); titret([16, 30, 16]); }]] : []),
          [m(560), { varis: true }, () => titret(12)],
          [m(DEVAM_AN_MS), "bitir", () => soruSesi(d)],   // 15 Eki: soru sesi an bitince (sayaç o an görünür)
        ]);
        if (kapaliMs) kararZaman(basla, kapaliMs); else basla();
      }
    }
    // 15 Eki 2026: yalnız ben hâlâ düşünürken (cevabım yoldayken / verdikten sonra çalmaz — Klasik ile aynı kural)
    if (d.faz === "cevap" && d.cevap?.rakip_cevapladi && !anRef.current.rakip && !d.cevap?.ben_cevapladim && secim == null) {
      anRef.current.rakip = true;
      if (birKez(`rakip-cevap:${turAnahtari(d)}`) && !gorunurDegil()) sesRakipCevapladi();
    }
  }, [d]);
  useEffect(() => {
    // Maç bitince faz satırda kalır (ör. AÇ ile biten maçta "karar"): sonuç ekranında tik çalmasın
    if (!d || d.durum !== "aktif" || !["cevap", "karar"].includes(d.faz) || d.cevap?.ben_cevapladim) return;
    if (d.faz === "cevap" && secim !== null && secim !== undefined) return;   // cevap yoldayken de son 3 sn sesi çalmaz
    // 13 Eki: iyimser AÇ başladı, yanıt bekleniyor — karar sayacı gizli, sayim_son tikleri çalmaz
    if (d.faz === "karar" && acBasildiRef.current === `${turAnahtari(d)}`) return;
    const n = Math.ceil(gosterSn);
    // 980: anahtar tur + altın + faz + rakam, maçta tek sefer (eskiden altın yoktu ve yalnız son rakam tutuluyordu: sayaç
    // geri sıçrayınca aynı rakam yeniden çalıyordu); gizli sekmede çalmaz
    if (n > 0 && n <= 3 && !gorunurDegil() && birKez(`tik:${turAnahtari(d)}-${d.faz}-${n}`)) sesTik(n);
  }, [gosterSn, d]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- 14 Eki 2026 · karar gerilimi (yalnız sunum): sandık seviyesi büyüdükçe kalp atışı hızlanır, karar
  // verende karar başında bir kez titreşim (seviyeyle güçlenir; navigator.vibrate yoksa / hareket azaltmada titret() atlar).
  // Karar verilince (istek yolda / iyimser AÇ anı), süre dolunca, kopuklukta ya da faz değişince susar. Kural/süre etkilenmez.
  const kararKademe = d?.durum === "aktif" && d?.faz === "karar" && !girisAktif && !calisan && an?.tip !== "ac"
    && !kararSureDoldu && kopukDonukSn == null && !(gosterSn > 0 && gosterSn <= 3)
    ? KALP_KADEME[kasaSeviye(d.karar?.deger ?? d.kasa, d.hedef, d.tavan)] ?? 0 : 0;
  useEffect(() => {
    if (!kararKademe) return undefined;
    const aralik = KALP_ARALIK_MS[kararKademe];
    const at = () => { if (!gorunurDegil()) sesKalpAtisi(kararKademe); };
    let z = null;
    const z0 = setTimeout(() => { at(); z = setInterval(at, aralik); }, KALP_ILK_MS);
    return () => { clearTimeout(z0); clearInterval(z); };
  }, [kararKademe]);
  useEffect(() => {
    if (!kararKademe || d?.karar?.veren !== d?.ben || gorunurDegil()) return;
    if (birKez(`karar-titresim:${turAnahtari(d)}`)) titret(KARAR_TITRESIM[kararKademe]);
  }, [kararKademe]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- 1094 · İlk Hazine rehberi: yalnız sunucunun rehber dediği maçta (oyuncunun ilk Hazine maçı; hesapta kalıcı,
  // misafir dahil). Düello 1093 ile aynı altyapı (lib/ilkMacRehberi.js + RehberBalonu). Üç an, her biri bir kez: ilk sonuç
  // (hazine nasıl büyür) · ilk kendi kararım (AÇ / DEVAM ne demek) · ilk AÇ'tan sonra (AÇ ne yaptı). "Geç" rehberi kapatır.
  // AÇ anı ekrandan çekildikten sonra (an / rakip kararı kartı bitince, 400 ms dengeli) — ilk karede yanıp sönmesin.
  const acRehberHam = Boolean(d?.rehber && d?.durum === "aktif" && d?.faz === "cevap" && d?.son_karar?.ac && !d.son_karar.son
    && !an && !rakipKarar && !girisAktif);
  const [acRehber, setAcRehber] = useState(false);
  useEffect(() => {
    if (!acRehberHam) { setAcRehber(false); return undefined; }
    const t = setTimeout(() => setAcRehber(true), 400);
    return () => clearTimeout(t);
  }, [acRehberHam]);
  const rehberAday = !d?.rehber || d?.durum !== "aktif" || girisAktif || girisBekle ? null
    : d.faz === "karar" && d.karar?.veren === d.ben && an?.tip !== "ac" && !calisan && !kararSureDoldu ? "karar"
    : acRehber && acRehberHam ? "ac"
    : d.faz === "sonuc" && d.sonuc && !d.altin && !d.sonuc.savunma ? "hazine" : null;
  const { rehber, gec: rehberGec } = useIlkMacRehberi("ks", id, rehberAday);

  // ---------------- eylemler ----------------
  const cevapVer = async (i) => {
    const tikMs = Date.now() + farkRef.current;   // 991: tıklama anı (sunucu saati) — geç varsa da süre içinde sayılır
    sesDokunus(); titret(10);
    setSecim(i);
    setHata(null);
    setCalisan("cevap");
    const tur0 = dGuncelRef.current?.tur;
    const gonder = () => tikBasligiEkle(supabase.rpc("kasa_cevap", { p_id: id, p_cevap: i }), tikMs);
    try {
      let { data, error } = await gonder();
      // 1055: sunucu yetişemediyse (500 zaman aşımı / ağ) aynı tur sürerken BİR kez sessizce yeniden dene.
      // Tıklama anı başlıkla gittiği için geç varış payı içinde cevap yine sayılır.
      if (error && sunucuYetisemedi(error)) {
        await new Promise((coz) => window.setTimeout(coz, 700));
        const g = dGuncelRef.current;
        if (g?.durum === "aktif" && g?.faz === "cevap" && g?.tur === tur0) {
          ({ data, error } = await gonder());
          // İlk istek aslında işlenmişse sunucu "zaten cevapladın" der: cevap kayıtlı, hata değil.
          if (error && /zaten cevapladın/i.test(error.message ?? "")) { data = null; error = null; }
        }
        if (error && sunucuYetisemedi(error)) error = Object.assign(new Error("cevap ulaşmadı"), { ulasmadi: true });
      }
      if (error) throw error;
      // 951 İkinci Şans: ilk yanlış sayılmadı — şık elenir, aynı sayaçla yeniden seçilir (yalnız ben görürüm)
      if (data?.ikinci_sans) {
        sesYanlis(); titret(18);
        setElenenYerel(Number(data.elenen ?? i));
        jokerBilgiGoster({ metin: c("İkinci Şans: bir kez daha dene!"), anahtar: Date.now() });
        jokerZaman(() => setSecim(null), 260);
        yukle().catch(() => {});
        return;
      }
      await yukle();
    } catch (e) {
      setHata(e?.ulasmadi ? c("Cevabın sunucuya ulaşmadı. Süre bitmediyse şıkkı yeniden seç.") : c(hataMesaji(e)));
      setSecim(null);
      if (e?.ulasmadi) yukle().catch(() => {});
      if (/Süre doldu|Şu an cevap verilemez/i.test(e?.message ?? "")) yukle().catch(() => {});
    } finally {
      setCalisan(null);
    }
  };
  // 12 Eki · M3: AÇ'a basıldığı an sahne İYİMSER başlar (sunucu yanıtı 1–2 sn sürebiliyordu; düğmede yalnız dönen işaret
  // görünüyordu). Maçı bitirecek AÇ'ta (puan + hazine ≥ hedef) final sahnesi, öteki AÇ'ta AÇ anı. Sunucu reddederse geri alınır.
  const acIyimserBaslat = () => {
    const dd = dGuncelRef.current;
    if (!dd || dd.durum !== "aktif" || dd.faz !== "karar" || gorunurDegil()) return null;
    const benO = (dd.oyuncular ?? []).find((o) => o.id === dd.ben);
    const puan = Number(benO?.puan ?? 0);
    const deger = Number(dd.kasa ?? 0);
    const hedef = Number(dd.hedef ?? 80);
    if (puan + deger >= hedef) {
      if (!birKez("final")) return null;
      finalOynat({ kazandim: true, deger, puanOnce: puan, puanSonra: puan + deger, hedef });
      return "final";
    }
    const olcek = sureOlcek("kasa_ac_an");
    const m = (ms) => Math.round(ms * olcek);
    iyimserAcRef.current = `${turAnahtari(dd)}`;
    iyimserAcBittiRef.current = false;
    anBaslat({ tip: "ac", benim: true, deger, seviye: kasaSeviye(deger, dd.hedef, dd.tavan), olcek, kim: "ben", eskiPuan: puan }, [
      [m(340), { sars: true }, () => { sesRozet(); titret([20, 40, 30]); }],
      [m(690), { sars: false }],
      [m(980), { varis: true }, sesCoin],
      [m(AC_AN_MS), "bitir", () => { iyimserAcBittiRef.current = true; const g = dGuncelRef.current; if (g?.faz === "cevap") soruSesi(g); }],
    ]);
    return "ac";
  };
  const acIyimserGeriAl = (tur) => {
    acBasildiRef.current = null;
    if (tur === "final") {
      finalZamanRef.current.forEach(clearTimeout); finalZamanRef.current = [];
      setFinalAn(null); calinanRef.current.delete("final");
    } else if (tur === "ac") {
      iyimserAcRef.current = null;
      anZamanRef.current.forEach(clearTimeout); anZamanRef.current = []; setAn(null);
    }
  };
  const kararVer = async (ac) => {
    const tikMs = Date.now() + farkRef.current;   // 991
    sesDokunus(); titret(ac ? 20 : 8);
    setHata(null);
    setCalisan(ac ? "karar-ac" : "karar-devam");
    const iyimser = ac ? acIyimserBaslat() : null;
    acBasildiRef.current = iyimser && dGuncelRef.current ? `${turAnahtari(dGuncelRef.current)}` : null;
    try {
      if (!ac) devamBekleRef.current = Number(dGuncelRef.current?.tur);
      const { error } = await tikBasligiEkle(supabase.rpc("kasa_karar", { p_id: id, p_ac: ac }), tikMs);
      if (error) { devamBekleRef.current = null; throw error; }
      await yukle();
    } catch (e) {
      acIyimserGeriAl(iyimser);
      // Süre tam o an dolduysa sunucu fazı geçirmiştir: ham hata yerine ekran tazelenir.
      if (/karar verilemez/i.test(e?.message ?? "")) yukle().catch(() => {});
      else setHata(c(hataMesaji(e)));
    } finally {
      setCalisan(null);
    }
  };
  const terk = async () => {
    setCalisan("terk");
    try {
      const bas = dGuncelRef.current;
      const { error } = await zamanAsimindaYenidenDene(() => supabase.rpc("kasa_terk", { p_id: id }), {
        vazgec: () => Boolean(bas && dGuncelRef.current?.durum !== bas.durum),
      });
      if (error) throw error;
      await yukle();
    } catch (e) {
      setHata(c(hataMesaji(e)));
    } finally {
      setCalisan(null);
    }
  };

  // ---------------- çizim ----------------
  if (!d) {
    return (
      <div className="m2-mac ks-mac qt-sahne-mac qt-sahne-gok">
        {yuklemeHatasi || yuklemeGecikti ? (
          <MacYukleniyor hata={yuklemeHatasi || true}
                         onTekrarDene={() => { setYuklemeHatasi(null); setYuklemeGecikti(false); window.clearTimeout(yenidenDeneRef.current); yenidenDeneRef.current = null; yukle(); }}
                         donusYolu={y("/kasa")} donusMetni={c("Ortak Hazine'ye dön")} />
        ) : (
          <div className="m2-yukleniyor ks-yukleniyor" role="status" aria-busy="true">
            <span className="m2-yukleniyor-ikon" aria-hidden="true"><QtIkon ad="coin" boyut={36} /></span>
            <span className="ks-yukleniyor-metin">{c("Maç yükleniyor…")}</span>
          </div>
        )}
      </div>
    );
  }

  const ben = d.oyuncular.find((o) => o.id === d.ben) ?? d.oyuncular[0];
  const rakip = d.oyuncular.find((o) => o.id !== d.ben) ?? d.oyuncular[1];
  const secenekler = secenekleriCoz(d.soru?.secenekler);

  // ---------------- maç sonu ----------------
  // 12 Eki · M3: maçı bitiren AÇ'ın final sahnesi sunucu yanıtı gelmeden (iyimser) başladı — aynı kök, sahne kesintisiz sürer
  if (finalAn && d.durum === "aktif") {
    return (
      <div className="ks-bitti ks-bitti--final" onClick={anlariBitir}>
        <KasaFinalSahnesi key="kasa-final" kazandim={finalAn.kazandim} deger={finalAn.deger} hedef={finalAn.hedef}
                          puanOnce={finalAn.puanOnce} puanSonra={finalAn.puanSonra} c={c} />
      </div>
    );
  }
  if (d.durum !== "aktif") {
    const kazandim = d.kazanan === d.ben;
    const durum = d.durum === "iptal" || !d.kazanan ? "berabere" : kazandim ? "kazandi" : "kaybetti";
    const skor = { a: Number(ben.puan ?? 0), b: Number(rakip.puan ?? 0) };
    const altYazi = d.durum !== "bitti" ? null
      : d.sonuc_neden === "hedef" ? (kazandim ? c("Hazineyi açtın, {h} puana ulaştın!", { h: d.hedef }) : c("Rakip {h} puana ulaştı", { h: d.hedef }))
      : d.sonuc_neden === "tur_siniri" ? (kazandim ? c("{a}-{b} önde, kazandın", skor) : c("{a}-{b} geride, kaybettin", skor))
      : d.sonuc_neden === "altin" ? (kazandim ? c("Eşit — Altın Soru'yu sen bildin") : c("Eşit — Altın Soru'yu rakip bildi"))
      : null;
    // 951: son AÇ'ın yavaş sahnesi (kazanan: kapı açılır, altın patlar, skor hedefe sayar · kaybeden: kasa kapanır/kararır).
    // Geçişin ilk karesinde (effect durumu yazmadan önce) de sahne çizilir — kutlama bir kare bile görünmesin.
    const fin0 = finalAn ?? (oncekiDurumRef.current === "aktif" && d.durum === "bitti" ? kasaFinalVerisi(d) : null);
    if (fin0) sonFinRef.current = fin0;
    // 10 Eki 2026: özet gelene dek (1–2 sn) boş sayfa çizilmez — final sahnesi oynadıysa o, oynamadıysa maç sahnesi
    // ekranda kalır (aşağıdaki maç ekranı). Özet hiç gelmezse (hata) sonuç ekranı özetsiz kurulur.
    const ozetBekleniyor = d.durum === "bitti" && !macSonuOzet && !macSonuHata;
    const fin = fin0 ?? (ozetBekleniyor ? sonFinRef.current : null);
    if (fin) {
      return (
        <div className="ks-bitti ks-bitti--final" onClick={anlariBitir}>
          <KasaFinalSahnesi key="kasa-final" kazandim={fin.kazandim} deger={fin.deger} hedef={fin.hedef}
                            puanOnce={fin.puanOnce} puanSonra={fin.puanSonra} c={c} />
        </div>
      );
    }
    if (!ozetBekleniyor) {
    const e = d.ezeli;
    const ezeliMetin = e && Number(e.ben) + Number(e.rakip) > 0
      ? (Number(e.ben) > Number(e.rakip) ? c("Bu oyuncuyla {ben}-{rakip} öndesin", e)
        : Number(e.ben) < Number(e.rakip) ? c("Bu oyuncuyla {ben}-{rakip} geridesin", e)
          : c("Bu oyuncuyla {ben}-{rakip} berabersiniz", e))
      : null;
    const rov = d.rovans ?? {};
    const rovSn = Number(rov.sure_sn) > 0 ? Number(rov.sure_sn) : 60;
    const rovansAlani = rov.id ? (
      <QtDugme className="mss-tam" tamGenislik ikon="coin" onClick={() => navigate(y(`/kasa/${rov.id}`))}>{c("Rövanşa git")}</QtDugme>
    ) : rov.isteyen && rov.gecerli && rov.isteyen === d.ben && !rovVazgec ? (
      <>
        <QtDugme className="mss-tam" tamGenislik yukleniyor>{c("Rövanş bekleniyor…")}</QtDugme>
        <KasaRovansBekleme rakip={rakip} baslangic={rovBas ?? Date.now()} sureSn={rovSn} simdi={simdi} c={c} onVazgec={rovansVazgec} />
      </>
    ) : rov.isteyen && rov.gecerli && rov.isteyen !== d.ben ? (
      <>
        <p className="m2-rovans-soru mss-tam qt-h-pop-gir" role="status">{c("{ad} rövanş istiyor!", { ad: rakip.gorunen_ad })}</p>
        <QtDugme ikon="onay" devreDisi={!!calisan} yukleniyor={calisan === "rovans"}
                 onClick={() => rovansEylem("rovans", "kasa_rovans_yanitla", { p_kabul: true })}>
          {c("Kabul et")}
        </QtDugme>
        <QtDugme tur="ikincil" devreDisi={!!calisan}
                 onClick={() => rovansEylem("rovans", "kasa_rovans_yanitla", { p_kabul: false })}>
          {c("Reddet")}
        </QtDugme>
      </>
    ) : d.durum === "bitti" ? (
      <>
        {rovSonuc && (
          <p className="m2-rovans-sonuc mss-tam" role="status">
            {rovSonuc === "red"
              ? c("{ad} rövanşı kabul etmedi.", { ad: rakip.gorunen_ad })
              : c("{ad} yanıt vermedi.", { ad: rakip.gorunen_ad })}
          </p>
        )}
        <QtDugme className="mss-tam" tamGenislik ikon="yenile" yukleniyor={!!calisan} onClick={rovansIste}>
          {rovSonuc ? c("Tekrar rövanş iste") : c("Rövanş")}
        </QtDugme>
      </>
    ) : null;
    const sahne = ozettenSahne(d.durum === "bitti" ? macSonuOzet : null);
    return (
      <div className="ks-bitti">
        {durum === "kazandi" && <KasaAltinYagmuru />}
        <MacSonuKutlama
          durum={durum}
          mod="kasa"
          sezonMacRef={id}
          terk={sahne.terk}
          baslik={d.durum === "iptal" ? c("Maç iptal edildi") : undefined}
          altYazi={sahne.terk ? undefined : altYazi ?? undefined}
          ben={{ profil: ben, skor: skor.a }}
          rakip={{ profil: rakip, skor: skor.b }}
          skorEtiket={c("puan")}
          oduller={sahne.oduller}
          level={sahne.level}
          lig={sahne.lig}
          gorevler={sahne.gorevler}
          rozetler={sahne.rozetler}
          modOzet={d.durum === "bitti" && ((Array.isArray(d.gecmis) && d.gecmis.length) || d.ort_cevap) ? (
            <>
              {Array.isArray(d.gecmis) && d.gecmis.length > 0 && <KasaAcilanlar gecmis={d.gecmis} c={c} />}
              <OrtCevapSatiri veri={d.ort_cevap} />
            </>
          ) : null}
          detay={d.durum === "bitti" ? (
            <>
              <OdulDokumu kaynak={`kasa:${d.id}`} veri={macSonuOzet?.dokum} gorevleriGoster={false} />
              <KasaGecmis gecmis={d.gecmis} c={c} />
              {/* 957: arkadaşla Kasa geçmişi (Düello 'ezeli' ile aynı metin ve görünüm) */}
              {ezeliMetin && <div className="bd-duello-ezeli">{ezeliMetin}</div>}
            </>
          ) : null}
          // Sistem paylaşımı + 1080×1920 maç sonucu kartı — sahnede görünür (Klasik / Düello ile aynı)
          paylas={d.durum === "bitti" && !sahne.terk ? (
            <PaylasDugmesi tur="sonuc" tur2="birincil" tamGenislik sonuc={{
              ad: ben.gorunen_ad, avatar: ben.gorunen_avatar ?? null, benSkor: skor.a, rakipSkor: skor.b, durum, rakipAd: rakip.gorunen_ad,
            }} />
          ) : null}
          eylemNotu={hata ? <span className="m2-hata" role="alert"><QtIkon ad="uyari" boyut={18} /> {hata}</span> : null}
          eylemler={{ onYeniMac: () => navigate(y("/kasa")), onAnaSayfa: () => navigate(y()), yeniMacEtiketi: c("Yeni maç") }}
          rovans={rovansAlani}   // 957: Düello ile aynı rövanş akışı (Ida, 5 Eki 2026 — "Kasa'yı ayrı tutma")
        />
      </div>
    );
    }
  }

  // ---------------- maç ekranı ----------------
  const kilitli = Boolean(d.cevap?.ben_cevapladim);
  // Karar halkası gerçek süreyle dolar: karar_sn + gösterim payı (sayaç pay boyunca da sayar — 11 Eki 2026)
  const toplamSn = d.faz === "karar" ? Number(d.sureler?.karar ?? 8) + Number(d.sureler?.gosterim_payi_ms ?? 0) / 1000 : Number(d.sureler?.soru ?? 15);
  const sayacVar = d.faz === "cevap" || d.faz === "karar";
  const sayac = sayacVar
    ? <QtSayac kalan={d.faz === "cevap" ? cevapSayacSn : gosterSn} toplam={toplamSn} esik={d.faz === "karar" ? 3 : 5} boyut="k" durdu={kilitli || kopukDonukSn != null}
               className={sinif("ks-sayac", d.joker?.kisaltildi && d.faz === "cevap" && "ks-sayac--kisaldi")}
               ekBalon={d.faz === "cevap" ? ekBalon : null} />
    : <span className="ks-sayac ks-sayac--yok" aria-hidden="true">·</span>;
  const gerilim = d.faz === "cevap" && !kilitli && gosterSn > 0 && gosterSn <= 5;
  const sonUcSn = d.faz === "cevap" && !kilitli && kopukDonukSn == null && gosterSn > 0 && gosterSn <= 3;
  // tanı (yalnız ?tani=1): sayacın her fazda ilk göründüğü an ve değeri — çizimde, yan etkisiz liste yazımı
  if (sayacVar && akisSayacRef.current !== `${turAnahtari(d)}-${d.faz}` && gosterSn > 0
      && !((d.faz === "cevap" && Boolean(an?.tip === "ac" || an?.tip === "devam" || rakipKarar)) || (d.faz === "karar" && an?.tip === "ac"))) {
    akisSayacRef.current = `${turAnahtari(d)}-${d.faz}`;
    akis("sayac:basladi", { faz: d.faz, tur: d.tur, sn: Math.ceil(d.faz === "cevap" ? cevapSayacSn : gosterSn) });
  }
  const kararGerilim = d.faz === "karar" && d.karar?.veren === d.ben && kopukDonukSn == null && gosterSn > 0 && gosterSn <= 3;
  const kopukBant = d.kopuk
    ? { benMi: Boolean(d.kopuk.ben_mi), kalan: d.kopuk.bitis ? Math.max(0, Math.ceil((new Date(d.kopuk.bitis).getTime() - (simdi + farkRef.current)) / 1000)) : null }
    : null;
  // 10 Eki 2026: bant YALNIZ gerçek bağlantı sorununda — okuma hata veriyor ve son başarılı yanıttan beri ≥ 10 sn geçti.
  // Eskiden faz bitişinden 4 sn sonra yeni faz gelmemesi de bant açıyordu; oysa sunucu cevapsız oyuncu için 5 sn geç varış
  // payı bekler (991) → neredeyse her tur geçişinde yanlış bant. Tur geçişi / yeni soru beklemesi bağlantı sorunu değildir.
  const yenidenBant = !kopukBant && yenidenBaglaniyor && simdi - sonBasariRef.current >= BANT_SESSIZLIK_MS;
  const kararMetni = d.faz === "cevap" ? kasaKararMetni(d, c) : null;
  const sav = kasaSavunma(d);   // 987: süren Savunma Sorusu (ben savunuyorum / izliyorum)
  // efekt sürerken gösterilen değerler (yalnız sunum)
  const anSonuc = an?.tip === "sonuc" ? an : null;
  const anAc = an?.tip === "ac" ? an : null;
  const anDevam = an?.tip === "devam" ? an : null;
  // 955: DEVAM anı effect'te başlar — geçişin ilk karesinde de eski değer görünsün (yoksa sayı önce yeniye atlar)
  const skD = d.son_karar;
  const devamBekliyor = !anDevam && d.faz === "cevap" && skD && !skD.ac && !skD.son && skD.yeni != null
    && Number(skD.yeni) !== Number(skD.deger) && (anRef.current.faz === `${turAnahtari(d)}-karar` || Boolean(rakipKarar))
    && !hareketAzaltildiMi();
  // 990: AÇ/DEVAM anı ve rakibin karar açıklaması sürerken yeni sorunun sayacı başlamış GÖRÜNMEZ (yer tutucu); an bitince
  // sunucunun gerçek kalanı görünür. AÇ anı ve karar kartı soruyu örter → şıklar o sürede seçilemez (dokunuş yalnız geçer).
  // Geçişin ilk karesi (effect henüz rakipKarar'ı yazmadı): değerler yine eski görünsün, kart bir kare bile atlanmasın
  const rkIlkKare = !rakipKarar && d.faz === "cevap" && skD && !skD.son && skD.veren && skD.veren !== d.ben
    && anRef.current.faz === `${turAnahtari(d)}-karar` && !gorunurDegil();
  const rkVeren = rkIlkKare ? d.oyuncular.find((o) => o.id === skD.veren) : null;
  const rk = rakipKarar ?? (rkIlkKare ? { ac: Boolean(skD.ac), eskiKasa: Number(skD.deger ?? 0),
    eskiPuan: skD.ac ? Math.max(0, Number(rkVeren?.puan ?? 0) - Number(skD.deger ?? 0)) : null } : null);
  // 12 Eki · M3: iyimser AÇ anı karar fazında başlar — orada da karar sayacı an sürerken görünmez
  const anOrtu = (d.faz === "cevap" && Boolean(anAc || anDevam || rk || devamBekliyor)) || (d.faz === "karar" && Boolean(anAc));
  const soruOrtulu = d.faz === "cevap" && Boolean(anAc || rk);
  const turBantGoster = turBant && simdi - turBant < sure("kasa_tur_bant") && !anAc && turBantFazRef.current === d.faz;
  const miniHareket = (anSonuc?.varis && !anSonuc.bitti
    ? (anSonuc.buyuk ? ["vardi", "patla"] : ["vardi"]).concat(anSonuc.anahtarVaris ? ["yeni-sahip"] : [])
    : [])
    // 951: her tur başında kısa sarsıntı · cevap süresinin son 3 sn'sinde titreme
    .concat(anDevam ? (anDevam.varis ? ["vardi"] : ["devam-sars"]) : [])
    .concat(turBant && simdi - turBant < Math.round(650 * sureOlcek("kasa_tur_bant")) && turBantFazRef.current === d.faz ? ["tur-sars"] : [])
    .concat(sonUcSn ? ["gergin"] : []);
  const miniKadran = (
    <KasaKadran d={d} c={c} kucuk
                goster={anSonuc && !anSonuc.varis ? anSonuc.kasaOnce : anDevam && !anDevam.varis ? anDevam.eski
                  : devamBekliyor ? Number(skD.deger) : rk ? rk.eskiKasa : undefined}
                sayiSure={anDevam ? Math.round(900 * (anDevam.olcek ?? 1)) : 520}
                carpan={anDevam ? { anahtar: anDevam.id, metin: anDevam.metin, olcek: anDevam.olcek } : null}
                /* 13 Eki 2026: sahip etiketi sonuç bandıyla aynı kaynaktan (d.sahip) okunur — eskiden anahtar uçuşu
                   bitene kadar (~1,9 sn) eski sahip (çoğu kez SAHİPSİZ) yazıyor, bant "hazine rakipte" derken çelişiyordu */
                hareket={miniHareket}
                artis={anSonuc?.varis && !anSonuc.bitti ? { anahtar: anSonuc.id, n: anSonuc.artis, buyuk: anSonuc.buyuk } : null} />
  );

  // 1094 · ilk Hazine rehberi metinleri (kurallar sunucudan: kasa_cozumle her soruda artis / ikisi_artis ekler, tek bilen
  // sahip olur; AÇ hazineyi puana yazar ve sıfırlar; devam_birakir maça sabit)
  const REHBER_METNI = {
    hazine: "Hazine her soruda büyür. Tek başına bilen alır.",
    karar: d.devam_birakir ? "AÇ: puanına yaz. DEVAM: hazine büyür, sahipsiz kalır." : "AÇ: puanına yaz. DEVAM: hazine büyür.",
    ac: "AÇ hazineyi puana ekler, hazine sıfırlanır.",
  };
  const rehberBalonu = (anahtar) => rehber === anahtar && (
    <RehberBalonu onek="ks" metin={c(REHBER_METNI[anahtar])} onGec={rehberGec} className={`ks-rehber--${anahtar}`} c={c} />
  );

  let sahne = null;
  let jokerYuva = null;
  if (girisAktif) {
    // 955: giriş sahnesi tek katman — altta soru/şık/joker çizilmez (sahne tam ekran, 3-2-1 sandığın üstünde)
    sahne = null;
  } else if (d.faz === "baslangic") {
    // Yedek (sahne zamanı bilinmiyorsa / kopuklukta): yalnız sandık + 3-2-1 (bitişe göre)
    const kalanBas = gd.bitis != null ? Math.max(0, (gd.bitis - sunucuSimdiMs) / 1000) : 0;
    sahne = (
      <>
        <KasaKadran d={d} c={c} />
        {kalanBas > 0 && kalanBas <= 3 && <GeriSayim kalan={kalanBas} />}
        {/* 1092: sunucu başlangıcı iki oyuncu da maç ekranına gelince kurar (faz_bitis o ana kadar boş; en çok kasa_baglanma_sn) */}
        {!d.faz_bitis && <p className="m2-bant m2-bant--katman" role="status">{c("Rakip bağlanıyor…")}</p>}
      </>
    );
  } else if (d.faz === "karar") {
    sahne = <KasaKarar d={d} c={c} calisan={calisan} onKarar={kararVer} kalan={kopukDonukSn != null ? null : gosterSn}
                       sureDoldu={kararSureDoldu} rehber={rehberBalonu("karar")}
                       carpanYazi={carpanYazisi(d.devam_carpan, dil)} />;
  } else if (d.faz === "cevap" || d.faz === "sonuc") {
    const sonucMu = d.faz === "sonuc";
    const dogru = sonucMu && d.sonuc?.dogru_cevap != null ? Number(d.sonuc.dogru_cevap) : null;
    const benimCevap = sonucMu
      ? (d.sonuc?.benim_cevabim == null ? null : Number(d.sonuc.benim_cevabim))
      : kilitli && d.cevap?.benim_cevabim != null ? Number(d.cevap.benim_cevabim) : secim;
    // 1062: rakibin şıkkı — sunucu yalnız tur çözümlenince (faz 'sonuc') verir; cevapsızsa null → işaret yok
    const rakipCevap = sonucMu && Number.isInteger(d.sonuc?.rakip_cevabi) ? d.sonuc.rakip_cevabi : null;
    const tiklanabilir = !sonucMu && !kilitli && kalanSn > 0 && secim === null && calisan !== "cevap" && !girisAktif && !soruOrtulu && !sav?.izliyorum;
    // 951: 50:50 kapalıları ve İkinci Şans'ın elenen ilk cevabı yalnız bende (sunucu yalnız bana döndürür)
    const kapali = Array.isArray(d.joker?.kapali) ? d.joker.kapali.map(Number) : [];
    const elenen = d.joker?.elenen != null ? Number(d.joker.elenen) : elenenYerel;
    const durum = (i) => {
      if (sonucMu) return i === dogru ? (benimCevap === dogru ? "dogru" : "dogrusu") : i === benimCevap ? "yanlis" : "solgun";
      if (i === benimCevap) return "secili";
      if (kirilan.includes(i)) return "normal";
      if (kapali.includes(i) || i === elenen) return "elendi";
      return tiklanabilir ? "normal" : "kilitli";
    };
    const jokerPasif = sonucMu || kilitli || kalanSn <= 0 || secim !== null || girisAktif || Boolean(sav?.izliyorum);
    if (d.jokerli && !d.altin && !girisAktif) {
      // Klasik ile aynı çubuk; sahne anahtarının DIŞINDA (faz değişince yeniden yüklenmez), sonuçta pasif kalır
      jokerYuva = (
        <div className={sinif("m1-joker-yuva ks-joker-yuva", jokerPasif && "m1-joker-yuva--pasif")}
             inert={jokerPasif || undefined} aria-hidden={jokerPasif || undefined}>
          <JokerCubugu macTur="kasa" macId={id} soruIndex={sav ? `s${d.tur}` : d.tur} kilit={kilitli || sonucMu}
                       surum={(d.rakip_joker ?? []).length} kalanSn={kalanSn}
                       onEtki={jokerEtkisi} onBilgi={jokerBilgiGoster} />
        </div>
      );
    }
    sahne = (
      <>
        {sonucMu ? <KasaSonucBandi d={d} c={c} />
          : sav?.izliyorum ? (
            // 8 Eki 2026 (Ida): rakip için seyir anı — büyük kalkan, belirgin sayaç, şıklar pasif (yalnız sunum)
            <div className="ks-izle-bant qt-h-gir" role="status">
              <span className="ks-izle-kalkan" aria-hidden="true"><QtIkon ad="kalkan" boyut={30} /></span>
              <span className="ks-izle-metin">
                <b>{c("Rakip hazinesini savunuyor")}</b>
                <small>{c("Sen izliyorsun · bilemezse karar senin")}</small>
              </span>
              <span className={sinif("ks-izle-sayac qt-sayi", gosterSn > 0 && gosterSn <= 5 && "ks-izle-sayac--az")}
                    aria-label={c("{0} saniye kaldı", { 0: Math.ceil(gosterSn) })}>
                {Math.ceil(gosterSn)}<small>{c("sn")}</small>
              </span>
            </div>
          )
          : sav ? (
            // 987: Savunma Sorusu — yalnız hak sahibi cevaplar, rakip izler
            <p className={sinif("ks-savunma-satir qt-h-gir", sav.izliyorum && "ks-savunma-satir--izle")} role="status">
              <SavunmaRozeti c={c} aktif boyut={15} />
              <b>{c(SAVUNMA_SORUSU)}</b>
              <span>{sav.benSavunuyorum ? c("Bilirsen hazine sahipsiz kalır") : c("Rakip savunuyor · bilemezse karar senin")}</span>
            </p>
          )
          : kararMetni ? (
            <p className={sinif("ks-karar-satir qt-h-gir", (devamAn?.kazandi || rk || (anAc && !anAc.benim)) && "ks-karar-satir--gizli")} role="status">
              {kararMetni}
              {/* 953: DEVAM ödülü çıkmadı — satırın sonunda küçük, sessiz not (yalnız bende) */}
              {devamAn && !devamAn.kazandi && <span key={devamAn.anahtar} className="ks-devam-an ks-devam-an--yok"> · {c("Bu sefer yok")}</span>}
            </p>
          )
          : <KasaAcKilit d={d} c={c} />}
        {sonucMu && <Konfeti aktif={Boolean(d.sonuc?.ben_dogru)} adet={d.sonuc?.rakip_dogru ? 12 : 18} />}
        {/* 1040: Cevap İmzası — sonuçta BENİM cevabım doğruysa (Savunma Sorusu dahil; izlerken oynamaz) */}
        <CevapImzasi imza={imza} kapRef={kokRef} sira={dogru}
                     anahtar={sonucMu && dogru != null && benimCevap === dogru ? `${turAnahtari(d)}-sonuc` : null} />
        {sonucMu && cifteAn && <KasaCifteBandi key={cifteAn} artis={kasaSonucArtisi(d.sonuc, d.ikisi_artis ?? 6)} c={c}
                                                           onBitti={() => setCifteAn((x) => (x === cifteAn ? null : x))} />}
        {/* 990: rakibin kararı — kapalı kart → AÇTI / DEVAM ETTİ (dokunarak geçilir) */}
        {rakipKarar && d.faz === "cevap" && (
          <KasaRakipKarar key={rakipKarar.id} asama={rakipKarar.asama} ac={rakipKarar.ac} sureDoldu={rakipKarar.sureDoldu}
                          deger={rakipKarar.deger} carpan={rakipKarar.carpan} c={c} />
        )}
        <QtSoruKarti key={d.soru?.soru ?? "soru"}
                     className={sinif("m2-soru ks-soru", soruUzunlukSinifi({ soru: d.soru?.soru, secenekler }), sonucMu && "m2-soru--sonuc")}
                     kategori={d.soru?.kategori ? <><KategoriIkon anahtar={d.soru.kategori} boyut={16} /> {c(kategoriAdi(d.soru.kategori))}</> : null}
                     sira={d.altin ? c("Altın Soru") : sav ? c(SAVUNMA_SORUSU) : c("Aynı soru · aynı anda")}
                     metin={d.soru?.soru} sevinc={sonucMu && Boolean(d.sonuc?.ben_dogru)} />
        {/* Basılı tut (3 sn) → doğru şık: yalnız sunucu dogru_cevap verdiyse; normal cevapVer yolundan */}
        <BasiliTut dogruCevap={d.soru?.dogru_cevap} etkin={tiklanabilir} anahtar={`${turAnahtari(d)}-${d.soru?.soru ?? ""}`} onTetik={cevapVer}>
          {(bt) => (
            <QtSikler etiket={c("Şıklar")}>
              {secenekler.map((s, i) => (
                <QtSik key={`${d.soru?.soru ?? ""}-${i}`} harf={HARFLER[i]} metin={s} durum={durum(i)}
                       kiriliyor={kirilan.includes(i)}
                       ek={rakipCevap === i ? (
                         <span className="qt-sik-ek" role="img" aria-label={c("Rakibin cevabı")}>
                           {benimCevap === i && <CerceveliAvatar profile={ben} userId={ben?.id} boyut={24} />}
                           <CerceveliAvatar profile={rakip} userId={rakip?.id} boyut={24} />
                         </span>
                       ) : null}
                       onClick={tiklanabilir && !kapali.includes(i) && i !== elenen ? () => cevapVer(i) : undefined}
                       {...bt.sikProps(i)} />
              ))}
            </QtSikler>
          )}
        </BasiliTut>
        <p className="qt-gizli" aria-live="polite">
          {sav?.izliyorum ? c("Rakip savunuyor · bilemezse karar senin")
            : <>{kilitli ? c("Cevabın kilitlendi") : c("düşünüyor…")} · {c("Rakip")}: {d.cevap?.rakip_cevapladi ? c("cevapladı") : c("düşünüyor…")}</>}
        </p>
      </>
    );
  }

  return (
    <div ref={kokRef}
         data-kat={d.soru?.kategori || undefined}
         // 980: tekrarlayan anlar dokunarak geçilir (dokunuş alttaki düğmeye de gider: şık seçimi engellenmez)
         onPointerDown={an || cifteAn || rakipKarar || savunmaAn ? anlariBitir : undefined}
         style={anSonuc?.olcek ? { "--ks-sonuc-olcek": anSonuc.olcek } : undefined}
         className={sinif("m2-mac ks-mac qt-sahne-mac qt-sahne-gok", `ks-mac--${d.faz}`, (gerilim || kararGerilim) && "qt-h-gerilim", d.altin && "ks-mac--altin",
                          anAc?.sars && "ks-mac--sars", girisAktif && "ks-mac--giris", sav?.izliyorum && "ks-mac--izle")}>
      <MacUstSerit onCik={() => setTerkOnay(true)} cikisEtiketi={c("Maçtan çık")}
                   rozet={c("Ortak Hazine")} />
      <KasaUst d={d} ben={ben} rakip={rakip} c={c} seviyeler={seviyeler} tepkiBalonlar={tepki.balonlar}
               sayac={anOrtu ? <span className="ks-sayac ks-sayac--yok ks-sayac--bekle" aria-hidden="true">·</span> : sayac}
               anahtar={anSonuc?.anahtarVaris && !anSonuc.bitti ? anSonuc.anahtarA : null}
               rakipJoker={["cevap", "sonuc"].includes(d.faz) && Array.isArray(d.rakip_joker) ? d.rakip_joker : []}
               onay={d.faz === "cevap" ? { [ben.id]: kilitli, [rakip.id]: Boolean(d.cevap?.rakip_cevapladi) } : {}} />
      <div className={sinif("ks-serit", (rehber === "hazine" || rehber === "ac") && "ks-serit--rehber")}>
        {/* 990: hazine şeridin ortasında ortak nesne (soru/sonuç); karar/başlangıçta büyük sandık sahnede — ortada hedef */}
        <KasaSkor d={d} ben={ben} rakip={rakip} c={c}
                  puanGoster={anAc && !anAc.varis ? { [anAc.kim]: anAc.eskiPuan } : rk?.ac ? { rakip: rk.eskiPuan } : {}}
                  parla={skorParla}
                  // 14 Eki (Paket A): giriş sahnesi (opak) sürerken ortada HEDEF kalır — mini sandık 3-2-1 ortasında değil, sahne kalkınca çizilir
                  orta={!girisAktif && (d.faz === "cevap" || d.faz === "sonuc") ? miniKadran : (
                    <span className="ks-skor-hedef">{c("HEDEF")}<b className="qt-sayi">{Number(d.hedef ?? 80)}</b></span>
                  )} />
        {/* 957: maç içi tepki (kapalı modda hiçbir şey çizmez) */}
        <TepkiCubugu tepki={tepki} className="ks-tepki" />
        {rehberBalonu("hazine")}
        {rehberBalonu("ac")}
      </div>
      {kopukBant && (
        <p className="m2-bant m2-bant--uyari m2-bant--katman" role="status">
          <QtIkon ad="uyari" boyut={18} />
          <span>
            {kopukBant.benMi ? c("Bağlantın koptu — maç bekliyor.") : c("Rakibin bağlantısı koptu, bekleniyor")}
            {kopukBant.kalan == null ? "" : ` ${kopukBant.kalan} ${c("sn")}`}
          </span>
        </p>
      )}
      {yenidenBant && (
        <p className="m2-bant m2-bant--uyari m2-bant--katman" role="status">
          <QtIkon ad="yenile" boyut={18} />
          <span>{c("Bağlantı yeniden kuruluyor…")}</span>
        </p>
      )}
      {/* 12 Eki · M2: tur bandı soru kartının üstünde değil, maç kabının başlık alanında kayar — soruyu örtmez */}
      {turBantGoster && (
        <span key={turBant} className="m2-gecis m2-gecis--ust" aria-hidden="true">
          <span>{d.altin ? c("ALTIN SORU") : sav ? c(SAVUNMA_SORUSU) : c("Tur {n}/{t}", { n: Math.max(1, d.tur), t: d.max_tur })}</span>
        </span>
      )}
      {/* 12 Eki · M3/M5: AÇ anı ya da Savunma Hakkı anı sürerken sahne anahtarı sabit — an faz geçişinde baştan oynamaz/kesilmez */}
      <div className="ks-sahne" key={anAc ? `ac-${anAc.id}` : savunmaAn?.tip === "tetik" && d.faz === "cevap" ? `sonuc-${turAnahtari(d)}` : `${d.faz}-${turAnahtari(d)}`}>
        {anAc && (d.faz === "karar" || d.faz === "cevap") && <KasaAcAni key={anAc.id} deger={anAc.deger} benim={anAc.benim} seviye={anAc.seviye} olcek={anAc.olcek} c={c} />}
        {savunmaAn && (d.faz === "sonuc" || (savunmaAn.tip === "tetik" && d.faz === "cevap")) && (
          <KasaSavunmaAni key={savunmaAn.anahtar} tip={savunmaAn.tip} benim={savunmaAn.benim} c={c} />
        )}
        {/* 14 Eki (Paket A): giriş sahnesi (opak, kökü örter) sürerken alttaki soru ÇİZİLMEZ — ilk soru verisi 3-2-1
            sırasında gelince soru ağacının çizimi (CPU 6x'te ~100 ms) sayımın ortasında kare düşürüyordu. Sahne kalkınca bir
            kez çizilir; sayaç sunucu saatinden okunduğu için süre kaybı yok. */}
        {girisAktif ? null : sahne}
        {/* Üç an KasaParcalari'nda (aynı işaretleme; /sure-ayar önizlemesi de bunları çizer) */}
        {jokerBilgiMetni && ["cevap", "sonuc"].includes(d.faz) && <KasaJokerBilgi key={jokerBilgiMetni.anahtar} bilgi={jokerBilgiMetni} />}
        {/* 953: DEVAM ödülü kazanıldı — altın parıltılı kart (yalnız bende; kazanamayınca karar satırında küçük not) */}
        {devamAn?.kazandi && d.faz === "cevap" && <KasaDevamOdul key={devamAn.anahtar} an={devamAn} c={c} />}
        {/* 951: rakip joker kullandı — ikon + kısa efekt (etkisi gizli; yalnız adı). Sahnenin üstünde, sayacı kapatmaz. */}
        {rakipJokerAn && d.faz === "cevap" && <KasaRakipJokerAn key={rakipJokerAn.anahtar} an={rakipJokerAn} c={c} />}
      </div>
      {jokerYuva}
      {/* 15 Eki: bekleme → sahne AYNI öğe (anahtarsız, aynı yerde) — ışık/sandık katmanları sahne başında yeniden kurulmaz */}
      {(girisBekle || girisAktif) && (
        <KasaGirisSahnesi bekle={girisBekle} hedef={Number(d.hedef ?? 50)} acmaMin={Number(d.acma_min ?? 0)} gecenMs={girisGecen ?? 0}
                          tavan={Number(d.tavan ?? 0)} carpanYazi={carpanYazisi(d.devam_carpan, dil)}
                          bitisMs={girisBitis != null ? girisBitis - sayimFarkiMs(farkRef.current) : NaN} onSayi={girisSayi} onBitti={girisBitti} c={c} />
      )}
      {an && (
        <div className="ks-efekt" aria-hidden="true" key={an.id}>
          {anSonuc && (
            <UcanParcalar kokRef={kokRef} kaynak="bant" hedef="kasa" adet={anSonuc.buyuk ? 14 : 6}
                          gecikme={Math.round(180 * (anSonuc.olcek ?? 1))} sure={Math.round((anSonuc.buyuk ? 760 : 720) * (anSonuc.olcek ?? 1))} dagilim={anSonuc.buyuk ? 70 : 40} />
          )}
          {anSonuc?.sahipDegisti && anSonuc.anahtarA && (
            <UcanParcalar kokRef={kokRef} kaynak={anSonuc.anahtarDen ? `avatar-${anSonuc.anahtarDen}` : "kasa"}
                          hedef={`avatar-${anSonuc.anahtarA}`} adet={1} tur="anahtar" gecikme={Math.round(1050 * (anSonuc.olcek ?? 1))} sure={Math.round(850 * (anSonuc.olcek ?? 1))} dagilim={0} />
          )}
          {anAc && (
            <UcanParcalar kokRef={kokRef} kaynak="ac-kasa" hedef={`skor-${anAc.kim}`} adet={16}
                          gecikme={Math.round(420 * (anAc.olcek ?? 1))} sure={Math.round(580 * (anAc.olcek ?? 1))} dagilim={80} />
          )}
        </div>
      )}
      {hata && <p className="m2-hata ks-hata" role="alert"><QtIkon ad="uyari" boyut={18} /> {hata}</p>}
      <QtModal acik={terkOnay} onKapat={() => setTerkOnay(false)} baslik={c("Maçtan çık")}
               aciklama={c("Maçtan çıkarsan hükmen kaybedersin. Emin misin?")}
               altlik={
                 <div className="m2-onay-eylem">
                   <QtDugme tur="ikincil" data-qt-ilk-odak onClick={() => setTerkOnay(false)}>{c("Vazgeç")}</QtDugme>
                   <QtDugme tur="tehlike" devreDisi={!!calisan} onClick={() => { setTerkOnay(false); terk(); }}>{c("Çık")}</QtDugme>
                 </div>
               } />
    </div>
  );
}

/** Maç sonu: tur tur özet (doğru cevap ancak maç bitince gelir). */
// 957: rövanş bekleme — rakibin avatarı, geri sayım halkası (süre kasa_rovans_sn), Vazgeç (kasa_rovans_iptal).
const ROVANS_HALKA_R = 44;
const ROVANS_HALKA_CEVRE = 2 * Math.PI * ROVANS_HALKA_R;
function KasaRovansBekleme({ rakip, baslangic, sureSn, simdi, c, onVazgec }) {
  const kalanMs = Math.max(0, baslangic + sureSn * 1000 - simdi);
  const kalanSn = Math.ceil(kalanMs / 1000);
  const oran = sureSn > 0 ? kalanMs / (sureSn * 1000) : 0;
  return (
    <QtModal acik onKapat={onVazgec} baslik={c("Rövanş isteği gönderildi")} className="m2-rovans"
             altlik={<QtDugme tur="ikincil" tamGenislik onClick={onVazgec}>{c("Vazgeç")}</QtDugme>}>
      <div className="m2-rovans-ic" aria-live="polite">
        <div className="m2-rovans-halka">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="iz" cx="50" cy="50" r={ROVANS_HALKA_R} />
            <circle className="dolu" cx="50" cy="50" r={ROVANS_HALKA_R}
                    strokeDasharray={ROVANS_HALKA_CEVRE}
                    strokeDashoffset={ROVANS_HALKA_CEVRE * (1 - oran)} />
          </svg>
          <CerceveliAvatar profile={rakip} userId={rakip?.id} boyut={64} hareketli />
        </div>
        <p className="m2-rovans-metin">
          {c("Rövanş isteği gönderildi — {ad} yanıtlıyor…", { ad: rakip?.gorunen_ad ?? "" })}
        </p>
        <p className="m2-rovans-sayac qt-sayi" role="timer" aria-label={c("{0} saniye kaldı", { 0: kalanSn })}>
          {c("{0} sn", { 0: kalanSn })}
        </p>
      </div>
    </QtModal>
  );
}

/**
 * Maç sonu (7 Eki 2026, Ida): Ortak Hazine'ye özel özet — kim kaç hazine açtı, kaç puan, en büyük hazine.
 * Kaynak: kasa_durum › gecmis (bitmiş maçta her tur: karar 'ac', karar_ben, acilan_deger, kasa_sonra); ek istek yok.
 */
function KasaAcilanlar({ gecmis, c }) {
  if (!Array.isArray(gecmis) || !gecmis.length) return null;
  const acilan = gecmis.filter((t) => t.karar === "ac" && Number(t.acilan_deger) > 0);
  const benA = acilan.filter((t) => t.karar_ben);
  const rakipA = acilan.filter((t) => !t.karar_ben);
  const toplam = (l) => l.reduce((a, t) => a + Number(t.acilan_deger), 0);
  const enBuyuk = acilan.reduce((m, t) => (!m || Number(t.acilan_deger) > Number(m.acilan_deger) ? t : m), null);
  const zirve = Math.max(0, ...gecmis.map((t) => Number(t.kasa_sonra) || 0));
  const taraf = (yan, ad, l) => (
    <div className={`ks-acilan-taraf ks-acilan-taraf--${yan}`}>
      <span className="ks-acilan-ad">{ad}</span>
      <b className="ks-acilan-sayi qt-sayi" aria-label={c("{n} hazine açıldı", { n: l.length })}>{l.length}</b>
      <small className="qt-sayi">{c("+{p} puan", { p: toplam(l) })}</small>
    </div>
  );
  return (
    <section className="ks-acilan" aria-label={c("Açılan hazineler")}>
      <h3 className="ks-acilan-baslik"><QtIkon ad="coin" boyut={16} />{c("Açılan hazineler")}</h3>
      <div className="ks-acilan-taraflar">
        {taraf("ben", c("Sen"), benA)}
        {taraf("rakip", c("Rakip"), rakipA)}
      </div>
      <p className="ks-acilan-en">
        {enBuyuk
          ? <>{c("En büyük hazine")}: <b className="qt-sayi">{Number(enBuyuk.acilan_deger)}</b> · {enBuyuk.karar_ben ? c("sen açtın") : c("rakip açtı")}</>
          : c("Hiç hazine açılmadı · en yüksek {k}", { k: zirve })}
      </p>
    </section>
  );
}

function KasaGecmis({ gecmis, c }) {
  if (!Array.isArray(gecmis) || !gecmis.length) return null;
  return (
    <ol className="ks-gecmis" aria-label={c("Turlar")}>
      {gecmis.map((t) => {
        const sec = secenekleriCoz(t.secenekler);
        const dogru = t.dogru_cevap == null ? null : sec[Number(t.dogru_cevap)];
        return (
          <li key={t.tur} className={sinif("ks-gecmis-satir", t.ben_dogru ? "ks-gecmis--dogru" : "ks-gecmis--yanlis")}>
            <span className="ks-gecmis-tur qt-sayi">{t.altin ? c("Altın") : t.tur}</span>
            <span className="ks-gecmis-metin">
              <b>{t.soru}</b>
              {dogru != null && <small>{c("Doğru cevap")}: {dogru}</small>}
              {t.karar === "ac" && <small>{t.karar_ben ? c("Hazineyi açtın: +{k} puan", { k: t.acilan_deger }) : c("Rakip hazineyi açtı: +{k} puan", { k: t.acilan_deger })}</small>}
            </span>
            <QtIkon ad={t.ben_dogru ? "onay" : "carpi"} boyut={16} />
          </li>
        );
      })}
    </ol>
  );
}

export default function KasaPage() {
  const { id } = useParams();
  return id ? <KasaMac id={id} key={id} /> : <KasaGiris />;
}
