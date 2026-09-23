// ============================================================
// MAÇ SONU SAHNESİ (Paket 36) — beş modun ortak iskeleti
//
// Klasik/Saf Bilgi, Düello, Hızlı Mod, Grup ve Turnuva sonuç ekranları bu
// bileşenle çizilir. Bileşen İÇERİĞİ BİLMEZ: RPC çağırmaz, veri çekmez;
// sayfa ne verirse onu yerleştirir ve açılış sırasını yönetir.
//
// Açılış sekansı (~1,9 sn) TEK bir `adim` state'iyle (0-8) yürür; görseller
// CSS `animation-delay` ile sıralanır. Zamanlayıcı olarak tek bir
// requestAnimationFrame döngüsü var, bileşen sökülünce iptal edilir.
// Ekrana dokunmak ya da Esc sekansı anında bitirir. prefers-reduced-motion
// açıksa sekans hiç oynamaz: her şey son hâliyle, animasyonsuz görünür.
//
// Tasarım A (Şerit M1): görünüm oyun/tasarim/ekranlar/m1-sonuc.css (m1-ss-*).
// Prop arayüzü AYNI (Düello da kullanıyor). Çağıranların eylem çubuğu kancaları
// `.mss-tam` ve `.mss-eylem-yuva` korunur.
//
// Kurallar (CLAUDE.md iOS):
//  - Zemin `position: fixed` ve TRANSFORM TAŞIMAZ.
//  - Coin uçuşunda fixed kapsayıcı yerinde durur; hareket içteki iki
//    span'dadır (yatay + dikey ayrı → yay çizer).
// ============================================================
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AvatarCerceve from "./AvatarCerceve.jsx";
import AvatarDugmesi from "./AvatarDugmesi.jsx";
import SayanSayi from "./SayanSayi.jsx";
import SenRozeti from "./SenRozeti.jsx";
import LevelKazanci from "./LevelKazanci.jsx";
import { QtCan, QtDugme, QtIkon, QtIlerleme } from "../tasarim/index.js";
import { coinTazele } from "../lib/coin.js";
import { sesCoin } from "../lib/ses.js";
import { tt, ttSunucu } from "../lib/dil.js";
import "../tasarim/ekranlar/m1-sonuc.css";

// Adım eşikleri (ms). i. eşik geçilince adim = i + 1.
// 1 zemin · 2 banner · 3 avatarlar · 4 kalp/skor · 5 ödül sayımı ·
// 6 coin uçuşu · 7 detay · 8 eylem çubuğu
const ESIKLER = [0, 150, 450, 750, 1050, 1350, 1650, 1900];
const ODUL_SAYIM_MS = 600;
const COIN_ARA_MS = 80;

// Ana sayfa bildirim kartı: sonuç ekranı görüldüyse bu oturumda ana sayfada
// sorulur (Paket 36 H). BildirimIzniSor'un kendi "ne zaman" mantığı aynen durur.
export const BILDIRIM_SONRA_ANAHTAR = "bildim_bildirim_mac_sonrasi";

function hareketAzaltilmis() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Sonradan (veri gelince) eklenen öğe: kalan gecikmeyi takılırken bir kez hesaplar. */
function kalanGecikme(baslangic, hedefMs) {
  return Math.max(0, hedefMs - (performance.now() - baslangic));
}

/** Karşılaşmadaki bir taraf. rol: "kazanan" | "kaybeden" | "esit" */
function Taraf({ kisi, rol, yan, adim, atlandi, canToplam, sen }) {
  const boyut = rol === "kazanan" ? 96 : rol === "kaybeden" ? 72 : 84;
  const skor = kisi?.skor;
  return (
    <div className={`m1-ss-taraf ${yan} ${rol}`}>
      <div className="m1-ss-avatar" style={{ "--boyut": `${boyut}px` }}>
        {rol === "kazanan" && <span className="m1-ss-hale" aria-hidden="true" />}
        {rol === "kazanan" && (
          <span className="m1-ss-tac" aria-hidden="true"><QtIkon ad="kupa" boyut={18} /></span>
        )}
        {/* Paket 41 D: rakibin avatarına dokununca profil kartı (kendi avatarın düz kalır) */}
        <AvatarDugmesi userId={kisi?.profil?.id} profil={kisi?.profil} kendi={Boolean(sen) || yan === "sol"}>
          <AvatarCerceve profile={kisi?.profil} boyut={boyut} userId={kisi?.profil?.id} />
        </AvatarDugmesi>
      </div>
      <div className="m1-ss-isim">
        <span className="m1-ss-isim-metin">{kisi?.profil?.gorunen_ad ?? ""}</span>
        {sen && <SenRozeti />}
      </div>
      {canToplam ? (
        <QtCan dolu={Math.max(0, kisi?.can ?? 0)} toplam={canToplam} etiket={kisi?.profil?.gorunen_ad} boyut={18} />
      ) : skor != null ? (
        <div className="m1-ss-skor">
          {atlandi ? skor : <SayanSayi deger={adim >= 4 ? skor : 0} sure={ODUL_SAYIM_MS} />}
        </div>
      ) : null}
      {kisi?.ek && <div className="m1-ss-taraf-ek">{kisi.ek}</div>}
    </div>
  );
}

/** Ödül hapı satırı. Veri geç gelirse kalan gecikmeyle girer. */
function OdulSatiri({ oduller, adim, atlandi, baslangic, hapRef }) {
  const [gecikme] = useState(() => kalanGecikme(baslangic, ESIKLER[4]));
  return (
    <div className="m1-ss-oduller m1-ss-sira" style={atlandi ? undefined : { animationDelay: `${gecikme}ms` }}>
      {oduller.map((o, i) => (
        <span key={`${o.ikon}-${i}`} className={`m1-ss-odul${o.ikon === "coin" ? " m1-ss-odul--coin" : ""}`}
              ref={o.ikon === "coin" ? hapRef : undefined}>
          <QtIkon ad={o.ikon} boyut={18} />
          <b>+{atlandi ? o.deger : <SayanSayi deger={adim >= 5 ? o.deger : 0} sure={ODUL_SAYIM_MS} />}</b>
          <span className="m1-ss-odul-etiket">{o.etiket}</span>
        </span>
      ))}
    </div>
  );
}

/**
 * Paket 37 D.1 — günlük görev ilerlemesi (ödül haplarının altında, Detay'ın üstünde).
 * En çok ilerlemiş iki görev; hiçbiri ilerlemediyse hiç çizilmez.
 */
function GorevIlerlemesi({ gorevler, atlandi, baslangic }) {
  const [gecikme] = useState(() => kalanGecikme(baslangic, ESIKLER[4]));
  const oran = (g) => (g.hedef > 0 ? Math.min(1, g.ilerleme / g.hedef) : 0);
  const secilen = gorevler
    .filter((g) => g && g.ilerleme > 0 && g.hedef > 0)
    .sort((a, b) => oran(b) - oran(a))
    .slice(0, 2);
  if (!secilen.length) return null;
  // Paket 42 E.3: tamamlanan görevin ödülü kendiliğinden gelmiyor — nereden alınacağını söyle
  const alinacak = secilen.some((g) => g.ilerleme >= g.hedef && !g.alindi);
  return (
    <div className="m1-ss-gorevler m1-ss-sira" aria-label={tt("Günlük görevler")}
         style={atlandi ? undefined : { animationDelay: `${gecikme}ms` }}>
      {secilen.map((g) => {
        const bitti = g.ilerleme >= g.hedef;
        return (
          <div key={g.id} className="m1-ss-gorev">
            <span className="m1-ss-gorev-ad">{ttSunucu(g.ad)}</span>
            <QtIlerleme deger={Math.min(g.ilerleme, g.hedef)} en={g.hedef} ton={bitti ? "dogru" : "vurgu"} etiket={ttSunucu(g.ad)} />
            <b className="m1-ss-gorev-sayi">{Math.min(g.ilerleme, g.hedef)}/{g.hedef}</b>
            {bitti ? (
              <span className="m1-ss-gorev-onay" role="img" aria-label={tt("Tamamlandı")}><QtIkon ad="onay" boyut={14} /></span>
            ) : <span />}
          </div>
        );
      })}
      {alinacak && <p className="m1-ss-gorev-ipucu">{tt("Ödülünü ana sayfadaki Günlük Görevler'den al")}</p>}
    </div>
  );
}

/** Ödül hapından üst bardaki coin sayacına uçan 3 coin. Hedef yoksa hiç çizilmez. */
function CoinUcusu({ kaynak, hedef, onBitti }) {
  const [yol, setYol] = useState(null);
  const onBittiRef = useRef(onBitti);
  onBittiRef.current = onBitti;

  useLayoutEffect(() => {
    const a = kaynak?.getBoundingClientRect?.();
    const b = hedef?.getBoundingClientRect?.();
    if (!a || !b || !b.width) { onBittiRef.current?.(); return; }
    setYol({
      x: a.left + 14, y: a.top + a.height / 2 - 8,
      dx: b.left + b.width / 2 - (a.left + 14) - 8,
      dy: b.top + b.height / 2 - (a.top + a.height / 2),
    });
  }, [kaynak, hedef]);

  if (!yol) return null;
  return createPortal(
    <div className="m1-ss-coin-ucus" aria-hidden="true"
         style={{ left: yol.x, top: yol.y, "--dx": `${yol.dx}px`, "--dy": `${yol.dy}px` }}>
      {[0, 1, 2].map((i) => (
        <span key={i} className="m1-ss-coin-x" style={{ animationDelay: `${i * COIN_ARA_MS}ms` }}
              onAnimationEnd={i === 2 ? () => onBittiRef.current?.() : undefined}>
          <span className="m1-ss-coin-y" style={{ animationDelay: `${i * COIN_ARA_MS}ms` }}>
            <QtIkon ad="coin" boyut={12} />
          </span>
        </span>
      ))}
    </div>,
    document.body
  );
}

/**
 * @param {"kazandi"|"kaybetti"|"berabere"} durum
 * @param {string} baslik              "Kazandın!" / "Kaybettin" / "Berabere!"
 * @param {string} [altYazi]           tek satır açıklama (ör. "2 soru farkla")
 * @param {object} [ben]               { profil, skor, can, ek }  — soldaki taraf
 * @param {object} [rakip]             { profil, skor, can, ek }  — sağdaki taraf; yoksa tek avatar
 * @param {number} [canToplam]         düelloda 3; verilmezse kalp çizilmez
 * @param {Array}  [oduller]           [{ ikon:"coin", deger:50, etiket:"coin" }, …]
 * @param {string} [levelKaynak]       P2A: "mac:<id>" · "duello:<id>" · "turnuva:<id>" — kazanılan XP / level atlama (LevelKazanci)
 * @param {Array}  [gorevler]          günlük görevler [{id, ad, ilerleme, hedef}] (OdulDokumu › onGorevler)
 * @param {ReactNode} [odulNotu]       ödül yoksa hap satırının yerine (ör. "Arkadaş maçı — ödül ve puan yok.")
 * @param {ReactNode} [karsilasma]     ben/rakip yerine serbest orta sahne (podyum, şampiyon, tek avatar)
 * @param {ReactNode} [ozet]           "Detay" içine girecek mod-özel bölüm
 * @param {number} [detayRozet]        Detay düğmesindeki sayı (kaçırılan soru); 0 ise çizilmez
 * @param {ReactNode} eylemler         alttaki sabit düğmeler
 * @param {ReactNode} [children]       sahnenin altına eklenecek serbest içerik
 *                                     (sohbet çubuğu, oturum notu, paylaş…)
 */
export default function MacSonuSahnesi({
  durum = "berabere",
  baslik,
  altYazi,
  ben,
  rakip,
  canToplam,
  oduller,
  levelKaynak,
  gorevler,
  odulNotu,
  karsilasma,
  ozet,
  detayRozet = 0,
  eylemler,
  children,
}) {
  const [azalt] = useState(hareketAzaltilmis);
  const [adim, setAdim] = useState(azalt ? 8 : 0);
  const [atlandi, setAtlandi] = useState(azalt);
  const [detayAcik, setDetayAcik] = useState(false);   // her maçta kapalı başlar; hiçbir yere yazılmaz
  const [ucus, setUcus] = useState("bekliyor");        // bekliyor | uçuyor | bitti
  const [baslangic] = useState(() => performance.now());
  const [coinHap, setCoinHap] = useState(null);
  const bannerRef = useRef(null);
  const kokRef = useRef(null);
  const coinSesiRef = useRef(false);
  const tamam = adim >= 8;

  // Tek rAF döngüsü: geçen süreye göre adımı ilerletir; sökülünce iptal.
  useEffect(() => {
    if (atlandi) return undefined;
    let cerceve = 0;
    const don = () => {
      const gecen = performance.now() - baslangic;
      let yeni = 0;
      while (yeni < ESIKLER.length && gecen >= ESIKLER[yeni]) yeni += 1;
      setAdim((a) => (a === yeni ? a : yeni));
      if (yeni < 8) cerceve = requestAnimationFrame(don);
    };
    cerceve = requestAnimationFrame(don);
    return () => cancelAnimationFrame(cerceve);
  }, [atlandi, baslangic]);

  const atla = useCallback(() => {
    setAtlandi(true);
    setAdim(8);
  }, []);

  // Esc sekansı bitirir (yalnız sekans sürerken dinlenir).
  useEffect(() => {
    if (tamam) return undefined;
    const tus = (e) => { if (e.key === "Escape") atla(); };
    window.addEventListener("keydown", tus);
    return () => window.removeEventListener("keydown", tus);
  }, [tamam, atla]);

  // Eylem çubuğu alt sekme çubuğunun hemen üstüne yapışır. Sekme çubuğu
  // (fixed) güvenli alanı zaten kapsıyor; yoksa çubuk güvenli alanı kendisi bırakır.
  useLayoutEffect(() => {
    const kok = kokRef.current;
    if (!kok) return undefined;
    const olc = () => {
      // Arayüz yenilemesinde sekme çubuğu .tabbar → .mobile-nav oldu; eski seçici hiç
      // bulamıyordu ve çubuk sekme çubuğunun arkasında kalıyordu. Yüzen çubuk için
      // yükseklik değil, ekranın altından çubuğun üst kenarına kadarki mesafe alınır.
      const tb = document.querySelector(".mobile-nav, .tabbar");
      const h = tb && getComputedStyle(tb).display !== "none"
        ? Math.max(0, window.innerHeight - tb.getBoundingClientRect().top) : 0;
      kok.style.setProperty("--mss-eylem-alt", `${Math.round(h)}px`);
      kok.style.setProperty("--mss-guvenli", h ? "0px" : "env(safe-area-inset-bottom)");
      // Paket 42 E.4: içerik kısa kalınca eylem çubuğu ekranın ortasında kalıyordu. Sahne en az
      // "sahnenin başından sekme çubuğuna kadar" uzar; çubuk en alta iner (margin-top: auto).
      const ust = kok.getBoundingClientRect().top + window.scrollY;
      kok.style.setProperty("--m1-ss-min", `calc(100dvh - ${Math.round(ust + h)}px)`);
    };
    olc();
    window.addEventListener("resize", olc);
    // Maç biterken oyun modu (body.bd-oyun-modu) bu ölçümden SONRA kalkar ve sekme çubuğu
    // o an görünür olur; ölçüm 0 kalınca çubuk sekme çubuğunun arkasına düşüyordu
    // (23 Eyl 2026, Düello maç sonu). Body sınıfı değişince yeniden ölçülür.
    const gozcu = typeof MutationObserver === "undefined" ? null : new MutationObserver(olc);
    gozcu?.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => { window.removeEventListener("resize", olc); gozcu?.disconnect(); };
  }, []);

  // Odak banner'a: ekran okuyucu sonucu bir kez okur. Ana sayfada bildirim
  // izni bu maçtan sonra sorulsun diye oturum işareti bırakılır.
  useEffect(() => {
    try { bannerRef.current?.focus({ preventScroll: true }); } catch { /* eski tarayıcı */ }
    try { sessionStorage.setItem(BILDIRIM_SONRA_ANAHTAR, "1"); } catch { /* özel mod */ }
  }, []);

  // Coin uçuşu: 6. adımda, coin ödülü ve üst bar sayacı (.bd-coin-hap) varsa.
  // Sayaç bulunamazsa uçuş atlanır — uydurma bir hedefe uçulmaz.
  const coinDegeri = (oduller ?? []).find((o) => o.ikon === "coin")?.deger ?? 0;
  const [hedef, setHedef] = useState(null);
  useEffect(() => {
    if (ucus !== "bekliyor" || coinDegeri <= 0) return;
    if (atlandi) { setUcus("bitti"); coinTazele(); return; }
    if (adim < 6 || !coinHap) return;
    const h = document.querySelector(".bd-coin-hap");
    if (!h) { setUcus("bitti"); coinTazele(); return; }
    setHedef(h);
    setUcus("uçuyor");
  }, [adim, atlandi, coinDegeri, coinHap, ucus]);

  // Coin sesi: ödül sayacı artmaya başladığında bir kez (her +1'de değil).
  useEffect(() => {
    if (coinSesiRef.current || coinDegeri <= 0 || (adim < 5 && !atlandi)) return;
    coinSesiRef.current = true;
    sesCoin();
  }, [adim, atlandi, coinDegeri]);

  const ucusBitti = useCallback(() => {
    setUcus("bitti");
    coinTazele();   // üst bar sayacı yeni bakiyeye sayarak geçer (CoinHapi → SayanSayi)
  }, []);

  // Uçuş sürerken atlanırsa coinler kaldırılır, sayaç hemen güncellenir.
  useEffect(() => {
    if (atlandi && ucus === "uçuyor") ucusBitti();
  }, [atlandi, ucus, ucusBitti]);

  const oduller2 = (oduller ?? []).filter((o) => o && o.deger > 0);
  const kazananYan = durum === "kazandi" ? "ben" : durum === "kaybetti" ? "rakip" : null;
  const rolBul = (yan) => (!kazananYan ? "esit" : kazananYan === yan ? "kazanan" : "kaybeden");

  return (
    <div
      ref={kokRef}
      className={`m1-ss ${durum}${atlandi ? " atla" : ""}${tamam ? " tamam" : ""}`}
      onClick={tamam ? undefined : atla}
    >
      <div className="m1-ss-zemin" aria-hidden="true">
        {durum === "kazandi" && <div className="m1-ss-isima" />}
      </div>

      <div className="m1-ss-banner" ref={bannerRef} tabIndex={-1} role="status" aria-live="polite">
        <h2 className="m1-ss-baslik">{baslik}</h2>
        {altYazi && <p className="m1-ss-alt">{altYazi}</p>}
      </div>

      {karsilasma ? (
        <div className="m1-ss-karsilasma serbest">{karsilasma}</div>
      ) : ben ? (
        <div className={`m1-ss-karsilasma${rakip ? "" : " tek"}`}>
          <Taraf kisi={ben} rol={rakip ? rolBul("ben") : "esit"} yan="sol" adim={adim}
                 atlandi={atlandi} canToplam={canToplam} sen={Boolean(rakip)} />
          {rakip && <div className="m1-ss-vs" aria-hidden="true">VS</div>}
          {rakip && (
            <Taraf kisi={rakip} rol={rolBul("rakip")} yan="sag" adim={adim}
                   atlandi={atlandi} canToplam={canToplam} />
          )}
        </div>
      ) : null}

      {oduller2.length > 0 ? (
        <OdulSatiri oduller={oduller2} adim={adim} atlandi={atlandi} baslangic={baslangic} hapRef={setCoinHap} />
      ) : odulNotu ? (
        <div className="m1-ss-odul-notu m1-ss-sira" style={atlandi ? undefined : { animationDelay: `${ESIKLER[4]}ms` }}>{odulNotu}</div>
      ) : null}

      {/* P2A: XP + level (Klasik, Düello v1/v2, turnuva — mod paritesi) */}
      {levelKaynak && <LevelKazanci kaynak={levelKaynak} />}

      {gorevler?.length > 0 && (
        <GorevIlerlemesi gorevler={gorevler} atlandi={atlandi} baslangic={baslangic} />
      )}

      {ozet && (
        <div className={`m1-ss-detay m1-ss-sira${detayAcik ? " acik" : ""}`}
             style={atlandi ? undefined : { animationDelay: `${ESIKLER[6]}ms` }}>
          <QtDugme
            tur="ikincil"
            boyut="k"
            className="m1-ss-detay-dugme"
            ikonSag="asagi"
            aria-expanded={detayAcik}
            onClick={(e) => {
              e.stopPropagation();
              // Paket 42 E.1: açılınca Detay başa kaydırılır; içerik çubuğun arkasında kalmaz
              if (!detayAcik) {
                const dugme = e.currentTarget;
                const az = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
                requestAnimationFrame(() => dugme.scrollIntoView({ block: "start", behavior: az ? "auto" : "smooth" }));
              }
              setDetayAcik((a) => !a);
            }}
          >
            {tt("Detay")}
            {detayRozet > 0 && <span className="m1-ss-detay-rozet"> ({detayRozet})</span>}
          </QtDugme>
          <div className="m1-ss-detay-govde" inert={!detayAcik}>
            <div className="m1-ss-detay-ic">{ozet}</div>
          </div>
        </div>
      )}

      {children && (
        <div className="m1-ss-ek m1-ss-sira" style={atlandi ? undefined : { animationDelay: `${ESIKLER[6]}ms` }}>{children}</div>
      )}

      <div className="m1-ss-eylem-bosluk" aria-hidden="true" />
      <div className="m1-ss-eylem" inert={!tamam}>{eylemler}</div>

      {ucus === "uçuyor" && <CoinUcusu kaynak={coinHap} hedef={hedef} onBitti={ucusBitti} />}
    </div>
  );
}
