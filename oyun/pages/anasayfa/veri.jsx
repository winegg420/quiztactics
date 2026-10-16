// ============================================================
// ANA SAYFA — ORTAK VERİ + OYUN BAŞLATMA
//
// Kök rota seçenek A'dır (AnaSayfaA.jsx, 23 Eyl 2026). B/C dosyaları ve eski
// pages/Home.jsx duruyor ama hiçbir rota çağırmıyor; veri eski ana sayfayla
// AYNI kaynaklardan gelir.
//
// Yalnız bugün sistemde gerçekten olan veri: profil (avatar, level/XP, rütbe,
// coin, seri), lig (kademe + grup sırası), günlük görevler, meydan okumalar
// (kabul edilen / sırası sende / gönderdiğin / sana gelen davetler), turnuva
// (canlı mı, sıradaki lobi ve anı, lobidekiler, ödül ve lobi açılış ayarı),
// Hatalarım bankası.
// ============================================================
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase, onYuklemeOzeti } from "../../../src/lib/supabase.js";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import { rutbeBul } from "../../lib/ranks.js";
import { siradakiLobi, turnuvaAniMs } from "../../lib/zaman.js";
import { rpcDene } from "../../lib/rpcDene.js";
import { ligGrubumOzet } from "../../lib/lig.js";
import { ayar, ayarlar } from "../../lib/ayarlar.js";
import { duelloKurallari } from "../../lib/duelloKurallari.js";
import { useKategoriTercih } from "../../lib/kategoriTercih.js";
import { hataMesaji } from "../../lib/hata.js";
import { y } from "../../lib/yol.js";
import { tt } from "../../lib/dil.js";
// Tembel RakipAra + ModSecimPenceresi'nin stilleri ana CSS'te, eski sırasıyla kalır (tembel parçada
// global stillerin arkasına düşüp onları ezerlerdi). Sıra eski import sırasıdır: RakipAra, YarimMac, ModSecim.
import "../../tasarim/arka-plan/arka-plan.css";
import "../../tasarim/arka-plan/arka-plan-tam.css";
import "../../tasarim/arka-plan/arka-plan-yeni.css";
import "../../tasarim/ekranlar/lig-amblemi.css";
import "../../tasarim/ekranlar/a-arama-sahnesi.css";
import YarimMacPenceresi from "../../components/YarimMac.jsx";
import "../../tasarim/ekranlar/a-modlar.css";
import "../../tasarim/ekranlar/a-ortak.css";
import "../../tasarim/ekranlar/a-kategori-secici.css";
import "../../tasarim/ekranlar/skill-rozet.css";
import { tembelYukle, bostaOnYukle, onYukleAdla } from "../../../src/lib/tembelYukle.js";
import { gorunenAd } from "../../lib/oyuncu.js";
import { sonModuYaz, sonModuOku } from "../../lib/sonMod.js";
import { sonBilinenOku, sonBilinenYaz } from "../../lib/sonBilinen.js";
import { oyuncuKarti, oyuncuKartiOnbellek } from "../../lib/cerceve.js";
import { ilkCizimdenSonra, ilkCizimdenSonraBekle } from "../../lib/ilkCizimdenSonra.js";

// Arama ekranı + mod penceresi dokununca açılır: ilk yük paketinde taşınmaz, açılıştan sonra boşta
// önceden iner (8 Eki 2026, soğuk açılış).
const RakipAra = tembelYukle(() => import("../../components/RakipAra.jsx"));
const ModSecimPenceresi = tembelYukle(() => import("../../components/ModSecimPenceresi.jsx"));
bostaOnYukle([RakipAra, ModSecimPenceresi]);

// Açılışta iki kanca (maç listesi + devam eden maçlar) aynı satırları okuyordu (matches ×2, tournaments ×2).
// Eşzamanlı ya da 1,5 sn içindeki aynı okuma TEK isteği paylaşır (yalnız bu sayfanın modülünde; sonuç değiştirilmez).
const PAYLASIM_MS = 1500;
const paylasim = new Map();
function paylasimliOku(anahtar, sorgu) {
  const k = paylasim.get(anahtar);
  if (k && (!k.bitti || Date.now() - k.bitti < PAYLASIM_MS)) return k.soz;
  const yeni = { bitti: 0, soz: null };
  yeni.soz = Promise.resolve().then(sorgu).finally(() => { yeni.bitti = Date.now(); });
  paylasim.set(anahtar, yeni);
  return yeni.soz;
}
// 1109 (15 Eki 2026, yavaş telefon paketi 2): ilk açılışta bu okumalar index.html ön yüklemesinin 'devam' özetinden
// gelir (JS inerken, ilk istek turunda; satırlar istemcinin RLS altında okuduğuyla aynı). Her anahtar YALNIZ ilk okumada
// kullanılır — Realtime/odak yenilemeleri ağa gider. Özet yoksa/eskiyse/hatalıysa undefined → eski ağ okuması.
const ozetKullanilan = new Set();
async function ozettenAl(uid, ad, anahtar = ad) {
  if (!uid || ozetKullanilan.has(ad)) return undefined;
  ozetKullanilan.add(ad);
  const o = await onYuklemeOzeti("devam", uid);
  return o && o[anahtar] != null ? o[anahtar] : undefined;
}

/** Aktif Klasik/Saf Bilgi maçlarım: maç listesi (sıra sende / kabuller) ve "Devam et" kartı aynı satırları kullanır. */
const aktifMaclarim = (uid) => paylasimliOku(`maclar:${uid}`, async () => {
  const on = await ozettenAl(uid, "maclar");
  if (Array.isArray(on)) return { data: on, error: null };
  return supabase.from("matches")
    .select(`id, oyuncu1, oyuncu2, oyuncu1_soru, oyuncu2_soru, soru_ids, kabul_at, aktif_soru, jokersiz,
             p1:profiles!matches_oyuncu1_fkey(gorunen_ad, gorunen_avatar, acik_bot),
             p2:profiles!matches_oyuncu2_fkey(gorunen_ad, gorunen_avatar, acik_bot)`)
    .eq("durum", "aktif").or(`oyuncu1.eq.${uid},oyuncu2.eq.${uid}`).limit(20);
});
/** Canlı + lobi turnuvaları: turnuva şeridi ve "Devam et" kartı (yalnız aktif olanlar) aynı okumayı kullanır.
 *  `ozet: true` → satırlar ön yükleme özetinden; o zaman aynı özetin turnuva_benim / lobi_sayilari'si de tutarlıdır. */
const aktifTurnuvalar = (uid) => paylasimliOku("turnuvalar", async () => {
  const on = await ozettenAl(uid, "turnuvalar");
  if (Array.isArray(on)) return { data: on, error: null, ozet: true };
  return supabase.from("tournaments")
    .select("id, durum, tarih, seans").in("durum", ["aktif", "lobi"]).limit(20);
});

// gorevYukle=false: eski get_daily_quests okunmaz (AnaSayfaA görevleri /gorevler'den alır).
// bakiye: coin bakiyesini gösteren seçenek (B/C) kendi useCoin'inden verir; A bakiyeyi göstermez (üst çubuk hapı
// zaten okur) → A'da ikinci coin_bakiyem isteği atılmaz.
export function useAnaSayfaVerisi({ gorevYukle = true, bakiye = null } = {}) {
  const { user, profile, refreshProfile } = useAuth();
  const uid = user?.id;
  const [gorevler, setGorevler] = useState([]);
  // 12 Eki 2026 (soğuk açılış): lig özeti son bilinen kopyayla başlar; ligHazir = özet BİLİNİYOR (okundu / hata / kopya var).
  // Bilinmezken lig kartı ve oyuncu kartı iskelet kalır — Altın Ligdeki oyuncuya "lige katıl" kartı bir an bile çizilmez.
  const [ilkLig] = useState(() => (uid && uid === user?.id ? sonBilinenOku("lig_ozet") : undefined));
  const [ligOzet, setLigOzet] = useState(ilkLig ?? null);
  const [lig, setLig] = useState(ilkLig ? { lig: ilkLig.lig, sira: ilkLig.sira ?? null, yukselen: ilkLig.yukselen } : null);
  const [ligHazir, setLigHazir] = useState(ilkLig !== undefined);
  // Kendi oyuncu kartım (çerçeve): bellekte/son bilinende varsa hazır; yoksa okunana kadar oyuncu kartı iskelet (çerçevesiz kare yok)
  const [kartHazir, setKartHazir] = useState(() => Boolean(uid) && oyuncuKartiOnbellek(uid) !== undefined);
  const [banka, setBanka] = useState(0);
  const [kabuller, setKabuller] = useState([]);
  const [siraSende, setSiraSende] = useState([]);
  const [davetlerim, setDavetlerim] = useState([]);
  const [turnuva, setTurnuva] = useState({ canli: false, lobiId: null, lobiSayisi: 0, lobide: false, yuklendi: false });
  // Bana gelen ve cevap bekleyen meydan okumalar (Klasik + Düello davetleri).
  const [davetSayisi, setDavetSayisi] = useState(0);
  // Turnuva şeridi rakamları oyun_ayarlari'ndan: ödüller ve lobinin "açık" sayıldığı dakika.
  const [turnuvaAyar, setTurnuvaAyar] = useState({ oduller: [], lobiAcilisDk: null });
  const [mesaj, setMesaj] = useState(null);

  const gorevleriYukle = useCallback(() => {
    if (!gorevYukle) return;
    rpcDene("get_daily_quests").then(({ data }) => setGorevler(data ?? []));
  }, [gorevYukle]);
  useEffect(() => { gorevleriYukle(); }, [gorevleriYukle]);

  useEffect(() => {
    if (!uid) return undefined;
    let aktif = true;
    (async () => {
      // Canlı lig kartı: lig_grubum_ozet (ligim, sıram, üstümdeki 2 + altımdaki 2, sınırlar, farklar).
      // Grup yoksa (yeni oyuncu) null → kart "lige katıl" hâline iner.
      try {
        const o = await ligGrubumOzet();
        if (aktif) {
          setLigOzet(o);
          setLig(o ? { lig: o.lig, sira: o.sira ?? null, yukselen: o.yukselen } : null);
          sonBilinenYaz("lig_ozet", o ?? null);
        }
      } catch (e) {
        console.warn("[Ana sayfa] lig_grubum_ozet:", e?.message ?? e);
      }
      if (aktif) setLigHazir(true);   // hata da "bilinen" sayılır: iskelet takılı kalmaz (son bilinen varsa o durur)
    })();
    return () => { aktif = false; };
  }, [uid]);

  // Paket A/2: yanlış bankası yalnız bir kart rozeti — ilk çizimden sonra, boşta okunur.
  useEffect(() => {
    if (!uid) return undefined;
    let aktif = true;
    const iptal = ilkCizimdenSonra(async () => {
      try {
        const { data, error } = await supabase.rpc("yanlis_bankam");
        if (error) throw error;
        if (aktif) setBanka((data ?? [])[0]?.bekleyen ?? 0);
      } catch (e) {
        console.warn("[Ana sayfa seçenek] yanlis_bankam:", e?.message ?? e);
      }
    });
    return () => { aktif = false; iptal(); };
  }, [uid]);

  useEffect(() => {
    if (!uid || kartHazir) return undefined;
    let aktif = true;
    oyuncuKarti(uid).catch(() => null).finally(() => { if (aktif) setKartHazir(true); });
    return () => { aktif = false; };
  }, [uid, kartHazir]);

  // Kurulumda avatar/takma ad sonradan seçilir; lig kartındaki "Sen" satırı sunucudan eski hâliyle gelmişti.
  const kimlikRef = useRef(null);
  const kimlik = profile ? `${profile.gorunen_avatar ?? ""}|${profile.gorunen_ad ?? ""}` : null;
  useEffect(() => {
    if (!uid || kimlik === null) return undefined;
    const onceki = kimlikRef.current;
    kimlikRef.current = kimlik;
    if (onceki === null || onceki === kimlik) return undefined;
    let aktif = true;
    ligGrubumOzet().then((o) => {
      if (aktif && o) { setLigOzet(o); sonBilinenYaz("lig_ozet", o); }
    }).catch((e) => console.warn("[Ana sayfa] lig_grubum_ozet yenileme:", e?.message ?? e));
    return () => { aktif = false; };
  }, [uid, kimlik]);

  const turnuvaYukle = useCallback(async () => {
    if (!uid) return;
    let tlar = [];
    let ozettenTur = false;
    try {
      const { data, error, ozet } = await aktifTurnuvalar(uid);
      if (error) throw error;
      tlar = data ?? [];
      ozettenTur = ozet === true;
    } catch (e) {
      console.warn("[Ana sayfa seçenek] turnuvalar:", e?.message ?? e);
    }
    const canli = tlar.some((t) => t.durum === "aktif");
    const lobi = siradakiLobi(tlar);
    let lobiSayisi = 0;
    let lobide = false;
    // 1109: lobi sayısı + "ben lobide miyim" aynı özetten (turnuvalar da özetten geldiyse — aynı an)
    const sayilar = lobi && ozettenTur ? await ozettenAl(uid, "lobi_sayilari") : undefined;
    const benim = lobi && ozettenTur ? await ozettenAl(uid, "turnuva_benim:lobi", "turnuva_benim") : undefined;
    if (lobi && sayilar && Array.isArray(benim) && lobi.id in sayilar) {
      lobiSayisi = Number(sayilar[lobi.id]) || 0;
      lobide = benim.some((o) => o.tournament_id === lobi.id);
    } else if (lobi) {
      try {
        const { data, count, error } = await supabase.from("tournament_players")
          .select("user_id", { count: "exact" }).eq("tournament_id", lobi.id);
        if (error) throw error;
        lobiSayisi = count ?? 0;
        lobide = (data ?? []).some((o) => o.user_id === uid);
      } catch (e) {
        console.warn("[Ana sayfa seçenek] lobi:", e?.message ?? e);
      }
    }
    setTurnuva({ canli, lobiId: lobi?.id ?? null, lobiAn: lobi ? turnuvaAniMs(lobi.tarih, lobi.seans) : null,
               lobiSayisi, lobide, yuklendi: true });
  }, [uid]);
  useEffect(() => { turnuvaYukle(); }, [turnuvaYukle]);

  useEffect(() => {
    let aktif = true;
    ayarlar().then((o) => {
      if (!aktif) return;
      const sayi = (x) => (Number.isFinite(Number(x)) ? Number(x) : null);
      setTurnuvaAyar({
        oduller: [o?.coin_turnuva_1, o?.coin_turnuva_2, o?.coin_turnuva_3].map(sayi).filter((x) => x !== null),
        lobiAcilisDk: sayi(o?.turnuva_lobi_acilis_dk),
      });
    }).catch((e) => console.warn("[Ana sayfa] ayarlar:", e?.message ?? e));
    return () => { aktif = false; };
  }, []);

  // secenek.ertele (yalnız ilk açılış): davet rozetleri ilk çizimden sonra okunur (Paket A/2).
  // Realtime olay yükü de buraya gelir; onda ertele yok → hemen.
  const siraYukle = useCallback(async (secenek) => {
    if (!uid) return;
    try {
      const { data, error } = await aktifMaclarim(uid);
      if (error) throw error;
      const benim = (data ?? []).map((m) => {
        const p1 = m.oyuncu1 === uid;
        const rakip = p1 ? m.p2 : m.p1;
        return { ...m, benimSoru: (p1 ? m.oyuncu1_soru : m.oyuncu2_soru) ?? 0,
                 rakipAd: rakip?.gorunen_ad, rakipAvatar: rakip?.gorunen_avatar, rakipBot: Boolean(rakip?.acik_bot),
                 rakipId: p1 ? m.oyuncu2 : m.oyuncu1 };   // 1049: etkinlik satırında çerçeveli avatar (oyuncu kartı)
      }).filter((m) => m.benimSoru < (m.soru_ids?.length ?? 20));
      const yeni = benim.filter((m) => m.kabul_at && m.benimSoru === 0 && !m.rakipBot);
      const yeniId = new Set(yeni.map((m) => m.id));
      setKabuller(yeni);
      setSiraSende(benim.filter((m) => !yeniId.has(m.id)));
    } catch (e) {
      console.warn("[Ana sayfa seçenek] maç listesi:", e?.message ?? e);
    }
    if (secenek?.ertele === true) await ilkCizimdenSonraBekle();
    try {
      const { data, error } = await supabase.rpc("gonderdigim_davetler");
      if (error) throw error;
      setDavetlerim(data ?? []);
    } catch (e) {
      console.warn("[Ana sayfa seçenek] gonderdigim_davetler:", e?.message ?? e);
    }
    // Gelen davetler: Meydan Okumalar sayfasındaki "Sana gelen davetler" ile aynı kaynak.
    // 1109: ilk açılışta üç sayım ön yükleme özetinden (aynı süzgeç: bekliyor, Hazine'de son 24 saat, en çok 50'şer).
    const gd = await ozettenAl(uid, "gelen_davet");
    if (gd && typeof gd === "object") {
      setDavetSayisi((Number(gd.mac) || 0) + (Number(gd.duello) || 0) + (Number(gd.kasa) || 0));
      return;
    }
    try {
      const [mac, duello, kasa] = await Promise.all([
        supabase.from("matches").select("id").eq("oyuncu2", uid).eq("durum", "bekliyor").limit(50),
        supabase.from("duello_davetleri").select("id").eq("rakip", uid).eq("durum", "bekliyor").limit(50),
        // 957: Kasa davetleri de Meydan sayfasında listelenir (24 saatten eskisi geçersiz)
        supabase.from("kasa_davetleri").select("id").eq("rakip", uid).eq("durum", "bekliyor")
          .gt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()).limit(50),
      ]);
      if (mac.error) throw mac.error;
      if (duello.error) throw duello.error;
      setDavetSayisi((mac.data?.length ?? 0) + (duello.data?.length ?? 0) + (kasa.error ? 0 : kasa.data?.length ?? 0));
    } catch (e) {
      console.warn("[Ana sayfa] gelen davetler:", e?.message ?? e);
    }
  }, [uid]);
  useEffect(() => {
    siraYukle({ ertele: true });
    // Ana sayfayla aynı: maç satırı değişince liste tazelenir (ayrı kanal adı).
    // Aşama 2: yalnız benim maçlarım (süzgeç tek kolon alır → iki dinleyici)
    if (!uid) return undefined;
    const kanal = supabase.channel("secenek-sira")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `oyuncu1=eq.${uid}` }, siraYukle)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `oyuncu2=eq.${uid}` }, siraYukle)
      .subscribe();
    return () => { supabase.removeChannel(kanal); };
  }, [siraYukle, uid]);

  const odulAl = async (id) => {
    try {
      const { error } = await supabase.rpc("claim_quest", { p_quest_id: id });
      if (error) throw error;
      gorevleriYukle();
      refreshProfile?.(uid);
    } catch (e) {
      setMesaj(hataMesaji(e));
    }
  };

  const lobiyeKatil = async () => {
    setMesaj(null);
    try {
      const { error } = await supabase.rpc("join_tournament_lobby");
      if (error) throw error;
      setTurnuva((t) => ({ ...t, lobide: true, lobiSayisi: t.lobiSayisi + 1 }));
      return true;
    } catch (e) {
      setMesaj(hataMesaji(e));
      return false;
    }
  };

  const level = Number(profile?.level) || 1;
  const oyuncu = useMemo(() => ({
    ad: gorunenAd(profile?.gorunen_ad),
    level,
    xp: Math.max(0, Number(profile?.level_xp) || 0),
    xpGereken: Number(profile?.level_gereken) || 0,
    rutbe: rutbeBul(level),
    coin: Number(bakiye ?? profile?.coin) || 0,
  }), [profile, level, bakiye]);

  const bekleyenOdul = gorevler.filter((g) => g.ilerleme >= g.hedef && !g.alindi).length;

  return { user, profile, oyuncu, gorevler, bekleyenOdul, odulAl, lig, ligOzet, ligHazir, kartHazir, banka, kabuller, siraSende,
           davetlerim, davetSayisi, turnuva, turnuvaYukle, turnuvaAyar, lobiyeKatil, mesaj, setMesaj };
}

/**
 * Oyun başlatma: ana sayfadaki "Rakip bul" akışının aynısı (mod seçimi → yarım maç
 * sorusu → rakip arama). `oyna()` mod penceresini açar; `katmanlar` sayfada çizilir.
 */
export function useOyunBaslat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dereceliTercih = true;   // 1115 (16 Eki 2026): bütün maçlar dereceli — seçim kalktı
  // 860: Klasik / Saf Bilgi maç kategorisi (null = Karışık); son seçim hatırlanır.
  const [kategoriTercih, setKategoriTercih] = useKategoriTercih();
  const [modAcik, setModAcik] = useState(false);   // false | "hepsi" | "saf"
  const [arama, setArama] = useState(null);      // { dereceli, jokersiz, kategori, bilgi? }
  const [yarim, setYarim] = useState(null);

  // 410 (Ajan I): eşleştirme maçında rakip kapıya bağlanamadı → sunucu maçı cezasız iptal etti,
  // MatchPage buraya { yenidenAra } ile döndü. Arama aynı türle, kısa bilgiyle kendiliğinden başlar.
  const location = useLocation();
  const yenidenAra = location.state?.yenidenAra ?? null;
  useEffect(() => {
    if (!yenidenAra) return;
    setArama({ dereceli: yenidenAra.dereceli !== false, jokersiz: Boolean(yenidenAra.jokersiz),
               kategori: yenidenAra.kategori ?? null,   // iptal edilen maçın kategorisiyle yeniden ara
               bilgi: tt("Rakip bağlanamadı, yeni rakip aranıyor") });
    // Durum bir kez tüketilir: geri/yenile aramayı yeniden başlatmasın.
    navigate(location.pathname, { replace: true, state: null });
  }, [yenidenAra]); // eslint-disable-line react-hooks/exhaustive-deps

  const hemenOyna = async (dereceli, jokersiz) => {
    try {
      const { data, error } = await supabase.from("matches")
        .select(`id, oyuncu1, oyuncu2, aktif_soru, soru_ids,
                 p1:profiles!matches_oyuncu1_fkey(gorunen_ad), p2:profiles!matches_oyuncu2_fkey(gorunen_ad)`)
        .eq("durum", "aktif").or(`oyuncu1.eq.${user.id},oyuncu2.eq.${user.id}`).limit(1);
      if (error) throw error;
      const m = data?.[0];
      if (m) {
        const toplam = m.soru_ids?.length ?? 0;
        setYarim({ id: m.id, rakipAd: (m.oyuncu1 === user.id ? m.p2 : m.p1)?.gorunen_ad ?? null,
                   soru: Math.min(toplam, (m.aktif_soru ?? 0) + 1), toplam, dereceli, jokersiz });
        return;
      }
    } catch (e) {
      console.warn("[Ana sayfa seçenek] yarım maç kontrolü:", e?.message ?? e);
    }
    setArama({ dereceli, jokersiz, kategori: kategoriTercih });
  };

  // Suspense: tembel pencere inerken sayfanın kendisi (Layout'un Suspense'i) yükleyiciye dönmesin.
  const katmanlar = (
    <Suspense fallback={null}>
      {yarim && (
        <YarimMacPenceresi mac={yarim}
          onDevam={() => { const id = yarim.id; setYarim(null); navigate(y(`/mac/${id}`)); }}
          onYeni={() => { const { dereceli, jokersiz } = yarim; setYarim(null); setArama({ dereceli, jokersiz, kategori: kategoriTercih }); }}
          onKapat={() => setYarim(null)} />
      )}
      {modAcik && (
        <ModSecimPenceresi profil={null} alttan baslik={tt("Nasıl oynamak istersin?")} bekleMetni={tt("Rakip aranıyor…")}
          dereceli={dereceliTercih}
          kategori={kategoriTercih} onKategori={setKategoriTercih}
          modlar={modAcik === "saf" ? ["saf"] : undefined}
          onSec={async (mod) => {
            setModAcik(false);
            if (mod === "duello") { sonModuYaz("duello"); navigate(y("/duello")); return null; }
            if (mod === "kasa") { sonModuYaz("kasa"); navigate(y("/kasa")); return null; }   // 957: Kasa girişi (arama orada)
            if (mod !== "saf") sonModuYaz("klasik");
            await hemenOyna(dereceliTercih, mod === "saf");
            return null;
          }}
          onKapat={() => setModAcik(false)} />
      )}
      {arama && (
        <RakipAra kategori={arama.kategori ?? null} dereceli={arama.dereceli} jokersiz={arama.jokersiz}
          bilgi={arama.bilgi ?? null}
          onBulundu={(macId) => { setArama(null); navigate(y(`/mac/${macId}`)); }}
          onIptal={() => setArama(null)} />
      )}
    </Suspense>
  );

  // 15 Eki 2026 (perf 2): Klasik/Saf Bilgi maç sayfası paketi mod penceresi açılır açılmaz iner (boşta indirme henüz
  // başlamadıysa) — eşleşme anında ağ beklenmez. Sessiz/korumalı yol: src/lib/tembelYukle.js › onYukleAdla.
  return {
    oyna: () => { onYukleAdla("mac"); setModAcik("hepsi"); },
    // Saf Bilgi kısayolu da aynı pencereden geçer: tür her seferinde görünür, sessizce başlamaz.
    safBilgi: () => { onYukleAdla("mac"); setModAcik("saf"); },
    git: (yol) => navigate(y(yol)),
    katmanlar,
  };
}

/**
 * Ana sayfa açılır açılmaz (Oyna'ya basmadan) bütün modlardaki devam eden maçları toplar:
 * Klasik/Saf Bilgi (`matches`), Düello (`duellolar` — tablo istemciye kapalı, dar okuma RPC'si
 * `duello_aktif_benim`), Grup (`group_matches`), Turnuva (`tournament_players` + `tournaments`).
 * Sekme arka plandan öne gelince (kısa süreliğine çıkıp dönme senaryosu) yeniden okur.
 */
export function useDevamEdenMaclar() {
  const { user } = useAuth();
  const uid = user?.id;
  const [liste, setListe] = useState([]);

  const yukle = useCallback(async () => {
    if (!uid) { setListe([]); return; }
    // Paket A/2: bölümler PARALEL okunur (eskiden 5 tur sırayla); sıra yine Klasik → Düello → Hazine → Grup → Turnuva.
    const bolumler = [];
    const bolum = (is) => { const parca = []; bolumler.push(is(parca).then(() => parca, () => parca)); };

    bolum(async (sonuc) => { try {
      const { data, error } = await aktifMaclarim(uid);
      if (error) throw error;
      for (const m of data ?? []) {
        const benim1 = m.oyuncu1 === uid;
        const rakipAd = (benim1 ? m.p2 : m.p1)?.gorunen_ad ?? null;
        const toplam = m.soru_ids?.length ?? 0;
        sonuc.push({ id: `mac-${m.id}`, mod: m.jokersiz ? "saf" : "klasik", rakipAd,
          alt: tt("Soru {n}/{t}", { n: Math.max(0, m.aktif_soru ?? 0) + 1, t: toplam }),
          yol: `/mac/${m.id}` });
      }
    } catch (e) {
      console.warn("[Ana sayfa] devam eden Klasik/Saf Bilgi maçları:", e?.message ?? e);
    } });

    bolum(async (sonuc) => { try {
      // 1109: ilk açılışta satırlar + rakip adları ön yükleme özetinden (aynı dar RPC; adlar aynı profiles okuması)
      const on = await ozettenAl(uid, "duellolar");
      const onAd = Array.isArray(on) ? await ozettenAl(uid, "rakip_adlar:duello", "rakip_adlar") : undefined;
      const { data: duellolar, error } = Array.isArray(on) ? { data: on, error: null } : await supabase.rpc("duello_aktif_benim");
      if (error) throw error;
      const rakipIdler = (duellolar ?? []).map((d) => (d.oyuncu1 === uid ? d.oyuncu2 : d.oyuncu1));
      let adlar = new Map();
      if (onAd && typeof onAd === "object") {
        adlar = new Map(Object.entries(onAd));
      } else if (rakipIdler.length) {
        const { data: profiller } = await supabase.from("profiles").select("id, gorunen_ad").in("id", rakipIdler);
        adlar = new Map((profiller ?? []).map((p) => [p.id, p.gorunen_ad]));
      }
      const { tur: turSayisi } = await duelloKurallari();   // 960: seçim modunda 20, kapalıysa eski 16
      for (const d of duellolar ?? []) {
        const rakipId = d.oyuncu1 === uid ? d.oyuncu2 : d.oyuncu1;
        sonuc.push({ id: `duello-${d.id}`, mod: "duello", rakipAd: adlar.get(rakipId) ?? null,
          alt: tt("{n}. tur/{t}", { n: d.tur ?? 1, t: turSayisi }), yol: `/duello/${d.id}` });
      }
    } catch (e) {
      console.warn("[Ana sayfa] devam eden Düello:", e?.message ?? e);
    } });

    // KASA (deneysel, 950): ayar satırı yoksa (migration uygulanmamış) ya da mod kapalıysa sorulmaz.
    bolum(async (sonuc) => { try {
      // 15 Eki 2026 (perf): ayar ve kasa_aktif_benim AYNI turda başlar (eskiden ayar inince ikinci bir ağ turu açılıyordu —
      // yavaş 4G'de ana sayfanın son isteği ~0,5 sn geç bitiyordu). Mod kapalıysa sonuç kullanılmaz (dar okuma, boş liste).
      // 1109: ilk açılışta satırlar + rakip adları ön yükleme özetinden.
      const kasaIstek = ozettenAl(uid, "kasalar").then((on) => (Array.isArray(on)
        ? { data: on, error: null, ozet: true }
        : supabase.rpc("kasa_aktif_benim").then((y) => y, (e) => ({ data: null, error: e }))));
      if (Number(await ayar("kasa_modu_acik", 0)) >= 1) {
        const { data: kasalar, error, ozet } = await kasaIstek;
        if (error) throw error;
        const rakipIdler = (kasalar ?? []).map((k) => (k.oyuncu1 === uid ? k.oyuncu2 : k.oyuncu1));
        let adlar = new Map();
        const onAd = ozet ? await ozettenAl(uid, "rakip_adlar:kasa", "rakip_adlar") : undefined;
        if (onAd && typeof onAd === "object") {
          adlar = new Map(Object.entries(onAd));
        } else if (rakipIdler.length) {
          const { data: profiller } = await supabase.from("profiles").select("id, gorunen_ad").in("id", rakipIdler);
          adlar = new Map((profiller ?? []).map((p) => [p.id, p.gorunen_ad]));
        }
        const kasaTur = await ayar("kasa_max_tur", 24);
        for (const k of kasalar ?? []) {
          const rakipId = k.oyuncu1 === uid ? k.oyuncu2 : k.oyuncu1;
          sonuc.push({ id: `kasa-${k.id}`, mod: "kasa", rakipAd: adlar.get(rakipId) ?? null,
            alt: tt("{n}. tur/{t}", { n: Math.max(1, k.tur ?? 1), t: kasaTur }), yol: `/kasa/${k.id}` });
        }
      }
    } catch (e) {
      console.warn("[Ana sayfa] devam eden Kasa:", e?.message ?? e);
    } });

    bolum(async (sonuc) => { try {
      const on = await ozettenAl(uid, "gruplar");   // 1109: ilk açılışta özetten (aynı süzgeç: üyesi olduğum aktif maçlar)
      const { data, error } = Array.isArray(on) ? { data: on, error: null } : await supabase.from("group_matches")
        .select("id, aktif_soru, soru_ids, oyuncu_sayisi").eq("durum", "aktif").limit(20);
      if (error) throw error;
      for (const g of data ?? []) {
        const toplam = g.soru_ids?.length ?? 0;
        sonuc.push({ id: `grup-${g.id}`, mod: "grup", rakipAd: null,
          alt: tt("Soru {n}/{t}", { n: Math.max(0, g.aktif_soru ?? 0) + 1, t: toplam }),
          yol: `/grup-mac/${g.id}` });
      }
    } catch (e) {
      console.warn("[Ana sayfa] devam eden Grup maçları:", e?.message ?? e);
    } });

    bolum(async (sonuc) => { try {
      const { data: turnuvalar, error, ozet } = await aktifTurnuvalar(uid);
      if (error) throw error;
      const ids = (turnuvalar ?? []).filter((t) => t.durum === "aktif").slice(0, 5).map((t) => t.id);
      if (ids.length) {
        // 1109: turnuvalar özetten geldiyse kendi satırlarım da aynı özetten (aynı süzgeç: elenmemiş, bu turnuvalar)
        const on = ozet ? await ozettenAl(uid, "turnuva_benim:aktif", "turnuva_benim") : undefined;
        const { data: oyuncular, error: e2 } = Array.isArray(on)
          ? { data: on.filter((o) => o.elendi === false && ids.includes(o.tournament_id)), error: null }
          : await supabase.from("tournament_players")
            .select("tournament_id, dogru_sayisi").eq("user_id", uid).eq("elendi", false).in("tournament_id", ids);
        if (e2) throw e2;
        for (const o of oyuncular ?? []) {
          sonuc.push({ id: `turnuva-${o.tournament_id}`, mod: "turnuva", rakipAd: null,
            alt: tt("{n} doğru", { n: o.dogru_sayisi ?? 0 }), yol: "/turnuva" });
        }
      }
    } catch (e) {
      console.warn("[Ana sayfa] devam eden Turnuva:", e?.message ?? e);
    } });

    const parcalar = await Promise.all(bolumler);
    setListe(parcalar.flat());
  }, [uid]);

  useEffect(() => {
    yukle();
    // Yük azaltma (2 Eki 2026): Realtime / odak / görünürlük olayları TEK okumaya toplanır — iki okuma
    // arası en az 3 sn, sekme gizliyken okuma yok (görünür olunca bir kez okunur). Eskiden canlı
    // turnuvada HER oyuncunun her cevabı (tournament_players herkese açık) boşta duran bütün ana
    // sayfaları 4–6 sorguyla yeniden okutuyordu; artık yalnız kendi turnuva satırım dinlenir.
    let son = Date.now();
    let zaman = null;
    const tetikle = () => {
      if (zaman || document.visibilityState !== "visible") return;
      zaman = setTimeout(() => { zaman = null; son = Date.now(); yukle(); }, Math.max(250, 3000 - (Date.now() - son)));
    };
    document.addEventListener("visibilitychange", tetikle);
    window.addEventListener("focus", tetikle);
    // Aşama 2: maç yalnız benimkiler (süzgeç tek kolon alır → iki dinleyici). uid yoksa liste de boş.
    // `duellolar` aboneliği kalktı: tablo supabase_realtime yayınında değil ve istemciye kapalı → hiç
    // olay getirmiyordu (düello listesi odak/görünürlük tazelemesiyle güncellenir, eskisi gibi).
    const ben = uid ?? "00000000-0000-0000-0000-000000000000";
    const kanal = supabase.channel("as-devam-eden")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `oyuncu1=eq.${ben}` }, tetikle)
      .on("postgres_changes", { event: "*", schema: "public", table: "matches", filter: `oyuncu2=eq.${ben}` }, tetikle)
      .on("postgres_changes", { event: "*", schema: "public", table: "group_matches" }, tetikle)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_players", ...(uid ? { filter: `user_id=eq.${uid}` } : {}) }, tetikle)
      .subscribe();
    return () => {
      clearTimeout(zaman);
      document.removeEventListener("visibilitychange", tetikle);
      window.removeEventListener("focus", tetikle);
      supabase.removeChannel(kanal);
    };
  }, [yukle, uid]);

  return liste;
}

/* ---------- Son oynanan mod (6 Eki 2026): tek kaynak lib/sonMod.js — maç sayfaları da yazar (11 Eki 2026) ---------- */
export { sonModuYaz, sonModuOku };
