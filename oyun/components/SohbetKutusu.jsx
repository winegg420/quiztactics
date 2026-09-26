import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../src/lib/supabase.js";
import AvatarCerceve from "./AvatarCerceve.jsx";
import OyuncuKarti from "./OyuncuKarti.jsx";
import { QtIkon, QtIkonDugme, QtDugme } from "../tasarim/index.js";
import "../tasarim/ekranlar/l-sosyal.css";
import EmojiSecici from "./EmojiSecici.jsx";
import { hataMesaji } from "../lib/hata.js";
import { dmTazele } from "../lib/mesajlar.js";
import { tt, aktifDil } from "../lib/dil.js";
import SikayetPenceresi, { EngelPenceresi, useIletisimDurumu } from "./SikayetPenceresi.jsx";
import "../tasarim/ekranlar/sikayet.css";

const UZUN_BAS_MS = 550;   // 620: gelen mesaja uzun basınca "Şikâyet et"

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  // D-220: adreste geçersiz / var olmayan kişi → "Sohbet bulunamadı" (boş "? …" başlıklı sohbet açılmasın)
  const [bulunamadi, setBulunamadi] = useState(() => !UUID_RE.test(String(kisiId ?? "")));
  const [deneme, setDeneme] = useState(0);
  const [yeniVar, setYeniVar] = useState(false);      // aşağıda okunmamış yeni mesaj şeridi
  const [emojiAcik, setEmojiAcik] = useState(false);
  const [kartAcik, setKartAcik] = useState(false);
  const [gorunum, setGorunum] = useState(null);       // { ust, yukseklik } — visualViewport
  // 620: engel / şikâyet / koşul kabulü — kararlar sunucuda (iletisim_durumu, tetikleyiciler)
  const [iletisim, iletisimYenile] = useIletisimDurumu(kisiId);
  const [pencere, setPencere] = useState(null);       // { tur: "sikayet" | "engel", mesaj? }
  const [kosulKabul, setKosulKabul] = useState(false);
  const uzunBas = useRef(null);

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
      if (!UUID_RE.test(String(kisiId ?? ""))) { setBulunamadi(true); setYukleniyor(false); return; }
      try {
        const [pr, ms] = await Promise.all([
          supabase.from("profiles").select("id, gorunen_ad, gorunen_avatar, gorunum").eq("id", kisiId).maybeSingle(),
          supabase.rpc("dm_sohbet", { p_kisi: kisiId, p_limit: SAYFA, p_once: null }),
        ]);
        if (ms.error) throw ms.error;
        if (!aktif) return;
        if (!pr.error) setKisi(pr.data ?? null);
        if (!pr.error && !pr.data) { setBulunamadi(true); return; }
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
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => { arkadasligiOku(); iletisimYenile(); })
      .subscribe();
    return () => supabase.removeChannel(kanal);
  }, [benId, kisiId, okunduIsaretle, arkadasligiOku, iletisimYenile]);

  // 620: Kullanım Koşulları kabulü (ilk mesajdan önce; sunucu kabulsüz mesajı reddeder)
  const kosullariKabulEt = async () => {
    setKosulKabul(true);
    setHata(null);
    try {
      const { error } = await supabase.rpc("kosullari_kabul_et");
      if (error) throw error;
      await iletisimYenile();
    } catch (e) {
      setHata(hataMesaji(e, tt("İşlem yapılamadı.")));
    } finally {
      setKosulKabul(false);
    }
  };

  // 620: gelen mesaja uzun bas (dokunmatik) ya da sağ tık → şikâyet
  const basmaBasla = (m) => {
    clearTimeout(uzunBas.current);
    uzunBas.current = setTimeout(() => setPencere({ tur: "sikayet", mesaj: m }), UZUN_BAS_MS);
  };
  const basmaBitti = () => clearTimeout(uzunBas.current);
  useEffect(() => () => clearTimeout(uzunBas.current), []);

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
      // 620: engel / kapatma / koşul kaynaklı red → durum yenilenir, uygun not çizilir
      if (/iletişim|kapatıldı|askıya|Koşulları/i.test(String(e?.message ?? ""))) iletisimYenile();
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

  if (bulunamadi) {
    return createPortal(
      <div className="ms-sohbet" style={stil} role="dialog" aria-label={tt("Sohbet bulunamadı")}>
        <header className="ms-ust">
          <QtIkonDugme ikon="geri" tur="saydam" etiket={tt("Geri")} onClick={onGeri} className="ms-geri" />
        </header>
        <div className="ms-liste">
          <div className="ms-ilk" role="status">
            <span className="ms-ilk-ikon" aria-hidden="true"><QtIkon ad="sohbet" boyut={32} /></span>
            <p>{tt("Bu sohbet bulunamadı.")}</p>
            <QtDugme ikon="geri" onClick={onGeri}>{tt("Mesajlara dön")}</QtDugme>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div className="ms-sohbet" style={stil} role="dialog" aria-label={tt("{0} ile sohbet", { 0: ad })}>
      <header className="ms-ust">
        <QtIkonDugme ikon="geri" tur="saydam" etiket={tt("Geri")} onClick={onGeri} className="ms-geri" />
        <button
          type="button"
          className="ms-kisi"
          onClick={() => setKartAcik(true)}
          aria-haspopup="dialog"
          aria-label={tt("{ad} profilini aç", { ad })}
        >
          <AvatarCerceve profile={kisi ?? {}} boyut={40} userId={kisiId} />
          <span className="ms-kisi-ad">{kisi?.gorunen_ad ?? "…"}</span>
          {/* Paket 42 J.3: dokununca profil açıldığını belli eden ok */}
          <QtIkon ad="ileri" boyut={18} className="ms-kisi-ok" />
        </button>
        {/* 620: engelle / şikâyet et */}
        <span className="ms-guvenlik">
          <QtIkonDugme ikon={iletisim?.engelledim ? "onay" : "kilit"} tur="saydam"
                       etiket={iletisim?.engelledim ? tt("Engeli kaldır") : tt("Engelle")}
                       onClick={() => setPencere({ tur: "engel" })} />
          <QtIkonDugme ikon="bayrak" tur="saydam" etiket={tt("Şikâyet et")} onClick={() => setPencere({ tur: "sikayet" })} />
        </span>
      </header>

      <div className="ms-liste" ref={listeRef} onScroll={kaydirildi} aria-live="polite">
        {eskiYukleniyor && <p className="ms-bilgi">{tt("Eski mesajlar yükleniyor…")}</p>}
        {gecmisHata && (
          <div className="ms-gecmis-hata" role="alert">
            <p>{tt("Yüklenemedi.")} {tt("Bağlantını kontrol edip tekrar dene.")}</p>
            <QtDugme tur="ikincil" boyut="k" ikon="yenile" onClick={() => setDeneme((n) => n + 1)}>
              {tt("Tekrar dene")}
            </QtDugme>
          </div>
        )}
        {/* Paket 42 J.1: arkadaş değilken "İlk mesajı sen at." çizilmez (alttaki "yeni mesaj gönderemezsin" ile çelişiyordu) */}
        {!yukleniyor && mesajlar.length === 0 && !hata && !gecmisHata && arkadas !== false && (
          <div className="ms-ilk">
            <span className="ms-ilk-ikon" aria-hidden="true"><QtIkon ad="sohbet" boyut={32} /></span>
            <p>{tt("İlk mesajı sen at.")}</p>
          </div>
        )}
        {yukleniyor && <p className="ms-bilgi" role="status">{tt("Yükleniyor…")}</p>}
        {mesajlar.map((m, i) => {
          const benden = m.gonderen_id === benId;
          const yeniGun = i === 0 || gunAnahtari(m.created_at) !== gunAnahtari(mesajlar[i - 1].created_at);
          return (
            <div key={m.id} className="ms-balon-grup">
              {yeniGun && <div className="ms-gun" role="separator"><span>{gunMetni(m.created_at)}</span></div>}
              <div className={`ms-balon-satir ${benden ? "ms-ben" : "ms-o"}`}>
                <div
                  className="ms-balon"
                  {...(benden ? {} : {
                    onPointerDown: () => basmaBasla(m), onPointerUp: basmaBitti, onPointerLeave: basmaBitti,
                    onPointerCancel: basmaBitti,
                    onContextMenu: (e) => { e.preventDefault(); basmaBitti(); setPencere({ tur: "sikayet", mesaj: m }); },
                    title: tt("Şikâyet etmek için basılı tut"),
                  })}
                >
                  <span className="ms-balon-metin">{m.metin}</span>
                  <span className="ms-balon-saat">{saatMetni(m.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {yeniVar && (
        <button type="button" className="ms-yeni" onClick={asagiIn}>
          {tt("Yeni mesaj")} <QtIkon ad="asagi" boyut={16} />
        </button>
      )}

      {hata && (
        <p className="ms-hata" role="alert">
          <QtIkon ad="uyari" boyut={16} /> <span>{hata}</span>
        </p>
      )}

      {iletisim && !iletisim.iletisim ? (
        <div className="ms-kapali" role="status">
          {iletisim.engelledim
            ? tt("Bu oyuncuyu engelledin — mesaj gönderilemez. Eski mesajlar burada kalır.")
            : tt("Bu oyuncuyla iletişim kuramazsın. Eski mesajlar burada kalır.")}
        </div>
      ) : iletisim?.mesaj_kapali ? (
        <div className="ms-kapali" role="status">{tt("Mesajlaşman kapatıldı.")}</div>
      ) : arkadas === false ? (
        <div className="ms-kapali" role="status">
          {tt("Artık arkadaş değilsiniz — yeni mesaj gönderemezsin. Eski mesajlar burada kalır.")}
        </div>
      ) : iletisim && !iletisim.kosullar_kabul ? (
        <div className="ms-kosul" role="region" aria-label={tt("Kullanım Koşulları")}>
          <p>
            {tt("Mesajlaşmadan önce Kullanım Koşulları'nı kabul etmelisin: hakaret, taciz, cinsel içerik, spam, hile ve kişisel bilgi paylaşımı yasak.")}{" "}
            <a href="/kosullar" target="_blank" rel="noopener">{tt("Kullanım koşulları")}</a>
          </p>
          <QtDugme tamGenislik ikon="onay" yukleniyor={kosulKabul} onClick={kosullariKabulEt}>
            {tt("Okudum, kabul ediyorum")}
          </QtDugme>
        </div>
      ) : (
        <div className="ms-alt">
          {emojiAcik && (
            <EmojiSecici onEkle={emojiEkle} onKapat={() => setEmojiAcik(false)} haricRef={emojiDugmeRef} />
          )}
          <div className="ms-giris">
            <button
              type="button"
              ref={emojiDugmeRef}
              className={`ms-emoji${emojiAcik ? " ms-emoji--acik" : ""}`}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => setEmojiAcik((a) => !a)}
              aria-label={tt("Emoji")}
              aria-expanded={emojiAcik}
            >
              <QtIkon ad="gulen" boyut={24} />
            </button>
            <textarea
              ref={girisRef}
              className="ms-metin"
              rows={1}
              maxLength={SINIR}
              value={metin}
              placeholder={tt("Mesaj yaz…")}
              aria-label={tt("Mesaj")}
              onChange={(e) => setMetin(e.target.value)}
              onKeyDown={tusBasildi}
            />
            <button
              type="button"
              className="ms-gonder"
              onClick={gonder}
              disabled={!temiz || gonderiliyor}
              aria-busy={gonderiliyor}
              aria-label={tt("Gönder")}
            >
              {gonderiliyor ? <span className="qt-donen" aria-hidden="true" /> : <QtIkon ad="gonder" boyut={22} />}
            </button>
          </div>
          {/* D-463: sınıra yaklaşınca (son 50 karakter) sayaç; maxLength yazarken 500'ü aştırmaz */}
          {metin.length > SINIR - 50 && (
            <div className={`ms-sayac${metin.length >= SINIR ? " ms-sayac--asti" : ""}`} aria-live="polite">{metin.length}/{SINIR}</div>
          )}
        </div>
      )}

      {kartAcik && (
        <OyuncuKarti userId={kisiId} onIzleme={kisi} onKapat={() => { setKartAcik(false); iletisimYenile(); }} />
      )}
      {pencere?.tur === "sikayet" && (
        <SikayetPenceresi kisiId={kisiId} kisiAd={ad} mesaj={pencere.mesaj ?? null} engelliMi={Boolean(iletisim?.engelledim)}
                          onKapat={() => setPencere(null)} onTamam={() => iletisimYenile()} />
      )}
      {pencere?.tur === "engel" && (
        <EngelPenceresi kisiId={kisiId} kisiAd={ad} engelliMi={Boolean(iletisim?.engelledim)}
                        onKapat={() => setPencere(null)} onTamam={() => { iletisimYenile(); arkadasligiOku(); }} />
      )}
    </div>,
    document.body
  );
}
