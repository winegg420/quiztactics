import { useCallback, useEffect, useState } from "react";
import SenRozeti from "../components/SenRozeti.jsx";
import { hataMesaji, hataTuru, hataTuruMesaji } from "../lib/hata.js";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import RankBadge from "../components/RankBadge.jsx";
import SayanSayi from "../components/SayanSayi.jsx";
import KonumSecici from "../components/KonumSecici.jsx";
import { haftaBitisi, sureMetni } from "../lib/konum.js";
import Bayrak from "../components/Bayrak.jsx";
import OyuncuKarti from "../components/OyuncuKarti.jsx";
import { useArkadaslik } from "../lib/arkadaslik.js";
import AvatarCerceve from "../components/AvatarCerceve.jsx";
import OyuncuLigAmblemi from "../components/OyuncuLigAmblemi.jsx";
import { LigAmblemi } from "../tasarim/premium/ligAmblemi.jsx";
import { KartUnvani } from "../components/OyuncuVitrinKarti.jsx";
import IsimEfekti from "../components/IsimEfekti.jsx";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import {
  QtIkon, QtIkonDugme, QtDugme, QtSekmeler, QtCip, QtRozet, QtIlerleme,
  QtBosDurum, QtIskelet, QtModal,
} from "../tasarim/index.js";
// Tasarım A (Faz 2, şerit L): sayfa stilleri lig-a.css'te. Eski lig.css
// dosyası duruyor (Faz 4'te temizlenecek) ama bu sayfa artık onu yüklemiyor.
import "./lig-a.css";

// Lig adları oyun/lib/lig.js'e taşındı (Arayüz Yenileme, 20 Eyl 2026);
// buradan yeniden dışa verilir ki eski import'lar kırılmasın.
export { LIG_ADLARI } from "../lib/lig.js";
import { LIG_ADLARI } from "../lib/lig.js";

// Tasarım sistemindeki lig renkleri (--qt-lig-*) bu kodlarla eşleşir.
const LIG_KODLARI = ["bronz", "gumus", "altin", "elmas", "efsane"];

const KAPSAMLAR = [
  // Kademeli lig: oyuncunun kendi 25 kişilik grubu. İlk sekme bu —
  // haftalık yükselme/düşme burada oynanıyor.
  { id: "lig", ad: tt("Ligim"), ikon: "lig" },
  { id: "sehir", ad: tt("Şehir"), ikon: "sehir" },
  { id: "ulke", ad: tt("Ülke"), ikon: "bayrak" },
  { id: "global", ad: tt("Dünya"), ikon: "dunya" },
  { id: "arkadas", ad: tt("Arkadaş"), ikon: "kisiler" },
  // 646: Koleksiyon Puanı sıralaması (tüm zamanlar; yalnız statü)
  { id: "koleksiyon", ad: tt("Koleksiyoncular"), ikon: "yildiz" },
];

const DONEMLER = [
  { id: "hafta", ad: tt("Bu hafta") },
  { id: "tum_zamanlar", ad: tt("Tüm zamanlar") },
];

export default function LeaderboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [kapsam, setKapsam] = useState("lig");
  // Kendi lig grubumun üst bilgisi (lig adı, grup boyu, sınırlar, sezon sonu)
  const [grupBilgi, setGrupBilgi] = useState(null);
  const [donem, setDonem] = useState("hafta");
  const [liste, setListe] = useState([]);
  const [sehirSirasi, setSehirSirasi] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState(null);
  // Paket 41 A: sıralama okunamadıysa boş durum ("henüz kimse yarışmıyor") çizilmez
  const [listeHata, setListeHata] = useState(false);
  const [deneme, setDeneme] = useState(0);
  const [konumAc, setKonumAc] = useState(false);
  const [kalanHafta, setKalanHafta] = useState(() => haftaBitisi().getTime() - Date.now());

  const konumVar = Boolean(profile?.ulke && profile?.sehir);

  useEffect(() => {
    const id = setInterval(
      () => setKalanHafta(haftaBitisi().getTime() - Date.now()),
      60000
    );
    return () => clearInterval(id);
  }, []);

  // Kartı açık olan oyuncu (satıra dokununca açılır)
  const [kartOyuncu, setKartOyuncu] = useState(null);
  // Paket 35 C: kartta arkadaşsa "Mesaj at", değilse "Arkadaş ekle" — kararı sayfa verir
  const arkadaslik = useArkadaslik(user?.id);

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

  // Arkadaş sekmesi eski davranışını korur (profiles üzerinden).
  const arkadasListesi = useCallback(async () => {
    const { data: dostluklar, error } = await supabase
      .from("friendships")
      .select("requester, addressee")
      .eq("durum", "arkadas")
      .or(`requester.eq.${user.id},addressee.eq.${user.id}`);
    if (error) throw error;
    const idler = new Set([user.id]);
    (dostluklar ?? []).forEach((f) => {
      idler.add(f.requester);
      idler.add(f.addressee);
    });
    const kolon =
      donem === "hafta"
        ? "id, gorunen_ad, gorunen_avatar, gorunum, puan, puan_hafta, sampiyonluk, sehir, ulke"
        : "id, gorunen_ad, gorunen_avatar, gorunum, puan, sampiyonluk, sehir, ulke";
    const { data, error: hata2 } = await supabase
      .from("profiles")
      .select(kolon)
      .in("id", [...idler])
      .order(donem === "hafta" ? "puan_hafta" : "puan", { ascending: false });
    if (hata2) throw hata2;
    return (data ?? []).map((p, i) => ({
      sira: i + 1,
      user_id: p.id,
      gorunen_ad: p.gorunen_ad,
      gorunen_avatar: p.gorunen_avatar,
      gorunum: p.gorunum,
      puan: donem === "hafta" ? (p.puan_hafta ?? 0) : p.puan,
      sehir: p.sehir,
      ulke: p.ulke,
      ben: p.id === user.id,
    }));
  }, [user.id, donem]);

  useEffect(() => {
    let aktif = true;
    const yukle = async () => {
      setYukleniyor(true);
      setHata(null);
      setListeHata(false);
      setSehirSirasi(null);
      try {
        if (kapsam === "lig") {
          // Grup tablosu: TOPLAM oyuncu sayısı bilerek dönmüyor, oyuncu
          // yalnız kendi grubunu görür.
          const { data, error } = await supabase.rpc("lig_grubum");
          if (error) throw error;
          const satirlar = data ?? [];
          if (aktif) {
            setListe(satirlar);
            setGrupBilgi(satirlar[0] ?? null);
          }
        } else if (kapsam === "koleksiyon") {
          const { data, error } = await supabase.rpc("koleksiyon_siralama");
          if (error) throw error;
          if (aktif) setListe(data ?? []);
        } else if (kapsam === "arkadas") {
          const satirlar = await arkadasListesi();
          if (aktif) setListe(satirlar);
        } else {
          if ((kapsam === "sehir" || kapsam === "ulke") && !konumVar) {
            if (aktif) setListe([]);
            return;
          }
          const { data, error } = await supabase.rpc("lig_siralama", {
            p_kapsam: kapsam,
            p_donem: donem,
          });
          if (error) throw error;
          if (aktif) setListe(data ?? []);

          if (kapsam === "sehir") {
            const { data: sehirler, error: sHata } = await supabase.rpc(
              "sehir_lig_sirasi",
              { p_donem: donem }
            );
            if (!sHata && aktif) {
              setSehirSirasi((sehirler ?? []).find((s) => s.benim_sehrim) ?? null);
            }
          }
        }
      } catch (e) {
        if (aktif) {
          console.error("[Bildim] sıralama alınamadı:", e);
          setListe([]);
          setListeHata(hataTuruMesaji(hataTuru(e)) || true);
        }
      } finally {
        if (aktif) setYukleniyor(false);
      }
    };
    yukle();
    return () => {
      aktif = false;
    };
  }, [kapsam, donem, konumVar, arkadasListesi, deneme]);

  // Kendi sıram ve sezon bitişine kalan süre (kademeli lig pankartı için)
  const benimSiram = liste.find((s) => s.ben || s.user_id === user.id)?.sira ?? null;
  const kalanSezon = grupBilgi?.sezon_bitis
    ? new Date(grupBilgi.sezon_bitis).getTime() - Date.now()
    : 0;

  const benimSatirimHam = liste.find((s) => s.ben || s.user_id === user.id);
  // Kendi satırın zaten ilk 100'de görünüyorsa altta İKİNCİ KEZ sabitleme.
  const benimSatirim =
    benimSatirimHam && benimSatirimHam.sira > 100 ? benimSatirimHam : null;
  const ilk100 = liste.filter((s) => s.sira <= 100);
  // Kademeli ligde podyum yok: 25 kişilik grup düz bir tablo olarak okunur,
  // yükselme/düşme sınırları çizgiyle belli edilir.
  const podyum = kapsam === "lig" ? [] : ilk100.slice(0, 3);
  const kalanlar = ilk100.slice(3);

  // Tasarım A: kademeli ligin görsel bölgeleri. En üst ligde yükselme, en alt
  // ligde düşme yok — o çizgiler çizilmez. Grup boyu (oyuncu sayısı) EKRANA
  // YAZILMAZ; yalnız sınırı hesaplamak için kullanılır.
  const ligKod = LIG_KODLARI.includes(grupBilgi?.lig) ? grupBilgi.lig : "bronz";
  const yukselmeVar = kapsam === "lig" && grupBilgi && ligKod !== "efsane" && grupBilgi.yukselen > 0;
  const dusmeSiniri = grupBilgi ? grupBilgi.grup_boyu - grupBilgi.dusen : 0;
  const dusmeVar = kapsam === "lig" && grupBilgi && ligKod !== "bronz"
    && grupBilgi.dusen > 0 && dusmeSiniri > grupBilgi.yukselen;
  const bolge = (sira) => {
    if (yukselmeVar && sira <= grupBilgi.yukselen) return "yukselen";
    if (dusmeVar && sira > dusmeSiniri) return "dusen";
    return null;
  };
  const benimBolgem = benimSiram ? bolge(benimSiram) : null;
  // Pankart çubuğu: grupta ne kadar yukarıdasın (yüzde; sayı gösterilmez)
  const ustOran = grupBilgi && benimSiram
    ? Math.round(100 * (1 - (benimSiram - 1) / Math.max(1, grupBilgi.grup_boyu - 1)))
    : 0;
  const yukselmeIsaret = grupBilgi && yukselmeVar
    ? Math.round(100 * (1 - (grupBilgi.yukselen - 0.5) / Math.max(1, grupBilgi.grup_boyu - 1)))
    : null;

  const kartiAc = (s) => setKartOyuncu({
    id: s.user_id,
    gorunen_ad: s.gorunen_ad,
    gorunen_avatar: s.gorunen_avatar,
    gorunum: s.gorunum,
    puan: s.puan,
    is_bot: s.bot,
    sehir: s.sehir,
    ulke: s.ulke,
  });

  const satir = (s, vurgu = false) => {
    const benMi = s.user_id === user.id;
    const b = kapsam === "lig" ? bolge(s.sira) : null;
    return (
      <div
        key={`${s.user_id}-${vurgu ? "ben" : "liste"}`}
        role="listitem"
        className={`qt-satir-kap lg-satir-kap${benMi ? " qt-satir-kap--vurgulu lg-ben" : ""}${b ? ` lg-bolge-${b}` : ""}`}
      >
        <div className="lg-satir">
          <button
            type="button"
            className="lg-satir-ac"
            aria-label={tt("{0} — kartını aç", { 0: s.gorunen_ad })}
            onClick={() => kartiAc(s)}
          >
            <span className={`lg-sira qt-sayi${s.sira <= 3 ? ` lg-sira-${s.sira}` : ""}`}>{s.sira}</span>
            <AvatarCerceve
              profile={{ gorunen_ad: s.gorunen_ad, gorunen_avatar: s.gorunen_avatar, gorunum: s.gorunum }}
              boyut={40}
              userId={s.user_id}
            />
            <span className="lg-bilgi">
              <span className="lg-ad">
                <span className="lg-ad-metin"><IsimEfekti userId={s.user_id}>{s.gorunen_ad}</IsimEfekti></span>
                {/* 560: lig amblemi (satırda lig yoksa oyuncu kartından — avatarla aynı toplu çağrı) */}
                <OyuncuLigAmblemi lig={s.lig} userId={s.user_id} boyut={20} />
                {s.bot && (
                  <span className="lg-yapay" title={tt("Yapay rakip")}>
                    <QtIkon ad="robot" boyut={14} etiket={tt("Yapay rakip")} />
                  </span>
                )}
                {benMi && <SenRozeti />}
              </span>
              {/* 25 Eyl: unvan (tek oyuncu kartının küçük hâli; oyuncu_kartlari, avatarla aynı toplu çağrı).
                  D-506: kendi satırında — rütbe/konumla aynı satırda 52 px'e sıkışıp kesiliyordu. */}
              <span className="lg-unvan"><KartUnvani userId={s.user_id} /></span>
              <span className="lg-detay">
                <RankBadge level={s.level} userId={s.user_id} boyut={15} />
                {s.ulke && (
                  <span className="lg-konum">
                    <Bayrak kod={s.ulke} /> <span className="lg-konum-sehir">{s.sehir ?? ""}</span>
                  </span>
                )}
              </span>
            </span>
            <span className="lg-puan">
              <SayanSayi deger={s.puan} className="qt-sayi" />
              <span className="lg-puan-birim">{kapsam === "koleksiyon" ? tt("Koleksiyon") : tt("puan")}</span>
            </span>
          </button>
          {/* Kendi satırında kılıç yok; puan sütunu hizada kalsın diye boş yuva */}
          {benMi ? <span className="lg-meydan-bos" aria-hidden="true" /> : (
            <QtIkonDugme
              ikon="kilic"
              tur="saydam"
              className="lg-meydan"
              etiket={tt("{0} oyuncusuna meydan oku", { 0: s.gorunen_ad })}
              onClick={() => meydanOku(s.user_id)}
            />
          )}
        </div>
      </div>
    );
  };

  const sinirCizgisi = (tur) => (
    <div className={`lg-sinir lg-sinir-${tur}`} role="presentation">
      <QtIkon ad={tur === "yukselme" ? "ok" : "asagi"} boyut={20} />
      <span>{tur === "yukselme" ? tt("Yükselme hattı") : tt("Düşme hattı")}</span>
    </div>
  );

  const kapsamAdi = KAPSAMLAR.find((k) => k.id === kapsam)?.ad;

  return (
    <div className="lg-sayfa">
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

      {/* ---------- LİG PANKARTI (Tasarım A) ----------
          Bütün sayılar `lig_grubum`'dan: lig adı, sıram, sınırlar, sezon süresi.
          Grup boyu ve toplam oyuncu sayısı BİLEREK yazılmaz. */}
      {kapsam === "lig" && grupBilgi ? (
        <section className={`lg-pankart lg-pankart-${ligKod}`} aria-labelledby="lg-pankart-baslik">
          <div className="lg-pankart-ust">
            {/* 25 Eyl: lig arması = yeni lig amblemi (Fasetli Yıldız), vitrin boyu, üst ligler ışıldar */}
            <span className="lg-arma lg-arma--amblem" aria-hidden="true">
              <LigAmblemi lig={grupBilgi.lig} boyut={52} hareketli />
            </span>
            <div className="lg-pankart-metin">
              <h1 id="lg-pankart-baslik" className="qt-baslik-2">
                {tt("{lig} Ligi", { lig: LIG_ADLARI[grupBilgi.lig] ?? grupBilgi.lig })}
              </h1>
              <p className="lg-sure">
                <QtIkon ad="saat" boyut={20} />
                <span>{tt("Sezon bitimine {sure}", { sure: sureMetni(kalanSezon) })}</span>
              </p>
            </div>
          </div>
          <div className="lg-pankart-alt">
            <div className="lg-siram">
              <span className="lg-siram-etiket">{tt("Sıran")}</span>
              <b className="qt-sayi">{benimSiram ? `#${benimSiram}` : "—"}</b>
            </div>
            <div className="lg-durum">
              {benimSiram ? (
                benimBolgem === "yukselen" ? (
                  <QtRozet ton="dogru" ikon="ok">{tt("Yükselme bölgesindesin")}</QtRozet>
                ) : benimBolgem === "dusen" ? (
                  <QtRozet ton="yanlis" ikon="asagi">{tt("Düşme bölgesindesin")}</QtRozet>
                ) : (
                  <QtRozet ton="notr" ikon="kalkan">{tt("Güvendesin")}</QtRozet>
                )
              ) : (
                <QtRozet ton="notr">{tt("Henüz sıralamada değilsin")}</QtRozet>
              )}
            </div>
          </div>
          <QtIlerleme
            deger={ustOran}
            en={100}
            ton="mor"
            isaret={yukselmeIsaret ?? undefined}
            etiket={tt("Gruptaki yerin")}
          />
          <p className="lg-kural">
            {yukselmeVar && dusmeVar
              ? tt("İlk {0} yükselir, son {1} düşer.", { 0: grupBilgi.yukselen, 1: grupBilgi.dusen })
              : yukselmeVar
                ? tt("İlk {0} bir üst lige yükselir.", { 0: grupBilgi.yukselen })
                : dusmeVar
                  ? tt("Son {0} bir alt lige düşer.", { 0: grupBilgi.dusen })
                  : tt("Haftalık sezon")}
          </p>
        </section>
      ) : (
        <header className="lg-baslik">
          <h1 className="qt-baslik-1">{tt("Lig")}</h1>
          <p className="qt-soluk-zemin">{tt("Maç kazan, yüksel ve hafta sonunda sıranı gör.")}</p>
        </header>
      )}

      {hata && (
        <p className="lg-hata" role="alert">
          <QtIkon ad="uyari" boyut={18} /> {hata}
        </p>
      )}

      <QtSekmeler
        className="lg-sekmeler"
        etiket={tt("Sıralama türü")}
        sekmeler={KAPSAMLAR.map((k) => ({ kod: k.id, ad: k.ad, ikon: k.ikon }))}
        aktif={kapsam}
        onSec={setKapsam}
      />

      {/* Dönem seçimi yalnız gurur tablolarında anlamlı: kademeli lig zaten haftalık. */}
      {kapsam !== "lig" && kapsam !== "koleksiyon" && (
        <div className="lg-donem" role="group" aria-label={tt("Dönem")}>
          {DONEMLER.map((d) => (
            <QtCip key={d.id} secili={donem === d.id} onClick={() => setDonem(d.id)}>
              {d.ad}
            </QtCip>
          ))}
        </div>
      )}

      {kapsam !== "lig" && kapsam !== "koleksiyon" && donem === "hafta" && (
        <p className="lg-bilgi-serit">
          <QtIkon ad="saat" boyut={20} />
          <span>
            {tt("Hafta bitimine {sure} — ilk 3 rozet kazanır.", { sure: sureMetni(kalanHafta) })}
          </span>
        </p>
      )}

      {kapsam === "sehir" && sehirSirasi && (
        <p className="lg-bilgi-serit">
          <Bayrak kod={sehirSirasi.ulke} boyut={18} />
          <span>
            <b>{sehirSirasi.sehir}</b>{" "}
            {/* Oyuncu sayısı BİLEREK yazılmıyor: oyunun kalabalığı hiçbir
                ekranda açık edilmiyor (bkz. kademeli lig kuralları). */}
            {tt(donem === "hafta"
              ? "bu hafta ülkende {sira}. sırada ({sayi} şehir içinde) · {puan} puan"
              : "tüm zamanlarda ülkende {sira}. sırada ({sayi} şehir içinde) · {puan} puan",
              { sira: sehirSirasi.sira, sayi: sehirSirasi.sehir_sayisi, puan: sehirSirasi.toplam_puan })}
          </span>
        </p>
      )}

      <div id={`qt-panel-${kapsam}`} role="tabpanel" aria-label={kapsamAdi} className="lg-panel">
        {(kapsam === "sehir" || kapsam === "ulke") && !konumVar ? (
          <div className="qt-kart qt-kart--yuzey qt-kart--dolgu-o">
            <QtBosDurum
              ikon="haritaPini"
              baslik={tt("Şehir ve ülke ligleri için konumunu seç")}
              metin={tt("Hangi şehir için yarıştığını söyle, şehrinin ve ülkenin sıralamasına gir.")}
              eylem={<QtDugme ikon="haritaPini" onClick={() => setKonumAc(true)}>{tt("Şehrimi seç")}</QtDugme>}
            />
          </div>
        ) : yukleniyor ? (
          <div className="qt-liste lg-iskelet" aria-busy="true" role="status">
            <span className="qt-gizli">{tt("Yükleniyor…")}</span>
            <QtIskelet tur="satir" adet={6} />
          </div>
        ) : listeHata ? (
          <div className="qt-kart qt-kart--yuzey qt-kart--dolgu-o" role="alert">
            <QtBosDurum
              ikon="uyari"
              ton="yanlis"
              baslik={tt("Yüklenemedi.")}
              metin={typeof listeHata === "string" ? listeHata : tt("Bağlantını kontrol edip tekrar dene.")}
              eylem={<QtDugme tur="ikincil" ikon="yenile" onClick={() => setDeneme((n) => n + 1)}>{tt("Tekrar dene")}</QtDugme>}
            />
          </div>
        ) : ilk100.length === 0 ? (
          <div className="qt-kart qt-kart--yuzey qt-kart--dolgu-o">
            <QtBosDurum
              ikon="kupa"
              baslik={tt("Bu ligde henüz kimse yarışmıyor — ilk sırayı sen kap.")}
              eylem={<QtDugme ikon="oyna" onClick={() => navigate(y())}>{tt("Hemen oyna")}</QtDugme>}
            />
          </div>
        ) : ilk100.length === 1 && ilk100[0].user_id === user.id ? (
          <div className="qt-kart qt-kart--yuzey qt-kart--dolgu-o">
            <QtBosDurum
              ikon="kisiler"
              baslik={kapsam === "sehir"
                ? tt("Şehrinde ilk oyuncu sensin! Arkadaşlarını çağır, şehrini zirveye taşıyın.")
                : tt("Bu ligde şimdilik tek başınasın. Arkadaşlarını davet et.")}
              eylem={
                <div className="lg-eylemler">
                  <QtDugme ikon="kisiEkle" onClick={() => navigate(y("/arkadaslar"))}>{tt("Arkadaş davet et")}</QtDugme>
                  <QtDugme tur="ikincil" ikon="dunya" onClick={() => setKapsam("global")}>{tt("Dünya ligine bak")}</QtDugme>
                </div>
              }
            />
          </div>
        ) : (
          <>
            {podyum.length === 3 && (
              <ol className="lg-podyum" aria-label={tt("İlk üç")}>
                {[podyum[1], podyum[0], podyum[2]].map((p, i) => {
                  const basamak = [2, 1, 3][i];
                  return (
                    <li key={p.user_id} className={`lg-podyum-yer lg-yer-${basamak}${p.user_id === user.id ? " lg-ben" : ""}`}>
                      <button
                        type="button"
                        className="lg-podyum-dugme"
                        aria-label={tt("{0}. sıra: {1} — kartını aç", { 0: basamak, 1: p.gorunen_ad })}
                        onClick={() => kartiAc(p)}
                      >
                        <span className="lg-madalya qt-sayi" aria-hidden="true">{basamak}</span>
                        <AvatarCerceve
                          profile={{ gorunen_ad: p.gorunen_ad, gorunen_avatar: p.gorunen_avatar, gorunum: p.gorunum }}
                          boyut={basamak === 1 ? 64 : 52}
                          userId={p.user_id}
                        />
                        <span className="lg-podyum-ad">
                          <span className="lg-ad-metin"><IsimEfekti userId={p.user_id}>{p.gorunen_ad}</IsimEfekti></span>
                          <OyuncuLigAmblemi lig={p.lig} userId={p.user_id} boyut={20} />
                          {p.bot && (
                            <span className="lg-yapay" title={tt("Yapay rakip")}>
                              <QtIkon ad="robot" boyut={13} etiket={tt("Yapay rakip")} />
                            </span>
                          )}
                        </span>
                        {p.user_id === user.id && <SenRozeti />}
                        <span className="lg-podyum-puan qt-sayi"><SayanSayi deger={p.puan} /></span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}

            {(podyum.length === 3 ? kalanlar : ilk100).length > 0 && (
              <div className="qt-liste lg-liste" role="list"
                   aria-label={kapsam === "lig" && grupBilgi
                     ? tt("{lig} Ligi", { lig: LIG_ADLARI[grupBilgi.lig] ?? grupBilgi.lig })
                     : kapsamAdi}>
                {(podyum.length === 3 ? kalanlar : ilk100).map((s) => {
                  if (kapsam !== "lig" || !grupBilgi) return satir(s);
                  // Kademeli ligde sınır çizgileri: kimin yükseleceği ve
                  // kimin düşeceği listeye bakınca görünsün.
                  return [
                    satir(s),
                    yukselmeVar && s.sira === grupBilgi.yukselen
                      ? <div key={`cizgi-y-${s.user_id}`} role="listitem" className="lg-sinir-kap">{sinirCizgisi("yukselme")}</div>
                      : null,
                    dusmeVar && s.sira === dusmeSiniri
                      ? <div key={`cizgi-d-${s.user_id}`} role="listitem" className="lg-sinir-kap">{sinirCizgisi("dusme")}</div>
                      : null,
                  ];
                })}
              </div>
            )}
          </>
        )}

        {benimSatirim && !yukleniyor && (
          <div className="qt-liste lg-benim" role="list" aria-label={tt("Senin sıran")}>
            {satir(benimSatirim, true)}
          </div>
        )}
      </div>

      <QtModal acik={konumAc} onKapat={() => setKonumAc(false)} baslik={tt("Şehir seçimi")}>
        {konumAc && <KonumSecici mod="kart" onKapat={() => setKonumAc(false)} />}
      </QtModal>
    </div>
  );
}
