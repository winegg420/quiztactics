import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import KategoriIkon from "../components/KategoriIkon.jsx";
import Maskot from "../components/Maskot.jsx";
import MacUstSerit from "../components/MacUstSerit.jsx";
import Konfeti from "../components/Konfeti.jsx";
import { sesKilidiAc, sesTik, sesDogru, sesYanlis, sesKazandin, sesDokunus, sesOnYukle, sesSoruGeldi } from "../lib/ses.js";
import { QtBosDurum, QtCip, QtDugme, QtIkon, QtIlerleme, QtIskelet, QtKart, QtRozet, QtSayac, QtSik, QtSikler, QtSonucBandi, QtSoruKarti } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import "../tasarim/ekranlar/m1-calisma.css";
import CevapEfekti from "../components/CevapEfekti.jsx";
import { GB_MS, titret } from "../lib/geriBildirim.js";
import { hataMesaji } from "../lib/hata.js";
import { supabase } from "../../src/lib/supabase.js";
import { kategoriEtiket, kategorileriSirala } from "../lib/kategoriler.js";
import { y } from "../lib/yol.js";
import { useGorunurlukTazele } from "../lib/gorunurluk.js";
import { tt } from "../lib/dil.js";
import MacSorulari from "../components/MacSorulari.jsx";
import { useOyunModu } from "../lib/oyunModu.js";
import { rpcDene } from "../lib/rpcDene.js";
import { soruUzunlukSinifi } from "../lib/soruUzunluk.js";

const SORU_SN = 20;
const HARFLER = ["A", "B", "C", "D"];
const SORU_SECENEKLERI = [10, 20, 30];

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
  // Paket 37 G: kategori şeridi sağdan kesiliyordu — kaydırılacak içerik kaldıkça sağ kenar solar.
  const seritRef = useRef(null);
  const [seritDevam, setSeritDevam] = useState(false);
  const seritOlc = useCallback(() => {
    const e = seritRef.current;
    if (!e) return;
    setSeritDevam(e.scrollWidth - e.clientWidth - e.scrollLeft > 2);
  }, []);
  useEffect(() => {
    seritOlc();
    window.addEventListener("resize", seritOlc);
    return () => window.removeEventListener("resize", seritOlc);
  }, [seritOlc, kategoriler]);
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
    rpcDene("get_categories").then(({ data }) => setKategoriler(data ?? []));
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
    setSecim(i);
    if (i >= 0) { sesDokunus(); titret(10); }
    try {
      const { data, error } = await supabase.rpc("calisma_cevap", {
        p_oturum_id: oturum.oturum_id,
        p_soru_index: soru.soru_index,
        p_cevap: i,
      });
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
    return (
      <div className="m1-cal">
        <header className="m1-cal-baslik">
          <h1 className="qt-baslik-1">{tt("Hatalarım")}</h1>
          <p className="qt-soluk-zemin">{tt("Yanlış yaptığın soruları tekrar et, açığını kapat.")}</p>
        </header>

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
          <QtKart className="m1-cal-bos">
            <Maskot poz="dusunuyor" boyut={72} />
            <p>
              {tt("Henüz yanlışın yok — maç yaptıkça burada birikecek.")}
              <br />
              {tt("Yine de genel havuzdan çalışabilirsin.")}
            </p>
          </QtKart>
        ) : (
          <QtKart className="m1-cal-ozet">
            <div className="m1-cal-sayilar">
              <div><b className="qt-sayi">{banka.bekleyen}</b><span>{tt("soru bankanda")}</span></div>
              <div><b className="qt-sayi">{banka.ogrenilen}</b><span>{tt("öğrenildi")}</span></div>
            </div>
            {banka.kategoriler.length > 0 && (
              <div className="m1-cal-cubuklar">
                {banka.kategoriler.map((k) => {
                  const enCok = Math.max(...banka.kategoriler.map((x) => x.kategori_adet), 1);
                  return (
                    <div key={k.kategori} className="m1-cal-cubuk">
                      <span className="m1-cal-cubuk-ad">{kategoriEtiket(k.kategori)}</span>
                      <QtIlerleme deger={k.kategori_adet} en={enCok} ton="vurgu" etiket={kategoriEtiket(k.kategori)} />
                      <b className="qt-sayi">{k.kategori_adet}</b>
                    </div>
                  );
                })}
              </div>
            )}
          </QtKart>
        )}

        <section className="m1-cal-bolum" aria-labelledby="m1-cal-kat">
          <h2 id="m1-cal-kat" className="qt-baslik-3">{tt("Kategori")}</h2>
          <div className={`m1-cal-serit${seritDevam ? " m1-cal-serit--devam" : ""}`} ref={seritRef} onScroll={seritOlc}>
            <QtCip secili={kategori === null} onClick={() => setKategori(null)}>
              <span className="m1-cal-cip"><KategoriIkon anahtar="karisik" boyut={18} />{tt("Tümü")}</span>
            </QtCip>
            {kategorileriSirala(kategoriler).map((k) => (
              <QtCip key={k.kategori} secili={kategori === k.kategori} onClick={() => setKategori(k.kategori)}>
                <span className="m1-cal-cip"><KategoriIkon anahtar={k.kategori} boyut={18} />{kategoriEtiket(k.kategori)}</span>
              </QtCip>
            ))}
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
                {bankaKat < 5 ? tt("En kısa tur") : tt("Bankan kadar")} · {bankaKadar}
              </QtCip>
            )}
            {SORU_SECENEKLERI.map((n) => (
              <QtCip key={n} secili={soruSayisi === n} onClick={() => setSoruSayisi(n)}>{n}</QtCip>
            ))}
          </div>
          <p className="m1-cal-not">
            {bankaKat === 0
              ? tt("Bankan temiz — bu bir pratik turu: {n} yeni soru.", { n: soruSayisi })
              : tahminYeni > 0
                ? tt("Bu tur: {b} soru bankandan + {y} yeni soru.", { b: tahminBanka, y: tahminYeni })
                : tt("Bu tur: {b} sorunun hepsi bankandan.", { b: tahminBanka })}
          </p>
        </section>

        {hataBandi}
        <QtDugme tamGenislik boyut="b" ikon="kitap" yukleniyor={calisiyor} onClick={basla}>
          {calisiyor ? tt("Hazırlanıyor…") : bankaKat === 0 ? tt("Pratik turuna başla") : tt("Çalışmaya başla")}
        </QtDugme>
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

    // Cevap sonrası kısa geri bildirim
    let geriBildirim = null;
    if (secim === -1 && !sonucSoru) {
      geriBildirim = { ton: "yanlis", metin: tt("Süre doldu") };
    } else if (sonucSoru) {
      if (sonucSoru.ogrenildi) {
        geriBildirim = { ton: "dogru", metin: tt("Öğrenildi! Bankadan çıktı") };
      } else if (sonucSoru.dogru && sonucSoru.bankadan) {
        geriBildirim = {
          ton: "dogru",
          metin: tt("{n}/2 doğru — bir kez daha bilirsen öğrenilmiş sayılacak", { n: sonucSoru.yeni_seri }),
        };
      } else if (sonucSoru.dogru) {
        geriBildirim = { ton: "dogru", metin: tt("Doğru") };
      } else if (sonucSoru.bankadan) {
        geriBildirim = {
          ton: "yanlis",
          metin: tt("Bunu daha önce {0} kez yanlış bilmiştin", { 0: Math.max(1, (sonucSoru.onceki_yanlis ?? 1) - 1) }),
        };
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
      <div className={`qt-sahne-mac qt-sahne-gok m1-mac${kalan > 0 && kalan <= 5 && secim === null ? " qt-h-gerilim" : ""}`}>
        {/* Paket 41 B/E: öteki modlarla aynı üst şerit; X turu bitirip sonucu gösterir. */}
        <MacUstSerit
          onCik={oturum?.oturum_id ? () => bitir(oturum.oturum_id) : undefined}
          cikisEtiketi={tt("Turu bitir")}
          rozet={tt("Çalışma · puan verilmez")}
        />

        {/* Paket 20 V: dağılım sunucudan (calisma_baslat: bankadan / havuzdan) */}
        {/* Paket 40 I: alan eksikse cümle hiç çizilmez ("Bu turdaki undefined sorunun…" görünüyordu) */}
        {oturum && sayiMi(oturum.bankadan)
          && (oturum.bankadan !== 0 || sayiMi(oturum.soru_sayisi))
          && (oturum.bankadan === 0 || !(oturum.havuzdan > 0) || sayiMi(oturum.havuzdan)) && sirada === 1 && !sonucSoru && (
          <div className="m1-bant m1-bant--bilgi" role="status">
            <span>
              {oturum.bankadan === 0
                ? tt("Bankan temiz — pratik turu: {n} yeni soru.", { n: oturum.soru_sayisi })
                : oturum.havuzdan > 0
                  ? tt("Bankanda {b} soru var. Turu {h} yeni soruyla tamamladık.", { b: oturum.bankadan, h: oturum.havuzdan })
                  : tt("Bu turdaki {b} sorunun hepsi bankandan.", { b: oturum.bankadan })}
            </span>
          </div>
        )}

        {/* Paket 40 I: toplam bilinmiyorsa "1/0 · 0 soru kaldı" yazmasın */}
        {toplam > 0 && (
          <QtIlerleme deger={sirada} en={toplam} ton="coin" etiket={tt("{n}/{t} · {k} soru kaldı", { n: sirada, t: toplam, k: Math.max(0, toplam - sirada) })} />
        )}

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
                ? tt("bankandan · {n} kez yanlış", { n: soru.onceki_yanlis })
                : tt("yeni soru")}
              sevinc={Boolean(sonucSoru?.dogru)}
              sayac={<QtSayac kalan={kalan} toplam={SORU_SN} durdu={secim !== null} esik={3} />}
            />

            <QtSikler etiket={tt("Şıklar")}>
              {secenekler.map((s, i) => (
                <QtSik
                  key={`${soru.soru_index}-${i}`}
                  harf={HARFLER[i]}
                  metin={s}
                  durum={sikDurumu(i)}
                  onClick={() => cevapla(i)}
                />
              ))}
            </QtSikler>

            <QtSonucBandi ton={geriBildirim?.ton} metin={geriBildirim?.metin} anahtar={`${soru.soru_index}-${geriBildirim?.ton ?? ""}`} />
          </div>
        )}
        {hataBandi}
      </div>
    );
  }

  // ============ SONUÇ EKRANI ============
  const ogrenilen = sonuc?.ogrenilen ?? 0;
  return (
    <div className="m1-cal">
      <QtKart className="m1-cal-sonuc">
        <QtRozet ton="mor" ikon="kitap">{tt("Çalışma · puan verilmez")}</QtRozet>
        {oturum?.bankadan === 0 && <p className="m1-cal-not">{tt("Pratik turu — bankan temizdi.")}</p>}
        <div className="m1-cal-buyuk qt-sayi">{ogrenilen}</div>
        <p className="m1-cal-not">{tt("soru öğrenildi")}</p>

        <div className="m1-cal-sayilar m1-cal-sayilar--uc">
          <div><b className="qt-sayi">{sonuc?.dogru ?? 0}</b><span>{tt("doğru")}</span></div>
          <div><b className="qt-sayi">{sonuc?.yanlis ?? 0}</b><span>{tt("yanlış")}</span></div>
          <div><b className="qt-sayi">{sonuc?.bankada_kalan ?? 0}</b><span>{tt("bankada")}</span></div>
        </div>

        <p className="m1-cal-not">
          {tt("Bugüne kadar toplam {n} soru öğrendin. Doğru cevapların kategori ustalığına işlendi.", { n: sonuc?.toplam_ogrenilen ?? 0 })}
        </p>

        <div className="m1-dugmeler">
          <QtDugme tamGenislik ikon="yenile" onClick={() => setAsama("secim")}>{tt("Tekrar çalış")}</QtDugme>
          <QtDugme tur="ikincil" tamGenislik onClick={() => navigate(y())}>{tt("Ana sayfa")}</QtDugme>
        </div>
      </QtKart>
      <MacSorulari sorular={cevaplananlar} baslik={tt("Turun soruları ({n})", { n: cevaplananlar.length })} />
      {hataBandi}
    </div>
  );
}
