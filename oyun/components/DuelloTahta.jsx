// ============================================================
// DÜELLO — HÂKİMİYET TAHTASI (680, Alt Ajan B)
//
// Kurallar SUNUCUDA (duello_durum → hakimiyet). Bu dosya yalnız çizer; hiçbir kural hesaplanmaz,
// yalnız "tutarsa şu olur" önizlemesi (sunucunun verdiği sayılardan bir artı/eksi) gösterilir.
//   · HkYuvalar     — solda senin, sağda rakibin yuvaları; alınan kategorinin ikonu yuvaya oturur.
//   · hkMesaj       — 2 satırlık sabit mesaj (kural / eşik−1 uyarısı / tur sonucu ve nedeni).
//   · V2Kategori    — kartlar, aidiyete göre 3 grup (rakibin · boş · senin).
//   · V2SecimCubugu — kategori fazında alt sabit çubuk: seçim özeti + eylem (Elinden al / Al / Pekiştir).
//   · 853 savunma banı — ban fazında aynı kartlar: savunan tek dokunuşla banlar (kendi önceki banı kilitli),
//     saldıran bekler; kategori fazında banlı kart gri + "Banlı" damgası. V2BanCubugu: ban fazı alt çubuğu.
//     Ban fazının "an"ları (durum satırı, giriş damgası, açıklama, geçiş) DuelloBanAni.jsx + duello-ban.css.
//   · HkSonTahta    — maç sonu özeti: iki tarafın yuvaları.
// Renkler --hk-* (duello-tahta.css). Metinlerin İngilizcesi ceviri/hakimiyet-ekran.js.
// iOS: bu dosyada position:fixed yok (alt çubuk akışta, sayfanın en altında).
// ============================================================
import { useRef } from "react";
import KategoriIkon from "./KategoriIkon.jsx";
import { kategoriAdi } from "../lib/kategoriler.js";
import { QtDugme, QtIkon, sinif } from "../tasarim/index.js";
import { aktifDil } from "../lib/dil.js";
import { animasyonuYenidenOynat } from "../tasarim/hareket.js";

// Türkçe belirtme hâli (Rakip Sanat'ı aldı). Anahtar = çeviri anahtarı; İngilizcesi düz ad.
const BELIRTME = {
  bilim: "Bilim'i", tarih: "Tarih'i", cografya: "Coğrafya'yı", edebiyat: "Edebiyat'ı", spor: "Spor'u",
  sanat: "Sanat'ı", sinema: "Sinema'yı", muzik: "Müzik'i", teknoloji: "Teknoloji'yi", genel_kultur: "Genel Kültür'ü",
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
  const esik = Number(h.esik) > 0 ? Number(h.esik) : 5;   // 870: eşik 5 (maç kendi eşiğini taşır; bu yalnız yedek)
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
 * Soru ekranı (cevap fazı): sorulan kategorinin BENİM için durumu — renkli çerçeve + en çok 4 kelimelik etiket.
 * Yalnız sunum; kural sunucuda (duello2_cozumle, 680/870). Renk rolü:
 *   tehlike (kırmızı) — savunan: rakip SENİN kategorine saldırıyor (sen yanlış + rakip doğru → kaybedersin)
 *   firsat  (mavi)    — saldıran: rakibin / boş / kendi kategorin (pekiştir); savunan: boş kategori
 *                       (rakip yanlış + sen doğru → senin olur)
 *   notr    (gri)     — savunan: rakip kendi kategorisini pekiştiriyor (kategori el değiştirmez; yuva sayısı aynı)
 * Aynı çerçeve iki yerde çizilir: soru kartındaki kategori rozeti ve (kategori bir yuvadaysa) o yuva.
 * Altın Soru'da ve eski puan maçında durum yoktur (null). Uzun sonuç cümleleri burada DEĞİL: tanıtım + ipucu.
 */
export function hkKategoriDurumu(d, hk, benSaldiran) {
  if (!hk?.acik || d?.faz !== "cevap" || !d.kategori || d.uzatma) return null;
  const a = aidiyet(hk, d.kategori);
  if (benSaldiran) {
    if (a === "rakip") return { ton: "firsat", etiket: "Rakibin kategorisi", ikon: "kilic" };
    if (a === "bos") return { ton: "firsat", etiket: "Boş kategori · fırsat", ikon: "kilic" };
    return { ton: "firsat", etiket: "Pekiştir", ikon: "kilit" };
  }
  if (a === "ben") return { ton: "tehlike", etiket: "Kategorin tehlikede", ikon: "uyari" };
  if (a === "bos") return { ton: "firsat", etiket: "Boş kategori · fırsat", ikon: "hedef" };
  return { ton: "notr", etiket: "Rakip pekiştiriyor", ikon: "kilit" };
}
/**
 * Çerçeve renklerinin ANLAMI (uzun sonuç cümleleri) soru ekranında yazılmaz: ilk 3 Düello'da, savunan rakibin seçimini
 * beklerken alt çubukta tek seferlik ipucu olarak gösterilir — maç başına en çok 3 ipucu (her savunma beklemesinde
 * sıradaki), cihazda saklanır. Metinler sunucu kuralının aynası (duello2_cozumle): boşta saldıran yanlış + savunan
 * doğru → savunan alır; rakibin kategorisinde saldıran doğru + savunan yanlış → el değiştirir (Kalkan durdurur);
 * pekiştirmede savunan doğruysa kilit olmaz, sahiplik hiç değişmez.
 */
export const DURUM_IPUCLARI = [
  { ton: "firsat", ikon: "hedef", metin: "Mavi çerçeve = fırsat. Boş kategoride rakip yanlış yapar ve sen bilirsen kategori senin olur." },
  { ton: "tehlike", ikon: "uyari", metin: "Kırmızı çerçeve = kategorin tehlikede. Yanlış bilirsen ve rakip bilirse kaybedersin; Kalkan durdurur." },
  { ton: "notr", ikon: "kilit", metin: "Gri çerçeve = rakip pekiştiriyor. Kategori el değiştirmez; doğru bilirsen kilitlenmesini önlersin." },
];
const DURUM_IPUCU_ANAHTARI = "qt_duello_durum_ipucu";
const DURUM_IPUCU_MAC_SAYISI = 3;
/** Bu savunma beklemesinde gösterilecek ipucunun sırası (0–2) ya da null. Kayıt okunamazsa ipucu gösterilmez. */
export function durumIpucuSirasi(macId, tur) {
  try {
    const ham = JSON.parse(window.localStorage.getItem(DURUM_IPUCU_ANAHTARI) || "[]");
    const liste = Array.isArray(ham) ? ham.filter((x) => x && Array.isArray(x.t)) : [];
    let bu = liste.find((x) => x.m === macId);
    if (bu) {
      const i = bu.t.indexOf(tur);
      if (i >= 0) return i;
      if (bu.t.length >= DURUM_IPUCLARI.length) return null;
    } else {
      if (liste.length >= DURUM_IPUCU_MAC_SAYISI) return null;
      bu = { m: macId, t: [] };
      liste.push(bu);
    }
    bu.t.push(tur);
    window.localStorage.setItem(DURUM_IPUCU_ANAHTARI, JSON.stringify(liste));
    return bu.t.length - 1;
  } catch {
    return null;
  }
}
// Durum tonu → mesaj satırı tonu (aynı renk rolü: kırmızı = rakip/tehlike, mavi = ben/fırsat, gri = nötr).
const DURUM_MESAJ_TONU = { tehlike: "rakip", firsat: "ben", notr: "notr" };

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
function YuvaTarafi({ taraf, hk, liste, ad, sayi, c, durum = null, durumKategori = null }) {
  const kritik = sayi === hk.esik - 1;
  return (
    <div className={sinif("hk-taraf", `hk-taraf--${taraf}`, kritik && "hk-taraf--kritik")}>
      <div className={sinif("hk-yuvalar", hk.esik >= 5 && "hk-yuvalar--cok")} style={{ "--hk-n": hk.esik }}>
        {Array.from({ length: hk.esik }, (_, i) => {
          const k = liste[i];
          if (!k) {
            const son = kritik && i === hk.esik - 1;
            return <span key={`b${i}`} className={sinif("hk-yuva", son && "hk-yuva--son")} aria-hidden="true" />;
          }
          const kilit = Number(hk.kilitler[k] ?? 0);
          // Sorulan kategori bu yuvadaysa: soru kartındaki rozetle AYNI renkli çerçeve + hafif nabız.
          const soruluyor = durum && durumKategori === k;
          return (
            <span key={k} className={sinif("hk-yuva hk-yuva--dolu", kilit > 0 && "hk-yuva--kilit",
                                           soruluyor && "hk-yuva--durum", soruluyor && `hk-durum--${durum.ton}`)} data-kategori={k}
                  role="img" aria-label={[c(kategoriAdi(k)), kilit > 0 ? c("{n} tur kilitli", { n: kilit }) : null,
                                           soruluyor ? c(durum.etiket) : null].filter(Boolean).join(", ")}>
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
export function HkYuvalar({ d, hk, c, kucuk = false, durum = null }) {
  const sira = useYuvaSirasi(hk, d?.kategoriler);
  const durumKategori = durum ? d?.kategori ?? null : null;
  return (
    <section className={sinif("hk-tahta", kucuk && "hk-tahta--kucuk", d?.uzatma && "hk-tahta--altin",
                              durum && "hk-tahta--durum", durum && `hk-durum--${durum.ton}`)} aria-label={c("Yuva durumu")}>
      <YuvaTarafi taraf="ben" hk={hk} liste={sira.ben} ad={c("Sen")} sayi={hk.benY} c={c} durum={durum} durumKategori={durumKategori} />
      <span className="hk-vs" aria-hidden="true">VS</span>
      <YuvaTarafi taraf="rakip" hk={hk} liste={sira.rakip} ad={c("Rakip")} sayi={hk.rakipY} c={c} durum={durum} durumKategori={durumKategori} />
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
    // 870: boş kategoride ikisi de doğru → saldıran alır (neden her zaman yazılır).
    if (x.neden === "bos_ikisi_dogru") {
      const l2 = c("İkiniz de bildiniz: boşta saldıran alır");
      return benSaldiran
        ? { l1: c("{kat} artık senin!", { kat: ad }), l2, ton: "ben" }
        : { l1: c("Rakip {kat} aldı", { kat: bel }), l2, ton: "rakip" };
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
 * Mesaj satırının iki satırı. Varsayılan: kural hatırlatması; eşik−1 uyarısı; savunanda "hazırla";
 * cevap fazında kim saldırıyor + kategorinin kimin olduğu (anlamı: hkKategoriDurumu çerçevesi); sonuç fazında tur sonucu bandı.
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
    // Soru ekranında uzun sonuç cümlesi YOK (Ida, 2 Eki 2026): kim saldırıyor + kategorinin kimin olduğu; anlamı
    // renkli çerçeve ve kısa etiket söyler (hkKategoriDurumu). Satırın rengi çerçeveyle aynı role uyar.
    const kat = c(kategoriAdi(d.kategori));
    const durum = hkKategoriDurumu(d, hk, benSaldiran);
    return {
      l1: benSaldiran ? c("Sen saldırıyorsun") : c("Rakip saldırıyor"),
      l2: `${kat} · ${c(AIDIYET_ETIKET[aidiyet(hk, d.kategori)])}`,
      ton: durum ? DURUM_MESAJ_TONU[durum.ton] : ton,
    };
  }
  if (d.faz === "ban") {
    return benSaldiran
      ? { l1: c("Rakip ban seçiyor…"), l2: c("Banladığı kategoriyi bu turda seçemezsin"), ton }
      : { l1: c("Bir kategori banla"), l2: c("Rakip bu turda o kategoriyi seçemez"), ton };
  }
  if (d.faz === "kategori" && !benSaldiran) {
    // Ban sonucu tur boyunca yazılı kalır (süre dolduysa sonucu öğretir: rakip her kategoriden saldırabilir).
    const banL2 = d.ban?.kategori ? c("Banın: {kat} · rakip seçemez", { kat: c(kategoriAdi(d.ban.kategori)) })
      : d.ban?.acik && !d.uzatma ? c("Ban kullanılmadı · rakip serbest") : c("Kategorini bekle");
    return { l1: c("Rakip seçiyor…"), l2: banL2, ton };
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
  const ok = bo === null || ro === null ? null   // veri yok: ok çizilmez ("=" yanıltıcı olur)
    : fark >= hk.avantajEsik ? "yukari" : fark <= -hk.avantajEsik ? "asagi" : "esit";
  return { k, bo, ro, fark, ok, ad: c(kategoriAdi(k)) };
}
const OK_SIMGE = { yukari: "↑", esit: "=", asagi: "↓" };
const OK_ETIKET = { yukari: "sen önde", esit: "denk", asagi: "rakip önde" };
const AIDIYET_ETIKET = { ben: "senin kategorin", rakip: "rakibin kategorisi", bos: "boş kategori" };

/**
 * Kategori kartları (kategori fazı). Saldıran: dokununca seçer (onaylamak alt çubukta).
 * Savunan: kartlar yalnız bilgi (dokunulmaz); saldıranın dokunduğu kart canlı parlar.
 * 853 · ban fazı (d.faz === "ban"): savunan dokununca BANLAR (onKart → duello_ban_sec); banlanabilirler sunucudan
 * (d.ban.uygun), kendi önceki banı (d.ban.onceki) kilitli; saldıranın kartları pasif. Kategori fazında d.ban.kategori
 * gri + "Banlı" damgalı ve seçilemez (sunucu uygun_kategoriler'den zaten çıkarır).
 * Oyun hissi: banBasilan = savunanın dokunduğu kart (yanıt gelene dek dolu kırmızı); saldıran beklerken kartları
 * kırmızı hedef halkası dolaşır; damga = banlı kart açıklama biterken kilitlenir; saldıran banlı karta dokunursa
 * kart sarsılır ve onBanli çağrılır ("Rakip bunu banladı").
 */
export function V2Kategori({ d, hk, benSaldiran, ben, rakip, calisan, c, secim, dokunus, zipla = [], onKart,
                             banBasilan = null, damga = false, onBanli }) {
  const kategoriler = d.kategoriler ?? [];
  const banFazi = d.faz === "ban";
  const banli = banFazi ? secim ?? null : d.ban?.kategori ?? null;   // ban fazında secim = az önce banladığım kart
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
  // Kartların ekrandaki sırası (tarama halkası ve ban işareti bu sırayla dolaşır).
  const siraNo = new Map(gruplar.flatMap((g) => g.liste).map((x, i) => [x.k, i]));

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
              const secilebilir = uygun.has(x.k) && kilit <= 0 && !banliMi && (banFazi ? !benSaldiran && !oncekiBan && !secim : benSaldiran);
              const secili = !banFazi && benSaldiran && secim === x.k;
              const banAday = banFazi && secilebilir;
              const dokunuluyor = !benSaldiran && canli === x.k;
              const basildi = banFazi && banBasilan === x.k;
              const tarama = banFazi && benSaldiran && uygun.has(x.k) && kilit <= 0;
              // Saldıranın banlı kartı kapalı düğme DEĞİL: dokununca "Rakip bunu banladı" geri bildirimi verir (seçilemez).
              const banliDokunulur = !banFazi && benSaldiran && banliMi;
              return (
                <button key={x.k} type="button" data-kategori={x.k}
                        className={sinif("hk-kart", `hk-kart--${g.anahtar}`, kilit > 0 && "hk-kart--kilitli", secili && "hk-kart--secili",
                                         (banliMi || oncekiBan) && "hk-kart--banli", banAday && "hk-kart--ban-aday",
                                         basildi && "hk-kart--ban-basildi", tarama && "hk-kart--tarama",
                                         damga && banliMi && !banFazi && "hk-kart--damga",
                                         dokunuluyor && "hk-kart--dokunus", zipla.includes(x.k) && "hk-kart--zipla")}
                        style={{ "--i": siraNo.get(x.k) ?? 0, ...(damga && !benSaldiran ? { "--damga-gecikme": "750ms" } : null) }}
                        disabled={banliDokunulur ? false : !secilebilir || !!calisan}
                        aria-disabled={banliDokunulur || undefined}
                        aria-pressed={banFazi || !benSaldiran || banliDokunulur ? undefined : secili}
                        aria-busy={calisan === "kategori" || calisan === "ban" || undefined}
                        aria-label={[
                          x.ad, c(AIDIYET_ETIKET[g.anahtar]),
                          kilit > 0 ? c("{n} tur kilitli", { n: kilit }) : null,
                          banliMi ? (banFazi ? c("Banlı") : benSaldiran ? c("Rakip banladı") : c("Sen banladın"))
                            : oncekiBan ? c("Geçen tur banladın") : null,
                          c("Sen {b} · Rakip {r}", { b: oranMetni(x.bo, c), r: oranMetni(x.ro, c) }),
                          x.ok && c(OK_ETIKET[x.ok]),
                        ].filter(Boolean).join(" · ")}
                        onClick={(e) => {
                          if (!banliDokunulur) { onKart(x.k); return; }
                          animasyonuYenidenOynat(e.currentTarget, "qt-h-salla");
                          onBanli?.(x.k);
                        }}>
                  <KategoriIkon anahtar={x.k} boyut={24} plaka className="hk-kart-ikon" />
                  <span className="hk-kart-ust">
                    <span className="hk-kart-ad">{x.ad}</span>
                    {banliMi && !banFazi
                      ? <span className="hk-kart-banikon" aria-hidden="true"><QtIkon ad="ban" boyut={15} /></span>
                      : <b className={`hk-ok hk-ok--${x.ok || "yok"}`} aria-hidden="true">{x.ok ? OK_SIMGE[x.ok] : " "}</b>}
                  </span>
                  <span className="hk-kart-alt">
                    {kilit > 0
                      ? <span className="hk-kart-kilit"><QtIkon ad="kilit" boyut={11} /> {c("{n} tur kilitli", { n: kilit })}</span>
                      : oncekiBan
                        ? <span className="hk-kart-kilit"><QtIkon ad="kilit" boyut={11} /> {c("Geçen tur banladın")}</span>
                        : banliMi && !banFazi
                          ? <span className="hk-kart-kilit"><QtIkon ad="kilit" boyut={11} /> {benSaldiran ? c("Rakip banladı") : c("Sen banladın")}</span>
                          : c("Sen {b} · Rakip {r}", { b: oranMetni(x.bo, c), r: oranMetni(x.ro, c) })}
                  </span>
                  {banliMi && <span className="hk-kart-ban">{c("Banlı")}</span>}
                  {banAday && !basildi && <span className="hk-kart-banisaret" aria-hidden="true"><QtIkon ad="ban" boyut={12} /></span>}
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
 * Saldıran: seçim özeti + eylem düğmesi. Savunan: hazırlık ipucu; ilk Düello'larda (ipucu = DURUM_IPUCLARI sırası)
 * soru ekranındaki çerçeve renginin anlamı — aynı renkte küçük çerçeve örneğiyle.
 */
export function V2SecimCubugu({ d, hk, benSaldiran, secim, calisan, c, onOnayla, banUyari = false, ipucu = null }) {
  const durumIpucu = !benSaldiran && ipucu !== null ? DURUM_IPUCLARI[ipucu] : null;
  if (durumIpucu) {
    return (
      <div className={sinif("hk-cubuk hk-cubuk--savunan hk-cubuk--ipucu", `hk-durum--${durumIpucu.ton}`)} role="status">
        <span className="hk-ipucu-cerceve" aria-hidden="true"><QtIkon ad={durumIpucu.ikon} boyut={15} /></span>
        <div className="hk-cubuk-yazi"><span>{c(durumIpucu.metin)}</span></div>
      </div>
    );
  }
  if (!benSaldiran) {
    return (
      <div className="hk-cubuk hk-cubuk--savunan" role="status" aria-label={c("Rakip seçiyor…")}>
        <div className="hk-cubuk-yazi">
          <b>{c("Rakip seçiyor…")}</b>
          <span>{c("Kategorini bekle")}</span>
        </div>
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
    <div className={sinif("hk-cubuk", secim && "hk-cubuk--secili", kazanir && "hk-cubuk--kazan", banUyari && "hk-cubuk--banuyari")} role="group" aria-label={c("Seçim")}>
      <div className="hk-cubuk-yazi" aria-live="polite">
        {banUyari ? (
          <>
            <b>{c("Rakip bunu banladı")}</b>
            <span>{c("Başka bir kategori seç")}</span>
          </>
        ) : secim ? (
          <>
            <b>{c(kategoriAdi(secim))}{kazanir && <em className="hk-kazan"> {c("Kazanırsın!")}</em>}</b>
            <span>{ozet}</span>
          </>
        ) : (
          <>
            <b>{c("Bir kategori seç")}</b>
            {/* Ban sonucu tur boyunca yazılı kalır (rakip banlamadıysa da bilgi verilir). */}
            {d.ban?.kategori ? <span>{c("Rakip {kat} banladı", { kat: belirtme(d.ban.kategori, c) })}</span>
              : d.ban?.acik && !d.uzatma ? <span>{c("Rakip ban kullanmadı")}</span> : null}
          </>
        )}
      </div>
      <QtDugme boyut="k" className="hk-cubuk-dugme" devreDisi={!secim || (!!calisan && calisan !== "kategori")}
               yukleniyor={calisan === "kategori"} onClick={() => secim && onOnayla(secim)}>
        {secim ? eylemEtiketi(eylem, c) : c("Seç")}
      </QtDugme>
    </div>
  );
}

/**
 * 853 · Ban fazı alt çubuğu (kategori fazı çubuğuyla aynı yerde; akışta, position:fixed YOK).
 * Savunan: ne yapacağı + süre dolarsa ne olacağı; ipucu = ilk Düello'larda tek seferlik açıklama
 * (DuelloBanAni › banIpucuGoster). Üstteki eski kırmızı bant kalktı: durum satırı DuelloBanAni › BanKonsol.
 */
export function V2BanCubugu({ benSaldiran, c, ipucu = false }) {
  return (
    <div className={sinif("hk-cubuk hk-cubuk--savunan hk-cubuk--ban", !benSaldiran && (ipucu ? "hk-cubuk--ipucu" : "hk-cubuk--ban-sec"))}
         role="group" aria-label={c("Ban seçimi")}>
      {!benSaldiran && <span className="hk-cubuk-ikon" aria-hidden="true"><QtIkon ad={ipucu ? "ampul" : "ban"} boyut={22} /></span>}
      <div className="hk-cubuk-yazi" aria-live="polite">
        {benSaldiran ? (
          <>
            <b>{c("Rakip ban seçiyor…")}</b>
            <span>{c("Ardından kategorini seçeceksin.")}</span>
          </>
        ) : ipucu ? (
          <span>{c("Banladığın kategoriyi rakip bu tur seçemez. Süre dolarsa ban kullanılmaz.")}</span>
        ) : (
          <>
            <b>{c("Banlamak için bir karta dokun")}</b>
            <span>{c("Süre dolarsa ban kullanılmaz")}</span>
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
