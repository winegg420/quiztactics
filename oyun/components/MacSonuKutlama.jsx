// ============================================================
// MAÇ SONU KUTLAMA SAHNESİ (Ajan G) — şimdilik YALNIZ /mac-sonu-onizleme
//
// Gerçek maç sonu (MacSonuSahnesi) DEĞİŞMEDİ; bu bileşen Ida onaylayınca ayrı
// adımda bağlanacak. Bileşen içerik bilmez: RPC çağırmaz, verilen veriyi çizer.
// Prop şekilleri gerçek kaynaklarla aynıdır:
//   ben/rakip  → MacSonuSahnesi ile aynı { profil, skor, can } (+ cerceve anahtarı)
//   oduller    → [{ ikon:"coin", deger, etiket }]
//   level      → level_kazancim RPC yanıtı (+ isteğe bağlı level_xp_once / level_gereken_once)
//   lig        → { puan (odul_dokumu.toplam.lig), siraOnce, siraSonra }
//   gorevler   → odul_dokumu.gorevler [{ id, ad, ilerleme, hedef, alindi }] (+ isteğe bağlı onceki)
//   rozetler   → odul_dokumu.rozetler [{ id, ad, ikon }] (+ isteğe bağlı grup, kademe)
//
// Zaman çizelgesi (brif G.4, ms): afiş 0 · kupa 150 · avatarlar 300 · konfeti 700 ·
// coin 1000 · XP 1400 · lig 1800 · görevler 2000 · son 2600. Level atlanırsa XP'den
// sonrası +800. Görseller CSS animation-delay ile (yalnız transform/opacity); JS yalnız
// sayaçları, Lottie komutlarını, coin uçuşunu ve sesleri zamanlar.
// Dokununca / Esc: her şey son hâline oturur. Düğmeler baştan tıklanabilir.
// prefers-reduced-motion: huzme, uçuş, Lottie hareketi yok; her şey 0,2 sn solar.
//
// iOS: kökte ve eylem çubuğunun atalarında transform/filter/perspective YOK.
// Coin uçuşu body'ye portal; sabit kapsayıcı yerinde durur, hareket içteki span'larda.
// ============================================================
import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import RozetMadalyonu, { rozetSembolu } from "./RozetMadalyonu.jsx";
import MacSonuLottie, { KonfetiKatmani, konfetiYukle, lottieOnYukle } from "./MacSonuLottie.jsx";
import { QtCan, QtDugme, QtIkon, QtIkonDugme } from "../tasarim/index.js";
import { hareketAzaltildiMi } from "../tasarim/hareket.js";
import { sesCoin, sesKaybettin, sesKazandin, sesLevel } from "../lib/ses.js";
import { tt, ttSunucu } from "../lib/dil.js";
import "../tasarim/ekranlar/mac-sonu-kutlama.css";

export const MS_ZAMAN = { afis: 0, kupa: 150, avatar: 300, konfeti: 700, coin: 1000, xp: 1400, lig: 1800, gorev: 2000, son: 2600 };
const LEVEL_EK_MS = 800;
const SAYIM_MS = 800;
const COIN_ADET = 7;
const COIN_ARA_MS = 40;
const COIN_UCUS_MS = 520;
const GOREV_ARA_MS = 120;
const ROZET_MS = 500;
const LOTTIE_ADLARI = ["kupa", "coin", "level", "yildiz"];

const yuzde = (x) => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));

/** level_kazancim yanıtından çubuk oranları. */
function xpOranlari(v) {
  if (!v?.hazir) return null;
  const gereken = Math.max(1, Number(v.level_gereken) || 1);
  const simdi = Math.max(0, Number(v.level_xp) || 0);
  const xp = Number(v.xp) || 0;
  const atladi = (v.level_sonra ?? v.level) > (v.level_once ?? v.level);
  let a;
  if (atladi) {
    // Önceki levelin doluluğu sunucudan gelmiyorsa (bugünkü RPC) çubuk %60'tan başlar.
    const gOnce = Number(v.level_gereken_once) || 0;
    a = gOnce > 0 && v.level_xp_once != null ? Number(v.level_xp_once) / gOnce : 0.6;
  } else {
    a = (simdi - xp) / gereken;
  }
  return { a: yuzde(a), b: yuzde(simdi / gereken), atladi, xp, level: Number(v.level_sonra ?? v.level) || 1, kalan: Math.max(0, gereken - simdi) };
}

/** Karşılaşmadaki bir taraf. rol: kazanan | kaybeden | esit */
function Taraf({ kisi, rol, yan, canToplam, sen }) {
  return (
    <div className={`msk-taraf msk-taraf--${yan} msk-taraf--${rol}`}>
      <div className="msk-avatar msk-a">
        {rol === "kazanan" && <span className="msk-halka" aria-hidden="true" />}
        {rol === "kazanan" && <img className="msk-tac msk-a" src="/dukkan/tac.webp" alt="" aria-hidden="true" />}
        <CerceveliAvatar profile={kisi?.profil} userId={kisi?.profil?.id} cerceve={kisi?.cerceve} boyut={76} hareketli={rol === "kazanan"} />
      </div>
      <div className="msk-isim msk-a">
        <span className="msk-isim-metin">{kisi?.profil?.gorunen_ad ?? ""}</span>
        {sen && <span className="msk-sen">{tt("Sen")}</span>}
      </div>
      {canToplam ? (
        <div className="msk-can msk-a">
          <QtCan dolu={Math.max(0, kisi?.can ?? 0)} toplam={canToplam} etiket={kisi?.profil?.gorunen_ad} boyut={18} />
        </div>
      ) : null}
    </div>
  );
}

/**
 * @param {"kazandi"|"kaybetti"|"berabere"} durum
 * @param {"klasik"|"duello"} [mod]
 * @param {object} eylemler { onRovans, onYeniMac, onAnaSayfa, onHatalar, rovansKapali }
 * @param {string} [coinHedefSecici]  coin'lerin uçacağı sayaç (gerçek üst çubukta .bd-coin-hap)
 * @param {(i:number, n:number) => void} [onCoinVaris] her coin varınca (i = 0..n-1)
 */
function MacSonuKutlama({
  durum = "kazandi",
  mod = "klasik",
  ben,
  rakip,
  canToplam,
  oduller,
  level,
  lig,
  gorevler,
  rozetler,
  eylemler = {},
  coinHedefSecici = ".bd-coin-hap",
  onCoinVaris,
}) {
  const [az] = useState(hareketAzaltildiMi);
  const [atlandi, setAtlandi] = useState(az);
  const [bitti, setBitti] = useState(az);
  // Kademeli takılma (açılış takılması): tüm ağaç (React + ~210 öğe stil hesabı + düzen) tek
  // görevdeydi, 4× CPU'da açılış karesi 84–134 ms. Aşama 0: zemin + kupa + afiş (t=0'da görünen);
  // 1: karşılaşma (t.avatar=300 ms'de girer); 2: ödül + rozet kartı (t.coin−150 ms'de girer).
  // Her aşama bir sonraki karede; hepsi aşağıya eklenir, üstteki sahne kaymaz. Geç takılan
  // öğelerin animation-delay'i takıldıkları an kadar kısaltılır (zaman çizelgesi aynı kalır).
  const [asama, setAsama] = useState(az ? 2 : 0);
  const basRef = useRef(0);
  const karsilasmaRef = useRef(null);
  const kartRef = useRef(null);
  const rozetRef = useRef(null);
  const coinGosterRef = useRef(az ? (oduller ?? []).find((o) => o?.ikon === "coin")?.deger ?? 0 : 0);
  const [ucus, setUcus] = useState(null);   // { x, y, hedef:{x,y} } | null
  const kokRef = useRef(null);
  const afisRef = useRef(null);
  const coinSayiRef = useRef(null);
  const coinIkonRef = useRef(null);
  const zamanlayicilar = useRef([]);
  const rafRef = useRef(0);
  const varisRef = useRef(0);
  const lottie = {
    kupa: useRef(null), konfeti: useRef(null), coin: useRef(null), level: useRef(null), yildiz: useRef(null),
  };

  const kazandi = durum === "kazandi";
  const coin = (oduller ?? []).find((o) => o?.ikon === "coin")?.deger ?? 0;
  const xpv = useMemo(() => xpOranlari(level), [level]);
  const ek = xpv?.atladi ? LEVEL_EK_MS : 0;
  const t = useMemo(() => ({
    ...MS_ZAMAN,
    lig: MS_ZAMAN.lig + ek,
    gorev: MS_ZAMAN.gorev + ek,
    son: MS_ZAMAN.son + ek,
  }), [ek]);
  const gorevListesi = (gorevler ?? []).filter((g) => g && g.hedef > 0 && !g.alindi).slice(0, 3);
  const rozet = (rozetler ?? [])[0] ?? null;
  const toplamMs = t.son + (rozet ? ROZET_MS + 300 : 0);

  const coinYaz = useCallback((n) => {
    coinGosterRef.current = n;   // kart sonradan takılırsa son değerle çizilir
    if (coinSayiRef.current) coinSayiRef.current.textContent = `+${n}`;
  }, []);

  const hedefBul = useCallback(() => {
    try { return document.querySelector(coinHedefSecici); } catch { return null; }
  }, [coinHedefSecici]);

  // Son hâle oturt (dokunuş, Esc, azaltılmış hareket).
  const bitir = useCallback(() => {
    zamanlayicilar.current.forEach(clearTimeout);
    zamanlayicilar.current = [];
    cancelAnimationFrame(rafRef.current);
    coinYaz(coin);
    setUcus(null);
    if (coin > 0 && varisRef.current < COIN_ADET) { varisRef.current = COIN_ADET; onCoinVaris?.(COIN_ADET - 1, COIN_ADET); }
    lottie.kupa.current?.sonaGit();
    lottie.level.current?.sonaGit();
    lottie.konfeti.current?.gizle();
    lottie.coin.current?.gizle();
    lottie.yildiz.current?.gizle();
    setAsama(2);
    setAtlandi(true);
    setBitti(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coin, coinYaz, onCoinVaris]);

  // Zaman çizelgesi: tek kez, takılınca.
  useEffect(() => {
    lottieOnYukle(LOTTIE_ADLARI);
    if (kazandi && !az) konfetiYukle().catch(() => {});
    basRef.current = performance.now();
    // Odak (ekran okuyucu) karenin rAF'ında: takılma görevinde focus() stil + düzeni zorla
    // hesaplatıyordu (4× CPU izi: açılış görevinin ~14 ms'si); rAF'ta o hesabı kare zaten yapar.
    const odakKare = requestAnimationFrame(() => {
      try { afisRef.current?.focus({ preventScroll: true }); } catch { /* eski tarayıcı */ }
    });
    // Aşama 1 iki kare sonra: araya kupa Lottie kurulumu (ilk kareden sonraki görev) girer, ikisi
    // aynı kareye yığılmaz. rAF gelmezse (arka plan sekmesi) yedek zamanlayıcı her şeyi takar.
    let asamaKare2 = 0;
    const asamaKare = requestAnimationFrame(() => {
      asamaKare2 = requestAnimationFrame(() => setAsama((a) => Math.max(a, 1)));
    });
    const asamaYedek = setTimeout(() => setAsama(2), 600);   // kart 850 ms'de görünür; öncesinde takılı olsun
    const odakIptal = () => {
      cancelAnimationFrame(odakKare); cancelAnimationFrame(asamaKare); cancelAnimationFrame(asamaKare2); clearTimeout(asamaYedek);
    };
    if (az) { bitir(); if (kazandi) sesKazandin(); return odakIptal; }
    const z = (ms, f) => zamanlayicilar.current.push(setTimeout(f, ms));
    varisRef.current = 0;
    coinYaz(0);

    if (kazandi) z(t.kupa, () => lottie.kupa.current?.oynat());
    if (kazandi) z(t.konfeti, () => { lottie.konfeti.current?.oynat(); sesKazandin(); });
    if (durum === "kaybetti") z(t.avatar, () => sesKaybettin());

    if (coin > 0) {
      z(t.coin, () => {
        lottie.coin.current?.oynat();
        const bas = performance.now();
        const don = () => {
          const p = Math.min(1, (performance.now() - bas) / SAYIM_MS);
          coinYaz(Math.round(coin * (1 - (1 - p) ** 3)));
          if (p < 1) rafRef.current = requestAnimationFrame(don);
        };
        rafRef.current = requestAnimationFrame(don);
        // Uçuş: kaynak ödül satırındaki coin, hedef üst çubuktaki sayaç. Hedef yoksa uçuş yok.
        const k = coinIkonRef.current?.getBoundingClientRect?.();
        const h = hedefBul()?.getBoundingClientRect?.();
        if (k && h?.width) {
          setUcus({ x: k.left + k.width / 2 - 14, y: k.top + k.height / 2 - 14,
                    dx: h.left + Math.min(h.width, 40) / 2 - (k.left + k.width / 2), dy: h.top + h.height / 2 - (k.top + k.height / 2) });
        } else {
          varisRef.current = COIN_ADET;
          onCoinVaris?.(COIN_ADET - 1, COIN_ADET);
          sesCoin();
        }
      });
    }

    if (xpv?.atladi) {
      z(t.xp + 500, () => { lottie.level.current?.oynat(); sesLevel(); });
    }
    if (rozet) z(t.son + 150, () => { lottie.yildiz.current?.oynat(); sesLevel(); });
    z(toplamMs, () => setBitti(true));

    const tus = (e) => { if (e.key === "Escape") bitir(); };
    window.addEventListener("keydown", tus);
    const liste = zamanlayicilar.current;
    return () => {
      window.removeEventListener("keydown", tus);
      odakIptal();
      liste.forEach(clearTimeout);
      cancelAnimationFrame(rafRef.current);
    };
    // Sahne yalnız takılınca kurulur; "Tekrar oynat" key ile yeniden takar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Aşama 1 takıldı → aşama 2 bir sonraki karede.
  useEffect(() => {
    if (asama !== 1) return undefined;
    const k = requestAnimationFrame(() => setAsama(2));
    return () => cancelAnimationFrame(k);
  }, [asama]);

  // Geç takılan bölümün gecikmeleri takıldığı an kadar kısalır (boyamadan önce, yeniden çizimsiz).
  useLayoutEffect(() => {
    if (az || atlandi || !basRef.current) return;
    const gecen = Math.round(performance.now() - basRef.current);
    const kaydir = (el, adlar) => {
      if (!el || el.dataset.kaydi) return;
      el.dataset.kaydi = "1";
      for (const ad of adlar) el.style.setProperty(`--t-${ad}`, `${t[ad] - gecen}ms`);
    };
    kaydir(karsilasmaRef.current, ["avatar"]);
    kaydir(kartRef.current, ["coin", "xp", "lig", "gorev", "son"]);
    kaydir(rozetRef.current, ["son"]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asama]);

  const coinVardi = (i) => {
    if (varisRef.current > i) return;
    varisRef.current = i + 1;
    onCoinVaris?.(i, COIN_ADET);
    sesCoin();
    const h = hedefBul();
    try {
      h?.animate?.([{ transform: "scale(1)" }, { transform: "scale(1.14)" }, { transform: "scale(1)" }],
        { duration: 220, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" });
    } catch { /* WAAPI yok: zıplama atlanır */ }
    if (i === COIN_ADET - 1) setUcus(null);
  };

  const kazananYan = kazandi ? "ben" : durum === "kaybetti" ? "rakip" : null;
  const rol = (yan) => (!kazananYan ? "esit" : kazananYan === yan ? "kazanan" : "kaybeden");
  const baslik = kazandi ? tt("ZAFER!") : durum === "kaybetti" ? tt("Bu sefer olmadı") : tt("BERABERE");
  const altYazi = kazandi
    ? (mod === "duello" ? tt("Düello senin!") : tt("Harika maçtı!"))
    : durum === "kaybetti" ? tt("Rövanşta görüşürüz") : tt("Kimse pes etmedi");
  const skorSol = canToplam ? Math.max(0, ben?.can ?? 0) : (ben?.skor ?? 0);
  const skorSag = canToplam ? Math.max(0, rakip?.can ?? 0) : (rakip?.skor ?? 0);

  const stil = {
    "--t-kupa": `${t.kupa}ms`, "--t-avatar": `${t.avatar}ms`, "--t-coin": `${t.coin}ms`, "--t-xp": `${t.xp}ms`,
    "--t-lig": `${t.lig}ms`, "--t-gorev": `${t.gorev}ms`, "--t-son": `${t.son}ms`,
    "--xp-a": xpv?.a ?? 0, "--xp-b": xpv?.b ?? 0,
  };

  return (
    <div
      ref={kokRef}
      className={`msk msk--${durum}${atlandi ? " msk--atla" : ""}${az ? " msk--az" : ""}${bitti ? " msk--bitti" : ""}`}
      style={stil}
      onClick={bitti ? undefined : bitir}
    >
      <div className="msk-zemin" aria-hidden="true">
        {kazandi && <div className="msk-huzme" />}
      </div>

      <div className="msk-sahne">
        {kazandi && (
          <div className="msk-kupa">
            <MacSonuLottie ref={lottie.kupa} ad="kupa" kalici sonKare={0.9} />
          </div>
        )}

        <div className={`msk-afis msk-a${kazandi ? "" : " msk-afis--sakin"}`} ref={afisRef} tabIndex={-1} role="status" aria-live="polite">
          <h1 className="msk-baslik">{baslik}</h1>
          {durum === "berabere" && <span className="msk-parilti" aria-hidden="true" />}
        </div>
        <p className="msk-alt msk-a">{altYazi}</p>

        {asama >= 1 && ben && (
          <div className="msk-karsilasma" ref={karsilasmaRef}>
            <Taraf kisi={ben} rol={rakip ? rol("ben") : "esit"} yan="sol" canToplam={canToplam} sen />
            {rakip && (
              <div className="msk-skor msk-a" role="img"
                   aria-label={canToplam ? tt("Kalan can {a} – {b}", { a: skorSol, b: skorSag }) : tt("Skor {a} – {b}", { a: skorSol, b: skorSag })}>
                {canToplam ? <QtIkon ad="kalp" boyut={18} /> : null}
                <span className="msk-skor-sayi"><b>{skorSol}</b><i>–</i><b>{skorSag}</b></span>
                <span className="msk-skor-etiket">{canToplam ? tt("kalan can") : tt("doğru")}</span>
              </div>
            )}
            {rakip && <Taraf kisi={rakip} rol={rol("rakip")} yan="sag" canToplam={canToplam} />}
          </div>
        )}
      </div>

      {asama >= 2 && <section ref={kartRef} className="msk-kart" aria-label={tt("Maç ödülleri")}>
        {coin > 0 && (
          <div className="msk-coin msk-a">
            <div className="msk-coin-patlama"><MacSonuLottie ref={lottie.coin} ad="coin" hiz={1.5} hazirlaMs={450} /></div>
            <img ref={coinIkonRef} className="msk-coin-ikon" src="/dukkan/coin.webp" alt="" aria-hidden="true" />
            <span className="msk-coin-sayi qt-sayi" ref={coinSayiRef} aria-hidden="true">+{coinGosterRef.current}</span>
            <span className="qt-gizli">{tt("+{coin} coin", { coin })}</span>
            <span className="msk-coin-etiket">{tt("coin")}</span>
          </div>
        )}

        {xpv && (
          <div className={`msk-xp msk-a${xpv.atladi ? " msk-xp--atladi" : ""}`}>
            <div className="msk-xp-ust">
              <span className="msk-xp-kazanc">{tt("+{xp} XP", { xp: xpv.xp })}</span>
              <span className="msk-xp-level">{tt("Level {n}", { n: xpv.level })}</span>
            </div>
            <div className="msk-xp-ray" role="progressbar" aria-label={tt("Level ilerlemesi")}
                 aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(xpv.b * 100)}>
              <span className="msk-xp-dolgu" />
            </div>
            {xpv.atladi && (
              <div className="msk-levelup">
                <div className="msk-levelup-lottie"><MacSonuLottie ref={lottie.level} ad="level" kalici hiz={1.4} hazirlaMs={1150} sonda={atlandi} /></div>
                <span className="msk-levelup-rozet" role="status">{tt("LEVEL {n}!", { n: xpv.level })}</span>
              </div>
            )}
            <span className="msk-xp-kalan">{tt("Level {n} için {xp} XP", { n: xpv.level + 1, xp: xpv.kalan })}</span>
          </div>
        )}

        {lig && (lig.puan > 0 || lig.siraSonra) ? (
          <div className="msk-lig msk-a">
            <span className="msk-lig-puan">
              <QtIkon ad="lig" boyut={20} />
              {tt("+{n} lig puanı", { n: lig.puan })}
            </span>
            {lig.siraOnce && lig.siraSonra ? (
              <span className="msk-lig-sira" aria-label={tt("Lig sıran {a}. sıradan {b}. sıraya çıktı", { a: lig.siraOnce, b: lig.siraSonra })}>
                <span aria-hidden="true">{lig.siraOnce}.</span>
                <QtIkon ad="ok" boyut={16} />
                <span className="msk-sira-pencere" aria-hidden="true">
                  <span className="msk-sira-kolon"><b>{lig.siraOnce}.</b><b>{lig.siraSonra}.</b></span>
                </span>
                {lig.siraSonra < lig.siraOnce && <span className="msk-lig-ok" aria-hidden="true"><QtIkon ad="ok" boyut={14} /></span>}
              </span>
            ) : null}
          </div>
        ) : null}

        {gorevListesi.length > 0 && (
          <ul className="msk-gorevler" aria-label={tt("Günlük görevler")}>
            {gorevListesi.map((g, i) => {
              const son = Math.min(g.ilerleme, g.hedef);
              const once = Math.min(son, Math.max(0, g.onceki ?? son));
              const tamam = son >= g.hedef;
              return (
                <li key={g.id} className={`msk-gorev msk-a${tamam ? " msk-gorev--tamam" : ""}`}
                    style={{ "--g-gecikme": `calc(var(--t-gorev) + ${i * GOREV_ARA_MS}ms)`, "--g-a": once / g.hedef, "--g-b": son / g.hedef }}>
                  <span className="msk-gorev-ad">{ttSunucu(g.ad)}</span>
                  <span className="msk-gorev-ray" aria-hidden="true"><span className="msk-gorev-dolgu" /></span>
                  <b className="msk-gorev-sayi qt-sayi">{son}/{g.hedef}</b>
                  <span className="msk-gorev-onay" role={tamam ? "img" : undefined} aria-label={tamam ? tt("Tamamlandı") : undefined}>
                    {tamam && <><QtIkon ad="onay" boyut={14} /><img className="msk-gorev-parilti" src="/dukkan/parilti.webp" alt="" aria-hidden="true" /></>}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {durum === "kaybetti" && eylemler.onHatalar && (
          <div className="msk-hatalar msk-a">
            <QtDugme tur="ikincil" boyut="k" ikon="kitap" tamGenislik onClick={(e) => { e.stopPropagation(); eylemler.onHatalar(); }}>
              {tt("Hatalarını çalış")}
            </QtDugme>
          </div>
        )}
      </section>}

      {asama >= 2 && rozet && (
        <section ref={rozetRef} className="msk-rozet msk-a" aria-label={tt("Yeni rozet")}>
          <div className="msk-rozet-madalyon">
            <div className="msk-rozet-patlama"><MacSonuLottie ref={lottie.yildiz} ad="yildiz" hiz={0.8} hazirlaMs={1650} /></div>
            <RozetMadalyonu grup={rozet.grup ?? "level"} kademe={rozet.kademe ?? "altin"} boyut={64} sembol={rozetSembolu(rozet.ikon)} />
          </div>
          <div className="msk-rozet-metin">
            <span className="msk-rozet-etiket">{tt("Yeni rozet!")}</span>
            <b className="msk-rozet-ad">{ttSunucu(rozet.ad)}</b>
          </div>
        </section>
      )}

      {kazandi && !az && (
        <KonfetiKatmani ref={lottie.konfeti} />
      )}

      <div className="msk-eylem" onClick={(e) => e.stopPropagation()}>
        <QtDugme boyut="b" ikon="yenile" className="msk-eylem-rovans" devreDisi={Boolean(eylemler.rovansKapali)}
                 onClick={() => eylemler.onRovans?.()}>
          {tt("Rövanş")}
        </QtDugme>
        <QtDugme tur="ikincil" className="msk-eylem-yeni" onClick={() => eylemler.onYeniMac?.()}>
          {tt("Yeni maç")}
        </QtDugme>
        <QtIkonDugme ikon="ev" boyut="b" etiket={tt("Ana sayfa")} onClick={() => eylemler.onAnaSayfa?.()} />
      </div>

      {ucus && createPortal(
        <div className="msk-ucus" aria-hidden="true" style={{ left: ucus.x, top: ucus.y }}>
          {Array.from({ length: COIN_ADET }, (_, i) => {
            // Taneler tek noktadan değil, küçük bir yelpazeden çıkar (yay çizerken birbirini örtmesin).
            const sx = Math.round(Math.cos((i / COIN_ADET) * Math.PI * 2) * 18);
            const sy = Math.round(Math.sin((i / COIN_ADET) * Math.PI * 2) * 12);
            return (
              <span key={i} className="msk-ucus-x"
                    style={{ "--sx": `${sx}px`, "--dx": `${ucus.dx}px`, animationDelay: `${i * COIN_ARA_MS}ms`, animationDuration: `${COIN_UCUS_MS}ms` }}
                    onAnimationEnd={(e) => { if (e.target === e.currentTarget) coinVardi(i); }}>
                <span className="msk-ucus-y"
                      style={{ "--sy": `${sy}px`, "--dy": `${ucus.dy}px`, animationDelay: `${i * COIN_ARA_MS}ms`, animationDuration: `${COIN_UCUS_MS}ms` }}>
                  <img src="/dukkan/coin.webp" alt="" />
                </span>
              </span>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}

// Coin varışında üst sayaç (ebeveyn) yeniden çizilir; sahne aynı prop'larla yeniden çizilmesin.
export default memo(MacSonuKutlama);
