import { useCallback, useEffect, useState } from "react";
import { hataMesaji } from "../lib/hata.js";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import Countdown from "../components/Countdown.jsx";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import { TurnuvaSaatEtiketi, BugunKalanTurnuvalar } from "../components/TurnuvaSaatleri.jsx";
import { siradakiLobi } from "../lib/zaman.js";
import { rutbeBul } from "../lib/ranks.js";
import { haftaBitisi, sureMetni } from "../lib/konum.js";
import RakipAra from "../components/RakipAra.jsx";
import YarimMacPenceresi from "../components/YarimMac.jsx";
import ModSecimPenceresi from "../components/ModSecimPenceresi.jsx";
import RankBadge from "../components/RankBadge.jsx";
import SeriRozeti from "../components/SeriRozeti.jsx";
import DurumKutusu, { useZamanAsimi } from "../components/DurumKutusu.jsx";
import { y } from "../lib/yol.js";
import { kategoriEtiket, kategorileriSirala } from "../lib/kategoriler.js";
import KategoriIkon from "../components/KategoriIkon.jsx";
import BildirimIzniSor from "../components/BildirimIzniSor.jsx";
import { BILDIRIM_SONRA_ANAHTAR } from "../components/MacSonuSahnesi.jsx";
import DereceliAnahtari from "../components/DereceliAnahtari.jsx";
import { useDereceliTercih } from "../lib/dereceli.js";
import { useDil } from "../lib/dilKanca.js";
import { tt, ttSunucu } from "../lib/dil.js";
import { LIG_ADLARI } from "../lib/lig.js";
import { rpcDene } from "../lib/rpcDene.js";
import {
  QtKart, QtDugme, QtIkonDugme, QtIkon, QtModKart, QtIlerleme, QtListe, QtListeSatiri, QtRozet, QtModal,
} from "../tasarim/index.js";
import "../tasarim/ekranlar/a-ana.css";

export default function Home() {
  const { user, profile, refreshProfile, profilHata } = useAuth();
  // Paket 41 A: profil hiç gelmezse sonsuz bekleme yerine hata durumu
  const profilGecikti = useZamanAsimi(!profile);
  const navigate = useNavigate();
  const [lobide, setLobide] = useState(false);
  const [lobiSayisi, setLobiSayisi] = useState(0);
  const [canliTurnuva, setCanliTurnuva] = useState(false);
  const [mesaj, setMesaj] = useState(null);
  // Paket 36 H: bildirim izni maç sonucunun ortasında değil, sonuç ekranından
  // ana sayfaya dönünce sorulur. Kartın "ne zaman" kararı BildirimIzniSor'da.
  const [bildirimSor] = useState(() => {
    try { return sessionStorage.getItem(BILDIRIM_SONRA_ANAHTAR) === "1"; } catch { return false; }
  });
  const [gorevler, setGorevler] = useState([]);
  const [ligDurum, setLigDurum] = useState(null);
  const [gecenHafta, setGecenHafta] = useState(null);
  const [rakipAra, setRakipAra] = useState(false);
  // Aranan maçın türü: dereceli (puan/lig etkiler, seviyeye göre eşleşme)
  // ya da normal (puan yok, serbest rakip).
  const [dereceliAra, setDereceliAra] = useState(true);
  const [jokersizAra, setJokersizAra] = useState(false);   // Paket 31 B: Saf Bilgi araması
  // Paket 14 (3.1): mod seçiminin üstünde tek "Dereceli" anahtarı, son tercih hatırlanır.
  const [dereceliTercih, setDereceliTercih] = useDereceliTercih();
  const { ceviri } = useDil();
  const [siraSendeMaclar, setSiraSendeMaclar] = useState([]);
  // Meydan okuman kabul edildi — rakip maçta seni bekliyor (en üstte, vurgulu)
  const [yeniKabuller, setYeniKabuller] = useState([]);
  // Gönderdiğim ve hâlâ cevap bekleyen davetler — "isteğim ne durumda?"
  const [bekleyenDavetlerim, setBekleyenDavetlerim] = useState([]);
  // Geri çekilmekte olan davetin anahtarı (düğme iki kez basılmasın)
  const [geriCekilen, setGeriCekilen] = useState(null);
  // Hatalarım bankasında bekleyen soru sayısı (mod kartı rozeti)
  const [bankaBekleyen, setBankaBekleyen] = useState(0);
  const [gorevlerAcik, setGorevlerAcik] = useState(false);
  // Ödülü alınmayı bekleyen görev sayısı (kapalıyken de görünür)
  const hazirOdul = gorevler.filter((g) => g.ilerleme >= g.hedef && !g.alindi).length;
  const [haftaKalan, setHaftaKalan] = useState(
    () => haftaBitisi().getTime() - Date.now()
  );

  const gorevleriYukle = useCallback(() => {
    rpcDene("get_daily_quests").then(({ data }) => setGorevler(data ?? []));
  }, []);

  useEffect(() => {
    gorevleriYukle();
  }, [gorevleriYukle]);

  // Hatalarım bankası — mod kartındaki rozet için
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("yanlis_bankam");
        if (error) throw error;
        const ilk = (data ?? [])[0];
        if (aktif) setBankaBekleyen(ilk?.bekleyen ?? 0);
      } catch (e) { console.warn("[Bildim] yanlis_bankam başarısız:", e?.message ?? e);
        /* migration bekliyor olabilir — rozet gizli kalır */
      }
    })();
    return () => {
      aktif = false;
    };
  }, []);

  // Sırası BENDE olan yarım kalmış müsabakalar + YENİ KABUL EDİLEN meydan
  // okumalar. İkincisi ayrı tutulur: meydan okuduğun kişi kabul edip maça
  // girdiğinde bunu HEMEN görmen gerekiyor (kullanıcı "maçı aramaktan
  // bulamadım, rakip benden önce başladı" dedi). Bot maçlarının üstüne,
  // en yenisi en başa gelir.
  const siraYukle = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `id, oyuncu1, oyuncu2, oyuncu1_soru, oyuncu2_soru, soru_ids, kabul_at, senkron, basladi,
           p1:profiles!matches_oyuncu1_fkey(gorunen_ad, acik_bot),
           p2:profiles!matches_oyuncu2_fkey(gorunen_ad, acik_bot)`
        )
        .eq("durum", "aktif")
        .or("oyuncu1.eq." + user.id + ",oyuncu2.eq." + user.id)
        .limit(20);
      if (error) throw error;
      const benim = (data ?? [])
        .map((m) => {
          const benP1 = m.oyuncu1 === user.id;
          const benimSoru = benP1 ? (m.oyuncu1_soru ?? 0) : (m.oyuncu2_soru ?? 0);
          const rakip = benP1 ? m.p2 : m.p1;
          return { ...m, benimSoru, rakipAd: rakip?.gorunen_ad, rakipBot: Boolean(rakip?.acik_bot) };
        })
        .filter((m) => m.benimSoru < (m.soru_ids?.length ?? 20));

      // Yeni kabul: karşı taraf kabul etti, ben daha tek soru bile oynamadım.
      // İlk cevapla birlikte kendiliğinden normal listeye düşer.
      const yeni = benim
        .filter((m) => m.kabul_at && m.benimSoru === 0 && !m.rakipBot)
        .sort((a, b) => new Date(b.kabul_at) - new Date(a.kabul_at));
      const yeniIdler = new Set(yeni.map((m) => m.id));

      setYeniKabuller(yeni);

      // Gönderdiğim davetler ayrı RPC'den gelir (karşı tarafın satırını
      // okumak gerekiyor; RLS yüzünden düz select yetmez).
      try {
        const { data: dv, error: dvHata } = await supabase.rpc("gonderdigim_davetler");
        if (dvHata) throw dvHata;
        setBekleyenDavetlerim(dv ?? []);
      } catch (e) { console.warn("[Bildim] gonderdigim_davetler başarısız:", e?.message ?? e);
        setBekleyenDavetlerim([]);   // migration bekliyor olabilir
      }
      setSiraSendeMaclar(benim.filter((m) => !yeniIdler.has(m.id)));
    } catch (e) { console.warn("[Bildim] sıra/kabul listesi alınamadı:", e?.message ?? e);
      // sessiz geç — ana sayfa akışını bozmasın
      setYeniKabuller([]);
      setSiraSendeMaclar([]);
    }
  }, [user.id]);

  useEffect(() => {
    siraYukle();
    const kanal = supabase
      .channel("sira-sende")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, siraYukle)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [siraYukle]);

  /**
   * Gönderilmiş ama henüz cevaplanmamış daveti geri çeker.
   * Karşı taraf arada kabul etmiş olabilir: sunucu o durumda reddeder,
   * listeyi tazeleyince satır zaten "maçın başladı"ya döner.
   */
  const davetiGeriCek = async (d) => {
    const anahtar = d.tur + d.kayit_id;
    setGeriCekilen(anahtar);
    try {
      const { error } = await supabase.rpc("davet_geri_cek", {
        p_tur: d.tur,
        p_kayit_id: d.kayit_id,
      });
      if (error) throw error;
      setBekleyenDavetlerim((liste) =>
        liste.filter((x) => x.tur + x.kayit_id !== anahtar));
    } catch (e) {
      console.error("[Bildim] davet geri cekilemedi:", e);
    } finally {
      setGeriCekilen(null);
      siraYukle();
    }
  };

  const odulAl = async (questId) => {
    const { error } = await supabase.rpc("claim_quest", { p_quest_id: questId });
    if (!error) {
      gorevleriYukle();
      refreshProfile(user.id);
    }
  };

  // Arayüz Yenileme (20 Eyl 2026): yeni tasarımda ana sayfanın sağ sütununda
  // LİG KARTI var, dolayısıyla veri yine gerekiyor. Kaynak Lig sayfasıyla
  // AYNI: `lig_grubum` (migration 151). Rütbe ile karıştırılmaz — rütbe
  // level'den hesaplanır (ranks.js, P2A), lig sunucudaki `lig` kolonudur.
  const ligYukle = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("lig_grubum");
      if (error) throw error;
      const satirlar = data ?? [];
      if (!satirlar.length) { setLigDurum(null); return; }
      // 661: sıra sunucudan gerçek gelir (gizli üyeler dahil); satır indeksi + 1 görünen satırları sayardı.
      const sira = Number(satirlar.find((s) => s.user_id === user.id)?.sira) || 0;
      setLigDurum({
        lig: satirlar[0].lig,
        grupBoyu: satirlar[0].grup_boyu,
        yukselen: satirlar[0].yukselen,
        sira: sira > 0 ? sira : null,
      });
    } catch (e) {
      console.warn("[Bildim] lig_grubum başarısız:", e?.message ?? e);
      setLigDurum(null);   // migration bekliyor olabilir — kart sade görünür
    }
  }, [user.id]);

  useEffect(() => {
    ligYukle();
  }, [ligYukle]);

  useEffect(() => {
    const id = setInterval(
      () => setHaftaKalan(haftaBitisi().getTime() - Date.now()),
      60000
    );
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let aktif = true;
    const yukle = async () => {
      try {
        const { data, error } = await supabase
          .from("lig_arsiv")
          .select("hafta, puan, sehir, ulke, sira_sehir, sira_ulke, sira_global")
          .eq("user_id", user.id)
          .order("hafta", { ascending: false })
          .limit(1);
        if (error) throw error;
        const kayit = (data ?? [])[0];
        if (!kayit || !aktif) return;
        if (localStorage.getItem("bildim_hafta_okundu") === kayit.hafta) return;
        setGecenHafta(kayit);
      } catch {
        /* tablo henüz yok veya ağ hatası — sessiz geç */
      }
    };
    yukle();
    return () => {
      aktif = false;
    };
  }, [user.id]);

  useEffect(() => {
    const yukle = async () => {
      // Supabase hata FIRLATMAZ, { data:null, error } döner; error okunmazsa
      // turnuva şeridi sessizce boş kalır ve nedeni hiçbir yere düşmez.
      let tlar = null;
      try {
        // Günde birden çok turnuva (Paket 12, madde 7): "son 2 satır" artık bitmiş
        // turnuvalardan oluşabiliyor; yalnız açık olanlar çekilir ve lobi
        // olarak EN ERKEN başlayacak olan seçilir.
        const { data, error } = await supabase
          .from("tournaments")
          .select("id, durum, tarih, seans")
          .in("durum", ["aktif", "lobi"])
          .limit(20);
        if (error) throw error;
        tlar = data;
      } catch (e) {
        console.error("[Bildim] turnuva listesi alınamadı:", e);
      }

      const aktif = (tlar ?? []).find((t) => t.durum === "aktif");
      setCanliTurnuva(Boolean(aktif));

      const lobi = siradakiLobi(tlar);
      if (lobi) {
        try {
          const { data: oyuncular, count, error } = await supabase
            .from("tournament_players")
            .select("user_id", { count: "exact" })
            .eq("tournament_id", lobi.id);
          if (error) throw error;
          setLobiSayisi(count ?? 0);
          setLobide((oyuncular ?? []).some((o) => o.user_id === user.id));
        } catch (e) {
          console.error("[Bildim] lobi oyuncuları alınamadı:", e);
        }
      }

      // Ana sayfada uzun lider listesi yok (Faz 3): lig özeti tek satırda,
      // tam sıralama Lig sayfasında.
    };
    yukle();
  }, [user]);

  const lobiyeKatil = async () => {
    setMesaj(null);
    const { error } = await supabase.rpc("join_tournament_lobby");
    if (error) setMesaj(hataMesaji(error));
    else {
      setLobide(true);
      setLobiSayisi((n) => n + 1);
    }
  };

  // ---- ARAMA KATEGORİSİ (Paket 9) ----
  // "Hemen oyna" ve "Dereceli Maç" profile.tercih_kategori'de rakip arıyor;
  // bu ayar yalnız Profil → Ayarlar'ın derinindeydi, sahibi ana sayfada
  // bulamadı. Aynı mekanizma (get_categories + tercih_kategori_kaydet)
  // burada da: oyuncu basmadan ÖNCE kategoriyi görür ve değiştirir.
  const [kategoriler, setKategoriler] = useState([]);
  const [kategoriKaydediliyor, setKategoriKaydediliyor] = useState(false);
  const [kategoriSheet, setKategoriSheet] = useState(false);
  useEffect(() => {
    let aktif = true;
    (async () => {
      try {
        const { data, error } = await supabase.rpc("get_categories");
        if (error) throw error;
        if (aktif) setKategoriler(data ?? []);
      } catch (e) {
        console.error("[Ana sayfa] kategoriler alinamadi:", e);
      }
    })();
    return () => { aktif = false; };
  }, []);
  const aramaKategorisiSec = async (deger) => {
    setMesaj(null);
    setKategoriKaydediliyor(true);
    try {
      const { error } = await supabase.rpc("tercih_kategori_kaydet", { p_kategori: deger || null });
      if (error) throw error;
      await refreshProfile?.(user.id);
    } catch (e) {
      setMesaj(hataMesaji(e, tt("Kategori kaydedilemedi.")));
    } finally {
      setKategoriKaydediliyor(false);
    }
  };

  // Hemen Oyna: önce tercih edilen kategoride insan rakip aranır (20 sn),
  // bulunamazsa karışığa/bota düşülür. Akış RakipAra bileşeninde.
  const aramayiAc = (dereceli, jokersiz) => {
    setDereceliAra(dereceli);
    setJokersizAra(jokersiz);
    setRakipAra(true);
  };

  // Paket 32 D: yarım maç varsa sessizce oraya sokma — önce sor.
  // Sorgu okunamazsa eski akış sürer (sunucu yine aktif maça yönlendirir).
  const [yarimMac, setYarimMac] = useState(null);   // { id, rakipAd, soru, toplam, dereceli, jokersiz }
  // Paket 35 B: "Hemen oyna" önce mod sorar (Klasik / Düello / Saf Bilgi)
  const [modSecimAcik, setModSecimAcik] = useState(false);
  const hemenOyna = async (dereceli = true, jokersiz = false) => {
    setMesaj(null);
    try {
      const { data, error } = await supabase
        .from("matches")
        .select(`id, oyuncu1, oyuncu2, aktif_soru, soru_ids,
                 p1:profiles!matches_oyuncu1_fkey(gorunen_ad),
                 p2:profiles!matches_oyuncu2_fkey(gorunen_ad)`)
        .eq("durum", "aktif")
        .or(`oyuncu1.eq.${user.id},oyuncu2.eq.${user.id}`)
        .limit(1);
      if (error) throw error;
      const m = data?.[0];
      if (m) {
        const toplam = m.soru_ids?.length ?? 0;
        setYarimMac({
          id: m.id,
          rakipAd: (m.oyuncu1 === user.id ? m.p2 : m.p1)?.gorunen_ad ?? null,
          soru: Math.min(toplam, (m.aktif_soru ?? 0) + 1),
          toplam,
          dereceli,
          jokersiz,
        });
        return;
      }
    } catch (e) {
      console.warn("[Bildim] yarım maç kontrolü:", e?.message ?? e);
    }
    aramayiAc(dereceli, jokersiz);
  };

  // Paket 41 A: profil yokken sahte "Oyuncu · 0 PUAN · Çaylak" çizilmez
  if (!profile) {
    return (
      <div className="a-ana">
        <h1 className="qt-gizli">{tt("Ana sayfa")}</h1>
        <QtKart>
          <DurumKutusu durum={profilHata || profilGecikti ? "hata" : "yukleniyor"} satir={4}
                       onTekrar={() => refreshProfile(user?.id)} />
        </QtKart>
      </div>
    );
  }

  // P2A: oyuncu kartı LEVEL gösterir (rütbe level'e bağlı; lig puanı lig kartında).
  const level = Number(profile?.level) || 1;
  const levelXp = Math.max(0, Number(profile?.level_xp) || 0);
  const levelGereken = Number(profile?.level_gereken) || 0;
  const rutbe = rutbeBul(level);
  const kategoriAdi = profile?.tercih_kategori ? kategoriEtiket(profile.tercih_kategori) : tt("Karışık");

  return (
    <div className="a-ana bd-anasayfa">
      <h1 className="qt-gizli">{tt("Ana sayfa")}</h1>

      {/* ---------- Katmanlar (modal / tam ekran) ---------- */}
      {yarimMac && (
        <YarimMacPenceresi
          mac={yarimMac}
          onDevam={() => { const id = yarimMac.id; setYarimMac(null); navigate(y(`/mac/${id}`)); }}
          onYeni={() => { const { dereceli, jokersiz } = yarimMac; setYarimMac(null); aramayiAc(dereceli, jokersiz); }}
          onKapat={() => setYarimMac(null)}
        />
      )}
      {modSecimAcik && (
        <ModSecimPenceresi
          profil={null}
          alttan
          baslik={tt("Nasıl oynamak istersin?")}
          bekleMetni={tt("Rakip aranıyor…")}
          onSec={async (mod) => {
            // Pencere önce kapanır: arama ekranı ya da yarım maç sorusu onun yerine açılır
            setModSecimAcik(false);
            if (mod === "duello") { navigate(y("/duello")); return null; }
            await hemenOyna(dereceliTercih, mod === "saf");
            return null;
          }}
          onKapat={() => setModSecimAcik(false)}
        />
      )}
      {rakipAra && (
        <RakipAra
          kategori={profile?.tercih_kategori ?? null}
          dereceli={dereceliAra}
          jokersiz={jokersizAra}
          onBulundu={(macId) => {
            setRakipAra(false);
            navigate(y(`/mac/${macId}`));
          }}
          onIptal={() => setRakipAra(false)}
        />
      )}
      <QtModal
        acik={kategoriSheet}
        tur="altSayfa"
        onKapat={() => setKategoriSheet(false)}
        baslik={tt("Rakip kategorisi")}
        aciklama={tt("Klasik Maç ve Saf Bilgi bu kategoride rakip arar.")}
      >
        <QtListe etiket={tt("Rakip kategorisi seç")} className="a-ana-kategori-liste">
          {[{ kategori: "", soru_sayisi: null }, ...kategorileriSirala(kategoriler)].map((k) => {
            const secili = (profile?.tercih_kategori ?? "") === k.kategori;
            return (
              <QtListeSatiri
                key={k.kategori || "karisik"}
                vurgulu={secili}
                aria-pressed={secili}
                data-qt-ilk-odak={secili ? "" : undefined}
                bas={<KategoriIkon anahtar={k.kategori || "karisik"} boyut={24} plaka />}
                baslik={k.kategori ? kategoriEtiket(k.kategori) : tt("Karışık")}
                alt={k.kategori ? tt("{n} soru", { n: k.soru_sayisi }) : tt("Tüm kategoriler")}
                sag={secili ? <QtIkon ad="onay" boyut={22} etiket={tt("Seçili")} className="a-ana-secili-ikon" /> : null}
                onClick={async () => {
                  setKategoriSheet(false);
                  if (!secili) await aramaKategorisiSec(k.kategori);
                }}
              />
            );
          })}
        </QtListe>
      </QtModal>

      {/* ---------- ACİL: rakip seni bekliyor ----------
          Meydan okuman kabul edildi ve karşı taraf ŞU AN maç ekranında.
          Sayfanın en görünür yerinde durur; saniyeler içinde yapılacak iş. */}
      {yeniKabuller.map((m) => (
        <QtKart key={m.id} as={Link} to={y("/mac/") + m.id} ton="mor" className="a-ana-acil">
          <span className="a-ana-acil-nokta" aria-hidden="true" />
          <span className="a-ana-acil-metin">
            <b>{tt("{ad} meydan okumanı kabul etti", { ad: m.rakipAd || tt("Rakibin") })}</b>
            <span>{tt("Maç ekranında seni bekliyor — hemen gir")}</span>
          </span>
          <span className="a-ana-acil-eylem">{tt("Maça gir")}<QtIkon ad="ileri" boyut={20} /></span>
        </QtKart>
      ))}

      <div className="a-ana-izgara">
        <div className="a-ana-ana">
          {/* ---------- OYUNCU KARTI ----------
              Rütbe ve lig AYRI iki sistemdir: burada RÜTBE + LEVEL var (P2A: rütbe
              level'den, ranks.js). Lig yan sütundaki lig satırında. */}
          <QtKart className="a-ana-oyuncu">
            <span className="a-ana-oyuncu-avatar">
              <AvatarCerceve profile={profile} boyut={64} userId={user.id} />
            </span>
            <div className="a-ana-oyuncu-bilgi">
              <p className="a-ana-oyuncu-ad">{profile?.gorunen_ad ?? tt("Oyuncu")}</p>
              <p className="a-ana-oyuncu-rutbe">
                <RankBadge level={level} sadeceRozet boyut={16} /> {rutbe.ad} · {tt("Level {n}", { n: level })}
              </p>
              <QtIlerleme
                deger={levelXp}
                en={levelGereken > 0 ? levelGereken : 1}
                etiket={tt("Seviye ilerlemesi")}
                className="a-ana-oyuncu-xp"
              />
              <p className="a-ana-oyuncu-xp-metin">
                {levelGereken > 0
                  ? tt("Level {n} için {xp} XP", { n: level + 1, xp: Math.max(0, levelGereken - levelXp) })
                  : tt("Level {n}", { n: level })}
              </p>
            </div>
            <span className="a-ana-seri"><SeriRozeti bicim="serit" /></span>
          </QtKart>

          {/* Haftalık sonuç bildirimi (push kapalıysa da görünür) */}
          {gecenHafta && (
            <QtKart ton="duz" dolgu="k" className="a-ana-hafta">
              <span className="a-ana-hafta-ikon"><QtIkon ad="kupa" boyut={22} /></span>
              <p className="a-ana-hafta-metin">
                {gecenHafta.sira_sehir
                  ? tt("Geçen hafta {sehir} liginde {sira}. oldun ({puan} puan). Yeni hafta başladı!",
                      { sehir: gecenHafta.sehir, sira: gecenHafta.sira_sehir, puan: gecenHafta.puan })
                  : tt("Geçen hafta dünya liginde {sira}. oldun ({puan} puan). Yeni hafta başladı!",
                      { sira: gecenHafta.sira_global, puan: gecenHafta.puan })}
              </p>
              <QtIkonDugme
                ikon="carpi"
                tur="saydam"
                etiket={tt("Kapat")}
                onClick={() => {
                  try {
                    localStorage.setItem("bildim_hafta_okundu", gecenHafta.hafta);
                  } catch { /* özel mod */ }
                  setGecenHafta(null);
                }}
              />
            </QtKart>
          )}

          {bildirimSor && <BildirimIzniSor />}

          {/* ---------- ANA MODLAR ----------
              Klasik ve Düello iki eşit kardeş ana mod. Klasik mod seçimini
              açar (Klasik · Düello · Saf Bilgi), Düello doğrudan girişine gider.
              `mobile-core-mode klasik` EK sınıfı: oyuncu testi buna dokunuyor. */}
          <section className="a-ana-bolum" aria-labelledby="a-ana-oyna-b">
            <h2 id="a-ana-oyna-b" className="qt-baslik-2">{tt("Hemen oyna")}</h2>
            <div className="a-ana-modlar">
              <QtModKart
                mod="klasik"
                ikon="klasik"
                ad={ceviri("Klasik")}
                alt={tt("20 soru · canlı rakip")}
                className="mobile-core-mode klasik"
                aria-haspopup="dialog"
                onClick={() => setModSecimAcik(true)}
              />
              <QtModKart
                mod="duello"
                ikon="duello"
                ad={ceviri("Düello")}
                alt={tt("3 can · aynı soru, aynı anda")}
                className="mobile-core-mode duello"
                onClick={() => navigate(y("/duello"))}
              />
            </div>

            {/* Kategori ve dereceli/serbest — ikisi de mevcut mekanizma:
                tercih_kategori (tercih_kategori_kaydet) ve dereceli tercihi
                (localStorage + profiles.dereceli_tercih). */}
            <QtKart dolgu="k" className="a-ana-ayarlar">
              <button
                type="button"
                className="a-ana-kategori"
                disabled={kategoriKaydediliyor}
                aria-haspopup="dialog"
                onClick={() => setKategoriSheet(true)}
              >
                <KategoriIkon anahtar={profile?.tercih_kategori || "karisik"} boyut={22} plaka />
                <span className="a-ana-kategori-metin">
                  <span className="a-ana-kategori-etiket">{tt("Kategori")}</span>
                  <b>{kategoriKaydediliyor ? tt("Kaydediliyor…") : kategoriAdi}</b>
                </span>
                <QtIkon ad="asagi" boyut={20} className="a-ana-kategori-ok" />
              </button>
              <DereceliAnahtari dereceli={dereceliTercih} onDegistir={setDereceliTercih} className="a-dereceli--gomulu a-ana-dereceli" />
            </QtKart>

            <QtDugme boyut="b" tamGenislik ikon="oyna" aria-haspopup="dialog" onClick={() => setModSecimAcik(true)}>
              {tt("Rakip bul")}
            </QtDugme>
            {mesaj && <p className="a-ana-hata" role="alert">{mesaj}</p>}
          </section>

          {/* ---------- SENİ BEKLEYENLER ---------- */}
          <section className="a-ana-bolum" aria-labelledby="a-ana-bekleyen-b">
            <h2 id="a-ana-bekleyen-b" className="qt-baslik-2">{tt("Seni bekleyenler")}</h2>
            {siraSendeMaclar.length === 0 && bekleyenDavetlerim.length === 0 ? (
              <QtKart dolgu="k" className="a-ana-bos">
                <span className="a-ana-bos-ikon"><QtIkon ad="kilic" boyut={22} /></span>
                <p className="a-ana-bos-metin">{tt("Şu an seni bekleyen maç yok.")}</p>
                <QtDugme as={Link} to={y("/meydan")} tur="ikincil" boyut="k">{tt("Arkadaşına meydan oku")}</QtDugme>
              </QtKart>
            ) : (
              <QtListe etiket={tt("Seni bekleyenler")}>
                {/* `bd-devam-eden` EK sınıfı: oyuncu testi yarım maça bununla döner */}
                {siraSendeMaclar.map((m) => (
                  <QtListeSatiri
                    key={m.id}
                    as={Link}
                    to={y("/mac/") + m.id}
                    className="bd-devam-eden"
                    ikon="saat"
                    ikonTon="vurgu"
                    baslik={m.rakipAd || tt("Rakibin")}
                    alt={tt("Maçın yarım — sıra sende")}
                    ok
                  />
                ))}
                {/* Gönderdiğim davetler: karşı taraf henüz cevaplamadı. Fikir
                    değişebilir: cevaplanmamış davet geri alınabilir. */}
                {bekleyenDavetlerim.map((d) => (
                  <QtListeSatiri
                    key={d.tur + d.kayit_id}
                    ikon="saat"
                    ikonTon="bilgi"
                    baslik={d.tur === "grup" || d.tur === "hizli"
                      ? tt("Davetin gönderildi")
                      : (d.gorunen_ad || tt("Rakibin"))}
                    alt={d.tur === "grup" || d.tur === "hizli"
                      ? tt("{n} kişi bekleniyor", { n: d.bekleyen_sayisi })
                      : tt("Daveti görmedi — bekleniyor")}
                    sag={
                      <QtDugme
                        tur="ikincil"
                        boyut="k"
                        yukleniyor={geriCekilen === d.tur + d.kayit_id}
                        onClick={() => davetiGeriCek(d)}
                        aria-label={tt("Daveti geri çek")}
                      >
                        {tt("Geri çek")}
                      </QtDugme>
                    }
                  />
                ))}
              </QtListe>
            )}
          </section>

          {/* ---------- DİĞER MODLAR ----------
              Yalnız GERÇEKTEN VAR OLAN modlar. Dondurulmuş modlar (Hızlı Mod,
              "Hızlı Olan Kazanır") burada yoktur. */}
          <section className="a-ana-bolum" aria-labelledby="a-ana-modlar-b">
            <div className="a-ana-bolum-bas">
              <h2 id="a-ana-modlar-b" className="qt-baslik-2">{tt("Diğer modlar")}</h2>
              <QtDugme as={Link} to={y("/modlar")} tur="hayalet" boyut="k" ikonSag="ileri">{tt("Tümünü gör")}</QtDugme>
            </div>
            <QtListe etiket={tt("Diğer modlar")}>
              {/* SAF BİLGİ: jokersiz Klasik Mod (Paket 31 B) */}
              <QtListeSatiri
                ikon="safBilgi"
                ikonTon="bilgi"
                baslik={ceviri("Saf Bilgi")}
                alt={ceviri("Skill yok. Sadece bilgi ve hız.")}
                onClick={() => hemenOyna(dereceliTercih, true)}
                ok
              />
              <QtListeSatiri
                as={Link}
                to={y("/meydan")}
                ikon="kisiler"
                ikonTon="dogru"
                baslik={tt("Meydan Oku")}
                alt={tt("Arkadaşına davet gönder · tekli ya da grup")}
                ok
              />
              <QtListeSatiri
                as={Link}
                to={y("/calisma")}
                ikon="kitap"
                ikonTon="mor"
                baslik={tt("Hatalarım")}
                alt={bankaBekleyen > 0
                  ? tt("{n} soru seni bekliyor", { n: bankaBekleyen })
                  : tt("Kaçırdığın soruları çalış")}
                sag={bankaBekleyen > 0 ? <QtRozet ton="vurgu" boyut="k">{bankaBekleyen}</QtRozet> : null}
                ok
              />
            </QtListe>
          </section>
        </div>

        <aside className="a-ana-yan">
          {/* ---------- TURNUVA ----------
              Saat ve geri sayım oyun_ayarlari.turnuva_saatleri'nden (lib/zaman.js). */}
          <QtKart ton="mor" className="a-ana-turnuva">
            <div className="a-ana-turnuva-bas">
              <span className="a-ana-turnuva-ikon"><QtIkon ad="kupa" boyut={28} /></span>
              <div>
                <h2 className="qt-baslik-2">{tt("Turnuva")}</h2>
                <p className="a-ana-turnuva-alt">{tt("Son kalan oyuncu ol, büyük ödülü kap.")}</p>
              </div>
              {canliTurnuva
                ? <QtRozet ton="yanlis" className="a-ana-canli">{tt("Şu an canlı")}</QtRozet>
                : <QtRozet ton="coin"><TurnuvaSaatEtiketi /></QtRozet>}
            </div>
            {!canliTurnuva && <Countdown bicim="prototip" />}
            <div className="a-ana-turnuva-alt-satir">
              <span><b className="qt-sayi">{lobiSayisi}</b> {tt("oyuncu lobide")}</span>
              {canliTurnuva ? (
                <QtDugme tur="ikincil" boyut="k" onClick={() => navigate(y("/turnuva"))}>{tt("Katıl")}</QtDugme>
              ) : lobide ? (
                <QtDugme tur="ikincil" boyut="k" ikon="onay" onClick={() => navigate(y("/turnuva"))}>{tt("Lobidesin")}</QtDugme>
              ) : (
                <QtDugme tur="ikincil" boyut="k" onClick={lobiyeKatil}>{tt("Lobiye katıl")}</QtDugme>
              )}
            </div>
            <BugunKalanTurnuvalar className="a-ana-turnuva-kalan" />
          </QtKart>

          {/* ---------- GÜNLÜK GÖREVLER (gerçek: get_daily_quests) ---------- */}
          {gorevler.length > 0 && (
            <section className="a-ana-bolum" aria-labelledby="a-ana-gorev-b">
              <div className="a-ana-bolum-bas">
                <h2 id="a-ana-gorev-b" className="qt-baslik-2">{tt("Günlük görevler")}</h2>
                <QtRozet ton="dogru" boyut="k">{gorevler.filter((g) => g.alindi).length}/{gorevler.length}</QtRozet>
              </div>
              <QtListe etiket={tt("Günlük görevler")}>
                {(gorevlerAcik ? gorevler : gorevler.slice(0, 2)).map((g) => {
                  const tamam = g.ilerleme >= g.hedef;
                  return (
                    <QtListeSatiri
                      key={g.quest_id}
                      ikon={tamam ? "onay" : "hizli"}
                      ikonTon={tamam ? "dogru" : "vurgu"}
                      baslik={ttSunucu(g.ad)}
                      alt={`${Math.min(g.ilerleme, g.hedef)}/${g.hedef}`}
                      sag={g.alindi ? (
                        <QtRozet ton="dogru" ikon="onay" boyut="k">+{g.odul}</QtRozet>
                      ) : tamam ? (
                        <QtDugme boyut="k" tur="mor" ikon="coin" onClick={() => odulAl(g.quest_id)}>
                          {tt("+{n} al", { n: g.odul })}
                        </QtDugme>
                      ) : (
                        <QtRozet ton="coin" ikon="coin" boyut="k">+{g.odul}</QtRozet>
                      )}
                    />
                  );
                })}
              </QtListe>
              {gorevler.length > 2 && (
                <QtDugme
                  tur="hayalet"
                  boyut="k"
                  tamGenislik
                  onClick={() => setGorevlerAcik((a) => !a)}
                  aria-expanded={gorevlerAcik}
                >
                  {gorevlerAcik
                    ? tt("Daha az göster")
                    : hazirOdul > 0
                      ? tt("{0} ödül hazır!", { 0: hazirOdul })
                      : tt("Tüm görevleri gör")}
                </QtDugme>
              )}
            </section>
          )}

          {/* ---------- LİG (gerçek: lig_grubum) + DÜKKÂN kısayolu ----------
              RÜTBE DEĞİL. Rütbe oyuncu kartında. Dükkân girişi ana sayfada da
              açık (850 px üstünde alt menü yok; coin hapı Coin sekmesine gider). */}
          <QtListe etiket={tt("Lig ve dükkân")}>
            <QtListeSatiri
              as={Link}
              to={y("/siralama")}
              ikon="lig"
              ikonTon="mor"
              baslik={ligDurum ? `${LIG_ADLARI[ligDurum.lig] ?? ligDurum.lig} ${tt("Lig")}` : tt("Haftalık lig")}
              alt={ligDurum?.sira
                ? tt("{0}/{1} · bitimine {2}", { 0: ligDurum.sira, 1: ligDurum.grupBoyu, 2: sureMetni(haftaKalan) })
                : tt("Bitimine {0}", { 0: sureMetni(haftaKalan) })}
              ok
            />
            <QtListeSatiri
              as={Link}
              to={y("/joker")}
              className="bd-dukkan-kisayol"
              ikon="dukkan"
              ikonTon="coin"
              baslik={tt("Skill ve coin")}
              alt={tt("Skillerini tazele, coin kazan")}
              ok
            />
          </QtListe>
        </aside>
      </div>
    </div>
  );
}
