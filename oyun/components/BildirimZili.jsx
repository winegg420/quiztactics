import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { QtIkon, QtIkonDugme, QtDugme, QtListeSatiri } from "../tasarim/index.js";
import "../tasarim/ekranlar/l-kart.css";
import { y } from "../lib/yol.js";
import { tt, ttSunucu } from "../lib/dil.js";
import { useDmOkunmamis, dmTazele } from "../lib/mesajlar.js";

const TIP_IKON = {
  mac_daveti: "kilic",
  rovans: "kilic",
  grup_daveti: "kisiler",
  hizli_daveti: "hizli",
  duello_daveti: "kilic",
  duello_kabul: "ates",
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
  arkadas_istek: 0,
  ustalik: 1,
  lige_girdin: 1,
  hafta_sonuc: 1,
  arkadas_kabul: 1,
  davet_katildi: 1,
  davet_odul: 1,
  duello_kabul: 1,
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
    // D-459: tür önceliği (ONCELIK) sıralamayı bozuyordu ("19 · 21 · 29 · 5 · 15 dk önce"); artık en yeni en üstte.
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
  const toplam = okunmamis + dmOkunmamis;
  // Panel body'ye portallanır; konumu zil düğmesinin ekrandaki yerine göre hesaplanır.
  const zilRef = useRef(null);
  const [konum, setKonum] = useState(null);

  // Paket 41 A: okunamadıysa "Henüz bildirim yok" denmez
  const [yuklemeHata, setYuklemeHata] = useState(false);
  const yukle = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("bildirimler")
        .select("id, tip, metin, yol, okundu, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      setListe(okunmuslariSinirla(grupla(oncelikSirala(data ?? []))));
      setOkunmamis((data ?? []).filter((b) => !b.okundu).length);
      setYuklemeHata(false);
    } catch (e) {
      console.error("[Bildim] bildirimler alınamadı:", e);
      setYuklemeHata(true);
    }
  }, [user]);

  useEffect(() => {
    yukle();
    if (!user) return;
    const kanal = supabase
      .channel("bildirimlerim")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "bildirimler",
          filter: `user_id=eq.${user.id}`,
        },
        yukle
      )
      .subscribe();
    return () => supabase.removeChannel(kanal);
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
    if (yeniDurum && okunmamis > 0) {
      try {
        // supabase-js hatada reject ETMEZ; {error} dönen değerden okunur.
        const { error } = await supabase.rpc("bildirimleri_oku");
        if (error) throw error;
        setOkunmamis(0);
        setListe((l) => l.map((b) => ({ ...b, okundu: true })));
      } catch (e) { console.warn("[Bildim] bildirimleri_oku başarısız:", e?.message ?? e);
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
    if (okunmamis > 0) {
      try {
        const { error } = await supabase.rpc("bildirimleri_oku");
        if (error) throw error;
        setOkunmamis(0);
        setListe((l) => l.map((b) => ({ ...b, okundu: true })));
      } catch (e) {
        hataVar = true;
        console.warn("[Bildim] bildirimleri_oku başarısız:", e?.message ?? e);
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
        aria-label={tt("Bildirimler")}
        style={konum ? { top: konum.ust } : undefined}
      >
        {/* Paket 42 P.3: panelin kendi kapatma düğmesi */}
        <div className="bz-baslik">
          <h2 className="qt-baslik-3">{tt("Bildirimler")}</h2>
          <button
            type="button"
            className="bz-tumu"
            onClick={tumunuOku}
            disabled={tumuIsleniyor || toplam === 0}
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
          ) : liste.length === 0 && dmOkunmamis === 0 ? (
            <div className="bz-bos">
              <span className="bz-bos-ikon" aria-hidden="true"><QtIkon ad="zil" boyut={28} /></span>
              <p className="bz-bos-baslik">{tt("Henüz bildirim yok.")}</p>
              <p>{tt("Maç davetleri, lig hareketleri ve arkadaşlık istekleri burada görünür.")}</p>
            </div>
          ) : (
            liste.map((b) => (
              <QtListeSatiri
                key={b.id}
                ikon={TIP_IKON[b.tip] ?? "zil"}
                ikonTon={TIP_TON[b.tip] ?? "mor"}
                vurgulu={!b.okundu}
                baslik={<span className="bz-metin">{ttSunucu(b.metin)}</span>}
                alt={zamanMetni(b.created_at)}
                onClick={() => {
                  setAcik(false);
                  if (b.yol) navigate(b.yol);
                }}
              />
            ))
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="bz-sarmal" ref={zilRef}>
      <QtIkonDugme
        ikon="zil"
        etiket={tt("Bildirimler")}
        rozet={toplam > 0 ? toplam : undefined}
        aria-expanded={acik}
        aria-haspopup="dialog"
        onClick={ac}
      />
      {acik && typeof document !== "undefined" && createPortal(panel, document.body)}
    </div>
  );
}
