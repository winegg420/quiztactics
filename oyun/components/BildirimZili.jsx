import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../src/lib/supabase.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import Ikon from "./Ikon.jsx";
import DurumKutusu from "./DurumKutusu.jsx";
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

  const panel = (
    <>
      <div className="bd-zil-ortu" onClick={() => setAcik(false)} />
      <div
        className="bd-zil-liste"
        role="dialog"
        aria-label={tt("Bildirimler")}
        style={konum ? { top: konum.ust } : undefined}
      >
        {/* Paket 42 P.3: panelin kendi kapatma düğmesi (eskiden yalnız dışarı dokununca kapanıyordu) */}
        <div className="bd-zil-baslik">
          <span>{tt("Bildirimler")}</span>
          <button
            type="button"
            className="bd-zil-tumu"
            onClick={tumunuOku}
            disabled={tumuIsleniyor || toplam === 0}
            style={{
              marginLeft: "auto", minHeight: 44, padding: "0 10px", border: 0, borderRadius: 12,
              background: "transparent", color: toplam === 0 ? "var(--bd-metin-2)" : "var(--bd-vurgu, currentColor)",
              font: "inherit", fontSize: 13, fontWeight: 800, cursor: toplam === 0 ? "default" : "pointer",
              opacity: toplam === 0 ? 0.6 : 1, whiteSpace: "nowrap",
            }}
          >
            {tumuIsleniyor ? tt("İşaretleniyor…") : tt("Tümünü okundu say")}
          </button>
          <button type="button" className="bd-zil-kapat" onClick={() => setAcik(false)} aria-label={tt("Kapat")}>
            <Ikon ad="carpi" boyut={18} />
          </button>
        </div>
        {tumuHata && (
          <div className="hata-kutu" role="alert" style={{ margin: "4px 0 8px", fontSize: 13 }}>
            {tt("Okundu işaretlenemedi. Tekrar dene.")}
          </div>
        )}
        {dmOkunmamis > 0 && (
          <button
            className="bd-zil-satir"
            onClick={() => { setAcik(false); navigate(y("/mesajlar")); }}
          >
            <span className="ikon" aria-hidden="true"><Ikon ad="mesaj" boyut={18} /></span>
            <span className="govde">
              <span className="metin">{tt("{0} okunmamış mesaj", { 0: dmOkunmamis })}</span>
            </span>
          </button>
        )}
        {yuklemeHata ? (
          <DurumKutusu durum="hata" kucuk onTekrar={yukle} />
        ) : liste.length === 0 && dmOkunmamis === 0 ? (
          <div className="bd-zil-bos">
            {tt("Henüz bildirim yok.")}<br />
            {tt("Maç davetleri, lig hareketleri ve arkadaşlık istekleri burada görünür.")}
          </div>
        ) : (
          liste.map((b) => (
            <button
              key={b.id}
              className="bd-zil-satir"
              onClick={() => {
                setAcik(false);
                if (b.yol) navigate(b.yol);
              }}
            >
              <span className="ikon" aria-hidden="true"><Ikon ad={TIP_IKON[b.tip] ?? "zil"} boyut={18} /></span>
              <span className="govde">
                <span className="metin">{ttSunucu(b.metin)}</span>
                <span className="zaman">{zamanMetni(b.created_at)}</span>
              </span>
            </button>
          ))
        )}
      </div>
    </>
  );

  return (
    <div className="bd-zil-sarmal" ref={zilRef}>
      <button
        className="bd-zil circle-btn"
        onClick={ac}
        aria-label={`${tt("Bildirimler")}${toplam > 0 ? tt(", {0} okunmamış", { 0: toplam }) : ""}`}
      >
        <Ikon ad="zil" boyut={19} />
        {toplam > 0 && <span className="bd-zil-rozet dot">{toplam > 9 ? "9+" : toplam}</span>}
      </button>

      {acik && typeof document !== "undefined" && createPortal(panel, document.body)}
    </div>
  );
}
