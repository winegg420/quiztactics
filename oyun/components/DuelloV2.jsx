// ============================================================
// DÜELLO 1.0 (surum = 2) — ARAYÜZ PARÇALARI (oturum 2/3)
//
// Kurallar SUNUCUDA (migration 268 · duello2_*). Bu dosya yalnız
// duello_durum()'un surum:2 şeklini çizer; hiçbir kural burada hesaplanmaz.
//   · Kategori: 8 sn, dolunca sunucu rastgele seçer. n/2 sayacı kategori_sayim'dan.
//   · Cevap: iki oyuncu AYNI soruyu AYNI ANDA görür; rakibin yalnız CEVAPLADIĞI
//     görünür, NE cevapladığı görünmez. Kendi cevabın kilitlenir, doğru/yanlış
//     sonuç fazına kadar gösterilmez.
//   · Sonuç: simetrik can tablosu (son_hamle.cevaplar + can_kaybeden).
//   · Uzatma: beraberlik yok, kategori rastgele.
//   · Skill: toplam 4 · aynı skill 2 · soru başına 1 (sayılar sunucudan).
//
// iOS: bu dosyada position:fixed yok. Stiller oyun/styles/duello-v2.css.
// ============================================================
import { useMemo } from "react";
import Ikon from "./Ikon.jsx";
import KategoriIkon from "./KategoriIkon.jsx";
import { kategoriAdi } from "../lib/kategoriler.js";
import { JOKER_BILGI } from "../lib/jokerler.js";
import { aktifDil, tt } from "../lib/dil.js";

const HARFLER = ["A", "B", "C", "D"];

// ---------------------------------------------------------------- yerel sözlük
// Ortak dil.js'e yazılmadı (paralel şerit kuralı). Anahtar Türkçe metnin kendisi;
// İngilizce karşılık yoksa ortak `ceviri`ye düşer (o da yoksa Türkçe döner).
const EN = {
  "Kategori seç": "Pick a category",
  "Kategori seçme sırası sende": "Your turn to pick the category",
  "Süre dolarsa kategori rastgele seçilir.": "If time runs out, a random category is picked.",
  "Her kategori maçta en çok {n} kez gelir; aynı kategori üst üste gelmez.": "Each category appears at most {n} times per match, never twice in a row.",
  "{ad} kategori seçiyor…": "{ad} is picking a category…",
  "Kategoriyi seçen taraf değişir, soruyu ikiniz aynı anda cevaplarsınız.": "The picker alternates; you both answer the same question at the same time.",
  "doldu": "full",
  "üst üste olmaz": "not twice in a row",
  "seçilemez": "unavailable",
  "veri yok": "no data",
  "Aynı soru · aynı anda": "Same question · same time",
  "Sen": "You",
  "Rakip": "Opponent",
  "düşünüyor…": "thinking…",
  "cevapladı": "answered",
  "Cevabın kilitlendi": "Answer locked",
  "Cevabın kilitlendi — sonuç ikiniz de cevaplayınca açılır.": "Answer locked — the result shows once you both answer.",
  "Süren doldu — sonuç bekleniyor.": "Your time is up — waiting for the result.",
  "Rakibin cevapladı — ne cevapladığı sonuçta görünmez, yalnız doğru/yanlış.": "Your opponent answered — only right/wrong is shown in the result.",
  "Doğru": "Correct",
  "Yanlış": "Wrong",
  "Yanıtsız": "No answer",
  "doğru": "correct",
  "yanlış": "wrong",
  "yanıtsız": "no answer",
  "Sen doğru, rakip {r} → rakip 1 can kaybetti": "You correct, opponent {r} → opponent lost 1 life",
  "Sen {b}, rakip doğru → sen 1 can kaybettin": "You {b}, opponent correct → you lost 1 life",
  "İkiniz de doğru → nötr, can değişmedi": "Both correct → neutral, no life lost",
  "Sen {b}, rakip {r} → nötr, can değişmedi": "You {b}, opponent {r} → neutral, no life lost",
  "Uzatmada ilk fark maçı bitirir.": "In overtime the first difference ends the match.",
  "Eşitlik sürüyor — sıradaki uzatma sorusu geliyor, kategori yine rastgele.": "Still tied — next overtime question coming, category random again.",
  "Doğru cevap: {harf} · {metin}": "Correct answer: {harf} · {metin}",
  "Şık işaretlenmedi": "No option was chosen",
  "UZATMA": "OVERTIME",
  "Beraberlik yok, uzatma: biri doğru öteki yanlış yapana kadar sürer.": "No draws — overtime: it goes on until one is right and the other wrong.",
  "Kategori rastgele geldi: {kategori}": "Random category: {kategori}",
  "Skill": "Skills",
  "{k}/{t} kullanıldı": "{k}/{t} used",
  "Aynı skill en çok {n} kez, soru başına {s}.": "Same skill at most {n} times, {s} per question.",
  "Soru açılınca kullanılır.": "Usable once the question opens.",
  "Bu maçtaki skill hakkın doldu.": "You have used all your skills for this match.",
  "Bu soruda skill hakkını kullandın": "You used your skill for this question",
  "Cevap verdikten sonra skill kullanılamaz.": "Skills cannot be used after answering.",
  "Şimdi kullanabilirsin.": "You can use it now.",
  "Setinde Düello'da kullanılabilen skill yok.": "Your set has no skills usable in Duel.",
  "Rakibin bu soruyu zaten cevapladı": "Your opponent already answered this question",
  "Tur {n}/{t}": "Round {n}/{t}",
  "Uzatma": "Overtime",
  "Maçın soruları": "Match questions",
  "Senin cevabın: {harf}": "Your answer: {harf}",
  "rakip {durum}": "opponent {durum}",
  "Rakip 1 can kaybetti": "Opponent lost 1 life",
  "Sen 1 can kaybettin": "You lost 1 life",
  "Nötr": "Neutral",
  "Can": "Lives",
  // Giriş ve tanıtım (Düello 1.0)
  "Sırayla kategori seçin, aynı soruyu aynı anda cevaplayın. Yalnız biri bilirse öteki can kaybeder.": "Take turns picking the category and answer the same question at the same time. If only one of you is right, the other loses a life.",
  "3 can, en çok 10 tur": "3 lives, up to 10 rounds",
  "Biri doğru öteki yanlış/yanıtsız → yanlış olan 1 can kaybeder; ikisi aynıysa nötr": "One right, the other wrong/no answer → the wrong one loses 1 life; same result → neutral",
  "Beraberlik yok: can eşitse uzatma, kategori rastgele": "No draws: tied lives go to overtime with random categories",
  "Maçta 4 skill: aynı skill en çok 2 kez, soru başına 1": "4 skills per match: same skill at most twice, 1 per question",
  "Aynı soru, aynı anda": "Same question, same time",
  "Kategoriyi sırayla biriniz seçer (8 sn; dolarsa rastgele). Soru ikinize aynı anda açılır, 15 sn'niz var. Rakibin cevapladığını görürsün ama ne cevapladığını göremezsin.": "You take turns picking the category (8 s; random if time runs out). The question opens for both of you at once and you have 15 s. You see that your opponent answered, never what.",
  "Can tablosu": "Life table",
  "Yalnız biri doğruysa öteki 1 can kaybeder. İkiniz de doğru ya da ikiniz de yanlışsanız nötr: can değişmez. Süre dolarsa 'Yanıtsız' sayılır. 3 can, en çok 10 tur; tur iki tarafça tamamlanır.": "If only one of you is right, the other loses 1 life. Both right or both wrong is neutral. If time runs out it counts as 'No answer'. 3 lives, up to 10 rounds; each round is completed by both sides.",
  "Beraberlik yok. Can eşitse uzatma başlar: kategori rastgele gelir, biri doğru öteki yanlış yapana kadar sürer.": "No draws. If lives are tied, overtime starts: categories are random and it goes on until one is right and the other wrong.",
  "Maçta toplam 4 skill; aynı skill en çok 2 kez, bir soruda en çok 1. Soru Değiştir yalnız ikiniz de cevaplamamışken ve rakip o soruda skill kullanmamışken çalışır. Skill'in yoksa maçın içinden satın alabilirsin.": "4 skills per match; the same skill at most twice, at most 1 per question. Question Swap only works while neither of you has answered and your opponent has not used a skill on that question. You can buy skills during the match.",
  "Aynı soruyu aynı anda cevaplarsınız.": "You both answer the same question at the same time.",
  "Rakibin ne cevapladığını göremezsin, yalnız cevapladığını görürsün.": "You never see what your opponent answered, only that they did.",
  "Beraberlik yok: can eşitse uzatma.": "No draws: tied lives go to overtime.",
  "Kategori seçerken süre dolarsa rastgele gelir.": "If time runs out while picking, a random category comes.",
};

function doldur(metin, degerler) {
  if (!degerler) return metin;
  return metin.replace(/\{(\w+)\}/g, (tam, ad) =>
    Object.prototype.hasOwnProperty.call(degerler, ad)
      ? (degerler[ad] === undefined || degerler[ad] === null ? "" : String(degerler[ad]))
      : tam);
}

/** Kancasız sürüm (bileşen dışı / tanıtım): sayfanın dilinde. */
export function tt2(anahtar, degerler) {
  if (aktifDil() === "en" && EN[anahtar]) return doldur(EN[anahtar], degerler);
  return tt(anahtar, degerler);
}

/** Ortak `ceviri` + yerel İngilizce sözlük. */
export function useV2Ceviri(dil, ceviri) {
  return useMemo(() => (anahtar, degerler) => {
    if (dil === "en" && EN[anahtar]) return doldur(EN[anahtar], degerler);
    return ceviri(anahtar, degerler);
  }, [dil, ceviri]);
}

export function secenekleriCoz(s) {
  if (Array.isArray(s)) return s;
  if (typeof s === "string") {
    try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return []; }
  }
  return [];
}

// ---------------------------------------------------------------- küçük parçalar
function KalpMini() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" className="bd-d2-kalp">
      <path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 3 4.5 6.6 4.5c2.1 0 3.6 1.2 4.4 2.5.8-1.3 2.3-2.5 4.4-2.5 3.6 0 5.7 3.8 4.2 7.2C19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

/** Kalan süre çubuğu. Genişlik doğrudan stilden (geçiş animasyonu yok: sayacı geciktirmez). */
export function V2SureCubugu({ kalanSn, toplamSn }) {
  const oran = toplamSn > 0 ? Math.max(0, Math.min(1, kalanSn / toplamSn)) : 0;
  return (
    <div className={`bd-d2-sure ${kalanSn <= 3 ? "kritik" : ""}`} aria-hidden="true">
      <span style={{ width: `${(oran * 100).toFixed(1)}%` }} />
    </div>
  );
}

/** Uzatma bandı: "beraberlik yok" + kategori rastgele. */
export function V2UzatmaBandi({ kategori, c }) {
  return (
    <div className="bd-d2-uzatma" role="status">
      <b>{c("UZATMA")}</b>
      <span>{c("Beraberlik yok, uzatma: biri doğru öteki yanlış yapana kadar sürer.")}</span>
      {kategori && (
        <span className="bd-d2-uzatma-kat">
          <KategoriIkon anahtar={kategori} boyut={16} /> {c("Kategori rastgele geldi: {kategori}", { kategori: c(kategoriAdi(kategori)) })}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- kategori fazı
export function V2Kategori({ d, benSaldiran, rakip, calisan, sayac, cubuk, onSec, c }) {
  const uygun = new Set(Array.isArray(d.uygun_kategoriler) ? d.uygun_kategoriler : []);
  const sayim = d.kategori_sayim ?? {};
  const max = Number(d.kategori_max ?? 2);
  const profil = rakip.profil?.kategoriler ?? [];

  if (!benSaldiran) {
    return (
      <div className="bd-duello-bekle bd-d2-bekle">
        <span className="bd-duello-bekle-ikon" aria-hidden="true"><Ikon ad="saat" boyut={30} /></span>
        <h2>{c("{ad} kategori seçiyor…", { ad: rakip.gorunen_ad })}</h2>
        {sayac}
        {cubuk}
        <p className="alt-yazi">{c("Süre dolarsa kategori rastgele seçilir.")}</p>
        <p className="alt-yazi">{c("Kategoriyi seçen taraf değişir, soruyu ikiniz aynı anda cevaplarsınız.")}</p>
      </div>
    );
  }

  return (
    <div className="bd-duello-kategori bd-d2-kategori">
      <div className="bd-duello-baslik-satir">
        <h2>{c("Kategori seç")}</h2>
        {sayac}
      </div>
      {cubuk}
      <p className="alt-yazi">
        {c("Süre dolarsa kategori rastgele seçilir.")}{" "}
        {c("Her kategori maçta en çok {n} kez gelir; aynı kategori üst üste gelmez.", { n: max })}
      </p>
      <div className="bd-duello-kat-grid">
        {(d.kategoriler ?? []).map((k) => {
          const adet = Number(sayim[k] ?? 0);
          const doldu = adet >= max;
          const secilebilir = uygun.has(k);
          const p = profil.find((x) => x.kategori === k);
          const neden = secilebilir ? null : doldu ? c("doldu") : c("üst üste olmaz");
          return (
            <button key={k} type="button"
                    className={`bd-duello-kat bd-d2-kat ${secilebilir ? "" : "kapali"}`}
                    disabled={!secilebilir || !!calisan}
                    aria-label={`${c(kategoriAdi(k))} ${adet}/${max}${neden ? ` · ${neden}` : ""}`}
                    onClick={() => onSec(k)}>
              <KategoriIkon anahtar={k} boyut={22} plaka />
              <span className="bd-duello-kat-ad">{c(kategoriAdi(k))}</span>
              <span className="bd-duello-kat-yuzde">
                {neden ?? (p?.yuzde === null || p?.yuzde === undefined ? c("veri yok") : `%${p.yuzde}`)}
              </span>
              <span className="bd-duello-kat-sayac">{adet}/{max}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- cevap fazı
export function V2Cevap({ d, rakip, secenekler, secim, ikinciSansElendi, calisan, kalanSn,
  sayac, cubuk, skillEfektSinif, onCevap, c }) {
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

  return (
    <div className="bd-duello-cevap bd-d2-cevap">
      {d.uzatma && <V2UzatmaBandi kategori={d.kategori} c={c} />}
      <div className="bd-duello-baslik-satir">
        <h2 className="bd-d2-cevap-baslik">
          {d.kategori && <KategoriIkon anahtar={d.kategori} boyut={20} plaka />}
          <span>{katAdi}</span>
        </h2>
        {sayac}
      </div>
      {cubuk}
      <div className="bd-d2-durumlar" aria-live="polite">
        <span className={`bd-d2-durum ${kilitli ? "tamam" : ""}`}>
          <b>{c("Sen")}</b>
          {kilitli ? <><Ikon ad="kilit" boyut={14} /> {c("Cevabın kilitlendi")}</> : sureBitti ? c("Yanıtsız") : c("düşünüyor…")}
        </span>
        <span className={`bd-d2-durum ${cv.rakip_cevapladi ? "tamam" : ""}`}>
          <b>{rakip.gorunen_ad}</b>
          {cv.rakip_cevapladi ? <><Ikon ad="onay" boyut={14} /> {c("cevapladı")}</> : c("düşünüyor…")}
        </span>
      </div>
      <div className={`bd-duello-soru ${skillEfektSinif}`}>
        <div className="bd-soru-metin bd-soru-giris">{d.soru?.soru}</div>
        <div className="bd-secenekler">
          {secenekler.map((s, i) => {
            const elendi = kapali.includes(i) || elenenler.has(i);
            let sinif = "bd-secenek";
            if (i === benimCevap) sinif += " secili";
            if (elendi) sinif += elenenler.has(i) ? " elendi ikinci-sans-elendi" : " elendi";
            if (kilitli && i !== benimCevap && !elendi) sinif += " bd-d2-sonuk";
            return (
              <button key={i} type="button" className={sinif}
                      disabled={!tiklanabilir || elendi}
                      aria-pressed={i === benimCevap}
                      onClick={() => onCevap(i)}>
                <span className="bd-harf">{HARFLER[i]}</span>
                <span className="bd-secenek-metin">{s}</span>
                {kilitli && i === benimCevap && <Ikon ad="kilit" boyut={16} className="bd-secenek-isaret" />}
              </button>
            );
          })}
        </div>
      </div>
      {kilitli && <p className="bd-d2-not">{c("Cevabın kilitlendi — sonuç ikiniz de cevaplayınca açılır.")}</p>}
      {!kilitli && sureBitti && <p className="bd-d2-not">{c("Süren doldu — sonuç bekleniyor.")}</p>}
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

/** Simetrik can tablosunun sonucu tek cümle: kim can kaybetti, neden. */
export function v2SonucMetni(h, benId, c) {
  const rakipId = Object.keys(h?.cevaplar ?? {}).find((k) => k !== benId);
  const b = durumu(h?.cevaplar?.[benId]);
  const r = durumu(rakipId ? h.cevaplar[rakipId] : null);
  let metin;
  let ton = "";
  if (b === "dogru" && r !== "dogru") { metin = c("Sen doğru, rakip {r} → rakip 1 can kaybetti", { r: c(DURUM_KUCUK[r]) }); ton = "iyi"; }
  else if (b !== "dogru" && r === "dogru") { metin = c("Sen {b}, rakip doğru → sen 1 can kaybettin", { b: c(DURUM_KUCUK[b]) }); ton = "kotu"; }
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
  return (
    <div className="bd-duello-sonuc bd-d2-sonuc">
      {h.uzatma && <V2UzatmaBandi kategori={h.kategori} c={c} />}
      <div className={`bd-duello-hamle buyuk ${ton}`} role="status">{metin}</div>
      <div className="bd-d2-tablo" aria-label={c("Can")}>
        <div className={`bd-d2-tablo-hucre ${b}`}>
          <span>{c("Sen")}</span>
          <b>{c(DURUM_ETIKET[b])}</b>
          {h.can_kaybeden === d.ben && <small><KalpMini /> −1</small>}
        </div>
        <div className={`bd-d2-tablo-hucre ${r}`}>
          <span>{rakip.gorunen_ad}</span>
          <b>{c(DURUM_ETIKET[r])}</b>
          {h.can_kaybeden && h.can_kaybeden !== d.ben && <small><KalpMini /> −1</small>}
        </div>
      </div>
      {h.uzatma && (
        <p className="bd-d2-not">
          {h.can_kaybeden ? c("Uzatmada ilk fark maçı bitirir.") : c("Eşitlik sürüyor — sıradaki uzatma sorusu geliyor, kategori yine rastgele.")}
        </p>
      )}
      {d.soru?.soru && (
        <div className="bd-duello-soru">
          <div className="bd-soru-metin">{d.soru.soru}</div>
          <div className="bd-secenekler">
            {secenekler.map((s, i) => {
              let sinif = "bd-secenek";
              if (i === dogru) sinif += " dogru";
              else if (i === benimCevap) sinif += " yanlis";
              else sinif += " solgun";
              return (
                <button key={i} type="button" className={sinif} disabled>
                  <span className="bd-harf">{HARFLER[i]}</span>
                  <span className="bd-secenek-metin">{s}</span>
                  {i === dogru && <Ikon ad="onay" boyut={18} className="bd-secenek-isaret" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {b !== "dogru" && dogru !== null && secenekler[dogru] !== undefined && (
        <div className="bd-duello-dogru-cevap">{c("Doğru cevap: {harf} · {metin}", { harf: HARFLER[dogru], metin: secenekler[dogru] })}</div>
      )}
      {b === "yanitsiz" && <div className="bd-d2-yanitsiz">{c("Yanıtsız")} · {c("Şık işaretlenmedi")}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- skill şeridi
export function V2Skill({ d, calisan, kalanSn, serbest, onKullan, c }) {
  const s = d.skill ?? {};
  const izinli = Array.isArray(s.izinli) ? s.izinli : [];
  const set = Array.isArray(s.set) ? s.set : [];
  const liste = set.filter((t) => izinli.includes(t));
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
    <div className={`bd-duello-jokerler bd-d2-skill ${genelEngel ? "kapali" : "acik"}`} aria-label={c("Skill")}>
      <div className="bd-duello-joker-baslik bd-d2-skill-baslik">
        <span>{c("Skill")}</span>
        <span className="bd-d2-hak" aria-label={c("{k}/{t} kullanıldı", { k: kullanilan, t: toplam })}>
          {Array.from({ length: toplam }).map((_, i) => <i key={i} className={i < kullanilan ? "dolu" : ""} />)}
          <b>{kullanilan}/{toplam}</b>
        </span>
      </div>
      <div className="bd-duello-joker-ipucu" role="status">
        {liste.length === 0 ? c("Setinde Düello'da kullanılabilen skill yok.") : (genelEngel ?? c("Şimdi kullanabilirsin."))}
        {" "}<span className="bd-d2-kural">{c("Aynı skill en çok {n} kez, soru başına {s}.", { n: turBasi, s: soruBasi })}</span>
      </div>
      {liste.length > 0 && (
        <div className="bd-duello-joker-sira">
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
            return (
              <button key={tur} type="button"
                      className={`bd-duello-joker ${turBitti ? "kullanildi" : ""} ${fiyatGoster && acik ? "satilik" : ""}`}
                      disabled={!acik || !!calisan}
                      aria-busy={calisan === `joker-${tur}`}
                      title={ozel ?? (coinYetmez ? c("Yetersiz coin") : c(bilgi.aciklama ?? ""))}
                      onClick={() => onKullan(tur, { satinAl: fiyatGoster, adet })}>
                {fiyatGoster && acik && <span className="bd-joker-satilik" aria-hidden="true"><Ikon ad="coin" boyut={12} /></span>}
                <Ikon ad={bilgi.ikon ?? "soru"} boyut={20} />
                <span className="bd-duello-joker-ad">{c(bilgi.ad ?? tur)}</span>
                <span className="bd-d2-joker-alt">
                  <span className="bd-d2-joker-sayi">{n}/{turBasi}</span>
                  <span className={`bd-duello-joker-adet ${fiyatGoster ? "fiyat" : ""} ${fiyatGoster && !acik ? "soluk" : ""}`}>
                    {fiyatGoster ? `${fiyat}` : serbest ? "∞" : `×${adet}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {liste.includes("soru_degistir") && sdKilit && soruAcik && !cevapladim && (
        <div className="bd-d2-kilit" role="note"><Ikon ad="kilit" boyut={14} /> {sdKilit}</div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- maç sonu: her soru
export function V2Gecmis({ gecmis, maxTur, benId, c }) {
  if (!Array.isArray(gecmis) || gecmis.length === 0) return null;
  return (
    <div className="bd-d2-gecmis" aria-label={c("Maçın soruları")}>
      <div className="bd-mac-soru-etiket">{c("Maçın soruları")}</div>
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
            <li key={i} className={`bd-d2-gecmis-soru ${ben}`}>
              <div className="bd-d2-gecmis-ust">
                <span className="bd-d2-gecmis-tur">
                  {g.uzatma ? c("Uzatma") : c("Tur {n}/{t}", { n: g.tur, t: maxTur ?? 10 })}
                </span>
                {g.kategori && <span className="bd-d2-gecmis-kat"><KategoriIkon anahtar={g.kategori} boyut={14} /> {c(kategoriAdi(g.kategori))}</span>}
                <span className={`bd-d2-rozet ${ben}`}>{c(DURUM_ETIKET[ben])}</span>
              </div>
              {g.soru && <div className="bd-d2-gecmis-metin">{g.soru}</div>}
              {dc !== null && sec[dc] !== undefined && (
                <div className="bd-duello-dogru-cevap">{c("Doğru cevap: {harf} · {metin}", { harf: HARFLER[dc], metin: sec[dc] })}</div>
              )}
              <div className="bd-d2-gecmis-alt">
                {ben === "yanitsiz"
                  ? <span className="bd-d2-yanitsiz">{c("Yanıtsız")} · {c("Şık işaretlenmedi")}</span>
                  : ben === "yanlis" && benimCevap !== null
                    ? <span>{c("Senin cevabın: {harf}", { harf: HARFLER[benimCevap] })}</span>
                    : null}
                <span>{c("rakip {durum}", { durum: c(DURUM_KUCUK[rakip]) })}</span>
                <span className={`bd-d2-gecmis-can ${!kaybeden ? "" : kaybeden === benId ? "kotu" : "iyi"}`}>{canMetni}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
