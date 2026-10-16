// ============================================================
// MAÇ NABZI — eş zamanlı maçların ortak kalp atışı
//
// Üç mod da (1v1, grup, hızlı) aynı sunucu sözleşmesini kullanır:
//   rpc(ad, { ...param, p_hazir }) -> { durum, basladi, ... }
//
// İki iş yapar:
//   1) HAZIR KAPISI — oyuncu "Hazır"a basana kadar p_hazir false gider;
//      basınca true'ya döner ve bir daha geri alınmaz. Herkes hazır olunca
//      sunucu ortak saati başlatır.
//   2) VARLIK BİLDİRİMİ — 3 sn'de bir atılan nabız "buradayım" demektir.
//      Sunucu 12 sn nabız gelmezse oyuncuyu kopmuş sayar, maçı duraklatır ve
//      45 sn sonra maçtan ayrılmış (hükmen mağlup) sayar.
//
// SEKME ARKA PLANDAYKEN NABIZ ATILMAZ. Bu bilerek böyle: kullanıcı
// "ekran değiştirirse diğer rakibin ekranı da kilitlenecek" dedi. Tarayıcı
// zaten arka planda zamanlayıcıları kıstığı için bu aynı zamanda dürüst olan.
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../../src/lib/supabase.js";
import { zamanAsimiyla } from "./gorunurluk.js";
import { saatOrnegiEkle } from "./sunucuSaati.js";

const ARALIK_MS = 3000;
const ASKI_MS = 2500;   // 16 Eki 2026: bu süreden uzun yoldaki nabız sıradaki tikte kesilir (tik 3 sn — bir tik bekler)
const ASKI_NEDENI = "aski";

/**
 * @param {string} rpcAdi  "mac_nabiz" | "grup_mac_nabiz" | "hizli_mac_nabiz"
 * @param {object} parametreler  ör. { p_match_id: id }
 * @param {boolean} aktif  sayfa açıkken true
 */
export function useMacNabiz(rpcAdi, parametreler, aktif = true) {
  const [nabiz, setNabiz] = useState(null);
  const [nabizHatasi, setNabizHatasi] = useState(null);
  const hazirRef = useRef(false);
  const paramRef = useRef(parametreler);
  paramRef.current = parametreler;

  // 1056: yanıtı gelmeyen nabız varken yenisi atılmaz (DB yavaşken 3 sn'de bir istek aynı maç
  // satırında sıraya giriyordu); takılan istek 10 sn'de gerçekten kesilir (AbortController).
  // 16 Eki 2026 (Hazine/Düello ile aynı — KasaPage.jsx › ASKI_MS): yoldaki nabız 3 sn'den uzun sürerken sıradaki tik gelirse yoldaki
  // kesilir ve yenisi atılır — yanıtı kaybolan tek nabız ekranı 10 sn'ye kadar dondurmaz. Kesilen yanıt uygulanmaz.
  const ucustaRef = useRef(false);
  const yoldakiRef = useRef(null);   // { kes, bas }
  const nabizAt = useCallback(async () => {
    if (typeof document !== "undefined" && document.hidden) return;
    if (ucustaRef.current) {
      const y = yoldakiRef.current;
      if (!y || Date.now() - y.bas < ASKI_MS) return;
      y.kes.abort(ASKI_NEDENI);
    }
    ucustaRef.current = true;
    const kes = new AbortController();
    yoldakiRef.current = { kes, bas: Date.now() };
    const kesZamani = setTimeout(() => kes.abort(), 10000);
    try {
      const gonderildiMs = Date.now();
      const { data, error } = await zamanAsimiyla(
        supabase.rpc(rpcAdi, { ...paramRef.current, p_hazir: hazirRef.current }).abortSignal(kes.signal),
        10000,
        rpcAdi
      );
      const alindiMs = Date.now();
      if (kes.signal.aborted) return;   // askı kesici kesti: yanıt (gelse de) uygulanmaz
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      if (r) {
        // Sunucu saati yanıt gelince ölçülürse dönüş gecikmesinin tamamı saat farkına biner: gidiş-dönüşün
        // orta noktası alınır (lib/soruCek.js ile aynı NTP yaklaşımı). Yüksek gecikmede geri sayım kayıyordu.
        // Tek yavaş yanıt (DB takılması) saat farkını yüzlerce ms oynatıp geri sayımı geri sıçratıyordu (D-409):
        // nabız başına yeni fark değil, penceredeki EN KISA gidiş-dönüşlü örneğin farkı verilir.
        // 1092: pencere ortak sunucu saati modülünde (lib/sunucuSaati.js) — bütün sayaçlar aynı farkı okur.
        const ornekMs = (gonderildiMs + alindiMs) / 2;
        const saatFarkMs = r.sunucu_zamani ? saatOrnegiEkle(gonderildiMs, alindiMs, r.sunucu_zamani) ?? undefined : undefined;
        setNabiz({ ...r, _saat_ornek_ms: ornekMs, _saat_fark_ms: saatFarkMs });
        setNabizHatasi(null);
      }
    } catch (e) {
      if (kes.signal.aborted && kes.signal.reason === ASKI_NEDENI) return;   // kesildi, yenisi yolda — hata değil
      // Ağ dalgalanması olabilir; ekranı düşürmeyiz, bir sonraki tik dener.
      console.error(`[Bildim] ${rpcAdi}:`, e);
      setNabizHatasi(e);
    } finally {
      clearTimeout(kesZamani);
      if (yoldakiRef.current?.kes === kes) { yoldakiRef.current = null; ucustaRef.current = false; }
    }
  }, [rpcAdi]);

  useEffect(() => {
    if (!aktif) return undefined;
    nabizAt();
    const id = setInterval(nabizAt, ARALIK_MS);
    // Sekmeye dönüldüğü an nabzı at: rakibin kilidi bir tik beklemeden açılsın.
    const geriDon = () => { if (!document.hidden) nabizAt(); };
    document.addEventListener("visibilitychange", geriDon);
    window.addEventListener("focus", geriDon);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", geriDon);
      window.removeEventListener("focus", geriDon);
    };
  }, [aktif, nabizAt]);

  /** "Hazır" düğmesi. Bir kez basılır, geri alınmaz. */
  const hazirla = useCallback(() => {
    hazirRef.current = true;
    nabizAt();
  }, [nabizAt]);

  return { nabiz, nabizHatasi, hazirla, nabizAt };
}
