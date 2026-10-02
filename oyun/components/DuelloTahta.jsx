// ============================================================
// DÜELLO — HÂKİMİYET TAHTASI (680, Alt Ajan B)
//
// Kurallar SUNUCUDA (duello_durum → hakimiyet). Bu dosya yalnız çizer; hiçbir kural hesaplanmaz,
// yalnız "tutarsa şu olur" önizlemesi (sunucunun verdiği sayılardan bir artı/eksi) gösterilir.
//   · HkYuvalar     — solda senin, sağda rakibin yuvaları; alınan kategorinin ikonu yuvaya oturur.
//   · hkMesaj       — 2 satırlık sabit mesaj (kural / 3-4 uyarısı / tur sonucu ve nedeni).
//   · V2Kategori    — kartlar, aidiyete göre 3 grup (rakibin · boş · senin).
//   · V2SecimCubugu — kategori fazında alt sabit çubuk: seçim özeti + eylem (Elinden al / Al / Pekiştir).
//   · 853 savunma banı — ban fazında aynı kartlar: savunan tek dokunuşla banlar (kendi önceki banı kilitli),
//     saldıran bekler; kategori fazında banlı kart gri + "Banlı" damgası. V2BanCubugu: ban fazı alt çubuğu.
//   · HkSonTahta    — maç sonu özeti: iki tarafın yuvaları.
// Renkler --hk-* (duello-tahta.css). Metinlerin İngilizcesi ceviri/hakimiyet-ekran.js.
// iOS: bu dosyada position:fixed yok (alt çubuk akışta, sayfanın en altında).
// ============================================================
import { useRef } from "react";
import KategoriIkon from "./KategoriIkon.jsx";
import { kategoriAdi } from "../lib/kategoriler.js";
import { QtDugme, QtIkon, sinif } from "../tasarim/index.js";
import { aktifDil } from "../lib/dil.js";

// Türkçe belirtme hâli (Rakip Sanat'ı aldı). Anahtar = çeviri anahtarı; İngilizcesi düz ad.
const BELIRTME = {
  bilim: "Bilim'i", tarih: "Tarih'i", cografya: "Coğrafya'yı", edebiyat: "Edebiyat'ı", spor: "Spor'u",
  sanat: "Sanat'ı", sinema: "Sinema'yı", muzik: "Müzik'i", teknoloji: "Teknoloji'yi", genel_kultur: "Genel Kültür'ü",
  genel: "Genel'i", karisik: "Karışık'ı",
};
export const belirtme = (k, c) => (BELIRTME[k] ? c(BELIRTME[k]) : c(kategoriAdi(k)));

const DURUM_KUCUK = { dogru: "doğru", yanlis: "yanlış", yanitsiz: "yanıtsız" };
function cevapDurumu(x) {
  if (!x || x.yanitsiz || x.cevap === null || x.cevap === undefined) return "yanitsiz";
  return x.dogru ? "dogru" : "yanlis";
}

// ---------------------------------------------------------------- model
/** duello_durum().hakimiyet → ekranın kullandığı sade görünüm (eski puan maçında acik=false). */
export function hkModel(d, ben, rakip) {
  const h = d?.hakimiyet ?? {};
  const esik = Number(h.esik) > 0 ? Number(h.esik) : 4;
  const sahiplik = h.sahiplik && typeof h.sahiplik === "object" ? h.sahiplik : {};
  const kilitler = h.kilitler && typeof h.kilitler === "object" ? h.kilitler : {};
  const sayi = (id) => Object.values(sahiplik).filter((v) => v === id).length;
  const benY = Number(h.yuvalar?.[ben?.id] ?? sayi(ben?.id));
  const rakipY = Number(h.yuvalar?.[rakip?.id] ?? sayi(rakip?.id));
  return {
    acik: Boolean(h.acik), esik, sahiplik, kilitler, benY, rakipY,
    kiltTur: Number(h.kilit_tur ?? 2),
    avantajEsik: Number(h.avantaj_esik ?? 10),
    benId: ben?.id, rakipId: rakip?.id,
  };
}

/** Kategorinin benim gözümden aidiyeti: "ben" | "rakip" | "bos". */
export const aidiyet = (hk, k) => (hk.sahiplik[k] === hk.benId ? "ben" : hk.sahiplik[k] ? "rakip" : "bos");
/** Benim saldırım için eylem (sunucudaki eylem adlarıyla). */
export const eylemOf = (hk, k) => ({ ben: "pekistir", rakip: "elinden_al", bos: "al" })[aidiyet(hk, k)];
// "Al" başka ekranlarda (dükkân) "Buy" demek: sözlüğe konmaz, İngilizcesi (Claim) burada dile göre çözülür.
const EYLEM_ETIKET = { elinden_al: "Elinden al", pekistir: "Pekiştir" };
export const eylemEtiketi = (e, c) => (e === "al" || !EYLEM_ETIKET[e] ? (aktifDil() === "en" ? "Claim" : "Al") : c(EYLEM_ETIKET[e]));

/**
 * Yuva sırası: her taraf kendi yuvalarını KAZANMA SIRASIYLA dizer (yeni gelen sona oturur, giden çıkar).
 * Sunucu sıra vermez; ilk görülme sırası tutulur (ilk çizimde kategori listesi sırası).
 */
export function useYuvaSirasi(hk, kategoriler) {
  const ref = useRef({ ben: [], rakip: [] });
  const sira = (taraf) => {
    const sahip = taraf === "ben" ? hk.benId : hk.rakipId;
    const sahipOlunan = (kategoriler ?? []).filter((k) => hk.sahiplik[k] === sahip);
    Object.keys(hk.sahiplik).forEach((k) => { if (hk.sahiplik[k] === sahip && !sahipOlunan.includes(k)) sahipOlunan.push(k); });
    const onceki = ref.current[taraf].filter((k) => sahipOlunan.includes(k));
    return [...onceki, ...sahipOlunan.filter((k) => !onceki.includes(k))];
  };
  const yeni = { ben: sira("ben"), rakip: sira("rakip") };
  ref.current = yeni;
  return yeni;
}

// ---------------------------------------------------------------- yuvalar
function YuvaTarafi({ taraf, hk, liste, ad, sayi, c }) {
  const kritik = sayi === hk.esik - 1;
  return (
    <div className={sinif("hk-taraf", `hk-taraf--${taraf}`, kritik && "hk-taraf--kritik")}>
      <div className="hk-yuvalar" style={{ "--hk-n": hk.esik }}>
        {Array.from({ length: hk.esik }, (_, i) => {
          const k = liste[i];
          if (!k) {
            const son = kritik && i === hk.esik - 1;
            return <span key={`b${i}`} className={sinif("hk-yuva", son && "hk-yuva--son")} aria-hidden="true" />;
          }
          const kilit = Number(hk.kilitler[k] ?? 0);
          return (
            <span key={k} className={sinif("hk-yuva hk-yuva--dolu", kilit > 0 && "hk-yuva--kilit")} data-kategori={k}
                  role="img" aria-label={kilit > 0 ? `${c(kategoriAdi(k))}, ${c("{n} tur kilitli", { n: kilit })}` : c(kategoriAdi(k))}>
              <KategoriIkon anahtar={k} boyut={26} plaka className="hk-yuva-ikon" />
              {kilit > 0 && <span className="hk-yuva-kilit" aria-hidden="true"><QtIkon ad="kilit" boyut={10} /></span>}
            </span>
          );
        })}
      </div>
      <div className="hk-say" aria-label={`${ad}: ${sayi}/${hk.esik}`}>
        <span>{ad}</span> <b className="qt-sayi" key={sayi}>{sayi}/{hk.esik}</b>
      </div>
    </div>
  );
}

/** Rozet yuvaları: solda sen, ortada VS, sağda rakip. Ekranın en belirgin öğesi. */
export function HkYuvalar({ d, hk, c, kucuk = false }) {
  const sira = useYuvaSirasi(hk, d?.kategoriler);
  return (
    <section className={sinif("hk-tahta", kucuk && "hk-tahta--kucuk", d?.uzatma && "hk-tahta--altin")} aria-label={c("Yuva durumu")}>
      <YuvaTarafi taraf="ben" hk={hk} liste={sira.ben} ad={c("Sen")} sayi={hk.benY} c={c} />
      <span className="hk-vs" aria-hidden="true">VS</span>
      <YuvaTarafi taraf="rakip" hk={hk} liste={sira.rakip} ad={c("Rakip")} sayi={hk.rakipY} c={c} />
    </section>
  );
}

// ---------------------------------------------------------------- mesaj satırı
/** Sonuç fazı: ana satır + neden (hamle tutmama nedeni HER ZAMAN yazılır). */
export function hkSonucMesaji(d, hk, benId, c) {
  const h = d.son_hamle;
  const x = h?.hakimiyet;
  if (!h) return null;
  const rakipId = Object.keys(h.cevaplar ?? {}).find((k) => k !== benId);
  const b = cevapDurumu(h.cevaplar?.[benId]);
  const r = cevapDurumu(rakipId ? h.cevaplar[rakipId] : null);
  const cevaplar = c("Sen: {b} · Rakip: {r}", { b: c(DURUM_KUCUK[b]), r: c(DURUM_KUCUK[r]) });
  if (h.uzatma) {
    if (h.altin_kazanan === benId) return { l1: c("Altın Soru'yu yalnız sen bildin → maçı kazandın!"), l2: cevaplar, ton: "ben" };
    if (h.altin_kazanan) return { l1: c("Altın Soru'yu yalnız rakip bildi → maçı rakip kazandı"), l2: cevaplar, ton: "rakip" };
    return { l1: c("Eşitlik sürüyor — yeni Altın Soru geliyor."), l2: cevaplar, ton: "notr" };
  }
  if (!x) return { l1: c("Tur bitti"), l2: cevaplar, ton: "notr" };
  const benSaldiran = h.saldiran === benId;
  const kat = h.kategori;
  const ad = c(kategoriAdi(kat));
  const bel = belirtme(kat, c);
  const jokerler = [];
  if (x.cakisma) jokerler.push(c("Baskın ve Kalkan birbirini götürdü"));
  else {
    if (x.baskin) jokerler.push(benSaldiran ? c("Baskın kullandın") : c("Rakip Baskın kullandı"));
    if (x.kalkan) jokerler.push(c("Kalkan hamleyi durdurdu"));
  }
  const jok = jokerler.length ? ` · ${jokerler.join(" · ")}` : "";
  const benimOldu = x.sahip_sonra === benId && x.sahip_once !== benId;
  if (x.tuttu || x.neden === "kontra") {
    if (x.neden === "kontra") {
      return benimOldu
        ? { l1: c("{kat} artık senin!", { kat: ad }), l2: `${c("Kontra: boşta bilen aldı")} · ${cevaplar}`, ton: "ben" }
        : { l1: c("Rakip {kat} aldı", { kat: bel }), l2: `${c("Kontra: boşta bilen aldı")} · ${cevaplar}`, ton: "rakip" };
    }
    if (x.eylem === "pekistir") {
      return benSaldiran
        ? { l1: c("{kat} {n} tur kilitlendi", { kat: ad, n: x.kilit }), l2: cevaplar + jok, ton: "ben" }
        : { l1: c("Rakip {kat} pekiştirdi", { kat: bel }), l2: cevaplar + jok, ton: "rakip" };
    }
    if (benSaldiran) return { l1: c("{kat} artık senin!", { kat: ad }), l2: cevaplar + jok, ton: "ben" };
    return {
      l1: x.eylem === "elinden_al" ? c("Rakip {kat} elinden aldı", { kat: bel }) : c("Rakip {kat} aldı", { kat: bel }),
      l2: cevaplar + jok, ton: "rakip",
    };
  }
  // Hamle tutmadı — neden her zaman yazılır (Kalkan nedeni jokerler satırında zaten yazılıyor).
  let neden = null;
  if (x.neden === "ikisi_dogru") neden = c("ikiniz de bildiniz");
  else if (x.neden === "ikisi_yanlis") neden = c("ikiniz de bilemediniz");
  else if (x.neden === "saldiran_yanlis") neden = benSaldiran ? c("sen bilemedin") : c("rakip bilemedi");
  // Neden zaten "kim bildi / bilemedi"yi söyler; yoksa (Kalkan) kim doğru bildi yazılır.
  const l2 = `${neden ?? cevaplar}${jok}`;
  return { l1: c("Hamle tutmadı"), l2, ton: "notr" };
}

/**
 * Mesaj satırının iki satırı. Varsayılan: kural hatırlatması; 3/4 uyarısı; savunanda "hazırla";
 * cevap fazında hamlenin ne anlama geldiği; sonuç fazında tur sonucu bandı.
 */
export function hkMesaj({ d, hk, ben, rakip, benSaldiran, c, ezeli }) {
  const kuralL1 = c("{n} yuvaya ilk ulaşan kazanır", { n: hk.esik });
  const kuralL2 = c("Hamle tutması için: sen doğru, rakip yanlış");
  const rakipKritik = hk.rakipY === hk.esik - 1;
  const benKritik = hk.benY === hk.esik - 1;
  const uyariR = c("Rakip {n}'te! Bir tane daha alırsa kazanır.", { n: hk.rakipY });
  const uyariB = c("{n}'tesin! Bir tane daha al, maçı kazan.", { n: hk.benY });
  const ton = rakipKritik ? "rakip" : benKritik ? "ben" : "notr";

  if (d.faz === "sonuc") {
    const s = hkSonucMesaji(d, hk, d.ben, c);
    if (s) return { ...s, sonuc: true };
  }
  if (d.faz === "cevap" && d.kategori) {
    if (d.uzatma) return { l1: c("Altın Soru"), l2: c("Yalnız biriniz bilirse o kazanır"), ton: "notr" };
    const kat = c(kategoriAdi(d.kategori));
    const a = aidiyet(hk, d.kategori);
    if (benSaldiran) {
      if (a === "rakip") return { l1: `${kat} · ${c("rakibin kategorisi")}`, l2: c("Elinden almak için: sen doğru, rakip yanlış"), ton };
      if (a === "bos") return { l1: `${kat} · ${c("boş kategori")}`, l2: c("Boşta bilen alır · sen doğru, rakip yanlış"), ton };
      return { l1: `${kat} · ${c("senin kategorin")}`, l2: c("Pekiştirmek için: sen doğru, rakip yanlış"), ton };
    }
    const l1 = c("Rakip {kat} için saldırıyor", { kat });
    if (a === "ben") return { l1, l2: c("Sen doğru bilirsen kategori sende kalır"), ton };
    if (a === "bos") return { l1, l2: c("Rakip yanlış, sen doğru bilirsen alırsın"), ton };
    return { l1, l2: c("Rakip doğru, sen yanlış bilirse 2 tur kilitlenir"), ton };
  }
  if (d.faz === "ban") {
    return benSaldiran
      ? { l1: c("Rakip ban seçiyor…"), l2: c("Banladığı kategoriyi bu turda seçemezsin"), ton }
      : { l1: c("Bir kategori banla"), l2: c("Rakip bu turda o kategoriyi seçemez"), ton };
  }
  if (d.faz === "kategori" && !benSaldiran) {
    return { l1: c("Rakip seçiyor…"), l2: c("Sıradaki hamleni şimdiden hazırla"), ton };
  }
  if (rakipKritik && benKritik) return { l1: uyariR, l2: uyariB, ton: "rakip" };
  if (rakipKritik || benKritik) return { l1: rakipKritik ? uyariR : uyariB, l2: kuralL2, ton };
  return { l1: kuralL1, l2: ezeli && d.tur <= 1 ? ezeli : kuralL2, ton: "notr" };
}

export function HkMesaj({ mesaj, children }) {
  return (
    <div className={sinif("hk-mesaj", `hk-mesaj--${mesaj.ton}`, mesaj.sonuc && "hk-mesaj--sonuc")}>
      <div className="hk-mesaj-yazi" role="status" aria-live="polite" key={`${mesaj.l1}|${mesaj.sonuc ? "s" : ""}`}>
        <b>{mesaj.l1}</b>
        <span>{mesaj.l2}</span>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- kartlar
/** Kategorinin doğru oranı (0–100) ya da null ("—"); kaynak profil.oranlar (maç başında sunucuda). */
function kategoriOrani(profil, k) {
  const v = profil?.oranlar?.[k];
  return typeof v === "number" ? v : null;
}
const oranMetni = (v, c) => (v === null ? "—" : c("%{n}", { n: v }));

const GRUPLAR = [
  { anahtar: "rakip", baslik: "Rakibin kategorileri · elinden al" },
  { anahtar: "bos", baslik: "Boş kategoriler · al" },
  { anahtar: "ben", baslik: "Senin kategorilerin · pekiştir" },
];

function kartVerisi(k, hk, ben, rakip, c) {
  const bo = kategoriOrani(ben?.profil, k);
  const ro = kategoriOrani(rakip?.profil, k);
  const fark = bo === null || ro === null ? 0 : bo - ro;
  const ok = fark >= hk.avantajEsik ? "yukari" : fark <= -hk.avantajEsik ? "asagi" : "esit";
  return { k, bo, ro, fark, ok, ad: c(kategoriAdi(k)) };
}
const OK_SIMGE = { yukari: "↑", esit: "=", asagi: "↓" };
const OK_ETIKET = { yukari: "sen önde", esit: "denk", asagi: "rakip önde" };
const AIDIYET_ETIKET = { ben: "senin kategorin", rakip: "rakibin kategorisi", bos: "boş kategori" };

/**
 * Kategori kartları (kategori fazı). Saldıran: dokununca seçer (onaylamak alt çubukta).
 * Savunan: dokununca sıradaki saldırısı için "Hazır" işaretler; saldıranın dokunduğu kart canlı parlar.
 * 853 · ban fazı (d.faz === "ban"): savunan dokununca BANLAR (onKart → duello_ban_sec); banlanabilirler sunucudan
 * (d.ban.uygun), kendi önceki banı (d.ban.onceki) kilitli; saldıranın kartları pasif. Kategori fazında d.ban.kategori
 * gri + "Banlı" damgalı ve seçilemez (sunucu uygun_kategoriler'den zaten çıkarır).
 */
export function V2Kategori({ d, hk, benSaldiran, ben, rakip, calisan, c, secim, hazir, dokunus, zipla = [], onKart }) {
  const kategoriler = d.kategoriler ?? [];
  const banFazi = d.faz === "ban";
  const banli = banFazi ? null : d.ban?.kategori ?? null;
  const banOnceki = banFazi && !benSaldiran ? d.ban?.onceki ?? null : null;
  const uygunListe = banFazi
    ? (Array.isArray(d.ban?.uygun) ? d.ban.uygun : null)
    : Array.isArray(d.uygun_kategoriler) ? d.uygun_kategoriler : null;
  const uygun = new Set(uygunListe ?? kategoriler.filter((k) => !(Number(hk.kilitler[k]) > 0)));
  const canli = dokunus && dokunus.tur === d.tur ? dokunus.kategori : null;
  const gruplar = GRUPLAR.map((g) => ({
    ...g,
    liste: kategoriler
      .filter((k) => aidiyet(hk, k) === g.anahtar)
      .map((k) => kartVerisi(k, hk, ben, rakip, c))
      .sort((a, b) => b.fark - a.fark || a.ad.localeCompare(b.ad)),
  })).filter((g) => g.liste.length > 0);

  return (
    <div className="hk-kartlar">
      {gruplar.map((g) => (
        <section key={g.anahtar} className="hk-grup" aria-label={c(g.baslik)}>
          <h3 className={`hk-grup-baslik hk-grup-baslik--${g.anahtar}`}>{c(g.baslik)}</h3>
          <div className="hk-izgara">
            {g.liste.map((x) => {
              const kilit = Number(hk.kilitler[x.k] ?? 0);
              const banliMi = banli === x.k;
              const oncekiBan = banOnceki === x.k;
              const secilebilir = uygun.has(x.k) && kilit <= 0 && !banliMi && !(banFazi && (benSaldiran || oncekiBan));
              const secili = benSaldiran && secim === x.k;
              const hazirMi = !benSaldiran && hazir === x.k;
              const dokunuluyor = !benSaldiran && canli === x.k;
              return (
                <button key={x.k} type="button" data-kategori={x.k}
                        className={sinif("hk-kart", `hk-kart--${g.anahtar}`, kilit > 0 && "hk-kart--kilitli", secili && "hk-kart--secili",
                                         (banliMi || oncekiBan) && "hk-kart--banli",
                                         hazirMi && "hk-kart--hazir", dokunuluyor && "hk-kart--dokunus", zipla.includes(x.k) && "hk-kart--zipla")}
                        disabled={!secilebilir || !!calisan}
                        aria-pressed={banFazi ? undefined : benSaldiran ? secili : hazirMi}
                        aria-busy={calisan === "kategori" || calisan === "ban" || undefined}
                        aria-label={[
                          x.ad, c(AIDIYET_ETIKET[g.anahtar]),
                          kilit > 0 ? c("{n} tur kilitli", { n: kilit }) : null,
                          banliMi ? c("Banlı") : oncekiBan ? c("Önceki banın") : null,
                          c("Sen {b} · Rakip {r}", { b: oranMetni(x.bo, c), r: oranMetni(x.ro, c) }),
                          c(OK_ETIKET[x.ok]),
                          hazirMi ? c("Hazır") : null,
                        ].filter(Boolean).join(" · ")}
                        onClick={() => onKart(x.k)}>
                  <KategoriIkon anahtar={x.k} boyut={24} plaka className="hk-kart-ikon" />
                  <span className="hk-kart-ust">
                    <span className="hk-kart-ad">{x.ad}</span>
                    <b className={`hk-ok hk-ok--${x.ok}`} aria-hidden="true">{OK_SIMGE[x.ok]}</b>
                  </span>
                  <span className="hk-kart-alt">
                    {kilit > 0
                      ? <span className="hk-kart-kilit"><QtIkon ad="kilit" boyut={11} /> {c("{n} tur kilitli", { n: kilit })}</span>
                      : oncekiBan
                        ? <span className="hk-kart-kilit"><QtIkon ad="kilit" boyut={11} /> {c("Önceki banın")}</span>
                        : c("Sen {b} · Rakip {r}", { b: oranMetni(x.bo, c), r: oranMetni(x.ro, c) })}
                  </span>
                  {banliMi && <span className="hk-kart-ban">{c("Banlı")}</span>}
                  {hazirMi && <span className="hk-kart-hazir">{c("Hazır")}</span>}
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- alt çubuk
/**
 * Kategori fazı alt çubuğu (akışta, ekranın en altında — position:fixed YOK).
 * Saldıran: seçim özeti + eylem düğmesi. Savunan: hazırlık ipucu.
 */
export function V2SecimCubugu({ d, hk, benSaldiran, secim, hazir, calisan, c, onOnayla, onHazirKaldir }) {
  if (!benSaldiran) {
    return (
      <div className="hk-cubuk hk-cubuk--savunan" role="group" aria-label={c("Hazırlık")}>
        <div className="hk-cubuk-yazi">
          {hazir ? <b>{c("Hazır: {kat}", { kat: c(kategoriAdi(hazir)) })}</b> : <b>{c("Sıradaki hamlen için bir kart işaretle")}</b>}
          <span>{hazir ? c("Sıra sana gelince bu kart seçili gelir.") : c("Sıra sana gelince seçili gelir; değiştirebilirsin.")}</span>
        </div>
        {hazir && <QtDugme tur="ikincil" boyut="k" onClick={onHazirKaldir}>{c("Kaldır")}</QtDugme>}
      </div>
    );
  }
  let ozet = null;
  let kazanir = false;
  let eylem = null;
  if (secim) {
    eylem = eylemOf(hk, secim);
    const a = hk.benY;
    const r = hk.rakipY;
    if (eylem === "elinden_al") { ozet = c("tutarsa Sen {a}→{b}, Rakip {r}→{s}", { a, b: a + 1, r, s: Math.max(0, r - 1) }); kazanir = a + 1 >= hk.esik; }
    else if (eylem === "al") { ozet = c("tutarsa Sen {a}→{b}", { a, b: a + 1 }); kazanir = a + 1 >= hk.esik; }
    else ozet = c("tutarsa {n} tur kilitli", { n: hk.kiltTur });
  }
  return (
    <div className={sinif("hk-cubuk", secim && "hk-cubuk--secili", kazanir && "hk-cubuk--kazan")} role="group" aria-label={c("Seçim")}>
      <div className="hk-cubuk-yazi" aria-live="polite">
        {secim ? (
          <>
            <b>{c(kategoriAdi(secim))}{kazanir && <em className="hk-kazan"> {c("Kazanırsın!")}</em>}</b>
            <span>{ozet}</span>
          </>
        ) : (
          <b>{c("Bir kategori seç")}</b>
        )}
      </div>
      <QtDugme boyut="k" className="hk-cubuk-dugme" devreDisi={!secim || (!!calisan && calisan !== "kategori")}
               yukleniyor={calisan === "kategori"} onClick={() => secim && onOnayla(secim)}>
        {secim ? eylemEtiketi(eylem, c) : c("Seç")}
      </QtDugme>
    </div>
  );
}

/** 853 · Ban fazı alt çubuğu (kategori fazı çubuğuyla aynı yerde; akışta, position:fixed YOK). */
export function V2BanCubugu({ benSaldiran, c }) {
  return (
    <div className="hk-cubuk hk-cubuk--savunan hk-cubuk--ban" role="group" aria-label={c("Ban seçimi")}>
      <div className="hk-cubuk-yazi" aria-live="polite">
        {benSaldiran ? (
          <>
            <b>{c("Rakip ban seçiyor…")}</b>
            <span>{c("Ardından kategorini seçeceksin.")}</span>
          </>
        ) : (
          <>
            <b>{c("Banlamak için bir karta dokun")}</b>
            <span>{c("Süre dolarsa ban yapılmaz.")}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- maç sonu
/** Son tahta: iki tarafın yuvaları (ikonlarla), maç sonu özetinde. */
export function HkSonTahta({ d, ben, rakip, c }) {
  const hk = hkModel(d, ben, rakip);
  if (!hk.acik) return null;
  return (
    <section className="hk-son" aria-label={c("Son tahta")}>
      <h3 className="qt-baslik-3">{c("Son tahta")}</h3>
      <HkYuvalar d={{ ...d, uzatma: false }} hk={hk} c={c} />
    </section>
  );
}

/** Maç sonu satırının hamle sonucu (puan yerine). */
export function hkGecmisSonucu(g, benId, c) {
  if (g.uzatma) {
    return g.altin_kazanan
      ? { metin: g.altin_kazanan === benId ? c("Altın Soru'yu sen bildin") : c("Altın Soru'yu rakip bildi"), iyi: g.altin_kazanan === benId, kotu: g.altin_kazanan !== benId }
      : { metin: c("Eşitlik sürdü"), iyi: false, kotu: false };
  }
  const x = g.hakimiyet;
  if (!x) return { metin: c("Tutmadı"), iyi: false, kotu: false };
  const benSaldiran = g.saldiran === benId;
  if (x.neden === "kontra") return benSaldiran
    ? { metin: c("Kontra: rakip aldı"), iyi: false, kotu: true }
    : { metin: c("Kontra: aldın"), iyi: true, kotu: false };
  if (!x.tuttu) return { metin: c("Tutmadı"), iyi: false, kotu: false };
  if (benSaldiran) return { metin: x.eylem === "pekistir" ? c("Pekiştirdin") : x.eylem === "elinden_al" ? c("Elinden aldın") : c("Aldın"), iyi: true, kotu: false };
  return { metin: x.eylem === "pekistir" ? c("Rakip pekiştirdi") : x.eylem === "elinden_al" ? c("Rakip elinden aldı") : c("Rakip aldı"), iyi: false, kotu: x.eylem !== "pekistir" };
}
