// Tasarım Yönleri — kendi çizilmiş SVG ikon seti (24×24 ızgara).
// Tek çizim, üç yön: çizgi kalınlığı, uç/köşe biçimi ve dolgu CSS
// değişkenleriyle (--ty-ikon-*) yöne göre değişir. Hiçbir oyunun ikonundan
// kopyalanmadı; tamamı bu dosyada elle çizildi.

const YOLLAR = {
  ev: (
    <>
      <path className="ty-dolgu" d="M4 11 12 4l8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5Z" />
    </>
  ),
  arkadas: (
    <>
      <circle className="ty-dolgu" cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M15.5 5.2a3.3 3.3 0 0 1 0 6.6M17.5 14.8c2.2.6 3.6 2.4 4 5.2" />
    </>
  ),
  lig: (
    <>
      <path className="ty-dolgu" d="M12 3 19 6v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6Z" />
      <path d="m9 12 2 2 4-4.5" />
    </>
  ),
  dukkan: (
    <>
      <path className="ty-dolgu" d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8Z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  ),
  profil: (
    <>
      <circle className="ty-dolgu" cx="12" cy="8.5" r="4" />
      <path d="M4.5 21c.8-4 3.7-6.3 7.5-6.3s6.7 2.3 7.5 6.3" />
    </>
  ),
  zil: (
    <>
      <path className="ty-dolgu" d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  coin: (
    <>
      <circle className="ty-dolgu" cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 9.8c0-1.2 1.1-2 2.5-2s2.5.8 2.5 1.9-1 1.6-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2 2.5-.8 2.5-2" />
    </>
  ),
  kalp: (
    <path className="ty-dolgu" d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
  ),
  ates: (
    <path className="ty-dolgu" d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.3 3.6-8.3.9 1.7 1.9 2.6 3 3 .2-2.5 1.1-4.4 2.9-6.5.3 3.1 3.5 5.6 3.5 10.6 0 4-2.7 7.4-6.5 7.4Z" />
  ),
  klasik: (
    <>
      <path className="ty-dolgu" d="M3.5 5.5h10v7h-5l-3 2.5v-2.5h-2Z" />
      <path d="M16.5 9.5h4v7h-2v2.5l-3-2.5h-5v-1.5" />
    </>
  ),
  duello: (
    <>
      <path d="M4 4l9.5 9.5M20 4l-9.5 9.5" />
      <path d="M7.5 15.5 4.5 18.5M16.5 15.5l3 3M6 14l4 4M18 14l-4 4" />
    </>
  ),
  turnuva: (
    <>
      <path className="ty-dolgu" d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" />
    </>
  ),
  grup: (
    <>
      <circle className="ty-dolgu" cx="12" cy="8" r="3" />
      <circle cx="5.5" cy="10" r="2.2" />
      <circle cx="18.5" cy="10" r="2.2" />
      <path d="M7 19.5c.6-3 2.5-4.6 5-4.6s4.4 1.6 5 4.6M1.8 18c.4-2 1.7-3.1 3.7-3.1M22.2 18c-.4-2-1.7-3.1-3.7-3.1" />
    </>
  ),
  // — Skill ikonları —
  yariyari: (
    <>
      <circle className="ty-dolgu" cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M7 10.5h2M15 12.5h2" />
    </>
  ),
  eksure: (
    <>
      <circle className="ty-dolgu" cx="11" cy="13" r="7.5" />
      <path d="M11 9v4l2.5 1.8M9 3h4M18.5 3.5v5M16 6h5" />
    </>
  ),
  degistir: (
    <>
      <path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5" />
    </>
  ),
  baski: (
    <>
      <path className="ty-dolgu" d="M6.5 3.5h11M6.5 20.5h11M8 3.5c0 4.5 4 5 4 8.5s-4 4-4 8.5M16 3.5c0 4.5-4 5-4 8.5s4 4 4 8.5" />
      <path d="m12.8 10.2-2 2.8h2.4l-2 2.8" />
    </>
  ),
  sigorta: (
    <>
      <path className="ty-dolgu" d="M12 3 19 6v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6Z" />
      <path d="M12 8v7M8.5 11.5h7" />
    </>
  ),
  ikikat: (
    <>
      <path d="M4 8.5c0-1.6 1.2-2.8 2.9-2.8S9.8 7 9.8 8.4c0 2.5-5.8 5.3-5.8 9.6h5.8" />
      <path d="m13 10.5 7 7.5M20 10.5l-7 7.5" />
    </>
  ),
  ikincisans: (
    <>
      <path className="ty-dolgu" d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
      <path d="M9.5 12.8a2.7 2.7 0 1 0 1-2.4M9.5 9.2v1.9h1.9" />
    </>
  ),
  tik: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  carpi: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  yildiz: (
    <path className="ty-dolgu" d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9Z" />
  ),
  oyna: <path className="ty-dolgu" d="M8 5.5v13l10.5-6.5Z" />,
  yenile: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  saat: (
    <>
      <circle className="ty-dolgu" cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  kirik: <path d="M4 12h5l2-3 2 6 2-3h5" />,
};

export default function Ikon({ ad, boyut = 24, className = "" }) {
  return (
    <svg
      className={`ty-ikon ${className}`}
      width={boyut}
      height={boyut}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {YOLLAR[ad]}
    </svg>
  );
}

// Mevcut resmi Q işareti (oyun/components/Logo.jsx'teki 03 Forward Pulse
// çiziminin aynısı) — renkleri yönün değişkenlerinden alır. Yeni logo değildir.
export function QIsareti({ boyut = 32 }) {
  return (
    <svg className="ty-q" width={boyut} height={boyut} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g transform="translate(7 -1) skewX(-7)">
        <path
          d="M56 10C28 10 10 29 10 58s18 48 46 48c10 0 19-2 27-7l12 11h21L94 88c7-8 10-18 10-30 0-29-19-48-48-48Zm0 23c15 0 25 10 25 25S71 83 56 83 33 73 33 58s8-25 23-25Z"
          fillRule="evenodd"
          className="ty-q-govde"
        />
        <path d="m73 78 21 10 15 15H94L69 85Z" fill="#ff6b2c" />
      </g>
    </svg>
  );
}
