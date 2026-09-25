// ============================================================
// DÜELLO (TAKTİK MAÇI) — Paket 14, aşama 4
//
// Kurallar ve süreler SUNUCUDA (migration 205). Bu sayfa yalnız
// duello_durum()'un oyuncuya süzülmüş görünümünü çizer ve eylemleri iletir.
// Canlılık: duello_sinyal (Realtime, yalnız sürüm) + 1 sn'lik yoklama.
//
// Gizlilik: rakibin bot olup olmadığı istemciye hiç gelmez; bu sayfada
// "bot" kelimesi geçmez. Rakibin şıklar arasında gezinmesi gösterilmez —
// yalnız kilitlediği cevap sonuç fazında açıklanır.
//
// iOS: son can koyulaşması sayfa kabının ::before katmanıyla yapılır
// (position:fixed + transform aynı öğede YOK).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { createPortal } from "react-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import Ikon from "../components/Ikon.jsx";
import MacUstSerit from "../components/MacUstSerit.jsx";
import OyuncuAdiDugmesi from "../components/OyuncuAdiDugmesi.jsx";
import CerceveliAvatar from "../components/CerceveliAvatar.jsx";
import { useOyuncuSeviyeleri } from "../lib/oyuncuSeviye.js";
import { TepkiCubugu, useMacTepki } from "../components/Tepki.jsx";
import MacYukleniyor from "../components/MacYukleniyor.jsx";
import KategoriIkon from "../components/KategoriIkon.jsx";
import MacSonuKutlama from "../components/MacSonuKutlama.jsx";
import { useMacSonuOzet, ozettenSahne } from "../lib/macSonuOzet.js";
import OdulDokumu from "../components/OdulDokumu.jsx";
import DuelloOzet from "../components/DuelloOzet.jsx";
import DuelloTanitim, { duelloTanitimGoruldu } from "../components/DuelloTanitim.jsx";
import HesapGuvenceOnerisi from "../components/HesapGuvence.jsx";
import DereceliAnahtari from "../components/DereceliAnahtari.jsx";
import JokerSatinAlModal from "../components/JokerSatinAlModal.jsx";
import { useDereceliTercih } from "../lib/dereceli.js";
import { useDil } from "../lib/dilKanca.js";
import { hataMesaji } from "../lib/hata.js";
import { kategoriAdi } from "../lib/kategoriler.js";
import { unvanAdi } from "../lib/unvanlar.js";
import { JOKER_BILGI, SALDIRI_JOKERLERI, macJokerleri, skillSetiOku } from "../lib/jokerler.js";
import { y } from "../lib/yol.js";
import { coinTazele } from "../lib/coin.js";
import { ayar } from "../lib/ayarlar.js";
import AramaSahnesi, { ARAMA_GECIS_MS } from "../components/AramaSahnesi.jsx";
import { sesKilidiAc, sesTik, sesDogru, sesYanlis, sesJoker, sesKazandin, sesKaybettin, sesDokunus, sesRakipBulundu, sesCanKaybi,
  sesOnYukle, sesKategoriGeriSayim, sesSoruGeldi, sesTurGecis, sesSkill,
  sesBeraberlik, sesKategoriSecildi, sesRakipCevapladi } from "../lib/ses.js";
import { titret } from "../lib/geriBildirim.js";
import { tt } from "../lib/dil.js";
import { useOyunModu } from "../lib/oyunModu.js";
import SkillSeti from "../components/SkillSeti.jsx";
// Düello 1.0 (surum = 2) arayüzü — eski arayüz aşağıda aynen durur.
import { V2Ust, V2Kategori, V2Cevap, V2Sonuc, V2Skill, V2Gecmis } from "../components/DuelloV2.jsx";
// Tasarım A görünümü (m2- önekli). Eski duello-v2.css artık yüklenmez (dosya Faz 4'e kadar durur).
import "./DuelloPage.a.css";
import { QtBosDurum, QtDugme, QtIkon, QtModal, QtSayac, QT_KIRILMA_MS, sinif } from "../tasarim/index.js";
import { rpcDene } from "../lib/rpcDene.js";
import { sayacKaymasi, sayacGoster, sayacSinirMs } from "../lib/zaman.js";

const HARFLER = ["A", "B", "C", "D"];

// Savunma jokerlerinin Düello'daki adları (Ek Süre +5 sn; sunucu ayarı duello_ek_sure_sn)
const SAVUNMA_AD = { elli: "50:50", sure: tt("Ek Süre"), soru_degistir: tt("Soru Değiştir"), ikinci_sans: tt("İkinci Şans") };
const SAVUNMA_ACIKLAMA = {
  elli: tt("İki yanlış şık silinir"),
  sure: tt("Cevap süresine 5 saniye ekler"),
  soru_degistir: tt("Aynı kategoriden başka soru gelir"),
  ikinci_sans: tt("İlk yanlışta aynı süre içinde bir kez daha denersin"),
};
const SALDIRI_AD = { zaman_baskisi: tt("Zaman Baskısı") };

// Düelloda can sayısı (sunucu 3 canla başlatır; Kalpler'in varsayılanıyla aynı)
const DUELLO_CAN = 3;
// Bu istemcinin çizebildiği en yüksek Düello sürümü. 23 Eyl 2026: canlıdaki eski paket
// (yalnız v1 arayüzü) v2 maçını v1 gibi çizdi — saldıran tarafın şıkları kapalı kaldı.
// Tanımadığı sürümde maç çizilmez, yenileme istenir.
const DUELLO_EN_YUKSEK_SURUM = 2;

// Canlılık (23 Eyl 2026, ölçüldü): her duello_durum okuması sunucuda satır kilidi +
// iki yazma (hız sınırı sayacı, last_seen) yapar. Eskiden saniyede bir yoklama +
// her sinyalde okuma + her okumada duello_baglanti vardı (oyuncu başına ~1,4 durum
// + 1,4 bağlantı çağrısı/sn). Şimdi: Realtime sinyali ASIL yol; faz bitişinde tek
// okuma (sunucu fazı tembel ilerletir); yoklama yalnız yedek.
const YEDEK_YOKLAMA_MS = 4000;     // kanal bağlıyken
const KANALSIZ_YOKLAMA_MS = 1000;  // kanal bağlı değilken (eski davranış)
// Faz bitişine yakın yedek yoklama sıklaşır (Ida, 24 Eyl 2026): Realtime sinyali kaçarsa yeni faz
// 4 sn beklemeden görünsün. Yalnız bitişten önceki son SON_YOKLAMA_PENCERE_MS içinde ve sonraki 2 sn'de.
const SON_YOKLAMA_PENCERE_MS = 1500;
const SON_YOKLAMA_MS = 500;
const BAGLANTI_MS = 5000;          // duello_baglanti (kopukluk bandı) aralığı
// duello2_ilerlet cevap fazını kişisel bitiş + duello2_cevap_tolerans_sn (1 sn) sonra kapatır.
const CEVAP_TOLERANS_MS = 1100;
const SINYAL_BIRLESTIR_MS = 30;    // aynı anda gelen Realtime sinyallerini tek okumada birleştir

function Kalpler({ can, max = DUELLO_CAN, sonCan }) {
  return (
    <span className={`bd-duello-kalpler ${sonCan ? "son" : ""}`} aria-label={`${can}`}>
      {Array.from({ length: Math.max(max, can) }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"
             className={i < can ? "dolu" : "bos"}>
          <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.6 0 5.7 3.8 4.2 7.2C19.5 16.4 12 21 12 21z" />
        </svg>
      ))}
    </span>
  );
}

// ------------------------------------------------------------ giriş + arama
// Tasarım A: tek sütun, mod rengi pembe başlık kartı + kural satırları + tek birincil eylem.
const KURAL_V2 = [
  { ikon: "kalp", metin: "3 can, en çok 10 tur" },
  { ikon: "terazi", metin: "Biri doğru öteki yanlış/yanıtsız → yanlış olan 1 can kaybeder; ikisi aynıysa nötr" },
  // 470: zayıf nokta + kategori limiti (Ida, 24 Eyl 2026) — kısa kural kartı
  { ikon: "uyari", metin: "Zayıf nokta: rakibin en zayıf kategorisini seçersen ve rakip bilirse canı SEN kaybedersin" },
  { ikon: "kilit", metin: "Her kategori maçta en çok 3 kez, üst üste seçilemez" },
  { ikon: "saat", metin: "Beraberlik yok: can eşitse uzatma, kategori rastgele" },
  { ikon: "yildiz", metin: "Maçta 4 joker: aynı joker en çok 2 kez, soru başına 1" },
];
const KURAL_V1 = [
  { ikon: "kalp", metin: "3 can, en çok 10 tur" },
  { ikon: "uyari", metin: "Rakip en zayıf kategorisinde bilirse canı SEN kaybedersin" },
  { ikon: "kilit", metin: "Aynı kategori üst üste seçilemez, maçta en çok 2 kez" },
];

function DuelloGiris() {
  const navigate = useNavigate();
  const { ceviri } = useDil();
  const [dereceli, setDereceli] = useDereceliTercih();
  // 410 (Ajan I): rakip düelloya bağlanamadı → sunucu cezasız iptal etti, DuelloMac buraya
  // { yenidenAra } ile döndü: arama kısa bilgiyle kendiliğinden başlar (durum bir kez tüketilir).
  const location = useLocation();
  const [aramaBilgi] = useState(() => (location.state?.yenidenAra ? ceviri("Rakip bağlanamadı, yeni rakip aranıyor") : null));
  const [arama, setArama] = useState(() => Boolean(location.state?.yenidenAra));
  useEffect(() => {
    if (location.state?.yenidenAra) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tanitim, setTanitim] = useState(null);   // null | "arama" (bitince aramaya geç) | "kurallar"
  // Düello 1.0: oyuncunun yeni maçının sürümü (genel bayrak ya da test listesi —
  // duello_surum_benim). Giriş metinleri ve tanıtım ona göre. Okunamazsa eski kurallar (1).
  const [surum, setSurum] = useState(1);
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("duello_surum_benim");
        if (error) throw error;
        if (aktif) setSurum(Number(data) === 2 ? 2 : 1);
      } catch (e) {
        console.warn("[Bildim] duello sürümü okunamadı:", e?.message ?? e);
      }
    })();
    return () => { aktif = false; };
  }, []);
  const v2 = surum === 2;
  const kurallar = v2 ? KURAL_V2 : KURAL_V1;

  return (
    <div className="m2-giris">
      <header className="m2-giris-kafa qt-h-gir">
        <span className="m2-giris-ikon" aria-hidden="true"><QtIkon ad="duello" boyut={40} /></span>
        <div className="m2-giris-yazi">
          <h1 className="qt-baslik-1">{ceviri("Düello")}</h1>
          <p>{v2
            ? ceviri("Sırayla kategori seçin, aynı soruyu aynı anda cevaplayın. Yalnız biri bilirse öteki can kaybeder.")
            : ceviri("Sırayla birbirinize soru gönderin. Rakibin zayıf kategorisini bul, oradan vur.")}</p>
        </div>
      </header>
      <ul className="m2-giris-kurallar" aria-label={ceviri("Taktik Maçı")}>
        {kurallar.map((k) => (
          <li key={k.metin}>
            <span className="m2-giris-kural-ikon" aria-hidden="true"><QtIkon ad={k.ikon} boyut={20} /></span>
            <span>{ceviri(k.metin)}</span>
          </li>
        ))}
      </ul>
      <DereceliAnahtari dereceli={dereceli} onDegistir={setDereceli} />
      <SkillSeti macTur="duello" />
      <div className="m2-giris-eylem">
        <QtDugme tamGenislik boyut="b" ikon="duello"
                 onClick={() => { sesKilidiAc(); sesDokunus(); if (duelloTanitimGoruldu(surum)) setArama(true); else setTanitim("arama"); }}>
          {ceviri("Rakip ara")}
        </QtDugme>
        <p className="m2-giris-not">
          {dereceli ? ceviri("Klasik ile aynı lig puanı ve coin ödülü") : ceviri("Serbest: lig puanı yok, coin yarı.")}
        </p>
        {/* Paket 20 IV.1: kurallar her zaman yeniden açılabilir */}
        <QtDugme tur="hayalet" boyut="k" ikon="bilgi" onClick={() => setTanitim("kurallar")}>{ceviri("Kurallar nasıl işliyor?")}</QtDugme>
      </div>
      {tanitim && <DuelloTanitim surum={surum} onKapat={() => { const aramaya = tanitim === "arama"; setTanitim(null); if (aramaya) setArama(true); }} />}
      {arama && (
        <DuelloArama
          dereceli={dereceli}
          ipuclari={v2 ? ARAMA_IPUCLARI_V2 : ARAMA_IPUCLARI}
          bilgi={aramaBilgi}
          onBulundu={(id) => navigate(y(`/duello/${id}`))}
          onIptal={() => setArama(false)}
        />
      )}
    </div>
  );
}

// Arama ekranında dönen ipuçları (Paket 29 B) — yalnız sunum, eşleştirmeye dokunmaz.
// "15 sn'yi geçerse botla eşleştireceğiz" satırı BİLEREK yok: rakip gizli bot olur
// ve bu sayfa botu asla ele vermez (bkz. dosya başı gizlilik notu).
const ARAMA_IPUCLARI = [
  "Rakibinin zayıf kategorisini bul, oradan vur.",
  "Aynı kategoriyi üst üste seçemezsin.",
  "Rakip en zayıf kategorisinde bilirse canı SEN kaybedersin",
  "Saldırı hazırlığında joker kullanabilirsin.",
];
// Düello 1.0 ipuçları (İngilizcesi ceviri/mac.js › Düello (M2)).
const ARAMA_IPUCLARI_V2 = [
  "Aynı soruyu aynı anda cevaplarsınız.",
  "Rakibin ne cevapladığını göremezsin, yalnız cevapladığını görürsün.",
  "Beraberlik yok: can eşitse uzatma.",
  "Kategori seçerken süre dolarsa rastgele gelir.",
  "Rakibin zayıf noktasına saldırmak risklidir: bilirse canı sen kaybedersin.",
];
const IPUCU_SN = 3;
// Paket 41 F: düello aramasının üst sınırı (Klasik'teki gibi sonsuz bekleme yok)
const DUELLO_ARAMA_SINIR_SN = 60;

function DuelloArama({ dereceli, onBulundu, onIptal, ipuclari = ARAMA_IPUCLARI, bilgi = null }) {
  const { ceviri } = useDil();
  const [gecen, setGecen] = useState(0);
  const ipucu = Math.floor(gecen / IPUCU_SN) % ipuclari.length;
  const [hata, setHata] = useState(null);
  // Paket 30 E: bulunma anı — rakip kartı dolar, ~1 sn sonra düelloya geçilir
  const [bulundu, setBulundu] = useState(false);
  const [rakip, setRakip] = useState(null);
  const [ezeli, setEzeli] = useState(null);
  const bittiRef = useRef(false);
  const [deneme, setDeneme] = useState(0);   // Paket 41 F: Tekrar dene aramayı baştan başlatır
  const bulunduRef = useRef(onBulundu);
  bulunduRef.current = onBulundu;
  const gecisRef = useRef(null);

  // Eşleşme mantığı DEĞİŞMEDİ: aynı RPC, aynı 1 sn aralık. Yalnız bulunduktan sonra
  // rakibin kartı bir kez (duello_durum — oyuncuya süzülmüş görünüm) okunur.
  const karsilas = useCallback(async (duelloId) => {
    setBulundu(true);
    sesRakipBulundu();
    gecisRef.current = window.setTimeout(() => bulunduRef.current(duelloId), ARAMA_GECIS_MS);
    try {
      const { data, error } = await supabase.rpc("duello_durum", { p_id: duelloId });
      if (error) throw error;
      const r = data?.oyuncular?.find((o) => o.id !== data.ben);
      if (r) setRakip(r);
      const e = data?.ezeli;
      if (e && Number(e.ben) + Number(e.rakip) > 0) {
        setEzeli(e.ben > e.rakip
          ? ceviri("Bu oyuncuyla {ben}-{rakip} öndesin", e)
          : e.ben < e.rakip
            ? ceviri("Bu oyuncuyla {ben}-{rakip} geridesin", e)
            : ceviri("Bu oyuncuyla {ben}-{rakip} berabersiniz", e));
      }
    } catch (e) {
      // Kart dolmasa da düelloya geçilir (zamanlayıcı zaten kurulu).
      console.warn("[Bildim] karşılaşma kartı okunamadı:", e?.message ?? e);
    }
  }, [ceviri]);

  useEffect(() => () => window.clearTimeout(gecisRef.current), []);

  useEffect(() => {
    let iptal = false;
    const dene = async () => {
      if (iptal || bittiRef.current) return;
      try {
        const { data, error } = await supabase.rpc("duello_ara", { p_dereceli: dereceli });
        if (error) throw error;
        if (data && !bittiRef.current) {
          bittiRef.current = true;
          karsilas(data);
        }
      } catch (e) {
        console.error("[Bildim] duello_ara:", e);
        setHata(ceviri("Rakip aranamadı. Bağlantını kontrol edip tekrar dene."));
        bittiRef.current = true;
        clearInterval(zaman);   // hata: sayaç ve yoklama durur
      }
    };
    dene();
    let sn = 0;
    const zaman = setInterval(() => {
      sn += 1;
      if (sn >= DUELLO_ARAMA_SINIR_SN && !bittiRef.current) {
        clearInterval(zaman);
        bittiRef.current = true;
        setHata(ceviri("Şu an rakip bulunamadı. Birazdan tekrar dene."));
        rpcDene("duello_aramadan_cik");
        return;
      }
      setGecen((g) => g + 1); dene();
    }, 1000);
    return () => {
      iptal = true;
      clearInterval(zaman);
      if (!bittiRef.current) rpcDene("duello_aramadan_cik");
    };
  }, [dereceli, ceviri, karsilas, deneme]);

  const yenidenDene = () => { bittiRef.current = false; setHata(null); setGecen(0); setDeneme((n) => n + 1); };

  // Ajan I: tam ekran arama sahnesi (Klasik ile aynı bileşen). Bulunduktan sonra kapatılamaz.
  return (
    <AramaSahnesi
      mod="duello"
      dereceli={dereceli}
      gecen={gecen}
      durum={bulundu ? "bulundu" : hata ? "hata" : "ariyor"}
      rakip={bulundu ? rakip : null}
      ezeli={ezeli}
      bilgi={bilgi}
      hata={hata}
      // key değişince satır yeniden takılır → giriş animasyonu her ipucunda oynar
      alt={<p key={ipucu} className="qt-h-gir" aria-live="polite">{ceviri(ipuclari[ipucu])}</p>}
      onIptal={onIptal}
      onTekrar={yenidenDene}
    />
  );
}

// ------------------------------------------------------------ rövanş bekleme (Paket 30 C)
// Rakibin avatarı, geri sayım halkası (süre oyun_ayarlari.duello_rovans_sn), Vazgeç.
// Sunucuda isteği geri çeken RPC: duello_rovans_iptal (Vazgeç).
const ROVANS_HALKA_R = 44;
const ROVANS_HALKA_CEVRE = 2 * Math.PI * ROVANS_HALKA_R;

function RovansBekleme({ rakip, baslangic, sureSn, simdi, ceviri, onVazgec }) {
  const kalanMs = Math.max(0, baslangic + sureSn * 1000 - simdi);
  const kalanSn = Math.ceil(kalanMs / 1000);
  const oran = sureSn > 0 ? kalanMs / (sureSn * 1000) : 0;
  return (
    <QtModal acik onKapat={onVazgec} baslik={ceviri("Rövanş isteği gönderildi")} className="m2-rovans"
             altlik={<QtDugme tur="ikincil" tamGenislik onClick={onVazgec}>{ceviri("Vazgeç")}</QtDugme>}>
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
          {ceviri("Rövanş isteği gönderildi — {ad} yanıtlıyor…", { ad: rakip?.gorunen_ad ?? "" })}
        </p>
        <p className="m2-rovans-sayac qt-sayi" role="timer" aria-label={ceviri("{0} saniye kaldı", { 0: kalanSn })}>
          {ceviri("{0} sn", { 0: kalanSn })}
        </p>
      </div>
    </QtModal>
  );
}

// ------------------------------------------------------------ maç
function DuelloMac({ id }) {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { ceviri } = useDil();
  const c2 = ceviri;   // Düello 1.0 metinleri: İngilizcesi ceviri/mac.js › Düello (M2)
  const [d, setD] = useState(null);
  const seviyeler = useOyuncuSeviyeleri((d?.oyuncular ?? []).map((o) => o.id));
  const [hata, setHata] = useState(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(null);
  const [baglanti, setBaglanti] = useState(null);   // Paket 24 · A.4: rakip kopuk mu
  const [simdi, setSimdi] = useState(Date.now());
  const [secim, setSecim] = useState(null);
  const [ikinciSansElendi, setIkinciSansElendi] = useState([]);
  const [calisan, setCalisan] = useState(null);
  const [terkOnay, setTerkOnay] = useState(false);
  // Paket 27 C: maç içinde satın alınacak joker türü (null = pencere kapalı)
  // Paket 28 D: { tur, yalnizAl }. `yalnizAl` kategori ekranında true —
  // joker envantere girer, kullanımı Saldırı Hazırlığı'nda yapılır.
  const [satinAlinacak, setSatinAlinacak] = useState(null);
  // Faz değişince (soru bitti, kategori ekranı geldi) açık satın alma penceresi kapanır — eski soruya ait
  // "Al ve kullan" yeni fazın ekranını örtüyordu (canlı oyuncu testi, 24 Eyl).
  const satinAlFazi = d ? `${d.tur}:${d.saldiri_sirasi}:${d.saldiran}:${d.faz}:${d.uzatma}` : "";
  useEffect(() => { setSatinAlinacak(null); }, [satinAlFazi]);
  const [dokumToplam, setDokumToplam] = useState(null);   // Paket 20 I.3: sunucu dökümünün toplamı
  // Paket 40 D: öteki modlar gibi maç sürerken sekme/üst çubuk gizlenir (jokerleri örtüyordu).
  useOyunModu(d?.durum === "aktif");

  // 410 (Ajan I): düello ekranına geliş + bağlanmayan rakip. Kural SUNUCUDA (duello_giris):
  // aramayla kurulan düelloda rakip duello_baglanma_sn içinde gelmezse düello cezasız iptal
  // (kazanan/ödül yok). Bekleyen oyuncu yeniden aramaya döner. Rakip gelince yoklama durur.
  useEffect(() => {
    let aktif = true;
    let zamanlayici = null;
    const sor = async () => {
      if (!aktif) return;
      try {
        const { data, error } = await supabase.rpc("duello_giris", { p_id: id });
        if (error) throw error;
        if (!aktif) return;
        if (data?.durum === "iptal" && data?.baglanmayan && data.baglanmayan !== user?.id) {
          navigate(y("/duello"), { replace: true, state: { yenidenAra: true } });
          return;
        }
        if (data?.rakip_geldi || data?.durum !== "aktif") return;
      } catch (e) {
        console.warn("[Bildim] duello_giris:", e?.message ?? e);
      }
      zamanlayici = window.setTimeout(sor, 2000);
    };
    sor();
    return () => { aktif = false; window.clearTimeout(zamanlayici); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [gorevler, setGorevler] = useState([]);   // Paket 37 D.1: sahnede Detay'ın üstünde
  // Rövanş bekleme penceresi ve sunucu tarafındaki geri çekme durumu.
  const [rovBas, setRovBas] = useState(null);          // bekleme başladığı yerel an (ms)
  const [rovVazgec, setRovVazgec] = useState(false);
  const [rovSonuc, setRovSonuc] = useState(null);      // null | "cevapsiz" | "red"
  const [rovSn, setRovSn] = useState(60);              // oyun_ayarlari.duello_rovans_sn
  // Paket 34: jokerler geçici olarak ücretsiz ve sınırsız (oyun_ayarlari.jokerler_ucretsiz)
  const [jokerSerbest, setJokerSerbest] = useState(false);
  const [skillEfekt, setSkillEfekt] = useState(null);
  const [skillDeger, setSkillDeger] = useState({ ek: 5, baski: 5 });
  const skillDurumRef = useRef(null);
  const skillTimerRef = useRef(null);
  useEffect(() => {
    let aktif = true;
    ayar("jokerler_ucretsiz", 0).then((v) => { if (aktif) setJokerSerbest(Number(v) > 0); }, () => {});
    Promise.all([ayar("duello_ek_sure_sn", 5), ayar("duello_zaman_baskisi_sn", 10)])
      .then(([ek, toplam]) => { if (aktif) setSkillDeger({ ek: Number(ek), baski: Math.max(0, 15 - Number(toplam)) }); });
    return () => { aktif = false; };
  }, []);
  const farkRef = useRef(0); // sunucu saati - istemci saati (ms)
  const fazBitisRef = useRef(null); // sunucu saatiyle geçerli faz bitişi (ms) — yedek yoklama için
  const farkOrnekRef = useRef([]); // son 60 sn'nin saat farkı örnekleri
  const yukleniyorRef = useRef(false);
  const dImzaRef = useRef("");
  const kanalHazirRef = useRef(false);   // Realtime kanalı SUBSCRIBED mi
  // 542: maç içi tepki — aynı düello kanalında broadcast (DB'ye yazılmaz). Açık mı: tepki_durumu (tek okuma).
  const duelloKanalRef = useRef(null);
  const tepkiRakipId = (d?.oyuncular ?? []).find((o) => o.id !== d?.ben)?.id ?? null;
  const tepki = useMacTepki({ macTur: "duello", macId: id, benId: user?.id, rakipId: tepkiRakipId,
                             kanal: () => duelloKanalRef.current, etkin: Boolean(d?.surum === 2 && d?.durum === "aktif") });
  const tepkiAlRef = useRef(null);
  tepkiAlRef.current = tepki.al;
  const sinyalZamanRef = useRef(null);
  const sonHamleRef = useRef(null);
  const bitisSesRef = useRef(false);
  // A.3: yeni maç sonu sahnesinin verisi (tek çağrı: mac_sonu_ozet) — düello bitince bir kez okunur.
  const { ozet: macSonuOzet } = useMacSonuOzet(d?.durum === "bitti" && d?.id ? `duello:${d.id}` : null);
  const sonTikRef = useRef(null);
  const haleSureRef = useRef({ anahtar: "", sn: 0 });
  // Tasarım A anları (yalnız sunum)
  const sayimRef = useRef(null);            // kategori geri sayımı: son çalınan saniye
  const gecisRef = useRef(null);            // son görülen faz/tur/soru (geçiş ve soru sesi)
  const soruSesTimerRef = useRef(null);
  const kirilmaTimerRef = useRef(null);
  const canRef = useRef({});
  const [kayip, setKayip] = useState({});   // { oyuncuId: anahtar } → kalp kırılır
  const [kiriliyor, setKiriliyor] = useState([]);   // 50:50 ile kırılan şıklar
  const [turGecis, setTurGecis] = useState(null);   // geçiş bandı anahtarı
  const [sonKullanilan, setSonKullanilan] = useState(null);   // { tur, anahtar } skill anı   // savunma halesi: fazın toplam süresi (ek süreyle büyür)

  // Performans (23 Eyl 2026, ölçüldü): durum okuması tek kanaldan geçer.
  //  · Yolda bir okuma varken gelen istek (Realtime sinyali, eylem sonrası tazeleme)
  //    ESKİDEN YUTULUYORDU: yoldaki okuma değişiklikten ÖNCE başlamışsa ekran eski
  //    durumu çiziyor, yenisi 1 sn'lik yoklamayı bekliyordu (ölçüm: p95 0,6–1,9 sn,
  //    iki oyuncu arası fark p95 1,35 sn). Artık istek sıraya girer: yoldaki biter
  //    bitmez TEK bir tazeleme daha yapılır; bekleyen herkes onun sonucunu bekler.
  //  · duello_baglanti (kopukluk bandı) her okumada değil, BAGLANTI_MS'de bir sorulur.
  const yukleSozRef = useRef(null);      // yoldaki okuma
  const tekrarSozRef = useRef(null);     // yoldakinin ardından sıraya giren tek okuma
  const yukleRef = useRef(null);
  const sonYukleRef = useRef(0);         // son okumanın başladığı an (yoklama seyreltme)
  const sonBaglantiRef = useRef(0);
  const yukleTek = useCallback(async () => {
    yukleniyorRef.current = true;
    sonYukleRef.current = Date.now();
    try {
      // Paket 24 · A.4: bağlantı durumu AYNI ANDA sorulur — ek gecikme olmaz.
      // duello_durum 150 satırlık bir fonksiyon; onu genişletmek yerine ayrı, ucuz çağrı.
      const baglantiSor = Date.now() - sonBaglantiRef.current >= BAGLANTI_MS;
      if (baglantiSor) sonBaglantiRef.current = Date.now();
      const [durumCevap, baglantiCevap] = await Promise.all([
        supabase.rpc("duello_durum", { p_id: id }),
        baglantiSor ? supabase.rpc("duello_baglanti", { p_id: id }) : Promise.resolve(null),
      ]);
      const { data, error } = durumCevap;
      if (error) throw error;
      if (data) {
        const onceki = skillDurumRef.current;
        const faz = `${data.tur}:${data.saldiri_sirasi}:${data.faz}`;
        let efekt = null;
        if (data.surum === 2) {
          // Düello 1.0: skill izleri kişisel bitişten ve cevap nesnesinden okunur.
          const cv = data.cevap ?? {};
          const bitis = cv.benim_bitis ? new Date(cv.benim_bitis).getTime() : null;
          const elli = Array.isArray(cv.elli_kapali) ? cv.elli_kapali.length : 0;
          if (onceki?.faz === faz) {
            if (onceki.soru_anahtar && data.soru?.soru && onceki.soru_anahtar !== data.soru.soru) efekt = { tur: "soru_degistir", asama: "giriyor" };
            else if (!onceki.elli && elli) efekt = { tur: "elli" };
            else if (onceki.bitis && bitis && bitis - onceki.bitis > 1500) efekt = { tur: "sure", deger: Number(data.sureler?.ek_sure ?? skillDeger.ek) };
            else if (onceki.bitis && bitis && onceki.bitis - bitis > 1500) efekt = { tur: "zaman_baskisi", deger: Math.round((onceki.bitis - bitis) / 1000) };
          }
          skillDurumRef.current = { faz, bitis, elli, soru_anahtar: data.soru?.soru };
        } else if (onceki?.faz === faz && !onceki.zaman_baskisi && data.zaman_baskisi) efekt = { tur: "zaman_baskisi", deger: skillDeger.baski };
        else if (onceki?.faz === faz && !onceki.ek_sure && data.ek_sure) efekt = { tur: "sure", deger: skillDeger.ek };
        else if (onceki?.faz === faz && !(onceki.elli_kapali?.length) && data.elli_kapali?.length) efekt = { tur: "elli" };
        else if (onceki?.faz === faz && onceki.soru_anahtar && data.soru?.soru && onceki.soru_anahtar !== data.soru.soru) efekt = { tur: "soru_degistir", asama: "giriyor" };
        if (data.surum !== 2) skillDurumRef.current = { faz, zaman_baskisi: Boolean(data.zaman_baskisi), ek_sure: Boolean(data.ek_sure), elli_kapali: data.elli_kapali, soru_anahtar: data.soru?.soru };
        if (efekt) {
          setSkillEfekt(efekt);
          clearTimeout(skillTimerRef.current);
          skillTimerRef.current = setTimeout(() => setSkillEfekt(null), 720);
        }
        // Saat farkı: her örnek yanıtın yolda geçen süresi kadar eksik ölçer (sunucu saati
        // yanıt çıkarken alınır, istemci onu geç görür). En az gecikmeli örnek = en büyük fark;
        // son 60 sn'nin en büyüğü kullanılır — tek bir yavaş yanıt sayacı ileri atmasın.
        const suan = Date.now();
        const ornekler = farkOrnekRef.current.filter((o) => suan - o.an < 60000);
        ornekler.push({ an: suan, fark: new Date(data.sunucu_zamani).getTime() - suan });
        farkOrnekRef.current = ornekler;
        farkRef.current = Math.max(...ornekler.map((o) => o.fark));
        // Durum değişmediyse state'e yeni nesne yazılmaz: bütün maç ağacı boşuna
        // yeniden çizilmesin (sunucu_zamani her yanıtta farklıdır, karşılaştırmaya girmez).
        const imza = JSON.stringify({ ...data, sunucu_zamani: null });
        if (imza !== dImzaRef.current) {
          dImzaRef.current = imza;
          setD(data);
        }
        setYuklemeHatasi(null);
      }
      if (!baglantiCevap) {
        // Bu okumada bağlantı sorulmadı: son değer geçerli.
      } else if (baglantiCevap.error) {
        console.warn("[Bildim] duello_baglanti başarısız:", baglantiCevap.error.message);
      } else {
        const b = baglantiCevap.data ?? null;
        setBaglanti(b ? { ...b, alindi: Date.now() } : null);
        // Kopukken geri sayım bandı sık tazelensin (sunucu kopukken fazları dondurur).
        if (b?.kopuk) sonBaglantiRef.current = Date.now() - BAGLANTI_MS + 1000;
      }
    } catch (e) {
      console.error("[Bildim] düello yüklenemedi:", e);
      setYuklemeHatasi(true);
    } finally {
      yukleniyorRef.current = false;
    }
  }, [id, ceviri, skillDeger]);

  const yukle = useCallback(() => {
    if (yukleSozRef.current) {
      if (!tekrarSozRef.current) {
        tekrarSozRef.current = yukleSozRef.current.then(() => {
          tekrarSozRef.current = null;
          return yukleRef.current();
        });
      }
      return tekrarSozRef.current;
    }
    const soz = yukleTek().finally(() => { yukleSozRef.current = null; });
    yukleSozRef.current = soz;
    return soz;
  }, [yukleTek]);
  yukleRef.current = yukle;

  // İlk yükleme + Realtime sinyali + yoklama
  useEffect(() => {
    sesKilidiAc();
    yukle();
    const kanal = supabase
      .channel(`duello-${id}`)
      .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "duello_sinyal", filter: `duello_id=eq.${id}` },
          () => {
            // Aynı işlemde birden çok sinyal_ver çağrısı (ör. cevap + çözümleme) sinyalleri
            // aynı anda getirir: SINYAL_BIRLESTIR_MS içinde gelenler tek okumada birleşir.
            if (sinyalZamanRef.current) return;
            sinyalZamanRef.current = setTimeout(() => { sinyalZamanRef.current = null; yukle(); }, SINYAL_BIRLESTIR_MS);
          })
      // 542: rakibin (ya da botun) tepkisi — alıcı sınırı ve gizleme useMacTepki'de
      .on("broadcast", { event: "tepki" }, (m) => { try { tepkiAlRef.current?.(m?.payload); } catch { /* tepki maçı bozmaz */ } })
      .subscribe((durum) => {
        const hazir = durum === "SUBSCRIBED";
        // Kanal (yeniden) bağlandığında arada kaçmış sinyal olabilir: bir kez tazele.
        if (hazir && !kanalHazirRef.current) yukle();
        kanalHazirRef.current = hazir;
      });
    duelloKanalRef.current = kanal;
    // Yedek yoklama: kanal bağlıyken seyrek, değilken saniyede bir. Son okumadan beri
    // geçen süreye bakılır — sinyal ya da eylemle yeni okunduysa yoklama atlanır.
    const yoklama = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const kalanMs = fazBitisRef.current == null ? Infinity : fazBitisRef.current - (Date.now() + farkRef.current);
      const bitiseYakin = kalanMs <= SON_YOKLAMA_PENCERE_MS && kalanMs > -2000;
      const aralik = bitiseYakin ? SON_YOKLAMA_MS : kanalHazirRef.current ? YEDEK_YOKLAMA_MS : KANALSIZ_YOKLAMA_MS;
      if (Date.now() - sonYukleRef.current >= aralik - 50) yukle();
    }, SON_YOKLAMA_MS);
    const gorunur = () => { if (document.visibilityState === "visible") yukle(); };
    document.addEventListener("visibilitychange", gorunur);
    const saat = setInterval(() => setSimdi(Date.now()), 200);
    return () => {
      clearInterval(yoklama);
      clearInterval(saat);
      document.removeEventListener("visibilitychange", gorunur);
      clearTimeout(skillTimerRef.current);
      clearTimeout(sinyalZamanRef.current);
      sinyalZamanRef.current = null;
      kanalHazirRef.current = false;
      if (duelloKanalRef.current === kanal) duelloKanalRef.current = null;
      supabase.removeChannel(kanal);
    };
  }, [id, yukle]);

  // Faz bitişinde tek okuma: sunucu fazı tembel ilerletir (okuyan ilk çağrı ya da 2 sn'lik
  // cron). Bitiş anında iki istemci de okur → yeni faz iki ekrana aynı anda gelir.
  // Anahtar: "c|bitiş1|bitiş2" (cevap fazı: iki kişisel bitişin geç olanı + tolerans) ya da "f|faz_bitis".
  const bitisAnahtar = d?.durum === "aktif"
    ? d.faz === "cevap" && d.cevap
      ? `c|${d.cevap.benim_bitis}|${d.cevap.rakip_bitis}`
      : `f|${d.faz_bitis}`
    : "";
  useEffect(() => {
    if (!bitisAnahtar) { fazBitisRef.current = null; return undefined; }
    const [tur, ...zamanlar] = bitisAnahtar.split("|");
    const t = zamanlar.map((x) => new Date(x).getTime()).filter(Number.isFinite);
    if (!t.length) { fazBitisRef.current = null; return undefined; }
    const hedef = Math.max(...t) + (tur === "c" ? CEVAP_TOLERANS_MS : 60);
    fazBitisRef.current = hedef;   // yedek yoklama bitişe yakın sıklaşsın
    const bekleMs = hedef - (Date.now() + farkRef.current);
    if (bekleMs < -2000 || bekleMs > 10 * 60 * 1000) return undefined;
    const zaman = setTimeout(() => { if (document.visibilityState === "visible") yukle(); }, Math.max(0, bekleMs));
    return () => clearTimeout(zaman);
  }, [bitisAnahtar, yukle]);

  // ---------------- Paket 28 A: düellonun kendi nabzı ----------------
  //
  // KUSUR: paylaşılan kabuk (AuthContext) `kalp_at()`i 60 SANİYEDE BİR atıyor,
  // düellonun kopukluk eşiği ise 25 saniye. 60 > 25 olduğu için iki nabız
  // arasında 35 saniyelik bir pencere vardı ve o pencerede TAMAMEN BAĞLI bir
  // oyuncu "kopuk" sayılıyordu — düello açılır açılmaz turuncu "Bağlantın
  // koptu" bandı çıkıyordu. Üstelik 45 sn'lik bekleme dolarsa bağlı oyuncu
  // maçı HAKSIZ YERE kaybedebilirdi.
  //
  // KURAL: nabız aralığı kopukluk eşiğinin yarısından küçük olmalı. Bu ilişkiyi
  // istemci değil SUNUCU garantiliyor: `duello_durum().sureler.nabiz` değeri
  // `duello_nabiz_sn()` ile her zaman eşiğin yarısına kırpılıyor. Buradaki 10
  // yalnız sunucu henüz cevap vermemişken kullanılan ilk değer.
  const nabizSn = Number(d?.sureler?.nabiz) > 0 ? Number(d.sureler.nabiz) : 10;
  useEffect(() => {
    if (!id) return undefined;
    let durdu = false;
    const at = async () => {
      if (durdu || document.visibilityState !== "visible") return;
      try {
        await supabase.rpc("kalp_at");
      } catch (e) {
        // Ağ dalgalanması: bir sonraki nabız zaten deneyecek.
        console.warn("[Bildim] düello nabzı atılamadı:", e?.message ?? e);
      }
    };
    at();                                   // ekran açılır açılmaz bir kez
    const zaman = setInterval(at, nabizSn * 1000);
    document.addEventListener("visibilitychange", at);
    return () => {
      durdu = true;
      clearInterval(zaman);
      document.removeEventListener("visibilitychange", at);
    };
  }, [id, nabizSn]);

  // Faz değişince yerel seçim sıfırlanır
  const fazAnahtari = d ? `${d.tur}-${d.saldiri_sirasi}-${d.faz}-${d.soru?.soru ?? ""}` : "";
  useEffect(() => { setSecim(null); setIkinciSansElendi([]); setHata(null); }, [fazAnahtari]);

  // Hamle sonucu sesi
  useEffect(() => {
    const h = d?.son_hamle;
    if (!h || d.faz !== "sonuc") return;
    const anahtar = `${h.tur}-${h.saldiran}-${h.soru_id}`;
    if (sonHamleRef.current === anahtar) return;
    sonHamleRef.current = anahtar;
    const benKaybettim = h.can_kaybeden === d.ben;
    // Düello 1.0: ses kendi cevabına göre (nötr turda da yanlışsan yanlış sesi).
    const iyiSes = d.surum === 2 ? Boolean(h.cevaplar?.[d.ben]?.dogru) : !benKaybettim;
    if (!iyiSes) { sesYanlis(); titret(40); } else { sesDogru(); titret(10); }
    // Paket 29 E.2: can eksildiyse cevap sesinin hemen ardından can sesi (kendi canın daha yüksek)
    if (h.can_kaybeden) setTimeout(() => sesCanKaybi(benKaybettim), 220);
  }, [d]);

  // Maç sonu sesi + coin/profil tazeleme
  useEffect(() => {
    if (!d || d.durum !== "bitti" || bitisSesRef.current) return;
    bitisSesRef.current = true;
    // A.3: sonuç sesi yalnız maç sonu sahnesinde (MacSonuKutlama) — burada da çalsaydı aynı ses üst üste gelirdi.
    // Coin sayacını sahnenin coin uçuşu bitince tazeler (coinTazele)
    refreshProfile?.(user?.id);
  }, [d, refreshProfile, user?.id]);

  // Rövanş kabul edildiyse iki taraf da yeni düelloya geçer
  useEffect(() => {
    if (d?.rovans?.id && d.rovans.id !== id) navigate(y(`/duello/${d.rovans.id}`), { replace: true });
  }, [d?.rovans?.id, id, navigate]);

  // Paket 30 C: rövanş süresi koda gömülmez — sunucunun kullandığı ayar okunur.
  useEffect(() => {
    let aktif = true;
    ayar("duello_rovans_sn", 60).then((sn) => { if (aktif && sn > 0) setRovSn(sn); }, () => {});
    return () => { aktif = false; };
  }, []);

  // Paket 30 C: bekleme başladı / bitti. Bitişin iki sebebi ayrılır:
  //   - isteyen hâlâ ben ama `gecerli` düştü → süre doldu, rakip yanıt vermedi
  //   - isteyen boşaldı → rakip reddetti (duello_rovans_yanitla false)
  // Kabul edilirse `rovans.id` gelir ve yukarıdaki etki yeni düelloya geçirir.
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

  const rovansIste = () => {
    setRovVazgec(false);
    setRovSonuc(null);
    setRovBas(Date.now());
    eylem("rovans", "duello_rovans_iste", {}).then((tamam) => { if (!tamam) setRovBas(null); });
  };

  // Düello 1.0 cevap fazında sayaç KİŞİSEL bitiştir (Ek Süre / Zaman Baskısı kişiye özel);
  // öteki fazlarda ortak faz_bitis. İkisi de sunucu saatine göre (farkRef).
  const hedefBitis = d?.surum === 2 && d?.faz === "cevap" && d?.cevap?.benim_bitis ? d.cevap.benim_bitis : d?.faz_bitis;
  // 325: sunucu faz bitişine gösterim payı ekler; sayaç `gosterim_bas`a kadar TAM süreyi
  // gösterir, sonra gerçek zamanla akar. Ekran fazı geç görse de sayaç yetişmek için hızlanmaz.
  const gosterimBas = d?.sureler?.gosterim_bas && ["kategori", "cevap"].includes(d?.faz)
    ? new Date(d.sureler.gosterim_bas).getTime() : null;
  const kalanSn = useMemo(() => {
    if (!hedefBitis) return 0;
    // `simdi` yalnız yeniden hesaplama tetikleyicisi: 200 ms bayat olabilir; rakam sınırı ve ilk-rakam kesri
    // (gosterSn) render anının gerçek saatine göre hesaplanır.
    const sunucuSimdi = Math.max(simdi, Date.now()) + farkRef.current;
    const bas = gosterimBas ? Math.max(sunucuSimdi, gosterimBas) : sunucuSimdi;
    return Math.max(0, (new Date(hedefBitis).getTime() - bas) / 1000);
  }, [hedefBitis, gosterimBas, simdi]);
  // GÖSTERİLEN sayaç (rakam, ses, son-3-sn vurgusu): faz ekrana geç geldiyse ilk rakam kesirle başlar
  // (ör. 13,12 sn kaldı → "14" yalnız 0,12 sn görünür = "hızlı" adım). Kesir fazın İLK göründüğü anda bir kez
  // alınır, sonra kalanla orantılı erir (lib/zaman.js › sayacGoster): ilk rakam tam saniye kalır, rakamlar hiçbir
  // yerde 1 sn'den kısa olmaz ve gösterilen 0, gerçek bitişle AYNI anda gelir. Mantık (süre bitti, şık kilidi,
  // sunucu toleransı) gerçek kalanSn ile aynen çalışır. Ek Süre / Zaman Baskısı / Soru Değiştir aynı fazda
  // kaymayı yeniden hesaplamaz.
  // Saat farkı tahmini (farkRef) yeni örnekle birden ~10–70 ms sıçrayabilir (sayacı o kadar ileri atar; rakam sınırına
  // denk gelirse 16–900 ms'lik "hızlı" adım). Gösterim için fark en çok %5 hızla (50 ms/sn) yeni değere kaydırılır:
  // rakam süreleri ≥ ~950 ms kalır. Yalnız gösterim: mantık gerçek kalanSn'de. Ek Süre / Zaman Baskısı hedef bitişi
  // değiştirir, saat farkını değil — bunlar anında yansır.
  const farkGosterRef = useRef(null);
  const fazKaymaRef = useRef({ anahtar: null, k0: 0, kayma: 0 });
  const kalanGoster = useMemo(() => {
    if (!(kalanSn > 0)) return 0;
    const an = Date.now();
    const fg = farkGosterRef.current;
    if (!fg) farkGosterRef.current = { fark: farkRef.current, an };
    else {
      const izin = 0.05 * Math.max(0, an - fg.an);
      fg.fark += Math.max(-izin, Math.min(izin, farkRef.current - fg.fark));
      fg.an = an;
    }
    const gosterimPayinda = gosterimBas && an + farkRef.current < gosterimBas;   // pay: sayaç sabit, kaydırma yok
    return gosterimPayinda ? kalanSn : Math.max(0, kalanSn + (farkRef.current - farkGosterRef.current.fark) / 1000);
  }, [kalanSn, gosterimBas]);
  const gosterSn = useMemo(() => {
    if (!(kalanSn > 0) || !d) return 0;
    const anahtar = `${d.tur}-${d.saldiri_sirasi}-${d.uzatma ?? ""}-${d.faz}`;
    if (fazKaymaRef.current.anahtar !== anahtar) fazKaymaRef.current = { anahtar, ...sayacKaymasi(kalanGoster) };
    return sayacGoster(kalanGoster, fazKaymaRef.current);
  }, [kalanGoster, kalanSn, d?.tur, d?.saldiri_sirasi, d?.uzatma, d?.faz]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Rakam tam saniye sınırında değişsin: 200 ms'lik saat tikine ek olarak bir sonraki
  // sınıra kurulmuş tek zamanlayıcı (adımlar 800/1200 ms diye titremez).
  useEffect(() => {
    if (kalanSn <= 0) return undefined;
    const bekle = sayacSinirMs(kalanGoster, fazKaymaRef.current);
    const zaman = setTimeout(() => setSimdi(Date.now()), bekle + 5);
    return () => clearTimeout(zaman);
  }, [kalanSn, kalanGoster, gosterSn]);

  // Tanı paneli (?tani=1): şıkları kapatan koşullar her an okunabilsin.
  useEffect(() => {
    if (!d) return undefined;
    window.__bdTani = {
      mod: "duello", surum: d.surum, faz: d.faz,
      kilitli: Boolean(d.cevap?.ben_cevapladim), sureBitti: kalanSn <= 0,
      secim, calisan, kalanSn: Math.round(kalanSn * 10) / 10,
      benimBitis: d.cevap?.benim_bitis ?? null, farkMs: Math.round(farkRef.current),
      hedefBitis: hedefBitis ?? null, sureler: d.sureler ?? null,
    };
    return () => { delete window.__bdTani; };
  }, [d, kalanSn, secim, calisan]);

  // Son 3 saniyede tik
  useEffect(() => {
    if (!d || !["cevap", "altin"].includes(d.faz)) return;
    if (d.surum === 2 && d.cevap?.ben_cevapladim) return;   // cevabı kilitleyene tik çalınmaz
    const sn = Math.ceil(gosterSn);
    if (sn > 0 && sn <= 3 && sonTikRef.current !== sn) { sonTikRef.current = sn; sesTik(sn); }
  }, [gosterSn, d]);

  // ---------------- Düello 1.0: ses + görsel anlar (Tasarım A) ----------------
  // Yalnız sunum: durum akışına, RPC'lere, kilitlere dokunmaz. Her ses bir ref
  // korumasıyla bir kez çalar (StrictMode çift efekti çift ses vermez).
  useEffect(() => { sesOnYukle("duello"); sesOnYukle("mac"); sesOnYukle("skill"); }, []);

  // Kategori seçimi geri sayımı: rakam her değiştiğinde ses; son 3 sn "bong".
  const v2Aktif = d?.surum === 2 && d?.durum === "aktif";
  const kategoriSn = v2Aktif && d.faz === "kategori" ? Math.ceil(gosterSn) : 0;
  useEffect(() => {
    if (kategoriSn <= 0) return;
    const anahtar = `${fazAnahtari}:${kategoriSn}`;
    if (sayimRef.current === anahtar) return;
    sayimRef.current = anahtar;
    sesKategoriGeriSayim(kategoriSn);
  }, [kategoriSn, fazAnahtari]);

  // Tur geçişi ve yeni soru: geçiş sesi animasyonun başladığı karede; soru sesi
  // kart göründüğü karede. Sonuç → doğrudan yeni soru (uzatma) ise ikisi arası 300 ms.
  const soruMetni = d?.soru?.soru ?? null;
  const gecisFaz = v2Aktif ? d.faz : null;
  const gecisTur = `${d?.tur}-${d?.saldiri_sirasi}-${d?.uzatma}`;
  useEffect(() => {
    if (!gecisFaz) return;
    const onceki = gecisRef.current;
    const simdiki = { faz: gecisFaz, tur: gecisTur, soru: soruMetni };
    gecisRef.current = simdiki;
    if (onceki && onceki.faz === simdiki.faz && onceki.tur === simdiki.tur && onceki.soru === simdiki.soru) return;
    if (gecisFaz === "kategori" && onceki && (onceki.faz !== "kategori" || onceki.tur !== gecisTur)) {
      sesTurGecis();
      setTurGecis(Date.now());
    } else if (gecisFaz === "cevap" && soruMetni && (!onceki || onceki.soru !== soruMetni || onceki.faz !== "cevap")) {
      if (onceki?.faz === "sonuc") {
        sesTurGecis();
        setTurGecis(Date.now());
        clearTimeout(soruSesTimerRef.current);
        soruSesTimerRef.current = setTimeout(() => sesSoruGeldi(), 300);
      } else if (onceki?.faz === "kategori") {
        // Ajan H: kategori kesinleşti → kısa onay sesi, soru sesi 300 ms sonra (üst üste binmesin).
        sesKategoriSecildi();
        clearTimeout(soruSesTimerRef.current);
        soruSesTimerRef.current = setTimeout(() => sesSoruGeldi(), 300);
      } else sesSoruGeldi();
    }
  }, [gecisFaz, gecisTur, soruMetni]);
  useEffect(() => () => clearTimeout(soruSesTimerRef.current), []);

  // Ajan H: rakip cevabını verdi (ben hâlâ düşünürken) — soru başına bir kez.
  const rakipCevapAnahtari = v2Aktif && d.faz === "cevap" && d.cevap?.rakip_cevapladi && !d.cevap?.ben_cevapladim
    ? `${gecisTur}:${soruMetni}` : null;
  const rakipCevapRef = useRef(null);
  useEffect(() => {
    if (!rakipCevapAnahtari || rakipCevapRef.current === rakipCevapAnahtari) return;
    rakipCevapRef.current = rakipCevapAnahtari;
    sesRakipCevapladi();
  }, [rakipCevapAnahtari]);

  // Can kaybı: kalp kırılma animasyonu (QtCan kayip) — anahtar her yeni kayıpta değişir.
  useEffect(() => {
    if (!d?.oyuncular) return;
    const onceki = canRef.current;
    const yeni = {};
    const kayiplar = {};
    for (const o of d.oyuncular) {
      yeni[o.id] = Number(o.can);
      if (onceki[o.id] !== undefined && Number(o.can) < onceki[o.id]) kayiplar[o.id] = Date.now();
    }
    canRef.current = yeni;
    if (Object.keys(kayiplar).length) setKayip((k) => ({ ...k, ...kayiplar }));
  }, [d?.oyuncular]);

  // 50:50 anı: kapanan iki şık kırılıp düşer, QT_KIRILMA_MS sonra "elendi" olur.
  // Rakibin Zaman Baskısı: skill sesi + titreşim (sayaçta "−N" balonu).
  useEffect(() => {
    if (!skillEfekt || d?.surum !== 2) return;
    if (skillEfekt.tur === "zaman_baskisi") { sesSkill("zaman_baskisi"); titret(30); }
    if (skillEfekt.tur !== "elli") return;
    const kapali = Array.isArray(d.cevap?.elli_kapali) ? d.cevap.elli_kapali.map(Number) : [];
    setKiriliyor(kapali);
    clearTimeout(kirilmaTimerRef.current);
    kirilmaTimerRef.current = setTimeout(() => setKiriliyor([]), QT_KIRILMA_MS);
    // Yalnız yeni efekt geldiğinde (d her saniye yenilenir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillEfekt]);
  useEffect(() => () => clearTimeout(kirilmaTimerRef.current), []);

  const eylem = async (ad, fn, params) => {
    setHata(null);
    setCalisan(ad);
    try {
      const { error } = await supabase.rpc(fn, { p_id: id, ...params });
      if (error) throw error;
      await yukle();
      return true;
    } catch (e) {
      setHata(ceviri(hataMesaji(e)));
      return false;
    } finally {
      setCalisan(null);
    }
  };

  // Cevap gönderimi — eski ve Düello 1.0 arayüzü aynı RPC'yi (duello_cevap) çağırır.
  // v2'de sunucu doğru/yanlışı burada SÖYLEMEZ; yalnız İkinci Şans'ın tekrar hakkı döner.
  const cevapVer = async (i) => {
    sesDokunus(); titret(10);
    setSecim(i);
    setHata(null);
    setCalisan("cevap");
    try {
      const { data, error } = await supabase.rpc("duello_cevap", { p_id: id, p_cevap: i });
      if (error) throw error;
      if (data?.tekrar_hakki) {
        sesYanlis(); titret(18);
        setIkinciSansElendi((onceki) => [...new Set([...onceki, i])]);
        setSkillEfekt({ tur: "ikinci_sans" });
        clearTimeout(skillTimerRef.current);
        skillTimerRef.current = setTimeout(() => setSkillEfekt(null), 680);
        setTimeout(() => setSecim(null), 260);
      }
      await yukle();
    } catch (e) {
      setHata(ceviri(hataMesaji(e)));
      setSecim(null);
    } finally {
      setCalisan(null);
    }
  };

  // Düello 1.0 skill kullanımı. Envanterde varsa (ya da skill'ler serbestse) doğrudan
  // kullanılır; yoksa satın alma onayı açılır (JokerSatinAlModal → al + kullan tek RPC).
  const v2SkillKullan = async (tur, { satinAl }) => {
    if (satinAl) { setSatinAlinacak({ tur, yalnizAl: false }); return; }
    setHata(null);
    setCalisan(`joker-${tur}`);
    try {
      let sonuc;
      if (tur === "ikinci_sans") {
        sonuc = await supabase.rpc("skill_hazirla", { p_mac_tur: "duello", p_mac_id: id, p_soru_index: null, p_tur: tur });
      } else {
        // Envanterde var ya da serbest mod: joker_al_ve_kullan'ın kullanım kolunun aynısı
        // (surum = 2 maçta ikisi de duello2_skill'e gider). Satın alma yalnız onaylı pencereden.
        sonuc = await supabase.rpc(tur === "zaman_baskisi" ? "duello_saldiri_jokeri" : "duello_savunma_jokeri", { p_id: id, p_tur: tur });
      }
      if (sonuc.error) throw sonuc.error;
      // Kullanma anı: skill'in kendi sesi + düğmede patlama/halka (aynı kare)
      sesSkill(tur); titret(10);
      setSonKullanilan({ tur, anahtar: Date.now() });
      await yukle();
    } catch (e) {
      setHata(ceviri(hataMesaji(e)));
    } finally {
      setCalisan(null);
    }
  };

  const rovansVazgec = async () => {
    const tamam = await eylem("rovans-iptal", "duello_rovans_iptal", {});
    if (tamam) {
      setRovVazgec(true);
      setRovBas(null);
    }
  };

  if (!d) {
    return (
      <div className="m2-mac qt-sahne-mac qt-sahne-gok">
        {/* Paket 41 G: Klasik ile aynı kalıp — Tekrar dene + çıkış, ham metin yok */}
        {yuklemeHatasi ? (
          <MacYukleniyor hata={yuklemeHatasi} onTekrarDene={() => { setYuklemeHatasi(null); yukle(); }}
                         donusYolu={y("/duello")} donusMetni={ceviri("Düello'ya dön")} />
        ) : (
          <div className="m2-yukleniyor" aria-busy="true" aria-label={ceviri("Yükleniyor…")}>
            <span className="m2-yukleniyor-ikon" aria-hidden="true"><QtIkon ad="duello" boyut={36} /></span>
          </div>
        )}
      </div>
    );
  }

  if (Number(d.surum ?? 1) > DUELLO_EN_YUKSEK_SURUM) {
    return (
      <div className="m2-surum">
        <QtBosDurum ikon="uyari" ton="yanlis"
                    baslik={ceviri("Oyunun yeni sürümü var. Maça devam etmek için sayfayı yenile.")}
                    eylem={<QtDugme ikon="yenile" onClick={() => window.location.reload()}>{ceviri("Yenile")}</QtDugme>} />
      </div>
    );
  }

  const ben = d.oyuncular.find((o) => o.id === d.ben) ?? d.oyuncular[0];
  const rakip = d.oyuncular.find((o) => o.id !== d.ben) ?? d.oyuncular[1];
  const benSaldiran = d.saldiran === d.ben;
  const benSavunan = !benSaldiran;
  const sonCan = d.durum === "aktif" && (ben.can === 1 || rakip.can === 1);
  const kullanim = d.kullanim?.[d.saldiran] ?? { sayim: {}, son: null };
  const savunanOyuncu = d.oyuncular.find((o) => o.id === d.savunan);
  const secenekler = d.soru ? (Array.isArray(d.soru.secenekler) ? d.soru.secenekler : JSON.parse(d.soru.secenekler)) : [];
  const ezeliMetin = d.ezeli
    ? d.ezeli.ben > d.ezeli.rakip
      ? ceviri("Bu oyuncuyla {ben}-{rakip} öndesin", d.ezeli)
      : d.ezeli.ben < d.ezeli.rakip
        ? ceviri("Bu oyuncuyla {ben}-{rakip} geridesin", d.ezeli)
        : ceviri("Bu oyuncuyla {ben}-{rakip} berabersiniz", d.ezeli)
    : null;

  // ---------------- sonuç ekranı ----------------
  if (d.durum !== "aktif") {
    const kazandim = d.kazanan === d.ben;
    const rov = d.rovans ?? {};
    const durum = d.durum === "iptal" ? "berabere" : kazandim ? "kazandi" : "kaybetti";
    // Paket 36 I: yakınlık satırı veriden — rakibin 1 canı kaldıysa "son canına kadar",
    // 2 canı kaldıysa tur sayısı; rakip hiç can kaybetmediyse satır çizilmez.
    const altYazi = d.durum !== "bitti" || kazandim
      ? null
      : rakip.can === 1
        ? ceviri("Son canına kadar götürdün")
        : rakip.can === 2 && d.tur
          ? ceviri("{n} tur sürdü", { n: d.tur })
          : null;
    // A.3: yeni sahne — veriler mac_sonu_ozet'ten (tek çağrı). Özet gelene dek sahne kurulmaz.
    if (d.durum === "bitti" && !macSonuOzet) return <div className="bd-duello"><div className="msk-bekle" aria-busy="true" /></div>;
    const sahne = ozettenSahne(d.durum === "bitti" ? macSonuOzet : null);
    return (
      <div className="bd-duello">
        <MacSonuKutlama
          durum={durum}
          mod="duello"
          terk={sahne.terk}
          baslik={d.durum === "iptal" ? ceviri("Düello iptal edildi") : undefined}
          altYazi={sahne.terk ? undefined : altYazi ?? undefined}
          ben={{ profil: ben, can: ben.can }}
          rakip={{ profil: rakip, can: rakip.can }}
          canToplam={DUELLO_CAN}
          oduller={sahne.oduller}
          level={sahne.level}
          lig={sahne.lig}
          gorevler={sahne.gorevler}
          rozetler={sahne.rozetler}
          detay={d.durum === "bitti" || ezeliMetin || (d.surum === 2 && d.gecmis?.length) ? (
            <>
              {d.durum === "bitti" && <OdulDokumu kaynak={`duello:${d.id}`} veri={macSonuOzet?.dokum} gorevleriGoster={false} />}
              {d.surum !== 2 && d.durum === "bitti" && d.son_hamle?.altin && secenekler.length > 0 && (
                <AltinSonucu h={d.son_hamle} ben={d.ben} soru={d.soru?.soru} secenekler={secenekler} ceviri={ceviri} />
              )}
              {d.surum !== 2 && d.durum === "bitti" && <DuelloOzet id={d.id} />}
              {/* Düello 1.0: her soru, doğru cevap ve "şık işaretlenmedi" notu (sunucu: gecmis) */}
              {d.surum === 2 && <V2Gecmis gecmis={d.gecmis} maxTur={d.max_tur} benId={d.ben} c={c2} />}
              {ezeliMetin && <div className="bd-duello-ezeli">{ezeliMetin}</div>}
            </>
          ) : null}
          eylemNotu={hata ? <span className="m2-hata" role="alert"><QtIkon ad="uyari" boyut={18} /> {hata}</span> : null}
          eylemler={{ onYeniMac: () => navigate(y("/duello")), onAnaSayfa: () => navigate(y()), yeniMacEtiketi: ceviri("Yeni düello") }}
          rovans={
            <>
              {rov.id ? (
                <QtDugme className="mss-tam" tamGenislik ikon="duello" onClick={() => navigate(y(`/duello/${rov.id}`))}>{ceviri("Rövanşa git")}</QtDugme>
              ) : rov.isteyen && rov.gecerli && rov.isteyen === d.ben && !rovVazgec ? (
                <>
                  {/* İstek gönderildi: bekleme penceresi (QtModal, body'ye portal) açık; çubukta pasif düğme */}
                  <QtDugme className="mss-tam" tamGenislik yukleniyor>{ceviri("Rövanş bekleniyor…")}</QtDugme>
                  <RovansBekleme rakip={rakip} baslangic={rovBas ?? Date.now()} sureSn={rovSn} simdi={simdi}
                                 ceviri={ceviri} onVazgec={rovansVazgec} />
                </>
              ) : rov.isteyen && rov.gecerli && rov.isteyen !== d.ben ? (
                <>
                  <p className="m2-rovans-soru mss-tam qt-h-pop-gir" role="status">{ceviri("{ad} rövanş istiyor!", { ad: rakip.gorunen_ad })}</p>
                  <QtDugme ikon="onay" devreDisi={!!calisan} yukleniyor={calisan === "rovans"}
                           onClick={() => eylem("rovans", "duello_rovans_yanitla", { p_kabul: true })}>
                    {ceviri("Kabul et")}
                  </QtDugme>
                  <QtDugme tur="ikincil" devreDisi={!!calisan}
                           onClick={() => eylem("rovans", "duello_rovans_yanitla", { p_kabul: false })}>
                    {ceviri("Reddet")}
                  </QtDugme>
                </>
              ) : d.durum === "bitti" ? (
                <>
                  {rovSonuc && (
                    <p className="m2-rovans-sonuc mss-tam" role="status">
                      {rovSonuc === "red"
                        ? ceviri("{ad} rövanşı kabul etmedi.", { ad: rakip.gorunen_ad })
                        : ceviri("{ad} yanıt vermedi.", { ad: rakip.gorunen_ad })}
                    </p>
                  )}
                  <QtDugme className="mss-tam" tamGenislik ikon="yenile" yukleniyor={!!calisan} onClick={rovansIste}>
                    {rovSonuc ? ceviri("Tekrar rövanş iste") : ceviri("Rövanş")}
                  </QtDugme>
                </>
              ) : null}
            </>
          }
        >
          <HesapGuvenceOnerisi kazandim={d.durum === "bitti" && kazandim} />
        </MacSonuKutlama>
      </div>
    );
  }

  // Skill satın alma penceresi (v1 ve v2 ortak; JokerSatinAlModal paylaşılan bileşen).
  const satinAlPenceresi = satinAlinacak && (
    <JokerSatinAlModal
      tur={satinAlinacak.tur}
      yalnizAl={satinAlinacak.yalnizAl}
      fiyat={Number((d.surum === 2 ? d.skill : d.jokerler)?.fiyatlar?.[satinAlinacak.tur] ?? 0)}
      coin={Number((d.surum === 2 ? d.skill : d.jokerler)?.coin ?? 0)}
      onKapat={() => setSatinAlinacak(null)}
      onOnay={async () => {
        if (satinAlinacak.yalnizAl) {
          // Kategori ekranı: joker envantere girer, KULLANILMAZ.
          // Kullanım Saldırı Hazırlığı'nda normal yoldan yapılır.
          const { error } = await supabase.rpc("joker_tek_al", { p_tur: satinAlinacak.tur });
          if (error) throw error;
        } else {
          // Satın alma + kullanım TEK RPC: araya girip coin düşüp jokerin
          // kullanılmaması diye bir durum oluşmaz.
          const yeniSkill = satinAlinacak.tur === "ikinci_sans";
          const { error } = await supabase.rpc(yeniSkill ? "skill_al_ve_hazirla" : "joker_al_ve_kullan", {
            p_mac_tur: "duello",
            p_mac_id: id,
            p_soru_index: null,
            p_tur: satinAlinacak.tur,
          });
          if (error) throw error;
        }
        if (d.surum === 2 && !satinAlinacak.yalnizAl) {
          sesSkill(satinAlinacak.tur);
          setSonKullanilan({ tur: satinAlinacak.tur, anahtar: Date.now() });
        } else sesJoker();
        titret(10);
        coinTazele();
        // Alım bitti: pencere tam yeniden okumayı (iki ardışık RPC, yavaş ağda saniyeler) BEKLEMEZ; durum arkadan tazelenir.
        yukle().catch(() => {});
      }}
    />
  );

  // ================= Düello 1.0 (surum 2) — Tasarım A maç ekranı =================
  if (d.surum === 2) {
    const kilitli = Boolean(d.cevap?.ben_cevapladim);
    const toplamSn = d.faz === "kategori"
      ? Number(d.sureler?.kategori ?? 8)
      : Math.max(Number(d.sureler?.cevap ?? 15), Math.ceil(kalanSn));
    const sonUc = d.faz === "kategori" && gosterSn > 0 && gosterSn <= 3;   // kategori: son 3 sn vurgusu (renk + ses)
    const gerilim = (d.faz === "cevap" && !kilitli && gosterSn > 0 && gosterSn <= 5) || sonUc;
    const ekBalon = skillEfekt?.tur === "sure"
      ? { anahtar: `s${skillEfekt.deger}${fazAnahtari}`, metin: `+${skillEfekt.deger}` }
      : skillEfekt?.tur === "zaman_baskisi"
        ? { anahtar: `z${skillEfekt.deger}${fazAnahtari}`, metin: `−${skillEfekt.deger}` }
        : null;
    let sahne2 = null;
    if (d.faz === "kategori") {
      sahne2 = (
        <V2Kategori d={d} benSaldiran={benSaldiran} ben={ben} rakip={rakip} calisan={calisan} sonSaniye={sonUc} c={c2}
                    sayac={<QtSayac kalan={gosterSn} toplam={toplamSn} esik={3} boyut="b" />}
                    onSec={(k) => { sesDokunus(); eylem("kategori", "duello_kategori_sec", { p_kategori: k }); }} />
      );
    } else if (d.faz === "cevap") {
      sahne2 = (
        <V2Cevap d={d} rakip={rakip} secenekler={secenekler} secim={secim}
                 ikinciSansElendi={ikinciSansElendi} calisan={calisan} kalanSn={kalanSn}
                 kiriliyor={kiriliyor} c={c2} onCevap={cevapVer}
                 sayac={<QtSayac kalan={gosterSn} toplam={toplamSn} durdu={kilitli} ekBalon={ekBalon} />} />
      );
    } else if (d.faz === "sonuc") {
      sahne2 = <V2Sonuc d={d} rakip={rakip} secenekler={secenekler} c={c2} />;
    }
    return (
      <div className={sinif("m2-mac qt-sahne-mac qt-sahne-gok", gerilim && "qt-h-gerilim", sonCan && "m2-mac--son-can")} data-kat={d.kategori || undefined}>
        <MacUstSerit onCik={() => setTerkOnay(true)} cikisEtiketi={ceviri("Düellodan çık")}
                     rozet={ceviri("Düello · Taktik Maçı")} />
        <V2Ust d={d} ben={ben} rakip={rakip} kayip={kayip} c={c2} seviyeler={seviyeler} tepkiBalonlar={tepki.balonlar} />
        {/* Paket 24 · A.4: bağlantı kopması. Kopukken sunucu fazları İLERLETMEZ. */}
        {baglanti?.kopuk && (
          <p className="m2-bant m2-bant--uyari" role="status">
            <QtIkon ad="uyari" boyut={18} />
            <span>
              {baglanti.ben_mi ? ceviri("Bağlantın koptu — düello bekliyor.") : ceviri("Rakibin bağlantısı koptu — düello durduruldu.")}
              {baglanti.kalan_sn === null || baglanti.kalan_sn === undefined ? ""
                : ` ${Math.max(0, baglanti.kalan_sn - Math.floor((simdi - (baglanti.alindi ?? simdi)) / 1000))} ${ceviri("sn")}`}
            </span>
          </p>
        )}
        {ezeliMetin && d.tur <= 1 && d.faz === "kategori" && <p className="m2-bant">{ezeliMetin}</p>}
        {(ben.can <= 0 || rakip.can <= 0) && (
          <p className="m2-bant">{ceviri("Eşit hamle kuralı: canı biten oyuncu bu turdaki saldırısını yine de yapar, tur tamamlanınca maç biter.")}</p>
        )}
        <div className="m2-sahne" key={`${d.faz}-${d.tur}-${d.saldiri_sirasi}-${d.uzatma}`}>
          {turGecis && simdi - turGecis < 900 && (
            <span key={turGecis} className="m2-gecis" aria-hidden="true">
              <span>{d.uzatma ? c2("UZATMA") : c2("Tur {n}/{t}", { n: d.tur, t: d.max_tur })}</span>
            </span>
          )}
          {sahne2}
        </div>
        {hata && <p className="m2-hata" role="alert"><QtIkon ad="uyari" boyut={18} /> {hata}</p>}
        <V2Skill d={d} calisan={calisan} kalanSn={kalanSn} serbest={jokerSerbest}
                 sonKullanilan={sonKullanilan} onKullan={v2SkillKullan} c={c2} />
        {satinAlPenceresi}
        {/* 542: maç içi tepki (yalnız tepki_acik_modlar'daki modda; ilk açılış Antrenman) */}
        <TepkiCubugu tepki={tepki} className="m2-tepki" />
        <div className="m2-terk">
          <QtDugme tur="hayalet" boyut="k" ikon="cikis" devreDisi={!!calisan} onClick={() => setTerkOnay(true)}>
            {ceviri("Düellodan çık")}
          </QtDugme>
        </div>
        <QtModal acik={terkOnay} onKapat={() => setTerkOnay(false)} baslik={ceviri("Düellodan çık")}
                 aciklama={ceviri("Düellodan çıkarsan hükmen kaybedersin. Emin misin?")}
                 altlik={
                   <div className="m2-onay-eylem">
                     <QtDugme tur="ikincil" data-qt-ilk-odak onClick={() => setTerkOnay(false)}>{ceviri("Vazgeç")}</QtDugme>
                     <QtDugme tur="tehlike" devreDisi={!!calisan}
                              onClick={() => { setTerkOnay(false); eylem("terk", "duello_terk", {}); }}>{ceviri("Çık")}</QtDugme>
                   </div>
                 } />
      </div>
    );
  }

  // ---------------- oyuncu şeridi ----------------
  const oyuncuKart = (o, taraf) => (
    <div className={`bd-duello-oyuncu ${taraf} ${d.saldiran === o.id ? "saldiriyor" : ""}`}>
      <CerceveliAvatar profile={o} userId={o.id} boyut={48} hareketli kart={seviyeler[o.id]} />
      <div className="bd-duello-oyuncu-bilgi">
        {/* Ajan C: ada dokununca oyuncu kartı */}
        <div className="bd-duello-oyuncu-ad-kap"><OyuncuAdiDugmesi userId={o.id} profil={o} className="bd-duello-oyuncu-ad">{o.gorunen_ad}</OyuncuAdiDugmesi></div>
        {unvanAdi(o.unvan) && <div className="bd-unvan kucuk">{ceviri(unvanAdi(o.unvan))}</div>}
        <Kalpler can={Math.max(0, o.can)} sonCan={o.can === 1} />
      </div>
    </div>
  );

  // ---------------- soru bloğu ----------------
  const soruBlogu = (tiklanabilir) => {
    const h = d.son_hamle;
    const altinMi = d.faz === "altin";
    const sonucMu = d.faz === "sonuc" && h && !h.altin;
    const kapali = d.elli_kapali ?? [];
    const benimAltin = d.altin?.benim_cevabim;
    return (
      <div className={`bd-duello-soru ${skillEfekt ? `bd-skill-${skillEfekt.tur} ${skillEfekt.asama ? `bd-skill-${skillEfekt.asama}` : ""}` : ""}`}>
        <div className="bd-soru-metin bd-soru-giris">{d.soru?.soru}</div>
        <div className="bd-secenekler">
          {secenekler.map((s, i) => {
            let sinif = "bd-secenek";
            if (sonucMu) {
              if (i === h.dogru_cevap) sinif += " dogru";
              else if (i === h.cevap) sinif += " yanlis";
              else sinif += " solgun";
            } else if (altinMi && benimAltin !== undefined && benimAltin !== null) {
              if (i === Number(benimAltin)) sinif += " secili";
            } else if (i === secim) sinif += " secili";
            const ikinciSanslaElendi = ikinciSansElendi.includes(i);
            if ((kapali.includes(i) || ikinciSanslaElendi) && !sonucMu) {
              sinif += ikinciSanslaElendi ? " elendi ikinci-sans-elendi" : " elendi";
            }
            return (
              <button key={i} className={sinif}
                      disabled={!tiklanabilir || secim !== null || !!calisan || kapali.includes(i) || ikinciSanslaElendi}
                      onClick={() => cevapVer(i)}>
                <span className="bd-harf">{HARFLER[i]}</span>
                <span className="bd-secenek-metin">{s}</span>
                {sonucMu && i === h.dogru_cevap && <Ikon ad="onay" boyut={18} className="bd-secenek-isaret" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const sayac = (buyuk) => (
    <div className={`bd-duello-sayac ${buyuk ? "buyuk" : ""} ${gosterSn <= 3 ? "kritik" : ""} ${skillEfekt?.tur === "sure" ? "bd-skill-sure" : ""} ${skillEfekt?.tur === "zaman_baskisi" ? "bd-skill-zaman_baskisi" : ""}`} role="timer">
      {Math.ceil(gosterSn)}
      {(skillEfekt?.tur === "sure" || skillEfekt?.tur === "zaman_baskisi") && (
        <span className={`bd-skill-sure-deger ${skillEfekt.tur === "sure" ? "arti" : "eksi"}`}>
          {skillEfekt.tur === "sure" ? "+" : "−"}{skillEfekt.deger} sn
        </span>
      )}
    </div>
  );

  // ---------------- faz içeriği ----------------
  let sahne = null;
  const katAdi = d.kategori ? ceviri(kategoriAdi(d.kategori)) : "";
  // Düello 1.0 (surum 2) yukarıda kendi ekranıyla döndü; buradan sonrası yalnız eski (v1) maç.
  const v2 = false;
  if (d.faz === "kategori") {
    if (benSaldiran) {
      const profil = rakip.profil?.kategoriler ?? [];
      sahne = (
        <div className="bd-duello-kategori">
          <div className="bd-duello-baslik-satir">
            <h2>{ceviri("Saldırı kategorini seç")}</h2>
            {sayac(false)}
          </div>
          {/* Paket 42 F: kural ilk turda tam okunur; sonraki turlarda tek satır + "Detay" ile açılır */}
          {(d.tur ?? 1) <= 1 ? (
            <>
              <p className="alt-yazi">{ceviri("Rakibinin kategori başarısı. Kırmızı çerçeve: en zayıf kategorisi — bilirse canı sen kaybedersin.")}</p>
              <p className="alt-yazi bd-duello-kural-not">{ceviri("En zayıf kategori maç başında sabitlenir; yüzdeler eşitse biri seçilip kilitlenir. Bu yüzden eşit görünen kategorilerden yalnız biri riskli.")}</p>
            </>
          ) : (
            <details className="bd-duello-kural-kisa">
              <summary className="alt-yazi">{ceviri("Kırmızı çerçeve: riskli kategori")} <span className="bd-duello-kural-detay">{ceviri("Detay")}</span></summary>
              <p className="alt-yazi">{ceviri("Rakibinin kategori başarısı. Kırmızı çerçeve: en zayıf kategorisi — bilirse canı sen kaybedersin.")}</p>
              <p className="alt-yazi bd-duello-kural-not">{ceviri("En zayıf kategori maç başında sabitlenir; yüzdeler eşitse biri seçilip kilitlenir. Bu yüzden eşit görünen kategorilerden yalnız biri riskli.")}</p>
            </details>
          )}
          <div className="bd-duello-kat-grid">
            {d.kategoriler.map((k) => {
              const adet = Number(kullanim.sayim?.[k] ?? 0);
              const kullanilamaz = adet >= d.kategori_max || kullanim.son === k;
              const riskli = rakip.zayif === k;
              const p = profil.find((x) => x.kategori === k);
              return (
                <button key={k} type="button"
                        className={`bd-duello-kat ${riskli ? "riskli" : ""}`}
                        disabled={kullanilamaz || !!calisan}
                        aria-label={`${kategoriAdi(k)} ${adet}/${d.kategori_max}${riskli ? " " + ceviri("riskli") : ""}`}
                        onClick={() => { sesDokunus(); eylem("kategori", "duello_kategori_sec", { p_kategori: k }); }}>
                  <KategoriIkon anahtar={k} boyut={22} plaka />
                  <span className="bd-duello-kat-ad">{ceviri(kategoriAdi(k))}</span>
                  <span className="bd-duello-kat-yuzde">
                    {p?.yuzde === null || p?.yuzde === undefined ? ceviri("veri yok") : `%${p.yuzde}`}
                  </span>
                  <span className="bd-duello-kat-sayac">{adet}/{d.kategori_max}</span>
                  {riskli && <span className="bd-duello-riskli">{ceviri("riskli")}</span>}
                </button>
              );
            })}
          </div>
        </div>
      );
    } else {
      sahne = (
        <div className="bd-duello-bekle">
          <span className="bd-duello-bekle-ikon" aria-hidden="true"><Ikon ad="saat" boyut={30} /></span>
          <h2>{ceviri("{ad} saldırı kategorisini seçiyor…", { ad: rakip.gorunen_ad })}</h2>
          {sayac(false)}
          {d.son_hamle && !d.son_hamle.altin && <SonHamleOzet h={d.son_hamle} ben={d.ben} ceviri={ceviri} />}
        </div>
      );
    }
  } else if (d.faz === "hazirlik") {
    sahne = benSaldiran ? (
      <div className="bd-duello-hazirlik">
        <div className="bd-duello-baslik-satir">
          <h2>{ceviri("Saldırı Hazırlığı")} · {katAdi}</h2>
          {sayac(false)}
        </div>
        <p className="alt-yazi">{ceviri("Soruyu gör, istersen saldırı jokeri kullan. Süre dolunca soru rakibe gider.")}</p>
        {soruBlogu(false)}
      </div>
    ) : (
      <div className="bd-duello-bekle">
        <KategoriIkon anahtar={d.kategori} boyut={48} plaka />
        <h2>{ceviri("{kategori} saldırısı geliyor!", { kategori: katAdi })}</h2>
        {sayac(false)}
      </div>
    );
  } else if (d.faz === "cevap") {
    sahne = (
      <div className="bd-duello-cevap">
        <div className="bd-duello-baslik-satir">
          <h2>{benSavunan ? ceviri("Savun!") : ceviri("{ad} düşünüyor…", { ad: rakip.gorunen_ad })} · {katAdi}</h2>
          {sayac(sonCan)}
        </div>
        {d.zaman_baskisi && <div className="bd-duello-bant baski">{ceviri("Zaman Baskısı: cevap süresi 10 saniye")}</div>}
        {benSavunan && savunanOyuncu?.zayif === d.kategori && (
          <div className="bd-duello-bant firsat">{ceviri("En zayıf kategorin! Bilirsen saldıran can kaybeder.")}</div>
        )}
        {soruBlogu(benSavunan)}
      </div>
    );
  } else if (d.faz === "sonuc") {
    const h = d.son_hamle;
    sahne = (
      <div className="bd-duello-sonuc">
        {h && <SonHamleOzet h={h} ben={d.ben} ceviri={ceviri} buyuk secenekler={secenekler} />}
        {soruBlogu(false)}
      </div>
    );
  } else if (d.faz === "altin") {
    sahne = (
      <div className="bd-duello-altin">
        <div className="bd-duello-baslik-satir">
          <h2><Ikon ad="yildiz" boyut={20} /> {ceviri("Altın Soru")}</h2>
          {sayac(true)}
        </div>
        <p className="alt-yazi">
          {d.altin?.ben_cevapladim
            ? ceviri("Cevabın kilitlendi. Rakip bekleniyor…")
            : ceviri("Can ve doğru sayısı eşit. Tek doğru bilen kazanır — joker yok.")}
        </p>
        {soruBlogu(!d.altin?.ben_cevapladim)}
      </div>
    );
  }

  const jokerSeti = v2 || d.faz === "altin" ? null : benSaldiran ? "saldiri" : "savunma";

  // ---------------- faz halesi (2C-C) ----------------
  // Ekran kenarında: saldırıda turuncu (sabit), savunmada mavi → süre azaldıkça kırmızı.
  // Kırmızıya tam geçiş sayacın "kritik" eşiğiyle (≤3 sn) aynı an. Renk tek başına yetmez:
  // yanında ikonlu metin bandı var. Hale portal + position:fixed, transform YOK (iOS).
  const rolFazi = ["kategori", "hazirlik", "cevap"].includes(d.faz);
  // Düello 1.0: cevapta iki oyuncu da "savunur" (aynı soru) → mavi hale ikisine de.
  const haleSavunma = v2 ? d.faz === "cevap" && !d.cevap?.ben_cevapladim : benSavunan;
  const haleVar = v2 ? (d.faz === "kategori" && benSaldiran) || haleSavunma : rolFazi;
  let kirmizilik = 0;
  if (rolFazi && haleSavunma && d.faz === "cevap") {
    const hs = haleSureRef.current;
    if (hs.anahtar !== fazAnahtari) { hs.anahtar = fazAnahtari; hs.sn = kalanSn; } else hs.sn = Math.max(hs.sn, kalanSn);
    kirmizilik = kalanSn <= 3 ? 1 : Math.min(1, Math.max(0, (hs.sn - kalanSn) / Math.max(1, hs.sn - 3))) * 0.7;
  }
  const hale = rolFazi && haleVar && createPortal(
    <div key={`${d.faz}-${d.tur}-${d.saldiri_sirasi}-${benSaldiran}`}
         className={`bd-duello-hale ${(v2 ? !haleSavunma : benSaldiran) ? "saldiri" : "savunma"} ${kirmizilik >= 1 ? "kritik" : ""}`}
         style={{ "--hale-kirmizi": kirmizilik.toFixed(2) }} aria-hidden="true" />,
    document.body,
  );

  return (
    <div className={`bd-duello ${v2 ? "bd-d2" : ""} ${sonCan ? "son-can" : ""}`}>
      {hale}
      {/* Paket 41 B/H: öteki modlarla aynı üst şerit; X mevcut "Düellodan çık" onayını açar */}
      {d.durum === "aktif" && (
        <MacUstSerit onCik={() => setTerkOnay(true)} cikisEtiketi={ceviri("Düellodan çık")}
                     rozet={ceviri("Düello · Taktik Maçı")} />
      )}
      <div className="bd-duello-ust">
        {oyuncuKart(ben, "sol")}
        <div className={`bd-duello-tur ${v2 && d.uzatma ? "uzatma" : ""}`}>
          {!(v2 && d.uzatma) && <span>{ceviri("Tur")}</span>}
          <b>{v2 && d.uzatma ? c2("UZATMA") : `${d.tur}/${d.max_tur}`}</b>
          {!d.dereceli && <small>{ceviri("Serbest")}</small>}
        </div>
        {oyuncuKart(rakip, "sag")}
      </div>
      {v2 && d.faz === "kategori" && benSaldiran && (
        <div className="bd-d2-rol kategori"><Ikon ad="kilic" boyut={18} /><span>{c2("Kategori seçme sırası sende")}</span></div>
      )}
      {v2 && d.faz === "cevap" && (
        <div className="bd-d2-rol"><Ikon ad="kalkan" boyut={18} /><span>{c2("Aynı soru · aynı anda")}</span></div>
      )}
      {!v2 && rolFazi && (
        <div className={`bd-duello-rol ${benSaldiran ? "saldiri" : "savunma"} ${kirmizilik >= 1 ? "kritik" : ""}`}>
          <Ikon ad={benSaldiran ? "kilic" : "kalkan"} boyut={20} />
          <span>{benSaldiran ? ceviri("SALDIRIYORSUN") : ceviri("SAVUNUYORSUN")}</span>
        </div>
      )}
      {/* Paket 24 · A.4: bağlantı kopması. Kopukken sunucu fazları İLERLETMEZ —
          geri dönen oyuncu canlarını kaybetmiş olmaz. Süre dolarsa bekleyen kazanır. */}
      {d.durum === "aktif" && baglanti?.kopuk && (
        <div className="bd-duello-bant kopuk" role="status">
          <Ikon ad="uyari" boyut={18} />
          <span>
            {baglanti.ben_mi
              ? ceviri("Bağlantın koptu — düello bekliyor.")
              : ceviri("Rakibin bağlantısı koptu — düello durduruldu.")}
            {baglanti.kalan_sn === null || baglanti.kalan_sn === undefined
              ? ""
              : ` ${Math.max(0, baglanti.kalan_sn - Math.floor((simdi - (baglanti.alindi ?? simdi)) / 1000))} ${ceviri("sn")}`}
          </span>
        </div>
      )}
      {ezeliMetin && <div className="bd-duello-ezeli">{ezeliMetin}</div>}
      {d.durum === "aktif" && (ben.can <= 0 || rakip.can <= 0) && (
        <div className="bd-duello-bant kural">
          {ceviri("Eşit hamle kuralı: canı biten oyuncu bu turdaki saldırısını yine de yapar, tur tamamlanınca maç biter.")}
        </div>
      )}

      <div className="bd-duello-sahne" key={`${d.faz}-${d.tur}-${d.saldiri_sirasi}`}>{sahne}</div>

      {hata && <div className="hata-kutu">{hata}</div>}

      {v2 && (
        <V2Skill d={d} calisan={calisan} kalanSn={kalanSn} serbest={jokerSerbest}
                 onKullan={v2SkillKullan} c={c2} />
      )}

      {jokerSeti && (
        <JokerAlani
          set={jokerSeti}
          d={d}
          serbest={jokerSerbest}
          calisan={calisan}
          onKullan={async (tur) => {
            const ok = await eylem(`joker-${tur}`,
              jokerSeti === "saldiri" ? "duello_saldiri_jokeri" : "duello_savunma_jokeri",
              { p_tur: tur });
            if (ok) { sesJoker(); titret(10); }
          }}
          // Paket 27 C: envanterde 0 varsa maç içinde satın alma penceresi açılır.
          onSatinAl={(tur, yalnizAl) => setSatinAlinacak({ tur, yalnizAl: Boolean(yalnizAl) })}
          ceviri={ceviri}
        />
      )}

      {satinAlPenceresi}

      {terkOnay ? (
        <div className="bd-duello-terk-onay" role="alertdialog">
          <span>{ceviri("Düellodan çıkarsan hükmen kaybedersin. Emin misin?")}</span>
          <div className="bd-konum-butonlar">
            <button type="button" className="btn tehlike kucuk" disabled={!!calisan}
                    onClick={() => { setTerkOnay(false); eylem("terk", "duello_terk", {}); }}>
              {ceviri("Çık")}
            </button>
            <button type="button" className="btn ikincil kucuk" onClick={() => setTerkOnay(false)}>
              {ceviri("Vazgeç")}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="bd-duello-terk" disabled={!!calisan} onClick={() => setTerkOnay(true)}>
          {ceviri("Düellodan çık")}
        </button>
      )}
    </div>
  );
}

function SonHamleOzet({ h, ben, ceviri, buyuk = false, secenekler = null }) {
  let metin;
  if (h.dogru && h.riskli) {
    metin = h.saldiran === ben
      ? ceviri("Riskli saldırı geri tepti — sen can kaybettin!")
      : ceviri("En zayıf kategorinde savuşturdun — rakip can kaybetti!");
  } else if (h.dogru) {
    metin = h.savunan === ben ? ceviri("Savuşturdun!") : ceviri("Rakip saldırıyı savuşturdu.");
  } else if (h.cevap === null || h.cevap === undefined) {
    metin = h.savunan === ben ? ceviri("Süre doldu — can kaybettin.") : ceviri("Rakibin süresi doldu — can kaybetti!");
  } else {
    metin = h.savunan === ben ? ceviri("Yanlış — can kaybettin.") : ceviri("İsabet! Rakip can kaybetti.");
  }
  const iyi = h.can_kaybeden && h.can_kaybeden !== ben;
  // Paket 20 IV.2: yanlış/süre dolduysa doğru cevap METİNLE yazılır (yalnız renk yetmiyordu; C düğmesi "üçüncü" okunabiliyordu)
  const dogruMetin = !h.dogru && secenekler && h.dogru_cevap != null ? secenekler[h.dogru_cevap] : null;
  return (
    <>
      <div className={`bd-duello-hamle ${iyi ? "iyi" : h.can_kaybeden ? "kotu" : ""} ${buyuk ? "buyuk" : ""}`}>{metin}</div>
      {dogruMetin && (
        <div className="bd-duello-dogru-cevap">{ceviri("Doğru cevap: {harf} · {metin}", { harf: HARFLER[h.dogru_cevap], metin: dogruMetin })}</div>
      )}
    </>
  );
}

/** Paket 20 IV.2 — maç altın soruyla bittiyse o sorunun doğru cevabı sonuç ekranında. */
function AltinSonucu({ h, ben, soru, secenekler, ceviri }) {
  const benim = h.cevaplar?.[ben];
  const dogru = h.dogru_cevap;
  return (
    <div className="bd-duello-altin-sonuc">
      <div className="bd-mac-soru-etiket">{ceviri("Altın Soru")}</div>
      {soru && <div className="bd-mac-soru-metin">{soru}</div>}
      <div className="bd-duello-dogru-cevap">{ceviri("Doğru cevap: {harf} · {metin}", { harf: HARFLER[dogru], metin: secenekler[dogru] })}</div>
      {benim && benim.cevap != null && !benim.dogru && (
        <div className="bd-mac-soru-not ayri">{ceviri("Senin cevabın: {harf} · {metin}", { harf: HARFLER[benim.cevap], metin: secenekler[benim.cevap] })}</div>
      )}
    </div>
  );
}

function JokerAlani({ set, d, calisan, onKullan, onSatinAl, ceviri, serbest = false }) {
  const j = d.jokerler ?? {};
  const env = j.envanter ?? {};
  const k = j.kullanim ?? {};
  const benSaldiran = d.saldiran === d.ben;
  const seciliSet = new Set(skillSetiOku());
  // Saldırı alanı aktif saldırı registry'sinden gelir; varsayılan savunma
  // loadout'unda Zaman Baskısı seçili değil diye alan boş bırakılamaz.
  const liste = set === "saldiri"
    ? SALDIRI_JOKERLERI
    : macJokerleri("duello", [...seciliSet]).filter((id) => JOKER_BILGI[id]?.target === "self");

  const saldiriAcik = benSaldiran && d.faz === "hazirlik";
  // Paket 28 D: saldırı jokerleri KATEGORİ ekranında da SATIN ALINABİLİR.
  // Hazırlık yalnız 6 saniye (Paket 30 D; ayar duello_hazirlik_sn); jokeri olmayan oyuncunun o sürede altın rozeti
  // fark edip onayı okuyup onaylaması çok dardı. Satın alma kategori seçerken
  // (20 sn) yapılır, KULLANIM yine Hazırlık'ta kalır — maç ritmi uzamaz.
  const saldiriAlinabilir = benSaldiran && (d.faz === "hazirlik" || d.faz === "kategori");
  const savunmaAcik = !benSaldiran && d.faz === "cevap";
  // Paket 27 B: saldırı ve savunma ayrı ayrı değil, TEK toplam hak sayılır.
  // Paket 35 A.3: maç başına hak ücretsiz modda da geçerli (sunucu anahtardan bağımsız uygular)
  const hakKaldi = Number(j.kullanilan ?? 0) < Number(j.hak ?? 0);
  const saldiriHakKaldi = hakKaldi;
  const savunmaHakKaldi = hakKaldi;
  // Düelloda hiçbir joker artık ücretsiz değil (Paket 27 B.1.1 / B.1.4).
  const ucretsizSaldiri = false;
  // Maçta zaten kullanılmış türler — aynı joker maç başına bir kez.
  // Paket 35 A.3: "maçta bir kez" ücretsiz modda da geçerli
  const kullanilanTurler = Array.isArray(k.turler) ? k.turler : [];
  const fiyatlar = j.fiyatlar ?? {};
  const setAcik = set === "saldiri" ? saldiriAcik : savunmaAcik;
  // Paket 20 IV.4: jokerler "yok" sanılıyordu — kapalıyken NEDEN kapalı olduğu yazılır
  const ipucu = !hakKaldi
    ? ceviri("Bu maçtaki joker hakkın doldu.")
    : set === "saldiri"
      ? (setAcik
          ? ceviri("Şimdi kullanabilirsin — soru rakibe gitmeden.")
          : saldiriAlinabilir
            // Paket 28 D: kategori seçerken kullanılamaz ama SATIN ALINABİLİR.
            ? ceviri("Jokerin yoksa şimdi alabilirsin; kullanımı Saldırı Hazırlığı'nda açılır.")
            : ceviri("Saldırı sırasında, soruyu gördüğün Saldırı Hazırlığı'nda açılır."))
      : (setAcik ? ceviri("Şimdi kullanabilirsin.") : ceviri("Soru sana gelince açılır."));

  return (
    <div className={`bd-duello-jokerler ${set} ${(setAcik || (set === "saldiri" && saldiriAlinabilir)) && hakKaldi ? "acik" : "kapali"}`} key={`${set}-${setAcik && hakKaldi}`} aria-label={set === "saldiri" ? ceviri("Saldırı jokerleri") : ceviri("Savunma jokerleri")}>
      <div className="bd-duello-joker-baslik">
        {set === "saldiri" ? ceviri("Saldırı jokerleri") : ceviri("Savunma jokerleri")}
      </div>
      <div className="bd-duello-joker-ipucu" role="status">{ipucu}</div>
      <div className="bd-duello-joker-sira">
        {liste.map((tur) => {
          const adet = Number(env[tur] ?? 0);
          const fiyat = Number(fiyatlar[tur] ?? 0);
          let ucretsiz = false;
          let kullanildi = false;
          let acik;
          if (set === "saldiri") {
            ucretsiz = ucretsizSaldiri;
            kullanildi = (tur === "zaman_baskisi" && d.zaman_baskisi) || kullanilanTurler.includes(tur);
          } else {
            kullanildi = (tur === "elli" && (d.elli_kapali ?? []).length > 0) || (tur === "sure" && d.ek_sure)
              || kullanilanTurler.includes(tur);
          }
          // Paket 27 C: envanterde yoksa düğme KAPANMAZ — satın alma açılır.
          // Paket 28 D: satın alma penceresi KULLANIM penceresinden geniş.
          // Saldırıda kategori ekranı da dahil (20 sn); kullanım yine Hazırlık'ta.
          const alimFazi = set === "saldiri" ? saldiriAlinabilir : savunmaAcik;
          const kullanimFazi = set === "saldiri" ? saldiriAcik : savunmaAcik;
          // Paket 35 A.2: stok yoksa fiyat hep görünür; coin yetmiyorsa alınamaz (soluk fiyat)
          const fiyatGoster = !serbest && !kullanildi && adet <= 0 && fiyat > 0;
          const coinYetmez = j.coin !== null && j.coin !== undefined && Number(j.coin) < fiyat;
          const satilik = fiyatGoster && !coinYetmez && hakKaldi && alimFazi;
          acik = (kullanimFazi && hakKaldi && !kullanildi && (serbest || ucretsiz || adet > 0)) || satilik;
          const ad = set === "saldiri" ? SALDIRI_AD[tur] : SAVUNMA_AD[tur];
          const aciklama = set === "saldiri" ? JOKER_BILGI[tur]?.aciklama : SAVUNMA_ACIKLAMA[tur];
          return (
            <button key={tur} type="button"
                    className={`bd-duello-joker ${kullanildi ? "kullanildi" : ""} ${satilik ? "satilik" : ""}`}
                    disabled={!acik || !!calisan}
                    title={satilik ? ceviri("{0} coin — dokun, al ve kullan").replace("{0}", fiyat)
                      : fiyatGoster && coinYetmez ? ceviri("Yetersiz coin") : ceviri(aciklama)}
                    onClick={() => (satilik ? onSatinAl?.(tur, !kullanimFazi) : onKullan(tur))}>
              {satilik && (
                <span className="bd-joker-satilik" aria-hidden="true"><Ikon ad="coin" boyut={12} /></span>
              )}
              <Ikon ad={JOKER_BILGI[tur]?.ikon ?? "soru"} boyut={20} />
              <span className="bd-duello-joker-ad">{ceviri(ad)}</span>
              <span className={`bd-duello-joker-adet ${fiyatGoster ? "fiyat" : ""} ${fiyatGoster && !satilik ? "soluk" : ""}`}>
                {fiyatGoster ? `${fiyat}` : serbest ? "∞" : `×${adet}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DuelloPage() {
  const { id } = useParams();
  return id ? <DuelloMac id={id} key={id} /> : <DuelloGiris />;
}
