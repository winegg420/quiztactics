// ============================================================
// OYUNCU KARTI — listelerde bir isme dokununca açılan kart
//
// Lig tablosu ve turnuva lobisinde oyuncular sadece bir satırdı: kim olduğunu
// görmek, avatarına bakmak ya da oradan meydan okumak mümkün değildi.
// Artık satıra dokunmak bu kartı açıyor.
//
// Veri doğrudan `profiles`ten okunuyor (RLS'te select politikası herkese
// açık); yalnız HERKESE AÇIK alanlar gösteriliyor — gerçek ad, e-posta ve
// konum ayarları burada YOK.
// ============================================================
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import AvatarCerceve from "./AvatarCerceve.jsx";
import OyuncuLigAmblemi from "./OyuncuLigAmblemi.jsx";
import IsimEfekti, { useKartAlani } from "./IsimEfekti.jsx";
import { kozmetikTemasi } from "../lib/kozmetik.js";
import VitrinRozetleri from "./VitrinRozetleri.jsx";
import { QtModal, QtDugme, QtIkon, QtIskelet, sayiBicim } from "../tasarim/index.js";
import "../tasarim/ekranlar/l-kart.css";
import RankBadge from "./RankBadge.jsx";
import { hataMesaji } from "../lib/hata.js";
import Bayrak from "./Bayrak.jsx";
import KategoriProfili from "./KategoriProfili.jsx";
import { tt } from "../lib/dil.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import SikayetPenceresi, { EngelPenceresi, useIletisimDurumu } from "./SikayetPenceresi.jsx";
import "../tasarim/ekranlar/sikayet.css";

const ALANLAR =
  // `is_bot` BİLEREK YOK: gizli botlar gerçek oyuncudan ayırt edilmemeli
  // (kolon `authenticated` rolüne kapalı, bkz. migration 155). İstemci
  // yalnız `acik_bot` görür — adında "Bot" geçen, zaten belli olan botlar.
  "id, gorunen_ad, gorunen_avatar, gorunum, puan, sampiyonluk, toplam_mac, sehir, ulke, acik_bot, last_seen, seri_gun";

/**
 * @param {object} o
 * @param {string} o.userId       kartı açılacak oyuncu
 * @param {object} [o.onIzleme]   listede elimizde olan bilgi (kart boş açılmasın)
 * @param {() => void} o.onKapat
 * @param {(id:string) => void} [o.onMeydanOku]  verilmezse düğme çizilmez
 * Paket 35 C — kart "arkadaş mıyım" BİLMEZ; karar veren sayfadır. Verilmeyen prop'un düğmesi çizilmez:
 * @param {(id:string) => void|Promise} [o.onOyna]        "Oyna" → mod seçim penceresi (yalnız arkadaş)
 * @param {(id:string) => void|Promise} [o.onMesaj]       "Mesaj at" (yalnız arkadaş)
 * @param {(id:string) => void|Promise} [o.onArkadasEkle] "Arkadaş ekle" (arkadaş DEĞİLSE)
 * @param {string} [o.oynaPasifNeden] verilirse Oyna + Meydan oku pasif, sebebi kartta yazar
 *                                    (Paket 35 D: bu kişiye bekleyen meydan okuma var)
 * @param {string} [o.bilgiNotu]      eylemlerin altında kısa durum (ör. "Arkadaşlık isteği gönderildi")
 */
export default function OyuncuKarti({
  userId, onIzleme = null, onKapat, onMeydanOku, onOyna, onMesaj, onArkadasEkle, oynaPasifNeden = null,
  bilgiNotu = null,
}) {
  const [p, setP] = useState(onIzleme);
  const [hata, setHata] = useState(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [calisan, setCalisan] = useState(null);   // hangi eylem sürüyor ("…" + kilit)
  // Paket 41 A: kart verisi okunamazsa sahte "0 maç · 0 kupa" yerine hata + Tekrar dene
  const [kartHata, setKartHata] = useState(false);
  const [deneme, setDeneme] = useState(0);
  const vsTema = kozmetikTemasi(useKartAlani(userId, "vs_karti"));   // 540: VS kartı teması (oyuncu kartı, önbellekli)
  // 620: engel / şikâyet — kendi kartında yok; iletişim kararı sunucuda (iletisim_durumu)
  const { user } = useAuth();
  const baskasi = Boolean(user?.id && userId && user.id !== userId);
  const [iletisim, iletisimYenile] = useIletisimDurumu(userId, baskasi);
  const [pencere, setPencere] = useState(null);   // "sikayet" | "engel"
  const engelli = iletisim ? !iletisim.iletisim : false;

  // Eylem düğmesi: çalışırken metin "…", hepsi kilitli; hata kartın içinde yazar.
  const eylem = async (kod, f) => {
    if (calisan) return;
    setHata(null);
    setCalisan(kod);
    try {
      await f(userId);
    } catch (e) {
      setHata(hataMesaji(e, tt("İşlem yapılamadı.")));
    } finally {
      setCalisan(null);
    }
  };
  // Birincil: Oyna varsa o, yoksa Meydan oku — dolu turuncu; ötekiler ikincil
  // 620: engel varsa (hangi yönde olursa olsun) iletişim düğmeleri çizilmez
  const eylemler = engelli ? [] : [
    onOyna && { kod: "oyna", ikon: "oyna", ad: tt("Oyna"), f: onOyna, pasif: Boolean(oynaPasifNeden) },
    onMeydanOku && { kod: "meydan", ikon: "kilic", ad: tt("Meydan oku"), f: onMeydanOku, pasif: Boolean(oynaPasifNeden) },
    onMesaj && { kod: "mesaj", ikon: "mesaj", ad: tt("Mesaj at"), f: onMesaj },
    onArkadasEkle && { kod: "ekle", ikon: "arti", ad: tt("Arkadaş ekle"), f: onArkadasEkle },
  ].filter(Boolean);

  useEffect(() => {
    let aktif = true;
    setKartHata(false);
    setYukleniyor(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(ALANLAR)
          .eq("id", userId)
          .single();
        if (error) throw error;
        if (aktif && data) setP(data);
      } catch (e) {
        // Önizleme varsa kart yine de dolu görünür; sessiz kalmıyoruz.
        console.error("[Bildim] oyuncu karti alinamadi:", e);
        if (aktif) setKartHata(true);
      } finally {
        if (aktif) setYukleniyor(false);
      }
    })();
    return () => { aktif = false; };
  }, [userId, onIzleme, deneme]);

  const online = p?.last_seen && Date.now() - new Date(p.last_seen).getTime() < 120000;

  const sayi = (n) => sayiBicim(Number(n ?? 0));

  if (pencere === "sikayet") {
    return <SikayetPenceresi kisiId={userId} kisiAd={p?.gorunen_ad ?? tt("Oyuncu")} engelliMi={Boolean(iletisim?.engelledim)}
                             onKapat={() => setPencere(null)} onTamam={() => iletisimYenile()} />;
  }
  if (pencere === "engel") {
    return <EngelPenceresi kisiId={userId} kisiAd={p?.gorunen_ad ?? tt("Oyuncu")} engelliMi={Boolean(iletisim?.engelledim)}
                           onKapat={() => setPencere(null)} onTamam={() => iletisimYenile()} />;
  }

  return (
    <QtModal
      acik
      onKapat={onKapat}
      baslik={<span className="qt-gizli">{tt("Oyuncu kartı")}</span>}
      className="ok-kart"
      altlik={eylemler.length > 0 || oynaPasifNeden || bilgiNotu || baskasi ? (
        <div className="ok-altlik">
          {eylemler.length > 0 && (
            <div className={`ok-eylemler${eylemler.length === 1 ? " ok-eylemler--tek" : ""}`}>
              {eylemler.map((e, i) => (
                <QtDugme
                  key={e.kod}
                  tur={i === 0 ? "birincil" : "ikincil"}
                  ikon={e.ikon}
                  tamGenislik
                  yukleniyor={calisan === e.kod}
                  devreDisi={(Boolean(calisan) && calisan !== e.kod) || e.pasif}
                  onClick={() => eylem(e.kod, e.f)}
                >
                  {e.ad}
                </QtDugme>
              ))}
            </div>
          )}
          {oynaPasifNeden && (onOyna || onMeydanOku) && (
            <p className="ok-not" role="status">{oynaPasifNeden}</p>
          )}
          {bilgiNotu && <p className="ok-not" role="status">{bilgiNotu}</p>}
          {engelli && (
            <p className="ok-not" role="status">
              {iletisim?.engelledim ? tt("Bu oyuncuyu engelledin.") : tt("Bu oyuncuyla iletişim kuramazsın.")}
            </p>
          )}
          {baskasi && (
            <div className="ok-guvenlik">
              <button type="button" onClick={() => setPencere("engel")}>
                <QtIkon ad={iletisim?.engelledim ? "onay" : "kilit"} boyut={16} />
                {iletisim?.engelledim ? tt("Engeli kaldır") : tt("Engelle")}
              </button>
              <button type="button" onClick={() => setPencere("sikayet")}>
                <QtIkon ad="bayrak" boyut={16} /> {tt("Şikâyet et")}
              </button>
            </div>
          )}
        </div>
      ) : null}
    >
      <div className="ok-ust">
        <span className={"ok-avatar" + (vsTema ? " qt-vs qt-vs-bant" : "")} data-vs={vsTema ?? undefined}>
          <AvatarCerceve profile={p ?? {}} boyut={96} userId={userId} hareketli />
          {online && (
            <span className="ok-cevrimici" title={tt("Şu an oyunda")}>
              <span className="qt-gizli">{tt("Şu an oyunda")}</span>
            </span>
          )}
        </span>
        <p className="ok-ad">
          <span className="ok-ad-metin"><IsimEfekti userId={userId} hareketli>{p?.gorunen_ad ?? (yukleniyor ? "…" : tt("Oyuncu"))}</IsimEfekti></span>
          {/* 560: lig amblemi isim yanında (kart verisinden; toplu + önbellekli) */}
          {userId && <OyuncuLigAmblemi userId={userId} lig={p?.lig} boyut={22} />}
          {/* Yalnız açık bot (adında "Bot" geçen) işaretlenir; gizli bot asla (bkz. ALANLAR) */}
          {(p?.acik_bot ?? p?.is_bot) && (
            <span className="ok-yapay" title={tt("Yapay rakip")}>
              <QtIkon ad="robot" boyut={16} etiket={tt("Yapay rakip")} />
            </span>
          )}
        </p>
        <div className="ok-rozetler">
          {p && <RankBadge level={p.level} userId={p.id} />}
          {p?.ulke && (
            <span className="ok-konum"><Bayrak kod={p.ulke} boyut={16} /> {p.sehir ?? ""}</span>
          )}
        </div>
        {userId && <VitrinRozetleri userId={userId} boyut={36} className="ok-vitrin" />}
      </div>

      {hata && (
        <p className="ok-hata" role="alert"><QtIkon ad="uyari" boyut={16} /> <span>{hata}</span></p>
      )}

      {kartHata ? (
        <div className="ok-yuklenemedi" role="alert">
          <p>{tt("Yüklenemedi.")} {tt("Bağlantını kontrol edip tekrar dene.")}</p>
          <QtDugme tur="ikincil" boyut="k" ikon="yenile" onClick={() => setDeneme((n) => n + 1)}>
            {tt("Tekrar dene")}
          </QtDugme>
        </div>
      ) : yukleniyor ? (
        <div className="ok-sayilar" aria-busy="true">
          <QtIskelet tur="kart" adet={4} yukseklik={58} />
        </div>
      ) : (<>
        <dl className="ok-sayilar">
          <div><dt>{tt("puan")}</dt><dd className="qt-sayi">{sayi(p?.puan)}</dd></div>
          <div><dt>{tt("maç")}</dt><dd className="qt-sayi">{sayi(p?.toplam_mac)}</dd></div>
          <div><dt>{tt("kupa")}</dt><dd className="qt-sayi">{sayi(p?.sampiyonluk)}</dd></div>
          <div><dt>{tt("gün seri")}</dt><dd className="qt-sayi">{sayi(p?.seri_gun)}</dd></div>
        </dl>

        {/* Kaç maç yaptı, kaç maçın istatistiği var, kategori yüzdeleri (Paket 14) */}
        <KategoriProfili userId={userId} kucuk />
      </>)}
    </QtModal>
  );
}
