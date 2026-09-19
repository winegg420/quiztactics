import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../src/lib/supabase.js";
import AvatarCerceve from "./AvatarCerceve.jsx";
import OyuncuKarti from "./OyuncuKarti.jsx";
import DurumKutusu from "./DurumKutusu.jsx";
import EmojiSecici from "./EmojiSecici.jsx";
import Ikon from "./Ikon.jsx";
import { hataMesaji } from "../lib/hata.js";
import { dmTazele } from "../lib/mesajlar.js";
import { tt, aktifDil } from "../lib/dil.js";

// ============================================================
// SOHBET KUTUSU — bire bir mesajlaşma ekranı (Paket 35 E.3.2)
//
// Tam ekran katman, body'ye PORTAL ile basılır: `.sayfa` altındaki giriş
// animasyonu (transform) `position: fixed` katmanı bozar (bkz. Modal.jsx ve
// CLAUDE.md › iOS Safari). Yükseklik visualViewport'tan okunur → klavye
// açılınca giriş alanı klavyenin üstünde kalır.
//
// Güvenlik: metin düz metin olarak basılır (React kaçırır, dangerouslySetInnerHTML
// YOK). Arkadaşlık kontrolü sunucuda (dm_gonder); arkadaş değilse giriş alanı
// kapanır ama eski mesajlar okunur.
// ============================================================
const SAYFA = 50;
const SINIR = 500;

const saatMetni = (iso) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
};

// Paket 42 J.2: gün ayırıcı — eski konuşmada hangi gün olduğu yalnız saatten anlaşılmıyordu
const gunAnahtari = (t) => { const d = new Date(t); return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; };
const gunMetni = (iso) => {
  try {
    const d = new Date(iso);
    const bugun = new Date();
    const dun = new Date(); dun.setDate(bugun.getDate() - 1);
    if (gunAnahtari(d) === gunAnahtari(bugun)) return tt("Bugün");
    if (gunAnahtari(d) === gunAnahtari(dun)) return tt("Dün");
    return d.toLocaleDateString(aktifDil() === "en" ? "en-GB" : "tr-TR", {
      day: "numeric", month: "short", ...(d.getFullYear() !== bugun.getFullYear() ? { year: "numeric" } : {}),
    });
  } catch {
    return "";
  }
};

export default function SohbetKutusu({ benId, kisiId, onGeri }) {
  const [kisi, setKisi] = useState(null);
  const [arkadas, setArkadas] = useState(null);      // null = bilinmiyor
  const [mesajlar, setMesajlar] = useState([]);      // eskiden yeniye
  const [yukleniyor, setYukleniyor] = useState(true);
  const [eskiYukleniyor, setEskiYukleniyor] = useState(false);
  const [bitti, setBitti] = useState(false);          // daha eski mesaj yok
  const [metin, setMetin] = useState("");
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [hata, setHata] = useState(null);
  // Paket 41 A: geçmiş okunamadıysa "İlk mesajı sen at" yerine hata + Tekrar dene (ham metin yok)
  const [gecmisHata, setGecmisHata] = useState(false);
  const [deneme, setDeneme] = useState(0);
  const [yeniVar, setYeniVar] = useState(false);      // aşağıda okunmamış yeni mesaj şeridi
  const [emojiAcik, setEmojiAcik] = useState(false);
  const [kartAcik, setKartAcik] = useState(false);
  const [gorunum, setGorunum] = useState(null);       // { ust, yukseklik } — visualViewport

  const listeRef = useRef(null);
  const girisRef = useRef(null);
  const emojiDugmeRef = useRef(null);
  const altta = useRef(true);                          // kullanıcı en altta mı
  const eskiYukseklik = useRef(null);                 // eski mesaj eklenince konumu korumak için
  const kaydirAlta = useRef(false);

  // ---- Klavye: katman görünen alan kadar (iOS'ta klavye layout viewport'u küçültmez)
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return undefined;
    const olc = () => setGorunum({ ust: vv.offsetTop, yukseklik: vv.height });
    olc();
    vv.addEventListener("resize", olc);
    vv.addEventListener("scroll", olc);
    return () => {
      vv.removeEventListener("resize", olc);
      vv.removeEventListener("scroll", olc);
    };
  }, []);

  // Arka plan kaymasın
  useEffect(() => {
    const govde = document.body;
    const eski = govde.style.overflow;
    govde.style.overflow = "hidden";
    return () => { govde.style.overflow = eski; };
  }, []);

  // ---- Okundu: sohbet açılınca ve açıkken gelen her mesajda
  const okunduIsaretle = useCallback(async () => {
    try {
      const { error } = await supabase.rpc("dm_okundu", { p_kisi: kisiId });
      if (error) throw error;
      dmTazele();
    } catch (e) {
      console.warn("[Bildim] dm_okundu:", e?.message ?? e);
    }
  }, [kisiId]);

  // ---- Kişi + arkadaşlık + ilk sayfa
  const arkadasligiOku = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("id")
        .eq("durum", "arkadas")
        .or(`and(requester.eq.${benId},addressee.eq.${kisiId}),and(requester.eq.${kisiId},addressee.eq.${benId})`)
        .limit(1);
      if (error) throw error;
      setArkadas((data ?? []).length > 0);
    } catch (e) {
      // Okunamazsa kutu açık kalır; kararı sunucu verir (dm_gonder reddeder).
      console.warn("[Bildim] arkadaşlık okunamadı:", e?.message ?? e);
      setArkadas(true);
    }
  }, [benId, kisiId]);

  useEffect(() => {
    let aktif = true;
    (async () => {
      setYukleniyor(true);
      setHata(null);
      setGecmisHata(false);
      try {
        const [pr, ms] = await Promise.all([
          supabase.from("profiles").select("id, gorunen_ad, gorunen_avatar, gorunum").eq("id", kisiId).maybeSingle(),
          supabase.rpc("dm_sohbet", { p_kisi: kisiId, p_limit: SAYFA, p_once: null }),
        ]);
        if (ms.error) throw ms.error;
        if (!aktif) return;
        if (!pr.error) setKisi(pr.data ?? null);
        const liste = [...(ms.data ?? [])].reverse();
        setMesajlar(liste);
        setBitti(liste.length < SAYFA);
        kaydirAlta.current = true;
      } catch (e) {
        console.error("[Bildim] sohbet geçmişi alınamadı:", e);
        if (aktif) setGecmisHata(true);
      } finally {
        if (aktif) setYukleniyor(false);
      }
    })();
    arkadasligiOku();
    okunduIsaretle();
    return () => { aktif = false; };
  }, [kisiId, arkadasligiOku, okunduIsaretle, deneme]);

  // ---- Realtime: bu kişiyle olan yeni mesajlar (iki yön) + arkadaşlık değişimi
  useEffect(() => {
    const ekle = (m) => {
      if (!m?.id) return;
      setMesajlar((l) => (l.some((x) => x.id === m.id) ? l : [...l, m]));
      if (m.gonderen_id === kisiId) {
        if (altta.current) kaydirAlta.current = true;
        else setYeniVar(true);
        okunduIsaretle();
      } else {
        kaydirAlta.current = true;   // kendi mesajın (başka sekmeden) — hep aşağı
      }
    };
    const kanal = supabase
      .channel(`dm-sohbet-${kisiId}-${Math.random().toString(36).slice(2, 7)}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "direkt_mesajlar", filter: `gonderen_id=eq.${kisiId}` },
        (p) => { if (p.new?.alici_id === benId) ekle(p.new); })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "direkt_mesajlar", filter: `alici_id=eq.${kisiId}` },
        (p) => { if (p.new?.gonderen_id === benId) ekle(p.new); })
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, arkadasligiOku)
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [benId, kisiId, okunduIsaretle, arkadasligiOku]);

  // ---- Kaydırma: yeni mesajda aşağı, eski mesaj eklenince konumu koru
  useLayoutEffect(() => {
    const el = listeRef.current;
    if (!el) return;
    if (eskiYukseklik.current !== null) {
      el.scrollTop += el.scrollHeight - eskiYukseklik.current;
      eskiYukseklik.current = null;
      return;
    }
    if (kaydirAlta.current) {
      el.scrollTop = el.scrollHeight;
      kaydirAlta.current = false;
      setYeniVar(false);
    }
  }, [mesajlar]);

  const eskileriYukle = async () => {
    if (eskiYukleniyor || bitti || mesajlar.length === 0) return;
    setEskiYukleniyor(true);
    try {
      const { data, error } = await supabase.rpc("dm_sohbet", {
        p_kisi: kisiId, p_limit: SAYFA, p_once: mesajlar[0].created_at,
      });
      if (error) throw error;
      const eski = [...(data ?? [])].reverse();
      if (eski.length < SAYFA) setBitti(true);
      if (eski.length) {
        eskiYukseklik.current = listeRef.current?.scrollHeight ?? null;
        setMesajlar((l) => [...eski.filter((m) => !l.some((x) => x.id === m.id)), ...l]);
      }
    } catch (e) {
      setHata(hataMesaji(e, tt("Eski mesajlar yüklenemedi.")));
    } finally {
      setEskiYukleniyor(false);
    }
  };

  const kaydirildi = () => {
    const el = listeRef.current;
    if (!el) return;
    altta.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    if (altta.current) setYeniVar(false);
    if (el.scrollTop < 40) eskileriYukle();
  };

  const asagiIn = () => {
    const el = listeRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setYeniVar(false);
  };

  // ---- Metin kutusu: 4 satıra kadar büyür, sonra kendi içinde kayar
  const boyutla = () => {
    const t = girisRef.current;
    if (!t) return;
    t.style.height = "auto";
    const satir = parseFloat(getComputedStyle(t).lineHeight) || 20;
    const dolgu = parseFloat(getComputedStyle(t).paddingTop) + parseFloat(getComputedStyle(t).paddingBottom);
    t.style.height = `${Math.min(t.scrollHeight, satir * 4 + dolgu)}px`;
  };
  useLayoutEffect(boyutla, [metin]);

  const emojiEkle = (em) => {
    const t = girisRef.current;
    const bas = t?.selectionStart ?? metin.length;
    const son = t?.selectionEnd ?? metin.length;
    const yeni = metin.slice(0, bas) + em + metin.slice(son);
    setMetin(yeni);
    // İmleç eklenen emojinin arkasına
    requestAnimationFrame(() => {
      try {
        const k = bas + em.length;
        t?.setSelectionRange(k, k);
      } catch { /* bazı tarayıcılar */ }
    });
  };

  const temiz = metin.trim();
  const gonder = async () => {
    if (!temiz || gonderiliyor) return;
    if (temiz.length > SINIR) {
      setHata(tt("Mesaj en fazla 500 karakter olabilir"));
      return;
    }
    setHata(null);
    setGonderiliyor(true);
    try {
      const { data, error } = await supabase.rpc("dm_gonder", { p_alici: kisiId, p_metin: temiz });
      if (error) throw error;
      setMetin("");
      kaydirAlta.current = true;
      if (data?.id) setMesajlar((l) => (l.some((x) => x.id === data.id) ? l : [...l, data]));
    } catch (e) {
      setHata(hataMesaji(e, tt("Mesaj gönderilemedi.")));
      // Arkadaşlık bitmişse kutu kapansın
      if (/arkadaşlarına/i.test(String(e?.message ?? ""))) setArkadas(false);
    } finally {
      setGonderiliyor(false);
    }
  };

  const tusBasildi = (e) => {
    // Masaüstü: Enter gönderir, Shift+Enter yeni satır. Dokunmatikte Enter yeni satırdır.
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing
        && window.matchMedia?.("(hover: hover)").matches) {
      e.preventDefault();
      gonder();
    }
  };

  const ad = kisi?.gorunen_ad ?? tt("Arkadaşın");
  const stil = gorunum ? { top: `${gorunum.ust}px`, height: `${gorunum.yukseklik}px` } : undefined;

  return createPortal(
    <div className="bd-sohbet" style={stil} role="dialog" aria-label={tt("{0} ile sohbet", { 0: ad })}>
      <header className="bd-sohbet-ust">
        <button type="button" className="bd-sohbet-geri" onClick={onGeri} aria-label={tt("Geri")}>
          <Ikon ad="geri" boyut={22} />
        </button>
        <button
          type="button"
          className="bd-sohbet-kisi"
          onClick={() => setKartAcik(true)}
          aria-haspopup="dialog"
          aria-label={tt("{ad} profilini aç", { ad })}
        >
          <AvatarCerceve profile={kisi ?? {}} boyut={36} userId={kisiId} />
          <span className="bd-sohbet-ad">{kisi?.gorunen_ad ?? "…"}</span>
          {/* Paket 42 J.3: dokununca profil açıldığını belli eden ok */}
          <span className="bd-sohbet-kisi-ok" aria-hidden="true">›</span>
        </button>
      </header>

      <div className="bd-sohbet-liste" ref={listeRef} onScroll={kaydirildi} aria-live="polite">
        {eskiYukleniyor && <div className="bd-sohbet-bilgi">{tt("Eski mesajlar yükleniyor…")}</div>}
        {gecmisHata && <DurumKutusu durum="hata" kucuk onTekrar={() => setDeneme((n) => n + 1)} />}
        {/* Paket 42 J.1: arkadaş değilken "İlk mesajı sen at." çizilmez (alttaki "yeni mesaj gönderemezsin" ile çelişiyordu) */}
        {!yukleniyor && mesajlar.length === 0 && !hata && !gecmisHata && arkadas !== false && (
          <div className="bd-sohbet-bilgi">{tt("İlk mesajı sen at.")}</div>
        )}
        {yukleniyor && <div className="bd-sohbet-bilgi">{tt("Yükleniyor…")}</div>}
        {mesajlar.map((m, i) => {
          const benden = m.gonderen_id === benId;
          const yeniGun = i === 0 || gunAnahtari(m.created_at) !== gunAnahtari(mesajlar[i - 1].created_at);
          return (
            <div key={m.id} className="bd-balon-grup">
            {yeniGun && <div className="bd-sohbet-gun" role="separator"><span>{gunMetni(m.created_at)}</span></div>}
            <div className={`bd-balon-satir ${benden ? "ben" : "o"}`}>
              <div className="bd-balon">
                <span className="bd-balon-metin">{m.metin}</span>
                <span className="bd-balon-saat">{saatMetni(m.created_at)}</span>
              </div>
            </div>
            </div>
          );
        })}
      </div>

      {yeniVar && (
        <button type="button" className="bd-sohbet-yeni" onClick={asagiIn}>
          {tt("Yeni mesaj")} ↓
        </button>
      )}

      {hata && <div className="bd-sohbet-hata" role="alert">{hata}</div>}

      {arkadas === false ? (
        <div className="bd-sohbet-kapali" role="status">
          {tt("Artık arkadaş değilsiniz — yeni mesaj gönderemezsin. Eski mesajlar burada kalır.")}
        </div>
      ) : (
        <div className="bd-sohbet-alt">
          {emojiAcik && (
            <EmojiSecici onEkle={emojiEkle} onKapat={() => setEmojiAcik(false)} haricRef={emojiDugmeRef} />
          )}
          <div className="bd-sohbet-giris">
            <button
              type="button"
              ref={emojiDugmeRef}
              className={`bd-sohbet-emoji${emojiAcik ? " acik" : ""}`}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setEmojiAcik((a) => !a)}
              aria-label={tt("Emoji")}
              aria-expanded={emojiAcik}
            >
              <Ikon ad="gulen" boyut={22} />
            </button>
            <textarea
              ref={girisRef}
              className="bd-sohbet-metin"
              rows={1}
              value={metin}
              placeholder={tt("Mesaj yaz…")}
              aria-label={tt("Mesaj")}
              onChange={(e) => setMetin(e.target.value)}
              onKeyDown={tusBasildi}
            />
            <button
              type="button"
              className={`bd-sohbet-gonder${gonderiliyor ? " calisiyor" : ""}`}
              onClick={gonder}
              disabled={!temiz || gonderiliyor}
              aria-busy={gonderiliyor}
              aria-label={tt("Gönder")}
            >
              {gonderiliyor ? <span className="bd-sohbet-donen" aria-hidden="true" /> : <Ikon ad="gonder" boyut={20} />}
            </button>
          </div>
          {temiz.length > SINIR - 50 && (
            <div className={`bd-sohbet-sayac${temiz.length > SINIR ? " asti" : ""}`}>{temiz.length}/{SINIR}</div>
          )}
        </div>
      )}

      {kartAcik && (
        <OyuncuKarti userId={kisiId} onIzleme={kisi} onKapat={() => setKartAcik(false)} />
      )}
    </div>,
    document.body
  );
}
