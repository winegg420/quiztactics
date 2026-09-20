// Onaylanan profesyonel avatar bileşenlerini üretimde kullanılan statik SVG'lere çevirir.
// Kaynak: oyun/components/AvatarProIllustrations.jsx

import fs from "node:fs";
import path from "node:path";
import { createServer } from "vite";
import { renderToStaticMarkup } from "react-dom/server";

const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });

try {
  const { AVATAR_PRO } = await vite.ssrLoadModule("/oyun/components/AvatarProIllustrations.jsx");
  const cikti = path.resolve("public/avatars/pro");
  fs.mkdirSync(cikti, { recursive: true });

  for (const { anahtar, Bilesen } of AVATAR_PRO) {
    const svg = renderToStaticMarkup(Bilesen({}))
      .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" ');
    fs.writeFileSync(path.join(cikti, `${anahtar}.svg`), `${svg}\n`, "utf8");
  }

  console.log(`Üretilen profesyonel avatar: ${AVATAR_PRO.length}`);
} finally {
  await vite.close();
}
