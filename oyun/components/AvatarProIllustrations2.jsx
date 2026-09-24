// Yeni profil avatarları (27) — Günlük 13 + Kostümlü 14 (Ajan A, 24 Eyl 2026).
// Çizim dili AvatarProIllustrations.jsx ile BİREBİR: aynı CIZGI (koyu kontur, 5 px), aynı Sahne
// (renkli yuvarlatılmış kare, 320×320), düz renk, güçlü siluet, küçük boyutta okunur yüz.
// Statik dosyalar: oyun/_test/avatar-pro-uret.mjs → public/avatars/pro2/<anahtar>.svg
// Katalog (kapalı başlar, onay /avatar-onizleme): migration 520 › avatar_katalogu.
// Telif: tanınmış karakterlerin ayırt edici unsurları KULLANILMAZ (ayrıntı PROGRESS, 24 Eyl kozmetik paketi).
import { CIZGI, Sahne } from "./AvatarProIllustrations.jsx";

const K = "#0b1220";
const KR = "#fff8ec";
const BAS = "M91 149q0-86 69-92 71 6 69 93-2 85-69 94-67-9-69-95Z";
const BAS_INCE = "M94 150q0-84 66-90 68 6 66 91-3 80-66 90-63-9-66-91Z";
const GOVDE = "M58 300q8-68 102-78 94 10 102 78";
const GOVDE_GENIS = "M52 300q9-70 108-80 99 10 108 80";

function Goz({ x, y = 160, r = 8 }) {
  return <><circle cx={x} cy={y} r={r} fill={K} /><circle cx={x + 2} cy={y - 3} r={r * 0.36} fill={KR} /></>;
}

function IriGoz({ x, y = 160, bebek = K, bak = 0 }) {
  return <><ellipse cx={x} cy={y} rx="12" ry="13" fill={KR} {...CIZGI} /><circle cx={x + bak} cy={y + 2} r="7" fill={bebek} /><circle cx={x + bak + 2} cy={y - 1} r="2.5" fill={KR} /></>;
}

function Burun({ x = 160, y = 162 }) {
  return <path d={`M${x} ${y}q-6 22 5 25l9-2`} fill="none" {...CIZGI} />;
}

function Yanak({ renk = "#e8543f", sol = 106, sag = 214, y = 194 }) {
  return <><circle cx={sol} cy={y} r="12" fill={renk} opacity=".32" /><circle cx={sag} cy={y} r="12" fill={renk} opacity=".32" /></>;
}

// Konturlu kalın çizgi (kaş, bıyık, askı): önce koyu, sonra renkli.
function KalinCizgi({ d, renk, en = 10 }) {
  return <><path d={d} fill="none" stroke={K} strokeWidth={en + 9} strokeLinecap="round" strokeLinejoin="round" /><path d={d} fill="none" stroke={renk} strokeWidth={en} strokeLinecap="round" strokeLinejoin="round" /></>;
}

function Yildizlar() {
  return <g fill={KR} opacity=".85"><circle cx="42" cy="118" r="4" /><circle cx="282" cy="104" r="3" /><circle cx="58" cy="226" r="3" /><circle cx="274" cy="222" r="4" /><circle cx="252" cy="36" r="3" /><circle cx="70" cy="34" r="3" /></g>;
}

/* ============================ GÜNLÜK (13) ============================ */

function Sarisin() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Sarı saçlı kadın avatarı">
    <Sahne renk="#e0729a" vurgu="#ffd0df" />
    <path d="M70 272V150q0-106 90-110 90 4 90 110v122q-26 12-46 0V178h-88v94q-20 12-46 0Z" fill="#f2c14e" {...CIZGI} />
    <path d={GOVDE} fill="#4fb3c9" {...CIZGI} />
    <path d="M128 226q32 26 64 0" fill="none" stroke={KR} strokeWidth="8" strokeLinecap="round" />
    <path d={BAS_INCE} fill="#f0cfa6" {...CIZGI} />
    <path d="M92 150q-6-84 68-92 74 8 68 90-38-6-58-42-10 30-78 44Z" fill="#f2c14e" {...CIZGI} />
    <path d="M172 72q10 22 36 34" fill="none" stroke="#d9a431" strokeWidth="7" strokeLinecap="round" />
    <circle cx="214" cy="104" r="11" fill="#e8543f" {...CIZGI} /><circle cx="214" cy="104" r="4" fill="#f2c14e" />
    <path d="M110 146q14-9 28 1M182 147q14-10 28-1" fill="none" {...CIZGI} />
    <Goz x={127} y={163} /><Goz x={195} y={163} />
    <path d="M114 156l-8-5M208 156l8-5" fill="none" {...CIZGI} />
    <Burun y={166} /><Yanak y={196} sol={110} sag={210} />
    <path d="M136 204q24 16 48 0-4 20-24 21-20-1-24-21Z" fill="#b83e60" {...CIZGI} />
  </svg>;
}

function Kivircik() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kıvırcık saçlı kadın avatarı">
    <Sahne renk="#f2b23c" vurgu="#fff0bc" />
    <g fill="#2b1d16" {...CIZGI}>
      <circle cx="92" cy="106" r="40" /><circle cx="124" cy="68" r="40" /><circle cx="168" cy="54" r="42" /><circle cx="212" cy="72" r="40" />
      <circle cx="240" cy="114" r="38" /><circle cx="80" cy="152" r="34" /><circle cx="244" cy="158" r="34" /><circle cx="86" cy="194" r="28" /><circle cx="236" cy="198" r="28" />
    </g>
    <ellipse cx="162" cy="130" rx="84" ry="74" fill="#2b1d16" />
    <path d={GOVDE} fill="#4a9dd9" {...CIZGI} />
    <path d={BAS_INCE} fill="#8d5a3b" {...CIZGI} />
    <path d="M96 132q-4-60 64-70 68 10 64 70-28-20-64-20-36 0-64 20Z" fill="#2b1d16" {...CIZGI} />
    <path d="M94 116q66-42 132 0l-2 18q-64-38-128 0Z" fill="#e8543f" {...CIZGI} />
    <circle cx="94" cy="212" r="12" fill="none" stroke={K} strokeWidth="11" /><circle cx="94" cy="212" r="12" fill="none" stroke="#f2b23c" strokeWidth="5" />
    <circle cx="226" cy="212" r="12" fill="none" stroke={K} strokeWidth="11" /><circle cx="226" cy="212" r="12" fill="none" stroke="#f2b23c" strokeWidth="5" />
    <path d="M110 144q14-9 28 1M182 145q14-10 28-1" fill="none" {...CIZGI} />
    <IriGoz x={127} y={163} bak={2} /><IriGoz x={195} y={163} bak={-2} />
    <path d="M160 166q-9 20 2 24l12-2" fill="none" {...CIZGI} />
    <path d="M134 204q26 18 52 0-4 22-26 23-22-1-26-23Z" fill="#6b2a2e" {...CIZGI} /><path d="M140 206q20 8 40 0" fill="none" stroke={KR} strokeWidth="6" strokeLinecap="round" />
  </svg>;
}

function Kizil() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kızıl saçlı kadın avatarı">
    <Sahne renk="#3fa9a0" vurgu="#c6f1ef" />
    <path d="M72 236q-22-88-2-132 24-58 90-62 66 4 90 62 20 44-2 132-14 18-34 6V160H106v82q-20 12-34-6Z" fill="#d9562b" {...CIZGI} />
    <path d="M86 196q12 22 0 44M234 196q-12 22 0 44" fill="none" stroke="#a8401f" strokeWidth="7" strokeLinecap="round" />
    <path d={GOVDE} fill="#f2b23c" {...CIZGI} />
    <path d="M124 228q36 30 72 0" fill="#c98a22" {...CIZGI} />
    <path d={BAS_INCE} fill="#f0cfa6" {...CIZGI} />
    <path d="M90 152q-8-88 70-94 62 2 74 66-54 2-86-34-16 42-58 62Z" fill="#d9562b" {...CIZGI} />
    <path d="M124 80q20 16 40 20" fill="none" stroke="#a8401f" strokeWidth="7" strokeLinecap="round" />
    <path d="M112 146q14-9 28 1M182 145q14-10 28-1" fill="none" {...CIZGI} />
    <Goz x={127} y={163} /><Goz x={195} y={163} />
    <g fill="#c0703f"><circle cx="106" cy="188" r="3.5" /><circle cx="118" cy="196" r="3.5" /><circle cx="102" cy="200" r="3.5" /><circle cx="214" cy="188" r="3.5" /><circle cx="202" cy="196" r="3.5" /><circle cx="218" cy="200" r="3.5" /></g>
    <Burun y={166} />
    <path d="M136 206q26 18 50-2" fill="none" {...CIZGI} />
  </svg>;
}

function Basortulu() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Başörtülü kadın avatarı">
    <Sahne renk="#57c9a0" vurgu="#d9f7e6" />
    <path d={GOVDE_GENIS} fill="#3b4a6b" {...CIZGI} />
    <path d="M70 300q2-44 22-68-26-42-22-96 8-94 90-98 82 4 90 98 4 54-22 96 20 24 22 68Z" fill="#d9536a" {...CIZGI} />
    <path d="M96 236q64 36 128 0" fill="none" {...CIZGI} />
    <path d="M104 262q56 26 112 0" fill="none" stroke="#b83e60" strokeWidth="7" strokeLinecap="round" />
    <path d="M100 172q-6-98 60-102 66 4 60 102" fill="#b83e60" {...CIZGI} />
    <path d="M108 162q0-72 52-78 52 6 52 78-2 66-52 76-50-10-52-76Z" fill="#e6c79a" {...CIZGI} />
    <circle cx="214" cy="236" r="10" fill="#f2b23c" {...CIZGI} />
    <path d="M122 148q13-9 26 1M172 149q13-10 26-1" fill="none" {...CIZGI} />
    <Goz x={136} y={165} r={7.5} /><Goz x={186} y={165} r={7.5} />
    <path d="M124 158l-7-5M198 158l7-5" fill="none" {...CIZGI} />
    <path d="M161 168q-5 18 4 21l8-2" fill="none" {...CIZGI} />
    <Yanak sol={122} sag={200} y={196} />
    <path d="M140 206q21 16 42-2" fill="none" {...CIZGI} />
  </svg>;
}

function Gozluklu() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Gözlüklü yakışıklı erkek avatarı">
    <Sahne renk="#4a9dd9" vurgu="#cfeeff" />
    <path d={GOVDE} fill="#26365a" {...CIZGI} />
    <path d="M132 226l28 42 28-42" fill={KR} {...CIZGI} />
    <ellipse cx="90" cy="166" rx="12" ry="17" fill="#e6c79a" {...CIZGI} /><ellipse cx="230" cy="166" rx="12" ry="17" fill="#e6c79a" {...CIZGI} />
    <path d={BAS} fill="#e6c79a" {...CIZGI} />
    <path d="M88 134Q76 72 120 48q22-16 48-12 10-14 34-8-6 8-10 14 36 16 40 76-24-12-38-34-44 22-92 16-4 18-14 34Z" fill="#3b2a20" {...CIZGI} />
    <path d="M108 134q18-10 38 0M176 134q18-10 38 0" fill="none" stroke={K} strokeWidth="8" strokeLinecap="round" />
    <rect x="102" y="144" width="48" height="36" rx="11" fill="#cfeeff" fillOpacity=".4" stroke={K} strokeWidth="7" />
    <rect x="172" y="144" width="48" height="36" rx="11" fill="#cfeeff" fillOpacity=".4" stroke={K} strokeWidth="7" />
    <path d="M150 158h22" fill="none" stroke={K} strokeWidth="7" />
    <Goz x={127} y={163} r={7} /><Goz x={195} y={163} r={7} />
    <Burun y={172} />
    <path d="M132 208q30 18 60-6" fill="none" {...CIZGI} />
  </svg>;
}

function Kel() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kel erkek avatarı">
    <Sahne renk="#ee8b3c" vurgu="#ffd6a8" />
    <path d={GOVDE} fill="#2fbf71" {...CIZGI} />
    <path d="M126 226l34 26 34-26-4 22-30 18-30-18Z" fill={KR} {...CIZGI} />
    <ellipse cx="82" cy="170" rx="14" ry="19" fill="#c68e5f" {...CIZGI} /><ellipse cx="238" cy="170" rx="14" ry="19" fill="#c68e5f" {...CIZGI} />
    <path d="M84 156q0-104 76-108 76 4 76 108-2 86-76 94-74-8-76-94Z" fill="#c68e5f" {...CIZGI} />
    <path d="M116 84q22-18 52-16" fill="none" stroke={KR} strokeWidth="10" strokeLinecap="round" opacity=".6" />
    <path d="M88 154q-4-22 8-40M232 154q4-22-8-40" fill="none" stroke="#3b2a20" strokeWidth="13" strokeLinecap="round" />
    <path d="M106 142q18-12 38 1M176 143q18-13 38-1" fill="none" stroke={K} strokeWidth="8" strokeLinecap="round" />
    <Goz x={126} y={162} /><Goz x={194} y={162} />
    <path d="M160 160q-10 26 4 30l12-3" fill="none" {...CIZGI} />
    <path d="M128 202q16-14 32-5 16-9 32 5-16 10-32 3-16 7-32-3Z" fill="#3b2a20" {...CIZGI} />
    <path d="M138 216q22 14 44 0" fill="none" {...CIZGI} />
  </svg>;
}

function Sakalli() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Bereli sakallı erkek avatarı">
    <Sahne renk="#8cbf3f" vurgu="#dff0a8" />
    <path d={GOVDE} fill="#e8543f" {...CIZGI} />
    <path d="M100 250v50M130 234v66M190 234v66M220 250v50M72 276h176" fill="none" stroke="#b93737" strokeWidth="7" />
    <path d={BAS} fill="#e6c79a" {...CIZGI} />
    <path d="M91 160q-4 86 69 92 73-6 69-92-10 22-32 24-12-18-37-18-25 0-37 18-22-2-32-24Z" fill="#5a3a22" {...CIZGI} />
    <path d="M140 206q20 14 40 0-6 13-20 13-14 0-20-13Z" fill="#b83e60" {...CIZGI} />
    <path d="M86 126q-4-80 74-84 78 4 74 84Z" fill="#f2b23c" {...CIZGI} />
    <path d="M80 112q80-16 160 0v30q-80-16-160 0Z" fill="#c98a22" {...CIZGI} />
    <path d="M112 64q10-10 18-12M150 50v14M190 52q8 4 14 12" fill="none" stroke="#c98a22" strokeWidth="6" strokeLinecap="round" />
    <circle cx="160" cy="40" r="15" fill="#f2b23c" {...CIZGI} />
    <path d="M108 150q17-10 34 1M178 151q17-11 34-1" fill="none" stroke={K} strokeWidth="8" strokeLinecap="round" />
    <Goz x={126} y={166} /><Goz x={194} y={166} />
    <path d="M160 168q-7 18 4 21l9-2" fill="none" {...CIZGI} />
  </svg>;
}

function Dede() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kasketli bilge dede avatarı">
    <Sahne renk="#5aa9e6" vurgu="#d5efff" />
    <path d={GOVDE} fill="#8a5f16" {...CIZGI} />
    <path d="M130 226l30 30 30-30v74h-60Z" fill="#cfe3f5" {...CIZGI} />
    <circle cx="146" cy="276" r="4" fill={K} /><circle cx="174" cy="276" r="4" fill={K} />
    <ellipse cx="90" cy="168" rx="12" ry="17" fill="#e6c79a" {...CIZGI} /><ellipse cx="230" cy="168" rx="12" ry="17" fill="#e6c79a" {...CIZGI} />
    <path d={BAS} fill="#e6c79a" {...CIZGI} />
    <path d="M92 176q-20-24-4-58l14 6q-8 26 4 44ZM228 176q20-24 4-58l-14 6q8 26-4 44Z" fill={KR} {...CIZGI} />
    <path d="M84 124q0-70 76-74 74 4 78 66Z" fill="#8496b2" {...CIZGI} />
    <path d="M86 122q70-30 148-4l16 22q-84-26-166-2Z" fill="#5c7fa8" {...CIZGI} />
    <KalinCizgi d="M110 146q16-10 32-2M178 144q16-8 32 2" renk={KR} en={9} />
    <path d="M114 166q13-11 26 0M180 166q13-11 26 0" fill="none" {...CIZGI} />
    <path d="M160 164q-7 22 4 25l10-2" fill="none" {...CIZGI} />
    <path d="M106 196q54 76 108 0-4 52-54 58-50-6-54-58Z" fill={KR} {...CIZGI} />
    <path d="M160 200q-18-12-38 2 10 14 38 4 28 10 38-4-20-14-38-2Z" fill={KR} {...CIZGI} />
    <path d="M146 218q14 8 28 0" fill="none" {...CIZGI} />
    <path d="M100 184l10 6M220 184l-10 6" fill="none" stroke="#b58a5a" strokeWidth="5" strokeLinecap="round" />
  </svg>;
}

function Sporcu() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Madalyalı sporcu avatarı">
    <Sahne renk="#e8543f" vurgu="#ffb7a6" />
    <path d={GOVDE} fill="#b07650" {...CIZGI} />
    <path d="M98 300q-2-52 18-76 44 22 88 0 20 24 18 76Z" fill="#4a9dd9" {...CIZGI} />
    <path d="M112 262h96" fill="none" stroke={KR} strokeWidth="8" />
    <path d="M136 226l24 40 24-40" fill="none" stroke={K} strokeWidth="14" strokeLinejoin="round" /><path d="M136 226l24 40 24-40" fill="none" stroke="#e8543f" strokeWidth="7" strokeLinejoin="round" />
    <circle cx="160" cy="276" r="18" fill="#f2b23c" {...CIZGI} /><path d="m160 266 4 8 8 1-6 5 2 8-8-4-8 4 2-8-6-5 8-1Z" fill="#c98a22" />
    {/* Saç (düzeltme, Ajan C 24 Eyl): eskiden yalnız ince dikenlerdi, aralarda ve bant altında ten
        görünüyordu → küçük boyutta kel okunuyordu. Şimdi bandın arkasında/üstünde dolu kıvırcık kütle
        + şakaklarda kısa saç. */}
    <path d="M84 170q-10-46 2-78 30-10 74-10 44 0 74 10 12 32 2 78-8 4-12-2l-4-26H100l-4 26q-4 6-12 2Z" fill="#1d1a19" {...CIZGI} />
    <path d={BAS} fill="#b07650" {...CIZGI} />
    <path d="M100 144q-2 14 2 28l7-3q-3-12-1-24ZM220 144q2 14-2 28l-7-3q3-12 1-24Z" fill="#1d1a19" {...CIZGI} />
    <path d="M86 124q-10-30 6-52-2-18 16-26 6-18 26-18 12-12 28-6 16-8 30 4 20-2 26 16 16 8 14 28 14 22 2 54-74-24-148 0Z" fill="#1d1a19" {...CIZGI} />
    <path d="M110 70q8-6 16-2M146 50q8-6 16-1M186 58q8-4 15 2M126 96q8-6 16-2M170 88q8-6 16-1M206 90q7-4 13 2" fill="none" stroke="#4a3a32" strokeWidth="5" strokeLinecap="round" />
    <path d="M114 58q14-18 36-20" fill="none" stroke={KR} strokeWidth="7" strokeLinecap="round" opacity=".75" />
    <path d="M88 118q72-26 144 0v26q-72-26-144 0Z" fill={KR} {...CIZGI} />
    <path d="M90 132q70-24 140 0" fill="none" stroke="#e8543f" strokeWidth="6" />
    <path d="M108 150l32 7M212 150l-32 7" fill="none" stroke={K} strokeWidth="8" strokeLinecap="round" />
    <Goz x={127} y={168} /><Goz x={193} y={168} />
    <path d="M160 170q-7 20 4 23l10-2" fill="none" {...CIZGI} />
    <path d="M130 204q30 14 60 0-4 26-30 27-26-1-30-27Z" fill={K} {...CIZGI} /><path d="M136 207q24 9 48 0v7q-24 8-48 0Z" fill={KR} />
  </svg>;
}

function Ogrenci() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Sırt çantalı öğrenci avatarı">
    <Sahne renk="#4fb3c9" vurgu="#d5f5f0" />
    <path d={GOVDE} fill="#e8543f" {...CIZGI} />
    <KalinCizgi d="M100 238q-4 32 4 62M220 238q4 32-4 62" renk="#f2b23c" en={15} />
    <path d="M136 228q24 16 48 0" fill="none" stroke={KR} strokeWidth="8" strokeLinecap="round" />
    <path d={BAS} fill="#f0cfa6" {...CIZGI} />
    <path d="M88 142q-10-66 36-90 0 14 6 18 18-28 54-26-4 10 2 16 28-6 46 16 12 18 16 64-18-24-38-28l-4 16-16-18-18 14-6-18q-40 16-78 36Z" fill="#8a5f16" {...CIZGI} />
    <path d="M226 150l30-44" fill="none" stroke={K} strokeWidth="18" strokeLinecap="round" /><path d="M226 150l30-44" fill="none" stroke="#f2b23c" strokeWidth="9" strokeLinecap="round" />
    <path d="m250 114 12-18" fill="none" stroke="#e0729a" strokeWidth="9" strokeLinecap="round" />
    <path d="M110 144q15-10 30 1M182 145q15-11 30-1" fill="none" {...CIZGI} />
    <IriGoz x={127} y={165} bak={2} /><IriGoz x={195} y={165} bak={-2} />
    <Burun y={170} /><Yanak y={200} />
    <path d="M136 206q24 14 48 0-6 24-24 24-18 0-24-24Z" fill="#b83e60" {...CIZGI} />
  </svg>;
}

function BilimInsani() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Gözlüklü bilim insanı avatarı">
    <Sahne renk="#5aa9e6" vurgu="#d5efff" />
    <circle cx="160" cy="44" r="26" fill="#3b2a20" {...CIZGI} />
    <path d={GOVDE} fill={KR} {...CIZGI} />
    <path d="M128 226l32 48 32-48" fill="#cfe3f5" {...CIZGI} />
    <path d="M86 226h30M90 244h20" fill="none" stroke="#8496b2" strokeWidth="6" strokeLinecap="round" />
    <path d={BAS_INCE} fill="#e6c79a" {...CIZGI} />
    <path d="M94 148q-4-80 66-88 70 8 66 88-26-30-66-38-40 8-66 38Z" fill="#3b2a20" {...CIZGI} />
    <path d="M94 106q66-24 132 0" fill="none" stroke="#26365a" strokeWidth="10" strokeLinecap="round" />
    <circle cx="132" cy="104" r="18" fill="#4fb3c9" {...CIZGI} /><circle cx="188" cy="104" r="18" fill="#4fb3c9" {...CIZGI} />
    <path d="M124 98q6-6 12-6M180 98q6-6 12-6" fill="none" stroke={KR} strokeWidth="5" strokeLinecap="round" />
    <path d="M112 146q14-9 28 1M182 147q14-10 28-1" fill="none" {...CIZGI} />
    <Goz x={127} y={164} /><Goz x={195} y={164} />
    <Burun y={168} />
    <path d="M136 206q26 16 50-2" fill="none" {...CIZGI} />
    <path d="M214 240v-24h26v24l26 46q5 12-10 12h-58q-15 0-10-12Z" fill={KR} {...CIZGI} />
    <path d="M200 268h80l4 10q4 16-10 16h-68q-14 0-10-16Z" fill="#2fbf71" />
    <path d="M214 240v-24h26v24l26 46q5 12-10 12h-58q-15 0-10-12Z" fill="none" {...CIZGI} />
    <circle cx="222" cy="280" r="4" fill={KR} /><circle cx="240" cy="274" r="5" fill={KR} />
  </svg>;
}

function Doktor() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Steteskoplu doktor avatarı">
    <Sahne renk="#5c7fa8" vurgu="#cfe3f5" />
    <path d={GOVDE} fill={KR} {...CIZGI} />
    <path d="M130 226l30 38 30-38v74h-60Z" fill="#3fa9a0" {...CIZGI} />
    <path d="M112 232q-6 52 36 58M208 232q6 52-36 58" fill="none" stroke="#26365a" strokeWidth="8" strokeLinecap="round" />
    <circle cx="160" cy="290" r="13" fill="#c9d3e2" {...CIZGI} />
    <path d="M92 250h26" fill="none" stroke="#e8543f" strokeWidth="7" strokeLinecap="round" />
    <ellipse cx="90" cy="168" rx="12" ry="17" fill="#c68e5f" {...CIZGI} /><ellipse cx="230" cy="168" rx="12" ry="17" fill="#c68e5f" {...CIZGI} />
    <path d={BAS} fill="#c68e5f" {...CIZGI} />
    <path d="M90 138q-8-74 70-84 78 10 70 84-8-22-22-26-14 12-30 4-10 12-20 6-12 10-24 2-14 8-24-4-20 8-24 18Z" fill="#1d1a19" {...CIZGI} />
    <path d="M110 144q15-10 30 1M182 145q15-11 30-1" fill="none" {...CIZGI} />
    <Goz x={127} y={164} /><Goz x={195} y={164} />
    <Burun y={168} />
    <path d="M132 204q28 20 58-2" fill="none" {...CIZGI} />
  </svg>;
}

function Veteriner() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Köpek yavrulu veteriner avatarı">
    <Sahne renk="#f2b23c" vurgu="#fff0bc" />
    <path d="M204 76q66 6 58 96-16-34-44-44Z" fill="#3b2a20" {...CIZGI} />
    <path d={GOVDE} fill="#2fbf71" {...CIZGI} />
    <path d="M132 226l28 32 28-32" fill="#218452" {...CIZGI} />
    <circle cx="112" cy="270" r="14" fill={KR} {...CIZGI} /><g fill="#8a5f16"><circle cx="112" cy="274" r="5" /><circle cx="105" cy="264" r="2.6" /><circle cx="112" cy="261" r="2.6" /><circle cx="119" cy="264" r="2.6" /></g>
    <path d={BAS_INCE} fill="#a86a45" {...CIZGI} />
    <path d="M94 148q-4-82 66-90 66 6 68 82-40 4-70-30-20 26-64 38Z" fill="#3b2a20" {...CIZGI} />
    <path d="M112 146q14-9 28 1M182 147q14-10 28-1" fill="none" {...CIZGI} />
    <IriGoz x={127} y={165} /><IriGoz x={195} y={165} />
    <path d="M160 168q-8 18 3 22l11-2" fill="none" {...CIZGI} />
    <path d="M136 204q24 18 48 0-4 20-24 21-20-1-24-21Z" fill="#6b2a2e" {...CIZGI} />
    <path d="M214 246q-22 28 2 44M262 246q22 28-2 44" fill="#8a5f16" {...CIZGI} />
    <circle cx="238" cy="266" r="28" fill="#c98a22" {...CIZGI} />
    <circle cx="228" cy="262" r="4.5" fill={K} /><circle cx="248" cy="262" r="4.5" fill={K} />
    <ellipse cx="238" cy="276" rx="8" ry="6" fill={K} /><path d="M238 282q-3 8-9 7M238 282q3 8 9 7" fill="none" stroke={K} strokeWidth="4" strokeLinecap="round" />
  </svg>;
}

/* ============================ KOSTÜMLÜ (14) ============================ */

function GolgeNinja() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kılıçlı gölge ninja avatarı">
    <Sahne renk="#3fa9a0" vurgu="#c8f3e9" />
    <path d="M200 126 262 38" fill="none" stroke={K} strokeWidth="22" strokeLinecap="round" /><path d="M200 126 262 38" fill="none" stroke="#7b5cc4" strokeWidth="12" strokeLinecap="round" strokeDasharray="10 8" />
    <ellipse cx="214" cy="108" rx="22" ry="9" transform="rotate(-55 214 108)" fill="#f2b23c" {...CIZGI} />
    <path d={GOVDE_GENIS} fill="#1f2a44" {...CIZGI} />
    <path d="M70 150q0-96 90-104 90 8 90 104-2 90-90 102-88-12-90-102Z" fill="#1f2a44" {...CIZGI} />
    <path d="M88 140q72-28 144 0l-6 44q-66 22-132 0Z" fill="#e6c79a" {...CIZGI} />
    <path d="M102 146l38 9M218 146l-38 9" fill="none" stroke={K} strokeWidth="8" strokeLinecap="round" />
    <Goz x={127} y={167} /><Goz x={193} y={167} />
    <path d="M78 190q82 30 164 0l-4 32q-78 30-156 0Z" fill="#7b5cc4" {...CIZGI} />
    <path d="M82 202l-46 12 42 16M84 212l-34 30 44-6" fill="#7b5cc4" {...CIZGI} />
    <path d="M122 226q38 12 76 0" fill="none" stroke="#5a3f99" strokeWidth="6" strokeLinecap="round" />
  </svg>;
}

function Samuray() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Miğferli samuray avatarı">
    <Sahne renk="#4a9dd9" vurgu="#bce7ff" />
    <path d="M44 300q6-64 116-78 110 14 116 78" fill="#b93737" {...CIZGI} />
    <path d="M64 264q96-30 192 0M56 286q104-30 208 0" fill="none" stroke="#f2b23c" strokeWidth="6" />
    <path d={BAS} fill="#e6c79a" {...CIZGI} />
    <path d="M78 130q-18 32-26 66 32-8 48-34M242 130q18 32 26 66-32-8-48-34" fill="#26365a" {...CIZGI} />
    <path d="M84 132q0-84 76-88 76 4 76 88Z" fill="#26365a" {...CIZGI} />
    <path d="M74 122q86-20 172 0v24q-86-20-172 0Z" fill="#b93737" {...CIZGI} />
    <path d="M110 106q-16-50 14-80-2 38 22 66M210 106q16-50-14-80 2 38-22 66" fill="#f2b23c" {...CIZGI} />
    <circle cx="160" cy="98" r="14" fill="#f2b23c" {...CIZGI} />
    <path d="M106 152l34 8M214 152l-34 8" fill="none" stroke={K} strokeWidth="8" strokeLinecap="round" />
    <Goz x={127} y={170} r={7} /><Goz x={193} y={170} r={7} />
    <path d="M160 172q-7 18 4 21l9-2" fill="none" {...CIZGI} />
    <path d="M134 202q26-10 52 0M134 202q-14 6-18 20M186 202q14 6 18 20" fill="none" stroke={K} strokeWidth="7" strokeLinecap="round" />
    <path d="M144 218h32" fill="none" {...CIZGI} />
  </svg>;
}

function NoelBaba() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Noel Baba avatarı">
    <Sahne renk="#2fbf71" vurgu="#bff1d3" />
    <path d={GOVDE_GENIS} fill="#e8543f" {...CIZGI} />
    <path d={BAS} fill="#f0cfa6" {...CIZGI} />
    <path d="M84 156q-10 112 76 132 86-20 76-132-16 28-40 30-12-12-36-12-24 0-36 12-24-2-40-30Z" fill={KR} {...CIZGI} />
    <path d="M160 200q-22-18-46 0 12 16 46 4 34 12 46-4-24-18-46 0Z" fill={KR} {...CIZGI} />
    <path d="M148 216q12 8 24 0" fill="none" {...CIZGI} />
    <circle cx="160" cy="184" r="11" fill="#e88aa2" {...CIZGI} />
    <path d="M90 118q6-76 76-76 62 2 84 68 10 26 28 40-40 8-52-40l-6 8Z" fill="#e8543f" {...CIZGI} />
    <circle cx="276" cy="152" r="17" fill={KR} {...CIZGI} />
    <path d="M80 106q80-22 160 0v30q-80-22-160 0Z" fill={KR} {...CIZGI} />
    <KalinCizgi d="M110 148q16-10 32-2M178 146q16-8 32 2" renk={KR} en={9} />
    <Goz x={127} y={166} /><Goz x={193} y={166} />
    <Yanak y={186} sol={108} sag={212} />
  </svg>;
}

function KorsanKaptan() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Papağanlı korsan kaptan avatarı">
    <Sahne renk="#c98a22" vurgu="#ffe19b" />
    <path d={GOVDE_GENIS} fill="#26365a" {...CIZGI} />
    <path d="M120 228l40 44 40-44" fill="none" stroke="#f2b23c" strokeWidth="8" strokeLinejoin="round" />
    <path d="M140 232q20 20 40 0l-6 30h-28Z" fill={KR} {...CIZGI} />
    <path d={BAS} fill="#e6c79a" {...CIZGI} />
    <circle cx="94" cy="206" r="10" fill="none" stroke={K} strokeWidth="11" /><circle cx="94" cy="206" r="10" fill="none" stroke="#f2b23c" strokeWidth="5" />
    <path d="M98 188q10 58 62 60 52-2 62-60-14 16-30 14-14-8-32-8-18 0-32 8-16 2-30-14Z" fill="#1d1a19" {...CIZGI} />
    <path d="M160 196q-18-14-40-2-6 10 4 12 16-10 36-4 20-6 36 4 10-2 4-12-22-12-40 2Z" fill="#1d1a19" {...CIZGI} />
    <path d="M140 212q20 14 40 0-6 14-20 14-14 0-20-14Z" fill="#b83e60" {...CIZGI} />
    <path d="M56 122q40-84 104-84 64 0 104 84-44-18-104-18-60 0-104 18Z" fill="#1d1a19" {...CIZGI} />
    <path d="M64 116q96-34 192 0" fill="none" stroke="#f2b23c" strokeWidth="7" strokeLinecap="round" />
    <circle cx="160" cy="76" r="13" fill={KR} {...CIZGI} /><path d="M146 96l28-10M146 86l28 10" fill="none" stroke={KR} strokeWidth="6" strokeLinecap="round" />
    <path d="M108 148q16-10 32 1M180 149q16-11 32-1" fill="none" stroke={K} strokeWidth="8" strokeLinecap="round" />
    <Goz x={127} y={166} /><Goz x={193} y={166} />
    <path d="M160 168q-7 16 4 19l9-2" fill="none" {...CIZGI} />
    <ellipse cx="244" cy="248" rx="20" ry="28" fill="#2fbf71" {...CIZGI} />
    <path d="M232 248q6 22 24 26" fill="none" stroke="#e8543f" strokeWidth="8" strokeLinecap="round" />
    <circle cx="246" cy="214" r="17" fill="#2fbf71" {...CIZGI} />
    <path d="M258 208q18 2 12 20l-12-6Z" fill="#f2b23c" {...CIZGI} />
    <circle cx="246" cy="210" r="4" fill={K} />
  </svg>;
}

function UzayKasifi() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kasklı uzay kaşifi avatarı">
    <Sahne renk="#26365a" vurgu="#5c7fa8" /><Yildizlar />
    <path d="M50 300q8-70 110-80 102 10 110 80" fill="#f7f3ea" {...CIZGI} />
    <rect x="124" y="252" width="72" height="48" rx="10" fill="#ee8b3c" {...CIZGI} />
    <circle cx="142" cy="272" r="6" fill="#4fb3c9" /><circle cx="160" cy="272" r="6" fill="#f2b23c" /><circle cx="178" cy="272" r="6" fill="#2fbf71" />
    <path d="M226 62l18-28" fill="none" {...CIZGI} /><circle cx="248" cy="28" r="9" fill="#ee8b3c" {...CIZGI} />
    <rect x="62" y="44" width="196" height="196" rx="84" fill="#f7f3ea" {...CIZGI} />
    <path d="M112 54q48-14 96 0" fill="none" stroke="#ee8b3c" strokeWidth="12" strokeLinecap="round" />
    <rect x="88" y="94" width="144" height="124" rx="54" fill="#26365a" {...CIZGI} />
    <ellipse cx="160" cy="162" rx="52" ry="54" fill="#c68e5f" {...CIZGI} />
    <path d="M108 150q2-44 52-46 50 2 52 46-24-20-52-20-28 0-52 20Z" fill="#3b2a20" {...CIZGI} />
    <Goz x={140} y={164} r={7} /><Goz x={180} y={164} r={7} />
    <path d="M142 190q18 14 36 0" fill="none" {...CIZGI} />
    <path d="M104 118q10-14 26-16" fill="none" stroke={KR} strokeWidth="7" strokeLinecap="round" opacity=".7" />
  </svg>;
}

function Vampir() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Pelerinli vampir avatarı">
    <Sahne renk="#8a6fd1" vurgu="#d7ccf5" />
    <path d="M58 116q34 44 60 110h84q26-66 60-110 20 94 10 184H48q-10-90 10-184Z" fill="#1d1a19" {...CIZGI} />
    <path d="M72 146q26 36 46 80H80q-12-40-8-80ZM248 146q-26 36-46 80h38q12-40 8-80Z" fill="#b93737" {...CIZGI} />
    <path d="M92 300q4-52 68-78 64 26 68 78Z" fill="#1d1a19" {...CIZGI} />
    <path d="M140 226l20 38 20-38" fill={KR} {...CIZGI} />
    <path d="M148 234l12 6 12-6v12l-12-6-12 6Z" fill="#b93737" {...CIZGI} />
    <path d="M96 150l-26-22 22 50ZM224 150l26-22-22 50Z" fill="#dfe6ef" {...CIZGI} />
    <path d={BAS_INCE} fill="#dfe6ef" {...CIZGI} />
    <path d="M92 142q-6-84 68-88 74 4 68 88-8-28-28-38-18 6-40 34-22-28-40-34-20 10-28 38Z" fill="#1d1a19" {...CIZGI} />
    <path d="M108 150l32 8M212 150l-32 8" fill="none" stroke={K} strokeWidth="7" strokeLinecap="round" />
    <IriGoz x={127} y={168} bebek="#b93737" /><IriGoz x={193} y={168} bebek="#b93737" />
    <path d="M160 172q-6 18 4 21l9-2" fill="none" {...CIZGI} />
    <path d="M134 206q26 14 52 0" fill="none" {...CIZGI} />
    <path d="M143 209l5 12 5-10M167 209l5 10 5-12" fill={KR} stroke={K} strokeWidth="3.5" strokeLinejoin="round" />
  </svg>;
}

function AtesBuyucusu() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Ateş büyücüsü avatarı">
    <Sahne renk="#26365a" vurgu="#5c7fa8" />
    <path d="M62 300q-6-150 38-214 28-42 60-48 32 6 60 48 44 64 38 214Z" fill="#b93737" {...CIZGI} />
    <path d="M98 176q-4-90 62-100 66 10 62 100v84H98Z" fill="#5a1f1f" {...CIZGI} />
    <path d="M104 166q0-68 56-74 56 6 56 74-2 62-56 72-54-10-56-72Z" fill="#f0cfa6" {...CIZGI} />
    <path d="M104 156q4-54 56-60 52 6 56 60-22-26-56-30-34 4-56 30Z" fill="#ee8b3c" {...CIZGI} />
    <path d="M160 40q-10 14 0 26 10-12 0-26Z" fill="#f2b23c" {...CIZGI} />
    <path d="M120 152q13-9 26 1M174 153q13-10 26-1" fill="none" {...CIZGI} />
    <IriGoz x={134} y={170} bebek="#ee8b3c" /><IriGoz x={186} y={170} bebek="#ee8b3c" />
    <path d="M160 176q-5 14 4 17l7-2" fill="none" {...CIZGI} />
    <path d="M140 208q22 12 42-4" fill="none" {...CIZGI} />
    <circle cx="160" cy="268" r="11" fill="#f2b23c" {...CIZGI} />
    <circle cx="238" cy="272" r="17" fill="#f0cfa6" {...CIZGI} />
    <path d="M238 256q-28-30 0-70 4 24 18 32 14-20 6-42 32 38 10 80-12 12-34 0Z" fill="#ee8b3c" {...CIZGI} />
    <path d="M240 248q-12-18 2-34 6 16 14 18 4 12-4 16Z" fill="#f2b23c" />
  </svg>;
}

function MekanikRobot() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Zırhlı mekanik robot avatarı">
    <Sahne renk="#8496b2" vurgu="#dce4ef" />
    <path d="M40 300l14-62 62-22 44 12 44-12 62 22 14 62Z" fill="#ee8b3c" {...CIZGI} />
    <path d="M120 240h80l-10 60h-60Z" fill="#26365a" {...CIZGI} />
    <circle cx="160" cy="268" r="13" fill="#4fb3c9" {...CIZGI} />
    <path d="M146 58l14-34 14 34Z" fill="#e8543f" {...CIZGI} />
    <circle cx="86" cy="150" r="16" fill="#ee8b3c" {...CIZGI} /><circle cx="234" cy="150" r="16" fill="#ee8b3c" {...CIZGI} />
    <path d="M92 90l24-36h88l24 36v112l-28 36h-80l-28-36Z" fill="#f2b23c" {...CIZGI} />
    <path d="M100 128h120l-8 46H108Z" fill={K} {...CIZGI} />
    <ellipse cx="134" cy="151" rx="16" ry="9" fill="#4fb3c9" /><ellipse cx="186" cy="151" rx="16" ry="9" fill="#4fb3c9" />
    <circle cx="138" cy="148" r="3.5" fill={KR} /><circle cx="190" cy="148" r="3.5" fill={KR} />
    <path d="M132 196h56M132 212h56" fill="none" stroke="#26365a" strokeWidth="7" strokeLinecap="round" />
    <path d="M118 74h84" fill="none" stroke="#c98a22" strokeWidth="7" strokeLinecap="round" />
  </svg>;
}

function PelerinliKahraman() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Pelerinli süper kahraman avatarı">
    <Sahne renk="#4a9dd9" vurgu="#cfeeff" />
    <path d="M26 300q10-72 64-92h140q54 20 64 92Z" fill="#ee8b3c" {...CIZGI} />
    <path d="M62 300q8-68 98-76 90 8 98 76" fill="#2fbf71" {...CIZGI} />
    <path d="M98 230l-22-38 44 26M222 230l22-38-44 26" fill="#ee8b3c" {...CIZGI} />
    <circle cx="160" cy="272" r="23" fill="#f2b23c" {...CIZGI} />
    <path d="M143 280a17 17 0 0 1 34 0Z" fill="#e8543f" {...CIZGI} />
    <path d="M160 252v8M145 258l5 6M175 258l-5 6" fill="none" stroke={K} strokeWidth="4" strokeLinecap="round" />
    <ellipse cx="90" cy="166" rx="12" ry="17" fill="#e6c79a" {...CIZGI} /><ellipse cx="230" cy="166" rx="12" ry="17" fill="#e6c79a" {...CIZGI} />
    <path d={BAS} fill="#e6c79a" {...CIZGI} />
    <path d="M90 134Q80 72 120 48q30-18 60-12 22-22 50-14-12 8-14 20 20 20 16 70-18-18-34-40-40 24-88 26-2 20-20 36Z" fill="#26365a" {...CIZGI} />
    <path d="M106 146q17-11 34 1M180 147q17-12 34-1" fill="none" stroke={K} strokeWidth="8" strokeLinecap="round" />
    <Goz x={127} y={164} /><Goz x={193} y={164} />
    <Burun y={168} />
    <path d="M130 202q30 16 60 0-4 22-30 23-26-1-30-23Z" fill={K} {...CIZGI} /><path d="M136 204q24 8 48 0v6q-24 8-48 0Z" fill={KR} />
  </svg>;
}

function GeceBekcisi() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kukuletalı maskeli gece bekçisi avatarı">
    <Sahne renk="#f2b23c" vurgu="#fff1b8" />
    <path d="M60 300q-8-150 42-214 26-36 58-40 32 4 58 40 50 64 42 214Z" fill="#26365a" {...CIZGI} />
    <path d="M96 176q-2-92 64-100 66 8 64 100v70H96Z" fill="#1b2440" {...CIZGI} />
    <path d="M92 300q6-56 68-74 62 18 68 74Z" fill="#3b4a6b" {...CIZGI} />
    <path d="M168 254a19 19 0 1 0 0 32 15 15 0 1 1 0-32Z" fill={KR} {...CIZGI} />
    <path d="M104 162q0-68 56-74 56 6 56 74-2 62-56 72-54-10-56-72Z" fill="#c68e5f" {...CIZGI} />
    <path d="M100 150q60-26 120 0l-6 30q-24 10-40-4l-14-6-14 6q-16 14-40 4Z" fill="#7b5cc4" {...CIZGI} />
    <ellipse cx="133" cy="163" rx="11" ry="9" fill={KR} /><circle cx="135" cy="164" r="5.5" fill={K} />
    <ellipse cx="187" cy="163" rx="11" ry="9" fill={KR} /><circle cx="185" cy="164" r="5.5" fill={K} />
    <path d="M160 184q-5 14 4 17l7-2" fill="none" {...CIZGI} />
    <path d="M140 210q22 10 42-4" fill="none" {...CIZGI} />
  </svg>;
}

function YildizSovalyesi() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Enerji kılıçlı yıldız şövalyesi avatarı">
    <Sahne renk="#26365a" vurgu="#5c7fa8" /><Yildizlar />
    <path d="M240 236 284 50" fill="none" stroke="#e0729a" strokeWidth="30" strokeLinecap="round" opacity=".35" />
    <path d="M230 232l44-182 16-16 2 22-44 180Z" fill={KR} stroke="#e0729a" strokeWidth="6" strokeLinejoin="round" />
    <path d="M212 236l34-12 36 14-34 8Z" fill="#8496b2" {...CIZGI} />
    <path d="M50 300q8-70 110-80 102 10 110 80" fill="#cfe3f5" {...CIZGI} />
    <circle cx="78" cy="262" r="24" fill="#8496b2" {...CIZGI} /><circle cx="242" cy="262" r="24" fill="#8496b2" {...CIZGI} />
    <path d="M110 268q50 18 100 0" fill="none" stroke="#4fb3c9" strokeWidth="7" strokeLinecap="round" />
    <path d="M160 18l-12 30h24Z" fill="#4fb3c9" {...CIZGI} />
    <path d="M78 162q-2-112 82-118 84 6 82 118l-6 60-26 12V152H110v82l-26-12Z" fill="#cfe3f5" {...CIZGI} />
    <path d="M118 72q42-22 84 0" fill="none" stroke="#4fb3c9" strokeWidth="8" strokeLinecap="round" />
    <path d="M106 164q0-66 54-72 54 6 54 72-2 64-54 72-52-8-54-72Z" fill="#b07650" {...CIZGI} />
    <path d="M118 150l26 6M202 150l-26 6" fill="none" stroke={K} strokeWidth="7" strokeLinecap="round" />
    <Goz x={136} y={168} r={7} /><Goz x={184} y={168} r={7} />
    <path d="M160 172q-5 16 4 19l8-2" fill="none" {...CIZGI} />
    <path d="M142 208q18 12 36 0" fill="none" {...CIZGI} />
  </svg>;
}

function LabCanavari() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Üç gözlü laboratuvar canavarı avatarı">
    <Sahne renk="#8cbf3f" vurgu="#dff0a8" />
    <path d="M50 300q-4-64 30-90-22-40-8-98 18-64 88-66 70 2 88 66 14 58-8 98 34 26 30 90Z" fill="#9b6fd0" {...CIZGI} />
    <path d="M78 212q-6 22 4 30 10-8 6-28M240 212q6 22-4 30-10-8-6-28" fill="#9b6fd0" {...CIZGI} />
    <g fill="#7b5cc4"><circle cx="100" cy="108" r="9" /><circle cx="224" cy="100" r="7" /><circle cx="236" cy="170" r="10" /><circle cx="86" cy="176" r="7" /></g>
    <path d="M144 62V30h32v32q30 12 28 36H116q-2-24 28-36Z" fill="#cfe3f5" {...CIZGI} />
    <path d="M119 88q41-10 82 0l1 10H118Z" fill="#2fbf71" />
    <path d="M144 62V30h32v32q30 12 28 36H116q-2-24 28-36Z" fill="none" {...CIZGI} />
    <circle cx="152" cy="18" r="5" fill="#2fbf71" /><circle cx="170" cy="10" r="4" fill="#2fbf71" />
    <ellipse cx="160" cy="142" rx="24" ry="26" fill={KR} {...CIZGI} /><circle cx="162" cy="146" r="11" fill={K} /><circle cx="165" cy="142" r="4" fill={KR} />
    <circle cx="110" cy="164" r="15" fill={KR} {...CIZGI} /><circle cx="113" cy="166" r="7" fill={K} />
    <circle cx="210" cy="164" r="15" fill={KR} {...CIZGI} /><circle cx="207" cy="166" r="7" fill={K} />
    <path d="M110 198q50 40 100 0-10 42-50 44-40-2-50-44Z" fill={K} {...CIZGI} />
    <path d="M148 204l7 14 7-13Z" fill={KR} /><path d="M176 206l5 10 6-11Z" fill={KR} />
  </svg>;
}

function YuceKral() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kürk yakalı yüce kral avatarı">
    <Sahne renk="#57c9a0" vurgu="#d9f7e6" />
    <path d="M50 300q8-70 110-80 102 10 110 80" fill="#7b5cc4" {...CIZGI} />
    <path d="M68 262q92-48 184 0l6 30q-98-46-196 0Z" fill={KR} {...CIZGI} />
    <g fill={K}><ellipse cx="96" cy="264" rx="3" ry="6" /><ellipse cx="128" cy="252" rx="3" ry="6" /><ellipse cx="160" cy="248" rx="3" ry="6" /><ellipse cx="192" cy="252" rx="3" ry="6" /><ellipse cx="224" cy="264" rx="3" ry="6" /></g>
    <path d={BAS} fill="#8d5a3b" {...CIZGI} />
    <path d="M98 188q8 62 62 64 54-2 62-64-12 18-28 16-12-10-34-10-22 0-34 10-16 2-28-16Z" fill="#1d1a19" {...CIZGI} />
    <path d="M142 212q18 12 36 0" fill="none" stroke="#b83e60" strokeWidth="7" strokeLinecap="round" />
    <path d="M110 110q16-44 50-44 34 0 50 44Z" fill="#b93737" {...CIZGI} />
    <path d="M90 116q6-56 30-64 18 24 40 24 22 0 40-24 24 8 30 64Z" fill="none" stroke={K} strokeWidth="14" strokeLinejoin="round" />
    <path d="M90 116q6-56 30-64 18 24 40 24 22 0 40-24 24 8 30 64" fill="none" stroke="#f2b23c" strokeWidth="7" strokeLinejoin="round" />
    <path d="M86 108h148v30H86Z" fill="#f2b23c" {...CIZGI} />
    <circle cx="160" cy="48" r="13" fill="#f2b23c" {...CIZGI} /><path d="M160 22v14M153 29h14" fill="none" {...CIZGI} />
    <circle cx="118" cy="123" r="6" fill="#4fb3c9" /><circle cx="160" cy="123" r="7" fill="#e8543f" /><circle cx="202" cy="123" r="6" fill="#4fb3c9" />
    <path d="M108 150q17-10 34 1M178 151q17-11 34-1" fill="none" stroke={K} strokeWidth="8" strokeLinecap="round" />
    <IriGoz x={127} y={168} /><IriGoz x={193} y={168} />
    <path d="M160 172q-8 16 3 20l11-2" fill="none" {...CIZGI} />
  </svg>;
}

function Kralice() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Taçlı kraliçe avatarı">
    <Sahne renk="#d9536a" vurgu="#ffb9c4" />
    <ellipse cx="160" cy="48" rx="34" ry="24" fill="#3b2a20" {...CIZGI} />
    <path d="M84 176q-14-114 76-120 90 6 76 120-10-36-22-58H106q-12 22-22 58Z" fill="#3b2a20" {...CIZGI} />
    <path d={GOVDE_GENIS} fill="#4a9dd9" {...CIZGI} />
    <path d="M94 240q-28-22-32-58 32 16 58 46M226 240q28-22 32-58-32 16-58 46" fill={KR} {...CIZGI} />
    <path d={BAS_INCE} fill="#e6c79a" {...CIZGI} />
    <path d="M94 142q-2-70 66-80 68 10 66 80-24-34-66-38-42 4-66 38Z" fill="#3b2a20" {...CIZGI} />
    <path d="M112 94l8-34 20 22 20-36 20 36 20-22 8 34Z" fill="#f2b23c" {...CIZGI} />
    <circle cx="160" cy="76" r="6" fill="#e8543f" /><circle cx="130" cy="84" r="4.5" fill="#4fb3c9" /><circle cx="190" cy="84" r="4.5" fill="#4fb3c9" />
    <path d="M112 146q14-9 28 1M182 147q14-10 28-1" fill="none" {...CIZGI} />
    <Goz x={127} y={164} /><Goz x={195} y={164} />
    <path d="M114 157l-8-5M208 157l8-5" fill="none" {...CIZGI} />
    <Burun y={168} /><Yanak y={196} sol={110} sag={210} />
    <path d="M140 206q20 14 40 0-8 12-20 12-12 0-20-12Z" fill="#b83e60" {...CIZGI} />
    <g fill={KR} stroke={K} strokeWidth="3"><circle cx="124" cy="240" r="6" /><circle cx="141" cy="248" r="6" /><circle cx="160" cy="251" r="6" /><circle cx="179" cy="248" r="6" /><circle cx="196" cy="240" r="6" /></g>
  </svg>;
}

// Sıra ve anahtarlar migration 520 › avatar_katalogu ile aynı. Ad/tür sunucudan gelir;
// buradaki `ad` yalnız önizleme ve üretici için yedek.
export const AVATAR_PRO2 = [
  { anahtar: "sarisin-y01", tur: "gunluk", ad: "Sarışın", Bilesen: Sarisin },
  { anahtar: "kivircik-y02", tur: "gunluk", ad: "Kıvırcık", Bilesen: Kivircik },
  { anahtar: "kizil-y03", tur: "gunluk", ad: "Kızıl", Bilesen: Kizil },
  { anahtar: "basortulu-y04", tur: "gunluk", ad: "Başörtülü", Bilesen: Basortulu },
  { anahtar: "gozluklu-y05", tur: "gunluk", ad: "Gözlüklü", Bilesen: Gozluklu },
  { anahtar: "kel-y06", tur: "gunluk", ad: "Kel", Bilesen: Kel },
  { anahtar: "sakalli-y07", tur: "gunluk", ad: "Sakallı", Bilesen: Sakalli },
  { anahtar: "dede-y08", tur: "gunluk", ad: "Bilge Dede", Bilesen: Dede },
  { anahtar: "sporcu-y09", tur: "gunluk", ad: "Sporcu", Bilesen: Sporcu },
  { anahtar: "ogrenci-y10", tur: "gunluk", ad: "Öğrenci", Bilesen: Ogrenci },
  { anahtar: "bilim-y11", tur: "gunluk", ad: "Bilim İnsanı", Bilesen: BilimInsani },
  { anahtar: "doktor-y12", tur: "gunluk", ad: "Doktor", Bilesen: Doktor },
  { anahtar: "veteriner-y13", tur: "gunluk", ad: "Veteriner", Bilesen: Veteriner },
  { anahtar: "golge-ninja-y14", tur: "kostumlu", ad: "Gölge Ninja", Bilesen: GolgeNinja },
  { anahtar: "samuray-y15", tur: "kostumlu", ad: "Samuray", Bilesen: Samuray },
  { anahtar: "noel-baba-y16", tur: "kostumlu", ad: "Noel Baba", Bilesen: NoelBaba },
  { anahtar: "kaptan-y17", tur: "kostumlu", ad: "Korsan Kaptan", Bilesen: KorsanKaptan },
  { anahtar: "uzay-kasifi-y18", tur: "kostumlu", ad: "Uzay Kaşifi", Bilesen: UzayKasifi },
  { anahtar: "vampir-y19", tur: "kostumlu", ad: "Vampir", Bilesen: Vampir },
  { anahtar: "ates-buyucu-y20", tur: "kostumlu", ad: "Ateş Büyücüsü", Bilesen: AtesBuyucusu },
  { anahtar: "mekanik-y21", tur: "kostumlu", ad: "Mekanik Robot", Bilesen: MekanikRobot },
  { anahtar: "pelerinli-y22", tur: "kostumlu", ad: "Pelerinli Kahraman", Bilesen: PelerinliKahraman },
  { anahtar: "gece-y23", tur: "kostumlu", ad: "Gece Bekçisi", Bilesen: GeceBekcisi },
  { anahtar: "uzay-sovalye-y24", tur: "kostumlu", ad: "Yıldız Şövalyesi", Bilesen: YildizSovalyesi },
  { anahtar: "canavar-y25", tur: "kostumlu", ad: "Laboratuvar Canavarı", Bilesen: LabCanavari },
  { anahtar: "yuce-kral-y26", tur: "kostumlu", ad: "Yüce Kral", Bilesen: YuceKral },
  { anahtar: "kralice-y27", tur: "kostumlu", ad: "Kraliçe", Bilesen: Kralice },
];
