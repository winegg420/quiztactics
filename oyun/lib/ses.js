// Quiz Tactics ses motoru — `public/ses/*.mp3|*.wav` dosyalarını çalar (Paket 29 E,
// Tasarım Adım 2 Faz 3).
//
// Dosyalar: Kenney Interface Sounds / UI Audio / Impact Sounds / Music Jingles, CC0
// (public/ses/LISANS.txt). Hangi an hangi fonksiyon: public/ses/OKU.md (Şerit M için).
// Ajan H (23 Eyl 2026): Ida'nın /ses-secim seçimleri (public/ses/adaylar/, Kenney CC0 + Pixabay)
// sunucudan okunur ve bugünkü dosyaların yerine çalar — aşağıdaki "/ses-secim seçimleri" bölümü.
// Format: mp3 (eski 10 dosya) + 16 bit PCM mono WAV 32 kHz (Faz 3 dosyaları). İkisi de
// iOS Safari dahil her tarayıcıda decodeAudioData ile çözülür; Ogg Vorbis BİLEREK yok.
// Kurallar:
//   * TEMBEL: açılışta hiçbir ses indirilmez; bir ses ilk kez istendiğinde
//     indirilir, decode edilip `tamponlar`da tutulur — bir daha indirilmez.
//   * ÖN YÜKLEME: `sesOnYukle(grup)` ekran açılırken çağrılır; baytları indirir,
//     kullanıcı sayfaya dokunmuşsa hemen decode eder (dokunmamışsa ilk dokunuşta).
//   * ÜST ÜSTE BİNME: aynı rol 40 ms'den sık çalmaz; bir rolün aynı anda en fazla
//     `ES_ZAMANLI` kopyası çalar, fazlası gelirse en eskisi kısılıp susturulur.
//   * Ses KAPALIYKEN hiçbir dosya indirilmez (tercih indirmeden önce bakılır).
//   * YEDEK: dosya indirilemez / decode edilemezse o rol için eski osilatör
//     tonu çalar (aşağıdaki `ton*` fonksiyonları — bilerek silinmedi).
//   * İlk istekte dosya ILK_CALMA_SINIRI_MS içinde hazır olmazsa o sefer atlanır
//     (ses kritik değil, geç gelen ses yanlış ana denk gelir).
//
// iOS/Android kuralı: AudioContext yalnız bir kullanıcı hareketinden sonra
// çalışır. Bu yüzden ilk dokunuş/tıklama/tuşta context açılır (sesKilidiAc).

const DEPO_ANAHTARI = "bildim_ses";

/** Rol başına hacim çarpanı (0–1). Elle ayar burada yapılır. */
const HACIM = {
  dokunus: 0.35,
  tik: 0.6,
  dogru: 0.8,
  yanlis: 0.75,
  sure_doldu: 0.8,
  joker: 0.8,
  rakip_bulundu: 0.85,
  can_kaybi: 0.9,
  kaybettin: 0.75,
  kazandin: 0.8,
  rutbe: 1.0,
  sis: 0.9,
  // Faz 3 (WAV'lar -1 dBFS tepeye normalize edildi; hacim burada dengelenir)
  soru_geldi: 0.7,
  tur_gecis: 0.6,
  sayim_tik: 0.6,
  sayim_son: 0.85,
  son_saniyeler: 0.65,
  skill_elli: 0.7,
  skill_ek_sure: 0.7,
  skill_soru_degistir: 0.65,
  skill_zaman_baskisi: 0.8,
  skill_sigorta: 0.75,
  skill_seri_koruma: 0.7,
  skill_2x: 0.6,
  skill_ikinci_sans: 0.6,
  coin: 0.55,
  level: 0.7,
  turnuva: 0.75,
};
// Rol → dosya (uzantı dahil). Listede olmayan rol `<rol>.mp3` çalar.
// Paket 32: Sis için yeni dosya indirilmedi, joker.mp3 yavaşlatılıp/hızlandırılıp kullanılıyor.
const DOSYA = {
  sis: "joker.mp3",
  kazandin: "kazandin.wav",            // Music Jingles › Steel 02
  kaybettin: "kaybettin.wav",          // Music Jingles › Pizzicato 07
  soru_geldi: "soru_geldi.wav",
  tur_gecis: "tur_gecis.wav",
  sayim_tik: "sayim_tik.wav",
  sayim_son: "sayim_son.wav",
  son_saniyeler: "son_saniyeler.wav",
  skill_elli: "skill_elli.wav",
  skill_ek_sure: "skill_ek_sure.wav",
  skill_soru_degistir: "skill_soru_degistir.wav",
  skill_zaman_baskisi: "skill_zaman_baskisi.wav",
  skill_sigorta: "skill_sigorta.wav",
  skill_seri_koruma: "skill_sigorta.wav", // aynı kalkan sesi, daha tiz çalınır
  skill_2x: "skill_2x.wav",
  skill_ikinci_sans: "skill_ikinci_sans.wav",
  coin: "coin.wav",
  level: "level.wav",
  turnuva: "turnuva.wav",
};
// ------------------------------------------------------------ /ses-secim seçimleri (Ajan H)
// Ida `/ses-secim`'de her "an" için bir aday seçer; seçim sunucuda (`ses_secimleri`) durur,
// `sesArkaPlan.js` açılışta sürümle doğrulayıp buraya yazar (yerel önbellek: SECIM_ANAHTARI).
// Aday id'si → dosya: `adaylar/<id>.wav` (Kenney, "-kN") · `.aac` (müzik) · `.mp3` (Pixabay, "-pN").
// "mevcut" ya da seçim yok → bugünkü dosya (DOSYA / <rol>.mp3); "sessiz" → çalmaz.
const SECIM_ANAHTARI = "bildim_ses_secim";
let secimler = {};
try { secimler = JSON.parse(localStorage.getItem(SECIM_ANAHTARI) || "{}").secimler || {}; } catch { /* özel mod */ }
/** Rol → /ses-secim anı (listede olmayan rol hep kendi dosyasını çalar). */
const AN = {
  dokunus: "dokunus", sayfa_gecis: "sayfa_gecis", rakip_bulundu: "rakip_bulundu", vs_ani: "vs_ani",
  soru_geldi: "soru_geldi", tik: "geri_sayim_tik", sayim_son: "son_3_saniye", sure_doldu: "sure_doldu",
  dogru: "dogru", yanlis: "yanlis", joker: "skill", can_kaybi: "can_kaybi", kategori_secildi: "kategori_secildi",
  tur_gecis: "tur_gecis", rakip_cevapladi: "rakip_cevapladi", kazandin: "galibiyet", kaybettin: "maglubiyet",
  beraberlik: "beraberlik", coin: "coin", satin_alma: "satin_alma", xp_dolma: "xp_dolma", level: "level",
  rozet: "rozet", rutbe: "lig_atlama", turnuva: "turnuva", bildirim: "bildirim", hata_uyari: "hata_uyari",
  // Ajan K (24 Eyl 2026): her skill'in kendi anı (an adı = rol). Seçim yoksa skill'e özel eski dosya çalar.
  skill_elli: "skill_elli", skill_ek_sure: "skill_ek_sure", skill_soru_degistir: "skill_soru_degistir",
  skill_zaman_baskisi: "skill_zaman_baskisi", skill_ikinci_sans: "skill_ikinci_sans", skill_sigorta: "skill_sigorta",
  skill_seri_koruma: "skill_sigorta", skill_2x: "skill_2x",
};
// Bugün dosyası OLMAYAN anlar: seçim yoksa sessiz.
for (const r of ["sayfa_gecis", "vs_ani", "kategori_secildi", "rakip_cevapladi", "beraberlik", "satin_alma", "xp_dolma", "rozet", "bildirim", "hata_uyari"]) DOSYA[r] = null;
/** Aday id'sinin dosya yolu (SES_KLASORU'ne göre). Kural adaylar.js › adayKur ile aynı. */
export const adayYolu = (id) => `adaylar/${id}.${/-k\d+$/.test(id) ? "wav" : id.startsWith("muzik_") ? "aac" : "mp3"}`;
/** Bir anın seçimi (aday id'si · "mevcut" · "sessiz" · undefined). */
export const sesSecimi = (an) => secimler[an];
/** Seçimleri değiştir (sesArkaPlan.js çağırır; önbelleğe o yazar). */
export function sesSecimleriniAyarla(yeni) { secimler = yeni || {}; }
const adayVar = (an) => { const s = secimler[an]; return Boolean(s) && s !== "mevcut" && s !== "sessiz"; };
/** Rolün çalacağı dosya; null → sessiz. */
function dosyaAdi(rol) {
  const s = AN[rol] ? secimler[AN[rol]] : undefined;
  if (s === "sessiz") return null;
  if (s && s !== "mevcut") return adayYolu(s);
  return rol in DOSYA ? DOSYA[rol] : `${rol}.mp3`;
}
// Seçilmiş aday dosyaları /ses-secim'de 0.8 ile dinlendi; oyunda da öyle (dokunuş kısık).
const HACIM_ADAY = { dokunus: 0.4, sayfa_gecis: 0.45, tik: 0.7 };
// Müzik kancası (sesArkaPlan.js kurar): "soru" → müzik kısılır, "cevap" → geri açılır.
let muzikKancasi = null;
export function sesMuzikKancasi(f) { muzikKancasi = f; }
const kanca = (olay) => { try { muzikKancasi?.(olay); } catch { /* müzik kritik değil */ } };
// Tanı (yalnız ?tani=1 oturumunda ya da test bayrağı sessionStorage.bd_ses_tani=1 iken — ikincisi
// tanı panelini açmaz): window.__sesKayit = [{rol, dosya, t}] — test için.
export const sesTaniAcik = () => {
  try { return sessionStorage.getItem("bd_ses_tani") === "1" || sessionStorage.getItem("bd_tani") === "1" || /[?&]tani=1/.test(location.search); } catch { return false; }
};
function taniKaydi(rol, dosya) {
  try {
    if (!sesTaniAcik()) return;
    (window.__sesKayit ||= []).push({ rol, dosya, t: Math.round(performance.now()) });
  } catch { /* tanı kritik değil */ }
}
/** Bir rolün aynı anda çalabilecek kopya sayısı (varsayılan 2). */
const ES_ZAMANLI = { kazandin: 1, kaybettin: 1, beraberlik: 1, vs_ani: 1, rozet: 1, level: 1, rutbe: 1, turnuva: 1, sure_doldu: 1, soru_geldi: 1, tur_gecis: 1 };
/** Ön yükleme grupları — `sesOnYukle("duello")` gibi. */
const GRUPLAR = {
  mac: ["dokunus", "tik", "sayim_son", "dogru", "yanlis", "sure_doldu", "soru_geldi", "tur_gecis", "son_saniyeler", "joker", "rakip_cevapladi"],
  skill: ["skill_elli", "skill_ek_sure", "skill_soru_degistir", "skill_zaman_baskisi", "skill_sigorta", "skill_2x", "skill_ikinci_sans"],
  sonuc: ["kazandin", "kaybettin", "beraberlik", "level", "rutbe", "coin", "xp_dolma", "rozet"],
  duello: ["sayim_tik", "sayim_son", "rakip_bulundu", "vs_ani", "can_kaybi", "kategori_secildi"],
  turnuva: ["turnuva"],
};
const ARKA_ARKAYA_MS = 40;         // aynı rol bu süreden sık tetiklenirse atlanır
const ILK_CALMA_SINIRI_MS = 250;   // ilk indirme bundan uzun sürerse o çalış atlanır
const SES_KLASORU = `${import.meta.env?.BASE_URL ?? "/"}ses/`;

let ctx = null;
let kilitAcildi = false;
const tamponlar = new Map();       // dosya → AudioBuffer
const yuklemeler = new Map();      // dosya → Promise<AudioBuffer> (aynı dosya iki kez istenmesin)
const indirmeler = new Map();      // dosya → Promise<ArrayBuffer> (ön yükleme; decode'dan önce)
const bozuk = new Set();           // indirilemeyen/decode edilemeyen dosyalar → hep yedek ton
const sonCalma = new Map();        // rol → performance.now()
const calanlar = new Map();        // rol → [{kaynak, kazanc}] (üst üste binme sınırı)

/** Ses açık mı? (kullanıcı tercihi; varsayılan açık) */
export function sesAcikMi() {
  try {
    return localStorage.getItem(DEPO_ANAHTARI) !== "0";
  } catch {
    return true; // özel mod: tercih okunamıyorsa sesi kapatma
  }
}

/** Ses tercihini yaz. */
export function sesAyarla(acik) {
  try {
    localStorage.setItem(DEPO_ANAHTARI, acik ? "1" : "0");
  } catch {
    /* özel mod — tercih saklanamaz, oturum boyunca varsayılan geçerli */
  }
  // Paket 41 B/C: maç şeridi, avatar menüsü ve Profil › Ayarlar aynı anda eşitlensin
  try { window.dispatchEvent(new CustomEvent("bildim-ses", { detail: Boolean(acik) })); } catch { /* eski tarayıcı */ }
}

/** Ses tercihi değişince haber verir (aynı sekme). Aboneliği bırakan fonksiyon döner. */
export function sesDinle(cb) {
  const f = (e) => cb(Boolean(e.detail));
  window.addEventListener("bildim-ses", f);
  return () => window.removeEventListener("bildim-ses", f);
}

function context() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch {
    return null; // ses donanımı yok / tarayıcı engelledi
  }
}

/**
 * İlk kullanıcı hareketinde AudioContext'i açar. Uygulama girişinde bir kez
 * çağrılır; dinleyiciler ilk olaydan sonra kendini söker.
 */
export function sesKilidiAc() {
  if (kilitAcildi || typeof window === "undefined") return;
  kilitAcildi = true;
  const ac = () => {
    try {
      const c = context();
      if (c && c.state === "suspended") c.resume();
      // Dokunuştan önce ön yüklenmiş baytlar varsa şimdi decode et (ilk çalış gecikmesin).
      if (c) for (const dosya of indirmeler.keys()) yukleDosya(c, dosya).catch(() => {});
    } catch {
      /* tarayıcı izin vermedi — ses sessizce devre dışı kalır */
    }
    window.removeEventListener("pointerdown", ac);
    window.removeEventListener("keydown", ac);
    window.removeEventListener("touchstart", ac);
  };
  window.addEventListener("pointerdown", ac, { once: false });
  window.addEventListener("keydown", ac, { once: false });
  window.addEventListener("touchstart", ac, { once: false });
}

/** Tek ton çal. */
function ton({ frekans = 880, sure = 0.09, hacim = 0.16, tip = "sine", gecikme = 0 }) {
  if (!sesAcikMi()) return;
  // Paket 20 VI: kullanıcı sayfaya hiç dokunmadıysa AudioContext açılamaz (tarayıcı kuralı) ve Chrome konsola
  // uyarı yazıyordu (ör. bitmiş düello linkiyle açılış). O durumda ses denenmez.
  if (typeof navigator !== "undefined" && navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
  const c = context();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume();
    const t0 = c.currentTime + gecikme;
    const osc = c.createOscillator();
    const kazanc = c.createGain();
    osc.type = tip;
    osc.frequency.setValueAtTime(frekans, t0);
    // Klik sesini engellemek için hızlı ama yumuşak zarf
    kazanc.gain.setValueAtTime(0.0001, t0);
    kazanc.gain.exponentialRampToValueAtTime(hacim, t0 + 0.012);
    kazanc.gain.exponentialRampToValueAtTime(0.0001, t0 + sure);
    osc.connect(kazanc).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + sure + 0.02);
  } catch {
    /* ses çalınamadı — oyun akışını bozmaz */
  }
}

/** Son saniye tik'i. kalanSn: 5→1 (azaldıkça tizleşir ve sertleşir). */
function tonTik(kalanSn) {
  const n = Math.max(1, Math.min(5, Math.round(kalanSn)));
  ton({ frekans: 620 + (5 - n) * 90, sure: 0.08, hacim: 0.13 + (5 - n) * 0.02, tip: "triangle" });
}

/** Süre doldu — alçalan iki ton. */
function tonSureDoldu() {
  ton({ frekans: 420, sure: 0.14, hacim: 0.16, tip: "sawtooth" });
  ton({ frekans: 260, sure: 0.24, hacim: 0.16, tip: "sawtooth", gecikme: 0.13 });
}

/** Doğru cevap — yükselen üçlü. */
function tonDogru() {
  ton({ frekans: 660, sure: 0.09, hacim: 0.15 });
  ton({ frekans: 880, sure: 0.09, hacim: 0.15, gecikme: 0.08 });
  ton({ frekans: 1180, sure: 0.16, hacim: 0.15, gecikme: 0.16 });
}

/** Yanlış cevap — kısa alçak vuruş. */
function tonYanlis() {
  ton({ frekans: 200, sure: 0.2, hacim: 0.15, tip: "square" });
}

/** Buton dokunuşu — çok kısa klik. */
function tonDokunus() {
  ton({ frekans: 1150, sure: 0.035, hacim: 0.075, tip: "square" });
}

/** Maç kazandın — üç notalı arpej. */
function tonKazandin() {
  ton({ frekans: 523, sure: 0.12, hacim: 0.16 });
  ton({ frekans: 659, sure: 0.12, hacim: 0.16, gecikme: 0.11 });
  ton({ frekans: 784, sure: 0.26, hacim: 0.17, gecikme: 0.22 });
}

/** Rütbe atlama — yükselen dörtlü, sonuncusu uzun. */
function tonRutbeAtladi() {
  ton({ frekans: 523, sure: 0.1, hacim: 0.15, tip: "triangle" });
  ton({ frekans: 698, sure: 0.1, hacim: 0.15, tip: "triangle", gecikme: 0.1 });
  ton({ frekans: 880, sure: 0.1, hacim: 0.16, tip: "triangle", gecikme: 0.2 });
  ton({ frekans: 1047, sure: 0.36, hacim: 0.17, tip: "triangle", gecikme: 0.3 });
}

/** Maç kaybetme — alçalan iki nota (kazanma arpejinin tersi). */
function tonKaybettin() {
  ton({ frekans: 392, sure: 0.16, hacim: 0.15, tip: "triangle" });
  ton({ frekans: 262, sure: 0.34, hacim: 0.15, tip: "triangle", gecikme: 0.15 });
}

/**
 * Joker kullanımı — süzgeçten geçmiş beyaz gürültüyle kısa "swoosh".
 * Osilatör tonu bu etkiyi veremiyor; kısa bir gürültü tamponu üretilip
 * bant geçiren süzgeçten geçiriliyor. Dosya yok, boyut yok.
 */
function tonJoker() {
  if (!sesAcikMi()) return;
  const c = context();
  if (!c) return;
  try {
    if (c.state === "suspended") c.resume();
    const sure = 0.26;
    const uzunluk = Math.floor(c.sampleRate * sure);
    const tampon = c.createBuffer(1, uzunluk, c.sampleRate);
    const veri = tampon.getChannelData(0);
    for (let i = 0; i < uzunluk; i++) veri[i] = Math.random() * 2 - 1;
    const kaynak = c.createBufferSource();
    kaynak.buffer = tampon;
    const suzgec = c.createBiquadFilter();
    suzgec.type = "bandpass";
    suzgec.Q.value = 1.1;
    const t0 = c.currentTime;
    // Süzgeç tepe frekansı yukarı kayar → "swoosh" hissi
    suzgec.frequency.setValueAtTime(500, t0);
    suzgec.frequency.exponentialRampToValueAtTime(3600, t0 + sure);
    const kazanc = c.createGain();
    kazanc.gain.setValueAtTime(0.0001, t0);
    kazanc.gain.exponentialRampToValueAtTime(0.14, t0 + 0.05);
    kazanc.gain.exponentialRampToValueAtTime(0.0001, t0 + sure);
    kaynak.connect(suzgec).connect(kazanc).connect(c.destination);
    kaynak.start(t0);
    kaynak.stop(t0 + sure + 0.02);
  } catch {
    /* ses çalınamadı — joker yine de kullanılır */
  }
}

// ------------------------------------------------------------ dosya çalar

/** Ses çalınabilir mi? (tercih + tarayıcının kullanıcı hareketi kuralı) */
function calabilir() {
  if (!sesAcikMi()) return false;
  // Paket 20 VI: sayfaya hiç dokunulmadıysa AudioContext açılamaz — deneme bile.
  if (typeof navigator !== "undefined" && navigator.userActivation && !navigator.userActivation.hasBeenActive) return false;
  return true;
}

/** Dosyanın baytlarını bir kez indirir (AudioContext gerekmez → dokunuştan önce de güvenli). */
function indir(dosya) {
  let s = indirmeler.get(dosya);
  if (s) return s;
  s = (async () => {
    const yanit = await fetch(`${SES_KLASORU}${dosya}`);
    if (!yanit.ok) throw new Error(`ses ${dosya}: HTTP ${yanit.status}`);
    return yanit.arrayBuffer();
  })();
  s.catch(() => {
    bozuk.add(dosya);        // bir daha denenmez; bu oturumda yedek ton çalar
    indirmeler.delete(dosya);
  });
  indirmeler.set(dosya, s);
  return s;
}

/** Dosyayı bir kez indirip decode eder; sonraki istekler aynı sözü paylaşır. */
function yukleDosya(c, dosya) {
  let s = yuklemeler.get(dosya);
  if (s) return s;
  s = (async () => {
    const veri = await indir(dosya);
    // Eski Safari decodeAudioData'yı yalnız geri çağırma biçimiyle destekler.
    const tampon = await new Promise((coz, reddet) => {
      try {
        const p = c.decodeAudioData(veri, coz, reddet);
        if (p && typeof p.then === "function") p.then(coz, reddet);
      } catch (e) {
        reddet(e);
      }
    });
    tamponlar.set(dosya, tampon);
    indirmeler.delete(dosya); // decodeAudioData baytları tüketir; tampon artık yeterli
    return tampon;
  })();
  s.catch(() => {
    bozuk.add(dosya);
    yuklemeler.delete(dosya);
  });
  yuklemeler.set(dosya, s);
  return s;
}

function tamponCal(c, tampon, hacim, hiz, rol) {
  try {
    if (c.state === "suspended") c.resume();
    const kaynak = c.createBufferSource();
    kaynak.buffer = tampon;
    if (hiz !== 1) kaynak.playbackRate.value = hiz;
    const kazanc = c.createGain();
    kazanc.gain.value = hacim;
    kaynak.connect(kazanc).connect(c.destination);
    // Üst üste binme sınırı: sınır aşılırsa en eski kopya 30 ms'de kısılıp susar.
    const liste = calanlar.get(rol) ?? [];
    const sinir = ES_ZAMANLI[rol] ?? 2;
    while (liste.length >= sinir) {
      const eski = liste.shift();
      try {
        eski.kazanc.gain.setTargetAtTime(0, c.currentTime, 0.01);
        eski.kaynak.stop(c.currentTime + 0.05);
      } catch { /* zaten bitmiş */ }
    }
    const kayit = { kaynak, kazanc };
    liste.push(kayit);
    calanlar.set(rol, liste);
    kaynak.onended = () => {
      const l = calanlar.get(rol);
      const i = l ? l.indexOf(kayit) : -1;
      if (i >= 0) l.splice(i, 1);
    };
    kaynak.start();
  } catch {
    /* ses çalınamadı — oyun akışını bozmaz */
  }
}

/**
 * Rolün dosyasını çal; olmazsa `yedek` tonu.
 * @param {string} rol      DOSYA tablosundaki rol (yoksa public/ses/<rol>.mp3)
 * @param {Function} yedek  dosya yoksa/bozuksa çalacak osilatör tonu
 * @param {{carpan?:number, hiz?:number}} [secenek]
 */
function cal(rol, yedek, { carpan = 1, hiz = 1 } = {}) {
  const dosya = dosyaAdi(rol);
  taniKaydi(rol, sesAcikMi() ? dosya : "efekt-kapali");
  if (!dosya || !calabilir()) return;     // sessiz seçildi / ses kapalı → indirme de yok
  const simdi = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (simdi - (sonCalma.get(rol) ?? -Infinity) < ARKA_ARKAYA_MS) return;
  sonCalma.set(rol, simdi);

  if (bozuk.has(dosya)) { yedek(); return; }
  const c = context();
  if (!c) return;
  const hacim = (dosya.startsWith("adaylar/") ? HACIM_ADAY[rol] ?? 0.8 : HACIM[rol] ?? 0.8) * carpan;

  const hazir = tamponlar.get(dosya);
  if (hazir) { tamponCal(c, hazir, hacim, hiz, rol); return; }

  yukleDosya(c, dosya).then(
    (tampon) => {
      const gecen = (typeof performance !== "undefined" ? performance.now() : Date.now()) - simdi;
      if (gecen <= ILK_CALMA_SINIRI_MS) tamponCal(c, tampon, hacim, hiz, rol);
    },
    () => {
      const gecen = (typeof performance !== "undefined" ? performance.now() : Date.now()) - simdi;
      if (gecen <= ILK_CALMA_SINIRI_MS) yedek();
    }
  );
}

// ------------------------------------------------------------ dışa açık sesler
// Adlar ve imzalar Paket 29 öncesiyle AYNI — çağıran dosyalar değişmedi.

/** Son saniye tik'i. kalanSn: 5→1 (azaldıkça tizleşir ve sertleşir). */
export function sesTik(kalanSn) {
  const n = Math.max(1, Math.min(5, Math.round(kalanSn)));
  // "Son 3 saniye" anına aday seçildiyse son 3 saniye onu çalar (1'de biraz tiz).
  if (n <= 3 && adayVar("son_3_saniye")) { cal("sayim_son", () => tonTik(kalanSn), { hiz: n === 1 ? 1.12 : 1 }); return; }
  cal("tik", () => tonTik(kalanSn), { carpan: 0.8 + (5 - n) * 0.05, hiz: 1 + (5 - n) * 0.06 });
}

/** Süre doldu. */
export function sesSureDoldu() { kanca("cevap"); cal("sure_doldu", tonSureDoldu); }

/** Doğru cevap. */
export function sesDogru() { kanca("cevap"); cal("dogru", tonDogru); }

/** Yanlış cevap. */
export function sesYanlis() { kanca("cevap"); cal("yanlis", tonYanlis); }

/** Buton dokunuşu — kısık. */
export function sesDokunus() { cal("dokunus", tonDokunus); }

/** Maç kazandın. */
export function sesKazandin() { kanca("cevap"); cal("kazandin", tonKazandin); }

/** Rütbe atlama. */
export function sesRutbeAtladi() { cal("rutbe", tonRutbeAtladi); }

/** Maç kaybetme. */
export function sesKaybettin() { kanca("cevap"); cal("kaybettin", tonKaybettin); }

/** Maç berabere bitti. */
export function sesBeraberlik() { kanca("cevap"); cal("beraberlik", () => { ton({ frekans: 523, sure: 0.14, hacim: 0.14, tip: "triangle" }); ton({ frekans: 523, sure: 0.24, hacim: 0.14, tip: "triangle", gecikme: 0.16 }); }); }

/** Joker kullanımı. */
export function sesJoker() { cal("joker", tonJoker); }

/** Rakip bulundu — arama katmanı kapanıp maç ekranı açıldığı an (Paket 29 E.2). */
export function sesRakipBulundu() {
  cal("rakip_bulundu", () => {
    ton({ frekans: 587, sure: 0.1, hacim: 0.15, tip: "triangle" });
    ton({ frekans: 880, sure: 0.2, hacim: 0.16, tip: "triangle", gecikme: 0.09 });
  });
}

/**
 * Düelloda can eksildi (Paket 29 E.2).
 * @param {boolean} [kendi=true] kendi canın mı — kendi canın giderken daha yüksek.
 */
export function sesCanKaybi(kendi = true) {
  cal("can_kaybi", () => {
    ton({ frekans: 180, sure: 0.22, hacim: kendi ? 0.16 : 0.09, tip: "sawtooth" });
  }, { carpan: kendi ? 1 : 0.55 });
}

/**
 * Sis (Paket 32 A.5): inerken koyu ve yavaş, kalkarken açık ve hızlı. Dosya: joker.mp3.
 * @param {boolean} [kalkis=false]
 */
export function sesSis(kalkis = false) {
  cal("sis", () => {
    ton({ frekans: kalkis ? 520 : 240, sure: 0.35, hacim: 0.12, tip: "triangle" });
  }, { hiz: kalkis ? 1.25 : 0.7, carpan: kalkis ? 0.7 : 1 });
}

// ------------------------------------------------------------ Faz 3 (Tasarım Adım 2)
// Kullanım tarifi: public/ses/OKU.md.

/**
 * Sesleri önceden indirir (ve kullanıcı dokunduysa decode eder) — ilk çalış gecikmesin.
 * Ses kapalıyken hiçbir şey indirmez. Hata atmaz.
 * @param {string|string[]} [grup="mac"] "mac" | "skill" | "sonuc" | "duello" | "turnuva" | "hepsi"
 *   ya da rol adları dizisi (ör. ["sayim_tik","sayim_son"]).
 */
export function sesOnYukle(grup = "mac") {
  try {
    if (!sesAcikMi() || typeof fetch === "undefined") return;
    const roller = Array.isArray(grup) ? grup
      : grup === "hepsi" ? Object.values(GRUPLAR).flat()
      : GRUPLAR[grup] ?? [];
    const aktif = !(typeof navigator !== "undefined" && navigator.userActivation && !navigator.userActivation.hasBeenActive);
    const c = aktif ? context() : null;   // dokunuş yoksa context açılmaz (Chrome uyarısı olmasın)
    for (const rol of new Set(roller.map(dosyaAdi).filter(Boolean))) {
      if (bozuk.has(rol) || tamponlar.has(rol)) continue;
      (c ? yukleDosya(c, rol) : indir(rol)).catch(() => { /* yedek ton devreye girer */ });
    }
  } catch {
    /* ön yükleme kritik değil */
  }
}

// Yedek tonlar (dosya çalınamazsa)
const tonSoruGeldi = () => {
  ton({ frekans: 784, sure: 0.08, hacim: 0.13, tip: "triangle" });
  ton({ frekans: 1175, sure: 0.16, hacim: 0.14, tip: "triangle", gecikme: 0.08 });
};
const tonTurGecis = () => {
  ton({ frekans: 330, sure: 0.12, hacim: 0.11, tip: "triangle" });
  ton({ frekans: 494, sure: 0.12, hacim: 0.11, tip: "triangle", gecikme: 0.1 });
  ton({ frekans: 659, sure: 0.18, hacim: 0.12, tip: "triangle", gecikme: 0.2 });
};
const tonCoin = () => {
  ton({ frekans: 988, sure: 0.07, hacim: 0.12, tip: "square" });
  ton({ frekans: 1319, sure: 0.2, hacim: 0.12, tip: "square", gecikme: 0.07 });
};
const tonTurnuva = () => {
  ton({ frekans: 392, sure: 0.12, hacim: 0.15, tip: "triangle" });
  ton({ frekans: 523, sure: 0.12, hacim: 0.15, tip: "triangle", gecikme: 0.12 });
  ton({ frekans: 784, sure: 0.34, hacim: 0.17, tip: "triangle", gecikme: 0.24 });
};

/** Yeni soru ekrana geldi — soru kartı görünür olduğu karede çağır. */
export function sesSoruGeldi() { kanca("soru"); cal("soru_geldi", tonSoruGeldi); }

/** Soru/tur geçişi — geçiş animasyonu BAŞLARKEN çağır (whoosh ~0.37 sn). */
export function sesTurGecis() { cal("tur_gecis", tonTurGecis); }

/**
 * Kategori seçimindeki geri sayım — her saniye bir kez çağır.
 * kalanSn > 3: kısa tik · 3–2: vurgulu "bong" · 1: daha tiz ve yüksek "bong" · ≤0: sessiz.
 * @param {number} kalanSn ekranda yazan saniye
 */
export function sesKategoriGeriSayim(kalanSn) {
  const n = Math.round(Number(kalanSn));
  if (!Number.isFinite(n) || n <= 0) return;
  if (n > 3) {
    cal("sayim_tik", () => ton({ frekans: 1400, sure: 0.03, hacim: 0.09, tip: "square" }));
    return;
  }
  const son = n === 1;
  cal("sayim_son", () => ton({ frekans: son ? 1175 : 880, sure: 0.14, hacim: son ? 0.18 : 0.15, tip: "triangle" }),
    { hiz: son ? 1.26 : 1, carpan: son ? 1.15 : 1 });
}

/** Son saniyelere girildi uyarısı — tek sefer (ör. kalan 5 sn olduğunda); tik'ler sesTik ile sürer. */
export function sesSonSaniyeler() {
  cal("son_saniyeler", () => ton({ frekans: 1568, sure: 0.12, hacim: 0.12, tip: "sine" }));
}

/** Skill id → rol. Oyunun id'leri (jokerler.js) + okunur takma adlar. */
const SKILL_ROL = {
  elli: "skill_elli", "50:50": "skill_elli", yari_yariya: "skill_elli",
  sure: "skill_ek_sure", ek_sure: "skill_ek_sure",
  soru_degistir: "skill_soru_degistir",
  zaman_baskisi: "skill_zaman_baskisi",
  sigorta: "skill_sigorta",
  seri_koruma: "skill_seri_koruma",
  cifte_puan: "skill_2x", "2x": "skill_2x", x2: "skill_2x",
  ikinci_sans: "skill_ikinci_sans",
};

/**
 * Skill kullanımı — türüne göre ayrı ses. Bilinmeyen tür → genel joker sesi.
 * @param {string} tur jokerler.js id'si: elli · sure · soru_degistir · zaman_baskisi ·
 *   sigorta · cifte_puan · ikinci_sans · seri_koruma
 */
export function sesSkill(tur) {
  const rol = SKILL_ROL[String(tur ?? "").toLowerCase()];
  // Her skill kendi /ses-secim anını çalar (AN eşlemesi; seçim yoksa türe özel eski dosya).
  // Genel "skill" anı yalnız sesJoker'de (Düello saldırı/savunma jokeri, bilinmeyen tür) — Ajan K.
  if (!rol) { sesJoker(); return; }
  cal(rol, tonJoker, rol === "skill_seri_koruma" ? { hiz: 1.15 } : undefined);
}

/** Level atlama (XP seviyesi). Rütbe atlama için sesRutbeAtladi. */
export function sesLevel() { cal("level", tonRutbeAtladi); }

/** Coin kazanma — sayaç artmaya başladığında bir kez. */
export function sesCoin() { cal("coin", tonCoin); }

/**
 * Maç sonu sahnesi (A.3): yalnız /ses-secim seçimi (ya da Ida'nın "mevcut" seçtiği dosya) çalar;
 * dosya yüklenemezse OSİLATÖR YEDEĞİ YOK — sahne sessiz kalır.
 * @param {"kazandin"|"kaybettin"|"beraberlik"|"coin"|"xp_dolma"|"level"|"rozet"} rol
 */
export function sesMacSonu(rol) {
  if (rol === "kazandin" || rol === "kaybettin" || rol === "beraberlik") kanca("cevap");
  cal(rol, () => {});
}

/** Maç sonu sahnesi açıkken müzik kısık (sahne kapanınca eski seviyeye döner). */
export function sesMuzikSahne(acik) { kanca(acik ? "sahne_ac" : "sahne_kapa"); }

/** Turnuva başladı. */
export function sesTurnuvaBasladi() { cal("turnuva", tonTurnuva); }

// ------------------------------------------------------------ Ajan H: /ses-secim'in yeni anları
// Bugün dosyaları yok; yalnız /ses-secim'de aday seçildiyse çalarlar (seçim yoksa sessiz).
const kisaTon = (frekans, tip = "triangle") => () => ton({ frekans, sure: 0.12, hacim: 0.12, tip });

/** Alt menüden sekme/sayfa değişti. */
export function sesSayfaGecis() { cal("sayfa_gecis", kisaTon(700)); }

/** VS anı — iki oyuncu kartı karşı karşıya geldiği kare (rakip bulunduktan hemen sonra). */
export function sesVsAni() { cal("vs_ani", tonTurnuva); }

/** Düelloda kategori seçimi kesinleşti. */
export function sesKategoriSecildi() { cal("kategori_secildi", kisaTon(880)); }

/** Rakip cevabını verdi (sen hâlâ düşünürken) — soru başına bir kez. */
export function sesRakipCevapladi() { cal("rakip_cevapladi", kisaTon(1046, "sine")); }

/** Dükkânda satın alma başarılı. */
export function sesSatinAlma() { cal("satin_alma", tonCoin); }

/** Maç sonunda XP çubuğu dolmaya başladı (bir kez). */
export function sesXpDolma() { cal("xp_dolma", kisaTon(660)); }

/** Yeni rozet kartı açıldı. */
export function sesRozet() { cal("rozet", tonRutbeAtladi); }

/** Uygulama içi bildirim (davet, mesaj) geldi. */
export function sesBildirim() { cal("bildirim", kisaTon(988, "sine")); }

/** Bir işlem başarısız oldu / uyarı çıktı. */
export function sesHataUyari() { cal("hata_uyari", tonYanlis); }

// ------------------------------------------------------------ müzik tercihi (Ajan H)
// Efekt tercihi eski anahtarda kaldı (`bildim_ses` → sesAcikMi/sesAyarla = EFEKTLER).
// Müzik ayrı anahtar; varsayılan açık (seviye sunucudaki muzik_varsayilan_seviye).
const MUZIK_ANAHTARI = "bildim_muzik";
/** Müzik açık mı? (varsayılan açık) */
export function muzikAcikMi() {
  try { return localStorage.getItem(MUZIK_ANAHTARI) !== "0"; } catch { return true; }
}
/** Müzik tercihini yaz; müzik çalar ve bütün anahtarlar `bildim-muzik` olayıyla eşitlenir. */
export function muzikAyarla(acik) {
  try { localStorage.setItem(MUZIK_ANAHTARI, acik ? "1" : "0"); } catch { /* özel mod */ }
  try { window.dispatchEvent(new CustomEvent("bildim-muzik", { detail: Boolean(acik) })); } catch { /* eski tarayıcı */ }
}
/** Müzik tercihi değişince haber verir. Aboneliği bırakan fonksiyon döner. */
export function muzikDinle(cb) {
  const f = (e) => cb(Boolean(e.detail));
  window.addEventListener("bildim-muzik", f);
  return () => window.removeEventListener("bildim-muzik", f);
}
/** Paylaşılan AudioContext (müzik de aynı bağlamı kullanır; iOS'ta tek kilit). */
export const sesBaglami = () => context();
