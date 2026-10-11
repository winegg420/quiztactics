import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { QtBosDurum, QtIkon, QtIkonDugme, QtDugme, QtListeSatiri } from "../tasarim/index.js";
import "../tasarim/ekranlar/l-kart.css";
import { y } from "../lib/yol.js";
import { tt } from "../lib/dil.js";
import { bildirimMetni } from "../lib/konum.js";
import { useDmOkunmamis, dmTazele } from "../lib/mesajlar.js";
import { bildirimDinle } from "../lib/bildirimKanali.js";
import PostaDetay from "./PostaDetay.jsx";
import {
  POSTA_GONDEREN, postaBaslik, odulBekliyor, postaRozetSayisi, postaKutusuOku, postaKutusuOkundu,
} from "../lib/posta.js";
import "../tasarim/ekranlar/posta.css";

const TIP_IKON = {
  mac_daveti: "kilic",
  rovans: "kilic",
  grup_daveti: "kisiler",
  hizli_daveti: "hizli",
  duello_daveti: "kilic",
  duello_kabul: "ates",
  kasa_daveti: "coin",   // 957
  kasa_kabul: "ates",
  lige_girdin: "sehir",
  gecildin: "hizli",
  hafta_sonuc: "kupa",
  arkadas_istek: "kisiEkle",
  arkadas_kabul: "kisiler",
  seri: "ates",
  seri_hatirlatma: "ates",
  sira_sende: "saat",
  ustalik: "madalya",
  davet_katildi: "hediye",
  davet_odul: "coin",
};

// Tasarım A: ikon kutusunun rengi (QtListeSatiri ikonTon). Renk tek başına anlam taşımaz; metin var.
const TIP_TON = {
  mac_daveti: "vurgu", rovans: "vurgu", duello_daveti: "vurgu", duello_kabul: "vurgu", hizli_daveti: "vurgu",
  kasa_daveti: "vurgu", kasa_kabul: "vurgu",
  grup_daveti: "dogru", arkadas_istek: "mor", arkadas_kabul: "mor",
  seri: "coin", seri_hatirlatma: "coin", hafta_sonuc: "coin", ustalik: "coin",
  lige_girdin: "dogru", gecildin: "yanlis", sira_sende: "bilgi",
  davet_katildi: "mor", davet_odul: "coin",
};

// Öncelik: meydan okuma > rozet/seviye > seri > sıra sende.
// (Bot maçlarında "sıra sende" artık hiç üretilmiyor — bkz. migration 075 —
//  ama gerçek rakiplerden gelenler de gerçek olayların üstüne çıkmasın.)
const ONCELIK = {
  mac_daveti: 0,
  rovans: 0,
  grup_daveti: 0,
  hizli_daveti: 0,
  duello_daveti: 0,
  kasa_daveti: 0,
  arkadas_istek: 0,
  ustalik: 1,
  lige_girdin: 1,
  hafta_sonuc: 1,
  arkadas_kabul: 1,
  davet_katildi: 1,
  davet_odul: 1,
  duello_kabul: 1,
  kasa_kabul: 1,
  seri: 2,
  seri_hatirlatma: 2,
  sira_sende: 3,
  gecildin: 3,
};
const oncelikNo = (tip) => (tip in ONCELIK ? ONCELIK[tip] : 2);

const oncelikSirala = (liste) =>
  [...liste].sort((a, b) => {
    // Okunmamışlar her zaman üstte
    if (Boolean(a.okundu) !== Boolean(b.okundu)) return a.okundu ? 1 : -1;
    // Aynı okunma durumunda önce önem grubu (0 = meydan okuma/davet en üstte), grup içinde en yeni üstte.
    // (D-459'daki "19 · 21 · 29 · 5 · 15 dk" karışıklığı yalnız farklı önem gruplarında, kasıtlı olarak kalır.)
    const fark = oncelikNo(a.tip) - oncelikNo(b.tip);
    if (fark !== 0) return fark;
    return new Date(b.created_at) - new Date(a.created_at);
  });

// Aynı türden birden fazla OKUNMAMIŞ bildirim varsa tek satırda toplanır.
const TOPLAMA = {
  sira_sende: { metin: (n) => tt("{0} maçta sıra sende", { 0: n }), yol: y("/meydan") },
  // Paket 42 P.1: okunmuş grupta "yeni" yanıltıcıydı ("2 yeni meydan okuma · 1 gün önce") → okunmusMetin
  mac_daveti: { metin: (n) => tt("{0} yeni meydan okuma", { 0: n }), okunmusMetin: (n) => tt("{0} meydan okuma", { 0: n }), yol: y("/meydan") },
  rovans: { metin: (n) => tt("{0} rövanş isteği", { 0: n }), yol: y("/meydan") },
  grup_daveti: { metin: (n) => tt("{0} grup maçı daveti", { 0: n }), yol: y("/meydan") },
  hizli_daveti: { metin: (n) => tt("{0} hızlı maç daveti", { 0: n }), yol: y("/meydan") },
  // Sunucu '/bildim/duello' yazar (migration 228); diğer türler gibi y() kökü kullanılır.
  duello_daveti: { metin: (n) => tt("{0} düello daveti", { 0: n }), yol: y("/duello") },
  // 957: Kasa davetleri Meydan sayfasında listelenir (yanıtla / reddet)
  kasa_daveti: { metin: (n) => tt("{0} Ortak Hazine daveti", { 0: n }), yol: y("/meydan") },
  seri: { metin: (n) => tt("{0} seri bildirimi", { 0: n }), yol: y() },
  arkadas_istek: { metin: (n) => tt("{0} arkadaşlık isteği", { 0: n }), yol: y("/arkadaslar") },
};

/** Tekrarları tek satıra indirger: okunmamışlar ve okunmuşlar AYRI gruplanır. */
function grupla(liste) {
  return gruplaOkunmus(gruplaOkunmamis(liste));
}

// Paket 37 C: okunmuş tekrarlar da kendi aralarında tek satıra iner (okunmamışla ASLA
// aynı satırda birleşmez; okunmamışlar yukarıda ayrıca toplanır).
function gruplaOkunmus(liste) {
  const sayac = new Map();
  for (const b of liste) {
    if (!b.okundu || !TOPLAMA[b.tip]) continue;
    sayac.set(b.tip, (sayac.get(b.tip) ?? 0) + 1);
  }
  const toplanan = new Set([...sayac.entries()].filter(([, n]) => n > 1).map(([t]) => t));
  if (toplanan.size === 0) return liste;

  const sonuc = [];
  const yazildi = new Set();
  for (const b of liste) {
    if (b.okundu && toplanan.has(b.tip)) {
      if (yazildi.has(b.tip)) continue;
      yazildi.add(b.tip);
      const n = sayac.get(b.tip);
      sonuc.push({
        ...b,
        id: `toplu-okundu-${b.tip}`,
        metin: (TOPLAMA[b.tip].okunmusMetin ?? TOPLAMA[b.tip].metin)(n),
        yol: TOPLAMA[b.tip].yol,
        okundu: true,
        adet: n,
      });
      continue;
    }
    sonuc.push(b);
  }
  return sonuc;
}

// Panelde en fazla bu kadar okunmuş satır çizilir (silinmez, yalnız gösterilmez).
const OKUNMUS_SATIR_SINIRI = 20;
function okunmuslariSinirla(liste) {
  let okunmus = 0;
  return liste.filter((b) => !b.okundu || ++okunmus <= OKUNMUS_SATIR_SINIRI);
}

/** Okunmamış tekrarları tek satıra indirger; okunmuşlara dokunmaz. */
function gruplaOkunmamis(liste) {
  const sayac = new Map();
  for (const b of liste) {
    if (b.okundu || !TOPLAMA[b.tip]) continue;
    sayac.set(b.tip, (sayac.get(b.tip) ?? 0) + 1);
  }
  const toplanan = new Set([...sayac.entries()].filter(([, n]) => n > 1).map(([t]) => t));
  if (toplanan.size === 0) return liste;

  const sonuc = [];
  const yazildi = new Set();
  for (const b of liste) {
    if (!b.okundu && toplanan.has(b.tip)) {
      if (yazildi.has(b.tip)) continue;
      yazildi.add(b.tip);
      const n = sayac.get(b.tip);
      sonuc.push({
        ...b,
        id: `toplu-${b.tip}`,
        metin: TOPLAMA[b.tip].metin(n),
        yol: TOPLAMA[b.tip].yol,
        adet: n,
      });
      continue;
    }
    sonuc.push(b);
  }
  return sonuc;
}

function zamanMetni(iso) {
  const fark = Date.now() - new Date(iso).getTime();
  const dk = Math.floor(fark / 60000);
  if (dk < 1) return tt("az önce");
  if (dk < 60) return tt("{0} dk önce", { 0: dk });
  const saat = Math.floor(dk / 60);
  if (saat < 24) return tt("{0} saat önce", { 0: saat });
  return tt("{0} gün önce", { 0: Math.floor(saat / 24) });
}

/** Üst çubuktaki bildirim zili: okunmamış sayısı + açılır liste. */
export default function BildirimZili() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [acik, setAcik] = useState(false);
  const [liste, setListe] = useState([]);
  const [okunmamis, setOkunmamis] = useState(0);
  // Paket 35 E: okunmamış direkt mesajlar zilde AYRICA sayılır (bildirimler tablosuna yazılmaz;
  // yazılsaydı çift sayılırdı). Zili açmak onları okundu yapmaz — sohbeti açmak yapar.
  const dmOkunmamis = useDmOkunmamis(user?.id);
  // 1060: posta kutusu — yönetim postaları (ödüllü / duyuru). Okunmamış + ödülü bekleyen sayılır.
  const [postalar, setPostalar] = useState([]);
  const [acikPosta, setAcikPosta] = useState(null);
  const postaSayisi = postaRozetSayisi(postalar);
  const odulVar = postalar.some(odulBekliyor);
  const postaOkunmamis = postalar.some((p) => !p.okundu);
  const toplam = okunmamis + dmOkunmamis + postaSayisi;
  // Panel body'ye portallanır; konumu zil düğmesinin ekrandaki yerine göre hesaplanır.
  const zilRef = useRef(null);
  const [konum, setKonum] = useState(null);

  // Paket 41 A: okunamadıysa "Henüz bildirim yok" denmez
  const [yuklemeHata, setYuklemeHata] = useState(false);
  const yukle = useCallback(async () => {
    if (!user) return;
    try {
      // 1060: tek çağrı — bildirimler + postalar (posta_kutusu)
      const { bildirimler: data, postalar: postaListe } = await postaKutusuOku();
      setListe(okunmuslariSinirla(grupla(oncelikSirala(data))));
      setOkunmamis(data.filter((b) => !b.okundu).length);
      setPostalar(postaListe);
      setYuklemeHata(false);
    } catch (e) {
      console.error("[Bildim] bildirimler alınamadı:", e);
      setYuklemeHata(true);
    }
  }, [user]);

  // Aşama 2: BildirimToast ile ortak tek kanal (lib/bildirimKanali).
  useEffect(() => {
    yukle();
    if (!user?.id) return undefined;
    return bildirimDinle(user.id, () => { yukle(); });
  }, [user, yukle]);

  // Panelin ekran konumunu zil düğmesine göre ölç (sticky/başlık bloğu panelin
  // yarısını kırpıyordu; artık panel body'ye taşınıp fixed konumlanıyor).
  const konumOlc = useCallback(() => {
    const el = zilRef.current;
    if (!el) return;
    try {
      const r = el.getBoundingClientRect();
      // Yalnız DİKEY konum ölçülür. Yatay yerleşim CSS'e bırakıldı: mobilde
      // panel iki kenardan 8px boşlukla gerilir, geniş ekranda sağa yaslanır.
      // (Zile göre sabit genişlik vermek dar ekranlarda paneli sola taşırıyordu.)
      setKonum({ ust: Math.max(8, r.bottom + 8) });
    } catch {
      setKonum({ ust: 64 });
    }
  }, []);

  useEffect(() => {
    if (!acik) return;
    konumOlc();
    window.addEventListener("resize", konumOlc);
    window.addEventListener("scroll", konumOlc, true);
    return () => {
      window.removeEventListener("resize", konumOlc);
      window.removeEventListener("scroll", konumOlc, true);
    };
  }, [acik, konumOlc]);

  const ac = async () => {
    const yeniDurum = !acik;
    if (yeniDurum) konumOlc();
    setAcik(yeniDurum);
    if (yeniDurum && (okunmamis > 0 || postaOkunmamis)) {
      try {
        // 1060: bildirimler + görünür postalar okundu (posta_kutusu_oku içinde bildirimleri_oku)
        await postaKutusuOkundu();
        setOkunmamis(0);
        setListe((l) => l.map((b) => ({ ...b, okundu: true })));
        setPostalar((l) => l.map((p) => ({ ...p, okundu: true })));
      } catch (e) { console.warn("[Bildim] posta_kutusu_oku başarısız:", e?.message ?? e);
        /* sessiz geç */
      }
    }
  };

  // "Tümünü okundu say": bildirimler (bildirimleri_oku) + okunmamış direkt
  // mesajlar (her sohbet için dm_okundu — sohbeti açınca çağrılan aynı RPC).
  // Zili açmak bildirimleri zaten okur; DM'ler yalnız burada ya da sohbette okunur.
  const [tumuIsleniyor, setTumuIsleniyor] = useState(false);
  const [tumuHata, setTumuHata] = useState(false);
  const tumunuOku = async () => {
    if (tumuIsleniyor) return;
    setTumuIsleniyor(true);
    setTumuHata(false);
    let hataVar = false;
    if (okunmamis > 0 || postaOkunmamis) {
      try {
        await postaKutusuOkundu();
        setOkunmamis(0);
        setListe((l) => l.map((b) => ({ ...b, okundu: true })));
        setPostalar((l) => l.map((p) => ({ ...p, okundu: true })));
      } catch (e) {
        hataVar = true;
        console.warn("[Bildim] posta_kutusu_oku başarısız:", e?.message ?? e);
      }
    }
    if (dmOkunmamis > 0) {
      try {
        const { data, error } = await supabase.rpc("dm_sohbetlerim");
        if (error) throw error;
        const kisiler = (data ?? []).filter((s) => Number(s.okunmamis) > 0).map((s) => s.kisi_id);
        const sonuclar = await Promise.all(
          kisiler.map((k) => supabase.rpc("dm_okundu", { p_kisi: k }))
        );
        const ilkHata = sonuclar.find((r) => r?.error)?.error;
        if (ilkHata) throw ilkHata;
      } catch (e) {
        hataVar = true;
        console.warn("[Bildim] mesajlar okundu işaretlenemedi:", e?.message ?? e);
      } finally {
        dmTazele();   // rozet sunucudaki gerçek sayıyı yeniden okusun
      }
    }
    setTumuHata(hataVar);
    setTumuIsleniyor(false);
  };

  // Esc paneli kapatır (klavye kullanıcısı için; odak zile döner)
  useEffect(() => {
    if (!acik) return undefined;
    const tus = (e) => {
      if (e.key === "Escape") {
        setAcik(false);
        zilRef.current?.querySelector("button")?.focus();
      }
    };
    document.addEventListener("keydown", tus);
    return () => document.removeEventListener("keydown", tus);
  }, [acik]);

  const panel = (
    <>
      <div className="bz-ortu" onClick={() => setAcik(false)} aria-hidden="true" />
      <div
        className="bz-panel"
        role="dialog"
        aria-label={tt("Posta kutusu")}
        style={konum ? { top: konum.ust } : undefined}
      >
        {/* Paket 42 P.3: panelin kendi kapatma düğmesi */}
        <div className="bz-baslik">
          <h2 className="qt-baslik-3">{tt("Posta kutusu")}</h2>
          <button
            type="button"
            className="bz-tumu"
            onClick={tumunuOku}
            disabled={tumuIsleniyor || (okunmamis + dmOkunmamis === 0 && !postaOkunmamis)}
          >
            {tumuIsleniyor ? tt("İşaretleniyor…") : tt("Tümünü okundu say")}
          </button>
          <QtIkonDugme ikon="carpi" tur="saydam" etiket={tt("Kapat")} onClick={() => setAcik(false)} />
        </div>
        {tumuHata && (
          <p className="bz-hata" role="alert">
            <QtIkon ad="uyari" boyut={16} /> <span>{tt("Okundu işaretlenemedi. Tekrar dene.")}</span>
          </p>
        )}
        <div className="bz-govde">
          {dmOkunmamis > 0 && (
            <QtListeSatiri
              ikon="mesaj"
              ikonTon="mor"
              vurgulu
              baslik={tt("{0} okunmamış mesaj", { 0: dmOkunmamis })}
              onClick={() => { setAcik(false); navigate(y("/mesajlar")); }}
            />
          )}
          {yuklemeHata ? (
            <div className="bz-bos" role="alert">
              <p>{tt("Yüklenemedi.")} {tt("Bağlantını kontrol edip tekrar dene.")}</p>
              <QtDugme tur="ikincil" boyut="k" ikon="yenile" onClick={yukle}>{tt("Tekrar dene")}</QtDugme>
            </div>
          ) : liste.length === 0 && dmOkunmamis === 0 && postalar.length === 0 ? (
            /* Ekran revizyonu: boş durum A (küçük sahne çizimi: uyuyan zil) */
            <QtBosDurum
              ikon="zil"
              gorsel="bildirimler"
              gorselTarz="sahne"
              className="bz-bos-gorsel"
              baslik={tt("Henüz bildirim yok")}
              metin={tt("Davetler ve maç haberleri burada çıkar.")}
              eylem={<QtDugme boyut="k" ikon="oyna" onClick={() => { setAcik(false); navigate(y()); }}>{tt("Maç yap")}</QtDugme>}
            />
          ) : (
            <>
            {/* 1060: yönetim postaları üstte; ödülü bekleyen en üstte (sunucu sıralar) */}
            {postalar.map((p) => {
              const bekliyor = odulBekliyor(p);
              const odullu = Array.isArray(p.oduller) && p.oduller.length > 0;
              return (
                <QtListeSatiri
                  key={`posta-${p.id}`}
                  kapSinif="bz-posta-satir"
                  ikon={odullu ? "hediye" : "bildirim"}
                  ikonTon={odullu ? "coin" : "vurgu"}
                  vurgulu={!p.okundu || bekliyor}
                  baslik={<span className="bz-metin">{postaBaslik(p)}</span>}
                  alt={`${POSTA_GONDEREN} · ${zamanMetni(p.olusturuldu)}`}
                  sag={bekliyor ? <span className="bz-posta-cip bz-posta-cip--odul">{tt("Ödül")}</span>
                    : odullu ? <span className="bz-posta-cip bz-posta-cip--alindi">{tt("Alındı")}</span> : null}
                  onClick={() => setAcikPosta(p.id)}
                />
              );
            })}
            {liste.map((b) => (
              <QtListeSatiri
                key={b.id}
                ikon={TIP_IKON[b.tip] ?? "zil"}
                ikonTon={TIP_TON[b.tip] ?? "mor"}
                vurgulu={!b.okundu}
                baslik={<span className="bz-metin">{bildirimMetni(b.metin)}</span>}
                alt={zamanMetni(b.created_at)}
                onClick={() => {
                  setAcik(false);
                  if (b.yol) navigate(b.yol);
                }}
              />
            ))}
            </>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className={`bz-sarmal${odulVar ? " bz-sarmal--altin" : ""}`} ref={zilRef}>
      <QtIkonDugme
        ikon="zil"
        etiket={tt("Posta kutusu")}
        rozet={toplam > 0 ? toplam : undefined}
        aria-expanded={acik}
        aria-haspopup="dialog"
        onClick={ac}
      />
      {acik && typeof document !== "undefined" && createPortal(panel, document.body)}
      {acikPosta && (
        <PostaDetay
          posta={postalar.find((p) => p.id === acikPosta)}
          onKapat={() => setAcikPosta(null)}
          onAlindi={(id, verilen) => setPostalar((l) => l.map((p) =>
            p.id === id ? { ...p, alindi: new Date().toISOString(), verilen, okundu: true } : p))}
        />
      )}
    </div>
  );
}
