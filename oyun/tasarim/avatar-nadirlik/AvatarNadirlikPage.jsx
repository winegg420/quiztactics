// /avatar-nadirlik — avatar nadirliği işaretleme sayfası (30 Eyl 2026; migration 700).
// Menüde yok; SahipKapisi arkasında, sunucu da sahip ister (avatar_nitelik_yonetici). Tüm AKTİF avatarlar
// gruplara ayrılmış, gerçek çizimleriyle; her birinin altında 4 düğme — dokununca Sahne zemini anında o renge döner.
// Açılışta sunucudaki ÖN İŞARET (basit günlük = Yaygın, kostümlü = Nadir, hikâyeli = Epik, özel = Efsanevi).
// Seçimler veritabanına YAZILMAZ: bu tarayıcıda (localStorage) durur, "Kopyala" metni Ida'dan Claude'a gider.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../src/lib/supabase.js";
import { NADIRLIKLAR, NADIRLIK_AD, NADIRLIK_RENK, sahneyiBoya } from "../../../src/lib/avatarNadirlik.js";
import { aktifDil } from "../../lib/dil.js";
import "./avatar-nadirlik.css";

const EN = {
  "Avatar nadirliği": "Avatar rarity",
  "Her avatarın altındaki düğmeyle nadirliğini seç; zemin rengi anında değişir. Seçimlerin bu tarayıcıda durur, veritabanına yazılmaz.": "Pick each avatar's rarity with the buttons below it; the background changes instantly. Your choices stay in this browser and are not written to the database.",
  "Seri (isteğe bağlı)": "Series (optional)",
  "Kopyala": "Copy",
  "Kopyalandı — bana yapıştırabilirsin.": "Copied — you can paste it to me.",
  "Pano izin vermedi — aşağıdaki metni seçip kopyala.": "Clipboard blocked — select and copy the text below.",
  "Kopyalanacak metin": "Text to copy",
  "Ön işarete dön": "Reset to presets",
  "Bu sayfa yalnız sahibe açık": "This page is only for the owner",
  "Avatarlar yüklenemedi": "Avatars could not be loaded",
  "Tekrar dene": "Try again",
  "Ana sayfaya dön": "Back to home",
  "Yükleniyor…": "Loading…",
  "Hayvanlar": "Animals", "İnsanlar": "People", "Meslekler": "Jobs", "Kahramanlar": "Heroes",
  "Fantastik": "Fantasy", "Robotlar": "Robots", "Uzaylılar": "Aliens", "Uzay": "Space",
};
const trMi = () => aktifDil() !== "en";
const ts = (k) => (trMi() ? k : EN[k] ?? k);
const adi = (a) => (trMi() ? a.ad_tr : a.ad_en);
const nadirlikAdi = (n) => NADIRLIK_AD[n][trMi() ? "tr" : "en"];

const GRUPLAR = [
  ["hayvan", "Hayvanlar"], ["insan", "İnsanlar"], ["meslek", "Meslekler"], ["kahraman", "Kahramanlar"],
  ["fantastik", "Fantastik"], ["robot", "Robotlar"], ["uzayli", "Uzaylılar"], ["uzay", "Uzay"],
];

const YEREL_ANAHTAR = "bildim_avatar_nadirlik_secim";
function yerelOku() {
  try {
    const d = JSON.parse(window.localStorage.getItem(YEREL_ANAHTAR) || "{}");
    return d && typeof d === "object" ? d : {};
  } catch { return {}; }
}
function yerelYaz(d) {
  try { window.localStorage.setItem(YEREL_ANAHTAR, JSON.stringify(d)); } catch { /* gizli pencere: sessiz */ }
}

const svgAdresi = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export default function AvatarNadirlikPage() {
  const [durum, setDurum] = useState("yukleniyor");   // yukleniyor | hazir | sahip-degil | hata
  const [liste, setListe] = useState([]);
  const [svgler, setSvgler] = useState({});           // url → svg metni
  const [secim, setSecim] = useState({});             // url → { n: nadirlik, s: seri }
  const [kopyaNot, setKopyaNot] = useState("");
  const [kopyaMetni, setKopyaMetni] = useState("");

  const yukle = useCallback(async () => {
    setDurum("yukleniyor");
    try {
      const { data, error } = await supabase.rpc("avatar_nitelik_yonetici");
      if (error) throw error;
      const aktif = (Array.isArray(data) ? data : []).filter((a) => a.aktif);
      setListe(aktif);
      const yerel = yerelOku();
      setSecim(Object.fromEntries(aktif.map((a) => [a.url, {
        n: NADIRLIKLAR.includes(yerel[a.url]?.n) ? yerel[a.url].n : a.nadirlik,
        s: typeof yerel[a.url]?.s === "string" ? yerel[a.url].s : (a.seri ?? ""),
      }])));
      setDurum("hazir");
      // Çizimleri metin olarak oku: Sahne zemini anında boyanabilsin (tek tek; biri inmezse özgün <img> kalır)
      const ciftler = await Promise.all(aktif.map(async (a) => {
        try {
          const r = await fetch(a.url);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return [a.url, await r.text()];
        } catch (e) {
          console.error("[Bildim] avatar çizimi okunamadı:", a.url, e?.message ?? e);
          return [a.url, null];
        }
      }));
      setSvgler(Object.fromEntries(ciftler.filter(([, s]) => s)));
    } catch (e) {
      console.error("[Bildim] avatar-nadirlik:", e?.message ?? e);
      setDurum(/Yalnız sahip/.test(e?.message ?? "") ? "sahip-degil" : "hata");
    }
  }, []);
  useEffect(() => { yukle(); }, [yukle]);

  const degistir = (url, yama) => setSecim((s) => {
    const yeni = { ...s, [url]: { ...s[url], ...yama } };
    yerelYaz(yeni);
    return yeni;
  });
  const onIsaretDon = () => {
    const yeni = Object.fromEntries(liste.map((a) => [a.url, { n: a.nadirlik, s: a.seri ?? "" }]));
    setSecim(yeni);
    yerelYaz(yeni);
  };

  const sayac = useMemo(() => {
    const c = { yaygin: 0, nadir: 0, epik: 0, efsanevi: 0 };
    for (const a of liste) { const n = secim[a.url]?.n; if (n in c) c[n] += 1; }
    return c;
  }, [liste, secim]);

  const kopyala = async () => {
    const satir = (a) => {
      const s = (secim[a.url]?.s ?? "").trim();
      return `${adi(a)} → ${nadirlikAdi(secim[a.url]?.n)}${s ? ` (${s})` : ""}`;
    };
    const metin = [
      `Quiz Tactics — Avatar nadirlik işaretlerim (${new Date().toLocaleString("tr-TR")})`,
      NADIRLIKLAR.map((n) => `${nadirlikAdi(n)} ${sayac[n]}`).join(" · "),
      ...GRUPLAR.flatMap(([g, ad]) => {
        const alt = liste.filter((a) => a.grup === g);
        return alt.length ? ["", `# ${ts(ad)}`, ...alt.map(satir)] : [];
      }),
    ].join("\n");
    setKopyaMetni(metin);
    try {
      await navigator.clipboard.writeText(metin);
      setKopyaNot(ts("Kopyalandı — bana yapıştırabilirsin."));
    } catch (e) {
      console.warn("[Bildim] pano yazılamadı:", e?.message ?? e);
      setKopyaNot(ts("Pano izin vermedi — aşağıdaki metni seçip kopyala."));
    }
  };

  if (durum !== "hazir") {
    return (
      <div className="qt-sayfa an-sayfa">
        <div className="qt-sayfa-ic an-ic">
          <p className="an-durum" role="status">
            {durum === "yukleniyor" && ts("Yükleniyor…")}
            {durum === "sahip-degil" && ts("Bu sayfa yalnız sahibe açık")}
            {durum === "hata" && ts("Avatarlar yüklenemedi")}
          </p>
          {durum === "hata" && <button type="button" className="an-dugme-genis" onClick={yukle}>{ts("Tekrar dene")}</button>}
          {durum === "sahip-degil" && <Link className="an-dugme-genis" to="/">{ts("Ana sayfaya dön")}</Link>}
        </div>
      </div>
    );
  }

  return (
    <div className="qt-sayfa an-sayfa">
      <div className="qt-sayfa-ic an-ic">
        <header className="an-giris">
          <h1 className="an-baslik">{ts("Avatar nadirliği")}</h1>
          <p>{ts("Her avatarın altındaki düğmeyle nadirliğini seç; zemin rengi anında değişir. Seçimlerin bu tarayıcıda durur, veritabanına yazılmaz.")}</p>
        </header>

        <div className="an-sayac" role="status" aria-live="polite">
          {NADIRLIKLAR.map((n, i) => (
            <span key={n} className="an-sayac-oge">
              <i className="an-renk" style={{ background: NADIRLIK_RENK[n] }} aria-hidden="true" />
              {nadirlikAdi(n)} <b>{sayac[n]}</b>
              {i < NADIRLIKLAR.length - 1 && <span className="an-sayac-nokta" aria-hidden="true">·</span>}
            </span>
          ))}
        </div>

        {GRUPLAR.map(([g, ad]) => {
          const alt = liste.filter((a) => a.grup === g);
          if (!alt.length) return null;
          return (
            <section key={g} className="an-grup" aria-labelledby={`an-${g}`}>
              <h2 id={`an-${g}`} className="an-grup-baslik">{ts(ad)} · {alt.length}</h2>
              <div className="an-izgara">
                {alt.map((a) => {
                  const s = secim[a.url] ?? { n: a.nadirlik, s: "" };
                  const svg = svgler[a.url];
                  return (
                    <div key={a.url} className="an-kart">
                      <img className="an-avatar" alt={adi(a)} width="320" height="320" decoding="async"
                           loading="lazy" src={svg ? svgAdresi(sahneyiBoya(svg, s.n)) : a.url} />
                      <h3 className="an-ad">{adi(a)}</h3>
                      <div className="an-dugmeler" role="group" aria-label={adi(a)}>
                        {NADIRLIKLAR.map((n) => (
                          <button key={n} type="button" className="an-nadirlik" aria-pressed={s.n === n}
                                  style={{ "--an-renk": NADIRLIK_RENK[n] }} onClick={() => degistir(a.url, { n })}>
                            {nadirlikAdi(n)}
                          </button>
                        ))}
                      </div>
                      <input className="an-seri" type="text" maxLength={40} value={s.s}
                             placeholder={ts("Seri (isteğe bağlı)")} aria-label={`${adi(a)} — ${ts("Seri (isteğe bağlı)")}`}
                             onChange={(e) => degistir(a.url, { s: e.target.value })} />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {kopyaMetni && (
          <textarea className="an-kopya-metin" readOnly value={kopyaMetni} rows={12}
                    onFocus={(e) => e.target.select()} aria-label={ts("Kopyalanacak metin")} />
        )}

        <div className="an-alt">
          <p className="an-kopya-not" role="status" aria-live="polite">{kopyaNot}</p>
          <div className="an-alt-dugmeler">
            <button type="button" className="an-dugme-ikincil" onClick={onIsaretDon}>{ts("Ön işarete dön")}</button>
            <button type="button" className="an-dugme-genis" onClick={kopyala}>{ts("Kopyala")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
