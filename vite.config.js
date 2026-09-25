import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

// ============================================================
// TEK SİTE — Quiz Tactics
//
// Bu depo eskiden İKİ Vercel projesini besliyordu (idaGG Game Center hub +
// Quiz Tactics) ve ayrımı `VITE_MOD` yapıyordu. Quiz Tactics kendi deposuna
// taşındı; `VITE_MOD` ve moda bağlı bütün dallanmalar kalktı.
//
// Site kimliği (başlık, paylaşım kartları, manifest, ikon) artık `index.html`
// içinde STATİK duruyor — derleme sırasında hiçbir şey değiştirilmiyor.
// Aşağıdaki eklentinin tek işi, adrese bağlı olduğu için elle yazılamayan iki
// dosyayı üretmek: robots.txt ve sitemap.xml.
// ============================================================
function yayinDosyalari(siteUrl) {
  return {
    name: "yayin-dosyalari",
    apply: "build",
    writeBundle(secenekler) {
      const kok = secenekler.dir || "dist";
      const yaz = (ad, icerik) => {
        try {
          fs.writeFileSync(path.join(kok, ad), icerik);
        } catch (e) {
          this.warn(`${ad} yazılamadı: ${e.message}`);
        }
      };

      yaz(
        "robots.txt",
        "User-agent: *\nAllow: /\n" + (siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : "")
      );

      // sitemap.xml — yalnız giriş gerektirmeyen adresler
      if (siteUrl) {
        const yollar = [["/", "1.0"], ["/gizlilik", "0.3"], ["/kosullar", "0.3"]];
        yaz(
          "sitemap.xml",
          '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
            yollar
              .map(([y, p]) => `  <url><loc>${siteUrl}${y}</loc><priority>${p}</priority></url>`)
              .join("\n") +
            "\n</urlset>\n"
        );
      } else {
        // Adres bilinmiyorsa yanlış bir sitemap yayınlamaktansa hiç yayınlama.
        try {
          fs.rmSync(path.join(kok, "sitemap.xml"), { force: true });
        } catch {
          /* yoksa sorun değil */
        }
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), ""), ...process.env };
  // Yayın adresi. VITE_SITE_URL verilmezse bu kullanılır; robots/sitemap
  // "adres bilinmiyor" diye boş kalmasın.
  //
  // DİKKAT — burada ÇALIŞAN bir adres olmalı. Bir süre `quizsquare.app`
  // yazıyordu ama o alan adı hiç alınmamıştı (nslookup: NXDOMAIN) ve sitemap
  // var olmayan bir adresi duyuruyordu. Gerçek alan adı (quiztactics.com)
  // alınınca hem burası hem Vercel'deki VITE_SITE_URL güncellenmeli.
  const VARSAYILAN_SITE = "https://quiztactics.vercel.app";
  const siteUrl = (env.VITE_SITE_URL || VARSAYILAN_SITE).replace(/\/+$/, "");

  return {
    plugins: [react(), yayinDosyalari(siteUrl)],

    build: {
      // ============================================================
      // DERLEME HEDEFİ — iPhone'larda beyaz ekranın sebebi buydu.
      //
      // Vite'ın varsayılan hedefi "modules" = safari14. Bu yüzden paketlere
      // `?.` (optional chaining) ve `??` HAM olarak yazılıyordu (canlı pakette
      // ölçüldü: 12.693 adet `?.`, 27 adet `??`). Bu iki sözdizimi Safari
      // 13.1 ile geldi; iOS 13.3 ve altındaki iPhone'lar dosyayı AYRIŞTIRAMIYOR
      // ve uygulama hiç çalışmadan BEMBEYAZ SAYFA çıkıyor. Hata konsola bile
      // düşmüyor çünkü kod hiç çalışmıyor.
      //
      // safari12 = iOS 12.2 (iPhone 5s/6 dahil hâlâ ayakta olan en eski cihazlar).
      // esbuild bu hedefte `?.`, `??`, sınıf alanları ve mantıksal atamaları
      // aşağı çeviriyor. Kullanılan çalışma-zamanı API'lerinin hepsi iOS 12.2'de
      // var (globalThis, Object.fromEntries, queueMicrotask); daha yenileri
      // (BroadcastChannel, ResizeObserver) zaten korumalı çağrılıyor.
      //
      // DEĞİŞTİRME: hedefi yükseltmek eski iPhone'ları yeniden dışarı atar.
      // `npm run uyumluluk` bunu her derlemede denetliyor.
      target: ["es2019", "safari12", "chrome64", "firefox67", "edge79"],
      cssTarget: ["safari12", "chrome64", "firefox67", "edge79"],

      rollupOptions: {
        // ============================================================
        // GİRİŞ NOKTALARI — DÖRT TANE, DOKUNMA
        //
        // `index.html` oyunun kendisi; diğer üçü `oyun/avatar3d/` altındaki
        // ayrı sayfalardır (atölye, meydan denemesi, gardırop). Bu liste
        // bozulursa o üç sayfa derlemeye GİRMEZ ve canlıdan SİLİNİR: istekler
        // SPA kabuğuna düşer, sayfa yokmuş gibi davranır. 12 Eylül 2026'da tam
        // olarak bu oldu.
        //
        // Üç sayfa bugün DONDURULMUŞ durumda (Paket 17 §D) — açılınca
        // `/gorunum`'a yönlendiriyorlar — ama dosyalar ve giriş listesi
        // duruyor; geri açmak tek satırlık iş.
        //
        // BU LİSTE `vercel.json`'A TAŞINMAZ. Derlemeye ait her şey burada.
        // ============================================================
        input: {
          oyun: "index.html",
          atolye: "oyun/avatar3d/index.html",
          meydan: "oyun/avatar3d/meydan.html",
          gardrop: "oyun/avatar3d/gardrop.html",
        },

        output: {
          // Satıcı kodunu ayır: uygulama her deploy'da değişse de bu parçalar
          // tarayıcı önbelleğinde kalır; ilk açılışta indirilen paket küçülür.
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("react-router")) return "router";
            // Sentry (VITE_SENTRY_DSN doluyken dinamik import): yolunda "/react/" geçtiği için aşağıdaki react kuralına
            // düşüp ilk açılış paketini ~190 KB → ~690 KB şişiriyordu. Kendi parçası: yalnız DSN varken, ateşle-unut yüklenir.
            if (id.includes("@sentry")) return "sentry";
            if (
              id.includes("/react/") ||
              id.includes("/react-dom/") ||
              id.includes("scheduler")
            ) {
              return "react";
            }
            if (
              id.includes("@supabase") ||
              id.includes("postgrest") ||
              id.includes("realtime-js") ||
              id.includes("gotrue") ||
              id.includes("storage-js") ||
              id.includes("functions-js")
            ) {
              return "supabase";
            }
            // Geri kalan satıcı kodu Rollup'un kendi bölmesinde kalır: lazy
            // yüklenen ağır bağımlılıklar (three.js gibi) ilk açılış paketine
            // sızmasın.
            return undefined;
          },
        },
      },
    },
  };
});
