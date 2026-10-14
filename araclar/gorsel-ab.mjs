// İki derlemenin (A = önce, B = sonra) aynı ekranlarda GÖRSEL karşılaştırması — 390×844, aynı oturum, hareket azaltılmış.
// Ekranlar: ana · modlar · lig · dükkân · profil + Ortak Hazine maç sonu (TAKLİT: kasa_durum 'bitti' + mac_sonu_ozet; canlıya
// yazmaz). Her ekranın A/B görüntüsü ve piksel fark oranı (kanal farkı > 24 olan piksel %) yazılır; saat/sayaç gibi canlı
// metin küçük fark üretir. Çıktı: tasarim/gorsel-ab/<etiket>/<ekran>-{a,b,fark}.png + sonuc.json
//   node araclar/gorsel-ab.mjs --a=http://localhost:5197 --b=http://localhost:5199 --oturum=<dosya> --etiket=css
import { chromium } from "playwright-core";
import fs from "node:fs";
import path from "node:path";

const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const ham = JSON.parse(fs.readFileSync(path.resolve(String(ARG.oturum)), "utf8"));
const CIKTI = path.resolve("tasarim/gorsel-ab", String(ARG.etiket || "ab")); fs.mkdirSync(CIKTI, { recursive: true });
const KASA_ID = "0b6f6800-0000-4000-8000-00000000c0de", RAKIP = "0b6f6800-0000-4000-8000-0000000000aa";
const EKRANLAR = [["ana", "/"], ["modlar", "/modlar"], ["lig", "/siralama"], ["dukkan", "/joker"], ["profil", "/profil"], ["hazine-son", `/kasa/${KASA_ID}`]];
const sub = (req) => { try { return JSON.parse(Buffer.from((req.headers().authorization || "").split(" ")[1].split(".")[1], "base64url").toString()).sub; } catch { return null; } };
const bitti = (ben) => {
  const o = (id, ad, puan) => ({ id, gorunen_ad: ad, gorunen_avatar: id === RAKIP ? "/avatars/pro2/basortulu-y04.svg" : null, gorunum: null, unvan: null, puan, acma: 3 });
  return { id: KASA_ID, durum: "bitti", faz: "sonuc", dereceli: true, ben, tur: 20, max_tur: 36, hedef: 80, altin: false, kasa: 0, sahip: null, tavan: 80, devam_carpan: 2,
    kazanan: ben, sonuc_neden: "hedef", terk: { ben: false, rakip: false }, oyuncular: [o(ben, "Sen", 82), o(RAKIP, "Deniz Yıldırımoğlu", 54)], sunucu_zamani: new Date().toISOString(),
    sureler: { soru: 15, karar: 5, sonuc: 3, nabiz: 10, kopuk: 15, gosterim_payi_ms: 2000, gosterim_bas: null }, gecmis: [], soru: null, cevap: null, sonuc: null, karar: null, son_karar: null, kopuk: null };
};
const OZET = (ben) => ({ kaynak: `kasa:${KASA_ID}`, hazir: true, bitti: true, kazanan: ben, terk: { ben: false, rakip: false, edenler: [] },
  dokum: { hazir: true, kalemler: [{ kalem: "galibiyet", lig: 25, coin: 30, detay: {} }], rozetler: [], toplam: { lig: 25, coin: 30 }, gorevler: [] },
  level: { hazir: true, xp: 30, level_once: 3, level_sonra: 3, level: 3, level_xp: 40, level_gereken: 65, indirim: null, oynamadi: false, level_coin: 0, rutbe_coin: 0, skiller: [] },
  lig: { puan: 25 }, rozetler: [], gorevler: [], haftalik_gorevler: [], ort_cevap: { ben: 6200, rakip: 8100 } });

const t = await chromium.launch({ channel: "chrome", headless: true });
const sonuc = {};
try {
  for (const [ad, yol] of EKRANLAR) {
    const resim = {};
    for (const [taraf, adres] of [["a", ARG.a], ["b", ARG.b]]) {
      const b = await t.newContext({ storageState: { ...ham, origins: ham.origins.map((x) => ({ ...x, origin: new URL(adres).origin })) }, viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1, reducedMotion: "reduce", serviceWorkers: "block", locale: "tr-TR" });
      const s = await b.newPage();
      if (ad === "hazine-son") {
        await s.route(/\/rest\/v1\/rpc\/(kasa_|mac_sonu_ozet)/, (r) => {
          const u = r.request().url(); const j = (v, st = 200) => r.fulfill({ status: st, contentType: "application/json", body: JSON.stringify(v) });
          if (u.includes("kasa_durum")) return j(bitti(sub(r.request())));
          if (u.includes("mac_sonu_ozet")) return j(OZET(sub(r.request())));
          if (u.includes("kasa_aktif_benim")) return j([]);
          return j({ message: "taklit" }, 400);
        });
      }
      await s.goto(adres + yol, { waitUntil: "domcontentloaded" });
      await s.waitForTimeout(ad === "hazine-son" ? 9000 : 6000);
      await s.addStyleTag({ content: "*{caret-color:transparent!important}" });
      resim[taraf] = await s.screenshot();
      fs.writeFileSync(path.join(CIKTI, `${ad}-${taraf}.png`), resim[taraf]);
      await b.close();
    }
    const p = await t.newPage();
    const r = await p.evaluate(async ([a, b]) => {
      const y = async (x) => { const i = new Image(); i.src = "data:image/png;base64," + x; await i.decode(); const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d"); g.drawImage(i, 0, 0); return [g.getImageData(0, 0, c.width, c.height), c]; };
      const [A, c] = await y(a), [B] = await y(b); const F = c.getContext("2d").createImageData(A.width, A.height); let n = 0;
      for (let i = 0; i < A.data.length; i += 4) { const d = Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2]));
        if (d > 24) { n++; F.data[i] = 255; F.data[i + 3] = 255; } else { F.data[i] = F.data[i + 1] = F.data[i + 2] = A.data[i] * 0.3 + 160; F.data[i + 3] = 255; } }
      c.getContext("2d").putImageData(F, 0, 0);
      return { yuzde: +(100 * n / (A.data.length / 4)).toFixed(2), fark: c.toDataURL("image/png").split(",")[1] };
    }, [resim.a.toString("base64"), resim.b.toString("base64")]);
    fs.writeFileSync(path.join(CIKTI, `${ad}-fark.png`), Buffer.from(r.fark, "base64"));
    sonuc[ad] = r.yuzde;
    console.log(`${ad.padEnd(11)} fark %${r.yuzde}`);
    await p.close();
  }
  fs.writeFileSync(path.join(CIKTI, "sonuc.json"), JSON.stringify(sonuc, null, 2));
} finally { await t.close(); }
