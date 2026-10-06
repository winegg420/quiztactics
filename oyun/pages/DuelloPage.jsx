// ============================================================
// DÜELLO (TAKTİK MAÇI) — Paket 14, aşama 4
//
// Kurallar ve süreler SUNUCUDA (migration 205). Bu sayfa yalnız
// duello_durum()'un oyuncuya süzülmüş görünümünü çizer ve eylemleri iletir.
// Canlılık: duello_sinyal (Realtime, yalnız sürüm) + 1 sn'lik yoklama.
//
// Gizlilik: rakibin bot olup olmadığı istemciye hiç gelmez; bu sayfada
// "bot" kelimesi geçmez. Rakibin şıklar arasında gezinmesi gösterilmez —
// yalnız kilitlediği cevap sonuç fazında açıklanır.
//
// iOS: son can koyulaşması sayfa kabının ::before katmanıyla yapılır
// (position:fixed + transform aynı öğede YOK).
// ============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useDuelloAcilis } from "../lib/useDuelloAcilis.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import MacUstSerit from "../components/MacUstSerit.jsx";
import CerceveliAvatar from "../components/CerceveliAvatar.jsx";
import { useOyuncuSeviyeleri } from "../lib/oyuncuSeviye.js";
import { TepkiCubugu, useMacTepki } from "../components/Tepki.jsx";
import MacYukleniyor from "../components/MacYukleniyor.jsx";
import MacSonuKutlama from "../components/MacSonuKutlama.jsx";
import { useMacSonuOzet, ozettenSahne } from "../lib/macSonuOzet.js";
import OdulDokumu from "../components/OdulDokumu.jsx";
import DuelloTanitim, { duelloTanitimGoruldu } from "../components/DuelloTanitim.jsx";
import HesapGuvenceOnerisi from "../components/HesapGuvence.jsx";
import DereceliAnahtari from "../components/DereceliAnahtari.jsx";
import JokerSatinAlModal from "../components/JokerSatinAlModal.jsx";
import { useDereceliTercih } from "../lib/dereceli.js";
import { useDil } from "../lib/dilKanca.js";
import { hataMesaji, islemHatasi } from "../lib/hata.js";
import { zamanAsimindaYenidenDene } from "../lib/yenidene.js";
import { y } from "../lib/yol.js";
import { coinTazele } from "../lib/coin.js";
import { ayar, useAyar } from "../lib/ayarlar.js";
import { useDuelloKurallari } from "../lib/duelloKurallari.js";
import AramaSahnesi, { ARAMA_GECIS_MS } from "../components/AramaSahnesi.jsx";
import { sesKilidiAc, sesTik, sesDogru, sesYanlis, sesJoker, sesDokunus, sesRakipBulundu,
  sesOnYukle, sesKategoriGeriSayim, sesSoruGeldi, sesTurGecis, sesSkill,
  sesKategoriSecildi, sesRakipCevapladi, sesHataUyari } from "../lib/ses.js";
import { titret } from "../lib/geriBildirim.js";
import { useOyunModu } from "../lib/oyunModu.js";
import SkillSeti from "../components/SkillSeti.jsx";
// Maç ekranı parçaları (Tasarım A).
import { V2Ust, V2Kategori, V2SecimCubugu, V2Cevap, V2Sonuc, V2Skill, V2Gecmis } from "../components/DuelloV2.jsx";
// 680 · Hâkimiyet tahtası: yuvalar, mesaj satırı, maç sonu tahtası (kartlar/alt çubuk DuelloV2 üzerinden).
import { hkModel, hkKategoriDurumu, durumIpucuSirasi, HkYuvalar, HkMesaj, hkMesaj, HkSonTahta, V2BanCubugu } from "../components/DuelloTahta.jsx";
// Savunma banının "an"ları (yalnız sunum): durum satırı, giriş damgası, ban açıklaması, kırmızı → mavi geçiş.
import { BanKonsol, BanGirisAni, BanAciklama, banIpucuGoster } from "../components/DuelloBanAni.jsx";
// 960 · sırayla kategori seçimi (draft): halka, noktalar, konsol, kartlar + uçuş, HÂKİMİYET BAŞLIYOR geçişi
import { secimModel, secimIpucuGoster, SecimHalka, SecimPipler, SecimKonsol, SecimKartlar, HakimiyetBasliyor, HAKIMIYET_GECIS_MS } from "../components/DuelloSecim.jsx";
// Tasarım A görünümü (m2- önekli). Eski duello-v2.css artık yüklenmez (dosya Faz 4'e kadar durur).
import "./DuelloPage.a.css";
import "../styles/duello-tahta.css";
import { QtBosDurum, QtDugme, QtIkon, QtModal, QtSayac, QT_KIRILMA_MS, sinif } from "../tasarim/index.js";
import { rpcDene } from "../lib/rpcDene.js";
import { sayacKaymasi, sayacGoster, sayacSinirMs, saatFarkiOrnekle } from "../lib/zaman.js";

// Bu istemcinin çizebildiği en yüksek Düello sürümü. 23 Eyl 2026: canlıdaki eski paket
// (yalnız v1 arayüzü) v2 maçını v1 gibi çizdi — saldıran tarafın şıkları kapalı kaldı.
// Tanımadığı sürümde maç çizilmez, yenileme istenir.
const DUELLO_EN_YUKSEK_SURUM = 2;

// Kategori geri sayım sesi yalnız son KATEGORI_SES_ESIK_SN saniyede çalar (küçük hata, 27 Eyl 2026):
// eskiden 15 sn'lik kategori süresinin tamamında tik çalıyordu.
const KATEGORI_SES_ESIK_SN = 5;

// Canlılık (23 Eyl 2026, ölçüldü): her duello_durum okuması sunucuda satır kilidi +
// iki yazma (hız sınırı sayacı, last_seen) yapar. Eskiden saniyede bir yoklama +
// her sinyalde okuma + her okumada duello_baglanti vardı (oyuncu başına ~1,4 durum
// + 1,4 bağlantı çağrısı/sn). Şimdi: Realtime sinyali ASIL yol; faz bitişinde tek
// okuma (sunucu fazı tembel ilerletir); yoklama yalnız yedek.
const YEDEK_YOKLAMA_MS = 4000;     // kanal bağlıyken
const KANALSIZ_YOKLAMA_MS = 1000;  // kanal bağlı değilken (eski davranış)
// Faz bitişine yakın yedek yoklama sıklaşır (Ida, 24 Eyl 2026): Realtime sinyali kaçarsa yeni faz
// 4 sn beklemeden görünsün. Yalnız bitişten önceki son SON_YOKLAMA_PENCERE_MS içinde ve sonraki 2 sn'de.
const SON_YOKLAMA_PENCERE_MS = 1500;
const SON_YOKLAMA_MS = 500;
const BAGLANTI_MS = 5000;          // duello_baglanti (kopukluk bandı) aralığı
// duello2_ilerlet cevap fazını kişisel bitiş + duello2_cevap_tolerans_sn (1 sn) sonra kapatır.
const CEVAP_TOLERANS_MS = 1100;
const SINYAL_BIRLESTIR_MS = 30;    // aynı anda gelen Realtime sinyallerini tek okumada birleştir
// 760 (1 Eki 2026, Ida + arkadaşının ilk iki kişilik maçı): durum okuması hata verince (57014 statement timeout,
// ağ kopması) sahne eski fazda donup kalıyordu. Artık geri çekilmeli yeniden deneme (1 → 2 → 4 → 8 sn) yapılır ve
// "Bağlantı yeniden kuruluyor…" bandı çıkar; son bilinen sunucu fazı ekranda kalır, ilk başarılı okumada toparlanır.
// Hata sürerken yedek yoklama DURUR (yeniden deneme zamanlayıcısı tek kaynak) — sunucuya ek yük binmez.
const HATA_GERI_CEKILME_MS = [1000, 2000, 4000, 8000];
// Faz bitişi geçtiği hâlde yeni faz gelmediyse (cron/DB takılması) yoklama 4 sn yerine 2 sn'de bir sürer
// (her durum okuması sunucuda fazı tembel ilerletir) ve GECIKME_BANT_MS'den sonra bant görünür.
const GECIKMIS_YOKLAMA_MS = 2000;
const GECIKMIS_PENCERE_MS = 30000;
const GECIKME_BANT_MS = 4000;

// ------------------------------------------------------------ giriş + arama
// Tasarım A: tek sütun, mod rengi kırmızı başlık kartı + tek birincil eylem.
// Kurallar giriş ekranında zorla gösterilmez: "Kurallar nasıl işliyor?" → DuelloTanitim (tam kural metni orada).
// 666 · Yeni oyuncu kilidi: Düello en az duello_acilis_mac_esigi (5) bitmiş Klasik/Saf Bilgi maçıyla açılır.
// Kural sunucuda (duello_ara / davet); lobi yalnız durumu gösterir (duello_acilis_benim). Okunamazsa kilit
// gösterilmez — sunucu zaten reddeder ve hata metni aramada görünür.
function DuelloGiris() {
  const navigate = useNavigate();
  const { ceviri } = useDil();
  // 870: kazanma eşiği ve "boşta ikisi doğru → saldıran alır" kuralı metne gömülmez, ayardan okunur.
  // 960: seçim modu açıksa maç sırayla kategori seçimiyle başlar (boş kategori yok) — metin buna göre.
  // 970: puan modunda kural metni hedef puan + kategori yolu (ayardan).
  const { secim: secimModu, puan: puanModu, esik, hedef, yol } = useDuelloKurallari();
  const bosSaldiran = useAyar("duello_bos_ikisi_dogru_saldiran", 1) >= 1;
  const [dereceli, setDereceli] = useDereceliTercih();
  // 410 (Ajan I): rakip düelloya bağlanamadı → sunucu cezasız iptal etti, DuelloMac buraya
  // { yenidenAra } ile döndü: arama kısa bilgiyle kendiliğinden başlar (durum bir kez tüketilir).
  const location = useLocation();
  const [aramaBilgi] = useState(() => (location.state?.yenidenAra ? ceviri("Rakip bağlanamadı, yeni rakip aranıyor") : null));
  const [arama, setArama] = useState(() => Boolean(location.state?.yenidenAra));
  useEffect(() => {
    if (location.state?.yenidenAra) navigate(location.pathname, { replace: true, state: null });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [tanitim, setTanitim] = useState(null);   // null | "arama" (bitince aramaya geç) | "kurallar"
  const acilis = useDuelloAcilis();   // { acik, gereken, oynanan, kalan } | null (okunmadı)
  const hazir = acilis !== null;   // durum gelmeden eylem çizilmez (kilitli oyuncu bir an "Rakip ara" görmesin)
  const kilitli = hazir && acilis.acik === false;
  const kalan = Number(acilis?.kalan ?? 0);
  const gereken = Number(acilis?.gereken ?? 0);
  const oynanan = Math.max(0, gereken - kalan);

  return (
    <div className="m2-giris">
      <header className="m2-giris-kafa qt-h-gir">
        <span className="m2-giris-ikon" aria-hidden="true"><QtIkon ad="duello" boyut={40} /></span>
        <div className="m2-giris-yazi">
          <h1 className="qt-baslik-1">{ceviri("Düello")}</h1>
          <p>{(puanModu ? [
            ceviri("Maç başında 10 kategoriyi sırayla seçersiniz, 5'er tane."),
            ceviri("Yalnız rakibin kategorisine saldırırsın. Bildiğin her soru +1; rakip bilemezse kategori senin, +2."),
            ceviri("{h} puana ya da rakibin {y} kategorisine ilk ulaşan kazanır.", { h: hedef, y: yol }),
          ] : secimModu ? [
            ceviri("Maç başında 10 kategoriyi sırayla seçersiniz, 5'er tane."),
            ceviri("{n} yuvayı ilk dolduran kazanır.", { n: esik }),
            ceviri("Rakibin kategorisini almak için sen doğru, rakip yanlış bilmelisin."),
          ] : [
            ceviri("{n} yuvayı ilk dolduran kazanır.", { n: esik }),
            ceviri("Hamlen tutması için sen doğru, rakip yanlış bilmelisin."),
            ceviri(bosSaldiran ? BOS_SALDIRAN_KURALI : "Boş kategoride bilen alır."),
            ceviri("Tutan hamle kategoriyi 2 tur kilitler."),
          ]).join(" ")}</p>
        </div>
      </header>
      {kilitli ? (
        <section className="m2-kilit qt-h-gir" role="status" aria-label={ceviri("Düello kilitli")}>
          <span className="m2-kilit-ikon" aria-hidden="true"><QtIkon ad="kilit" boyut={28} /></span>
          <div className="m2-kilit-yazi">
            <b>{ceviri("Düello'yu açmak için {n} maç daha oyna", { n: kalan })}</b>
            <span>{ceviri("Klasik ya da Saf Bilgi: {o}/{g} maç", { o: oynanan, g: gereken })}</span>
            <span className="m2-kilit-cubuk" aria-hidden="true">
              <i style={{ width: `${gereken ? Math.round((100 * oynanan) / gereken) : 0}%` }} />
            </span>
          </div>
          <QtDugme tamGenislik ikon="oyna" onClick={() => navigate(y())}>{ceviri("Klasik maç oyna")}</QtDugme>
        </section>
      ) : !hazir ? null : (
        <>
          <DereceliAnahtari dereceli={dereceli} onDegistir={setDereceli} />
          <SkillSeti macTur="duello" />
        </>
      )}
      <div className="m2-giris-eylem">
        {hazir && !kilitli && (
          <>
            <QtDugme tamGenislik boyut="b" ikon="duello"
                     onClick={() => { sesKilidiAc(); sesDokunus(); if (duelloTanitimGoruldu()) setArama(true); else setTanitim("arama"); }}>
              {ceviri("Rakip ara")}
            </QtDugme>
            <p className="m2-giris-not">
              {dereceli ? ceviri("Klasik ile aynı lig puanı ve coin ödülü") : ceviri("Serbest: lig puanı yok, coin yarı.")}
            </p>
          </>
        )}
        {/* Paket 20 IV.1: kurallar her zaman yeniden açılabilir */}
        <QtDugme tur="hayalet" boyut="k" ikon="bilgi" onClick={() => setTanitim("kurallar")}>{ceviri("Kurallar nasıl işliyor?")}</QtDugme>
      </div>
      {tanitim && <DuelloTanitim onKapat={() => { const aramaya = tanitim === "arama"; setTanitim(null); if (aramaya) setArama(true); }} />}
      {arama && !kilitli && (
        <DuelloArama
          dereceli={dereceli}
          bilgi={aramaBilgi}
          onBulundu={(id) => navigate(y(`/duello/${id}`))}
          onIptal={() => setArama(false)}
        />
      )}
    </div>
  );
}

// Arama ekranında dönen ipuçları (Paket 29 B) — yalnız sunum, eşleştirmeye dokunmaz.
// "15 sn'yi geçerse botla eşleştireceğiz" satırı BİLEREK yok: rakip gizli bot olur
// ve bu sayfa botu asla ele vermez (bkz. dosya başı gizlilik notu).
// İngilizcesi ceviri/hakimiyet.js (680 · Hâkimiyet). {n} = kazanma eşiği (duello_hakimiyet_esik, 870: 5).
// 870: boşta ikisi de doğruysa saldıran alır — ayar duello_bos_ikisi_dogru_saldiran 0 ise bu satır gösterilmez.
const BOS_SALDIRAN_KURALI = "Boş kategoride ikiniz de bilirseniz saldıran alır.";
// 960: SECIM_IPUCLARI yalnız seçim modunda, BOS_IPUCLARI yalnız eski (boş kategorili) akışta gösterilir.
const SECIM_IPUCLARI = [
  "Maç sırayla kategori seçimiyle başlar: en iyi bildiklerini seç.",
  "Her seçim için {s} sn; süre dolarsa en iyi bildiğin kalan kategori seçilir.",
];
const BOS_IPUCLARI = [
  "Boş kategoride bilen alır.",
  BOS_SALDIRAN_KURALI,
  "Mavi çerçeve: fırsat. Boş kategoride rakip yanlış yapar ve sen bilirsen senin olur.",
];
// 970: HAKIMIYET_IPUCLARI yalnız yuva (eski) kuralında, PUAN_IPUCLARI yalnız puan modunda. {h} hedef puan, {y} kategori yolu.
const HAKIMIYET_IPUCLARI = [
  "{n} yuvayı ilk dolduran kazanır.",
  "Hamlen tutması için sen doğru, rakip yanlış bilmelisin.",
  "{t} tur sonunda yuvalar eşitse Altın Soru.",
];
const PUAN_IPUCLARI = [
  "Yalnız rakibin kategorisine saldırabilirsin.",
  "Bildiğin her soru +1 puan.",
  "Sen bilir, rakip bilemezse kategori senin: +2.",
  "{h} puana ya da rakibin {y} kategorisine ilk ulaşan kazanır.",
  "{t} tur sonunda puanlar eşitse Altın Soru.",
];
const ARAMA_IPUCLARI = [
  ...SECIM_IPUCLARI,
  "Aynı soruyu aynı anda cevaplarsınız.",
  ...PUAN_IPUCLARI,
  "{n} yuvayı ilk dolduran kazanır.",
  "Hamlen tutması için sen doğru, rakip yanlış bilmelisin.",
  "Boş kategoride bilen alır.",
  BOS_SALDIRAN_KURALI,
  // Soru ekranındaki çerçeve renklerinin anlamı (uzun cümle soru ekranında yazılmaz; DuelloTahta › hkKategoriDurumu)
  "Kırmızı çerçeve: kategorin tehlikede. Yanlış bilirsen ve rakip bilirse kaybedersin.",
  "Mavi çerçeve: fırsat. Boş kategoride rakip yanlış yapar ve sen bilirsen senin olur.",
  "Tutan hamle kategoriyi 2 tur kilitler.",
  "{t} tur sonunda yuvalar eşitse Altın Soru.",
];
const IPUCU_SN = 3;
// Paket 41 F: düello aramasının üst sınırı (Klasik'teki gibi sonsuz bekleme yok)
const DUELLO_ARAMA_SINIR_SN = 60;

function DuelloArama({ dereceli, onBulundu, onIptal, ipuclari: tumIpuclari = ARAMA_IPUCLARI, bilgi = null }) {
  const { ceviri } = useDil();
  const { secim: secimModu, puan: puanModu, esik, tur: turSayisi, hedef, yol } = useDuelloKurallari();   // 960: sayılar ve akış ayardan
  const secimSn = useAyar("duello_secim_sn", 5);
  const bosSaldiran = useAyar("duello_bos_ikisi_dogru_saldiran", 1) >= 1;
  const ipuclari = tumIpuclari.filter((m) => (secimModu ? !BOS_IPUCLARI.includes(m) : !SECIM_IPUCLARI.includes(m))
    && (bosSaldiran || m !== BOS_SALDIRAN_KURALI)
    // 970: puan modunda yuva satırları yok; eski modda puan satırları yok
    && (puanModu ? !HAKIMIYET_IPUCLARI.includes(m) && !BOS_IPUCLARI.includes(m) : !PUAN_IPUCLARI.includes(m)));
  const [gecen, setGecen] = useState(0);
  const ipucu = Math.floor(gecen / IPUCU_SN) % ipuclari.length;
  const [hata, setHata] = useState(null);
  // Paket 30 E: bulunma anı — rakip kartı dolar, ~1 sn sonra düelloya geçilir
  const [bulundu, setBulundu] = useState(false);
  const [rakip, setRakip] = useState(null);
  const [ezeli, setEzeli] = useState(null);
  const bittiRef = useRef(false);
  const [deneme, setDeneme] = useState(0);   // Paket 41 F: Tekrar dene aramayı baştan başlatır
  const bulunduRef = useRef(onBulundu);
  bulunduRef.current = onBulundu;
  const gecisRef = useRef(null);

  // Eşleşme mantığı DEĞİŞMEDİ: aynı RPC, aynı 1 sn aralık. Yalnız bulunduktan sonra
  // rakibin kartı bir kez (duello_durum — oyuncuya süzülmüş görünüm) okunur.
  const karsilas = useCallback(async (duelloId) => {
    setBulundu(true);
    sesRakipBulundu();
    gecisRef.current = window.setTimeout(() => bulunduRef.current(duelloId), ARAMA_GECIS_MS);
    try {
      const { data, error } = await supabase.rpc("duello_durum", { p_id: duelloId });
      if (error) throw error;
      const r = data?.oyuncular?.find((o) => o.id !== data.ben);
      if (r) setRakip(r);
      const e = data?.ezeli;
      if (e && Number(e.ben) + Number(e.rakip) > 0) {
        setEzeli(e.ben > e.rakip
          ? ceviri("Bu oyuncuyla {ben}-{rakip} öndesin", e)
          : e.ben < e.rakip
            ? ceviri("Bu oyuncuyla {ben}-{rakip} geridesin", e)
            : ceviri("Bu oyuncuyla {ben}-{rakip} berabersiniz", e));
      }
    } catch (e) {
      // Kart dolmasa da düelloya geçilir (zamanlayıcı zaten kurulu).
      console.warn("[Bildim] karşılaşma kartı okunamadı:", e?.message ?? e);
    }
  }, [ceviri]);

  useEffect(() => () => window.clearTimeout(gecisRef.current), []);

  useEffect(() => {
    let iptal = false;
    let istekte = false;   // önceki duello_ara bitmeden yenisi atılmaz (yavaş sunucuda üst üste binmesin)
    const dene = async () => {
      if (iptal || bittiRef.current || istekte) return;
      istekte = true;
      try {
        const { data, error } = await supabase.rpc("duello_ara", { p_dereceli: dereceli });
        if (error) throw error;
        if (data && !bittiRef.current) {
          bittiRef.current = true;
          karsilas(data);
        }
      } catch (e) {
        console.error("[Bildim] duello_ara:", e);
        setHata(islemHatasi(e, "Rakip aranamadı."));
        bittiRef.current = true;
        clearInterval(zaman);   // hata: sayaç ve yoklama durur
      } finally {
        istekte = false;
      }
    };
    dene();
    let sn = 0;
    const zaman = setInterval(() => {
      sn += 1;
      if (sn >= DUELLO_ARAMA_SINIR_SN && !bittiRef.current) {
        clearInterval(zaman);
        bittiRef.current = true;
        setHata(ceviri("Şu an rakip bulunamadı. Birazdan tekrar dene."));
        rpcDene("duello_aramadan_cik");
        return;
      }
      setGecen((g) => g + 1); dene();
    }, 1000);
    return () => {
      iptal = true;
      clearInterval(zaman);
      if (!bittiRef.current) rpcDene("duello_aramadan_cik");
    };
  }, [dereceli, ceviri, karsilas, deneme]);

  const yenidenDene = () => { bittiRef.current = false; setHata(null); setGecen(0); setDeneme((n) => n + 1); };

  // Ajan I: tam ekran arama sahnesi (Klasik ile aynı bileşen). Bulunduktan sonra kapatılamaz.
  return (
    <AramaSahnesi
      mod="duello"
      dereceli={dereceli}
      gecen={gecen}
      durum={bulundu ? "bulundu" : hata ? "hata" : "ariyor"}
      rakip={bulundu ? rakip : null}
      ezeli={ezeli}
      bilgi={bilgi}
      hata={hata}
      // key değişince satır yeniden takılır → giriş animasyonu her ipucunda oynar
      alt={<p key={ipucu} className="qt-h-gir" aria-live="polite">{ceviri(ipuclari[ipucu], { t: turSayisi, n: esik, s: secimSn, h: hedef, y: yol })}</p>}
      onIptal={onIptal}
      onTekrar={yenidenDene}
    />
  );
}

// ------------------------------------------------------------ rövanş bekleme (Paket 30 C)
// Rakibin avatarı, geri sayım halkası (süre oyun_ayarlari.duello_rovans_sn), Vazgeç.
// Sunucuda isteği geri çeken RPC: duello_rovans_iptal (Vazgeç).
const ROVANS_HALKA_R = 44;
const ROVANS_HALKA_CEVRE = 2 * Math.PI * ROVANS_HALKA_R;

function RovansBekleme({ rakip, baslangic, sureSn, simdi, ceviri, onVazgec }) {
  const kalanMs = Math.max(0, baslangic + sureSn * 1000 - simdi);
  const kalanSn = Math.ceil(kalanMs / 1000);
  const oran = sureSn > 0 ? kalanMs / (sureSn * 1000) : 0;
  return (
    <QtModal acik onKapat={onVazgec} baslik={ceviri("Rövanş isteği gönderildi")} className="m2-rovans"
             altlik={<QtDugme tur="ikincil" tamGenislik onClick={onVazgec}>{ceviri("Vazgeç")}</QtDugme>}>
      <div className="m2-rovans-ic" aria-live="polite">
        <div className="m2-rovans-halka">
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="iz" cx="50" cy="50" r={ROVANS_HALKA_R} />
            <circle className="dolu" cx="50" cy="50" r={ROVANS_HALKA_R}
                    strokeDasharray={ROVANS_HALKA_CEVRE}
                    strokeDashoffset={ROVANS_HALKA_CEVRE * (1 - oran)} />
          </svg>
          <CerceveliAvatar profile={rakip} userId={rakip?.id} boyut={64} hareketli />
        </div>
        <p className="m2-rovans-metin">
          {ceviri("Rövanş isteği gönderildi — {ad} yanıtlıyor…", { ad: rakip?.gorunen_ad ?? "" })}
        </p>
        <p className="m2-rovans-sayac qt-sayi" role="timer" aria-label={ceviri("{0} saniye kaldı", { 0: kalanSn })}>
          {ceviri("{0} sn", { 0: kalanSn })}
        </p>
      </div>
    </QtModal>
  );
}

// ------------------------------------------------------------ maç
function DuelloMac({ id }) {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();
  const { ceviri } = useDil();
  const c2 = ceviri;   // Düello 1.0 metinleri: İngilizcesi ceviri/mac.js › Düello (M2)
  const [d, setD] = useState(null);
  const dGuncelRef = useRef(null);   // eylem() yeniden denemesi: en son bilinen düello durumu
  dGuncelRef.current = d;
  const seviyeler = useOyuncuSeviyeleri((d?.oyuncular ?? []).map((o) => o.id));
  const [hata, setHata] = useState(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(null);
  const [baglanti, setBaglanti] = useState(null);   // Paket 24 · A.4: rakip kopuk mu
  const [simdi, setSimdi] = useState(Date.now());
  const [secim, setSecim] = useState(null);
  const [ikinciSansElendi, setIkinciSansElendi] = useState([]);
  const [calisan, setCalisan] = useState(null);
  const [terkOnay, setTerkOnay] = useState(false);
  // Paket 27 C: maç içinde satın alınacak joker türü (null = pencere kapalı)
  // Paket 28 D: { tur, yalnizAl }. `yalnizAl` kategori ekranında true —
  // joker envantere girer, kullanımı Saldırı Hazırlığı'nda yapılır.
  const [satinAlinacak, setSatinAlinacak] = useState(null);
  // Faz değişince (soru bitti, kategori ekranı geldi) açık satın alma penceresi kapanır — eski soruya ait
  // "Al ve kullan" yeni fazın ekranını örtüyordu (canlı oyuncu testi, 24 Eyl).
  const satinAlFazi = d ? `${d.tur}:${d.saldiri_sirasi}:${d.saldiran}:${d.faz}:${d.uzatma}` : "";
  useEffect(() => { setSatinAlinacak(null); }, [satinAlFazi]);
  const [dokumToplam, setDokumToplam] = useState(null);   // Paket 20 I.3: sunucu dökümünün toplamı
  // Paket 40 D: öteki modlar gibi maç sürerken sekme/üst çubuk gizlenir (jokerleri örtüyordu).
  useOyunModu(d?.durum === "aktif");

  // 410 (Ajan I): düello ekranına geliş + bağlanmayan rakip. Kural SUNUCUDA (duello_giris):
  // aramayla kurulan düelloda rakip duello_baglanma_sn içinde gelmezse düello cezasız iptal
  // (kazanan/ödül yok). Bekleyen oyuncu yeniden aramaya döner. Rakip gelince yoklama durur.
  useEffect(() => {
    let aktif = true;
    let zamanlayici = null;
    const sor = async () => {
      if (!aktif) return;
      try {
        const { data, error } = await supabase.rpc("duello_giris", { p_id: id });
        if (error) throw error;
        if (!aktif) return;
        if (data?.durum === "iptal" && data?.baglanmayan && data.baglanmayan !== user?.id) {
          navigate(y("/duello"), { replace: true, state: { yenidenAra: true } });
          return;
        }
        if (data?.rakip_geldi || data?.durum !== "aktif") return;
      } catch (e) {
        console.warn("[Bildim] duello_giris:", e?.message ?? e);
      }
      zamanlayici = window.setTimeout(sor, 2000);
    };
    sor();
    return () => { aktif = false; window.clearTimeout(zamanlayici); };
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [gorevler, setGorevler] = useState([]);   // Paket 37 D.1: sahnede Detay'ın üstünde
  // Rövanş bekleme penceresi ve sunucu tarafındaki geri çekme durumu.
  const [rovBas, setRovBas] = useState(null);          // bekleme başladığı yerel an (ms)
  const [rovVazgec, setRovVazgec] = useState(false);
  const [rovSonuc, setRovSonuc] = useState(null);      // null | "cevapsiz" | "red"
  const [rovSn, setRovSn] = useState(60);              // oyun_ayarlari.duello_rovans_sn
  // Paket 34: jokerler geçici olarak ücretsiz ve sınırsız (oyun_ayarlari.jokerler_ucretsiz)
  const [jokerSerbest, setJokerSerbest] = useState(false);
  const [skillEfekt, setSkillEfekt] = useState(null);
  const [skillDeger, setSkillDeger] = useState({ ek: 5, baski: 5 });
  const skillDurumRef = useRef(null);
  const skillTimerRef = useRef(null);
  useEffect(() => {
    let aktif = true;
    ayar("jokerler_ucretsiz", 0).then((v) => { if (aktif) setJokerSerbest(Number(v) > 0); }, () => {});
    Promise.all([ayar("duello_ek_sure_sn", 5), ayar("duello_zaman_baskisi_sn", 10)])
      .then(([ek, toplam]) => { if (aktif) setSkillDeger({ ek: Number(ek), baski: Math.max(0, 15 - Number(toplam)) }); });
    return () => { aktif = false; };
  }, []);
  const farkRef = useRef(0); // sunucu saati - istemci saati (ms)
  const fazBitisRef = useRef(null); // sunucu saatiyle geçerli faz bitişi (ms) — yedek yoklama için
  const farkOrnekRef = useRef([]); // son 60 sn'nin saat farkı örnekleri
  const yukleniyorRef = useRef(false);
  const dImzaRef = useRef("");
  const kanalHazirRef = useRef(false);   // Realtime kanalı SUBSCRIBED mi
  // 542: maç içi tepki — aynı düello kanalında broadcast (DB'ye yazılmaz). Açık mı: tepki_durumu (tek okuma).
  const duelloKanalRef = useRef(null);
  const tepkiRakipId = (d?.oyuncular ?? []).find((o) => o.id !== d?.ben)?.id ?? null;
  const tepki = useMacTepki({ macTur: "duello", macId: id, benId: user?.id, rakipId: tepkiRakipId,
                             kanal: () => duelloKanalRef.current, etkin: Boolean(d?.surum === 2 && d?.durum === "aktif") });
  const tepkiAlRef = useRef(null);
  tepkiAlRef.current = tepki.al;
  const sinyalZamanRef = useRef(null);
  const sonHamleRef = useRef(null);
  const bitisSesRef = useRef(false);
  // A.3: yeni maç sonu sahnesinin verisi (tek çağrı: mac_sonu_ozet) — düello bitince bir kez okunur.
  const { ozet: macSonuOzet } = useMacSonuOzet(d?.durum === "bitti" && d?.id ? `duello:${d.id}` : null);
  const sonTikRef = useRef(null);
  // Tasarım A anları (yalnız sunum)
  const sayimRef = useRef(null);            // kategori geri sayımı: son çalınan saniye
  const gecisRef = useRef(null);            // son görülen faz/tur/soru (geçiş ve soru sesi)
  const soruSesTimerRef = useRef(null);
  const kirilmaTimerRef = useRef(null);
  // 680 · Hâkimiyet: kategori seçimi (saldıran, onay bekleyen),
  // saldıranın canlı dokunuşu (yalnız istemcide; DB'ye yazılmaz) ve el değiştirince sıçrayacak kartlar.
  const [katSecim, setKatSecim] = useState(null);
  const [banSecilen, setBanSecilen] = useState(null);   // ban fazında az önce banladığım kategori (bant nötrleşir)
  const [banBasilan, setBanBasilan] = useState(null);   // ban fazında dokunduğum kart (sunucu yanıtı gelene dek dolu kırmızı)
  const [banUyari, setBanUyari] = useState(null);       // saldıran banlı karta dokundu: alt çubukta "Rakip bunu banladı" (zaman damgası)
  const banSayimRef = useRef(null);                     // ban geri sayımı: son çalınan saniye
  const banTazeRef = useRef({ anahtar: null, taze: false });   // bu kategori fazı ban fazından AZ ÖNCE mi çıktı (açıklama oynar)
  const banIpucuRef = useRef({ anahtar: null, goster: false });
  const [secimBasilan, setSecimBasilan] = useState(null);   // 960: seçim fazında dokunduğum kart (yanıt gelene dek basılı)
  const secimIpucuRef = useRef({ id: null, goster: false });   // 960: ilk 3 Düello seçim ipucu (maç başına bir kez okunur)
  const [hkBasla, setHkBasla] = useState(null);             // 960: seçim → tur 1 geçişi (HÂKİMİYET BAŞLIYOR) zaman damgası
  const secimSayimRef = useRef(null);                      // 960: seçim geri sayımı: son çalınan saniye
  const secimSiraRef = useRef(null);                       // 960: "sıra sende" anı (seçim sırası başına bir kez)
  const durumIpucuRef = useRef({ anahtar: null, sira: null });   // çerçeve rengi ipucu (ilk 3 Düello, savunan beklerken)
  const [dokunus, setDokunus] = useState(null);      // { kategori, tur } — rakibin (saldıranın) dokunduğu kart
  const dokunusAlRef = useRef(null);
  const dokunusGonderRef = useRef({ zaman: 0, bekleyen: null, kategori: null });
  const [zipla, setZipla] = useState([]);
  const sahiplikOncekiRef = useRef(null);
  const [kiriliyor, setKiriliyor] = useState([]);   // 50:50 ile kırılan şıklar
  const [turGecis, setTurGecis] = useState(null);   // geçiş bandı anahtarı
  const [sonKullanilan, setSonKullanilan] = useState(null);   // { tur, anahtar } skill anı   // savunma halesi: fazın toplam süresi (ek süreyle büyür)

  // Performans (23 Eyl 2026, ölçüldü): durum okuması tek kanaldan geçer.
  //  · Yolda bir okuma varken gelen istek (Realtime sinyali, eylem sonrası tazeleme)
  //    ESKİDEN YUTULUYORDU: yoldaki okuma değişiklikten ÖNCE başlamışsa ekran eski
  //    durumu çiziyor, yenisi 1 sn'lik yoklamayı bekliyordu (ölçüm: p95 0,6–1,9 sn,
  //    iki oyuncu arası fark p95 1,35 sn). Artık istek sıraya girer: yoldaki biter
  //    bitmez TEK bir tazeleme daha yapılır; bekleyen herkes onun sonucunu bekler.
  //  · duello_baglanti (kopukluk bandı) her okumada değil, BAGLANTI_MS'de bir sorulur.
  const yukleSozRef = useRef(null);      // yoldaki okuma
  const tekrarSozRef = useRef(null);     // yoldakinin ardından sıraya giren tek okuma
  const yukleRef = useRef(null);
  const sonYukleRef = useRef(0);         // son okumanın başladığı an (yoklama seyreltme)
  const sonBaglantiRef = useRef(0);
  // 760: art arda başarısız okuma sayısı + tek yeniden deneme zamanlayıcısı (geri çekilmeli)
  const hataSayisiRef = useRef(0);
  const yenidenDeneRef = useRef(null);
  const [yenidenBaglaniyor, setYenidenBaglaniyor] = useState(false);
  const yukleTek = useCallback(async () => {
    yukleniyorRef.current = true;
    sonYukleRef.current = Date.now();
    try {
      // Paket 24 · A.4: bağlantı durumu AYNI ANDA sorulur — ek gecikme olmaz.
      // duello_durum 150 satırlık bir fonksiyon; onu genişletmek yerine ayrı, ucuz çağrı.
      const baglantiSor = Date.now() - sonBaglantiRef.current >= BAGLANTI_MS;
      if (baglantiSor) sonBaglantiRef.current = Date.now();
      // 980: saat farkı için duello_durum'un kendi gidiş/dönüş anları (bağlantı çağrısı beklenmeden)
      const durumGonderildi = Date.now();
      let durumAlindi = null;
      const [durumCevap, baglantiCevap] = await Promise.all([
        supabase.rpc("duello_durum", { p_id: id }).then((r) => { durumAlindi = Date.now(); return r; }),
        baglantiSor ? supabase.rpc("duello_baglanti", { p_id: id }) : Promise.resolve(null),
      ]);
      const { data, error } = durumCevap;
      if (error) throw error;
      if (data) {
        const onceki = skillDurumRef.current;
        const faz = `${data.tur}:${data.saldiri_sirasi}:${data.faz}`;
        let efekt = null;
        if (data.surum === 2) {
          // Düello 1.0: skill izleri kişisel bitişten ve cevap nesnesinden okunur.
          const cv = data.cevap ?? {};
          const bitis = cv.benim_bitis ? new Date(cv.benim_bitis).getTime() : null;
          const elli = Array.isArray(cv.elli_kapali) ? cv.elli_kapali.length : 0;
          if (onceki?.faz === faz) {
            if (onceki.soru_anahtar && data.soru?.soru && onceki.soru_anahtar !== data.soru.soru) efekt = { tur: "soru_degistir", asama: "giriyor" };
            else if (!onceki.elli && elli) efekt = { tur: "elli" };
            else if (onceki.bitis && bitis && bitis - onceki.bitis > 1500) efekt = { tur: "sure", deger: Number(data.sureler?.ek_sure ?? skillDeger.ek) };
            else if (onceki.bitis && bitis && onceki.bitis - bitis > 1500) efekt = { tur: "zaman_baskisi", deger: Math.round((onceki.bitis - bitis) / 1000) };
          }
          skillDurumRef.current = { faz, bitis, elli, soru_anahtar: data.soru?.soru };
        } else if (onceki?.faz === faz && !onceki.zaman_baskisi && data.zaman_baskisi) efekt = { tur: "zaman_baskisi", deger: skillDeger.baski };
        else if (onceki?.faz === faz && !onceki.ek_sure && data.ek_sure) efekt = { tur: "sure", deger: skillDeger.ek };
        else if (onceki?.faz === faz && !(onceki.elli_kapali?.length) && data.elli_kapali?.length) efekt = { tur: "elli" };
        else if (onceki?.faz === faz && onceki.soru_anahtar && data.soru?.soru && onceki.soru_anahtar !== data.soru.soru) efekt = { tur: "soru_degistir", asama: "giriyor" };
        if (data.surum !== 2) skillDurumRef.current = { faz, zaman_baskisi: Boolean(data.zaman_baskisi), ek_sure: Boolean(data.ek_sure), elli_kapali: data.elli_kapali, soru_anahtar: data.soru?.soru };
        if (efekt) {
          setSkillEfekt(efekt);
          clearTimeout(skillTimerRef.current);
          skillTimerRef.current = setTimeout(() => setSkillEfekt(null), 720);
        }
        // Saat farkı (980): istek/yanıt orta noktası + son 60 sn'nin en kısa gidiş-dönüşlü örneği (lib/zaman.js ›
        // saatFarkiOrnekle; Klasik nabiz.js ile aynı). Eskisi yanıt anı + en büyük farktı (dönüş gecikmesi kadar geride).
        const saat = saatFarkiOrnekle(farkOrnekRef.current, durumGonderildi, durumAlindi ?? Date.now(), data.sunucu_zamani);
        farkOrnekRef.current = saat.ornekler;
        farkRef.current = saat.fark;
        // Durum değişmediyse state'e yeni nesne yazılmaz: bütün maç ağacı boşuna
        // yeniden çizilmesin (sunucu_zamani her yanıtta farklıdır, karşılaştırmaya girmez).
        const imza = JSON.stringify({ ...data, sunucu_zamani: null });
        if (imza !== dImzaRef.current) {
          dImzaRef.current = imza;
          setD(data);
        }
        setYuklemeHatasi(null);
      }
      if (hataSayisiRef.current) {
        hataSayisiRef.current = 0;
        window.clearTimeout(yenidenDeneRef.current);
        yenidenDeneRef.current = null;
        setYenidenBaglaniyor(false);
      }
      if (!baglantiCevap) {
        // Bu okumada bağlantı sorulmadı: son değer geçerli.
      } else if (baglantiCevap.error) {
        console.warn("[Bildim] duello_baglanti başarısız:", baglantiCevap.error.message);
      } else {
        const b = baglantiCevap.data ?? null;
        setBaglanti(b ? { ...b, alindi: Date.now() } : null);
        // Kopukken geri sayım bandı sık tazelensin (sunucu kopukken fazları dondurur).
        if (b?.kopuk) sonBaglantiRef.current = Date.now() - BAGLANTI_MS + 1000;
      }
    } catch (e) {
      console.error("[Bildim] düello yüklenemedi:", e);
      // İlk okuma hiç gelmediyse "Tekrar dene" ekranı; maç ekrandaysa sahne son bilinen fazda kalır, bant çıkar.
      if (!dImzaRef.current) setYuklemeHatasi(true);
      setYenidenBaglaniyor(true);
      const n = hataSayisiRef.current++;
      if (!yenidenDeneRef.current) {
        const ms = HATA_GERI_CEKILME_MS[Math.min(n, HATA_GERI_CEKILME_MS.length - 1)];
        yenidenDeneRef.current = window.setTimeout(() => {
          yenidenDeneRef.current = null;
          yukleRef.current?.();
        }, ms);
      }
    } finally {
      yukleniyorRef.current = false;
    }
  }, [id, ceviri, skillDeger]);

  const yukle = useCallback(() => {
    if (yukleSozRef.current) {
      if (!tekrarSozRef.current) {
        tekrarSozRef.current = yukleSozRef.current.then(() => {
          tekrarSozRef.current = null;
          return yukleRef.current();
        });
      }
      return tekrarSozRef.current;
    }
    const soz = yukleTek().finally(() => { yukleSozRef.current = null; });
    yukleSozRef.current = soz;
    return soz;
  }, [yukleTek]);
  yukleRef.current = yukle;

  // İlk yükleme + Realtime sinyali + yoklama
  useEffect(() => {
    sesKilidiAc();
    yukle();
    const kanal = supabase
      .channel(`duello-${id}`)
      .on("postgres_changes",
          { event: "UPDATE", schema: "public", table: "duello_sinyal", filter: `duello_id=eq.${id}` },
          () => {
            // Aynı işlemde birden çok sinyal_ver çağrısı (ör. cevap + çözümleme) sinyalleri
            // aynı anda getirir: SINYAL_BIRLESTIR_MS içinde gelenler tek okumada birleşir.
            if (sinyalZamanRef.current) return;
            sinyalZamanRef.current = setTimeout(() => { sinyalZamanRef.current = null; yukle(); }, SINYAL_BIRLESTIR_MS);
          })
      // 542: rakibin (ya da botun) tepkisi — alıcı sınırı ve gizleme useMacTepki'de
      .on("broadcast", { event: "tepki" }, (m) => { try { tepkiAlRef.current?.(m?.payload); } catch { /* tepki maçı bozmaz */ } })
      // 680: saldıranın kategori kartına canlı dokunuşu (DB'ye yazılmaz; yalnız aynı tur + kategori fazında gösterilir)
      .on("broadcast", { event: "dokunus" }, (m) => { try { dokunusAlRef.current?.(m?.payload); } catch { /* dokunuş maçı bozmaz */ } })
      .subscribe((durum) => {
        const hazir = durum === "SUBSCRIBED";
        // Kanal (yeniden) bağlandığında arada kaçmış sinyal olabilir: bir kez tazele.
        if (hazir && !kanalHazirRef.current) yukle();
        kanalHazirRef.current = hazir;
      });
    duelloKanalRef.current = kanal;
    // Yedek yoklama: kanal bağlıyken seyrek, değilken saniyede bir. Son okumadan beri
    // geçen süreye bakılır — sinyal ya da eylemle yeni okunduysa yoklama atlanır.
    const yoklama = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      if (hataSayisiRef.current) return;   // 760: hata sürerken yalnız geri çekilmeli yeniden deneme çalışır
      const kalanMs = fazBitisRef.current == null ? Infinity : fazBitisRef.current - (Date.now() + farkRef.current);
      const bitiseYakin = kalanMs <= SON_YOKLAMA_PENCERE_MS && kalanMs > -2000;
      const gecikmis = kalanMs <= -2000 && kalanMs > -GECIKMIS_PENCERE_MS;
      const aralik = bitiseYakin ? SON_YOKLAMA_MS
        : kanalHazirRef.current ? (gecikmis ? GECIKMIS_YOKLAMA_MS : YEDEK_YOKLAMA_MS) : KANALSIZ_YOKLAMA_MS;
      if (Date.now() - sonYukleRef.current >= aralik - 50) yukle();
    }, SON_YOKLAMA_MS);
    // 760: sayfa öne gelince / bfcache'ten dönünce / ağ geri gelince HEMEN sunucudan tazele (iOS Safari arka planda
    // zamanlayıcıları askıya alır; dönüşte eski faz ve eski geri sayım ekranda kalmasın). Bekleyen yeniden deneme iptal.
    const tazeleHemen = () => {
      if (document.visibilityState !== "visible") return;
      window.clearTimeout(yenidenDeneRef.current);
      yenidenDeneRef.current = null;
      yukle();
    };
    const gorunur = () => { if (document.visibilityState === "visible") tazeleHemen(); };
    document.addEventListener("visibilitychange", gorunur);
    window.addEventListener("pageshow", tazeleHemen);
    window.addEventListener("online", tazeleHemen);
    const saat = setInterval(() => setSimdi(Date.now()), 200);
    return () => {
      clearInterval(yoklama);
      clearInterval(saat);
      window.clearTimeout(yenidenDeneRef.current);
      yenidenDeneRef.current = null;
      document.removeEventListener("visibilitychange", gorunur);
      window.removeEventListener("pageshow", tazeleHemen);
      window.removeEventListener("online", tazeleHemen);
      clearTimeout(skillTimerRef.current);
      clearTimeout(sinyalZamanRef.current);
      sinyalZamanRef.current = null;
      clearTimeout(dokunusGonderRef.current.bekleyen);
      dokunusGonderRef.current.bekleyen = null;
      kanalHazirRef.current = false;
      if (duelloKanalRef.current === kanal) duelloKanalRef.current = null;
      supabase.removeChannel(kanal);
    };
  }, [id, yukle]);

  // Faz bitişinde tek okuma: sunucu fazı tembel ilerletir (okuyan ilk çağrı ya da 2 sn'lik
  // cron). Bitiş anında iki istemci de okur → yeni faz iki ekrana aynı anda gelir.
  // Anahtar: "c|bitiş1|bitiş2" (cevap fazı: iki kişisel bitişin geç olanı + tolerans) ya da "f|faz_bitis".
  // 760: rakip (ya da ben) kopukken sunucu fazı dondurur ve her ilerletmede bitişi ileri iter — bu bitiş
  // gerçek değildir: zamanlayıcı kurulmaz, bitişe yakın sık yoklama da yapılmaz (dönüşte sinyal/yoklama getirir).
  const bitisAnahtar = d?.durum === "aktif" && !d.kopuk
    ? d.faz === "cevap" && d.cevap
      ? `c|${d.cevap.benim_bitis}|${d.cevap.rakip_bitis}`
      : `f|${d.faz_bitis}`
    : "";
  useEffect(() => {
    if (!bitisAnahtar) { fazBitisRef.current = null; return undefined; }
    const [tur, ...zamanlar] = bitisAnahtar.split("|");
    const t = zamanlar.map((x) => new Date(x).getTime()).filter(Number.isFinite);
    if (!t.length) { fazBitisRef.current = null; return undefined; }
    const hedef = Math.max(...t) + (tur === "c" ? CEVAP_TOLERANS_MS : 60);
    fazBitisRef.current = hedef;   // yedek yoklama bitişe yakın sıklaşsın
    const bekleMs = hedef - (Date.now() + farkRef.current);
    if (bekleMs < -2000 || bekleMs > 10 * 60 * 1000) return undefined;
    const zaman = setTimeout(() => { if (document.visibilityState === "visible") yukle(); }, Math.max(0, bekleMs));
    return () => clearTimeout(zaman);
  }, [bitisAnahtar, yukle]);

  // ---------------- Paket 28 A: düellonun kendi nabzı ----------------
  //
  // KUSUR: paylaşılan kabuk (AuthContext) `kalp_at()`i 60 SANİYEDE BİR atıyor,
  // düellonun kopukluk eşiği ise 25 saniye. 60 > 25 olduğu için iki nabız
  // arasında 35 saniyelik bir pencere vardı ve o pencerede TAMAMEN BAĞLI bir
  // oyuncu "kopuk" sayılıyordu — düello açılır açılmaz turuncu "Bağlantın
  // koptu" bandı çıkıyordu. Üstelik 45 sn'lik bekleme dolarsa bağlı oyuncu
  // maçı HAKSIZ YERE kaybedebilirdi.
  //
  // KURAL: nabız aralığı kopukluk eşiğinin yarısından küçük olmalı. Bu ilişkiyi
  // istemci değil SUNUCU garantiliyor: `duello_durum().sureler.nabiz` değeri
  // `duello_nabiz_sn()` ile her zaman eşiğin yarısına kırpılıyor. Buradaki 10
  // yalnız sunucu henüz cevap vermemişken kullanılan ilk değer.
  const nabizSn = Number(d?.sureler?.nabiz) > 0 ? Number(d.sureler.nabiz) : 10;
  useEffect(() => {
    if (!id) return undefined;
    let durdu = false;
    const at = async () => {
      if (durdu || document.visibilityState !== "visible") return;
      try {
        await supabase.rpc("kalp_at");
      } catch (e) {
        // Ağ dalgalanması: bir sonraki nabız zaten deneyecek.
        console.warn("[Bildim] düello nabzı atılamadı:", e?.message ?? e);
      }
    };
    at();                                   // ekran açılır açılmaz bir kez
    const zaman = setInterval(at, nabizSn * 1000);
    document.addEventListener("visibilitychange", at);
    window.addEventListener("pageshow", at);   // 760: bfcache dönüşü ve ağ geri gelişi de nabız atar
    window.addEventListener("online", at);
    return () => {
      durdu = true;
      clearInterval(zaman);
      document.removeEventListener("visibilitychange", at);
      window.removeEventListener("pageshow", at);
      window.removeEventListener("online", at);
    };
  }, [id, nabizSn]);

  // Faz değişince yerel seçim sıfırlanır
  // 960: seçim fazında faz/tur aynı kalır, her seçim yeni anahtar (secim.sira).
  const fazAnahtari = d ? `${d.tur}-${d.saldiri_sirasi}-${d.faz}-${d.soru?.soru ?? ""}${d.faz === "secim" ? `-s${d.secim?.sira ?? 0}` : ""}` : "";
  useEffect(() => { setSecim(null); setIkinciSansElendi([]); setHata(null); setBanSecilen(null); setBanBasilan(null); setBanUyari(null); setSecimBasilan(null); }, [fazAnahtari]);

  // ---------------- 680 · Hâkimiyet: canlı dokunuş, kart sıçraması ----------------
  const benSaldiranH = d ? d.saldiran === d.ben : false;
  const kategoriFazi = d?.faz === "kategori" && d?.durum === "aktif";
  const uygunAnahtar = Array.isArray(d?.uygun_kategoriler) ? d.uygun_kategoriler.join(",") : "";
  useEffect(() => {
    if (!kategoriFazi) return;
    setKatSecim(null);
    setDokunus(null);
    // Yalnız yeni kategori fazı (tur/faz anahtarı) değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fazAnahtari, kategoriFazi, benSaldiranH]);
  // Faz kategori dışına çıkınca seçim sıfırlanır (cevap/sonuç fazında eski seçim kalmasın).
  useEffect(() => { if (d && d.faz !== "kategori") { setKatSecim(null); setDokunus(null); } }, [d?.faz]); // eslint-disable-line react-hooks/exhaustive-deps

  // Canlı dokunuş — gönderme (saldıran, en çok ~150 ms'de bir; son değer mutlaka gider). Kanal hatası maçı bozmaz.
  const dokunusYolla = useCallback((kategori, tur) => {
    const g = dokunusGonderRef.current;
    g.kategori = { kategori, tur };
    const gonder = () => {
      g.bekleyen = null;
      g.zaman = Date.now();
      try {
        const ch = duelloKanalRef.current;
        if (ch && g.kategori) Promise.resolve(ch.send({ type: "broadcast", event: "dokunus", payload: g.kategori })).catch(() => {});
      } catch { /* dokunuş maçı bozmaz */ }
    };
    const gecen = Date.now() - g.zaman;
    if (gecen >= 150) { clearTimeout(g.bekleyen); gonder(); }
    else if (!g.bekleyen) g.bekleyen = setTimeout(gonder, 150 - gecen);
  }, []);
  useEffect(() => {
    if (kategoriFazi && benSaldiranH && katSecim) dokunusYolla(katSecim, d.tur);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [katSecim, kategoriFazi, benSaldiranH]);
  // Alma: yalnız savunanken, aynı tur ve kategori fazındayken gösterilir.
  dokunusAlRef.current = (p) => {
    if (!p || typeof p.kategori !== "string" || typeof p.tur !== "number") return;
    setDokunus({ kategori: p.kategori, tur: p.tur });
  };

  // Kartlar el değiştirince (sahiplik farkı) sıçrasın; kartlar görününceye kadar bekler, ~1 sn sonra temizlenir.
  const sahiplikAnahtar = d?.hakimiyet?.acik ? JSON.stringify(d.hakimiyet.sahiplik ?? {}) : null;
  useEffect(() => {
    if (sahiplikAnahtar === null) return;
    const simdiki = JSON.parse(sahiplikAnahtar);
    const onceki = sahiplikOncekiRef.current;
    sahiplikOncekiRef.current = simdiki;
    if (!onceki) return;
    const degisen = [...new Set([...Object.keys(simdiki), ...Object.keys(onceki)])].filter((k) => simdiki[k] !== onceki[k]);
    if (degisen.length) setZipla((z) => [...new Set([...z, ...degisen])]);
  }, [sahiplikAnahtar]);
  useEffect(() => {
    if (!kategoriFazi || !zipla.length) return undefined;
    const t = setTimeout(() => setZipla([]), 1000);
    return () => clearTimeout(t);
  }, [kategoriFazi, zipla]);

  // Hamle sonucu sesi
  useEffect(() => {
    const h = d?.son_hamle;
    if (!h || d.faz !== "sonuc") return;
    const anahtar = `${h.tur}-${h.saldiran}-${h.soru_id}`;
    if (sonHamleRef.current === anahtar) return;
    sonHamleRef.current = anahtar;
    // Ses kendi cevabına göre: doğru bildiysen doğru sesi, değilse yanlış sesi.
    if (h.cevaplar?.[d.ben]?.dogru) { sesDogru(); titret(10); } else { sesYanlis(); titret(40); }
  }, [d]);

  // Maç sonu sesi + coin/profil tazeleme
  useEffect(() => {
    if (!d || d.durum !== "bitti" || bitisSesRef.current) return;
    bitisSesRef.current = true;
    // A.3: sonuç sesi yalnız maç sonu sahnesinde (MacSonuKutlama) — burada da çalsaydı aynı ses üst üste gelirdi.
    // Coin sayacını sahnenin coin uçuşu bitince tazeler (coinTazele)
    refreshProfile?.(user?.id);
  }, [d, refreshProfile, user?.id]);

  // Rövanş kabul edildiyse iki taraf da yeni düelloya geçer
  useEffect(() => {
    if (d?.rovans?.id && d.rovans.id !== id) navigate(y(`/duello/${d.rovans.id}`), { replace: true });
  }, [d?.rovans?.id, id, navigate]);

  // Paket 30 C: rövanş süresi koda gömülmez — sunucunun kullandığı ayar okunur.
  useEffect(() => {
    let aktif = true;
    ayar("duello_rovans_sn", 60).then((sn) => { if (aktif && sn > 0) setRovSn(sn); }, () => {});
    return () => { aktif = false; };
  }, []);

  // Paket 30 C: bekleme başladı / bitti. Bitişin iki sebebi ayrılır:
  //   - isteyen hâlâ ben ama `gecerli` düştü → süre doldu, rakip yanıt vermedi
  //   - isteyen boşaldı → rakip reddetti (duello_rovans_yanitla false)
  // Kabul edilirse `rovans.id` gelir ve yukarıdaki etki yeni düelloya geçirir.
  const rovIsteyen = d?.rovans?.isteyen ?? null;
  const rovGecerli = Boolean(d?.rovans?.gecerli);
  const rovId = d?.rovans?.id ?? null;
  const benIstedim = Boolean(d && rovIsteyen === d.ben && rovGecerli && !rovId);
  useEffect(() => {
    if (benIstedim) {
      if (rovBas == null && !rovVazgec) setRovBas(Date.now());   // sayfa yeniden açıldıysa ilk görüldüğü an
      return;
    }
    if (rovBas == null || rovId) { if (rovId) setRovBas(null); return; }
    setRovBas(null);
    if (!rovVazgec) setRovSonuc(rovIsteyen == null ? "red" : "cevapsiz");
  }, [benIstedim, rovBas, rovVazgec, rovId, rovIsteyen]);

  const rovansIste = () => {
    setRovVazgec(false);
    setRovSonuc(null);
    setRovBas(Date.now());
    eylem("rovans", "duello_rovans_iste", {}).then((tamam) => { if (!tamam) setRovBas(null); });
  };

  // Düello 1.0 cevap fazında sayaç KİŞİSEL bitiştir (Ek Süre / Zaman Baskısı kişiye özel);
  // öteki fazlarda ortak faz_bitis. İkisi de sunucu saatine göre (farkRef).
  const hedefBitis = d?.surum === 2 && d?.faz === "cevap" && d?.cevap?.benim_bitis ? d.cevap.benim_bitis : d?.faz_bitis;
  // 325: sunucu faz bitişine gösterim payı ekler; sayaç `gosterim_bas`a kadar TAM süreyi
  // gösterir, sonra gerçek zamanla akar. Ekran fazı geç görse de sayaç yetişmek için hızlanmaz.
  const gosterimBas = d?.sureler?.gosterim_bas && ["kategori", "cevap", "ban", "secim"].includes(d?.faz)
    ? new Date(d.sureler.gosterim_bas).getTime() : null;
  const kalanSn = useMemo(() => {
    if (!hedefBitis) return 0;
    // `simdi` yalnız yeniden hesaplama tetikleyicisi: 200 ms bayat olabilir; rakam sınırı ve ilk-rakam kesri
    // (gosterSn) render anının gerçek saatine göre hesaplanır.
    const sunucuSimdi = Math.max(simdi, Date.now()) + farkRef.current;
    const bas = gosterimBas ? Math.max(sunucuSimdi, gosterimBas) : sunucuSimdi;
    return Math.max(0, (new Date(hedefBitis).getTime() - bas) / 1000);
  }, [hedefBitis, gosterimBas, simdi]);
  // GÖSTERİLEN sayaç (rakam, ses, son-3-sn vurgusu): faz ekrana geç geldiyse ilk rakam kesirle başlar
  // (ör. 13,12 sn kaldı → "14" yalnız 0,12 sn görünür = "hızlı" adım). Kesir fazın İLK göründüğü anda bir kez
  // alınır, sonra kalanla orantılı erir (lib/zaman.js › sayacGoster): ilk rakam tam saniye kalır, rakamlar hiçbir
  // yerde 1 sn'den kısa olmaz ve gösterilen 0, gerçek bitişle AYNI anda gelir. Mantık (süre bitti, şık kilidi,
  // sunucu toleransı) gerçek kalanSn ile aynen çalışır. Ek Süre / Zaman Baskısı / Soru Değiştir aynı fazda
  // kaymayı yeniden hesaplamaz.
  // Saat farkı tahmini (farkRef) yeni örnekle birden ~10–70 ms sıçrayabilir (sayacı o kadar ileri atar; rakam sınırına
  // denk gelirse 16–900 ms'lik "hızlı" adım). Gösterim için fark en çok %5 hızla (50 ms/sn) yeni değere kaydırılır:
  // rakam süreleri ≥ ~950 ms kalır. Yalnız gösterim: mantık gerçek kalanSn'de. Ek Süre / Zaman Baskısı hedef bitişi
  // değiştirir, saat farkını değil — bunlar anında yansır.
  const farkGosterRef = useRef(null);
  const fazKaymaRef = useRef({ anahtar: null, k0: 0, kayma: 0 });
  const kalanGoster = useMemo(() => {
    if (!(kalanSn > 0)) return 0;
    const an = Date.now();
    const fg = farkGosterRef.current;
    if (!fg) farkGosterRef.current = { fark: farkRef.current, an };
    else {
      const izin = 0.05 * Math.max(0, an - fg.an);
      fg.fark += Math.max(-izin, Math.min(izin, farkRef.current - fg.fark));
      fg.an = an;
    }
    const gosterimPayinda = gosterimBas && an + farkRef.current < gosterimBas;   // pay: sayaç sabit, kaydırma yok
    return gosterimPayinda ? kalanSn : Math.max(0, kalanSn + (farkRef.current - farkGosterRef.current.fark) / 1000);
  }, [kalanSn, gosterimBas]);
  // 760: kopuklukta sunucu kalan süreyi dondurur (kopuk_kalan, en az duello_kopuk_taban_sn) ve dönüşte fazı
  // tam o kalanla sürdürür. Ekran da aynı donuk değeri gösterir: itilen bitiş yüzünden sayaç tekrar tekrar
  // "3"ten başlamaz (30 Eyl gece ~22 kez başlamıştı); dönüşte kaldığı rakamdan akar.
  const kopukDonukSn = d?.kopuk && Number.isFinite(Number(d.kopuk.faz_kalan_sn)) ? Math.max(0, Number(d.kopuk.faz_kalan_sn)) : null;
  const gosterSn = useMemo(() => {
    if (kopukDonukSn != null) return kopukDonukSn;
    if (!(kalanSn > 0) || !d) return 0;
    const anahtar = `${d.tur}-${d.saldiri_sirasi}-${d.uzatma ?? ""}-${d.faz}-${d.faz === "secim" ? d.secim?.sira : ""}`;
    if (fazKaymaRef.current.anahtar !== anahtar) fazKaymaRef.current = { anahtar, ...sayacKaymasi(kalanGoster) };
    return sayacGoster(kalanGoster, fazKaymaRef.current);
  }, [kalanGoster, kalanSn, kopukDonukSn, d?.tur, d?.saldiri_sirasi, d?.uzatma, d?.faz, d?.secim?.sira]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Rakam tam saniye sınırında değişsin: 200 ms'lik saat tikine ek olarak bir sonraki
  // sınıra kurulmuş tek zamanlayıcı (adımlar 800/1200 ms diye titremez).
  useEffect(() => {
    if (kalanSn <= 0 || kopukDonukSn != null) return undefined;
    const bekle = sayacSinirMs(kalanGoster, fazKaymaRef.current);
    const zaman = setTimeout(() => setSimdi(Date.now()), bekle + 5);
    return () => clearTimeout(zaman);
  }, [kalanSn, kalanGoster, gosterSn]);

  // Tanı paneli (?tani=1): şıkları kapatan koşullar her an okunabilsin.
  useEffect(() => {
    if (!d) return undefined;
    window.__bdTani = {
      mod: "duello", surum: d.surum, faz: d.faz,
      kilitli: Boolean(d.cevap?.ben_cevapladim), sureBitti: kalanSn <= 0,
      secim, calisan, kalanSn: Math.round(kalanSn * 10) / 10,
      benimBitis: d.cevap?.benim_bitis ?? null, farkMs: Math.round(farkRef.current),
      hedefBitis: hedefBitis ?? null, sureler: d.sureler ?? null,
    };
    return () => { delete window.__bdTani; };
  }, [d, kalanSn, secim, calisan]);

  // Son 3 saniyede tik
  useEffect(() => {
    if (!d || d.durum !== "aktif" || !["cevap", "altin"].includes(d.faz)) return;   // maç sonu ekranında tik yok
    if (d.surum === 2 && d.cevap?.ben_cevapladim) return;   // cevabı kilitleyene tik çalınmaz
    const sn = Math.ceil(gosterSn);
    // 980: anahtar faz + rakam (yalnız rakam değil) — aynı fazda sayaç geri sıçrasa da aynı saniye ikinci kez çalmaz;
    // gizli sekmede çalmaz (dönüşte birikmiş tik'ler arka arkaya patlamasın)
    if (sonTikRef.current?.faz !== fazAnahtari) sonTikRef.current = { faz: fazAnahtari, calinan: new Set() };
    const t = sonTikRef.current;
    if (sn > 0 && sn <= 3 && !t.calinan.has(sn) && document.visibilityState === "visible") { t.calinan.add(sn); sesTik(sn); }
  }, [gosterSn, d, fazAnahtari]);

  // ---------------- Düello 1.0: ses + görsel anlar (Tasarım A) ----------------
  // Yalnız sunum: durum akışına, RPC'lere, kilitlere dokunmaz. Her ses bir ref
  // korumasıyla bir kez çalar (StrictMode çift efekti çift ses vermez).
  useEffect(() => { sesOnYukle("duello"); sesOnYukle("mac"); sesOnYukle("skill"); }, []);

  // Kategori seçimi geri sayımı: rakam her değiştiğinde ses; son 3 sn "bong".
  const v2Aktif = d?.surum === 2 && d?.durum === "aktif";
  const kategoriSn = v2Aktif && d.faz === "kategori" ? Math.ceil(gosterSn) : 0;
  useEffect(() => {
    if (kategoriSn <= 0 || kategoriSn > KATEGORI_SES_ESIK_SN) return;
    const anahtar = `${fazAnahtari}:${kategoriSn}`;
    if (sayimRef.current === anahtar) return;
    sayimRef.current = anahtar;
    sesKategoriGeriSayim(kategoriSn);
  }, [kategoriSn, fazAnahtari]);

  // Ban fazı geri sayımı: son 3 sn "bong" (iki tarafa); savunan henüz banlamadıysa son 2 sn'de titreşim de.
  const banSn = v2Aktif && d.faz === "ban" ? Math.ceil(gosterSn) : 0;
  const banBekliyorum = v2Aktif && d.faz === "ban" && d.saldiran !== d.ben && !banSecilen && !banBasilan;
  // 900 · erken ilerleme: savunan dokunduysa faz sunucuda hemen kapanır — yanıt gelene dek sayaç durur, bong çalmaz.
  const banDokundum = v2Aktif && d.faz === "ban" && d.saldiran !== d.ben && Boolean(banSecilen || banBasilan);
  useEffect(() => {
    if (banSn <= 0 || banSn > 3 || banDokundum) return;
    const anahtar = `${fazAnahtari}:${banSn}`;
    if (banSayimRef.current === anahtar) return;
    banSayimRef.current = anahtar;
    sesKategoriGeriSayim(banSn);
    if (banBekliyorum && banSn <= 2) titret(banSn === 1 ? [20, 40, 20] : 20);
  }, [banSn, fazAnahtari, banBekliyorum, banDokundum]);

  // 960 · seçim fazı: sıra bana geçince bir kez ses + titreşim; benim sıramda son 3 sn "bong", son 2 sn titreşim.
  const secimFazi = v2Aktif && d.faz === "secim";
  const secimBende = secimFazi && d.saldiran === d.ben;
  const secimSn = secimFazi ? Math.ceil(gosterSn) : 0;
  useEffect(() => {
    if (!secimBende || secimBasilan) return;
    const anahtar = `${id}:${d.secim?.sira}`;
    if (secimSiraRef.current !== anahtar) { secimSiraRef.current = anahtar; sesTurGecis(); titret(20); }
    if (secimSn <= 0 || secimSn > 3) return;
    const sayimAnahtar = `${anahtar}:${secimSn}`;
    if (secimSayimRef.current === sayimAnahtar) return;
    secimSayimRef.current = sayimAnahtar;
    sesKategoriGeriSayim(secimSn);
    if (secimSn <= 2) titret(secimSn === 1 ? [20, 40, 20] : 20);
  }, [secimBende, secimSn, secimBasilan, d?.secim?.sira, id]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Seçim bitti → tur 1: HÂKİMİYET BAŞLIYOR geçişi (tur bandı yerine; tur 1 ban fazının açılış payı içinde).
  useEffect(() => {
    if (!hkBasla) return undefined;
    const t = setTimeout(() => setHkBasla(null), HAKIMIYET_GECIS_MS);
    return () => clearTimeout(t);
  }, [hkBasla]);

  // Tur geçişi ve yeni soru: geçiş sesi animasyonun başladığı karede; soru sesi
  // kart göründüğü karede. Sonuç → doğrudan yeni soru (uzatma) ise ikisi arası 300 ms.
  const soruMetni = d?.soru?.soru ?? null;
  const gecisFaz = v2Aktif ? d.faz : null;
  const gecisTur = `${d?.tur}-${d?.saldiri_sirasi}-${d?.uzatma}`;
  useEffect(() => {
    if (!gecisFaz) return;
    const onceki = gecisRef.current;
    const simdiki = { faz: gecisFaz, tur: gecisTur, soru: soruMetni };
    gecisRef.current = simdiki;
    if (onceki && onceki.faz === simdiki.faz && onceki.tur === simdiki.tur && onceki.soru === simdiki.soru) return;
    // 853: tur "ban" fazıyla açılır (bayrak kapalıysa doğrudan "kategori"); ban → kategori aynı turdur, geçiş yinelenmez.
    const turBasi = (f) => f === "kategori" || f === "ban";
    if (turBasi(gecisFaz) && onceki?.faz === "secim") {
      // 960: seçim bitti → tur bandı yerine HÂKİMİYET BAŞLIYOR geçişi
      sesTurGecis();
      titret([20, 40, 30]);
      setHkBasla(Date.now());
    } else if (turBasi(gecisFaz) && onceki && (!turBasi(onceki.faz) || onceki.tur !== gecisTur)) {
      sesTurGecis();
      setTurGecis(Date.now());
    } else if (gecisFaz === "cevap" && soruMetni && (!onceki || onceki.soru !== soruMetni || onceki.faz !== "cevap")) {
      if (onceki?.faz === "sonuc") {
        sesTurGecis();
        setTurGecis(Date.now());
        clearTimeout(soruSesTimerRef.current);
        soruSesTimerRef.current = setTimeout(() => sesSoruGeldi(), 300);
      } else if (onceki?.faz === "kategori") {
        // Ajan H: kategori kesinleşti → kısa onay sesi, soru sesi 300 ms sonra (üst üste binmesin).
        sesKategoriSecildi();
        clearTimeout(soruSesTimerRef.current);
        soruSesTimerRef.current = setTimeout(() => sesSoruGeldi(), 300);
      } else sesSoruGeldi();
    }
  }, [gecisFaz, gecisTur, soruMetni]);
  useEffect(() => () => clearTimeout(soruSesTimerRef.current), []);

  // Ajan H: rakip cevabını verdi (ben hâlâ düşünürken) — soru başına bir kez.
  const rakipCevapAnahtari = v2Aktif && d.faz === "cevap" && d.cevap?.rakip_cevapladi && !d.cevap?.ben_cevapladim
    ? `${gecisTur}:${soruMetni}` : null;
  const rakipCevapRef = useRef(null);
  useEffect(() => {
    if (!rakipCevapAnahtari || rakipCevapRef.current === rakipCevapAnahtari) return;
    rakipCevapRef.current = rakipCevapAnahtari;
    sesRakipCevapladi();
  }, [rakipCevapAnahtari]);

  // 50:50 anı: kapanan iki şık kırılıp düşer, QT_KIRILMA_MS sonra "elendi" olur.
  // Rakibin Zaman Baskısı: skill sesi + titreşim (sayaçta "−N" balonu).
  useEffect(() => {
    if (!skillEfekt || d?.surum !== 2) return;
    if (skillEfekt.tur === "zaman_baskisi") { sesSkill("zaman_baskisi"); titret(30); }
    if (skillEfekt.tur !== "elli") return;
    const kapali = Array.isArray(d.cevap?.elli_kapali) ? d.cevap.elli_kapali.map(Number) : [];
    setKiriliyor(kapali);
    clearTimeout(kirilmaTimerRef.current);
    kirilmaTimerRef.current = setTimeout(() => setKiriliyor([]), QT_KIRILMA_MS);
    // Yalnız yeni efekt geldiğinde (d her saniye yenilenir)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillEfekt]);
  useEffect(() => () => clearTimeout(kirilmaTimerRef.current), []);

  const eylem = async (ad, fn, params) => {
    setHata(null);
    setCalisan(ad);
    try {
      // Zaman aşımında (57014 / AbortError / timed out / gateway timeout) en çok 2 kez yeniden dene (1 sn, 2 sn).
      // Bu dört RPC sunucuda idempotenttir (rövanş iste/iptal/yanıtla, terk: ikinci çağrı ikinci etki doğurmaz);
      // hamle/cevap/joker/kategori bu yoldan GEÇMEZ ve yeniden denenmez. Tur/faz ilerlediyse ya da maç bittiyse bırakılır.
      const bas = dGuncelRef.current;
      const { error } = await zamanAsimindaYenidenDene(() => supabase.rpc(fn, { p_id: id, ...params }), {
        vazgec: () => {
          const su = dGuncelRef.current;
          return Boolean(bas && su && (su.durum !== bas.durum || su.tur !== bas.tur || su.faz !== bas.faz));
        },
      });
      if (error) throw error;
      await yukle();
      return true;
    } catch (e) {
      setHata(ceviri(hataMesaji(e)));
      return false;
    } finally {
      setCalisan(null);
    }
  };

  // Cevap gönderimi — eski ve Düello 1.0 arayüzü aynı RPC'yi (duello_cevap) çağırır.
  // v2'de sunucu doğru/yanlışı burada SÖYLEMEZ; yalnız İkinci Şans'ın tekrar hakkı döner.
  const cevapVer = async (i) => {
    sesDokunus(); titret(10);
    setSecim(i);
    setHata(null);
    setCalisan("cevap");
    try {
      const { data, error } = await supabase.rpc("duello_cevap", { p_id: id, p_cevap: i });
      if (error) throw error;
      if (data?.tekrar_hakki) {
        sesYanlis(); titret(18);
        setIkinciSansElendi((onceki) => [...new Set([...onceki, i])]);
        setSkillEfekt({ tur: "ikinci_sans" });
        clearTimeout(skillTimerRef.current);
        skillTimerRef.current = setTimeout(() => setSkillEfekt(null), 680);
        setTimeout(() => setSecim(null), 260);
      }
      await yukle();
    } catch (e) {
      setHata(ceviri(hataMesaji(e)));
      setSecim(null);
    } finally {
      setCalisan(null);
    }
  };

  // Düello 1.0 skill kullanımı. Envanterde varsa (ya da skill'ler serbestse) doğrudan
  // kullanılır; yoksa satın alma onayı açılır (JokerSatinAlModal → al + kullan tek RPC).
  const v2SkillKullan = async (tur, { satinAl }) => {
    if (satinAl) { setSatinAlinacak({ tur, yalnizAl: false }); return; }
    setHata(null);
    setCalisan(`joker-${tur}`);
    try {
      let sonuc;
      if (tur === "ikinci_sans") {
        sonuc = await supabase.rpc("skill_hazirla", { p_mac_tur: "duello", p_mac_id: id, p_soru_index: null, p_tur: tur });
      } else {
        // Envanterde var ya da serbest mod: joker_al_ve_kullan'ın kullanım kolunun aynısı
        // (surum = 2 maçta ikisi de duello2_skill'e gider). Satın alma yalnız onaylı pencereden.
        sonuc = await supabase.rpc(tur === "zaman_baskisi" ? "duello_saldiri_jokeri" : "duello_savunma_jokeri", { p_id: id, p_tur: tur });
      }
      if (sonuc.error) throw sonuc.error;
      // Kullanma anı: skill'in kendi sesi + düğmede patlama/halka (aynı kare)
      sesSkill(tur); titret(10);
      setSonKullanilan({ tur, anahtar: Date.now() });
      await yukle();
    } catch (e) {
      setHata(ceviri(hataMesaji(e)));
    } finally {
      setCalisan(null);
    }
  };

  // Kategori seçimi (alt çubuktaki eylem düğmesi). Kategori tam o an kilitlendiyse sunucu "Bu kategori
  // şu an seçilemez" döner — ham hata yerine ekran tazelenir.
  const kategoriSec = async (k) => {
    sesDokunus();
    setHata(null);
    setCalisan("kategori");
    try {
      const { error } = await supabase.rpc("duello_kategori_sec", { p_id: id, p_kategori: k });
      if (error) throw error;
      await yukle();
    } catch (e) {
      if (/şu an seçilemez/i.test(e?.message ?? "")) yukle().catch(() => {});
      else setHata(ceviri(hataMesaji(e)));
    } finally {
      setCalisan(null);
    }
  };

  // 960 · seçim fazı: sıra bendeyken karta dokununca seçer (tek dokunuş; yılan sırası, süre ve çift seçim reddi sunucuda —
  // mevcut duello_kategori_sec RPC'si). Süre tam o an dolduysa / kart az önce alındıysa ham hata yerine ekran tazelenir.
  const secimYap = async (k) => {
    sesDokunus(); titret(8);
    setHata(null);
    setSecimBasilan(k);
    setCalisan("secim");
    try {
      const { error } = await supabase.rpc("duello_kategori_sec", { p_id: id, p_kategori: k });
      if (error) throw error;
      await yukle();
    } catch (e) {
      setSecimBasilan(null);
      if (/seçim sırası sende değil|zaten alındı|şu an seçilemez/i.test(e?.message ?? "")) yukle().catch(() => {});
      else setHata(ceviri(hataMesaji(e)));
    } finally {
      setCalisan(null);
    }
  };

  // 853 · savunma banı: savunan ban fazında karta dokununca banlar (tek dokunuş; kural sunucuda). Süre tam o an
  // dolduysa sunucu "ban sırası sende değil" der — ham hata yerine ekran tazelenir. Yeniden denenmez.
  const banSec = async (k) => {
    sesDokunus(); titret(8);
    setHata(null);
    setBanBasilan(k);   // anında geri bildirim: kart dolu kırmızı, durum satırı "Banladın: X"
    setCalisan("ban");
    try {
      const { error } = await supabase.rpc("duello_ban_sec", { p_id: id, p_kategori: k });
      if (error) throw error;
      setBanSecilen(k);
      await yukle();
    } catch (e) {
      setBanBasilan(null);
      if (/ban sırası sende değil/i.test(e?.message ?? "")) yukle().catch(() => {});
      else setHata(ceviri(hataMesaji(e)));
    } finally {
      setCalisan(null);
    }
  };

  // 680: karta dokunuş. Saldıran: seçer (onay alt çubukta). Savunanda kartlar yalnız bilgidir.
  const kartaDokun = (k) => {
    if (d?.saldiran !== d?.ben) return;
    sesDokunus(); titret(8);
    setKatSecim(k);
  };

  const rovansVazgec = async () => {
    const tamam = await eylem("rovans-iptal", "duello_rovans_iptal", {});
    if (tamam) {
      setRovVazgec(true);
      setRovBas(null);
    }
  };

  if (!d) {
    return (
      <div className="m2-mac qt-sahne-mac qt-sahne-gok">
        {/* Paket 41 G: Klasik ile aynı kalıp — Tekrar dene + çıkış, ham metin yok */}
        {yuklemeHatasi ? (
          <MacYukleniyor hata={yuklemeHatasi} onTekrarDene={() => { setYuklemeHatasi(null); yukle(); }}
                         donusYolu={y("/duello")} donusMetni={ceviri("Düello'ya dön")} />
        ) : (
          <div className="m2-yukleniyor" aria-busy="true" aria-label={ceviri("Yükleniyor…")}>
            <span className="m2-yukleniyor-ikon" aria-hidden="true"><QtIkon ad="duello" boyut={36} /></span>
          </div>
        )}
      </div>
    );
  }

  if (Number(d.surum ?? 1) > DUELLO_EN_YUKSEK_SURUM) {
    return (
      <div className="m2-surum">
        <QtBosDurum ikon="uyari" ton="yanlis"
                    baslik={ceviri("Oyunun yeni sürümü var. Maça devam etmek için sayfayı yenile.")}
                    eylem={<QtDugme ikon="yenile" onClick={() => window.location.reload()}>{ceviri("Yenile")}</QtDugme>} />
      </div>
    );
  }

  const ben = d.oyuncular.find((o) => o.id === d.ben) ?? d.oyuncular[0];
  const rakip = d.oyuncular.find((o) => o.id !== d.ben) ?? d.oyuncular[1];
  const benSaldiran = d.saldiran === d.ben;
  const secenekler = d.soru ? (Array.isArray(d.soru.secenekler) ? d.soru.secenekler : JSON.parse(d.soru.secenekler)) : [];
  const ezeliMetin = d.ezeli
    ? d.ezeli.ben > d.ezeli.rakip
      ? ceviri("Bu oyuncuyla {ben}-{rakip} öndesin", d.ezeli)
      : d.ezeli.ben < d.ezeli.rakip
        ? ceviri("Bu oyuncuyla {ben}-{rakip} geridesin", d.ezeli)
        : ceviri("Bu oyuncuyla {ben}-{rakip} berabersiniz", d.ezeli)
    : null;

  // ---------------- sonuç ekranı ----------------
  if (d.durum !== "aktif") {
    const kazandim = d.kazanan === d.ben;
    const rov = d.rovans ?? {};
    const durum = d.durum === "iptal" ? "berabere" : kazandim ? "kazandi" : "kaybetti";
    // 680 · Hâkimiyet: skor yerine yuva sayısı. Nakavt: eşik (hkS.esik; 870: 5) yuvaya ulaşan kazanır; son tur (duello_max_tur) sonunda yuvası çok olan;
    // eşitse Altın Soru (kim bildiyse o kazanır).
    const hkS = hkModel(d, ben, rakip);
    // 970 · puan modu: skor = puan; bitiş nedeni hedef puan / kategori yolu / tur sonu / Altın Soru.
    const pKaz = kazandim ? { p: hkS.benP, a: hkS.benAlinan } : { p: hkS.rakipP, a: hkS.rakipAlinan };
    const puanSkor = { a: hkS.benP, b: hkS.rakipP };
    const nakavt = d.durum === "bitti" && hkS.acik && !hkS.puan && Math.max(hkS.benY, hkS.rakipY) >= hkS.esik;
    const yuvaSkor = { a: hkS.benY, b: hkS.rakipY };
    const altYazi = d.durum !== "bitti" || !hkS.acik
      ? null
      : hkS.puan
        ? d.uzatma
          ? (kazandim ? ceviri("Altın Soru'yu sen bildin ({a}-{b})", puanSkor) : ceviri("Altın Soru'yu rakip bildi ({a}-{b})", puanSkor))
          : pKaz.p >= hkS.hedef
            ? (kazandim ? ceviri("{n} puana ulaştın!", { n: hkS.hedef }) : ceviri("Rakip {n} puana ulaştı", { n: hkS.hedef }))
            : pKaz.a >= hkS.yol
              ? (kazandim ? ceviri("Rakibin {n} kategorisini aldın!", { n: hkS.yol }) : ceviri("Rakip {n} kategorini aldı", { n: hkS.yol }))
              : (kazandim ? ceviri("{a}-{b} önde, kazandın", puanSkor) : ceviri("{a}-{b} geride, kaybettin", puanSkor))
      : nakavt
        ? (kazandim ? ceviri("Hâkimiyet zaferi! {n} yuva doldu", { n: hkS.esik }) : ceviri("Rakip {n} yuvayı doldurdu", { n: hkS.esik }))
        : d.uzatma
          ? (kazandim ? ceviri("Eşit ({a}-{b}) — Altın Soru'yu sen bildin", yuvaSkor) : ceviri("Eşit ({a}-{b}) — Altın Soru'yu rakip bildi", yuvaSkor))
          : (kazandim ? ceviri("{a}-{b} önde, kazandın", yuvaSkor) : ceviri("{a}-{b} geride, kaybettin", yuvaSkor));
    // A.3: yeni sahne — veriler mac_sonu_ozet'ten (tek çağrı). Özet gelene dek sahne kurulmaz.
    if (d.durum === "bitti" && !macSonuOzet) return <div className="bd-duello"><div className="msk-bekle" aria-busy="true" /></div>;
    const sahne = ozettenSahne(d.durum === "bitti" ? macSonuOzet : null);
    return (
      <div className="bd-duello">
        <MacSonuKutlama
          durum={durum}
          mod="duello"
          terk={sahne.terk}
          baslik={d.durum === "iptal" ? ceviri("Düello iptal edildi") : undefined}
          altYazi={sahne.terk ? undefined : altYazi ?? undefined}
          ben={{ profil: ben, skor: hkS.acik && !hkS.puan ? hkS.benY : Number(ben.puan ?? 0) }}
          rakip={{ profil: rakip, skor: hkS.acik && !hkS.puan ? hkS.rakipY : Number(rakip.puan ?? 0) }}
          skorEtiket={hkS.acik && !hkS.puan ? ceviri("yuva") : ceviri("puan")}
          oduller={sahne.oduller}
          level={sahne.level}
          lig={sahne.lig}
          gorevler={sahne.gorevler}
          rozetler={sahne.rozetler}
          detay={d.durum === "bitti" || ezeliMetin || d.gecmis?.length ? (
            <>
              {d.durum === "bitti" && <OdulDokumu kaynak={`duello:${d.id}`} veri={macSonuOzet?.dokum} gorevleriGoster={false} />}
              {/* Son tahta: iki tarafın yuvaları (ikonlarla) */}
              {d.durum === "bitti" && <HkSonTahta d={d} ben={ben} rakip={rakip} c={c2} />}
              {/* Her soru: hamle sonucu (Aldın / Tutmadı / Kontra…), doğru cevap ve "şık işaretlenmedi" notu (sunucu: gecmis) */}
              <V2Gecmis gecmis={d.gecmis} maxTur={d.max_tur} benId={d.ben} c={c2} />
              {ezeliMetin && <div className="bd-duello-ezeli">{ezeliMetin}</div>}
            </>
          ) : null}
          eylemNotu={hata ? <span className="m2-hata" role="alert"><QtIkon ad="uyari" boyut={18} /> {hata}</span> : null}
          eylemler={{ onYeniMac: () => navigate(y("/duello")), onAnaSayfa: () => navigate(y()), yeniMacEtiketi: ceviri("Yeni düello") }}
          rovans={
            <>
              {rov.id ? (
                <QtDugme className="mss-tam" tamGenislik ikon="duello" onClick={() => navigate(y(`/duello/${rov.id}`))}>{ceviri("Rövanşa git")}</QtDugme>
              ) : rov.isteyen && rov.gecerli && rov.isteyen === d.ben && !rovVazgec ? (
                <>
                  {/* İstek gönderildi: bekleme penceresi (QtModal, body'ye portal) açık; çubukta pasif düğme */}
                  <QtDugme className="mss-tam" tamGenislik yukleniyor>{ceviri("Rövanş bekleniyor…")}</QtDugme>
                  <RovansBekleme rakip={rakip} baslangic={rovBas ?? Date.now()} sureSn={rovSn} simdi={simdi}
                                 ceviri={ceviri} onVazgec={rovansVazgec} />
                </>
              ) : rov.isteyen && rov.gecerli && rov.isteyen !== d.ben ? (
                <>
                  <p className="m2-rovans-soru mss-tam qt-h-pop-gir" role="status">{ceviri("{ad} rövanş istiyor!", { ad: rakip.gorunen_ad })}</p>
                  <QtDugme ikon="onay" devreDisi={!!calisan} yukleniyor={calisan === "rovans"}
                           onClick={() => eylem("rovans", "duello_rovans_yanitla", { p_kabul: true })}>
                    {ceviri("Kabul et")}
                  </QtDugme>
                  <QtDugme tur="ikincil" devreDisi={!!calisan}
                           onClick={() => eylem("rovans", "duello_rovans_yanitla", { p_kabul: false })}>
                    {ceviri("Reddet")}
                  </QtDugme>
                </>
              ) : d.durum === "bitti" ? (
                <>
                  {rovSonuc && (
                    <p className="m2-rovans-sonuc mss-tam" role="status">
                      {rovSonuc === "red"
                        ? ceviri("{ad} rövanşı kabul etmedi.", { ad: rakip.gorunen_ad })
                        : ceviri("{ad} yanıt vermedi.", { ad: rakip.gorunen_ad })}
                    </p>
                  )}
                  <QtDugme className="mss-tam" tamGenislik ikon="yenile" yukleniyor={!!calisan} onClick={rovansIste}>
                    {rovSonuc ? ceviri("Tekrar rövanş iste") : ceviri("Rövanş")}
                  </QtDugme>
                </>
              ) : null}
            </>
          }
        >
          <HesapGuvenceOnerisi kazandim={d.durum === "bitti" && kazandim} />
        </MacSonuKutlama>
      </div>
    );
  }

  // Skill satın alma penceresi (JokerSatinAlModal paylaşılan bileşen).
  const satinAlPenceresi = satinAlinacak && (
    <JokerSatinAlModal
      tur={satinAlinacak.tur}
      yalnizAl={satinAlinacak.yalnizAl}
      fiyat={Number(d.skill?.fiyatlar?.[satinAlinacak.tur] ?? 0)}
      coin={Number(d.skill?.coin ?? 0)}
      onKapat={() => setSatinAlinacak(null)}
      onOnay={async () => {
        if (satinAlinacak.yalnizAl) {
          // Kategori ekranı: joker envantere girer, KULLANILMAZ.
          // Kullanım Saldırı Hazırlığı'nda normal yoldan yapılır.
          const { error } = await supabase.rpc("joker_tek_al", { p_tur: satinAlinacak.tur });
          if (error) throw error;
        } else {
          // Satın alma + kullanım TEK RPC: araya girip coin düşüp jokerin
          // kullanılmaması diye bir durum oluşmaz.
          const yeniSkill = satinAlinacak.tur === "ikinci_sans";
          const { error } = await supabase.rpc(yeniSkill ? "skill_al_ve_hazirla" : "joker_al_ve_kullan", {
            p_mac_tur: "duello",
            p_mac_id: id,
            p_soru_index: null,
            p_tur: satinAlinacak.tur,
          });
          if (error) throw error;
        }
        if (!satinAlinacak.yalnizAl) {
          sesSkill(satinAlinacak.tur);
          setSonKullanilan({ tur: satinAlinacak.tur, anahtar: Date.now() });
        } else sesJoker();
        titret(10);
        coinTazele();
        // Alım bitti: pencere tam yeniden okumayı (iki ardışık RPC, yavaş ağda saniyeler) BEKLEMEZ; durum arkadan tazelenir.
        yukle().catch(() => {});
      }}
    />
  );

  // ================= Maç ekranı (Tasarım A · 680 Hâkimiyet tahtası) =================
  const kilitli = Boolean(d.cevap?.ben_cevapladim);
  const toplamSn = d.faz === "kategori"
    ? Number(d.sureler?.kategori ?? 8)
    : d.faz === "ban" ? Number(d.sureler?.ban ?? d.ban?.sure ?? 7)
    : d.faz === "secim" ? Number(d.sureler?.secim ?? d.secim?.sure ?? 5)
    : Math.max(Number(d.sureler?.cevap ?? 15), Math.ceil(kalanSn));
  const sonUc = d.faz === "kategori" && gosterSn > 0 && gosterSn <= 3;   // kategori: son 3 sn vurgusu (renk + ses)
  // Savunma banı: savunan henüz banlamadıysa son 2 sn gerilim (kırmızı kenar nabzı + çerçeve nabzı).
  const banFazi = d.faz === "ban";
  const banBekleyen = banSecilen ?? banBasilan;
  const banSon = banFazi && !benSaldiran && !banBekleyen && gosterSn > 0 && gosterSn <= 2;
  // 960 · seçim fazı: sıra bendeyken (henüz dokunmadıysam) son 2 sn gerilim.
  const secimFaz = d.faz === "secim";
  const sm = secimFaz ? secimModel(d) : null;
  const secimSon = secimFaz && benSaldiran && !secimBasilan && gosterSn > 0 && gosterSn <= 2;
  const gerilim = (d.faz === "cevap" && !kilitli && gosterSn > 0 && gosterSn <= 5) || sonUc || banSon || secimSon;
  const ekBalon = skillEfekt?.tur === "sure"
    ? { anahtar: `s${skillEfekt.deger}${fazAnahtari}`, metin: `+${skillEfekt.deger}` }
    : skillEfekt?.tur === "zaman_baskisi"
      ? { anahtar: `z${skillEfekt.deger}${fazAnahtari}`, metin: `−${skillEfekt.deger}` }
      : null;
  const hk = hkModel(d, ben, rakip);
  const mesaj = hkMesaj({ d, hk, ben, rakip, benSaldiran, c: c2, ezeli: ezeliMetin });
  // Soru ekranı: sorulan kategorinin benim için durumu (kırmızı tehlike · mavi fırsat · gri nötr) — yuva + soru rozeti aynı çerçeve.
  const katDurum = hkKategoriDurumu(d, hk, benSaldiran);
  // Büyük süre: kategori ve cevap fazında geri sayım halkası/rakamı; sonuç fazında sayaç yerine sade işaret.
  const sayacGosterilir = d.faz === "kategori" || d.faz === "cevap" || d.faz === "ban" || secimFaz;
  const sayacNode = secimFaz
    ? <SecimHalka sn={kopukDonukSn ?? gosterSn} oran={(kopukDonukSn ?? kalanGoster) / Math.max(1, toplamSn)} ben={benSaldiran} c={c2} />
    : sayacGosterilir
    ? <QtSayac kalan={gosterSn} toplam={toplamSn} esik={d.faz === "ban" ? 2 : 5} boyut="k" durdu={kilitli || kopukDonukSn != null || (banFazi && !!banBekleyen)} ekBalon={ekBalon} className="hk-sayac" />
    : <span className="hk-sayac hk-sayac--sonuc" aria-hidden="true">·</span>;
  const sureOrani = sayacGosterilir ? (kopukDonukSn ?? kalanGoster) / Math.max(1, toplamSn) : 0;
  // Ban → kategori: açıklama yalnız faz TAZE iken oynar (sayaç hâlâ tam sürede = sunucunun gösterim payı içinde;
  // 880: duello_ban_gosterim_ms açıklama süresini kategori fazına ekler). Sayfa faz ortasında açılırsa oynamaz.
  if (d.faz === "kategori" && banTazeRef.current.anahtar !== fazAnahtari) {
    banTazeRef.current = { anahtar: fazAnahtari, taze: Boolean(d.ban?.acik && !d.uzatma && kalanSn >= toplamSn - 0.4) };
  }
  const banTaze = d.faz === "kategori" && banTazeRef.current.anahtar === fazAnahtari && banTazeRef.current.taze;
  // İlk 3 Düello'da, maçın ilk savunma banında tek seferlik ipucu (alt çubukta).
  if (banFazi && !benSaldiran && banIpucuRef.current.anahtar !== fazAnahtari) {
    banIpucuRef.current = { anahtar: fazAnahtari, goster: banIpucuGoster(d.id, d.tur) };
  }
  const banIpucu = banFazi && !benSaldiran && banIpucuRef.current.anahtar === fazAnahtari && banIpucuRef.current.goster;
  // İlk 3 Düello'da savunan rakibin seçimini beklerken: soru ekranındaki çerçeve renginin anlamı (alt çubukta, sıradaki ipucu).
  const durumIpucuAni = d.faz === "kategori" && !benSaldiran && hk.acik && !d.uzatma;
  if (durumIpucuAni && durumIpucuRef.current.anahtar !== fazAnahtari) {
    durumIpucuRef.current = { anahtar: fazAnahtari, sira: durumIpucuSirasi(d.id, d.tur) };
  }
  const durumIpucu = durumIpucuAni && durumIpucuRef.current.anahtar === fazAnahtari ? durumIpucuRef.current.sira : null;
  const banUyariAcik = Boolean(banUyari && simdi - banUyari < 1800);
  const banliyaDokun = () => { sesHataUyari(); titret(45); setBanUyari(Date.now()); };
  // 760: kopukluk bandı önce durum okumasındaki `kopuk`tan (her okumada, sunucunun dondurduğu an ve bekleme bitişi),
  // yoksa 5 sn'lik duello_baglanti'dan. Kalan süre sunucu saatine göre.
  const kopukBant = d.kopuk
    ? { benMi: Boolean(d.kopuk.ben_mi), kalan: d.kopuk.bitis ? Math.max(0, Math.ceil((new Date(d.kopuk.bitis).getTime() - (simdi + farkRef.current)) / 1000)) : null }
    : baglanti?.kopuk
      ? { benMi: Boolean(baglanti.ben_mi), kalan: baglanti.kalan_sn == null ? null : Math.max(0, baglanti.kalan_sn - Math.floor((simdi - (baglanti.alindi ?? simdi)) / 1000)) }
      : null;
  // Faz bitişi GECIKME_BANT_MS geçtiği hâlde yeni faz gelmediyse ya da okuma hata veriyorsa: "Bağlantı yeniden kuruluyor…"
  const gecikmisMs = fazBitisRef.current != null ? simdi + farkRef.current - fazBitisRef.current : 0;
  const yenidenBant = !kopukBant && (yenidenBaglaniyor || (sayacGosterilir && !kilitli && gecikmisMs > GECIKME_BANT_MS));
  let sahne2 = null;
  if (secimFaz && sm) {
    if (secimIpucuRef.current.id !== d.id) secimIpucuRef.current = { id: d.id, goster: secimIpucuGoster(d.id) };
    sahne2 = (
      <SecimKartlar d={d} hk={hk} sm={sm} ben={ben} rakip={rakip} benSirada={benSaldiran} basilan={secimBasilan}
                    calisan={calisan} c={c2} onSec={secimYap} ipucu={secimIpucuRef.current.goster} />
    );
  } else if (d.faz === "kategori") {
    sahne2 = (
      <V2Kategori d={d} hk={hk} benSaldiran={benSaldiran} ben={ben} rakip={rakip} calisan={calisan} c={c2}
                  secim={katSecim} dokunus={dokunus} zipla={zipla} onKart={kartaDokun}
                  damga={banTaze} onBanli={banliyaDokun} />
    );
  } else if (d.faz === "ban") {
    // 853: aynı kart ızgarası; savunan dokununca banlar, saldıran bekler.
    sahne2 = (
      <V2Kategori d={d} hk={hk} benSaldiran={benSaldiran} ben={ben} rakip={rakip} calisan={calisan} c={c2}
                  secim={banSecilen} dokunus={null} onKart={banSec} banBasilan={banBasilan} />
    );
  } else if (d.faz === "cevap") {
    sahne2 = (
      <V2Cevap d={d} rakip={rakip} secenekler={secenekler} secim={secim}
               ikinciSansElendi={ikinciSansElendi} calisan={calisan} kalanSn={kalanSn}
               kiriliyor={kiriliyor} c={c2} onCevap={cevapVer} katDurum={katDurum} />
    );
  } else if (d.faz === "sonuc") {
    sahne2 = <V2Sonuc d={d} secenekler={secenekler} c={c2} />;
  }
  return (
    <div className={sinif("m2-mac hk-mac", `hk-mac--${d.faz}`, gerilim && "qt-h-gerilim", d.uzatma && "m2-mac--altin")}>
      <MacUstSerit onCik={() => setTerkOnay(true)} cikisEtiketi={ceviri("Düellodan çık")}
                   rozet={ceviri("Düello · Taktik Maçı")} />
      <V2Ust d={d} ben={ben} rakip={rakip} c={c2} seviyeler={seviyeler} tepkiBalonlar={tepki.balonlar}
             sayac={sayacNode} oran={sureOrani} son={gerilim}
             onay={d.faz === "cevap" ? { [ben.id]: kilitli, [rakip.id]: Boolean(d.cevap?.rakip_cevapladi) } : {}}
             noktalar={sm ? <SecimPipler d={d} sm={sm} c={c2} /> : null} />
      {/* Paket 24 · A.4: bağlantı kopması. Kopukken sunucu fazları İLERLETMEZ. */}
      {kopukBant && (
        <p className="m2-bant m2-bant--uyari" role="status">
          <QtIkon ad="uyari" boyut={18} />
          <span>
            {kopukBant.benMi ? ceviri("Bağlantın koptu — düello bekliyor.") : ceviri("Rakibin bağlantısı koptu — düello durduruldu.")}
            {kopukBant.kalan == null ? "" : ` ${kopukBant.kalan} ${ceviri("sn")}`}
          </span>
        </p>
      )}
      {yenidenBant && (
        <p className="m2-bant m2-bant--uyari" role="status">
          <QtIkon ad="yenile" boyut={18} />
          <span>{ceviri("Bağlantı yeniden kuruluyor…")}</span>
        </p>
      )}
      {/* Cevap fazında tahta küçülür (yalnız yuva şeridi): soru + 4 şık + joker şeridi kaydırmasız sığsın */}
      <HkYuvalar d={d} hk={hk} c={c2} kucuk={d.faz === "cevap"} durum={katDurum} />
      {/* 542: maç içi tepki (yalnız tepki_acik_modlar'daki modda; ilk açılış Antrenman) — mesaj satırının sağında */}
      {/* Ban fazında mesaj satırının yerini ban durum satırı alır (aynı yuva, aynı yükseklik). */}
      {sm ? (
        <SecimKonsol d={d} sm={sm} benSirada={benSaldiran} sn={kopukDonukSn ?? gosterSn} c={c2}>
          <TepkiCubugu tepki={tepki} className="hk-tepki" />
        </SecimKonsol>
      ) : banFazi ? (
        <BanKonsol benSaldiran={benSaldiran} sn={kopukDonukSn ?? gosterSn} oran={sureOrani} bekleyen={banBekleyen} c={c2}>
          <TepkiCubugu tepki={tepki} className="hk-tepki" />
        </BanKonsol>
      ) : (
        <HkMesaj mesaj={mesaj}>
          <TepkiCubugu tepki={tepki} className="hk-tepki" />
        </HkMesaj>
      )}
      <div className={sinif("m2-sahne hk-sahne",
                            banFazi && "hk-sahne--ban", banFazi && (benSaldiran ? "hk-sahne--ban-bekle" : "hk-sahne--ban-sec"),
                            banSon && "hk-sahne--ban-son",
                            banTaze && "hk-sahne--bangecis", banTaze && (benSaldiran ? "hk-sahne--bangecis-ben" : "hk-sahne--bangecis-rakip"))}
           key={`${d.faz}-${d.tur}-${d.saldiri_sirasi}-${d.uzatma}`}>
        {/* Savunanın ban girişinde tur bandı çıkmaz: giriş damgası tur numarasını da taşır (iki katman üst üste binmesin). */}
        {/* 960: seçim bitti → HÂKİMİYET BAŞLIYOR; savunanın ban girişi geçiş bitince oynar (iki katman üst üste binmesin) */}
        {banFazi && !benSaldiran && kopukDonukSn == null && !(hkBasla && simdi - hkBasla < HAKIMIYET_GECIS_MS) && (
          <BanGirisAni anahtar={`${d.id}:${fazAnahtari}`} tur={d.tur} maxTur={d.max_tur} c={c2} />
        )}
        {banTaze && (
          <BanAciklama anahtar={`${d.id}:${fazAnahtari}`} benSaldiran={benSaldiran} kategori={d.ban?.kategori ?? null} c={c2} />
        )}
        {turGecis && simdi - turGecis < 900 && !(banFazi && !benSaldiran) && (
          <span key={turGecis} className="m2-gecis" aria-hidden="true">
            <span>{d.uzatma ? c2("ALTIN SORU") : c2("Tur {n}/{t}", { n: d.tur, t: d.max_tur })}</span>
          </span>
        )}
        {sahne2}
      </div>
      {/* sahnenin dışında: ban → kategori geçişinde sahne yeniden kurulsa da geçiş baştan oynamaz */}
      {hkBasla && simdi - hkBasla < HAKIMIYET_GECIS_MS && !secimFaz && <HakimiyetBasliyor hk={hk} c={c2} />}
      {hata && <p className="m2-hata hk-hata" role="alert"><QtIkon ad="uyari" boyut={18} /> {hata}</p>}
      {d.faz === "cevap" && (
        <V2Skill d={d} calisan={calisan} kalanSn={kalanSn} serbest={jokerSerbest}
                 sonKullanilan={sonKullanilan} onKullan={v2SkillKullan} c={c2} />
      )}
      {d.faz === "kategori" && (
        <V2SecimCubugu d={d} hk={hk} benSaldiran={benSaldiran} secim={katSecim} calisan={calisan} c={c2}
                       onOnayla={kategoriSec} banUyari={banUyariAcik} ipucu={durumIpucu} />
      )}
      {banFazi && <V2BanCubugu benSaldiran={benSaldiran} c={c2} ipucu={banIpucu} />}
      {satinAlPenceresi}
      <QtModal acik={terkOnay} onKapat={() => setTerkOnay(false)} baslik={ceviri("Düellodan çık")}
               aciklama={ceviri("Düellodan çıkarsan hükmen kaybedersin. Emin misin?")}
               altlik={
                 <div className="m2-onay-eylem">
                   <QtDugme tur="ikincil" data-qt-ilk-odak onClick={() => setTerkOnay(false)}>{ceviri("Vazgeç")}</QtDugme>
                   <QtDugme tur="tehlike" devreDisi={!!calisan}
                            onClick={() => { setTerkOnay(false); eylem("terk", "duello_terk", {}); }}>{ceviri("Çık")}</QtDugme>
                 </div>
               } />
    </div>
  );
}

export default function DuelloPage() {
  const { id } = useParams();
  return id ? <DuelloMac id={id} key={id} /> : <DuelloGiris />;
}
