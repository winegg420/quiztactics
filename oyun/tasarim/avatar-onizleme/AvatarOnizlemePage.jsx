// /avatar-onizleme — 27 yeni profil avatarının sahip onayı (Ajan A, 24 Eyl 2026).
// Menüde yok; yalnız sahip hesabıyla açılır (sunucu: sahip_mi() — avatar_onizleme_listesi / avatar_onay_kaydet,
// migration 520). Seçim sunucuda durur; normal oyuncu bir avatarı ancak "Oyuna girsin" VE
// oyun_ayarlari.kozmetik_satis_acik açıkken görür. Görseller statik dosyadan (public/avatars/pro2) —
// kaynak oyun/components/AvatarProIllustrations2.jsx, üretici oyun/_test/avatar-pro-uret.mjs.
import { useCallback, useEffect, useState } from "react";
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
};
function ts(anahtar, degerler) {
  const metin = aktifDil() === "en" && EN[anahtar] ? EN[anahtar] : tt(anahtar);
  if (!degerler) return metin;
  return metin.replace(/\{(\w+)\}/g, (tam, ad) => (ad in degerler ? String(degerler[ad] ?? "") : tam));
}
const adi = (a) => (aktifDil() === "en" ? a.ad_en : a.ad_tr);

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
          {a.tur === "kostumlu" ? ts("{n} elmas", { n: a.fiyat_elmas }) : ts("Bedava")}
        </QtRozet>
      </div>
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

  const toplam = liste.length;
  const secilen = liste.filter((a) => a.onay === "girsin").length;
  const bekleyen = liste.filter((a) => a.onay === "bekliyor").length;
  const satisAcik = liste.some((a) => a.satis_acik === true);
  const bolum = (tur, baslik) => {
    const alt = liste.filter((a) => a.tur === tur);
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

        {bolum("gunluk", ts("Günlük"))}
        {bolum("kostumlu", ts("Kostümlü"))}
      </div>
    </div>
  );
}
