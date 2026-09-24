// Rakip arama ADAYLARI — ortak parçalar: sahte zamanlayıcı (aşama döngüsü), avatar listesi, "Biliyor muydun?"
// bilgileri, TR/EN metinler, slot makarası. YALNIZ ÖNİZLEME: sunucuya gitmez, oyunun dosyalarını değiştirmez.
//
// Döngü: arama (4–6 sn) → rakip bulundu (kart kayarak gelir) → VS (~2 sn) → "Maç başlıyor" → baştan.
// Sanal saat yalnız sahne görünürken ilerler (IntersectionObserver + sekme gizliyse durur); CSS animasyonları da
// aynı anda `data-durdu` ile duraklar. "Hareketi azalt"ta durmaz, yavaşlar: kök `data-yumusak` taşır →
// oyun/tasarim/yumusakHareket.js CSS animasyonlarını 0,4 hızda oynatır; aşama süreleri de aynı oranda uzar.
import { useEffect, useMemo, useRef, useState } from "react";
import { aktifDil } from "../../../lib/dil.js";
import { YUMUSAK, yumusakHareketKur, yumusakMu } from "../../yumusakHareket.js";

yumusakHareketKur();

// ---------------------------------------------------------------- metinler (TR/EN, dil.js'e dokunmadan)
const METIN = {
  tr: {
    ariyor: "Rakip aranıyor…", bulundu: "Rakip bulundu!", hazir: "Maç başlıyor…", vs: "Karşılaşma",
    klasik: "Klasik", duello: "Düello", serbest: "Serbest", dereceli: "Dereceli",
    karisik: "Karışık kategori", klasikAlt: "10 soru", duelloAlt: "3 can · kategoriyi saldıran seçer",
    biliyor: "Biliyor muydun?", ipucu: "İpucu", iptal: "İptal", kapat: "Kapat", sen: "Sen", lv: "Lv {0}",
    seviye: "Seninle aynı seviyede biri aranıyor", rakipYeri: "Senin seviyende biri", eslesti: "Seviyene yakın bir rakip",
    gecen: "{0} saniye geçti", basliyorAlt: "Hazır ol!", lig: "Altın Lig",
  },
  en: {
    ariyor: "Finding an opponent…", bulundu: "Opponent found!", hazir: "Match starting…", vs: "Face-off",
    klasik: "Classic", duello: "Duel", serbest: "Casual", dereceli: "Ranked",
    karisik: "Mixed categories", klasikAlt: "10 questions", duelloAlt: "3 lives · attacker picks the category",
    biliyor: "Did you know?", ipucu: "Tip", iptal: "Cancel", kapat: "Close", sen: "You", lv: "Lv {0}",
    seviye: "Looking for someone at your level", rakipYeri: "Someone at your level", eslesti: "An opponent near your level",
    gecen: "{0} seconds passed", basliyorAlt: "Get ready!", lig: "Gold League",
  },
};
export function m(anahtar, d) {
  const dil = aktifDil() === "tr" ? "tr" : "en";
  let s = METIN[dil][anahtar] ?? METIN.tr[anahtar] ?? anahtar;
  if (d) for (const [k, v] of Object.entries(d)) s = s.replace(`{${k}}`, v);
  return s;
}

// ---------------------------------------------------------------- "Biliyor muydun?" (her turda değişir; doğru bilgiler)
export const BILGILER = [
  { tr: "Ahtapotun üç kalbi vardır: ikisi solungaçlara, biri vücuda kan pompalar.",
    en: "An octopus has three hearts: two pump blood to the gills, one to the body." },
  { tr: "Venüs'te bir gün, Venüs'ün bir yılından daha uzundur.",
    en: "A day on Venus is longer than a year on Venus." },
  { tr: "Güneş'ten çıkan ışık Dünya'ya yaklaşık 8 dakikada ulaşır.",
    en: "Sunlight takes about 8 minutes to reach Earth." },
  { tr: "Göbeklitepe, Stonehenge'den 6.000 yıldan daha eskidir.",
    en: "Göbeklitepe is more than 6,000 years older than Stonehenge." },
  { tr: "İnsan vücudunun en küçük kemiği kulaktaki üzengi kemiğidir.",
    en: "The smallest bone in the human body is the stapes, in the ear." },
  { tr: "Zürafanın boynunda da insanınki gibi yalnız 7 omur vardır.",
    en: "A giraffe's neck has just 7 vertebrae — the same as a human's." },
  { tr: "Botanikte muz bir üzümsü meyvedir (dut sınıfı); çilek ise değildir.",
    en: "Botanically, a banana is a berry — but a strawberry isn't." },
  { tr: "Kutup ayısının kürkünün altındaki derisi siyahtır.",
    en: "Under its fur, a polar bear's skin is black." },
  { tr: "Ay, Dünya'dan her yıl yaklaşık 3,8 cm uzaklaşıyor.",
    en: "The Moon drifts about 3.8 cm farther from Earth every year." },
  { tr: "Eyfel Kulesi yaz sıcağında metal genleştiği için birkaç santim uzar.",
    en: "The Eiffel Tower grows a few centimetres taller in summer as its iron expands." },
  { tr: "Bal doğru saklanırsa bozulmaz; Mısır mezarlarında binlerce yıllık bal bulundu.",
    en: "Stored well, honey never spoils — jars thousands of years old were found in Egyptian tombs." },
  { tr: "Dünya'daki en yüksek sıcaklık kayıtlarından biri Death Valley'de ölçüldü: 56,7 °C.",
    en: "One of the highest temperatures ever recorded was 56.7 °C, in Death Valley." },
  { ipucu: true, tr: "Dereceli maçlar lig puanı kazandırır; Serbest'te lig puanı yok, coin yarıdır.",
    en: "Ranked matches earn league points; Casual has no league points and half the coins." },
  { ipucu: true, tr: "Düello'da rakibin zayıf kategorisini seçersen ve o bilirse, canı giden sen olursun.",
    en: "In a Duel, if you pick your rival's weak category and they still get it right, you lose the life." },
];

// ---------------------------------------------------------------- avatarlar (oyunda açık olanlar)
const PRO = ["ahtapot-k13", "ari-k14", "asci-k23", "astronot-k17", "ayi-k08", "baykus-k03", "buyucu-k21", "dedektif-k22",
  "dinozor-k10", "ejderha-k11", "hayalet-k26", "kahraman-k29", "kedi-k01", "kopek-k02", "kopekbaligi-k12", "korsan-k19",
  "kral-k31", "kurbaga-k07", "maymun-k09", "mumya-k28", "ninja-k18", "palyaco-k30", "panda-k05", "penguen-k06",
  "profesor-k24", "robot-k15", "sovalye-k20", "tilki-k04", "uzayli-k16", "viking-k25", "zombi-k27"];
// 596: kasli-sampiyon-y33, demir-pazi-y34, fitness-kralicesi-y35, kedili-genc-y36 kapalı → listede yok
const PRO2 = ["android-y32", "ates-buyucu-y20", "basortulu-y04", "bilim-y11", "canavar-y25", "dede-y08", "doktor-y12",
  "gece-y23", "golge-ninja-y14", "gozluklu-y05", "gozsapli-uzayli-y29", "hostes-y39", "kaptan-y17", "kedili-kiz-y37",
  "kel-y06", "kivircik-y02", "kizil-y03", "kralice-y27", "kristal-uzayli-y28", "mekanik-y21", "noel-baba-y16",
  "ogrenci-y10", "pelerinli-y22", "pilot-y38", "sakalli-y07", "samuray-y15", "sarisin-y01", "savas-robotu-y30",
  "siborg-y31", "sporcu-y09", "uzay-kasifi-y18", "uzay-sovalye-y24", "vampir-y19", "veteriner-y13", "yuce-kral-y26"];
export const AVATARLAR = [...PRO.map((a) => `/avatars/pro/${a}.svg`), ...PRO2.map((a) => `/avatars/pro2/${a}.svg`)];

export const BEN = { ad: "Deniz", avatar: "/avatars/pro/astronot-k17.svg", level: 14 };
const RAKIP_ADLARI = ["Ekin", "Mert_42", "Zeynep", "KaanBey", "Elif.S", "Bora", "Ada", "Yiğit", "Selin", "Arda", "Nehir", "Tuna"];

// Avatarlar önceden yüklenir (bir kez; makara dönerken ağdan inmesin, kod çözülmüş olsun).
let yuklendi = false;
export function avatarlariOnYukle() {
  if (yuklendi || typeof Image === "undefined") return;
  yuklendi = true;
  for (const src of AVATARLAR) {
    const i = new Image();
    i.decoding = "async";
    i.src = src;
    i.decode?.().catch(() => { /* yüklenemezse makara yine döner */ });
  }
}

function karistir(dizi, n) {
  const d = [...dizi];
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return n ? d.slice(0, n) : d;
}

/** Bir tur: rakip, makara şeridi, bilgi, arama süresi. */
function turKur(oncekiBilgi) {
  const rakipAvatar = AVATARLAR[Math.floor(Math.random() * AVATARLAR.length)];
  let bilgi = Math.floor(Math.random() * BILGILER.length);
  if (bilgi === oncekiBilgi) bilgi = (bilgi + 1) % BILGILER.length;
  return {
    rakip: {
      ad: RAKIP_ADLARI[Math.floor(Math.random() * RAKIP_ADLARI.length)],
      avatar: rakipAvatar,
      level: 9 + Math.floor(Math.random() * 11),
    },
    makara: karistir(AVATARLAR.filter((a) => a !== rakipAvatar && a !== BEN.avatar), 8),
    yorunge: karistir(AVATARLAR.filter((a) => a !== rakipAvatar && a !== BEN.avatar), 8),
    bilgi,
    aramaMs: 4000 + Math.round(Math.random() * 2000),
  };
}

// Aşama süreleri (ms, normal hızda). Yumuşak modda 1 / YUMUSAK.hiz ile uzar (CSS ile aynı oran).
const SURE = { bulundu: 1100, vs: 2000, basliyor: 1700 };

/**
 * Sahte arama döngüsü. `gorunur` false iken sanal saat durur.
 * @returns {{asama, gecen, tur, yeniden, yumusak}}
 */
export function useAramaDongusu({ gorunur, sadeceArama = false }) {
  const yumusak = useMemo(() => yumusakMu(), []);
  const carpan = yumusak ? 1 / YUMUSAK.hiz : 1;
  const [tur, setTur] = useState(() => ({ no: 0, ...turKur(-1) }));
  const [asama, setAsama] = useState("ariyor");
  const [gecen, setGecen] = useState(0);
  const saat = useRef(0);   // bu turda geçen sanal süre (ms)
  const turRef = useRef(tur);
  turRef.current = tur;

  useEffect(() => { avatarlariOnYukle(); }, []);

  useEffect(() => {
    if (!gorunur) return undefined;
    let onceki = performance.now();
    const adim = () => {
      const simdi = performance.now();
      // Sekme arka plandaysa ya da uzun bir takılma olduysa saat sıçramasın
      saat.current += Math.min(simdi - onceki, 400);
      onceki = simdi;
      const t = saat.current;
      const ara = turRef.current.aramaMs * (yumusak ? 1.25 : 1);   // arama yavaş modda biraz uzar (sayaç gerçek saniye)
      const b1 = ara + SURE.bulundu * carpan;
      const b2 = b1 + (sadeceArama ? 0 : SURE.vs * carpan);
      const b3 = b2 + SURE.basliyor * carpan;
      let yeni;
      if (t < ara) yeni = "ariyor";
      else if (t < b1) yeni = "bulundu";
      else if (!sadeceArama && t < b2) yeni = "vs";
      else if (t < b3) yeni = "basliyor";
      else {
        saat.current = 0;
        const eski = turRef.current;
        setTur({ no: eski.no + 1, ...turKur(eski.bilgi) });
        yeni = "ariyor";
      }
      setAsama(yeni);
      setGecen(yeni === "ariyor" ? Math.floor(saat.current / 1000) : Math.floor(Math.min(saat.current, ara) / 1000));
    };
    const id = window.setInterval(adim, 200);
    return () => window.clearInterval(id);
  }, [gorunur, yumusak, carpan, sadeceArama]);

  const yeniden = () => {
    saat.current = 0;
    setAsama("ariyor");
    setGecen(0);
    setTur((eski) => ({ no: eski.no + 1, ...turKur(eski.bilgi) }));
  };

  return { asama, gecen, tur, yeniden, yumusak };
}

/** Öğe ekranda mı (IntersectionObserver) + sekme görünür mü. */
export function useGorunur(ref) {
  const [ekranda, setEkranda] = useState(false);
  const [sekme, setSekme] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") { setEkranda(true); return undefined; }
    const io = new IntersectionObserver(([g]) => setEkranda(g.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  useEffect(() => {
    const d = () => setSekme(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", d);
    return () => document.removeEventListener("visibilitychange", d);
  }, []);
  return ekranda && sekme;
}

export function sureYaz(sn) {
  const s = Math.max(0, Math.floor(sn));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Slot makarası: arama sürerken avatarlar dikey şeritte hızla akar; bulununca rakip "oturur". */
export function Makara({ liste, rakip, durdu, className = "" }) {
  return (
    <span className={`ra-makara ${className}`} aria-hidden="true">
      {!durdu ? (
        <span className="ra-makara-serit" key="serit">
          {[...liste, ...liste].map((src, i) => (
            <img key={i} src={src} alt="" width="120" height="120" decoding="async" draggable="false" />
          ))}
        </span>
      ) : (
        <span className="ra-makara-kilit" key="kilit">
          <img src={rakip} alt="" width="120" height="120" decoding="async" draggable="false" />
        </span>
      )}
    </span>
  );
}

/** Dönen arama halkası / radar (yalnız transform). */
export function Radar({ className = "" }) {
  return (
    <span className={`ra-radar ${className}`} aria-hidden="true">
      <span className="ra-radar-halka ra-radar-halka--1" />
      <span className="ra-radar-halka ra-radar-halka--2" />
      <span className="ra-radar-tarama" />
      <span className="ra-radar-dalga" />
      <span className="ra-radar-dalga ra-radar-dalga--2" />
    </span>
  );
}

/** Sahne zemini: açık gök, turuncu güneş ışınları, kontürlü bulutlar. */
export function Zemin() {
  return (
    <span className="ra-zemin" aria-hidden="true">
      <span className="ra-gunes"><span className="ra-gunes-isin" /></span>
      <svg className="ra-bulut ra-bulut--1" viewBox="0 0 120 56"><path d="M20 48c-9 0-15-6-15-13s6-13 14-13c2-10 10-17 21-17 9 0 17 5 20 13 3-2 6-3 10-3 10 0 17 7 18 16 9 0 16 6 16 13s-6 12-14 12z" /></svg>
      <svg className="ra-bulut ra-bulut--2" viewBox="0 0 120 56"><path d="M20 48c-9 0-15-6-15-13s6-13 14-13c2-10 10-17 21-17 9 0 17 5 20 13 3-2 6-3 10-3 10 0 17 7 18 16 9 0 16 6 16 13s-6 12-14 12z" /></svg>
      <svg className="ra-bulut ra-bulut--3" viewBox="0 0 120 56"><path d="M20 48c-9 0-15-6-15-13s6-13 14-13c2-10 10-17 21-17 9 0 17 5 20 13 3-2 6-3 10-3 10 0 17 7 18 16 9 0 16 6 16 13s-6 12-14 12z" /></svg>
    </span>
  );
}

/** "Biliyor muydun?" kartı — tur değişince yeniden girer. */
export function BilgiKarti({ bilgi, turNo, className = "" }) {
  const b = BILGILER[bilgi] ?? BILGILER[0];
  const dil = aktifDil() === "tr" ? "tr" : "en";
  return (
    <aside className={`ra-bilgi ${className}`} key={turNo}>
      <span className="ra-bilgi-ikon" aria-hidden="true">{b.ipucu ? "!" : "?"}</span>
      <span className="ra-bilgi-metin">
        <b>{b.ipucu ? m("ipucu") : m("biliyor")}</b>
        <span>{b[dil]}</span>
      </span>
    </aside>
  );
}

/** Mod + Serbest/Dereceli rozetleri. */
export function Rozetler({ mod, dereceli }) {
  return (
    <span className="ra-rozetler">
      <span className={`ra-rozet ra-rozet--${mod}`}>{m(mod)}</span>
      <span className={`ra-rozet ${dereceli ? "ra-rozet--dereceli" : "ra-rozet--serbest"}`}>{dereceli ? m("dereceli") : m("serbest")}</span>
    </span>
  );
}

export function Sure({ gecen }) {
  return (
    <span className="ra-sure" role="timer" aria-label={m("gecen", { 0: gecen })}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6" /></svg>
      {sureYaz(gecen)}
    </span>
  );
}

/** Lig rozeti (küçük altın kalkan). */
export function LigRozet() {
  return (
    <span className="ra-lig" title={m("lig")} aria-label={m("lig")}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 2l8 3v6c0 5-3.4 9.3-8 11-4.6-1.7-8-6-8-11V5z" /></svg>
    </span>
  );
}

/** Alt düğme: kutuda görsel "İptal" (bulununca soluk); tam ekranda gerçek düğme — önizlemeyi kapatır. */
export function IptalDugmesi({ ariyor, onIptal, iptalRef }) {
  if (onIptal) {
    return (
      <button ref={iptalRef} type="button" className="ra-iptal" onClick={onIptal}>
        {ariyor ? m("iptal") : m("kapat")}
      </button>
    );
  }
  return <span className={`ra-iptal${ariyor ? "" : " ra-iptal--kapali"}`} aria-hidden="true">{m("iptal")}</span>;
}
