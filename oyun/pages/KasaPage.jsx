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
import { KasaKadran, KasaSkor, KasaUst, KasaKarar, KasaSonucBandi, KasaAcKilit, kasaKararMetni } from "../components/KasaParcalari.jsx";
import JokerCubugu from "../components/JokerCubugu.jsx";
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
import { sayacKaymasi, sayacGoster, sayacSinirMs } from "../lib/zaman.js";
import { soruUzunlukSinifi } from "../lib/soruUzunluk.js";
import { titret } from "../lib/geriBildirim.js";
import { sesKilidiAc, sesTik, sesDogru, sesYanlis, sesDokunus, sesRakipBulundu, sesSoruGeldi,
  sesTurGecis, sesRakipCevapladi, sesCoin, sesRozet, sesJoker, sesXpDolma, sesSkill } from "../lib/ses.js";
import { KasaAcAni, KasaAltinYagmuru, UcanParcalar, kasaSeviye, KasaGirisSahnesi, KasaFinalSahnesi,
  KasaCifteBandi } from "../components/KasaEfekt.jsx";
import Konfeti from "../components/Konfeti.jsx";
import { hareketAzaltildiMi, QT_KIRILMA_MS } from "../tasarim/hareket.js";
import { QtDugme, QtIkon, QtModal, QtSayac, QtSik, QtSikler, QtSoruKarti, sinif } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";   // GeriSayim (3-2-1) görünümü
import "./DuelloPage.a.css";              // m2-bant / m2-hata / m2-onay-eylem / m2-giris ortak kalıpları
import "../styles/kasa.css";

const HARFLER = ["A", "B", "C", "D"];
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
const GIRIS_SAHNE_MS = 3000;   // maç başı giriş sahnesi: ilk sorunun gösterim başlangıcına kadar biter
const FINAL_SAHNE_MS = 4300;   // maç sonu açılış sahnesi (kazanan) — sonra MacSonuKutlama
const FINAL_KAPANIS_MS = 3200; // kaybeden: kasa kapanır/kararır
const CIFTE_MS = 1400;
const ARAMA_IPUCLARI = [
  "Aynı soruyu aynı anda cevaplarsınız.",
  "Tek başına bilen kasanın sahibi olur.",
  "İkiniz de bilirseniz kasa daha çok büyür.",
  "Kasa sendeyse soru gelmeden AÇ ya da DEVAM de.",
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
  const hedef = useAyar("kasa_hedef_puan", 50);
  const artis = useAyar("kasa_artis", 2);
  const ikisi = useAyar("kasa_ikisi_dogru_artis", 6);
  const maxTur = useAyar("kasa_max_tur", 36);
  const acmaMin = useAyar("kasa_acma_min", 10);
  const [dereceli, setDereceli] = useDereceliTercih();
  const location = useLocation();
  const [aramaBilgi] = useState(() => (location.state?.yenidenAra ? ceviri("Rakip bağlanamadı, yeni rakip aranıyor") : null));
  const [arama, setArama] = useState(() => Boolean(location.state?.yenidenAra));
  useEffect(() => {
    if (location.state?.yenidenAra) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!acik) return <BulunamadiPage kapaliMod />;
  return (
    <div className="m2-giris ks-giris">
      <header className="m2-giris-kafa ks-giris-kafa qt-h-gir">
        <span className="m2-giris-ikon" aria-hidden="true"><QtIkon ad="coin" boyut={40} /></span>
        <div className="m2-giris-yazi">
          <h1 className="qt-baslik-1">{ceviri("Kasa")} <span className="ks-deneysel">{ceviri("Deneysel")}</span></h1>
          <p>{ceviri("Ortada bir kasa büyür. Tek başına bilen kasayı alır; kasa sendeyse soru gelmeden AÇ ya da DEVAM de. {h} puana ilk ulaşan kazanır.", { h: hedef })}</p>
        </div>
      </header>
      <ul className="ks-kurallar">
        <li>{ceviri("Her soru kasaya +{n} ekler; ikiniz de bilirseniz +{m}.", { n: artis, m: ikisi })}</li>
        <li>{ceviri("Soruyu tek başına bilen kasanın sahibi olur.")}</li>
        <li>{ceviri("AÇ: kasa puanına yazılır, kasa sıfırlanır. DEVAM: kasa büyür ama kaybedebilirsin.")}</li>
        {acmaMin > 0 && <li>{ceviri("Kasa en az {m} olunca açılabilir.", { m: acmaMin })}</li>}
        <li>{ceviri("Jokerler: 50:50, Ek Süre, Zaman Baskısı, İkinci Şans.")}</li>
        <li>{ceviri("{t} tur sonunda kasa sahibine yazılır; eşitlikte Altın Soru.", { t: maxTur })}</li>
      </ul>
      <DereceliAnahtari dereceli={dereceli} onDegistir={setDereceli} />
      <div className="m2-giris-eylem">
        <QtDugme tamGenislik boyut="b" ikon="coin" onClick={() => { sesKilidiAc(); sesDokunus(); setArama(true); }}>
          {ceviri("Rakip ara")}
        </QtDugme>
        <p className="m2-giris-not">
          {dereceli ? ceviri("Klasik ile aynı lig puanı ve coin ödülü") : ceviri("Serbest: lig puanı yok, coin yarı.")}
        </p>
      </div>
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
  const hedef = useAyar("kasa_hedef_puan", 50);
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
  const { ceviri: c } = useDil();
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
      const { data, error } = await supabase.rpc("kasa_durum", { p_id: id });
      if (error) throw error;
      if (data) {
        const suan = Date.now();
        const ornekler = farkOrnekRef.current.filter((o) => suan - o.an < 60000);
        ornekler.push({ an: suan, fark: new Date(data.sunucu_zamani).getTime() - suan });
        farkOrnekRef.current = ornekler;
        farkRef.current = Math.max(...ornekler.map((o) => o.fark));
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
  const [turBant, setTurBant] = useState(null);
  const anZamanRef = useRef([]);
  const kokRef = useRef(null);
  const anBaslat = useCallback((yeni, adimlar) => {
    anZamanRef.current.forEach(clearTimeout);
    anZamanRef.current = [];
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

  // ---------------- 951: maç başı giriş sahnesi (sunucu saatine bağlı) ----------------
  // İlk sorunun gösterim başlangıcı (soru açılışı + gösterim payı) sahnenin bitişidir: sahne son 3 sn'yi kaplar,
  // 3-2-1 ondan önceki 3 sn'de sayar. Soru sahnenin altında açılır ama sayaç sahne bitince başlar (kayıp süre yok).
  const payiMs = Number(d?.sureler?.gosterim_payi_ms ?? 1500);
  const girisBitis = d && d.durum === "aktif" && !d.altin && Number(d.tur) <= 1
    ? (d.faz === "baslangic" && d.faz_bitis ? new Date(d.faz_bitis).getTime() + payiMs
      : d.faz === "cevap" && d.sureler?.gosterim_bas ? new Date(d.sureler.gosterim_bas).getTime() : null)
    : null;
  const sunucuSimdiMs = simdi + farkRef.current;
  const girisGecen = girisBitis != null ? sunucuSimdiMs - (girisBitis - GIRIS_SAHNE_MS) : null;
  const girisAktif = girisGecen != null && girisGecen >= 0 && girisGecen < GIRIS_SAHNE_MS && !d?.kopuk;
  const girisAktifRef = useRef(false);
  girisAktifRef.current = girisAktif;
  const girisSesRef = useRef(false);
  useEffect(() => {
    if (!girisAktif || girisSesRef.current) return;
    girisSesRef.current = true;
    sesTurGecis(); titret([10, 30, 10]);
    const z = [setTimeout(() => { sesRozet(); titret(20); }, 1150), setTimeout(sesCoin, 1700)];
    return () => z.forEach(clearTimeout);
  }, [girisAktif]);

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
    if (!f) return;
    const kazandim = f.kazandim;
    const sure = hareketAzaltildiMi() ? 1500 : kazandim ? FINAL_SAHNE_MS : FINAL_KAPANIS_MS;
    setFinalAn(f);
    // Zamanlayıcılar ref'te: d sonradan değişse de sahne yarıda kalmaz (yalnız sayfa kapanınca temizlenir)
    const z = kazandim
      ? [setTimeout(() => sesJoker(), 150), setTimeout(() => { sesRozet(); titret([30, 50, 40]); }, 1150),
         setTimeout(() => { sesCoin(); titret([40, 30, 60]); }, 2300), setTimeout(sesXpDolma, 2450), setTimeout(sesCoin, 2900)]
      : [setTimeout(sesTurGecis, 200), setTimeout(() => { sesYanlis(); titret(40); }, 1350)];
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
  const jokerZamanRef = useRef([]);
  const jokerZaman = (f, ms) => { jokerZamanRef.current.push(setTimeout(f, ms)); };
  useEffect(() => () => jokerZamanRef.current.forEach(clearTimeout), []);
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
      if (d.faz !== "sonuc") { anZamanRef.current.forEach(clearTimeout); setAn(null); }
      const yeniTur = oncekiTur !== `${d.tur}-${d.altin}`;
      const acildi = d.faz === "cevap" && d.son_karar?.ac && !d.son_karar.son;
      // Giriş sahnesi sürerken ilk sorunun bandı/sesi sahnenin altında kalmasın (sahne kendi sesini çalar)
      if (yeniTur && (d.faz === "karar" || d.faz === "cevap") && !girisAktifRef.current) setTurBant(Date.now());
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
      if (acildi) {
        // AÇ anı: kapı açılır, ışık patlar, altın açanın skor çubuğuna uçar (soru gösterim payının içinde biter)
        const k = d.son_karar;
        const benim = k.veren === d.ben;
        const veren = d.oyuncular.find((o) => o.id === k.veren);
        anBaslat({ tip: "ac", benim, deger: Number(k.deger ?? 0), seviye: kasaSeviye(k.deger, d.hedef),
                   kim: benim ? "ben" : "rakip", eskiPuan: Math.max(0, Number(veren?.puan ?? 0) - Number(k.deger ?? 0)) }, [
          [430, { sars: true }, () => { if (benim) sesRozet(); else sesTurGecis(); titret(benim ? [20, 40, 30] : 20); }],
          [860, { sars: false }],
          [1230, { varis: true }, sesCoin],
          [1600, "bitir", sesSoruGeldi],
        ]);
      }
    }
    if (d.faz === "cevap" && d.cevap?.rakip_cevapladi && !anRef.current.rakip) { anRef.current.rakip = true; sesRakipCevapladi(); }
  }, [d]);
  const tikRef = useRef(null);
  useEffect(() => {
    if (!d || !["cevap", "karar"].includes(d.faz) || d.cevap?.ben_cevapladim) return;
    const n = Math.ceil(gosterSn);
    if (n > 0 && n <= 3 && tikRef.current !== `${d.tur}-${d.faz}-${n}`) { tikRef.current = `${d.tur}-${d.faz}-${n}`; sesTik(n); }
  }, [gosterSn, d]);

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
      const { error } = await supabase.rpc("kasa_karar", { p_id: id, p_ac: ac });
      if (error) throw error;
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
                         donusYolu={y("/kasa")} donusMetni={c("Kasa'ya dön")} />
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
      : d.sonuc_neden === "hedef" ? (kazandim ? c("Kasayı açtın, {h} puana ulaştın!", { h: d.hedef }) : c("Rakip {h} puana ulaştı", { h: d.hedef }))
      : d.sonuc_neden === "tur_siniri" ? (kazandim ? c("{a}-{b} önde, kazandın", skor) : c("{a}-{b} geride, kaybettin", skor))
      : d.sonuc_neden === "altin" ? (kazandim ? c("Eşit — Altın Soru'yu sen bildin") : c("Eşit — Altın Soru'yu rakip bildi"))
      : null;
    // 951: son AÇ'ın yavaş sahnesi (kazanan: kapı açılır, altın patlar, skor hedefe sayar · kaybeden: kasa kapanır/kararır).
    // Geçişin ilk karesinde (effect durumu yazmadan önce) de sahne çizilir — kutlama bir kare bile görünmesin.
    const fin = finalAn ?? (oncekiDurumRef.current === "aktif" && d.durum === "bitti" ? kasaFinalVerisi(d) : null);
    if (fin) {
      return (
        <div className="ks-bitti ks-bitti--final">
          <KasaFinalSahnesi key="kasa-final" kazandim={fin.kazandim} deger={fin.deger} hedef={fin.hedef}
                            puanOnce={fin.puanOnce} puanSonra={fin.puanSonra} c={c} />
        </div>
      );
    }
    if (d.durum === "bitti" && !macSonuOzet) return <div className="ks-bitti"><div className="msk-bekle" aria-busy="true" /></div>;
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
            </>
          ) : null}
          eylemNotu={hata ? <span className="m2-hata" role="alert"><QtIkon ad="uyari" boyut={18} /> {hata}</span> : null}
          eylemler={{ onYeniMac: () => navigate(y("/kasa")), onAnaSayfa: () => navigate(y()), yeniMacEtiketi: c("Yeni Kasa maçı") }}
          rovans={null}   // rövanş ilk sürümde yok (Ida, 3 Eki 2026): "Yeni Kasa maçı" geniş düğme
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
  const turBantGoster = turBant && simdi - turBant < 900 && !anAc;
  const miniHareket = (anSonuc?.varis && !anSonuc.bitti
    ? (anSonuc.buyuk ? ["vardi", "patla"] : ["vardi"]).concat(anSonuc.anahtarVaris ? ["yeni-sahip"] : [])
    : [])
    // 951: her tur başında kısa sarsıntı · cevap süresinin son 3 sn'sinde titreme
    .concat(turBant && simdi - turBant < 650 ? ["tur-sars"] : [])
    .concat(sonUcSn ? ["gergin"] : []);
  const miniKadran = (
    <KasaKadran d={d} c={c} kucuk
                goster={anSonuc && !anSonuc.varis ? anSonuc.kasaOnce : undefined}
                sahipGoster={anSonuc?.sahipDegisti && !anSonuc.anahtarVaris ? anSonuc.sahipOnce : undefined}
                hareket={miniHareket}
                artis={anSonuc?.varis && !anSonuc.bitti ? { anahtar: anSonuc.id, n: anSonuc.artis, buyuk: anSonuc.buyuk } : null} />
  );

  let sahne = null;
  let jokerYuva = null;
  if (d.faz === "baslangic") {
    // 3-2-1 giriş sahnesinden ÖNCEKİ 3 sn'de sayar (sahne sunucu saatine bağlı, bkz. girisBitis)
    const kalanBas = girisBitis != null ? Math.max(0, (girisBitis - GIRIS_SAHNE_MS - sunucuSimdiMs) / 1000) : 0;
    sahne = (
      <>
        <KasaKadran d={d} c={c} />
        {kalanBas > 0 && <GeriSayim kalan={Math.min(3, kalanBas)} />}
      </>
    );
  } else if (d.faz === "karar") {
    sahne = <KasaKarar d={d} c={c} calisan={calisan} onKarar={kararVer} kalan={kopukDonukSn != null ? null : gosterSn} />;
  } else if (d.faz === "cevap" || d.faz === "sonuc") {
    const sonucMu = d.faz === "sonuc";
    const dogru = sonucMu && d.sonuc?.dogru_cevap != null ? Number(d.sonuc.dogru_cevap) : null;
    const benimCevap = sonucMu
      ? (d.sonuc?.benim_cevabim == null ? null : Number(d.sonuc.benim_cevabim))
      : kilitli && d.cevap?.benim_cevabim != null ? Number(d.cevap.benim_cevabim) : secim;
    const tiklanabilir = !sonucMu && !kilitli && kalanSn > 0 && secim === null && calisan !== "cevap" && !girisAktif;
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
    if (d.jokerli && !d.altin) {
      // Klasik ile aynı çubuk; sahne anahtarının DIŞINDA (faz değişince yeniden yüklenmez), sonuçta pasif kalır
      jokerYuva = (
        <div className={sinif("m1-joker-yuva ks-joker-yuva", jokerPasif && "m1-joker-yuva--pasif")}
             inert={jokerPasif || undefined} aria-hidden={jokerPasif || undefined}>
          <JokerCubugu macTur="kasa" macId={id} soruIndex={d.tur} kilit={kilitli}
                       surum={(d.rakip_joker ?? []).length} kalanSn={kalanSn}
                       onEtki={jokerEtkisi} onBilgi={jokerBilgiGoster} />
        </div>
      );
    }
    sahne = (
      <>
        {sonucMu ? <KasaSonucBandi d={d} c={c} />
          : kararMetni ? <p className="ks-karar-satir qt-h-gir" role="status">{kararMetni}</p>
          : <KasaAcKilit d={d} c={c} />}
        {sonucMu && <Konfeti aktif={Boolean(d.sonuc?.ben_dogru)} adet={d.sonuc?.rakip_dogru ? 12 : 18} />}
        {sonucMu && cifteAn && <KasaCifteBandi key={cifteAn} artis={Number(d.sonuc?.artis ?? d.ikisi_artis ?? 6)} c={c} />}
        {anAc && <KasaAcAni key={anAc.id} deger={anAc.deger} benim={anAc.benim} seviye={anAc.seviye} c={c} />}
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
         className={sinif("m2-mac ks-mac", `ks-mac--${d.faz}`, (gerilim || kararGerilim) && "qt-h-gerilim", d.altin && "ks-mac--altin",
                          anAc?.sars && "ks-mac--sars")}>
      <MacUstSerit onCik={() => setTerkOnay(true)} cikisEtiketi={c("Maçtan çık")}
                   rozet={c("Kasa · Deneysel")} />
      <KasaUst d={d} ben={ben} rakip={rakip} c={c} seviyeler={seviyeler} sayac={sayac}
               anahtar={anSonuc?.anahtarVaris && !anSonuc.bitti ? anSonuc.anahtarA : null}
               rakipJoker={["cevap", "sonuc"].includes(d.faz) && Array.isArray(d.rakip_joker) ? d.rakip_joker : []}
               onay={d.faz === "cevap" ? { [ben.id]: kilitli, [rakip.id]: Boolean(d.cevap?.rakip_cevapladi) } : {}} />
      <div className="ks-serit">
        <KasaSkor d={d} ben={ben} rakip={rakip} c={c}
                  puanGoster={anAc && !anAc.varis ? { [anAc.kim]: anAc.eskiPuan } : {}}
                  parla={anAc?.varis ? anAc.kim : null} />
        {(d.faz === "cevap" || d.faz === "sonuc") && miniKadran}
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
        <KasaGirisSahnesi hedef={Number(d.hedef ?? 50)} acmaMin={Number(d.acma_min ?? 0)} gecenMs={girisGecen} c={c} />
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
                          gecikme={520} sure={720} dagilim={80} />
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
              {t.karar === "ac" && <small>{t.karar_ben ? c("Kasayı açtın: +{k} puan", { k: t.acilan_deger }) : c("Rakip kasayı açtı: +{k} puan", { k: t.acilan_deger })}</small>}
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
