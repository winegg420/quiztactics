// ============================================================
// GÜNEŞ HALKASI — rakip arama ekranının görünümü (Ida seçti: /tasarim-onizleme › arama › B "Güneş Halkası").
//
// TEMBEL PARÇA: AramaSahnesi.jsx bunu lazy() ile yükler (ana paket büyümez). YALNIZ GÖRÜNÜM:
// eşleştirme, zamanlayıcılar, sunucu çağrıları, ses, Esc ve kaydırma kilidi çağıran tarafta
// (RakipAra / DuelloArama / AramaSahnesi) — burada yeni zamanlayıcı YOK. Aşama `durum` prop'undan,
// "Biliyor muydun?" dönüşü `gecen` saniyesinden türetilir.
//
// Akış (süreyi gerçek akış belirler — ARAMA_GECIS_MS = 2000 ms):
//   ariyor/hazirlaniyor → halka + tarama döner, ortada slot makarası akar, yörüngede avatarlar döner.
//   bulundu (+ rakip profili) → yörünge söner, makara rakibin avatarında durur (0–450 ms); halka kapanır,
//   iki avatar soldan/sağdan gelir, VS çarpar (450–1100 ms; VS sesi 450 ms'de); kalan süre VS görünür.
//   Hareketi azalt: durmaz, kök `data-yumusak` → yumusakHareket.js 0,4 hızda oynatır; aşama animasyonları
//   kısaltılmış sürelerle 2 sn'ye sığar (arama-gunes-halkasi.css › reduce bloğu).
//
// iOS: kök position:fixed (body'ye portal çağıran tarafta), kökte ve atalarında transform YOK; 100dvh.
// Performans: yalnız transform/opacity; filter/blur yok; sekme gizliyken bütün hareket duraklar.
// Ekranda "bot" kelimesi GEÇMEZ.
// ============================================================
import { useEffect, useMemo, useRef, useState } from "react";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import IsimEfekti from "./IsimEfekti.jsx";
import OyuncuAdiDugmesi from "./OyuncuAdiDugmesi.jsx";
import OyuncuLigAmblemi from "./OyuncuLigAmblemi.jsx";
import { HAZIR_AVATARLAR } from "../lib/avatarKatalogu.js";
import { aktifDil, tt } from "../lib/dil.js";
import { YUMUSAK, yumusakHareketKur, yumusakMu } from "../tasarim/yumusakHareket.js";
import "../tasarim/ekranlar/arama-gunes-halkasi.css";

yumusakHareketKur();

const LIGLER = ["bronz", "gumus", "altin", "elmas", "efsane"];
const MOD_AD = { klasik: "Klasik", saf: "Saf Bilgi", duello: "Düello", grup: "Grup Maçı" };

// Yeni metinler (TR/EN) — ana paketteki sözlüğü büyütmemek için burada; dil aktifDil() ile seçilir.
const METIN = {
  biliyor: { tr: "Biliyor muydun?", en: "Did you know?" },
  ipucu: { tr: "İpucu", en: "Tip" },
  seviye: { tr: "Seviyene yakın bir rakip", en: "An opponent near your level" },
};
const BILGILER = [
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
  { ipucu: true, duello: true, tr: "Düello'da rakibin zayıf kategorisini seçersen ve o bilirse, canı giden sen olursun.",
    en: "In a Duel, if you pick your rival's weak category and they still get it right, you lose the life." },
];
/** "Biliyor muydun?" kaç saniyede bir değişir (geçen süreden türetilir; ayrı zamanlayıcı yok). */
const BILGI_SN = 7;

const dilSec = () => (aktifDil() === "tr" ? "tr" : "en");
const m = (anahtar) => METIN[anahtar][dilSec()];

// Avatarlar önceden yüklenir (parça inince bir kez): makara dönerken ağdan inmesin, kod çözülmüş olsun.
const AVATARLAR = HAZIR_AVATARLAR.map((a) => a.url);
let yuklendi = false;
function avatarlariOnYukle() {
  if (yuklendi || typeof Image === "undefined") return;
  yuklendi = true;
  for (const src of AVATARLAR) {
    const i = new Image();
    i.decoding = "async";
    i.src = src;
    i.decode?.().catch(() => { /* inemezse makara yine döner */ });
  }
}
avatarlariOnYukle();

function karistir(dizi) {
  const d = [...dizi];
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}

function sureYaz(sn) {
  const s = Math.max(0, Math.floor(sn));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Yuvarlak avatar resmi (makara/yörünge/kilit); resim yoksa baş harf. */
function AvatarResim({ src, ad }) {
  if (src) return <img src={src} alt="" width="120" height="120" decoding="async" draggable="false" referrerPolicy="no-referrer" />;
  return <span className="gh-harf">{(ad ?? "?").charAt(0).toUpperCase()}</span>;
}

/** Sahne zemini: açık gök, turuncu güneş ışınları, kontürlü bulutlar. */
function Zemin() {
  const bulut = "M20 48c-9 0-15-6-15-13s6-13 14-13c2-10 10-17 21-17 9 0 17 5 20 13 3-2 6-3 10-3 10 0 17 7 18 16 9 0 16 6 16 13s-6 12-14 12z";
  return (
    <span className="gh-zemin" aria-hidden="true">
      <span className="gh-gunes"><span className="gh-gunes-isin" /></span>
      {[1, 2, 3].map((n) => (
        <svg key={n} className={`gh-bulut gh-bulut--${n}`} viewBox="0 0 120 56"><path d={bulut} /></svg>
      ))}
    </span>
  );
}

/** VS anındaki oyuncu: çerçeveli avatar, ad (isim efekti), Lv. */
function VsOyuncu({ profil, kart, taraf, boyut }) {
  const level = kart?.level ?? profil?.level;
  return (
    <span className={`gh-vs-kart gh-vs-kart--${taraf}`}>
      <span className="gh-vs-av">
        <CerceveliAvatar profile={profil} userId={profil?.id} boyut={boyut} hareketli {...(kart ? { kart } : {})} />
      </span>
      {/* İsme dokununca oyuncu kartı (OyuncuAdiDugmesi: gizli bot işareti ön izlemeden ayıklanır) */}
      <OyuncuAdiDugmesi userId={profil?.id} profil={profil} oge="b" className="gh-ad" dugmeSinifi="gh-ad-dugme">
        <IsimEfekti userId={profil?.id}>{profil?.gorunen_ad ?? tt("Sen")}</IsimEfekti>
      </OyuncuAdiDugmesi>
      {level != null && <span className="gh-lv">{tt("Lv {0}", { 0: level })}</span>}
    </span>
  );
}

/**
 * Görünüm. Prop'ların anlamı AramaSahnesi ile aynı; ek olarak:
 * @param {string} baslik        hazır başlık metni
 * @param {object} ben           oyuncunun profili (id dahil)
 * @param {object} kartlar       {id: {level, lig, …}} (useOyuncuSeviyeleri)
 * @param {number} gecisMs       VS anının süresi (ARAMA_GECIS_MS) — "Maç başlıyor" şeridi bu sürede dolar
 * @param {object} iptalRef      İptal düğmesinin ref'i (ilk odak)
 */
export default function AramaGunesHalkasi({
  mod = "klasik", dereceli = true, gecen = 0, durum = "ariyor", rakip = null, ezeli = null, bilgi = null,
  alt = null, hata = null, onIptal, onTekrar, baslik, ben, kartlar = {}, gecisMs = 2000, iptalRef,
}) {
  const bulundu = durum === "bulundu";
  const vs = bulundu && Boolean(rakip);
  // Düello: rakibin profili bulunma anından sonra ayrı okumayla gelir; maça geçiş anı sabit (ARAMA_GECIS_MS,
  // çağıran tarafta) ve sunucuda kategori süresi düello kurulunca işlemeye başladığı için geçiş ERTELENMEZ.
  // Profil geç gelirse (> 200 ms) makara durma aşaması atlanır, VS hemen çarpar → VS ekranda en uzun kalır.
  const bulunmaRef = useRef(null);
  if (bulundu && bulunmaRef.current === null) bulunmaRef.current = performance.now();
  const vsHemen = useMemo(
    () => vs && bulunmaRef.current !== null && performance.now() - bulunmaRef.current > 200,
    [vs],
  );
  const benKart = kartlar[ben?.id];
  const lig = LIGLER.includes(benKart?.lig ?? ben?.lig) ? (benKart?.lig ?? ben?.lig) : null;
  const benLevel = benKart?.level ?? ben?.level;
  const yumusak = useMemo(() => yumusakMu(), []);

  // Arama başına bir kez: makara ve yörünge için ayrı avatarlar (kendi avatarın hariç), ilk bilgi
  const secim = useMemo(() => {
    const havuz = karistir(AVATARLAR.filter((a) => a !== ben?.gorunen_avatar));
    return { makara: havuz.slice(0, 8), yorunge: havuz.slice(8, 16), ilkBilgi: Math.floor(Math.random() * BILGILER.length) };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // Grup maçı ödülsüz: Dereceli/Serbest ipucu orada anlamsız (yalnız bilgiler döner)
  const bilgiler = useMemo(() => BILGILER.filter((b) => (!b.duello || mod === "duello") && (mod !== "grup" || !b.ipucu)), [mod]);
  const bilgiNo = (secim.ilkBilgi + Math.floor(gecen / BILGI_SN)) % bilgiler.length;
  const b = bilgiler[bilgiNo];

  // VS avatar boyutu: ekrana göre (CerceveliAvatar sayısal boyut ister)
  const vsBoyut = useMemo(() => {
    if (typeof window === "undefined") return 132;
    return Math.round(Math.max(88, Math.min(window.innerWidth * 0.34, window.innerHeight * 0.2, 156)));
  }, []);

  // Sekme gizliyken bütün hareket duraklar (tam ekran katman: ekran dışında kalmaz)
  const [gizli, setGizli] = useState(() => typeof document !== "undefined" && document.visibilityState === "hidden");
  useEffect(() => {
    const d = () => setGizli(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", d);
    return () => document.removeEventListener("visibilitychange", d);
  }, []);

  // Parça tembel indiği için çağıranın ilk odak denemesi boşa düşebilir: İptal'e burada odaklan
  useEffect(() => { iptalRef?.current?.focus?.({ preventScroll: true }); }, [iptalRef]);

  const dil = dilSec();
  return (
    <div className={`gh gh--${durum}${vs ? " gh--vs" : ""}${vsHemen ? " gh--vs-hemen" : ""}`} data-yumusak="" data-durdu={gizli ? "1" : undefined}
         role="dialog" aria-modal="true" aria-labelledby="ara-baslik">
      <Zemin />

      <header className="gh-ust">
        <span className="gh-ben">
          <CerceveliAvatar profile={ben} userId={ben?.id} boyut={50} {...(benKart ? { kart: benKart } : {})} />
          <span className="gh-ben-yazi">
            <OyuncuAdiDugmesi userId={ben?.id} profil={ben} oge="b" className="gh-ad gh-ad--kucuk" dugmeSinifi="gh-ad-dugme">
              <IsimEfekti userId={ben?.id}>{ben?.gorunen_ad ?? tt("Sen")}</IsimEfekti>
            </OyuncuAdiDugmesi>
            <span className="gh-ben-alt">
              {benLevel != null && <span className="gh-lv">{tt("Lv {0}", { 0: benLevel })}</span>}
              {lig && <OyuncuLigAmblemi lig={lig} boyut={22} />}
            </span>
          </span>
        </span>
        <span className="gh-sure" role="timer" aria-label={tt("{0} saniye geçti", { 0: gecen })}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 9v4l3 2M9 2h6" /></svg>
          {sureYaz(gecen)}
        </span>
      </header>

      <div className="gh-rozetler">
        <span className={`gh-rozet gh-rozet--${MOD_AD[mod] ? mod : "klasik"}`}>{tt(MOD_AD[mod] ?? MOD_AD.klasik)}</span>
        {mod === "grup" ? (
          /* Çok oyunculu bağlam: grup maçı ödülsüz; kaç kişiyle oynanacağı */
          <>
            <span className="gh-rozet gh-rozet--serbest">{tt("Ödülsüz")}</span>
            <span className="gh-rozet gh-rozet--kisi">{tt("3–5 oyuncu")}</span>
          </>
        ) : (
          <span className={`gh-rozet gh-rozet--${dereceli ? "dereceli" : "serbest"}`}>{dereceli ? tt("Dereceli") : tt("Serbest")}</span>
        )}
      </div>
      {bilgi && !bulundu && <p className="gh-not" role="status">{bilgi}</p>}

      <main className="gh-sahne">
        <div className="gh-alan">
          <div className="gh-halka">
            <span className="gh-radar" aria-hidden="true">
              <span className="gh-radar-halka gh-radar-halka--1" />
              <span className="gh-radar-halka gh-radar-halka--2" />
              <span className="gh-radar-tarama" />
              <span className="gh-radar-dalga" />
              <span className="gh-radar-dalga gh-radar-dalga--2" />
            </span>
            <span className="gh-yorunge" aria-hidden="true">
              {secim.yorunge.map((src, i) => (
                <span key={src} className="gh-uydu" style={{ "--i": i }}>
                  <span className="gh-uydu-ic"><img src={src} alt="" width="120" height="120" decoding="async" draggable="false" /></span>
                </span>
              ))}
            </span>
            <span className="gh-merkez" aria-hidden="true">
              {vs ? (
                <span className="gh-makara-kilit" key="kilit"><AvatarResim src={rakip.gorunen_avatar} ad={rakip.gorunen_ad} /></span>
              ) : durum === "hata" ? (
                <span className="gh-makara-kilit" key="hata"><span className="gh-harf">?</span></span>
              ) : (
                <span className="gh-makara-serit" key="serit">
                  {[...secim.makara, ...secim.makara].map((src, i) => (
                    <img key={i} src={src} alt="" width="120" height="120" decoding="async" draggable="false" />
                  ))}
                </span>
              )}
            </span>
          </div>

          {vs && (
            <div className="gh-vs">
              <VsOyuncu profil={ben} kart={benKart} taraf="ben" boyut={vsBoyut} />
              <span className="gh-vs-yazi" aria-hidden="true"><span>VS</span></span>
              <VsOyuncu profil={rakip} kart={kartlar[rakip.id]} taraf="rakip" boyut={vsBoyut} />
            </div>
          )}
        </div>

        <div className="gh-durum" key={durum}>
          <h1 id="ara-baslik" className="gh-baslik" aria-live="polite">{baslik}</h1>
          {hata ? (
            <p className="gh-hata" role="alert">{hata}</p>
          ) : bulundu ? (
            <p className={ezeli ? "gh-alt gh-alt--ezeli" : "gh-alt"}>{ezeli ?? m("seviye")}</p>
          ) : (
            alt && <div className="gh-alt">{alt}</div>
          )}
        </div>
      </main>

      <footer className="gh-alt-bolum">
        {!hata && (
          <aside className="gh-bilgi" key={bilgiNo}>
            <span className="gh-bilgi-ikon" aria-hidden="true">{b.ipucu ? "!" : "?"}</span>
            <span className="gh-bilgi-metin">
              <b>{b.ipucu ? m("ipucu") : m("biliyor")}</b>
              <span>{b[dil]}</span>
            </span>
          </aside>
        )}
        {hata && onTekrar && (
          <button type="button" className="gh-dugme gh-dugme--ana" onClick={onTekrar}>{tt("Tekrar dene")}</button>
        )}
        {bulundu ? (
          <span className="gh-baslat" aria-hidden="true">
            <span className="gh-baslat-dolgu"
                  style={{ animationDuration: `${Math.round(yumusak ? gecisMs * YUMUSAK.hiz : gecisMs)}ms` }} />
            <b>{tt("Maç başlıyor…")}</b>
          </span>
        ) : (
          <button ref={iptalRef} type="button" className="gh-dugme" onClick={onIptal}>{tt("İptal")}</button>
        )}
      </footer>
    </div>
  );
}
