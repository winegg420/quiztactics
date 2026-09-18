// Quiz Tactics ses motoru — `public/ses/*.mp3` dosyalarını çalar (Paket 29 E).
//
// Dosyalar: Kenney Interface Sounds / UI Audio, CC0 (public/ses/LISANS.txt).
// Kurallar:
//   * TEMBEL: açılışta hiçbir ses indirilmez; bir ses ilk kez istendiğinde
//     indirilir, decode edilip `tamponlar`da tutulur — bir daha indirilmez.
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
  kaybettin: 0.9,
  kazandin: 1.0,
  rutbe: 1.0,
};
const ARKA_ARKAYA_MS = 40;         // aynı rol bu süreden sık tetiklenirse atlanır
const ILK_CALMA_SINIRI_MS = 250;   // ilk indirme bundan uzun sürerse o çalış atlanır
const SES_KLASORU = `${import.meta.env?.BASE_URL ?? "/"}ses/`;

let ctx = null;
let kilitAcildi = false;
const tamponlar = new Map();       // rol → AudioBuffer
const yuklemeler = new Map();      // rol → Promise<AudioBuffer> (aynı dosya iki kez istenmesin)
const bozuk = new Set();           // indirilemeyen/decode edilemeyen roller → hep yedek ton
const sonCalma = new Map();        // rol → performance.now()

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

/** Rolün dosyasını bir kez indirip decode eder; sonraki istekler aynı sözü paylaşır. */
function yukle(c, rol) {
  let s = yuklemeler.get(rol);
  if (s) return s;
  s = (async () => {
    const yanit = await fetch(`${SES_KLASORU}${rol}.mp3`);
    if (!yanit.ok) throw new Error(`ses ${rol}: HTTP ${yanit.status}`);
    const veri = await yanit.arrayBuffer();
    // Eski Safari decodeAudioData'yı yalnız geri çağırma biçimiyle destekler.
    const tampon = await new Promise((coz, reddet) => {
      try {
        const p = c.decodeAudioData(veri, coz, reddet);
        if (p && typeof p.then === "function") p.then(coz, reddet);
      } catch (e) {
        reddet(e);
      }
    });
    tamponlar.set(rol, tampon);
    return tampon;
  })();
  s.catch(() => {
    bozuk.add(rol);          // bir daha denenmez; bu oturumda yedek ton çalar
    yuklemeler.delete(rol);
  });
  yuklemeler.set(rol, s);
  return s;
}

function tamponCal(c, tampon, hacim, hiz) {
  try {
    if (c.state === "suspended") c.resume();
    const kaynak = c.createBufferSource();
    kaynak.buffer = tampon;
    if (hiz !== 1) kaynak.playbackRate.value = hiz;
    const kazanc = c.createGain();
    kazanc.gain.value = hacim;
    kaynak.connect(kazanc).connect(c.destination);
    kaynak.start();
  } catch {
    /* ses çalınamadı — oyun akışını bozmaz */
  }
}

/**
 * Rolün dosyasını çal; olmazsa `yedek` tonu.
 * @param {string} rol      public/ses/<rol>.mp3
 * @param {Function} yedek  dosya yoksa/bozuksa çalacak osilatör tonu
 * @param {{carpan?:number, hiz?:number}} [secenek]
 */
function cal(rol, yedek, { carpan = 1, hiz = 1 } = {}) {
  if (!calabilir()) return;               // ses kapalı → indirme de yok
  const simdi = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (simdi - (sonCalma.get(rol) ?? -Infinity) < ARKA_ARKAYA_MS) return;
  sonCalma.set(rol, simdi);

  if (bozuk.has(rol)) { yedek(); return; }
  const c = context();
  if (!c) return;
  const hacim = (HACIM[rol] ?? 0.8) * carpan;

  const hazir = tamponlar.get(rol);
  if (hazir) { tamponCal(c, hazir, hacim, hiz); return; }

  yukle(c, rol).then(
    (tampon) => {
      const gecen = (typeof performance !== "undefined" ? performance.now() : Date.now()) - simdi;
      if (gecen <= ILK_CALMA_SINIRI_MS) tamponCal(c, tampon, hacim, hiz);
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
  cal("tik", () => tonTik(kalanSn), { carpan: 0.8 + (5 - n) * 0.05, hiz: 1 + (5 - n) * 0.06 });
}

/** Süre doldu. */
export function sesSureDoldu() { cal("sure_doldu", tonSureDoldu); }

/** Doğru cevap. */
export function sesDogru() { cal("dogru", tonDogru); }

/** Yanlış cevap. */
export function sesYanlis() { cal("yanlis", tonYanlis); }

/** Buton dokunuşu — kısık. */
export function sesDokunus() { cal("dokunus", tonDokunus); }

/** Maç kazandın. */
export function sesKazandin() { cal("kazandin", tonKazandin); }

/** Rütbe atlama. */
export function sesRutbeAtladi() { cal("rutbe", tonRutbeAtladi); }

/** Maç kaybetme. */
export function sesKaybettin() { cal("kaybettin", tonKaybettin); }

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
