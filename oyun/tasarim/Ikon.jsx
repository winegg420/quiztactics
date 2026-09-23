// Quiz Tactics tasarım sistemi — İKON SETİ (Yön A "Şeker Kutusu").
// 24×24 ızgara · 2,4 px yuvarlak uçlu çizgi · `qt-ikon-d` sınıflı parçalar
// rengin %22'siyle dolar (yarı saydam dolgu). Renk currentColor'dan gelir.
// Tamamı bu dosyada elle çizildi; hiçbir oyunun/kütüphanenin ikonu kopyalanmadı.
//
// ESKİ SETLE UYUM: `oyun/components/Ikon.jsx`'teki 61 adın HEPSİ burada aynı
// adla vardır; yani `<Ikon ad="kupa" />` → `<QtIkon ad="kupa" />` doğrudan geçer.
// Yeni takma adlar IKON_TAKMA_AD'da (ör. "arkadaslar" → "kisiler").

const D = "qt-ikon-d"; // yarı saydam dolgu
const T = "qt-ikon-t"; // tam dolgu (gözlük gibi küçük dolu parçalar)

const Y = {
  // ——— Gezinme ———
  ev: <path className={D} d="M4 11 12 4l8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19.5Z" />,
  kisiler: (
    <>
      <circle className={D} cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M15.5 5.2a3.3 3.3 0 0 1 0 6.6M17.5 14.8c2.2.6 3.6 2.4 4 5.2" />
    </>
  ),
  kisi: (
    <>
      <circle className={D} cx="12" cy="8.5" r="4" />
      <path d="M4.5 21c.8-4 3.7-6.3 7.5-6.3s6.7 2.3 7.5 6.3" />
    </>
  ),
  kisiEkle: (
    <>
      <circle className={D} cx="9" cy="8.5" r="3.5" />
      <path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5" />
      <path d="M19 7.5v6M16 10.5h6" />
    </>
  ),
  lig: (
    <>
      <path className={D} d="M12 3 19 6v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6Z" />
      <path d="m9 12 2 2 4-4.5" />
    </>
  ),
  dukkan: (
    <>
      <path className={D} d="M5 8h14l-1.2 11.2a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8Z" />
      <path d="M9 10V7a3 3 0 0 1 6 0v3" />
    </>
  ),
  grafik: (
    <>
      <rect className={D} x="3.8" y="13" width="3.6" height="7.5" rx="1" />
      <rect className={D} x="10.2" y="8" width="3.6" height="12.5" rx="1" />
      <rect className={D} x="16.6" y="3.5" width="3.6" height="17" rx="1" />
    </>
  ),
  oyunKolu: (
    <>
      <path className={D} d="M7 7h10a5 5 0 0 1 4.9 6l-.7 3.4a2.5 2.5 0 0 1-4.3 1.2L15 15.5H9l-1.9 2.1a2.5 2.5 0 0 1-4.3-1.2L2.1 13A5 5 0 0 1 7 7Z" />
      <path d="M7.5 9.8v3.4M5.8 11.5h3.4M15.5 10.5h.01M17.8 12.5h.01" />
    </>
  ),

  // ——— Modlar ———
  klasik: (
    <>
      <path className={D} d="M3.5 5.5h10v7h-5l-3 2.5v-2.5h-2Z" />
      <path d="M16.5 9.5h4v7h-2v2.5l-3-2.5h-5v-1.5" />
    </>
  ),
  duello: <path d="M4 4l9.5 9.5M20 4l-9.5 9.5M7.5 15.5 4.5 18.5M16.5 15.5l3 3M6 14l4 4M18 14l-4 4" />,
  kupa: (
    <>
      <path className={D} d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5" />
    </>
  ),
  grup: (
    <>
      <circle className={D} cx="12" cy="8" r="3" />
      <circle cx="5.5" cy="10" r="2.2" />
      <circle cx="18.5" cy="10" r="2.2" />
      <path d="M7 19.5c.6-3 2.5-4.6 5-4.6s4.4 1.6 5 4.6M1.8 18c.4-2 1.7-3.1 3.7-3.1M22.2 18c-.4-2-1.7-3.1-3.7-3.1" />
    </>
  ),
  safBilgi: (
    <>
      <path className={D} d="M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.1v.6h5v-.6c0-.8.4-1.6 1.1-2.1A6 6 0 0 0 12 3Z" />
      <path d="M9.5 19.5h5M10.5 22h3" />
    </>
  ),
  kilic: (
    <>
      <path className={D} d="M20.5 3.5 19.8 8 10 17.8 6.2 14 16 4.2Z" />
      <path d="M4.8 12.6l6.6 6.6M6.9 17.1 3.5 20.5" />
    </>
  ),

  // ——— Durum / bildirim ———
  zil: (
    <>
      <path className={D} d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z" />
      <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
    </>
  ),
  yildiz: <path className={D} d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9Z" />,
  ates: <path className={D} d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.3 3.6-8.3.9 1.7 1.9 2.6 3 3 .2-2.5 1.1-4.4 2.9-6.5.3 3.1 3.5 5.6 3.5 10.6 0 4-2.7 7.4-6.5 7.4Z" />,
  kalkan: <path className={D} d="M12 3 19 6v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6Z" />,
  madalya: (
    <>
      <path d="M8 3l2.6 6.2M16 3l-2.6 6.2" />
      <circle className={D} cx="12" cy="15" r="5.5" />
      <circle cx="12" cy="15" r="2" />
    </>
  ),
  uyari: (
    <>
      <path className={D} d="M10.3 4.2a2 2 0 0 1 3.4 0l7.6 13.2a2 2 0 0 1-1.7 3H4.4a2 2 0 0 1-1.7-3Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  bilgi: (
    <>
      <circle className={D} cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.8h.01" />
    </>
  ),
  kalp: <path className={D} d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />,
  coin: (
    <>
      <circle className={D} cx="12" cy="12" r="8.5" />
      <path d="M12 7.5v9M9.5 9.8c0-1.2 1.1-2 2.5-2s2.5.8 2.5 1.9-1 1.6-2.5 2-2.5.9-2.5 2 1.1 2 2.5 2 2.5-.8 2.5-2" />
    </>
  ),

  // ——— Skill'ler ———
  yariyari: (
    <>
      <circle className={D} cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17M7 10.5h2M15 12.5h2" />
    </>
  ),
  ekSure: (
    <>
      <circle className={D} cx="11" cy="13" r="7.5" />
      <path d="M11 9v4l2.5 1.8M9 3h4M18.5 3.5v5M16 6h5" />
    </>
  ),
  degistir: <path d="M4 9h13l-3.5-3.5M20 15H7l3.5 3.5" />,
  baski: (
    <>
      <path className={D} d="M6.5 3.5h11M6.5 20.5h11M8 3.5c0 4.5 4 5 4 8.5s-4 4-4 8.5M16 3.5c0 4.5-4 5-4 8.5s4 4 4 8.5" />
      <path d="m12.8 10.2-2 2.8h2.4l-2 2.8" />
    </>
  ),
  sigorta: (
    <>
      <path className={D} d="M12 3 19 6v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6Z" />
      <path d="M12 8v7M8.5 11.5h7" />
    </>
  ),
  ikiKat: <path d="M4 8.5c0-1.6 1.2-2.8 2.9-2.8S9.8 7 9.8 8.4c0 2.5-5.8 5.3-5.8 9.6h5.8M13 10.5l7 7.5M20 10.5l-7 7.5" />,
  ikinciSans: (
    <>
      <path className={D} d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20Z" />
      <path d="M9.5 12.8a2.7 2.7 0 1 0 1-2.4M9.5 9.2v1.9h1.9" />
    </>
  ),
  sis: (
    <>
      <path className={D} d="M7.5 14a3.5 3.5 0 0 1 .3-7 5 5 0 0 1 9.4 1.6A3 3 0 0 1 17 14Z" />
      <path d="M3 17.5c1.5-1 3-1 4.5 0s3 1 4.5 0 3-1 4.5 0 3 1 4.5 0M6 21c1.5-1 3-1 4.5 0s3 1 4.5 0" />
    </>
  ),
  terazi: (
    <>
      <path d="M12 4v16M8 20h8M5 7h14" />
      <path className={D} d="M2.5 14 5 8l2.5 6a2.5 2.5 0 0 1-5 0ZM16.5 14 19 8l2.5 6a2.5 2.5 0 0 1-5 0Z" />
    </>
  ),
  saat: (
    <>
      <circle className={D} cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  ileriAtla: (
    <>
      <path className={D} d="M5 5.5v13l9-6.5Z" />
      <path d="M18.5 5.5v13" />
    </>
  ),
  hizli: <path className={D} d="M13.5 2.5 5 13.5h6.5l-1 8 8.5-11h-6.5Z" />,
  soru: (
    <>
      <circle className={D} cx="12" cy="12" r="9" />
      <path d="M9.3 9.3a2.8 2.8 0 1 1 4 2.5c-.8.4-1.3 1-1.3 1.9v.3M12 17.2h.01" />
    </>
  ),
  robot: (
    <>
      <rect className={D} x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 8V4.5M12 4.5h.01M9 13h.01M15 13h.01M9.5 16.5h5" />
    </>
  ),

  // ——— Sohbet ve maç içi tepkiler ———
  sohbet: <path className={D} d="M12 3.5c4.7 0 8.5 3.3 8.5 7.4s-3.8 7.4-8.5 7.4c-1 0-2-.2-2.9-.4L4.5 20l1.2-3.7a7 7 0 0 1-2.2-5.1c0-4.1 3.8-7.4 8.5-7.4Z" />,
  mesaj: (
    <>
      <path className={D} d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      <path d="M8 9h8M8 12.5h5" />
    </>
  ),
  begeni: (
    <>
      <path className={D} d="M7.5 10.5 11 3.5a2.5 2.5 0 0 1 2.5 2.5v3.5h5a2 2 0 0 1 2 2.3l-1.2 7a2 2 0 0 1-2 1.7H7.5Z" />
      <path d="M7.5 10.5h-3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" />
    </>
  ),
  gulen: (
    <>
      <circle className={D} cx="12" cy="12" r="9" />
      <path d="M8 13.5a4.5 4.5 0 0 0 8 0M9 9.5h.01M15 9.5h.01" />
    </>
  ),
  sasirmis: (
    <>
      <circle className={D} cx="12" cy="12" r="9" />
      <path d="M9 9h.01M15 9h.01" />
      <circle cx="12" cy="15.3" r="2" />
    </>
  ),
  kizgin: (
    <>
      <circle className={D} cx="12" cy="12" r="9" />
      <path d="M7.5 8.5l3 1.5M16.5 8.5l-3 1.5M8.5 16.5c2-1.3 5-1.3 7 0" />
    </>
  ),
  havali: (
    <>
      <circle className={D} cx="12" cy="12" r="9" />
      <path className={T} d="M5 9.5h6v1.4a2.5 2.5 0 0 1-5 .1ZM13 9.5h6v1.4a2.5 2.5 0 0 1-5 .1Z" />
      <path d="M11 10.2h2M9 15.5c1.8 1.2 4.2 1.2 6 0" />
    </>
  ),
  mikrofon: (
    <>
      <rect className={D} x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M18.5 11a6.5 6.5 0 0 1-13 0M12 17.5v4" />
    </>
  ),

  // ——— Yer ———
  sehir: (
    <>
      <path className={D} d="M4 20.5V8.5l6-3v15ZM14 20.5v-10h6v10Z" />
      <path d="M2.5 20.5h19M7 11h.01M7 14h.01M7 17h.01M17 14h.01M17 17h.01" />
    </>
  ),
  dunya: (
    <>
      <circle className={D} cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3Z" />
    </>
  ),
  haritaPini: (
    <>
      <path className={D} d="M12 21.5s7-6.2 7-11.9a7 7 0 0 0-14 0c0 5.7 7 11.9 7 11.9Z" />
      <circle cx="12" cy="9.6" r="2.6" />
    </>
  ),
  bayrak: (
    <>
      <path d="M5 21V3.5" />
      <path className={D} d="M5 4h12.5l-2.5 4 2.5 4H5Z" />
    </>
  ),

  // ——— Eylem ———
  kilit: (
    <>
      <rect className={D} x="5" y="10.5" width="14" height="10.5" rx="2.5" />
      <path d="M8.5 10.5v-3a3.5 3.5 0 0 1 7 0v3M12 14.5V17" />
    </>
  ),
  tisort: <path className={D} d="M8.5 3.5 4 6l2 3.8 1.8-.8v11.5h8.4V9l1.8.8L20 6l-4.5-2.5a3.5 3.5 0 0 1-7 0Z" />,
  palet: (
    <>
      <path className={D} d="M12 3a9 9 0 0 0 0 18c1 0 1.6-.8 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.5-.7-.5-1.1 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4-4-7.6-9-7.6Z" />
      <path d="M7.5 11h.01M10 7.5h.01M14 7.5h.01M16.5 11h.01" />
    </>
  ),
  onay: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  carpi: <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />,
  ok: <path d="M4.5 12h15M13.5 6l6 6-6 6" />,
  geri: <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />,
  ileri: <path d="M9 5.5 15.5 12 9 18.5" />,
  asagi: <path d="M5.5 9 12 15.5 18.5 9" />,
  arti: <path d="M12 5v14M5 12h14" />,
  oyna: <path className={D} d="M8 5.5v13l10.5-6.5Z" />,
  gonder: (
    <>
      <path className={D} d="M21 3 3 10.5l7 3 3 7.5Z" />
      <path d="M21 3 10 13.5" />
    </>
  ),
  yenile: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  cop: (
    <>
      <path className={D} d="M6 7.5h12l-1 12a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5Z" />
      <path d="M4 7.5h16M9.5 7.5V5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2.5M10 11v6M14 11v6" />
    </>
  ),
  paylas: (
    <>
      <circle className={D} cx="18" cy="5.5" r="2.5" />
      <circle className={D} cx="6" cy="12" r="2.5" />
      <circle className={D} cx="18" cy="18.5" r="2.5" />
      <path d="M8.2 10.8l7.6-4M8.2 13.2l7.6 4" />
    </>
  ),
  ayar: (
    <>
      <path className={D} d="M10.3 3.2h3.4l.5 2.4 1.6.9 2.3-.8 1.7 3-1.8 1.6v1.8l1.8 1.6-1.7 3-2.3-.8-1.6.9-.5 2.4h-3.4l-.5-2.4-1.6-.9-2.3.8-1.7-3 1.8-1.6v-1.8L4.2 8.7l1.7-3 2.3.8 1.6-.9Z" />
      <circle cx="12" cy="12" r="2.8" />
    </>
  ),
  hediye: (
    <>
      <path className={D} d="M4 11h16v9.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
      <path d="M2.5 7.5h19V11h-19ZM12 7.5v14M12 7.5S11 3 8 3a2.2 2.2 0 0 0 0 4.5M12 7.5S13 3 16 3a2.2 2.2 0 0 1 0 4.5" />
    </>
  ),
  sesAcik: (
    <>
      <path className={D} d="M11 5 6.5 9H3v6h3.5l4.5 4Z" />
      <path d="M15.5 9.5a3.5 3.5 0 0 1 0 5M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    </>
  ),
  sesKapali: (
    <>
      <path className={D} d="M11 5 6.5 9H3v6h3.5l4.5 4Z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </>
  ),
  muzik: (
    <>
      <path d="M9 17.5V5.5l11-2v12" />
      <circle className={D} cx="6.5" cy="17.5" r="2.5" />
      <circle className={D} cx="17.5" cy="15.5" r="2.5" />
    </>
  ),
  liste: <path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  kalem: (
    <>
      <path className={D} d="M16.5 3.5a2.5 2.5 0 0 1 3.5 3.5L8 19l-4.5 1.5L5 16Z" />
      <path d="M14.5 5.5l4 4" />
    </>
  ),
  cikis: <path d="M9.5 20.5H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h3.5M15.5 16.5 20 12l-4.5-4.5M20 12H9.5" />,
  kitap: <path className={D} d="M12 6.5c-1.6-1.5-3.8-2-6.5-2H3V18h2.5c2.7 0 4.9.5 6.5 2ZM12 6.5c1.6-1.5 3.8-2 6.5-2H21V18h-2.5c-2.7 0-4.9.5-6.5 2Z" />,
  arama: (
    <>
      <circle className={D} cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5l5 5" />
    </>
  ),
  kopyala: (
    <>
      <rect className={D} x="8" y="8" width="12.5" height="12.5" rx="2.5" />
      <path d="M16 8V5.5a2 2 0 0 0-2-2H5.5a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2H8" />
    </>
  ),
  ay: <path className={D} d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.8 6.8 0 0 0 10 10Z" />,
  gunes: (
    <>
      <circle className={D} cx="12" cy="12" r="4.5" />
      <path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
    </>
  ),
};

/** Yeni (ya da okunaklı) adlar → setteki asıl ad. */
export const IKON_TAKMA_AD = {
  arkadaslar: "kisiler",
  profil: "kisi",
  tik: "onay",
  kapat: "carpi",
  cifte: "ikiKat",
  ikikat: "ikiKat",
  ikincisans: "ikinciSans",
  eksure: "ekSure",
  turnuva: "kupa",
  ampul: "safBilgi",
  ayarlar: "ayar",
  bildirim: "zil",
};

/** Setteki bütün asıl adlar (örnek sayfa ve testler için). */
export const QT_IKON_ADLARI = Object.keys(Y);

/**
 * <QtIkon ad="kupa" boyut={24} />
 * - Süs ikonuysa etiket verme (aria-hidden olur).
 * - Tek başına anlam taşıyorsa `etiket="Bildirimler"` ver (role="img").
 */
export default function QtIkon({ ad, boyut = 24, etiket, className = "" }) {
  // Renkli sistem emojisi: ad = "emoji:👍" (maç içi tepkiler, lib/tepkiler.js).
  // Yazı tipi ve renk kuralları: tasarim/ekranlar/emoji.css (.qt-emoji).
  if (typeof ad === "string" && ad.startsWith("emoji:")) {
    return (
      <span
        className={`qt-emoji ${className}`.trim()}
        style={{ width: boyut, height: boyut, fontSize: Math.round(boyut * 0.92) }}
        {...(etiket ? { role: "img", "aria-label": etiket } : { "aria-hidden": "true" })}
      >
        {ad.slice(6)}
      </span>
    );
  }
  const cizim = Y[ad] ?? Y[IKON_TAKMA_AD[ad]];
  if (!cizim) {
    if (import.meta.env?.DEV) console.warn(`[QtIkon] bilinmeyen ikon: "${ad}"`);
    return null;
  }
  return (
    <svg
      className={`qt-ikon ${className}`.trim()}
      width={boyut}
      height={boyut}
      viewBox="0 0 24 24"
      focusable="false"
      {...(etiket ? { role: "img", "aria-label": etiket } : { "aria-hidden": "true" })}
    >
      {cizim}
    </svg>
  );
}

/**
 * Quiz Tactics'in resmi Q işareti — `oyun/components/Logo.jsx` (03 Forward Pulse)
 * çiziminin AYNISI; yeni logo değildir. Gövde rengi `--qt-zemin-metin`'den gelir.
 */
export function QtQIsareti({ boyut = 32 }) {
  return (
    <svg className="qt-q" width={boyut} height={boyut} viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <g transform="translate(7 -1) skewX(-7)">
        <path
          className="qt-q-govde"
          fillRule="evenodd"
          d="M56 10C28 10 10 29 10 58s18 48 46 48c10 0 19-2 27-7l12 11h21L94 88c7-8 10-18 10-30 0-29-19-48-48-48Zm0 23c15 0 25 10 25 25S71 83 56 83 33 73 33 58s8-25 23-25Z"
        />
        <path d="m73 78 21 10 15 15H94L69 85Z" fill="#ff6b2c" />
      </g>
    </svg>
  );
}
