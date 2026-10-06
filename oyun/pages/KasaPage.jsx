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
import AramaSahnesi, { ARAMA_GECIS_MS } from "../components/AramaSahnesi.jsx";
import { GeriSayim } from "../components/MacHazirlik.jsx";
import BulunamadiPage from "./BulunamadiPage.jsx";
import { KasaKadran, KasaSkor, KasaUst, KasaKarar, KasaSonucBandi, KasaAcKilit, kasaKararMetni, carpanYazisi } from "../components/KasaParcalari.jsx";
import JokerCubugu from "../components/JokerCubugu.jsx";
import CerceveliAvatar from "../components/CerceveliAvatar.jsx";
import { TepkiCubugu, useMacTepki } from "../components/Tepki.jsx";
import SkillRozeti from "../components/SkillRozeti.jsx";
import { jokerBilgi } from "../lib/jokerler.js";
import { useOyuncuSeviyeleri } from "../lib/oyuncuSeviye.js";
import { useMacSonuOzet, ozettenSahne } from "../lib/macSonuOzet.js";
import { useDereceliTercih } from "../lib/dereceli.js";
import { useDil } from "../lib/dilKanca.js";
import { hataMesaji, islemHatasi } from "../lib/hata.js";
import { zamanAsimindaYenidenDene } from "../lib/yenidene.js";
import { y } from "../lib/yol.js";
import { useAyar } from "../lib/ayarlar.js";
import { rpcDene } from "../lib/rpcDene.js";
import { useOyunModu } from "../lib/oyunModu.js";
import { sayacKaymasi, sayacGoster, sayacSinirMs, saatFarkiOrnekle } from "../lib/zaman.js";
import { soruUzunlukSinifi } from "../lib/soruUzunluk.js";
import { titret } from "../lib/geriBildirim.js";
import { sesKilidiAc, sesTik, sesDogru, sesYanlis, sesDokunus, sesRakipBulundu, sesSoruGeldi,
  sesTurGecis, sesRakipCevapladi, sesCoin, sesRozet, sesJoker, sesXpDolma, sesSkill } from "../lib/ses.js";
import { KasaAcAni, KasaAltinYagmuru, UcanParcalar, kasaSeviye, KasaGirisSahnesi, KasaFinalSahnesi,
  KasaCifteBandi, KasaRakipKarar } from "../components/KasaEfekt.jsx";
import Konfeti from "../components/Konfeti.jsx";
import { hareketAzaltildiMi, QT_KIRILMA_MS } from "../tasarim/hareket.js";
import { QtDugme, QtIkon, QtModal, QtSayac, QtSik, QtSikler, QtSoruKarti, sinif } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";   // GeriSayim (3-2-1) görünümü
import "./DuelloPage.a.css";              // m2-bant / m2-hata / m2-onay-eylem / m2-giris ortak kalıpları
import "../styles/kasa.css";

const HARFLER = ["A", "B", "C", "D"];
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
const GECIKMIS_YOKLAMA_MS = 2000;
const GECIKMIS_PENCERE_MS = 30000;
const GECIKME_BANT_MS = 4000;
const KASA_ARAMA_SINIR_SN = 60;
const IPUCU_SN = 3;
// 951 anları (kasa-efekt.css süreleriyle eşleşir)
// 955: giriş sahnesi TEK KATMAN — sandık düşüşü (3 sn) + sandığın üstünde 3-2-1 (3 sn); ilk sorunun gösterim başlangıcında biter
const GIRIS_SAHNE_MS = 6000;
const DEVAM_AN_MS = 1400;      // 955: DEVAM ×1,25 anı (mini sandık sarsılır, çarpan patlar, kasa sayarak yükselir); 980: 1700 → 1400 (gösterim payında biter)
const AC_AN_MS = 1280;         // 980: AÇ anı (1600 → 1280) — soru gösterim payının (1,5 sn) içinde biter
// 990: AÇ / DEVAM anı geç veride bile en az AN_TABAN_MS GÖRÜNÜR (atlanmaz; 980'deki %40 sıkıştırma kalktı). An bitene
// kadar yeni sorunun sayacı gizli, AÇ'ta şıklar örtülü — sayaç an bitince sunucunun gerçek kalanını gösterir (kayma yok).
// Pay yetmezse soru süresinden yer: ölçüm + öneri PROGRESS.md (kasa_gosterim_payi değiştirilmedi).
const AN_TABAN_MS = 1000;
const KAPALI_KARAR_MS = 300;   // 990: rakibin kararı önce kapalı kart (ne olduğu görünmez)
const DEVAM_VURUS_MS = 650;    // 990: DEVAM ETTİ vuruşu (AÇ'ta vuruş AÇ anının kendi yazısıdır)
const FINAL_SAHNE_MS = 4300;   // maç sonu açılış sahnesi (kazanan) — sonra MacSonuKutlama
const FINAL_KAPANIS_MS = 3200; // kaybeden: kasa kapanır/kararır
const CIFTE_MS = 1400;
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
  const acik = useAyar("kasa_modu_acik", 0) >= 1;
  const hedef = useAyar("kasa_hedef_puan", 80);
  const artis = useAyar("kasa_artis", 2);
  const ikisi = useAyar("kasa_ikisi_dogru_artis", 6);
  const maxTur = useAyar("kasa_max_tur", 36);
  const acmaMin = useAyar("kasa_acma_min", 0);
  // 954: DEVAM sahipliği bırakır + ücretsiz 50:50 (ayar kapalıysa eski satır / satır yok)
  const devamElli = useAyar("kasa_devam_joker_acik", 0) >= 1;
  const devamBirakir = useAyar("kasa_devam_birakir", 0) >= 1;
  // 955: tavan (0 = yok) · DEVAM çarpanı (1 = yok) · karar süresi
  const tavan = useAyar("kasa_tavan", 0);
  const carpan = useAyar("kasa_devam_carpan", 1);
  const kararSn = useAyar("kasa_karar_sn", 5);
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

  if (!acik) return <BulunamadiPage kapaliMod />;
  return (
    <div className="m2-giris ks-giris">
      <header className="m2-giris-kafa ks-giris-kafa qt-h-gir">
        <span className="m2-giris-ikon" aria-hidden="true"><QtIkon ad="coin" boyut={40} /></span>
        <div className="m2-giris-yazi">
          <h1 className="qt-baslik-1">{ceviri("Ortak Hazine")}</h1>
          <p>{ceviri("Ortada ikinizin ortak hazinesi büyür.")}</p>
        </div>
      </header>
      {/* 990: mobilde ilk ekran — 3 maddelik özet + "Rakip ara" görünür; tam kural listesi aşağıda açılır alanda */}
      <ol className="ks-ozet">
        <li><b className="qt-sayi">1</b><span>{ceviri("Soruyu tek başına bilen hazineyi alır.")}</span></li>
        <li><b className="qt-sayi">2</b><span>{ceviri("Hazine sendeyse AÇ: puanına yaz · DEVAM: hazine büyür, sahipsiz kalır.")}</span></li>
        <li><b className="qt-sayi">3</b><span>{ceviri("{h} puana ilk ulaşan kazanır.", { h: hedef })}</span></li>
      </ol>
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
        <p className="m2-giris-not">
          {dereceli ? ceviri("Klasik ile aynı lig puanı ve coin ödülü") : ceviri("Serbest: lig puanı yok, coin yarı.")}
        </p>
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
          ? ceviri("AÇ: hazine puanına yazılır, hazine sıfırlanır. DEVAM: hazine {x} büyür ama sahipsiz kalır; tek başına bilen alır.", { x: carpanX })
          : devamBirakir
          ? ceviri("AÇ: hazine puanına yazılır, hazine sıfırlanır. DEVAM: hazine büyür ama sahipsiz kalır; tek başına bilen alır.")
          : ceviri("AÇ: hazine puanına yazılır, hazine sıfırlanır. DEVAM: hazine büyür ama kaybedebilirsin.")}</li>
        {acmaMin > 0 && <li>{ceviri("Hazine en az {m} olunca açılabilir.", { m: acmaMin })}</li>}
        {/* 956: tavan hedefe eşit/üstündeyse tek AÇ maçı bitirebilir — "bitirmez" yalnız tavan < hedef iken */}
        {tavan > 0 && <li>{tavan < hedef
          ? ceviri("Hazine en çok {t} olur: tek AÇ maçı bitirmez.", { t: tavan })
          : ceviri("Hazine en çok {t} olur.", { t: tavan })}</li>}
        <li>{ceviri("Karar süresi {s} sn; dolarsa DEVAM sayılır.", { s: kararSn })}</li>
        <li>{ceviri("Jokerler: 50:50, Ek Süre, Zaman Baskısı, İkinci Şans.")}</li>
        {devamElli && <li>{ceviri("Bilerek DEVAM dersen hazine açılana kadar her soruda ücretsiz 50:50.")}</li>}
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
    gecisRef.current = window.setTimeout(() => bulunduRef.current(kasaId), ARAMA_GECIS_MS);
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
    const zaman = setInterval(() => {
      sn += 1;
      if (sn >= KASA_ARAMA_SINIR_SN && !bittiRef.current) {
        clearInterval(zaman);
        bittiRef.current = true;
        setHata(ceviri("Şu an rakip bulunamadı. Birazdan tekrar dene."));
        rpcDene("kasa_aramadan_cik");
        return;
      }
      setGecen((g) => g + 1); dene();
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
  const { user } = useAuth();
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
  const { ozet: macSonuOzet } = useMacSonuOzet(d?.durum === "bitti" && d?.id ? `kasa:${d.id}` : null);
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

  const farkRef = useRef(0);
  const farkOrnekRef = useRef([]);
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
  const [yenidenBaglaniyor, setYenidenBaglaniyor] = useState(false);

  const yukleTek = useCallback(async () => {
    sonYukleRef.current = Date.now();
    try {
      const gonderildi = Date.now();
      const { data, error } = await supabase.rpc("kasa_durum", { p_id: id });
      const alindi = Date.now();
      if (error) throw error;
      if (data) {
        // 980: istek/yanıt orta noktası + penceredeki en kısa gidiş-dönüş (eskisi yanıt anı + en büyük farktı:
        // giriş geri sayımı ve sayaç dönüş gecikmesi kadar geride kalıyor, örnek pencereden düşünce sıçrıyordu)
        const saat = saatFarkiOrnekle(farkOrnekRef.current, gonderildi, alindi, data.sunucu_zamani);
        farkOrnekRef.current = saat.ornekler;
        farkRef.current = saat.fark;
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
    yukle();
    const kanal = supabase
      .channel(`kasa-${id}`)
      .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "kasa_sinyal", filter: `kasa_id=eq.${id}` },
          () => {
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
    const saat = setInterval(() => setSimdi(Date.now()), 200);
    return () => {
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
    const bas = gosterimBas ? Math.max(sunucuSimdi, gosterimBas) : sunucuSimdi;
    return Math.max(0, (new Date(benimBitis).getTime() - bas) / 1000);
  }, [benimBitis, gosterimBas, simdi]);
  const fazKaymaRef = useRef({ anahtar: null, k0: 0, kayma: 0 });
  const kopukDonukSn = d?.kopuk && Number.isFinite(Number(d.kopuk.faz_kalan_sn)) ? Math.max(0, Number(d.kopuk.faz_kalan_sn)) : null;
  const gosterSn = useMemo(() => {
    if (kopukDonukSn != null) return kopukDonukSn;
    if (!(kalanSn > 0) || !d) return 0;
    const anahtar = `${d.tur}-${d.altin}-${d.faz}-${benimBitis}`;
    if (fazKaymaRef.current.anahtar !== anahtar) fazKaymaRef.current = { anahtar, ...sayacKaymasi(kalanSn) };
    return sayacGoster(kalanSn, fazKaymaRef.current);
  }, [kalanSn, kopukDonukSn, d?.tur, d?.altin, d?.faz, benimBitis]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (kalanSn <= 0 || kopukDonukSn != null) return undefined;
    const z = setTimeout(() => setSimdi(Date.now()), sayacSinirMs(kalanSn, fazKaymaRef.current) + 5);
    return () => clearTimeout(z);
  }, [kalanSn, gosterSn, kopukDonukSn]);

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
  const kokRef = useRef(null);
  // 980: her ses/efekt bir OLAY anahtarına (tur/altın/faz, AÇ, DEVAM, 3-2-1 rakamı, maç sonu…) bağlı, maç sayfasının
  // ömründe TEK SEFER. Yeniden çizim, Realtime tekrarı, StrictMode'un çift effect'i, sekme dönüşü tekrar tetiklemez.
  const calinanRef = useRef(new Set());
  const birKez = useCallback((anahtar) => {
    if (calinanRef.current.has(anahtar)) return false;
    calinanRef.current.add(anahtar);
    return true;
  }, []);
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
    adimlar.forEach(([ms, yama, ses]) => {
      anZamanRef.current.push(setTimeout(() => {
        if (yama) setAn((a) => (a?.id === id ? (yama === "bitir" ? null : { ...a, ...yama }) : a));
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
  const girisBitis = gd.bitti ? null : gd.bitis;
  const girisGecen = girisBitis != null ? sunucuSimdiMs - (girisBitis - GIRIS_SAHNE_MS) : null;
  // Sahne erken açılırsa (arama geçişi) bitişe kadar ekranda kalır (gecikme 0'dan başlar)
  const girisAktif = girisGecen != null && girisGecen < GIRIS_SAHNE_MS && !d?.kopuk;
  if (girisAktif) gd.basladi = true;
  else if (gd.basladi) gd.bitti = true;
  const girisAktifRef = useRef(false);
  girisAktifRef.current = girisAktif;
  useEffect(() => {
    if (!girisAktif || !birKez("giris:dusus")) return;
    // düşüş (kasa-efekt.css ks-giris-in: yere ~%20'de oturur) — geç gelen istemcide / gizli sekmede düşüş sesi atlanır
    if ((girisGecen != null && girisGecen > 900) || gorunurDegil()) return;
    sesTurGecis();
    // zamanlayıcılar an listesinde: sekme gizlenince / sayfa kapanınca temizlenir (StrictMode temizliği sesi yutmasın)
    anZamanRef.current.push(setTimeout(() => { sesCoin(); titret([10, 30, 10]); }, 650),
                            setTimeout(() => { sesRozet(); titret(20); }, 1300));
  }, [girisAktif]);   // eslint-disable-line react-hooks/exhaustive-deps
  // 3-2-1: her rakam maçta bir kez (sahne yeniden kurulsa da), gizli sekmede sessiz
  const girisSayi = useCallback((n) => {
    if (!birKez(`giris:${n}`) || gorunurDegil()) return;
    sesTik(n); titret(n === 1 ? 24 : 12);
  }, [birKez]);
  const girisBitti = useCallback(() => setSimdi(Date.now()), []);
  // Sahne kalkınca (soru görünür) soru sesi — sahne kendi bitişini görmeden kalksa da bir kez çalar
  const girisOncekiRef = useRef(false);
  useEffect(() => {
    const once = girisOncekiRef.current;
    girisOncekiRef.current = girisAktif;
    if (once && !girisAktif && d?.durum === "aktif" && d?.faz === "cevap" && birKez(`soru:${d.tur}-${d.altin}`) && !gorunurDegil()) sesSoruGeldi();
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
    const kazandim = f.kazandim;
    const sure = hareketAzaltildiMi() ? 1500 : kazandim ? FINAL_SAHNE_MS : FINAL_KAPANIS_MS;
    setFinalAn(f);
    // Zamanlayıcılar ref'te: d sonradan değişse de sahne yarıda kalmaz (yalnız sayfa kapanınca temizlenir)
    const sesler = kazandim
      ? [[150, () => sesJoker()], [1150, () => { sesRozet(); titret([30, 50, 40]); }],
         [2300, () => { sesCoin(); titret([40, 30, 60]); }], [2450, sesXpDolma], [2900, sesCoin]]
      : [[200, sesTurGecis], [1350, () => { sesYanlis(); titret(40); }]];
    // Sahne bitince sesi de biter: kısalmış sahnede (hareket azaltma 1,5 sn) sonraki sesler kutlamanın seslerine binmesin
    const z = sesler.filter(([ms]) => ms < sure).map(([ms, f]) => setTimeout(f, ms));
    z.push(setTimeout(() => setFinalAn(null), sure));
    finalZamanRef.current.push(...z);
  }, [d]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- 951: jokerler (yalnız sunum; etkiler sunucuda) ----------------
  const [kirilan, setKirilan] = useState([]);
  const [ekBalon, setEkBalon] = useState(null);
  const [elenenYerel, setElenenYerel] = useState(null);
  const [jokerBilgiMetni, setJokerBilgiMetni] = useState(null);
  const [rakipJokerAn, setRakipJokerAn] = useState(null);
  const [cifteAn, setCifteAn] = useState(null);
  // 953: DEVAM ödülü anı — yalnız kendi DEVAM'ımın açtığı soruda, sunucunun devam_odul kaydına göre (rakip görmez)
  const [devamAn, setDevamAn] = useState(null);
  const devamBekleRef = useRef(null);
  const jokerZamanRef = useRef([]);
  const jokerZaman = (f, ms) => { jokerZamanRef.current.push(setTimeout(f, ms)); };
  useEffect(() => () => jokerZamanRef.current.forEach(clearTimeout), []);
  // 980: tek seferlik anları bitir — dokunarak geçme (sonuç uçuşu, AÇ, DEVAM ×2, ÇİFTE, maç sonu sahnesi) ve sekme
  // gizlenince. Gösterilen değerler gerçeğe atlar, kalan sesler çalmaz (dönüşte kısılmış zamanlayıcılar patlamaz).
  const anlariBitir = useCallback(() => {
    anZamanRef.current.forEach(clearTimeout);
    anZamanRef.current = [];
    finalZamanRef.current.forEach(clearTimeout);
    finalZamanRef.current = [];
    kararZamanRef.current.forEach(clearTimeout);
    kararZamanRef.current = [];
    setAn(null); setCifteAn(null); setFinalAn(null); setRakipKarar(null);
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
  useEffect(() => { setKirilan([]); setEkBalon(null); setElenenYerel(null); }, [d?.tur, d?.altin]);
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
    jokerZaman(() => setJokerBilgiMetni((x) => (x?.anahtar === b.anahtar ? null : x)), 1800);
  }, []);
  useEffect(() => {
    const bek = devamBekleRef.current;
    if (!d || bek == null || d.faz !== "cevap") return;
    devamBekleRef.current = null;
    const o = d.devam_odul;
    if (d.durum !== "aktif" || !o || Number(o.tur) !== bek) return;
    const an = { kazandi: Boolean(o.kazandi), joker: o.joker ?? null, anahtar: Date.now() };
    setDevamAn(an);
    if (an.kazandi) { sesJoker(); titret([14, 40, 20]); }   // kaybedince sessiz
    jokerZaman(() => setDevamAn((x) => (x?.anahtar === an.anahtar ? null : x)), an.kazandi ? 2000 : 1200);
  }, [d]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Rakip yeni joker kullandı → ikon + kısa efekt (rakip avatarının altında)
  const rakipJokerSayiRef = useRef({ tur: null, n: 0 });
  useEffect(() => {
    if (!d || d.durum !== "aktif") return;
    const liste = Array.isArray(d.rakip_joker) ? d.rakip_joker : [];
    const anahtar = `${d.tur}-${d.altin}`;
    const r = rakipJokerSayiRef.current;
    if (r.tur !== anahtar) { rakipJokerSayiRef.current = { tur: anahtar, n: liste.length }; if (!liste.length) return; }
    else if (liste.length <= r.n) return;
    rakipJokerSayiRef.current = { tur: anahtar, n: liste.length };
    const tur = liste[liste.length - 1];
    if (r.tur !== anahtar && d.faz !== "cevap") return;
    setRakipJokerAn({ tur, anahtar: Date.now() });
    sesJoker(); titret(12);
    jokerZaman(() => setRakipJokerAn((x) => (x?.tur === tur ? null : x)), 2200);
  }, [d]);   // eslint-disable-line react-hooks/exhaustive-deps

  const anRef = useRef({ faz: null, rakip: false, tur: null });
  useEffect(() => {
    if (!d || d.durum !== "aktif") return;
    const anahtar = `${d.tur}-${d.altin}-${d.faz}`;
    if (anRef.current.faz !== anahtar) {
      const onceki = anRef.current.faz;
      const oncekiTur = anRef.current.tur;
      anRef.current = { faz: anahtar, rakip: false, tur: `${d.tur}-${d.altin}` };
      setSecim(null);
      if (!onceki) return;
      // 980: faz olayı (tur-altın-faz) maçta tek sefer; gizli sekmede açılan fazın sesi/anı çalınmaz (dönüşte patlamasın)
      if (!birKez(`faz:${anahtar}`)) return;
      if (gorunurDegil()) {
        anZamanRef.current.forEach(clearTimeout); anZamanRef.current = []; setAn(null);
        kararZamanRef.current.forEach(clearTimeout); kararZamanRef.current = []; setRakipKarar(null);
        return;
      }
      if (d.faz !== "sonuc") { anZamanRef.current.forEach(clearTimeout); setAn(null); }
      const yeniTur = oncekiTur !== `${d.tur}-${d.altin}`;
      const acildi = d.faz === "cevap" && d.son_karar?.ac && !d.son_karar.son;
      // Giriş sahnesi sürerken ilk sorunun bandı/sesi sahnenin altında kalmasın (sahne kendi sesini çalar)
      if (yeniTur && (d.faz === "karar" || d.faz === "cevap") && !girisAktifRef.current) { turBantFazRef.current = d.faz; setTurBant(Date.now()); }
      if (d.faz === "cevap" && !acildi) { if (!girisAktifRef.current) sesSoruGeldi(); }
      else if (d.faz === "karar") sesTurGecis();
      else if (d.faz === "sonuc" && d.sonuc) {
        const s = d.sonuc;
        if (s.ben_dogru) sesDogru(); else sesYanlis();
        titret(s.ben_dogru ? 12 : 30);
        // 951: ikisi de bildi → "ÇİFTE" patlama bandı
        if (!s.altin && s.ben_dogru && s.rakip_dogru && !hareketAzaltildiMi()) {
          const an = Date.now();
          setCifteAn(an);
          jokerZaman(() => setCifteAn((x) => (x === an ? null : x)), CIFTE_MS);
        }
        if (!s.altin && Number(s.artis) > 0) {
          // +2 / +6: bant → mini kasa altın uçuşu; sahip değiştiyse anahtar uçar.
          const buyuk = Number(s.artis) >= Number(d.ikisi_artis ?? 6);
          const sahipDegisti = Boolean(s.sahip_sonra) && s.sahip_sonra !== s.sahip_once;
          const kim = (u) => (!u ? null : u === d.ben ? "ben" : "rakip");
          anBaslat({ tip: "sonuc", kasaOnce: Number(s.kasa_once ?? 0), artis: Number(s.artis), buyuk,
                     sahipOnce: s.sahip_once ?? null, sahipDegisti, anahtarDen: kim(s.sahip_once), anahtarA: kim(s.sahip_sonra) }, [
            [950, { varis: true }, () => { sesCoin(); titret(buyuk ? [12, 40, 18] : 10); }],
            ...(buyuk ? [[1180, null, sesXpDolma]] : []),
            ...(sahipDegisti ? [[1900, { anahtarVaris: true }, () => { sesJoker(); titret(14); }]] : []),
            [2600, { bitti: true }],
          ]);
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
      const rakipKararMi = d.faz === "cevap" && onceki === `${d.tur}-${d.altin}-karar` && skR && !skR.son
        && skR.veren && skR.veren !== d.ben;
      const kapaliMs = rakipKararMi ? KAPALI_KARAR_MS : 0;
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
          kararZaman(() => sonra(null), kapaliMs + (skR.ac ? AN_TABAN_MS : DEVAM_VURUS_MS));
        }
      } else setRakipKarar(null);
      if (acildi) {
        // AÇ anı: kapı açılır, ışık patlar, altın açanın skor çubuğuna uçar (980: 1,6 → 1,28 sn; kasa-efekt.css ks-ac-*)
        const k = d.son_karar;
        const benim = k.veren === d.ben;
        const veren = d.oyuncular.find((o) => o.id === k.veren);
        // 990: taban AN_TABAN_MS — geç veride en çok bu kadar kısalır, hiç atlanmaz
        const olcek = Math.max(AN_TABAN_MS / AC_AN_MS, olcekle(AC_AN_MS));
        const m = (ms) => Math.round(ms * olcek);
        const basla = () => anBaslat({ tip: "ac", benim, deger: Number(k.deger ?? 0), seviye: kasaSeviye(k.deger, d.hedef, d.tavan), olcek,
                     kim: benim ? "ben" : "rakip", eskiPuan: Math.max(0, Number(veren?.puan ?? 0) - Number(k.deger ?? 0)) }, [
            [m(340), { sars: true }, () => { if (benim) sesRozet(); else sesTurGecis(); titret(benim ? [20, 40, 30] : 20); }],
            [m(690), { sars: false }],
            // kısalmış anda coin sesi düşer (sesler üst üste binmesin; açılış + soru sesi kalır)
            [m(980), { varis: true }, olcek >= 0.75 ? sesCoin : null],
            [m(AC_AN_MS), "bitir", sesSoruGeldi],
          ]);
        if (kapaliMs) kararZaman(basla, kapaliMs); else basla();
      }
      // 955: DEVAM ×1,25 — karar fazından soruya geçişte (iki oyuncu da görür): mini sandık sarsılır, "×1,25" patlar,
      // kasa eski değerden yeniye SAYARAK yükselir. Sunucu son_karar.deger (eski) / yeni / carpan yazar.
      const sk = d.son_karar;
      if (d.faz === "cevap" && onceki === `${d.tur}-${d.altin}-karar` && sk && !sk.ac && !sk.son
          && sk.yeni != null && Number(sk.yeni) !== Number(sk.deger)) {
        // DEVAM anı soruyu örtmez (şeridin ortasındaki sandık): 990 taban AN_TABAN_MS, atlanmaz
        const olcek = Math.max(AN_TABAN_MS / DEVAM_AN_MS, olcekle(DEVAM_AN_MS));
        const m = (ms) => Math.round(ms * olcek);
        const basla = () => anBaslat({ tip: "devam", eski: Number(sk.deger ?? 0), yeni: Number(sk.yeni), tavan: Boolean(sk.tavan), olcek,
                   metin: carpanYazisi(sk.carpan, dil) ?? "" }, [
          // kısalmış anda tek ses (coin): soru sesiyle birlikte üç ses 400 ms'ye sıkışıyordu (sekme dönüşü ölçümü)
          ...(olcek >= 0.75 ? [[m(60), null, () => { sesRozet(); titret([16, 30, 16]); }]] : []),
          [m(560), { varis: true }, () => { sesCoin(); titret(12); }],
          [m(DEVAM_AN_MS), "bitir"],
        ]);
        if (kapaliMs) kararZaman(basla, kapaliMs); else basla();
      }
    }
    if (d.faz === "cevap" && d.cevap?.rakip_cevapladi && !anRef.current.rakip) {
      anRef.current.rakip = true;
      if (birKez(`rakip-cevap:${d.tur}-${d.altin}`) && !gorunurDegil()) sesRakipCevapladi();
    }
  }, [d]);
  useEffect(() => {
    // Maç bitince faz satırda kalır (ör. AÇ ile biten maçta "karar"): sonuç ekranında tik çalmasın
    if (!d || d.durum !== "aktif" || !["cevap", "karar"].includes(d.faz) || d.cevap?.ben_cevapladim) return;
    const n = Math.ceil(gosterSn);
    // 980: anahtar tur + altın + faz + rakam, maçta tek sefer (eskiden altın yoktu ve yalnız son rakam tutuluyordu: sayaç
    // geri sıçrayınca aynı rakam yeniden çalıyordu); gizli sekmede çalmaz
    if (n > 0 && n <= 3 && !gorunurDegil() && birKez(`tik:${d.tur}-${d.altin}-${d.faz}-${n}`)) sesTik(n);
  }, [gosterSn, d]);   // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------- eylemler ----------------
  const cevapVer = async (i) => {
    sesDokunus(); titret(10);
    setSecim(i);
    setHata(null);
    setCalisan("cevap");
    try {
      const { data, error } = await supabase.rpc("kasa_cevap", { p_id: id, p_cevap: i });
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
      setHata(c(hataMesaji(e)));
      setSecim(null);
      if (/Süre doldu|Şu an cevap verilemez/i.test(e?.message ?? "")) yukle().catch(() => {});
    } finally {
      setCalisan(null);
    }
  };
  const kararVer = async (ac) => {
    sesDokunus(); titret(ac ? 20 : 8);
    setHata(null);
    setCalisan(ac ? "karar-ac" : "karar-devam");
    try {
      if (!ac) devamBekleRef.current = Number(dGuncelRef.current?.tur);
      const { error } = await supabase.rpc("kasa_karar", { p_id: id, p_ac: ac });
      if (error) { devamBekleRef.current = null; throw error; }
      await yukle();
    } catch (e) {
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
        {yuklemeHatasi ? (
          <MacYukleniyor hata={yuklemeHatasi} onTekrarDene={() => { setYuklemeHatasi(null); yukle(); }}
                         donusYolu={y("/kasa")} donusMetni={c("Ortak Hazine'ye dön")} />
        ) : (
          <div className="m2-yukleniyor" aria-busy="true" aria-label={c("Yükleniyor…")}>
            <span className="m2-yukleniyor-ikon" aria-hidden="true"><QtIkon ad="coin" boyut={36} /></span>
          </div>
        )}
      </div>
    );
  }

  const ben = d.oyuncular.find((o) => o.id === d.ben) ?? d.oyuncular[0];
  const rakip = d.oyuncular.find((o) => o.id !== d.ben) ?? d.oyuncular[1];
  const secenekler = secenekleriCoz(d.soru?.secenekler);

  // ---------------- maç sonu ----------------
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
    const fin = finalAn ?? (oncekiDurumRef.current === "aktif" && d.durum === "bitti" ? kasaFinalVerisi(d) : null);
    if (fin) {
      return (
        <div className="ks-bitti ks-bitti--final" onClick={anlariBitir}>
          <KasaFinalSahnesi key="kasa-final" kazandim={fin.kazandim} deger={fin.deger} hedef={fin.hedef}
                            puanOnce={fin.puanOnce} puanSonra={fin.puanSonra} c={c} />
        </div>
      );
    }
    if (d.durum === "bitti" && !macSonuOzet) return <div className="ks-bitti"><div className="msk-bekle" aria-busy="true" /></div>;
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
          detay={d.durum === "bitti" ? (
            <>
              <OdulDokumu kaynak={`kasa:${d.id}`} veri={macSonuOzet?.dokum} gorevleriGoster={false} />
              <KasaGecmis gecmis={d.gecmis} c={c} />
              {/* 957: arkadaşla Kasa geçmişi (Düello 'ezeli' ile aynı metin ve görünüm) */}
              {ezeliMetin && <div className="bd-duello-ezeli">{ezeliMetin}</div>}
            </>
          ) : null}
          eylemNotu={hata ? <span className="m2-hata" role="alert"><QtIkon ad="uyari" boyut={18} /> {hata}</span> : null}
          eylemler={{ onYeniMac: () => navigate(y("/kasa")), onAnaSayfa: () => navigate(y()), yeniMacEtiketi: c("Yeni maç") }}
          rovans={rovansAlani}   // 957: Düello ile aynı rövanş akışı (Ida, 5 Eki 2026 — "Kasa'yı ayrı tutma")
        />
      </div>
    );
  }

  // ---------------- maç ekranı ----------------
  const kilitli = Boolean(d.cevap?.ben_cevapladim);
  const toplamSn = d.faz === "karar" ? Number(d.sureler?.karar ?? 8) : Number(d.sureler?.soru ?? 15);
  const sayacVar = d.faz === "cevap" || d.faz === "karar";
  const sayac = sayacVar
    ? <QtSayac kalan={gosterSn} toplam={toplamSn} esik={d.faz === "karar" ? 3 : 5} boyut="k" durdu={kilitli || kopukDonukSn != null}
               className={sinif("ks-sayac", d.joker?.kisaltildi && d.faz === "cevap" && "ks-sayac--kisaldi")}
               ekBalon={d.faz === "cevap" ? ekBalon : null} />
    : <span className="ks-sayac ks-sayac--yok" aria-hidden="true">·</span>;
  const gerilim = d.faz === "cevap" && !kilitli && gosterSn > 0 && gosterSn <= 5;
  const sonUcSn = d.faz === "cevap" && !kilitli && kopukDonukSn == null && gosterSn > 0 && gosterSn <= 3;
  const kararGerilim = d.faz === "karar" && d.karar?.veren === d.ben && kopukDonukSn == null && gosterSn > 0 && gosterSn <= 3;
  const kopukBant = d.kopuk
    ? { benMi: Boolean(d.kopuk.ben_mi), kalan: d.kopuk.bitis ? Math.max(0, Math.ceil((new Date(d.kopuk.bitis).getTime() - (simdi + farkRef.current)) / 1000)) : null }
    : null;
  const gecikmisMs = fazBitisRef.current != null ? simdi + farkRef.current - fazBitisRef.current : 0;
  const yenidenBant = !kopukBant && (yenidenBaglaniyor || (sayacVar && !kilitli && gecikmisMs > GECIKME_BANT_MS));
  const kararMetni = d.faz === "cevap" ? kasaKararMetni(d, c) : null;
  // efekt sürerken gösterilen değerler (yalnız sunum)
  const anSonuc = an?.tip === "sonuc" ? an : null;
  const anAc = an?.tip === "ac" ? an : null;
  const anDevam = an?.tip === "devam" ? an : null;
  // 955: DEVAM anı effect'te başlar — geçişin ilk karesinde de eski değer görünsün (yoksa sayı önce yeniye atlar)
  const skD = d.son_karar;
  const devamBekliyor = !anDevam && d.faz === "cevap" && skD && !skD.ac && !skD.son && skD.yeni != null
    && Number(skD.yeni) !== Number(skD.deger) && (anRef.current.faz === `${d.tur}-${d.altin}-karar` || Boolean(rakipKarar))
    && !hareketAzaltildiMi();
  // 990: AÇ/DEVAM anı ve rakibin karar açıklaması sürerken yeni sorunun sayacı başlamış GÖRÜNMEZ (yer tutucu); an bitince
  // sunucunun gerçek kalanı görünür. AÇ anı ve karar kartı soruyu örter → şıklar o sürede seçilemez (dokunuş yalnız geçer).
  // Geçişin ilk karesi (effect henüz rakipKarar'ı yazmadı): değerler yine eski görünsün, kart bir kare bile atlanmasın
  const rkIlkKare = !rakipKarar && d.faz === "cevap" && skD && !skD.son && skD.veren && skD.veren !== d.ben
    && anRef.current.faz === `${d.tur}-${d.altin}-karar` && !gorunurDegil();
  const rkVeren = rkIlkKare ? d.oyuncular.find((o) => o.id === skD.veren) : null;
  const rk = rakipKarar ?? (rkIlkKare ? { ac: Boolean(skD.ac), eskiKasa: Number(skD.deger ?? 0),
    eskiPuan: skD.ac ? Math.max(0, Number(rkVeren?.puan ?? 0) - Number(skD.deger ?? 0)) : null } : null);
  const anOrtu = d.faz === "cevap" && Boolean(anAc || anDevam || rk || devamBekliyor);
  const soruOrtulu = d.faz === "cevap" && Boolean(anAc || rk);
  const turBantGoster = turBant && simdi - turBant < 900 && !anAc && turBantFazRef.current === d.faz;
  const miniHareket = (anSonuc?.varis && !anSonuc.bitti
    ? (anSonuc.buyuk ? ["vardi", "patla"] : ["vardi"]).concat(anSonuc.anahtarVaris ? ["yeni-sahip"] : [])
    : [])
    // 951: her tur başında kısa sarsıntı · cevap süresinin son 3 sn'sinde titreme
    .concat(anDevam ? (anDevam.varis ? ["vardi"] : ["devam-sars"]) : [])
    .concat(turBant && simdi - turBant < 650 && turBantFazRef.current === d.faz ? ["tur-sars"] : [])
    .concat(sonUcSn ? ["gergin"] : []);
  const miniKadran = (
    <KasaKadran d={d} c={c} kucuk
                goster={anSonuc && !anSonuc.varis ? anSonuc.kasaOnce : anDevam && !anDevam.varis ? anDevam.eski
                  : devamBekliyor ? Number(skD.deger) : rk ? rk.eskiKasa : undefined}
                sayiSure={anDevam ? Math.round(900 * (anDevam.olcek ?? 1)) : 520}
                carpan={anDevam ? { anahtar: anDevam.id, metin: anDevam.metin, olcek: anDevam.olcek } : null}
                sahipGoster={anSonuc?.sahipDegisti && !anSonuc.anahtarVaris ? anSonuc.sahipOnce : undefined}
                hareket={miniHareket}
                artis={anSonuc?.varis && !anSonuc.bitti ? { anahtar: anSonuc.id, n: anSonuc.artis, buyuk: anSonuc.buyuk } : null} />
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
      </>
    );
  } else if (d.faz === "karar") {
    sahne = <KasaKarar d={d} c={c} calisan={calisan} onKarar={kararVer} kalan={kopukDonukSn != null ? null : gosterSn}
                       carpanYazi={carpanYazisi(d.devam_carpan, dil)} />;
  } else if (d.faz === "cevap" || d.faz === "sonuc") {
    const sonucMu = d.faz === "sonuc";
    const dogru = sonucMu && d.sonuc?.dogru_cevap != null ? Number(d.sonuc.dogru_cevap) : null;
    const benimCevap = sonucMu
      ? (d.sonuc?.benim_cevabim == null ? null : Number(d.sonuc.benim_cevabim))
      : kilitli && d.cevap?.benim_cevabim != null ? Number(d.cevap.benim_cevabim) : secim;
    const tiklanabilir = !sonucMu && !kilitli && kalanSn > 0 && secim === null && calisan !== "cevap" && !girisAktif && !soruOrtulu;
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
    const jokerPasif = sonucMu || kilitli || kalanSn <= 0 || secim !== null || girisAktif;
    if (d.jokerli && !d.altin && !girisAktif) {
      // Klasik ile aynı çubuk; sahne anahtarının DIŞINDA (faz değişince yeniden yüklenmez), sonuçta pasif kalır
      jokerYuva = (
        <div className={sinif("m1-joker-yuva ks-joker-yuva", jokerPasif && "m1-joker-yuva--pasif")}
             inert={jokerPasif || undefined} aria-hidden={jokerPasif || undefined}>
          <JokerCubugu macTur="kasa" macId={id} soruIndex={d.tur} kilit={kilitli || sonucMu}
                       surum={(d.rakip_joker ?? []).length} kalanSn={kalanSn}
                       onEtki={jokerEtkisi} onBilgi={jokerBilgiGoster} />
        </div>
      );
    }
    sahne = (
      <>
        {sonucMu ? <KasaSonucBandi d={d} c={c} />
          : kararMetni ? (
            <p className={sinif("ks-karar-satir qt-h-gir", (devamAn?.kazandi || rk) && "ks-karar-satir--gizli")} role="status">
              {kararMetni}
              {/* 953: DEVAM ödülü çıkmadı — satırın sonunda küçük, sessiz not (yalnız bende) */}
              {devamAn && !devamAn.kazandi && <span key={devamAn.anahtar} className="ks-devam-an ks-devam-an--yok"> · {c("Bu sefer yok")}</span>}
            </p>
          )
          : <KasaAcKilit d={d} c={c} />}
        {sonucMu && <Konfeti aktif={Boolean(d.sonuc?.ben_dogru)} adet={d.sonuc?.rakip_dogru ? 12 : 18} />}
        {sonucMu && cifteAn && <KasaCifteBandi key={cifteAn} artis={Number(d.sonuc?.artis ?? d.ikisi_artis ?? 6)} c={c} />}
        {anAc && <KasaAcAni key={anAc.id} deger={anAc.deger} benim={anAc.benim} seviye={anAc.seviye} olcek={anAc.olcek} c={c} />}
        {/* 990: rakibin kararı — kapalı kart → AÇTI / DEVAM ETTİ (dokunarak geçilir) */}
        {rakipKarar && d.faz === "cevap" && (
          <KasaRakipKarar key={rakipKarar.id} asama={rakipKarar.asama} ac={rakipKarar.ac} sureDoldu={rakipKarar.sureDoldu}
                          deger={rakipKarar.deger} carpan={rakipKarar.carpan} c={c} />
        )}
        <QtSoruKarti key={d.soru?.soru ?? "soru"}
                     className={sinif("m2-soru ks-soru", soruUzunlukSinifi({ soru: d.soru?.soru, secenekler }), sonucMu && "m2-soru--sonuc")}
                     sira={d.altin ? c("Altın Soru") : c("Aynı soru · aynı anda")}
                     metin={d.soru?.soru} sevinc={sonucMu && Boolean(d.sonuc?.ben_dogru)} />
        <QtSikler etiket={c("Şıklar")}>
          {secenekler.map((s, i) => (
            <QtSik key={`${d.soru?.soru ?? ""}-${i}`} harf={HARFLER[i]} metin={s} durum={durum(i)}
                   kiriliyor={kirilan.includes(i)}
                   onClick={tiklanabilir && !kapali.includes(i) && i !== elenen ? () => cevapVer(i) : undefined} />
          ))}
        </QtSikler>
        <p className="qt-gizli" aria-live="polite">
          {kilitli ? c("Cevabın kilitlendi") : c("düşünüyor…")} · {c("Rakip")}: {d.cevap?.rakip_cevapladi ? c("cevapladı") : c("düşünüyor…")}
        </p>
      </>
    );
  }

  return (
    <div ref={kokRef}
         // 980: tekrarlayan anlar dokunarak geçilir (dokunuş alttaki düğmeye de gider: şık seçimi engellenmez)
         onPointerDown={an || cifteAn || rakipKarar ? anlariBitir : undefined}
         className={sinif("m2-mac ks-mac", `ks-mac--${d.faz}`, (gerilim || kararGerilim) && "qt-h-gerilim", d.altin && "ks-mac--altin",
                          anAc?.sars && "ks-mac--sars", girisAktif && "ks-mac--giris")}>
      <MacUstSerit onCik={() => setTerkOnay(true)} cikisEtiketi={c("Maçtan çık")}
                   rozet={c("Ortak Hazine")} />
      <KasaUst d={d} ben={ben} rakip={rakip} c={c} seviyeler={seviyeler} tepkiBalonlar={tepki.balonlar}
               sayac={anOrtu ? <span className="ks-sayac ks-sayac--yok ks-sayac--bekle" aria-hidden="true">·</span> : sayac}
               anahtar={anSonuc?.anahtarVaris && !anSonuc.bitti ? anSonuc.anahtarA : null}
               rakipJoker={["cevap", "sonuc"].includes(d.faz) && Array.isArray(d.rakip_joker) ? d.rakip_joker : []}
               onay={d.faz === "cevap" ? { [ben.id]: kilitli, [rakip.id]: Boolean(d.cevap?.rakip_cevapladi) } : {}} />
      <div className="ks-serit">
        {/* 990: hazine şeridin ortasında ortak nesne (soru/sonuç); karar/başlangıçta büyük sandık sahnede — ortada hedef */}
        <KasaSkor d={d} ben={ben} rakip={rakip} c={c}
                  puanGoster={anAc && !anAc.varis ? { [anAc.kim]: anAc.eskiPuan } : rk?.ac ? { rakip: rk.eskiPuan } : {}}
                  parla={anAc?.varis ? anAc.kim : null}
                  orta={d.faz === "cevap" || d.faz === "sonuc" ? miniKadran : (
                    <span className="ks-skor-hedef">{c("HEDEF")}<b className="qt-sayi">{Number(d.hedef ?? 80)}</b></span>
                  )} />
        {/* 957: maç içi tepki (kapalı modda hiçbir şey çizmez) */}
        <TepkiCubugu tepki={tepki} className="ks-tepki" />
      </div>
      {kopukBant && (
        <p className="m2-bant m2-bant--uyari" role="status">
          <QtIkon ad="uyari" boyut={18} />
          <span>
            {kopukBant.benMi ? c("Bağlantın koptu — maç bekliyor.") : c("Rakibin bağlantısı koptu — maç durduruldu.")}
            {kopukBant.kalan == null ? "" : ` ${kopukBant.kalan} ${c("sn")}`}
          </span>
        </p>
      )}
      {yenidenBant && (
        <p className="m2-bant m2-bant--uyari" role="status">
          <QtIkon ad="yenile" boyut={18} />
          <span>{c("Bağlantı yeniden kuruluyor…")}</span>
        </p>
      )}
      <div className="ks-sahne" key={`${d.faz}-${d.tur}-${d.altin}`}>
        {turBantGoster && (
          <span key={turBant} className="m2-gecis" aria-hidden="true">
            <span>{d.altin ? c("ALTIN SORU") : c("Tur {n}/{t}", { n: Math.max(1, d.tur), t: d.max_tur })}</span>
          </span>
        )}
        {sahne}
        {jokerBilgiMetni && ["cevap", "sonuc"].includes(d.faz) && (
          <p key={jokerBilgiMetni.anahtar} className="ks-joker-bilgi" role="status" aria-live="polite">{jokerBilgiMetni.metin}</p>
        )}
        {devamAn?.kazandi && d.faz === "cevap" && (
          // 953: DEVAM ödülü kazanıldı — altın parıltılı kart (yalnız bende; kazanamayınca karar satırında küçük not)
          (
            <p key={devamAn.anahtar} className="ks-devam-an ks-devam-an--kazandi" role="status" aria-live="polite">
              <span className="ks-devam-an-ikon" aria-hidden="true">🃏</span>
              <span className="ks-devam-an-yazi">
                {d.devam_elli ? (
                  // 954: garanti — kasa açılana kadar her soruda
                  <><b>{c("ÜCRETSİZ 50:50")}</b><span>{c("Hazine açılana kadar her soruda")}</span></>
                ) : (
                  <>
                    <b>{c("Joker kazandın!")}</b>
                    {devamAn.joker && <span>{c("{j} · bu soru için ücretsiz", { j: jokerBilgi(devamAn.joker, "kasa").ad })}</span>}
                  </>
                )}
              </span>
            </p>
          )
        )}
        {rakipJokerAn && d.faz === "cevap" && (
          // 951: rakip joker kullandı — ikon + kısa efekt (etkisi gizli; yalnız adı). Sahnenin üstünde, sayacı kapatmaz.
          <p key={rakipJokerAn.anahtar} className="ks-rakip-joker-an" role="status" aria-live="polite">
            <SkillRozeti tur={rakipJokerAn.tur} boyut={28} />
            <span>{rakipJokerAn.tur === "zaman_baskisi" ? c("Rakip süreni kısalttı!")
              : c("Rakip {j} kullandı", { j: jokerBilgi(rakipJokerAn.tur, "kasa").ad })}</span>
          </p>
        )}
      </div>
      {jokerYuva}
      {girisAktif && (
        <KasaGirisSahnesi hedef={Number(d.hedef ?? 50)} acmaMin={Number(d.acma_min ?? 0)} gecenMs={girisGecen}
                          tavan={Number(d.tavan ?? 0)} carpanYazi={carpanYazisi(d.devam_carpan, dil)}
                          bitisMs={girisBitis - farkRef.current} onSayi={girisSayi} onBitti={girisBitti} c={c} />
      )}
      {an && (
        <div className="ks-efekt" aria-hidden="true" key={an.id}>
          {anSonuc && (
            <UcanParcalar kokRef={kokRef} kaynak="bant" hedef="kasa" adet={anSonuc.buyuk ? 14 : 6}
                          gecikme={180} sure={anSonuc.buyuk ? 760 : 720} dagilim={anSonuc.buyuk ? 70 : 40} />
          )}
          {anSonuc?.sahipDegisti && anSonuc.anahtarA && (
            <UcanParcalar kokRef={kokRef} kaynak={anSonuc.anahtarDen ? `avatar-${anSonuc.anahtarDen}` : "kasa"}
                          hedef={`avatar-${anSonuc.anahtarA}`} adet={1} tur="anahtar" gecikme={1050} sure={850} dagilim={0} />
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
