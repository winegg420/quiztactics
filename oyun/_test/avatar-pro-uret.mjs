// Onaylanan profesyonel avatar bileşenlerini üretimde kullanılan statik SVG'lere çevirir.
// Kaynak: oyun/components/AvatarProIllustrations.jsx (31, public/avatars/pro)
//       + oyun/components/AvatarProIllustrations2.jsx (27 yeni, public/avatars/pro2 — katalog 520, kapalı başlar)
//       + oyun/components/AvatarProIllustrations3.jsx (12 yeni, yine public/avatars/pro2 — katalog 595, aktif=false başlar;
//         klasör aynı ki avatar_katalogu.url kısıtı `^/avatars/pro2/` değişmesin)

import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });

function yaz(liste, klasor) {
  const cikti = path.resolve(klasor);
  fs.mkdirSync(cikti, { recursive: true });
  for (const { anahtar, Bilesen } of liste) {
    const svg = renderToStaticMarkup(Bilesen({}))
      .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" ');
    fs.writeFileSync(path.join(cikti, `${anahtar}.svg`), `${svg}\n`, "utf8");
  }
  return liste.length;
}

try {
  const { AVATAR_PRO } = await vite.ssrLoadModule("/oyun/components/AvatarProIllustrations.jsx");
  const { AVATAR_PRO2 } = await vite.ssrLoadModule("/oyun/components/AvatarProIllustrations2.jsx");
  console.log(`Üretilen profesyonel avatar: ${yaz(AVATAR_PRO, "public/avatars/pro")}`);
  console.log(`Üretilen yeni avatar (pro2): ${yaz(AVATAR_PRO2, "public/avatars/pro2")}`);
  const { AVATAR_PRO3 } = await vite.ssrLoadModule("/oyun/components/AvatarProIllustrations3.jsx");
  console.log(`Üretilen 3. set avatar (pro2 klasörü): ${yaz(AVATAR_PRO3, "public/avatars/pro2")}`);
} finally {
  await vite.close();
}
