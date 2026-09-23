// ============================================================
// DAVET KODU — tek dokunuşta YALNIZ KOD kopyalanır
//
// Eskiden kod düz yazıydı; kopyalamak için oyuncunun metni elle seçmesi
// gerekiyordu (telefonda zor). Yanındaki düğme ise koddan başka şey
// kopyalıyordu: uzun davet LİNKİNİ. Kodu isteyen oyuncu için fazlalıktı.
//
// Artık kodun kendisi bir düğme: dokun, pano'ya "A1B2C3D4" düşsün.
// Link paylaşma düğmesi yerinde duruyor (ayrı iş).
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { tt } from "../lib/dil.js";
import { useAuth } from "../../src/context/AuthContext.jsx";
import { QtIkon, QtDugme } from "../tasarim/index.js";
import "../tasarim/ekranlar/l-sosyal.css";

/**
 * Panoya yazar. `navigator.clipboard` yalnız güvenli bağlamda ve izin
 * verilirse çalışır; olmadığında gizli bir alanla eski yönteme düşeriz ki
 * hiçbir cihazda "hiçbir şey olmadı" hissi kalmasın.
 *
 * ZAMAN AŞIMI ŞART: writeText bazı ortamlarda ne çözülüyor ne reddediliyor
 * (izin "granted" görünse bile ölçüldü). Beklemeye bırakılırsa düğme
 * sonsuza kadar sessiz kalıyor; kısa süre sonra eski yönteme geçiyoruz.
 */
const PANO_ZAMAN_ASIMI = 1200;

async function panoyaYaz(metin) {
  try {
    if (navigator.clipboard?.writeText) {
      const yazdi = await Promise.race([
        navigator.clipboard.writeText(metin).then(() => true),
        new Promise((c) => setTimeout(() => c(false), PANO_ZAMAN_ASIMI)),
      ]);
      if (yazdi) return true;
    }
  } catch { /* izin yok — eski yönteme düş */ }
  try {
    const alan = document.createElement("textarea");
    alan.value = metin;
    alan.setAttribute("readonly", "");
    alan.style.cssText = "position:fixed;top:-1000px;opacity:0";
    document.body.appendChild(alan);
    alan.select();
    const oldu = document.execCommand?.("copy");
    document.body.removeChild(alan);
    return Boolean(oldu);
  } catch {
    return false;
  }
}

export default function DavetKodu({ kod }) {
  const { user, refreshProfile } = useAuth();
  const [durum, setDurum] = useState(null); // 'oldu' | 'olmadi'
  const saatRef = useRef(null);

  useEffect(() => () => clearTimeout(saatRef.current), []);

  const kopyala = useCallback(async () => {
    if (!kod) return;
    const oldu = await panoyaYaz(kod);
    setDurum(oldu ? "oldu" : "olmadi");
    clearTimeout(saatRef.current);
    saatRef.current = setTimeout(() => setDurum(null), 2200);
  }, [kod]);

  // Paket 41 M.6: kod gelmediyse "—" yerine sebep + Tekrar dene (paylaş düğmeleri bu yüzden pasif)
  if (!kod) {
    return (
      <div className="ls-kod-yok" role="status">
        <QtIkon ad="uyari" boyut={20} />
        <span>{tt("Davet kodun şu an alınamadı; paylaşma düğmeleri bu yüzden kapalı.")}</span>
        <QtDugme tur="ikincil" boyut="k" ikon="yenile" onClick={() => refreshProfile?.(user?.id)}>
          {tt("Tekrar dene")}
        </QtDugme>
      </div>
    );
  }

  return (
    <button
      type="button"
      className={"ls-kod" + (durum === "oldu" ? " ls-kod--oldu" : "")}
      onClick={kopyala}
      title={tt("Kodu kopyala")}
      aria-label={tt("Davet kodun {0} — kopyalamak için dokun", { 0: kod })}
    >
      <span className="ls-kod-metin qt-sayi">{kod}</span>
      <span className="ls-kod-ipucu" aria-hidden="true">
        <QtIkon ad={durum === "oldu" ? "onay" : "kopyala"} boyut={16} />
        {durum === "oldu" ? tt("Kopyalandı") : durum === "olmadi" ? tt("elle seç") : tt("Dokun, kopyala")}
      </span>
      <span className="qt-gizli" aria-live="polite">{durum === "oldu" ? tt("Kopyalandı") : ""}</span>
    </button>
  );
}
