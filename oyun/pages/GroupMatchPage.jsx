import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QtBosDurum, QtCip, QtDugme, QtIkon, QtIkonDugme, QtListe, QtListeSatiri, QtModal, QtRozet } from "../tasarim/index.js";
import "../tasarim/ekranlar/m1-mac.css";
import "../tasarim/ekranlar/m1-sonuc.css";
import MacUstSerit from "../components/MacUstSerit.jsx";
import { TEPKILER, tepkiIkonu } from "../lib/tepkiler.js";
import SenRozeti from "../components/SenRozeti.jsx";
import YanlisSatiri from "../components/YanlisSatiri.jsx";
import OdulDokumu from "../components/OdulDokumu.jsx";
import MacSorulari from "../components/MacSorulari.jsx";
import SureDolduGecis from "../components/SureDolduGecis.jsx";
import MacSonuKutlama from "../components/MacSonuKutlama.jsx";
import CerceveliAvatar from "../components/CerceveliAvatar.jsx";
import { useMacSonuOzet, ozettenSahne } from "../lib/macSonuOzet.js";
import MacYukleniyor from "../components/MacYukleniyor.jsx";
import { hataMesaji } from "../lib/hata.js";
import { useGeriTusuOnayi } from "../lib/geriTusuOnayi.js";
import { useOyunModu } from "../lib/oyunModu.js";
import { soruCek } from "../lib/soruCek.js";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import AvatarDugmesi from "../components/AvatarDugmesi.jsx";
import OyuncuAdiDugmesi from "../components/OyuncuAdiDugmesi.jsx";
import QuestionCard from "../components/QuestionCard.jsx";
import { y } from "../lib/yol.js";
import { useGorunurlukTazele, zamanAsimiyla } from "../lib/gorunurluk.js";
import { useMacNabiz } from "../lib/nabiz.js";
import { HazirKapisi, KopukPerde } from "../components/MacHazirlik.jsx";
import { useDil } from "../lib/dilKanca.js";
import { GB_MS } from "../lib/geriBildirim.js";
import { tt } from "../lib/dil.js";

const GRUP_SECIMI = `*,
  katilimcilar:group_match_players(group_match_id, user_id, davet_durumu, skor, joined_at, hazir, terk_at,
    profil:profiles(id, gorunen_ad, gorunen_avatar, gorunum))`;

// Tepkiler artık SVG ikon (bkz. lib/tepkiler.js). Sunucuya giden metin aynı.
// Balonda gösterim: mesaj bir tepki emojisiyse ikonu, değilse metni çiz.
function balonIcerik(mesaj) {
  const ad = tepkiIkonu(mesaj);
  return ad ? <QtIkon ad={ad} boyut={20} /> : mesaj;
}
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

export default function GroupMatchPage() {
  const { id } = useParams();
  const { ceviri } = useDil();
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [mac, setMac] = useState(null);
  const [yuklemeHatasi, setYuklemeHatasi] = useState(null);
  const [soru, setSoru] = useState(null);
  // Soru bütün denemelere rağmen gelmedi mi? (sessiz donma yerine görünür hata)
  const [soruHatasi, setSoruHatasi] = useState(false);
  // "Tekrar dene" bunu artırır; soru çekme effect'i yeniden koşar.
  const [soruDeneme, setSoruDeneme] = useState(0);
  // Kendi son cevabımızın zamanı (geri bildirim penceresi için)
  const cevapZamaniRef = useRef(0);
  const [cevapladim, setCevapladim] = useState(false);
  const [jokerKullanildi, setJokerKullanildi] = useState({ elli: false, sure: false });
  const [jokerHata, setJokerHata] = useState(null);
  const [balonlar, setBalonlar] = useState({}); // { [user_id]: mesaj }
  const [kaliplarAcik, setKaliplarAcik] = useState(false);
  // Maç içi çıkış (X) onay kapısı — çıkış mantığı aynı, yalnız önce sorulur.
  const [cikisOnay, setCikisOnay] = useState(false);
  const advanceKilidi = useRef(false);
  // Süre doldu ama ilerletme henüz başarılı olmadı mı? Dönüşte hemen denenir.
  const bekleyenIlerletme = useRef(false);
  const pollRef = useRef(null);
  const kanalRef = useRef(null);
  // Kanal düştüğünde yeniden kurma zamanlayıcısı ve güncel kanalKur referansı
  const yenidenBaglaRef = useRef(null);
  const kanalKurRef = useRef(null);
  // Maç bitişinde sonuç ekranından önce 0.8 sn'lik "Maç bitti!" perdesi
  const [gecisBitti, setGecisBitti] = useState(false);
  // Paket 36: sonuç sahnesinin "Detay (n)" rozeti (YanlisSatiri sayar)
  const [yanlisAdet, setYanlisAdet] = useState(0);
  const [terkEttim, setTerkEttim] = useState(false);   // A.1: "Maçtan çık" → grup_mac_terk (anında terk)
  // A.3: yeni maç sonu sahnesinin verisi (tek çağrı: mac_sonu_ozet) — maç bitince bir kez okunur.
  const { ozet: macSonuOzet } = useMacSonuOzet(mac?.durum === "bitti" ? `grup:${id}` : null);
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
    const { error } = await supabase.rpc("send_group_match_message", { p_group_match_id: id, p_mesaj: mesaj });
    if (error) console.error("[Bildim] mesaj gönderilemedi:", error.message);
  };

  useEffect(() => {
    supabase
      .from("group_match_jokers")
      .select("tip")
      .eq("group_match_id", id)
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
    const { data, error } = await supabase.rpc("use_group_joker", {
      p_group_match_id: id,
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
    try {
      const { data, error } = await supabase
        .from("group_matches")
        .select(GRUP_SECIMI)
        .eq("id", id)
        .single();
      if (error) throw error;
      if (data) {
        setMac(data);
        setYuklemeHatasi(null);
      }
      return data;
    } catch (e) {
      console.error("[Bildim] grup maci yuklenemedi:", e);
      setYuklemeHatasi(hataMesaji(e, tt("Maç bilgisi alınamadı.")));
      return null;
    }
  }, [id]);

  const maciIptalEt = useCallback(async () => {
    try {
      await supabase.rpc("grup_mac_iptal", { p_group_match_id: id });
    } catch (e) {
      console.error("[Bildim] grup mac iptal:", e);
    }
    navigate(y("/meydan"));
  }, [id, navigate]);

  // Kanal kurulumu ayrı fonksiyonda: sekmeden dönüşte ölmüş soket yeniden kurulur.
  const kanalKur = useCallback(() => {
    const kanal = supabase
      .channel(`grup-mac-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "group_matches", filter: `id=eq.${id}` },
        () => macYukle()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_match_players", filter: `group_match_id=eq.${id}` },
        () => macYukle()
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "group_match_messages", filter: `group_match_id=eq.${id}` },
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
        if (durum === "CHANNEL_ERROR" || durum === "TIMED_OUT" || durum === "CLOSED") {
          console.warn("[Bildim] grup mac kanali dustu:", durum);
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
  }, [id, macYukle, balonGoster]);

  // Kanal izleyicisi kanalKur'u çağırabilsin (kanalKur kendi tanımına
  // referans veremediği için güncel hâli her render'da ref'e yazılır).
  kanalKurRef.current = kanalKur;

  useEffect(() => {
    macYukle();
    kanalKur();
    return () => {
      const eskiKanal = kanalRef.current;   // Paket 20 VI: CLOSED eşzamanlı gelir — önce ref boşalır, sonra kapanır
      kanalRef.current = null;
      if (eskiKanal) supabase.removeChannel(eskiKanal);
      if (yenidenBaglaRef.current) clearTimeout(yenidenBaglaRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [id, macYukle, kanalKur]);

  // Sekmeden dönünce: sunucudaki güncel durumu çek + Realtime kanalını yenile.
  // Ortak soru saati olduğu için istemci ekstra atlama tetiklemez; sunucudaki
  // aktif_soru neyse oradan devam edilir.
  useGorunurlukTazele(() => {
    macYukle();
    // Arka planda setTimeout donduğu için bekleyen ilerletme burada çalışır.
    if (bekleyenIlerletme.current) ilerletmeyiDene();
    try {
      const eskiKanal = kanalRef.current;   // Paket 20 VI: önce ref, sonra kapat
      kanalRef.current = null;
      if (eskiKanal) supabase.removeChannel(eskiKanal);
      kanalKur();
    } catch (e) {
      console.error('[Bildim] realtime yeniden kurulamadi:', e);
    }
  }, mac?.durum === 'aktif');

  // Soru değişince çek
  useEffect(() => {
    // Hazır kapısı açılmadan ve duraklatılmışken soru gösterilmez.
    if (!mac || mac.durum !== "aktif" || mac.aktif_soru < 0
      || !(mac.basladi ?? true) || mac.duraklatildi_at) {
      setSoru(null);
      return;
    }
    // Son cevaplayanın geri bildirimi (doğru şık) GB_MS boyunca kalsın: herkes
    // cevaplayınca sunucu soruyu anında ilerletiyor, yeni soru hemen basılınca
    // işaret ~300 ms'de siliniyordu (Paket 14, 5.2).
    const bekle = Math.max(0, GB_MS - (Date.now() - cevapZamaniRef.current));
    let iptal = false;
    let durdur = null;
    const zamanlayici = setTimeout(() => {
      if (iptal) return;
      advanceKilidi.current = false;
      bekleyenIlerletme.current = false;
      setCevapladim(false);
      setSoruHatasi(false);
      if (pollRef.current) clearInterval(pollRef.current);
      // PES ETMEYEN İSTEK (oyun/lib/soruCek.js) — Klasik maçtaki donma
      // hatasının aynısı buradaydı: tek deneme, hata olunca sessizce boş ekran.
      durdur = soruCek({
        rpcAdi: "get_group_match_question",
        param: { p_group_match_id: mac.id },
        onSoru: setSoru,
        onVazgecti: () => setSoruHatasi(true),
      });
    }, bekle);
    return () => { iptal = true; clearTimeout(zamanlayici); durdur?.(); };
  }, [mac?.id, mac?.durum, mac?.aktif_soru, mac?.soru_baslangic, mac?.basladi, mac?.duraklatildi_at, soruDeneme]);

  // ---- NABIZ ----
  // Hazır kapısı + varlık bildirimi (bkz. lib/nabiz.js). Biri ekrandan
  // ayrılınca sunucu maçı duraklatır; 45 sn dönmezse maçtan ayrılmış sayılır
  // ve maç kalanlarla sürer.
  const nabizParam = useMemo(() => ({ p_group_match_id: id }), [id]);
  const { nabiz, hazirla } = useMacNabiz("grup_mac_nabiz", nabizParam, Boolean(mac));

  const duraklatildi = Boolean(nabiz?.duraklatildi) && mac?.durum === "aktif";

  const oncekiNabizRef = useRef(null);
  useEffect(() => {
    if (!nabiz) return;
    const onceki = oncekiNabizRef.current;
    oncekiNabizRef.current = nabiz;
    if (!onceki) return;
    if (onceki.basladi !== nabiz.basladi
      || onceki.duraklatildi !== nabiz.duraklatildi
      || onceki.durum !== nabiz.durum
      || onceki.toplam_oyuncu !== nabiz.toplam_oyuncu) {
      macYukle();
    }
  }, [nabiz, macYukle]);

  // Maç bitince puan tazele
  useEffect(() => {
    if (mac?.durum === "bitti") {
      refreshProfile(user.id);
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [mac?.durum, refreshProfile, user.id]);

  // İlerletme: hata yutulmaz, kilit başarısızlıkta AÇILIR.
  // Eskiden .catch() bile yoktu; sekme arka plandayken RPC düşünce ilerleme
  // hiç olmuyor, advanceKilidi kapalı kaldığı için de bir daha denenmiyordu —
  // oyuncu döndüğünde ekran donuk kalıyordu.
  const ilerletmeyiDene = useCallback(async () => {
    try {
      const { error } = await zamanAsimiyla(
        supabase.rpc("advance_group_match", { p_group_match_id: id }),
        10000,
        "advance_group_match"
      );
      if (error) throw error;
      bekleyenIlerletme.current = false;
      await macYukle();
    } catch (e) {
      console.error("[Bildim] ilerletme basarisiz, yeniden denenecek:", e);
      advanceKilidi.current = false; // yeniden denenebilsin
      macYukle();
    }
  }, [id, macYukle]);

  const cevapla = async (i) => {
    const { data, error } = await supabase.rpc("submit_group_match_answer", {
      p_group_match_id: id,
      p_cevap: i,
      // 329: hangi soruyu cevapladığımız — soru değiştiyse (eski kart) sunucu reddeder.
      p_soru_index: soru?.soru_index ?? null,
    });
    if (error) throw error;
    cevapZamaniRef.current = Date.now();
    setCevapladim(true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(ilerletmeyiDene, 2500);
    return data?.[0];
  };

  // Süre dolunca ilerletme "bekleyen iş" olarak işaretlenir. Gecikme, aynı anda
  // yüzlerce istemcinin sunucuya yüklenmemesi için (mevcut davranış). Ama
  // setTimeout arka planda donduğundan, sekmeden dönüşte bekleyen iş varsa
  // gecikmeyi beklemeden çalıştırılır (bkz. useGorunurlukTazele).
  const sureDoldu = useCallback(() => {
    if (advanceKilidi.current) return;
    advanceKilidi.current = true;
    bekleyenIlerletme.current = true;
    setTimeout(() => {
      if (bekleyenIlerletme.current) ilerletmeyiDene();
    }, Math.random() * 800 + 1000);
  }, [ilerletmeyiDene]);

  const cevapVer = async (kabul) => {
    try {
      const { error } = await supabase.rpc("respond_group_challenge", {
        p_group_match_id: id,
        p_kabul: kabul,
      });
      if (error) throw error;
      macYukle();
    } catch (e) {
      console.error("[Bildim] grup daveti yanıtlanamadı:", e);
      setJokerHata(hataMesaji(e, tt("Davet yanıtlanamadı. Tekrar dene.")));
    }
  };

  useOyunModu(Boolean(soru) && mac?.durum === "aktif");

  // Ida (24 Eyl): maç sürerken geri tuşu da çıkış onayını açar (lobi/bekleme, bitmiş ya da terk edilmiş maç hariç).
  const grupKatilimim = (mac?.katilimcilar ?? []).find((k) => k.user_id === user?.id);
  const grupMacinda = Boolean(mac?.durum === "aktif" && (mac.basladi ?? true) && !terkEttim
    && grupKatilimim && !grupKatilimim.terk_at);
  useGeriTusuOnayi(grupMacinda, () => setCikisOnay(true));

  // Tepki şeridi (maç içi ve maç sonu aynı): tepkiler + hazır cümleler.
  const tepkiSeridi = (
    <>
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
    </>
  );

  // Maç sonu sahnesi dışındaki bütün dallar mor maç sahnesinde çizilir.
  const sahne = (icerik) => <div className="qt-sahne-mac m1-mac">{icerik}</div>;

  if (!mac) {
    return sahne(
      <MacYukleniyor
        hata={yuklemeHatasi}
        onTekrarDene={() => { setYuklemeHatasi(null); macYukle(); }}
        onIptal={maciIptalEt}
      />
    );
  }

  const katilimcilar = mac.katilimcilar ?? [];
  const benimKayit = katilimcilar.find((k) => k.user_id === user.id);
  const siraliSkor = [...katilimcilar]
    .filter((k) => k.davet_durumu === "kabul" && !k.terk_at)
    .sort((a, b) => b.skor - a.skor);

  /** Oyuncu satırı listesi (bekleme, hazır kapısı, sonuç dökümü ortak). */
  const oyuncuListesi = (liste, sag, siraNo = false) => (
    <QtListe etiket={tt("Oyuncular")}>
      {liste.map((k, i) => (
        <QtListeSatiri
          key={k.user_id}
          vurgulu={k.user_id === user.id}
          bas={
            <span className="m1-grup-bas">
              {siraNo && <span className="m1-grup-sira" aria-label={tt("{n}. sıra", { n: i + 1 })}>{i + 1}</span>}
              <AvatarDugmesi userId={k.user_id} profil={k.profil} kendi={k.user_id === user.id}>
                <AvatarCerceve profile={k.profil} boyut={36} userId={k.user_id} />
              </AvatarDugmesi>
            </span>
          }
          baslik={<><OyuncuAdiDugmesi userId={k.user_id} profil={k.profil}>{k.profil?.gorunen_ad}</OyuncuAdiDugmesi>{k.user_id === user.id && <SenRozeti />}</>}
          sag={sag(k)}
        />
      ))}
    </QtListe>
  );

  if (mac.durum === "bekliyor") {
    const bekleyenler = katilimcilar.filter((k) => k.davet_durumu === "bekliyor");
    return sahne(
      <div className="m1-mesaj">
        <span className="m1-mesaj-ikon" aria-hidden="true"><QtIkon ad="saat" boyut={36} /></span>
        <h1 className="qt-baslik-1">{tt("Grup maçı bekleniyor")}</h1>
        <p>
          {/* Paket 42 G.1: oyuncu kendi adını üçüncü şahıs gibi okumasın ("Deneme, Ayşe…" → "Sen ve Ayşe…") */}
          {(() => {
            if (!bekleyenler.length) return tt("Herkes hazır olunca maç otomatik başlayacak.");
            const ben = bekleyenler.some((b) => b.user_id === user.id);
            const digerleri = bekleyenler.filter((b) => b.user_id !== user.id).map((b) => b.profil?.gorunen_ad).join(", ");
            if (ben && digerleri) return tt("Sen ve {0} henüz kabul etmediniz.", { 0: digerleri });
            if (ben) return tt("Sen henüz kabul etmedin.");
            return tt("{0} henüz kabul etmedi.", { 0: digerleri });
          })()}
        </p>
        <div className="m1-grup-liste">
          {oyuncuListesi(katilimcilar, (k) => (
            <QtRozet boyut="k" ton={k.davet_durumu === "kabul" ? "dogru" : k.davet_durumu === "red" ? "yanlis" : "notr"}>
              {k.davet_durumu === "kabul" ? tt("Hazır") : k.davet_durumu === "red" ? tt("Reddetti") : tt("Bekliyor…")}
            </QtRozet>
          ))}
        </div>
        {jokerHata && <div className="m1-bant m1-bant--hata" role="alert"><span>{jokerHata}</span></div>}
        <div className="m1-dugmeler">
          {benimKayit?.davet_durumu === "bekliyor" && (
            <>
              <QtDugme tamGenislik ikon="onay" onClick={() => cevapVer(true)}>{tt("Kabul Et")}</QtDugme>
              <QtDugme tur="tehlike" tamGenislik ikon="carpi" onClick={() => cevapVer(false)}>{tt("Reddet")}</QtDugme>
            </>
          )}
          <QtDugme tur="hayalet" tamGenislik onClick={() => navigate(y("/meydan"))}>{tt("Geri dön")}</QtDugme>
        </div>
      </div>
    );
  }

  // Hazır kapısı: herkes kabul etti ama maç, HERKES "Hazır"a basana kadar
  // başlamaz — kimse yarı yolda maçın içine düşmesin.
  if (mac.durum === "aktif" && !(mac.basladi ?? true)) {
    return sahne(
      <HazirKapisi
        macTur="grup"
        benHazir={Boolean(nabiz?.ben_hazir)}
        hazirSayisi={nabiz?.hazir_sayisi ?? 0}
        toplamOyuncu={nabiz?.toplam_oyuncu ?? siraliSkor.length}
        // Paket 42 D.4: kendi adı "Sen" olarak yazılır (tek durum dili, Klasik ile aynı)
        bekleyenAdlar={(nabiz?.bekleyenler ?? []).map((ad) =>
          ad === siraliSkor.find((k) => k.user_id === user.id)?.profil?.gorunen_ad ? tt("Sen") : ad)}
        onHazir={hazirla}
        onCik={() => navigate(y("/meydan"))}
        tabela={
          <div className="m1-grup-liste">
            {/* Paket 41 M.1 / 42 D.4: satır durumu da sayaç gibi YALNIZ nabızdan (tek kaynak). */}
            {oyuncuListesi(siraliSkor, (k) => {
              const hazir = k.user_id === user.id
                ? Boolean(nabiz?.ben_hazir)
                : !(nabiz?.bekleyenler ?? []).includes(k.profil?.gorunen_ad);
              return <QtRozet boyut="k" ton={hazir ? "dogru" : "notr"}>{hazir ? tt("hazır") : tt("hazır değil")}</QtRozet>;
            })}
          </div>
        }
      />
    );
  }

  if (mac.durum === "iptal") {
    return sahne(
      <div className="m1-mesaj">
        <span className="m1-mesaj-ikon" aria-hidden="true"><QtIkon ad="carpi" boyut={36} /></span>
        <h1 className="qt-baslik-1">{tt("Grup maçı iptal edildi")}</h1>
        <p>{tt("Davetlilerden biri reddetti.")}</p>
        <div className="m1-dugmeler">
          <QtDugme tamGenislik onClick={() => navigate(y("/meydan"))}>{tt("Geri dön")}</QtDugme>
        </div>
      </div>
    );
  }

  // A.1: maçtan çıkan (ya da sunucunun terk saydığı) oyuncu ödülsüz, sade sahneyi görür.
  if (terkEttim || (benimKayit?.terk_at && mac.durum !== "iptal")) {
    return (
      <MacSonuKutlama
        terk="ben"
        mod="grup"
        karsilasma={
          <div className="msk-derece">
            <CerceveliAvatar profile={benimKayit?.profil} userId={user.id} boyut={88} />
          </div>
        }
        rovans={null}
        eylemler={{ onYeniMac: () => navigate(y("/meydan?bolum=grup")), onAnaSayfa: () => navigate(y()) }}
      />
    );
  }

  if (mac.durum === "bitti" && !gecisBitti) {
    return sahne(
      <SureDolduGecis
        baslik={tt("Maç bitti!")}
        skor={benimKayit?.skor ?? 0}
        skorEtiket={tt("puan")}
        kazandi={mac.kazanan === user.id}
        kaybetti={mac.kazanan !== null && mac.kazanan !== user.id}
        berabere={mac.kazanan === null}
        sessiz
        onBitti={() => setGecisBitti(true)}
      />
    );
  }

  if (mac.durum === "bitti") {
    if (!macSonuOzet) return <div className="msk-bekle" aria-busy="true" />;
    const kazandim = mac.kazanan === user.id;
    const berabere = mac.kazanan === null;
    const sahneVeri = ozettenSahne(macSonuOzet);
    // A.3 kararı: grup maçında orta sahnede kendi sonucun + derecen (N oyuncu arasında kaçıncı olduğun);
    // bütün sıralama Detay'da. Grup ödülsüz: coin/XP/lig yok, yalnız rozet ve görev.
    const derece = Math.max(1, siraliSkor.findIndex((k) => k.user_id === user.id) + 1);
    return (
      <MacSonuKutlama
        durum={berabere ? "berabere" : kazandim ? "kazandi" : "kaybetti"}
        mod="grup"
        baslik={berabere ? tt("BERABERE") : kazandim ? tt("ZAFER!") : tt("Maç bitti")}
        altYazi={ceviri("Arkadaş maçı — ödül ve puan yok.")}
        karsilasma={
          <div className="msk-derece">
            <CerceveliAvatar profile={benimKayit?.profil} userId={user.id} boyut={88} hareketli={kazandim} />
            <span className="msk-derece-sayi qt-sayi">{tt("{n}.", { n: derece })}</span>
            <span className="msk-derece-etiket">{tt("{t} oyuncu arasında · {p} puan", { t: siraliSkor.length, p: benimKayit?.skor ?? 0 })}</span>
          </div>
        }
        gorevler={sahneVeri.gorevler}
        rozetler={sahneVeri.rozetler}
        detayRozet={yanlisAdet}
        detay={
          <>
            {oyuncuListesi(siraliSkor, (k) => <b className="qt-sayi">{k.skor}</b>, true)}
            {/* Paket 20 I.3: ödülsüz mod — döküm yalnız açılan rozet + günlük görev ilerlemesini gösterir */}
            <OdulDokumu kaynak={`grup:${id}`} veri={macSonuOzet.dokum} gorevleriGoster={false} />
            <MacSorulari kaynak={`grup:${id}`} />
            <YanlisSatiri macTur="grup" macId={id} onAdet={setYanlisAdet} />
          </>
        }
        rovans={null}
        eylemler={{ onYeniMac: () => navigate(y("/meydan?bolum=grup")), onAnaSayfa: () => navigate(y()) }}
      >
        {/* MAÇ BİTTİ AMA OTURUM KAPANMAZ — herkes isterse kalıp konuşur. */}
        <p className="m1-ss-not">
          {tt("Maç bitti ama oturum açık: istersen burada kalıp konuşmaya devam edebilirsin. Çıkmak sana kalmış.")}
        </p>
        {tepkiSeridi}
      </MacSonuKutlama>
    );
  }

  // Aktif maç
  return sahne(
    <>
      {/* Bir oyuncu ekrandan ayrıldı: ekran kilitlenir, süre durur. */}
      {duraklatildi && (
        <KopukPerde bekleyenAdlar={nabiz?.bekleyenler ?? []} gecenSn={nabiz?.duraklama_sn ?? 0} />
      )}

      {/* Paket 41 B/E/H: Klasik ile aynı çıkış (X), mod rozeti ve ses */}
      <MacUstSerit onCik={() => setCikisOnay(true)} rozet={tt("Grup Maçı · ödülsüz")}
        oyuncu={{ id: profile?.id, ad: profile?.gorunen_ad ?? tt("Sen"), avatar: (profile?.gorunen_avatar ?? profile?.avatar_url) || null, level: profile?.level, lig: profile?.lig }}
        sayi={tt("{n} oyuncu", { n: siraliSkor.length })} />
      {/* Çıkış onayı. Sonuç sunucudan (grup_mac_nabiz): sayfadan çıkan oyuncunun nabzı
          12 sn kesilince maç herkes için duraklar; 45 sn içinde dönmezse terk_at yazılır,
          kazanan hesabına girmez ve maç kalanlarla sürer. Vazgeç'te hiçbir şey değişmez. */}
      <QtModal
        acik={cikisOnay}
        onKapat={() => setCikisOnay(false)}
        baslik={tt("Maçı yarıda bırakırsan ödül alamazsın.")}
        aciklama={tt("Çıkmak istiyor musun?")}
        altlik={
          <div className="m1-sat-dugmeler">
            {/* Ida (24 Eyl): "Oyunda kal" vurgulu ve varsayılan odak · "Çık" */}
            <QtDugme data-qt-ilk-odak onClick={() => setCikisOnay(false)}>{tt("Oyunda kal")}</QtDugme>
            <QtDugme tur="tehlike" onClick={async () => {
              setCikisOnay(false);
              // A.1 terk kuralı: sunucu anında terk yazar (grup_mac_terk, 460); diğerleri 45 sn beklemez.
              try {
                const { error } = await supabase.rpc("grup_mac_terk", { p_group_match_id: id });
                if (error) throw error;
                setTerkEttim(true);
              } catch (e) {
                console.error("[Bildim] grup maçından çıkılamadı:", e);
                navigate(y("/meydan"));
              }
            }}>
              {tt("Çık")}
            </QtDugme>
          </div>
        }
      />

      {/* Skor tablosu: kim önde, tek bakışta. Balonlar oyuncunun satırında. */}
      <div className="m1-grup-skor" role="list" aria-label={tt("Skor tablosu")}>
        {siraliSkor.map((k, i) => (
          <div key={k.user_id} role="listitem" className={`m1-grup-satir${k.user_id === user.id ? " m1-grup-satir--sen" : ""}`}>
            <span className="m1-grup-sira" aria-hidden="true">{i + 1}</span>
            <AvatarCerceve profile={k.profil} boyut={30} userId={k.user_id} />
            {/* Ajan C: ada dokununca oyuncu kartı (düğme satırda adın yerini alır: esnek) */}
            <OyuncuAdiDugmesi userId={k.user_id} profil={k.profil} className="m1-grup-ad" dugmeSinifi="ls-ad-dugme--esnek">{k.profil?.gorunen_ad}{k.user_id === user.id && <SenRozeti />}</OyuncuAdiDugmesi>
            {balonlar[k.user_id] && (
              <span className={`m1-balon${k.user_id === user.id ? "" : " m1-balon--rakip"} m1-grup-balon`}>
                {balonIcerik(balonlar[k.user_id])}
              </span>
            )}
            <b className="m1-grup-puan qt-sayi">{k.skor}</b>
          </div>
        ))}
      </div>

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
            <QtDugme onClick={() => { setSoruHatasi(false); setSoruDeneme((n) => n + 1); }}>
              {tt("Tekrar dene")}
            </QtDugme>
          }
        />
      )}

      {soru && (
        <QuestionCard
          // Key gösterilen soruya bağlı: aktif_soru ilerleyince kart eski soruyla
          // yeniden bindirilip geri bildirim silinmesin (Paket 14, 5.2).
          key={`${mac.id}-${soru.soru_index ?? mac.aktif_soru}`}
          soru={soru}
          onCevapla={cevapla}
          onSureDoldu={sureDoldu}
          macTur={"grup"}
          macId={id}
          kategori={mac.kategori}
          toplamSoru={mac.soru_ids?.length ?? null}
        />
      )}

      {cevapladim && (
        <div className="m1-bekleme" role="status">
          {tt("Diğer oyuncuların cevaplaması bekleniyor…")}
        </div>
      )}

      {/* Paket 42 G.2: tepki şeridi soru kartının ALTINDA (Klasik ile aynı). */}
      <div className="m1-alt">{tepkiSeridi}</div>
    </>
  );
}
