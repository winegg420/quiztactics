import { useCallback, useEffect, useRef, useState } from "react";
import OyuncuAdiDugmesi from "../components/OyuncuAdiDugmesi.jsx";   // Ajan C: ada dokununca oyuncu kartı
import KategoriIkon from "../components/KategoriIkon.jsx";
import {
  QtKart, QtDugme, QtIkonDugme, QtIkon, QtModKart, QtListe, QtListeSatiri, QtRozet, QtCip, QtIlerleme,
  QtBosDurum, QtModal, QtToast, QtToastYuvasi, sinif,
} from "../tasarim/index.js";
import "../tasarim/ekranlar/a-meydan.css";
import DurumKutusu from "../components/DurumKutusu.jsx";
import { hataMesaji } from "../lib/hata.js";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import { kategoriAdi, kategoriEtiket, kategorileriSirala } from "../lib/kategoriler.js";
import { oyuncuAdi } from "../lib/oyuncu.js";
import { y } from "../lib/yol.js";

// Liste çekme kuralı: SÜREN işler limitsiz, BİTEN maçlar kısıtlı.
// Eskiden tek sorgu 30 satır çekiyordu; biten maçlar da o 30'un içinde
// olduğu için oyuncu 30 maçı geçince devam eden eski maçlarını göremiyordu.
const SUREN_DURUMLAR = ["aktif", "bekliyor"];
const MAC_BITEN_DURUMLAR = ["bitti", "iptal", "reddedildi"]; // matches tablosu
const BITEN_DURUMLAR = ["bitti", "iptal"];                   // grup / hızlı
const SUREN_TAVAN = 200;  // güvenlik tavanı; pratikte hiç dolmaz
const BITEN_LIMIT = 20;

const MAC_SECIMI = `*,
  p1:profiles!matches_oyuncu1_fkey(id, gorunen_ad, gorunen_avatar, gorunum, puan, acik_bot),
  p2:profiles!matches_oyuncu2_fkey(id, gorunen_ad, gorunen_avatar, gorunum, puan, acik_bot)`;

const GRUP_SECIMI = `*,
  katilimcilar:group_match_players(group_match_id, user_id, davet_durumu, skor,
    profil:profiles(id, gorunen_ad, gorunen_avatar, puan))`;

const HIZLI_SECIMI = `*,
  katilimcilar:hizli_oyuncular(hizli_mac_id, user_id, davet_durumu, skor,
    profil:profiles(id, gorunen_ad, gorunen_avatar, puan))`;

// Bot zorluk etiketi ortak dosyada (RakipAra'daki bot seçimi de kullanır).
import { botZorluk } from "../lib/botZorluk.js";

// Açık bot zorluğu → rozet tonu (eşikler lib/botZorluk.js ile aynı)
const zorlukTonu = (i) => (i <= 0.45 ? "dogru" : i <= 0.6 ? "uyari" : i <= 0.75 ? "vurgu" : "yanlis");
import DereceliAnahtari from "../components/DereceliAnahtari.jsx";
import { useDereceliTercih } from "../lib/dereceli.js";
import { useDil } from "../lib/dilKanca.js";
import { tt } from "../lib/dil.js";
import { botAdi } from "../lib/botAdi.js";
import { KLASIK_JOKERLER, DUELLO_JOKERLER } from "../lib/jokerler.js";
import { rpcDene } from "../lib/rpcDene.js";
import AramaSahnesi from "../components/AramaSahnesi.jsx";

// "Hızlı Olan Kazanır" DONDURULDU (Paket 14, 3.6): kurulum paneli arayüzden
// kaldırıldı; hizli_maclar / hizli_oyuncular ve /hizli-mac/:id rotası duruyor.
const HIZLI_OLAN_KAZANIR_ACIK = false;

// Kategori etiketleri ortak dosyada (oyun/lib/kategoriler.js)

/** Kurduğun ama henüz yanıtlanmamış grup/hızlı davet kartı. */
function BekleyenKurulum({ baslik, kategori, katilimcilar, onIptal, iptalEdilen, id }) {
  const hazir = katilimcilar.filter((k) => k.davet_durumu === "kabul").length;
  return (
    <QtKart className="a-meydan-kurulum">
      <div className="a-meydan-kurulum-ust">
        <div className="a-meydan-kurulum-metin">
          <b>{baslik}</b>
          <span>
            {kategori ? kategoriEtiket(kategori) : tt("Karışık")} · {hazir}/{katilimcilar.length} {tt("hazır")}
          </span>
        </div>
        <QtDugme tur="ikincil" boyut="k" yukleniyor={iptalEdilen === id} onClick={onIptal}>
          {iptalEdilen === id ? tt("İptal ediliyor…") : tt("İptal et")}
        </QtDugme>
      </div>

      <ul className="a-meydan-kurulum-oyuncular">
        {katilimcilar.map((k) => {
          const kabul = k.davet_durumu === "kabul";
          return (
            <li key={k.user_id} className={sinif("a-meydan-kurulum-oyuncu", kabul && "a-meydan-kurulum-oyuncu--hazir")}>
              <AvatarCerceve
                userId={k.user_id}
                profile={{
                  gorunen_ad: oyuncuAdi(k.profil, k.user_id),
                  gorunen_avatar: k.profil?.gorunen_avatar,
                }}
                boyut={36}
              />
              <span className="a-meydan-kurulum-ad">{oyuncuAdi(k.profil, k.user_id)}</span>
              <QtRozet ton={kabul ? "dogru" : "notr"} ikon={kabul ? "onay" : "saat"} boyut="k">
                {kabul ? tt("hazır") : tt("bekliyor")}
              </QtRozet>
            </li>
          );
        })}
      </ul>
    </QtKart>
  );
}

export default function ChallengesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [maclar, setMaclar] = useState([]);
  const [hata, setHata] = useState(null);
  const [toast, setToast] = useState(null);
  const bekleyenlerRef = useRef(null);
  const [botlar, setBotlar] = useState([]);
  const [oyuncular, setOyuncular] = useState([]);
  // Paket 41 A: arkadaş ve maç listeleri için ayrı durum — hata boş durumla karışmasın
  const [oyuncuDurum, setOyuncuDurum] = useState("yukleniyor");   // yukleniyor | hata | hazir
  const [macHata, setMacHata] = useState(false);
  const [kategoriler, setKategoriler] = useState([]);
  const [kategori, setKategori] = useState(null); // null = karışık
  const [grupMaclar, setGrupMaclar] = useState([]);
  const [grupOyuncuSayisi, setGrupOyuncuSayisi] = useState(3);
  const [grupSecili, setGrupSecili] = useState([]);
  const [grupHata, setGrupHata] = useState(null);
  const [hizliMaclar, setHizliMaclar] = useState([]);
  const [hizliSecili, setHizliSecili] = useState([]);
  const [hizliHata, setHizliHata] = useState(null);
  // Ana sayfadaki "Grup Maçı" kısayolu /meydan?bolum=grup ile gelir: grup paneli açık başlar.
  const [aramaParam] = useSearchParams();
  const grupBolumu = aramaParam.get("bolum") === "grup";
  const [grupAcik, setGrupAcik] = useState(grupBolumu);
  const grupPanelRef = useRef(null);
  useEffect(() => {
    if (grupBolumu) grupPanelRef.current?.scrollIntoView({ block: "start" });
  }, [grupBolumu]);
  // Paket 24 · C: grup maçı eşleştirme kuyruğu
  const [grupKuyrukAcMi, setGrupKuyrukAcMi] = useState(false);
  const [grupKuyrukSn, setGrupKuyrukSn] = useState(0);
  const [grupAramaCalisiyor, setGrupAramaCalisiyor] = useState(false);
  const [hizliAcik, setHizliAcik] = useState(false);
  const [dereceli, setDereceli] = useDereceliTercih();
  // Meydan okuma modu: normal 1v1 maç ya da düello (Taktik Maçı). Düelloda kategoriyi saldıran tur başında seçer.
  // Paket 31 B: "saf" = Saf Bilgi (jokersiz Klasik Mod).
  const [meydanModu, setMeydanModu] = useState("normal");
  const [duelloDavetleri, setDuelloDavetleri] = useState([]);
  const { ceviri } = useDil();
  const [iptalEdilen, setIptalEdilen] = useState(null);
  const [iptalHata, setIptalHata] = useState(null);
  // Onay bekleyen 1v1 iptali (maç nesnesi)
  const [iptalSorulan, setIptalSorulan] = useState(null);
  const katSeritRef = useRef(null);
  const [seritSonda, setSeritSonda] = useState(false);
  // Antrenman (Ajan E, E.2): açık bot kartına dokununca mod seçim penceresi açılır
  const [antrenmanBot, setAntrenmanBot] = useState(null);
  const [antrenmanBasliyor, setAntrenmanBasliyor] = useState(null);   // "klasik" | "duello" | null
  const [antrenmanHata, setAntrenmanHata] = useState(null);

  // Bildirim şeridi (QtToast) ~4 sn sonra kendiliğinden kapanır; zamanlama ekranın işi.
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  // Şerit sona geldiğinde sağdaki sönümleme ve "›" ipucu kaybolur
  const seritKaydi = useCallback(() => {
    const e = katSeritRef.current;
    if (!e) return;
    setSeritSonda(e.scrollLeft + e.clientWidth >= e.scrollWidth - 8);
  }, []);

  // Seçili kategori her zaman görünür alanda kalsın
  useEffect(() => {
    const e = katSeritRef.current;
    if (!e) return;
    const secili = e.querySelector(".a-meydan-kat--secili");
    try {
      secili?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
    } catch {
      /* eski tarayıcı — kaydırma olmadan da çalışır */
    }
    seritKaydi();
  }, [kategori, kategoriler, seritKaydi]);

  // Kurduğun grup/hızlı daveti geri al
  const davetIptal = async (tur, id) => {
    setIptalHata(null);
    setIptalEdilen(id);
    try {
      const { error } = await supabase.rpc(
        tur === "grup" ? "grup_mac_iptal" : "hizli_mac_iptal",
        tur === "grup" ? { p_group_match_id: id } : { p_hizli_mac_id: id }
      );
      if (error) throw error;
      if (tur === "grup") await grupYukle();
      else await hizliYukle();
    } catch (e) {
      setIptalHata(hataMesaji(e, tt("Davet iptal edilemedi.")));
    } finally {
      setIptalEdilen(null);
    }
  };

  // ---------------------------------------------------------------- 1v1 iptal
  // Onay penceresi ZORUNLU: başlamış bir maçta iptal = hükmen mağlubiyet.
  // Sonucu sunucu belirler (mac_iptal); buradaki metin yalnız uyarıdır.
  const iptalMetni = (m) => {
    const rakipProfil = m.oyuncu1 === user.id ? m.p2 : m.p1;
    const ad = oyuncuAdi(rakipProfil, m.oyuncu1 === user.id ? m.oyuncu2 : m.oyuncu1);
    if (m.durum === "bekliyor") {
      return {
        baslik: tt("Daveti geri al"),
        metin: tt("{0} henüz cevaplamadı. Daveti geri alırsan kimseye puan yazılmaz.", { 0: ad }),
        tehlike: false,
      };
    }
    if (rakipProfil?.acik_bot) {
      return {
        baslik: tt("Bot maçını iptal et"),
        metin: tt("Rakibin bir bot. İptal edersen puan değişmez, mağlubiyet yazılmaz."),
        tehlike: false,
      };
    }
    // "Başlamış" ölçütü: taraflardan biri en az bir soru ilerlemişse.
    // Sunucudaki ölçüt cevap kaydıdır (match_answers); süre dolduğu için
    // atlanan sorularda istemci uyarır ama sunucu sade iptal uygular —
    // yani uyarı hep güvenli yönde, tersi asla olmaz.
    const basladi = (m.oyuncu1_soru ?? 0) > 0 || (m.oyuncu2_soru ?? 0) > 0;
    if (!basladi) {
      return {
        baslik: tt("Maçı iptal et"),
        metin: tt("Maç henüz başlamadı. İptal edersen iki tarafa da ceza yok."),
        tehlike: false,
      };
    }
    return {
      baslik: tt("Maçı iptal et"),
      metin: tt("Bu maçı iptal edersen yenik sayılırsın ve {0} kazanır. Emin misin?", { 0: ad }),
      tehlike: true,
    };
  };

  const macIptalOnayla = async () => {
    const m = iptalSorulan;
    if (!m) return;
    setIptalHata(null);
    setIptalEdilen(m.id);
    try {
      const { data, error } = await supabase.rpc("mac_iptal", { p_match_id: m.id });
      if (error) throw error;
      const s = Array.isArray(data) ? data[0] : data;
      setToast(
        s?.sonuc === "hukmen"
          ? tt("Maç iptal edildi — hükmen mağlup sayıldın.")
          : tt("Maç iptal edildi. Kimseye puan yazılmadı.")
      );
      setIptalSorulan(null);
      await yukle();
    } catch (e) {
      setIptalHata(hataMesaji(e, tt("Maç iptal edilemedi.")));
    } finally {
      setIptalEdilen(null);
    }
  };

  // Bekleyen tüm davetleri tek dokunuşla geri al
  const tumDavetleriIptal = async () => {
    setIptalHata(null);
    setIptalEdilen("tumu");
    try {
      await Promise.all([
        ...grupBeklenenTum.map((gm) =>
          supabase.rpc("grup_mac_iptal", { p_group_match_id: gm.id })
        ),
        ...hizliBeklenenTum.map((hm) =>
          supabase.rpc("hizli_mac_iptal", { p_hizli_mac_id: hm.id })
        ),
      ]);
      await Promise.all([grupYukle(), hizliYukle()]);
    } catch (e) {
      setIptalHata(hataMesaji(e, tt("Davetler iptal edilemedi.")));
    } finally {
      setIptalEdilen(null);
    }
  };

  useEffect(() => {
    supabase
      .from("profiles")
      // Yalnız AÇIK botlar listelenir; gizli botlar "bot listesi"nde
      // görünseydi gizli olmazlardı.
      // ZORLUK (Paket 9): açık botun isabeti gizli DEĞİL — bu sayfanın amacı
      // onu göstermek. Ham `bot_isabet` sütunu istemciye kapalı kalır (gizli
      // botları ele verir, migration 155); onun yerine yalnız açık botta dolu
      // olan türetilmiş `acik_bot_isabet` okunur (migration 192). Eskiden hiç
      // okunmuyordu → botZorluk(undefined) hepsini "Çok zor"a düşürüyordu.
      .select("id, gorunen_ad, gorunen_avatar, puan, acik_bot_isabet")
      .eq("acik_bot", true)
      // Emekli bot (bot_aktif=false) listelenmez: sütunu NULL gelir (migration 193).
      .not("acik_bot_isabet", "is", null)
      .order("acik_bot_isabet", { ascending: true })
      .then(({ data }) => setBotlar(data ?? []));
    arkadaslariYukle();
    rpcDene("get_categories").then(({ data }) => setKategoriler(data ?? []));
  }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rakip olabilecekler: YALNIZ arkadaşlar (sunucu da bunu zorunlu kılıyor).
  const arkadaslariYukle = useCallback(() => {
    setOyuncuDurum("yukleniyor");
    (async () => {
      try {
        const { data: dostluklar, error } = await supabase
          .from("friendships")
          .select("requester, addressee")
          .eq("durum", "arkadas")
          .or(`requester.eq.${user.id},addressee.eq.${user.id}`);
        if (error) throw error;
        const idler = [
          ...new Set(
            (dostluklar ?? []).map((f) => (f.requester === user.id ? f.addressee : f.requester))
          ),
        ];
        if (idler.length === 0) {
          setOyuncular([]);
          setOyuncuDurum("hazir");
          return;
        }
        const { data, error: hata2 } = await supabase
          .from("profiles")
          .select("id, gorunen_ad, gorunen_avatar, puan")
          .in("id", idler)
          .order("puan", { ascending: false });
        if (hata2) throw hata2;
        setOyuncular(data ?? []);
        setOyuncuDurum("hazir");
      } catch (e) {
        console.error("[Bildim] meydan arkadaşları alınamadı:", e);
        setOyuncular([]);
        setOyuncuDurum("hata");
      }
    })();
  }, [user.id]);

  const yukle = useCallback(async () => {
    // İKİ AYRI SORGU. Eskiden tek sorgu 30 satır çekiyordu ve biten maçlar da
    // o 30'un içindeydi; oyuncu 30 maçı geçince eski DEVAM EDEN maçları
    // listede göremiyordu (maç veritabanında duruyor, sadece görünmüyordu).
    // Süren işler asla listeden düşmemeli, biten maçlar kısıtlanabilir.
    const [{ data: suren, error: h1 }, { data: biten, error: h2 }] = await Promise.all([
      supabase
        .from("matches")
        .select(MAC_SECIMI)
        .or(`oyuncu1.eq.${user.id},oyuncu2.eq.${user.id}`)
        .in("durum", SUREN_DURUMLAR)
        .order("created_at", { ascending: false })
        .limit(SUREN_TAVAN),
      supabase
        .from("matches")
        .select(MAC_SECIMI)
        .or(`oyuncu1.eq.${user.id},oyuncu2.eq.${user.id}`)
        .in("durum", MAC_BITEN_DURUMLAR)
        .order("created_at", { ascending: false })
        .limit(BITEN_LIMIT),
    ]);
    // Paket 41 A: okunamadıysa listeler boş kalır ama bunun hata olduğu ayrıca söylenir
    if (h1 || h2) console.error("[Bildim] meydan maçları alınamadı:", h1 ?? h2);
    setMacHata(Boolean(h1 || h2));
    setMaclar([...(suren ?? []), ...(biten ?? [])]);
  }, [user.id]);

  useEffect(() => {
    yukle();
    const kanal = supabase
      .channel("maclar")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, yukle)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [yukle]);

  const grupYukle = useCallback(async () => {
    // matches ile aynı tuzak: tek sorgu + limit, biten maçlar süren maçları
    // listeden itiyordu.
    const [{ data: suren }, { data: biten }] = await Promise.all([
      supabase
        .from("group_matches")
        .select(GRUP_SECIMI)
        .in("durum", SUREN_DURUMLAR)
        .order("created_at", { ascending: false })
        .limit(SUREN_TAVAN),
      supabase
        .from("group_matches")
        .select(GRUP_SECIMI)
        .in("durum", BITEN_DURUMLAR)
        .order("created_at", { ascending: false })
        .limit(BITEN_LIMIT),
    ]);
    setGrupMaclar([...(suren ?? []), ...(biten ?? [])]);
  }, []);

  useEffect(() => {
    grupYukle();
    const kanal = supabase
      .channel("grup_maclar")
      .on("postgres_changes", { event: "*", schema: "public", table: "group_matches" }, grupYukle)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_match_players" }, grupYukle)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [grupYukle]);

  const hizliYukle = useCallback(async () => {
    const [{ data: suren }, { data: biten }] = await Promise.all([
      supabase
        .from("hizli_maclar")
        .select(HIZLI_SECIMI)
        .in("durum", SUREN_DURUMLAR)
        .order("created_at", { ascending: false })
        .limit(SUREN_TAVAN),
      supabase
        .from("hizli_maclar")
        .select(HIZLI_SECIMI)
        .in("durum", BITEN_DURUMLAR)
        .order("created_at", { ascending: false })
        .limit(BITEN_LIMIT),
    ]);
    setHizliMaclar([...(suren ?? []), ...(biten ?? [])]);
  }, []);

  // Sayfa açılınca 24 saatten eski, yanıtlanmamış davetler temizlensin.
  // (Saatlik cron da aynı işi yapar; cron durursa liste yine birikmesin diye
  //  burada da tetikleniyor.)
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("eski_davetleri_temizle");
        if (error) throw error;
        if (!iptal && data > 0) {
          grupYukle();
          hizliYukle();
          yukle();
        }
      } catch (e) { console.warn("[Bildim] eski_davetleri_temizle başarısız:", e?.message ?? e);
        /* RPC yoksa (migration bekliyor) veya ağ hatası — sessiz geç */
      }
    })();
    return () => { iptal = true; };
  }, [grupYukle, hizliYukle, yukle]);

  useEffect(() => {
    hizliYukle();
    const kanal = supabase
      .channel("hizli_maclar")
      .on("postgres_changes", { event: "*", schema: "public", table: "hizli_maclar" }, hizliYukle)
      .on("postgres_changes", { event: "*", schema: "public", table: "hizli_oyuncular" }, hizliYukle)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [hizliYukle]);


  // Düello davetleri (gelen + kurduğum, bekleyenler). Tablo RLS'te yalnız taraflara açık.
  const duelloDavetYukle = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("duello_davetleri")
        .select("id, kuran, rakip, dereceli, durum, duello_id, created_at")
        .eq("durum", "bekliyor")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      setDuelloDavetleri(data ?? []);
    } catch (e) {
      console.warn("[Bildim] düello davetleri okunamadı:", e?.message ?? e);
    }
  }, [user]);

  useEffect(() => {
    duelloDavetYukle();
    const kanal = supabase
      .channel("duello_davetleri")
      .on("postgres_changes", { event: "*", schema: "public", table: "duello_davetleri" }, duelloDavetYukle)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [duelloDavetYukle]);

  /** Düello daveti gönder; açık bot anında kabul eder ve doğrudan düelloya girilir. */
  const duelloDavetEt = async (hedefId) => {
    setHata(null);
    setToast(null);
    try {
      const { data, error } = await supabase.rpc("duello_davet_et", {
        p_rakip: hedefId,
        p_dereceli: dereceli,
      });
      if (error) throw error;
      if (data?.duello_id) {
        navigate(y(`/duello/${data.duello_id}`));
        return;
      }
      setToast(tt("Düello daveti gönderildi — rakip kabul edince düello başlayacak."));
      await duelloDavetYukle();
      setTimeout(() => bekleyenlerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (e) {
      setHata(hataMesaji(e, tt("Düello daveti gönderilemedi.")));
    }
  };

  const duelloDavetCevap = async (davetId, kabul) => {
    setHata(null);
    try {
      const { data, error } = await supabase.rpc("duello_davet_cevap", { p_id: davetId, p_kabul: kabul });
      if (error) throw error;
      await duelloDavetYukle();
      if (kabul && data) navigate(y(`/duello/${data}`));
    } catch (e) {
      setHata(hataMesaji(e, tt("Düello daveti yanıtlanamadı.")));
    }
  };

  const duelloDavetIptal = async (davetId) => {
    setIptalHata(null);
    setIptalEdilen(davetId);
    try {
      const { error } = await supabase.rpc("duello_davet_iptal", { p_id: davetId });
      if (error) throw error;
      await duelloDavetYukle();
    } catch (e) {
      setIptalHata(hataMesaji(e, tt("Davet geri alınamadı.")));
    } finally {
      setIptalEdilen(null);
    }
  };

  const meydanOku = async (hedefId) => {
    if (meydanModu === "duello") return duelloDavetEt(hedefId);
    setHata(null);
    setToast(null);
    try {
      const { data, error } = await supabase.rpc("create_challenge", {
        p_rakip: hedefId,
        p_kategori: kategori,
        p_dereceli: dereceli,
        p_jokersiz: meydanModu === "saf",
      });
      if (error) throw error;
      const botMu = botlar.some((b) => b.id === hedefId);
      if (botMu && data) {
        // Bot daveti saniyeler içinde kabul eder: oyuncuyu bekletmeden maça al.
        navigate(y(`/mac/${data}`));
        return;
      }
      setToast(tt("Davet gönderildi — rakip kabul edince maç başlayacak."));
      await yukle();
      // Bekleyenler listesine kaydır
      setTimeout(() => {
        bekleyenlerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (e) {
      setHata(hataMesaji(e, tt("Meydan okuma başlatılamadı.")));
    }
  };

  // Antrenman — açık botla maç HEMEN başlar. Bot maçı mantığı değişmedi, yalnız giriş noktası
  // buraya taşındı: Klasik = hemen_bot_mac_sec (eski "Beklemeden bot ile oyna" yolu),
  // Düello = duello_davet_et (açık bot daveti anında kabul eder). Yarım ödül sunucu kuralı.
  const antrenmanBaslat = async (mod) => {
    const bot = antrenmanBot;
    if (!bot || antrenmanBasliyor) return;
    setAntrenmanHata(null);
    setAntrenmanBasliyor(mod);
    try {
      if (mod === "duello") {
        // Antrenman her zaman serbest (Ida, 24 Eyl 2026; sunucu da zorlar — migration 440).
        const { data, error } = await supabase.rpc("duello_davet_et", { p_rakip: bot.id, p_dereceli: false });
        if (error) throw error;
        if (!data?.duello_id) throw new Error(tt("Antrenman maçı başlatılamadı."));
        navigate(y(`/duello/${data.duello_id}`));
        return;
      }
      const { data, error } = await supabase.rpc("hemen_bot_mac_sec", {
        p_bot: bot.id,
        p_kategori: kategori,
        p_dereceli: false,   // antrenman her zaman serbest
        p_jokersiz: false,
      });
      if (error) throw error;
      if (!data) throw new Error(tt("Antrenman maçı başlatılamadı."));
      navigate(y(`/mac/${data}`));
    } catch (e) {
      console.error("[Bildim] antrenman maçı:", e);
      setAntrenmanHata(hataMesaji(e, tt("Antrenman maçı başlatılamadı.")));
    } finally {
      setAntrenmanBasliyor(null);
    }
  };

  const cevapVer = async (macId, kabul) => {
    setHata(null);
    const { error } = await supabase.rpc("respond_challenge", {
      p_match_id: macId,
      p_kabul: kabul,
    });
    if (error) setHata(hataMesaji(error));
    else if (kabul) navigate(y(`/mac/${macId}`));
    else yukle();
  };

  // Düello davetleri: bana gelenler / benim kurduklarım + davet satırındaki kişinin profili
  const duelloGelen = duelloDavetleri.filter((d) => d.rakip === user?.id);
  const duelloBeklenen = duelloDavetleri.filter((d) => d.kuran === user?.id);
  const kisi = (id) => botlar.find((b) => b.id === id) ?? oyuncular.find((o) => o.id === id) ?? null;

  const grupAday = [
    ...botlar,
    ...oyuncular.filter((o) => !botlar.some((b) => b.id === o.id)),
  ];
  const grupGerekli = grupOyuncuSayisi - 1;

  const grupSecimToggle = (id) => {
    setGrupSecili((secili) => {
      if (secili.includes(id)) return secili.filter((s) => s !== id);
      if (secili.length >= grupGerekli) return secili;
      return [...secili, id];
    });
  };

  const grubuKur = async () => {
    setGrupHata(null);
    const { data, error } = await supabase.rpc("create_group_challenge", {
      p_rakipler: grupSecili,
      p_kategori: kategori,
    });
    if (error) setGrupHata(hataMesaji(error));
    else {
      setGrupSecili([]);
      navigate(y(`/grup-mac/${data}`));
    }
  };

  // ---- Paket 24 · C: grup eşleştirme kuyruğu ----
  // Kuyruk sunucuda: grup_ara() ya grup id'si döner ya null (beklemeye devam).
  // Kimse gelmezse arama süresi dolunca sunucu kalan yerleri kendisi doldurur.
  const grupAramaBaslat = async () => {
    setGrupHata(null);
    setGrupAramaCalisiyor(true);
    try {
      const { data, error } = await supabase.rpc("grup_ara", { p_kategori: kategori });
      if (error) throw error;
      if (data) { navigate(y(`/grup-mac/${data}`)); return; }
      setGrupKuyrukAcMi(true);
      setGrupKuyrukSn(0);
    } catch (e) {
      setGrupHata(hataMesaji(e, tt("Grup maçı araması başlatılamadı.")));
    } finally {
      setGrupAramaCalisiyor(false);
    }
  };

  const grupAramadanCik = useCallback(async () => {
    setGrupKuyrukAcMi(false);
    setGrupKuyrukSn(0);
    try {
      const { error } = await supabase.rpc("grup_aramadan_cik");
      if (error) throw error;
    } catch (e) {
      console.warn("[Bildim] grup_aramadan_cik başarısız:", e?.message ?? e);
    }
  }, []);

  // Kuyruktayken saniyede bir yokla; sayfa kapanırsa kuyruktan çık (sonsuza kadar bekleme yok).
  useEffect(() => {
    if (!grupKuyrukAcMi) return;
    const tik = setInterval(async () => {
      setGrupKuyrukSn((s) => s + 1);
      try {
        const { data, error } = await supabase.rpc("grup_ara", { p_kategori: kategori });
        if (error) throw error;
        if (data) {
          setGrupKuyrukAcMi(false);
          navigate(y(`/grup-mac/${data}`));
        }
      } catch (e) {
        setGrupKuyrukAcMi(false);
        setGrupHata(hataMesaji(e, tt("Grup maçı araması başlatılamadı.")));
      }
    }, 1000);
    return () => clearInterval(tik);
  }, [grupKuyrukAcMi, kategori, navigate]);

  // Supabase sorgusu thenable'dır ama .catch'i yoktur: .catch her çıkışta TypeError fırlatıyordu.
  useEffect(() => () => { rpcDene("grup_aramadan_cik"); }, []);

  const grupCevapVer = async (grupMacId, kabul) => {
    setGrupHata(null);
    const { error } = await supabase.rpc("respond_group_challenge", {
      p_group_match_id: grupMacId,
      p_kabul: kabul,
    });
    if (error) setGrupHata(hataMesaji(error));
    else if (kabul) navigate(y(`/grup-mac/${grupMacId}`));
    else grupYukle();
  };

  const hizliGerekli = 4;

  const hizliSecimToggle = (id) => {
    setHizliSecili((secili) => {
      if (secili.includes(id)) return secili.filter((s) => s !== id);
      if (secili.length >= hizliGerekli) return secili;
      return [...secili, id];
    });
  };

  const hizliKur = async () => {
    setHizliHata(null);
    const { data, error } = await supabase.rpc("create_hizli_mac", {
      p_rakipler: hizliSecili,
      p_kategori: kategori,
    });
    if (error) setHizliHata(hataMesaji(error));
    else {
      setHizliSecili([]);
      navigate(y(`/hizli-mac/${data}`));
    }
  };

  const hizliCevapVer = async (hizliMacId, kabul) => {
    setHizliHata(null);
    const { error } = await supabase.rpc("respond_hizli_davet", {
      p_hizli_mac_id: hizliMacId,
      p_kabul: kabul,
    });
    if (error) setHizliHata(hataMesaji(error));
    else if (kabul) navigate(y(`/hizli-mac/${hizliMacId}`));
    else hizliYukle();
  };

  const hizliBenimKaydim = (hm) => hm.katilimcilar?.find((k) => k.user_id === user.id);
  const hizliGelen = hizliMaclar.filter(
    (hm) => hm.durum === "bekliyor" && hizliBenimKaydim(hm)?.davet_durumu === "bekliyor"
  );
  const hizliAktif = hizliMaclar.filter((hm) => hm.durum === "aktif" && hizliBenimKaydim(hm));
  const hizliBeklenenTum = hizliMaclar.filter(
    (hm) => hm.durum === "bekliyor" && hizliBenimKaydim(hm)?.davet_durumu === "kabul" && hm.kurucu === user.id
  );
  // Listede en fazla son 5 davet gösterilir; eskiler yığılmasın.
  const hizliBeklenen = hizliBeklenenTum.slice(0, 5);
  const hizliBiten = hizliMaclar
    .filter((hm) => hm.durum === "bitti" && hizliBenimKaydim(hm))
    .slice(0, 10);

  const grupBenimKaydim = (gm) => gm.katilimcilar?.find((k) => k.user_id === user.id);
  const grupGelen = grupMaclar.filter(
    (gm) => gm.durum === "bekliyor" && grupBenimKaydim(gm)?.davet_durumu === "bekliyor"
  );
  const grupAktif = grupMaclar.filter((gm) => gm.durum === "aktif" && grupBenimKaydim(gm));
  const grupBeklenenTum = grupMaclar.filter(
    (gm) => gm.durum === "bekliyor" && grupBenimKaydim(gm)?.davet_durumu === "kabul" && gm.kurucu === user.id
  );
  const grupBeklenen = grupBeklenenTum.slice(0, 5);
  const grupBiten = grupMaclar
    .filter((gm) => gm.durum === "bitti" && grupBenimKaydim(gm))
    .slice(0, 10);

  const gelen = maclar.filter((m) => m.durum === "bekliyor" && m.oyuncu2 === user.id);
  const giden = maclar.filter((m) => m.durum === "bekliyor" && m.oyuncu1 === user.id);
  const aktif = maclar.filter((m) => m.durum === "aktif");
  const biten = maclar.filter((m) => m.durum === "bitti").slice(0, 10);

  const rakip = (m) => (m.oyuncu1 === user.id ? m.p2 : m.p1);

  // Maç sonucu rozeti (bitenler listeleri)
  const sonucRozeti = (kazandim, berabere, metin) => (
    <QtRozet ton={berabere ? "notr" : kazandim ? "dogru" : "yanlis"} ikon={berabere ? undefined : kazandim ? "onay" : "carpi"} boyut="k">
      {metin ?? (berabere ? tt("Berabere") : kazandim ? tt("Kazandın") : tt("Kaybettin"))}
    </QtRozet>
  );
  const adlar = (liste, skorlu = false) => (liste ?? [])
    .filter((k) => k.user_id !== user.id)
    .map((k) => (skorlu ? `${k.profil?.gorunen_ad} (${k.skor})` : oyuncuAdi(k.profil, k.user_id)))
    .join(", ");
  // Kabul / Reddet çifti (gelen davet satırları)
  const cevapDugmeleri = (kabul, ret) => (
    <>
      <QtDugme boyut="k" tur="mor" onClick={kabul}>{tt("Kabul")}</QtDugme>
      <QtIkonDugme ikon="carpi" etiket={tt("Reddet")} onClick={ret} className="a-meydan-ret" />
    </>
  );

  return (
    <div className="a-meydan">
      {/* Sayfa başlığı */}
      <header className="a-meydan-bas">
        <h1 className="qt-baslik-1">{tt("Meydan Oku")}</h1>
        {/* Paket 42 H.2: tek cümle; artık olmayan "Dereceli Maç" düğmesinden bahsetmiyor */}
        <p className="qt-govde qt-soluk-zemin">{tt("Bir arkadaşını seç ve bire bir kapış; ya da grup maçı kur.")}</p>
      </header>
      {hata && <p className="a-meydan-hata" role="alert">{hata}</p>}
      {macHata && (
        <QtKart><DurumKutusu durum="hata" kucuk metin={tt("Maç ve davet listen alınamadı.")} onTekrar={yukle} /></QtKart>
      )}
      {toast && (
        <QtToastYuvasi>
          <QtToast ton="bilgi" baslik={toast} onKapat={() => setToast(null)} />
        </QtToastYuvasi>
      )}

      {/* Sana gelen davetler EN ÜSTTE — aşağıda kalıp gözden kaçmasınlar */}
      {(duelloGelen.length > 0 || gelen.length > 0 || hizliGelen.length > 0 || grupGelen.length > 0) && (
        <section className="a-meydan-bolum" aria-labelledby="a-meydan-gelen-b">
          <h2 id="a-meydan-gelen-b" className="qt-baslik-2">
            {tt("Sana gelen davetler")}{" "}
            <QtRozet ton="yanlis" boyut="k">{duelloGelen.length + gelen.length + hizliGelen.length + grupGelen.length}</QtRozet>
          </h2>
          <QtListe etiket={tt("Sana gelen davetler")}>
            {duelloGelen.map((d) => (
              <QtListeSatiri
                key={d.id}
                vurgulu
                bas={<AvatarCerceve profile={kisi(d.kuran)} />}
                baslik={<OyuncuAdiDugmesi userId={d.kuran} profil={kisi(d.kuran)}>{kisi(d.kuran)?.gorunen_ad ?? tt("Rakip")}</OyuncuAdiDugmesi>}
                alt={`${tt("seni düelloya çağırdı")} · ${d.dereceli ? tt("Dereceli") : tt("Serbest")}`}
                sag={cevapDugmeleri(() => duelloDavetCevap(d.id, true), () => duelloDavetCevap(d.id, false))}
              />
            ))}
            {gelen.map((m) => (
              <QtListeSatiri
                key={m.id}
                vurgulu
                bas={<AvatarCerceve profile={m.p1} />}
                baslik={<OyuncuAdiDugmesi userId={m.p1?.id ?? m.oyuncu1} profil={m.p1}>{m.p1?.gorunen_ad}</OyuncuAdiDugmesi>}
                alt={tt("sana meydan okudu!")}
                sag={cevapDugmeleri(() => cevapVer(m.id, true), () => cevapVer(m.id, false))}
              />
            ))}
            {hizliGelen.map((hm) => (
              <QtListeSatiri
                key={hm.id}
                vurgulu
                ikon="hizli"
                ikonTon="vurgu"
                baslik={adlar(hm.katilimcilar)}
                alt={tt("Hızlı Olan Kazanır — 5 kişilik yarış")}
                sag={cevapDugmeleri(() => hizliCevapVer(hm.id, true), () => hizliCevapVer(hm.id, false))}
              />
            ))}
            {grupGelen.map((gm) => (
              <QtListeSatiri
                key={gm.id}
                vurgulu
                ikon="kisiler"
                ikonTon="dogru"
                baslik={adlar(gm.katilimcilar)}
                alt={`${gm.oyuncu_sayisi} ${tt("kişilik gruba davet edildin")}`}
                sag={cevapDugmeleri(() => grupCevapVer(gm.id, true), () => grupCevapVer(gm.id, false))}
              />
            ))}
          </QtListe>
        </section>
      )}

      {/* Meydan okuma modu: Klasik Mod, Düello ya da Saf Bilgi. Arkadaşlara geçerli; antrenman kendi modunu sorar. */}
      <section className="a-meydan-bolum" aria-labelledby="a-meydan-mod-b">
        <div className="a-meydan-bolum-bas">
          <h2 id="a-meydan-mod-b" className="qt-baslik-2">{tt("Meydan okuma modu")}</h2>
          <span className="qt-kucuk qt-soluk-zemin">{tt("arkadaşına")}</span>
        </div>
        <div className="a-meydan-modlar" role="group" aria-labelledby="a-meydan-mod-b">
          <QtModKart mod="klasik" ad={tt("Klasik Mod")} alt={tt("{n} joker türü · aynı anda", { n: KLASIK_JOKERLER.length })}
                     secili={meydanModu === "normal"} onClick={() => setMeydanModu("normal")} />
          <QtModKart mod="duello" ad={tt("Düello")} alt={tt("{n} joker türü · sıra sende", { n: DUELLO_JOKERLER.length })}
                     secili={meydanModu === "duello"} onClick={() => setMeydanModu("duello")} />
          <QtModKart mod="saf" ad={tt("Saf Bilgi")} alt={tt("skill yok")}
                     secili={meydanModu === "saf"} onClick={() => setMeydanModu("saf")} />
        </div>
      </section>

      {/* Kategori seçimi 1v1, grup ve hızlı modun HEPSİ için geçerlidir. Düelloda kategoriyi saldıran tur başında seçer. */}
      <section className="a-meydan-bolum" aria-labelledby="a-meydan-kat-b">
        <div className="a-meydan-bolum-bas">
          <h2 id="a-meydan-kat-b" className="qt-baslik-2">{tt("Kategori")}</h2>
          <span className="qt-kucuk qt-soluk-zemin">{meydanModu === "duello" ? tt("düelloda kullanılmaz") : tt("1v1 · grup · hızlı mod için")}</span>
        </div>
        <div className={sinif("a-meydan-kat-serit", seritSonda && "a-meydan-kat-serit--sonda", meydanModu === "duello" && "a-meydan-kat-serit--sonuk")}>
          <div className="a-meydan-kat-liste" ref={katSeritRef} onScroll={seritKaydi} role="group" aria-labelledby="a-meydan-kat-b">
            <button
              type="button"
              className={sinif("a-meydan-kat", kategori === null && "a-meydan-kat--secili")}
              aria-pressed={kategori === null}
              onClick={() => setKategori(null)}
            >
              <KategoriIkon anahtar="karisik" boyut={26} plaka />
              <span className="a-meydan-kat-ad">{tt("Karışık")}</span>
              <span className="a-meydan-kat-alt">{tt("Tüm kategoriler")}</span>
            </button>
            {kategorileriSirala(kategoriler).map((k) => {
              const toplam = Number(k.soru_sayisi ?? 0);
              const gorulen = Number(k.gorulen_sayisi ?? 0);
              const yuzde = toplam > 0 ? Math.round((gorulen / toplam) * 100) : 0;
              return (
                <button
                  key={k.kategori}
                  type="button"
                  className={sinif("a-meydan-kat", kategori === k.kategori && "a-meydan-kat--secili")}
                  aria-pressed={kategori === k.kategori}
                  onClick={() => setKategori(k.kategori)}
                >
                  <KategoriIkon anahtar={k.kategori} boyut={26} plaka />
                  <span className="a-meydan-kat-ad">{kategoriAdi(k.kategori)}</span>
                  <span className="a-meydan-kat-alt">
                    {toplam} {tt("soru")} · {tt("%{0}", { 0: yuzde })} {tt("çözüldü")}
                  </span>
                  <QtIlerleme deger={yuzde} en={100} ton="dogru" etiket={tt("Çözülen sorular")} className="a-meydan-kat-bar" />
                </button>
              );
            })}
          </div>
          {/* Kaydırılabilir olduğunu belli eden ipucu; sona gelince kaybolur */}
          <span className="a-meydan-kat-ipucu" aria-hidden="true"><QtIkon ad="ileri" boyut={20} /></span>
        </div>
      </section>

      <DereceliAnahtari dereceli={dereceli} onDegistir={setDereceli} />

      {/* Antrenman (Ajan E, E.2): açık botlarla oynamanın TEK yeri. Rakip arama ekranlarındaki
          "Beklemeden bot ile oyna" kalktı. Kart → mod seç (Klasik / Düello) → maç hemen başlar. */}
      {botlar.some((b) => !maclar.some((m) => (m.oyuncu1 === b.id || m.oyuncu2 === b.id) && ["bekliyor", "aktif"].includes(m.durum))) && (
        <section className="a-meydan-bolum" aria-labelledby="a-meydan-bot-b">
          <div className="a-meydan-bolum-bas">
            <h2 id="a-meydan-bot-b" className="qt-baslik-2">{tt("Antrenman — Botlara meydan oku")}</h2>
            <span className="qt-kucuk qt-soluk-zemin">{tt("her zaman hazır")}</span>
          </div>
          <div className="a-meydan-antrenman" role="list">
            {botlar
              .filter(
                (b) =>
                  !maclar.some(
                    (m) =>
                      (m.oyuncu1 === b.id || m.oyuncu2 === b.id) &&
                      ["bekliyor", "aktif"].includes(m.durum)
                  )
              )
              .map((b) => {
                const isabet = Number(b.acik_bot_isabet);
                const z = botZorluk(isabet);
                return (
                  <div key={b.id} role="listitem">
                    <button
                      type="button"
                      className="a-meydan-antrenman-kart"
                      aria-haspopup="dialog"
                      onClick={() => { setAntrenmanHata(null); setAntrenmanBot(b); }}
                    >
                      <AvatarCerceve profile={b} boyut={48} />
                      <span className="a-meydan-antrenman-ad">
                        <span className="a-meydan-bot-ad">{botAdi(b.gorunen_ad)} <QtIkon ad="robot" boyut={16} /></span>
                        <QtRozet ton={zorlukTonu(isabet)} boyut="k">{z.etiket}</QtRozet>
                      </span>
                      <span className="a-meydan-antrenman-not">{tt("Antrenman — yarım ödül")}</span>
                    </button>
                  </div>
                );
              })}
          </div>
        </section>
      )}

      {/* Antrenman mod seçimi — seçilen modda maç hemen başlar */}
      {antrenmanBot && (
        <QtModal
          acik
          onKapat={() => { if (!antrenmanBasliyor) setAntrenmanBot(null); }}
          baslik={tt("{0} ile antrenman", { 0: botAdi(antrenmanBot.gorunen_ad) })}
          aciklama={tt("Mod seç, maç hemen başlasın. Antrenmanda coin ve XP yarıya iner.")}
          className="a-meydan-onay"
        >
          <div className="a-meydan-antrenman-modlar" role="group" aria-label={tt("Mod seç")}>
            <QtDugme tamGenislik tur="mor" data-qt-ilk-odak=""
                     yukleniyor={antrenmanBasliyor === "klasik"}
                     devreDisi={antrenmanBasliyor !== null}
                     onClick={() => antrenmanBaslat("klasik")}>
              {tt("Klasik Mod")}
            </QtDugme>
            <QtDugme tamGenislik tur="ikincil"
                     yukleniyor={antrenmanBasliyor === "duello"}
                     devreDisi={antrenmanBasliyor !== null}
                     onClick={() => antrenmanBaslat("duello")}>
              {tt("Düello")}
            </QtDugme>
          </div>
          {antrenmanHata && <p className="a-meydan-hata" role="alert">{antrenmanHata}</p>}
        </QtModal>
      )}

      <section className="a-meydan-bolum" aria-labelledby="a-meydan-ark-b">
        <div className="a-meydan-bolum-bas">
          <h2 id="a-meydan-ark-b" className="qt-baslik-2">{tt("Arkadaşlarına meydan oku")}</h2>
          {oyuncuDurum === "hazir" && <span className="qt-kucuk qt-soluk-zemin">{oyuncular.length} {tt("arkadaş")}</span>}
        </div>
        {oyuncuDurum !== "hazir" ? (
          <QtKart><DurumKutusu durum={oyuncuDurum} kucuk satir={2} onTekrar={arkadaslariYukle} /></QtKart>
        ) : oyuncular.length === 0 ? (
          <QtKart dolgu="yok">
            <QtBosDurum
              ikon="kisiler"
              baslik={tt("Henüz arkadaşın yok.")}
              metin={tt("Arkadaşlar sekmesinden davet linkini paylaş.")}
              eylem={<QtDugme as={Link} to={y("/arkadaslar")} tur="ikincil" boyut="k">{tt("Arkadaşlar")}</QtDugme>}
            />
          </QtKart>
        ) : (
          <QtListe etiket={tt("Arkadaşlarına meydan oku")}>
            {oyuncular.map((p) => {
              const mevcutMac = maclar.some(
                (m) =>
                  (m.oyuncu1 === p.id || m.oyuncu2 === p.id) &&
                  ["bekliyor", "aktif"].includes(m.durum)
              );
              return (
                <QtListeSatiri
                  key={p.id}
                  bas={<AvatarCerceve profile={p} boyut={40} />}
                  baslik={<OyuncuAdiDugmesi userId={p.id} profil={p}>{p.gorunen_ad}</OyuncuAdiDugmesi>}
                  alt={p.puan != null ? <span className="a-meydan-puan"><QtIkon ad="yildiz" boyut={14} /> {p.puan}</span> : null}
                  sag={mevcutMac
                    ? <QtRozet ton="bilgi" boyut="k">{tt("Maçınız var")}</QtRozet>
                    : <QtDugme boyut="k" tur="ikincil" onClick={() => meydanOku(p.id)}>{tt("Meydan oku")}</QtDugme>}
                />
              );
            })}
          </QtListe>
        )}
      </section>

      {/* Grup ve hızlı mod kurulumu açılır panelde: sayfa uzayıp dağılmasın */}
      <QtKart dolgu="yok" className="a-meydan-panel" ref={grupPanelRef}>
        <button
          type="button"
          className="a-meydan-panel-bas"
          onClick={() => setGrupAcik((a) => !a)}
          aria-expanded={grupAcik}
          aria-controls="a-meydan-grup-govde"
        >
          <span className="a-meydan-panel-ikon"><QtIkon ad="grup" boyut={24} /></span>
          <span className="a-meydan-panel-metin">
            <b>{tt("Grup Maçı Kur (3-5 kişi)")}</b>
            <span>{ceviri("Arkadaş maçı — ödül ve puan yok.")}</span>
          </span>
          <QtIkon ad="asagi" boyut={22} className="a-meydan-panel-ok" />
        </button>
        {grupAcik && (
          <div className="a-meydan-panel-govde" id="a-meydan-grup-govde">
            {/* Paket 24 · C: arkadaş çağırmadan grup maçı. Kuyruğa girilir, yeterli
                oyuncu toplanınca grup kurulur; toplanmazsa kalan yerler doldurulur.
                Ödül kuralı değişmez — grup maçı ödülsüzdür. */}
            <QtDugme
              tur={grupKuyrukAcMi ? "ikincil" : "mor"}
              tamGenislik
              ikon={grupKuyrukAcMi ? "carpi" : "oyna"}
              onClick={grupKuyrukAcMi ? grupAramadanCik : grupAramaBaslat}
              yukleniyor={grupAramaCalisiyor}
            >
              {grupKuyrukAcMi ? tt("Aramayı durdur") : tt("Rastgele oyuncularla oyna")}
            </QtDugme>
            {/* Grup araması da Güneş Halkası görünümünde (yalnız görünüm): kuyruk, 1 sn'lik yoklama ve
                grup_ara / grup_aramadan_cik çağrıları aynen yukarıda. Bulununca sayfa zaten /grup-mac'a geçer
                (grupta VS anı yok); İptal ve Esc = "Aramayı durdur". Katılan sayısını sunucu vermiyor
                (grup_ara yalnız id ya da null döner) → beklenen "3–5 oyuncu" yazılır, sayı uydurulmaz. */}
            {grupKuyrukAcMi && (
              <AramaSahnesi
                mod="grup"
                dereceli={false}
                gecen={grupKuyrukSn}
                durum="ariyor"
                alt={<span>{tt("3–5 oyunculu bir grup kuruluyor. Süre dolarsa boş yerler doldurulur.")}</span>}
                onIptal={grupAramadanCik}
              />
            )}
            <p className="a-meydan-ara">{tt("ya da arkadaşlarını seç:")}</p>
            <div className="a-meydan-cipler" role="group" aria-label={tt("Kişi")}>
              {[3, 4, 5].map((n) => (
                <QtCip
                  key={n}
                  secili={grupOyuncuSayisi === n}
                  onClick={() => {
                    setGrupOyuncuSayisi(n);
                    setGrupSecili((s) => s.slice(0, n - 1));
                  }}
                >
                  {n} {tt("Kişi")}
                </QtCip>
              ))}
            </div>
            <p className="a-meydan-sayac" aria-live="polite">
              {grupSecili.length}/{grupGerekli} {tt("rakip seçildi (botlar dahil)")}
            </p>
            <div className="a-meydan-cipler">
              {grupAday.map((p) => {
                const secili = grupSecili.includes(p.id);
                const dolu = !secili && grupSecili.length >= grupGerekli;
                return (
                  <QtCip
                    key={p.id}
                    secili={secili}
                    disabled={dolu}
                    ikon={p.bot_isabet != null ? "robot" : undefined}
                    onClick={() => grupSecimToggle(p.id)}
                  >
                    {p.gorunen_ad}
                  </QtCip>
                );
              })}
            </div>
            {grupHata && <p className="a-meydan-hata" role="alert">{grupHata}</p>}
            <QtDugme
              tamGenislik
              devreDisi={grupSecili.length !== grupGerekli}
              onClick={grubuKur}
            >
              {tt("Grubu kur ve davet et")}
            </QtDugme>
          </div>
        )}
      </QtKart>

      {HIZLI_OLAN_KAZANIR_ACIK && (
        <QtKart dolgu="yok" className="a-meydan-panel">
          <button
            type="button"
            className="a-meydan-panel-bas"
            onClick={() => setHizliAcik((a) => !a)}
            aria-expanded={hizliAcik}
          >
            <span className="a-meydan-panel-ikon"><QtIkon ad="hizli" boyut={24} /></span>
            <span className="a-meydan-panel-metin"><b>{tt("Hızlı Olan Kazanır (5 kişi)")}</b></span>
            <QtIkon ad="asagi" boyut={22} className="a-meydan-panel-ok" />
          </button>
          {hizliAcik && (
            <div className="a-meydan-panel-govde">
              <p className="a-meydan-ara">
                {tt("Herkese aynı soru aynı anda. Sadece")} <b>{tt("ilk doğru cevabı")}</b> {tt("veren puan alır. Skill yok!")}
              </p>
              <p className="a-meydan-sayac">{hizliSecili.length}/{hizliGerekli} {tt("rakip seçildi (botlar dahil)")}</p>
              <div className="a-meydan-cipler">
                {grupAday.map((p) => {
                  const secili = hizliSecili.includes(p.id);
                  const dolu = !secili && hizliSecili.length >= hizliGerekli;
                  return (
                    <QtCip key={p.id} secili={secili} disabled={dolu}
                           ikon={p.bot_isabet != null ? "robot" : undefined}
                           onClick={() => hizliSecimToggle(p.id)}>
                      {p.gorunen_ad}
                    </QtCip>
                  );
                })}
              </div>
              {hizliHata && <p className="a-meydan-hata" role="alert">{hizliHata}</p>}
              <QtDugme tamGenislik devreDisi={hizliSecili.length !== hizliGerekli} onClick={hizliKur}>
                {tt("Yarışı kur ve davet et")}
              </QtDugme>
            </div>
          )}
        </QtKart>
      )}

      {/* ---------- Süren işler: devam eden maçlar, gönderdiğin davetler ---------- */}
      <div ref={bekleyenlerRef} className="a-meydan-suren">
        {aktif.length > 0 && (
          <section className="a-meydan-bolum" aria-labelledby="a-meydan-aktif-b">
            <h2 id="a-meydan-aktif-b" className="qt-baslik-2">{tt("Devam eden")}</h2>
            <QtListe etiket={tt("Devam eden")}>
              {aktif.map((m) => {
                // Asenkron maç: herkes kendi hızında oynar. Kendi sıramız bitmediyse
                // "sıra sende" — yarım kalan müsabaka buradan sürdürülür.
                const benP1 = m.oyuncu1 === user.id;
                const benimSoru = benP1 ? (m.oyuncu1_soru ?? 0) : (m.oyuncu2_soru ?? 0);
                const toplam = m.soru_ids?.length ?? 20;
                const siraSende = benimSoru < toplam;
                return (
                  <QtListeSatiri
                    key={m.id}
                    vurgulu={siraSende}
                    bas={<AvatarCerceve profile={rakip(m)} />}
                    baslik={
                      <span className="a-meydan-bot-ad">
                        <OyuncuAdiDugmesi userId={benP1 ? m.oyuncu2 : m.oyuncu1} profil={rakip(m)}>{oyuncuAdi(rakip(m), benP1 ? m.oyuncu2 : m.oyuncu1)}</OyuncuAdiDugmesi>
                        {siraSende && <QtRozet ton="vurgu" boyut="k">{tt("Sıra sende")}</QtRozet>}
                      </span>
                    }
                    /* Skor DAİMA "senin - rakibin" sırasında. Konumsal yazılırsa
                       (oyuncu1 - oyuncu2) rakip seni davet ettiğinde sen sağa
                       geçiyorsun ve satır tersine okunuyor. */
                    alt={`${benP1 ? m.oyuncu1_skor : m.oyuncu2_skor} - ${benP1 ? m.oyuncu2_skor : m.oyuncu1_skor} · ${benimSoru}/${toplam} ${tt("soru")}${!siraSende ? tt(" · rakip oynuyor") : ""}`}
                    sag={
                      <>
                        <QtDugme boyut="k" tur={siraSende ? "mor" : "ikincil"} onClick={() => navigate(y(`/mac/${m.id}`))}>
                          {siraSende ? tt("Devam et") : tt("Gör")}
                        </QtDugme>
                        {/* İptal: sade ve ayrı; onay penceresi zorunlu */}
                        <QtIkonDugme
                          ikon="carpi"
                          tur="saydam"
                          etiket={tt("Maçı iptal et")}
                          disabled={iptalEdilen === m.id}
                          onClick={() => setIptalSorulan(m)}
                          className="a-meydan-iptal"
                        />
                      </>
                    }
                  />
                );
              })}
            </QtListe>
          </section>
        )}

        {grupAktif.length > 0 && (
          <section className="a-meydan-bolum" aria-labelledby="a-meydan-grupaktif-b">
            <h2 id="a-meydan-grupaktif-b" className="qt-baslik-2">{tt("Devam eden grup maçları")}</h2>
            <QtListe etiket={tt("Devam eden grup maçları")}>
              {grupAktif.map((gm) => (
                <QtListeSatiri
                  key={gm.id}
                  ikon="kisiler"
                  ikonTon="dogru"
                  baslik={adlar(gm.katilimcilar)}
                  alt={`${gm.oyuncu_sayisi} ${tt("kişilik grup maçı")}`}
                  sag={
                    <>
                      <QtDugme boyut="k" tur="mor" onClick={() => navigate(y(`/grup-mac/${gm.id}`))}>{tt("Oyna")}</QtDugme>
                      {/* Yarım kalmış maçları temizlemek için */}
                      <QtIkonDugme ikon="carpi" tur="saydam" etiket={tt("İptal")}
                                   disabled={iptalEdilen === gm.id} onClick={() => davetIptal("grup", gm.id)}
                                   className="a-meydan-iptal" />
                    </>
                  }
                />
              ))}
            </QtListe>
          </section>
        )}

        {hizliAktif.length > 0 && (
          <section className="a-meydan-bolum" aria-labelledby="a-meydan-hizliaktif-b">
            <h2 id="a-meydan-hizliaktif-b" className="qt-baslik-2">{tt("Devam eden hızlı yarışlar")}</h2>
            <QtListe etiket={tt("Devam eden hızlı yarışlar")}>
              {hizliAktif.map((hm) => (
                <QtListeSatiri
                  key={hm.id}
                  ikon="hizli"
                  ikonTon="vurgu"
                  baslik={adlar(hm.katilimcilar)}
                  alt={tt("Hızlı Olan Kazanır")}
                  sag={
                    <>
                      <QtDugme boyut="k" tur="mor" onClick={() => navigate(y(`/hizli-mac/${hm.id}`))}>{tt("Oyna")}</QtDugme>
                      <QtIkonDugme ikon="carpi" tur="saydam" etiket={tt("İptal")}
                                   disabled={iptalEdilen === hm.id} onClick={() => davetIptal("hizli", hm.id)}
                                   className="a-meydan-iptal" />
                    </>
                  }
                />
              ))}
            </QtListe>
          </section>
        )}

        {(giden.length > 0 || duelloBeklenen.length > 0) && (
          <section className="a-meydan-bolum" aria-labelledby="a-meydan-giden-b">
            <h2 id="a-meydan-giden-b" className="qt-baslik-2">{tt("Gönderdiğin")}</h2>
            <QtListe etiket={tt("Gönderdiğin")}>
              {/* Kurduğun düello davetleri — rakip yanıtlayana kadar burada durur, geri alınabilir */}
              {duelloBeklenen.map((d) => (
                <QtListeSatiri
                  key={d.id}
                  bas={<AvatarCerceve profile={kisi(d.rakip)} boyut={40} />}
                  baslik={<OyuncuAdiDugmesi userId={d.rakip} profil={kisi(d.rakip)}>{kisi(d.rakip)?.gorunen_ad ?? tt("Rakip")}</OyuncuAdiDugmesi>}
                  alt={`${tt("Düello · yanıt bekleniyor")} · ${d.dereceli ? tt("Dereceli") : tt("Serbest")}`}
                  sag={
                    <QtDugme boyut="k" tur="ikincil" yukleniyor={iptalEdilen === d.id} onClick={() => duelloDavetIptal(d.id)}>
                      {iptalEdilen === d.id ? tt("Geri alınıyor…") : tt("Geri al")}
                    </QtDugme>
                  }
                />
              ))}
              {giden.map((m) => (
                <QtListeSatiri
                  key={m.id}
                  bas={<AvatarCerceve profile={m.p2} />}
                  baslik={<OyuncuAdiDugmesi userId={m.p2?.id ?? m.oyuncu2} profil={m.p2}>{m.p2?.gorunen_ad}</OyuncuAdiDugmesi>}
                  alt={tt("cevap bekleniyor…")}
                  sag={
                    <QtIkonDugme ikon="carpi" tur="saydam" etiket={tt("Daveti geri al")}
                                 disabled={iptalEdilen === m.id} onClick={() => setIptalSorulan(m)}
                                 className="a-meydan-iptal" />
                  }
                />
              ))}
            </QtListe>
          </section>
        )}

        {/* Kurduğun ve yanıt bekleyen grup/hızlı davetler */}
        {(grupBeklenen.length > 0 || hizliBeklenen.length > 0) && (
          <section className="a-meydan-bolum" aria-labelledby="a-meydan-kurulum-b">
            <h2 id="a-meydan-kurulum-b" className="qt-baslik-2">{tt("Bekleyen davetlerin")}</h2>
            {(grupBeklenenTum.length + hizliBeklenenTum.length) > 5 && (
              <p className="qt-kucuk qt-soluk-zemin">
                {tt("Son 5 davet gösteriliyor (")}{grupBeklenenTum.length + hizliBeklenenTum.length} {tt("bekleyen davet var).")}
              </p>
            )}
            {grupBeklenen.map((gm) => (
              <BekleyenKurulum
                key={gm.id}
                tur="grup"
                baslik={tt("{0} kişilik grup maçı", { 0: gm.oyuncu_sayisi })}
                kategori={gm.kategori}
                katilimcilar={(gm.katilimcilar ?? []).filter((k) => k.user_id !== user.id)}
                onIptal={() => davetIptal("grup", gm.id)}
                iptalEdilen={iptalEdilen}
                id={gm.id}
              />
            ))}
            {hizliBeklenen.map((hm) => (
              <BekleyenKurulum
                key={hm.id}
                tur="hizli"
                baslik={tt("Hızlı Olan Kazanır")}
                kategori={hm.kategori}
                katilimcilar={(hm.katilimcilar ?? []).filter((k) => k.user_id !== user.id)}
                onIptal={() => davetIptal("hizli", hm.id)}
                iptalEdilen={iptalEdilen}
                id={hm.id}
              />
            ))}
            {(grupBeklenenTum.length + hizliBeklenenTum.length) > 1 && (
              <QtDugme
                tur="ikincil"
                boyut="k"
                tamGenislik
                devreDisi={iptalEdilen !== null}
                yukleniyor={iptalEdilen === "tumu"}
                onClick={tumDavetleriIptal}
              >
                {iptalEdilen === "tumu" ? tt("İptal ediliyor…") : tt("Tümünü iptal et")}
              </QtDugme>
            )}
            {iptalHata && <p className="a-meydan-hata" role="alert">{iptalHata}</p>}
          </section>
        )}
      </div>

      {/* 1v1 iptal onayı — hükmen mağlubiyet uyarısı burada verilir */}
      {iptalSorulan && (() => {
        const bilgi = iptalMetni(iptalSorulan);
        return (
          <QtModal
            acik
            onKapat={() => setIptalSorulan(null)}
            baslik={bilgi.baslik}
            className="a-meydan-onay"
            altlik={
              <>
                <QtDugme tur="ikincil" onClick={() => setIptalSorulan(null)} data-qt-ilk-odak="">
                  {tt("Vazgeç")}
                </QtDugme>
                <QtDugme
                  tur={bilgi.tehlike ? "tehlike" : "mor"}
                  yukleniyor={iptalEdilen === iptalSorulan.id}
                  onClick={macIptalOnayla}
                >
                  {iptalEdilen === iptalSorulan.id
                    ? tt("İptal ediliyor…")
                    : bilgi.tehlike
                      ? tt("Evet, yenik say")
                      : tt("İptal et")}
                </QtDugme>
              </>
            }
          >
            <p className={sinif("a-meydan-onay-metin", bilgi.tehlike && "a-meydan-onay-metin--tehlike")}>{bilgi.metin}</p>
            {iptalHata && <p className="a-meydan-hata" role="alert">{iptalHata}</p>}
          </QtModal>
        );
      })()}

      {/* ---------- Geçmiş (katlanır) ---------- */}
      {biten.length > 0 && (
        <details className="a-meydan-katlanir">
          <summary>{tt("Bitenler")} <QtRozet boyut="k">{biten.length}</QtRozet></summary>
          <QtListe etiket={tt("Bitenler")}>
            {biten.map((m) => {
              const benP1 = m.oyuncu1 === user.id;
              return (
                <QtListeSatiri
                  key={m.id}
                  bas={<AvatarCerceve profile={rakip(m)} />}
                  baslik={<OyuncuAdiDugmesi userId={benP1 ? m.oyuncu2 : m.oyuncu1} profil={rakip(m)}>{rakip(m)?.gorunen_ad}</OyuncuAdiDugmesi>}
                  /* "Senin - rakibin" sırası; bkz. Devam eden bloğundaki not. */
                  alt={`${benP1 ? m.oyuncu1_skor : m.oyuncu2_skor} - ${benP1 ? m.oyuncu2_skor : m.oyuncu1_skor}`}
                  sag={sonucRozeti(m.kazanan === user.id, m.kazanan === null)}
                />
              );
            })}
          </QtListe>
        </details>
      )}

      {grupBiten.length > 0 && (
        <details className="a-meydan-katlanir">
          <summary>{tt("Biten grup maçları")} <QtRozet boyut="k">{grupBiten.length}</QtRozet></summary>
          <QtListe etiket={tt("Biten grup maçları")}>
            {grupBiten.map((gm) => {
              const kazandim = gm.kazanan === user.id;
              const berabere = gm.kazanan === null;
              const odul = 10 * gm.oyuncu_sayisi;
              return (
                <QtListeSatiri
                  key={gm.id}
                  ikon="kisiler"
                  ikonTon="dogru"
                  baslik={adlar(gm.katilimcilar, true)}
                  alt={`${tt("senin skorun:")} ${grupBenimKaydim(gm)?.skor ?? 0}`}
                  sag={sonucRozeti(kazandim, berabere, !berabere && kazandim ? tt("Kazandın +{0}", { 0: odul }) : undefined)}
                />
              );
            })}
          </QtListe>
        </details>
      )}

      {hizliBiten.length > 0 && (
        <details className="a-meydan-katlanir">
          <summary>{tt("Biten hızlı yarışlar")} <QtRozet boyut="k">{hizliBiten.length}</QtRozet></summary>
          <QtListe etiket={tt("Biten hızlı yarışlar")}>
            {hizliBiten.map((hm) => (
              <QtListeSatiri
                key={hm.id}
                ikon="hizli"
                ikonTon="vurgu"
                baslik={adlar(hm.katilimcilar, true)}
                alt={`${tt("senin skorun:")} ${hizliBenimKaydim(hm)?.skor ?? 0}`}
                sag={sonucRozeti(hm.kazanan === user.id, hm.kazanan === null)}
              />
            ))}
          </QtListe>
        </details>
      )}
    </div>
  );
}
