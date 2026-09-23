import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SureDolduGecis from "../components/SureDolduGecis.jsx";
import { sesRakipCevapladi } from "../lib/ses.js";
import { hataMesaji } from "../lib/hata.js";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import QuestionCard from "../components/QuestionCard.jsx";
import MacSonuSahnesi from "../components/MacSonuSahnesi.jsx";
import MacSonuEklentisi from "../components/MacSonuEklentisi.jsx";
import MacSonuDokum from "../components/MacSonuDokum.jsx";
import OdulDokumu from "../components/OdulDokumu.jsx";
import MacSorulari from "../components/MacSorulari.jsx";
import HesapGuvenceOnerisi from "../components/HesapGuvence.jsx";
import MeydanaDonus from "../components/MeydanaDonus.jsx";
import Maskot from "../components/Maskot.jsx";
import { QtBosDurum, QtCip, QtDugme, QtEtki, QtIkon, QtIkonDugme, QtMacUst, QtRozet } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import MacUstSerit, { SeviyeEtiketi } from "../components/MacUstSerit.jsx";
import CerceveliAvatar from "../components/CerceveliAvatar.jsx";
import { VsKarti } from "../components/AramaSahnesi.jsx";
import { useOyuncuSeviyeleri } from "../lib/oyuncuSeviye.js";
import { TEPKILER, tepkiIkonu } from "../lib/tepkiler.js";
import MacYukleniyor from "../components/MacYukleniyor.jsx";
import SesliSohbet from "../components/SesliSohbet.jsx";
import { useOyunModu } from "../lib/oyunModu.js";
import { soruCek } from "../lib/soruCek.js";
import { useGorunurlukTazele, zamanAsimiyla } from "../lib/gorunurluk.js";
import { useMacNabiz } from "../lib/nabiz.js";
import { HazirKapisi, KopukPerde, GeriSayim } from "../components/MacHazirlik.jsx";
import { macBittiReklam } from "../lib/reklam.js";
import { y } from "../lib/yol.js";
import { GB_MS } from "../lib/geriBildirim.js";
import { useDil } from "../lib/dilKanca.js";
import { tt } from "../lib/dil.js";
import { rpcDene } from "../lib/rpcDene.js";

// Sunucu her doğru cevaba 10 puan yazar (cevap_ver, migration 250). Yalnız
// sonuç ekranındaki "n soru farkla" metni için; puanlama sunucuda kalır.
const SORU_PUANI = 10;
// Kanal bağlıyken maç satırı yoklaması (yedek) — bkz. kanalHazirRef.
const YEDEK_YOKLAMA_MS = 6000;

// acik_bot: maç sonunda hangi rövanş eyleminin gösterileceğini belirler.
// `is_bot` BİLEREK KULLANILMIYOR (kolon istemciye kapalı, migration 155):
// gizli bota karşı rövanş normal "istek gönder" yolundan gider ve botu
// sunucudaki bot_oyna birkaç saniye içinde kabul eder — gerçek oyuncuyla
// aynı his, gizlilik bozulmaz.
// (bota doğrudan yeni maç, gerçek oyuncuya istek). Ekstra sorgu açmamak için
// zaten çekilen profil satırına eklendi.
const MAC_SECIMI = `*,
  p1:profiles!matches_oyuncu1_fkey(id, gorunen_ad, gorunen_avatar, gorunum, acik_bot),
  p2:profiles!matches_oyuncu2_fkey(id, gorunen_ad, gorunen_avatar, gorunum, acik_bot)`;

// Tepkiler artık SVG ikon (bkz. lib/tepkiler.js). Sunucuya giden metin aynı.
// Balonda gösterim: mesaj bir tepki emojisiyse ikonu, değilse metni çiz.
function balonIcerik(mesaj) {
  const ad = tepkiIkonu(mesaj);
  return ad ? <QtIkon ad={ad} boyut={20} /> : mesaj;
}
// Profil satırındaki görsel (gizlilik sonrası gorunen_avatar; eski modüllerde avatar_url).
const avatarSrc = (p) => (p?.gorunen_avatar !== undefined ? p.gorunen_avatar : p?.avatar_url) || null;
const KALIPLAR = [
  tt("İyi şanslar!"),
  tt("Bunu biliyordum!"),
  tt("Şanslıydın! 😏"),
  tt("İyi oyun!"),
  tt("Hadi bakalım!"),
  tt("Vay be! 🤯"),
  tt("AĞLAMA 😂"),
  "HAHAHAHAHA",
];

/**
 * Maç satırının "ne kadar ilerlemiş" damgası.
 *
 * Skorlar, soru sayaçları ve "basladi" maç boyunca YALNIZ ARTAR. Satır iki
 * kaynaktan geliyor: Realtime ve 2 saniyelik yoklama. İkisi birden çalışınca
 * yanıtlar SIRASIZ gelebiliyor — yeni bir güncellemeden sonra çözülen eski
 * bir yoklama tabelayı geri alıyor ve puan "gecikmeli" görünüyordu.
 * Damgası daha küçük olan anlık görüntü artık atılır.
 *
 * Duraklama bilerek dışarıda: o hem açılıp hem kapanıyor, tek yönlü değil.
 */
function ilerlemeDamgasi(m) {
  if (!m) return -1;
  const kapandi = m.durum === "bitti" || m.durum === "iptal" || m.durum === "reddedildi" ? 1 : 0;
  return (
    kapandi * 1e9 +
    (m.basladi ? 1 : 0) * 1e8 +
    (m.aktif_soru ?? 0) * 1e6 +
    ((m.oyuncu1_soru ?? 0) + (m.oyuncu2_soru ?? 0)) * 1e4 +
    (m.oyuncu1_skor ?? 0) + (m.oyuncu2_skor ?? 0)
  );
}

/** Ajan H: rakip bu soruyu (ben hâlâ düşünürken) cevaplayınca soru başına bir kez ses. */
function RakipCevapSesi({ anahtar }) {
  const son = useRef(null);
  useEffect(() => {
    if (anahtar == null || son.current === anahtar) return;
    son.current = anahtar;
    sesRakipCevapladi();
  }, [anahtar]);
  return null;
}

export default function MatchPage() {
  const { id } = useParams();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [mac, setMac] = useState(null);
  const seviyeler = useOyuncuSeviyeleri([mac?.oyuncu1, mac?.oyuncu2]);
  const [soru, setSoru] = useState(null);
  const [cevapladim, setCevapladim] = useState(false);
  const [jokerKullanildi, setJokerKullanildi] = useState({ elli: false, sure: false });
  const [jokerHata, setJokerHata] = useState(null);
  const [balonlar, setBalonlar] = useState({}); // { [user_id]: mesaj }
  const [kaliplarAcik, setKaliplarAcik] = useState(false);
  const [ilerleme, setIlerleme] = useState({ ben: 0, rakip: 0 });
  // Rakip cevap verdiğinde avatarında kısa bir nabız — rakip görünmez bir
  // hayalet olmaktan çıksın.
  const [rakipNabiz, setRakipNabiz] = useState(false);
  const rakipIlerlemeRef = useRef(0);
  const [bilgiKapandi, setBilgiKapandi] = useState(false);
  // Bilgi kartı yalnız maça ilk girişte gösterilir. Sonradan belirip soru
  // ekranını aşağı itmesin diye ilk render'da sabitlenir (canlı testte
  // düzen kayması yüzünden şıkka tıklanamıyordu).
  const ilkGirisRef = useRef(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(null);
  // Duraklama bitince soruyu yeniden çekmek için sayaç (saat ileri kaydı).
  // "Tekrar dene" düğmesi de bunu artırır: soru çekme effect'i yeniden koşar.
  const [duraklamaTuru, setDuraklamaTuru] = useState(0);
  // Soru bütün denemelere rağmen gelmedi mi? (sessiz donma yerine görünür hata)
  const [soruHatasi, setSoruHatasi] = useState(false);
  // Kendi cevabımızın/atlamamızın zamanı. Sonraki soru bu andan GB_MS
  // geçmeden ekrana gelmez: bot anında cevaplayınca sunucu soruyu hemen
  // ilerletiyor ve Realtime paketiyle kart göz açıp kapayana kadar
  // değişiyordu — oyuncu doğru mu yanlış mı yaptığını göremiyordu.
  const cevapZamaniRef = useRef(0);
  // Maç bitti ama son cevabın geri bildirimi hâlâ ekranda mı?
  // Bota karşı oynarken bot anında cevapladığı için son cevapla birlikte maç
  // kapanıyor ve doğru mu yanlış mı yaptığımız HİÇ görünmeden sonuç ekranı
  // açılıyordu. Sonuç ekranı pencere dolana kadar bekler.
  const [sonucHazir, setSonucHazir] = useState(false);
  // Maç sonu gerçek kazanç (sunucudan: dereceli/serbest, çift çarpanı, günlük tavan)
  const [odulum, setOdulum] = useState(null);
  // Paket 36: sonuç sahnesi — rövanş isteği yuvası (eylem çubuğu), Detay rozeti, bot rövanşı çalışıyor
  const [rovansYuva, setRovansYuva] = useState(null);
  const [yanlisAdet, setYanlisAdet] = useState(0);
  const [gorevler, setGorevler] = useState([]);   // Paket 37 D.1: sahnede Detay'ın üstünde
  const [botRovans, setBotRovans] = useState(false);
  const { ceviri } = useDil();
  // Uygulanmış en ileri damga (bkz. ilerlemeDamgasi)
  const damgaRef = useRef(-1);
  const advanceKilidi = useRef(false);
  const pollRef = useRef(null);
  const kanalRef = useRef(null);
  // Performans (23 Eyl 2026): kanal bağlıyken maç satırı zaten Realtime ile (yükün kendisiyle)
  // gelir; 2 sn'lik yoklama yalnız yedektir → kanal bağlıyken YEDEK_YOKLAMA_MS'de bir.
  const kanalHazirRef = useRef(false);
  const sonYoklamaRef = useRef(0);
  // Kanal düştüğünde yeniden kurma zamanlayıcısı ve güncel kanalKur referansı
  const yenidenBaglaRef = useRef(null);
  const kanalKurRef = useRef(null);
  // Son yüklenen maç satırının imzası — yoklama aynı veriyi getirdiğinde
  // gereksiz yeniden çizimi engeller (bkz. macYukle).
  const macImzaRef = useRef(null);
  // Maç bitişinde sonuç ekranından önce 0.8 sn'lik "Maç bitti!" perdesi
  const [gecisBitti, setGecisBitti] = useState(false);
  // Sesli sohbet arayüzünün çizileceği yuva (her ekran dalı kendi yuvasını verir)
  const [sesYuva, setSesYuva] = useState(null);
  const balonTimer = useRef({});

  const balonGoster = useCallback((kimden, mesaj) => {
    setBalonlar((b) => ({ ...b, [kimden]: mesaj }));
    clearTimeout(balonTimer.current[kimden]);
    balonTimer.current[kimden] = setTimeout(() => {
      setBalonlar((b) => {
        const yeni = { ...b };
        delete yeni[kimden];
        return yeni;
      });
    }, 4000);
  }, []);

  const mesajGonder = async (mesaj) => {
    setKaliplarAcik(false);
    balonGoster(user.id, mesaj);
    const { error } = await supabase.rpc("send_match_message", { p_match_id: id, p_mesaj: mesaj });
    if (error) console.error("[Bildim] mesaj gönderilemedi:", error.message);
  };

  useEffect(() => {
    supabase
      .from("match_jokers")
      .select("tip")
      .eq("match_id", id)
      .eq("user_id", user.id)
      .then(({ data, error }) => {
        if (error) console.error("[Bildim] kullanılan skill'ler okunamadı:", error.message);
        const k = { elli: false, sure: false };
        (data ?? []).forEach((j) => (k[j.tip] = true));
        setJokerKullanildi(k);
      });
  }, [id, user.id]);

  const jokerKullan = async (tip) => {
    setJokerHata(null);
    const { data, error } = await supabase.rpc("use_joker", {
      p_match_id: id,
      p_tip: tip,
    });
    if (error) {
      setJokerHata(hataMesaji(error));
      return null;
    }
    setJokerKullanildi((k) => ({ ...k, [tip]: true }));
    refreshProfile(user.id);
    return data;
  };

  const macYukle = useCallback(async () => {
    let data = null;
    try {
      const sonuc = await supabase
        .from("matches")
        .select(MAC_SECIMI)
        .eq("id", id)
        .single();
      if (sonuc.error) throw sonuc.error;
      data = sonuc.data;
      if (data) setYuklemeHatasi(null);
    } catch (e) {
      console.error("[Bildim] mac yuklenemedi:", e);
      setYuklemeHatasi(hataMesaji(e, tt("Maç bilgisi alınamadı.")));
    }
    // Yoklama 2 saniyede bir dönüyor. Gelen satır bir öncekiyle birebir
    // aynıysa state'e DOKUNMA: yeni nesne yazmak React'e "değişti" dedirtir
    // ve maç ekranı boşuna baştan çizilir. Sesli sohbet (WebRTC) açıkken bu
    // gereksiz çizim yükü hissedilir takılmaya dönüşüyordu.
    if (data) {
      const imza = JSON.stringify(data);
      if (imza !== macImzaRef.current) {
        // Bu yoklama, elimizdekinden ESKİ bir anı gösteriyorsa yazma:
        // yoksa tabela geri sayıp puan sonradan geliyormuş gibi görünüyor.
        const damga = ilerlemeDamgasi(data);
        if (damga < damgaRef.current) return data;
        damgaRef.current = damga;
        macImzaRef.current = imza;
        setMac(data);

        // Asenkron maçta iki taraf farklı soruda olabilir.
        // match_answers RLS'i yalnız KENDİ cevaplarını gösterdiği için rakip
        // ilerlemesi hep 0 çıkıyordu; sayaçlar matches tablosunda tutuluyor.
        const benP1x = data.oyuncu1 === user.id;
        setIlerleme({
          ben: benP1x ? (data.oyuncu1_soru ?? 0) : (data.oyuncu2_soru ?? 0),
          rakip: benP1x ? (data.oyuncu2_soru ?? 0) : (data.oyuncu1_soru ?? 0),
        });
      }
    }
    return data;
  }, [id, user.id]);

  // Kanal kurulumu ayrı fonksiyonda: sekmeden dönüşte ölmüş soket yeniden kurulur.
  const kanalKur = useCallback(() => {
    const kanal = supabase
      .channel(`mac-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${id}` },
        (payload) => {
          // Realtime paketleri de sırasız gelebilir (yeniden bağlanma,
          // arka plandan dönüş). Geriye giden paket çizime alınmaz.
          const damga = ilerlemeDamgasi(payload.new);
          if (damga < damgaRef.current) return;
          damgaRef.current = damga;
          setMac((eski) => ({ ...eski, ...payload.new }));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_messages", filter: `match_id=eq.${id}` },
        (payload) => balonGoster(payload.new.user_id, payload.new.mesaj)
      )
      // Kanal ölürse sessizce kalmasın: Realtime kopmasi (ag dalgalanmasi,
      // uyku, arka plan) CHANNEL_ERROR/TIMED_OUT/CLOSED olarak bildirilir.
      // Yoklama zaten veriyi getiriyor ama kanal geri kurulmazsa anlık
      // güncellemeler (rakip skoru, mesaj) bir daha hiç gelmiyordu.
      .subscribe((durum) => {
        // Paket 20 VI: sayfadan çıkışta / sekme dönüşünde kanal BİLEREK kapatılır (kanalRef artık başka kanalı
        // ya da null'u gösterir); Supabase bunu da CLOSED diye bildiriyordu → yanlış "kanal düştü" uyarısı.
        if (kanalRef.current !== kanal) return;
        kanalHazirRef.current = durum === "SUBSCRIBED";
        if (durum === "CHANNEL_ERROR" || durum === "TIMED_OUT" || durum === "CLOSED") {
          console.warn("[Bildim] mac kanali dustu:", durum);
          if (yenidenBaglaRef.current) clearTimeout(yenidenBaglaRef.current);
          yenidenBaglaRef.current = setTimeout(() => {
            if (kanalRef.current !== kanal) return; // baska kanal kurulmus
            try {
              kanalRef.current = null;   // Paket 20 VI: kendi kapatmamızın CLOSED bildirimi yok sayılsın
              supabase.removeChannel(kanal);
              kanalKurRef.current?.();
            } catch (e) {
              console.error("[Bildim] kanal yeniden kurulamadi:", e);
            }
          }, 2000);
        }
      });
    kanalRef.current = kanal;
    return kanal;
  }, [id, balonGoster]);

  // Kanal izleyicisi kanalKur'u çağırabilsin (kanalKur kendi tanımına
  // referans veremediği için güncel hâli her render'da ref'e yazılır).
  kanalKurRef.current = kanalKur;

  // ÇİFT BAZLI ÖDÜL DURUMU — aynı rakiple aynı gün çok maç yapınca ödül
  // azalır (bkz. migration 145). Oyuncu bunu maç başlarken görmeli.
  const [ciftDurum, setCiftDurum] = useState(null);
  // SADELEŞTİRME: tepki paneli açık mı (soru ekranı tek işe odaklansın)
  const [tepkiAcik, setTepkiAcik] = useState(false);
  useEffect(() => {
    if (!mac || !user) return;
    const rakip = mac.oyuncu1 === user.id ? mac.oyuncu2 : mac.oyuncu1;
    if (!rakip) return;
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("cift_mac_durumu", { p_rakip: rakip });
        if (error) throw error;
        const d = Array.isArray(data) ? data[0] : data;
        if (aktif) setCiftDurum(d ?? null);
      } catch (e) {
        // Bilgi bandı gösterilemezse oyun akışı bozulmaz.
        console.error("[Bildim] cift mac durumu alinamadi:", e);
      }
    })();
    return () => { aktif = false; };
  }, [mac?.id, user?.id]);

  useEffect(() => {
    macYukle();
    kanalKur();
    // Realtime kopsa bile skor akmaya devam etsin (rakip puanı canlı artar)
    pollRef.current = setInterval(() => {
      if (kanalHazirRef.current && Date.now() - sonYoklamaRef.current < YEDEK_YOKLAMA_MS - 100) return;
      sonYoklamaRef.current = Date.now();
      macYukle();
    }, 2000);
    return () => {
      const eskiKanal = kanalRef.current;   // Paket 20 VI: CLOSED eşzamanlı gelir — önce ref boşalır, sonra kapanır
      kanalRef.current = null;
      kanalHazirRef.current = false;
      if (eskiKanal) supabase.removeChannel(eskiKanal);
      if (yenidenBaglaRef.current) clearTimeout(yenidenBaglaRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, macYukle, kanalKur]);

  // Sekmeden dönünce: veriyi tazele ve ölmüş olabilecek Realtime kanalını yenile.
  useGorunurlukTazele(() => {
    macYukle();
    try {
      const eskiKanal = kanalRef.current;   // Paket 20 VI: önce ref, sonra kapat
      kanalRef.current = null;
      if (eskiKanal) supabase.removeChannel(eskiKanal);
      kanalKur();
    } catch (e) {
      console.error("[Bildim] realtime yeniden kurulamadi:", e);
    }
  }, mac?.durum === "aktif");

  // Soru değişince çek.
  // SENKRON maçta indeks ORTAK (`aktif_soru`): iki oyuncu da aynı soruda.
  // Eski (asenkron) maçlarda herkes kendi `oyuncuN_soru` indeksinde.
  const senkron = Boolean(mac?.senkron);
  const kendiIndeks = !mac
    ? 0
    : senkron
      ? (mac.aktif_soru ?? 0)
      : mac.oyuncu1 === user.id
        ? (mac.oyuncu1_soru ?? 0)
        : (mac.oyuncu2_soru ?? 0);
  // Senkron maç iki taraf da ekrana gelene kadar başlamaz.
  const senkronBekliyor = mac?.durum === "aktif" && senkron && !mac?.basladi;
  // Son sorunun geri bildirimi sürerken kart YERİNDE kalmalı: soru state'i
  // temizlenirse kart sökülür ve doğru cevap hiç görünmez.
  const sonKartBekliyor = mac?.durum === "bitti" && !sonucHazir;
  useEffect(() => {
    if (sonKartBekliyor) return undefined;
    if (!mac || mac.durum !== "aktif" || senkronBekliyor) {
      setSoru(null);
      return undefined;
    }
    // Kendi bölümümüz bittiyse soru çekme (sunucu da hata döndürür)
    if (kendiIndeks >= (mac.soru_ids?.length ?? 0)) {
      setSoru(null);
      return undefined;
    }
    // ---- GERİ BİLDİRİM PENCERESİ ----
    // SENKRON MAÇTA ORTAK BİR ANDAN SAYILIR.
    //
    // HATA (sahibi arkadaşıyla oynarken buldu): "Bazı sorulara o benden
    // daha önce geçti." Sunucu suçsuzdu — `submit_match_answer`,
    // `mac_soruyu_atla` ve `advance_match` üçü de senkronu doğru koruyor
    // (iki cevap ya da süre dolmadan `aktif_soru` ilerlemiyor, FOR UPDATE
    // kilidiyle). Kayma İSTEMCİDEYDİ: pencere herkesin KENDİ cevap anından
    // sayılıyordu. 2. saniyede cevaplayan için kalan süre 0 çıkıyor, 14.
    // saniyede cevaplayan için tam GB_MS; ilerleme ikisine de aynı anda
    // gelse bile hızlı cevaplayan sonraki soruyu GB_MS önce görüyordu.
    //
    // Bu effect `kendiIndeks` değişince çalışır — yani ilerlemenin
    // GÖRÜLDÜĞÜ an. Senkronda pencereyi o andan saymak iki istemcide de
    // aynı sonucu verir. (Sunucu saatine bakmıyoruz: saat farkı bu
    // dosyada daha önce iki ayrı hataya yol açtı.)
    const kalanGB = senkron
      ? (kendiIndeks === 0 ? 0 : GB_MS)
      : Math.max(0, GB_MS - (Date.now() - cevapZamaniRef.current));
    let iptal = false;
    let durdur = null;
    const zamanlayici = setTimeout(() => {
      if (iptal) return;
      advanceKilidi.current = false;
      setCevapladim(false);
      setSoruHatasi(false);
      // PES ETMEYEN İSTEK (bkz. oyun/lib/soruCek.js): eskiden tek seferlik
      // `.then` vardı; istek hata verince ya da boş dönünce soru hiç gelmiyor,
      // effect de yeniden çalışmadığı için ekran donuyordu ("soru takıldı").
      durdur = soruCek({
        rpcAdi: "get_match_question",
        param: { p_match_id: mac.id },
        onSoru: setSoru,
        onVazgecti: () => setSoruHatasi(true),
      });
    }, kalanGB);
    return () => { iptal = true; clearTimeout(zamanlayici); durdur?.(); };
  }, [mac?.id, mac?.durum, kendiIndeks, mac?.soru_ids?.length, senkronBekliyor, duraklamaTuru, sonKartBekliyor]);

  // ---- RAKİBİN JOKERİ (Paket 31 A) ----
  // Klasik Mod'da rakibin Soru Değiştir'i (ortak) ve Süreyi Kısalt'ı BENİM sorumu /
  // sayacımı değiştirir. Soru yukarıda yalnız indeks değişince çekiliyordu; sunucu bu
  // jokerlerde `joker_surum`'u artırıyor (Realtime + 2 sn yoklama) → soruyu yeniden oku.
  // Yalnız gerçekten değiştiyse state'e yaz: kart boşuna sıfırlanmasın.
  const jokerSurum = mac?.joker_surum ?? 0;
  const ilkSurumRef = useRef(null);
  // Paket 32 A: rakibin Sisi — kalkacağı an (istemci saatine çevrilmiş ms). Soru değişince sıfır.
  const [sisBitis, setSisBitis] = useState(null);
  useEffect(() => { setSisBitis(null); }, [kendiIndeks]);
  useEffect(() => {
    if (!mac || mac.durum !== "aktif" || !senkron) return undefined;
    if (ilkSurumRef.current === null) { ilkSurumRef.current = jokerSurum; return undefined; }
    if (cevapladim) return undefined;
    let iptal = false;
    (async () => {
      try {
        const gonderildiMs = Date.now();
        const { data, error } = await supabase.rpc("get_match_question", { p_match_id: mac.id });
        const alindiMs = Date.now();
        if (error) throw error;
        const ham = data?.[0];
        const yeni = ham ? { ...ham, _saat_ornek_ms: (gonderildiMs + alindiMs) / 2,
          _ag_gecikmesi_ms: alindiMs - gonderildiMs } : null;
        if (iptal || !yeni) return;
        setSoru((eski) =>
          eski && eski.question_id === yeni.question_id && eski.baslangic === yeni.baslangic
            && eski.soru_index === yeni.soru_index
            ? eski
            : yeni
        );
        // Paket 32 A: Sis — bitişi sunucu saatinden istemci saatine çevir
        const { data: jd, error: je } = await supabase.rpc("joker_mac_durumu", { p_mac_tur: "1v1", p_mac_id: mac.id });
        if (je) throw je;
        const d = Array.isArray(jd) ? jd[0] : jd;
        if (!iptal && d?.sis_bitis && d?.sunucu_zamani) {
          const bitis = Date.parse(d.sis_bitis) - Date.parse(d.sunucu_zamani) + Date.now();
          if (bitis > Date.now()) setSisBitis(bitis);
        }
      } catch (e) {
        console.warn("[Bildim] rakip jokeri sonrası soru okunamadı:", e?.message ?? e);
      }
    })();
    return () => { iptal = true; };
  }, [jokerSurum]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- NABIZ ----
  // 3 sn'de bir "buradayım" der, "Hazır"a basıldığını iletir ve ekranın ne
  // çizeceğini (kapı / kilit / oyun) sunucudan öğrenir. Sekme arka planda
  // olduğunda BİLEREK atılmaz — rakip o an ekranımızın kilitlenmesini görür.
  const nabizParam = useMemo(() => ({ p_match_id: id }), [id]);
  const { nabiz, hazirla } = useMacNabiz("mac_nabiz", nabizParam, Boolean(mac));

  const duraklatildi = Boolean(nabiz?.duraklatildi) && mac?.durum === "aktif";
  const duraklamaSn = nabiz?.duraklama_sn ?? 0;

  // 3-2-1: maç başladı ama soru saati henüz gelmedi (sunucu 3 sn ileri kurdu).
  // Sunucu saatiyle kendi saatimiz arasındaki farkı nabızdan öğreniyoruz;
  // cihaz saati yanlışsa bile geri sayım doğru çalışır.
  // 326: sonraki soruların başlangıcı da gösterim payı kadar ileridedir — 3-2-1 yalnız ilk soruda.
  const ilkSoruMu = (mac?.aktif_soru ?? 0) === 0;
  const [geriSayim, setGeriSayim] = useState(null);
  useEffect(() => {
    if (!ilkSoruMu || !nabiz?.basladi || !nabiz?.baslangic || !nabiz?.sunucu_zamani) {
      setGeriSayim(null);
      return undefined;
    }
    const fark = new Date(nabiz.sunucu_zamani).getTime() - Date.now();
    const bitis = new Date(nabiz.baslangic).getTime();
    const hesapla = () => {
      const kalan = (bitis - (Date.now() + fark)) / 1000;
      setGeriSayim(kalan > 0.05 ? kalan : null);
    };
    hesapla();
    const id = setInterval(hesapla, 100);
    return () => clearInterval(id);
  }, [ilkSoruMu, nabiz?.basladi, nabiz?.baslangic, nabiz?.sunucu_zamani]);

  /** Rakip gelmiyor: maçı sıra tabanlı (asenkron) bırak. */
  const asenkronaGec = async () => {
    try {
      const { error } = await supabase.rpc("mac_asenkrona_gec", { p_match_id: id });
      if (error) throw error;
      await macYukle();
    } catch (e) {
      console.error("[Bildim] asenkrona gecilemedi:", e);
    }
  };

  // Sunucu durumu değişince maç satırını tazele (maç başladı / hükmen bitti).
  const oncekiNabizRef = useRef(null);
  useEffect(() => {
    if (!nabiz) return;
    const onceki = oncekiNabizRef.current;
    oncekiNabizRef.current = nabiz;
    if (!onceki) return;
    // Maç başladı, duraklama bitti ya da maç sonlandı: hepsi yeni veri ister.
    if (onceki.basladi !== nabiz.basladi
      || onceki.duraklatildi !== nabiz.duraklatildi
      || onceki.durum !== nabiz.durum) {
      macYukle();
      // Duraklama bittiğinde soru saati İLERİ kaydırılmıştır; soruyu yeniden
      // çekmezsek kart eski (dolmuş) sayaçla kalır.
      if (onceki.duraklatildi && !nabiz.duraklatildi) setDuraklamaTuru((n) => n + 1);
    }
  }, [nabiz, macYukle]);

  // 410 (Ajan I): eşleştirme maçında rakip kapıya bağlanamadı → sunucu maçı cezasız iptal etti
  // (mac_nabiz, loadout_secim_sn). Bekleyen oyuncu aynı türle yeniden aramaya döner.
  const rakipBaglanmadi = mac?.durum === "iptal" && Boolean(mac?.baglanmayan);
  const yenidenAraDurumu = mac ? { yenidenAra: { dereceli: mac.dereceli !== false, jokersiz: Boolean(mac.jokersiz) } } : null;
  useEffect(() => {
    if (!rakipBaglanmadi || mac.baglanmayan === user?.id) return;
    navigate(y("/"), { replace: true, state: yenidenAraDurumu });
  }, [rakipBaglanmadi]); // eslint-disable-line react-hooks/exhaustive-deps

  const maciIptalEt = async () => {
    try {
      await supabase.rpc("mac_iptal", { p_match_id: id });
    } catch (e) {
      console.error("[Bildim] mac iptal edilemedi:", e);
    }
    navigate(y("/meydan"));
  };

  // Rakip bir soru ilerlediyse (yani cevap verdiyse) avatarı bir kez atsın
  useEffect(() => {
    const onceki = rakipIlerlemeRef.current;
    rakipIlerlemeRef.current = ilerleme.rakip;
    if (ilerleme.rakip <= onceki) return;
    setRakipNabiz(true);
    const t = setTimeout(() => setRakipNabiz(false), 700);
    return () => clearTimeout(t);
  }, [ilerleme.rakip]);

  // Ajan I: "Hazır mısın?" kapısı da tam ekran sahne (arama sahnesiyle aynı; üst/alt menü gizli)
  useOyunModu((Boolean(soru) || senkronBekliyor) && mac?.durum === "aktif");

  useEffect(() => {
    if (mac?.durum !== "bitti") { setSonucHazir(false); return undefined; }
    const kalan = Math.max(0, GB_MS - (Date.now() - cevapZamaniRef.current));
    if (kalan === 0) { setSonucHazir(true); return undefined; }
    const t = setTimeout(() => setSonucHazir(true), kalan);
    return () => clearTimeout(t);
  }, [mac?.durum]);

  // Maç bitince puan tazele + (sıklık kuralı uygunsa) geçiş reklamı
  const reklamGosterildiRef = useRef(false);
  useEffect(() => {
    if (mac?.durum === "bitti") {
      refreshProfile(user.id);
      if (pollRef.current) clearInterval(pollRef.current);
      if (!reklamGosterildiRef.current) {
        reklamGosterildiRef.current = true;
        // İlk 3 gün reklamsız: hesabın açılış tarihi reklam.js'e verilir.
        macBittiReklam(profile?.created_at).catch((e) => console.warn("[Bildim] reklam gösterilemedi:", e?.message ?? e)); // oyunu asla bloklamaz
      }
    }
  }, [mac?.durum, refreshProfile, user.id]);

  // Asenkron akışta ortak ilerletme yok; advance_match yalnız BİTİŞ kontrolü
  // yapıyor. Rakip kendi bölümünü bitirmiş olabilir diye ara ara yoklanır.
  const ilerletmeyiDene = useCallback(() => {
    // Hata olsa da maç tazelenir (rpcDene hatayı konsola yazar, reddetmez).
    rpcDene("advance_match", { p_match_id: id }).then(() => macYukle());
  }, [id, macYukle]);

  const cevapla = async (i) => {
    const { data, error } = await supabase.rpc("submit_match_answer", {
      p_match_id: id,
      p_cevap: i,
      // 329: hangi soruyu cevapladığımız — soru değiştiyse (eski kart) sunucu reddeder.
      p_soru_index: soru?.soru_index ?? null,
    });
    if (error) throw error;
    const satir = data?.[0];
    // İkinci Şans'ın ilk yanlışında soru ilerlemez; aynı sayaçla ikinci
    // seçim açılır. Bu dönüş final cevap değildir ve skor tazelenmez.
    if (satir?.tekrar_hakki) return satir;
    cevapZamaniRef.current = Date.now();
    setCevapladim(true);

    // Skor tabelası ANINDA güncellensin: sunucu kazanılan puanla birlikte
    // güncel iki skoru da döndürüyor (migration 137). Eskiden tabela
    // Realtime'ı ya da yoklamayı bekliyordu; puan bir tur geç görünüyordu.
    if (satir && Number.isFinite(Number(satir.benim_skor))) {
      setMac((m) => {
        if (!m) return m;
        const benimP1 = m.oyuncu1 === user.id;
        const yeni = {
          ...m,
          oyuncu1_skor: benimP1 ? Number(satir.benim_skor) : Number(satir.rakip_skor),
          oyuncu2_skor: benimP1 ? Number(satir.rakip_skor) : Number(satir.benim_skor),
        };
        damgaRef.current = Math.max(damgaRef.current, ilerlemeDamgasi(yeni));
        return yeni;
      });
    }

    // Kendi sıramız sunucuda ilerledi; bir sonraki soruyu çekmek için tazele.
    setTimeout(macYukle, GB_MS);
    return satir;
  };

  // Asenkron maç: süre dolunca YALNIZ kendi sıramız atlanır, rakip beklenmez.
  // Atlama RPC'si atlanan sorunun DOĞRU CEVABINI döndürür; QuestionCard onu
  // yeşile boyayıp geri bildirim penceresini açar. Sonraki soru pencere
  // kadar (GB_MS) beklendikten sonra yüklenir — eskiden ekran anında
  // atlıyor, doğru cevap hiç gösterilmiyordu.
  const sureDoldu = useCallback(async () => {
    if (advanceKilidi.current) return null;
    advanceKilidi.current = true;
    try {
      // Zaman aşımı şart: sekme arka plandayken açılan RPC soket koptuğu için
      // ne çözülüyor ne reddediliyordu, kilit sonsuza kadar kapalı kalıyordu.
      const { data, error } = await zamanAsimiyla(
        supabase.rpc("mac_soruyu_atla", { p_match_id: id }),
        10000,
        "mac_soruyu_atla"
      );
      if (error) throw error;
      const satir = Array.isArray(data) ? data[0] : data;

      // BOŞ DÖNÜŞ = sunucu atlamayı kabul etmedi. En sık sebep saat farkı:
      // istemcinin sayacı 15. saniyede biterken sunucu 17 saniye dolmadan
      // atlamıyordu; arada kalan ~2 saniyede RPC hata da vermiyor, boş
      // dönüyordu. Kilit kapalı kaldığı için soru ne ilerliyor ne yeniden
      // deneniyordu: ekran "Süre doldu"da donuyordu.
      if (!satir || satir.dogru_cevap == null) {
        advanceKilidi.current = false;   // kilidi AÇ: tik yeniden denesin
        macYukle();
        throw new Error("Soru atlanamadi, yeniden denenecek");
      }

      cevapZamaniRef.current = Date.now();
      setTimeout(macYukle, GB_MS);
      return satir.dogru_cevap;
    } catch (e) {
      // Kilidi AÇ: atlama olmadı, soru hâlâ sunucuda duruyor. Kapalı bırakılsaydı
      // oyuncu sekmeden döndüğünde ne ilerleme ne yeniden deneme olurdu.
      advanceKilidi.current = false;
      // "yeniden denenecek" BEKLENEN bir durum (saat farkı): kendiliğinden
      // düzeliyor. console.error olarak basılınca gerçek hatalar günlükte
      // kayboluyordu; o dal uyarı, gerisi hata.
      if (/yeniden denenecek/.test(String(e?.message ?? ""))) {
        console.warn("[Bildim] soru atlama yeniden denenecek (saat farkı):", e.message);
      } else {
        console.error("[Bildim] soru atlanamadi:", e);
      }
      macYukle();
      throw e; // QuestionCard hatayı görüp kendi kilidini de açsın
    }
  }, [id, macYukle]);

  // Maç bitince bu oyuncunun gerçek kazancı (lig puanı + coin) sunucudan okunur.
  const macBitti = mac?.durum === "bitti" && sonucHazir;
  useEffect(() => {
    if (!macBitti || !id) return;
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("mac_odulum", { p_match_id: id });
        if (error) throw error;
        const o = Array.isArray(data) ? data[0] : data;
        if (aktif && o) {
          setOdulum(o);
          // Paket 36: üst bar coin sayacını MacSonuSahnesi coin uçuşu bitince tazeler
          // (coinTazele); burada çağrılsaydı sayı coinler varmadan değişirdi.
        }
      } catch (e) {
        console.error("[Bildim] mac odulu alinamadi:", e);
      }
    })();
    return () => { aktif = false; };
  }, [macBitti, id]);

  // SESLİ SOHBET TEK ÖRNEK (Paket 14, 5.1): maç bitince ekran başka bir dal
  // çiziyordu; bileşen sökülüp görüşmeyi kapatıyordu. Artık bileşen her dalda
  // aynı konumda (fragment'in 2. çocuğu) kalır, arayüzü yalnız dalın içindeki
  // yuvaya (bd-ses-yuva) portal ile çizilir. Maç bitince 30 sn daha açık kalır.
  const ekran = (() => {
    if (!mac) {
      return (
        <MacYukleniyor
          hata={yuklemeHatasi}
          onTekrarDene={() => { setYuklemeHatasi(null); macYukle(); }}
        />
      );
    }

    const benP1 = mac.oyuncu1 === user.id;
    const toplamSoru = mac.soru_ids?.length ?? 5;
    const benimSkor = benP1 ? mac.oyuncu1_skor : mac.oyuncu2_skor;
    const rakipSkor = benP1 ? mac.oyuncu2_skor : mac.oyuncu1_skor;
    const rakipProfil = benP1 ? mac.p2 : mac.p1;
    const rakipBot = Boolean(rakipProfil?.acik_bot);
    const benimProfil = benP1 ? mac.p1 : mac.p2;

    if (mac.durum === "bekliyor") {
      // Paket 41 M.4: kalan süre (cevapsız davet 24 saatte düşer — eski_davetleri_temizle) + geri çekme
      const kalanDk = mac.created_at
        ? Math.max(0, Math.round((new Date(mac.created_at).getTime() + 24 * 3600000 - Date.now()) / 60000))
        : null;
      return (
        <div className="m1-mesaj">
          <span className="m1-mesaj-ikon" aria-hidden="true"><QtIkon ad="saat" boyut={36} /></span>
          <h1 className="qt-baslik-1">{tt("Cevap bekleniyor")}</h1>
          <p>{tt("{0} henüz kabul etmedi.", { 0: rakipProfil?.gorunen_ad ?? "" })}</p>
          {kalanDk !== null && (
            <p>
              {kalanDk >= 60
                ? tt("Davet {0} saat daha geçerli.", { 0: Math.floor(kalanDk / 60) })
                : tt("Davet {0} dakika daha geçerli.", { 0: kalanDk })}
            </p>
          )}
          <div className="m1-dugmeler">
            <QtDugme tamGenislik onClick={() => navigate(y("/meydan"))}>{tt("Meydan okumalara dön")}</QtDugme>
            {mac.oyuncu1 === user.id && (
              <QtDugme tur="hayalet" tamGenislik onClick={maciIptalEt}>{tt("Daveti geri çek")}</QtDugme>
            )}
          </div>
        </div>
      );
    }

    // Senkron kapısı: HERKES "Hazır"a basana kadar soru gösterilmez.
    // Rakip ekranda olsa bile onay vermeden maç başlamaz (kullanıcı isteği).
    if (senkronBekliyor) {
      return (
        <HazirKapisi
          skillSecimi={!mac.jokersiz}
          macTur="1v1"
          benHazir={Boolean(nabiz?.ben_hazir)}
          hazirSayisi={(nabiz?.ben_hazir ? 1 : 0) + (nabiz?.rakip_hazir ? 1 : 0)}
          toplamOyuncu={2}
          // Paket 42 D.4: tek durum dili — "Beklenen" hazır olmayan HERKESİ sayar, kendisi dahil ("Sen")
          bekleyenAdlar={
            nabiz
              ? [!nabiz.ben_hazir && tt("Sen"), !nabiz.rakip_hazir && rakipProfil?.gorunen_ad].filter(Boolean)
              : []
          }
          onHazir={hazirla}
          // Henüz tek cevap yok: mac_iptal puansız iptal eder ve rakibe haber
          // verir. Maçı ortada asılı bırakmaktan iyisi bu.
          onCik={maciIptalEt}
          // Bot maçında asenkron seçeneği anlamsız (bot zaten hep hazır).
          onAsenkron={rakipBot ? null : asenkronaGec}
          bekleyenSn={nabiz?.lobi_saniye ?? 0}
          tabela={
            // Ajan I: arama sahnesiyle aynı VS kartları (çerçeve, ad, level, lig) + hazır rozeti
            <div className="ara-vs">
              <VsKarti profil={benimProfil} kart={seviyeler[benimProfil?.id]} taraf="ben">
                <QtRozet boyut="k" ton={nabiz?.ben_hazir ? "dogru" : "koyu"}>{nabiz?.ben_hazir ? tt("hazır") : tt("hazır değil")}</QtRozet>
              </VsKarti>
              <span className="ara-vs-rozet" aria-hidden="true"><span>VS</span></span>
              <VsKarti profil={rakipProfil} kart={seviyeler[rakipProfil?.id]} taraf="rakip">
                <QtRozet boyut="k" ton={nabiz?.rakip_hazir ? "dogru" : "koyu"}>{nabiz?.rakip_hazir ? tt("hazır") : tt("hazır değil")}</QtRozet>
              </VsKarti>
            </div>
          }
        />
      );
    }

    // 410: zamanında gelmeyen taraf (bekleyen zaten yeniden aramaya gönderildi)
    if (rakipBaglanmadi) {
      return (
        <div className="m1-mesaj">
          <span className="m1-mesaj-ikon" aria-hidden="true"><QtIkon ad="saat" boyut={36} /></span>
          <h1 className="qt-baslik-1">{tt("Maç iptal edildi")}</h1>
          <p>{tt("Maç zamanında başlamadığı için iptal edildi. Kimse puan kaybetmedi.")}</p>
          <div className="m1-dugmeler">
            <QtDugme tamGenislik onClick={() => navigate(y("/"), { replace: true, state: yenidenAraDurumu })}>{tt("Yeni rakip ara")}</QtDugme>
            <QtDugme tur="hayalet" tamGenislik onClick={() => navigate(y("/"))}>{tt("Ana sayfa")}</QtDugme>
          </div>
        </div>
      );
    }

    if (mac.durum === "reddedildi" || mac.durum === "iptal") {
      return (
        <div className="m1-mesaj">
          <span className="m1-mesaj-ikon" aria-hidden="true"><QtIkon ad="carpi" boyut={36} /></span>
          <h1 className="qt-baslik-1">{tt("Meydan okuma reddedildi")}</h1>
          <div className="m1-dugmeler">
            <QtDugme tamGenislik onClick={() => navigate(y("/meydan"))}>{tt("Geri dön")}</QtDugme>
          </div>
        </div>
      );
    }

    if (mac.durum === "bitti" && sonucHazir && !gecisBitti) {
      return (
        <SureDolduGecis
          baslik={tt("Maç bitti!")}
          skor={mac.oyuncu1 === user.id ? mac.oyuncu1_skor : mac.oyuncu2_skor}
          skorEtiket={tt("puan")}
          kazandi={mac.kazanan === user.id}
          kaybetti={mac.kazanan !== null && mac.kazanan !== user.id}
          berabere={mac.kazanan === null}
          onBitti={() => setGecisBitti(true)}
        />
      );
    }

    if (mac.durum === "bitti" && sonucHazir) {
      const kazandim = mac.kazanan === user.id;
      const berabere = mac.kazanan === null;
      const durumSinifi = kazandim ? "kazandi" : berabere ? "berabere" : "kaybetti";
      // Paket 36 I: yakınlık satırı veriden. Sunucu her doğruya SORU_PUANI verir
      // (cevap_ver, migration 250); fark 1-2 soru değilse kaybetmede satır hiç çizilmez.
      const farkSoru = Math.round(Math.abs((benimSkor ?? 0) - (rakipSkor ?? 0)) / SORU_PUANI);
      const altYazi = mac.terk_eden
        ? mac.terk_eden === user.id
          ? tt("Maçtan ayrıldığın için hükmen mağlup sayıldın.")
          : tt("{0} maçı terk etti — hükmen kazandın.", { 0: rakipProfil?.gorunen_ad })
        : berabere || farkSoru < 1
          ? null
          : kazandim || farkSoru <= 2
            ? tt("{n} soru farkla", { n: farkSoru })
            : null;
      // Rövanş: bot rakipte doğrudan yeni maç (burada), gerçek oyuncuda istek
      // (MacSonuEklentisi, portal ile eylem çubuğuna). İkisi aynı anda ASLA görünmez.
      const rovansVar = rakipBot || (!kazandim && !berabere);
      const oduller = [
        { ikon: "yildiz", deger: odulum?.lig_puan ?? 0, etiket: tt("lig puanı") },
        { ikon: "coin", deger: odulum?.coin ?? 0, etiket: tt("coin") },
      ];
      return (
        <MacSonuSahnesi
          durum={durumSinifi}
          baslik={berabere ? tt("Berabere!") : kazandim ? tt("Kazandın!") : tt("Kaybettin")}
          altYazi={altYazi}
          ben={{ profil: benimProfil, skor: benimSkor, ek: `${ilerleme.ben}/${toplamSoru}` }}
          rakip={{ profil: rakipProfil, skor: rakipSkor, ek: `${ilerleme.rakip}/${toplamSoru}` }}
          oduller={oduller}
          levelKaynak={`mac:${id}`}
          gorevler={gorevler}
          detayRozet={yanlisAdet}
          ozet={
            <>
              {/* Paket 20 I.3: satır satır döküm; üstteki ödül hapları da aynı sunucu toplamını gösterir */}
              <OdulDokumu kaynak={`mac:${id}`} onGorevler={setGorevler} gorevleriGoster={false} onToplam={(t) => setOdulum((o) => ({ ...(o ?? {}), lig_puan: t.lig, coin: t.coin }))} />
              <MacSonuDokum macId={id} kazanilanPuan={odulum?.lig_puan ?? 0} />
              <MacSorulari kaynak={`mac:${id}`} />
              <MacSonuEklentisi
                macTur="1v1"
                macId={id}
                kaybettim={!kazandim && !berabere}
                rakipBot={rakipBot}
                rovansYuva={rovansYuva}
                onYanlisAdet={setYanlisAdet}
              />
              {(() => {
                const sonucYazi = berabere
                  ? tt("{0} ile {1}-{2} berabere kaldım", { 0: rakipProfil?.gorunen_ad, 1: benimSkor, 2: rakipSkor })
                  : kazandim
                    ? tt("{0} karşısında {1}-{2} kazandım!", { 0: rakipProfil?.gorunen_ad, 1: benimSkor, 2: rakipSkor })
                    : tt("{0} karşısında kıl payı kaybettim", { 0: rakipProfil?.gorunen_ad });
                const mesaj = tt("Quiz Tactics'te {0} Sen de gel, kapışalım: {1}/?davet={2}", { 0: sonucYazi, 1: window.location.origin, 2: user.id });
                const enc = encodeURIComponent(mesaj);
                return (
                  <div className="m1-ss-satir" role="group" aria-label={tt("Paylaş")}>
                    <QtDugme as="a" tur="ikincil" boyut="k" ikon="paylas" href={`https://wa.me/?text=${enc}`} target="_blank" rel="noreferrer">
                      WhatsApp
                    </QtDugme>
                    <QtDugme as="a" tur="ikincil" boyut="k" href={`https://twitter.com/intent/tweet?text=${enc}`} target="_blank" rel="noreferrer">
                      {tt("𝕏 Paylaş")}
                    </QtDugme>
                    <QtDugme
                      tur="ikincil"
                      boyut="k"
                      ikon="kopyala"
                      onClick={async () => {
                        try {
                          if (navigator.share) await navigator.share({ title: "Quiz Tactics", text: mesaj });
                          else await navigator.clipboard.writeText(mesaj);
                        } catch { /* vazgeçti ya da pano kapalı */ }
                      }}
                    >
                      {tt("Diğer")}
                    </QtDugme>
                  </div>
                );
              })()}
            </>
          }
          eylemler={
            <>
              {rakipBot && (
                <QtDugme
                  className="mss-tam"
                  ikon="yenile"
                  yukleniyor={botRovans}
                  onClick={async () => {
                    setBotRovans(true);
                    try {
                      const { data, error } = await supabase.rpc("create_challenge", {
                        p_rakip: rakipProfil.id,
                        p_kategori: mac.kategori,
                      });
                      if (error) throw error;
                      navigate(y(data ? `/mac/${data}` : "/meydan"));
                    } catch (e) {
                      console.error("[Bildim] bot rövanşı kurulamadı:", e);
                      navigate(y("/meydan"));
                    } finally {
                      setBotRovans(false);
                    }
                  }}
                >
                  {tt("Rövanş")}
                </QtDugme>
              )}
              {/* Gerçek rakipte Rövanş isteği MacSonuEklentisi'nden buraya çizilir */}
              <div className="mss-eylem-yuva" ref={setRovansYuva} />
              <QtDugme
                tur={rovansVar ? "ikincil" : "birincil"}
                className={rovansVar ? "" : "mss-tam"}
                onClick={() => navigate(y("/meydan"))}
              >
                {tt("Meydan okumalara dön")}
              </QtDugme>
              <QtDugme tur="ikincil" onClick={() => navigate(y())}>{tt("Ana sayfa")}</QtDugme>
            </>
          }
        >
          {/* Meydandan girilmişse maç bitince oraya dönülür (harita/donus.js) */}
          <MeydanaDonus />
          <HesapGuvenceOnerisi kazandim={kazandim} />
          {/* MAÇ BİTTİ AMA OTURUM KAPANMAZ.
              Sayfa kendiliğinden kapanmıyor; oyuncular isterlerse burada kalıp
              konuşmaya devam eder, çıkmaya kendileri karar verir. Sohbet ve
              sesli sohbet bu yüzden sonuç ekranında da duruyor. */}
          <p className="m1-ss-not">
            {rakipBot
              ? tt("Maç bitti ama oturum açık: istersen burada kalıp sohbet edebilirsin. Çıkmak sana kalmış.")
              : tt("Maç bitti ama oturum açık: istersen burada kalıp {0} ile konuşmaya devam edebilirsin. Çıkmak sana kalmış.", { 0: rakipProfil?.gorunen_ad ?? "" })}
          </p>

          <div className="bd-ses-yuva" ref={setSesYuva} />

          {(balonlar[user.id] || balonlar[rakipProfil?.id]) && (
            <div className="m1-balonlar" aria-live="polite">
              {balonlar[user.id] && <div className="m1-balon">{balonIcerik(balonlar[user.id])}</div>}
              {balonlar[rakipProfil?.id] && (
                <div className="m1-balon m1-balon--rakip">{balonIcerik(balonlar[rakipProfil?.id])}</div>
              )}
            </div>
          )}

          <div className="m1-tepki" role="group" aria-label={tt("Tepkiler")}>
            {TEPKILER.map((t) => (
              <QtIkonDugme key={t.deger} ikon={t.ad} etiket={t.etiket} onClick={() => mesajGonder(t.deger)} />
            ))}
            <QtIkonDugme
              ikon="sohbet"
              etiket={tt("Hazır cümleler")}
              aria-expanded={kaliplarAcik}
              tur={kaliplarAcik ? "mor" : "yuzey"}
              onClick={() => setKaliplarAcik((a) => !a)}
            />
          </div>
          {kaliplarAcik && (
            <div className="m1-kaliplar">
              {KALIPLAR.map((k) => (
                <QtCip key={k} aria-pressed={undefined} onClick={() => mesajGonder(k)}>{k}</QtCip>
              ))}
            </div>
          )}
        </MacSonuSahnesi>
      );
    }

    // Asenkron maç: kendi bölümümüz bitti ama rakip henüz oynamadı.
    // Maç burada kapanmaz — rakip kendi zamanında oynayınca sonuçlanır.
    const benimSoru = benP1 ? (mac.oyuncu1_soru ?? 0) : (mac.oyuncu2_soru ?? 0);
    const senOyuncu = {
      ad: benimProfil?.gorunen_ad ?? tt("Sen"),
      avatar: avatarSrc(benimProfil),
      avatarDugum: <CerceveliAvatar profile={benimProfil} userId={benimProfil?.id} boyut={48} hareketli kart={seviyeler[benimProfil?.id]} />,
      alt: <SeviyeEtiketi {...(seviyeler[benimProfil?.id] ?? {})} />,
    };
    const rakipOyuncu = {
      ad: rakipProfil?.gorunen_ad ?? tt("Rakip"),
      avatar: avatarSrc(rakipProfil),
      avatarDugum: <CerceveliAvatar profile={rakipProfil} userId={rakipProfil?.id} boyut={48} hareketli kart={seviyeler[rakipProfil?.id]} />,
      alt: <SeviyeEtiketi {...(seviyeler[rakipProfil?.id] ?? {})} />,
    };
    // Bu ekran YALNIZ eski asenkron maçlara ait: senkron maçta iki taraf aynı
    // anda bitirir, maç da o anda sonuçlanır.
    if (!senkron && mac.durum === "aktif" && benimSoru >= toplamSoru) {
      return (
        <div className="m1-mesaj">
          <Maskot poz="selam" boyut={96} />
          <h1 className="qt-baslik-1">{tt("Senin bölümün bitti")}</h1>
          <p>
            {tt("{0} sorunun tamamını oynadın. {1} kendi zamanında oynayınca maç sonuçlanacak — bittiğinde sana haber vereceğiz.", { 0: toplamSoru, 1: rakipProfil?.gorunen_ad ?? "" })}
          </p>
          <QtMacUst sen={senOyuncu} rakip={rakipOyuncu} skor={[benimSkor ?? 0, rakipSkor ?? 0]} />
          <div className="m1-dugmeler">
            <QtDugme tamGenislik onClick={() => navigate(y("/meydan"))}>{tt("Yeni maça başla")}</QtDugme>
          </div>
        </div>
      );
    }

    // Aktif maç
    // İlk render'da bir kez karar ver: rakip öndeyse bilgi kartını göster.
    // Senkron maçta kimse öne geçemez; bu kart yalnız eski maçlarda anlamlı.
    if (ilkGirisRef.current === null) {
      ilkGirisRef.current = !senkron && ilerleme.rakip > ilerleme.ben && benimSoru === 0;
    }
    const rakipOnde = ilkGirisRef.current;
    // Rakip bu soruyu cevapladı mı (senkronda sayaç ortak soruyu geçtiyse) — küçük onay rozeti.
    const rakipCevapladi = rakipNabiz || (senkron && ilerleme.rakip > kendiIndeks);

    return (
      <>
        {/* 3-2-1: iki oyuncuda da AYNI ANDA biter, ilk soru gecikmesiz açılır. */}
        {geriSayim !== null && <GeriSayim kalan={geriSayim} />}
        <RakipCevapSesi anahtar={rakipCevapladi ? `${mac.id}:${kendiIndeks}` : null} />

        {/* Rakip oyundan çıktı / ekran değiştirdi: ekran kilitlenir, maç durur.
            Süre işlemediği için burada bekleyen oyuncu bir şey kaybetmez. */}
        {duraklatildi && (
          <KopukPerde
            bekleyenAdlar={rakipProfil?.gorunen_ad ? [rakipProfil.gorunen_ad] : []}
            gecenSn={duraklamaSn}
          />
        )}

        {/* Maç ekranında alt menü gizli; çıkış sol üstte.
            Paket 41 B/E/H: ortak üst şerit — çıkış (aynı davranış) + mod rozeti + ses. */}
        <MacUstSerit
          onCik={() => navigate(y("/meydan"))}
          rozet={mac.jokersiz ? tt("Saf Bilgi · skillsiz") : tt("Klasik Mod")}
        />

        {rakipOnde && !bilgiKapandi && (
          <div className="m1-bant m1-bant--bilgi">
            <span>
              {tt("{0} senden önde. Bu maç sıra beklemeden oynanır — sen kendi hızında devam et, rakibin de kendi zamanında oynar.", { 0: rakipProfil?.gorunen_ad ?? "" })}
            </span>
            <QtIkonDugme tur="saydam" ikon="carpi" etiket={tt("Kapat")} onClick={() => setBilgiKapandi(true)} />
          </div>
        )}

        {/* ÖDÜL UYARISI — aynı rakiple aynı gün çok maç yapılınca ödül azalır.
            Maç yine oynanır; oyuncu bunu BAŞTAN bilsin diye yazılır. */}
        {ciftDurum && Number(ciftDurum.carpan) < 1 && (
          <div className="m1-bant">
            <span>
              {Number(ciftDurum.carpan) === 0
                ? tt("Bugün bu rakiple {0}. maçın — bu bir dostluk maçı, puan ve coin vermez.", { 0: ciftDurum.sira })
                : tt("Bugün bu rakiple {0}. maçın — ödül yarıya düşecek.", { 0: ciftDurum.sira })}
            </span>
          </div>
        )}

        {/* Üst tabela: iki oyuncu + skor. Skor değişince zıplar. */}
        <QtMacUst
          sen={senOyuncu}
          rakip={{
            ...rakipOyuncu,
            etkiler: rakipCevapladi ? <QtEtki ikon="onay" etiket={tt("Rakip cevapladı")} /> : null,
          }}
          skor={[benimSkor ?? 0, rakipSkor ?? 0]}
          skorAnahtar={benimSkor ?? 0}
        />

        {(balonlar[user.id] || balonlar[rakipProfil?.id]) && (
          <div className="m1-balonlar" aria-live="polite">
            {balonlar[user.id] && <div className="m1-balon">{balonIcerik(balonlar[user.id])}</div>}
            {balonlar[rakipProfil?.id] && (
              <div className="m1-balon m1-balon--rakip">{balonIcerik(balonlar[rakipProfil?.id])}</div>
            )}
          </div>
        )}

        {jokerHata && <div className="m1-bant m1-bant--hata" role="alert"><span>{jokerHata}</span></div>}

        {/* Soru gelmedi: sessizce donmak yerine sebebini söyle ve yol ver.
            (Denemeler oyun/lib/soruCek.js'te; buraya düşmesi hepsinin
            tükendiği anlamına gelir.) */}
        {soruHatasi && !soru && (
          <QtBosDurum
            ikon="uyari"
            ton="yanlis"
            baslik={tt("Soru gelmedi")}
            metin={tt("Bağlantını kontrol edip tekrar dene.")}
            eylem={
              <QtDugme onClick={() => { setSoruHatasi(false); setDuraklamaTuru((n) => n + 1); macYukle(); }}>
                {tt("Tekrar dene")}
              </QtDugme>
            }
          />
        )}

        {soru && (
          <QuestionCard
            // KEY GÖSTERİLEN SORUYA BAĞLI (Paket 14, 5.2 — ölçüldü): eskiden
            // `kendiIndeks`e bağlıydı. Rakip önce cevaplamışsa bizim cevabımız
            // sunucuda soruyu anında ilerletiyor, Realtime ~300-500 ms'de indeksi
            // değiştiriyor ve kart ESKİ soruyla yeniden bindiriliyordu: seçim ve
            // doğru cevap işareti siliniyor, yeni soru 1 sn sonra geldiği için
            // ekran işaretsiz/donmuş görünüyordu. Yeni soru geri bildirim
            // penceresi (GB_MS) dolunca çekiliyor; kart da ancak o zaman değişir.
            // (Asenkron maçlarda `kendiIndeks` herkesin kendi sırasıdır.)
            key={`${mac.id}-${soru.soru_index ?? kendiIndeks}-${duraklamaTuru}`}
            soru={soru}
            onCevapla={cevapla}
            onSureDoldu={sureDoldu}
            macTur={"1v1"}
            jokerSurum={jokerSurum}
            jokerYok={Boolean(mac.jokersiz)}
            sisBitis={sisBitis}
            macId={id}
            kategori={mac.kategori}
            toplamSoru={toplamSoru}
          />
        )}

        {cevapladim && (
          <div className="m1-bekleme" role="status">
            {senkron
              ? tt("{0} cevaplayınca soru geçecek…", { 0: rakipProfil?.gorunen_ad ?? "" })
              : tt("Sıradaki soru geliyor…")}
          </div>
        )}

        <div className="m1-alt">
          {/* Sesli sohbet: yalnız arkadaş olan iki oyuncu aynı anda maçtayken çizilir. */}
          <div className="bd-ses-yuva" ref={setSesYuva} />

          {/* SADELEŞTİRME (12 Eylül 2026): ekranın tek işi soruyu cevaplamak; tepkiler
              tek düğmenin arkasında. Panelde aynı tepkiler ve aynı kalıplar var. */}
          <div className="m1-tepki">
            <QtIkonDugme
              ikon="sohbet"
              etiket={tt("Tepki gönder")}
              aria-expanded={tepkiAcik}
              tur={tepkiAcik ? "mor" : "yuzey"}
              onClick={() => setTepkiAcik((a) => !a)}
            />
          </div>
          {tepkiAcik && (
            <div className="m1-tepki" role="group" aria-label={tt("Tepkiler")}>
              {TEPKILER.map((t) => (
                <QtIkonDugme
                  key={t.deger}
                  ikon={t.ad}
                  etiket={t.etiket}
                  onClick={() => { mesajGonder(t.deger); setTepkiAcik(false); }}
                />
              ))}
              <QtIkonDugme
                ikon="sohbet"
                etiket={tt("Hazır cümleler")}
                aria-expanded={kaliplarAcik}
                tur={kaliplarAcik ? "mor" : "yuzey"}
                onClick={() => setKaliplarAcik((a) => !a)}
              />
            </div>
          )}
          {kaliplarAcik && (
            <div className="m1-kaliplar">
              {KALIPLAR.map((k) => (
                <QtCip key={k} aria-pressed={undefined} onClick={() => mesajGonder(k)}>{k}</QtCip>
              ))}
            </div>
          )}
        </div>
      </>
    );
  })();

  // Maç sonu sahnesi kendi zeminini çizer; diğer bütün dallar mor maç sahnesinde.
  const sonucEkrani = mac?.durum === "bitti" && sonucHazir && gecisBitti;
  return (
    <>
      {sonucEkrani ? ekran : <div className="qt-sahne-mac m1-mac">{ekran}</div>}
      <SesliSohbet
        macId={id}
        benimId={user.id}
        yuva={sesYuva}
        macBitti={mac?.durum === "bitti"}
      />
    </>
  );
}
