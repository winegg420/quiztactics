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
import Modal from "./Modal.jsx";
import DurumKutusu from "./DurumKutusu.jsx";
import Ikon from "./Ikon.jsx";
import RankBadge from "./RankBadge.jsx";
import { hataMesaji } from "../lib/hata.js";
import { bayrak } from "../lib/konum.js";
import KategoriProfili from "./KategoriProfili.jsx";
import { tt } from "../lib/dil.js";

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
  const eylemler = [
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

  return (
    <Modal onKapat={onKapat} etiket={tt("Oyuncu kartı")}>
      <div className="bd-modal bd-oyuncu-karti">
        <button type="button" className="bd-oyuncu-kapat" onClick={onKapat} aria-label={tt("Kapat")}>✕</button>

        <div className="bd-oyuncu-ust">
          <div className="bd-oyuncu-avatar">
            <AvatarCerceve profile={p ?? {}} boyut={96} userId={userId} />
            {online && <span className="bd-oyuncu-online" title={tt("Şu an oyunda")} />}
          </div>
          <div className="bd-oyuncu-ad">
            {p?.gorunen_ad ?? (yukleniyor ? "…" : tt("Oyuncu"))}
            {(p?.acik_bot ?? p?.is_bot) && (
              <span className="bd-bot-rozet" title={tt("Yapay rakip")}><Ikon ad="robot" boyut={13} /></span>
            )}
          </div>
          {p && <RankBadge puan={p.puan ?? 0} />}
          {p?.ulke && (
            <div className="bd-oyuncu-konum">{bayrak(p.ulke)} {p.sehir ?? ""}</div>
          )}
        </div>

        {hata && <div className="hata-kutu">{hata}</div>}

        {kartHata ? (
          <DurumKutusu durum="hata" kucuk onTekrar={() => setDeneme((n) => n + 1)} />
        ) : yukleniyor ? (
          <DurumKutusu durum="yukleniyor" kucuk satir={2} />
        ) : (<>
        <div className="bd-oyuncu-sayilar">
          <div><b>{Number(p?.puan ?? 0).toLocaleString("tr-TR")}</b><span>{tt("puan")}</span></div>
          <div><b>{Number(p?.toplam_mac ?? 0).toLocaleString("tr-TR")}</b><span>{tt("maç")}</span></div>
          <div><b>{Number(p?.sampiyonluk ?? 0).toLocaleString("tr-TR")}</b><span>{tt("kupa")}</span></div>
          <div><b>{Number(p?.seri_gun ?? 0).toLocaleString("tr-TR")}</b><span>{tt("gün seri")}</span></div>
        </div>

        {/* Kaç maç yaptı, kaç maçın istatistiği var, kategori yüzdeleri (Paket 14) */}
        <KategoriProfili userId={userId} kucuk />
        </>)}

        {eylemler.length > 0 && (
          <div className={`bd-oyuncu-eylemler${eylemler.length === 1 ? " tek" : ""}`}>
            {eylemler.map((e, i) => (
              <button
                key={e.kod}
                type="button"
                className={`btn${i === 0 ? "" : " ikincil"}`}
                disabled={Boolean(calisan) || e.pasif}
                aria-busy={calisan === e.kod}
                onClick={() => eylem(e.kod, e.f)}
              >
                <Ikon ad={e.ikon} boyut={16} /> {calisan === e.kod ? "…" : e.ad}
              </button>
            ))}
          </div>
        )}
        {oynaPasifNeden && (onOyna || onMeydanOku) && (
          <div className="bd-oyuncu-eylem-not" role="status">{oynaPasifNeden}</div>
        )}
        {bilgiNotu && <div className="bd-oyuncu-eylem-not" role="status">{bilgiNotu}</div>}
      </div>
    </Modal>
  );
}
