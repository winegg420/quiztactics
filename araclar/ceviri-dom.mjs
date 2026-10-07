// Ekranda kalan Türkçe metin denetimi — ortak parça (7 Eki 2026).
// ceviri-ekran-tara.mjs (gerçek sayfalar) ve taklit maç testleri (kasa-ekran, duello-plan-a-ekran, duello-puan-ekran,
// kasa-savunma-ekran, sunum-990-ekran) İngilizce koşuda her ekran görüntüsünde bunu çalıştırır: maç içi + maç sonu dahil.
//   import { trAnahtarlar, TR_TARA, ceviriToplayici } from "./ceviri-dom.mjs";
import fs from "node:fs";
import path from "node:path";

/** Tarayıcıda çalışır: görünür metin + aria-label/title/placeholder/alt içinde Türkçe kalanlar, taşan metin, yatay taşma. */
export const TR_TARA = (TR_ANAHTAR) => {
  const ANAHTAR_KUMESI = new Set(TR_ANAHTAR);
  const TR_HARF = /[ğüşıöçĞÜŞİÖÇ]/;
  const TR_KELIME = /(^|[^a-z'’])(ve|bir|için|ile|bu|şu|gibi|daha|çok|yok|oyun|maç|soru|rakip|kazan|kaybet|puan|seç|başla|devam|tekrar|dene|hata|giriş|çıkış|kapat|gönder|ekle|kaydet|iptal|tamam|evet|hayır|yükleniyor|arkadaş|ödül|görev|dükkân|oyuncu|şifre|hesap|ayar|ses|müzik|bildirim|mesaj|süre|saniye|dakika|gün|hafta|bugün|yarın|şimdi|henüz|lütfen|gerekir|kazandın|kaybettin|berabere|galibiyet|yenilgi|geri|sonraki|önceki|tümü|hepsi|kapalı|açık|aktif|şampiyon|sıra|sıradasın|şehir|ülke|düello|tur|yuva|hamle|saldır|savun|doğru|yanlış|şık|cevap|kategori|seviye|rozet|çerçeve|kıyafet|deneme|kullan|kullanıldı|kilitli|satın|fiyat|toplam|kalan|hazine|kasa|aç|sahip|sahipsiz)([^a-z]|$)/i;
  // Özel adlar: "Türkiye" İngilizcede de Türkiye (resmî ad); şehir adları (profil şehri = veri) — tek başına Türkçe sayılmaz
  const OZEL = /Türkiye|İstanbul|İzmir|Muğla|Eskişehir|Şanlıurfa|Kütahya|Çanakkale|Diyarbakır/g;
  const gor = (e) => { const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden" || +s.opacity === 0) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const bulunan = new Map();
  const ekle = (m, yer) => {
    const t = m.replace(/\s+/g, " ").trim(); if (t.length < 2 || !/\p{L}/u.test(t)) return;
    const s = t.replace(OZEL, "");
    if (TR_HARF.test(s) || TR_KELIME.test(s) || ANAHTAR_KUMESI.has(t)) bulunan.set(t + " ⟨" + yer + "⟩", 1);
  };
  // Soru metni / oyuncu içeriği çevrilmemiş olabilir: soru kartı, şıklar ve kullanıcı adları dışarıda
  const ATLA = ".qt-soru-metin, .soru-metin, [data-kullanici], .qc-soru, .qc-secenek, .chat-msg, .mesaj-govde, .qt-sik, .qt-soru-karti, .ks-gecmis-metin b, .v2-gecmis-soru, .msk-taraf-ad, .msk-ad, .mac-ust-ad, .ks-ad, .hk-ad, .ls-avatar-dugme, .ls-ad-dugme, [class*='-ad-dugme'], .as-lk-ad, .as-ko-ad, [class*='avatar'] img";   // oyuncu adları ve avatarlar = veri
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = w.nextNode())) {
    const e = n.parentElement;
    if (!e || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(e.tagName) || !gor(e) || e.closest(ATLA)) continue;
    ekle(n.nodeValue, "metin");
  }
  for (const e of document.querySelectorAll("[aria-label],[title],[placeholder],[alt]")) {
    if (e.closest(ATLA)) continue;
    const s = getComputedStyle(e); if (s.display === "none" || s.visibility === "hidden") continue;
    for (const a of ["aria-label", "title", "placeholder", "alt"]) { const v = e.getAttribute(a); if (v) ekle(v, a); }
  }
  const tasan = [];
  for (const e of document.querySelectorAll("body *")) {
    if (e.children.length || !e.textContent.trim() || !gor(e)) continue;
    const s = getComputedStyle(e);
    if (e.scrollWidth > e.clientWidth + 2 && (s.overflow !== "visible" || s.textOverflow === "ellipsis") && e.clientWidth > 1) tasan.push((e.textContent.trim().slice(0, 40)) + " [" + e.scrollWidth + ">" + e.clientWidth + "]");
    if (tasan.length > 12) break;
  }
  const de = document.documentElement;
  return { tr: [...bulunan.keys()], tasan, yatay: de.scrollWidth - de.clientWidth };
};

/** Bilinen Türkçe anahtarlar: kaynakta geçen her dizgiden EN karşılığı anahtardan FARKLI olanlar (ekranda aynen görünüyorsa çevrilmemiştir). */
export async function trAnahtarlar() {
  const { pathToFileURL } = await import("node:url");
  globalThis.window = undefined;
  const dil = await import(pathToFileURL(path.resolve("oyun/lib/dil.js")).href);
  await dil.sozlukYukle("en");
  const kaynak = [];
  const gez = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!/node_modules/.test(p)) gez(p); }
      else if (/\.(jsx?|mjs)$/.test(e.name)) kaynak.push(p);
    }
  };
  gez(path.resolve("oyun")); gez(path.resolve("src"));
  const aday = new Set();
  const DIZGI = /"((?:[^"\\n]|\.){2,140})"|'((?:[^'\\n]|\.){2,140})'/g;
  for (const p of kaynak) for (const m of fs.readFileSync(p, "utf8").matchAll(DIZGI)) aday.add(m[1] ?? m[2]);
  const cikti = [];
  for (const k of aday) {
    const ana = k.split("|")[0];
    if (/[{%]/.test(ana) || !/\p{L}/u.test(ana)) continue;
    const en = dil.t("en", k);
    if (en !== ana && en.toLowerCase() !== ana.toLowerCase()) cikti.push(ana);
  }
  return cikti;
}

/**
 * Taklit testleri için: `const ceviri = await ceviriToplayici();` → her ekranda `await ceviri.tara(sayfa, "ekran-adı")`
 * (yalnız İngilizce koşuda çağır) → sonda `ceviri.ozet()` kalan metinleri yazar ve sayısını döndürür.
 */
// Taklit testlerdeki oyuncu adları (veri, arayüz metni değil): "Deniz Yıldırımoğlu", kısaltılmış "Deniz Yıld…", uzun ad testi;
// "Ölçüm aracı: yazma kapalı" taklit RPC'nin döndürdüğü hata (uygulamanın metni değil).
const TAKLIT_ADLAR = /Deniz Yıld|Yıldırımoğlu|Karadenizlioğlu|Ölçüm aracı/;   // + taklit RPC'nin kendi hata metni

export async function ceviriToplayici({ yoksay = TAKLIT_ADLAR } = {}) {
  const anahtar = await trAnahtarlar();
  const tum = new Map();
  return {
    async tara(sayfa, yer) {
      try {
        const o = await sayfa.evaluate(TR_TARA, anahtar);
        for (const t of o.tr) { if (yoksay && yoksay.test(t)) continue; const s = tum.get(t) ?? new Set(); s.add(yer); tum.set(t, s); }
      } catch { /* sayfa kapandı */ }
    },
    ozet() {
      if (tum.size) {
        console.log("\n===== EKRANDA KALAN TÜRKÇE (İngilizce koşu) =====");
        for (const [t, s] of [...tum.entries()].sort()) console.log(`  ${t}   ← ${[...s].slice(0, 4).join(", ")}`);
      } else console.log("\n· İngilizce koşuda ekranda Türkçe metin yok");
      return tum.size;
    },
  };
}
