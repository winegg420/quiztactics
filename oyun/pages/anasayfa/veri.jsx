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
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../../src/lib/supabase.js";
import { useAuth } from "../../../src/context/AuthContext.jsx";
import { rutbeBul } from "../../lib/ranks.js";
import { siradakiLobi, turnuvaAniMs } from "../../lib/zaman.js";
import { rpcDene } from "../../lib/rpcDene.js";
import { ligGrubumOzet } from "../../lib/lig.js";
import { ayarlar } from "../../lib/ayarlar.js";
import { useCoin } from "../../lib/coin.js";
import { useDereceliTercih } from "../../lib/dereceli.js";
import { hataMesaji } from "../../lib/hata.js";
import { y } from "../../lib/yol.js";
import { tt } from "../../lib/dil.js";
import RakipAra from "../../components/RakipAra.jsx";
import YarimMacPenceresi from "../../components/YarimMac.jsx";
import ModSecimPenceresi from "../../components/ModSecimPenceresi.jsx";

export function useAnaSayfaVerisi() {
  const { user, profile, refreshProfile } = useAuth();
  const uid = user?.id;
  const [gorevler, setGorevler] = useState([]);
  const [lig, setLig] = useState(null);
  const [ligOzet, setLigOzet] = useState(null);
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
  const { bakiye } = useCoin();

  const gorevleriYukle = useCallback(() => {
    rpcDene("get_daily_quests").then(({ data }) => setGorevler(data ?? []));
  }, []);
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
        }
      } catch (e) {
        console.warn("[Ana sayfa] lig_grubum_ozet:", e?.message ?? e);
      }
      try {
        const { data, error } = await supabase.rpc("yanlis_bankam");
        if (error) throw error;
        if (aktif) setBanka((data ?? [])[0]?.bekleyen ?? 0);
      } catch (e) {
        console.warn("[Ana sayfa seçenek] yanlis_bankam:", e?.message ?? e);
      }
    })();
    return () => { aktif = false; };
  }, [uid]);

  const turnuvaYukle = useCallback(async () => {
    if (!uid) return;
    let tlar = [];
    try {
      const { data, error } = await supabase.from("tournaments").select("id, durum, tarih, seans")
        .in("durum", ["aktif", "lobi"]).limit(20);
      if (error) throw error;
      tlar = data ?? [];
    } catch (e) {
      console.warn("[Ana sayfa seçenek] turnuvalar:", e?.message ?? e);
    }
    const canli = tlar.some((t) => t.durum === "aktif");
    const lobi = siradakiLobi(tlar);
    let lobiSayisi = 0;
    let lobide = false;
    if (lobi) {
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

  const siraYukle = useCallback(async () => {
    if (!uid) return;
    try {
      const { data, error } = await supabase.from("matches")
        .select(`id, oyuncu1, oyuncu2, oyuncu1_soru, oyuncu2_soru, soru_ids, kabul_at,
                 p1:profiles!matches_oyuncu1_fkey(gorunen_ad, gorunen_avatar, acik_bot),
                 p2:profiles!matches_oyuncu2_fkey(gorunen_ad, gorunen_avatar, acik_bot)`)
        .eq("durum", "aktif").or(`oyuncu1.eq.${uid},oyuncu2.eq.${uid}`).limit(20);
      if (error) throw error;
      const benim = (data ?? []).map((m) => {
        const p1 = m.oyuncu1 === uid;
        const rakip = p1 ? m.p2 : m.p1;
        return { ...m, benimSoru: (p1 ? m.oyuncu1_soru : m.oyuncu2_soru) ?? 0,
                 rakipAd: rakip?.gorunen_ad, rakipAvatar: rakip?.gorunen_avatar, rakipBot: Boolean(rakip?.acik_bot) };
      }).filter((m) => m.benimSoru < (m.soru_ids?.length ?? 20));
      const yeni = benim.filter((m) => m.kabul_at && m.benimSoru === 0 && !m.rakipBot);
      const yeniId = new Set(yeni.map((m) => m.id));
      setKabuller(yeni);
      setSiraSende(benim.filter((m) => !yeniId.has(m.id)));
    } catch (e) {
      console.warn("[Ana sayfa seçenek] maç listesi:", e?.message ?? e);
    }
    try {
      const { data, error } = await supabase.rpc("gonderdigim_davetler");
      if (error) throw error;
      setDavetlerim(data ?? []);
    } catch (e) {
      console.warn("[Ana sayfa seçenek] gonderdigim_davetler:", e?.message ?? e);
    }
    // Gelen davetler: Meydan Okumalar sayfasındaki "Sana gelen davetler" ile aynı kaynak.
    try {
      const [mac, duello] = await Promise.all([
        supabase.from("matches").select("id").eq("oyuncu2", uid).eq("durum", "bekliyor").limit(50),
        supabase.from("duello_davetleri").select("id").eq("rakip", uid).eq("durum", "bekliyor").limit(50),
      ]);
      if (mac.error) throw mac.error;
      if (duello.error) throw duello.error;
      setDavetSayisi((mac.data?.length ?? 0) + (duello.data?.length ?? 0));
    } catch (e) {
      console.warn("[Ana sayfa] gelen davetler:", e?.message ?? e);
    }
  }, [uid]);
  useEffect(() => {
    siraYukle();
    // Ana sayfayla aynı: maç satırı değişince liste tazelenir (ayrı kanal adı).
    const kanal = supabase.channel("secenek-sira")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, siraYukle).subscribe();
    return () => { supabase.removeChannel(kanal); };
  }, [siraYukle]);

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
    ad: profile?.gorunen_ad ?? tt("Oyuncu"),
    level,
    xp: Math.max(0, Number(profile?.level_xp) || 0),
    xpGereken: Number(profile?.level_gereken) || 0,
    rutbe: rutbeBul(level),
    coin: Number(bakiye ?? profile?.coin) || 0,
  }), [profile, level, bakiye]);

  const bekleyenOdul = gorevler.filter((g) => g.ilerleme >= g.hedef && !g.alindi).length;

  return { user, profile, oyuncu, gorevler, bekleyenOdul, odulAl, lig, ligOzet, banka, kabuller, siraSende,
           davetlerim, davetSayisi, turnuva, turnuvaYukle, turnuvaAyar, lobiyeKatil, mesaj, setMesaj };
}

/**
 * Oyun başlatma: ana sayfadaki "Rakip bul" akışının aynısı (mod seçimi → yarım maç
 * sorusu → rakip arama). `oyna()` mod penceresini açar; `katmanlar` sayfada çizilir.
 */
export function useOyunBaslat() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [dereceliTercih, setDereceliTercih] = useDereceliTercih();
  const [modAcik, setModAcik] = useState(false);   // false | "hepsi" | "saf"
  const [arama, setArama] = useState(null);      // { dereceli, jokersiz }
  const [yarim, setYarim] = useState(null);

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
    setArama({ dereceli, jokersiz });
  };

  const katmanlar = (
    <>
      {yarim && (
        <YarimMacPenceresi mac={yarim}
          onDevam={() => { const id = yarim.id; setYarim(null); navigate(y(`/mac/${id}`)); }}
          onYeni={() => { const { dereceli, jokersiz } = yarim; setYarim(null); setArama({ dereceli, jokersiz }); }}
          onKapat={() => setYarim(null)} />
      )}
      {modAcik && (
        <ModSecimPenceresi profil={null} alttan baslik={tt("Nasıl oynamak istersin?")} bekleMetni={tt("Rakip aranıyor…")}
          dereceli={dereceliTercih} onDereceli={setDereceliTercih}
          modlar={modAcik === "saf" ? ["saf"] : undefined}
          onSec={async (mod) => {
            setModAcik(false);
            if (mod === "duello") { navigate(y("/duello")); return null; }
            await hemenOyna(dereceliTercih, mod === "saf");
            return null;
          }}
          onKapat={() => setModAcik(false)} />
      )}
      {arama && (
        <RakipAra kategori={profile?.tercih_kategori ?? null} dereceli={arama.dereceli} jokersiz={arama.jokersiz}
          onBulundu={(macId) => { setArama(null); navigate(y(`/mac/${macId}`)); }}
          onIptal={() => setArama(null)} />
      )}
    </>
  );

  return {
    oyna: () => setModAcik("hepsi"),
    // Saf Bilgi kısayolu da aynı pencereden geçer: tür her seferinde görünür, sessizce başlamaz.
    safBilgi: () => setModAcik("saf"),
    git: (yol) => navigate(y(yol)),
    katmanlar,
  };
}
