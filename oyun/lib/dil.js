// ============================================================
// ARAYÜZ DİLİ — AŞAMA 1 (giriş ekranları)
//
// Kütüphane YOK (i18next ve benzeri yasak): düz JS nesnesi + `t()`.
//
// KAPSAM: bu aşamada yalnız yeni oyuncunun İLK gördüğü ekranlar çevrildi —
// `src/pages/Login.jsx` ve `oyun/components/KurulumSihirbazi.jsx`.
// Kalan 100+ dosya Aşama 2. Sözlükte olmayan anahtar Türkçe metnin
// kendisine düşer (`t()` anahtarı aynen döndürür), böylece yarım çeviri
// boş ekran üretmez.
//
// DİL KURALI — SIRALI, IP'YE BAKILMAZ:
//   1. Giriş yapmış oyuncunun profilindeki tercih (`profiles.dil`)
//   2. Oyuncunun bu tarayıcıda elle seçtiği dil (localStorage)
//   3. Tarayıcı/telefon dili: `tr` ile başlıyorsa Türkçe, başka her şey İngilizce
// Ülke/IP KULLANILMAZ: Almanya'daki Türk Türkçe, Türkiye'deki yabancı
// İngilizce görmeli. Tarayıcı dili bunu doğru yapar, ülke yanlış yapar.
// ============================================================

export const DILLER = ["tr", "en"];
const ANAHTAR = "bildim_dil";

/** Tarayıcı dili → desteklenen dil. `tr-TR`, `tr` → tr; başka her şey → en. */
export function tarayiciDili() {
  try {
    const liste = Array.isArray(navigator?.languages) && navigator.languages.length
      ? navigator.languages
      : [navigator?.language];
    for (const d of liste) {
      if (typeof d === "string" && d.toLowerCase().startsWith("tr")) return "tr";
    }
  } catch {
    /* eski tarayıcı: aşağıdaki varsayılana düş */
  }
  return "en";
}

/** Bu tarayıcıda elle seçilmiş dil (yoksa null). */
export function kayitliDil() {
  try {
    const d = localStorage.getItem(ANAHTAR);
    return DILLER.includes(d) ? d : null;
  } catch {
    return null;   // gizli sekme / depolama kapalı
  }
}

/** Elle seçimi bu tarayıcıya yazar. */
export function dilKaydet(dil) {
  if (!DILLER.includes(dil)) return;
  aktif = dil;
  try { localStorage.setItem(ANAHTAR, dil); } catch { /* depolama kapalı */ }
}

// D-203: giriş düğmesine basıldığı andaki dil. Yeni profil 'tr' doğup İngilizce oyuncuyu Türkçeye
// düşürüyordu; Google girişi yönlendirmeyle gittiği için dil kayıt verisine konamıyor — burada saklanır,
// profil ilk geldiğinde (yeni hesapsa) bir kez profile yazılır (useDil).
const GIRIS_DILI = "bildim_giris_dili";
export function girisDiliniKaydet(dil) {
  if (!DILLER.includes(dil)) return;
  try { localStorage.setItem(GIRIS_DILI, dil); } catch { /* depolama kapalı */ }
}
/** Saklanan giriş dilini okur ve siler (bir kez kullanılır). */
export function girisDiliniAl() {
  try {
    const d = localStorage.getItem(GIRIS_DILI);
    localStorage.removeItem(GIRIS_DILI);
    return DILLER.includes(d) ? d : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------ sayfa dili
// Aşama 2: kancasız metinler (`tt`) sayfa yüklenirken çözülen dili kullanır.
// Profil tercihi farklı çıkarsa `useDil` bunu tarayıcıya yazıp sayfayı bir
// kez yeniler; elle dil değişimi de yeniler. Böylece modül düzeyindeki
// sabitler (sekme adları, katalog metinleri) de doğru dilde kurulur.
let aktif = null;

/** Bu sayfa yüklemesinin dili: elle seçim > tarayıcı dili. */
export function aktifDil() {
  if (!aktif) aktif = kayitliDil() ?? tarayiciDili();
  return aktif;
}

try {
  if (typeof document !== "undefined") {
    document.documentElement.lang = aktifDil();
    // Sekme başlığı ve açıklama meta'sı (index.html Türkçe): İngilizce oyuncuya İngilizce (paylaşım/arama önizlemesi statik kalır)
    if (aktifDil() === "en") {
      document.title = "Quiz Tactics — Trivia Game";
      document.querySelector('meta[name="description"]')?.setAttribute("content", "A trivia game: 1v1 challenges, daily tournaments, city and country leagues. Thousands of questions, free.");
    }
  }
} catch { /* DOM yok */ }

/**
 * Geçerli dili SIRALI KURALLA çözer.
 * @param {{dil?: string}|null} profil giriş yapmış oyuncunun profili
 */
export function dilCoz(profil) {
  const p = profil?.dil;
  if (DILLER.includes(p)) return p;
  return kayitliDil() ?? tarayiciDili();
}

// ------------------------------------------------------------------ sözlük
// Anahtar = TÜRKÇE metnin kendisi. Böylece çevirisi yazılmamış bir metin
// Türkçe görünür, "kayıp anahtar" gibi teknik bir şey değil.
//
// İngilizce sözlük BURADA DEĞİL: `dil-en.js` (temel + ceviri/*.js ekleri) ayrı tembel parçadır ve yalnız
// dil İngilizceyken iner (`sozlukYukle`). Yüklenene kadar `SOZLUK.en` boştur → `t()` Türkçe metne düşer.
export const SOZLUK = { en: {} };

const sozlukIstegi = {};   // dil → süren/biten yükleme (aynı anda tek istek)
const sozlukHazirlar = new Set(["tr"]);

/** Bu dilin sözlüğü bellekte mi? Türkçe her zaman hazırdır (anahtarın kendisi). */
export function sozlukHazir(dil) {
  return sozlukHazirlar.has(dil);
}

/**
 * Sözlüğü tembel yükler. `t()`/`tt()` SENKRON kalır: çağıran önce bunu bekler, sonra dili değiştirir.
 * Ağ hatasında reddeder (çağıran try-catch ile Türkçede kalır); sonraki çağrı yeniden dener.
 */
export function sozlukYukle(dil) {
  if (!DILLER.includes(dil)) return Promise.reject(new Error("Bilinmeyen dil: " + dil));
  if (sozlukHazirlar.has(dil)) return Promise.resolve();
  if (!sozlukIstegi[dil]) {
    sozlukIstegi[dil] = import("./dil-en.js")
      .then((m) => {
        Object.assign(SOZLUK[dil], m.default);
        kaliplar = null;   // sunucu mesajı kalıpları yeni sözlükten kurulsun
        sozlukHazirlar.add(dil);
      })
      .catch((e) => {
        delete sozlukIstegi[dil];
        throw e;
      });
  }
  return sozlukIstegi[dil];
}

/**
 * Sözlük inemediyse bu sayfa yüklemesi Türkçe sürer. Kayıtlı tercih (localStorage/profil) DEĞİŞMEZ:
 * bağlantı düzelince sonraki açılışta İngilizce yeniden denenir.
 */
export function turkceyeDus() {
  aktif = "tr";
  try { if (typeof document !== "undefined") document.documentElement.lang = "tr"; } catch { /* DOM yok */ }
}

/**
 * JOKER ADI (Ida kararı, 24 Eyl 2026): oyuncuya görünen ad "Skill" değil **"Joker"** (TR ve EN).
 * Anahtarı hâlâ "skill" geçen metinler (maç ekranları ve sunucu hata mesajları dahil) çıkışta
 * çevrilir: Skill → Joker, skill'ler/skiller → jokerler, skill'i → jokeri, skillsiz → jokersiz …
 * (skill ile joker'in son ünlüsü aynı sınıf — ek uyumu değişmez; kesme işareti düşer.)
 * İç adlar (`skill_*`, RPC, kolon) etkilenmez: alt çizgiyle devam eden kelimeye dokunulmaz.
 * Anahtarlar kaynakta "Joker"e çevrildikçe bu katman işsiz kalır; zararsızdır.
 */
const SKILL_RE = /(^|[^\p{L}_{])([Ss])kil(?:(?=ler)|l(?!_)'?)/gu;   // lookbehind yok (eski iOS Safari)
export function jokerAdi(metin) {
  if (typeof metin !== "string" || !/kill/i.test(metin)) return metin;
  return metin.replace(SKILL_RE, (_, on, s) => on + (s === "S" ? "Joker" : "joker"));
}

/**
 * Çeviri. Anahtar Türkçe metnin kendisidir; sözlükte yoksa aynen döner.
 * @param {string} dil "tr" | "en"
 * @param {string} anahtar Türkçe metin
 * @param {Record<string,string|number>} [degerler] {ad} gibi yer tutucular
 */
export function t(dil, anahtar, degerler) {
  // "Açık|durum" gibi bağlamlı anahtar: aynı Türkçe kelimenin farklı karşılığı için.
  const metin = jokerAdi((dil !== "tr" && SOZLUK[dil]?.[anahtar]) || anahtar.split("|")[0]);
  if (!degerler) return metin;
  let birVar = false;
  const sonuc = metin.replace(/\{(\w+)\}/g, (tam, ad) => {
    // Paket 40 I: sunucudan eksik gelen alan ekrana "undefined"/"null" diye basılmasın
    if (!Object.prototype.hasOwnProperty.call(degerler, ad)) return tam;
    const d = degerler[ad];
    if (d === undefined || d === null) return "";
    // Sözlük çoğul bilmiyor: EN'de yer tutucuya 1 gelirse sayının arkasına işaret konur, aşağıda tekile çevrilir.
    if (dil !== "tr" && (d === 1 || d === "1")) { birVar = true; return "1" + TEKIL_ISARET; }
    return String(d);
  });
  return birVar ? ingilizceTekil(sonuc) : sonuc;
}

// "1 questions" → "1 question": yalnız yer tutucuyla gelen 1'in HEMEN ardındaki düzenli çoğul isim.
const TEKIL_ISARET = "\u0001";
const TEKIL_ISTISNA = /^(news|series|species|has|was|does|this|its|plus|always|status|bonus|focus|pass|miss|class|chaos|lens|gas|bias|us|is|as)$/i;
function tekilYap(k) {
  if (k.length < 4 || k === k.toUpperCase()) return k;                               // XP, SP, pts gibi kısaltmalar
  if (TEKIL_ISTISNA.test(k) || !/s$/i.test(k) || /(ss|us|is)$/i.test(k)) return k;
  if (/ives$/i.test(k)) return k.slice(0, -3) + "ife";                              // lives → life
  if (/[^aeiou]ies$/i.test(k) && k.length > 4) return k.slice(0, -3) + "y";          // entries → entry
  if (/(ch|sh|x|z)es$/i.test(k)) return k.slice(0, -2);                              // matches → match
  return k.slice(0, -1);
}
function ingilizceTekil(metin) {
  return metin
    .replace(/\u0001(\s+)([A-Za-z]+)(?![A-Za-z(])/g, (_, bosluk, k) => bosluk + tekilYap(k))
    .replace(/\u0001/g, "");
}

/** Kancasız çeviri: sayfanın dilinde (`aktifDil`). Bileşen dışında da çalışır. */
export function tt(anahtar, degerler) {
  return t(aktifDil(), anahtar, degerler);
}

// Sunucu (RPC raise exception) mesajları "%" yer tutuculu olabilir:
// "Bu maçta en fazla % joker kullanabilirsin" → biçimlenmiş metin kalıpla eşleşir.
let kaliplar = null;
function kaliplariKur(sozluk) {
  kaliplar = Object.keys(sozluk)
    .filter((k) => k.includes("%"))
    .map((k) => ({
      anahtar: k,
      re: new RegExp("^" + k.split("%").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)") + "$"),
    }));
}

// Sunucuda hâlâ eski adı taşıyan Türkçe mesajlar (aura → Arka Plan, oyuncuya görünen ad): TR oyuncuda da düzeltilir.
// Sunucu mesajı değişince (yeni migration) bu satırlar gereksizleşir.
const TR_DUZELTME = {
  "Böyle bir aura yok": "Böyle bir arka plan yok",
  "Bu aura satılmıyor": "Bu arka plan satılmıyor",
  "Bu aura sende yok": "Bu arka plan sende yok",
  "Bu aura zaten sende": "Bu arka plan zaten sende",
  "Bu aura şu an kullanılamıyor": "Bu arka plan şu an kullanılamıyor",
};

/** Sunucu hata mesajı çevirisi: önce birebir, sonra "%" kalıbıyla. */
export function ttSunucu(metin) {
  const dil = aktifDil();
  const sozluk = SOZLUK[dil];
  if (dil === "tr" && typeof metin === "string" && TR_DUZELTME[metin]) return TR_DUZELTME[metin];
  if (dil === "tr" || !sozluk || typeof metin !== "string") return jokerAdi(metin);
  if (sozluk[metin]) return jokerAdi(sozluk[metin]);
  if (!kaliplar) kaliplariKur(sozluk);
  for (const k of kaliplar) {
    const m = metin.match(k.re);
    if (m) {
      // "%" sırayla, "%2" gibi numaralı yer tutucu sırası değişen dillerde.
      // Yakalanan parça da sözlükte varsa (kategori, unvan) o da çevrilir.
      const parca = (n) => (m[n] === undefined ? "" : sozluk[m[n]] ?? m[n]);
      let i = 1;
      return jokerAdi(sozluk[k.anahtar]).replace(/%(\d)?/g, (_, n) => parca(n ? Number(n) : i++));
    }
  }
  return jokerAdi(metin);
}

/** Bir dile bağlı `t` üretir: `const ceviri = tYap(dil)`. */
export function tYap(dil) {
  return (anahtar, degerler) => t(dil, anahtar, degerler);
}
