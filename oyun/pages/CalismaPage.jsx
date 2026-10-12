import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import KategoriIkon from "../components/KategoriIkon.jsx";
import MacUstSerit from "../components/MacUstSerit.jsx";
import Konfeti from "../components/Konfeti.jsx";
import { sesKilidiAc, sesTik, sesDogru, sesYanlis, sesKazandin, sesDokunus, sesOnYukle, sesSoruGeldi } from "../lib/ses.js";
import { QtAfis, QtBosDurum, QtCip, QtDugme, QtIkon, QtIlerleme, QtIskelet, QtKart, QtRozet, QtSayac, QtSik, QtSikler, QtSonucBandi, QtSoruKarti } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import "../tasarim/ekranlar/m1-calisma.css";
import CevapEfekti from "../components/CevapEfekti.jsx";
import { GB_MS, titret } from "../lib/geriBildirim.js";
import { hataMesaji } from "../lib/hata.js";
import { supabase } from "../../src/lib/supabase.js";
import { KATEGORI_BILGI, kategoriEtiket, kategorileriSirala } from "../lib/kategoriler.js";
import GeriDugmesi from "../components/GeriDugmesi.jsx";
import { y } from "../lib/yol.js";
import { useGorunurlukTazele } from "../lib/gorunurluk.js";
import { tikBasligiEkle } from "../lib/zaman.js";
import { tt } from "../lib/dil.js";
import MacSorulari from "../components/MacSorulari.jsx";
import { useOyunModu } from "../lib/oyunModu.js";
import { rpcDene } from "../lib/rpcDene.js";
import { soruUzunlukSinifi } from "../lib/soruUzunluk.js";
import { BasiliTut } from "../lib/useBasiliTut.js";

const SORU_SN = 20;
const HARFLER = ["A", "B", "C", "D"];
const SORU_SECENEKLERI = [10, 20, 30];
// get_categories okunamazsa (12 Eki 2026 ölçümü: DB yük altındayken 500) kartlar bu sabit listeden çizilir —
// eskiden hata sessizce yutuluyor, ekranda yalnız "Tümü" kalıyordu.
const YEDEK_KATEGORILER = Object.keys(KATEGORI_BILGI).filter((k) => k !== "genel" && k !== "karisik").map((kategori) => ({ kategori }));
// Öğrenme yolu kilometre taşları (yalnız görsel ilerleme; ödül vaat etmez)
const OGRENME_TASLARI = [5, 10, 25, 50, 100, 250, 500, 1000];
const katRengi = (k) => `var(--qt-kat-${String(k).replace(/_/g, "-")}-2, var(--qt-kat-diger-2))`;

/**
 * Hatalarım — puansız, tek kişilik çalışma modu.
 * Lig puanı vermez; yalnız kategori ustalığına ve öğrenilen soru sayacına işler.
 */
/** Sunucudan gelen sayı alanı gerçekten sayı mı (eksik/null/undefined değil). */
const sayiMi = (x) => x !== null && x !== undefined && x !== "" && Number.isFinite(Number(x));

export default function CalismaPage() {
  const navigate = useNavigate();
  const [asama, setAsama] = useState("secim"); // secim | oyun | sonuc
  const [banka, setBanka] = useState(null); // { toplam, ogrenilen, bekleyen, kategoriler[] }
  // Paket 41 A: banka okunamadıysa "Henüz yanlışın yok" boş durumu çizilmez
  const [bankaHata, setBankaHata] = useState(false);
  const [kategoriler, setKategoriler] = useState([]);
  const [kategori, setKategori] = useState(null);
  const [soruSayisi, setSoruSayisi] = useState(10);
  const [oturum, setOturum] = useState(null);
  const [soru, setSoru] = useState(null);
  const [seri, setSeri] = useState(0);
  const [sarsil, setSarsil] = useState(false);
  const [secim, setSecim] = useState(null);
  const [sonucSoru, setSonucSoru] = useState(null);
  const [kalan, setKalan] = useState(SORU_SN);
  const [sonuc, setSonuc] = useState(null);
  // Paket 41 B/E: tur sürerken öteki modlar gibi çubuklar gizlenir, üst şerit aynı yerde durur
  useOyunModu(Boolean(oturum) && !sonuc);
  // Paket 20 II.1: tur sonunda her soru için "Soruyu bildir" (soru ekranı otomatik geçtiği için listede)
  const [cevaplananlar, setCevaplananlar] = useState([]);
  const [kutlama, setKutlama] = useState(false);
  // Tur sonu kutlaması (öğrenilen > 0): konfeti + ses tur başına BİR KEZ — yeniden çizim tekrar etmez
  const [sonKutlama, setSonKutlama] = useState(false);
  const sonKutlamaRef = useRef(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [calisiyor, setCalisiyor] = useState(false);
  const [hata, setHata] = useState(null);

  const soruBaslangicRef = useRef(Date.now());
  const bittiRef = useRef(false);
  const sonTikRef = useRef(null);
  // Sayaç tiki: sekmeden dönüşte elle tetiklenebilsin.
  const tikRef = useRef(null);

  useEffect(() => {
    sesKilidiAc();
  }, []);

  // ---------- Banka özeti ----------
  const bankaYukle = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("yanlis_bankam");
      if (error) throw error;
      const satirlar = data ?? [];
      const ilk = satirlar[0] ?? { toplam: 0, ogrenilen: 0, bekleyen: 0 };
      setBanka({
        toplam: ilk.toplam ?? 0,
        ogrenilen: ilk.ogrenilen ?? 0,
        bekleyen: ilk.bekleyen ?? 0,
        kategoriler: satirlar.filter((s) => s.kategori),
      });
      setBankaHata(false);
    } catch (e) {
      // Banka okunamazsa mod yine açılabilmeli (pratik turu), ama boş banka gibi gösterilmez
      console.error("[Bildim] yanlış bankası alınamadı:", e);
      setBanka({ toplam: 0, ogrenilen: 0, bekleyen: 0, kategoriler: [] });
      setBankaHata(true);
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    bankaYukle();
    let iptal = false;
    (async () => {
      // Bir kez yeniden dene; yine olmazsa sabit liste (kartlar boş kalmasın)
      let { data, error } = await rpcDene("get_categories");
      if (error) {
        await new Promise((r) => setTimeout(r, 1200));
        if (iptal) return;
        ({ data, error } = await rpcDene("get_categories"));
      }
      if (!iptal) setKategoriler(!error && Array.isArray(data) && data.length > 0 ? data : YEDEK_KATEGORILER);
    })();
    return () => { iptal = true; };
  }, [bankaYukle]);

  // ---------- Soru getir ----------
  const soruGetir = useCallback(async (oturumId) => {
    try {
      const { data, error } = await supabase.rpc("calisma_soru", {
        p_oturum_id: oturumId,
      });
      if (error) throw error;
      const s = Array.isArray(data) ? data[0] : data;
      if (!s) throw new Error(tt("Soru gelmedi"));
      setSoru(s);
      setSecim(null);
      setSonucSoru(null);
      setKalan(SORU_SN);
      sonTikRef.current = null;
      soruBaslangicRef.current = Date.now();
    } catch (e) {
      setHata(hataMesaji(e, tt("Soru alınamadı.")));
    }
  }, []);

  // ---------- Bitir ----------
  const bitir = useCallback(async (oturumId) => {
    if (bittiRef.current) return;
    bittiRef.current = true;
    try {
      const { data, error } = await supabase.rpc("calisma_bitir", {
        p_oturum_id: oturumId,
      });
      if (error) throw error;
      setSonuc(Array.isArray(data) ? data[0] : data);
    } catch (e) {
      setHata(hataMesaji(e, tt("Tur kapatılamadı.")));
    }
    setAsama("sonuc");
    bankaYukle();
  }, [bankaYukle]);

  // ---------- Başlat ----------
  const basla = async () => {
    if (yukleniyor) return;   // banka gelmeden yanlış moda (pratik turu) başlanmaz
    setHata(null);
    setCalisiyor(true);
    bittiRef.current = false;
    try {
      const { data, error } = await supabase.rpc("calisma_baslat", {
        p_kategori: kategori,
        p_soru_sayisi: soruSayisi,
      });
      if (error) throw error;
      const o = Array.isArray(data) ? data[0] : data;
      if (!o?.oturum_id) throw new Error(tt("Tur açılamadı"));
      setOturum(o);
      setSonuc(null);
      setCevaplananlar([]);
      setAsama("oyun");
      await soruGetir(o.oturum_id);
    } catch (e) {
      setHata(hataMesaji(e, tt("Çalışma turu başlatılamadı.")));
    } finally {
      setCalisiyor(false);
    }
  };

  // ---------- Cevapla ----------
  const cevapla = async (i) => {
    if (secim !== null || !oturum || !soru) return;
    // 991: dokunma anı (sunucu saatiyle) = sorunun sunucu başlangıcı + ekranda geçen süre — geç varsa da sayılır
    const bas = Date.parse(soru.baslangic);
    const tikMs = i >= 0 && Number.isFinite(bas) ? bas + (Date.now() - soruBaslangicRef.current) : NaN;
    setSecim(i);
    if (i >= 0) { sesDokunus(); titret(10); }
    try {
      const { data, error } = await tikBasligiEkle(supabase.rpc("calisma_cevap", {
        p_oturum_id: oturum.oturum_id,
        p_soru_index: soru.soru_index,
        p_cevap: i,
      }), tikMs);
      if (error) throw error;
      const s = Array.isArray(data) ? data[0] : data;
      setSonucSoru(s);
      setCevaplananlar((l) => [...l, { question_id: soru.question_id, soru: soru.soru, secenekler: soru.secenekler,
        dogru_cevap: s?.dogru_cevap, benim_cevap: i, ben_cevapladim: true, bildirdim: false }]);
      if (s?.ogrenildi) {
        setKutlama(true);
        sesKazandin();
        setTimeout(() => setKutlama(false), 1400);
      } else if (s?.dogru) {
        sesDogru();
      } else {
        sesYanlis();
        titret(30);
      }
      if (s?.dogru) {
        setSeri((x) => x + 1);
      } else {
        setSeri(0);
        setSarsil(true);
        setTimeout(() => setSarsil(false), 380);
      }
      // Öğrenildi kutlaması için biraz daha uzun bekle
      setTimeout(
        () => {
          if (s?.bitti) bitir(oturum.oturum_id);
          else soruGetir(oturum.oturum_id);
        },
        s?.ogrenildi ? 1500 : GB_MS
      );
    } catch (e) {
      setHata(hataMesaji(e, tt("Cevap gönderilemedi.")));
    }
  };

  // ---------- Süre sayacı ----------
  useEffect(() => {
    if (asama !== "oyun" || !soru || secim !== null) return;
    const tik = () => {
      const gecen = (Date.now() - soruBaslangicRef.current) / 1000;
      const k = Math.max(0, SORU_SN - gecen);
      setKalan(k);
      if (k > 0 && k <= 3) {
        const sn = Math.ceil(k);
        if (sonTikRef.current !== sn) {
          sonTikRef.current = sn;
          sesTik(sn);
        }
      } else if (k > 3) {
        sonTikRef.current = null;
      }
    };
    tikRef.current = tik;
    const id = setInterval(tik, 100);
    return () => clearInterval(id);
  }, [asama, soru, secim]);

  // Sekmeden dönünce sayacı beklemeden senkronla. Sayaç zaten Date.now()
  // tabanlı olduğu için değer doğru; eksik olan, arka planda donan
  // interval'in ilk tikini beklemeden ekranı güncellemek.
  useGorunurlukTazele(() => { tikRef.current?.(); }, asama === "oyun");

  // Süre dolunca yanlış say ve ilerle
  useEffect(() => {
    if (asama !== "oyun" || !soru || secim !== null) return;
    if (kalan > 0) return;
    cevapla(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kalan, asama, soru, secim]);

  // Yeni soru ekrana geldi — soru başına bir kez.
  const soruSesiRef = useRef(null);
  useEffect(() => {
    if (asama !== "oyun" || !soru) return;
    const anahtar = `${oturum?.oturum_id}-${soru.soru_index}`;
    if (soruSesiRef.current === anahtar) return;
    soruSesiRef.current = anahtar;
    sesSoruGeldi();
  }, [asama, soru, oturum?.oturum_id]);
  useEffect(() => { sesOnYukle("mac"); }, []);

  useEffect(() => {
    if (asama !== "sonuc" || !((Number(sonuc?.ogrenilen) || 0) > 0)) return;
    const anahtar = oturum?.oturum_id ?? "tur";
    if (sonKutlamaRef.current === anahtar) return;
    sonKutlamaRef.current = anahtar;
    sesKazandin();
    setSonKutlama(true);
    setTimeout(() => setSonKutlama(false), 1600);
  }, [asama, sonuc, oturum?.oturum_id]);

  const hataBandi = hata ? (
    <div className="m1-bant m1-bant--hata" role="alert"><QtIkon ad="uyari" boyut={18} /><span>{hata}</span></div>
  ) : null;

  // ============ SEÇİM EKRANI ============
  if (asama === "secim") {
    const bos = (banka?.bekleyen ?? 0) === 0;
    // Paket 20 V: seçili kategoride bankadaki soru sayısı — tur bundan fazlaysa kalan YENİ sorudur, açıkça yazılır
    const bankaKat = kategori === null ? (banka?.bekleyen ?? 0)
      : (banka?.kategoriler?.find((k) => k.kategori === kategori)?.kategori_adet ?? 0);
    const bankaKadar = Math.min(50, Math.max(5, bankaKat));
    const tahminBanka = Math.min(bankaKat, soruSayisi);
    const tahminYeni = Math.max(0, soruSayisi - tahminBanka);
    const bankaSecenegi = bankaKat > 0 && !SORU_SECENEKLERI.includes(bankaKadar);
    // Ekran revizyonu A (Ida, 10 Eki 2026): kategori kartları — her kartta bankada bekleyen soru; bankada sorusu olanlar önde.
    const katAdet = new Map((banka?.kategoriler ?? []).map((k) => [k.kategori, Number(k.kategori_adet) || 0]));
    // Bankada sorusu olup listede (get_categories) olmayan kategori de kart alır — bankadaki soru gizli kalmasın
    const katListe = [...kategoriler];
    for (const k of banka?.kategoriler ?? []) if (!katListe.some((x) => x.kategori === k.kategori)) katListe.push({ kategori: k.kategori });
    const katKartlari = [
      { kategori: null, adet: banka?.bekleyen ?? 0 },
      ...kategorileriSirala(katListe)
        .map((k, i) => ({ kategori: k.kategori, adet: katAdet.get(k.kategori) ?? 0, i }))
        .sort((a, b) => b.adet - a.adet || a.i - b.i),
    ];
    // Bankanın kategori dağılımı (yalnız sorusu olanlar, çoktan aza) ve öğrenme yolu
    const dagilim = katKartlari.filter((k) => k.kategori && k.adet > 0);
    const dagilimEn = Math.max(1, ...dagilim.map((k) => k.adet));
    const ogrenilenSay = Number(banka?.ogrenilen) || 0;
    const sonrakiTas = OGRENME_TASLARI.find((t) => t > ogrenilenSay) ?? null;
    const oncekiTas = [...OGRENME_TASLARI].reverse().find((t) => t <= ogrenilenSay) ?? 0;
    // Yolda 5 taş: geçilen son taşlar + sıradaki ve sonrası
    const siraIdx = sonrakiTas ? OGRENME_TASLARI.indexOf(sonrakiTas) : OGRENME_TASLARI.length - 1;
    const basIdx = Math.max(0, Math.min(siraIdx - 2, OGRENME_TASLARI.length - 5));
    const gorunenTaslar = OGRENME_TASLARI.slice(basIdx, basIdx + 5);
    return (
      <div className="m1-cal">
        <div className="m1-cal-geri"><GeriDugmesi /></div>
        {/* Ekran revizyonu A: turuncu kitap afişi — sağda bekleyen sayı, şeritte gerçek ilerleme (öğrenilen / toplam) */}
        <section className="m1-cal-hero" aria-label={tt("Hatalarım")}>
          <span className="m1-cal-hero-ikon" aria-hidden="true"><QtIkon ad="kitap" boyut={30} /></span>
          <div className="m1-cal-hero-govde">
            <h1 className="m1-cal-hero-baslik">{tt("Hatalarım")}</h1>
            <p className="m1-cal-hero-kural">{tt("İki kez doğru bil, bankadan çıksın")}</p>
          </div>
          {!yukleniyor && !bankaHata && (
            (banka?.bekleyen ?? 0) > 0 ? (
              <span className="m1-cal-hero-sayi" aria-label={tt("{n} soru bankanda", { n: banka.bekleyen })}>
                <b className="qt-sayi">{banka.bekleyen}</b><small>{tt("soru")}</small>
              </span>
            ) : <QtRozet ton="dogru" ikon="onay" boyut="k">{tt("Temiz")}</QtRozet>
          )}
          {!yukleniyor && !bankaHata && (banka?.toplam ?? 0) > 0 && (
            <div className="m1-cal-hero-ilerleme">
              <QtIlerleme deger={banka.ogrenilen ?? 0} en={banka.toplam} ton="mor" etiket={tt("{o}/{t} öğrenildi", { o: banka.ogrenilen ?? 0, t: banka.toplam })} />
              <span className="m1-cal-hero-ilerleme-yazi">{tt("{o}/{t} öğrenildi", { o: banka.ogrenilen ?? 0, t: banka.toplam })}</span>
            </div>
          )}
        </section>

        {yukleniyor ? (
          <QtIskelet tur="kart" yukseklik={140} />
        ) : bankaHata ? (
          <QtBosDurum
            ikon="uyari"
            ton="yanlis"
            metin={tt("Hatalarım bankan alınamadı; genel havuzdan pratik turu yine açılabilir.")}
            eylem={<QtDugme tur="ikincil" boyut="k" ikon="yenile" onClick={() => { setYukleniyor(true); bankaYukle(); }}>{tt("Tekrar dene")}</QtDugme>}
          />
        ) : bos ? (
          /* Ekran revizyonu: boş durum A (küçük sahne çizimi). Kategori + soru sayısı altta kalır → pratik turu açılır. */
          <QtKart>
            <QtBosDurum
              gorsel="hatalarim"
              gorselTarz="sahne"
              baslik={tt("Hatalı sorun yok")}
              metin={tt("Yanlış yaptığın sorular burada birikir.")}
            />
          </QtKart>
        ) : null}

        <section className="m1-cal-bolum" aria-labelledby="m1-cal-kat">
          <h2 id="m1-cal-kat" className="qt-baslik-3">{tt("Kategori")}</h2>
          <div className="m1-cal-kat-izgara" role="group" aria-labelledby="m1-cal-kat">
            {katKartlari.map((k) => {
              const ad = k.kategori ? kategoriEtiket(k.kategori) : tt("Tümü");
              return (
                <button
                  key={k.kategori ?? "tumu"}
                  type="button"
                  className="m1-cal-kat-kart"
                  aria-pressed={kategori === k.kategori}
                  aria-label={k.adet > 0 ? `${ad} · ${tt("{n} soru bankanda", { n: k.adet })}` : ad}
                  onClick={() => setKategori(k.kategori)}
                >
                  <KategoriIkon anahtar={k.kategori ?? "karisik"} boyut={30} plaka />
                  <span className="m1-cal-kat-ad">{ad}</span>
                  {k.adet > 0 && <b className="qt-sayi m1-cal-kat-sayi" aria-hidden="true">{k.adet}</b>}
                </button>
              );
            })}
          </div>
        </section>

        <section className="m1-cal-bolum" aria-labelledby="m1-cal-adet">
          <h2 id="m1-cal-adet" className="qt-baslik-3">{tt("Soru sayısı")}</h2>
          <div className="m1-cal-adetler" role="group" aria-labelledby="m1-cal-adet">
            {bankaSecenegi && (
              <QtCip
                secili={soruSayisi === bankaKadar}
                onClick={() => setSoruSayisi(bankaKadar)}
                aria-label={tt("Bankan kadar: {n} soru", { n: bankaKadar })}
              >
                {bankaKat < 5 ? tt("En kısa tur") : tt("Hepsi (en çok 50)")}
              </QtCip>
            )}
            {SORU_SECENEKLERI.map((n) => (
              <QtCip key={n} secili={soruSayisi === n} onClick={() => setSoruSayisi(n)}>{n}</QtCip>
            ))}
          </div>
          {/* Yayın öncesi tarama (11 Eki 2026): banka gelmeden "Bankan temiz · pratik turu" yazılmaz, Başla pasif */}
          <p className="m1-cal-not" aria-busy={yukleniyor || undefined}>
            {yukleniyor ? tt("Yükleniyor…") : bankaKat === 0
              ? tt("Bankan temiz — bu bir pratik turu: {n} yeni soru.", { n: soruSayisi })
              : tahminYeni > 0
                ? tt("Bu tur: {b} soru bankandan + {y} yeni soru.", { b: tahminBanka, y: tahminYeni })
                : tt("Bu tur: {b} sorunun hepsi bankandan.", { b: tahminBanka })}
          </p>
        </section>

        {!yukleniyor && !bankaHata && dagilim.length > 0 && (
          <section className="m1-cal-bolum" aria-labelledby="m1-cal-dagilim">
            <h2 id="m1-cal-dagilim" className="qt-baslik-3">{tt("Bankandaki sorular")}</h2>
            <div className="m1-cal-dagilim">
              {/* Tek şerit: her kategori kendi renginde, payı kadar */}
              <div className="m1-cal-dagilim-serit" aria-hidden="true">
                {dagilim.map((k) => <span key={k.kategori} style={{ flexGrow: k.adet, "--m1-kat": katRengi(k.kategori) }} />)}
              </div>
              <ul className="m1-cal-dagilim-liste">
                {dagilim.map((k) => (
                  <li key={k.kategori}>
                    <button
                      type="button"
                      className="m1-cal-dagilim-satir"
                      aria-pressed={kategori === k.kategori}
                      aria-label={`${kategoriEtiket(k.kategori)} · ${tt("{n} soru bankanda", { n: k.adet })}`}
                      onClick={() => setKategori(k.kategori)}
                      style={{ "--m1-kat": katRengi(k.kategori) }}
                    >
                      <KategoriIkon anahtar={k.kategori} boyut={22} />
                      <span className="m1-cal-dagilim-ad">{kategoriEtiket(k.kategori)}</span>
                      <span className="m1-cal-dagilim-cubuk" aria-hidden="true"><i style={{ width: `${Math.max(6, Math.round((k.adet / dagilimEn) * 100))}%` }} /></span>
                      <b className="qt-sayi">{k.adet}</b>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {!yukleniyor && !bankaHata && (banka?.toplam ?? 0) > 0 && (
          <section className="m1-cal-bolum" aria-labelledby="m1-cal-yol">
            <h2 id="m1-cal-yol" className="qt-baslik-3">{tt("Öğrenme yolu")}</h2>
            <div className="m1-cal-yol">
              <ol className="m1-cal-yol-taslar">
                {gorunenTaslar.map((t) => (
                  <li key={t} className={`m1-cal-yol-tas${t <= ogrenilenSay ? " m1-cal-yol-tas--tamam" : t === sonrakiTas ? " m1-cal-yol-tas--sirada" : ""}`}>
                    <span className="m1-cal-yol-rozet" aria-hidden="true"><QtIkon ad={t <= ogrenilenSay ? "onay" : "kitap"} boyut={18} /></span>
                    <b className="qt-sayi">{t}</b>
                  </li>
                ))}
              </ol>
              {sonrakiTas ? (
                <>
                  <QtIlerleme deger={ogrenilenSay - oncekiTas} en={sonrakiTas - oncekiTas} ton="dogru"
                    etiket={tt("Sonraki hedef: {h} soru · {k} kaldı", { h: sonrakiTas, k: sonrakiTas - ogrenilenSay })} />
                  <p className="m1-cal-yol-yazi">{tt("Sonraki hedef: {h} soru · {k} kaldı", { h: sonrakiTas, k: sonrakiTas - ogrenilenSay })}</p>
                </>
              ) : (
                <p className="m1-cal-yol-yazi">{tt("Bütün hedefleri geçtin!")}</p>
              )}
            </div>
          </section>
        )}

        {hataBandi}
        <div className="m1-cal-eylem">
          <QtDugme tamGenislik boyut="b" ikon="kitap" yukleniyor={calisiyor} devreDisi={yukleniyor} onClick={basla}>
            <span className="m1-cal-eylem-metin">
              <span>{calisiyor ? tt("Hazırlanıyor…") : yukleniyor ? tt("Yükleniyor…") : bankaKat === 0 ? tt("Pratik turuna başla") : tt("Çalışmaya başla")}</span>
              {/* Seçim özeti düğmenin İÇİNDE (Meydan tek eylem gibi) — sticky iken alttaki kartların üstüne binmez */}
              <span className="m1-cal-eylem-ozet">{tt("{n} soru", { n: soruSayisi })} · {kategori === null ? tt("Tümü") : kategoriEtiket(kategori)}</span>
            </span>
          </QtDugme>
        </div>
      </div>
    );
  }

  // ============ OYUN EKRANI ============
  if (asama === "oyun") {
    const secenekler = soru
      ? Array.isArray(soru.secenekler)
        ? soru.secenekler
        : JSON.parse(soru.secenekler)
      : [];
    const toplam = Number(soru?.toplam ?? oturum?.soru_sayisi ?? 0) || 0;
    const sirada = (soru?.soru_index ?? 0) + 1;
    // Paket 20 V: dağılım sunucudan (calisma_baslat: bankadan / havuzdan). Paket 40 I: alan eksikse metin yazılmaz.
    let turBilgi = "";
    if (oturum && sayiMi(oturum.bankadan)) {
      const b = Number(oturum.bankadan);
      const h = sayiMi(oturum.havuzdan) ? Number(oturum.havuzdan) : 0;
      if (b === 0) { if (sayiMi(oturum.soru_sayisi)) turBilgi = tt("Pratik turu · {n} yeni soru", { n: oturum.soru_sayisi }); }
      else if (h > 0) turBilgi = tt("{b} bankadan · {h} yeni", { b, h });
      else turBilgi = tt("{b} soru bankadan", { b });
    }

    // Cevap sonrası kısa geri bildirim
    let geriBildirim = null;
    // Süre dolunca sunucu yanıtı gelse de "Süre doldu" kalır (bant metni değişip yeniden canlanmaz)
    if (secim === -1) {
      geriBildirim = { ton: "yanlis", metin: tt("Süre doldu") };
    } else if (sonucSoru) {
      if (sonucSoru.ogrenildi) {
        geriBildirim = { ton: "dogru", metin: tt("Öğrenildi! Bankadan çıktı") };
      } else if (sonucSoru.dogru && sonucSoru.bankadan) {
        geriBildirim = { ton: "dogru", metin: tt("Doğru! {n}/2", { n: sonucSoru.yeni_seri ?? 1 }) };
      } else if (sonucSoru.dogru) {
        geriBildirim = { ton: "dogru", metin: tt("Doğru") };
      } else if (sonucSoru.bankadan) {
        // onceki_yanlis bu cevapla birlikte sayılmış hâlidir
        geriBildirim = { ton: "yanlis", metin: tt("Yanlış · {n}. kez", { n: Math.max(1, Number(sonucSoru.onceki_yanlis) || 1) }) };
      } else {
        geriBildirim = { ton: "yanlis", metin: tt("Yanlış — Hatalarım'a eklendi") };
      }
    }

    const sikDurumu = (i) => {
      if (sonucSoru) {
        if (i === sonucSoru.dogru_cevap) return secim === i ? "dogru" : "dogrusu";
        if (i === secim) return "yanlis";
        return "solgun";
      }
      if (i === secim) return "secili";
      if (secim !== null) return "kilitli";
      return "normal";
    };

    return (
      <div className={`qt-sahne-mac qt-sahne-gok m1-mac m1-mac--calisma${kalan > 0 && kalan <= 5 && secim === null ? " qt-h-gerilim" : ""}`}>
        {/* Paket 41 B/E: öteki modlarla aynı üst şerit; X turu bitirip sonucu gösterir. */}
        <MacUstSerit
          onCik={oturum?.oturum_id ? () => bitir(oturum.oturum_id) : undefined}
          cikisEtiketi={tt("Turu bitir")}
          rozet={tt("Çalışma · puan verilmez")}
        />

        {/* Paket 40 I: toplam bilinmiyorsa "1/0 · 0 soru kaldı" yazmasın */}
        {toplam > 0 && (
          <QtIlerleme deger={sirada} en={toplam} ton="coin" etiket={tt("{n}/{t} · {k} soru kaldı", { n: sirada, t: toplam, k: Math.max(0, toplam - sirada) })} />
        )}
        {/* Tur dağılımı: turun başından sonuna aynı tek satır (boşken de yer tutar — ekran zıplamaz) */}
        <p className="m1-cal-tur" role="status">{turBilgi}</p>

        {soru && (
          <div className={`m1-soru ${soruUzunlukSinifi(soru)}${sarsil ? " qt-h-salla" : ""}`}>
            <Konfeti aktif={kutlama} />
            {/* Çalışma modunda puan verilmez — uçan rozet yok, yalnız seri bandı */}
            <CevapEfekti dogru={Boolean(sonucSoru?.dogru)} puan={0} seri={seri} />
            <QtSoruKarti
              key={soru.soru_index}
              metin={soru.soru}
              kategori={
                <span className="m1-cal-cip">
                  <KategoriIkon anahtar={soru.kategori} boyut={16} />
                  {kategoriEtiket(soru.kategori)}
                </span>
              }
              sira={soru.bankadan
                ? (sayiMi(soru.onceki_yanlis) && Number(soru.onceki_yanlis) > 0 ? tt("{n}× yanlış", { n: soru.onceki_yanlis }) : tt("Bankadan"))
                : tt("Yeni")}
              sevinc={Boolean(sonucSoru?.dogru)}
              sayac={<QtSayac kalan={kalan} toplam={SORU_SN} durdu={secim !== null} esik={3} />}
            />

            {/* Basılı tut (3 sn) → doğru şık: yalnız sunucu dogru_cevap verdiyse; normal cevapla yolundan */}
            <BasiliTut dogruCevap={soru.dogru_cevap} etkin={secim === null && kalan > 0}
                       anahtar={`${soru.question_id}-${soru.soru_index}`} onTetik={cevapla}>
              {(bt) => (
                <QtSikler etiket={tt("Şıklar")}>
                  {secenekler.map((s, i) => (
                    <QtSik
                      key={`${soru.soru_index}-${i}`}
                      harf={HARFLER[i]}
                      metin={s}
                      durum={sikDurumu(i)}
                      onClick={() => cevapla(i)}
                      {...bt.sikProps(i)}
                    />
                  ))}
                </QtSikler>
              )}
            </BasiliTut>

            {/* Sabit yükseklikli tek satır sonuç yuvası (Klasik ile aynı): soru açıkken boş ama yer tutar — 0 px kayma */}
            <div className="m1-sonuc-yuva">
              <QtSonucBandi ton={geriBildirim?.ton} metin={geriBildirim?.metin} anahtar={`${soru.soru_index}-${geriBildirim?.ton ?? ""}`} />
            </div>
          </div>
        )}
        {hataBandi}
      </div>
    );
  }

  // ============ SONUÇ EKRANI ============
  // Tur sonu (11 Eki 2026): maç sonu sahnesiyle aynı dil — gök sahne, kitap ikonlu büyük "öğrenildi" sayısı,
  // üç renkli kutu, banka ilerlemesi (yanlis_bankam; bitir() tazeler), turuncu "Tekrar çalış", sorular listesi altta.
  const ogrenilen = Number(sonuc?.ogrenilen) || 0;
  const bankaToplam = Number(banka?.toplam) || 0;
  const bankaOgrenilen = Number(banka?.ogrenilen) || 0;
  return (
    <div className="m1-cal m1-cal-son">
      <div className="m1-cal-son-sahne qt-sahne-mac qt-sahne-gok">
        <section className={`m1-cal-son-ust${ogrenilen > 0 ? " m1-cal-son-ust--kutla" : ""}`} aria-live="polite">
          <Konfeti aktif={sonKutlama} adet={22} tur="patlama" />
          <QtRozet ton="bilgi" ikon="kitap" boyut="k">{tt("Çalışma · puan verilmez")}</QtRozet>
          {ogrenilen > 0 ? (
            <h1 className="m1-cal-son-baslik">
              <span className="m1-cal-son-skor">
                <span className="m1-cal-son-ikon" aria-hidden="true"><QtIkon ad="kitap" boyut={30} /></span>
                <b className="m1-cal-son-sayi qt-sayi">{ogrenilen}</b>
              </span>
              <span className="m1-cal-son-alt">{ogrenilen === 1 ? tt("soru öğrenildi!") : tt("soru öğrenildi")}</span>
            </h1>
          ) : (
            <h1 className="m1-cal-son-baslik m1-cal-son-baslik--bos">
              <span className="m1-cal-son-ikon" aria-hidden="true"><QtIkon ad="kitap" boyut={30} /></span>
              <span>{tt("Bu tur öğrenilen yok — bir dahakine!")}</span>
            </h1>
          )}
          {oturum?.bankadan === 0 && <p className="m1-cal-son-not">{tt("Pratik turu — bankan temizdi.")}</p>}
        </section>

        <div className="m1-cal-son-kutular">
          <div className="m1-cal-son-kutu m1-cal-son-kutu--dogru"><b className="qt-sayi">{sonuc?.dogru ?? 0}</b><span>{tt("doğru")}</span></div>
          <div className="m1-cal-son-kutu m1-cal-son-kutu--yanlis"><b className="qt-sayi">{sonuc?.yanlis ?? 0}</b><span>{tt("yanlış")}</span></div>
          <div className="m1-cal-son-kutu m1-cal-son-kutu--banka"><b className="qt-sayi">{sonuc?.bankada_kalan ?? 0}</b><span>{tt("bankada")}</span></div>
        </div>

        {bankaToplam > 0 && (
          <div className="m1-cal-son-banka">
            <QtIlerleme deger={bankaOgrenilen} en={bankaToplam} ton="dogru" etiket={tt("{o}/{t} öğrenildi", { o: bankaOgrenilen, t: bankaToplam })} />
            <span className="qt-sayi">{tt("{o}/{t} öğrenildi", { o: bankaOgrenilen, t: bankaToplam })}</span>
          </div>
        )}

        <div className="m1-cal-son-dugmeler">
          <QtDugme tamGenislik boyut="b" ikon="yenile" onClick={() => setAsama("secim")}>{tt("Tekrar çalış")}</QtDugme>
          <QtDugme tur="ikincil" tamGenislik onClick={() => navigate(y())}>{tt("Ana sayfa")}</QtDugme>
        </div>
      </div>
      {hataBandi}
      <MacSorulari sorular={cevaplananlar} baslik={tt("Turun soruları ({n})", { n: cevaplananlar.length })} />
    </div>
  );
}
