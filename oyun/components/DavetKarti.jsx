/**
 * ARKADAŞINI DAVET ET — kod, "Bağlantıyı paylaş" (Web Share API, yoksa kopyala), ödül açıklaması
 * ve davet ettiklerinin durumu ("Level 3/5", "Ödül alındı"). Yeni hesapsa elle kod bağlama alanı.
 * Veri: davetKodum / davetDurumum / davetKoduBagla (oyun/lib/davet.js). Ödül mantığı sunucuda.
 * Arkadaşlar sayfası ve Profil › Davet aynı kartı kullanır.
 */
import { useCallback, useEffect, useState } from "react";
import DavetKodu from "./DavetKodu.jsx";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import DurumKutusu from "./DurumKutusu.jsx";
import { davetKodum, davetDurumum, davetKoduBagla, davetBaglantisi } from "../lib/davet.js";
import { hataMesaji } from "../lib/hata.js";
import { tt } from "../lib/dil.js";
import { coinTazele } from "../lib/coin.js";
import { QtDugme, QtIkon, QtIlerleme, QtKart, QtListe, QtListeSatiri, QtRozet, sayiBicim } from "../tasarim/index.js";
import "../tasarim/ekranlar/davet-karti.css";

/** davet_kodu_bagla durumu → kullanıcı metni. */
export function davetBaglaMetni(s) {
  const ad = s?.davet_eden_ad ?? tt("Arkadaşın");
  switch (s?.durum) {
    case "baglandi": return s.coin > 0
      ? tt("{ad} seni davet etti: +{n} coin! Artık arkadaşsınız.", { ad, n: sayiBicim(s.coin) })
      : tt("{ad} seni davet etti. Artık arkadaşsınız.", { ad });
    case "ayni_cihaz": return tt("{ad} ile arkadaş oldunuz. Aynı cihazdan açılan hesaplarda davet ödülü verilmez.", { ad });
    case "zaten_bagli": return tt("Bu hesap zaten bir davetle bağlı.");
    case "sure_doldu": return tt("Davet kodu yalnız yeni hesaplarda (ilk 3 gün) kullanılabilir.");
    case "kendi_kodun": return tt("Bu senin kendi kodun.");
    case "gecersiz_kod": return tt("Bu davet kodu bulunamadı. Kontrol edip tekrar dene.");
    default: return tt("Davet kodu kullanılamadı.");
  }
}

function durumSag(d) {
  if (d.durum === "odullendi") return <QtRozet ton="dogru" ikon="onay" boyut="k">{tt("Ödül alındı")}</QtRozet>;
  if (d.durum === "sinir_asildi") return <QtRozet ton="uyari" boyut="k">{tt("Aylık sınır doldu")}</QtRozet>;
  if (d.durum === "gecersiz") return <QtRozet ton="notr" boyut="k">{tt("Ödülsüz")}</QtRozet>;
  const hedef = Number(d.gereken_level) || 5;
  const lv = Math.min(hedef, Number(d.level) || 1);
  return (
    <span className="qt-dv-ilerleme">
      <span className="qt-sayi">{tt("Level {a}/{b}", { a: lv, b: hedef })}</span>
      <QtIlerleme deger={lv} en={hedef} ton="coin" etiket={tt("Level {a}/{b}", { a: lv, b: hedef })} />
    </span>
  );
}

/** Elle davet kodu bağlama (yalnız yeni hesapta görünür). */
export function DavetKoduGir({ onBaglandi }) {
  const [kod, setKod] = useState(() => { try { return localStorage.getItem("bildim_davet_kodu") ?? ""; } catch { return ""; } });
  const [calisiyor, setCalisiyor] = useState(false);
  const [sonuc, setSonuc] = useState(null);
  const bagla = async () => {
    const temiz = kod.trim().toUpperCase();
    if (!temiz) return;
    setCalisiyor(true);
    setSonuc(null);
    try {
      const s = await davetKoduBagla(temiz);
      setSonuc({ ok: ["baglandi", "ayni_cihaz", "zaten_bagli"].includes(s?.durum), metin: davetBaglaMetni(s) });
      if (s?.durum === "baglandi" || s?.durum === "ayni_cihaz") {
        try { localStorage.removeItem("bildim_davet_kodu"); } catch { /* özel mod */ }
        coinTazele();
        onBaglandi?.(s);
      }
    } catch (e) {
      setSonuc({ ok: false, metin: hataMesaji(e, tt("Davet kodu kullanılamadı.")) });
    } finally {
      setCalisiyor(false);
    }
  };
  return (
    <div className="qt-dv-gir">
      <label className="qt-dv-gir-etiket" htmlFor="qt-dv-kod">{tt("Davet kodun var mı?")}</label>
      <div className="qt-dv-gir-satir">
        <input id="qt-dv-kod" className="qt-dv-gir-alan" type="text" inputMode="text" autoCapitalize="characters"
               autoComplete="off" maxLength={12} placeholder={tt("Örn. J8K2M4PR")} value={kod}
               onChange={(e) => setKod(e.target.value)} onKeyDown={(e) => e.key === "Enter" && bagla()} />
        <QtDugme tur="ikincil" yukleniyor={calisiyor} devreDisi={!kod.trim()} onClick={bagla}>{tt("Bağla")}</QtDugme>
      </div>
      {sonuc && <p className={`qt-dv-sonuc${sonuc.ok ? "" : " qt-dv-sonuc--hata"}`} role={sonuc.ok ? "status" : "alert"}>{sonuc.metin}</p>}
    </div>
  );
}

export default function DavetKarti({ ekDugmeler }) {
  const [kodBilgi, setKodBilgi] = useState(null);
  const [durum, setDurum] = useState(null);
  const [hata, setHata] = useState(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [bagSonuc, setBagSonuc] = useState(null);   // elle bağlama sonucu (alan kaybolsa da görünür kalır)

  const yukle = useCallback(async () => {
    setHata(null);
    try {
      const [k, d] = await Promise.all([davetKodum(), davetDurumum()]);
      setKodBilgi(k);
      setDurum(d);
    } catch (e) {
      setHata(hataMesaji(e, tt("Davet bilgileri yüklenemedi.")));
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  if (!kodBilgi) {
    return (
      <QtKart className="qt-dv">
        <DurumKutusu durum={hata ? "hata" : "yukleniyor"} metin={hata ?? undefined} onTekrar={yukle} satir={3} />
      </QtKart>
    );
  }

  const link = davetBaglantisi(kodBilgi.yol);
  const paylas = async () => {
    if (!link) return;
    const metin = tt("Quiz Tactics'te benimle yarış! Bu bağlantıyla gel, başlangıçta +{n} coin kazan: {link}", {
      n: sayiBicim(kodBilgi.odul_davet_edilen ?? 0), link,
    });
    try {
      if (navigator.share) {
        await navigator.share({ title: "Quiz Tactics", text: metin, url: link });
        return;
      }
    } catch (e) {
      if (e?.name === "AbortError") return;   // kullanıcı paylaşımdan vazgeçti
      console.warn("[Bildim] paylaşım açılamadı, kopyalanıyor:", e?.message ?? e);
    }
    try {
      await navigator.clipboard.writeText(metin);
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 2500);
    } catch (e) {
      console.error("[Bildim] davet bağlantısı kopyalanamadı:", e);
      setHata(tt("Bağlantı kopyalanamadı. Kodu elle paylaşabilirsin."));
    }
  };

  const liste = durum?.davetlerim ?? [];
  const ozet = durum?.ozet;
  return (
    <QtKart as="section" className="qt-dv" aria-labelledby="qt-dv-baslik">
      <div className="qt-dv-ust">
        <span className="qt-dv-ikon" aria-hidden="true"><QtIkon ad="hediye" boyut={30} /></span>
        <div className="qt-dv-ust-metin">
          <h2 id="qt-dv-baslik" className="qt-baslik-3">{tt("Arkadaşını davet et")}</h2>
          <p className="qt-kucuk qt-soluk">
            {tt("Arkadaşın gelince +{b} coin alır; Level {lv}'e ulaşınca sen {a} coin kazanırsın.", {
              a: sayiBicim(kodBilgi.odul_davet_eden ?? 0), b: sayiBicim(kodBilgi.odul_davet_edilen ?? 0), lv: kodBilgi.gereken_level ?? 5,
            })}
          </p>
        </div>
      </div>
      <div className="qt-dv-oduller" aria-hidden="true">
        <span className="qt-dv-odul"><QtIkon ad="coin" boyut={18} /><b className="qt-sayi">{sayiBicim(kodBilgi.odul_davet_eden ?? 0)}</b><small>{tt("sana")}</small></span>
        <span className="qt-dv-odul"><QtIkon ad="coin" boyut={18} /><b className="qt-sayi">+{sayiBicim(kodBilgi.odul_davet_edilen ?? 0)}</b><small>{tt("arkadaşına")}</small></span>
      </div>
      <DavetKodu kod={kodBilgi.kod} />
      <div className="qt-dv-dugmeler">
        <QtDugme tamGenislik ikon={kopyalandi ? "onay" : "paylas"} onClick={paylas} devreDisi={!link}>
          {kopyalandi ? tt("Kopyalandı") : tt("Bağlantıyı paylaş")}
        </QtDugme>
        {ekDugmeler}
      </div>
      <p className="qt-kucuk qt-soluk">
        {tt("Bu ay ödüllü davet: {a}/{b}. Aynı cihazdan açılan hesaplar sayılmaz.", {
          a: kodBilgi.bu_ay_odullenen ?? 0, b: kodBilgi.aylik_sinir ?? 10,
        })}
      </p>
      {hata && <p className="qt-dv-sonuc qt-dv-sonuc--hata" role="alert">{hata}</p>}

      {durum?.davet_eden && (
        <p className="qt-kucuk">{tt("Seni {ad} davet etti.", { ad: durum.davet_eden.ad ?? tt("bir arkadaşın") })}</p>
      )}
      {durum?.baglanabilir && <DavetKoduGir onBaglandi={(s) => { setBagSonuc(davetBaglaMetni(s)); yukle(); }} />}
      {bagSonuc && <p className="qt-dv-sonuc" role="status">{bagSonuc}</p>}

      {liste.length > 0 && (
        <div className="qt-dv-liste">
          <h3 className="qt-baslik-3">{tt("Davet ettiklerin")}{ozet ? ` · ${ozet.toplam ?? liste.length}` : ""}</h3>
          <QtListe etiket={tt("Davet ettiklerin")}>
            {liste.map((d) => (
              <QtListeSatiri key={d.user_id}
                bas={<CerceveliAvatar profile={{ gorunen_ad: d.ad, gorunen_avatar: d.avatar }} userId={d.user_id} cerceve={d.cerceve ?? null} boyut={40} />}
                baslik={d.ad ?? tt("Oyuncu")}
                sag={durumSag(d)} />
            ))}
          </QtListe>
        </div>
      )}
    </QtKart>
  );
}
