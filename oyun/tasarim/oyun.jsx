// Quiz Tactics tasarım sistemi — OYUN BİLEŞENLERİ: mod kartı, şık, sayaç,
// can, skill, soru kartı, maç üst şeridi, sonuç bandı.
// Durumsuz: zamanlayıcı, cevap kilidi, RPC ekranın işidir. Bileşen yalnız
// kendisine verilen durumu çizer ve anı canlandırır.
import { Children } from "react";
import QtIkon from "./Ikon.jsx";
import { sinif, QtAvatar } from "./temel.jsx";
import { tt } from "../lib/dil.js";

// ——————————————————————— MOD KARTI ———————————————————————
const MOD_IKON = { klasik: "klasik", duello: "duello", turnuva: "kupa", grup: "grup", saf: "safBilgi" };

/**
 * <QtModKart mod="duello" ad={tt("Düello")} alt={tt("Can savaşı · skill'li")} onClick={…} />
 * mod: klasik · duello · turnuva · grup · saf (Saf Bilgi)
 * rozet: sağ üst küçük etiket ("Yeni", "20:00") · secili: seçim çerçevesi
 * kilitli + kilitMetni: gri, kilit ikonu, alt yazının yerine kilit metni
 * genis: tam satır, yatay düzen
 */
export function QtModKart({ mod = "klasik", ad, alt, ikon, rozet, secili, kilitli = false, kilitMetni, genis = false, as, onClick, className, type, ...rest }) {
  const Oge = as ?? "button";
  const dugmeMi = Oge === "button";
  return (
    <Oge
      className={sinif("qt-mod", `qt-mod--${mod}`, genis && "qt-mod--genis", secili && "qt-mod--secili", kilitli && "qt-mod--kilitli", className)}
      onClick={onClick}
      aria-pressed={dugmeMi && secili != null ? Boolean(secili) : undefined}
      aria-disabled={kilitli || undefined}
      {...(dugmeMi ? { type: type ?? "button" } : {})}
      {...rest}
    >
      <span className="qt-mod-ikon">
        <QtIkon ad={kilitli ? "kilit" : ikon ?? MOD_IKON[mod] ?? "oyna"} boyut={30} />
      </span>
      <span className="qt-mod-metin">
        <span className="qt-mod-ad">{ad}</span>
        {(kilitli ? kilitMetni : alt) && <span className="qt-mod-alt">{kilitli ? kilitMetni : alt}</span>}
      </span>
      {rozet && <span className="qt-mod-rozet">{rozet}</span>}
    </Oge>
  );
}

// ——————————————————————— ŞIK ———————————————————————
const SIK_DURUM_EK = {
  secili: "— seçildi",
  dogru: "— doğru",
  dogrusu: "— doğru cevap",
  yanlis: "— yanlış",
  elendi: "— elendi",
};

/**
 * <QtSik harf="B" metin="Merkür" durum="normal" onClick={…} />
 * durum:
 *   normal  — dokunulabilir
 *   secili  — cevap verildi, sonuç bekleniyor (mor)
 *   dogru   — seçilen şık doğru (yeşil + zıplama + parıltı)
 *   dogrusu — seçilmedi ama doğru cevap buydu (yeşil, sakin)
 *   yanlis  — seçilen şık yanlış (kırmızı + sallanma)
 *   elendi  — 50:50 ile atıldı (kesik çizgili boş yuva)
 *   kilitli — cevaplar kilitli (rakip bekleniyor vb.), nötr ve dudaksız
 *   solgun  — sonuç sonrası geri plana itilen şık
 * kiriliyor: 50:50 anı — şık ikiye kırılıp düşer; QT_KIRILMA_MS sonra durum="elendi" yap.
 */
export function QtSik({ harf, metin, durum = "normal", kiriliyor = false, onClick, className, ...rest }) {
  const acik = durum === "normal" && !kiriliyor;
  const ek = SIK_DURUM_EK[durum];
  return (
    <div className={sinif("qt-sik-yuva", durum === "elendi" && "qt-sik-yuva--elendi")}>
      <button
        type="button"
        className={sinif("qt-sik", `qt-sik--${durum}`, kiriliyor && "qt-sik--kiriliyor", className)}
        onClick={acik ? onClick : undefined}
        disabled={!acik}
        aria-label={`${harf}: ${metin}${ek ? " " + tt(ek) : ""}`}
        {...rest}
      >
        <span className="qt-sik-harf" aria-hidden="true">{harf}</span>
        <span className="qt-sik-metin">{metin}</span>
        <span className="qt-sik-isaret" aria-hidden="true">
          {(durum === "dogru" || durum === "dogrusu") && <QtIkon ad="onay" boyut={22} />}
          {durum === "yanlis" && <QtIkon ad="carpi" boyut={22} />}
        </span>
      </button>
      {kiriliyor && (
        <span className="qt-sik-kirik" aria-hidden="true">
          <span className="qt-sik-parca qt-sik-parca--sol">
            <span className="qt-sik-harf">{harf}</span>
            <span className="qt-sik-metin">{metin}</span>
          </span>
          <span className="qt-sik-parca qt-sik-parca--sag">
            <span className="qt-sik-harf">{harf}</span>
            <span className="qt-sik-metin">{metin}</span>
          </span>
        </span>
      )}
      {durum === "elendi" && (
        <span className="qt-sik-elendi" aria-hidden="true">
          {tt("Elendi")}
        </span>
      )}
    </div>
  );
}

/** Şık grubu. <QtSikler etiket={tt("Şıklar")}>{…QtSik}</QtSikler>  iki: 2×2 ızgara (kısa şıklar) */
export function QtSikler({ children, etiket, iki = false, className }) {
  return (
    <div className={sinif("qt-sikler", iki && "qt-sikler--iki", className)} role="group" aria-label={etiket ?? tt("Şıklar")}>
      {children}
    </div>
  );
}

// ——————————————————————— SAYAÇ ———————————————————————
/**
 * Sayaç halkası. Sayı ve halka birlikte azalır; son `esik` saniyede kırmızı + nabız.
 * <QtSayac kalan={14} toplam={20} ekBalon={{ anahtar: Date.now(), metin: "+10" }} />
 * boyut: k 44 · o 60 · b 76      durdu: cevap verildi, gerilim kapanır
 * Hesap ekranda kalır (sunucu saati: oyun/lib/zaman.js); bu bileşen yalnız çizer.
 */
export function QtSayac({ kalan = 0, toplam = 20, esik = 5, boyut = "o", durdu = false, ekBalon, className }) {
  const r = 21;
  const cevre = 2 * Math.PI * r;
  const oran = toplam > 0 ? Math.max(0, Math.min(1, kalan / toplam)) : 0;
  const gerilim = !durdu && kalan > 0 && kalan <= esik;
  const sayi = Math.max(0, Math.ceil(kalan));
  return (
    <div
      className={sinif("qt-sayac", `qt-sayac--${boyut}`, gerilim && "qt-sayac--gerilim", kalan <= 0 && "qt-sayac--bitti", className)}
      role="timer"
      aria-live="off"
      aria-label={tt("Kalan süre {sn} saniye", { sn: sayi })}
    >
      <svg viewBox="0 0 50 50" aria-hidden="true">
        <circle className="qt-sayac-iz" cx="25" cy="25" r={r} />
        <circle className="qt-sayac-dolu" cx="25" cy="25" r={r} strokeDasharray={cevre} strokeDashoffset={cevre * (1 - oran)} />
      </svg>
      <span key={gerilim ? sayi : "sabit"} className={sinif("qt-sayac-sayi", gerilim && "qt-h-tik")} aria-hidden="true">
        {sayi}
      </span>
      {ekBalon && (
        <span key={ekBalon.anahtar} className="qt-sayac-balon" aria-hidden="true">
          {ekBalon.metin}
        </span>
      )}
    </div>
  );
}

// ——————————————————————— CAN ———————————————————————
/**
 * Kalp göstergesi. <QtCan dolu={2} toplam={3} etiket={tt("Senin canın")} kayip />
 * kayip: son kaybedilen kalp (index = dolu) kırılma animasyonu oynatır; ekran key ile yeniden tetikler
 * (QtMacUst içinde `kayip` bir anahtar olabilir: her yeni değerde animasyon yeniden oynar).
 * ters: sağa yaslı (rakip tarafı).
 */
export function QtCan({ dolu = 0, toplam = 3, etiket, boyut = 18, kayip = false, ters = false, className }) {
  return (
    <span
      className={sinif("qt-can", ters && "qt-can--ters", className)}
      role="img"
      aria-label={tt("{ad}: {dolu} / {toplam} can", { ad: etiket ?? tt("Can"), dolu, toplam })}
    >
      {Array.from({ length: toplam }, (_, i) => (
        <span key={i} className={sinif("qt-can-kalp", i < dolu ? "qt-can-kalp--dolu" : "qt-can-kalp--bos", kayip && i === dolu && "qt-can-kalp--kayip")}>
          <QtIkon ad="kalp" boyut={boyut} />
        </span>
      ))}
    </span>
  );
}

// ——————————————————————— SKILL ———————————————————————
const SKILL_DURUM_EK = { aktif: "etkin", kullanildi: "kullanıldı", kilitli: "kilitli" };

/**
 * <QtSkill ikon="yariyari" ad="50:50" adet={2} onClick={…} />
 * durum: hazir · aktif (etkisi sürüyor: Sigorta, 2X) · kullanildi · kilitli
 * adet > 0 → mor sayı balonu; adet 0 + fiyat → coin fiyat etiketi (dokununca satın al)
 * kilitli + kilitMetni ("Lv 10") → kilit balonu ve adın yerine kilit metni
 * kullanildi anında patlama + halka animasyonu kendiliğinden oynar.
 */
export function QtSkill({ ikon, ad, adet, fiyat, durum = "hazir", kilitMetni, onClick, className, type, ...rest }) {
  const kapali = durum === "kullanildi" || durum === "kilitli";
  const parcalar = [ad];
  if (durum === "kilitli" && kilitMetni) parcalar.push(kilitMetni);
  else if (adet > 0) parcalar.push(tt("{n} adet", { n: adet }));
  else if (fiyat != null) parcalar.push(tt("{n} coin", { n: fiyat }));
  if (SKILL_DURUM_EK[durum]) parcalar.push(tt(SKILL_DURUM_EK[durum]));
  return (
    <button
      type={type ?? "button"}
      className={sinif("qt-skill", `qt-skill--${durum}`, className)}
      onClick={onClick}
      aria-disabled={kapali || undefined}
      aria-label={parcalar.join(" · ")}
      title={ad}
      {...rest}
    >
      <span className="qt-skill-ikon">
        <QtIkon ad={ikon} boyut={24} />
      </span>
      <span className="qt-skill-ad" aria-hidden="true">
        {durum === "kilitli" && kilitMetni ? kilitMetni : ad}
      </span>
      {durum === "kilitli" ? (
        <span className="qt-skill-rozet qt-skill-rozet--kilit" aria-hidden="true">
          <QtIkon ad="kilit" boyut={12} />
        </span>
      ) : adet > 0 ? (
        <span className="qt-skill-rozet" aria-hidden="true">{adet}</span>
      ) : fiyat != null && durum === "hazir" ? (
        <span className="qt-skill-rozet qt-skill-rozet--fiyat" aria-hidden="true">
          <QtIkon ad="coin" boyut={12} />
          {fiyat}
        </span>
      ) : null}
    </button>
  );
}

/** Skill çubuğu: çocuk sayısı kadar eşit sütun, her biri ≥ 44 px. */
export function QtSkillCubugu({ children, etiket, className }) {
  const n = Children.count(children);
  return (
    <div className={sinif("qt-skill-cubugu", className)} role="group" aria-label={etiket ?? tt("Skill'ler")} style={{ "--_n": n }}>
      {children}
    </div>
  );
}

// ——————————————————————— SORU KARTI ———————————————————————
/**
 * <QtSoruKarti key={soruId} sayac={<QtSayac …/>} metin={soru.metin} kategori={…} sira={tt("Soru {n} / {t}", …)} />
 * key değişince giriş animasyonu oynar. cikiyor: Soru Değiştir çıkışı (QT_KART_CIKIS_MS).
 * sevinc: doğru cevapta kartın küçük sevinç hareketi.
 */
export function QtSoruKarti({ metin, sayac, kategori, sira, cikiyor = false, sevinc = false, children, className }) {
  return (
    <div className={sinif("qt-soru", className)}>
      {(kategori || sira) && (
        <div className="qt-soru-ust">
          {kategori ? <span className="qt-soru-kategori">{kategori}</span> : <span />}
          {sira && <span className="qt-soru-sira">{sira}</span>}
        </div>
      )}
      <div className={sinif("qt-soru-kart", sayac && "qt-soru-kart--sayacli", cikiyor && "qt-soru-kart--cikiyor", sevinc && "qt-soru-kart--sevinc")}>
        {sayac && <div className="qt-soru-sayac">{sayac}</div>}
        <p className="qt-soru-metin">{metin}</p>
        {children}
      </div>
    </div>
  );
}

// ——————————————————————— MAÇ ÜST ŞERİDİ ———————————————————————
/**
 * <QtMacUst
 *    sen={{ ad: tt("Sen"), avatar, can: 3, canToplam: 3, kayip, etkiler: <…/> }}
 *    rakip={{ ad: "Mert", avatar, can: 2, canToplam: 3 }}
 *    skor={[3, 2]} skorAnahtar={3} rakipBaski={baskiAnahtari} />
 * can verilmezse kalpler çizilmez (Klasik). skorAnahtar değişince skor zıplar.
 */
export function QtMacUst({ sen, rakip, skor = [0, 0], skorAnahtar, rakipBaski, className }) {
  const taraf = (o, rakipMi) => (
    <div className={sinif("qt-oyuncu", rakipMi && "qt-oyuncu--rakip", rakipMi && rakipBaski && "qt-h-baski")} key={rakipMi ? `r${rakipBaski ?? ""}` : "s"}>
      <QtAvatar src={o.avatar} ad={o.ad} boyut="m" halka={rakipMi ? "yanlis" : "vurgu"} />
      <span className="qt-oyuncu-yazi">
        <span className="qt-oyuncu-ad">{o.ad}</span>
        {o.alt ?? null}
        {o.can != null && <QtCan key={o.kayip ? String(o.kayip) : "can"} dolu={o.can} toplam={o.canToplam ?? 3} etiket={rakipMi ? tt("Rakibin canı") : tt("Senin canın")} kayip={Boolean(o.kayip)} ters={rakipMi} boyut={16} />}
      </span>
      {o.etkiler && <span className="qt-oyuncu-etkiler">{o.etkiler}</span>}
    </div>
  );
  return (
    <div className={sinif("qt-mac-ust", className)}>
      {taraf(sen, false)}
      <div className="qt-skor" role="img" aria-label={tt("Skor: sen {a}, rakip {b}", { a: skor[0], b: skor[1] })}>
        <span key={skorAnahtar ?? "s"} className={sinif("qt-skor-sen", skorAnahtar != null && "qt-h-zipla")}>{skor[0]}</span>
        <span className="qt-skor-ayrac">:</span>
        <span className="qt-skor-rakip">{skor[1]}</span>
      </div>
      {taraf(rakip, true)}
    </div>
  );
}

/** Aktif etki rozeti (Sigorta, 2X…) — QtMacUst sen.etkiler içine. */
export function QtEtki({ ikon, children, etiket }) {
  return (
    <span className="qt-etki" role="img" aria-label={etiket}>
      {ikon ? <QtIkon ad={ikon} boyut={14} /> : children}
    </span>
  );
}

// ——————————————————————— SONUÇ BANDI ———————————————————————
/**
 * Maç içi kısa sonuç/bilgi bandı; yer ayırır, ekran zıplamaz.
 * <QtSonucBandi ton="dogru" metin={tt("Doğru! +{n} puan", { n: 1 })} anahtar={soruNo} />
 * ton: notr · dogru · yanlis
 */
export function QtSonucBandi({ ton = "notr", metin, anahtar, className }) {
  return (
    <div className={sinif("qt-sonuc-yuva", className)} aria-live="polite">
      {metin && (
        <div key={anahtar ?? metin} className={sinif("qt-sonuc", `qt-sonuc--${ton}`)}>
          {metin}
        </div>
      )}
    </div>
  );
}
