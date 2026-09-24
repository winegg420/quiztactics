// /avatar-onizleme — 27 yeni profil avatarının sahip onayı (Ajan A, 24 Eyl 2026).
// Menüde yok; yalnız sahip hesabıyla açılır (sunucu: sahip_mi() — avatar_onizleme_listesi / avatar_onay_kaydet,
// migration 520). Seçim sunucuda durur; normal oyuncu bir avatarı ancak "Oyuna girsin" VE
// oyun_ayarlari.kozmetik_satis_acik açıkken görür. Görseller statik dosyadan (public/avatars/pro2) —
// kaynak oyun/components/AvatarProIllustrations2.jsx, üretici oyun/_test/avatar-pro-uret.mjs.
// 3. set (12 yeni, Ajan C 24 Eyl): kaynak AvatarProIllustrations3.jsx, dosyalar yine public/avatars/pro2,
// katalog migration 595 (aktif = false). 595 henüz uygulanmadıysa sunucu listesinde yoktur → kart
// "katalogda yok — migration bekliyor" der, seçim bu tarayıcıda (localStorage) durur; "Seçimlerimi kopyala"
// her durumda düz liste verir. Çizim modülü buraya import edilmez (yalnız statik SVG).
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../src/lib/supabase.js";
import { aktifDil, tt } from "../../lib/dil.js";
import { QtBosDurum, QtDugme, QtIlerleme, QtIskelet, QtKart, QtRozet } from "../index.js";
import "./avatar-onizleme.css";

// Sayfa-içi İngilizce (paylaşımlı sözlüğe girmez → ana paket büyümez).
const EN = {
  "Yeni avatarlar": "New avatars",
  "Her avatarı büyük ve 40 px hâliyle gör; oyuna girsin mi karar ver. Seçimin sunucuda saklanır.": "See each avatar large and at 40 px, then decide whether it goes into the game. Your choice is saved on the server.",
  "{n} / {t} seçildi": "{n} / {t} selected",
  "Karar bekleyen: {n}": "Undecided: {n}",
  "Satış kapalı — seçtiklerin, kozmetik satışı açılınca oyunculara görünür.": "Sales are closed — your picks become visible to players once cosmetic sales open.",
  "Satış açık — seçtiklerin oyunculara görünür.": "Sales are open — your picks are visible to players.",
  "Karşılaştırma: mevcut avatarlar": "Comparison: current avatars",
  "Günlük": "Everyday",
  "Kostümlü": "Costume",
  "Bedava": "Free",
  "{n} elmas": "{n} diamonds",
  "Oyuna girsin": "Add to game",
  "Girmesin": "Leave out",
  "Kaydedilemedi": "Could not save",
  "Bu sayfa yalnız sahibe açık": "This page is only for the owner",
  "Avatar onayını yalnız oyunun sahibi yapabilir.": "Only the game owner can approve avatars.",
  "Avatarlar yüklenemedi": "Avatars could not be loaded",
  "Ana sayfaya dön": "Back to home",
  "Tekrar dene": "Try again",
  "{ad}, 40 piksel": "{ad}, 40 pixels",
  "Yeni 12 — onay bekliyor": "New 12 — awaiting approval",
  "Katalogda yok — migration bekliyor": "Not in catalog — migration pending",
  "Kapalı — onayınla açılır": "Hidden — opens after your approval",
  "Oyunda": "In game",
  "Seçimlerim": "My choices",
  "Girsin": "In",
  "Karar verilmedi": "Undecided",
  "Seçimlerimi kopyala": "Copy my choices",
  "Kopyalandı — bana yapıştırabilirsin.": "Copied — you can paste it to me.",
  "Pano izin vermedi — aşağıdaki metni seçip kopyala.": "Clipboard blocked — select and copy the text below.",
  "Kopyalanacak metin": "Text to copy",
};
function ts(anahtar, degerler) {
  const metin = aktifDil() === "en" && EN[anahtar] ? EN[anahtar] : tt(anahtar);
  if (!degerler) return metin;
  return metin.replace(/\{(\w+)\}/g, (tam, ad) => (ad in degerler ? String(degerler[ad] ?? "") : tam));
}
const adi = (a) => (aktifDil() === "en" ? a.ad_en : a.ad_tr);

// 3. set — sıra/anahtar migration 595 ve AvatarProIllustrations3.jsx › AVATAR_PRO3 ile aynı.
// Sunucu satırı yoksa (595 uygulanmamış) bu yedek bilgiyle gösterilir.
const YENI_12 = [
  ["kristal-uzayli-y28", "Kristal Uzaylı", "Crystal Alien", "kostumlu"],
  ["gozsapli-uzayli-y29", "Göz Saplı Uzaylı", "Eyestalk Alien", "kostumlu"],
  ["savas-robotu-y30", "Savaş Robotu", "Battle Mech", "kostumlu"],
  ["siborg-y31", "Siborg", "Cyborg", "kostumlu"],
  ["android-y32", "Android", "Android", "kostumlu"],
  ["kasli-sampiyon-y33", "Kaslı Şampiyon", "Muscle Champ", "gunluk"],
  ["demir-pazi-y34", "Demir Pazı", "Iron Biceps", "gunluk"],
  ["fitness-kralicesi-y35", "Fitness Kraliçesi", "Fitness Queen", "gunluk"],
  ["kedili-genc-y36", "Kedili Genç", "Cat Buddy", "gunluk"],
  ["kedili-kiz-y37", "Kedili Kız", "Kitten Friend", "gunluk"],
  ["pilot-y38", "Pilot", "Pilot", "gunluk"],
  ["hostes-y39", "Hostes", "Flight Attendant", "gunluk"],
].map(([anahtar, ad_tr, ad_en, tur], i) => ({
  anahtar, ad_tr, ad_en, tur, url: `/avatars/pro2/${anahtar}.svg`, fiyat_elmas: 0, sira: 28 + i,
  aktif: false, onay: "bekliyor", yerel: true,
}));
const YENI_ANAHTAR = new Set(YENI_12.map((a) => a.anahtar));

// Katalog satırı olmayan (migration bekleyen) avatarların seçimi — yalnız bu tarayıcı.
const YEREL_ANAHTAR = "bildim_avatar_onizleme_yerel";
function yerelOku() {
  try {
    const d = JSON.parse(window.localStorage.getItem(YEREL_ANAHTAR) || "{}");
    return d && typeof d === "object" ? d : {};
  } catch { return {}; }
}
function yerelYaz(d) {
  try { window.localStorage.setItem(YEREL_ANAHTAR, JSON.stringify(d)); } catch { /* gizli pencere: sessiz */ }
}

// Ayırt edilemezlik kontrolü için mevcut 31'den birkaçı (aynı çizim dili).
const KARSILASTIRMA = [
  ["/avatars/pro/kedi-k01.svg", "Kedi"],
  ["/avatars/pro/astronot-k17.svg", "Astronot"],
  ["/avatars/pro/korsan-k19.svg", "Korsan"],
  ["/avatars/pro/profesor-k24.svg", "Profesör"],
  ["/avatars/pro/ninja-k18.svg", "Ninja"],
  ["/avatars/pro/kral-k31.svg", "Kral"],
];

function AvatarKarti({ a, kaydediliyor, onSec }) {
  const ad = adi(a);
  return (
    <QtKart className={`ao-kart ao-kart--${a.onay}`}>
      <div className="ao-gorseller">
        <img className="ao-buyuk" src={a.url} alt={ad} width="320" height="320" loading="lazy" decoding="async" />
        <img className="ao-kucuk" src={a.url} alt={ts("{ad}, 40 piksel", { ad })} width="40" height="40" loading="lazy" decoding="async" />
      </div>
      <div className="ao-kart-bas">
        <h3 className="ao-ad">{ad}</h3>
        <QtRozet ton={a.tur === "kostumlu" ? "mor" : "dogru"}>
          {a.tur === "kostumlu" && a.fiyat_elmas > 0 ? ts("{n} elmas", { n: a.fiyat_elmas }) : ts("Bedava")}
        </QtRozet>
      </div>
      {YENI_ANAHTAR.has(a.anahtar) && (
        <p className={`ao-durum${a.yerel ? " ao-durum--yerel" : ""}`}>
          {a.yerel ? ts("Katalogda yok — migration bekliyor") : a.aktif ? ts("Oyunda") : ts("Kapalı — onayınla açılır")}
        </p>
      )}
      <div className="ao-secim" role="group" aria-label={ad}>
        <QtDugme
          boyut="k"
          tur={a.onay === "girsin" ? "birincil" : "ikincil"}
          ikon="onay"
          aria-pressed={a.onay === "girsin"}
          yukleniyor={kaydediliyor === "girsin"}
          devreDisi={Boolean(kaydediliyor)}
          onClick={() => onSec(a, a.onay === "girsin" ? "bekliyor" : "girsin")}
        >
          {ts("Oyuna girsin")}
        </QtDugme>
        <QtDugme
          boyut="k"
          tur={a.onay === "girmesin" ? "tehlike" : "ikincil"}
          ikon="kapat"
          aria-pressed={a.onay === "girmesin"}
          yukleniyor={kaydediliyor === "girmesin"}
          devreDisi={Boolean(kaydediliyor)}
          onClick={() => onSec(a, a.onay === "girmesin" ? "bekliyor" : "girmesin")}
        >
          {ts("Girmesin")}
        </QtDugme>
      </div>
    </QtKart>
  );
}

export default function AvatarOnizlemePage() {
  const [durum, setDurum] = useState("yukleniyor");   // yukleniyor · sahip-degil · hata · hazir
  const [liste, setListe] = useState([]);
  const [kaydediliyor, setKaydediliyor] = useState({});   // anahtar → hedef onay
  const [uyari, setUyari] = useState("");
  const [yerelSecim, setYerelSecim] = useState(yerelOku);
  const [kopyaNot, setKopyaNot] = useState("");
  const [kopyaMetni, setKopyaMetni] = useState("");

  const yukle = useCallback(async () => {
    setDurum("yukleniyor");
    try {
      const { data: sahip, error: e1 } = await supabase.rpc("sahip_mi");
      if (e1) throw e1;
      if (!sahip) { setDurum("sahip-degil"); return; }
      const { data, error: e2 } = await supabase.rpc("avatar_onizleme_listesi");
      if (e2) throw e2;
      setListe(data ?? []);
      setDurum("hazir");
    } catch (e) {
      console.error("avatar-onizleme yükleme:", e);
      setDurum("hata");
    }
  }, []);

  useEffect(() => { yukle(); }, [yukle]);

  const onSec = useCallback(async (a, onay) => {
    setUyari("");
    if (a.yerel) {   // katalog satırı yok (595 bekliyor) → seçim yerelde
      setYerelSecim((eski) => {
        const yeni = { ...eski };
        if (onay === "bekliyor") delete yeni[a.anahtar]; else yeni[a.anahtar] = onay;
        yerelYaz(yeni);
        return yeni;
      });
      return;
    }
    setKaydediliyor((k) => ({ ...k, [a.anahtar]: onay }));
    try {
      const { error } = await supabase.rpc("avatar_onay_kaydet", { p_anahtar: a.anahtar, p_onay: onay });
      if (error) throw error;
      setListe((l) => l.map((x) => (x.anahtar === a.anahtar ? { ...x, onay } : x)));
    } catch (e) {
      console.error("avatar-onizleme kayıt:", e);
      setUyari(`${ts("Kaydedilemedi")}: ${adi(a)}`);
    } finally {
      setKaydediliyor((k) => { const y = { ...k }; delete y[a.anahtar]; return y; });
    }
  }, []);

  // Sunucu listesi + (satırı yoksa) yerel yedekli yeni 12.
  const tumListe = useMemo(() => {
    const sunucu = new Set(liste.map((a) => a.anahtar));
    const eksik = YENI_12.filter((a) => !sunucu.has(a.anahtar))
      .map((a) => ({ ...a, onay: yerelSecim[a.anahtar] ?? "bekliyor" }));
    return [...liste, ...eksik];
  }, [liste, yerelSecim]);
  const yeniler = useMemo(() => YENI_12.map((y) => tumListe.find((a) => a.anahtar === y.anahtar)).filter(Boolean), [tumListe]);

  const kopyala = async () => {
    const tarih = new Date().toLocaleString("tr-TR");
    const grup = (d) => yeniler.filter((a) => a.onay === d).map((a) => `${a.ad_tr} (${a.anahtar})`);
    const girsin = grup("girsin"), girmesin = grup("girmesin"), bekliyor = grup("bekliyor");
    const metin = [
      `Quiz Tactics — Avatar önizleme seçimlerim, yeni 12 (${tarih})`,
      `GİRSİN (${girsin.length}): ${girsin.join(", ") || "—"}`,
      `GİRMESİN (${girmesin.length}): ${girmesin.join(", ") || "—"}`,
      `KARAR VERİLMEDİ (${bekliyor.length}): ${bekliyor.join(", ") || "—"}`,
    ].join("\n");
    setKopyaMetni(metin);
    try {
      await navigator.clipboard.writeText(metin);
      setKopyaNot(ts("Kopyalandı — bana yapıştırabilirsin."));
    } catch (e) {
      console.warn("[Bildim] pano yazılamadı:", e?.message ?? e);
      setKopyaNot(ts("Pano izin vermedi — aşağıdaki metni seçip kopyala."));
    }
  };

  if (durum === "yukleniyor") {
    return (
      <div className="qt-sayfa ao-sayfa">
        <div className="qt-sayfa-ic ao-ic" aria-busy="true">
          <QtIskelet tur="metin" adet={2} />
          <QtIskelet tur="kart" adet={3} />
        </div>
      </div>
    );
  }
  if (durum === "sahip-degil" || durum === "hata") {
    const sahipDegil = durum === "sahip-degil";
    return (
      <div className="qt-sayfa ao-sayfa">
        <div className="qt-sayfa-ic ao-ic">
          <QtKart>
            <QtBosDurum
              ikon={sahipDegil ? "kilit" : "uyari"}
              ton={sahipDegil ? "mor" : "yanlis"}
              baslik={sahipDegil ? ts("Bu sayfa yalnız sahibe açık") : ts("Avatarlar yüklenemedi")}
              metin={sahipDegil ? ts("Avatar onayını yalnız oyunun sahibi yapabilir.") : undefined}
              eylem={sahipDegil
                ? <QtDugme as={Link} to="/" tur="ikincil" ikon="ev">{ts("Ana sayfaya dön")}</QtDugme>
                : <QtDugme tur="ikincil" ikon="yenile" onClick={yukle}>{ts("Tekrar dene")}</QtDugme>}
            />
          </QtKart>
        </div>
      </div>
    );
  }

  const toplam = tumListe.length;
  const secilen = tumListe.filter((a) => a.onay === "girsin").length;
  const bekleyen = tumListe.filter((a) => a.onay === "bekliyor").length;
  const satisAcik = liste.some((a) => a.satis_acik === true);
  const yeniGrup = (d) => yeniler.filter((a) => a.onay === d).map(adi);
  const bolum = (tur, baslik) => {
    const alt = tur === "yeni" ? yeniler : tumListe.filter((a) => a.tur === tur && !YENI_ANAHTAR.has(a.anahtar));
    return (
      <section className="ao-bolum" aria-labelledby={`ao-${tur}`}>
        <h2 id={`ao-${tur}`} className="qt-baslik-2 ao-bolum-baslik">{baslik} · {alt.length}</h2>
        <div className="ao-izgara">
          {alt.map((a) => <AvatarKarti key={a.anahtar} a={a} kaydediliyor={kaydediliyor[a.anahtar]} onSec={onSec} />)}
        </div>
      </section>
    );
  };

  return (
    <div className="qt-sayfa ao-sayfa">
      <div className="qt-sayfa-ic ao-ic">
        <header className="ao-giris">
          <h1 className="qt-baslik-1 ao-baslik">{ts("Yeni avatarlar")}</h1>
          <p className="qt-govde qt-soluk-zemin">
            {ts("Her avatarı büyük ve 40 px hâliyle gör; oyuna girsin mi karar ver. Seçimin sunucuda saklanır.")}
          </p>
        </header>

        <div className="ao-ilerleme" role="status">
          <strong className="ao-ilerleme-sayi qt-sayi">{ts("{n} / {t} seçildi", { n: secilen, t: toplam })}</strong>
          <QtIlerleme deger={secilen} en={toplam || 1} ton="dogru" etiket={ts("{n} / {t} seçildi", { n: secilen, t: toplam })} />
          <p className="ao-not">
            {ts("Karar bekleyen: {n}", { n: bekleyen })} · {satisAcik ? ts("Satış açık — seçtiklerin oyunculara görünür.") : ts("Satış kapalı — seçtiklerin, kozmetik satışı açılınca oyunculara görünür.")}
          </p>
          {uyari && <p className="ao-uyari">{uyari}</p>}
        </div>

        <QtKart className="ao-serit">
          <h2 className="ao-serit-baslik">{ts("Karşılaştırma: mevcut avatarlar")}</h2>
          <ul className="ao-serit-liste">
            {KARSILASTIRMA.map(([url, ad]) => (
              <li key={url} className="ao-serit-oge">
                <img src={url} alt={tt(ad)} width="64" height="64" />
                <img src={url} alt="" width="40" height="40" />
              </li>
            ))}
          </ul>
        </QtKart>

        {bolum("yeni", ts("Yeni 12 — onay bekliyor"))}

        <section className="ao-bolum" aria-labelledby="ao-secimler">
          <h2 id="ao-secimler" className="qt-baslik-2 ao-bolum-baslik">{ts("Seçimlerim")}</h2>
          <QtKart className="ao-ozet-kart">
            <p><b>{ts("Girsin")} ({yeniGrup("girsin").length}):</b> {yeniGrup("girsin").join(", ") || "—"}</p>
            <p><b>{ts("Girmesin")} ({yeniGrup("girmesin").length}):</b> {yeniGrup("girmesin").join(", ") || "—"}</p>
            <p className="qt-soluk"><b>{ts("Karar verilmedi")} ({yeniGrup("bekliyor").length}):</b> {yeniGrup("bekliyor").join(", ") || "—"}</p>
            <QtDugme tamGenislik ikon="kopyala" onClick={kopyala}>{ts("Seçimlerimi kopyala")}</QtDugme>
            <p className="ao-kopya-not" role="status" aria-live="polite">{kopyaNot}</p>
            {kopyaMetni && <textarea className="ao-kopya-metin" readOnly value={kopyaMetni} rows={5} onFocus={(e) => e.target.select()} aria-label={ts("Kopyalanacak metin")} />}
          </QtKart>
        </section>

        {bolum("gunluk", ts("Günlük"))}
        {bolum("kostumlu", ts("Kostümlü"))}
      </div>
    </div>
  );
}
