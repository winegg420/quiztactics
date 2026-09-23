// ============================================================
// DÜELLO 1.0 (surum = 2) — ARAYÜZ PARÇALARI (Tasarım A "Şeker Kutusu")
//
// Kurallar SUNUCUDA (migration 268 · duello2_*). Bu dosya yalnız
// duello_durum()'un surum:2 şeklini çizer; hiçbir kural burada hesaplanmaz.
//   · Kategori: sureler.kategori (15 sn, 351), dolunca sunucu rastgele seçer. Kalan hak kategori_sayim'dan; oranlar profil.oranlar'dan (maç başında bir kez).
//   · Cevap: iki oyuncu AYNI soruyu AYNI ANDA görür; rakibin yalnız CEVAPLADIĞI
//     görünür, NE cevapladığı görünmez. Kendi cevabın kilitlenir, doğru/yanlış
//     sonuç fazına kadar gösterilmez.
//   · Sonuç: simetrik can tablosu (son_hamle.cevaplar + can_kaybeden).
//   · Uzatma: beraberlik yok, kategori rastgele.
//   · Skill: toplam 4 · aynı skill 2 · soru başına 1 (sayılar sunucudan).
//     Düello'da Sigorta ve 2X görünmez; saldırı/savunma ayrımı yok.
//
// Görünüm: oyun/tasarim bileşenleri (QtSik, QtSayac, QtCan, QtSkill…) +
// oyun/pages/DuelloPage.a.css (m2- önekli sınıflar). Metinlerin İngilizcesi
// oyun/lib/ceviri/mac.js › "Düello (M2)".
// Test kancaları: .m2-kat (kategori), .qt-sik (şık; .elendi), .bd-d2-skill button.
// iOS: bu dosyada position:fixed yok.
// ============================================================
import KategoriIkon from "./KategoriIkon.jsx";
import { kategoriAdi } from "../lib/kategoriler.js";
import { JOKER_BILGI } from "../lib/jokerler.js";
import SkillRozeti from "./SkillRozeti.jsx";
import { QtCan, QtIkon, QtSik, QtSikler, QtSkill, QtSkillCubugu, QtSoruKarti, QtSonucBandi, sinif } from "../tasarim/index.js";
import { SeviyeEtiketi } from "./MacUstSerit.jsx";
import CerceveliAvatar from "./CerceveliAvatar.jsx";

const HARFLER = ["A", "B", "C", "D"];

// Düello'da görünmeyen skill'ler (sunucu izinli listesine koymasa da çift güvence).
const DUELLODA_YOK = new Set(["sigorta", "cifte_puan"]);
// jokerler.js kimliği → tasarım sistemi ikonu
const SKILL_IKON = { elli: "yariyari", sure: "ekSure", soru_degistir: "degistir", zaman_baskisi: "baski", ikinci_sans: "ikinciSans" };

export function secenekleriCoz(s) {
  if (Array.isArray(s)) return s;
  if (typeof s === "string") {
    try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return []; }
  }
  return [];
}

// ---------------------------------------------------------------- üst şerit
/**
 * İki oyuncu, canlar (3 kalp), ortada tur. Kategoriyi seçen tarafın avatarında
 * altın halka + kılıç rozeti. kayip = { [oyuncuId]: anahtar } → kalp kırılır.
 */
export function V2Ust({ d, ben, rakip, kayip = {}, c, seviyeler = {} }) {
  const taraf = (o, rakipMi) => {
    const secen = d.saldiran === o.id;
    const can = Math.max(0, Number(o.can ?? 0));
    return (
      <div className={sinif("qt-oyuncu", rakipMi && "qt-oyuncu--rakip", secen && "m2-secen")}>
        <CerceveliAvatar profile={o} userId={o.id} boyut={48} hareketli kart={seviyeler[o.id]} />
        <span className="qt-oyuncu-yazi">
          <span className="qt-oyuncu-ad">{rakipMi ? o.gorunen_ad : c("Sen")}</span>
          <SeviyeEtiketi {...(seviyeler[o.id] ?? {})} />
          <QtCan key={kayip[o.id] ?? "can"} dolu={can} toplam={Math.max(3, can)} boyut={16} ters={rakipMi}
                 kayip={Boolean(kayip[o.id])} etiket={rakipMi ? c("Rakibin canı") : c("Senin canın")} />
        </span>
        {secen && (
          <span className="qt-oyuncu-etkiler">
            <span className="qt-etki m2-secen-rozet" role="img" aria-label={c("Kategoriyi seçen")}>
              <QtIkon ad="kilic" boyut={14} />
            </span>
          </span>
        )}
      </div>
    );
  };
  return (
    <div className="qt-mac-ust m2-ust">
      {taraf(ben, false)}
      <div className={sinif("m2-tur", d.uzatma && "m2-tur--uzatma")} key={`${d.tur}-${d.uzatma}`}>
        {d.uzatma ? (
          <b>{c("UZATMA")}</b>
        ) : (
          <>
            <span>{c("Tur")}</span>
            <b className="qt-sayi">{d.tur}<small>/{d.max_tur}</small></b>
          </>
        )}
        {!d.dereceli && <span className="m2-tur-serbest">{c("Serbest")}</span>}
      </div>
      {taraf(rakip, true)}
    </div>
  );
}

/** Uzatma bandı: "beraberlik yok" + kategori rastgele. */
export function V2UzatmaBandi({ kategori, c }) {
  return (
    <div className="m2-uzatma qt-h-pop-gir" role="status">
      <b>{c("UZATMA")}</b>
      <span>{c("Beraberlik yok, uzatma: biri doğru öteki yanlış yapana kadar sürer.")}</span>
      {kategori && (
        <span className="m2-uzatma-kat">
          <KategoriIkon anahtar={kategori} boyut={16} /> {c("Kategori rastgele geldi: {kategori}", { kategori: c(kategoriAdi(kategori)) })}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- kategori fazı
/**
 * Oyuncunun kategori doğru oranı (0–100) ya da null ("—").
 * Kaynak: maç başında sunucuda bir kez hesaplanan profil.oranlar (351, az veri → null).
 * Eski maçlarda (oranlar yok) profil.kategoriler.yuzde yedeği.
 */
function kategoriOrani(profil, k) {
  const oranlar = profil?.oranlar;
  if (oranlar && typeof oranlar === "object") {
    const v = oranlar[k];
    return typeof v === "number" ? v : null;
  }
  const p = (profil?.kategoriler ?? []).find((x) => x.kategori === k);
  return typeof p?.yuzde === "number" ? p.yuzde : null;
}

const oranMetni = (v, c) => (v === null ? "—" : c("%{n}", { n: v }));

/**
 * sayac: ekranın verdiği büyük geri sayım (QtSayac). Son 3 sn vurgusu ve ses ekranda.
 * Saldıran: her kartta rakibin ve senin oranın + kalan hak.
 * Savunan: "Rakip düşünüyor…", kendi en güçlü 3 / en zayıf 3 kategorin (kullanılanlar işaretli).
 */
export function V2Kategori({ d, benSaldiran, ben, rakip, calisan, sayac, sonSaniye, onSec, c }) {
  const uygun = new Set(Array.isArray(d.uygun_kategoriler) ? d.uygun_kategoriler : []);
  const sayim = d.kategori_sayim ?? {};
  const max = Number(d.kategori_max ?? 2);
  const kategoriler = d.kategoriler ?? [];

  const baslik = (
    <div className={sinif("m2-kat-ust", sonSaniye && "m2-kat-ust--son")}>
      <div className="m2-kat-baslik">
        <h2 className="qt-baslik-2">{benSaldiran ? c("Kategori seç") : c("Rakip düşünüyor…")}</h2>
        <p className="m2-kat-alt">
          {benSaldiran ? c("Süre dolarsa kategori rastgele seçilir.") : c("{ad} kategori seçiyor…", { ad: rakip.gorunen_ad })}
        </p>
      </div>
      <div className="m2-kat-sayac">{sayac}</div>
    </div>
  );

  if (!benSaldiran) {
    // Kendi bilinen oranların: en güçlü 3 ve (onlarla çakışmayan) en zayıf 3.
    const bilinen = kategoriler
      .map((k) => ({ k, v: kategoriOrani(ben?.profil, k) }))
      .filter((x) => x.v !== null)
      .sort((a, b) => b.v - a.v);
    const guclu = bilinen.slice(0, 3);
    const zayif = bilinen.slice(3).slice(-3).reverse();
    const satir = (x) => {
      const adet = Number(sayim[x.k] ?? 0);
      return (
        <li key={x.k} className={sinif("m2-savun-kat", adet >= max && "m2-savun-kat--doldu")}>
          <KategoriIkon anahtar={x.k} boyut={18} plaka />
          <span className="m2-savun-ad">{c(kategoriAdi(x.k))}</span>
          {adet > 0 && (
            <span className="m2-savun-kullanildi">{adet >= max ? c("doldu") : c("{n}/{m} geldi", { n: adet, m: max })}</span>
          )}
          <b className="m2-savun-oran qt-sayi">{oranMetni(x.v, c)}</b>
        </li>
      );
    };
    return (
      <div className="m2-kat-faz">
        {baslik}
        {bilinen.length ? (
          <div className="m2-savun">
            <section className="m2-savun-blok m2-savun-blok--guclu" aria-label={c("En güçlü kategorilerin")}>
              <h3>{c("En güçlü kategorilerin")}</h3>
              <ul>{guclu.map(satir)}</ul>
            </section>
            {zayif.length > 0 && (
              <section className="m2-savun-blok m2-savun-blok--zayif" aria-label={c("En zayıf kategorilerin")}>
                <h3>{c("En zayıf kategorilerin")}</h3>
                <ul>{zayif.map(satir)}</ul>
              </section>
            )}
          </div>
        ) : (
          <div className="m2-bekle">
            <span className="m2-bekle-ikon" aria-hidden="true"><QtIkon ad="kilic" boyut={30} /></span>
            <p>{c("Kategori oranların birkaç cevaptan sonra burada görünür.")}</p>
          </div>
        )}
        {!bilinen.length && kategoriler.some((k) => Number(sayim[k] ?? 0) > 0) && (
          <section className="m2-savun-blok" aria-label={c("Bu maçta gelenler")}>
            <h3>{c("Bu maçta gelenler")}</h3>
            <ul>{kategoriler.filter((k) => Number(sayim[k] ?? 0) > 0).map((k) => satir({ k, v: null }))}</ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="m2-kat-faz">
      {baslik}
      <p className="m2-not">{c("Her kategori maçta en çok {n} kez gelir; aynı kategori üst üste gelmez.", { n: max })}</p>
      <div className="m2-kat-izgara">
        {kategoriler.map((k) => {
          const adet = Number(sayim[k] ?? 0);
          const kalan = Math.max(0, max - adet);
          const doldu = adet >= max;
          const secilebilir = uygun.has(k);
          const rOran = kategoriOrani(rakip.profil, k);
          const bOran = kategoriOrani(ben?.profil, k);
          const neden = secilebilir ? null : doldu ? c("doldu") : c("üst üste olmaz");
          return (
            <button key={k} type="button"
                    className={sinif("m2-kat", !secilebilir && "m2-kat--kapali")}
                    disabled={!secilebilir || !!calisan}
                    aria-busy={calisan === "kategori" || undefined}
                    aria-label={`${c(kategoriAdi(k))} · ${c("Rakip")} ${oranMetni(rOran, c)} · ${c("Sen")} ${oranMetni(bOran, c)} · ${c("Kalan hak: {n}", { n: kalan })}${neden ? ` · ${neden}` : ""}`}
                    onClick={() => onSec(k)}>
              <KategoriIkon anahtar={k} boyut={22} plaka />
              <span className="m2-kat-ad">{c(kategoriAdi(k))}</span>
              <span className="m2-kat-bilgi">
                {neden ?? (
                  <>
                    <span className="m2-kat-oran m2-kat-oran--rakip">{c("Rakip")} <b className="qt-sayi">{oranMetni(rOran, c)}</b></span>
                    <span className="m2-kat-oran m2-kat-oran--ben">{c("Sen")} <b className="qt-sayi">{oranMetni(bOran, c)}</b></span>
                  </>
                )}
              </span>
              <span className="m2-kat-sayim" title={c("Kalan hak: {n}", { n: kalan })}>
                <b className="qt-sayi">{kalan}</b>
                {Array.from({ length: max }, (_, i) => <i key={i} className={i < kalan ? "dolu" : ""} />)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- cevap fazı
export function V2Cevap({ d, rakip, secenekler, secim, ikinciSansElendi, calisan, kalanSn,
  sayac, kiriliyor = [], onCevap, c }) {
  const cv = d.cevap ?? {};
  const kilitli = Boolean(cv.ben_cevapladim);
  const benimCevap = kilitli && cv.benim_cevabim !== null && cv.benim_cevabim !== undefined
    ? Number(cv.benim_cevabim) : secim;
  const kapali = Array.isArray(cv.elli_kapali) ? cv.elli_kapali.map(Number) : [];
  const ilkYanlis = cv.ikinci_sans_ilk_cevap === null || cv.ikinci_sans_ilk_cevap === undefined
    ? null : Number(cv.ikinci_sans_ilk_cevap);
  const elenenler = new Set([...ikinciSansElendi, ...(ilkYanlis === null ? [] : [ilkYanlis])]);
  const sureBitti = kalanSn <= 0;
  // Yalnız cevap isteği yoldayken kilitlenir; skill isteği (~1-2 sn) şıkları kapatmaz —
  // 23 Eyl 2026 oyuncu testinde Ek Süre sonrası şıklar bu yüzden kapalı kalıyordu.
  const tiklanabilir = !kilitli && !sureBitti && secim === null && calisan !== "cevap";
  const katAdi = d.kategori ? c(kategoriAdi(d.kategori)) : "";

  const durum = (i) => {
    if (kapali.includes(i) || elenenler.has(i)) return kiriliyor.includes(i) ? "kilitli" : "elendi";
    if (i === benimCevap) return "secili";
    return tiklanabilir ? "normal" : "kilitli";
  };

  return (
    <div className="m2-cevap-faz">
      {d.uzatma && <V2UzatmaBandi kategori={d.kategori} c={c} />}
      <div className="m2-durumlar" aria-live="polite">
        <span className={sinif("m2-durum", kilitli && "m2-durum--tamam")}>
          <b>{c("Sen")}</b>
          <span>
            {kilitli ? <><QtIkon ad="kilit" boyut={14} /> {c("Cevabın kilitlendi")}</> : sureBitti ? c("Yanıtsız") : c("düşünüyor…")}
          </span>
        </span>
        <span key={cv.rakip_cevapladi ? "c" : "d"} className={sinif("m2-durum", cv.rakip_cevapladi && "m2-durum--tamam qt-h-pop-gir")}>
          <b>{rakip.gorunen_ad}</b>
          <span>{cv.rakip_cevapladi ? <><QtIkon ad="onay" boyut={14} /> {c("cevapladı")}</> : c("düşünüyor…")}</span>
        </span>
      </div>
      <QtSoruKarti
        key={d.soru?.soru ?? "soru"}
        className="m2-soru"
        kategori={d.kategori ? <><KategoriIkon anahtar={d.kategori} boyut={16} /> {katAdi}</> : null}
        sira={c("Aynı soru · aynı anda")}
        metin={d.soru?.soru}
        sayac={sayac}
      />
      <QtSikler etiket={c("Şıklar")}>
        {secenekler.map((s, i) => {
          const dr = durum(i);
          return (
            <QtSik key={`${d.soru?.soru ?? ""}-${i}`} harf={HARFLER[i]} metin={s} durum={dr}
                   kiriliyor={kiriliyor.includes(i)}
                   className={dr === "elendi" || kiriliyor.includes(i) ? "elendi" : undefined}
                   onClick={() => onCevap(i)} />
          );
        })}
      </QtSikler>
      <QtSonucBandi ton="notr" anahtar={kilitli ? "k" : sureBitti ? "s" : ""}
                    metin={kilitli ? c("Cevabın kilitlendi — sonuç ikiniz de cevaplayınca açılır.") : sureBitti ? c("Süren doldu — sonuç bekleniyor.") : null} />
    </div>
  );
}

// ---------------------------------------------------------------- sonuç (tur sonu)
function durumu(x) {
  if (!x || x.yanitsiz || x.cevap === null || x.cevap === undefined) return "yanitsiz";
  return x.dogru ? "dogru" : "yanlis";
}
const DURUM_ETIKET = { dogru: "Doğru", yanlis: "Yanlış", yanitsiz: "Yanıtsız" };
const DURUM_KUCUK = { dogru: "doğru", yanlis: "yanlış", yanitsiz: "yanıtsız" };
const DURUM_IKON = { dogru: "onay", yanlis: "carpi", yanitsiz: "saat" };

/** Simetrik can tablosunun sonucu tek cümle: kim can kaybetti, neden. */
export function v2SonucMetni(h, benId, c) {
  const rakipId = Object.keys(h?.cevaplar ?? {}).find((k) => k !== benId);
  const b = durumu(h?.cevaplar?.[benId]);
  const r = durumu(rakipId ? h.cevaplar[rakipId] : null);
  let metin;
  let ton = "notr";
  if (b === "dogru" && r !== "dogru") { metin = c("Sen doğru, rakip {r} → rakip 1 can kaybetti", { r: c(DURUM_KUCUK[r]) }); ton = "dogru"; }
  else if (b !== "dogru" && r === "dogru") { metin = c("Sen {b}, rakip doğru → sen 1 can kaybettin", { b: c(DURUM_KUCUK[b]) }); ton = "yanlis"; }
  else if (b === "dogru") metin = c("İkiniz de doğru → nötr, can değişmedi");
  else metin = c("Sen {b}, rakip {r} → nötr, can değişmedi", { b: c(DURUM_KUCUK[b]), r: c(DURUM_KUCUK[r]) });
  return { metin, ton, b, r };
}

export function V2Sonuc({ d, rakip, secenekler, c }) {
  const h = d.son_hamle;
  if (!h) return null;
  const { metin, ton, b, r } = v2SonucMetni(h, d.ben, c);
  const benim = h.cevaplar?.[d.ben];
  const benimCevap = benim?.cevap === null || benim?.cevap === undefined ? null : Number(benim.cevap);
  const dogru = h.dogru_cevap === null || h.dogru_cevap === undefined ? null : Number(h.dogru_cevap);
  const hucre = (etiket, x, kaybetti) => (
    <div className={`m2-tablo-hucre m2-tablo-hucre--${x}`}>
      <span className="m2-tablo-ad">{etiket}</span>
      <b><QtIkon ad={DURUM_IKON[x]} boyut={18} /> {c(DURUM_ETIKET[x])}</b>
      {kaybetti && <small className="qt-h-pop-gir"><QtIkon ad="kalp" boyut={14} /> −1</small>}
    </div>
  );
  return (
    <div className="m2-sonuc-faz">
      {h.uzatma && <V2UzatmaBandi kategori={h.kategori} c={c} />}
      <QtSonucBandi ton={ton} metin={metin} anahtar={`${h.tur}-${h.soru_id}`} />
      <div className="m2-tablo" role="group" aria-label={c("Can tablosu")}>
        {hucre(c("Sen"), b, h.can_kaybeden === d.ben)}
        {hucre(rakip.gorunen_ad, r, Boolean(h.can_kaybeden && h.can_kaybeden !== d.ben))}
      </div>
      {h.uzatma && (
        <p className="m2-not">
          {h.can_kaybeden ? c("Uzatmada ilk fark maçı bitirir.") : c("Eşitlik sürüyor — sıradaki uzatma sorusu geliyor, kategori yine rastgele.")}
        </p>
      )}
      {d.soru?.soru && (
        <>
          <QtSoruKarti className="m2-soru m2-soru--sonuc" metin={d.soru.soru} sevinc={b === "dogru"} />
          <QtSikler etiket={c("Şıklar")}>
            {secenekler.map((s, i) => (
              <QtSik key={i} harf={HARFLER[i]} metin={s}
                     durum={i === dogru ? (benimCevap === dogru ? "dogru" : "dogrusu") : i === benimCevap ? "yanlis" : "solgun"} />
            ))}
          </QtSikler>
        </>
      )}
      {b !== "dogru" && dogru !== null && secenekler[dogru] !== undefined && (
        <p className="m2-dogru-cevap">{c("Doğru cevap: {harf} · {metin}", { harf: HARFLER[dogru], metin: secenekler[dogru] })}</p>
      )}
      {b === "yanitsiz" && <p className="m2-not">{c("Yanıtsız")} · {c("Şık işaretlenmedi")}</p>}
    </div>
  );
}

// ---------------------------------------------------------------- skill şeridi
/**
 * sonKullanilan = { tur, anahtar } → o skill'de kullanma anı (patlama + halka) yeniden oynar.
 * Kapalı skill gerçekten `disabled` (test kancası) ve aria-disabled; nedeni üstteki satırda.
 */
export function V2Skill({ d, calisan, kalanSn, serbest, sonKullanilan, onKullan, c }) {
  const s = d.skill ?? {};
  const izinli = Array.isArray(s.izinli) ? s.izinli : [];
  const set = Array.isArray(s.set) ? s.set : [];
  const liste = set.filter((t) => izinli.includes(t) && !DUELLODA_YOK.has(t));
  const toplam = Number(s.toplam_hak ?? 4);
  const turBasi = Number(s.tur_basi_hak ?? 2);
  const soruBasi = Number(s.soru_basi_hak ?? 1);
  const kullanilan = Number(s.kullanilan ?? 0);
  const sayilar = s.sayilar ?? {};
  const env = s.envanter ?? {};
  const fiyatlar = s.fiyatlar ?? {};
  const coin = s.coin === null || s.coin === undefined ? null : Number(s.coin);
  const cv = d.cevap ?? {};
  const soruAcik = d.faz === "cevap" && d.durum === "aktif";
  const cevapladim = Boolean(cv.ben_cevapladim);
  const hakBitti = kullanilan >= toplam;
  const soruHakBitti = Number(s.bu_soruda ?? 0) >= soruBasi;
  const elliVar = Array.isArray(cv.elli_kapali) && cv.elli_kapali.length > 0;

  const genelEngel = !soruAcik ? c("Soru açılınca kullanılır.")
    : hakBitti ? c("Bu maçtaki skill hakkın doldu.")
    : cevapladim ? c("Cevap verdikten sonra skill kullanılamaz.")
    : soruHakBitti ? c("Bu soruda skill hakkını kullandın")
    : kalanSn <= 0 ? c("Süren doldu — sonuç bekleniyor.")
    : null;
  // Soru Değiştir kilidi sunucudan gelir (ör. "Rakibin bu soruda skill kullandı…").
  const sdKilit = s.soru_degistir_kilit && s.soru_degistir_kilit !== "Soru açık değil" ? c(s.soru_degistir_kilit) : null;

  return (
    <section className={sinif("m2-skill bd-d2-skill", genelEngel ? "m2-skill--kapali" : "m2-skill--acik")} aria-label={c("Skill")}>
      <div className="m2-skill-ust">
        <span className="m2-skill-ipucu" role="status">
          {liste.length === 0 ? c("Setinde Düello'da kullanılabilen skill yok.") : (genelEngel ?? c("Şimdi kullanabilirsin."))}
        </span>
        <span className="m2-hak" role="img" aria-label={c("{k}/{t} kullanıldı", { k: kullanilan, t: toplam })}>
          {Array.from({ length: toplam }).map((_, i) => <i key={i} className={i < kullanilan ? "dolu" : ""} />)}
          <b className="qt-sayi">{kullanilan}/{toplam}</b>
        </span>
      </div>
      {liste.length > 0 && (
        <QtSkillCubugu etiket={c("Skill")}>
          {liste.map((tur) => {
            const bilgi = JOKER_BILGI[tur] ?? {};
            const n = Number(sayilar[tur] ?? 0);
            const adet = Number(env[tur] ?? 0);
            const fiyat = Number(fiyatlar[tur] ?? 0);
            const turBitti = n >= turBasi;
            let ozel = null;
            if (tur === "soru_degistir" && sdKilit) ozel = sdKilit;
            else if (tur === "zaman_baskisi" && cv.rakip_cevapladi) ozel = c("Rakibin bu soruyu zaten cevapladı");
            else if (tur === "elli" && elliVar) ozel = c("Bu soruda skill hakkını kullandın");
            const fiyatGoster = !serbest && adet <= 0 && fiyat > 0;
            const coinYetmez = fiyatGoster && coin !== null && coin < fiyat;
            const acik = !genelEngel && !turBitti && !ozel && !coinYetmez && (serbest || adet > 0 || fiyatGoster);
            const kapali = !acik || !!calisan;
            const an = sonKullanilan?.tur === tur;
            return (
              <QtSkill key={an ? `${tur}-${sonKullanilan.anahtar}` : tur}
                       ikon={SKILL_IKON[tur] ?? bilgi.ikon ?? "soru"}
                       rozet={<SkillRozeti tur={tur} boyut={34} />}
                       ad={c(bilgi.ad ?? tur)}
                       adet={serbest ? undefined : adet}
                       fiyat={fiyatGoster ? fiyat : undefined}
                       durum={turBitti ? "kullanildi" : "hazir"}
                       className={sinif(kapali && !turBitti && "m2-skill-kapali", an && "qt-h-skill-an")}
                       disabled={kapali}
                       aria-disabled={kapali || undefined}
                       aria-busy={calisan === `joker-${tur}` || undefined}
                       title={ozel ?? (coinYetmez ? c("Yetersiz coin") : c(bilgi.aciklama ?? ""))}
                       onClick={() => onKullan(tur, { satinAl: fiyatGoster, adet })} />
            );
          })}
        </QtSkillCubugu>
      )}
      <p className="m2-skill-kural">
        {c("Aynı skill en çok {n} kez, soru başına {s}.", { n: turBasi, s: soruBasi })}
        {liste.includes("soru_degistir") && sdKilit && soruAcik && !cevapladim && (
          <span className="m2-skill-kilit"><QtIkon ad="kilit" boyut={12} /> {sdKilit}</span>
        )}
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- maç sonu: her soru
export function V2Gecmis({ gecmis, maxTur, benId, c }) {
  if (!Array.isArray(gecmis) || gecmis.length === 0) return null;
  return (
    <section className="m2-gecmis" aria-label={c("Maçın soruları")}>
      <h3 className="qt-baslik-3">{c("Maçın soruları")}</h3>
      <ol>
        {gecmis.map((g, i) => {
          const sec = secenekleriCoz(g.secenekler);
          const dc = g.dogru_cevap === null || g.dogru_cevap === undefined ? null : Number(g.dogru_cevap);
          const ben = g.ben_yanitsiz ? "yanitsiz" : g.ben_dogru ? "dogru" : "yanlis";
          const rakip = g.rakip_yanitsiz ? "yanitsiz" : g.rakip_dogru ? "dogru" : "yanlis";
          const benimCevap = g.benim_cevabim === null || g.benim_cevabim === undefined ? null : Number(g.benim_cevabim);
          const kaybeden = g.can_kaybeden;
          const canMetni = !kaybeden ? c("Nötr") : kaybeden === benId ? c("Sen 1 can kaybettin") : c("Rakip 1 can kaybetti");
          return (
            <li key={i} className={`m2-gecmis-soru m2-gecmis-soru--${ben}`}>
              <div className="m2-gecmis-ust">
                <span className="m2-gecmis-tur">
                  {g.uzatma ? c("Uzatma") : c("Tur {n}/{t}", { n: g.tur, t: maxTur ?? 10 })}
                </span>
                {g.kategori && <span className="m2-gecmis-kat"><KategoriIkon anahtar={g.kategori} boyut={14} /> {c(kategoriAdi(g.kategori))}</span>}
                <span className={`m2-rozet m2-rozet--${ben}`}><QtIkon ad={DURUM_IKON[ben]} boyut={12} /> {c(DURUM_ETIKET[ben])}</span>
              </div>
              {g.soru && <p className="m2-gecmis-metin">{g.soru}</p>}
              {dc !== null && sec[dc] !== undefined && (
                <p className="m2-dogru-cevap">{c("Doğru cevap: {harf} · {metin}", { harf: HARFLER[dc], metin: sec[dc] })}</p>
              )}
              <div className="m2-gecmis-alt">
                {ben === "yanitsiz"
                  ? <span>{c("Yanıtsız")} · {c("Şık işaretlenmedi")}</span>
                  : ben === "yanlis" && benimCevap !== null
                    ? <span>{c("Senin cevabın: {harf}", { harf: HARFLER[benimCevap] })}</span>
                    : null}
                <span>{c("rakip {durum}", { durum: c(DURUM_KUCUK[rakip]) })}</span>
                <span className={sinif("m2-gecmis-can", kaybeden && (kaybeden === benId ? "m2-gecmis-can--kotu" : "m2-gecmis-can--iyi"))}>{canMetni}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
