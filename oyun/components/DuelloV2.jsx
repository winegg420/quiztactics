// ============================================================
// DÜELLO — ARAYÜZ PARÇALARI (Tasarım A "Şeker Kutusu")
//
// Kurallar SUNUCUDA (migration 666 · duello2_*). Bu dosya yalnız duello_durum()'u
// çizer; hiçbir kural burada hesaplanmaz.
//   · Puan: can yok. Kategoriler maç başında yıldızlanır (oyuncu.yildizlar — rakibin
//     o kategorideki doğru oranından; ★ zayıf · ★★ orta · ★★★ güçlü), değerler
//     puan_degerleri'nden (1/3/6). Doğru bilen (saldıran ya da savunan) değeri alır.
//   · Kategori: sureler.kategori (15 sn), dolunca sunucu rastgele seçer. Kullanım sınırı yok.
//   · Cevap: iki oyuncu AYNI soruyu AYNI ANDA görür; rakibin yalnız CEVAPLADIĞI görünür.
//   · Sonuç: iki tarafın doğru/yanlış/yanıtsız hücresi + kazanılan puan.
//   · 10 tur sonunda puan eşitse Altın Soru (uzatma bayrağı): zor soru, jokersiz,
//     yalnız biri bilene kadar.
//   · Kategori Kalkanı: maçta 2 hak (Tur 1–5: 1 · Tur 6–10: 2, kullanılmayan kaybolmaz).
//   · Joker: toplam 4 · aynı joker 2 · soru başına 1 (sayılar sunucudan).
//
// Görünüm: oyun/tasarim bileşenleri + oyun/pages/DuelloPage.a.css (m2- önekli sınıflar).
// Metinlerin İngilizcesi oyun/lib/ceviri/mac.js › "Düello (M2)".
// Test kancaları: .m2-kat (kategori), .qt-sik (şık; .elendi), .bd-d2-skill button, .m2-yildiz.
// iOS: bu dosyada position:fixed yok.
// ============================================================
import { useState } from "react";
import KategoriIkon from "./KategoriIkon.jsx";
import { kategoriAdi } from "../lib/kategoriler.js";
import { JOKER_BILGI } from "../lib/jokerler.js";
import SkillRozeti from "./SkillRozeti.jsx";
import { QtDugme, QtIkon, QtSik, QtSikler, QtSkill, QtSkillCubugu, QtSoruKarti, QtSonucBandi, sinif } from "../tasarim/index.js";
import { SeviyeEtiketi } from "./MacUstSerit.jsx";
import OyuncuAdiDugmesi from "./OyuncuAdiDugmesi.jsx";
import { adKisalt } from "../lib/adKisalt.js";
import CerceveliAvatar from "./CerceveliAvatar.jsx";
import IsimEfekti from "./IsimEfekti.jsx";
import { TepkiAvatar } from "./Tepki.jsx";
import { soruUzunlukSinifi } from "../lib/soruUzunluk.js";

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

// ---------------------------------------------------------------- yıldız + puan
const YILDIZ_AD = { 1: "zayıf", 2: "orta", 3: "güçlü" };

/** Oyuncunun kategorisinin yıldızı (1–3); veri yoksa ★★ (sunucuyla aynı varsayılan). */
export function kategoriYildizi(oyuncu, k) {
  const v = Number(oyuncu?.yildizlar?.[k]);
  return v >= 1 && v <= 3 ? v : 2;
}

/**
 * Yıldızın puan değeri (maç başında sabitlenen puan_degerleri; yoksa 1/3/6).
 * 667: son 2 turda (d.tur_carpani, Altın Soru'da her zaman 1) çarpanla katlanır — doğru bilen bu kadar
 * alır, saldıran yanlış/yanıtsız bırakırsa bu kadar kaybeder (taban 0, kural sunucuda).
 */
export function yildizPuani(d, y) {
  const v = Number(d?.puan_degerleri?.[String(y)]);
  const taban = Number.isFinite(v) && v > 0 ? v : ({ 1: 1, 2: 3, 3: 6 })[y] ?? 3;
  const carpan = !d?.uzatma && Number(d?.tur_carpani) > 1 ? Number(d.tur_carpani) : 1;
  return Math.round(taban * carpan);
}

/** Son 2 tur ×çarpan rozeti (Altın Soru'da yok). */
export function V2CarpanRozeti({ d, className }) {
  if (d?.uzatma || !(Number(d?.tur_carpani) > 1)) return null;
  return <span className={sinif("m2-kat-carpan", className)} aria-hidden="true">×{d.tur_carpani}</span>;
}

/**
 * Yıldız rozeti: yıldız SAYISI ve RENK birlikte (trafik ışığı — kırmızı zayıf, sarı orta,
 * yeşil güçlü; biri öbürünün yerine geçmez) + puan değeri ("★★ +3").
 */
export function YildizEtiket({ yildiz, puan, c, kucuk = false, className }) {
  const y = Math.min(3, Math.max(1, Number(yildiz) || 2));
  return (
    <span className={sinif("m2-yildiz", `m2-yildiz--${y}`, kucuk && "m2-yildiz--kucuk", className)}
          role="img" aria-label={c("{y} yıldız, {ad} · doğru bilene {p} puan", { y, ad: c(YILDIZ_AD[y]), p: puan })}>
      <span className="m2-yildiz-y" aria-hidden="true">{"★".repeat(y)}</span>
      <b className="qt-sayi" aria-hidden="true">+{puan}</b>
    </span>
  );
}

// ---------------------------------------------------------------- üst şerit
/**
 * İki oyuncu, puanlar, ortada tur. Kategoriyi seçen tarafın avatarında kılıç rozeti.
 * artis = { [oyuncuId]: { anahtar, miktar } } → puanın yanında "+N" balonu.
 * 540/542: ad isim efektiyle (oyuncu kartı); tepkiBalonlar = { [oyuncuId]: balon } → avatarın yanında tepki.
 */
export function V2Ust({ d, ben, rakip, artis = {}, c, seviyeler = {}, tepkiBalonlar = {} }) {
  const taraf = (o, rakipMi) => {
    const secen = d.saldiran === o.id;
    const puan = Math.max(0, Number(o.puan ?? 0));
    const kalkan = kalkanDurumu(d, o.id);
    const a = artis[o.id];
    return (
      <div className={sinif("qt-oyuncu", rakipMi && "qt-oyuncu--rakip", secen && "m2-secen")}>
        <TepkiAvatar balon={tepkiBalonlar[o.id]} yan={rakipMi ? "rakip" : "sen"}>
          <CerceveliAvatar profile={o} userId={o.id} boyut={48} hareketli kart={seviyeler[o.id]} />
        </TepkiAvatar>
        {/* Kategori Kalkanı: kalan hak (0 = soluk) — saldıran rakibin hakkını görür */}
        {kalkan && (
          <span className={sinif("m2-kalkan-gosterge", kalkan.kalan <= 0 && "m2-kalkan-gosterge--bitti")} role="img"
                aria-label={`${rakipMi ? o.gorunen_ad : c("Sen")}: ${c("Kategori Kalkanı: {n} hak", { n: kalkan.kalan })}`}
                title={c("Kategori Kalkanı: {n} hak", { n: kalkan.kalan })}>
            <QtIkon ad="kalkan" boyut={12} />
            {kalkan.kalan > 0 && <b className="qt-sayi">{kalkan.kalan}</b>}
          </span>
        )}
        <span className="qt-oyuncu-yazi">
          {/* Ajan C: ada dokununca oyuncu kartı (kendi "Sen" → kendi kartın) */}
          <OyuncuAdiDugmesi userId={o.id} profil={o} className="qt-oyuncu-ad">
            <IsimEfekti userId={o.id} {...(seviyeler[o.id] ? { kart: seviyeler[o.id] } : {})}>{rakipMi ? adKisalt(o.gorunen_ad) : c("Sen")}</IsimEfekti>
          </OyuncuAdiDugmesi>
          <SeviyeEtiketi {...(seviyeler[o.id] ?? {})} />
          <span className="m2-puan" role="img" aria-label={rakipMi ? c("Rakibin puanı: {n}", { n: puan }) : c("Senin puanın: {n}", { n: puan })}>
            <b key={a ? `p${a.anahtar}` : "p"} className={sinif("qt-sayi", a && (a.miktar < 0 ? "m2-puan-sayi--dustu" : "m2-puan-sayi--artti"))}>{puan}</b>
            <small>{c("puan")}</small>
            {a && (
              <span key={`a${a.anahtar}`} className={sinif("m2-puan-artis qt-sayi", a.miktar < 0 && "m2-puan-artis--eksi")} aria-hidden="true">
                {a.miktar > 0 ? `+${a.miktar}` : a.miktar}
              </span>
            )}
          </span>
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
          <b>{c("ALTIN SORU")}</b>
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

/** Altın Soru bandı: 10 tur sonunda puan eşit — zor soru, joker yok, yalnız biri bilene kadar. */
export function V2AltinBandi({ kategori, c }) {
  return (
    <div className="m2-uzatma qt-h-pop-gir" role="status">
      <b><QtIkon ad="yildiz" boyut={20} /> {c("ALTIN SORU")}</b>
      <span>{c("Puanlar eşit. Yalnız biriniz bilirse o kazanır; ikiniz de bilir ya da bilemezseniz yeni Altın Soru gelir. Joker yok.")}</span>
      {kategori && (
        <span className="m2-uzatma-kat">
          <KategoriIkon anahtar={kategori} boyut={16} /> {c(kategoriAdi(kategori))}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Kategori Kalkanı
/**
 * Oyuncunun kalkan hakları: null = bu maçta kalkan yok (ayar kapalı);
 * { kalan, kullanilan: [{kategori, idx, tur}], toplam }. Kural sunucuda (duello2_kalkan · duello2_kalkan_engel).
 */
export function kalkanDurumu(d, oyuncuId) {
  const k = d?.kalkan;
  if (!k?.acik) return null;
  const v = k.oyuncular?.[oyuncuId];
  const kullanilan = Array.isArray(v?.kullanilan) ? v.kullanilan : [];
  return { kalan: Math.max(0, Number(v?.kalan ?? 0)), kullanilan, toplam: Number(k.toplam_hak ?? 2) };
}

/**
 * Savunanın kalkan paneli: tek düğme (kalan hak rozetli) → saldıranın şu an seçebileceği kategoriler
 * (yıldızın + oranın) → kısa onay → RPC. Son {son_sn} sn'de ve rakibe tek kategori kalıyorsa pasif.
 * secim/setSecim üst bileşende: kategori listesindeki satıra dokunmak da aynı onayı açar.
 */
function V2KalkanPanel({ d, ben, kalanSn, calisan, onKalkan, secim, setSecim, c }) {
  const [acik, setAcik] = useState(false);
  const kd = kalkanDurumu(d, ben?.id);
  if (!kd || d.uzatma || !onKalkan) return null;
  const aktif = d.kalkan?.aktif ?? null;
  const uygun = Array.isArray(d.uygun_kategoriler) ? d.uygun_kategoriler : [];
  const sonSn = Number(d.kalkan?.son_sn ?? 5);
  const p1 = Number(d.kalkan?.pencere1_son ?? 5);
  const buSecimde = Boolean(aktif && kd.kullanilan.some((x) => x?.kategori === aktif && Number(x?.tur) === Number(d.tur)));
  const neden = buSecimde ? null
    : kd.kalan <= 0
      ? (kd.kullanilan.length < kd.toplam && Number(d.tur) <= p1
        ? c("2. Kalkan hakkın Tur {n}'da açılır.", { n: p1 + 1 })
        : c("Kalkan hakların bitti."))
      : kalanSn <= sonSn ? c("Son {n} saniyede kalkan kullanılamaz.", { n: sonSn })
        : uygun.length < 2 ? c("Rakibe en az bir kategori kalmalı.") : null;
  const kullanilabilir = kd.kalan > 0 && !buSecimde && !neden;
  const yildizli = (k, boyut = 16) => (
    <><YildizEtiket yildiz={kategoriYildizi(ben, k)} puan={yildizPuani(d, kategoriYildizi(ben, k))} c={c} kucuk /> <KategoriIkon anahtar={k} boyut={boyut} /> {c(kategoriAdi(k))}</>
  );

  if (buSecimde) {
    return (
      <section className="m2-kalkan" aria-label={c("Kategori Kalkanı")}>
        <div className="m2-kalkan-durum" role="status">
          <span className="m2-kalkan-damga m2-kalkan-iner" aria-hidden="true"><QtIkon ad="kalkan" boyut={22} /></span>
          <span className="m2-kalkan-durum-yazi">
            <b>{c("Korumada:")} {yildizli(aktif)}</b>
            <small>{c("Rakip bu seçimde alamaz.")} {c("Kalan Kalkan hakkın: {n}", { n: kd.kalan })}</small>
          </span>
        </div>
      </section>
    );
  }

  const siraliUygun = [...uygun].sort((a, b) => kategoriYildizi(ben, b) - kategoriYildizi(ben, a)
    || (kategoriOrani(ben?.profil, a) ?? 101) - (kategoriOrani(ben?.profil, b) ?? 101));
  return (
    <section className="m2-kalkan" aria-label={c("Kategori Kalkanı")}>
      <QtDugme tur="ikincil" ikon="kalkan" tamGenislik className={sinif("m2-kalkan-dugme", kd.kalan <= 0 && "m2-kalkan-dugme--bitti")}
               devreDisi={!kullanilabilir || !!calisan} aria-expanded={kullanilabilir ? acik || !!secim : undefined}
               onClick={() => { setSecim(null); setAcik((x) => !x); }}>
        {c("Kategori Kalkanı")} <span className="m2-kalkan-hak qt-sayi" aria-label={c("{n} hak", { n: kd.kalan })}>{kd.kalan}</span>
      </QtDugme>
      {neden ? (
        <p className="m2-kalkan-neden">{neden}</p>
      ) : !secim && !acik ? (
        <p className="m2-kalkan-neden">{c("Maçta 2 ücretsiz hak: 1. hak Tur 1–5'te, 2. hak Tur 6–10'da açılır. Kullanmadığın hak kaybolmaz.")}</p>
      ) : null}
      {kullanilabilir && secim ? (
        <div className="m2-kalkan-onay qt-h-pop-gir" role="group" aria-label={c("Kalkan onayı")}>
          <p><b>{yildizli(secim, 18)}</b> · {c("bu seçim için korunsun mu?")}</p>
          <div className="m2-kalkan-onay-eylem">
            <QtDugme tur="ikincil" boyut="k" devreDisi={!!calisan} onClick={() => setSecim(null)}>{c("Vazgeç")}</QtDugme>
            <QtDugme boyut="k" ikon="kalkan" className="m2-kalkan-dugme"
                     yukleniyor={calisan === "kalkan"} devreDisi={!!calisan && calisan !== "kalkan"}
                     onClick={() => onKalkan(secim)}>{c("Koru")}</QtDugme>
          </div>
        </div>
      ) : kullanilabilir && acik ? (
        <div className="m2-kalkan-izgara qt-h-gir" role="group" aria-label={c("Korunacak kategoriyi seç")}>
          {siraliUygun.map((k) => {
            const oran = kategoriOrani(ben?.profil, k);
            const yl = kategoriYildizi(ben, k);
            return (
              <button key={k} type="button" className="m2-kalkan-kat"
                      aria-label={`${c(kategoriAdi(k))} · ${c("{y} yıldız, {ad} · doğru bilene {p} puan", { y: yl, ad: c(YILDIZ_AD[yl]), p: yildizPuani(d, yl) })} · ${c("Sen")} ${oranMetni(oran, c)}`}
                      onClick={() => setSecim(k)}>
                <KategoriIkon anahtar={k} boyut={18} plaka />
                <span className="m2-kalkan-kat-ad">{c(kategoriAdi(k))}</span>
                <YildizEtiket yildiz={yl} puan={yildizPuani(d, yl)} c={c} kucuk />
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------- kategori fazı
/**
 * Oyuncunun kategori doğru oranı (0–100) ya da null ("—").
 * Kaynak: maç başında sunucuda bir kez hesaplanan profil.oranlar (az veri → null).
 */
function kategoriOrani(profil, k) {
  const oranlar = profil?.oranlar;
  if (oranlar && typeof oranlar === "object") {
    const v = oranlar[k];
    return typeof v === "number" ? v : null;
  }
  return null;
}

const oranMetni = (v, c) => (v === null ? "—" : c("%{n}", { n: v }));

/**
 * sayac: ekranın verdiği büyük geri sayım (QtSayac). Son 3 sn vurgusu ve ses ekranda.
 * Saldıran: her kartta rakibin yıldızı (renk + ★ + puan) ve iki tarafın oranı.
 * Savunan: "Rakip düşünüyor…", kalkan paneli ve rakibin gördüğü kendi kategori yıldızların.
 */
export function V2Kategori({ d, benSaldiran, ben, rakip, calisan, sayac, sonSaniye, onSec, c,
  kalanSn = 0, onKalkan, kalkanBildirim = null }) {
  const [kalkanSecim, setKalkanSecim] = useState(null);   // onay bekleyen kategori (savunan)
  const uygun = new Set(Array.isArray(d.uygun_kategoriler) ? d.uygun_kategoriler : []);
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
    // Rakibin seçerken gördüğü: kendi kategorilerinin yıldızı (rakip bunlardan puan kazanır).
    const liste = kategoriler
      .map((k) => ({ k, y: kategoriYildizi(ben, k), v: kategoriOrani(ben?.profil, k) }))
      .sort((a, b) => b.y - a.y || (b.v ?? -1) - (a.v ?? -1));
    const kd = kalkanDurumu(d, ben?.id);
    const kalkanAcik = Boolean(kd && kd.kalan > 0 && !d.uzatma && onKalkan && !d.kalkan?.aktif
      && kalanSn > Number(d.kalkan?.son_sn ?? 5) && uygun.size >= 2 && !calisan);
    const satir = (x) => {
      const icerik = (
        <>
          <KategoriIkon anahtar={x.k} boyut={18} plaka />
          <span className="m2-savun-ad">{c(kategoriAdi(x.k))}</span>
          <span className="m2-savun-oran qt-sayi">{oranMetni(x.v, c)}</span>
          <YildizEtiket yildiz={x.y} puan={yildizPuani(d, x.y)} c={c} kucuk />
        </>
      );
      const korumada = x.k === (d.kalkan?.aktif ?? null);
      const sinifAdi = sinif("m2-savun-kat", korumada && "m2-savun-kat--korumada");
      return kalkanAcik && uygun.has(x.k) ? (
        <li key={x.k}>
          <button type="button" className={sinif(sinifAdi, "m2-savun-kat--dugme")}
                  aria-label={`${c(kategoriAdi(x.k))} · ${c("{y} yıldız, {ad} · doğru bilene {p} puan", { y: x.y, ad: c(YILDIZ_AD[x.y]), p: yildizPuani(d, x.y) })} · ${c("Kalkanla koru")}`}
                  onClick={() => setKalkanSecim(x.k)}>
            {icerik}
            <span className="m2-savun-kalkan" aria-hidden="true"><QtIkon ad="kalkan" boyut={14} /></span>
          </button>
        </li>
      ) : (
        <li key={x.k} className={sinifAdi}>{icerik}{korumada && <span className="m2-savun-kalkan" aria-hidden="true"><QtIkon ad="kalkan" boyut={14} /></span>}</li>
      );
    };
    return (
      <div className="m2-kat-faz">
        {baslik}
        <V2KalkanPanel d={d} ben={ben} kalanSn={kalanSn} calisan={calisan} onKalkan={onKalkan}
                       secim={kalkanSecim} setSecim={setKalkanSecim} c={c} />
        <section className="m2-savun-blok" aria-label={c("Rakibin gördüğü kategorilerin")}>
          <h3>{c("Rakibin gördüğü kategorilerin")}</h3>
          <p className="m2-savun-not">{c("Yıldızı senin doğru oranından: ★★★ kategoride doğru bilen 6 puan alır.")}</p>
          <ul>{liste.map(satir)}</ul>
        </section>
      </div>
    );
  }

  return (
    <div className="m2-kat-faz">
      {baslik}
      {kalkanBildirim && (
        <p key={kalkanBildirim.anahtar} className="m2-bant m2-bant--kalkan qt-h-pop-gir" role="status">
          <QtIkon ad="kalkan" boyut={18} />
          <span>{c("{ad} bir kategoriyi korumaya aldı: {kategori}", { ad: rakip.gorunen_ad, kategori: c(kategoriAdi(kalkanBildirim.kategori)) })}</span>
        </p>
      )}
      <p className="m2-not">{c("Yıldızlar rakibin kategori başarısından. Doğru bilen puanı alır — sen de rakip de.")}</p>
      <div className="m2-kat-izgara">
        {kategoriler.map((k) => {
          const secilebilir = uygun.has(k);
          const yl = kategoriYildizi(rakip, k);
          const benYl = kategoriYildizi(ben, k);
          const puan = yildizPuani(d, yl);
          const korumada = k === (d.kalkan?.aktif ?? null);   // rakibin kalkanı
          const neden = secilebilir ? null : korumada ? c("Korumada") : c("Seçilemez");
          return (
            <button key={k} type="button"
                    className={sinif("m2-kat", `m2-kat--y${yl}`, !secilebilir && "m2-kat--kapali", korumada && "m2-kat--kalkan")}
                    disabled={!secilebilir || !!calisan}
                    aria-busy={calisan === "kategori" || undefined}
                    aria-label={`${c(kategoriAdi(k))} · ${c("{y} yıldız, {ad} · doğru bilene {p} puan", { y: yl, ad: c(YILDIZ_AD[yl]), p: puan })} · ${c("Sen: {y} yıldız, {ad}", { y: benYl, ad: c(YILDIZ_AD[benYl]) })}${neden ? ` · ${neden}` : ""}`}
                    onClick={() => onSec(k)}>
              <KategoriIkon anahtar={k} boyut={22} plaka />
              <span className="m2-kat-ad-satir">
                <span className="m2-kat-ad">{c(kategoriAdi(k))}</span>
                <V2CarpanRozeti d={d} />
              </span>
              <span className="m2-kat-bilgi">
                {korumada ? (
                  <span className="m2-kat-korumada"><QtIkon ad="kalkan" boyut={12} /> {neden}</span>
                ) : neden ?? (
                  <>
                    <span className={sinif("m2-kat-guc", `m2-kat-guc--y${benYl}`)}>
                      {c("Sen")}: <b>{"★".repeat(benYl)}</b> {c(YILDIZ_AD[benYl])}
                    </span>
                    <span className="m2-kat-ceza">{c("Doğru +{p} · Yanlış −{p}", { p: puan })}</span>
                  </>
                )}
              </span>
              <YildizEtiket yildiz={yl} puan={puan} c={c} className="m2-kat-yildiz" />
              {korumada && (
                <span className="m2-kat-kalkan m2-kalkan-iner" aria-hidden="true"><QtIkon ad="kalkan" boyut={26} /></span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- cevap fazı
/** Açık sorunun yıldızı: savunanın (kategoriyi seçenin rakibinin) kategori yıldızı. */
function soruYildizi(d) {
  const savunan = (d.oyuncular ?? []).find((o) => o.id === d.savunan);
  return kategoriYildizi(savunan, d.kategori);
}

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
  const yl = soruYildizi(d);
  const puan = yildizPuani(d, yl);

  const durum = (i) => {
    if (kapali.includes(i) || elenenler.has(i)) return kiriliyor.includes(i) ? "kilitli" : "elendi";
    if (i === benimCevap) return "secili";
    return tiklanabilir ? "normal" : "kilitli";
  };

  return (
    <div className="m2-cevap-faz">
      {d.uzatma ? <V2AltinBandi kategori={d.kategori} c={c} /> : (
        <p className={sinif("m2-bant m2-deger", `m2-deger--${yl}`)} role="status">
          <YildizEtiket yildiz={yl} puan={puan} c={c} />
          <V2CarpanRozeti d={d} />
          <span>{c("Doğru bilen {n} puan alır; saldıran yanlış/yanıtsız bırakırsa {n} kaybeder.", { n: puan })}</span>
        </p>
      )}
      <div className="m2-durumlar" aria-live="polite">
        <span className={sinif("m2-durum", kilitli && "m2-durum--tamam")}>
          <b>{c("Sen")}</b>
          <span>
            {kilitli ? <><QtIkon ad="kilit" boyut={14} /> {c("Cevabın kilitlendi")}</> : sureBitti ? c("Yanıtsız") : c("düşünüyor…")}
          </span>
        </span>
        <span key={cv.rakip_cevapladi ? "c" : "d"} className={sinif("m2-durum", cv.rakip_cevapladi && "m2-durum--tamam qt-h-pop-gir")}>
          <OyuncuAdiDugmesi userId={rakip.id} profil={rakip} oge="b">{adKisalt(rakip.gorunen_ad)}</OyuncuAdiDugmesi>
          <span>{cv.rakip_cevapladi ? <><QtIkon ad="onay" boyut={14} /> {c("cevapladı")}</> : c("düşünüyor…")}</span>
        </span>
      </div>
      <QtSoruKarti
        key={d.soru?.soru ?? "soru"}
        className={sinif("m2-soru", soruUzunlukSinifi({ soru: d.soru?.soru, secenekler }))}
        kategori={d.kategori ? <><KategoriIkon anahtar={d.kategori} boyut={16} /> {katAdi}</> : null}
        sira={d.uzatma ? c("Altın Soru · joker yok") : c("Aynı soru · aynı anda")}
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

/** Hamlenin sonucu tek cümle: kim kaç puan aldı (Altın Soru'da kim kazandı). */
export function v2SonucMetni(h, benId, c) {
  const rakipId = Object.keys(h?.cevaplar ?? {}).find((k) => k !== benId);
  const b = durumu(h?.cevaplar?.[benId]);
  const r = durumu(rakipId ? h.cevaplar[rakipId] : null);
  if (h?.uzatma) {
    if (h.altin_kazanan === benId) return { metin: c("Altın Soru'yu yalnız sen bildin → maçı kazandın!"), ton: "dogru", b, r };
    if (h.altin_kazanan) return { metin: c("Altın Soru'yu yalnız rakip bildi → maçı rakip kazandı"), ton: "yanlis", b, r };
    return { metin: c("Eşitlik sürüyor — yeni Altın Soru geliyor."), ton: "notr", b, r };
  }
  const bp = Number(h?.puanlar?.[benId] ?? 0);
  const rp = Number(rakipId ? h?.puanlar?.[rakipId] ?? 0 : 0);
  // 667: yalnız saldıran taraf eksiye düşebilir (savunan hiç kaybetmez) — hamlede en çok biri saldırandır.
  let metin;
  let ton = "notr";
  if (b === "dogru" && r === "dogru") metin = c("İkiniz de doğru → ikiniz de +{n}", { n: bp });
  else if (b === "dogru") { metin = c("Sen doğru, rakip {r} → sen +{n}", { r: c(DURUM_KUCUK[r]), n: bp }); ton = "dogru"; }
  else if (r === "dogru") { metin = c("Sen {b}, rakip doğru → rakip +{n}", { b: c(DURUM_KUCUK[b]), n: rp }); ton = "yanlis"; }
  else if (bp < 0) {
    metin = c("Sen {b} (saldırıyken) → −{n}; rakip de {r} ama puan kaybetmedi", { b: c(DURUM_KUCUK[b]), n: Math.abs(bp), r: c(DURUM_KUCUK[r]) });
    ton = "yanlis";
  } else if (rp < 0) {
    metin = c("Rakip {r} (saldırıyken) → rakip −{n}; sen de {b} ama puan kaybetmedin", { r: c(DURUM_KUCUK[r]), n: Math.abs(rp), b: c(DURUM_KUCUK[b]) });
    ton = "dogru";
  } else {
    metin = c("Sen {b}, rakip {r} → kimse puan almadı", { b: c(DURUM_KUCUK[b]), r: c(DURUM_KUCUK[r]) });
  }
  return { metin, ton, b, r, bp, rp };
}

export function V2Sonuc({ d, rakip, secenekler, c }) {
  const h = d.son_hamle;
  if (!h) return null;
  const { metin, ton, b, r } = v2SonucMetni(h, d.ben, c);
  const benim = h.cevaplar?.[d.ben];
  const benimCevap = benim?.cevap === null || benim?.cevap === undefined ? null : Number(benim.cevap);
  const dogru = h.dogru_cevap === null || h.dogru_cevap === undefined ? null : Number(h.dogru_cevap);
  const puanOf = (id) => Number(h.puanlar?.[id] ?? 0);
  const hucre = (etiket, x, kazanc) => (
    <div className={`m2-tablo-hucre m2-tablo-hucre--${x}`}>
      <span className="m2-tablo-ad">{etiket}</span>
      <b><QtIkon ad={DURUM_IKON[x]} boyut={18} /> {c(DURUM_ETIKET[x])}</b>
      {kazanc !== 0 && (
        <small className={sinif("m2-tablo-puan qt-h-pop-gir qt-sayi", kazanc < 0 && "m2-tablo-puan--eksi")}>
          {kazanc > 0 ? `+${kazanc}` : kazanc}
        </small>
      )}
    </div>
  );
  return (
    <div className="m2-sonuc-faz">
      {h.uzatma && <V2AltinBandi kategori={h.kategori} c={c} />}
      <QtSonucBandi ton={ton} metin={metin} anahtar={`${h.tur}-${h.soru_id}`} />
      {!h.uzatma && h.yildiz && (
        <p className="m2-not m2-sonuc-deger">
          <YildizEtiket yildiz={h.yildiz} puan={Number(h.deger ?? yildizPuani(d, h.yildiz))} c={c} kucuk />
          {Number(h.carpan) > 1 && <span className="m2-kat-carpan" aria-hidden="true">×{h.carpan}</span>}
          {c(kategoriAdi(h.kategori ?? ""))}
        </p>
      )}
      <div className="m2-tablo" role="group" aria-label={c("Puan tablosu")}>
        {hucre(c("Sen"), b, puanOf(d.ben))}
        {hucre(rakip.gorunen_ad, r, puanOf(rakip.id))}
      </div>
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
    : d.uzatma ? c("Altın Soru'da joker kullanılamaz.")
    : hakBitti ? c("Bu maçtaki joker kullanımın doldu.")
    : cevapladim ? c("Cevap verdikten sonra joker kullanılamaz.")
    : soruHakBitti ? c("Bu soruda joker hakkını kullandın")
    : kalanSn <= 0 ? c("Süren doldu — sonuç bekleniyor.")
    : null;
  // Soru Değiştir kilidi sunucudan gelir (ör. "Rakibin bu soruda skill kullandı…").
  const sdKilit = s.soru_degistir_kilit && s.soru_degistir_kilit !== "Soru açık değil" ? c(s.soru_degistir_kilit) : null;

  return (
    <section className={sinif("m2-skill bd-d2-skill", genelEngel ? "m2-skill--kapali" : "m2-skill--acik")} aria-label={c("Joker")}>
      <div className="m2-skill-ust">
        <span className="m2-skill-ipucu" role="status">
          {liste.length === 0 ? c("Setinde Düello'da kullanılabilen joker yok.") : (genelEngel ?? c("Şimdi kullanabilirsin."))}
        </span>
        <span className="m2-hak" role="img" aria-label={c("{k}/{t} kullanıldı", { k: kullanilan, t: toplam })}>
          {Array.from({ length: toplam }).map((_, i) => <i key={i} className={i < kullanilan ? "dolu" : ""} />)}
          <b className="qt-sayi">{kullanilan}/{toplam}</b>
        </span>
      </div>
      {liste.length > 0 && (
        <QtSkillCubugu etiket={c("Joker")}>
          {liste.map((tur) => {
            const bilgi = JOKER_BILGI[tur] ?? {};
            const n = Number(sayilar[tur] ?? 0);
            const adet = Number(env[tur] ?? 0);
            const fiyat = Number(fiyatlar[tur] ?? 0);
            const turBitti = n >= turBasi;
            let ozel = null;
            if (tur === "soru_degistir" && sdKilit) ozel = sdKilit;
            else if (tur === "zaman_baskisi" && cv.rakip_cevapladi) ozel = c("Rakibin bu soruyu zaten cevapladı");
            else if (tur === "elli" && elliVar) ozel = c("Bu soruda joker hakkını kullandın");
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
        {c("Aynı joker en çok {n} kez, soru başına {s}.", { n: turBasi, s: soruBasi })}
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
          const bp = Number(g.benim_puanim ?? 0);
          const rp = Number(g.rakip_puani ?? 0);
          const isaretli = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`);
          const puanMetni = g.uzatma
            ? (g.altin_kazanan ? (g.altin_kazanan === benId ? c("Altın Soru'yu sen bildin") : c("Altın Soru'yu rakip bildi")) : c("Eşitlik sürdü"))
            : c("Sen {b} · Rakip {r}", { b: isaretli(bp), r: isaretli(rp) });
          const iyi = g.uzatma ? g.altin_kazanan === benId : bp > rp;
          const kotu = g.uzatma ? Boolean(g.altin_kazanan && g.altin_kazanan !== benId) : rp > bp;
          return (
            <li key={i} className={`m2-gecmis-soru m2-gecmis-soru--${ben}`}>
              <div className="m2-gecmis-ust">
                <span className="m2-gecmis-tur">
                  {g.uzatma ? c("Altın Soru") : c("Tur {n}/{t}", { n: g.tur, t: maxTur ?? 10 })}
                </span>
                {g.kategori && <span className="m2-gecmis-kat"><KategoriIkon anahtar={g.kategori} boyut={14} /> {c(kategoriAdi(g.kategori))}</span>}
                {!g.uzatma && g.yildiz ? <YildizEtiket yildiz={g.yildiz} puan={Number(g.deger ?? 0)} c={c} kucuk /> : null}
                {!g.uzatma && Number(g.carpan) > 1 && <span className="m2-kat-carpan" aria-hidden="true">×{g.carpan}</span>}
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
                {g.kalkan && (
                  <span className="m2-gecmis-kalkan">
                    <QtIkon ad="kalkan" boyut={12} /> {c("{kategori} korundu", { kategori: c(kategoriAdi(g.kalkan)) })}
                    {g.savunan ? ` (${g.savunan === benId ? c("sen") : c("rakip")})` : ""}
                  </span>
                )}
                <span className={sinif("m2-gecmis-can", iyi && "m2-gecmis-can--iyi", kotu && "m2-gecmis-can--kotu")}>{puanMetni}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
