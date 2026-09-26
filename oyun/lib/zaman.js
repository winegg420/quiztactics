// Günlük turnuvalar. Saatler SABİT ve TÜRKİYE saatine göre (oyuncunun
// yerel saatine göre DEĞİL): yerel saate göre olsaydı zaten ince olan
// oyuncu havuzu saat dilimlerine bölünür, turnuvalar boş kalırdı.
//
// ESKİ sabah/akşam ayarları (turnuva_saat_sabah/aksam) yalnız eski satırların
// anını çözmek için; saat listesi aşağıda (turnuva_saatleri).
// Türkiye yıl boyu UTC+3 (aşağıdaki değerler UTC).
import { aktifDil } from "./dil.js";

const VARSAYILAN = { sabah: [10, 0], aksam: [18, 50] };   // UTC
let saatler = VARSAYILAN;

// ---- GÜNLÜK TURNUVA LİSTESİ (Paket 12, madde 7; 23 Eyl 2026: günde 5) ----
// Tek kaynak artık oyun_ayarlari.turnuva_saatleri: TSİ "HH:MM" dizisi,
// "24:00" o günün gece yarısı. Yukarıdaki sabah/akşam değerleri eski
// çağrılar kırılmasın diye duruyor; sıradaki turnuva hesabı listeden.
const VARSAYILAN_LISTE = ["10:00", "14:00", "18:00", "20:00", "24:00"];
let turnuvaListesi = VARSAYILAN_LISTE;
const TSI_MS = 3 * 3600 * 1000;   // Türkiye yıl boyu UTC+3
const GUN_MS = 24 * 3600 * 1000;

/** "14:30" → 870 (dakika); geçersizse null. "24:00" geçerli, "24:10" değil. */
function dakikaCoz(metin) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(metin ?? "").trim());
  if (!m) return null;
  const s = Number(m[1]), d = Number(m[2]);
  if (s > 24 || d > 59 || (s === 24 && d > 0)) return null;
  return s * 60 + d;
}

/** Sunucudaki listeyi (oyun_ayarlari.turnuva_saatleri) saklar; bozuksa varsayılan kalır. */
export function turnuvaListesiniAyarla(dizi) {
  try {
    const temiz = [...new Set((Array.isArray(dizi) ? dizi : []).map(String))]
      .filter((x) => dakikaCoz(x) !== null)
      .sort((a, b) => dakikaCoz(a) - dakikaCoz(b));
    if (temiz.length) {
      turnuvaListesi = temiz;
      saatAyariDegisti();
    }
  } catch {
    /* varsayılan liste kalır */
  }
}

// ---- YEREL SAAT GÖSTERİMİ (26 Eyl 2026) ----
// Turnuva anı hâlâ TSİ'de sabittir; yalnız GÖSTERİM oyuncunun cihaz saat
// dilimine çevrilir. Türkiye oyuncusu (arayüz dili TR ya da profil ülkesi TR)
// eskisi gibi yalnız TSİ görür; başkası kendi saatini + "(TSİ …)" görür.
// Turnuva saatlerinin listelendiği her yer BURADAKİ iki fonksiyonu kullanır.
let oyuncuUlkesi = null;

function saatAyariDegisti() {
  try {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("qt-saat-ayar"));
  } catch {
    /* DOM yok */
  }
}

/** Oyuncunun profildeki ülke kodu (Layout profil yüklenince çağırır). */
export function oyuncuUlkesiniAyarla(kod) {
  const k = kod ? String(kod).toUpperCase() : null;
  if (k === oyuncuUlkesi) return;
  oyuncuUlkesi = k;
  saatAyariDegisti();
}

/** Saatler oyuncunun yerel saatine çevrilip gösterilsin mi? (TR oyuncuda hayır.) */
export function yerelSaatGoster() {
  if (aktifDil() === "tr" || oyuncuUlkesi === "TR") return false;
  try {
    return new Date().getTimezoneOffset() !== -180;   // cihaz zaten TSİ'deyse çevirecek bir şey yok
  } catch {
    return false;
  }
}

/** Bir turnuva seansının ("20:00" TSİ) bugünkü anını cihazın saat dilimine göre biçimler. */
function yerelSaatMetni(saat) {
  try {
    const dk = dakikaCoz(saat);
    if (dk === null) return null;
    const an = new Date(tsiGunBasi(Date.now()) + dk * 60000);
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(an);
  } catch {
    return null;   // Intl yoksa TSİ gösterilir
  }
}

/** Tek seans: TR → "20:00"; yabancı → "1:00 PM (TSİ 20:00)". */
export function turnuvaSaatiGoster(saat) {
  const yerel = yerelSaatGoster() ? yerelSaatMetni(saat) : null;
  return yerel ? `${yerel} (TSİ ${saat})` : saat;
}

/** Seans listesi: TR → "10:00, 14:00"; yabancı → "3:00 AM, 7:00 AM (TSİ 10:00, 14:00)". */
export function turnuvaSaatleriniGoster(saatler, ayrac = ", ") {
  const yerel = yerelSaatGoster() ? saatler.map(yerelSaatMetni) : [];
  if (!yerel.length || yerel.some((x) => !x)) return saatler.join(ayrac);
  return `${yerel.join(ayrac)} (TSİ ${saatler.join(ayrac)})`;
}

/** Günün turnuva saatleri (TSİ metin, sıralı). */
export function turnuvaSaatleri() {
  return [...turnuvaListesi];
}

/** Verilen anın TÜRKİYE tarihine göre gün başlangıcı (UTC ms). */
function tsiGunBasi(ms) {
  const t = new Date(ms + TSI_MS);
  return Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()) - TSI_MS;
}

function gununTurnuvalari(gunBasiMs) {
  return turnuvaListesi.map((saat) => ({ saat, an: new Date(gunBasiMs + dakikaCoz(saat) * 60000) }));
}

/** Sıradaki turnuva: { saat: "20:00", an: Date }. */
export function sonrakiTurnuva(simdi = new Date()) {
  const ms = simdi.getTime();
  const bugun = tsiGunBasi(ms);
  // Dünün "24:00"ı bugünün 00:00'ıdır; o yüzden dünden başlanır.
  for (const gun of [bugun - GUN_MS, bugun, bugun + GUN_MS]) {
    for (const t of gununTurnuvalari(gun)) if (t.an.getTime() > ms) return t;
  }
  return gununTurnuvalari(bugun + GUN_MS)[0];
}

/** Sıradaki turnuvanın TSİ saati ("22:00"). */
export function sonrakiTurnuvaSaati() {
  return sonrakiTurnuva().saat;
}

/**
 * Turnuva satırının başlangıç anı (UTC ms): `tarih` TSİ günü ("2026-09-14")
 * + `seans` ("20:00"; geçiş öncesi satırlarda "sabah"/"aksam").
 */
export function turnuvaAniMs(tarih, seans) {
  const [yil, ay, gun] = String(tarih ?? "").slice(0, 10).split("-").map(Number);
  if (!yil || !ay || !gun) return Infinity;
  let dk = dakikaCoz(seans);
  if (dk === null) {
    const eski = saatler[seans];
    if (!eski) return Infinity;
    dk = ((eski[0] + 3) % 24) * 60 + eski[1];
  }
  return Date.UTC(yil, ay - 1, gun) - TSI_MS + dk * 60000;
}

/**
 * Açık lobilerden EN ERKEN başlayacak olanı. Günde birden çok turnuvada aynı gün
 * iki lobi bulunabilir (ör. saat listesi değişince eski + yeni lobi); "ilk
 * bulunan lobi" yanlış lobinin oyuncu sayısını gösteriyordu.
 */
export function siradakiLobi(liste) {
  return (liste ?? [])
    .filter((t) => t?.durum === "lobi")
    .sort((p, q) => turnuvaAniMs(p.tarih, p.seans) - turnuvaAniMs(q.tarih, q.seans))[0] ?? null;
}

/** Bugün (TSİ) henüz başlamamış turnuvaların saatleri. */
export function bugunKalanTurnuvalar(simdi = new Date()) {
  const ms = simdi.getTime();
  return gununTurnuvalari(tsiGunBasi(ms)).filter((t) => t.an.getTime() > ms).map((t) => t.saat);
}

/** ESKİ sabah/akşam ayarlarındaki "HH:MM" (TSİ) değerlerini UTC'ye çevirip saklar. */
export function turnuvaSaatleriniAyarla(sabahTsi, aksamTsi) {
  const cevir = (metin, yedek) => {
    try {
      const [s, d] = String(metin).split(":").map(Number);
      if (!Number.isFinite(s) || !Number.isFinite(d)) return yedek;
      const utcSaat = (s - 3 + 24) % 24;   // TSİ = UTC+3
      return [utcSaat, d];
    } catch {
      return yedek;
    }
  };
  saatler = {
    sabah: cevir(sabahTsi, VARSAYILAN.sabah),
    aksam: cevir(aksamTsi, VARSAYILAN.aksam),
  };
}

/** Gösterim için TSİ metni ("14:00"). */
export function turnuvaSaatMetni(seans) {
  const [s, d] = saatler[seans] ?? VARSAYILAN[seans];
  const tsi = (s + 3) % 24;
  return `${String(tsi).padStart(2, "0")}:${String(d).padStart(2, "0")}`;
}

// ESKİDEN: yalnız sabah/akşam arasında seçim yapıyordu. Artık günün
// listesinden (Paket 12, madde 7); geri sayımların hepsi buradan beslenir.
export function sonrakiTurnuvaZamani() {
  return sonrakiTurnuva().an;
}

// Sıradaki turnuva sabah mı akşam mı?
export function sonrakiTurnuvaSeans() {
  const z = sonrakiTurnuvaZamani();
  return z.getUTCHours() === saatler.sabah[0] && z.getUTCMinutes() === saatler.sabah[1]
    ? "sabah"
    : "aksam";
}

export function geriSayim(hedef) {
  const fark = Math.max(0, hedef.getTime() - Date.now());
  const sn = Math.floor(fark / 1000);
  return {
    saat: Math.floor(sn / 3600),
    dakika: Math.floor((sn % 3600) / 60),
    saniye: sn % 60,
    toplamSn: sn,
  };
}

// Sunucu-istemci saat farkı (ms). Soru verisi geldiği anda BİR KEZ hesaplanmalı;
// her tikte sabit sunucu_zamani ile yeniden hesaplanırsa Date.now() sadeleşir
// ve kalan süre donar.
export function sunucuOffsetMs(sunucuZamaniIso, istemciOrnekMs = Date.now()) {
  return sunucuZamaniIso
    ? new Date(sunucuZamaniIso).getTime() - istemciOrnekMs
    : 0;
}

// Sunucu zamanına göre kalan soru süresi (saniye). enCokSn: gösterilecek en büyük değer.
// 326: sunucu sonraki soruyu gösterim payı kadar ileri kurar; çağıran tavanı "tam süre
// + sonradan eklenen süre (Ek Süre)" verir — sayaç 15'te bekler, sonra gerçek zamanla
// akar, asla hızlanmaz (bkz. gosterimTavani).
export function kalanSure(baslangicIso, offsetMs = 0, sureSn = 15, enCokSn = Infinity) {
  const baslangic = new Date(baslangicIso).getTime();
  const sunucuSimdi = Date.now() + offsetMs;
  return Math.min(enCokSn, Math.max(0, sureSn - (sunucuSimdi - baslangic) / 1000));
}

// Sayaç tavanı: sorunun İLK görülen başlangıcına göre tam süre; Ek Süre başlangıcı ileri
// kaydırınca tavan da o kadar büyür. ilkBaslangicIso aynı soru için ilk gelen değerdir.
export function gosterimTavani(baslangicIso, ilkBaslangicIso, sureSn = 15) {
  const ek = (new Date(baslangicIso).getTime() - new Date(ilkBaslangicIso ?? baslangicIso).getTime()) / 1000;
  return sureSn + Math.max(0, ek);
}

// ---- İlk rakam kesri (Düello fazı / soru kartı sayacı) ----
// Faz ekrana geç görünürse (ilk görünüşte k0 sn kalmış, k0 = n + kesir) ilk rakam yalnız `kesir` sn görünürdü
// ("hızlı" ilk adım). Çözüm: gösterilen sayaç = kalan − kayma; kayma ilk görünüşte kesire eşitlenir ama HEP SABİT
// kalırsa gösterilen 0 gerçek bitişten `kesir` sn önce çıkar. Bu yüzden kayma kalanla orantılı erir:
//     gösterilen = kalan − kayma · min(1, kalan / k0)
// Kalan k0'ın altındayken gösterilen, gerçekten daha YAVAŞ akar (hız 1 − kayma/k0 < 1): rakam süreleri hiçbir
// yerde 1 sn'den kısa olmaz (hızlanma yok), ilk rakam tam saniye kalır, ve kalan 0'a indiği ANDA gösterilen de 0'dır
// (erken sıfır yok). Kalan k0'ı aşarsa (Ek Süre) kayma tam değerinde kalır: "+N" tam N artar.
// En kötü yavaşlama: k0 ≥ 1 + kesir şartıyla kayma/k0 ≤ 0,47 (son rakam en çok ~1,9 sn görünür); tipik geç
// görünüşte (k0 ≈ 13, kesir ≈ 0,5) yalnız %4 — rakamlar 1,04 sn. k0 < 1 ise kayma hiç uygulanmaz.
export function sayacKaymasi(k0) {
  const kesir = k0 - Math.floor(k0);
  return { k0, kayma: k0 >= 1 && kesir > 0.0002 && kesir < 0.9 ? kesir : 0 };
}
export function sayacGoster(kalan, { kayma, k0 }) {
  if (!(kalan > 0)) return 0;
  if (!(kayma > 0)) return kalan;
  return kalan - kayma * Math.min(1, kalan / k0);
}
/** Gösterilen rakamın değişmesine (ya da gerçek bitişe) kalan ms — zamanlayıcı için. */
export function sayacSinirMs(kalan, { kayma, k0 }) {
  if (!(kalan > 0)) return 0;
  const g = sayacGoster(kalan, { kayma, k0 });
  const n = Math.max(0, Math.ceil(g) - 1);          // rakam ceil(g) → n'e inince değişir
  let kalanN = n;
  if (kayma > 0) kalanN = n < k0 - kayma ? n / (1 - kayma / k0) : n + kayma;
  return Math.max(1, Math.round((kalan - kalanN) * 1000));
}
