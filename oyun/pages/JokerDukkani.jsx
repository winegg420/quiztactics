import { useCallback, useEffect, useState } from "react";
import DurumKutusu from "../components/DurumKutusu.jsx";
import { hataMesaji } from "../lib/hata.js";
import { Link, useSearchParams } from "react-router-dom";
import GorunumVitrini from "../vitrin/GorunumVitrini.jsx";
import { supabase } from "../../src/lib/supabase.js";
import { JOKER_BILGI, AKTIF_MAC_SKILLERI, jokerBilgi, envanterNesne } from "../lib/jokerler.js";
import { jokerKurallari } from "../lib/jokerKurallari.js";
import { h5AdsYapilandirildi, odulluVideoGoster } from "../lib/h5ads.js";
import { desteklenirMi, fiyatlariAl, satinAl, tuket } from "../lib/playFatura.js";
import { useCoin, coinTazele, coinHatasi } from "../lib/coin.js";
import CoinGorseli, { coinBoyutu } from "../components/CoinGorseli.jsx";
import { GARDIROP_ACIK } from "../lib/ozellikBayraklari.js";
import { ayarlar } from "../lib/ayarlar.js";
import { tt, ttSunucu } from "../lib/dil.js";
import {
  QtDugme,
  QtIkon,
  QtKart,
  QtRozet,
  QtSekmeler,
  QtToast,
  QtToastYuvasi,
  QtBosDurum,
  sayiBicim,
} from "../tasarim/index.js";
import "../tasarim/ekranlar/dukkan-magaza.css";

// Dükkân üç sekme: Skill · Coin · Kıyafet (Tasarım A, Yön A "Şeker Kutusu").
// Bütün rakamlar sunucudan gelir (skill_dukkani(), joker_paketleri, coin_paketleri,
// oyun_ayarlari); koda gömülü fiyat/ödül/tavan YOKTUR — okunamayan rakam gösterilmez.

// GARDIROP DONDURULDU (Arayüz Yenileme, 20 Eyl 2026): "Kıyafet" sekmesi
// bayrak kapalıyken listeye hiç girmez ve varsayılan sekme "Skill" olur.
// Geri açma: oyun/lib/ozellikBayraklari.js › GARDIROP_ACIK = true
// Sekme kodu "joker" geriye uyum için korunur (?sekme=joker bağlantıları).
const TUM_SEKMELER = [
  { kod: "joker",   ad: tt("Skill"),   ikon: "yildiz" },
  { kod: "coin",    ad: tt("Coin"),    ikon: "coin" },
  { kod: "kiyafet", ad: tt("Kıyafet"), ikon: "tisort" },
];
const SEKMELER = TUM_SEKMELER.filter((x) => x.kod !== "kiyafet" || GARDIROP_ACIK);
const VARSAYILAN_SEKME = "joker";

// Paket adları/açıklamaları sunucudan gelir. Eski kayıtlar kullanıcıya
// “joker” diyebilir; ürün dilinde mekanik değişmeden “skill” olarak gösterilir.
function skillDilineCevir(metin) {
  return String(ttSunucu(metin) ?? "")
    .replace(/karışık\s+joker/gi, (x) => x[0] === "K" ? "Karışık skill" : "karışık skill")
    .replace(/jokerler/gi, "skiller")
    .replace(/joker/gi, "skill");
}

const sayiMi = (n) => n !== null && n !== undefined && n !== "" && Number.isFinite(Number(n));

/** Fiyat düğmesinin içi: "10× ● 170" */
function FiyatYazisi({ adet, fiyat }) {
  return (
    <span className="qt-dk-fiyat">
      {adet != null && <span className="qt-dk-fiyat-adet">{adet}×</span>}
      <QtIkon ad="coin" boyut={18} />
      <span className="qt-sayi">{sayiBicim(Number(fiyat))}</span>
    </span>
  );
}

export default function JokerDukkani() {
  const [envanter, setEnvanter] = useState({});
  // Paket 41 A: envanter okunamadıysa skill'ler "0" gösterilmez (oyuncu silindi sanıyordu)
  const [dukkanDurum, setDukkanDurum] = useState("yukleniyor");   // yukleniyor | hata | hazir
  const [reklam, setReklam] = useState({ bugun: null, tavan: null });
  // Maç başına skill hakkı ayardan okunur; okunamazsa kural listesi çizilmez.
  const [jokerHak, setJokerHak] = useState(null);
  const [paketler, setPaketler] = useState([]);
  const [fiyatlar, setFiyatlar] = useState({});
  const [hata, setHata] = useState(null);
  const [bilgi, setBilgi] = useState(null);
  const [videoCalisiyor, setVideoCalisiyor] = useState(false);
  const [alinan, setAlinan] = useState(null);
  const [coinPaketleri, setCoinPaketleri] = useState([]);
  const [odulCoin, setOdulCoin] = useState(null);
  const [tekFiyat, setTekFiyat] = useState({});
  const [ayar, setAyar] = useState(null);   // Paket 32 C: açıklamalardaki sayılar oyun_ayarlari'ndan
  // Paket 2 B1/B2: skill_dukkani() — tür başına tek fiyat, 10'lu paket, kilit ve level (tek çağrı).
  const [skillDukkan, setSkillDukkan] = useState(null);
  const jokerSerbest = Number(ayar?.jokerler_ucretsiz ?? 0) > 0;   // Paket 34

  useEffect(() => {
    let aktif = true;
    ayarlar().then((o) => {
      if (!aktif || !o) return;
      setAyar(o);
      if (sayiMi(o.coin_reklam)) setOdulCoin(Number(o.coin_reklam));
      if (Number(o.klasik_skill_toplam_hak) > 0) setJokerHak(Number(o.klasik_skill_toplam_hak));
      // Paket 2 B1: skill_dukkani() okunamazsa tek fiyat kendi coin_joker_<tür> anahtarından.
      setTekFiyat((onceki) => ({
        ...Object.fromEntries(AKTIF_MAC_SKILLERI
          .filter((t) => sayiMi(o[`coin_joker_${t}`]))
          .map((t) => [t, Number(o[`coin_joker_${t}`])])),
        ...onceki,
      }));
    }).catch((e) => console.error("[Bildim] oyun ayarları okunamadı:", e));
    return () => { aktif = false; };
  }, []);

  // Sekme adres çubuğunda tutulur: "coin yetmiyor" uyarısı doğrudan Coin
  // sekmesine götürebilsin, geri tuşu da beklendiği gibi çalışsın.
  const [arama, setArama] = useSearchParams();
  const sekme = SEKMELER.some((x) => x.kod === arama.get("sekme"))
    ? arama.get("sekme")
    : VARSAYILAN_SEKME;
  const sekmeSec = (kod) => setArama({ sekme: kod }, { replace: true });
  // Paket 42 M.2: en ucuz skill (tek tek ya da paket) — bakiye bunun altındaysa üstte uyarı
  const enUcuzJoker = Math.min(
    ...Object.values(tekFiyat ?? {}).map(Number).filter((n) => Number.isFinite(n) && n > 0),
    ...(paketler ?? []).map((p) => Number(p.coin_fiyat)).filter((n) => Number.isFinite(n) && n > 0),
  );

  const { bakiye, tazele: coinOku } = useCoin();
  const playVar = desteklenirMi();

  const yukle = useCallback(async () => {
    try {
      const [env, rek, pak, cpak, sdk] = await Promise.all([
        supabase.rpc("envanterim"),
        supabase.rpc("reklam_durumum"),
        supabase.from("joker_paketleri").select("*").order("sira"),
        supabase.from("coin_paketleri").select("*").eq("aktif", true).order("sira"),
        supabase.rpc("skill_dukkani"),
      ]);
      if (env.error) throw env.error;
      setEnvanter(envanterNesne(env.data));
      if (sdk.error) {
        console.error("[Bildim] skill dükkânı okunamadı:", sdk.error);
      } else if (Array.isArray(sdk.data?.skiller)) {
        const harita = Object.fromEntries(sdk.data.skiller.map((s) => [s.tur, s]));
        setSkillDukkan({ level: Number(sdk.data.level ?? 1), skiller: harita });
        setTekFiyat((onceki) => ({
          ...onceki,
          ...Object.fromEntries(sdk.data.skiller.filter((s) => s.fiyat != null).map((s) => [s.tur, Number(s.fiyat)])),
        }));
      }
      const ikincilHata = rek.error ?? pak.error ?? cpak.error;
      if (ikincilHata) {
        console.error("[Bildim] dükkân verilerinin bir bölümü alınamadı:", ikincilHata);
        setHata(hataMesaji(ikincilHata, tt("Dükkânın bazı bölümleri yüklenemedi. Tekrar dene.")));
      }
      if (!rek.error) {
        const r = Array.isArray(rek.data) ? rek.data[0] : rek.data;
        if (r) setReklam({ bugun: r.bugun ?? 0, tavan: sayiMi(r.tavan) ? Number(r.tavan) : null });
      }
      if (!pak.error) setPaketler(pak.data ?? []);
      if (!cpak.error) setCoinPaketleri(cpak.data ?? []);
      setDukkanDurum("hazir");
    } catch (e) {
      console.error("[Bildim] dükkân alınamadı:", e);
      setDukkanDurum("hata");
    }
  }, []);

  useEffect(() => {
    yukle();
  }, [yukle]);

  // Bildirim kendiliğinden kapanır (bilgi ≈4 sn, hata ≈7 sn); çarpıyla da kapanır.
  useEffect(() => {
    if (!bilgi) return undefined;
    const t = setTimeout(() => setBilgi(null), 4000);
    return () => clearTimeout(t);
  }, [bilgi]);
  useEffect(() => {
    if (!hata) return undefined;
    const t = setTimeout(() => setHata(null), 7000);
    return () => clearTimeout(t);
  }, [hata]);

  // Play fiyatları yalnız Android uygulamasında okunabilir
  useEffect(() => {
    if (!playVar || coinPaketleri.length === 0) return;
    let aktif = true;
    fiyatlariAl(coinPaketleri.map((p) => p.urun_id))
      .then((f) => aktif && setFiyatlar(f))
      .catch((e) => {
        console.error("[Bildim] mağaza fiyatları alınamadı:", e);
        if (aktif) setHata(hataMesaji(e, tt("Satın alma fiyatları alınamadı. Tekrar dene.")));
      });
    return () => {
      aktif = false;
    };
  }, [playVar, coinPaketleri]);

  const videoIzle = async () => {
    setHata(null);
    setBilgi(null);
    setVideoCalisiyor(true);
    try {
      // 1) Sunucudan tek kullanımlık reklam jetonu al (tavan doluysa burada durur)
      const { data: jetonVeri, error: jetonHata } = await supabase.rpc("reklam_jetonu_al");
      if (jetonHata) throw jetonHata;
      const ref = (Array.isArray(jetonVeri) ? jetonVeri[0] : jetonVeri)?.jeton;
      if (!ref) throw new Error(tt("Reklam gösterilemedi."));
      // 2) Reklamı göster — başarısızsa SUNUCUYA HİÇ GİDİLMEZ (sahte ödül yok)
      await odulluVideoGoster();
      // 3) Ödülü sunucu verir (yalnız bu jetonla, en az reklam süresi geçtiyse)
      const { data, error } = await supabase.rpc("reklam_odulu_al", { p_reklam_ref: ref });
      if (error) throw error;
      const s = Array.isArray(data) ? data[0] : data;
      setBilgi(tt("+{0} coin kazandın! (bugün {1}/{2})", { 0: s?.verilen ?? "?", 1: s?.bugun ?? "?", 2: s?.tavan ?? reklam.tavan ?? "?" }));
      coinTazele();
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("Reklam gösterilemedi.")));
    } finally {
      setVideoCalisiyor(false);
    }
  };

  const paketAl = async (urunId) => {
    setHata(null);
    setBilgi(null);
    setAlinan(urunId);
    try {
      const { purchase_token } = await satinAl(urunId);

      // Doğrulama SUNUCUDA (Edge Function → Play Developer API)
      const { data: oturum, error: oturumHatasi } = await supabase.auth.getSession();
      if (oturumHatasi) throw oturumHatasi;
      const jwt = oturum?.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/satin_alma_dogrula`;
      const cevap = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ urun_id: urunId, purchase_token }),
      });
      const sonuc = await cevap.json();
      if (!cevap.ok) throw new Error(sonuc?.hata ?? tt("Satın alma doğrulanamadı."));

      // Asıl tüketim sunucuda; yapılamadıysa istemci yedeği (hatası günlüğe gider)
      if (sonuc?.tuketildi !== true) await tuket(purchase_token);
      setBilgi(tt("Satın alman tamamlandı, coin hesabına eklendi."));
      coinTazele();
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("Satın alma tamamlanamadı.")));
    } finally {
      setAlinan(null);
    }
  };

  /** Skill paketini COİN ile alır. Coin yetmezse Coin sekmesine götürür. */
  const jokerCoinIleAl = async (urunId) => {
    setHata(null);
    setBilgi(null);
    setAlinan(urunId);
    try {
      const { error } = await supabase.rpc("joker_coin_ile_al", { p_urun_id: urunId });
      if (error) throw error;
      setBilgi(tt("Skiller hesabına eklendi."));
      coinTazele();
      coinOku();
      await yukle();
    } catch (e) {
      const m = coinHatasi(e);
      setHata(m);
      // Buton pasif DEĞİL: basınca ne olduğu söylenir ve coin almaya götürülür.
      if (m === tt("Coin yetmiyor")) sekmeSec("coin");
    } finally {
      setAlinan(null);
    }
  };

  /** Tek skill alır (birim fiyat sunucudan). */
  const jokerTekAl = async (tur) => {
    setHata(null);
    setBilgi(null);
    setAlinan(`tek:${tur}`);
    try {
      const { error } = await supabase.rpc("joker_tek_al", { p_tur: tur });
      if (error) throw error;
      setBilgi(tt("{0} hesabına eklendi.", { 0: JOKER_BILGI[tur].ad }));
      coinTazele();
      coinOku();
      await yukle();
    } catch (e) {
      const m = coinHatasi(e);
      setHata(m);
      if (m === tt("Coin yetmiyor")) sekmeSec("coin");
    } finally {
      setAlinan(null);
    }
  };

  /** Paket 2 B2: skill kilidini coin ile bir kez açar. Level ve coin kontrolü sunucuda. */
  const skillKilidiAc = async (tur) => {
    setHata(null);
    setBilgi(null);
    setAlinan(`kilit:${tur}`);
    try {
      const { error } = await supabase.rpc("skill_kilidi_ac", { p_tur: tur });
      if (error) throw error;
      setBilgi(tt("{0} kilidi açıldı.", { 0: JOKER_BILGI[tur]?.ad ?? tur }));
      coinTazele();
      coinOku();
      await yukle();
    } catch (e) {
      const m = coinHatasi(e);
      setHata(ttSunucu(m));
      if (m === tt("Coin yetmiyor")) sekmeSec("coin");
    } finally {
      setAlinan(null);
    }
  };

  const reklamKaldi = reklam.tavan == null ? 1 : Math.max(0, reklam.tavan - (reklam.bugun ?? 0));
  const hazir = dukkanDurum === "hazir";
  const karisikPaketler = paketler.filter((p) => p.coin_fiyat != null && !p.fiyat_anahtari
    && Object.keys(p.icerik ?? {}).every((id) => AKTIF_MAC_SKILLERI.includes(id) || id === "seri_koruma"));

  return (
    <div className="qt-dk">
      <header className="qt-dk-ust">
        <h1 className="qt-baslik-1">{tt("Dükkân")}</h1>
      </header>

      <QtSekmeler
        className="qt-dk-sekmeler"
        etiket={tt("Dükkân bölümleri")}
        sekmeler={SEKMELER}
        aktif={sekme}
        onSec={sekmeSec}
      />

      <QtToastYuvasi>
        {hata && <QtToast ton="yanlis" baslik={hata} onKapat={() => setHata(null)} />}
        {bilgi && <QtToast ton="coin" baslik={bilgi} onKapat={() => setBilgi(null)} />}
      </QtToastYuvasi>

      <div id={`qt-panel-${sekme}`} role="tabpanel" className="qt-dk-panel">
        {/* ---------- KIYAFET (dondurulmuş vitrin, bayrakla) ---------- */}
        {sekme === "kiyafet" && <GorunumVitrini />}

        {(sekme === "joker" || sekme === "coin") && !hazir && (
          <QtKart>
            <DurumKutusu durum={dukkanDurum} satir={4} onTekrar={() => { setDukkanDurum("yukleniyor"); yukle(); }} />
          </QtKart>
        )}

        {/* ================= SKILL ================= */}
        {sekme === "joker" && hazir && (
          <>
            {/* Paket 34: skill'ler geçici olarak ücretsiz ve sınırsız */}
            {jokerSerbest && (
              <p className="qt-dk-not qt-dk-not--dogru" role="status">
                <QtIkon ad="hediye" boyut={20} />
                <span>{tt("Skiller şimdilik ücretsiz ve sınırsız — maçta stok gerekmez, satın almana gerek yok.")}</span>
              </p>
            )}
            {/* Paket 42 M.2: coin en ucuz skill'e bile yetmiyorsa üstte tek satır */}
            {!jokerSerbest && bakiye !== null && Number.isFinite(enUcuzJoker) && bakiye < enUcuzJoker && (
              <div className="qt-dk-not qt-dk-not--uyari" role="status">
                <QtIkon ad="coin" boyut={20} />
                <span>{tt("Coin'in şu an hiçbir skill'e yetmiyor.")}</span>
                <QtDugme tur="ikincil" boyut="k" onClick={() => sekmeSec("coin")}>{tt("Coin kazan")}</QtDugme>
              </div>
            )}

            <section className="qt-dk-bolum" aria-labelledby="qt-dk-skiller">
              <h2 id="qt-dk-skiller" className="qt-baslik-2">{tt("Skill'ler")}</h2>
              <ul className="qt-dk-skill-liste">
                {AKTIF_MAC_SKILLERI.map((tur) => {
                  // Paket 2 B1/B2: sunucudan gelen satır (fiyat, 10'lu paket, kilit).
                  const sd = skillDukkan?.skiller?.[tur] ?? null;
                  const kilitli = Boolean(sd && sd.acik === false);
                  const levelYetmez = kilitli && Number(sd.gereken_level ?? 1) > Number(skillDukkan?.level ?? 1);
                  const kilitFiyat = Number(sd?.kilit_fiyati ?? 0);
                  const paket10 = sd?.paket ?? null;
                  const tekVar = sayiMi(tekFiyat[tur]);
                  const tek = Number(tekFiyat[tur]);
                  const yetmez = !kilitli && tekVar && bakiye !== null && bakiye < tek;
                  const b = jokerBilgi(tur, "1v1", ayar);
                  return (
                    <li key={tur}>
                      <QtKart dolgu="k" className={"qt-dk-skill" + (kilitli ? " qt-dk-skill--kilitli" : "")}>
                        <span className="qt-dk-skill-ikon" aria-hidden="true">
                          <QtIkon ad={JOKER_BILGI[tur].ikon} boyut={28} />
                          {kilitli && <span className="qt-dk-skill-kilit"><QtIkon ad="kilit" boyut={14} /></span>}
                        </span>
                        <div className="qt-dk-skill-metin">
                          <h3 className="qt-baslik-3">{JOKER_BILGI[tur].ad}</h3>
                          <p className="qt-kucuk qt-soluk">{b.aciklama}</p>
                          <div className="qt-dk-skill-rozetler">
                            {!kilitli && (
                              <QtRozet boyut="k" ton={(envanter[tur] ?? 0) > 0 ? "mor" : "notr"}>
                                {tt("Sende: {n}", { n: envanter[tur] ?? 0 })}
                              </QtRozet>
                            )}
                            {kilitli && (
                              <QtRozet boyut="k" ton="uyari" ikon="kilit">
                                {levelYetmez
                                  ? tt("Level {0} gerekir", { 0: sd.gereken_level })
                                  : tt("Kilitli — bir kez açılır")}
                              </QtRozet>
                            )}
                            {yetmez && <QtRozet boyut="k" ton="yanlis">{tt("Yetersiz coin")}</QtRozet>}
                          </div>
                        </div>
                        <div className="qt-dk-skill-al">
                          {kilitli ? (
                            <QtDugme
                              tur="mor"
                              boyut="k"
                              devreDisi={levelYetmez}
                              yukleniyor={alinan === `kilit:${tur}`}
                              aria-label={levelYetmez
                                ? tt("Level {0} gerekir", { 0: sd.gereken_level })
                                : tt("{0} kilidini aç — {1} coin", { 0: JOKER_BILGI[tur].ad, 1: kilitFiyat })}
                              onClick={() => skillKilidiAc(tur)}
                              ikon="kilit"
                            >
                              {levelYetmez
                                ? tt("Lv {0}", { 0: sd.gereken_level })
                                : kilitFiyat > 0 ? <FiyatYazisi fiyat={kilitFiyat} /> : tt("Kilidi aç")}
                            </QtDugme>
                          ) : (
                            <>
                              {tekVar && (
                                <QtDugme
                                  boyut="k"
                                  devreDisi={jokerSerbest || yetmez}
                                  yukleniyor={alinan === `tek:${tur}`}
                                  aria-label={tt("{0} — {1} coin", { 0: JOKER_BILGI[tur].ad, 1: tek })}
                                  onClick={() => jokerTekAl(tur)}
                                >
                                  <FiyatYazisi adet={1} fiyat={tek} />
                                </QtDugme>
                              )}
                              {paket10 && sayiMi(paket10.fiyat) && (
                                <QtDugme
                                  tur="ikincil"
                                  boyut="k"
                                  devreDisi={jokerSerbest}
                                  yukleniyor={alinan === paket10.urun_id}
                                  aria-label={tt("{0} × {1} — {2} coin", { 0: paket10.adet, 1: JOKER_BILGI[tur].ad, 2: paket10.fiyat })}
                                  onClick={() => jokerCoinIleAl(paket10.urun_id)}
                                >
                                  <FiyatYazisi adet={paket10.adet} fiyat={paket10.fiyat} />
                                </QtDugme>
                              )}
                            </>
                          )}
                        </div>
                      </QtKart>
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* ---------- Karışık skill paketleri (coin ile) ---------- */}
            {karisikPaketler.length > 0 && (
              <section className="qt-dk-bolum" aria-labelledby="qt-dk-paketler">
                <h2 id="qt-dk-paketler" className="qt-baslik-2">{tt("Paketler")}</h2>
                <ul className="qt-dk-paket-izgara">
                  {karisikPaketler.map((p) => (
                    <li key={p.urun_id}>
                      <QtKart dolgu="k" className="qt-dk-paket">
                        <div className="qt-dk-paket-metin">
                          <h3 className="qt-baslik-3">{skillDilineCevir(p.ad)}</h3>
                          {p.aciklama && <p className="qt-kucuk qt-soluk">{skillDilineCevir(p.aciklama)}</p>}
                        </div>
                        <ul className="qt-dk-paket-icerik" aria-label={tt("Paket içeriği")}>
                          {Object.entries(p.icerik ?? {}).map(([tur, adet]) => (
                            <li key={tur} className="qt-dk-parca">
                              <QtIkon ad={JOKER_BILGI[tur]?.ikon ?? "soru"} boyut={18} />
                              <span className="qt-sayi">{adet}</span>
                              <span className="qt-gizli">{JOKER_BILGI[tur]?.ad ?? tur}</span>
                            </li>
                          ))}
                        </ul>
                        {/* Düğme PASİF DEĞİL: coin yetmezse basınca söyler ve Coin sekmesine götürür. */}
                        <QtDugme
                          boyut="k"
                          tamGenislik
                          devreDisi={jokerSerbest}
                          yukleniyor={alinan === p.urun_id}
                          aria-label={tt("{0} — {1} coin", { 0: skillDilineCevir(p.ad), 1: p.coin_fiyat })}
                          onClick={() => jokerCoinIleAl(p.urun_id)}
                        >
                          <FiyatYazisi fiyat={p.coin_fiyat} />
                        </QtDugme>
                      </QtKart>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* ---------- Seri Koruma (maç skill'i değil) + kurallar ---------- */}
            <section className="qt-dk-bolum" aria-labelledby="qt-dk-kurallar-baslik">
              <QtKart dolgu="k" className="qt-dk-seri">
                <span className="qt-dk-skill-ikon qt-dk-skill-ikon--coin" aria-hidden="true">
                  <QtIkon ad={JOKER_BILGI.seri_koruma.ikon} boyut={24} />
                </span>
                <div className="qt-dk-skill-metin">
                  <h3 className="qt-baslik-3">{JOKER_BILGI.seri_koruma.ad}</h3>
                  <p className="qt-kucuk qt-soluk">{JOKER_BILGI.seri_koruma.aciklama}</p>
                </div>
                <QtRozet ton={(envanter.seri_koruma ?? 0) > 0 ? "coin" : "notr"}>
                  {tt("Sende: {n}", { n: envanter.seri_koruma ?? 0 })}
                </QtRozet>
              </QtKart>
              {/* Kural metni TEK KAYNAKTAN: oyun/lib/jokerKurallari.js */}
              {jokerHak != null && (
                <details className="qt-dk-kurallar">
                  <summary id="qt-dk-kurallar-baslik">
                    <QtIkon ad="bilgi" boyut={20} />
                    <span>{tt("Skill kuralları")}</span>
                    <QtIkon ad="asagi" boyut={20} className="qt-dk-kurallar-ok" />
                  </summary>
                  <ul>
                    {jokerKurallari(jokerHak).map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          </>
        )}

        {/* ================= COIN ================= */}
        {sekme === "coin" && hazir && (
          <>
            {/* Ödüllü video: jeton → reklam → sunucu ödülü (akış değişmez) */}
            <QtKart ton="mor" className="qt-dk-video">
              <span className="qt-dk-video-ikon" aria-hidden="true"><QtIkon ad="oyna" boyut={28} /></span>
              <div className="qt-dk-video-metin">
                <h2 className="qt-baslik-3">{tt("Video izle, coin kazan")}</h2>
                <p className="qt-kucuk">
                  {odulCoin != null && tt("Bir video = +{0} coin.", { 0: odulCoin })}
                  {reklam.tavan != null && <> {tt("Bugün {0}/{1}", { 0: reklam.bugun ?? 0, 1: reklam.tavan })}</>}
                </p>
              </div>
              {!h5AdsYapilandirildi() ? (
                <p className="qt-kucuk qt-dk-video-yok">
                  {tt("Reklam şu an kullanılamıyor")}. {tt("Şimdilik maç oynayarak ve günlük görevlerle coin kazanabilirsin.")}
                </p>
              ) : (
                <QtDugme
                  tamGenislik
                  ikon="oyna"
                  yukleniyor={videoCalisiyor}
                  devreDisi={reklamKaldi <= 0}
                  onClick={videoIzle}
                >
                  {videoCalisiyor
                    ? tt("Reklam açılıyor…")
                    : reklamKaldi <= 0
                      ? tt("Bugünlük hakkın doldu")
                      : odulCoin != null ? tt("Video izle (+{0} coin)", { 0: odulCoin }) : tt("Video izle")}
                </QtDugme>
              )}
            </QtKart>

            {/* Coin paketleri (gerçek para, yalnız Play Billing) */}
            <section className="qt-dk-bolum" aria-labelledby="qt-dk-coin-paketleri">
              <h2 id="qt-dk-coin-paketleri" className="qt-baslik-2">{tt("Coin paketleri")}</h2>
              {!playVar && (
                <p className="qt-dk-not qt-dk-not--bilgi">
                  <QtIkon ad="bilgi" boyut={20} />
                  <span>{tt("Satın alma yalnızca Android uygulamasında yapılabilir. Tarayıcıda paket satın alınamaz.")}</span>
                </p>
              )}
              {coinPaketleri.length === 0 ? (
                <QtBosDurum ikon="coin" ton="vurgu" baslik={tt("Şu an satışta coin paketi yok")} />
              ) : (
                <ul className="qt-dk-coin-izgara">
                  {coinPaketleri.map((p) => {
                    const f = fiyatlar[p.urun_id];
                    const bonus = Number(p.bonus) > 0 ? Number(p.bonus) : 0;
                    return (
                      <li key={p.urun_id}>
                        <QtKart dolgu="k" className="qt-dk-coin">
                          {bonus > 0 && (
                            <QtRozet ton="dogru" boyut="k" className="qt-dk-coin-bonus">
                              {tt("+{n} bonus", { n: sayiBicim(bonus) })}
                            </QtRozet>
                          )}
                          <span className="qt-dk-coin-gorsel">
                            <CoinGorseli boyut={coinBoyutu(Number(p.coin) + bonus)} genislik={72} />
                          </span>
                          <b className="qt-dk-coin-miktar qt-sayi">{sayiBicim(Number(p.coin))}</b>
                          <span className="qt-kucuk qt-soluk qt-dk-coin-ad">{f?.ad ?? ttSunucu(p.ad)}</span>
                          <QtDugme
                            boyut="k"
                            tamGenislik
                            devreDisi={!playVar}
                            yukleniyor={alinan === p.urun_id}
                            onClick={() => paketAl(p.urun_id)}
                          >
                            {f?.fiyat ?? (playVar ? tt("Satın al") : tt("Uygulamada"))}
                          </QtDugme>
                        </QtKart>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        )}

        {/* ---------- Yasal ---------- */}
        {sekme !== "kiyafet" && (
          <p className="qt-kucuk qt-soluk-zemin qt-dk-yasal">
            {tt("Satın alımlar Google Play üzerinden işlenir; ödeme bilgilerin Quiz Tactics ile paylaşılmaz. Tüketilebilir ürünlerde iade Google Play kurallarına tabidir. Ayrıntı için")}{" "}
            <Link to="/gizlilik">{tt("Gizlilik Politikası")}</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
