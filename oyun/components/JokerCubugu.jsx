import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Ikon from "./Ikon.jsx";
import { hataMesaji } from "../lib/hata.js";
import { Link } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { macJokerleri, jokerBilgi, envanterNesne, sisAyari } from "../lib/jokerler.js";
import { ayarlar } from "../lib/ayarlar.js";
import JokerSatinAlModal from "./JokerSatinAlModal.jsx";
import { y } from "../lib/yol.js";
import { sesJoker } from "../lib/ses.js";
import { titret } from "../lib/geriBildirim.js";
import { tt } from "../lib/dil.js";

/**
 * Maç içi joker çubuğu. Tüm kararlar sunucudadır (joker_kullan RPC);
 * burası yalnız adet rozetini, ücretsiz hakkı ve pasiflik nedenini gösterir.
 *
 * onEtki(sonuc): { tur, kapali? , uzatildi?, atlandi?, dogru_cevap?, sis_sn? }
 *
 * Paket 32 B — dört durum, hepsi marka turuncusu (renk değil ikon + metin ayırır):
 *   hazir      dolu turuncu, beyaz ikon, 0 4px 0 alt gölge, sağ üstte adet
 *   kullanildi soluk + onay işareti, basılamaz (sunucudan: kullanilan_turler)
 *   satilik    turuncu kenarlık, içi boş, sağ üstte altın "+" → satın alma penceresi
 *   pasif      gri; basınca SEBEBİNİ yazar (ör. "Son 6 saniyede Sis kullanılamaz.")
 * @param {number} [kalanSn] sorunun kalan saniyesi (Sis'in son-N-saniye kuralı için)
 */
export default function JokerCubugu({ macTur, macId, soruIndex, onEtki, kilit, surum = 0, kalanSn = 15 }) {
  const [envanter, setEnvanter] = useState({ elli: 0, sure: 0, soru_degistir: 0, seri_koruma: 0 });
  const [durum, setDurum] = useState(null); // { sinir, kullanilan, ucretsiz_elli_kaldi }
  const [hata, setHata] = useState(null);
  const [calisan, setCalisan] = useState(null);
  // Paket 27 B: ARTIK HER TÜR maç başına bir kez. Sunucu da aynı kuralı uygular;
  // burada yalnız düğmeyi kapatmak için tutuluyor.
  const [kullandigim, setKullandigim] = useState([]);
  // Paket 27 C: maç içi satın alma — fiyatlar ve coin sunucudan.
  const [fiyatlar, setFiyatlar] = useState(null);
  const [coin, setCoin] = useState(null);
  const [satinAlinacak, setSatinAlinacak] = useState(null);
  const hataRef = useRef(null);
  // Paket 32: açıklamalardaki sayılar ve Sis eşiği oyun_ayarlari'ndan
  const [ayar, setAyar] = useState(null);
  useEffect(() => {
    let aktif = true;
    ayarlar().then((a) => { if (aktif) setAyar(a); }, () => {});
    return () => { aktif = false; };
  }, []);
  // B.4: kullanım anı — düğme parlaması + ekran ortasında şerit (≈850 ms)
  const [parlayan, setParlayan] = useState(null);
  const [serit, setSerit] = useState(null);   // { tur, metin }
  useEffect(() => {
    if (!serit) return undefined;
    const t = setTimeout(() => setSerit(null), 850);
    return () => clearTimeout(t);
  }, [serit]);
  useEffect(() => {
    if (!parlayan) return undefined;
    const t = setTimeout(() => setParlayan(null), 650);
    return () => clearTimeout(t);
  }, [parlayan]);

  // Joker çubuğu ekranın EN ALTINDA duruyor; hata notu düğmelerin altına
  // düştüğü için görünür alanın dışında kalıyordu (ölçüm: not y=817, pencere
  // 791). Oyuncu sessiz bir başarısızlık görüyordu. Not artık göze sokuluyor.
  useEffect(() => {
    if (!hata) return;
    try {
      hataRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    } catch {
      /* eski tarayıcı: notu kaydıramadıysak da metin yerinde duruyor */
    }
  }, [hata]);

  const yukle = useCallback(async () => {
    try {
      const [env, mac, fiy, bak] = await Promise.all([
        supabase.rpc("envanterim"),
        supabase.rpc("joker_mac_durumu", { p_mac_tur: macTur, p_mac_id: macId }),
        supabase.rpc("joker_fiyatlari"),
        supabase.rpc("coin_bakiyem"),
      ]);
      if (env.error) throw env.error;
      if (mac.error) throw mac.error;
      setEnvanter(envanterNesne(env.data));
      setDurum(Array.isArray(mac.data) ? (mac.data[0] ?? null) : (mac.data ?? null));
      // Fiyat/coin alınamazsa satın alma gizlenir, oyun akışı bozulmaz.
      if (!fiy.error) setFiyatlar(fiy.data ?? null);
      // Paket 33: coin_bakiyem TABLO döndürür → [{ bakiye, hareketler }]. Nesneyi state'e
      // yazmak satın alma penceresinde React #31 ile ekranı beyaza düşürüyordu. Hep sayı ya da null.
      if (!bak.error) {
        const satir = Array.isArray(bak.data) ? bak.data[0] : bak.data;
        setCoin(typeof satir === "number" ? satir : (satir?.bakiye ?? null));
      }
    } catch {
      // Migration henüz uygulanmadıysa çubuk gizlenir; oyun akışı bozulmaz.
      setDurum(null);
    }
  }, [macTur, macId]);

  useEffect(() => {
    yukle();
    // Paket 31 A: rakibin jokeri (surum) kilit/kısaltma durumunu değiştirir → yeniden oku
  }, [yukle, soruIndex, surum]);

  if (!durum) return null;

  // Paket 34: jokerler geçici olarak ücretsiz ve sınırsız (oyun_ayarlari.jokerler_ucretsiz).
  // Sunucu kuralı: stok/hak/satın alma yok; aynı joker aynı soruda bir kez.
  const serbestMod = Number(ayar?.jokerler_ucretsiz ?? 0) > 0;
  const sinirDoldu = !serbestMod &&
    durum.sinir !== null && durum.sinir !== undefined && durum.kullanilan >= durum.sinir;
  const finalYasak = durum.sinir === 0;
  // Paket 31 A.3: rakip bu soruda Savunma Kilidi bastı — sessiz düğme olmasın, açık mesaj
  const rakipKilitledi = Boolean(durum.kilitli);
  const rakipKisaltti = Boolean(durum.kisaltildi);

  /**
   * Joker kullan. `satinAl` true ise satın alma + kullanım TEK RPC'de yapılır
   * (joker_al_ve_kullan): araya girip coin düşüp jokerin kullanılmaması diye
   * bir durum oluşmaz, kullanım reddedilirse coin de geri gelir.
   */
  const kullan = async (tur, satinAl = false) => {
    setHata(null);
    setCalisan(tur);
    try {
      const { data, error } = await supabase.rpc(
        satinAl ? "joker_al_ve_kullan" : "joker_kullan",
        { p_mac_tur: macTur, p_mac_id: macId, p_soru_index: soruIndex, p_tur: tur }
      );
      if (error) throw error;
      sesJoker();
      titret(10);
      setKullandigim((k) => (k.includes(tur) ? k : [...k, tur]));
      setParlayan(tur);
      setSerit({ tur, metin: etkiMetni(tur) });
      if (data && typeof data.coin === "number") setCoin(data.coin);
      onEtki?.(data);
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("Joker kullanılamadı.")));
      throw e;   // satın alma penceresi hatayı kendi içinde göstersin
    } finally {
      setCalisan(null);
    }
  };

  /** Envanterde 0 varken düğmeye basılınca: önce onay penceresi. */
  const bas = (tur) => {
    if (satinAlinabilir(tur)) setSatinAlinacak(tur);
    else kullan(tur).catch(() => {});
  };

  /** Envanterde yok, ücretsiz hakkı da yok ama maç içinde satın alınabilir mi? */
  const satinAlinabilir = (tur) => {
    if (serbestMod || kilit || finalYasak || sinirDoldu || rakipKilitledi) return false;
    if (macTur === "turnuva" && tur === "soru_degistir") return false;
    if (kullanilanlar.has(tur)) return false;
    if (tur === "sis" && sisGec) return false;
    if (tur === "elli" && durum?.ucretsiz_elli_kaldi) return false;
    if ((envanter[tur] ?? 0) > 0) return false;
    return Number(fiyatlar?.[tur] ?? 0) > 0;
  };

  /** B.4: ekranda ne olduğu yazsın (sayılar ayardan). */
  const etkiMetni = (tur) => {
    const a = ayar ?? {};
    if (tur === "elli") return tt("İki yanlış şık silindi.");
    if (tur === "sure") return tt("Sürene 10 saniye eklendi.");
    if (tur === "soru_degistir") return macTur === "1v1" ? tt("Soru ikinizde de değişti.") : tt("Soru değişti.");
    if (tur === "zaman_baskisi")
      return tt("Rakibin süresi {0} saniye kısaldı.", { 0: Number(a.klasik_zaman_baskisi_sn ?? 5) });
    if (tur === "sis") return tt("Rakibin ekranı {0} saniye siste.", { 0: sisAyari(a).sn });
    return jokerBilgi(tur, macTur, a).ad;
  };

  // Ücretsiz modda "kullanıldı" SORU başına (bileşen her soruda yeniden kurulur → yerel liste);
  // normal modda maç başına (sunucudan).
  const kullanilanlar = serbestMod
    ? new Set(kullandigim)
    : new Set([...(durum.kullanilan_turler ?? []), ...kullandigim]);
  // Sis'in son-N-saniye kuralı (YALNIZ Sis) — sunucu da reddediyor, düğme önceden söylesin
  const sisGec = macTur === "1v1" && kalanSn <= sisAyari(ayar).esik;

  const neden = (tur) => {
    if (kilit) return tt("Bu soruyu zaten cevapladın");
    if (rakipKilitledi) return tt("Rakibin savunma jokerlerini kilitledi.");
    if (finalYasak) return tt("Turnuva finalinde joker kullanılamaz");
    if (sinirDoldu) return tt("Bu maçta en fazla {0} joker", { 0: durum.sinir });
    // Turnuva herkese AYNI soruyu sorar ve elemelidir: soru değiştirilemez.
    if (macTur === "turnuva" && tur === "soru_degistir") return tt("Turnuvada soru değiştirilemez");
    // Paket 27 B: aynı joker maç başına bir kez — her tür için. Sunucu da aynı kuralı uygular.
    if (kullanilanlar.has(tur)) return tt("Bu jokeri bu maçta zaten kullandın");
    if (tur === "sis" && sisGec) return tt("Son {0} saniyede Sis kullanılamaz.", { 0: sisAyari(ayar).esik });
    const ucretsiz = tur === "elli" && durum.ucretsiz_elli_kaldi;
    // Envanterde yoksa artık "kalmadı" demiyoruz: maç içinde satın alınabiliyor.
    if (!serbestMod && !ucretsiz && (envanter[tur] ?? 0) <= 0 && !satinAlinabilir(tur)) return tt("Jokerin kalmadı");
    return null;
  };

  return (
    <div className={`bd-joker-cubuk${macJokerleri(macTur).length > 3 ? " bd-joker-cubuk-genis" : ""}`}>
      {rakipKilitledi && (
        <div className="bd-joker-not uyari" role="status">
          <Ikon ad="kilit" boyut={14} /> {tt("Rakibin savunma jokerlerini kilitledi.")}
        </div>
      )}
      {rakipKisaltti && (
        <div className="bd-joker-not uyari" role="status">
          <Ikon ad="hizli" boyut={14} /> {tt("Rakibin süreni kısalttı!")}
        </div>
      )}
      {/* B.5: kaç hak kaldığı tek satırda görünür */}
      {!finalYasak && (
        <div className="bd-joker-hak" aria-live="polite">
          {serbestMod
            ? tt("Jokerler şimdilik ücretsiz ve sınırsız")
            : durum.sinir === null || durum.sinir === undefined
            ? tt("Arkadaş maçı: joker hakkın sınırsız")
            : tt("Bu maçta {0} joker hakkın kaldı", { 0: Math.max(0, durum.sinir - durum.kullanilan) })}
        </div>
      )}
      {macJokerleri(macTur).map((tur) => {
        const bilgi = jokerBilgi(tur, macTur, ayar);
        const ucretsiz = tur === "elli" && durum.ucretsiz_elli_kaldi;
        const engel = neden(tur);
        const adet = envanter[tur] ?? 0;
        const satilik = satinAlinabilir(tur);
        const fiyat = Number(fiyatlar?.[tur] ?? 0);
        const kullanildi = kullanilanlar.has(tur);
        const durumSinifi = kullanildi ? "kullanildi" : satilik ? "satilik" : engel ? "pasif" : "hazir";
        const aciklama = engel ?? (satilik ? tt("{0} coin — dokun, al ve kullan", { 0: fiyat }) : bilgi.aciklama);
        return (
          <button
            key={tur}
            type="button"
            className={`bd-joker bd-jk ${durumSinifi} ${ucretsiz ? "ucretsiz" : ""} ${parlayan === tur ? "parla" : ""}`}
            // Pasif düğme BASILABİLİR kalır ama joker kullanmaz: sebebini yazar (B.2.4).
            aria-disabled={Boolean(engel) || calisan !== null}
            title={aciklama}
            aria-label={`${bilgi.ad} — ${aciklama}`}
            onClick={() => {
              if (calisan !== null) return;
              if (engel) { setHata(engel); return; }
              bas(tur);
            }}
          >
            {satilik ? (
              <span className="bd-jk-rozet arti" aria-hidden="true"><Ikon ad="arti" boyut={11} kalinlik={3} /></span>
            ) : kullanildi ? (
              <span className="bd-jk-rozet onay" aria-hidden="true"><Ikon ad="onay" boyut={11} kalinlik={3} /></span>
            ) : (
              <span className={`bd-jk-rozet adet ${ucretsiz ? "bedava" : ""}`} aria-hidden="true">
                {calisan === tur ? "…" : serbestMod ? "∞" : ucretsiz ? tt("ÜCRETSİZ") : adet}
              </span>
            )}
            <span className="bd-joker-ikon" aria-hidden="true"><Ikon ad={bilgi.ikon} boyut={20} /></span>
            <span className="bd-joker-ad">{bilgi.ad}</span>
            {satilik && <span className="bd-jk-fiyat"><Ikon ad="coin" boyut={11} /> {fiyat}</span>}
          </button>
        );
      })}

      {/* B.4: kullanım anında ekran ortasında şerit — ne olduğu yazsın */}
      {serit && typeof document !== "undefined" && createPortal(
        <div className="bd-jk-serit" role="status" aria-live="polite" key={serit.tur + serit.metin}>
          <span className="bd-jk-serit-ikon" aria-hidden="true">
            <Ikon ad={jokerBilgi(serit.tur, macTur, ayar).ikon} boyut={22} />
          </span>
          <span className="bd-jk-serit-metin">
            <b>{jokerBilgi(serit.tur, macTur, ayar).ad}</b>
            <span>{serit.metin}</span>
          </span>
        </div>,
        document.body
      )}

      {(sinirDoldu || finalYasak) && (
        <div className="bd-joker-not">
          {finalYasak
            ? tt("Finalde joker yok — sadece bilgi.")
            : tt("Bu maçta joker hakkın doldu ({0}/{1}).", { 0: durum.kullanilan, 1: durum.sinir })}
        </div>
      )}

      {hata && (
        <div className="bd-joker-not hata" ref={hataRef} role="alert">
          {hata}
          {/kalmadı/i.test(hata) && (
            <>
              {" "}
              <Link to={y("/joker")}>{tt("Joker al")}</Link>
            </>
          )}
        </div>
      )}

      {satinAlinacak && (
        <JokerSatinAlModal
          tur={satinAlinacak}
          fiyat={Number(fiyatlar?.[satinAlinacak] ?? 0)}
          coin={coin}
          onKapat={() => setSatinAlinacak(null)}
          onOnay={() => kullan(satinAlinacak, true)}
        />
      )}
    </div>
  );
}
