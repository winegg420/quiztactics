/* Bildim! service worker — kurulabilirlik + çevrimdışı kabuk (D-122) + push bildirimleri */

// D-122: Eskiden fetch olayı boştu → çevrimdışıyken sayfa yenilenince tarayıcının kendi hata
// sayfası (dinozor) çıkıyordu. Şimdi:
//   · gezinme (sayfa yenileme/açma): ağ öncelikli; ağ yoksa önbellekteki uygulama kabuğu (index.html)
//     açılır → oyunun kendi "Bağlantı yok" şeridi çalışır. Kabuk önbelleği hiç yoksa satır içi
//     "Bağlantı yok" sayfası (asla tarayıcı hata sayfası değil).
//   · /assets/* (içeriğe göre adlandırılmış, değişmez JS/CSS/görsel): önbellek öncelikli.
//   · diğer aynı kökenli statik dosyalar (avatar svg, ikon, font): ağ öncelikli, çevrimdışıysa önbellek.
//   · Supabase / başka köken, POST ve Range istekleri OLDUĞU GİBİ ağa gider (dokunulmaz).
//   · TEK İSTİSNA — müzik parçaları (2 Eki 2026, Supabase önbellekli egress kotası): …/muzik/<ad>-<sha>.aac
//     cihazda KALICI önbelleğe alınır. Ad içerik sürümlü olduğundan dosya adı değişmedikçe bir daha
//     inmez. <audio> Range ister; tam dosya BİR kez (Range'siz) indirilir, sonraki her istek
//     (Range dahil) önbellekten 206 dilimiyle cevaplanır. Yarıda bırakılan parça da önbelleğe girer.
//     Herhangi bir hata → istek olduğu gibi ağa gider (eski davranış).
//   · Aynı desen /ses-secim adayları için (8 Eki 2026): Storage `ses-adaylar` kovası
//     …/ses-adaylar/<ad>-<sha>.(wav|mp3|aac) ayrı önbellekte (qt-ses-aday-v1) kalıcı tutulur.
const KABUK = "qt-kabuk-v20";
const VARLIK = "qt-varlik-v20";
const VARLIK_SINIR = 400;
// Müzik önbelleğinin sürümü kabukla birlikte ARTIRILMAZ (artarsa bütün parçalar yeniden iner).
const MUZIK = "qt-muzik-v1";
// Anahtar = parçanın TAM ADRESİ (dosya adı). /ses-secim'de seçim değişince yeni dosya adı önbellekte
// yoktur → indirilir; eski parça kendi adıyla kalır ama bir daha istenmez ve sınır aşılınca EN ESKİ
// silinir. Sınır = en büyük çalma listesi (3 oda × 4 parça) + pay.
const MUZIK_SINIR = 14;
// Supabase Storage `muzik` kovası ya da aynı kökenli /muzik/ (taban adres: oyun/lib/muzikParcalari.js › KOVA).
const MUZIK_YOL = /(?:^|\/storage\/v1\/object\/public)\/muzik\/(?:[^/]+\/)?[^/]+-[0-9a-f]{10}\.aac$/i;
// Ses adayları (efektler + eski müziklerin 30 sn önizlemesi; taban adres: oyun/lib/sesAdayKova.js › KOVA).
// Sürümü ARTIRILMAZ (ad içerik sürümlü). Sınır = seçili efektler + /ses-secim'de dinlenenler için pay.
const ADAY = "qt-ses-aday-v1";
const ADAY_SINIR = 60;
const ADAY_YOL = /\/storage\/v1\/object\/public\/ses-adaylar\/[^/]+-[0-9a-f]{10}\.(?:wav|mp3|aac)$/i;
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
      await Promise.all(adlar.filter((a) => a !== KABUK && a !== VARLIK && a !== MUZIK && a !== ADAY).map((a) => caches.delete(a)));
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

// ---------- müzik: kalıcı önbellek + Range ----------
const muzikInen = new Map();   // adres → süren indirme (aynı parça aynı anda iki kez inmesin)

/** Parçanın tamamı: önbellekte varsa oradan, yoksa ağdan BİR kez (Range'siz) indirip önbelleğe yazar.
 *  `ad`/`sinir`: hangi önbellek (müzik ya da ses adayları) ve en çok kaç dosya. */
async function muzikTam(adres, ad = MUZIK, sinir = MUZIK_SINIR) {
  let cache = null;
  try {
    cache = await caches.open(ad);
    const bulunan = await cache.match(adres);
    if (bulunan) return { blob: await bulunan.blob(), tur: bulunan.headers.get("content-type") || "audio/aac" };
  } catch { /* önbellek kullanılamıyor (özel mod, kota) → ağdan */ }
  let is = muzikInen.get(adres);
  if (!is) {
    is = (async () => {
      const cevap = await fetch(adres, { mode: "cors", credentials: "omit" });
      if (cevap.status !== 200 || cevap.type === "opaque") return null;
      const tur = cevap.headers.get("content-type") || "audio/aac";
      const blob = await cevap.blob();
      if (!blob.size) return null;
      try {
        if (cache) {
          await cache.put(adres, new Response(blob, { status: 200, headers: { "Content-Type": tur, "Content-Length": String(blob.size) } }));
          const anahtarlar = await cache.keys();
          for (let i = 0; i < anahtarlar.length - sinir; i++) await cache.delete(anahtarlar[i]);
        }
      } catch { /* kota doldu → bu seferlik bellekten çalar */ }
      return { blob, tur };
    })().finally(() => muzikInen.delete(adres));
    muzikInen.set(adres, is);
  }
  return is;
}

/** Tam dosyadan cevap: Range yoksa 200, varsa 206 dilimi (geçersiz aralık 416). */
function muzikCevap(tam, range) {
  const boy = tam.blob.size;
  const ortak = { "Content-Type": tam.tur, "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable" };
  if (!range) return new Response(tam.blob, { status: 200, headers: { ...ortak, "Content-Length": String(boy) } });
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  let bas = -1;
  let son = boy - 1;
  if (m && m[1] !== "") {
    bas = Number(m[1]);
    if (m[2] !== "") son = Math.min(Number(m[2]), boy - 1);
  } else if (m && m[2] !== "") {
    bas = Math.max(0, boy - Number(m[2]));   // "bytes=-N": son N bayt
  }
  if (bas < 0 || bas >= boy || bas > son) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${boy}` } });
  return new Response(tam.blob.slice(bas, son + 1, tam.tur), {
    status: 206,
    headers: { ...ortak, "Content-Range": `bytes ${bas}-${son}/${boy}`, "Content-Length": String(son - bas + 1) },
  });
}

async function muzik(istek, ad = MUZIK, sinir = MUZIK_SINIR) {
  try {
    const tam = await muzikTam(istek.url.split("#")[0], ad, sinir);
    if (tam) return muzikCevap(tam, istek.headers.get("range"));
  } catch { /* aşağıda ağa düş */ }
  return fetch(istek);
}

self.addEventListener("fetch", (event) => {
  const istek = event.request;
  if (istek.method !== "GET") return;
  const url = new URL(istek.url);
  if (MUZIK_YOL.test(url.pathname) && (url.origin === self.location.origin || istek.mode === "cors")) {
    event.respondWith(muzik(istek));
    return;
  }
  if (ADAY_YOL.test(url.pathname) && istek.mode === "cors") {
    event.respondWith(muzik(istek, ADAY, ADAY_SINIR));
    return;
  }
  if (istek.headers.has("range")) return;
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
