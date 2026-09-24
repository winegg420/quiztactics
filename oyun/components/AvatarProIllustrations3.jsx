// Yeni profil avatarları 3. set (12) — Ajan C, 24 Eyl 2026.
// Çizim dili AvatarProIllustrations.jsx / AvatarProIllustrations2.jsx ile aynı: CIZGI (koyu kontur, 5 px),
// Sahne (renkli yuvarlatılmış kare, 320×320), düz renk + 2–3 ton gölge, her ana yüzeyde net beyaz parlama,
// güçlü siluet, küçük boyutta okunur yüz.
// Statik dosyalar: oyun/_test/avatar-pro-uret.mjs → public/avatars/pro2/<anahtar>.svg (url kısıtı 520 aynı kalsın
// diye pro2 klasörü; kaynak ayrı dosyada). Katalog: migration 595 › avatar_katalogu (aktif = false; Ida
// /avatar-onizleme'de "Girsin" deyince dosyanın sonundaki tek satırla açılır).
// Bu modül yalnız üretici ve önizleme araçları içindir; oyun statik SVG dosyasını gösterir (ana pakete girmez).
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

// Net beyaz parlama çizgisi (her ana yüzeyde bir tane).
function Parlama({ d, en = 7, op = 0.75 }) {
  return <path d={d} fill="none" stroke={KR} strokeWidth={en} strokeLinecap="round" opacity={op} />;
}

function Yildizlar() {
  return <g fill={KR} opacity=".85"><circle cx="42" cy="118" r="4" /><circle cx="282" cy="104" r="3" /><circle cx="58" cy="226" r="3" /><circle cx="274" cy="222" r="4" /><circle cx="252" cy="36" r="3" /><circle cx="70" cy="34" r="3" /></g>;
}

/* ============================ UZAYLILAR (2) ============================ */

// Uzun kafatası, turkuaz deri, çekik iri kara gözler, başında pembe kristaller.
function KristalUzayli() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kristal taçlı uzaylı avatarı">
    <Sahne renk="#6b4fb8" vurgu="#d7ccf5" /><Yildizlar />
    <path d={GOVDE} fill="#cfe3f5" {...CIZGI} />
    <path d="M96 262q64 26 128 0" fill="none" stroke="#8496b2" strokeWidth="7" strokeLinecap="round" />
    <path d="M110 230q50 26 100 0l8 22q-58 30-116 0Z" fill="#8a6fd1" {...CIZGI} />
    <circle cx="160" cy="270" r="10" fill="#e0729a" {...CIZGI} />
    <path d="M130 66L102 24l14-12 30 46Z" fill="#ffb9d6" {...CIZGI} /><path d="M116 12l30 46-8 4Z" fill="#e89ac0" />
    <path d="M130 66L102 24l14-12 30 46Z" fill="none" {...CIZGI} />
    <path d="M190 66l28-42-14-12-30 46Z" fill="#ffb9d6" {...CIZGI} /><path d="M204 12l-30 46 8 4Z" fill="#e89ac0" />
    <path d="M190 66l28-42-14-12-30 46Z" fill="none" {...CIZGI} />
    <path d="M146 64l2-44 12-12 12 12 2 44Z" fill="#e0729a" {...CIZGI} /><path d="M160 8l12 12 2 44h-14Z" fill="#b8507c" />
    <path d="M146 64l2-44 12-12 12 12 2 44Z" fill="none" {...CIZGI} />
    <Parlama d="M154 26v16" en={5} op={0.9} /><Parlama d="M114 26l6 10" en={4} op={0.9} />
    <path d="M160 46q80 2 82 92 0 50-32 86-26 30-50 32-24-2-50-32-32-36-32-86 2-90 82-92Z" fill="#5fd3e0" {...CIZGI} />
    <path d="M214 70q28 22 28 68 0 50-32 86-20 22-38 30 30-32 40-86 8-54 2-98Z" fill="#34a9b8" />
    <path d="M160 46q80 2 82 92 0 50-32 86-26 30-50 32-24-2-50-32-32-36-32-86 2-90 82-92Z" fill="none" {...CIZGI} />
    <Parlama d="M108 90q14-24 40-30" en={9} />
    <path d="M160 100l11 13-11 13-11-13Z" fill="#f2b23c" {...CIZGI} />
    <path d="M100 150q22-20 50 2-4 28-26 28-24-4-24-30Z" fill={K} {...CIZGI} />
    <path d="M220 150q-22-20-50 2 4 28 26 28 24-4 24-30Z" fill={K} {...CIZGI} />
    <circle cx="120" cy="154" r="6" fill={KR} /><circle cx="132" cy="166" r="2.6" fill={KR} />
    <circle cx="196" cy="154" r="6" fill={KR} /><circle cx="208" cy="166" r="2.6" fill={KR} />
    <circle cx="154" cy="194" r="3" fill="#237f8c" /><circle cx="166" cy="194" r="3" fill="#237f8c" />
    <path d="M100 198l14 4M220 198l-14 4M104 210l10 2M216 210l-10 2" fill="none" stroke="#237f8c" strokeWidth="4" strokeLinecap="round" />
    <path d="M146 216q14 10 28 0" fill="none" {...CIZGI} />
  </svg>;
}

// Geniş fasulye kafa, iki göz sapı, yanlarda solungaç püskülleri, kocaman gülüş.
function GozSapliUzayli() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Göz saplı pembe uzaylı avatarı">
    <Sahne renk="#f2b23c" vurgu="#fff0bc" />
    <path d={GOVDE} fill="#7b5cc4" {...CIZGI} />
    <path d="M110 262q50 20 100 0" fill="none" stroke="#5a3f99" strokeWidth="7" strokeLinecap="round" />
    <circle cx="160" cy="280" r="8" fill="#f2b23c" {...CIZGI} />
    <path d="M132 104q-6-40-30-62" fill="none" stroke={K} strokeWidth="23" strokeLinecap="round" /><path d="M132 104q-6-40-30-62" fill="none" stroke="#e46aa8" strokeWidth="13" strokeLinecap="round" />
    <path d="M188 104q6-40 30-62" fill="none" stroke={K} strokeWidth="23" strokeLinecap="round" /><path d="M188 104q6-40 30-62" fill="none" stroke="#e46aa8" strokeWidth="13" strokeLinecap="round" />
    <path d="M64 148l-34-22 10 26-22 4 24 14-16 16 38-8Z" fill="#ff9fc8" {...CIZGI} />
    <path d="M256 148l34-22-10 26 22 4-24 14 16 16-38-8Z" fill="#ff9fc8" {...CIZGI} />
    <path d="M58 172q-4-80 102-80 106 0 102 80-4 72-102 78-98-6-102-78Z" fill="#e46aa8" {...CIZGI} />
    <path d="M66 196q94 62 188 0-10 46-94 52-84-6-94-52Z" fill="#c24f8c" />
    <path d="M58 172q-4-80 102-80 106 0 102 80-4 72-102 78-98-6-102-78Z" fill="none" {...CIZGI} />
    <Parlama d="M92 124q24-22 58-24" en={9} />
    <g fill="#c24f8c"><circle cx="104" cy="140" r="7" /><circle cx="222" cy="126" r="5" /><circle cx="232" cy="154" r="8" /><circle cx="88" cy="166" r="4" /></g>
    <path d="M104 170q56 50 112 0-8 50-56 52-48-2-56-52Z" fill={K} {...CIZGI} />
    <path d="M136 206q24-14 48 0-8 16-24 16-16 0-24-16Z" fill="#e8543f" />
    <path d="M146 172h16v14q-8 4-16 0Z" fill={KR} stroke={K} strokeWidth="3" strokeLinejoin="round" />
    <Yanak renk="#8a2a5c" sol={90} sag={230} y={184} />
    <circle cx="98" cy="38" r="26" fill={KR} {...CIZGI} /><circle cx="106" cy="42" r="11" fill={K} /><circle cx="109" cy="38" r="4" fill={KR} />
    <circle cx="222" cy="38" r="26" fill={KR} {...CIZGI} /><circle cx="214" cy="42" r="11" fill={K} /><circle cx="217" cy="38" r="4" fill={KR} />
    <path d="M78 26q8-16 26-16M202 26q8-16 26-16" fill="none" stroke="#e46aa8" strokeWidth="7" strokeLinecap="round" />
  </svg>;
}

/* ============================ ROBOT / SİBORG (3) ============================ */

// Dev omuz zırhları, köşeli miğfer, V şeklinde parlayan vizör, tepede kırmızı yüzgeç.
function SavasRobotu() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Zırhlı savaş robotu avatarı">
    <Sahne renk="#e8543f" vurgu="#ffb7a6" />
    <path d="M94 300l12-72h108l12 72Z" fill="#8496b2" {...CIZGI} />
    <circle cx="160" cy="262" r="17" fill="#4fb3c9" {...CIZGI} /><circle cx="160" cy="262" r="7" fill={KR} />
    <path d="M14 300q-4-72 40-96 44-16 68 12l-6 84Z" fill="#5c7fa8" {...CIZGI} />
    <path d="M306 300q4-72-40-96-44-16-68 12l6 84Z" fill="#5c7fa8" {...CIZGI} />
    <path d="M22 262q34-20 90-12M298 262q-34-20-90-12" fill="none" stroke="#f2b23c" strokeWidth="9" strokeLinecap="round" />
    <Parlama d="M40 222q18-12 40-12M280 222q-18-12-40-12" en={7} />
    <path d="M76 120h18v56H76ZM226 120h18v56h-18Z" fill="#5c7fa8" {...CIZGI} />
    <path d="M138 66l22-52 22 52Z" fill="#f2b23c" {...CIZGI} /><path d="M160 14l22 52h-12Z" fill="#c98a22" /><path d="M138 66l22-52 22 52Z" fill="none" {...CIZGI} />
    <path d="M96 100l24-42h80l24 42 6 80-22 46h-96l-22-46Z" fill="#aab8cc" {...CIZGI} />
    <path d="M200 58l24 42 6 80-22 46h-26l20-46-4-80-22-42Z" fill="#8496b2" />
    <path d="M96 100l24-42h80l24 42 6 80-22 46h-96l-22-46Z" fill="none" {...CIZGI} />
    <Parlama d="M122 74q18-8 38-8" en={8} />
    <path d="M104 126l56 16 56-16-4 32-52 12-52-12Z" fill={K} {...CIZGI} />
    <path d="M118 136l42 12 42-12-2 12-40 9-40-9Z" fill="#ffd23f" />
    <path d="M124 139l14 4" stroke={KR} strokeWidth="4" strokeLinecap="round" />
    <path d="M114 186h92l-12 32h-68Z" fill="#5c7fa8" {...CIZGI} />
    <path d="M136 196v14M152 196v16M168 196v16M184 196v14" fill="none" stroke={K} strokeWidth="5" strokeLinecap="round" />
    <path d="M200 86l10 16M208 84l8 14" fill="none" stroke={K} strokeWidth="3.5" strokeLinecap="round" />
  </svg>;
}

// Yarı insan yarı makine: sol yarı insan yüzü ve saçı, sağ yarı metal plaka + kırmızı optik göz.
function Siborg() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Yarı insan yarı makine siborg avatarı">
    <Sahne renk="#3fa9a0" vurgu="#c6f1ef" />
    <path d={GOVDE} fill="#1f2a44" {...CIZGI} />
    <path d="M140 222h40v26h-40Z" fill="#8496b2" {...CIZGI} />
    <path d="M108 238q52 30 104 0" fill="none" stroke="#4fb3c9" strokeWidth="7" strokeLinecap="round" />
    <path d="M186 232q20 30 16 68" fill="none" stroke={K} strokeWidth="14" strokeLinecap="round" /><path d="M186 232q20 30 16 68" fill="none" stroke="#e8543f" strokeWidth="6" strokeLinecap="round" />
    <ellipse cx="90" cy="168" rx="12" ry="17" fill="#e6c79a" {...CIZGI} />
    <circle cx="232" cy="166" r="16" fill="#5c7fa8" {...CIZGI} /><circle cx="232" cy="166" r="7" fill="#4fb3c9" />
    <path d={BAS} fill="#e6c79a" {...CIZGI} />
    <path d="M160 58q70 6 69 92-2 84-69 94l6-26-8-22 10-24-8-24 8-24-10-26 8-22Z" fill="#aab8cc" {...CIZGI} />
    <path d="M214 90q16 26 15 60-2 70-50 88 30-40 32-88 2-34 3-60Z" fill="#8496b2" />
    <path d="M160 58q70 6 69 92-2 84-69 94" fill="none" {...CIZGI} />
    <path d="M176 118h40M180 206h34" fill="none" stroke="#5c7fa8" strokeWidth="5" strokeLinecap="round" />
    <g fill={K}><circle cx="186" cy="100" r="3.5" /><circle cx="214" cy="112" r="3.5" /><circle cx="186" cy="222" r="3.5" /><circle cx="214" cy="196" r="3.5" /></g>
    <Parlama d="M190 72q20 8 30 26" en={7} />
    <path d="M88 140q-10-62 40-82 22-6 32-2l-4 28q-22 0-38 14-16 14-30 42Z" fill="#2b1d16" {...CIZGI} />
    <path d="M106 94q14-18 34-22" fill="none" stroke="#5a3a22" strokeWidth="6" strokeLinecap="round" />
    <Parlama d="M112 80q10-8 22-10" en={6} />
    <path d="M110 144q15-10 30 1" fill="none" stroke={K} strokeWidth="8" strokeLinecap="round" />
    <Goz x={127} y={164} />
    <circle cx="195" cy="162" r="28" fill="#e8543f" opacity=".28" />
    <circle cx="195" cy="162" r="18" fill={K} {...CIZGI} />
    <circle cx="195" cy="162" r="11" fill="#e8543f" /><circle cx="195" cy="162" r="4.5" fill="#ffd23f" /><circle cx="191" cy="157" r="2.6" fill={KR} />
    <path d="M156 166q-7 18 4 21l6-1" fill="none" {...CIZGI} />
    <path d="M128 206q16 10 32 2" fill="none" {...CIZGI} />
    <path d="M166 208h28" fill="none" stroke={K} strokeWidth="5" strokeLinecap="round" />
  </svg>;
}

// Porselen beyaz yüz, koyu parlak kafa kabuğu, turkuaz ışık çizgileri ve gözler.
function Android() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Zarif android avatarı">
    <Sahne renk="#8a6fd1" vurgu="#d7ccf5" />
    <path d={GOVDE} fill="#f4f1fa" {...CIZGI} />
    <path d="M210 234q44 16 50 66h-40Z" fill="#d8d2ea" />
    <path d={GOVDE} fill="none" {...CIZGI} />
    <path d="M100 266q60 22 120 0" fill="none" stroke="#4fb3c9" strokeWidth="5" strokeLinecap="round" />
    <circle cx="160" cy="284" r="8" fill="#4fb3c9" {...CIZGI} />
    <path d="M142 212h36v24h-36Z" fill="#c9c3dc" {...CIZGI} /><path d="M142 222h36" stroke={K} strokeWidth="3.5" />
    <path d="M80 150q-6-102 80-106 86 4 80 106-14-44-40-58-36 14-78 6-28 18-42 52Z" fill="#3d3470" {...CIZGI} />
    <path d="M92 128q8-58 68-70" fill="none" stroke="#4fb3c9" strokeWidth="5" strokeLinecap="round" />
    <circle cx="92" cy="166" r="17" fill="#d8d2ea" {...CIZGI} /><circle cx="92" cy="166" r="8" fill="none" stroke="#4fb3c9" strokeWidth="4" />
    <circle cx="228" cy="166" r="17" fill="#d8d2ea" {...CIZGI} /><circle cx="228" cy="166" r="8" fill="none" stroke="#4fb3c9" strokeWidth="4" />
    <path d="M100 150q0-72 60-80 60 8 60 80-2 70-60 80-58-10-60-80Z" fill="#f4f1fa" {...CIZGI} />
    <path d="M196 90q24 20 24 60-2 58-44 76 26-30 28-76 2-36-8-60Z" fill="#d8d2ea" />
    <path d="M100 150q0-72 60-80 60 8 60 80-2 70-60 80-58-10-60-80Z" fill="none" {...CIZGI} />
    <Parlama d="M118 100q14-16 32-18" en={7} />
    <path d="M160 96l7 8-7 8-7-8Z" fill="#4fb3c9" />
    <path d="M118 192q-4 18 8 30M202 192q4 18-8 30" fill="none" stroke="#4fb3c9" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M114 144q14-8 28 0M178 144q14-8 28 0" fill="none" stroke="#3d3470" strokeWidth="5" strokeLinecap="round" />
    <IriGoz x={130} y={164} bebek="#2a9cb3" /><IriGoz x={190} y={164} bebek="#2a9cb3" />
    <path d="M116 156l-8-5M204 156l8-5" fill="none" {...CIZGI} />
    <path d="M160 176q-3 10 3 13" fill="none" stroke={K} strokeWidth="4" strokeLinecap="round" />
    <path d="M146 204q14 8 28 0-5 10-14 10-9 0-14-10Z" fill="#9b7fd8" {...CIZGI} />
  </svg>;
}

/* ============================ VÜCUT GELİŞTİRMECİLER (3) ============================ */

// Erkek 1: sarı düz üst saç, açık ten, kırmızı atlet, sağ kol pazı kasıyor.
function KasliSampiyon() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Pazı kasan kaslı şampiyon avatarı">
    <Sahne renk="#4a9dd9" vurgu="#cfeeff" />
    <path d="M30 300q2-62 50-86 36-14 80-14 44 0 80 14 20 10 30 24l-4 62Z" fill="#e6a676" {...CIZGI} />
    <path d="M34 296q0-52 40-76 10 34-4 76Z" fill="#c98552" />
    <path d="M110 300l4-70q46 22 92 0l4 70Z" fill="#e8543f" {...CIZGI} />
    <path d="M124 270q18 12 34-2M196 270q-18 12-34-2" fill="none" stroke="#b93737" strokeWidth="6" strokeLinecap="round" />
    <path d="M122 214q-10 10-16 30M198 214q10 10 16 30" fill="none" stroke="#c98552" strokeWidth="6" strokeLinecap="round" />
    <Parlama d="M58 226q14-10 30-12" en={7} />
    <path d="M190 246q6-50 60-58 42-2 50 32 4 28-34 36-48 8-76-10Z" fill="#e6a676" {...CIZGI} />
    <path d="M206 250q40 10 86-22-2 18-26 26-32 8-60-4Z" fill="#c98552" />
    <Parlama d="M226 204q16-8 34-6" en={7} />
    <path d="M262 206q-16-44-4-86l34 2q10 44 6 84Z" fill="#e6a676" {...CIZGI} />
    <path d="M254 124q-4-30 22-32 30 0 30 26 0 20-26 22-24-2-26-16Z" fill="#e6a676" {...CIZGI} />
    <path d="M262 110q12-4 30 0M262 122q14-4 30 0" fill="none" stroke="#c98552" strokeWidth="4" strokeLinecap="round" />
    <path d="M128 196h64v34h-64Z" fill="#e6a676" />
    <path d="M128 196v32M192 196v32" fill="none" {...CIZGI} />
    <ellipse cx="94" cy="160" rx="11" ry="16" fill="#e6a676" {...CIZGI} /><ellipse cx="226" cy="160" rx="11" ry="16" fill="#e6a676" {...CIZGI} />
    <path d="M96 146q0-86 64-90 66 4 64 90 0 42-10 66-18 30-54 32-36-2-54-32-10-24-10-66Z" fill="#e6a676" {...CIZGI} />
    <path d="M94 122q-4-46 12-66h108q16 20 12 66-8-18-24-24H118q-16 6-24 24Z" fill="#f2c14e" {...CIZGI} />
    <path d="M110 70h100" fill="none" stroke="#d9a431" strokeWidth="6" strokeLinecap="round" />
    <Parlama d="M116 64h34" en={6} />
    <path d="M106 138q18-12 38 0M176 138q18-12 38 0" fill="none" stroke="#8a5f16" strokeWidth="10" strokeLinecap="round" />
    <Goz x={127} y={158} /><Goz x={193} y={158} />
    <path d="M160 160q-8 22 4 25l10-2" fill="none" {...CIZGI} />
    <path d="M128 200q32 16 64 0-6 22-32 23-26-1-32-23Z" fill={K} {...CIZGI} /><path d="M134 203q26 9 52 0v6q-26 8-52 0Z" fill={KR} />
    <path d="M154 236q6 4 12 0" fill="none" stroke="#b07a4a" strokeWidth="4" strokeLinecap="round" />
  </svg>;
}

// Erkek 2: kel, sakallı, koyu ten, yeşil atlet, iki kol birden pazı gösteriyor (çift pazı pozu).
function DemirPazi() {
  const ten = "#7a4a2e", golge = "#5b341f";
  return <svg viewBox="0 0 320 320" role="img" aria-label="Çift pazı pozunda kel sakallı vücut geliştirmeci avatarı">
    <Sahne renk="#f2b23c" vurgu="#fff0bc" />
    <path d="M40 300q4-60 50-82 34-14 70-14 36 0 70 14 46 22 50 82Z" fill={ten} {...CIZGI} />
    <path d="M118 300v-62q42 22 84 0v62Z" fill="#2fbf71" {...CIZGI} />
    <path d="M100 250q24 18 56 4M220 250q-24 18-56 4" fill="none" stroke={golge} strokeWidth="6" strokeLinecap="round" />
    <path d="M120 250q-6 22 0 50M200 250q6 22 0 50" fill="none" stroke="#218452" strokeWidth="5" strokeLinecap="round" />
    <path d="M22 202q-12-44 2-86l34 2q10 40 4 84Z" fill={ten} {...CIZGI} />
    <path d="M298 202q12-44-2-86l-34 2q-10 40-4 84Z" fill={ten} {...CIZGI} />
    <path d="M110 240q-44 10-78-8-18-12-12-32 10-30 48-30 38 4 46 32 4 22-4 38Z" fill={ten} {...CIZGI} />
    <path d="M210 240q44 10 78-8 18-12 12-32-10-30-48-30-38 4-46 32-4 22 4 38Z" fill={ten} {...CIZGI} />
    <path d="M24 212q30 24 84 22-34 16-66 2-16-8-18-24ZM296 212q-30 24-84 22 34 16 66 2 16-8 18-24Z" fill={golge} />
    <Parlama d="M42 188q14-12 34-12M278 188q-14-12-34-12" en={7} />
    <path d="M26 150h32M294 150h-32" fill="none" stroke={K} strokeWidth="13" /><path d="M26 150h32M294 150h-32" fill="none" stroke={KR} strokeWidth="7" />
    <path d="M18 116q-4-30 24-32 28 0 28 26 0 20-26 22-24-2-26-16Z" fill={ten} {...CIZGI} />
    <path d="M302 116q4-30-24-32-28 0-28 26 0 20 26 22 24-2 26-16Z" fill={ten} {...CIZGI} />
    <path d="M128 196h64v30h-64Z" fill={ten} /><path d="M128 196v28M192 196v28" fill="none" {...CIZGI} />
    <ellipse cx="94" cy="160" rx="11" ry="16" fill={ten} {...CIZGI} /><ellipse cx="226" cy="160" rx="11" ry="16" fill={ten} {...CIZGI} />
    <path d="M96 150q0-94 64-96 64 2 64 96-2 60-64 72-62-12-64-72Z" fill={ten} {...CIZGI} />
    <path d="M198 70q24 22 24 70-10-40-40-58Z" fill={golge} />
    <Parlama d="M116 82q16-16 38-18" en={9} />
    <path d="M98 172q0 56 62 58 62-2 62-58-10 16-26 18-14-10-36-10-22 0-36 10-16-2-26-18Z" fill="#1d1a19" {...CIZGI} />
    <path d="M140 204q20 10 40 0-4 12-20 12-16 0-20-12Z" fill={KR} {...CIZGI} />
    <path d="M106 140q18-14 40-4M174 136q22-10 40 4" fill="none" stroke="#1d1a19" strokeWidth="10" strokeLinecap="round" />
    <Goz x={127} y={158} /><Goz x={193} y={158} />
    <path d="M160 160q-8 20 4 23l10-2" fill="none" {...CIZGI} />
  </svg>;
}

// Kadın: yüksek at kuyruğu, mor spor üstü, belirgin omuz ve pazı, sol kolu kasıyor.
function FitnessKralicesi() {
  const ten = "#c68e5f", golge = "#a4703f";
  return <svg viewBox="0 0 320 320" role="img" aria-label="Pazı kasan kaslı kadın vücut geliştirmeci avatarı">
    <Sahne renk="#57c9a0" vurgu="#d9f7e6" />
    <path d="M190 66q56-34 80 10 16 36-6 76-4-40-28-56-22-10-46-6Z" fill="#3b2a20" {...CIZGI} />
    <Parlama d="M226 62q18 2 30 16" en={6} />
    <path d="M186 60l18 14-8 16-18-12Z" fill="#e0729a" {...CIZGI} />
    <path d="M50 300q4-62 50-84 30-12 60-12 34 0 72 12 42 20 48 84Z" fill={ten} {...CIZGI} />
    <path d="M286 296q0-50-36-74-10 34 2 74Z" fill={golge} />
    <path d="M110 300q-2-38 8-66 42 22 84 0 10 28 8 66Z" fill="#7b5cc4" {...CIZGI} />
    <path d="M116 256q44 20 88 0" fill="none" stroke="#e0729a" strokeWidth="7" strokeLinecap="round" />
    <Parlama d="M254 226q14 4 22 14" en={6} />
    <path d="M130 246q-40 10-76-12-26-18-16-44 32-14 62 8 24 18 30 48Z" fill={ten} {...CIZGI} />
    <path d="M40 212q30 26 86 34-36 8-66-6-18-10-20-28Z" fill={golge} />
    <Parlama d="M52 190q14-8 30-4" en={6} />
    <path d="M58 200q16-40 4-80l-32 2q-10 42-4 78Z" fill={ten} {...CIZGI} />
    <path d="M66 124q4-30-22-32-30 0-30 26 0 20 26 22 24-2 26-16Z" fill={ten} {...CIZGI} />
    <path d="M26 176h34" fill="none" stroke={K} strokeWidth="12" /><path d="M26 176h34" fill="none" stroke="#e0729a" strokeWidth="6" />
    <path d="M136 206h48v30h-48Z" fill={ten} /><path d="M136 206v28M184 206v28" fill="none" {...CIZGI} />
    <path d={BAS_INCE} fill={ten} {...CIZGI} />
    <path d="M94 146q-6-80 62-88 66 0 70 72-26-6-44-28-30 24-88 44Z" fill="#3b2a20" {...CIZGI} />
    <Parlama d="M124 76q14-8 30-8" en={6} />
    <path d="M110 146q14-9 28 1M182 147q14-10 28-1" fill="none" {...CIZGI} />
    <Goz x={127} y={164} /><Goz x={195} y={164} />
    <path d="M114 157l-8-5M208 157l8-5" fill="none" {...CIZGI} />
    <path d="M160 168q-7 18 4 21l9-2" fill="none" {...CIZGI} />
    <Yanak y={196} sol={110} sag={210} />
    <path d="M136 204q24 16 48 0-4 20-24 21-20-1-24-21Z" fill="#b83e60" {...CIZGI} /><path d="M142 207q18 6 36 0v5q-18 6-36 0Z" fill={KR} />
    <circle cx="224" cy="192" r="6" fill="#f2b23c" {...CIZGI} />
  </svg>;
}

/* ============================ KEDİLİLER (2) ============================ */

// Erkek: kızıl-kahve dalgalı saç, yeşil kapüşonlu; sol omzunda oturan turuncu tekir yavru, gözü açık.
function KediliGenc() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Omzunda turuncu tekir yavru kedi olan genç avatarı">
    <Sahne renk="#5aa9e6" vurgu="#d5efff" />
    <path d={GOVDE} fill="#2fbf71" {...CIZGI} />
    <path d="M104 236q56 34 112 0l6 16q-62 36-124 0Z" fill="#218452" {...CIZGI} />
    <path d="M144 250v26M176 250v26" fill="none" stroke={KR} strokeWidth="5" strokeLinecap="round" />
    <ellipse cx="228" cy="166" rx="12" ry="17" fill="#f0cfa6" {...CIZGI} />
    <path d={BAS} fill="#f0cfa6" {...CIZGI} />
    <path d="M88 140q-10-72 38-90 20-8 40-4 20-10 40 2 30 18 26 86-14-16-20-34-18 14-40 10-8 16-30 16-10 10-32 14-10-4-22 0Z" fill="#9a4a24" {...CIZGI} />
    <path d="M120 70q16-10 34-8M180 58q14 2 24 12" fill="none" stroke="#6e3216" strokeWidth="6" strokeLinecap="round" />
    <Parlama d="M112 78q10-12 24-14" en={6} />
    <path d="M110 144q15-10 30 1M182 145q15-11 30-1" fill="none" {...CIZGI} />
    <IriGoz x={127} y={165} bak={-3} /><IriGoz x={195} y={165} bak={-3} />
    <Burun y={170} /><Yanak y={200} />
    <path d="M136 206q24 16 48 0-6 22-24 22-18 0-24-22Z" fill="#b83e60" {...CIZGI} />
    {/* Yavru kedi (turuncu tekir, oturuyor) */}
    <path d="M58 262q-30 0-30-26 0-14 10-16" fill="none" stroke={K} strokeWidth="17" strokeLinecap="round" /><path d="M58 262q-30 0-30-26 0-14 10-16" fill="none" stroke="#f2a23c" strokeWidth="8" strokeLinecap="round" />
    <path d="M52 262q-4-44 32-48 36 4 32 48Z" fill="#f2a23c" {...CIZGI} />
    <path d="M70 244q14 6 28 0" fill="none" stroke="#c9731f" strokeWidth="5" strokeLinecap="round" />
    <path d="M70 262q2-14 14-16 12 2 14 16Z" fill={KR} {...CIZGI} />
    <path d="M52 204l-4-34 26 18M116 204l4-34-26 18" fill="#f2a23c" {...CIZGI} />
    <path d="M56 198l-2-18 12 10M112 198l2-18-12 10" fill="#f5a8c0" />
    <ellipse cx="84" cy="210" rx="34" ry="28" fill="#f2a23c" {...CIZGI} />
    <path d="M76 186l2 10M84 184v12M92 186l-2 10" fill="none" stroke="#c9731f" strokeWidth="4" strokeLinecap="round" />
    <path d="M70 218q14 16 28 0-2 12-14 12-12 0-14-12Z" fill={KR} />
    <Parlama d="M60 196q6-8 14-10" en={5} />
    <circle cx="72" cy="208" r="6.5" fill={K} /><circle cx="74" cy="206" r="2.4" fill={KR} />
    <circle cx="96" cy="208" r="6.5" fill={K} /><circle cx="98" cy="206" r="2.4" fill={KR} />
    <path d="M81 218h6l-3 4Z" fill="#e0729a" stroke={K} strokeWidth="2" strokeLinejoin="round" />
    <path d="M84 222q-4 5-8 3M84 222q4 5 8 3M50 214l16 2M50 224l16-2M118 214l-16 2M118 224l-16-2" fill="none" stroke={K} strokeWidth="2.5" strokeLinecap="round" />
  </svg>;
}

// Kadın: kâküllü siyah kısa küt saç, sarı kazak; sağ omzunda uzanmış, gözleri kapalı gri-beyaz yavru kedi.
function KediliKiz() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Omzunda uyuyan gri beyaz yavru kedi olan kız avatarı">
    <Sahne renk="#e0729a" vurgu="#ffd0df" />
    <path d="M78 232q-14-50-6-100 12-78 88-82 76 4 88 82 8 50-6 100-18 10-30 0V170H108v62q-12 10-30 0Z" fill="#1d1a19" {...CIZGI} />
    <path d={GOVDE} fill="#f2b23c" {...CIZGI} />
    <path d="M124 226q36 30 72 0l-4 16q-32 22-64 0Z" fill={KR} {...CIZGI} />
    <path d="M100 262v38M220 262v38" fill="none" stroke="#c98a22" strokeWidth="6" strokeLinecap="round" />
    <path d={BAS_INCE} fill="#f0cfa6" {...CIZGI} />
    <path d="M92 142q-6-84 68-88 74 4 68 88-8-8-10-24-12 10-26 4-10 12-28 6-12 12-30 4-10 12-26 0-4 10-16 10Z" fill="#1d1a19" {...CIZGI} />
    <Parlama d="M118 76q16-12 38-12" en={7} />
    <path d="M112 148q14-9 28 1M182 149q14-10 28-1" fill="none" {...CIZGI} />
    <Goz x={127} y={166} /><Goz x={195} y={166} />
    <path d="M114 159l-8-5M208 159l8-5" fill="none" {...CIZGI} />
    <path d="M160 170q-6 16 4 19l8-2" fill="none" {...CIZGI} />
    <Yanak y={198} sol={110} sag={210} />
    <path d="M140 206q20 14 40 0-6 14-20 14-14 0-20-14Z" fill="#b83e60" {...CIZGI} />
    <circle cx="96" cy="212" r="6" fill={KR} {...CIZGI} />
    {/* Yavru kedi (gri-beyaz, omuzda uzanmış, uyuyor) */}
    <path d="M296 250q14 20 0 40" fill="none" stroke={K} strokeWidth="16" strokeLinecap="round" /><path d="M296 250q14 20 0 40" fill="none" stroke="#8496b2" strokeWidth="7" strokeLinecap="round" />
    <path d="M196 246q0-30 50-32 52 2 52 30 0 20-50 22-52-2-52-20Z" fill="#8496b2" {...CIZGI} />
    <path d="M232 222q16-6 28 0M246 222v-6" fill="none" stroke="#5c7fa8" strokeWidth="5" strokeLinecap="round" />
    <path d="M212 262q-4 18 8 24 12-2 10-22" fill={KR} {...CIZGI} />
    <Parlama d="M252 222q16 0 28 8" en={5} />
    <path d="M192 212l-2-30 22 14M242 204l8-28-26 12" fill="#8496b2" {...CIZGI} />
    <path d="M196 206l-1-16 10 8M238 200l4-14-12 6" fill="#f5a8c0" />
    <ellipse cx="216" cy="222" rx="30" ry="24" fill="#8496b2" {...CIZGI} />
    <path d="M200 228q16-12 32 0 4 16-16 16-20 0-16-16Z" fill={KR} />
    <path d="M216 198v10M206 200l2 8" fill="none" stroke="#5c7fa8" strokeWidth="4" strokeLinecap="round" />
    <path d="M198 220q6 5 12 0M222 220q6 5 12 0" fill="none" stroke={K} strokeWidth="3.5" strokeLinecap="round" />
    <path d="M213 228h6l-3 4Z" fill="#e0729a" stroke={K} strokeWidth="2" strokeLinejoin="round" />
    <path d="M216 232q-3 4-7 3M216 232q3 4 7 3" fill="none" stroke={K} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M250 178h14l-14 16h14M270 160h9l-9 10h9" fill="none" stroke={K} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" /><path d="M250 178h14l-14 16h14M270 160h9l-9 10h9" fill="none" stroke={KR} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

/* ============================ HAVACILIK (2) ============================ */

// Erkek pilot: beyaz tepeli kaptan şapkası (lacivert bant, siyah siperlik, altın örgü), apolet, kanat rozeti.
function Pilot() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kaptan şapkalı pilot avatarı">
    <Sahne renk="#4a9dd9" vurgu="#cfeeff" />
    <path d="M232 70q4-18 22-18 8-12 24-6 18 2 16 20 10 12-4 18h-52q-14-4-6-14Z" fill={KR} opacity=".85" />
    <path d={GOVDE_GENIS} fill="#26365a" {...CIZGI} />
    <path d="M132 226l28 42 28-42" fill={KR} {...CIZGI} />
    <path d="M154 238h12l4 10-10 28-10-28Z" fill="#b93737" {...CIZGI} />
    <path d="M66 244l40-14 6 16-40 14ZM254 244l-40-14-6 16 40 14Z" fill="#1b2440" {...CIZGI} />
    <path d="M78 244l24-8M82 252l24-8M242 244l-24-8M238 252l-24-8" fill="none" stroke="#f2b23c" strokeWidth="4" strokeLinecap="round" />
    <path d="M196 270q12-10 26-6 14-8 26 2-14 2-26 8-12-8-26-4Z" fill="#f2b23c" {...CIZGI} /><circle cx="222" cy="268" r="5" fill="#f2b23c" {...CIZGI} />
    <ellipse cx="90" cy="168" rx="12" ry="17" fill="#e6c79a" {...CIZGI} /><ellipse cx="230" cy="168" rx="12" ry="17" fill="#e6c79a" {...CIZGI} />
    <path d={BAS} fill="#e6c79a" {...CIZGI} />
    <path d="M92 150q-4-20 4-34h14q-6 16-4 38ZM228 150q4-20-4-34h-14q6 16 4 38Z" fill="#6b5a4a" {...CIZGI} />
    <path d="M70 94q6-46 90-50 84 4 90 50-4 16-22 18H92q-18-2-22-18Z" fill="#f7f3ea" {...CIZGI} />
    <Parlama d="M96 74q24-16 60-18" en={7} op={0.9} />
    <path d="M92 104h136v26H92Z" fill="#26365a" {...CIZGI} />
    <path d="M86 128q74 22 148 0l6 14q-80 28-160 0Z" fill={K} {...CIZGI} />
    <path d="M98 132q62 14 124 0" fill="none" stroke="#f2b23c" strokeWidth="5" strokeLinecap="round" />
    <path d="M136 116q12-8 24-2 12-6 24 2-12 2-24 8-12-6-24-8Z" fill="#f2b23c" {...CIZGI} /><circle cx="160" cy="114" r="6" fill="#f2b23c" {...CIZGI} />
    <path d="M110 156q15-8 30 1M180 157q15-9 30-1" fill="none" stroke={K} strokeWidth="7" strokeLinecap="round" />
    <Goz x={127} y={170} /><Goz x={193} y={170} />
    <path d="M160 172q-7 18 4 21l9-2" fill="none" {...CIZGI} />
    <path d="M132 200q14-12 28-4 14-8 28 4-14 8-28 2-14 6-28-2Z" fill="#6b5a4a" {...CIZGI} />
    <path d="M140 214q20 12 40 0" fill="none" {...CIZGI} />
  </svg>;
}

// Kadın hostes: yana yatık kırmızı kep, topuz, kırmızı üniforma, yana bağlı mavi fular, kanat iğnesi.
function Hostes() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kepli fularlı hostes avatarı">
    <Sahne renk="#3fa9a0" vurgu="#c6f1ef" />
    <circle cx="210" cy="72" r="22" fill="#5a3a22" {...CIZGI} /><path d="M198 60q10-8 22-2" fill="none" stroke="#3b2616" strokeWidth="5" strokeLinecap="round" />
    <path d={GOVDE} fill="#b93737" {...CIZGI} />
    <path d="M128 226l32 34 32-34" fill={KR} {...CIZGI} />
    <path d="M136 230q24 20 48 0l2 12q-26 20-52 0Z" fill="#4a9dd9" {...CIZGI} />
    <path d="M178 238l24 8-8 26-14-18ZM182 240l-4 30 16 2" fill="#4a9dd9" {...CIZGI} />
    <circle cx="180" cy="240" r="9" fill="#4a9dd9" {...CIZGI} />
    <path d="M140 234l8 6M152 238l6 4" fill="none" stroke="#f2b23c" strokeWidth="4" strokeLinecap="round" />
    <path d="M86 268q10-8 20-4 10-6 20 2-10 2-20 6-10-6-20-4Z" fill="#f2b23c" {...CIZGI} />
    <path d="M100 290v10M220 290v10" fill="none" stroke="#8a2a2a" strokeWidth="6" strokeLinecap="round" />
    <path d={BAS_INCE} fill="#f0cfa6" {...CIZGI} />
    <path d="M92 150q-8-86 68-92 70 4 70 84-30-4-50-32-8 16-30 26-24 8-58 14Z" fill="#5a3a22" {...CIZGI} />
    <Parlama d="M170 74q20 6 32 22" en={6} />
    <path d="M100 100q-4-28 6-40 34-14 72-10 8 12 8 30-44 2-86 20Z" fill="#b93737" {...CIZGI} />
    <path d="M102 92q40-18 84-20" fill="none" stroke="#f2b23c" strokeWidth="6" strokeLinecap="round" />
    <path d="M130 70q7-5 14-2 7-5 14 0-7 3-14 5-7-3-14-3Z" fill="#f2b23c" stroke={K} strokeWidth="2.5" />
    <Parlama d="M112 66q14-6 30-8" en={5} />
    <path d="M110 148q14-9 28 1M182 149q14-10 28-1" fill="none" {...CIZGI} />
    <Goz x={127} y={166} /><Goz x={195} y={166} />
    <path d="M114 159l-8-5M208 159l8-5" fill="none" {...CIZGI} />
    <path d="M160 170q-6 16 4 19l8-2" fill="none" {...CIZGI} />
    <Yanak y={198} sol={110} sag={210} />
    <path d="M138 206q22 16 44 0-4 16-22 17-18-1-22-17Z" fill="#d9536a" {...CIZGI} />
    <circle cx="96" cy="206" r="6" fill={KR} {...CIZGI} /><circle cx="224" cy="206" r="6" fill={KR} {...CIZGI} />
  </svg>;
}

// Sıra ve anahtarlar migration 595 › avatar_katalogu ile aynı (sira 28–39). Ad/tür sunucudan gelir;
// buradaki ad/ad_en yalnız önizleme (katalog satırı yoksa) ve üretici için yedek.
export const AVATAR_PRO3 = [
  { anahtar: "kristal-uzayli-y28", tur: "kostumlu", ad: "Kristal Uzaylı", ad_en: "Crystal Alien", Bilesen: KristalUzayli },
  { anahtar: "gozsapli-uzayli-y29", tur: "kostumlu", ad: "Göz Saplı Uzaylı", ad_en: "Eyestalk Alien", Bilesen: GozSapliUzayli },
  { anahtar: "savas-robotu-y30", tur: "kostumlu", ad: "Savaş Robotu", ad_en: "Battle Mech", Bilesen: SavasRobotu },
  { anahtar: "siborg-y31", tur: "kostumlu", ad: "Siborg", ad_en: "Cyborg", Bilesen: Siborg },
  { anahtar: "android-y32", tur: "kostumlu", ad: "Android", ad_en: "Android", Bilesen: Android },
  { anahtar: "kasli-sampiyon-y33", tur: "gunluk", ad: "Kaslı Şampiyon", ad_en: "Muscle Champ", Bilesen: KasliSampiyon },
  { anahtar: "demir-pazi-y34", tur: "gunluk", ad: "Demir Pazı", ad_en: "Iron Biceps", Bilesen: DemirPazi },
  { anahtar: "fitness-kralicesi-y35", tur: "gunluk", ad: "Fitness Kraliçesi", ad_en: "Fitness Queen", Bilesen: FitnessKralicesi },
  { anahtar: "kedili-genc-y36", tur: "gunluk", ad: "Kedili Genç", ad_en: "Cat Buddy", Bilesen: KediliGenc },
  { anahtar: "kedili-kiz-y37", tur: "gunluk", ad: "Kedili Kız", ad_en: "Kitten Friend", Bilesen: KediliKiz },
  { anahtar: "pilot-y38", tur: "gunluk", ad: "Pilot", ad_en: "Pilot", Bilesen: Pilot },
  { anahtar: "hostes-y39", tur: "gunluk", ad: "Hostes", ad_en: "Flight Attendant", Bilesen: Hostes },
];
