// Quiz Tactics tasarım sistemi — KABUK BİLEŞENLERİ: marka, üst çubuk, üst menü,
// alt menü, modal / alt sayfa, bildirim (toast).
// Layout.jsx için tasarlandı: menü öğeleri React Router `NavLink` ile doğrudan
// çizilebilir (Baglanti={NavLink}); sağ taraf mevcut durumlu bileşenleri
// (BildirimZili, CoinHapi, AvatarMenu) `sag` yuvasına alabilir.
//
// iOS kuralı: sabit (position:fixed) öğelerde ve atalarında transform YOK.
// Basma hareketi yalnız sabit öğenin İÇİNDEKİ çocuklara uygulanır.
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import QtIkon, { QtQIsareti } from "./Ikon.jsx";
import { sinif, QtIkonDugme, QtCoinHapi, QtAvatar, QtSayiRozeti } from "./temel.jsx";
import { tt } from "../lib/dil.js";

// ——————————————————————— MARKA ———————————————————————
/**
 * Q işareti + "QUIZ TACTICS" yazısı (Yön A). Yeni logo değildir; Q çizimi Logo.jsx'ten.
 * <QtMarka as={Link} to="/" aria-label={tt("Quiz Tactics ana sayfa")} />
 */
export function QtMarka({ as: Oge = "span", boyut = "o", className, ...rest }) {
  return (
    <Oge className={sinif("qt-marka", `qt-marka--${boyut}`, className)} {...rest}>
      <QtQIsareti boyut={boyut === "b" ? 44 : 34} />
      <span className="qt-marka-yazi" aria-hidden={rest["aria-label"] ? "true" : undefined}>QUIZ TACTICS</span>
    </Oge>
  );
}

// Menü öğesi: Baglanti (NavLink) + to varsa bağlantı, yoksa düğme.
function MenuOgesi({ oge, aktif, Baglanti, onSec, className, aktifSinif, children }) {
  const kendiAktif = aktif != null && aktif === oge.kod;
  if (Baglanti && oge.to != null) {
    return (
      <Baglanti
        to={oge.to}
        end={oge.end}
        className={(d) => sinif(className, (d && typeof d === "object" && "isActive" in d ? d.isActive : kendiAktif) && aktifSinif)}
        onClick={oge.onClick}
      >
        {children}
      </Baglanti>
    );
  }
  return (
    <button
      type="button"
      className={sinif(className, kendiAktif && aktifSinif)}
      aria-current={kendiAktif ? "page" : undefined}
      onClick={() => {
        oge.onClick?.();
        onSec?.(oge.kod);
      }}
    >
      {children}
    </button>
  );
}

// ——————————————————————— ÜST ÇUBUK ———————————————————————
/**
 * <QtUstCubuk
 *    marka={<QtMarka as={Link} to="/" aria-label={tt("Quiz Tactics ana sayfa")} />}
 *    menu={<QtUstMenu ogeler={…} Baglanti={NavLink} etiket={tt("Ana menü")} />}   // yalnız ≥850 px görünür
 *    sag={<><BildirimZili /><CoinHapi /><AvatarMenu profile={profile} /></>}       // ya da hazır prop'lar ↓
 *    coin={12450} onCoin={…} bildirim={2} onBildirim={…} avatar={{ src, ad, seviye }} onAvatar={…}
 *    yapiskan />
 */
export function QtUstCubuk({
  marka,
  menu,
  sag,
  coin,
  onCoin,
  bildirim,
  onBildirim,
  avatar,
  onAvatar,
  yapiskan = false,
  className,
}) {
  return (
    <header className={sinif("qt-ustcubuk", yapiskan && "qt-ustcubuk--yapiskan", className)}>
      <div className="qt-ustcubuk-ic">
        <div className="qt-ustcubuk-marka">{marka ?? <QtMarka />}</div>
        {menu}
        <div className="qt-ustcubuk-sag">
          {sag ?? (
            <>
              {coin != null && <QtCoinHapi miktar={coin} onClick={onCoin} />}
              {onBildirim && <QtIkonDugme ikon="zil" etiket={tt("Bildirimler")} rozet={bildirim} onClick={onBildirim} />}
              {avatar && (
                <button type="button" className="qt-avatar-dugme" onClick={onAvatar} aria-label={tt("Profil menüsü")}>
                  <QtAvatar {...avatar} boyut="m" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Masaüstü yatay menü (850 px altında gizlenir; yerini QtAltMenu alır).
 * ogeler: [{ kod, ad, to, end, rozet }]
 */
export function QtUstMenu({ ogeler = [], aktif, Baglanti, onSec, etiket }) {
  return (
    <nav className="qt-ustmenu" aria-label={etiket}>
      {ogeler.map((o) => (
        <MenuOgesi key={o.kod} oge={o} aktif={aktif} Baglanti={Baglanti} onSec={onSec} className="qt-ustmenu-oge" aktifSinif="qt-ustmenu-oge--aktif">
          {o.ad}
          {o.rozet ? <QtSayiRozeti sayi={typeof o.rozet === "number" ? o.rozet : 0} nokta={o.rozet === true} className="qt-ustmenu-rozet" /> : null}
        </MenuOgesi>
      ))}
    </nav>
  );
}

// ——————————————————————— ALT MENÜ ———————————————————————
/**
 * 5 sekmeli alt menü.
 * sekmeler: [{ kod, ad, ikon, to, end, rozet (sayı | true = nokta), rozetEtiketi }]
 * Baglanti={NavLink} → aktiflik router'dan; yoksa `aktif` + `onSec`.
 * sabit: ekranın altına sabitlenir (içeriğe `.qt-altmenu-payi` ekle).
 * yalnizMobil: 850 px ve üstünde gizlenir.
 */
export function QtAltMenu({ sekmeler = [], aktif, Baglanti, onSec, sabit = false, yalnizMobil = false, etiket, className }) {
  return (
    <nav
      className={sinif("qt-altmenu", sabit && "qt-altmenu--sabit", yalnizMobil && "qt-altmenu--mobil", className)}
      aria-label={etiket ?? tt("Alt menü")}
    >
      {sekmeler.map((s) => (
        <MenuOgesi key={s.kod} oge={s} aktif={aktif} Baglanti={Baglanti} onSec={onSec} className="qt-altmenu-oge" aktifSinif="qt-altmenu-oge--aktif">
          <span className="qt-altmenu-ikon">
            <QtIkon ad={s.ikon} boyut={24} />
            {s.rozet ? (
              <QtSayiRozeti sayi={typeof s.rozet === "number" ? s.rozet : 0} nokta={s.rozet === true} className="qt-altmenu-rozet" />
            ) : null}
          </span>
          <span className="qt-altmenu-ad">{s.ad}</span>
          {s.rozet && s.rozetEtiketi ? <span className="qt-gizli">{s.rozetEtiketi}</span> : null}
        </MenuOgesi>
      ))}
    </nav>
  );
}

// ——————————————————————— MODAL / ALT SAYFA ———————————————————————
const ODAKLANABILIR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * <QtModal acik={a} onKapat={…} baslik={tt("Skill al")} altlik={<QtDugme…/>}>…</QtModal>
 * tur: modal (ortada) · altSayfa (alttan kayar; telefonda seçim listeleri için)
 * body'ye portal ile çizilir (transform'lu kabuğun içinde kalmaz).
 * Esc ve örtüye dokunma kapatır; odak içeride döner ve kapanınca geri verilir.
 */
export function QtModal({
  acik,
  onKapat,
  baslik,
  aciklama,
  children,
  altlik,
  tur = "modal",
  kapatDugmesi = true,
  ortuKapatir = true,
  className,
}) {
  const panel = useRef(null);
  const onceki = useRef(null);
  const kapatRef = useRef(onKapat);
  kapatRef.current = onKapat;
  const id = useId();

  useEffect(() => {
    if (!acik) return undefined;
    onceki.current = document.activeElement;
    const govde = document.body;
    const eskiTasma = govde.style.overflow;
    govde.style.overflow = "hidden";
    const ilk = panel.current?.querySelector("[data-qt-ilk-odak]") ?? panel.current;
    ilk?.focus({ preventScroll: true });
    const tus = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        kapatRef.current?.();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const liste = [...panel.current.querySelectorAll(ODAKLANABILIR)];
      if (!liste.length) {
        e.preventDefault();
        return;
      }
      const bas = liste[0];
      const son = liste[liste.length - 1];
      if (e.shiftKey && document.activeElement === bas) {
        e.preventDefault();
        son.focus();
      } else if (!e.shiftKey && document.activeElement === son) {
        e.preventDefault();
        bas.focus();
      }
    };
    document.addEventListener("keydown", tus);
    return () => {
      document.removeEventListener("keydown", tus);
      govde.style.overflow = eskiTasma;
      try {
        onceki.current?.focus?.({ preventScroll: true });
      } catch {
        /* odak geri verilemedi: öğe DOM'dan kalkmış olabilir */
      }
    };
  }, [acik]);

  if (!acik || typeof document === "undefined") return null;
  return createPortal(
    <div
      className={sinif("qt-ortu", `qt-ortu--${tur}`)}
      onMouseDown={(e) => {
        if (ortuKapatir && e.target === e.currentTarget) onKapat?.();
      }}
    >
      <div
        ref={panel}
        className={sinif("qt-modal", `qt-modal--${tur}`, className)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={baslik ? `${id}-b` : undefined}
        aria-describedby={aciklama ? `${id}-a` : undefined}
        tabIndex={-1}
      >
        {tur === "altSayfa" && <span className="qt-modal-tutamak" aria-hidden="true" />}
        {(baslik || kapatDugmesi) && (
          <div className="qt-modal-ust">
            {baslik && (
              <h2 id={`${id}-b`} className="qt-modal-baslik">
                {baslik}
              </h2>
            )}
            {kapatDugmesi && onKapat && (
              <QtIkonDugme ikon="carpi" etiket={tt("Kapat")} tur="saydam" onClick={onKapat} className="qt-modal-kapat" />
            )}
          </div>
        )}
        {aciklama && (
          <p id={`${id}-a`} className="qt-modal-aciklama">
            {aciklama}
          </p>
        )}
        <div className="qt-modal-govde">{children}</div>
        {altlik && <div className="qt-modal-altlik">{altlik}</div>}
      </div>
    </div>,
    document.body,
  );
}

// ——————————————————————— BİLDİRİM (TOAST) ———————————————————————
const TOAST_IKON = { notr: "bilgi", dogru: "onay", yanlis: "uyari", uyari: "uyari", bilgi: "bilgi", coin: "coin", mor: "yildiz" };

/**
 * <QtToast ton="coin" baslik={tt("+200 coin")} metin={tt("Arkadaş davetin kabul edildi")} onKapat={…} />
 * ton: notr · dogru · yanlis · uyari · bilgi · coin · mor. Yanlış/uyarı role="alert" olur.
 * Konum için QtToastYuvasi içine koy.
 */
export function QtToast({ ton = "notr", ikon, baslik, metin, eylem, onKapat, className }) {
  const acil = ton === "yanlis" || ton === "uyari";
  return (
    <div className={sinif("qt-toast", `qt-toast--${ton}`, className)} role={acil ? "alert" : "status"}>
      <span className="qt-toast-ikon" aria-hidden="true">
        <QtIkon ad={ikon ?? TOAST_IKON[ton] ?? "bilgi"} boyut={22} />
      </span>
      <span className="qt-toast-metin">
        {baslik && <b className="qt-toast-baslik">{baslik}</b>}
        {metin && <span className="qt-toast-alt">{metin}</span>}
      </span>
      {eylem && <span className="qt-toast-eylem">{eylem}</span>}
      {onKapat && <QtIkonDugme ikon="carpi" etiket={tt("Kapat")} tur="saydam" onClick={onKapat} className="qt-toast-kapat" />}
    </div>
  );
}

/**
 * Ekranın üstüne (ya da altına) sabit toast yuvası; body'ye portal.
 * <QtToastYuvasi>{liste.map(t => <QtToast key={t.id} … />)}</QtToastYuvasi>
 * gomulu: portal/sabitleme yapmadan yerinde çizer (örnek sayfa, test).
 */
export function QtToastYuvasi({ children, konum = "ust", gomulu = false }) {
  const icerik = (
    <div
      className={sinif("qt-toast-yuvasi", `qt-toast-yuvasi--${konum}`, gomulu && "qt-toast-yuvasi--gomulu")}
      aria-live="polite"
    >
      {children}
    </div>
  );
  if (gomulu || typeof document === "undefined") return icerik;
  return createPortal(icerik, document.body);
}
