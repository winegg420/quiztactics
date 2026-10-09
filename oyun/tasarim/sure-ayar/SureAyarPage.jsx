// /sure-ayar — Düello + Ortak Hazine sunum sürelerinin ince ayarı (9 Eki 2026, Ida).
// Menüde yok; yalnız doğrudan adresle açılır, arama motorlarına kapalı (noindex + robots.txt).
// Seçimler YALNIZ BU TARAYICIDA (localStorage, lib/sureler.js); diğer oyuncular etkilenmez. "Seçimlerimi kopyala" tek JSON verir.
// "Oynat": sahne, oyundaki GERÇEK bileşeniyle taklit maç verisiyle telefon çerçevesinde oynar (sahneler.jsx), varsa sesiyle.
// Oynatıcıdaki kaydırıcı değişince sahne yeni süreyle hemen baştan oynar. "Hepsini sırayla oynat" 28 sahneyi art arda oynatır.
import { useEffect, useMemo, useRef, useState } from "react";
import { SURELER, sure, sureAyarla, sureleriSifirla, sureSecimleri, sureDinle, sureDeposuAcik } from "../../lib/sureler.js";
import { sesAcikMi, sesAyarla, sesKilidiAc } from "../../lib/ses.js";
import { sahneOlustur, girisSahnesi, GIRIS_VARSAYILAN, GIRIS_SINIR } from "./sahneler.jsx";
import { QtDugme, QtKart, sinif } from "../index.js";
import "./sure-ayar.css";

const MODLAR = [["duello", "Düello"], ["kasa", "Ortak Hazine"]];
const snYaz = (ms) => `${(ms / 1000).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} sn`;
const adim = (s) => (s.max - s.min > 2000 ? 50 : 10);
const GIRIS = "kasa_giris";   // sunucuya bağlı Hazine giriş sahnesi (yalnız önizleme; sureler.js'te yok)
const GIRIS_KAYIT = { anahtar: GIRIS, mod: "kasa", baslik: "Giriş sahnesi (sandık + 3-2-1)", aciklama: "Maç başında hazine düşer, hedef yazar, 3-2-1.",
  varsayilan: GIRIS_VARSAYILAN, oneri: GIRIS_SINIR.oneri, min: GIRIS_SINIR.min, max: GIRIS_SINIR.max, sunucu: true,
  not: "Süresi sunucuda: bu kaydırıcı yalnız önizlemeyi değiştirir, oyuna yazılmaz ve kopyalanan seçimlere girmez." };

/** Bir sahne tanımı: kayıt (sureler.js satırı) + seçili değer. */
function tanim(anahtar, girisMs) {
  return anahtar === GIRIS ? girisSahnesi(girisMs) : sahneOlustur(anahtar);
}

/** Tek oynatma: on + sure + kuyruk; ses zamanlayıcıları sahne ömrüne bağlı. Bitince son karede kalır. */
function Sahne({ anahtar, deger, girisMs, bitti }) {
  const t = useMemo(() => tanim(anahtar, girisMs), []);   // eslint-disable-line react-hooks/exhaustive-deps
  const ctx = useMemo(() => ({ t0: Date.now(), id: `${anahtar}-${Date.now()}` }), []);   // eslint-disable-line react-hooks/exhaustive-deps
  const on = t.on ?? 0;
  const toplam = on + t.sure + (t.kuyruk ?? 0);
  const [g, setG] = useState(0);
  const p0 = useRef(performance.now());
  useEffect(() => {
    let r = 0;
    let son = false;
    const tur = () => {
      const x = performance.now() - p0.current;
      if (x >= toplam) { setG(toplam); if (!son) { son = true; bitti?.(); } return; }
      setG(x);
      r = requestAnimationFrame(tur);
    };
    r = requestAnimationFrame(tur);
    const zaman = (t.ses ?? []).map(([ms, f]) => setTimeout(() => { try { f(); } catch { /* ses yalnız sunum */ } }, Math.max(0, Math.round(ms))));
    return () => { cancelAnimationFrame(r); zaman.forEach(clearTimeout); };
  }, []);   // eslint-disable-line react-hooks/exhaustive-deps
  const ilerleme = Math.min(1, Math.max(0, (g - on) / t.sure));
  return (
    <>
      {/* Ölçeklenmez: oyundaki uçuşlar (altın, kart, anahtar) ekran ölçüsüyle hedef bulur — ölçek onları yanıltırdı */}
      <div className="sa-telefon" data-sahne={anahtar} data-deger={deger} data-durum={g >= toplam ? "bitti" : "oynuyor"}
           data-olcu={t.olcu} data-on={on} data-sure={t.sure}>
        <div className="sa-telefon-ic">{t.ciz(Math.min(g, toplam), ctx)}</div>
      </div>
      <div className="sa-oynat-durum">
        <i className="sa-cubuk"><i style={{ width: `${ilerleme * 100}%` }} /></i>
        <small>{snYaz(Math.min(Math.max(0, g - on), t.sure))} / {snYaz(t.sure)} · {t.yontem}</small>
        {t.canli && <small className="sa-canli">{t.canli}</small>}
      </div>
    </>
  );
}

/** Tam ekran oynatıcı: çerçeve + kaydırıcı (değişince hemen yeniden oynar) + tekrar / bugünkü değer / sıra. */
function Oynatici({ liste, baslangic = 0, sirali, girisMs, setGirisMs, onKapat }) {
  const [i, setI] = useState(baslangic);
  const [tekrar, setTekrar] = useState(0);
  const [tam, setTam] = useState(false);   // tam ekran: denetim paneli gizli, sahneye dokununca geri gelir
  const [, yenile] = useState(0);
  useEffect(() => sureDinle(() => yenile((x) => x + 1)), []);
  const s = liste[i];
  const deger = s.sunucu ? girisMs : sure(s.anahtar);
  const ayarla = (v) => { if (s.sunucu) setGirisMs(v ?? s.varsayilan); else sureAyarla(s.anahtar, v); };
  const sonrakiRef = useRef(null);
  useEffect(() => () => clearTimeout(sonrakiRef.current), []);
  const bitti = () => {
    if (!sirali) return;
    clearTimeout(sonrakiRef.current);
    sonrakiRef.current = setTimeout(() => { if (i + 1 < liste.length) setI(i + 1); }, 600);
  };
  const git = (n) => { clearTimeout(sonrakiRef.current); setI(n); setTekrar((x) => x + 1); };
  // Esc kapatır
  useEffect(() => {
    const tus = (e) => { if (e.key === "Escape") onKapat(); };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [onKapat]);
  return (
    <div className={sinif("sa-sahne", tam && "sa-sahne--tam")} role="dialog" aria-modal="true" aria-label={`Önizleme: ${s.baslik}`}>
      {tam && <button type="button" className="sa-panel-goster" onClick={() => setTam(false)}>Paneli göster</button>}
      <div className="sa-sahne-ic" onClick={tam ? () => setTam(false) : undefined}>
        <Sahne key={`${s.anahtar}:${deger}:${tekrar}`} anahtar={s.anahtar} deger={deger} girisMs={girisMs} bitti={bitti} />
      </div>
      <div className="sa-sahne-alt">
        <div className="sa-kart-bas">
          <h2>{sirali && <small>{i + 1}/{liste.length} · </small>}{s.baslik}</h2>
          <output className="sa-deger qt-sayi">{snYaz(deger)}</output>
        </div>
        <input className="sa-kaydirici" type="range" min={s.min} max={s.max} step={adim(s)} value={deger}
               aria-label={`${s.baslik} (ms) — değişince yeniden oynar`} onChange={(e) => ayarla(Number(e.target.value))} />
        <p className="sa-degerler"><span>Bugünkü <b>{snYaz(s.varsayilan)}</b></span>{s.oneri != null && <span>Öneri <b>{snYaz(s.oneri)}</b></span>}<span>{deger} ms</span></p>
        <div className="sa-oynat-eylem">
          <QtDugme tur="mavi" boyut="k" ikon="yenile" aria-label="Tekrar oynat" onClick={() => setTekrar((x) => x + 1)}>Tekrar</QtDugme>
          <QtDugme tur="ikincil" boyut="k" aria-label="Bugünkü değere dön" devreDisi={deger === s.varsayilan} onClick={() => ayarla(null)}>Bugünkü</QtDugme>
          {s.oneri != null && <QtDugme tur="ikincil" boyut="k" aria-label="Öneriyi dene" devreDisi={deger === s.oneri} onClick={() => ayarla(s.oneri)}>Öneri</QtDugme>}
        </div>
        <div className="sa-oynat-eylem">
          {sirali && <QtDugme tur="hayalet" boyut="k" aria-label="Önceki sahne" devreDisi={i === 0} onClick={() => git(i - 1)}>‹ Önceki</QtDugme>}
          {sirali && <QtDugme tur="hayalet" boyut="k" aria-label="Sonraki sahne" devreDisi={i + 1 >= liste.length} onClick={() => git(i + 1)}>Sonraki ›</QtDugme>}
          <QtDugme tur="hayalet" boyut="k" onClick={() => { setTam(true); setTekrar((x) => x + 1); }}>Tam ekran</QtDugme>
          <QtDugme tur="birincil" boyut="k" onClick={onKapat}>Kapat</QtDugme>
        </div>
      </div>
    </div>
  );
}

export default function SureAyarPage() {
  const [mod, setMod] = useState("duello");
  const [, yenile] = useState(0);
  const [oynat, setOynat] = useState(null);   // { liste, baslangic, sirali }
  const [oynanan, setOynanan] = useState(() => new Set());
  const [girisMs, setGirisMs] = useState(GIRIS_VARSAYILAN);
  const [kopyaDurum, setKopyaDurum] = useState(null);
  const [sesAcik, setSesAcik] = useState(() => sesAcikMi());
  const depoAcik = useMemo(() => sureDeposuAcik(), []);

  useEffect(() => sureDinle(() => yenile((x) => x + 1)), []);
  useEffect(() => { sesKilidiAc(); }, []);
  // Arama motorlarına kapalı (robots.txt'e ek olarak)
  useEffect(() => {
    let m = null;
    try {
      m = document.createElement("meta");
      m.name = "robots";
      m.content = "noindex, nofollow";
      document.head.appendChild(m);
    } catch { /* yalnız sunum */ }
    const eskiBaslik = document.title;
    document.title = "Süre ayarı";
    return () => { try { m?.remove(); document.title = eskiBaslik; } catch { /* yok */ } };
  }, []);
  // Oynatıcı açıkken alttaki sayfa kaymasın
  useEffect(() => {
    if (!oynat) return undefined;
    const eski = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = eski; };
  }, [oynat]);

  const secimler = sureSecimleri();
  const liste = [...SURELER.filter((s) => s.mod === mod || s.mod === "ortak"), ...(mod === "kasa" ? [GIRIS_KAYIT] : [])];
  const tumu = SURELER;   // "Hepsini sırayla oynat": ayarlanabilir 28 sahne
  const degisenSayi = Object.keys(secimler).length;

  const ac = (l, baslangic = 0, sirali = false) => {
    sesKilidiAc();
    setOynanan((o) => new Set(o).add(l[baslangic].anahtar));
    setOynat({ liste: l, baslangic, sirali, id: Date.now() });
  };
  const kopyala = async () => {
    const metin = JSON.stringify({ sure_ayar: secimler, tarih: new Date().toISOString().slice(0, 10) }, null, 1);
    try {
      await navigator.clipboard.writeText(metin);
      setKopyaDurum("ok");
    } catch {
      setKopyaDurum(metin);   // pano kapalı: metni seçilebilir göster
    }
  };

  return (
    <main className="sa-sayfa">
      <header className="sa-bas">
        <h1>Süre ayarı</h1>
        <p>Düello ve Ortak Hazine geçiş/animasyon süreleri. "Oynat" sahneyi oyundaki hâliyle (sesiyle) gösterir. Seçimler <b>yalnız bu tarayıcıda</b> geçerli; diğer oyuncular etkilenmez.</p>
        {!depoAcik && <p className="sa-uyari" role="alert">Tarayıcı depolaması kapalı: seçimler yalnız bu sekme açıkken geçerli, sayfayı yenileyince bugünkü değerlere döner.</p>}
        {!sesAcik && (
          <p className="sa-uyari" role="status">
            Oyun sesi kapalı.{" "}
            <button type="button" className="sa-bag" onClick={() => { sesAyarla(true); setSesAcik(true); sesKilidiAc(); }}>Sesi aç</button>
          </p>
        )}
        <div className="sa-eylem">
          <QtDugme tur="mavi" ikon="oyna" onClick={() => ac(tumu, 0, true)}>Hepsini sırayla oynat</QtDugme>
          <QtDugme tur="birincil" ikon="kopyala" onClick={kopyala}>Seçimlerimi kopyala{degisenSayi ? ` (${degisenSayi})` : ""}</QtDugme>
          <QtDugme tur="hayalet" devreDisi={!degisenSayi} onClick={() => { sureleriSifirla(); setKopyaDurum(null); }}>Hepsini sıfırla</QtDugme>
        </div>
        {kopyaDurum === "ok" && <p className="sa-not" role="status">Kopyalandı — sohbete yapıştırabilirsin.</p>}
        {kopyaDurum && kopyaDurum !== "ok" && <textarea className="sa-json" readOnly value={kopyaDurum} onFocus={(e) => e.target.select()} aria-label="Seçimler (JSON)" />}
        <div className="sa-sekme" role="tablist">
          {MODLAR.map(([k, ad]) => (
            <button key={k} type="button" role="tab" aria-selected={mod === k} className={sinif("sa-sekme-d", mod === k && "sa-sekme-d--acik")} onClick={() => setMod(k)}>{ad}</button>
          ))}
        </div>
      </header>

      <ul className="sa-liste">
        {liste.map((s, idx) => {
          const deger = s.sunucu ? girisMs : sure(s.anahtar);
          const degisti = deger !== s.varsayilan;
          const ayarla = (v) => { if (s.sunucu) setGirisMs(v ?? s.varsayilan); else sureAyarla(s.anahtar, v); };
          const canli = tanim(s.anahtar, girisMs)?.canli;
          return (
            <li key={s.anahtar}>
              <QtKart dolgu="o" className={sinif("sa-kart", degisti && !s.sunucu && "sa-kart--degisti")} data-anahtar={s.anahtar}>
                <div className="sa-kart-bas">
                  <h2>{s.baslik}{s.mod === "ortak" && <small> · ortak</small>}{s.sunucu && <small> · sunucuya bağlı</small>}</h2>
                  <output className="sa-deger qt-sayi" htmlFor={`sa-${s.anahtar}`}>{snYaz(deger)}<small>{deger} ms</small></output>
                </div>
                <p className="sa-aciklama">{s.aciklama}</p>
                {s.not && <p className="sa-sinir">{s.not}</p>}
                {canli && canli !== s.not && <p className="sa-sinir">{canli}</p>}
                <input id={`sa-${s.anahtar}`} className="sa-kaydirici" type="range" min={s.min} max={s.max} step={adim(s)} value={deger}
                       aria-label={`${s.baslik} (ms)`} onChange={(e) => ayarla(Number(e.target.value))} />
                <div className="sa-olcek"><span>{snYaz(s.min)}</span><span>{snYaz(s.max)}</span></div>
                <p className="sa-degerler">
                  <span>Bugünkü <b>{snYaz(s.varsayilan)}</b></span>
                  {s.oneri != null && <span>Öneri <b>{snYaz(s.oneri)}</b></span>}
                </p>
                <div className="sa-kart-eylem">
                  <QtDugme tur="mavi" boyut="k" ikon="oyna" onClick={() => ac(liste, idx)}>Oynat</QtDugme>
                  <QtDugme tur="ikincil" boyut="k" ikon="yenile" devreDisi={!oynanan.has(s.anahtar)} onClick={() => ac(liste, idx)}>Tekrar oynat</QtDugme>
                  <QtDugme tur="hayalet" boyut="k" devreDisi={!degisti} onClick={() => ayarla(null)}>Bugünkü değere dön</QtDugme>
                </div>
              </QtKart>
            </li>
          );
        })}
      </ul>

      {oynat && (
        <Oynatici key={oynat.id} liste={oynat.liste} baslangic={oynat.baslangic} sirali={oynat.sirali}
                  girisMs={girisMs} setGirisMs={setGirisMs} onKapat={() => setOynat(null)} />
      )}
    </main>
  );
}
