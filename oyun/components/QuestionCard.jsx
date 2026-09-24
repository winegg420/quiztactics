import { useEffect, useRef, useState } from "react";
import { QtSoruKarti, QtSayac, QtSik, QtSikler, QtSonucBandi, QtSkill, QtSkillCubugu, QtIkonDugme, QT_KIRILMA_MS, QT_KART_CIKIS_MS } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import { supabase } from "../../src/lib/supabase.js";
import { kalanSure, sunucuOffsetMs, gosterimTavani } from "../lib/zaman.js";
import JokerCubugu from "./JokerCubugu.jsx";
import { SisPerdesi, SisKenar } from "./Sis.jsx";
import Konfeti from "./Konfeti.jsx";
import CevapEfekti from "./CevapEfekti.jsx";
import { sesTik, sesSureDoldu, sesDogru, sesYanlis, sesDokunus, sesKilidiAc, sesOnYukle, sesSoruGeldi, sesSonSaniyeler } from "../lib/ses.js";
import { titret, macPuani } from "../lib/geriBildirim.js";
import { kategoriAdi } from "../lib/kategoriler.js";
import { useGorunurlukTazele } from "../lib/gorunurluk.js";
import { tt } from "../lib/dil.js";

const HARFLER = ["A", "B", "C", "D"];
const SURE = 15;
// Atlama basarisiz olursa bu kadar bekleyip yeniden denenir (ag istek yagmuru olmasin).
const YENIDEN_DENE_MS = 1500;
// Süre dolunca sunucuya gitmeden önce beklenen saat/ağ farkı payı (bkz. tik).
const SAAT_PAYI_SN = 0.6;

/**
 * Ortak soru ekranı (turnuva + 1v1).
 * soru: { question_id, soru, secenekler, soru_index, baslangic, sunucu_zamani, dogru_cevap? }
 * dogru_cevap yalnızca yetkili hesaplarda dolu gelir; herhangi bir şık 3 sn basılı
 * tutulursa doğru cevap otomatik seçilir.
 * onCevapla(cevapIndex) -> { dogru, dogru_cevap } döndüren async fonksiyon
 * onSureDoldu() -> süre bitince çağrılır (advance tetikler)
 */
/**
 * Paket 41 M.7: uzun soru/şıkta yazı kademeli küçülür ki şıklar ve joker çubuğu
 * telefonda ekrana sığsın (390×844'te ölçüldü). Eşikler karakter sayısı.
 */
function uzunlukSinifi(soru) {
  const s = String(soru?.soru ?? "").length;
  const enUzunSik = Math.max(0, ...(soru?.secenekler ?? []).map((x) => String(x ?? "").length));
  if (s > 170 || enUzunSik > 48) return "m1-soru--cok-uzun";
  if (s > 100 || enUzunSik > 30) return "m1-soru--uzun";
  return "";
}

// Soru kimliği → kategori (maç boyunca aynı soru tekrar sorulmasın).
const KAT_ONBELLEK = new Map();

export default function QuestionCard({
  soru: soruProp,
  onCevapla,
  onSureDoldu,
  jokerler,
  // Yeni joker ekonomisi: macTur + macId verilirse sunucu tabanlı çubuk çizilir.
  macTur,
  // Paket 31 A: rakibin jokeri benim soruma dokunduğunda artar → joker çubuğu yeniden okur
  jokerSurum = 0,
  // Paket 31 B: Saf Bilgi — joker alanı hiç çizilmez (kapalı/soluk değil, YOK)
  jokerYok = false,
  // Paket 32 A: rakibin Sisi — sisin kalkacağı an (istemci ms). O ana kadar şık kilitli.
  sisBitis = null,
  macId,
  onPas,
  // Kazanılan puanı uçan rozet olarak göstermek için. null verilirse rozet
  // çizilmez (hızlı maçta soru başına puan yok — sahte sayı gösterilmez).
  puanHesapla = macPuani,
  // Soru üstündeki kategori etiketi. Maç ekranındaki TEK renk dokunuşu;
  // verilmezse etiket hiç çizilmez (kategorisi olmayan modlar).
  kategori = null,
  // Ek sınıf (ör. turnuvada altın soru çerçevesi).
  className = "",
  // Toplam soru sayısı (verilirse kartta "Soru n / t" yazar).
  toplamSoru = null,
}) {
  const [kalan, setKalan] = useState(SURE);
  const [secim, setSecim] = useState(null);
  const [sonuc, setSonuc] = useState(null); // { dogru, dogru_cevap }
  const [oy, setOy] = useState(null);
  const [kapali, setKapali] = useState([]); // 50:50 ile elenen şıklar
  const [ikinciSansElendi, setIkinciSansElendi] = useState([]);
  // Geri bildirim penceresi: kazanılan puan + üst üste doğru serisi
  const [puan, setPuan] = useState(0);
  const [seri, setSeri] = useState(0);
  const [sarsil, setSarsil] = useState(false);
  // Zaman aşımı: "Süre doldu" bilgisi geri bildirim penceresi boyunca durur
  const [zamanAsimi, setZamanAsimi] = useState(false);
  const kalanRef = useRef(SURE);
  const sureDolduMu = useRef(false);
  const basiliTutTimer = useRef(null);
  // Ses: son 5 saniyede saniyede bir tik. Efekt içinden okunabilmesi için ref.
  const cevapVerildiRef = useRef(false);
  const ilkBaslangicRef = useRef({ anahtar: null, bas: null });
  const sonTikRef = useRef(null);
  // Sayaç tiki: sekmeden dönüldüğünde dışarıdan elle tetiklenebilsin.
  const tikRef = useRef(null);
  // Atlama başarısız olduysa en erken bu ana kadar yeniden denenmez.
  const yenidenDeneRef = useRef(0);
  // Cevap sunucuya gitmedi: kısa uyarı (seçim geri alınır, tekrar dokunulabilir)
  const [cevapHatasi, setCevapHatasi] = useState(false);
  const cevapHataTimer = useRef(null);
  const [skillEfekt, setSkillEfekt] = useState(null); // { tur, deger?, asama? }
  const skillTimer = useRef(null);
  // Tasarım A: 50:50 anı — kırılan şıklar QT_KIRILMA_MS boyunca iki parçaya ayrılıp düşer,
  // sonra "elendi" yuvasına döner. (Kapatma kararı `kapali`da, anında; bu yalnız görüntü.)
  const [kirilan, setKirilan] = useState([]);
  const kirilmaTimer = useRef(null);
  // Skill kullanım bilgisi (JokerCubugu → sonuç bandı)
  const [bilgi, setBilgi] = useState(null);
  const soruSesiRef = useRef(null);

  // SORU DEĞİŞTİR jokeri: soru YERİNDE değişir, indeks aynı kalır. Kart
  // sökülmediği için (key indekse bağlı) yeni soruyu burada tutuyoruz;
  // aşağıdaki sıfırlama effect'i question_id değiştiği an sayacı, seçimi ve
  // 50:50 kapatmalarını temizliyor.
  const [degisenSoru, setDegisenSoru] = useState(null);
  // Paket 32 A.3: gönderenin ekranında kenar sisi (oynamayı engellemez)
  const [sisGonderdimBitis, setSisGonderdimBitis] = useState(null);
  const soru = degisenSoru ?? soruProp;
  // Kategoriye göre pastel maç zemini: kart, içinde durduğu .qt-sahne-mac'e sorunun kategorisini
  // yazar (renkler kategori-zemin.css token'larında; soru değişince zemin yumuşak geçer).
  const kokRef = useRef(null);
  // Soru RPC'leri kategoriyi döndürmüyor: soru_kategorisi (322) ile bir kez okunur, bellekte tutulur.
  const [okunanKat, setOkunanKat] = useState(() => KAT_ONBELLEK.get(soru?.question_id) ?? null);
  useEffect(() => {
    const qid = soru?.question_id;
    if (!qid || soru?.kategori) return undefined;
    if (KAT_ONBELLEK.has(qid)) { setOkunanKat(KAT_ONBELLEK.get(qid)); return undefined; }
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("soru_kategorisi", { p_soru: qid });
        if (error) throw error;
        KAT_ONBELLEK.set(qid, data ?? null);
        if (aktif) setOkunanKat(data ?? null);
      } catch (e) {
        console.warn("[Soru kartı] kategori okunamadı:", e?.message ?? e);
      }
    })();
    return () => { aktif = false; };
  }, [soru?.question_id, soru?.kategori]);
  const zeminKat = soru?.kategori || okunanKat || kategori || null;
  useEffect(() => {
    const sahne = kokRef.current?.closest(".qt-sahne-mac");
    if (!sahne) return undefined;
    if (zeminKat) sahne.setAttribute("data-kat", zeminKat); else sahne.removeAttribute("data-kat");
    return undefined;
  }, [zeminKat]);
  useEffect(() => { setDegisenSoru(null); }, [soruProp]);

  // Yeni soru geldiğinde durumu sıfırla
  useEffect(() => {
    setSecim(null);
    setSonuc(null);
    setOy(null);
    setKapali([]);
    setIkinciSansElendi([]);
    setPuan(0);
    setSarsil(false);
    setZamanAsimi(false);
    setKirilan([]);
    setBilgi(null);
    clearTimeout(kirilmaTimer.current);
    sureDolduMu.current = false;
    cevapVerildiRef.current = false;
    sonTikRef.current = null;
    yenidenDeneRef.current = 0;
    clearTimeout(basiliTutTimer.current);
    // Yeni soru ekrana geldi — soru başına bir kez (StrictMode çift efektine karşı ref).
    const anahtar = soru ? `${soru.question_id}-${soru.soru_index}` : null;
    if (anahtar && soruSesiRef.current !== anahtar) {
      soruSesiRef.current = anahtar;
      sesSoruGeldi();
    }
  }, [soru?.question_id, soru?.soru_index]);

  // İlk kullanıcı hareketinde ses motoru açılsın (mobil tarayıcı kuralı); maç sesleri önceden insin.
  useEffect(() => {
    sesKilidiAc();
    sesOnYukle("mac");
    sesOnYukle("skill");
  }, []);

  useEffect(() => () => {
    clearTimeout(basiliTutTimer.current);
    clearTimeout(cevapHataTimer.current);
    clearTimeout(skillTimer.current);
    clearTimeout(kirilmaTimer.current);
  }, []);

  useEffect(() => {
    if (!soru) return;
    // Saat farkını soru geldiği anda bir kez sabitle; tik başına yeniden
    // hesaplanırsa sayaç donar.
    const offset = sunucuOffsetMs(soru.sunucu_zamani, soru._saat_ornek_ms ?? Date.now());
    // 326: aynı sorunun ilk görülen başlangıcı (Ek Süre sonrası tazelenen soru yeni başlangıçla gelir).
    const soruAnahtar = `${soru.question_id}-${soru.soru_index}`;
    if (ilkBaslangicRef.current.anahtar !== soruAnahtar) ilkBaslangicRef.current = { anahtar: soruAnahtar, bas: soru.baslangic };
    const tavan = gosterimTavani(soru.baslangic, ilkBaslangicRef.current.bas, SURE);
    let id;
    const tik = () => {
      const k = kalanSure(soru.baslangic, offset, SURE, tavan);
      setKalan(k);
      if (!cevapVerildiRef.current) kalanRef.current = k;
      // Son 5 saniye: her tam saniyede bir tik sesi (cevap verildiyse susar)
      if (k > 0 && k <= 5 && !cevapVerildiRef.current) {
        const sn = Math.ceil(k);
        if (sonTikRef.current !== sn) {
          // Son saniyelere girildi: tek seferlik uyarı, tik'ler sesTik ile sürer.
          if (sonTikRef.current === null) sesSonSaniyeler();
          sonTikRef.current = sn;
          sesTik(sn);
        }
      }
      // Saat farkı payı: sunucu soruyu ancak başlangıç + 15 sn GEÇİNCE kapatır. Saat
      // tahmini (istek/yanıt ortalaması) birkaç yüz ms önde olabildiği için sayaç 0'a
      // değer değmez istek gidince sunucu reddediyor, istemci saniyede bir yeniden
      // deniyordu ("soru atlama yeniden denenecek"). Sayaç yine 0'da görünür.
      const gecenSn = (Date.now() + offset - new Date(soru.baslangic).getTime()) / 1000;
      if (k <= 0 && gecenSn >= SURE + SAAT_PAYI_SN && !sureDolduMu.current && Date.now() >= yenidenDeneRef.current) {
        sureDolduMu.current = true;
        // Interval BİLEREK durdurulmuyor: atlama başarısız olursa kilit
        // yeniden açılıyor ve sonraki tik işi tekrar deniyor. Eskiden burada
        // clearInterval vardı; atlama sekme arka plandayken başarısız olunca
        // ekran "Süre doldu" görüntüsünde sonsuza kadar donuyordu.
        if (cevapVerildiRef.current) {
          // Cevap verilmişti; ilerletme sayfada. Yine de başarısız olursa
          // kilidi açıyoruz ki dönüşte yeniden denenebilsin.
          Promise.resolve(onSureDoldu?.()).catch(() => {
            sureDolduMu.current = false;
            yenidenDeneRef.current = Date.now() + YENIDEN_DENE_MS;
          });
          return;
        }
        // ZAMAN AŞIMI DA GERİ BİLDİRİM PENCERESİNDEN GEÇER.
        // Eskiden ekran doğrudan sonraki soruya atlıyordu: doğru cevap
        // gösterilmiyor, "süre doldu" bile denmiyordu.
        sesSureDoldu();
        titret(30);
        setZamanAsimi(true);
        setSeri(0);
        setSecim(-1); // seçili şık yok; yalnız doğru olan işaretlenecek
        Promise.resolve(onSureDoldu?.())
          .then((dc) => {
            // 1v1'de mac_soruyu_atla doğru cevabı döndürür; grup/hızlı/turnuva
            // ortak ilerletme kullandığı için değer gelmez, o zaman yalnız
            // "Süre doldu" bilgisi gösterilir.
            if (typeof dc === "number" && dc >= 0) {
              setSonuc({ dogru: false, dogru_cevap: dc });
            }
          })
          .catch((e) => {
            // ATLAMA BAŞARISIZ — ekranı donuk bırakma, yeniden denenebilir yap.
            // Telefonda arka plana alınınca istek askıda kalıp reddediliyor;
            // kilit kapalı kalsaydı oyuncu döndüğünde soru ne ilerler ne de
            // yeniden denenirdi. Kilidi açıp kısa bir bekleme koyuyoruz ki
            // 100 ms'lik tik ağı istek yağmuruna tutmasın.
            console.error("[Bildim] soru atlanamadi, yeniden denenecek:", e);
            sureDolduMu.current = false;
            yenidenDeneRef.current = Date.now() + YENIDEN_DENE_MS;
            setZamanAsimi(false);
            setSecim(null);
          });
      }
    };
    tikRef.current = tik;
    tik();
    // Interval KOŞULSUZ kurulur. Eskiden "süre dolmadıysa" koşuluna bağlıydı:
    // soru zaten süresi geçmiş gelirse (sekmeden dönüş) interval hiç kurulmuyor,
    // atlama bir kez denenip başarısız olursa yeniden deneyecek tik kalmıyordu.
    id = setInterval(tik, 100);
    // Tanı (?tani=1 ve oyuncu testi sayaç ölçümü): sunucu bitişi ve saat farkı.
    if (!window.__bdTani || window.__bdTani.mod === "soru") {
      window.__bdTani = { mod: "soru", faz: "cevap", hedefBitis: new Date(new Date(soru.baslangic).getTime() + SURE * 1000).toISOString(),
        farkMs: Math.round(offset), sureler: { cevap: SURE } };
    }
    return () => {
      clearInterval(id);
      if (window.__bdTani?.mod === "soru") delete window.__bdTani;
    };
  }, [soru, onSureDoldu]);

  // Sekmeden dönünce sayacı hemen senkronla. Süre yokken dolduysa tik()
  // zaman aşımı akışını (doğru cevabı göster + soruyu atla) bir kez tetikler;
  // sureDolduMu kilidi mükerrer tetiklemeyi zaten engelliyor.
  useGorunurlukTazele(() => { tikRef.current?.(); }, Boolean(soru));

  if (!soru) return null;

  // Paket 32 A.2: sis sürerken şıkka basılamaz (perde olayları yutar; bu ikinci güvence,
  // sunucu da reddeder). Sis kalkınca kilit kendiliğinden açılır (kalan her tikte yenilenir).
  const sisKilit = Boolean(sisBitis) && Date.now() < sisBitis;

  const cevapla = async (i) => {
    if (secim !== null || kalan <= 0) return;
    if (sisKilit) return;
    const kalanAn = kalanRef.current;
    setSecim(i);
    cevapVerildiRef.current = true;
    // 0 ms: dokunma anı — kısa klik + 10 ms titreşim (şık CSS ile küçülür)
    sesDokunus();
    titret(10);
    try {
      const r = await onCevapla(i);
      if (r) {
        if (r.tekrar_hakki) {
          sesYanlis();
          titret(18);
          setIkinciSansElendi((onceki) => [...new Set([...onceki, i])]);
          setSkillEfekt({ tur: "ikinci_sans" });
          clearTimeout(skillTimer.current);
          skillTimer.current = setTimeout(() => setSkillEfekt(null), 680);
          setTimeout(() => {
            setSecim(null);
            cevapVerildiRef.current = false;
          }, 260);
          return;
        }
        setSonuc(r);
        const dogruMu = r.dogru_cevap === i;
        // 120 ms: renk geri bildirimi CSS'te; ses ve seri burada
        if (dogruMu) {
          sesDogru();
          titret(10);
          setSeri((s) => s + 1);
          if (puanHesapla) setPuan(puanHesapla(kalanAn, true));
        } else {
          sesYanlis();
          titret(30);
          setSeri(0);
          setPuan(0);
          // Yanlışta kart iki kez hafifçe sarsılır (±4px, 180 ms)
          setSarsil(true);
          setTimeout(() => setSarsil(false), 380);
        }
      }
    } catch (e) {
      // CEVAP SUNUCUYA GİTMEDİ (ağ dalgalanması, "Maç başlamak üzere",
      // süre dolmuş…). Eskiden hata TAMAMEN yutuluyordu; oysa yukarıda
      // `setSecim(i)` çoktan çalışmıştı: şık seçili kalıyor, `secim !== null`
      // yüzünden başka şıkka da dokunulamıyor ve soru süre bitene kadar
      // öylece duruyordu. Oyuncunun gördüğü "soru takıldı" buydu (20 Eyl 2026).
      //
      // Süre zaten bittiyse sonuç advance ile gelir, dokunma: seçimi geri
      // almak doğru cevabın işaretlenmesini bozar. Süre varsa seçim geri
      // alınır, kısa bir not çıkar ve oyuncu yeniden dokunabilir.
      console.warn("[Bildim] cevap gönderilemedi:", e?.message ?? e);
      if (kalanRef.current > 0 && !sureDolduMu.current) {
        setSecim(null);
        cevapVerildiRef.current = false;
        setCevapHatasi(true);
        clearTimeout(cevapHataTimer.current);
        cevapHataTimer.current = setTimeout(() => setCevapHatasi(false), 2600);
      }
    }
  };

  const basiliTutmayaBasla = () => {
    if (soru.dogru_cevap == null || secim !== null || kalan <= 0) return;
    clearTimeout(basiliTutTimer.current);
    basiliTutTimer.current = setTimeout(() => cevapla(soru.dogru_cevap), 3000);
  };
  const basiliTutmayiBirak = () => clearTimeout(basiliTutTimer.current);

  // Ek Süre sunucuda oyuncuya özel soru başlangıcını değiştirir. Yerel sayacı
  // tahminen artırmak yerine aynı soru RPC'sinden yetkili başlangıcı yeniden
  // okuyup kartı o veriyle besleriz. Böylece yenileme/yeniden bağlanma da aynı
  // değeri gösterir; rakibin başlangıcına istemeden dokunulmaz.
  const yetkiliSoruyuTazele = async () => {
    const istek = {
      "1v1": ["get_match_question", { p_match_id: macId }],
      grup: ["get_group_match_question", { p_group_match_id: macId }],
      turnuva: ["get_tournament_question", { p_tournament_id: macId }],
    }[macTur];
    if (!istek || !macId) return null;
    const gonderildiMs = Date.now();
    const { data, error } = await supabase.rpc(istek[0], istek[1]);
    const alindiMs = Date.now();
    if (error) throw error;
    const s = Array.isArray(data) ? data[0] : data;
    return s ? { ...s, _saat_ornek_ms: (gonderildiMs + alindiMs) / 2,
      _ag_gecikmesi_ms: alindiMs - gonderildiMs } : null;
  };

  // Sunucudan gelen skill etkisini uygula
  const jokerEtkisi = async (sonuc) => {
    if (!sonuc) return;
    if (sonuc.tur === "elli" && Array.isArray(sonuc.kapali)) {
      setKapali(sonuc.kapali);
      setKirilan(sonuc.kapali);
      clearTimeout(kirilmaTimer.current);
      kirilmaTimer.current = setTimeout(() => setKirilan([]), QT_KIRILMA_MS);
      setSkillEfekt({ tur: "elli" });
      clearTimeout(skillTimer.current);
      skillTimer.current = setTimeout(() => setSkillEfekt(null), 650);
    } else if (sonuc.tur === "sure") {
      setSkillEfekt({ tur: "sure", deger: Number(sonuc.eklenen_sn ?? 10) });
      clearTimeout(skillTimer.current);
      skillTimer.current = setTimeout(() => setSkillEfekt(null), 800);
      try {
        const yetkiliSoru = await yetkiliSoruyuTazele();
        if (yetkiliSoru?.question_id) setDegisenSoru(yetkiliSoru);
      } catch (e) {
        // Skill sunucuda başarıyla işlendi; geçici ağ hatasında bir sonraki
        // sayfa/Realtime yenilemesi yetkili başlangıcı zaten getirecek.
        console.warn("[Bildim] Ek Süre sonrası soru tazelenemedi:", e?.message ?? e);
      }
    } else if (sonuc.tur === "soru_degistir" && sonuc.soru) {
      // Sunucu kabulünden sonra kısa çıkış/giriş; rakibin kartına dokunulmaz.
      setSkillEfekt({ tur: "soru_degistir", asama: "cikiyor" });
      clearTimeout(skillTimer.current);
      skillTimer.current = setTimeout(() => {
        setDegisenSoru({ ...sonuc.soru, _saat_ornek_ms: Date.now() });
        onPas?.(sonuc);
        setSkillEfekt({ tur: "soru_degistir", asama: "giriyor" });
        skillTimer.current = setTimeout(() => setSkillEfekt(null), 390);
      }, QT_KART_CIKIS_MS);
    } else if (sonuc.tur === "zaman_baskisi" && sonuc.rakip) {
      setSkillEfekt({ tur: "zaman_baskisi", deger: Number(sonuc.azaltildi ?? 5) });
      clearTimeout(skillTimer.current);
      skillTimer.current = setTimeout(() => setSkillEfekt(null), 750);
    }
    if (sonuc.tur === "sis") {
      setSisGonderdimBitis(Date.now() + 1000 * (Number(sonuc.sis_sn) > 0 ? Number(sonuc.sis_sn) : 3));
    }
  };

  const oyVer = async (adil) => {
    const onceki = oy;
    setOy(adil);
    try {
      const { error } = await supabase.rpc("vote_question", {
        p_question_id: soru.question_id,
        p_adil: adil,
      });
      if (error) throw error;
    } catch (e) {
      // Oy gitmediyse seçim geri alınır; oyun akışı etkilenmez.
      console.warn("[Bildim] soru oyu gönderilemedi:", e?.message ?? e);
      setOy(onceki);
    }
  };

  const secenekler = Array.isArray(soru.secenekler)
    ? soru.secenekler
    : JSON.parse(soru.secenekler);

  const dogruCevapVerdim = Boolean(sonuc) && secim === sonuc.dogru_cevap;

  // Son 5 saniye: kenarlar kızarır (qt-h-gerilim), sayaç kırmızı + nabız.
  // Cevap verildikten sonra tetiklenmez (heyecan değil, rahatsızlık olurdu).
  const sonDuzluk = kalan > 0 && kalan <= 5 && secim === null && !sonuc;

  // Şık durumu → QtSik durum. Kırılan (50:50) şık, animasyon bitene kadar "normal" + kiriliyor.
  const sikDurumu = (i) => {
    if (kirilan.includes(i)) return "normal";
    if (kapali.includes(i) || ikinciSansElendi.includes(i)) return "elendi";
    if (sonuc) {
      if (i === sonuc.dogru_cevap) return secim === i ? "dogru" : "dogrusu";
      if (i === secim) return "yanlis";
      return "solgun";
    }
    if (i === secim) return "secili";
    if (secim !== null || kalan <= 0 || sisKilit) return "kilitli";
    return "normal";
  };

  // Sonuç bandı: tek yerde, yer ayırır (ekran zıplamaz).
  let bant = null;
  if (cevapHatasi) bant = { ton: "yanlis", metin: tt("Cevabın gitmedi — tekrar dokun"), anahtar: "hata" };
  else if (zamanAsimi) bant = { ton: "yanlis", metin: tt("Süre doldu"), anahtar: "sure" };
  else if (sonuc && dogruCevapVerdim) bant = { ton: "dogru", metin: tt("Doğru!"), anahtar: "dogru" };
  else if (sonuc && secim !== null && secim >= 0)
    bant = { ton: "yanlis", metin: tt("Yanlış — doğrusu {c}", { c: secenekler[sonuc.dogru_cevap] ?? "" }), anahtar: "yanlis" };
  else if (bilgi) bant = { ton: "notr", metin: bilgi.metin, anahtar: bilgi.anahtar };

  const siraMetni = toplamSoru
    ? tt("Soru {n} / {t}", { n: soru.soru_index + 1, t: toplamSoru })
    : tt("Soru {n}", { n: soru.soru_index + 1 });

  return (
    <div
      ref={kokRef}
      className={`m1-soru ${uzunlukSinifi(soru)} ${sonDuzluk ? "qt-h-gerilim" : ""} ${className}`}
    >
      <Konfeti aktif={dogruCevapVerdim} />
      {/* Paket 32 A: sis YİYEN — tam ekran perde (sayaç sisin üstünde) */}
      {sisBitis && Date.now() < sisBitis + 600 && <SisPerdesi key={sisBitis} bitis={sisBitis} kalan={kalan} />}
      {/* Paket 32 A.3: sis GÖNDEREN — yalnız kenarlardan hafif efekt */}
      {sisGonderdimBitis && <SisKenar key={sisGonderdimBitis} bitis={sisGonderdimBitis} />}
      <CevapEfekti dogru={dogruCevapVerdim} puan={puan} seri={seri} />

      <QtSoruKarti
        key={`${soru.question_id}-${soru.soru_index}`}
        metin={soru.soru}
        kategori={kategori && kategori !== "karisik" ? kategoriAdi(kategori) : null}
        sira={siraMetni}
        cikiyor={skillEfekt?.tur === "soru_degistir" && skillEfekt.asama === "cikiyor"}
        sevinc={dogruCevapVerdim}
        sayac={
          <QtSayac
            kalan={kalan}
            toplam={SURE}
            durdu={secim !== null || Boolean(sonuc)}
            ekBalon={skillEfekt?.tur === "sure" ? { anahtar: `sure-${soru.soru_index}`, metin: `+${skillEfekt.deger}` } : null}
          />
        }
      />

      <QtSikler etiket={tt("Şıklar")}>
        {secenekler.map((s, i) => (
          <QtSik
            key={`${soru.question_id}-${i}`}
            harf={HARFLER[i]}
            metin={s}
            durum={sikDurumu(i)}
            kiriliyor={kirilan.includes(i)}
            onClick={() => cevapla(i)}
            onPointerDown={basiliTutmayaBasla}
            onPointerUp={basiliTutmayiBirak}
            onPointerLeave={basiliTutmayiBirak}
            onPointerCancel={basiliTutmayiBirak}
          />
        ))}
      </QtSikler>

      <QtSonucBandi ton={bant?.ton} metin={bant?.metin} anahtar={bant?.anahtar} />

      {/* Yeni joker ekonomisi (sunucu tabanlı).
          "Hızlı Olan Kazanır" modunda joker YOK: mod "ilk doğru cevap kazanır"
          üzerine kurulu; 50:50 ya da +10 sn adaleti doğrudan bozar. */}
      {macTur && macTur !== "hizli" && !jokerYok && macId && !sonuc && secim === null && kalan > 0 && (
        <JokerCubugu
          macTur={macTur}
          macId={macId}
          soruIndex={soru.soru_index}
          surum={jokerSurum}
          kalanSn={kalan}
          onEtki={jokerEtkisi}
          onBilgi={setBilgi}
        />
      )}

      {/* Eski joker çubuğu — yalnız macTur verilmeyen ekranlarda (geriye uyum) */}
      {!macTur && jokerler && !sonuc && secim === null && kalan > 0 && (
        <QtSkillCubugu etiket={tt("Jokerler")}>
          <QtSkill
            ikon="terazi"
            ad="50:50"
            durum={jokerler.kullanildi.elli || kapali.length > 0 ? "kullanildi" : "hazir"}
            aria-label={`50:50 — ${tt("Ücretsiz")}`}
            onClick={async () => {
              if (jokerler.kullanildi.elli || kapali.length > 0) return;
              const r = await jokerler.onKullan("elli");
              if (r?.kapali) setKapali(r.kapali);
            }}
          />
          <QtSkill
            ikon="saat"
            ad={tt("+10 sn")}
            durum={jokerler.kullanildi.sure ? "kullanildi" : "hazir"}
            aria-label={`${tt("+10 sn")} — ${tt("20 puan")}`}
            onClick={() => { if (!jokerler.kullanildi.sure) jokerler.onKullan("sure"); }}
          />
        </QtSkillCubugu>
      )}

      {sonuc && (
        <div className="m1-oylama" role="group" aria-label={tt("Bu soru adil miydi?")}>
          <span aria-hidden="true">{tt("Bu soru adil miydi?")}</span>
          <QtIkonDugme ikon="onay" etiket={tt("Adil")} aria-pressed={oy === true} onClick={() => oyVer(true)} />
          <QtIkonDugme ikon="carpi" etiket={tt("Adil değil")} aria-pressed={oy === false} onClick={() => oyVer(false)} />
        </div>
      )}
    </div>
  );
}
