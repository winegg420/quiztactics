// ============================================================
// DÜELLO — ARAYÜZ PARÇALARI (Tasarım A "Şeker Kutusu" + 680 Hâkimiyet)
//
// Kurallar SUNUCUDA (migration 680/681 · duello_*). Bu dosya yalnız duello_durum()'u çizer;
// hiçbir kural burada hesaplanmaz.
//   · Hâkimiyet: PUAN YOK. 10 kategori boş başlar; hamle "saldıran doğru + savunan yanlış" ise tutar;
//     eşik (duello_hakimiyet_esik, 5) yuvaya ilk ulaşan kazanır; boşta ikisi de doğruysa saldıran alır (870) (tahta, kartlar, mesaj ve alt çubuk: DuelloTahta.jsx).
//   · Cevap: iki oyuncu AYNI soruyu AYNI ANDA görür; rakibin yalnız CEVAPLADIĞI görünür.
//   · Son tur (duello_max_tur, 16) sonunda yuvalar eşitse Altın Soru (uzatma bayrağı): zor soru, jokersiz.
//   · Joker: toplam 4 · aynı joker 2 · soru başına 1 (sayılar sunucudan); Baskın/Kalkan joker şeridinde.
//
// Görünüm: oyun/tasarim bileşenleri + oyun/styles/duello-tahta.css (hk- önekli) + DuelloPage.a.css (m2-).
// Metinlerin İngilizcesi oyun/lib/ceviri/mac.js › "Düello (M2)" ve hakimiyet-ekran.js.
// Test kancaları: .hk-kart (kategori), .qt-sik (şık; .elendi), .bd-d2-skill button.
// iOS: bu dosyada position:fixed yok.
// ============================================================
import KategoriIkon from "./KategoriIkon.jsx";
import { kategoriAdi } from "../lib/kategoriler.js";
import { QtIkon, QtSik, QtSikler, QtSoruKarti, sinif } from "../tasarim/index.js";
import { SeviyeEtiketi } from "./MacUstSerit.jsx";
import OyuncuAdiDugmesi from "./OyuncuAdiDugmesi.jsx";
import { adKisalt } from "../lib/adKisalt.js";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import IsimEfekti from "./IsimEfekti.jsx";
import { TepkiAvatar } from "./Tepki.jsx";
import { soruUzunlukSinifi } from "../lib/soruUzunluk.js";
import { hkGecmisSonucu } from "./DuelloTahta.jsx";

const HARFLER = ["A", "B", "C", "D"];

export function secenekleriCoz(s) {
  if (Array.isArray(s)) return s;
  if (typeof s === "string") {
    try { const a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch { return []; }
  }
  return [];
}

// ---------------------------------------------------------------- üst başlık
/**
 * Tek satır: solda sen (avatar, ad, seviye), ortada "Tur N/T" + büyük süre, sağda rakip.
 * Altında T tur noktası (T = d.max_tur; 960: maç satırından, seçim modunda 20), en altta ince süre çubuğu. PUAN YAZMAZ (Hâkimiyet'te puan yok).
 * sayac: ekranın verdiği QtSayac (büyük süre; son 5 sn kırmızı + nabız). oran: 0–1 süre çubuğu.
 * 540/542: ad isim efektiyle (oyuncu kartı); tepkiBalonlar = { [oyuncuId]: balon } → avatarın yanında tepki.
 */
// 960: noktalar = seçim fazında tur noktalarının yerine çizilen öğe (DuelloSecim › SecimPipler); başlıkta "SEÇİM".
export function V2Ust({ d, ben, rakip, c, seviyeler = {}, tepkiBalonlar = {}, sayac, oran = 0, son = false, onay = {}, noktalar = null }) {
  const taraf = (o, rakipMi) => {
    const secen = d.saldiran === o.id;
    return (
      <div className={sinif("qt-oyuncu", rakipMi && "qt-oyuncu--rakip", secen && "m2-secen")}>
        <TepkiAvatar balon={tepkiBalonlar[o.id]} yan={rakipMi ? "rakip" : "sen"}>
          <CerceveliAvatar profile={o} userId={o.id} boyut={32} hareketli kart={seviyeler[o.id]} />
          {/* Cevap fazı: cevabını kilitleyen oyuncunun avatarında onay işareti (eski "düşünüyor / cevapladı" satırı) */}
          {onay[o.id] && (
            <span className="hk-onay qt-h-pop-gir" role="img" aria-label={rakipMi ? c("cevapladı") : c("Cevabın kilitlendi")}>
              <QtIkon ad="onay" boyut={11} />
            </span>
          )}
        </TepkiAvatar>
        <span className="qt-oyuncu-yazi">
          {/* Ajan C: ada dokununca oyuncu kartı (kendi "Sen" → kendi kartın) */}
          <OyuncuAdiDugmesi userId={o.id} profil={o} className="qt-oyuncu-ad">
            <IsimEfekti userId={o.id} {...(seviyeler[o.id] ? { kart: seviyeler[o.id] } : {})}>{rakipMi ? adKisalt(o.gorunen_ad) : c("Sen")}</IsimEfekti>
          </OyuncuAdiDugmesi>
          <SeviyeEtiketi {...(seviyeler[o.id] ?? {})} />
        </span>
        {secen && (
          <span className="qt-oyuncu-etkiler">
            <span className="qt-etki m2-secen-rozet" role="img" aria-label={c("Kategoriyi seçen")}>
              <QtIkon ad="kilic" boyut={12} />
            </span>
          </span>
        )}
      </div>
    );
  };
  const maxTur = Number(d.max_tur) || 16;   // sunucu her zaman gönderir (duello_max_tur); 16 yalnız yedek
  const biten = d.uzatma ? maxTur : d.faz === "sonuc" ? d.tur : d.tur - 1;
  return (
    <header className={sinif("hk-ust", d.uzatma && "hk-ust--altin", son && "hk-ust--son")}>
      <div className="qt-mac-ust m2-ust hk-ust-satir">
        {taraf(ben, false)}
        <div className="hk-orta" key={`${d.tur}-${d.uzatma}`}>
          <span className="hk-tur">
            {d.uzatma ? c("ALTIN SORU") : d.faz === "secim" ? c("SEÇİM") : <>{c("Tur")} <b className="qt-sayi">{d.tur}/{maxTur}</b></>}
          </span>
          {sayac}
        </div>
        {taraf(rakip, true)}
      </div>
      {noktalar ?? <ol className="hk-noktalar" aria-label={c("Tur {n}/{t}", { n: d.tur, t: maxTur })}>
        {Array.from({ length: maxTur }, (_, i) => (
          <li key={i} className={sinif("hk-nokta", i < biten && "hk-nokta--bitti", !d.uzatma && i + 1 === d.tur && "hk-nokta--simdi")} />
        ))}
      </ol>}
      <div className="hk-cubuk-sure" aria-hidden="true"><i style={{ width: `${Math.round(Math.max(0, Math.min(1, oran)) * 100)}%` }} /></div>
    </header>
  );
}

// ---------------------------------------------------------------- kategori fazı (DuelloTahta.jsx)
export { V2Kategori, V2SecimCubugu } from "./DuelloTahta.jsx";

// ---------------------------------------------------------------- cevap fazı
export function V2Cevap({ d, rakip, secenekler, secim, ikinciSansElendi, calisan, kalanSn,
  kiriliyor = [], onCevap, c, katDurum = null }) {
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
      {/* Kimin cevapladığı görsel olarak üst başlıktaki avatar işaretinde; ekran okuyucu için burada da söylenir. */}
      <p className="hk-gizli" aria-live="polite">
        {kilitli ? c("Cevabın kilitlendi") : sureBitti ? c("Yanıtsız") : c("düşünüyor…")}
        {" · "}{adKisalt(rakip.gorunen_ad)}: {cv.rakip_cevapladi ? c("cevapladı") : c("düşünüyor…")}
      </p>
      <QtSoruKarti
        key={d.soru?.soru ?? "soru"}
        className={sinif("m2-soru", soruUzunlukSinifi({ soru: d.soru?.soru, secenekler }), katDurum && "hk-soru--durum", katDurum && `hk-durum--${katDurum.ton}`)}
        kategori={d.kategori ? <><KategoriIkon anahtar={d.kategori} boyut={16} /> {katAdi}</> : null}
        // Hâkimiyet: kategori rozeti durum rengiyle çerçevelenir, yanında tek kısa etiket (DuelloTahta › hkKategoriDurumu).
        sira={katDurum
          ? <span className="hk-durum-etiket"><QtIkon ad={katDurum.ikon} boyut={13} /> {c(katDurum.etiket)}</span>
          : d.uzatma ? c("Altın Soru · joker yok") : c("Aynı soru · aynı anda")}
        metin={d.soru?.soru}
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
    </div>
  );
}

// ---------------------------------------------------------------- sonuç (tur sonu)
function durumu(x) {
  if (!x || x.yanitsiz || x.cevap === null || x.cevap === undefined) return "yanitsiz";
  return x.dogru ? "dogru" : "yanlis";
}
const DURUM_ETIKET = { dogru: "Doğru", yanlis: "Yanlış", yanitsiz: "Yanıtsız" };
const DURUM_IKON = { dogru: "onay", yanlis: "carpi", yanitsiz: "saat" };

/**
 * Tur sonucu: tur sonucu bandı mesaj satırında (DuelloTahta › hkMesaj); burada yalnız soru + şıklar
 * (doğru şık işaretli) ve gerekiyorsa doğru cevap satırı.
 */
export function V2Sonuc({ d, secenekler, c }) {
  const h = d.son_hamle;
  if (!h) return null;
  const b = durumu(h.cevaplar?.[d.ben]);
  const benim = h.cevaplar?.[d.ben];
  const benimCevap = benim?.cevap === null || benim?.cevap === undefined ? null : Number(benim.cevap);
  const dogru = h.dogru_cevap === null || h.dogru_cevap === undefined ? null : Number(h.dogru_cevap);
  return (
    <div className="m2-sonuc-faz">
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
      {b === "yanitsiz" && <p className="m2-not">{c("Yanıtsız")} · {c("Şık işaretlenmedi")}</p>}
    </div>
  );
}

// Joker şeridi (V2Skill) 680'de DuelloJokerSeridi.jsx'e taşındı (Alt Ajan D sahibi); buradan yeniden dışa aktarılır.
export { V2Skill } from "./DuelloJokerSeridi.jsx";

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
          const sonuc = hkGecmisSonucu(g, benId, c);
          const DURUM_KUCUK = { dogru: "doğru", yanlis: "yanlış", yanitsiz: "yanıtsız" };
          return (
            <li key={i} className={`m2-gecmis-soru m2-gecmis-soru--${ben}`}>
              <div className="m2-gecmis-ust">
                <span className="m2-gecmis-tur">
                  {g.uzatma ? c("Altın Soru") : c("Tur {n}/{t}", { n: g.tur, t: maxTur ?? 16 })}
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
                <span className={sinif("m2-gecmis-can", sonuc.iyi && "m2-gecmis-can--iyi", sonuc.kotu && "m2-gecmis-can--kotu")}>{sonuc.metin}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
