// Telefon denetimi 12 Eki 2026 — "arkadas" ajanı ekran testi (yerel, taklit veri; canlıya yazmaz).
// Kapsam: Arkadaşlar › takma adla arama (3 harften az → istek yok), "Kodla ekle" aramanın yanında;
// Hatalarım › get_categories 500 dönse de kategori kartları + dağılım + öğrenme yolu + geri düğmesi.
//
//   npx vite --port 5185 --strictPort      (başka kabukta)
//   node araclar/telefon-12eki-arkadas.mjs [--adres=http://localhost:5185] [--oturum=.arayuz-denetim-oturum-arkadas.json]
import { taklitKur, OLC } from "./_taklit-kur.mjs";
import fs from "node:fs";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5185";
const OTURUM = ARG.oturum || ".arayuz-denetim-oturum-arkadas.json";
const CIKTI = "tasarim/telefon-denetimi-12eki";
fs.mkdirSync(CIKTI, { recursive: true });

const ARKADAS_ID = "00000000-0000-4000-8000-000000000001";
const SONUCLAR = [
  { id: "00000000-0000-4000-8000-0000000000a1", gorunen_ad: "Abcdeniz", gorunen_avatar: null, cerceve: null, lig: "altin", level: 12, durum: null },
  { id: "00000000-0000-4000-8000-0000000000a2", gorunen_ad: "Abcmert", gorunen_avatar: null, cerceve: null, lig: "gumus", level: 7, durum: "giden" },
  { id: "00000000-0000-4000-8000-0000000000a3", gorunen_ad: "Kabcan", gorunen_avatar: null, cerceve: null, lig: "bronz", level: 3, durum: "gelen" },
];
const BANKA = [
  ["cografya", 24], ["bilim", 12], ["tarih", 9], ["muzik", 5], ["sinema", 2],
].map(([kategori, kategori_adet]) => ({ toplam: 70, ogrenilen: 18, bekleyen: 52, kategori, kategori_adet }));

let hataSayisi = 0;
const sonuc = [];
const kontrol = (ad, kosul, ek = "") => { sonuc.push(`${kosul ? "✓" : "✗"} ${ad}${ek ? ` — ${ek}` : ""}`); if (!kosul) hataSayisi++; };

async function calistir(dil, viewport) {
  let aramaCagri = 0;
  const { tarayici, baglam, kesilenler } = await taklitKur({
    adres: ADRES, dil, oturum: OTURUM, viewport,
    taklitler: [
      [/\/rpc\/arkadas_ara/, () => { aramaCagri++; return SONUCLAR; }],
      [/\/rest\/v1\/friendships/, (u, r) => {
        const me = "00000000-0000-4000-8000-0000000000ff";
        return [{ id: "f1", requester: me, addressee: ARKADAS_ID, durum: "arkadas", req: { id: ARKADAS_ID, gorunen_ad: "Zeynep", gorunen_avatar: null, puan: 900 }, add: { id: ARKADAS_ID, gorunen_ad: "Zeynep", gorunen_avatar: null, puan: 900 } }];
      }],
      [/\/rpc\/yanlis_bankam/, BANKA],
    ],
  });
  const ek = `${viewport.width}-${dil}`;
  try {
    // ---------- Arkadaşlar ----------
    const p = await baglam.newPage();
    const konsol = [];
    p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|get_categories/.test(m.text())) konsol.push(m.text()); });
    await p.goto(`${ADRES}/oyun/arkadaslar`);
    await p.waitForSelector("#ar-ara-giris", { timeout: 15000 });
    await p.fill("#ar-ara-giris", "ab");
    await p.waitForTimeout(900);
    kontrol(`[${ek}] 2 harf → istek yok`, aramaCagri === 0, `çağrı ${aramaCagri}`);
    kontrol(`[${ek}] 2 harf → uyarı`, await p.locator(".ar-ara-not").count() === 1);
    await p.fill("#ar-ara-giris", "abc");
    await p.waitForSelector(".ar-ara-liste", { timeout: 5000 });
    kontrol(`[${ek}] 3 harf → tek istek`, aramaCagri === 1, `çağrı ${aramaCagri}`);
    kontrol(`[${ek}] 3 sonuç`, await p.locator(".ar-ara-liste [role=listitem], .ar-ara-liste > *").count() >= 3);
    await p.click(".ar-kod-ac");
    kontrol(`[${ek}] Kodla ekle paneli açıldı`, await p.locator("#ar-kod-giris").isVisible());
    // "Ekle" → send_friend_request (yazma isteği tarayıcıda kesilir) → satır "Bekliyor"
    await p.locator(".ar-ara-liste .qt-dugme", { hasText: dil === "en" ? "Add" : "Ekle" }).first().click();
    await p.waitForTimeout(600);
    kontrol(`[${ek}] Ekle → send_friend_request`, kesilenler.some((k) => k.includes("send_friend_request")));
    const o = await p.evaluate(OLC);
    kontrol(`[${ek}] arkadaşlar yatay taşma 0`, o.yatay <= 0, `${o.yatay}px`);
    await p.evaluate(() => window.scrollTo(0, 0));
    await p.screenshot({ path: `${CIKTI}/arkadas-arama-${viewport.width}-${dil}.png`, fullPage: true });
    kontrol(`[${ek}] arkadaşlar konsol hatası 0`, konsol.length === 0, konsol.slice(0, 2).join(" | "));
    await p.close();

    // ---------- Hatalarım (get_categories 500 → sabit liste) ----------
    const c = await baglam.newPage();
    const konsol2 = [];
    c.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|get_categories/.test(m.text())) konsol2.push(m.text()); });
    let katCagri = 0;
    await c.route(/\/rpc\/get_categories/, (r) => { katCagri++; return r.fulfill({ status: 500, contentType: "application/json", body: '{"message":"taklit 500"}' }); });
    await c.goto(`${ADRES}/oyun/calisma`);
    await c.waitForSelector(".m1-cal-dagilim", { timeout: 15000 });
    await c.waitForTimeout(2500);   // yeniden deneme (1,2 sn) + sabit liste
    const kartlar = await c.locator(".m1-cal-kat-kart").count();
    kontrol(`[${ek}] get_categories 500 → yine kategori kartları`, kartlar >= 11, `${kartlar} kart, ${katCagri} çağrı`);
    // geliştirmede StrictMode etkiyi iki kez bağlar: ilk bağlanışın tek çağrısı + ikincinin 2 çağrısı (üretimde 2)
    kontrol(`[${ek}] tek yeniden deneme`, katCagri === 2 || katCagri === 3, `${katCagri}`);
    kontrol(`[${ek}] geri düğmesi`, await c.locator(".m1-cal-geri .bd-geri-dugmesi").count() === 1);
    kontrol(`[${ek}] dağılım 5 satır`, await c.locator(".m1-cal-dagilim-satir").count() === 5);
    kontrol(`[${ek}] öğrenme yolu`, await c.locator(".m1-cal-yol-tas").count() === 5);
    const o2 = await c.evaluate(OLC);
    kontrol(`[${ek}] Hatalarım yatay taşma 0`, o2.yatay <= 0, `${o2.yatay}px`);
    await c.screenshot({ path: `${CIKTI}/arkadas-hatalarim-${viewport.width}-${dil}.png`, fullPage: true });
    kontrol(`[${ek}] Hatalarım konsol hatası 0`, konsol2.length === 0, konsol2.slice(0, 2).join(" | "));
    await c.close();
  } finally {
    await tarayici.close();
  }
}

await calistir("tr", { width: 390, height: 844 });
await calistir("en", { width: 360, height: 780 });
console.log(sonuc.join("\n"));
console.log(hataSayisi ? `\n${hataSayisi} kontrol başarısız` : "\nHepsi geçti");
process.exitCode = hataSayisi ? 1 : 0;
