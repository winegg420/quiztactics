// Müzik adaylarının TAM parçaları — Supabase Storage `muzik` kovası (Ajan M, 24 Eyl 2026; migration 450).
// Site dağıtımına (public/) GİRMEZ: oyun o an çalan parçayı buradan akış olarak çalar, tarayıcı
// önbelleğe alır (yükleme cacheControl = 1 yıl; ad içerik sürümlü → dosya değişirse ad da değişir).
// Yalnız tembel parçalar içe aktarır (sesArkaPlan.js, /ses-secim) — ana pakete girmez.
// Yeni parça: public/ses/adaylar/KAYNAKLAR.md › "Tam parça eklemek".

/** Aday id → [kovadaki tam parça (AAC/ADTS 96 kbps stereo 44,1 kHz), gerçek süre sn].
 *  Süre burada çünkü ADTS'de tarayıcının `duration`'ı bit hızından TAHMİN (±%2; iOS'ta Infinity
 *  olabilir) — çapraz geçiş bu süreye göre başlar, `ended` yedek. */
const TAM = {
  "muzik_menu-1": ["muzik_menu-1-00b7cbbffc.aac", 60.0],
  "muzik_menu-2": ["muzik_menu-2-da1e34412b.aac", 91.7],
  "muzik_menu-3": ["muzik_menu-3-e6989a6dba.aac", 38.2],
  "muzik_menu-4": ["muzik_menu-4-8ad3422de3.aac", 38.8],
  "muzik_menu-5": ["muzik_menu-5-fdcb9e5d7a.aac", 128.5],
  "muzik_menu-6": ["muzik_menu-6-ad69cce2bd.aac", 160.8],
  "muzik_menu-7": ["muzik_menu-7-415a1e1ab0.aac", 138.0],
  "muzik_menu-8": ["muzik_menu-8-f6624186fe.aac", 108.5],
  "muzik_menu-9": ["muzik_menu-9-55b4b46494.aac", 90.4],
  "muzik_mac-1": ["muzik_mac-1-7e81974418.aac", 72.8],
  "muzik_mac-2": ["muzik_mac-2-4e49524334.aac", 41.5],
  "muzik_mac-3": ["muzik_mac-3-ac1aebca93.aac", 76.2],
  "muzik_mac-4": ["muzik_mac-4-bd9cc8c4d3.aac", 57.5],
  "muzik_mac-5": ["muzik_mac-5-8258198fe7.aac", 273.3],
  "muzik_mac-6": ["muzik_mac-6-f26b079cc8.aac", 126.6],
  "muzik_mac-7": ["muzik_mac-7-da53f437f2.aac", 205.7],
  "muzik_mac-8": ["muzik_mac-8-4f7a0256fb.aac", 170.0],
  "muzik_mac-9": ["muzik_mac-9-687856b91e.aac", 65.6],
  "muzik_turnuva-1": ["muzik_turnuva-1-ebfe7d4a31.aac", 65.8],
  "muzik_turnuva-2": ["muzik_turnuva-2-7aa9bad671.aac", 122.9],
  "muzik_turnuva-3": ["muzik_turnuva-3-41de97da12.aac", 169.0],
  "muzik_turnuva-4": ["muzik_turnuva-4-55151e6555.aac", 83.1],
};

/** Yeni adayların 30 sn önizlemesi de kovada (public/'e girmesin diye). Eski adaylarınki public/ses/adaylar/. */
const ONIZLEME = {
  "muzik_menu-5": "onizleme/muzik_menu-5-0c5857b973.aac",
  "muzik_menu-6": "onizleme/muzik_menu-6-9ec8ae0fe0.aac",
  "muzik_menu-7": "onizleme/muzik_menu-7-bc92dfbc33.aac",
  "muzik_menu-8": "onizleme/muzik_menu-8-0782b1db6d.aac",
  "muzik_menu-9": "onizleme/muzik_menu-9-013a20f081.aac",
  "muzik_mac-5": "onizleme/muzik_mac-5-1dd76ae1e6.aac",
  "muzik_mac-6": "onizleme/muzik_mac-6-6d8839e037.aac",
  "muzik_mac-7": "onizleme/muzik_mac-7-6b1827f198.aac",
  "muzik_mac-8": "onizleme/muzik_mac-8-77758d8c1c.aac",
  "muzik_mac-9": "onizleme/muzik_mac-9-a4da8d974e.aac",
};

const KOVA = `${String(import.meta.env?.VITE_SUPABASE_URL ?? "").replace(/\/$/, "")}/storage/v1/object/public/muzik/`;

/** Tam parçanın herkese açık adresi; yoksa null (çağıran 30 sn önizlemeye düşer). */
export const muzikTamUrl = (id) => (TAM[id] && KOVA.startsWith("http") ? KOVA + TAM[id][0] : null);

/** Tam parçanın gerçek süresi (sn); bilinmiyorsa null. */
export const muzikTamSure = (id) => TAM[id]?.[1] ?? null;

/** Kovadaki önizleme adresi (yalnız yeni adaylar); yoksa null. */
export const muzikOnizlemeUrl = (id) => (ONIZLEME[id] && KOVA.startsWith("http") ? KOVA + ONIZLEME[id] : null);
