// AVATAR PRESTİJ + ÇERÇEVE (1049) — ekran görüntüsü ve ölçüm. Her sayfa EN ÇOK BİR KEZ açılır, döngü yok.
//
// İki koşu:
//  · cerceve : GERÇEK veri. Lig listesi + Dünya sıralaması; tarayıcının aldığı oyuncu_kartlari / lig_grubum_ozet
//              yanıtlarında çerçevesi boş oyuncu sayılır (hedef 0, botlar dahil).
//  · prestij : TAKLİT işaret — oyuncu_kartlari / lig_grubum_ozet yanıtında herkes avatar_prestij = true (yalnız
//              görünüm kapsamını göstermek için; sunucuya yazılmaz). Düello maçı + maç sonu duello_* RPC'leri taklit.
//              Ölçer: her sayfada .avatar sayısı ve içindeki .av-parla sayısı (pırıltının kaçtığı avatar kalmasın),
//              yatay taşma (390 px), konsol hatası.
// Kullanım: npm run dev -- --port 5199 (başka kabukta) · node araclar/avatar-prestij-ekran.mjs [--adres=http://localhost:5199]
// Oturum: .arayuz-denetim-oturum.json (node araclar/arayuz-denetim.mjs açar). Çıktı: tasarim/avatar-prestij/*.png + olcum.json
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ADRES = ARG.adres || "http://localhost:5199";
const OTURUM = path.resolve(".arayuz-denetim-oturum.json");
const CIKTI = path.resolve("tasarim/avatar-prestij");
fs.mkdirSync(CIKTI, { recursive: true });
if (!fs.existsSync(OTURUM)) { console.error("Oturum yok: önce node araclar/arayuz-denetim.mjs"); process.exit(1); }

const DID = "0d0e1100-0000-4000-8000-000000001049";
const RAKIP = "0d0e1100-0000-4000-8000-0000000010bb";
const SORU = { soru: "Hangi gezegen Güneş Sistemi'nin en büyüğüdür?", secenekler: ["Satürn", "Jüpiter", "Neptün", "Uranüs"], kategori: "bilim" };
// Lig grubu taklidi (misafirin grubu yok): 25 kişi, ben 7. — kimlikler sabit, kartları taklit edilir
const LIG_ID = (i) => `0d0e1100-0000-4000-8000-0000000002${String(i).padStart(2, "0")}`;
const ligGrubu = (benId) => Array.from({ length: 25 }, (_, j) => {
  const i = j + 1, ben = i === 7;
  return { sira: i, user_id: ben ? benId : LIG_ID(i), gorunen_ad: ben ? "Ben" : `Oyuncu ${i}`, gorunen_avatar: null, puan: 640 - i * 23, ben,
    bot: i % 6 === 0, lig: "gumus", grup_boyu: 25, yukselen: 5, dusen: 5, sezon_bitis: new Date(Date.now() + 4 * 864e5).toISOString(), gorunum: null };
});
const yapayKart = (id) => ({ id, ad: "Deniz", avatar: "/avatars/pro2/samuray-y15.svg", level: 14, lig: "gumus", cerceve: "lig_gumus",
  cerceve_nadirlik: "nadir", vitrin: [], aura: null, vs_karti: null, isim_efekti: null, zafer_efekti: null, premium_cerceve: null,
  premium_aura: null, sehir_sampiyonu: null, unvan: null, koleksiyon_puani: 40, sezon_bp: false, avatar_prestij: true });

function duelloDurum(ben, bitti) {
  const simdi = Date.now(), bitis = new Date(simdi + 14000).toISOString();
  const oyuncu = (id, ad, dogru) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/samuray-y15.svg" : "/avatars/pro/viking-k25.svg", gorunum: null, dogru, unvan: null });
  return {
    surum: 4, id: DID, durum: bitti ? "bitti" : "aktif", dereceli: true, faz: bitti ? "bitti" : "notr", faz_bitis: bitis, sunucu_zamani: new Date(simdi).toISOString(),
    ben, rakip: RAKIP, oyuncular: [oyuncu(ben, "Sen", 3), oyuncu(RAKIP, "Deniz", 2)],
    v4: { kontrol: null, seri: 0, seri_hedef: 3, tur: 0, max_tur: 20, notr_seri: 0, notr_max: 5, son: false, soru_no: 1, kullanilan: [], ilk_mac: false,
      kart: null, benim_kategori: "bilim", rakip_kategori: "bilim", oto: false },
    soru: bitti ? null : SORU,
    cevap: bitti ? null : { benim_bitis: bitis, rakip_bitis: bitis, ben_cevapladim: false, benim_cevabim: null, rakip_cevapladi: false, elli_kapali: null, ikinci_sans_ilk_cevap: null },
    son_hamle: null,
    skill: { kapali: false, set: ["elli", "sure", "zaman_baskisi"], izinli: ["elli", "sure", "zaman_baskisi"], toplam_hak: 4, tur_basi_hak: 2, soru_basi_hak: 1,
      kullanilan: 0, sayilar: {}, bu_soruda: 0, rakip_bu_soruda: false, soru_degistir_kilit: null, envanter: { elli: 3, sure: 2, zaman_baskisi: 1 }, fiyatlar: {}, coin: 120 },
    sureler: { kart: 7, cevap: 15, sonuc: 3, ek_sure: 5, zaman_baskisi_eksi: 5, nabiz: 10, kopuk: 25, gosterim_payi_ms: 2000, gosterim_bas: new Date(simdi - 500).toISOString() },
    kazanan: bitti ? ben : null, terk_eden: null, odul: bitti ? { coin: 40, xp: 30 } : null, ezeli: null, gecmis: null, rovans: { isteyen: null, id: null, gecerli: false },
  };
}

const OLC = () => {
  const avatarlar = [...document.querySelectorAll(".avatar")].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 4 && r.height > 4; });
  return {
    yatayTasma: document.documentElement.scrollWidth - window.innerWidth,
    avatar: avatarlar.length,
    parla: avatarlar.filter((e) => e.querySelector(":scope > .av-parla")).length,
    acik: document.querySelectorAll(".av-parla.av-parla--acik").length,   // ekranda açık katman (gözcü)
    parlasiz: avatarlar.filter((e) => !e.querySelector(":scope > .av-parla")).slice(0, 4)
      .map((e) => `${e.parentElement?.className?.baseVal === undefined ? String(e.parentElement?.className).split(" ")[0] : "svg"} ${Math.round(e.getBoundingClientRect().width)}px`),
  };
};

const tarayici = await chromium.launch({ channel: "chrome", headless: true });
const kok = new URL(ADRES).origin;
const sonuc = {};
let gecti = 0, kaldi = 0;
const ok = (ad, kosul, ek = "") => { if (kosul) { gecti++; console.log("  ✓", ad); } else { kaldi++; console.log("  ✗", ad, ek); } };

async function baglam(prestij) {
  const durum = JSON.parse(fs.readFileSync(OTURUM, "utf8"));
  durum.origins = (durum.origins || []).map((o) => ({ ...o, origin: kok,
    localStorage: [...(o.localStorage || []).filter((x) => !["bildim_dil", "bildim_tanitim"].includes(x.name)),
      { name: "bildim_dil", value: "tr" }, { name: "bildim_tanitim", value: "1" }] }));
  const b = await tarayici.newContext({ storageState: durum, viewport: { width: 390, height: 844 }, hasTouch: true, serviceWorkers: "block" });
  const s = await b.newPage();
  const konsol = [], kartlar = [];
  s.on("console", (m) => { if (m.type() === "error" && !/status of 40[04]/.test(m.text())) konsol.push(m.text().slice(0, 200)); });
  s.on("pageerror", (e) => konsol.push("SAYFA: " + String(e).slice(0, 200)));
  let duelloBitti = false;
  const jwtSub = (req) => { try { const t = (req.headers()["authorization"] || "").split(" ")[1]; return JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString()).sub; } catch { return null; } };
  await s.route(/\/rest\/v1\/rpc\//, async (r) => {
    const req = r.request(), u = req.url();
    const json = (veri) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(veri) });
    try {
      if (prestij && /\/rpc\/lig_grubum(\?|$)/.test(u)) return json(ligGrubu(jwtSub(req)));
      if (prestij && u.includes("/rpc/mac_sonu_ozet")) return json({ hazir: true, dokum: { toplam: { coin: 40 } }, gorevler: [], rozetler: [] });
      if (prestij && u.includes("/rpc/duello_durum")) return json(duelloDurum(jwtSub(req), duelloBitti));
      if (prestij && u.includes("/rpc/duello_giris")) return json({ durum: "aktif", rakip_geldi: true, kalan_sn: 0, baglanmayan: null });
      if (prestij && /\/rpc\/duello_(baglanti|terk|ara|kategori_sec|cevap)|kalp_at/.test(u)) return json(u.includes("baglanti") ? { kopuk: false } : null);
      if (u.includes("/rpc/oyuncu_kartlari")) {
        const y = await r.fetch(); let veri = await y.json();
        if (Array.isArray(veri)) {
          kartlar.push(...veri);
          if (prestij) {
            const istenen = JSON.parse(req.postData() || "{}").p_idler ?? [];
            veri = veri.map((k) => ({ ...k, avatar_prestij: true }));
            for (const id of istenen) if (!veri.some((k) => k.id === id) && id.startsWith("0d0e1100")) veri.push(yapayKart(id));   // taklit kimlikler
          }
        }
        return json(veri);
      }
      if (u.includes("/rpc/lig_grubum_ozet")) {
        const y = await r.fetch(); const veri = await y.json();
        for (const sat of veri?.satirlar ?? []) { kartlar.push(sat); if (prestij) sat.avatar_prestij = true; }
        return json(veri);
      }
      return r.continue();
    } catch { try { await r.continue(); } catch { /* sayfa kapandı */ } }
  });
  return { b, s, konsol, kartlar, bitir: () => { duelloBitti = true; } };
}

const kaydet = (s, ad) => s.screenshot({ path: path.join(CIKTI, `${ad}.png`), fullPage: false });
const bekle = (s, ms = 2500) => s.waitForTimeout(ms);
// Liste satırları gelene dek bekle (canlı istek + dev sunucusunun tembel parçaları ilk açılışta yavaş)
const avatarBekle = (s, en = 1) => s.waitForFunction((n) => document.querySelectorAll(".avatar").length >= n, en, { timeout: 20000 }).catch(() => {});

// ---------- 1) ÇERÇEVE (gerçek veri) ----------
{
  console.log("\n== Çerçeve (gerçek veri)");
  const { b, s, konsol, kartlar } = await baglam(false);
  await s.goto(`${ADRES}/siralama`, { waitUntil: "domcontentloaded" }); await bekle(s, 4000);
  await s.getByRole("tab", { name: /Dünya/ }).first().click().catch(() => s.getByText("Dünya", { exact: true }).first().click());
  await avatarBekle(s, 12); await bekle(s, 3000);
  await kaydet(s, "cerceve-dunya-siralamasi");
  const bos = kartlar.filter((k) => !k.cerceve);
  sonuc.cerceve = { okunan_kart: kartlar.length, cercevesiz: bos.length };
  ok(`çerçevesiz oyuncu yok (tarayıcının okuduğu ${kartlar.length} kart)`, kartlar.length > 0 && bos.length === 0, JSON.stringify(bos.slice(0, 3).map((k) => k.id ?? k.user_id)));
  ok("konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
  await b.close();
}

// ---------- 2) PRESTİJ (taklit: herkes prestijli) ----------
{
  console.log("\n== Prestij pırıltısı (taklit: herkes prestijli)");
  const { b, s, konsol, bitir } = await baglam(true);
  const sayfa = async (ad, yol, hazirla, beklenen = (o) => o.avatar > 0 && o.parla === o.avatar) => {
    if (yol) { await s.goto(`${ADRES}${yol}`, { waitUntil: "domcontentloaded" }); }
    await avatarBekle(s); await bekle(s, 5000);
    if (hazirla) await hazirla();
    const o = await s.evaluate(OLC); sonuc[ad] = o;
    ok(`${ad}: ${o.parla}/${o.avatar} avatarda pırıltı`, beklenen(o), o.parlasiz.join(" | "));
    ok(`${ad}: 390 px yatay taşma yok`, o.yatayTasma <= 0, String(o.yatayTasma));
    await kaydet(s, `prestij-${ad}`);
  };
  await sayfa("ana-sayfa", "/");
  await sayfa("profil", "/profil");
  await sayfa("lig-listesi", "/siralama");
  await sayfa("dunya-siralamasi", null, async () => {
    await s.getByRole("tab", { name: /Dünya/ }).first().click().catch(() => s.getByText("Dünya", { exact: true }).first().click());
    await avatarBekle(s, 12); await bekle(s, 3000);
  });
  await sayfa("duello-mac", `/duello/${DID}`);   // maç şeridi (MacUstSerit) + Düello v4 arena
  bitir();
  await sayfa("mac-sonu", null, async () => { await s.evaluate(() => document.dispatchEvent(new Event("visibilitychange"))); await bekle(s, 3500); });
  // Dükkân: ızgaradaki öteki avatarlar prestijli DEĞİL (doğru) → yalnız Prestij bölümünün önizlemesi ölçülür
  await sayfa("dukkan-avatar-prestij", "/joker?sekme=avatar", async () => {
    await s.locator(".qt-dc-prestij").first().scrollIntoViewIfNeeded().catch(() => {});
    await bekle(s, 600);
  }, (o) => o.avatar > 0);
  ok("Dükkân: Prestij bölümü var, önizlemesi pırıltılı", await s.locator(".qt-dc-prestij .avatar > .av-parla").count() >= 1);
  sonuc.dukkanDugme = await s.locator(".qt-dc-prestij button").first().innerText().catch(() => "");
  console.log("  · Prestij düğmesi:", JSON.stringify(sonuc.dukkanDugme));
  ok("konsol hatası yok", konsol.length === 0, konsol.slice(0, 3).join(" | "));
  await b.close();
}

await tarayici.close();
fs.writeFileSync(path.join(CIKTI, "olcum.json"), JSON.stringify(sonuc, null, 1));
console.log(`\nSONUÇ: ${gecti} geçti, ${kaldi} kaldı`);
process.exit(kaldi ? 1 : 0);
