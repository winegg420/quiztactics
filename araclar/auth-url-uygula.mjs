// Supabase Auth URL ayarları: Site URL + izinli yönlendirme listesi (Management API).
//
//   yedek + ekle: node araclar/auth-url-uygula.mjs --yedek=docs/auth-url-yedek-20261014.json --site=https://quiztactics.com --ekle=https://quiztactics.com/**,https://www.quiztactics.com/**
//   geri alma:    node araclar/auth-url-uygula.mjs --geri=docs/auth-url-yedek-20261014.json
//
// Belirteç SUPABASE_PAT ortam değişkeninden (Kimlik Yöneticisi; hiçbir yere yazılmaz). Listeden adres SİLİNMEZ,
// yalnız eksik olan eklenir. Uygulamadan sonra yeniden okunup doğrulanır.
import fs from "node:fs";

const REF = "etezccrifaetzrgfvawl";
const ARG = Object.fromEntries(process.argv.slice(2).map((a) => { const i = a.indexOf("="); return [a.slice(2, i), a.slice(i + 1)]; }));
if (!process.env.SUPABASE_PAT) { console.error("SUPABASE_PAT yok"); process.exit(1); }
const adres = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const baslik = { Authorization: `Bearer ${process.env.SUPABASE_PAT}`, "Content-Type": "application/json" };
const liste = (s) => String(s ?? "").split(",").map((x) => x.trim()).filter(Boolean);

async function oku() {
  const r = await fetch(adres, { headers: baslik });
  if (!r.ok) throw new Error(`GET ${r.status}`);
  const t = await r.json();
  return { site_url: t.site_url, uri_allow_list: t.uri_allow_list ?? "" };
}

try {
  const once = await oku();
  console.log("ÖNCE  site_url:", once.site_url);
  console.log("ÖNCE  uri_allow_list:", liste(once.uri_allow_list).join(" | "));
  let hedef;
  if (ARG.geri) {
    hedef = JSON.parse(fs.readFileSync(ARG.geri, "utf8"));
  } else {
    if (ARG.yedek) {
      if (fs.existsSync(ARG.yedek)) throw new Error("yedek dosyası zaten var, üzerine yazılmaz: " + ARG.yedek);
      fs.writeFileSync(ARG.yedek, JSON.stringify({ ...once, alindi: new Date().toISOString() }, null, 2) + "\n");
      console.log("yedek yazıldı:", ARG.yedek);
    }
    const mevcut = liste(once.uri_allow_list);
    const yeni = [...mevcut, ...liste(ARG.ekle).filter((x) => !mevcut.includes(x))];
    hedef = { site_url: ARG.site || once.site_url, uri_allow_list: yeni.join(",") };
  }
  const govde = { site_url: hedef.site_url, uri_allow_list: hedef.uri_allow_list };
  if (govde.site_url === once.site_url && govde.uri_allow_list === once.uri_allow_list) {
    console.log("değişiklik yok");
  } else {
    const r = await fetch(adres, { method: "PATCH", headers: baslik, body: JSON.stringify(govde) });
    if (!r.ok) throw new Error(`PATCH ${r.status}: ${(await r.text()).slice(0, 200)}`);
  }
  // PATCH sonrası ilk okuma eski değeri dönebiliyor: 4 sn arayla en çok 3 deneme
  let son = null;
  for (let i = 0; i < 3; i++) {
    await new Promise((c) => setTimeout(c, 4000));
    son = await oku();
    if (son.site_url === govde.site_url && son.uri_allow_list === govde.uri_allow_list) break;
  }
  console.log("SONRA site_url:", son.site_url);
  console.log("SONRA uri_allow_list:", liste(son.uri_allow_list).join(" | "));
  const tamam = son.site_url === govde.site_url && son.uri_allow_list === govde.uri_allow_list;
  console.log(tamam ? "✓ doğrulandı" : "✗ eşleşmedi");
  process.exit(tamam ? 0 : 1);
} catch (e) {
  console.error("[auth-url] başarısız:", e?.message ?? e);
  process.exit(1);
}
