// ============================================================
// DÜELLO — SIRAYLA KATEGORİ SEÇİMİ (960, Ida 5 Eki 2026)
//
// Kural SUNUCUDA (duello_durum › secim; seçim duello_kategori_sec ile, yılan sırası / süre / otomatik seçim sunucuda).
// Bu dosya yalnız çizer:
//   · SecimHalka    — başlıktaki geri sayım halkası (5 sn; son 2 sn gerilim).
//   · SecimPipler   — başlıkta tur noktalarının yerinde 10 seçim noktası (yılan sırası: mavi sen / kırmızı rakip).
//   · SecimKonsol   — mesaj satırının yerinde: "SENİN SIRAN" / "RAKİP SEÇİYOR", Sen 3/5 · Rakip 2/5, "Otomatik seçildi".
//   · SecimKartlar  — 10 kart (ikon, ad, Sen %X / Rakip %Y güç çubukları; verisiz "Yeni"); seçilen kart seçenin yuvasına
//                     UÇAR (WAAPI, transform + opacity), alınan kart yerinde soluk "Aldın / Rakip aldı" kalır.
//   · HakimiyetBasliyor — seçim bitince ban/saldırı turlarına geçiş katmanı.
//   · secimIpucuGoster — ilk 3 Düello'da kısa ipucu (cihazda).
// Renk rolü: mavi = sen, kırmızı = rakip (--hk-*). Oyunda "fetih" geçmez; kavram hâkimiyet.
// iOS: position:fixed YOK — uçan kopya .hk-mac içinde absolute. Hareketi azalt: uçuş yok, yuva yerinde belirir.
// ============================================================
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import KategoriIkon from "./KategoriIkon.jsx";
import { kategoriAdi } from "../lib/kategoriler.js";
import { QtIkon, sinif } from "../tasarim/index.js";
import { hareketAzaltildiMi } from "../tasarim/hareket.js";
import { titret } from "../lib/geriBildirim.js";
import { sesKategoriSecildi } from "../lib/ses.js";
import "../styles/duello-secim.css";
import { sure, varsayilanSure } from "../lib/sureler.js";

/** Uçuş süresi (ms). Seçim süresi 5 sn; gösterim payı (1,5 sn) içinde kalır. */
const UCUS_MS = varsayilanSure("duello_kart_ucus");   // geçerli: sure() — lib/sureler.js
const OTO_MS = varsayilanSure("duello_secim_oto");
const EGRI_GECIS = "cubic-bezier(0.77, 0, 0.175, 1)";   // --qt-egri-gecis (tasarim tokenı; WAAPI CSS değişkeni okumaz)

/** duello_durum › secim → sade görünüm. */
export function secimModel(d) {
  const s = d?.secim;
  if (!s?.acik) return null;
  const secimler = Array.isArray(s.secimler) ? s.secimler : [];
  const sirasi = Array.isArray(s.sirasi) ? s.sirasi : [];
  const toplam = Number(s.toplam) || sirasi.length || 10;
  const benSay = secimler.filter((x) => x.u === d.ben).length;
  return {
    sira: Number(s.sira) || 0, toplam, sirasi, secimler, kalan: Array.isArray(s.kalan) ? s.kalan : null,
    benSay, rakipSay: secimler.length - benSay, kisiBasi: Math.ceil(toplam / 2),
  };
}

// ---------------------------------------------------------------- ipucu (ilk 3 Düello)
const IPUCU_ANAHTARI = "qt_duello_secim_ipucu";
const IPUCU_MAC_SAYISI = 3;
/** İlk 3 Düello'da (maç başına) true; kayıt cihazda, okunamazsa ipucu gösterilmez. */
export function secimIpucuGoster(macId) {
  try {
    const ham = JSON.parse(window.localStorage.getItem(IPUCU_ANAHTARI) || "[]");
    const liste = Array.isArray(ham) ? ham.filter((x) => typeof x === "string") : [];
    if (liste.includes(macId)) return true;
    if (liste.length >= IPUCU_MAC_SAYISI) return false;
    window.localStorage.setItem(IPUCU_ANAHTARI, JSON.stringify([...liste, macId]));
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------- başlık: halka + noktalar
const HALKA_R = 15;
const HALKA_CEVRE = 2 * Math.PI * HALKA_R;
/** Geri sayım halkası: sn = gösterilen kalan, oran = 0–1, ben = sıra bende (son 2 sn gerilim yalnız bende). */
export function SecimHalka({ sn, oran, ben, c }) {
  const rakam = Math.max(0, Math.ceil(Number(sn) || 0));
  const son = ben && rakam > 0 && rakam <= 2;
  const dolu = Math.max(0, Math.min(1, Number(oran) || 0));
  return (
    <span className={sinif("dsc-halka", ben ? "dsc-halka--ben" : "dsc-halka--rakip", son && "dsc-halka--son")}
          role="timer" aria-label={`${rakam} ${c("sn")}`}>
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className="dsc-halka-iz" cx="18" cy="18" r={HALKA_R} />
        <circle className="dsc-halka-dolu" cx="18" cy="18" r={HALKA_R}
                strokeDasharray={HALKA_CEVRE} strokeDashoffset={HALKA_CEVRE * (1 - dolu)} />
      </svg>
      <b className="qt-sayi" key={rakam}>{rakam}</b>
    </span>
  );
}

/** 10 seçim noktası: sırayla kimin seçeceği (mavi/kırmızı), yapılanlar dolu, sıradaki turuncu halkalı. */
export function SecimPipler({ d, sm, c }) {
  return (
    <ol className="dsc-pipler" aria-label={c("Seçim {n}/{t}", { n: Math.min(sm.sira + 1, sm.toplam), t: sm.toplam })}>
      {Array.from({ length: sm.toplam }, (_, i) => {
        const benim = sm.sirasi[i] === d.ben;
        return (
          <li key={i} className={sinif("dsc-pip", benim ? "dsc-pip--ben" : "dsc-pip--rakip",
                                       i < sm.sira && "dsc-pip--bitti", i === sm.sira && "dsc-pip--simdi")} />
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- konsol (mesaj satırının yerinde)
/**
 * Sıra göstergesi. Yeni bir OTOMATİK seçim gelince ~1,8 sn "Otomatik seçildi" satırı (süre dolumu geri bildirimi).
 * Sayfa seçim ortasında açılırsa eski otomatik seçimler yeniden gösterilmez.
 */
export function SecimKonsol({ d, sm, benSirada, sn, c, children }) {
  const gorulen = useRef(null);
  const [oto, setOto] = useState(null);
  useEffect(() => {
    const n = sm.secimler.length;
    if (gorulen.current === null) { gorulen.current = n; return undefined; }
    if (n <= gorulen.current) { gorulen.current = n; return undefined; }
    const yeni = sm.secimler.slice(gorulen.current).filter((x) => x.oto);
    gorulen.current = n;
    if (!yeni.length) return undefined;
    const son = yeni[yeni.length - 1];
    setOto({ k: son.k, ben: son.u === d.ben, an: Date.now() });
    if (son.u === d.ben) titret([30, 50, 30]);
    return undefined;
  }, [sm.secimler.length]);   // eslint-disable-line react-hooks/exhaustive-deps
  // Satır kendi süresince kalır; arada yeni seçim gelse de kapanış zamanlayıcısı kaybolmaz.
  useEffect(() => {
    if (!oto) return undefined;
    const t = setTimeout(() => setOto(null), sure("duello_secim_oto"));
    return () => clearTimeout(t);
  }, [oto?.an]);   // eslint-disable-line react-hooks/exhaustive-deps

  const rakam = Math.max(0, Math.ceil(Number(sn) || 0));
  const son = benSirada && rakam > 0 && rakam <= 2;
  // Draft revizesi (7 Eki 2026): yılan sırası blok blok okunur — bu sırada kaç seçim, sonra kim kaç seçim.
  // ("Sen 3/5 · Rakip 3/5" sayımı yuva tahtasında zaten yazılı; burada tekrar edilmez.)
  const bloklar = [];
  for (let i = sm.sira; i < sm.sirasi.length; i++) {
    const benMi = sm.sirasi[i] === d.ben;
    if (bloklar.length && bloklar[bloklar.length - 1].ben === benMi) bloklar[bloklar.length - 1].n++;
    else bloklar.push({ ben: benMi, n: 1 });
  }
  const bu = bloklar[0]?.n ?? 1;
  const sonraki = bloklar[1] ?? null;
  const sonraMetni = sonraki
    ? (sonraki.ben ? c("sonra sen ×{n}", { n: sonraki.n }) : c("sonra rakip ×{n}", { n: sonraki.n }))
    : c("son seçim");
  return (
    <div className={sinif("hk-mesaj dsc-konsol", benSirada ? "dsc-konsol--ben" : "dsc-konsol--rakip", son && "dsc-konsol--son",
                          oto && "dsc-konsol--oto")}>
      <span className="dsc-konsol-ikon" aria-hidden="true">
        <QtIkon ad={oto ? "saat" : benSirada ? "hedef" : "kilic"} boyut={20} />
      </span>
      <div className="hk-mesaj-yazi" role="status" aria-live="polite" key={oto ? `o${oto.an}` : `s${sm.sira}`}>
        {oto ? (
          <>
            <b>{oto.ben ? c("Süre doldu · otomatik seçildi") : c("Rakibin süresi doldu")}</b>
            <span>{c("Otomatik seçildi: {kat}", { kat: c(kategoriAdi(oto.k)) })}</span>
          </>
        ) : benSirada ? (
          <>
            <b>{c("Senin sıran")}</b>
            <span>{`${bu > 1 ? c("{n} seçim yap", { n: bu }) : c("1 seçim yap")} · ${sonraMetni}`}</span>
          </>
        ) : (
          <>
            <b>{c("Rakip seçiyor…")}</b>
            <span>{`${c("rakip ×{n}", { n: bu })} · ${sonraMetni}`}</span>
          </>
        )}
      </div>
      {!oto && <span className="dsc-konsol-adet" aria-hidden="true">×{bu}</span>}
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- kartlar
const oranOf = (profil, k) => {
  const v = profil?.oranlar?.[k];
  return typeof v === "number" ? v : null;
};
const OK_ETIKET = { yukari: "sen önde", esit: "denk", asagi: "rakip önde" };

/** Tek çubuk: mavi soldan (sen), kırmızı sağdan (rakip) dolar; toplam 100'ü aşarsa orantılanır — üst üste binmez. */
function GucCubugu({ ben, rakip }) {
  const b = ben ?? 0, r = rakip ?? 0;
  const k = b + r > 100 ? 100 / (b + r) : 1;
  return (
    <span className={sinif("dsc-guc", ben === null && rakip === null && "dsc-guc--yeni")} aria-hidden="true">
      <i className="dsc-guc-ben" style={{ width: `${ben === null ? 0 : Math.max(3, b * k)}%` }} />
      <i className="dsc-guc-rakip" style={{ width: `${rakip === null ? 0 : Math.max(3, r * k)}%` }} />
    </span>
  );
}

/**
 * 10 kart, 2 sütun, sabit sıra (kategori listesi): alınan kart yerinde kalır (soluk + sahip rengi + "Aldın"/"Rakip aldı"),
 * böylece ızgara akmaz. Sıra bendeyken tek dokunuş seçer (5 sn kısa — onay adımı yok); yanıt gelene dek kart basılı kalır.
 * Yeni seçim geldiğinde kartın ikonu seçenin yuvasına uçar (yuva iniş anına dek gizli).
 */
export function SecimKartlar({ d, hk, sm, ben, rakip, benSirada, basilan, calisan, c, onSec, ipucu = false }) {
  const kokRef = useRef(null);
  const gorulen = useRef(null);
  const kategoriler = d.kategoriler ?? [];
  const sahip = hk.sahiplik;

  // Uçuş: yeni gelen seçim(ler) — kart ikonu → seçenin yuvası. Boyamadan önce yuva gizlenir (iniş anında belirir).
  useLayoutEffect(() => {
    const n = sm.secimler.length;
    if (gorulen.current === null) { gorulen.current = n; return; }
    if (n <= gorulen.current) { gorulen.current = n; return; }
    const yeniler = sm.secimler.slice(gorulen.current);
    gorulen.current = n;
    const kok = kokRef.current;
    const sahne = kok?.closest(".hk-mac");
    if (!kok || !sahne) return;
    const azalt = hareketAzaltildiMi();
    yeniler.forEach((s) => {
      const benim = s.u === d.ben;
      const yuva = sahne.querySelector(`.hk-yuva[data-kategori="${s.k}"]`);
      const kartIkon = kok.querySelector(`.dsc-kart[data-kategori="${s.k}"] .dsc-kart-ikon`);
      const in_ = () => {
        // Draft revizesi: kart yerinde kısa "damga" vuruşu — yalnız bu seçim olayında, tek sefer (yeniden okumada yok)
        const kart = kok.querySelector(`.dsc-kart[data-kategori="${s.k}"]`);
        if (kart && !azalt) {
          kart.classList.add("dsc-kart--damga-an");
          setTimeout(() => kart.classList.remove("dsc-kart--damga-an"), 700);
        }
        if (yuva) {
          yuva.classList.remove("hk-yuva--gelecek");
          yuva.classList.add(benim ? "hk-yuva--indi-ben" : "hk-yuva--indi-rakip");
          setTimeout(() => yuva.classList.remove("hk-yuva--indi-ben", "hk-yuva--indi-rakip"), 900);
        }
        sesKategoriSecildi();
        if (benim) titret(15);
      };
      if (azalt || !yuva || !kartIkon) { in_(); return; }
      const sk = sahne.getBoundingClientRect();
      const a = kartIkon.getBoundingClientRect();
      const b = yuva.getBoundingClientRect();
      if (!a.width || !b.width) { in_(); return; }
      yuva.classList.add("hk-yuva--gelecek");
      const kopya = document.createElement("span");
      kopya.className = sinif("dsc-ucan", benim ? "dsc-ucan--ben" : "dsc-ucan--rakip");
      kopya.setAttribute("aria-hidden", "true");
      kopya.style.left = `${a.left - sk.left + sahne.scrollLeft}px`;
      kopya.style.top = `${a.top - sk.top + sahne.scrollTop}px`;
      kopya.style.width = `${a.width}px`;
      kopya.style.height = `${a.height}px`;
      const ikon = kartIkon.cloneNode(true);
      kopya.appendChild(ikon);
      sahne.appendChild(kopya);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const olcek = b.width / a.width;
      let bitti = false;
      const kapat = () => { if (bitti) return; bitti = true; kopya.remove(); in_(); };
      try {
        const an = kopya.animate([
          { transform: "translate(0px, 0px) scale(1)", opacity: 1 },
          { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - 18}px) scale(${Math.max(1.25, olcek * 1.1)})`, opacity: 1, offset: 0.45 },
          { transform: `translate(${dx}px, ${dy}px) scale(${olcek})`, opacity: 1 },
        ], { duration: sure("duello_kart_ucus"), easing: EGRI_GECIS, fill: "forwards" });
        an.onfinish = kapat;
        an.oncancel = kapat;
      } catch { kapat(); }
      setTimeout(kapat, sure("duello_kart_ucus") + 400);   // güvenlik: animasyon olayı gelmezse yuva gizli kalmasın
    });
  }, [sm.secimler.length]);   // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="dsc-kok" ref={kokRef}>
      <div className={sinif("dsc-izgara", benSirada ? "dsc-izgara--ben" : "dsc-izgara--rakip")}>
        {kategoriler.map((k) => {
          const bo = oranOf(ben?.profil, k);
          const ro = oranOf(rakip?.profil, k);
          const ok = bo === null || ro === null ? null
            : bo - ro >= hk.avantajEsik ? "yukari" : bo - ro <= -hk.avantajEsik ? "asagi" : "esit";
          const kimin = sahip[k] ? (sahip[k] === hk.benId ? "ben" : "rakip") : null;
          const kalanda = sm.kalan ? sm.kalan.includes(k) : !kimin;
          const secilebilir = benSirada && !kimin && kalanda && !calisan && !basilan;
          const basildi = basilan === k && !kimin;
          const ad = c(kategoriAdi(k));
          const yuzde = (v) => (v === null ? c("Yeni") : c("%{n}", { n: v }));
          return (
            <button key={k} type="button" data-kategori={k}
                    className={sinif("dsc-kart", kimin && `dsc-kart--${kimin}`, kimin && "dsc-kart--alindi",
                                     basildi && "dsc-kart--basildi", ok && `dsc-kart--ok-${ok}`)}
                    disabled={!secilebilir && !basildi}
                    aria-busy={basildi || undefined}
                    aria-label={[ad,
                      kimin ? (kimin === "ben" ? c("Aldın") : c("Rakip aldı")) : null,
                      c("Sen {b} · Rakip {r}", { b: yuzde(bo), r: yuzde(ro) }),
                      ok ? c(OK_ETIKET[ok]) : null].filter(Boolean).join(" · ")}
                    onClick={() => secilebilir && onSec(k)}>
              <KategoriIkon anahtar={k} boyut={26} plaka className="dsc-kart-ikon" />
              <span className="dsc-kart-ad">{ad}</span>
              {kimin ? (
                <span className={`dsc-kart-damga dsc-kart-damga--${kimin}`}>{kimin === "ben" ? c("Aldın") : c("Rakip aldı")}</span>
              ) : (
                // Güçlü taraf (fark ≥ avantaj eşiği) yüzdesi dolu rozet: kime güçlü olduğu bir bakışta okunur.
                // Draft revizesi: yüzdeler etiketli ("Sen %X" · "Rakip %Y") kartın ÜZERİNDE, altında ortada buluşan güç çubukları.
                <span className="dsc-kart-guc" aria-hidden="true">
                  <span className="dsc-kart-yuzdeler">
                    <b className={sinif("dsc-yuzde dsc-yuzde--ben", bo === null && "dsc-yuzde--yeni")}>{c("Sen {n}", { n: bo === null ? c("Yeni") : bo })}</b>
                    <b className={sinif("dsc-yuzde dsc-yuzde--rakip", ro === null && "dsc-yuzde--yeni")}>{c("Rakip {n}", { n: ro === null ? c("Yeni") : ro })}</b>
                  </span>
                  <GucCubugu ben={bo} rakip={ro} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      {ipucu && (
        <p className="dsc-ipucu" role="note">
          <QtIkon ad="ampul" boyut={16} />
          <span>{c("En iyi bildiğin kategorileri seç, onları sen savunursun.")}</span>
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- geçiş: HÂKİMİYET BAŞLIYOR
/** Seçim bitti → saldırı turları (ban açıksa ban/saldırı). Sahnenin üstünde ~2 sn; dokunuşu engellemez (982: ban yokken
 *  tur 1 doğrudan kategori fazıdır — katman sayacın gösterim payıyla örtüşür, saldıran kartlara alttan dokunabilir). */
export const HAKIMIYET_GECIS_MS = varsayilanSure("duello_hakimiyet_gecis");   // geçerli: sure("duello_hakimiyet_gecis")
export function HakimiyetBasliyor({ hk, c }) {
  return (
    <div className="dsc-basla" data-yumusak="" role="status" style={{ "--dsc-basla-ms": `${sure("duello_hakimiyet_gecis")}ms` }}>
      <div className="dsc-basla-panel">
        <span className="dsc-basla-etiket">{c("Seçim tamam")}</span>
        <b className="dsc-basla-baslik">{c("HÂKİMİYET BAŞLIYOR")}</b>
        <span className="dsc-basla-skor" aria-label={c("Sen {a} · Rakip {b}", { a: hk.benY, b: hk.rakipY })}>
          <span className="dsc-basla-ben">{c("Sen")} <b className="qt-sayi">{hk.benY}</b></span>
          <i aria-hidden="true">·</i>
          <span className="dsc-basla-rakip"><b className="qt-sayi">{hk.rakipY}</b> {c("Rakip")}</span>
        </span>
        <span className="dsc-basla-alt">{hk.puan   // 970: puan modunda kazanma kuralı
          ? c("{h} puan ya da rakibin {y} kategorisini alan kazanır", { h: hk.hedef, y: hk.yol })
          : c("{n} yuvaya ulaşan kazanır", { n: hk.esik })}</span>
      </div>
    </div>
  );
}
