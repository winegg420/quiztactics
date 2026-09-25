// Sözlüğe taşınmamış (çevrilmemiş) arayüz metinlerini bulur — Arayüz İngilizce (Ida, 25 Eyl 2026).
// 1) SÖZLÜK EKSİĞİ: tt()/ceviri()/ts()/t(dil,…) çağrılarındaki anahtar EN sözlüğünde yok.
// 2) HAM METİN: tt() dışında kalan JSX metni, metin nitelikleri (title, aria-label, placeholder, alt, …) ve Türkçe harfli
//    ya da Türkçe kelimeli metin dizgileri.
// Önizleme / tasarım örnek sayfaları kapsam dışıdır.
// Kullanım: node araclar/ceviri/tara.mjs [--json cikti.json] [--dosya yol-parcasi]
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { parse } from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default ?? _traverse;

const kok = path.resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const jsonYol = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
const dosyaSuz = args.includes("--dosya") ? args[args.indexOf("--dosya") + 1] : null;

// ---- EN sözlüğünü yükle (SOZLUK dışa verilmez: esbuild yükleyicisiyle export edilir)
const gecici = path.join(os.tmpdir(), "ceviri-sozluk.mjs");
await build({
  entryPoints: [path.join(kok, "oyun/lib/dil.js")], bundle: true, platform: "node", format: "esm", outfile: gecici, logLevel: "error",
  plugins: [{ name: "sozluk-aktar", setup(b) {
    b.onLoad({ filter: /oyun[\\/]lib[\\/]dil\.js$/ }, (a) => ({ contents: fs.readFileSync(a.path, "utf8").replace("const SOZLUK = {", "export const SOZLUK = {"), loader: "js" }));
  } }],
});
const { SOZLUK } = await import(pathToFileURL(gecici).href);
const EN = SOZLUK.en;
const kaliplar = Object.keys(EN).filter((k) => k.includes("%")).map((k) => new RegExp("^" + k.split("%").map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("(.+?)") + "$"));
const enVar = (anahtar) => Object.prototype.hasOwnProperty.call(EN, anahtar) || Object.prototype.hasOwnProperty.call(EN, anahtar.split("|")[0]);

// ---- kapsam
const HARIC = [/[\\/]tasarim[\\/]onizleme[\\/]/, /[\\/]gorsel-revizyon[\\/]/, /[\\/]harita[\\/]/, /[\\/]avatar3d[\\/]/, /[\\/]_test[\\/]/,
  /PremiumOnizlemePage/, /KozmetikOnizlemePage/, /KozmetikElmasOnizleme/, /CerceveOnizlemePage/, /TasarimSistemiPage/, /MacSonuOnizlemePage/,
  /SesSecim/, /ses-secim/, /[\\/]stil-rehberi[\\/]/, /[\\/]vitrin[\\/]/, /[\\/]karakter[\\/]/, /HizliModPage/, /HizliMacPage/, /avatar-onizleme/,
  /[\\/]lib[\\/]ceviri[\\/]/, /[\\/]lib[\\/]dil\.js$/, /YonetimSikayet/, /AnaSayfaSecim|AnaSayfaB|AnaSayfaC/, /Onizleme/];
function dosyalar(d, cikti = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!["node_modules", "dist", "kafatopu", "meyvekes", "run", "gladius", "patirun", "driftgp"].includes(e.name)) dosyalar(p, cikti); }
    else if (/\.(jsx?|mjs)$/.test(e.name) && !HARIC.some((r) => r.test(p))) cikti.push(p);
  }
  return cikti;
}
const dosyaListesi = [...dosyalar(path.join(kok, "oyun")), ...dosyalar(path.join(kok, "src"))].filter((f) => !dosyaSuz || f.includes(dosyaSuz));

const TR_HARF = /[çğıöşüÇĞİÖŞÜ]/;
// Türkçe olduğu harfsiz de belli olan yaygın oyun kelimeleri ("Klasik", "Oyna", "Maç" …)
const TR_KELIME = /\b(Klasik|Oyna|Rakip|Puan|Kazan|Kaybet|Berabere|Siralama|Profil|Dukkan|Arkadas|Ayarlar|Giris|Cikis|Kaydet|Vazgec|Tamam|Evet|Hayir|Devam|Geri|Ileri|Basla|Bitti|Soru|Cevap|Sure|Can|Joker|Lig|Turnuva|Grup|Duello|Antrenman|Serbest|Dereceli|Hazir|Mesaj|Bildirim|Kural|Nasil|Yukleniyor|Hata|Tekrar|Kapat|Sil|Ekle|Sec|Degistir|Gonder|Fiyat|Rozet|Cerceve|Unvan|Seri|Gun|Hafta|Mac|Oyuncu|Kupa|Odul|Gorev|Kategori|Bilim|Tarih|Cografya|Edebiyat|Spor|Sanat|Sinema|Muzik|Teknoloji)\b/;
const METIN_NITELIK = new Set(["title", "aria-label", "placeholder", "alt", "etiket", "baslik", "aciklama", "metin", "not", "ipucu", "aria-description", "label", "mesaj", "altBaslik", "yazi", "aria-valuetext", "bekleMetni", "kapatEtiketi", "cikisEtiketi"]);
const ATLA_NITELIK = new Set(["className", "class", "style", "href", "to", "src", "key", "id", "type", "role", "name", "value", "data-ad", "htmlFor", "viewBox", "d", "fill", "stroke", "as", "tur", "ton", "boyut", "ikon", "ikonSag", "tamGenislik", "inputMode", "autoComplete", "rel", "target", "loading", "decoding", "mode", "mod", "kod", "lig", "kademe", "grup", "anahtar", "durum", "kapsam"]);

const bulgu = [];
const ekle = (dosya, satir, tur, metin, baglam) => bulgu.push({ dosya: path.relative(kok, dosya).replace(/\\/g, "/"), satir, tur, metin: metin.trim().replace(/\s+/g, " "), baglam });
const CEVIRI_FN = new Set(["tt", "ts", "ceviri", "tYap", "ttSunucu", "t", "cevir", "sesMetni"]);

function statikMetin(n) {
  if (!n) return null;
  if (n.type === "StringLiteral") return n.value;
  if (n.type === "TemplateLiteral" && n.expressions.length === 0) return n.quasis.map((q) => q.value.cooked).join("");
  if (n.type === "BinaryExpression" && n.operator === "+") { const a = statikMetin(n.left); const b = statikMetin(n.right); return a != null && b != null ? a + b : null; }
  return null;
}
const metinMi = (s) => /\p{L}{2,}/u.test(s);
const turkceMi = (s) => TR_HARF.test(s) || TR_KELIME.test(s);
const teknikMi = (s) => /^(https?:|\/|\.|#|[a-z]+[-_:][\w:-]+$|[\w.-]+\.(js|jsx|css|svg|webp|png|json|mp3|m4a)$|[A-Z_]{3,}$|\{|[\d\s.,:%+/×x·-]+$)/.test(s.trim());
const fnAdi = (c) => (c.type === "Identifier" ? c.name : c.type === "MemberExpression" && c.property.type === "Identifier" ? c.property.name : null);

for (const dosya of dosyaListesi) {
  let kod; try { kod = fs.readFileSync(dosya, "utf8"); } catch { continue; }
  let ast; try { ast = parse(kod, { sourceType: "module", plugins: ["jsx"] }); } catch (e) { ekle(dosya, 0, "ayristirma-hatasi", String(e.message).slice(0, 80), ""); continue; }
  const cevirideKalan = new Set();
  traverse(ast, {
    CallExpression(p) {
      const ad = fnAdi(p.node.callee);
      if (!ad || !CEVIRI_FN.has(ad)) return;
      const arg = ad === "t" ? p.node.arguments[1] : p.node.arguments[0];
      if (!arg) return;
      cevirideKalan.add(arg);
      const s = statikMetin(arg);
      if (s != null) {
        if (metinMi(s) && !enVar(s) && !kaliplar.some((r) => r.test(s))) ekle(dosya, arg.loc?.start.line ?? 0, "sozluk-eksik", s, ad);
      } else if (arg.type === "ConditionalExpression") {
        for (const k of [arg.consequent, arg.alternate]) { const x = statikMetin(k); if (x != null && metinMi(x) && !enVar(x)) ekle(dosya, k.loc?.start.line ?? 0, "sozluk-eksik", x, ad + "?:"); }
      } else if (arg.type === "TemplateLiteral" || arg.type === "Identifier" || arg.type === "MemberExpression") {
        ekle(dosya, arg.loc?.start.line ?? 0, "dinamik-anahtar", kod.slice(arg.start, arg.end).slice(0, 60), ad);
      }
    },
    JSXText(p) {
      const s = p.node.value;
      if (/\p{L}{2,}/u.test(s)) ekle(dosya, p.node.loc.start.line, "jsx-metin", s, "");
    },
    JSXAttribute(p) {
      const ad = p.node.name.name;
      if (typeof ad !== "string" || ATLA_NITELIK.has(ad)) return;
      const v = p.node.value;
      const s = v?.type === "StringLiteral" ? v.value : v?.type === "JSXExpressionContainer" ? statikMetin(v.expression) : null;
      if (s == null || !/\p{L}{2,}/u.test(s) || teknikMi(s)) return;
      if (METIN_NITELIK.has(ad) || turkceMi(s)) ekle(dosya, p.node.loc.start.line, "nitelik", `${ad}="${s}"`, "");
    },
    StringLiteral(p) {
      const s = p.node.value;
      if (!metinMi(s) || teknikMi(s) || !turkceMi(s)) return;
      if (cevirideKalan.has(p.node) || p.parentPath.isImportDeclaration() || p.parentPath.isExportDeclaration()) return;
      if (p.parentPath.isObjectProperty({ key: p.node }) || p.parentPath.isJSXAttribute()) return;
      if (p.findParent((x) => x.isCallExpression() && CEVIRI_FN.has(fnAdi(x.node.callee)))) return;
      if (p.findParent((x) => x.isCallExpression() && /^(warn|error|log|info)$/.test(fnAdi(x.node.callee) ?? ""))) return;
      if (p.findParent((x) => x.isThrowStatement() || (x.isNewExpression() && x.node.callee.name === "Error"))) return;
      if (enVar(s) || kaliplar.some((r) => r.test(s))) return;   // sözlükte var: dinamik anahtar olarak çevrilir
      ekle(dosya, p.node.loc.start.line, "ham-dizgi", s, "");
    },
    TemplateLiteral(p) {
      const s = p.node.quasis.map((q) => q.value.cooked).join("§");
      if (!metinMi(s.replace(/§/g, " ")) || teknikMi(s) || !turkceMi(s)) return;
      if (cevirideKalan.has(p.node) || p.parentPath.isTaggedTemplateExpression()) return;
      if (p.findParent((x) => x.isCallExpression() && (CEVIRI_FN.has(fnAdi(x.node.callee)) || /^(warn|error|log|info)$/.test(fnAdi(x.node.callee) ?? "")))) return;
      if (p.findParent((x) => x.isThrowStatement() || (x.isNewExpression() && x.node.callee.name === "Error"))) return;
      ekle(dosya, p.node.loc.start.line, "ham-sablon", s.replace(/§/g, "${…}"), "");
    },
  });
}

// ---- özet
const say = {};
for (const b of bulgu) say[b.tur] = (say[b.tur] ?? 0) + 1;
console.log("dosya:", dosyaListesi.length, "| bulgu:", bulgu.length, JSON.stringify(say));
const dosyaSay = {};
for (const b of bulgu) dosyaSay[b.dosya] = (dosyaSay[b.dosya] ?? 0) + 1;
console.log(Object.entries(dosyaSay).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([d, n]) => `${String(n).padStart(4)} ${d}`).join("\n"));
if (jsonYol) fs.writeFileSync(jsonYol, JSON.stringify(bulgu, null, 1));
