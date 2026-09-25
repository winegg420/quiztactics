// Quiz Tactics tasarım sistemi — TEMEL BİLEŞENLER.
// Hepsi durumsuz ve sunumsaldır: veri prop'la gelir, RPC/Supabase çağrısı yoktur.
// Metin prop'ları çağıranın çevirdiği (tt) metindir; bileşenin kendi iç metinleri
// tt() ile çevrilir (İngilizce karşılıklar: oyun/lib/ceviri/tasarim.js).
import { useEffect, useRef } from "react";
import QtIkon from "./Ikon.jsx";
import { CoinIkon } from "../components/ParaIkonlari.jsx";
import { tt, aktifDil } from "../lib/dil.js";

/** Sınıf adlarını birleştirir: sinif("a", kosul && "b") */
export const sinif = (...a) => a.filter(Boolean).join(" ");

/** Sayıyı dile göre biçimler: 12450 → "12.450" (tr) / "12,450" (en) */
export function sayiBicim(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return n ?? "";
  try {
    return new Intl.NumberFormat(aktifDil() === "tr" ? "tr-TR" : "en-US").format(n);
  } catch {
    return String(n);
  }
}

// ——————————————————————— DÜĞME ———————————————————————
/**
 * <QtDugme tur="birincil" boyut="o" ikon="oyna" onClick={…}>Oyna</QtDugme>
 * tur: birincil (turuncu) · ikincil (beyaz) · mor · tehlike · hayalet (dudaksız)
 * boyut: k (44 px) · o (52 px) · b (60 px)
 * as: Link gibi başka bir öğe (ör. as={Link} to="/joker")
 */
export function QtDugme({
  tur = "birincil",
  boyut = "o",
  ikon,
  ikonSag,
  tamGenislik = false,
  yukleniyor = false,
  devreDisi = false,
  as: Oge = "button",
  className,
  children,
  type,
  ...rest
}) {
  const dugmeMi = Oge === "button";
  const kapali = devreDisi || yukleniyor;
  const ikonBoyut = boyut === "k" ? 20 : boyut === "b" ? 24 : 22;
  return (
    <Oge
      className={sinif(
        "qt-dugme",
        `qt-dugme--${tur}`,
        `qt-dugme--${boyut}`,
        tamGenislik && "qt-dugme--tam",
        yukleniyor && "qt-dugme--yukleniyor",
        className,
      )}
      {...(dugmeMi ? { type: type ?? "button", disabled: kapali || undefined } : { "aria-disabled": kapali || undefined })}
      aria-busy={yukleniyor || undefined}
      {...rest}
    >
      {yukleniyor ? <span className="qt-donen" aria-hidden="true" /> : ikon && <QtIkon ad={ikon} boyut={ikonBoyut} />}
      <span className="qt-dugme-yazi">{children}</span>
      {ikonSag && !yukleniyor && <QtIkon ad={ikonSag} boyut={ikonBoyut} />}
    </Oge>
  );
}

/**
 * Yuvarlak ikon düğmesi (44 px). `etiket` ZORUNLU (ekran okuyucu adı).
 * <QtIkonDugme ikon="zil" etiket={tt("Bildirimler")} rozet={2} />
 * tur: yuzey (beyaz, dudaklı) · saydam (dudaksız) · mor
 */
export function QtIkonDugme({ ikon, etiket, rozet, tur = "yuzey", boyut = "o", as: Oge = "button", className, type, ...rest }) {
  const dugmeMi = Oge === "button";
  const ad = rozet ? tt("{ad} ({sayi} yeni)", { ad: etiket, sayi: rozet }) : etiket;
  return (
    <Oge
      className={sinif("qt-ikon-dugme", `qt-ikon-dugme--${tur}`, `qt-ikon-dugme--${boyut}`, className)}
      aria-label={ad}
      title={etiket}
      {...(dugmeMi ? { type: type ?? "button" } : {})}
      {...rest}
    >
      <QtIkon ad={ikon} boyut={boyut === "b" ? 26 : 22} />
      {rozet ? <QtSayiRozeti sayi={rozet} /> : null}
    </Oge>
  );
}

// ——————————————————————— KART ———————————————————————
/**
 * <QtKart>…</QtKart> — beyaz levha + 5 px alt dudak.
 * ton: yuzey · duz (dudaksız, iç içe gerekiyorsa DEĞİL — kart iç içe konmaz) · mor · vurgu
 * dolgu: yok · k · o · b     onClick verilirse <button> olur ve basılır.
 */
export function QtKart({ ton = "yuzey", dolgu = "o", as, onClick, className, children, type, ...rest }) {
  const Oge = as ?? (onClick ? "button" : "div");
  const tiklanir = Boolean(onClick) || (as && as !== "div" && as !== "section" && as !== "article");
  return (
    <Oge
      className={sinif("qt-kart", `qt-kart--${ton}`, `qt-kart--dolgu-${dolgu}`, tiklanir && "qt-kart--tiklanir", className)}
      onClick={onClick}
      {...(Oge === "button" ? { type: type ?? "button" } : {})}
      {...rest}
    >
      {children}
    </Oge>
  );
}

// ——————————————————————— ROZET / ÇİP ———————————————————————
/**
 * Durağan etiket (dokunulmaz). <QtRozet ton="dogru" ikon="onay">Kazandın</QtRozet>
 * ton: notr · mor · vurgu · dogru · yanlis · uyari · bilgi · coin · koyu
 *      lig-bronz · lig-gumus · lig-altin · lig-elmas · lig-efsane
 */
export function QtRozet({ ton = "notr", ikon, boyut = "o", className, children, ...rest }) {
  return (
    <span className={sinif("qt-rozet", `qt-rozet--${ton}`, boyut === "k" && "qt-rozet--k", className)} {...rest}>
      {ikon && <QtIkon ad={ikon} boyut={boyut === "k" ? 14 : 16} />}
      {children}
    </span>
  );
}

const LIG_ADLARI = { bronz: "Bronz", gumus: "Gümüş", altin: "Altın", elmas: "Elmas", efsane: "Efsane" };
/** <QtLigRozeti lig="altin" /> → kalkan ikonlu "Altın" rozeti. children verilirse metni ezer. */
export function QtLigRozeti({ lig = "bronz", children, ...rest }) {
  return (
    <QtRozet ton={`lig-${lig}`} ikon="lig" {...rest}>
      {children ?? tt(LIG_ADLARI[lig] ?? lig)}
    </QtRozet>
  );
}

/** Kırmızı sayı balonu (bildirim sayısı). 0/boşsa çizilmez. Anlamı ata öğenin etiketinde olmalı. */
export function QtSayiRozeti({ sayi, en = 99, nokta = false, className }) {
  if (!nokta && !sayi) return null;
  return (
    <span className={sinif("qt-sayi-rozeti", nokta && "qt-sayi-rozeti--nokta", className)} aria-hidden="true">
      {nokta ? null : sayi > en ? `${en}+` : sayi}
    </span>
  );
}

/**
 * Seçilebilir çip (filtre, kategori). 44 px. <QtCip secili={a} onClick={…}>Bilim</QtCip>
 */
export function QtCip({ secili = false, ikon, sayi, className, children, type, ...rest }) {
  return (
    <button type={type ?? "button"} className={sinif("qt-cip", secili && "qt-cip--secili", className)} aria-pressed={secili} {...rest}>
      {ikon && <QtIkon ad={ikon} boyut={18} />}
      <span>{children}</span>
      {sayi != null && <span className="qt-cip-sayi">{sayi}</span>}
    </button>
  );
}

// ——————————————————————— SEKMELER / ANAHTAR ———————————————————————
/**
 * Bölümlü sekme. <QtSekmeler etiket={tt("Dükkân")} sekmeler={[{kod:"skill", ad:tt("Skill")}, …]} aktif="skill" onSec={setSekme} />
 * Paneli çağıran çizer; panelin id'si `qt-panel-${kod}` olursa aria-controls bağlanır.
 */
export function QtSekmeler({ sekmeler = [], aktif, onSec, etiket, className }) {
  const kok = useRef(null);
  // Seçili sekme hep görünür: çubuk yatay kayıyorsa (telefon, çok sekme) seçili sekme kenarda
  // kesik/ekran dışında kalmasın. Yalnız çubuğun kendi scrollLeft'i değişir (sayfa dikey kaymaz;
  // scrollIntoView kullanılmaz). Azaltılmış harekette anında.
  const sekmeSayisi = sekmeler.length;
  useEffect(() => {
    const cubuk = kok.current;
    if (!cubuk || cubuk.scrollWidth <= cubuk.clientWidth + 1) return;
    const el = cubuk.querySelector(`[data-kod="${CSS.escape(String(aktif ?? ""))}"]`);
    if (!el) return;
    try {
      const c = cubuk.getBoundingClientRect();
      const e = el.getBoundingClientRect();
      const pay = 16;
      let hedef = null;
      if (e.left < c.left + pay) hedef = cubuk.scrollLeft - (c.left + pay - e.left);
      else if (e.right > c.right - pay) hedef = cubuk.scrollLeft + (e.right - (c.right - pay));
      if (hedef == null) return;
      const azalt = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      cubuk.scrollTo({ left: Math.max(0, hedef), behavior: azalt ? "auto" : "smooth" });
    } catch {
      /* eski tarayıcı: kaydırma yok, sekme yine seçilir */
    }
  }, [aktif, sekmeSayisi]);
  const tus = (e, i) => {
    const yon = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!yon) return;
    e.preventDefault();
    const s = sekmeler[(i + yon + sekmeler.length) % sekmeler.length];
    onSec?.(s.kod);
    kok.current?.querySelector(`[data-kod="${s.kod}"]`)?.focus();
  };
  return (
    <div ref={kok} className={sinif("qt-sekmeler", className)} role="tablist" aria-label={etiket}>
      {sekmeler.map((s, i) => {
        const secili = s.kod === aktif;
        return (
          <button
            key={s.kod}
            type="button"
            role="tab"
            data-kod={s.kod}
            aria-selected={secili}
            aria-controls={`qt-panel-${s.kod}`}
            tabIndex={secili ? 0 : -1}
            className={sinif("qt-sekme", secili && "qt-sekme--secili")}
            onClick={() => onSec?.(s.kod)}
            onKeyDown={(e) => tus(e, i)}
          >
            {s.ikon && <QtIkon ad={s.ikon} boyut={18} />}
            <span>{s.ad}</span>
            {s.sayi ? <QtSayiRozeti sayi={s.sayi} className="qt-sekme-sayi" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Açık/kapalı anahtarı (ör. "Dereceli"). Bütün satır dokunulur, 44 px.
 * <QtAnahtar acik={dereceli} onDegis={setDereceli} etiket={tt("Dereceli")} aciklama={tt("Lig puanı + tam coin")} />
 */
export function QtAnahtar({ acik = false, onDegis, etiket, aciklama, devreDisi = false, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={acik}
      disabled={devreDisi || undefined}
      className={sinif("qt-anahtar", acik && "qt-anahtar--acik", className)}
      onClick={() => onDegis?.(!acik)}
    >
      <span className="qt-anahtar-metin">
        <span className="qt-anahtar-etiket">{etiket}</span>
        {aciklama && <span className="qt-anahtar-aciklama">{aciklama}</span>}
      </span>
      <span className="qt-anahtar-ray" aria-hidden="true">
        <span className="qt-anahtar-top" />
      </span>
    </button>
  );
}

// ——————————————————————— İLERLEME / AVATAR / COIN ———————————————————————
/**
 * <QtIlerleme deger={680} en={1000} etiket={tt("Seviye ilerlemesi")} ton="mor" isaret={84} />
 * ton: mor · coin · dogru · vurgu · lig-… ; isaret: yüzde (ör. yükselme hattı)
 */
export function QtIlerleme({ deger = 0, en = 100, ton = "mor", etiket, isaret, boyut = "o", className }) {
  const oran = en > 0 ? Math.max(0, Math.min(1, deger / en)) : 0;
  return (
    <div
      className={sinif("qt-ilerleme", `qt-ilerleme--${ton}`, boyut === "b" && "qt-ilerleme--b", className)}
      role="progressbar"
      aria-label={etiket}
      aria-valuemin={0}
      aria-valuemax={en}
      aria-valuenow={deger}
      style={{ "--_p": `${(oran * 100).toFixed(2)}%` }}
    >
      <span className="qt-ilerleme-dolgu" />
      {isaret != null && <span className="qt-ilerleme-isaret" style={{ left: `${isaret}%` }} aria-hidden="true" />}
    </div>
  );
}

/**
 * Yuvarlak avatar + renkli halka (+ seviye rozeti).
 * <QtAvatar src="/avatars/pro/tilki-k04.svg" ad="Deniz" boyut="l" seviye={23} />
 * boyut: s 36 · m 44 · l 64 · xl 88     halka: mor · vurgu · yanlis · dogru · coin · yok
 */
export function QtAvatar({ src, ad = "", boyut = "m", halka = "mor", seviye, cevrimici, className }) {
  return (
    <span className={sinif("qt-avatar", `qt-avatar--${boyut}`, `qt-avatar--halka-${halka}`, className)}>
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" draggable="false" referrerPolicy="no-referrer" />
      ) : (
        <span className="qt-avatar-harf" aria-hidden="true">{(ad.trim()[0] || "?").toLocaleUpperCase(aktifDil())}</span>
      )}
      {seviye != null && (
        <span className="qt-avatar-seviye">
          <span aria-hidden="true">{seviye}</span>
          <span className="qt-gizli">{tt("Seviye {n}", { n: seviye })}</span>
        </span>
      )}
      {cevrimici && (
        <span className="qt-avatar-cevrimici">
          <span className="qt-gizli">{tt("Çevrimiçi")}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Coin hapı. onClick ya da as verilirse düğme olur (Dükkân › Coin'e götürür).
 * <QtCoinHapi miktar={12450} onClick={…} />
 */
export function QtCoinHapi({ miktar, onClick, as, etiket, className, type, ...rest }) {
  const Oge = as ?? (onClick ? "button" : "span");
  const metin = sayiBicim(miktar);
  return (
    <Oge
      className={sinif("qt-coin", Oge !== "span" && "qt-coin--tiklanir", className)}
      aria-label={etiket ?? tt("{n} coin", { n: metin })}
      role={Oge === "span" ? "img" : undefined}
      onClick={onClick}
      {...(Oge === "button" ? { type: type ?? "button" } : {})}
      {...rest}
    >
      <CoinIkon boyut={20} />
      <b>{metin}</b>
    </Oge>
  );
}

// ——————————————————————— LİSTE ———————————————————————
/** Satırları beyaz kart içinde, aralarında çizgiyle dizer. */
export function QtListe({ children, etiket, className }) {
  return (
    <div className={sinif("qt-liste", className)} role="list" aria-label={etiket}>
      {children}
    </div>
  );
}

/**
 * <QtListeSatiri bas={<QtAvatar …/>} baslik="Mert" alt="Altın Lig · 1.240" sag={<QtRozet>…</QtRozet>} ok onClick={…} />
 * ikon: bas yerine renkli ikon kutusu. vurgulu: "sen" satırı.
 * Satır tıklanırsa (onClick/as) `sag` içine düğme KOYMA (iç içe düğme olmaz).
 */
export function QtListeSatiri({ bas, ikon, ikonTon = "mor", baslik, alt, sag, ok = false, vurgulu = false, onClick, as, className, type, ...rest }) {
  const Oge = as ?? (onClick ? "button" : "div");
  const tiklanir = Oge !== "div";
  return (
    <div role="listitem" className={sinif("qt-satir-kap", vurgulu && "qt-satir-kap--vurgulu")}>
      <Oge
        className={sinif("qt-satir", tiklanir && "qt-satir--tiklanir", className)}
        onClick={onClick}
        {...(Oge === "button" ? { type: type ?? "button" } : {})}
        {...rest}
      >
        {bas ?? (ikon && (
          <span className={sinif("qt-satir-ikon", `qt-satir-ikon--${ikonTon}`)}>
            <QtIkon ad={ikon} boyut={22} />
          </span>
        ))}
        <span className="qt-satir-metin">
          <span className="qt-satir-baslik">{baslik}</span>
          {alt && <span className="qt-satir-alt">{alt}</span>}
        </span>
        {sag && <span className="qt-satir-sag">{sag}</span>}
        {ok && <QtIkon ad="ileri" boyut={20} className="qt-satir-ok" />}
      </Oge>
    </div>
  );
}

// ——————————————————————— BOŞ DURUM / İSKELET ———————————————————————
/**
 * <QtBosDurum ikon="kisiler" baslik={tt("Henüz arkadaşın yok")} metin={…} eylem={<QtDugme…/>} />
 * ton: mor · vurgu · dogru · yanlis (hata durumu için "yanlis" + ikon="uyari")
 */
export function QtBosDurum({ ikon = "soru", ton = "mor", baslik, metin, eylem, className }) {
  return (
    <div className={sinif("qt-bos", className)}>
      <span className={sinif("qt-bos-ikon", `qt-bos-ikon--${ton}`)}>
        <QtIkon ad={ikon} boyut={36} />
      </span>
      {baslik && <p className="qt-bos-baslik">{baslik}</p>}
      {metin && <p className="qt-bos-metin">{metin}</p>}
      {eylem && <div className="qt-bos-eylem">{eylem}</div>}
    </div>
  );
}

/**
 * Yükleniyor iskeleti. Kapsayıcıya aria-busy="true" ver; iskeletin kendisi gizlidir.
 * tur: metin · satir (avatar + iki çizgi) · kart · daire · dugme ; adet: tekrar sayısı
 */
export function QtIskelet({ tur = "metin", adet = 1, genislik, yukseklik, className }) {
  const stil = { width: genislik, height: yukseklik };
  const tek = (i) => {
    if (tur === "satir") {
      return (
        <span key={i} className="qt-iskelet-satir">
          <span className="qt-iskelet qt-iskelet--daire" />
          <span className="qt-iskelet-satir-metin">
            <span className="qt-iskelet qt-iskelet--metin" style={{ width: "62%" }} />
            <span className="qt-iskelet qt-iskelet--metin qt-iskelet--ince" style={{ width: "38%" }} />
          </span>
        </span>
      );
    }
    return <span key={i} className={sinif("qt-iskelet", `qt-iskelet--${tur}`)} style={stil} />;
  };
  return (
    <span className={sinif("qt-iskelet-grup", `qt-iskelet-grup--${tur}`, className)} aria-hidden="true">
      {Array.from({ length: adet }, (_, i) => tek(i))}
    </span>
  );
}
