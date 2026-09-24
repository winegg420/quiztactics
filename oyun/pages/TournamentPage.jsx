import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MacUstSerit from "../components/MacUstSerit.jsx";
import { hataMesaji } from "../lib/hata.js";
import { useGeriTusuOnayi } from "../lib/geriTusuOnayi.js";
import { useOyunModu } from "../lib/oyunModu.js";
import { soruCek } from "../lib/soruCek.js";
import TurnuvaTanitim from "../components/TurnuvaTanitim.jsx";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import Countdown from "../components/Countdown.jsx";
import { BugunKalanTurnuvalar } from "../components/TurnuvaSaatleri.jsx";
import { siradakiLobi, kalanSure, gosterimTavani } from "../lib/zaman.js";
import YanlisSatiri from "../components/YanlisSatiri.jsx";
import OdulDokumu from "../components/OdulDokumu.jsx";
import MacSorulari from "../components/MacSorulari.jsx";
import MeydanaDonus from "../components/MeydanaDonus.jsx";
import MacSonuKutlama from "../components/MacSonuKutlama.jsx";
import CerceveliAvatar from "../components/CerceveliAvatar.jsx";
import { useMacSonuOzet, ozettenSahne } from "../lib/macSonuOzet.js";
import QuestionCard from "../components/QuestionCard.jsx";
import SkillSeti from "../components/SkillSeti.jsx";
import OyuncuKarti from "../components/OyuncuKarti.jsx";
import { useArkadaslik } from "../lib/arkadaslik.js";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import AvatarDugmesi from "../components/AvatarDugmesi.jsx";
import OyuncuAdiDugmesi from "../components/OyuncuAdiDugmesi.jsx";
import { useNavigate } from "react-router-dom";
import { y } from "../lib/yol.js";
import { useGorunurlukTazele, zamanAsimiyla } from "../lib/gorunurluk.js";
import { GB_MS } from "../lib/geriBildirim.js";
import { tt } from "../lib/dil.js";
import { sesOnYukle, sesTurnuvaBasladi } from "../lib/ses.js";
import { QtBosDurum, QtDugme, QtIkon, QtIkonDugme, QtIskelet, QtKart, QtListe, QtListeSatiri, QtModal, QtRozet, QtSayac, QtSekmeler, QtSoruKarti } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import "../tasarim/ekranlar/m1-sonuc.css";
import "../tasarim/ekranlar/m1-turnuva.css";

// Oyuncu listesi değişimlerinde (katılım, puan) yeniden okuma aralığı — bkz. oyuncuTazele.
const OYUNCU_TAZELE_MS = 1500;

/** Elenen/izleyen oyuncuya soru sayacı (Paket 41 M.2). Sunucu saatiyle hizalı. */
function IzleyiciSayac({ soru }) {
  const [fark] = useState(() => (soru?.sunucu_zamani ? new Date(soru.sunucu_zamani).getTime() - Date.now() : 0));
  // 326: sayaç tavanı sorunun ilk görülen başlangıcına göre (gösterim payı + Ek Süre).
  const ilkRef = useRef({ index: null, bas: null });
  if (soru?.baslangic && ilkRef.current.index !== soru.soru_index) ilkRef.current = { index: soru.soru_index, bas: soru.baslangic };
  const tavan = soru?.baslangic ? gosterimTavani(soru.baslangic, ilkRef.current.bas) : 15;
  const [kalan, setKalan] = useState(() => (soru?.baslangic ? kalanSure(soru.baslangic, fark, 15, tavan) : 0));
  useEffect(() => {
    if (!soru?.baslangic) return undefined;
    const t = setInterval(() => setKalan(kalanSure(soru.baslangic, fark, 15, tavan)), 250);
    return () => clearInterval(t);
  }, [soru?.baslangic, fark, tavan]);
  if (!soru?.baslangic) return null;
  return <QtSayac kalan={kalan} toplam={15} />;
}

export default function TournamentPage() {
  const { user, profile, refreshProfile } = useAuth();
  const [turnuva, setTurnuva] = useState(null);
  // Paket 43 C: turnuvada maçtan çıkmak elenmek demek — X onay ister (Düello'daki terkOnay kalıbı)
  const [cikisOnay, setCikisOnay] = useState(false);
  const [oyuncular, setOyuncular] = useState([]);
  const [terkEttim, setTerkEttim] = useState(false);   // A.1: "Çık ve elen" → turnuva_terk (ödülsüz)
  // A.3: yeni maç sonu sahnesinin verisi (tek çağrı: mac_sonu_ozet) — turnuva bitince, katıldıysan.
  const turnuvaKatildim = oyuncular.some((o) => o.user_id === user?.id);
  const { ozet: macSonuOzet } = useMacSonuOzet(
    turnuva?.durum === "bitti" && turnuvaKatildim ? `turnuva:${turnuva.id}` : null);
  const [soru, setSoru] = useState(null);
  // Soru bütün denemelere rağmen gelmedi mi? (sessiz donma yerine görünür hata)
  const [soruHatasi, setSoruHatasi] = useState(false);
  // "Tekrar dene" bunu artırır; soru çekme effect'i yeniden koşar.
  const [soruDeneme, setSoruDeneme] = useState(0);
  // Kendi son cevabımızın zamanı (geri bildirim penceresi için)
  const cevapZamaniRef = useRef(0);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);
  // Lobide bir oyuncuya dokununca açılan kart
  const [kartOyuncu, setKartOyuncu] = useState(null);
  // Paket 35 C: kartta arkadaşsa "Mesaj at", değilse "Arkadaş ekle" — kararı sayfa verir
  const arkadaslik = useArkadaslik(user?.id);
  // Paket 26 · F — lobi filtreleri. Hepsi MEVCUT listenin üstünde çalışır;
  // her tuşa basışta sunucuya gitmez. "Arkadaşlarım" için arkadaş kimlikleri
  // yalnız o filtre İLK KEZ seçildiğinde bir kez okunur ve oturum boyunca durur.
  const [suzgec, setSuzgec] = useState("hepsi");   // hepsi | arkadas | lig
  const [arama, setArama] = useState("");
  const [arkadasIdler, setArkadasIdler] = useState(null);   // null = henüz okunmadı
  const arkadasOkunuyor = useRef(false);
  // Lig bilgisi `profiles.lig` üzerinden okunamaz (o kolon istemciye kapalı, ölçüldü);
  // giriş yapmış oyuncuya zaten açık olan `lig_uyelik` kullanılır. Bu da tembel:
  // "Kendi Ligim" ilk kez seçilene kadar sorgu yapılmaz.
  const [ligler, setLigler] = useState(null);   // Map(user_id → lig)
  const ligOkunuyor = useRef(false);
  // Paket 24 · D: bu haftanın ilk-3 giysi ödülü (haftalık rotasyonla değişir)
  const [haftalikGiysi, setHaftalikGiysi] = useState(null);
  const navigate = useNavigate();
  const advanceKilidi = useRef(false);
  // Paket 36: biten turnuvanın sonuç sahnesi. Ödül toplamı ve sıra SUNUCUNUN
  // yazdığı dökümden (odul_dokumu › turnuva_derece.detay.sira) gelir; istemci sıralamaz.
  const [turnuvaDokum, setTurnuvaDokum] = useState(null);
  const [gorevler, setGorevler] = useState([]);   // Paket 37 D.1: sahnede Detay'ın üstünde
  const [turnuvaYanlis, setTurnuvaYanlis] = useState(0);
  // "Turnuvalara dön" sahneyi kapatır; bu oturumda aynı turnuva için bir daha açılmaz.
  const [sonucKapandi, setSonucKapandi] = useState(0);

  /** Lobideki oyuncuya meydan okuma — kart da buradan kapanır. */
  const meydanOku = async (hedefId) => {
    setHata(null);
    setKartOyuncu(null);
    try {
      const { data, error } = await supabase.rpc("create_challenge", {
        p_rakip: hedefId,
        p_kategori: null,
      });
      if (error) throw error;
      if (data) navigate(y(`/mac/${data}`));
    } catch (e) {
      setHata(hataMesaji(e, tt("Meydan okuma başlatılamadı.")));
    }
  };
  // Süre doldu ama ilerletme henüz başarılı olmadı mı? Dönüşte hemen denenir.
  const bekleyenIlerletme = useRef(false);
  const kanalRef = useRef(null);
  // Kanal düştüğünde yeniden kurma zamanlayıcısı ve güncel kanalKur referansı
  const yenidenBaglaRef = useRef(null);
  const kanalKurRef = useRef(null);

  // Paket 41 G: turnuva okunamadıysa "sıradaki turnuva" (turnuva yok) görünümü çizilmez
  const [turnuvaHata, setTurnuvaHata] = useState(false);
  const turnuvaYukleTek = useCallback(async () => {
    // error okunmazsa turnuva hiç yüklenmemiş gibi görünür ve sebebi
    // hiçbir yere düşmez; kullanıcıya da gösterilecek bir mesaj kalmaz.
    let data = null;
    try {
      // Günde birden çok turnuva (Paket 12, madde 7): önce açık turnuvalar; yoksa
      // son biten. "Son 3 satır" bitmiş turnuvalarla dolup lobiyi
      // gizleyebiliyordu; aynı gün iki lobide de en erken başlayan seçilir.
      const sonuc = await supabase
        .from("tournaments")
        .select("*")
        .in("durum", ["aktif", "lobi"])
        .limit(20);
      if (sonuc.error) throw sonuc.error;
      data = sonuc.data ?? [];
      if (!data.length) {
        const biten = await supabase
          .from("tournaments")
          .select("*")
          .in("durum", ["bitti", "iptal"])
          .order("tarih", { ascending: false })
          .order("bitis", { ascending: false, nullsFirst: false })
          .limit(1);
        if (biten.error) throw biten.error;
        data = biten.data;
      }
    } catch (e) {
      console.error("[Bildim] turnuvalar alınamadı:", e);
      setTurnuvaHata(true);
    }
    const liste = data ?? [];
    const secilen =
      liste.find((t) => t.durum === "aktif") ??
      siradakiLobi(liste) ??
      liste[0] ??
      null;
    setTurnuva(secilen);
    if (secilen) {
      try {
        const { data: ply, error } = await supabase
          .from("tournament_players")
          .select("*, profil:profiles(gorunen_ad, gorunen_avatar, gorunum, puan)")
          .eq("tournament_id", secilen.id)
          .order("joined_at");
        if (error) throw error;
        setOyuncular(ply ?? []);
      } catch (e) {
        console.error("[Bildim] turnuva oyuncuları alınamadı:", e);
      }
    }
    setYukleniyor(false);
    return secilen;
  }, []);

  // Performans (23 Eyl 2026): kanal süzgeçsizdir — turnuvadaki HER oyuncunun her
  // puan güncellemesi (tournament_players) bütün istemcilerde tam yeniden okuma
  // tetikliyordu (N oyuncu → soru başına N×N okuma), yanıtlar sırasız da gelebiliyordu.
  // Artık: aynı anda tek okuma; yoldayken gelen istekler tek bir tekrar okumada birleşir.
  const yukleSozRef = useRef(null);
  const tekrarSozRef = useRef(null);
  const yukleRef = useRef(null);
  const turnuvaYukle = useCallback(() => {
    if (yukleSozRef.current) {
      if (!tekrarSozRef.current) {
        tekrarSozRef.current = yukleSozRef.current.then(() => {
          tekrarSozRef.current = null;
          return yukleRef.current();
        });
      }
      return tekrarSozRef.current;
    }
    const soz = turnuvaYukleTek().finally(() => { yukleSozRef.current = null; });
    yukleSozRef.current = soz;
    return soz;
  }, [turnuvaYukleTek]);
  yukleRef.current = turnuvaYukle;
  // Oyuncu listesi değişimleri (katılım, puan) seyreltilir: en çok OYUNCU_TAZELE_MS'de bir.
  const oyuncuTazeleRef = useRef(null);
  const oyuncuTazele = useCallback(() => {
    if (oyuncuTazeleRef.current) return;
    oyuncuTazeleRef.current = setTimeout(() => {
      oyuncuTazeleRef.current = null;
      yukleRef.current?.();
    }, OYUNCU_TAZELE_MS);
  }, []);
  useEffect(() => () => clearTimeout(oyuncuTazeleRef.current), []);

  // Kanal kurulumu ayrı fonksiyonda: sekmeden dönüşte ölmüş soket yeniden kurulur.
  const kanalKur = useCallback(() => {
    const kanal = supabase
      .channel("turnuva")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournaments" },
        (payload) => {
          // Açık turnuvanın satırı yükün içinde gelir: soru geçişi beklemeden çizilir
          // (yeniden okuma yine yapılır — seçim mantığı turnuvaYukleTek'te).
          const yeni = payload?.new;
          if (yeni?.id) setTurnuva((t) => (t && t.id === yeni.id ? { ...t, ...yeni } : t));
          turnuvaYukle();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_players" },
        () => oyuncuTazele()
      )
      // Kanal ölürse sessizce kalmasın: Realtime kopmasi (ag dalgalanmasi,
      // uyku, arka plan) CHANNEL_ERROR/TIMED_OUT/CLOSED olarak bildirilir.
      // Yoklama zaten veriyi getiriyor ama kanal geri kurulmazsa anlık
      // güncellemeler (rakip skoru, mesaj) bir daha hiç gelmiyordu.
      .subscribe((durum) => {
        // Paket 20 VI: sayfadan çıkışta / sekme dönüşünde kanal BİLEREK kapatılır (kanalRef artık başka kanalı
        // ya da null'u gösterir); Supabase bunu da CLOSED diye bildiriyordu → yanlış "kanal düştü" uyarısı.
        if (kanalRef.current !== kanal) return;
        if (durum === "CHANNEL_ERROR" || durum === "TIMED_OUT" || durum === "CLOSED") {
          console.warn("[Bildim] turnuva kanali dustu:", durum);
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
  }, [turnuvaYukle, oyuncuTazele]);

  // İlk yükleme + realtime
  // Kanal izleyicisi kanalKur'u çağırabilsin (kanalKur kendi tanımına
  // referans veremediği için güncel hâli her render'da ref'e yazılır).
  kanalKurRef.current = kanalKur;

  // Haftalık giysi ödülü — turnuva ekranı açılınca bir kez
  useEffect(() => {
    let iptal = false;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("turnuva_haftalik_giysi_bilgi");
        if (error) throw error;
        if (!iptal) setHaftalikGiysi(data ?? null);
      } catch (e) {
        console.warn("[Bildim] turnuva_haftalik_giysi_bilgi başarısız:", e?.message ?? e);
      }
    })();
    return () => { iptal = true; };
  }, []);

  useEffect(() => {
    turnuvaYukle();
    kanalKur();
    return () => {
      const eskiKanal = kanalRef.current;   // Paket 20 VI: CLOSED eşzamanlı gelir — önce ref boşalır, sonra kapanır
      kanalRef.current = null;
      if (eskiKanal) supabase.removeChannel(eskiKanal);
      if (yenidenBaglaRef.current) clearTimeout(yenidenBaglaRef.current);
    };
  }, [turnuvaYukle, kanalKur]);

  // Sekmeden dönünce: sunucudaki güncel durumu çek + Realtime kanalını yenile.
  // Ortak soru saati olduğu için istemci ekstra atlama tetiklemez.
  useGorunurlukTazele(() => {
    turnuvaYukle();
    // Arka planda setTimeout donduğu için bekleyen ilerletme burada çalışır.
    if (bekleyenIlerletme.current) ilerletmeyiDene();
    try {
      const eskiKanal = kanalRef.current;   // Paket 20 VI: önce ref, sonra kapat
      kanalRef.current = null;
      if (eskiKanal) supabase.removeChannel(eskiKanal);
      kanalKur();
    } catch (e) {
      console.error("[Bildim] realtime yeniden kurulamadi:", e);
    }
  }, turnuva?.durum === "aktif");

  // Aktif soru değiştiğinde soruyu çek
  useEffect(() => {
    if (!turnuva || turnuva.durum !== "aktif" || turnuva.aktif_soru < 0) {
      setSoru(null);
      return;
    }
    // Son cevaplayanın geri bildirimi GB_MS kalsın (Paket 14, 5.2 — grup maçıyla aynı hata)
    const bekle = Math.max(0, GB_MS - (Date.now() - cevapZamaniRef.current));
    let iptal = false;
    let durdur = null;
    const zamanlayici = setTimeout(() => {
      if (iptal) return;
      advanceKilidi.current = false;
      bekleyenIlerletme.current = false;
      setSoruHatasi(false);
      // PES ETMEYEN İSTEK (oyun/lib/soruCek.js) — Klasik maçtaki donma
      // hatasının aynısı buradaydı: tek deneme, hata olunca sessizce boş ekran.
      durdur = soruCek({
        rpcAdi: "get_tournament_question",
        param: { p_tournament_id: turnuva.id },
        onSoru: setSoru,
        onVazgecti: () => setSoruHatasi(true),
      });
    }, bekle);
    return () => { iptal = true; clearTimeout(zamanlayici); durdur?.(); };
  }, [turnuva?.id, turnuva?.durum, turnuva?.aktif_soru, soruDeneme]);

  // Turnuva bitince puanlar değişmiş olabilir
  useEffect(() => {
    if (turnuva?.durum === "bitti") refreshProfile(user.id);
  }, [turnuva?.durum, refreshProfile, user.id]);

  // --- Paket 26 F: lobi süzgeçleri -------------------------------------------
  // Arkadaş kimlikleri tembel okunur: süzgeç seçilmeden sorgu yapılmaz.
  useEffect(() => {
    if (suzgec !== "arkadas" || arkadasIdler !== null || arkadasOkunuyor.current || !user) return;
    arkadasOkunuyor.current = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("friendships")
          .select("requester, addressee")
          .eq("durum", "arkadas");
        if (error) throw error;
        setArkadasIdler(
          new Set((data ?? []).map((f) => (f.requester === user.id ? f.addressee : f.requester)))
        );
      } catch (e) {
        console.error("[Bildim] arkadaş listesi alınamadı:", e);
        setArkadasIdler(new Set());   // boş küme: süzgeç çalışır, sayfa kırılmaz
      } finally {
        arkadasOkunuyor.current = false;
      }
    })();
  }, [suzgec, arkadasIdler, user]);

  // Lig eşlemesi de tembel: yalnız "Kendi Ligim" seçilince, tek sorguda.
  useEffect(() => {
    if (suzgec !== "lig" || ligler !== null || ligOkunuyor.current || oyuncular.length === 0) return;
    ligOkunuyor.current = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("lig_uyelik")
          .select("user_id, lig, hafta")
          .in("user_id", oyuncular.map((o) => o.user_id))
          .order("hafta", { ascending: false });
        if (error) throw error;
        const harita = new Map();
        for (const r of data ?? []) if (!harita.has(r.user_id)) harita.set(r.user_id, r.lig);
        setLigler(harita);
      } catch (e) {
        console.error("[Bildim] lig bilgisi alınamadı:", e);
        setLigler(new Map());
      } finally {
        ligOkunuyor.current = false;
      }
    })();
  }, [suzgec, ligler, oyuncular]);

  const benimLig = ligler?.get(user?.id) ?? null;

  const suzulmusOyuncular = useMemo(() => {
    const ara = arama.trim().toLocaleLowerCase("tr");
    return oyuncular.filter((o) => {
      if (suzgec === "arkadas" && !(arkadasIdler?.has(o.user_id) || o.user_id === user?.id)) return false;
      // Lig eşlemesi henüz gelmediyse listeyi boşaltma: olduğu gibi göster.
      if (suzgec === "lig" && ligler && (!benimLig || ligler.get(o.user_id) !== benimLig)) return false;
      if (ara && !(o.profil?.gorunen_ad ?? "").toLocaleLowerCase("tr").includes(ara)) return false;
      return true;
    });
  }, [oyuncular, suzgec, arama, arkadasIdler, ligler, benimLig, user?.id]);

  const suzuluyor = suzgec !== "hepsi" || arama.trim() !== "";

  const benimKayit = oyuncular.find((o) => o.user_id === user.id);
  const hayatta = oyuncular.filter((o) => !o.elendi);

  const cevapla = async (i) => {
    const { data, error } = await supabase.rpc("submit_tournament_answer", {
      p_tournament_id: turnuva.id,
      p_cevap: i,
      // 329: hangi soruyu cevapladığımız — soru değiştiyse (eski kart) sunucu reddeder.
      p_soru_index: soru?.soru_index ?? null,
    });
    if (error) throw error;
    cevapZamaniRef.current = Date.now();
    return data?.[0];
  };

  // İlerletme: hata yutulmaz, kilit başarısızlıkta AÇILIR. Eskiden RPC'nin
  // sonucuna hiç bakılmıyordu; sekme arka plandayken çağrı düşerse tur
  // ilerlemiyor, advanceKilidi kapalı kaldığı için de yeniden denenmiyordu.
  const ilerletmeyiDene = useCallback(async () => {
    if (!turnuva) return;
    try {
      const { error } = await zamanAsimiyla(
        supabase.rpc("advance_tournament", { p_tournament_id: turnuva.id }),
        10000,
        "advance_tournament"
      );
      if (error) throw error;
      bekleyenIlerletme.current = false;
      await turnuvaYukle();
    } catch (e) {
      console.error("[Bildim] turnuva ilerletilemedi, yeniden denenecek:", e);
      advanceKilidi.current = false;
      turnuvaYukle();
    }
  }, [turnuva, turnuvaYukle]);

  // Süre dolunca ilerletme "bekleyen iş" olarak işaretlenir. Rastgele gecikme
  // aynı anda yüzlerce istemcinin sunucuya yüklenmemesi için. setTimeout arka
  // planda donduğundan dönüşte bekleyen iş gecikmesiz çalıştırılır.
  const sureDoldu = useCallback(() => {
    if (advanceKilidi.current || !turnuva) return;
    advanceKilidi.current = true;
    bekleyenIlerletme.current = true;
    setTimeout(() => {
      if (bekleyenIlerletme.current) ilerletmeyiDene();
    }, Math.random() * 1200 + 1100);
  }, [turnuva, ilerletmeyiDene]);

  const lobiyeKatil = async () => {
    setHata(null);
    try {
      const { error } = await supabase.rpc("join_tournament_lobby");
      if (error) throw error;
      turnuvaYukle();
    } catch (e) {
      setHata(hataMesaji(e));
    }
  };

  const lobidenAyril = async () => {
    setHata(null);
    try {
      const { error } = await supabase.rpc("leave_tournament_lobby");
      if (error) throw error;
    } catch (e) {
      setHata(hataMesaji(e, tt("Lobiden ayrılamadın. Tekrar dene.")));
    }
    turnuvaYukle();
  };

  // Turnuva başladı (lobi → aktif) — bir kez tören sesi.
  const oncekiDurumRef = useRef(null);
  useEffect(() => {
    const onceki = oncekiDurumRef.current;
    oncekiDurumRef.current = turnuva?.durum ?? null;
    if (onceki === "lobi" && turnuva?.durum === "aktif") sesTurnuvaBasladi();
  }, [turnuva?.durum]);
  useEffect(() => { sesOnYukle("turnuva"); }, []);
  // Müzik (Ajan H): turnuva maçı sürerken maç döngüsü, lobide turnuva teması.
  const turnuvaAktif = turnuva?.durum === "aktif";
  useEffect(() => {
    const ayarla = (macta) => import("../lib/sesArkaPlan.js").then((m) => m.muzikTurnuvaMacta(macta)).catch(() => { /* müzik kritik değil */ });
    ayarla(turnuvaAktif);
    return () => { ayarla(false); };
  }, [turnuvaAktif]);

  useOyunModu(Boolean(soru) && turnuva?.durum === "aktif");

  // Ida (24 Eyl): yarışırken geri tuşu da çıkış onayını açar (lobi, bitmiş turnuva, elenmiş/izleyici hariç).
  const yarisiyorum = Boolean(turnuvaAktif && !yukleniyor && !turnuvaHata && !terkEttim
    && oyuncular.some((o) => o.user_id === user?.id && !o.elendi));
  useGeriTusuOnayi(yarisiyorum, () => setCikisOnay(true));

  if (yukleniyor) {
    return (
      <div className="m1-tv" aria-busy="true">
        <QtIskelet tur="kart" yukseklik={180} />
        <QtIskelet tur="satir" adet={3} />
      </div>
    );
  }
  if (turnuvaHata) {
    return (
      <div className="m1-tv">
        <QtBosDurum
          ikon="uyari"
          ton="yanlis"
          baslik={tt("Turnuva bilgisi alınamadı")}
          metin={tt("Bağlantını kontrol edip tekrar dene.")}
          eylem={<QtDugme ikon="yenile" onClick={() => { setTurnuvaHata(false); turnuvaYukle(); }}>{tt("Tekrar dene")}</QtDugme>}
        />
      </div>
    );
  }

  // A.1: turnuvadan çıkan oyuncu (turnuva_terk) ödülsüz, sade sahneyi görür.
  if (terkEttim && turnuva?.durum === "aktif") {
    const benSatir = oyuncular.find((o) => o.user_id === user?.id);
    return (
      <MacSonuKutlama
        terk="ben"
        mod="turnuva"
        karsilasma={<div className="msk-derece"><CerceveliAvatar profile={benSatir?.profil ?? profile} userId={user?.id} boyut={88} /></div>}
        rovans={null}
        eylemler={{ onYeniMac: () => setTerkEttim(false), onAnaSayfa: () => navigate(y()), yeniMacEtiketi: tt("Turnuvalara dön") }}
      />
    );
  }

  const hataBandi = hata ? (
    <div className="m1-bant m1-bant--hata" role="alert"><QtIkon ad="uyari" boyut={18} /><span>{hata}</span></div>
  ) : null;

  // ---- Lobi yok / sıradaki turnuva ----
  if (!turnuva || turnuva.durum === "bitti" || turnuva.durum === "iptal") {
    const kazanan =
      turnuva?.durum === "bitti"
        ? oyuncular.find((o) => o.user_id === turnuva.kazanan)
        : null;
    const katildim = oyuncular.some((o) => o.user_id === user?.id);
    const kapanmaAnahtari = turnuva ? `bildim_turnuva_sonuc_kapandi:${turnuva.id}` : null;
    let kapandi = sonucKapandi > 0;
    try { kapandi = kapandi || (kapanmaAnahtari && sessionStorage.getItem(kapanmaAnahtari) === "1"); } catch { /* özel mod */ }
    if (turnuva?.durum === "bitti" && katildim && !kapandi) {
      const kapat = () => {
        try { sessionStorage.setItem(kapanmaAnahtari, "1"); } catch { /* özel mod */ }
        setSonucKapandi((x) => x + 1);
      };
      if (!macSonuOzet) return <div className="msk-bekle" aria-busy="true" />;
      const sahneVeri = ozettenSahne(macSonuOzet);
      const benSatir = oyuncular.find((o) => o.user_id === user?.id);
      // Derece: sunucunun ödül dağıtımında yazdığı sıra (turnuva_derece); yoksa aynı düzenle istemcide.
      const siraliOyuncular = [...oyuncular].filter((o) => !o.terk_at).sort((a, b) =>
        (a.elendi === b.elendi ? 0 : a.elendi ? 1 : -1)
        || ((b.elenme_sorusu ?? Infinity) - (a.elenme_sorusu ?? Infinity))
        || ((b.dogru_sayisi ?? 0) - (a.dogru_sayisi ?? 0)));
      const sira = macSonuOzet.dokum?.kalemler?.find((k) => k.kalem === "turnuva_derece")?.detay?.sira
        ?? (siraliOyuncular.findIndex((o) => o.user_id === user?.id) + 1 || null);
      const sampiyonBenim = turnuva.kazanan === user?.id;
      // A.3 kararı: turnuvada orta sahnede kendi sonucun + derecen ("N. · M oyuncu arasında"); şampiyon
      // ve bütün sıra Detay'da. Şampiyonsan kutlama, değilsen sakin (mor) sahne.
      return (
        <MacSonuKutlama
          durum={sampiyonBenim ? "kazandi" : "berabere"}
          mod="turnuva"
          terk={benSatir?.terk_at ? "ben" : null}
          baslik={benSatir?.terk_at ? undefined : sampiyonBenim ? tt("ŞAMPİYON!") : tt("Turnuva bitti")}
          altYazi={benSatir?.terk_at ? undefined : kazanan && !sampiyonBenim ? tt("Şampiyon: {ad}", { ad: kazanan.profil?.gorunen_ad ?? "" }) : undefined}
          karsilasma={
            <div className="msk-derece">
              <CerceveliAvatar profile={benSatir?.profil} userId={user?.id} boyut={88} hareketli={sampiyonBenim} />
              {sira && !benSatir?.terk_at ? <span className="msk-derece-sayi qt-sayi">{tt("{n}.", { n: sira })}</span> : null}
              {!benSatir?.terk_at && (
                <span className="msk-derece-etiket">{tt("{t} oyuncu arasında · {d} doğru", { t: oyuncular.length, d: benSatir?.dogru_sayisi ?? 0 })}</span>
              )}
            </div>
          }
          oduller={sahneVeri.oduller}
          level={sahneVeri.level}
          lig={sahneVeri.lig}
          gorevler={sahneVeri.gorevler}
          rozetler={sahneVeri.rozetler}
          detayRozet={turnuvaYanlis}
          detay={
            <>
              {kazanan && (
                <div className="m1-ss-sampiyon">
                  <AvatarDugmesi userId={kazanan.user_id} profil={kazanan.profil} kendi={kazanan.user_id === user?.id}>
                    <AvatarCerceve profile={kazanan.profil} boyut={64} userId={kazanan.user_id} />
                  </AvatarDugmesi>
                  <div className="m1-ss-isim"><OyuncuAdiDugmesi userId={kazanan.user_id} profil={kazanan.profil} className="m1-ss-isim-metin">{kazanan.profil?.gorunen_ad}</OyuncuAdiDugmesi></div>
                  <div className="m1-ss-taraf-ek">{tt("Şampiyon")}</div>
                </div>
              )}
              <OdulDokumu kaynak={`turnuva:${turnuva.id}`} veri={macSonuOzet.dokum} gorevleriGoster={false} />
              <MacSorulari kaynak={`turnuva:${turnuva.id}`} />
              <YanlisSatiri macTur="turnuva" macId={turnuva.id} onAdet={setTurnuvaYanlis} />
            </>
          }
          rovans={null}
          eylemler={{ onYeniMac: kapat, onAnaSayfa: () => navigate(y()), yeniMacEtiketi: tt("Turnuvalara dön") }}
        >
          {/* Meydandan girilmişse turnuva bitince oraya dönülür */}
          <MeydanaDonus />
        </MacSonuKutlama>
      );
    }
    return (
      <div className="m1-tv">
        {kazanan && (
          <QtKart className="m1-tv-sampiyon">
            <span className="m1-tv-sampiyon-ikon" aria-hidden="true"><QtIkon ad="kupa" boyut={28} /></span>
            <span>
              <span className="qt-kucuk qt-soluk">{tt("Son turnuvanın şampiyonu")}</span>
              {/* Ajan C: ada dokununca oyuncu kartı */}
              <OyuncuAdiDugmesi userId={kazanan.user_id} profil={kazanan.profil} className="m1-tv-sampiyon-ad" style={{ display: "block" }}>{kazanan.profil?.gorunen_ad}</OyuncuAdiDugmesi>
            </span>
          </QtKart>
        )}
        {turnuva?.durum === "bitti" && (
          <>
            {/* Meydandan girilmişse turnuva bitince oraya dönülür */}
            <MeydanaDonus />
            {oyuncular.some((o) => o.user_id === user?.id) && <OdulDokumu kaynak={`turnuva:${turnuva.id}`} />}
            {oyuncular.some((o) => o.user_id === user?.id) && <MacSorulari kaynak={`turnuva:${turnuva.id}`} />}
            <YanlisSatiri macTur="turnuva" macId={turnuva.id} />
          </>
        )}
        <QtKart className="m1-tv-sayim">
          <h1 className="qt-baslik-2">{tt("Sıradaki turnuva")}</h1>
          <Countdown bicim="qt" />
          <BugunKalanTurnuvalar className="m1-tv-kalanlar" />
          {haftalikGiysi?.ad && (
            <QtRozet ton="coin" ikon="hediye">{tt("Bu haftanın ilk 3 ödülü: {ad}", { ad: haftalikGiysi.ad })}</QtRozet>
          )}
          {hataBandi}
          <div className="m1-tv-dugmeler">
            <QtDugme tamGenislik boyut="b" ikon="kupa" onClick={lobiyeKatil}>
              {tt("Lobiye katıl")}
            </QtDugme>
          </div>
        </QtKart>

        <TurnuvaTanitim />
      </div>
    );
  }

  // ---- Lobi ----
  if (turnuva.durum === "lobi") {
    return (
      <div className="m1-tv">
        <QtKart className="m1-tv-sayim">
          <h1 className="qt-baslik-2">{tt("Turnuva lobisi")}</h1>
          <Countdown bicim="qt" onSifir={turnuvaYukle} />
          <BugunKalanTurnuvalar className="m1-tv-kalanlar" />
          {hataBandi}
          <SkillSeti macTur="turnuva" />
          <div className="m1-tv-dugmeler">
            {benimKayit ? (
              <QtDugme tur="ikincil" tamGenislik onClick={lobidenAyril}>
                {tt("Lobiden ayrıl")}
              </QtDugme>
            ) : (
              <QtDugme tamGenislik boyut="b" ikon="kupa" onClick={lobiyeKatil}>
                {tt("Lobiye katıl")}
              </QtDugme>
            )}
          </div>
        </QtKart>
        <section className="m1-tv-lobi">
          {kartOyuncu && (
            <OyuncuKarti
              userId={kartOyuncu.id}
              onIzleme={kartOyuncu}
              onKapat={() => setKartOyuncu(null)}
              onMeydanOku={kartOyuncu.id === user.id ? undefined : meydanOku}
              onMesaj={kartOyuncu.id !== user.id && arkadaslik.arkadasMi(kartOyuncu.id)
                ? (id) => { setKartOyuncu(null); navigate(y(`/mesajlar/${id}`)); } : undefined}
              onArkadasEkle={kartOyuncu.id !== user.id && !arkadaslik.arkadasMi(kartOyuncu.id)
                && !arkadaslik.istekVar(kartOyuncu.id) ? arkadaslik.arkadasEkle : undefined}
              bilgiNotu={kartOyuncu.id !== user.id && arkadaslik.istekVar(kartOyuncu.id)
                ? tt("Arkadaşlık isteği bekliyor.") : null}
            />
          )}
          <div className="m1-tv-lobi-ust">
            <h2 className="qt-baslik-2">{tt("Lobideki oyuncular")}</h2>
            <QtRozet ton="mor" boyut="k" ikon="kisiler">
              {suzuluyor ? `${suzulmusOyuncular.length}/${oyuncular.length}` : oyuncular.length}
            </QtRozet>
          </div>

          {/* Paket 26 F — süzgeçler. Sunucuya gitmez: yukarıda çekilmiş listeyi süzer. */}
          {oyuncular.length > 0 && (
            <>
              <QtSekmeler
                etiket={tt("Lobi süzgeci")}
                aktif={suzgec}
                onSec={setSuzgec}
                sekmeler={[
                  { kod: "hepsi", ad: tt("Tümü") },
                  { kod: "arkadas", ad: tt("Arkadaşlarım") },
                  { kod: "lig", ad: tt("Kendi ligim") },
                ]}
              />
              <input
                type="text"
                inputMode="search"
                className="m1-tv-ara"
                value={arama}
                onChange={(e) => setArama(e.target.value)}
                placeholder={tt("Ada göre ara")}
                aria-label={tt("Lobideki oyuncular arasında ada göre ara")}
              />
            </>
          )}

          {oyuncular.length > 0 && suzulmusOyuncular.length === 0 && (
            <QtBosDurum
              ikon="arama"
              metin={suzgec === "arkadas"
                ? tt("Lobide arkadaşın yok. Turnuva herkese açık — yine de katılabilirsin.")
                : suzgec === "lig"
                  ? tt("Lobide kendi liginden kimse yok.")
                  : tt("Bu isimde bir oyuncu yok.")}
            />
          )}

          {oyuncular.length === 0 && (
            <QtBosDurum ikon="kisiler" metin={tt("Lobi henüz boş — ilk katılan sen ol, turnuva başlayınca haber veririz.")} />
          )}
          {/* Satıra dokunmak oyuncu kartını açar; kılıç düğmesi ayrı KARDEŞ düğme
              (Paket 43 B: düğme içinde düğme geçersiz HTML). */}
          {suzulmusOyuncular.length > 0 && (
            <QtListe etiket={tt("Lobideki oyuncular")}>
              {suzulmusOyuncular.map((o) => (
                <QtListeSatiri
                  key={o.user_id}
                  vurgulu={o.user_id === user.id}
                  bas={
                    <button
                      type="button"
                      className="m1-tv-oyuncu-ac"
                      onClick={() => setKartOyuncu({ id: o.user_id, ...(o.profil ?? {}) })}
                      aria-label={tt("{0} — kartını aç", { 0: o.profil?.gorunen_ad ?? tt("Oyuncu") })}
                    >
                      <AvatarCerceve profile={o.profil} boyut={36} userId={o.user_id} />
                    </button>
                  }
                  baslik={
                    <OyuncuAdiDugmesi userId={o.user_id} profil={o.profil}
                                      onAc={() => setKartOyuncu({ id: o.user_id, ...(o.profil ?? {}) })}>
                      {o.profil?.gorunen_ad}
                    </OyuncuAdiDugmesi>
                  }
                  sag={o.user_id !== user.id ? (
                    <QtIkonDugme
                      ikon="kilic"
                      tur="mor"
                      etiket={tt("{0} oyuncusuna meydan oku", { 0: o.profil?.gorunen_ad ?? tt("Oyuncu") })}
                      onClick={(e) => { e.stopPropagation(); meydanOku(o.user_id); }}
                    />
                  ) : null}
                />
              ))}
            </QtListe>
          )}
        </section>
      </div>
    );
  }

  // ---- Aktif turnuva ----
  const elendim = benimKayit?.elendi;
  const izleyiciyim = !benimKayit;
  const toplamSoru = turnuva.soru_ids?.length ?? null;

  return (
    <div className="qt-sahne-mac m1-mac">
      <h1 className="qt-gizli">{tt("Turnuva")}</h1>
      {/* Paket 41 B/E/H: Klasik ile aynı çıkış (X), mod rozeti ve ses */}
      {/* Paket 43 C: hâlâ yarışan oyuncu için çıkış onaylı; elenmiş oyuncu / izleyici doğrudan çıkar.
          Vazgeç'te maç duraklamaz — soru sayacı sunucu saatinden akmaya devam eder. */}
      <MacUstSerit
        onCik={() => (!elendim && !izleyiciyim ? setCikisOnay(true) : navigate(y()))}
        rozet={soru?.altin ? tt("Turnuva · altın soru") : tt("Turnuva")}
        oyuncu={{ id: profile?.id, ad: profile?.gorunen_ad ?? tt("Sen"), avatar: (profile?.gorunen_avatar ?? profile?.avatar_url) || null, level: profile?.level, lig: profile?.lig }}
        sayi={oyuncular.length ? tt("{k}/{t} oyuncu kaldı", { k: hayatta.length, t: oyuncular.length }) : null}
      />
      <QtModal
        acik={cikisOnay}
        onKapat={() => setCikisOnay(false)}
        baslik={tt("Çıkarsan turnuvadan elenirsin ve ödül alamazsın.")}
        aciklama={tt("Çıkmak istiyor musun?")}
        altlik={
          <div className="m1-sat-dugmeler">
            {/* Ida (24 Eyl): "Oyunda kal" vurgulu ve varsayılan odak · "Çık" */}
            <QtDugme onClick={() => setCikisOnay(false)} data-qt-ilk-odak>{tt("Oyunda kal")}</QtDugme>
            <QtDugme tur="tehlike" onClick={async () => {
              setCikisOnay(false);
              // A.1 terk kuralı: yarışırken çıkan terk eder — katılım dahil ödül almaz (turnuva_terk, 460).
              try {
                const { error } = await supabase.rpc("turnuva_terk", { p_tournament_id: turnuva.id });
                if (error) throw error;
                setTerkEttim(true);
              } catch (e) {
                console.error("[Bildim] turnuvadan çıkılamadı:", e);
                navigate(y());
              }
            }}>
              {tt("Çık")}
            </QtDugme>
          </div>
        }
      />
      {/* ALTIN SORU: sorular bitti, hayatta kalanlar eşit. Eleme turnuvası
          berabere bitemez — biri kazanana kadar yeni soru gelir. */}
      {soru?.altin ? (
        <div className="m1-tv-canli" role="status">
          <QtRozet ton="coin" ikon="yildiz">{tt("Altın soru")}</QtRozet>
          {tt("{n} oyuncu başa baş — biri bilene kadar sürer", { n: hayatta.length })}
        </div>
      ) : (
        <div className="m1-tv-canli" role="status">
          <span className="m1-tv-nokta" aria-hidden="true" />
          {tt("Canlı · {n} oyuncu hayatta", { n: hayatta.length })}
        </div>
      )}

      {elendim && (
        <div className="m1-bant"><QtIkon ad="bilgi" boyut={18} /><span>{tt("Elendin. Kalan oyuncuları izlemeye devam edebilirsin.")}</span></div>
      )}
      {izleyiciyim && (
        <div className="m1-bant m1-bant--bilgi"><QtIkon ad="bilgi" boyut={18} /><span>{tt("İzleyici modundasın.")}</span></div>
      )}

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
            <QtDugme onClick={() => { setSoruHatasi(false); setSoruDeneme((n) => n + 1); }}>
              {tt("Tekrar dene")}
            </QtDugme>
          }
        />
      )}

      {soru && !elendim && !izleyiciyim ? (
        <QuestionCard
          // Key gösterilen soruya bağlı (Paket 14, 5.2)
          key={`${turnuva.id}-${soru.soru_index ?? turnuva.aktif_soru}`}
          className={soru.altin ? "m1-soru--altin" : ""}
          soru={soru}
          onCevapla={cevapla}
          onSureDoldu={sureDoldu}
          macTur="turnuva"
          macId={turnuva.id}
          toplamSoru={soru.altin ? null : toplamSoru}
        />
      ) : (
        soru && (
          <div className="m1-tv-izle">
            <QtSoruKarti
              key={soru.soru_index ?? turnuva.aktif_soru}
              metin={soru.soru}
              sira={toplamSoru && !soru.altin ? tt("Soru {n} / {t}", { n: (soru.soru_index ?? turnuva.aktif_soru) + 1, t: toplamSoru }) : null}
              sayac={<IzleyiciSayac key={soru.soru_index ?? turnuva.aktif_soru} soru={soru} />}
            />
            <p className="m1-bekleme">{tt("Oyuncular cevaplıyor…")}</p>
          </div>
        )
      )}

      <div className="m1-alt">
        <h2 className="m1-tv-canli">{tt("Hayatta kalanlar")}</h2>
        <div className="m1-tv-hayatta">
          {hayatta.map((o) => (
            // Ajan C: rozetin tamamı ada dokunma alanı (ad çeviri kalıbının içinde)
            <OyuncuAdiDugmesi key={o.user_id} userId={o.user_id} profil={o.profil}>
              <QtRozet ton={o.user_id === user.id ? "vurgu" : "notr"} boyut="k">
                {tt("{ad} · {n} doğru", { ad: o.profil?.gorunen_ad ?? tt("Oyuncu"), n: o.dogru_sayisi ?? 0 })}
              </QtRozet>
            </OyuncuAdiDugmesi>
          ))}
        </div>
      </div>
    </div>
  );
}
