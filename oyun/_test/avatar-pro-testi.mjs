import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const avatarlar = [
  "kedi-k01", "panda-k05", "dinozor-k10", "robot-k15", "uzayli-k16",
  "astronot-k17", "korsan-k19", "asci-k23", "profesor-k24", "kahraman-k29",
];
const adresler = avatarlar.map((ad) => `/avatars/pro/${ad}.svg`);

for (const dosya of [
  "oyun/components/KurulumSihirbazi.jsx",
  "oyun/components/ProfilAyarlari.jsx",
]) {
  const kaynak = fs.readFileSync(dosya, "utf8");
  const bulunan = [...kaynak.matchAll(/url: "(\/avatars\/pro\/[^"]+)"/g)].map((eslesme) => eslesme[1]);
  assert.deepEqual(bulunan, adresler, `${dosya}: resmi avatar listesi farklı`);
  assert.doesNotMatch(kaynak, /url: "\/avatars\/k\d{2}[.]svg"/, `${dosya}: eski avatar hâlâ seçilebilir`);
}

for (const ad of avatarlar) {
  const dosya = path.join("public", "avatars", "pro", `${ad}.svg`);
  assert.ok(fs.existsSync(dosya), `${dosya}: üretilmedi`);
  const svg = fs.readFileSync(dosya, "utf8").trim();
  assert.match(svg, /^<svg\b[^>]*xmlns="http:\/\/www[.]w3[.]org\/2000\/svg"/);
  assert.match(svg, /viewBox="0 0 320 320"/);
  assert.match(svg, /<\/svg>$/);
}

const migration = fs.readFileSync("supabase/migrations/20260612000256_profesyonel_avatar_seti.sql", "utf8");
for (const adres of adresler) assert.ok(migration.includes(`'${adres}'`), `RPC listesinde yok: ${adres}`);
assert.match(migration, /where avatar_url ~ '\^\/avatars\/k\(\[0-9\]\{2\}\)\[\.\]svg\$'/);
assert.match(migration, /if left\(v_url, 1\) = '\/' and v_url not in/);

console.log("Profesyonel avatar testleri: 10/10 geçti");
