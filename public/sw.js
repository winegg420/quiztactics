/* Bildim! service worker — kurulabilirlik + çevrimdışı kabuk (D-122) + push bildirimleri */

// D-122: Eskiden fetch olayı boştu → çevrimdışıyken sayfa yenilenince tarayıcının kendi hata
// sayfası (dinozor) çıkıyordu. Şimdi:
//   · gezinme (sayfa yenileme/açma): ağ öncelikli; ağ yoksa önbellekteki uygulama kabuğu (index.html)
//     açılır → oyunun kendi "Bağlantı yok" şeridi çalışır. Kabuk önbelleği hiç yoksa satır içi
//     "Bağlantı yok" sayfası (asla tarayıcı hata sayfası değil).
//   · /assets/* (içeriğe göre adlandırılmış, değişmez JS/CSS/görsel): önbellek öncelikli.
//   · diğer aynı kökenli statik dosyalar (avatar svg, ikon, font): ağ öncelikli, çevrimdışıysa önbellek.
//   · Supabase / başka köken, POST ve Range istekleri OLDUĞU GİBİ ağa gider (dokunulmaz).
const KABUK = "qt-kabuk-v1";
const VARLIK = "qt-varlik-v1";
const VARLIK_SINIR = 400;
const STATIK = /.(?:svg|png|jpe?g|webp|gif|ico|woff2?|css|js|json|glb)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    try {
      const c = await caches.open(KABUK);
      await c.add(new Request("/", { cache: "reload" }));
    } catch {
      // kurulum çevrimdışıysa kabuk ilk başarılı gezinmede önbelleğe alınır
    }
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    try {
      const adlar = await caches.keys();
      await Promise.all(adlar.filter((a) => a !== KABUK && a !== VARLIK).map((a) => caches.delete(a)));
    } catch { /* önemli değil */ }
    await self.clients.claim();
  })());
});

const CEVRIMDISI_SAYFA = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Quiz Tactics</title>
<style>body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#eaf3ff;color:#1d2152;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-size:22px;margin:0 0 8px}p{margin:0 0 20px;font-size:16px}button{min-height:48px;padding:0 28px;border:0;border-radius:24px;background:#ff8a1f;color:#fff;font:700 16px system-ui,sans-serif}</style></head>
<body><main><h1 data-t>Bağlantı yok</h1><p data-t>İnternetin gelince oyun kaldığı yerden devam eder.</p><button data-t onclick="location.reload()">Tekrar dene</button></main>
<script>if(!/^tr/i.test(navigator.language||"")){var t=["No connection","The game picks up again as soon as you're back online.","Try again"];document.documentElement.lang="en";document.querySelectorAll("[data-t]").forEach(function(e,i){e.textContent=t[i]})}</script></body></html>`;

async function sinirla(cache) {
  try {
    const anahtarlar = await cache.keys();
    for (let i = 0; i < anahtarlar.length - VARLIK_SINIR; i++) await cache.delete(anahtarlar[i]);
  } catch { /* önemli değil */ }
}

async function gezinme(istek) {
  try {
    const cevap = await fetch(istek);
    const url = new URL(istek.url);
    // Uygulama kabuğu ("/" → index.html); dondurulmuş ayrı .html girişleri kabuk olarak saklanmaz.
    if (cevap.ok && cevap.type === "basic" && !url.pathname.endsWith(".html")
        && (cevap.headers.get("content-type") || "").includes("text/html")) {
      const kopya = cevap.clone();
      caches.open(KABUK).then((c) => c.put("/", kopya)).catch(() => {});
    }
    return cevap;
  } catch {
    const kabuk = await caches.match("/", { cacheName: KABUK });
    return kabuk || new Response(CEVRIMDISI_SAYFA, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

async function onbellekOnce(istek) {
  const bulunan = await caches.match(istek, { cacheName: VARLIK });
  if (bulunan) return bulunan;
  const cevap = await fetch(istek);
  if (cevap.ok && cevap.type === "basic") {
    const c = await caches.open(VARLIK);
    await c.put(istek, cevap.clone());
    sinirla(c);
  }
  return cevap;
}

async function agOnce(istek) {
  try {
    const cevap = await fetch(istek);
    if (cevap.ok && cevap.type === "basic") {
      const c = await caches.open(VARLIK);
      c.put(istek, cevap.clone()).then(() => sinirla(c)).catch(() => {});
    }
    return cevap;
  } catch (e) {
    const bulunan = await caches.match(istek, { cacheName: VARLIK });
    if (bulunan) return bulunan;
    throw e;
  }
}

self.addEventListener("fetch", (event) => {
  const istek = event.request;
  if (istek.method !== "GET" || istek.headers.has("range")) return;
  const url = new URL(istek.url);
  if (url.origin !== self.location.origin || url.pathname === "/sw.js") return;
  if (istek.mode === "navigate") { event.respondWith(gezinme(istek)); return; }
  if (url.pathname.startsWith("/assets/")) { event.respondWith(onbellekOnce(istek)); return; }
  if (STATIK.test(url.pathname)) event.respondWith(agOnce(istek));
});

// Push bildirimleri
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let veri = {};
  try {
    veri = event.data.json();
  } catch {
    veri = { baslik: "Quiz Tactics", govde: event.data.text() };
  }
  event.waitUntil(
    self.registration.showNotification(veri.baslik ?? "Quiz Tactics", {
      body: veri.govde ?? "",
      icon: "/bildim-icon-192.png",
      badge: "/bildim-icon-192.png",
      data: { url: veri.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((pencereler) => {
      for (const p of pencereler) {
        if ("focus" in p) {
          p.navigate(url);
          return p.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
