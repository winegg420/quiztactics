// Paylaş kartı PNG kodlayıcısı (15 Eki 2026, Codex taraması — maç sonu kare süresi). Ana iş parçacığı kartı çizer ve
// ImageBitmap olarak buraya aktarır; 1080×1920 geri okuma + PNG kodlama burada olur (ana iş parçacığında CPU 6x'te
// 69–153 ms'lik görevdi). Pikseller aynen kopyalanır (bitmaprenderer), çıktı aynı PNG.
self.onmessage = async (e) => {
  const { no, bitmap } = e.data || {};
  try {
    const t = new OffscreenCanvas(bitmap.width, bitmap.height);
    t.getContext("bitmaprenderer").transferFromImageBitmap(bitmap);
    const blob = await t.convertToBlob({ type: "image/png" });
    self.postMessage({ no, blob });
  } catch (h) {
    self.postMessage({ no, hata: String(h?.message ?? h) });
  }
};
