import { useCallback, useEffect, useMemo, useState } from "react";
import DurumKutusu from "../components/DurumKutusu.jsx";
import { hataMesaji } from "../lib/hata.js";
import { sesHataUyari } from "../lib/ses.js";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { JOKER_BILGI, AKTIF_MAC_SKILLERI, envanterNesne, jokerDukkanModlari, jokerYalnizModu, paketDukkanModlari } from "../lib/jokerler.js";
import SkillRozeti from "../components/SkillRozeti.jsx";
import JokerSatinAlModal from "../components/JokerSatinAlModal.jsx";
import DukkanKozmetik, { DukkanAvatarlar, useKozmetikDukkan } from "../components/DukkanKozmetik.jsx";
import { DUKKAN_TURLERI, dukkandaGorunur } from "../lib/kozmetik.js";
import { DUKKAN_PREMIUM_CERCEVE_ACIK } from "../lib/ozellikBayraklari.js";
import { jokerKurallari } from "../lib/jokerKurallari.js";
import { h5AdsYapilandirildi, odulluVideoGoster } from "../lib/h5ads.js";
import { desteklenirMi, fiyatlariAl, satinAl, tuket } from "../lib/playFatura.js";
import { useCoin, coinTazele, coinHatasi } from "../lib/coin.js";
import { useElmas, elmasTazele, elmasPaketleri } from "../lib/elmas.js";
import { ayarlar } from "../lib/ayarlar.js";
import { tt, ttSunucu } from "../lib/dil.js";
import {
  QtDugme,
  QtIkon,
  QtKart,
  QtRozet,
  QtSekmeler,
  QtIskelet,
  QtToast,
  QtToastYuvasi,
  QtBosDurum,
  sayiBicim,
  sinif,
  siraStili,
  useSiraliGiris,
  dokunus,
} from "../tasarim/index.js";
import OdulAni, { UcanOge, useOdulAni } from "../components/OdulAni.jsx";
import ElmasPaketGorseli from "../tasarim/premium/elmas/ElmasPaketGorseli.jsx";
import "../tasarim/ekranlar/dukkan-magaza.css";
import { CoinIkon, ElmasIkon } from "../components/ParaIkonlari.jsx";

// DÜKKÂN — SADE HÂLİ (2 Eki 2026, Ida: "gereksiz hiçbir şey kalmasın, çekirdeğe odaklan"). Sabit sekmeler:
// Elmas · Joker · Çerçeve · Avatar. TEK KURAL ekranda yazar (kural şeridi): JOKERLER COİN'le (coin yalnız
// oynayarak kazanılır, parayla satılmaz), KOZMETİKLER ELMAS'la (elmas parayla alınır + oyunla kazanılır) — pay to win yok.
//   Çerçeve        → premium hareketli çerçeveler (kozmetikler › premium_cerceve)
//   Avatar → Epik / Efsanevi avatarlar (820, avatar_satin_al); İsim bölümü yok (Altın isim BP'ye ait)
// DÜKKÂNDAN ÇIKANLAR (veri ve sahiplik durur, alınmış eşya Profil › Koleksiyon'da): Kıyafet (gardırop dondurulmuş —
// vitrin oyun/vitrin/, bayrak ozellikBayraklari.js › GARDIROP_ACIK), Arka Plan (dondurulmuş, oyun_ayarlari.arka_plan_acik),
// VS Kartı · Zafer Efekti · Tepki paketi (920: kozmetikler.satis_pasif; tepki paketleri Battle Pass ödülü).
// Bütün rakamlar sunucudan gelir (skill_dukkani(), joker_paketleri, elmas_paketleri(), kozmetik_katalogu(),
// oyun_ayarlari); koda gömülü fiyat/ödül/tavan YOKTUR — okunamayan rakam gösterilmez.
// Oyun hissi (1 Eki 2026, OKU.md §11): sayfa afişi, oyun kartı dili (qt-oyk), ilk açılışta sıralı kart girişi, eylem
// düğmelerinde dokunus(). SATIN ALMA ANI (parıltı + uçan çip + ses + titreşim) YALNIZ sunucu başarı döndükten sonra
// oynar (kutla); hata / yetersiz coin dalında kutlama yoktur. Ürünler vitrinde fiyatıyla, doğrudan satılır.
const [TUR_CERCEVE] = DUKKAN_TURLERI;
// `para`: sekmedeki ürünlerin para birimi — kural şeridinde o yarı vurgulanır.
const SEKMELER = [
  { kod: "elmas",   ad: tt("Elmas|para"),     ikon: "elmas",   para: "elmas" },
  { kod: "joker",   ad: tt("Joker"),          ikon: "yildiz",  para: "coin" },
  ...(DUKKAN_PREMIUM_CERCEVE_ACIK ? [{ kod: "cerceve", ad: tt("Çerçeve"),        ikon: "madalya", para: "elmas" }] : []),   // dondurulmuş (ozellikBayraklari.js)
  { kod: "avatar",  ad: tt("Avatar"), ikon: "kisi",    para: "elmas" },
];
// COIN SEKMESİ YOK (2 Eki 2026): ürün satmıyordu — coin parayla satılmaz, elmasla coin dönüşümü de yok. İçindeki
// "Coin nasıl kazanılır?" notu ve (reklam yapılandırılmışsa) ödüllü video Joker sekmesinin altına taşındı.
// Eski bağlantılar (güncellenmemiş PWA, bildirim): kalkan sekmeler varsayılana (Joker) düşer; ?sekme=coin oradaki coin bölümüne iner.
const ESKI_SEKME = { pcerceve: "cerceve", isim: "avatar" };
const VARSAYILAN_SEKME = "joker";

// JOKER SEKMESİ: bütün aktif jokerler tek düz listede. Hangi jokerin hangi modda çalıştığı
// jokerler.js › SKILL_TANIMLARI.allowedModes kaynağından kart rozetine yazılır; burada ayrı liste tutulmaz.
// Maçtan gelen ?mod=klasik|duello bağlantısı geriye uyum için okunup cihazda saklanır, listeyi filtrelemez.
const DUKKAN_MODLARI = [
  { kod: "klasik", macTur: "1v1", ad: tt("Klasik"), ikon: "klasik" },
  { kod: "duello", macTur: "duello", ad: tt("Düello"), ikon: "duello" },
];
const MOD_ANAHTARI = "quiztactics:dukkan-mod:v1";
const modKoduCoz = (v) => (v === "duello" ? "duello" : v === "klasik" || v === "1v1" ? "klasik" : null);
function kayitliMod() {
  try { return modKoduCoz(localStorage.getItem(MOD_ANAHTARI)); } catch { return null; }
}
const modKodu = (macTur) => DUKKAN_MODLARI.find((m) => m.macTur === macTur)?.kod;
/** Tek moda özel jokerde satın alma onayındaki tek satır; ortak jokerde yok. */
function tekModUyarisi(tur) {
  const yalniz = jokerYalnizModu(tur);
  if (yalniz === "duello") return tt("Bu joker yalnız Düello'da çalışır.");
  if (yalniz === "1v1") return tt("Bu joker yalnız Klasik'te çalışır.");
  return null;
}

/** Kartlardaki mod rozeti: Klasik/Düello ayrımı dükkân yardımcılarından, Ortak Hazine desteği allowedModes'tan gelir. */
function ModRozeti({ tur, kod, modlar: verilenModlar }) {
  const modlar = verilenModlar ?? (tur ? jokerDukkanModlari(tur) : []);
  const yalniz = kod ?? modKodu(jokerYalnizModu(tur)) ?? (modlar.length === 1 ? modKodu(modlar[0]) : null);
  const hazine = Boolean(tur && JOKER_BILGI[tur]?.allowedModes?.includes("kasa"));
  if (!yalniz && modlar.length > 1) {
    return (
      <span className="qt-dk-modrozet qt-dk-modrozet--ortak">
        <i className="qt-dk-modnokta qt-dk-modnokta--klasik" aria-hidden="true" />
        <i className="qt-dk-modnokta qt-dk-modnokta--duello" aria-hidden="true" />
        {hazine ? tt("Klasik · Düello · Ortak Hazine") : tt("Klasik · Düello")}
      </span>
    );
  }
  return (
    <span className={`qt-dk-modrozet qt-dk-modrozet--${yalniz}`}>
      <QtIkon ad={yalniz} boyut={14} />
      {yalniz === "duello" ? tt("Yalnız Düello") : tt("Yalnız Klasik")}
    </span>
  );
}

// Paket adları/açıklamaları sunucudan gelir; oyuncuya görünen ad yine "Joker" (24 Eyl 2026).
function paketMetni(metin) {
  return String(ttSunucu(metin) ?? "");
}

const sayiMi = (n) => n !== null && n !== undefined && n !== "" && Number.isFinite(Number(n));

/** Fiyat düğmesinin içi: "10× ● 170"; eski verilirse üstü çizili tek tek alım toplamı önde ("1.130 ● 960"). */
function FiyatYazisi({ adet, fiyat, eski }) {
  return (
    <span className="qt-dk-fiyat">
      {adet != null && <span className="qt-dk-fiyat-adet">{adet}×</span>}
      {eski != null && <s className="qt-dk-fiyat-eski qt-sayi" aria-hidden="true">{sayiBicim(Number(eski))}</s>}
      <CoinIkon boyut={18} />
      <span className="qt-sayi">{sayiBicim(Number(fiyat))}</span>
    </span>
  );
}

export default function JokerDukkani() {
  const [envanter, setEnvanter] = useState({});
  // Paket 41 A: envanter okunamadıysa jokerler "0" gösterilmez (oyuncu silindi sanıyordu)
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
  const [elmasPaketleriListe, setElmasPaketleri] = useState([]);
  const [odulCoin, setOdulCoin] = useState(null);
  const [tekFiyat, setTekFiyat] = useState({});
  const [ayar, setAyar] = useState(null);   // Paket 32 C: açıklamalardaki sayılar oyun_ayarlari'ndan
  const [ayarBitti, setAyarBitti] = useState(false);   // ayar isteği bitti (başarılı/başarısız) — Elmas satırları iskeletten çıkar
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
    }).catch((e) => console.error("[Bildim] oyun ayarları okunamadı:", e))
      .finally(() => { if (aktif) setAyarBitti(true); });
    return () => { aktif = false; };
  }, []);

  // Sekme adres çubuğunda tutulur: bağlantıyla açılabilsin, geri tuşu da beklendiği gibi çalışsın.
  const [arama, setArama] = useSearchParams();
  // Kozmetik + avatar kataloğu tek yerde, bir kez (Çerçeve ve Avatar sekmeleri aynı veriyi kullanır).
  const kozmetik = useKozmetikDukkan();
  const dukkanKatalogu = useMemo(() => kozmetik.katalog.filter(dukkandaGorunur), [kozmetik.katalog]);   // Altın isim dükkândan kalktı (BP'ye ait)
  const istenenSekme = ESKI_SEKME[arama.get("sekme")] ?? arama.get("sekme");
  const sekme = SEKMELER.some((x) => x.kod === istenenSekme) ? istenenSekme : VARSAYILAN_SEKME;
  const sekmeParasi = SEKMELER.find((x) => x.kod === sekme)?.para;
  const kozmetikSekmesi = sekme === "cerceve" || sekme === "avatar";
  const sekmeSec = (kod) => setArama({ sekme: kod }, { replace: true });
  // Maç içinden gelen ?mod= yönlendirmesi geriye uyum için son mod kaydını günceller; düz listeyi filtrelemez.
  const adresMod = modKoduCoz(arama.get("mod"));
  useEffect(() => {
    const gelen = adresMod ?? kayitliMod();
    if (!gelen) return;
    try { localStorage.setItem(MOD_ANAHTARI, gelen); } catch { /* depolama kapalı: yönlendirme yine çalışır */ }
  }, [adresMod]);
  // Paket 42 M.2: en ucuz skill (tek tek ya da paket) — bakiye bunun altındaysa üstte uyarı
  const enUcuzJoker = Math.min(
    ...Object.values(tekFiyat ?? {}).map(Number).filter((n) => Number.isFinite(n) && n > 0),
    ...(paketler ?? []).map((p) => Number(p.coin_fiyat)).filter((n) => Number.isFinite(n) && n > 0),
  );

  const { bakiye, tazele: coinOku } = useCoin();
  const elmas = useElmas();
  const [elmasVideo, setElmasVideo] = useState(false);
  // D-301: dükkândaki her coin alımı önce onay penceresi (maç içi joker penceresiyle aynı bileşen).
  // onay = { tur?, baslik?, aciklama?, gorsel?, fiyat, onayMetni?, calistir } — calistir mevcut alım işlevidir.
  const [onay, setOnay] = useState(null);
  const onayAc = (o) => { dokunus(); setOnay(o); };
  // Satın alma anı: kutla() yalnız RPC hatasız dönünce çağrılır; ucan(anahtar) an sürerken veriyi döner.
  const { kutla, ucan } = useOdulAni();
  // "Nasıl kazanılır?" kaydırması: elmas → Elmas sekmesi › "Oynayarak elmas kazan" (D-304); coin → Joker sekmesi ›
  // "Coin nasıl kazanılır?" (coin yetmeyince; Joker sekmesindeyken adres değişmez, seçili mod korunur).
  const [kaydir, setKaydir] = useState(null);   // "elmas" | "coin" | null
  const elmasKazanGoster = () => {
    setArama({ sekme: "elmas" }, { replace: true });
    setKaydir("elmas");
  };
  const coinKazanGoster = () => {
    if (sekme !== "joker") setArama({ sekme: "joker" }, { replace: true });
    setKaydir("coin");
  };
  const playVar = desteklenirMi();

  const yukle = useCallback(async () => {
    try {
      const [env, rek, pak, epak, sdk] = await Promise.all([
        supabase.rpc("envanterim"),
        supabase.rpc("reklam_durumum"),
        supabase.from("joker_paketleri").select("*").order("sira"),
        elmasPaketleri().then((data) => ({ data, error: null }), (error) => ({ data: null, error })),
        supabase.rpc("skill_dukkani"),
      ]);
      if (env.error) throw env.error;
      setEnvanter(envanterNesne(env.data));
      if (sdk.error) {
        console.error("[Bildim] joker dükkânı okunamadı:", sdk.error);
      } else if (Array.isArray(sdk.data?.skiller)) {
        const harita = Object.fromEntries(sdk.data.skiller.map((s) => [s.tur, s]));
        setSkillDukkan({ level: Number(sdk.data.level ?? 1), skiller: harita });
        setTekFiyat((onceki) => ({
          ...onceki,
          ...Object.fromEntries(sdk.data.skiller.filter((s) => s.fiyat != null).map((s) => [s.tur, Number(s.fiyat)])),
        }));
      }
      const ikincilHata = rek.error ?? pak.error ?? epak.error;
      if (ikincilHata) {
        console.error("[Bildim] dükkân verilerinin bir bölümü alınamadı:", ikincilHata);
        setHata(hataMesaji(ikincilHata, tt("Dükkânın bazı bölümleri yüklenemedi. Tekrar dene.")));
      }
      if (!rek.error) {
        const r = Array.isArray(rek.data) ? rek.data[0] : rek.data;
        if (r) setReklam({ bugun: r.bugun ?? 0, tavan: sayiMi(r.tavan) ? Number(r.tavan) : null });
      }
      if (!pak.error) setPaketler(pak.data ?? []);
      if (!epak.error) setElmasPaketleri(epak.data ?? []);
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
    // Satın alma kapalıyken (satista=false) Play'e hiç sorulmaz
    const satista = elmasPaketleriListe.filter((p) => p.satista);
    if (!playVar || satista.length === 0) return;
    let aktif = true;
    fiyatlariAl(satista.map((p) => p.urun_id))
      .then((f) => aktif && setFiyatlar(f))
      .catch((e) => {
        console.error("[Bildim] mağaza fiyatları alınamadı:", e);
        if (aktif) setHata(hataMesaji(e, tt("Satın alma fiyatları alınamadı. Tekrar dene.")));
      });
    return () => {
      aktif = false;
    };
  }, [playVar, elmasPaketleriListe]);

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

  /** Günde 1 elmas reklamı: jeton → reklam → sunucu ödülü (coin reklamıyla aynı akış, ayrı hak). */
  const elmasVideoIzle = async () => {
    setHata(null);
    setBilgi(null);
    setElmasVideo(true);
    try {
      const { data: jetonVeri, error: jetonHata } = await supabase.rpc("elmas_reklam_jetonu_al");
      if (jetonHata) throw jetonHata;
      const ref = (Array.isArray(jetonVeri) ? jetonVeri[0] : jetonVeri)?.jeton;
      if (!ref) throw new Error(tt("Reklam gösterilemedi."));
      await odulluVideoGoster();   // başarısızsa sunucuya hiç gidilmez (sahte ödül yok)
      const { data, error } = await supabase.rpc("elmas_reklam_odulu_al", { p_reklam_ref: ref });
      if (error) throw error;
      const s = Array.isArray(data) ? data[0] : data;
      setBilgi(tt("+{0} elmas kazandın!", { 0: s?.verilen ?? "?" }));
      elmasTazele();
    } catch (e) {
      setHata(hataMesaji(e, tt("Reklam gösterilemedi.")));
    } finally {
      setElmasVideo(false);
    }
  };

  // Elmas paketi (gerçek para, Play Billing). SATIN ALMA ŞU AN KAPALI (elmas_paketleri().satista = false):
  // Play Console'da elmas_100 … elmas_2400 ürünleri tanımlanıp satin_alma_dogrula Edge Function'ı elmas
  // ürünlerini elmas_ekle(…, 'satin_alma', jeton) ile yazacak şekilde güncellenince açılır — docs/YAYIN_ONCESI.md.
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
      setBilgi(tt("Satın alman tamamlandı, elmas hesabına eklendi."));
      elmasTazele();
      await yukle();
    } catch (e) {
      setHata(hataMesaji(e, tt("Satın alma tamamlanamadı.")));
    } finally {
      setAlinan(null);
    }
  };

  /** Joker paketini COİN ile alır. Coin yetmezse "Coin nasıl kazanılır?" bölümüne götürür. */
  const jokerCoinIleAl = async (urunId, an) => {
    setHata(null);
    setBilgi(null);
    setAlinan(urunId);
    try {
      const { error } = await supabase.rpc("joker_coin_ile_al", { p_urun_id: urunId });
      if (error) throw error;
      setBilgi(tt("Jokerler hesabına eklendi."));
      coinTazele();
      coinOku();
      await yukle();
      // Sunucu "verildi" dedi ve envanter tazelendi → an (onay penceresi kapanırken kartta oynar)
      kutla(an?.anahtar ?? `paket:${urunId}`, an?.veri ?? { paket: true }, { his: "satinAlma" });
    } catch (e) {
      const m = coinHatasi(e);
      sesHataUyari();
      setHata(m);
      // Buton pasif DEĞİL: basınca ne olduğu söylenir ve coin'in nasıl kazanıldığı gösterilir.
      if (m === tt("Coin yetmiyor")) coinKazanGoster();
    } finally {
      setAlinan(null);
    }
  };

  /** Tek joker alır (birim fiyat sunucudan). */
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
      kutla(`joker:${tur}`, { adet: 1 }, { his: "satinAlma" });
    } catch (e) {
      const m = coinHatasi(e);
      sesHataUyari();
      setHata(m);
      if (m === tt("Coin yetmiyor")) coinKazanGoster();
    } finally {
      setAlinan(null);
    }
  };

  /** Paket 2 B2: joker kilidini coin ile bir kez açar. Level ve coin kontrolü sunucuda. */
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
      kutla(`joker:${tur}`, { kilit: true }, { his: "satinAlma" });
    } catch (e) {
      const m = coinHatasi(e);
      sesHataUyari();
      setHata(ttSunucu(m));
      if (m === tt("Coin yetmiyor")) coinKazanGoster();
    } finally {
      setAlinan(null);
    }
  };

  const reklamKaldi = reklam.tavan == null ? 1 : Math.max(0, reklam.tavan - (reklam.bugun ?? 0));
  const hazir = dukkanDurum === "hazir";
  // Sıralı kart girişi yalnız İLK açılışta (sekme değişince / veri yenilenince yeniden oynamaz); kozmetik sekmelerine prop ile iner.
  const sirali = useSiraliGiris(kozmetikSekmesi ? kozmetik.hazir : hazir);
  // Bölüme kaydır (üst çubuk yapışkan — payı düşülür). Bağlantıyla da istenir: ?sekme=elmas&bolum=kazan (Koleksiyon),
  // eski ?sekme=coin (Joker sekmesine düşer, coin bölümüne iner).
  const adresBolum = arama.get("bolum") === "kazan" && sekme === "elmas" ? "elmas" : arama.get("sekme") === "coin" ? "coin" : null;
  const kaydirHedef = kaydir ?? adresBolum;
  useEffect(() => {
    if (!kaydirHedef || !hazir) return undefined;
    if (sekme !== (kaydirHedef === "coin" ? "joker" : "elmas")) return undefined;
    const t = setTimeout(() => {
      try {
        const el = document.getElementById(`qt-dk-${kaydirHedef}-kazan`);
        if (el) {
          const ust = document.querySelector(".a-ust-blok, .qt-ustcubuk")?.getBoundingClientRect().height ?? 0;
          window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - ust - 12), behavior: "auto" });
        }
      } catch { /* kaydırma kritik değil */ }
      setKaydir(null);
      if (adresBolum) setArama({ sekme }, { replace: true });
    }, 60);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kaydirHedef, sekme, hazir]);
  // PAKETLER (910): paketin modu İÇERİĞİNDEN okunur — paketDukkanModlari her anahtarın jokerler.js'te
  // AKTİF bir joker id'si olmasını ister (joker_paketleri.icerik anahtarı = jokerler.js id'si; eşleşmeyen anahtar
  // paketi dükkândan düşürür). Mod seçici kalktığı için bütün geçerli paketler birlikte gösterilir. Tek türlük 10'lu paketler
  // (fiyat_anahtari dolu) joker kartının kendi düğmesidir, burada listelenmez.
  const dukkanPaketleri = paketler.filter((p) => p.coin_fiyat != null && !p.fiyat_anahtari
    && paketDukkanModlari(p.icerik).length > 0);

  return (
    <div className="qt-dk">
      {/* Afiş kalktı (alt menü zaten "Dükkân"ı gösteriyor); elmas bakiyesi sekme satırının sağında. Coin bakiyesi üst çubukta (denetim §7 S7). */}
      <h1 className="qt-gizli">{tt("Dükkân")}</h1>
      <div className="qt-dk-sekme-satiri">
        <QtSekmeler
          className="qt-dk-sekmeler"
          etiket={tt("Dükkân bölümleri")}
          sekmeler={SEKMELER}
          aktif={sekme}
          onSec={sekmeSec}
        />
        {elmas.bakiye !== null && (
          <span className="qt-dk-bakiye qt-dk-bakiye--elmas" role="img" aria-label={tt("{n} elmas", { n: sayiBicim(elmas.bakiye) })}>
            <ElmasIkon boyut={18} /><b className="qt-sayi">{sayiBicim(elmas.bakiye)}</b>
          </span>
        )}
      </div>

      {/* TEK KURAL: jokerler coin'le, kozmetikler elmasla. Açık sekmenin para birimi vurgulu. */}
      <ul className="qt-dk-kural" aria-label={tt("Dükkân kuralı")}>
        <li className={sinif("qt-dk-kural-oge qt-dk-kural-oge--coin", sekmeParasi === "coin" && "qt-dk-kural-oge--acik")}>
          <CoinIkon boyut={22} />
          <span><b>{tt("Jokerler")}</b><small>{tt("coin ile alınır")}</small></span>
        </li>
        <li className={sinif("qt-dk-kural-oge qt-dk-kural-oge--elmas", sekmeParasi === "elmas" && "qt-dk-kural-oge--acik")}>
          <ElmasIkon boyut={22} />
          <span><b>{tt("Kozmetikler")}</b><small>{tt("elmas ile alınır")}</small></span>
        </li>
      </ul>

      <QtToastYuvasi>
        {hata && <QtToast ton="yanlis" baslik={hata} onKapat={() => setHata(null)} />}
        {bilgi && <QtToast ton="coin" baslik={bilgi} onKapat={() => setBilgi(null)} />}
      </QtToastYuvasi>

      <div id={`qt-panel-${sekme}`} role="tabpanel" className="qt-dk-panel" aria-busy={(kozmetikSekmesi && !kozmetik.hazir) || undefined}>
        {kozmetikSekmesi && !kozmetik.hazir && <QtIskelet tur="kart" adet={2} />}

        {/* ---------- ÇERÇEVE: premium hareketli çerçeveler (elmasla) ---------- */}
        {sekme === "cerceve" && kozmetik.hazir && (
          <DukkanKozmetik tur={TUR_CERCEVE} katalog={kozmetik.katalog} sahipHesap={kozmetik.sahipHesap} yenile={kozmetik.yenile} sirali={sirali}
            elmasYetmedi={elmasKazanGoster} elmasBakiye={elmas.bakiye}
            onBilgi={(m) => { setHata(null); setBilgi(m); }} onHata={(m) => { setBilgi(null); setHata(m); }} />
        )}

        {/* ---------- AVATAR: Epik / Efsanevi avatarlar (820); İsim bölümü yok (Altın isim Battle Pass'e ait) ---------- */}
        {sekme === "avatar" && kozmetik.hazir && (
          <>
            <section className="qt-dk-bolum" aria-labelledby="qt-dk-avatarlar">
              <div className="qt-dk-bolum-ust qt-dk-bolum-ust--elmas">
                <h2 id="qt-dk-avatarlar" className="qt-baslik-2">{tt("Avatarlar")}</h2>
                <p className="qt-kucuk">{tt("Epik ve Efsanevi avatarlar elmasla alınır; Yaygın ve Nadir olanlar bedava.")}</p>
              </div>
              <DukkanAvatarlar avatarlar={kozmetik.avatarlar} sahipHesap={kozmetik.sahipHesap} yenile={kozmetik.yenile} sirali={sirali}
                elmasYetmedi={elmasKazanGoster} elmasBakiye={elmas.bakiye}
                onBilgi={(m) => { setHata(null); setBilgi(m); }} onHata={(m) => { setBilgi(null); setHata(m); }} />
            </section>
          </>
        )}

        {(sekme === "joker" || sekme === "elmas") && !hazir && (
          <QtKart>
            <DurumKutusu durum={dukkanDurum} satir={4} onTekrar={() => { setDukkanDurum("yukleniyor"); yukle(); }} />
          </QtKart>
        )}

        {/* ================= JOKER ================= */}
        {sekme === "joker" && hazir && (
          <>
            {/* Paket 34: jokerler geçici olarak ücretsiz ve sınırsız */}
            {jokerSerbest && (
              <p className="qt-dk-not qt-dk-not--dogru" role="status">
                <QtIkon ad="hediye" boyut={20} />
                <span>{tt("Jokerler şimdilik ücretsiz ve sınırsız — maçta stok gerekmez, satın almana gerek yok.")}</span>
              </p>
            )}
            {/* Paket 42 M.2: coin en ucuz jokere bile yetmiyorsa üstte tek satır */}
            {!jokerSerbest && bakiye !== null && Number.isFinite(enUcuzJoker) && bakiye < enUcuzJoker && (
              <div className="qt-dk-not qt-dk-not--uyari" role="status">
                <CoinIkon boyut={20} />
                <span>{tt("Coin'in şu an hiçbir jokere yetmiyor.")}</span>
                <QtDugme tur="ikincil" boyut="k" onClick={() => coinKazanGoster()}>{tt("Coin kazan")}</QtDugme>
              </div>
            )}

            {/* Bütün aktif jokerler tek düz liste; mod bilgisi her kartın kendi rozetinde. */}
            <ul className="qt-dk-skill-liste">
                {AKTIF_MAC_SKILLERI.map((tur, i) => {
                  // Paket 2 B1/B2: sunucudan gelen satır (fiyat, 10'lu paket, kilit).
                  const sd = skillDukkan?.skiller?.[tur] ?? null;
                  const kilitli = Boolean(sd && sd.acik === false);
                  const levelYetmez = kilitli && Number(sd.gereken_level ?? 1) > Number(skillDukkan?.level ?? 1);
                  const kilitFiyat = Number(sd?.kilit_fiyati ?? 0);
                  const paket10 = sd?.paket ?? null;
                  const tekVar = sayiMi(tekFiyat[tur]);
                  const tek = Number(tekFiyat[tur]);
                  const yetmez = !kilitli && tekVar && bakiye !== null && bakiye < tek;
                  const b = JOKER_BILGI[tur];
                  const u = ucan(`joker:${tur}`);   // satın alma anı (sunucu onayından sonra): { adet } | { kilit }
                  // Oyun kartı: 3 px kontur + sol şerit joker renginde; kilitli / coin yetmeyen kart soluk (şerit gri).
                  return (
                    <li key={tur} className={i < 8 ? sirali : undefined} style={siraStili(i)}>
                      <div className={sinif("qt-oyk qt-dk-skill", kilitli && "qt-oyk--kilitli qt-dk-skill--kilitli", yetmez && "qt-dk-skill--yetmez", u && "qt-oyk--kutla")}
                           style={kilitli || yetmez ? undefined : { "--oyk-serit": `var(--qt-skill-${tur}, var(--qt-ikinci))` }}>
                        <span className="qt-dk-skill-ikon qt-dk-skill-ikon--rozet" aria-hidden="true">
                          <SkillRozeti tur={tur} boyut={52} />
                          {kilitli && <span className="qt-dk-skill-kilit"><QtIkon ad="kilit" boyut={14} /></span>}
                        </span>
                        <div className="qt-dk-skill-metin">
                          <h3 className="qt-baslik-3">{JOKER_BILGI[tur].ad}</h3>
                          <p className="qt-kucuk qt-soluk" title={b.aciklama}>{b.aciklama}</p>
                          <div className="qt-dk-skill-rozetler">
                            <ModRozeti tur={tur} />
                            {!kilitli && (
                              <span className={u ? "qt-h-zipla" : undefined}>
                                <QtRozet boyut="k" ton={(envanter[tur] ?? 0) > 0 ? "mor" : "notr"}>
                                  {tt("Sende: {n}", { n: envanter[tur] ?? 0 })}
                                </QtRozet>
                              </span>
                            )}
                            {kilitli && (
                              <QtRozet boyut="k" ton="uyari" ikon="kilit">
                                {levelYetmez
                                  ? tt("Level {0} gerekir", { 0: sd.gereken_level })
                                  : tt("Kilitli — bir kez açılır")}
                              </QtRozet>
                            )}
                            {yetmez && <QtRozet boyut="k" ton="uyari">{tt("Yetersiz coin")}</QtRozet>}
                          </div>
                        </div>
                        <div className="qt-dk-skill-al">
                          {kilitli ? (
                            <QtDugme
                              tur="dogru"
                              boyut="k"
                              devreDisi={levelYetmez}
                              yukleniyor={alinan === `kilit:${tur}`}
                              aria-label={levelYetmez
                                ? tt("Level {0} gerekir", { 0: sd.gereken_level })
                                : tt("{0} kilidini aç — {1} coin", { 0: JOKER_BILGI[tur].ad, 1: kilitFiyat })}
                              onClick={() => (kilitFiyat > 0
                                ? onayAc({ tur, baslik: tt("{0} kilidini aç", { 0: JOKER_BILGI[tur].ad }), fiyat: kilitFiyat,
                                  uyari: tekModUyarisi(tur), onayMetni: tt("Kilidi aç"), calistir: () => skillKilidiAc(tur) })
                                : (dokunus(), skillKilidiAc(tur)))}
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
                                  tur="dogru"
                                  boyut="k"
                                  devreDisi={jokerSerbest || yetmez}
                                  yukleniyor={alinan === `tek:${tur}`}
                                  aria-label={tt("{0} — {1} coin", { 0: JOKER_BILGI[tur].ad, 1: tek })}
                                  onClick={() => onayAc({ tur, fiyat: tek, aciklama: b.aciklama, uyari: tekModUyarisi(tur), calistir: () => jokerTekAl(tur) })}
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
                                  onClick={() => onayAc({ tur, baslik: `${paket10.adet}× ${JOKER_BILGI[tur].ad}`, fiyat: paket10.fiyat,
                                    aciklama: b.aciklama, uyari: tekModUyarisi(tur),
                                    calistir: () => jokerCoinIleAl(paket10.urun_id, { anahtar: `joker:${tur}`, veri: { adet: paket10.adet } }) })}
                                >
                                  <FiyatYazisi adet={paket10.adet} fiyat={paket10.fiyat} />
                                </QtDugme>
                              )}
                            </>
                          )}
                        </div>
                        <OdulAni aktif={Boolean(u)}>
                          {u && (u.kilit
                            ? <UcanOge><QtIkon ad="onay" boyut={14} />{tt("Açıldı|kilit")}</UcanOge>
                            : <UcanOge><SkillRozeti tur={tur} boyut={18} />+{u.adet}</UcanOge>)}
                        </OdulAni>
                      </div>
                    </li>
                  );
                })}
            </ul>

            {/* ---------- Paketler (coin ile): Oyuncu ve Usta paketleri aynı akışla kalır ---------- */}
            {dukkanPaketleri.length > 0 && (
              <section className="qt-dk-bolum" aria-labelledby="qt-dk-paketler">
                <div className="qt-dk-bolum-ust qt-dk-bolum-ust--ortak">
                  <h2 id="qt-dk-paketler" className="qt-baslik-2">{tt("Paketler")}</h2>
                  <p className="qt-kucuk">{tt("Tek tek almaktan ucuz")}</p>
                </div>
                <ul className="qt-dk-paket-izgara">
                  {dukkanPaketleri.map((p) => {
                    // İçerik joker sırasıyla (jsonb anahtar sırası rastgele gelir).
                    const parcalar = AKTIF_MAC_SKILLERI.filter((id) => p.icerik?.[id] != null).map((id) => [id, Number(p.icerik[id])]);
                    const paketModlari = paketDukkanModlari(p.icerik);
                    const paketKod = paketModlari.length === 1 ? modKodu(paketModlari[0]) : null;
                    const toplam = parcalar.reduce((t, [, n]) => t + n, 0);
                    // Tek tek alım toplamı sunucudaki tek fiyatlardan; biri okunamadıysa indirim gösterilmez (rakam uydurulmaz).
                    const tekTek = parcalar.every(([id]) => sayiMi(tekFiyat[id]))
                      ? parcalar.reduce((t, [id, n]) => t + Number(tekFiyat[id]) * n, 0) : null;
                    const ucuz = tekTek != null && tekTek > Number(p.coin_fiyat);
                    const indirim = ucuz ? Math.round((1 - Number(p.coin_fiyat) / tekTek) * 100) : 0;
                    const u = ucan(`paket:${p.urun_id}`);
                    return (
                    <li key={p.urun_id}>
                      <div className={sinif("qt-oyk qt-dk-paket", paketKod && `qt-dk-paket--${paketKod}`, u && "qt-oyk--kutla")}>
                        <div className="qt-dk-paket-ust">
                          <span className="qt-dk-paket-adet" aria-hidden="true">
                            <b className="qt-sayi">{toplam}</b>
                            <small>{tt("joker")}</small>
                          </span>
                          <div className="qt-dk-paket-metin">
                            <h3 className="qt-baslik-3">{paketMetni(p.ad)}</h3>
                            <div className="qt-dk-skill-rozetler">
                              <ModRozeti kod={paketKod} modlar={paketModlari} />
                              {indirim > 0 && <QtRozet boyut="k" ton="dogru">{tt("%{n} ucuz", { n: indirim })}</QtRozet>}
                            </div>
                          </div>
                        </div>
                        <ul className="qt-dk-paket-icerik" aria-label={tt("Paket içeriği")}>
                          {parcalar.map(([tur, adet]) => (
                            <li key={tur} className="qt-dk-parca" title={JOKER_BILGI[tur]?.ad ?? tur}>
                              <SkillRozeti tur={tur} boyut={24} />
                              <span className="qt-sayi">{adet}</span>
                              <span className="qt-gizli">{JOKER_BILGI[tur]?.ad ?? tur}</span>
                            </li>
                          ))}
                        </ul>
                        {/* Düğme PASİF DEĞİL: coin yetmezse basınca söyler ve "Coin nasıl kazanılır?" bölümüne götürür. */}
                        <QtDugme
                          tur="dogru"
                          boyut="k"
                          tamGenislik
                          devreDisi={jokerSerbest}
                          yukleniyor={alinan === p.urun_id}
                          aria-label={tt("{0} — {1} coin", { 0: paketMetni(p.ad), 1: p.coin_fiyat })}
                          onClick={() => onayAc({
                            baslik: paketMetni(p.ad),
                            aciklama: p.aciklama ? paketMetni(p.aciklama) : null,
                            gorsel: (
                              <span className="qt-sat-paket">
                                {parcalar.map(([tur, adet]) => (
                                  <span key={tur} className="qt-sat-paket-parca"><SkillRozeti tur={tur} boyut={28} />{adet}</span>
                                ))}
                              </span>
                            ),
                            uyari: paketKod === "duello" ? tt("Bu paket Düello maçları içindir.")
                              : paketKod === "klasik" ? tt("Bu paket Klasik maçlar içindir.") : null,
                            fiyat: p.coin_fiyat,
                            calistir: () => jokerCoinIleAl(p.urun_id),
                          })}
                        >
                          <FiyatYazisi fiyat={p.coin_fiyat} eski={ucuz ? tekTek : null} />
                        </QtDugme>
                        {/* Uçan çip: paketin sunucudan gelen içeriği (yalnız alım onaylanınca) */}
                        <OdulAni aktif={Boolean(u)}>
                          {u && parcalar.map(([tur, adet]) => (
                            <UcanOge key={tur}><SkillRozeti tur={tur} boyut={18} />+{adet}</UcanOge>
                          ))}
                        </OdulAni>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* ---------- Coin nasıl kazanılır? (eski Coin sekmesinin içeriği; coin yetmeyince buraya inilir) ---------- */}
            {/* Coin parayla satılmaz (480): yalnız oynayarak kazanılır */}
            <section className="qt-dk-bolum" aria-labelledby="qt-dk-coin-kazan">
              <h2 id="qt-dk-coin-kazan" className="qt-baslik-2">{tt("Coin nasıl kazanılır?")}</h2>
              <p className="qt-dk-not qt-dk-not--bilgi">
                <QtIkon ad="bilgi" boyut={20} />
                <span>{tt("Coin yalnızca oynayarak kazanılır, parayla satılmaz. Maç kazan, turnuvaya katıl, seriyi sürdür, rozet topla — jokerleri coin'le al.")}</span>
              </p>
            </section>
            {/* Ödüllü video: jeton → reklam → sunucu ödülü (akış değişmez).
                D-305: reklam yapılandırılmamışsa (ölü kart) hiç çizilmez; üstteki "Coin nasıl kazanılır?" kalır. */}
            {h5AdsYapilandirildi() && (
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
            )}

            {/* ---------- Kurallar ---------- */}
            {/* Kural metni TEK KAYNAKTAN: oyun/lib/jokerKurallari.js */}
            {jokerHak != null && (
            <section className="qt-dk-bolum" aria-labelledby="qt-dk-kurallar-baslik">
                <details className="qt-dk-kurallar">
                  <summary id="qt-dk-kurallar-baslik">
                    <QtIkon ad="bilgi" boyut={20} />
                    <span>{tt("Joker kuralları")}</span>
                    <QtIkon ad="asagi" boyut={20} className="qt-dk-kurallar-ok" />
                  </summary>
                  <ul>
                    {jokerKurallari(jokerHak).map((k) => (
                      <li key={k}>{k}</li>
                    ))}
                  </ul>
                </details>
            </section>
            )}
          </>
        )}

        {/* ================= ELMAS ================= */}
        {sekme === "elmas" && hazir && (
          <>
            {/* Günde 1 elmas reklamı (normal reklam coin verir — ayrı hak).
                D-305: reklam yapılandırılmamışsa en üstteki ölü kart gizlenir. */}
            {h5AdsYapilandirildi() && (
            <QtKart ton="mor" className="qt-dk-video">
              <span className="qt-dk-video-ikon" aria-hidden="true"><ElmasIkon boyut={28} /></span>
              <div className="qt-dk-video-metin">
                <h2 className="qt-baslik-3">{tt("Video izle, elmas kazan")}</h2>
                <p className="qt-kucuk">
                  {elmas.reklam && tt("Günde {0} video = +{1} elmas.", { 0: elmas.reklam.tavan, 1: elmas.reklam.odul })}
                  {elmas.reklam && <> {tt("Bugün {0}/{1}", { 0: elmas.reklam.bugun ?? 0, 1: elmas.reklam.tavan })}</>}
                </p>
              </div>
              {!h5AdsYapilandirildi() ? (
                <p className="qt-kucuk qt-dk-video-yok">
                  {tt("Reklam şu an kullanılamıyor")}. {tt("Şimdilik lig, turnuva, level ve serilerle elmas kazanabilirsin.")}
                </p>
              ) : (
                <QtDugme
                  tamGenislik
                  ikon="oyna"
                  yukleniyor={elmasVideo}
                  devreDisi={elmas.reklam != null && Number(elmas.reklam.bugun) >= Number(elmas.reklam.tavan)}
                  onClick={elmasVideoIzle}
                >
                  {elmasVideo
                    ? tt("Reklam açılıyor…")
                    : elmas.reklam != null && Number(elmas.reklam.bugun) >= Number(elmas.reklam.tavan)
                      ? tt("Bugünlük hakkın doldu")
                      : elmas.reklam ? tt("Video izle (+{0} elmas)", { 0: elmas.reklam.odul }) : tt("Video izle")}
                </QtDugme>
              )}
            </QtKart>
            )}

            {/* Oyunla elmas — rakamlar oyun_ayarlari'ndan (okunamayan satır gösterilmez) */}
            <section className="qt-dk-bolum" aria-labelledby="qt-dk-elmas-kazan">
              {/* 8 Eki 2026: bölüm başlığı küçük elmas sahnesi (ışın deseni + Pırlanta elması); hareket yok */}
              <div className="qt-dk-elmas-hero">
                <span className="qt-dk-elmas-hero-gorsel" aria-hidden="true"><ElmasIkon boyut={48} /></span>
                <span className="qt-dk-elmas-hero-metin">
                  <h2 id="qt-dk-elmas-kazan" className="qt-baslik-2">{tt("Oynayarak elmas kazan")}</h2>
                  <span className="qt-kucuk">{tt("Lig, turnuva, level ve serilerden gelir")}</span>
                </span>
              </div>
              {/* Aşama 2 (7 Eki 2026): satır = basılabilir kart (ilgili ekrana gider) · ikon kutusu tür renginde
                  (lig/level mavi, turnuva/seri/rozet altın) · ödül elmas çipinde. Ayarlar inerken iskelet (zıplama yok). */}
              {!ayarBitti ? (
                <QtIskelet tur="satir" adet={4} />
              ) : (
              <ul className="qt-dk-elmas-liste">
                {[
                  sayiMi(ayar?.elmas_lig_1) && [tt("Haftalık lig: ilk 3"), [ayar.elmas_lig_1, ayar.elmas_lig_2, ayar.elmas_lig_3].join(" / "), "lig", "mavi", "/siralama"],
                  sayiMi(ayar?.elmas_turnuva_1) && [tt("Turnuva birinciliği"), ayar.elmas_turnuva_1, "kupa", "altin", "/turnuva"],
                  sayiMi(ayar?.elmas_level) && [tt("Her {n} levelde bir", { n: ayar.elmas_level_aralik }), ayar.elmas_level, "yildiz", "mavi", "/profil"],
                  sayiMi(ayar?.elmas_seri) && [tt("{n} günlük seri", { n: ayar.elmas_seri_gun }), ayar.elmas_seri, "ates", "altin", "/"],
                  [tt("Zor (elmas kademeli) rozetler"), "5–20", "madalya", "altin", "/profil?sekme=rozet"],
                ].filter(Boolean).map(([ad, n, ikon, ton, yol]) => (
                  <li key={ad}>
                    <Link to={yol} className={`qt-dk-elmas-satir qt-dk-elmas-satir--${ton}`} aria-label={`${ad}, ${tt("{n} elmas", { n })}`}>
                      <span className="qt-dk-elmas-ik" aria-hidden="true"><QtIkon ad={ikon} boyut={22} /></span>
                      <span className="qt-dk-elmas-ad">{ad}</span>
                      <span className="qt-dk-elmas-miktar"><ElmasIkon boyut={16} /><b className="qt-sayi">{n}</b></span>
                    </Link>
                  </li>
                ))}
              </ul>
              )}
            </section>

            {/* Elmas paketleri (gerçek para, yalnız Play Billing) — SATIN ALMA ŞU AN KAPALI */}
            <section className="qt-dk-bolum" aria-labelledby="qt-dk-elmas-paketleri">
              <h2 id="qt-dk-elmas-paketleri" className="qt-baslik-2">{tt("Elmas paketleri")}</h2>
              <p className="qt-dk-not qt-dk-not--bilgi">
                <QtIkon ad="bilgi" boyut={20} />
                <span>{elmasPaketleriListe.some((p) => p.satista)
                  ? tt("Satın alma yalnızca Android uygulamasında yapılabilir. Elmas yalnızca çerçeve ve avatar gibi görünüm eşyaları alır; oyunda avantaj sağlamaz.")
                  : tt("Elmas paketleri yakında satışta. Elmas yalnızca çerçeve ve avatar gibi görünüm eşyaları alır; oyunda avantaj sağlamaz.")}</span>
              </p>
              {elmasPaketleriListe.length === 0 ? (
                <QtBosDurum boyut="k" ikon="elmas" ton="mor" baslik={tt("Şu an satışta elmas paketi yok")} />
              ) : (
                <ul className="qt-dk-coin-izgara">
                  {elmasPaketleriListe.map((p, i) => {
                    const f = fiyatlar[p.urun_id];
                    const bonus = Number(p.bonus) > 0 ? Number(p.bonus) : 0;
                    // Bonus yüzdesi veriden (elmas_paketleri.bonus / elmas) — rakam koda gömülmez.
                    const bonusYuzde = bonus > 0 && Number(p.elmas) > 0 ? Math.round((bonus / Number(p.elmas)) * 100) : 0;
                    const enIyi = elmasPaketleriListe.length > 1 && i === elmasPaketleriListe.length - 1;
                    const alinabilir = p.satista && playVar;
                    return (
                      <li key={p.urun_id} className={i < 8 ? sirali : undefined} style={siraStili(i)}>
                        <QtKart dolgu="k" className={"qt-dk-coin qt-dk-coin--elmas" + (enIyi ? " qt-dk-coin--eniyi" : "")}>
                          {enIyi && <span className="qt-dk-coin-eniyi">{tt("En iyi değer")}</span>}
                          {bonusYuzde > 0 && (
                            <QtRozet ton="dogru" boyut="k" className="qt-dk-coin-bonus">
                              {tt("+%{n} bonus", { n: bonusYuzde })}
                            </QtRozet>
                          )}
                          {/* Ida onayı (24 Eyl 2026): 5 paket görseli (Avuç · Kese · Sandık · Hazine · Define) — eski mor
                              elmas simgeleri (.qt-dk-elmas-gorsel, dukkan-magaza.css) kalktı; CSS kuralı kullanılmıyor, duruyor. */}
                          <span className="qt-dk-coin-gorsel qt-dk-elmas-paket" data-seviye={i + 1} aria-hidden="true">
                            <ElmasPaketGorseli seviye={i + 1} />
                          </span>
                          <b className="qt-dk-coin-miktar qt-sayi">{sayiBicim(Number(p.elmas))}</b>
                          {bonus > 0 && <span className="qt-kucuk qt-dk-coin-ek">{tt("+{n} bonus elmas", { n: sayiBicim(bonus) })}</span>}
                          <span className="qt-kucuk qt-soluk qt-dk-coin-ad">{ttSunucu(p.ad) || f?.ad}</span>
                          <QtDugme
                            tur="dogru"
                            boyut="k"
                            tamGenislik
                            devreDisi={!alinabilir}
                            yukleniyor={alinan === p.urun_id}
                            onClick={() => { dokunus(); paketAl(p.urun_id); }}
                          >
                            {!p.satista ? tt("Yakında") : f?.fiyat ?? (playVar ? tt("Satın al") : tt("Uygulamada"))}
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
        {/* D-303: Google Play metni yalnız Elmas sekmesinde ve paketler satışa açıkken (başka ödeme yok) */}
        {sekme === "elmas" && elmasPaketleriListe.some((p) => p.satista) && (
          <p className="qt-kucuk qt-soluk-zemin qt-dk-yasal">
            {tt("Satın alımlar Google Play üzerinden işlenir; ödeme bilgilerin Quiz Tactics ile paylaşılmaz. Tüketilebilir ürünlerde iade Google Play kurallarına tabidir. Ayrıntı için")}{" "}
            <Link to="/gizlilik">{tt("Gizlilik Politikası")}</Link>.
          </p>
        )}
      </div>

      {/* D-301: satın alma onayı — maç içi joker penceresiyle aynı bileşen (dükkân prop'larıyla) */}
      {onay && (
        <JokerSatinAlModal
          tur={onay.tur}
          baslik={onay.baslik}
          aciklama={onay.aciklama}
          gorsel={onay.gorsel}
          uyari={onay.uyari}
          fiyat={onay.fiyat}
          coin={bakiye}
          yalnizAl
          kalanGoster
          onayMetni={onay.onayMetni ?? tt("Al")}
          yetersizEylem={() => coinKazanGoster()}
          onOnay={onay.calistir}
          onKapat={() => setOnay(null)}
        />
      )}
    </div>
  );
}
