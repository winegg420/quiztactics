import { rutbeBul } from "../lib/ranks.js";
import { useLevel } from "../lib/levelOnbellek.js";
import "../tasarim/ekranlar/l-kart.css";

// Rütbeye özel SVG rozet biçimleri (emoji yerine — her cihazda aynı görünür).
// P2A: anahtar rütbenin dilden bağımsız id'si (eskiden çevrilmiş ad; İngilizcede hep Çaylak biçimi çıkıyordu).
const BICIM = {
  caylak: (r) => (
    <>
      <circle cx="12" cy="13" r="6" fill={r} opacity="0.9" />
      <path d="M12 5.5 13.6 9h-3.2z" fill={r} />
    </>
  ),
  bilge: (r) => (
    <>
      <path d="M12 4 19 8v5c0 4-3 6.5-7 7.5C8 19.5 5 17 5 13V8z" fill={r} opacity="0.9" />
      <path d="m9.5 12.5 1.8 1.8 3.4-3.6" stroke="#0B1220" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  ustat: (r) => (
    <>
      <path d="M12 3 20 7v6c0 4.5-3.4 7.3-8 8.5C7.4 20.3 4 17.5 4 13V7z" fill={r} opacity="0.9" />
      <path d="M12 8v7M9 11h6" stroke="#0B1220" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  kahin: (r) => (
    <>
      <circle cx="12" cy="12" r="7.5" fill={r} opacity="0.85" />
      <circle cx="12" cy="12" r="3.2" fill="#0B1220" opacity="0.55" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2" stroke={r} strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  dahi: (r) => (
    <>
      <path d="M4 17 6 7l4 4 2-5 2 5 4-4 2 10z" fill={r} opacity="0.95" />
      <path d="M4.5 19.5h15" stroke={r} strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
};

/**
 * Level'e göre rütbe rozeti (SVG) + rütbe adı.
 * P2A: rütbe artık lig puanından değil LEVEL'den. `level` verilmezse `userId` ile
 * profiles.level toplu okunur (levelOnbellek). Eski `puan` prop'u KULLANIM DIŞI, yok sayılır.
 */
export default function RankBadge({ level, userId, sadeceRozet = false, boyut = 18 }) {
  const lv = useLevel(userId, level);
  if (lv == null) return null;   // rakibin level'i henüz gelmedi: yanlış rütbe göstermek yerine boş
  const r = rutbeBul(lv);
  const ciz = BICIM[r.id] ?? BICIM.caylak;
  const rozet = (
    <svg
      width={boyut}
      height={boyut}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className="bd-rutbe-rozet"
    >
      {ciz(r.renk)}
    </svg>
  );

  if (sadeceRozet) return rozet;

  // Tasarım A: rütbe bir QtRozet (küçük, nötr zemin). Yazı rengi token'dan (--qt-metin) —
  // rütbe rengi yalnız ikonda; açık rütbe renkleri yazı olarak kontrast vermiyordu.
  return (
    <span className="qt-rozet qt-rozet--notr qt-rozet--k ls-rutbe">
      {rozet}
      {r.ad}
    </span>
  );
}
