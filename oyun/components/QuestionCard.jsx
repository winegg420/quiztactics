import { useEffect, useRef, useState } from "react";
import Ikon from "./Ikon.jsx";
import { supabase } from "../../src/lib/supabase.js";
import { kalanSure, sunucuOffsetMs } from "../lib/zaman.js";
import JokerCubugu from "./JokerCubugu.jsx";
import { SisPerdesi, SisKenar } from "./Sis.jsx";
import Konfeti from "./Konfeti.jsx";
import CevapEfekti from "./CevapEfekti.jsx";
import { sesTik, sesSureDoldu, sesDogru, sesYanlis, sesDokunus, sesKilidiAc } from "../lib/ses.js";
import { titret, macPuani } from "../lib/geriBildirim.js";
import { kategoriAdi } from "../lib/kategoriler.js";
import { useGorunurlukTazele } from "../lib/gorunurluk.js";
import { tt } from "../lib/dil.js";

const HARFLER = ["A", "B", "C", "D"];
const SURE = 15;
// Atlama basarisiz olursa bu kadar bekleyip yeniden denenir (ag istek yagmuru olmasin).
const YENIDEN_DENE_MS = 1500;

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
  if (s > 170 || enUzunSik > 48) return "bd-soru-cok-uzun";
  if (s > 100 || enUzunSik > 30) return "bd-soru-uzun";
  return "";
}

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
}) {
  const [kalan, setKalan] = useState(SURE);
  const [secim, setSecim] = useState(null);
  const [sonuc, setSonuc] = useState(null); // { dogru, dogru_cevap }
  const [oy, setOy] = useState(null);
  const [kapali, setKapali] = useState([]); // 50:50 ile elenen şıklar
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

  // SORU DEĞİŞTİR jokeri: soru YERİNDE değişir, indeks aynı kalır. Kart
  // sökülmediği için (key indekse bağlı) yeni soruyu burada tutuyoruz;
  // aşağıdaki sıfırlama effect'i question_id değiştiği an sayacı, seçimi ve
  // 50:50 kapatmalarını temizliyor.
  const [degisenSoru, setDegisenSoru] = useState(null);
  // Paket 32 A.3: gönderenin ekranında kenar sisi (oynamayı engellemez)
  const [sisGonderdimBitis, setSisGonderdimBitis] = useState(null);
  const soru = degisenSoru ?? soruProp;
  useEffect(() => { setDegisenSoru(null); }, [soruProp]);

  // Yeni soru geldiğinde durumu sıfırla
  useEffect(() => {
    setSecim(null);
    setSonuc(null);
    setOy(null);
    setKapali([]);
    setPuan(0);
    setSarsil(false);
    setZamanAsimi(false);
    sureDolduMu.current = false;
    cevapVerildiRef.current = false;
    sonTikRef.current = null;
    yenidenDeneRef.current = 0;
    clearTimeout(basiliTutTimer.current);
  }, [soru?.question_id, soru?.soru_index]);

  // İlk kullanıcı hareketinde ses motoru açılsın (mobil tarayıcı kuralı)
  useEffect(() => { sesKilidiAc(); }, []);

  useEffect(() => () => {
    clearTimeout(basiliTutTimer.current);
    clearTimeout(cevapHataTimer.current);
    clearTimeout(skillTimer.current);
  }, []);

  useEffect(() => {
    if (!soru) return;
    // Saat farkını soru geldiği anda bir kez sabitle; tik başına yeniden
    // hesaplanırsa sayaç donar.
    const offset = sunucuOffsetMs(soru.sunucu_zamani);
    let id;
    const tik = () => {
      const k = kalanSure(soru.baslangic, offset, SURE);
      setKalan(k);
      if (!cevapVerildiRef.current) kalanRef.current = k;
      // Son 5 saniye: her tam saniyede bir tik sesi (cevap verildiyse susar)
      if (k > 0 && k <= 5 && !cevapVerildiRef.current) {
        const sn = Math.ceil(k);
        if (sonTikRef.current !== sn) {
          sonTikRef.current = sn;
          sesTik(sn);
        }
      }
      if (k <= 0 && !sureDolduMu.current && Date.now() >= yenidenDeneRef.current) {
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
    return () => clearInterval(id);
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

  // Sunucudan gelen joker etkisini uygula
  const jokerEtkisi = (sonuc) => {
    if (!sonuc) return;
    if (sonuc.tur === "elli" && Array.isArray(sonuc.kapali)) {
      setKapali(sonuc.kapali);
      setSkillEfekt({ tur: "elli" });
      clearTimeout(skillTimer.current);
      skillTimer.current = setTimeout(() => setSkillEfekt(null), 650);
    } else if (sonuc.tur === "sure") {
      setSkillEfekt({ tur: "sure", deger: Number(sonuc.eklenen_sn ?? 10) });
      clearTimeout(skillTimer.current);
      skillTimer.current = setTimeout(() => setSkillEfekt(null), 800);
    } else if (sonuc.tur === "soru_degistir" && sonuc.soru) {
      // Sunucu kabulünden sonra kısa çıkış/giriş; rakibin kartına dokunulmaz.
      setSkillEfekt({ tur: "soru_degistir", asama: "cikiyor" });
      clearTimeout(skillTimer.current);
      skillTimer.current = setTimeout(() => {
        setDegisenSoru(sonuc.soru);
        onPas?.(sonuc);
        setSkillEfekt({ tur: "soru_degistir", asama: "giriyor" });
        skillTimer.current = setTimeout(() => setSkillEfekt(null), 390);
      }, 260);
    } else if (sonuc.tur === "zaman_baskisi" && sonuc.rakip) {
      setSkillEfekt({ tur: "zaman_baskisi", deger: Number(sonuc.azaltildi ?? 5) });
      clearTimeout(skillTimer.current);
      skillTimer.current = setTimeout(() => setSkillEfekt(null), 750);
    }
    if (sonuc.tur === "sis") {
      setSisGonderdimBitis(Date.now() + 1000 * (Number(sonuc.sis_sn) > 0 ? Number(sonuc.sis_sn) : 3));
    }
    // 'sure' etkisi sunucuda soru_baslangic'ı uzatır; sayaç bir sonraki
    // yoklamada kendiliğinden güncellenir.
  };

  const oyVer = async (adil) => {
    setOy(adil);
    await supabase.rpc("vote_question", {
      p_question_id: soru.question_id,
      p_adil: adil,
    });
  };

  const secenekler = Array.isArray(soru.secenekler)
    ? soru.secenekler
    : JSON.parse(soru.secenekler);

  const oran = Math.max(0, Math.min(1, kalan / SURE));
  const CEVRE = 2 * Math.PI * 20; // r=20 halka çevresi
  const halkaRenk =
    kalan <= 5 ? "var(--bd-hata)" : kalan <= 9 ? "var(--bd-odul)" : "var(--bd-basari)";

  const dogruCevapVerdim = Boolean(sonuc) && secim === sonuc.dogru_cevap;
  const yanlisCevapVerdim = Boolean(sonuc) && secim !== null && secim !== sonuc.dogru_cevap;

  // Son 5 saniye: ekran kenarları kızarır, sayaç kalp gibi atar, geri sayım büyür.
  // Cevap verildikten sonra tetiklenmez (heyecan değil, rahatsızlık olurdu).
  const sonDuzluk = kalan > 0 && kalan <= 5 && secim === null && !sonuc;
  const geriSayim = Math.ceil(kalan);

  return (
    <div
      key={`${soru.question_id}-${soru.soru_index}`}
      className={`bd-soru bd-soru-giris ${uzunlukSinifi(soru)} ${dogruCevapVerdim ? "bd-dogru-cevap" : ""} ${yanlisCevapVerdim ? "bd-yanlis-cevap" : ""} ${sonDuzluk ? "bd-son-saniyeler" : ""} ${sarsil ? "bd-sarsil" : ""} ${skillEfekt ? `bd-skill-${skillEfekt.tur} ${skillEfekt.asama ? `bd-skill-${skillEfekt.asama}` : ""}` : ""} ${className}`}
    >
      <Konfeti aktif={dogruCevapVerdim} />
      {/* Paket 32 A: sis YİYEN — tam ekran perde (sayaç sisin üstünde) */}
      {sisBitis && Date.now() < sisBitis + 600 && <SisPerdesi key={sisBitis} bitis={sisBitis} kalan={kalan} />}
      {/* Paket 32 A.3: sis GÖNDEREN — yalnız kenarlardan hafif efekt */}
      {sisGonderdimBitis && <SisKenar key={sisGonderdimBitis} bitis={sisGonderdimBitis} />}
      <CevapEfekti dogru={dogruCevapVerdim} puan={puan} seri={seri} />

      {/* Cevap sunucuya gitmedi — seçim geri alındı, tekrar dokunulabilir */}
      {cevapHatasi && (
        <div className="bd-sure-doldu-bant bd-cevap-hata" role="alert">
          <Ikon ad="yenile" boyut={15} /> {tt("Cevabın gitmedi — tekrar dokun")}
        </div>
      )}

      {/* Zaman aşımı bilgisi — geri bildirim penceresi boyunca durur */}
      {zamanAsimi && (
        <div className="bd-sure-doldu-bant" role="status">
          <Ikon ad="saat" boyut={15} /> {tt("Süre doldu")}
        </div>
      )}

      {/* Son 5 saniye: kızaran kenarlar (büyük geri sayım rakamı soru
          metninin İÇİNDE — aşağıya bak; kartın ortasına konunca şıkların
          üstüne biniyordu, hata gibi görünüyordu). */}
      {sonDuzluk && <div className="bd-son-perde" aria-hidden="true" />}

      {/* Üst şerit: soru numarası + kalan süre halkası + ilerleme çubuğu */}
      <div className="bd-soru-ust">
        <div className="bd-soru-no">
          {tt("Soru")} {soru.soru_index + 1}
          {kategori && kategori !== "karisik" && (
            <span className="bd-soru-kategori" data-kat={kategori}>
              {kategoriAdi(kategori)}
            </span>
          )}
        </div>
        <div className="bd-sure-halka" aria-label={tt("{0} saniye kaldı", { 0: Math.ceil(kalan) })}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <circle className="iz" cx="24" cy="24" r="20" />
            <circle
              className="dolgu"
              cx="24"
              cy="24"
              r="20"
              stroke={halkaRenk}
              strokeDasharray={CEVRE}
              strokeDashoffset={CEVRE * (1 - oran)}
            />
          </svg>
          <span className={`bd-sure-sayi ${kalan <= 5 ? "kritik" : ""}`}>
            {Math.ceil(kalan)}
          </span>
          {(skillEfekt?.tur === "sure" || skillEfekt?.tur === "zaman_baskisi") && (
            <span className={`bd-skill-sure-deger ${skillEfekt.tur === "zaman_baskisi" ? "eksi" : "arti"}`} aria-live="polite">
              {skillEfekt.tur === "zaman_baskisi" ? "−" : "+"}{skillEfekt.deger} sn
            </span>
          )}
        </div>
      </div>
      <div className="bd-soru-bar">
        {/* Renk yeşil → sarı → kırmızı; süre azaldıkça sınıf değişir */}
        <div
          className={`dolgu ${oran > 0.5 ? "iyi" : oran > 0.25 ? "orta" : "kritik"}`}
          style={{ width: `${oran * 100}%` }}
        />
      </div>

      <div className="bd-soru-metin">
        {/* Son 5 saniyenin büyük rakamı: soru metninin arkasında filigran.
            Kartın ortasına (%42) konumlandırılmıştı; yeni tasarımda kart
            uzayınca şıkların üstüne biniyordu. Artık metne bağlı. */}
        {sonDuzluk && (
          <span className="bd-son-saniye" key={geriSayim} aria-hidden="true">{geriSayim}</span>
        )}
        {soru.soru}
      </div>

      <div className="bd-secenekler">
        {secenekler.map((s, i) => {
          const elendi = kapali.includes(i);
          let sinif = "bd-secenek";
          if (sonuc) {
            if (i === sonuc.dogru_cevap) sinif += " dogru";
            else if (i === secim) sinif += " yanlis";
            else sinif += " solgun";
          } else if (i === secim) {
            sinif += " secili";
          }
          if (elendi) sinif += " elendi";
          return (
            <button
              key={i}
              className={sinif}
              disabled={secim !== null || kalan <= 0 || elendi}
              onClick={() => cevapla(i)}
              onPointerDown={basiliTutmayaBasla}
              onPointerUp={basiliTutmayiBirak}
              onPointerLeave={basiliTutmayiBirak}
              onPointerCancel={basiliTutmayiBirak}
            >
              <span className="bd-harf">{HARFLER[i]}</span>
              <span className="bd-secenek-metin">{s}</span>
              {sonuc && i === sonuc.dogru_cevap && <span className="bd-isaret"><Ikon ad="onay" boyut={16} /></span>}
              {sonuc && i === secim && i !== sonuc.dogru_cevap && (
                <span className="bd-isaret"><Ikon ad="carpi" boyut={16} /></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Yeni joker ekonomisi (sunucu tabanlı).
          "Hızlı Olan Kazanır" modunda joker YOK: mod "ilk doğru cevap kazanır"
          üzerine kurulu; 50:50 ya da +10 sn adaleti doğrudan bozar. Meydan Oku
          açıklamasındaki "Joker yok!" cümlesiyle tutarlı olsun diye çubuk
          bu modda hiç çizilmez. */}
      {macTur && macTur !== "hizli" && !jokerYok && macId && !sonuc && secim === null && kalan > 0 && (
        <JokerCubugu
          macTur={macTur}
          macId={macId}
          soruIndex={soru.soru_index}
          surum={jokerSurum}
          kalanSn={kalan}
          onEtki={jokerEtkisi}
        />
      )}

      {/* Eski joker çubuğu — yalnız macTur verilmeyen ekranlarda (geriye uyum) */}
      {!macTur && jokerler && !sonuc && secim === null && kalan > 0 && (
        <div className="joker-bar">
          <button
            disabled={jokerler.kullanildi.elli || kapali.length > 0}
            onClick={async () => {
              const r = await jokerler.onKullan("elli");
              if (r?.kapali) setKapali(r.kapali);
            }}
          >
            <Ikon ad="terazi" boyut={16} /> 50:50 <span className="bedel">{tt("Ücretsiz")}</span>
          </button>
          <button
            disabled={jokerler.kullanildi.sure}
            onClick={() => jokerler.onKullan("sure")}
          >
            <Ikon ad="saat" boyut={16} /> {tt("+10 sn")} <span className="bedel">{tt("20 puan")}</span>
          </button>
        </div>
      )}

      {sonuc && (
        <div className="adil-oylama">
          <span>{tt("Bu soru adil miydi?")}</span>
          <button className={oy === true ? "secildi" : ""} onClick={() => oyVer(true)}>
            <Ikon ad="onay" boyut={17} />
          </button>
          <button className={oy === false ? "secildi" : ""} onClick={() => oyVer(false)}>
            <Ikon ad="carpi" boyut={17} />
          </button>
        </div>
      )}
    </div>
  );
}
