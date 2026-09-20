import { useCallback, useEffect, useState } from "react";
import { hataMesaji } from "../lib/hata.js";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import Countdown from "../components/Countdown.jsx";
import Avatar from "../../src/components/Avatar.jsx";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import { TurnuvaSaatEtiketi, BugunKalanTurnuvalar } from "../components/TurnuvaSaatleri.jsx";
import { siradakiLobi } from "../lib/zaman.js";
import { rutbeBul, sonrakiRutbe } from "../lib/ranks.js";
import { haftaBitisi, sureMetni } from "../lib/konum.js";
import RakipAra from "../components/RakipAra.jsx";
import YarimMacPenceresi from "../components/YarimMac.jsx";
import ModSecimPenceresi from "../components/ModSecimPenceresi.jsx";
import Ikon from "../components/Ikon.jsx";
import RankBadge from "../components/RankBadge.jsx";
import SeriRozeti from "../components/SeriRozeti.jsx";
import DurumKutusu, { useZamanAsimi } from "../components/DurumKutusu.jsx";
import { y } from "../lib/yol.js";
import { kategoriEtiket, kategorileriSirala } from "../lib/kategoriler.js";
import KategoriIkon from "../components/KategoriIkon.jsx";
import Modal from "../components/Modal.jsx";
import BildirimIzniSor from "../components/BildirimIzniSor.jsx";
import { BILDIRIM_SONRA_ANAHTAR } from "../components/MacSonuSahnesi.jsx";
import DereceliAnahtari from "../components/DereceliAnahtari.jsx";
import { useDereceliTercih } from "../lib/dereceli.js";
import { useDil } from "../lib/dilKanca.js";
import { tt, ttSunucu } from "../lib/dil.js";
import { KLASIK_JOKERLER, MAC_ICI_JOKERLER, SALDIRI_JOKERLERI } from "../lib/jokerler.js";
import { LIG_ADLARI } from "../lib/lig.js";

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
    supabase.rpc("get_daily_quests").then(({ data }) => setGorevler(data ?? []));
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
  // puandan hesaplanır (ranks.js), lig sunucudaki `lig` kolonudur.
  const ligYukle = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc("lig_grubum");
      if (error) throw error;
      const satirlar = data ?? [];
      if (!satirlar.length) { setLigDurum(null); return; }
      const sira = satirlar.findIndex((s) => s.user_id === user.id) + 1;
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
        // Günde 7 turnuva (Paket 12, madde 7): "son 2 satır" artık bitmiş
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
      <div className="anasayfa">
        <h1 className="baslik bd-gorsel-gizli">{tt("Ana sayfa")}</h1>
        <div className="kart">
          <DurumKutusu durum={profilHata || profilGecikti ? "hata" : "yukleniyor"} satir={4}
                       onTekrar={() => refreshProfile(user?.id)} />
        </div>
      </div>
    );
  }

  const puan = profile?.puan ?? 0;
  const rutbe = rutbeBul(puan);
  const sonraki = sonrakiRutbe(puan);
  const ilerleme = sonraki
    ? Math.min(100, Math.round(((puan - rutbe.min) / (sonraki.min - rutbe.min)) * 100))
    : 100;

  return (
    <div className="bd-anasayfa">
      <h1 className="baslik bd-gorsel-gizli">{tt("Ana sayfa")}</h1>

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
      {kategoriSheet && (
        <Modal etiket={tt("Rakip kategorisi seç")} ekSinif="bd-alttan" onKapat={() => setKategoriSheet(false)}>
          <div className="bd-kategori-sheet">
            <div className="bd-kategori-sheet-tutamac" aria-hidden="true" />
            <h2>{tt("Rakip kategorisi")}</h2>
            <p>{tt("\"Hemen oyna\" bu kategoride rakip arar.")}</p>
            <div className="bd-kategori-sheet-liste">
              {[{ kategori: "", soru_sayisi: null }, ...kategorileriSirala(kategoriler)].map((k) => {
                const secili = (profile?.tercih_kategori ?? "") === k.kategori;
                return (
                  <button
                    key={k.kategori || "karisik"}
                    type="button"
                    className={"bd-kategori-secenek" + (secili ? " aktif" : "")}
                    aria-pressed={secili}
                    onClick={async () => {
                      setKategoriSheet(false);
                      if (!secili) await aramaKategorisiSec(k.kategori);
                    }}
                  >
                    <KategoriIkon anahtar={k.kategori || "karisik"} boyut={24} plaka />
                    <span className="bd-kategori-secenek-ad">{k.kategori ? kategoriEtiket(k.kategori) : tt("Karışık")}</span>
                    <span className="bd-kategori-secenek-alt">
                      {k.kategori ? `${k.soru_sayisi} soru` : tt("Tüm kategoriler")}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </Modal>
      )}

      {/* ---------- OYUNCU ŞERİDİ ----------
          Rütbe ve lig AYRI iki sistemdir: burada RÜTBE var (puandan
          hesaplanır, ranks.js). Lig sağ sütundaki lig kartında. */}
      <section className="player-strip">
        <div className="player-main">
          <span className="player-avatar">
            <AvatarCerceve profile={profile} boyut={58} userId={user.id} />
          </span>
          <div>
            <span className="eyebrow">{tt("HOŞ GELDİN")}</span>
            <h1>{profile?.gorunen_ad ?? tt("Oyuncu")}</h1>
            <span className="rank">
              <RankBadge puan={puan} sadeceRozet boyut={15} /> {rutbe.ad}
            </span>
          </div>
        </div>
        <div className="player-stats">
          <div><b>{puan}</b><span>{tt("Puan")}</span></div>
          <SeriRozeti bicim="serit" />
          <div className="next-rank">
            <span>
              {sonraki
                ? tt("{0} rütbesine {1} puan", { 0: sonraki.ad, 1: sonraki.min - puan })
                : tt("En yüksek rütbedesin")}
            </span>
            <i><em style={{ width: `${ilerleme}%` }} /></i>
          </div>
        </div>
      </section>

      {/* ---------- ACİL: rakip seni bekliyor ----------
          Meydan okuman kabul edildi ve karşı taraf ŞU AN maç ekranında.
          Sayfanın en görünür yerinde durur; saniyeler içinde yapılacak iş. */}
      {yeniKabuller.map((m) => (
        <Link key={m.id} to={y("/mac/") + m.id} className="bd-rakip-bekliyor">
          <span className="bd-rakip-bekliyor-nokta" aria-hidden="true" />
          <span className="bd-rakip-bekliyor-metin">
            <b>{m.rakipAd || tt("Rakibin")}</b> {tt("meydan okumanı kabul etti")}
            <small>{tt("Maç ekranında seni bekliyor — hemen gir")}</small>
          </span>
          <span className="bd-rakip-bekliyor-btn">{tt("Maça gir")}</span>
        </Link>
      ))}

      {/* Haftalık sonuç bildirimi (push kapalıysa da görünür) */}
      {gecenHafta && (
        <div className="bd-hafta-sonuc">
          <div className="ikon"><Ikon ad="kupa" boyut={20} /></div>
          <div className="metin">
            {gecenHafta.sira_sehir
              ? tt("Geçen hafta {sehir} liginde {sira}. oldun ({puan} puan). Yeni hafta başladı!",
                  { sehir: gecenHafta.sehir, sira: gecenHafta.sira_sehir, puan: gecenHafta.puan })
              : tt("Geçen hafta dünya liginde {sira}. oldun ({puan} puan). Yeni hafta başladı!",
                  { sira: gecenHafta.sira_global, puan: gecenHafta.puan })}
          </div>
          <button
            className="btn kucuk ikincil"
            aria-label={tt("Kapat")}
            onClick={() => {
              try {
                localStorage.setItem("bildim_hafta_okundu", gecenHafta.hafta);
              } catch { /* özel mod */ }
              setGecenHafta(null);
            }}
          >
            <Ikon ad="carpi" boyut={16} />
          </button>
        </div>
      )}

      {bildirimSor && <BildirimIzniSor />}

      <div className="dashboard">
        <div className="primary-column">

          {/* ---------- ANA EYLEM KARTI ---------- */}
          <section className="play-card">
            <div className="play-glow" aria-hidden="true" />
            <div className="play-copy">
              <span className="live-label"><i aria-hidden="true" /> {tt("HIZLI EŞLEŞME")}</span>
              <h2>{tt("Bilgini konuştur.")}<br /><strong>{tt("Tahtaya çık.")}</strong></h2>
              <p>{tt("Senin seviyendeki rakiplerle canlı mücadele.")}</p>
            </div>

            <div className="versus" aria-label={tt("Rakip eşleşmesi ön izlemesi")}>
              <div className="fighter you">
                <Avatar profile={profile} boyut={54} />
                <span>{tt("SEN")}</span>
              </div>
              <div className="vs-badge">VS</div>
              <div className="fighter mystery"><span>?</span><small>{tt("RAKİP")}</small></div>
            </div>

            {/* Kategori ve dereceli/serbest — ikisi de mevcut mekanizma:
                tercih_kategori (tercih_kategori_kaydet) ve dereceli tercihi
                (localStorage + profiles.dereceli_tercih). */}
            <div className="match-settings">
              <button
                type="button"
                className="setting"
                disabled={kategoriKaydediliyor}
                aria-haspopup="dialog"
                onClick={() => setKategoriSheet(true)}
              >
                <span className="setting-icon">
                  <KategoriIkon anahtar={profile?.tercih_kategori || "karisik"} boyut={20} />
                </span>
                <span>
                  <small>{tt("KATEGORİ")}</small>
                  <b>
                    {kategoriKaydediliyor
                      ? tt("Kaydediliyor…")
                      : profile?.tercih_kategori ? kategoriEtiket(profile.tercih_kategori) : tt("Karışık")}
                  </b>
                </span>
                <span className="chevron" aria-hidden="true">⌄</span>
              </button>

              <button
                type="button"
                className={`setting ranked${dereceliTercih ? "" : " serbest"}`}
                role="switch"
                aria-checked={dereceliTercih}
                onClick={() => setDereceliTercih(!dereceliTercih)}
              >
                <span className="setting-icon"><Ikon ad="kupa" boyut={20} /></span>
                <span>
                  <small>{tt("MAÇ TÜRÜ")}</small>
                  <b>{dereceliTercih ? ceviri("Dereceli") : ceviri("Serbest")}</b>
                </span>
                <span className={`switch${dereceliTercih ? " on" : ""}`} aria-hidden="true"><i /></span>
              </button>
            </div>

            <button className="play-button" onClick={() => setModSecimAcik(true)}>
              <span><Ikon ad="hizli" boyut={20} /></span> {tt("RAKİP BUL")} <b>→</b>
            </button>
            <div className="play-meta">
              <span>{dereceliTercih ? ceviri("Lig puanı + tam coin") : ceviri("Serbest — puan yok, coin yarı")}</span>
              <i aria-hidden="true" />
              <span>{KLASIK_JOKERLER.length} {tt("skill")}</span>
              <i aria-hidden="true" />
              <span>{tt("Canlı maç")}</span>
            </div>
            {mesaj && <div className="hata-kutu" style={{ marginTop: 10 }}>{mesaj}</div>}
          </section>

          {/* ---------- SENİ BEKLEYENLER ---------- */}
          <section className="section">
            <div className="section-head">
              <div>
                <span className="eyebrow">{tt("SIRA SENDE")}</span>
                <h2>{tt("Seni bekleyenler")}</h2>
              </div>
            </div>

            {siraSendeMaclar.map((m) => (
              <Link key={m.id} to={y("/mac/") + m.id} className="bd-devam-eden">
                <Ikon ad="saat" boyut={17} />
                <span>
                  <b>{m.rakipAd || tt("Rakibin")}</b> {tt("ile maçın yarım — sıra sende")}
                  {m.rakipBot && <span className="bd-satir-not">{tt("bot")}</span>}
                </span>
                <span className="ok" aria-hidden="true">›</span>
              </Link>
            ))}

            {siraSendeMaclar.length === 0 && bekleyenDavetlerim.length === 0 && (
              <div className="bd-devam-eden bd-bekleyen-bos">
                <Ikon ad="kilic" boyut={17} />
                <span>{tt("Şu an seni bekleyen maç yok.")}</span>
                <Link to={y("/meydan")} className="bd-bekleyen-bos-eylem">{tt("Arkadaşına meydan oku")}</Link>
              </div>
            )}

            {/* Gönderdiğim davetler: karşı taraf henüz cevaplamadı. */}
            {bekleyenDavetlerim.map((d) => (
              <div key={d.tur + d.kayit_id} className="bd-devam-eden bd-davet-bekliyor">
                <span className="bd-bekleme-nokta" aria-hidden="true" />
                <span>
                  {d.tur === "grup" || d.tur === "hizli" ? (
                    <>{tt("Davetin gönderildi —")} <b>{d.bekleyen_sayisi} {tt("kişi")}</b> {tt("bekleniyor")}</>
                  ) : (
                    <><b>{d.gorunen_ad || tt("Rakibin")}</b> {tt("daveti görmedi — bekleniyor")}</>
                  )}
                </span>
                {/* Fikir değişebilir: cevaplanmamış davet geri alınabilir. */}
                <button
                  type="button"
                  className="bd-davet-geri"
                  onClick={() => davetiGeriCek(d)}
                  disabled={geriCekilen === d.tur + d.kayit_id}
                  aria-label={tt("Daveti geri çek")}
                >
                  {geriCekilen === d.tur + d.kayit_id ? "…" : tt("Geri çek")}
                </button>
              </div>
            ))}
          </section>

          {/* ---------- OYUN MODLARI ----------
              Yalnız GERÇEKTEN VAR OLAN modlar. Dondurulmuş modlar (Hızlı Mod,
              "Hızlı Olan Kazanır") burada yoktur. */}
          <section className="section modes">
            <div className="section-head">
              <div>
                <span className="eyebrow">{tt("OYUN MODLARI")}</span>
                <h2>{tt("Nasıl oynamak istersin?")}</h2>
              </div>
              <button type="button" onClick={() => navigate(y("/modlar"))}>{tt("Tümünü gör")} →</button>
            </div>
            <div className="mode-grid">
              <button className="mode-card duel" onClick={() => navigate(y("/duello"))}>
                <span className="mode-icon"><Ikon ad="kilic" boyut={22} /></span>
                <span>
                  <b>{ceviri("Düello")}</b>
                  <small>{ceviri("Taktik Maçı")}</small>
                </span>
                <em>{MAC_ICI_JOKERLER.length + SALDIRI_JOKERLERI.length} {tt("JOKER")}</em>
              </button>

              {/* SAF BİLGİ: jokersiz Klasik Mod (Paket 31 B) — kodda var. */}
              <button className="mode-card pure" onClick={() => hemenOyna(dereceliTercih, true)}>
                <span className="mode-icon"><Ikon ad="soru" boyut={22} /></span>
                <span>
                  <b>{ceviri("Saf Bilgi")}</b>
                  <small>{ceviri("Skill yok. Sadece bilgi ve hız.")}</small>
                </span>
                <em>{tt("JOKERSİZ")}</em>
              </button>

              <button className="mode-card challenge" onClick={() => navigate(y("/meydan"))}>
                <span className="mode-icon"><Ikon ad="kisiler" boyut={22} /></span>
                <span>
                  <b>{tt("Meydan Oku")}</b>
                  <small>{tt("Arkadaşına davet gönder · tekli ya da grup")}</small>
                </span>
                <em>1V1</em>
              </button>

              <button className="mode-card practice" onClick={() => navigate(y("/calisma"))}>
                <span className="mode-icon"><Ikon ad="kitap" boyut={22} /></span>
                <span>
                  <b>{tt("Hatalarım")}</b>
                  <small>{tt("Kaçırdığın soruları çalış")}</small>
                </span>
                {bankaBekleyen > 0 && <em className="alert">{bankaBekleyen}</em>}
              </button>
            </div>
          </section>
        </div>

        <aside className="side-column">
          {/* ---------- TURNUVA ----------
              Saat ve geri sayım oyun_ayarlari.turnuva_saatleri'nden
              (lib/zaman.js). Prototipteki "Bu akşam · 20:00" sabiti KULLANILMADI. */}
          <section className={`tournament-card${canliTurnuva ? " canli" : ""}`}>
            <div className="trophy"><Ikon ad="kupa" boyut={30} /></div>
            <span className="event-label">
              {canliTurnuva ? tt("ŞU AN CANLI") : <TurnuvaSaatEtiketi />}
            </span>
            <h2>{tt("Turnuva")}</h2>
            <p>{tt("Son kalan oyuncu ol, büyük ödülü kap.")}</p>
            {canliTurnuva ? (
              <div className="bd-turnuva-canli">
                <span className="canli-nokta" />
                {tt("Şu an canlı")}
              </div>
            ) : (
              <Countdown bicim="prototip" />
            )}
            <div className="event-bottom">
              <span><b>{lobiSayisi}</b> {tt("oyuncu lobide")}</span>
              {canliTurnuva ? (
                <button onClick={() => navigate(y("/turnuva"))}>{tt("KATIL")}</button>
              ) : lobide ? (
                <button onClick={() => navigate(y("/turnuva"))}>{tt("LOBİDESİN")}</button>
              ) : (
                <button onClick={lobiyeKatil}>{tt("LOBİYE KATIL")}</button>
              )}
            </div>
            <BugunKalanTurnuvalar />
          </section>

          {/* ---------- GÜNLÜK GÖREVLER (gerçek: get_daily_quests) ---------- */}
          {gorevler.length > 0 && (
            <section className="side-card missions">
              <div className="side-title">
                <span>{tt("GÜNLÜK GÖREVLER")}</span>
                <b>{gorevler.filter((g) => g.alindi).length}/{gorevler.length}</b>
              </div>
              {(gorevlerAcik ? gorevler : gorevler.slice(0, 2)).map((g) => {
                const tamam = g.ilerleme >= g.hedef;
                return (
                  <div key={g.quest_id} className="mission">
                    <span className={`mission-icon${tamam ? "" : " orange"}`}>
                      <Ikon ad={tamam ? "tik" : "hizli"} boyut={14} />
                    </span>
                    <div>
                      <b>{ttSunucu(g.ad)}</b>
                      <small>{g.ilerleme}/{g.hedef}</small>
                    </div>
                    {g.alindi ? (
                      <strong>+{g.odul}</strong>
                    ) : tamam ? (
                      <button type="button" className="btn kucuk" onClick={() => odulAl(g.quest_id)}>
                        +{g.odul} {tt("al")}
                      </button>
                    ) : (
                      <strong>+{g.odul}</strong>
                    )}
                  </div>
                );
              })}
              {gorevler.length > 2 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setGorevlerAcik((a) => !a)}
                  aria-expanded={gorevlerAcik}
                >
                  {gorevlerAcik
                    ? tt("Daha az göster")
                    : hazirOdul > 0
                      ? tt("{0} ödül hazır!", { 0: hazirOdul })
                      : tt("Tüm görevleri gör →")}
                </button>
              )}
            </section>
          )}

          {/* ---------- LİG (gerçek: lig_grubum) ----------
              RÜTBE DEĞİL. Rütbe oyuncu şeridinde. */}
          <Link to={y("/siralama")} className="league-card">
            <div className="league-medal"><Ikon ad="kupa" boyut={20} /></div>
            <div>
              <span>{tt("HAFTALIK LİG")}</span>
              <b>{ligDurum ? `${LIG_ADLARI[ligDurum.lig] ?? ligDurum.lig} ${tt("Lig")}` : tt("Lig")}</b>
              <small>
                {ligDurum?.sira
                  ? tt("{0}/{1} · bitimine {2}", { 0: ligDurum.sira, 1: ligDurum.grupBoyu, 2: sureMetni(haftaKalan) })
                  : tt("Bitimine {0}", { 0: sureMetni(haftaKalan) })}
              </small>
            </div>
            <span className="ok" aria-hidden="true"><Ikon ad="ok" boyut={16} /></span>
          </Link>

          {/* ---------- DÜKKÂN KISAYOLU (20 Eyl 2026) ----------
              Joker ve coin buradan alınır. Alt menüdeki Dükkân sekmesi
              850 px üstünde gizlendiği için ana sayfada da açık bir giriş
              duruyor; coin hapı zaten doğrudan Coin sekmesine gidiyor. */}
          <Link to={y("/joker")} className="league-card bd-dukkan-kisayol">
            <div className="league-medal"><Ikon ad="hediye" boyut={20} /></div>
            <div>
              <span>{tt("DÜKKÂN")}</span>
              <b>{tt("Skill ve coin")}</b>
              <small>{tt("Skillerini tazele, coin kazan")}</small>
            </div>
            <span className="ok" aria-hidden="true"><Ikon ad="ok" boyut={16} /></span>
          </Link>
        </aside>
      </div>
    </div>
  );
}
