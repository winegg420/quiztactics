export const CIZGI = {
  stroke: "#0b1220",
  strokeWidth: 5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function Sahne({ renk, vurgu = "#fff8ec" }) {
  return <><rect width="320" height="320" rx="38" fill={renk} /><circle cx="160" cy="309" r="105" fill="#0b1220" opacity=".1" /><path d="M31 64q23 12 43-3M246 50q16 14 37 4" fill="none" stroke={vurgu} strokeWidth="10" strokeLinecap="round" opacity=".45" /></>;
}

function Kedi() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Canlı setteki kedi avatarının profesyonel yorumu">
    <Sahne renk="#f2b23c" vurgu="#fff0bc" />
    <path d="M70 112 78 31l66 55M250 112l-8-81-66 55" fill="#3b4a6b" {...CIZGI} />
    <path d="m83 90 4-40 34 31M237 90l-4-40-34 31" fill="#e0729a" {...CIZGI} />
    <path d="M60 300q9-69 100-78 91 9 100 78" fill="#3b4a6b" {...CIZGI} />
    <path d="M72 155q0-91 88-102 89 11 88 102-1 88-88 97-87-9-88-97Z" fill="#3b4a6b" {...CIZGI} />
    <path d="M104 147q18-15 38 1M180 146q19-14 39 2" fill="none" {...CIZGI} />
    <ellipse cx="125" cy="164" rx="16" ry="18" fill="#fff8ec" {...CIZGI} /><circle cx="130" cy="167" r="8" fill="#2fbf71" /><circle cx="133" cy="163" r="3" fill="#fff8ec" />
    <ellipse cx="200" cy="163" rx="16" ry="18" fill="#fff8ec" {...CIZGI} /><circle cx="196" cy="166" r="8" fill="#2fbf71" /><circle cx="199" cy="162" r="3" fill="#fff8ec" />
    <path d="M119 190q41-28 82 0 8 38-41 48-49-10-41-48Z" fill="#fff8ec" {...CIZGI} />
    <path d="M146 187q14-10 28 0-2 15-14 15t-14-15Z" fill="#0b1220" />
    <path d="M160 202v10M160 212q-16 13-28 0M160 212q16 13 29-1M108 190 58 179M106 205l-50 7M212 190l50-12M214 205l50 7" fill="none" {...CIZGI} />
  </svg>;
}

function Panda() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Canlı setteki panda avatarının profesyonel yorumu">
    <Sahne renk="#8cbf3f" vurgu="#dff0a8" />
    <circle cx="92" cy="91" r="38" fill="#0b1220" {...CIZGI} /><circle cx="231" cy="87" r="37" fill="#0b1220" {...CIZGI} />
    <path d="M61 300q8-69 99-78 91 9 99 78" fill="#26365a" {...CIZGI} />
    <path d="M72 155q0-93 88-103 89 10 88 103-2 89-88 98-86-9-88-98Z" fill="#fff8ec" {...CIZGI} />
    <path d="M99 153q4-35 29-40 24-4 33 28 8 31-15 46-23 14-39-5-11-13-8-29ZM171 146q10-34 35-32 25 2 30 37 4 31-19 43-24 11-39-10-12-16-7-38Z" fill="#0b1220" />
    <ellipse cx="134" cy="157" rx="9" ry="11" fill="#fff8ec" /><circle cx="136" cy="160" r="5" fill="#0b1220" /><ellipse cx="201" cy="158" rx="9" ry="11" fill="#fff8ec" /><circle cx="199" cy="160" r="5" fill="#0b1220" />
    <path d="M145 191q16-12 31 0-2 18-15 18t-16-18Z" fill="#0b1220" /><path d="M129 217q32 22 65-4" fill="none" {...CIZGI} />
    <path d="M111 230q49 27 99-3l13 34q-63 29-125 0Z" fill="#e8543f" {...CIZGI} />
  </svg>;
}

function Dinozor() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Canlı setteki dinozor avatarının profesyonel yorumu">
    <Sahne renk="#f2b23c" vurgu="#ffe7a5" /><path d="m112 70 15-39 22 32 24-38 17 40" fill="#8cbf3f" {...CIZGI} />
    <path d="M55 300q8-71 105-80 97 9 105 80" fill="#278d62" {...CIZGI} /><path d="M72 117q0-61 58-67h46q70 4 73 70l4 75q1 53-59 59h-70q-55-7-55-60Z" fill="#2fbf71" {...CIZGI} />
    <path d="M82 125q42 7 72-25 33 31 88 20" fill="none" stroke="#218452" strokeWidth="14" strokeLinecap="round" /><path d="M99 146q15-11 31 1M184 144q18-10 34 2" fill="none" {...CIZGI} />
    <ellipse cx="117" cy="162" rx="15" ry="17" fill="#fff8ec" {...CIZGI} /><circle cx="122" cy="164" r="7" fill="#0b1220" /><ellipse cx="202" cy="160" rx="15" ry="17" fill="#fff8ec" {...CIZGI} /><circle cx="198" cy="163" r="7" fill="#0b1220" />
    <circle cx="146" cy="187" r="5" fill="#176b47" /><circle cx="178" cy="187" r="5" fill="#176b47" /><path d="M111 204q50 31 101-2-5 39-50 43-44-4-51-41Z" fill="#0b1220" {...CIZGI} /><path d="m128 211 11 18 12-17 12 18 12-18 12 16 10-19" fill="#fff8ec" />
  </svg>;
}

function Robot() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Canlı setteki robot avatarının profesyonel yorumu">
    <Sahne renk="#4a9dd9" vurgu="#b9e7ff" /><path d="M160 58V29" fill="none" {...CIZGI} /><circle cx="160" cy="23" r="13" fill="#f2b23c" {...CIZGI} />
    <path d="M58 300q8-67 102-77 95 10 102 77" fill="#5c7fa8" {...CIZGI} /><rect x="67" y="62" width="186" height="180" rx="43" fill="#8496b2" {...CIZGI} /><rect x="81" y="91" width="158" height="103" rx="30" fill="#26365a" {...CIZGI} />
    <rect x="103" y="124" width="43" height="34" rx="12" fill="#0b1220" /><rect x="116" y="135" width="19" height="12" rx="5" fill="#4fb3c9" /><rect x="174" y="120" width="43" height="38" rx="12" fill="#0b1220" /><rect x="186" y="132" width="20" height="13" rx="5" fill="#4fb3c9" />
    <path d="M124 178q36 24 72-3" fill="none" stroke="#f2b23c" strokeWidth="8" strokeLinecap="round" /><path d="M67 122H48v58h19M253 122h19v58h-19" fill="#5c7fa8" {...CIZGI} /><path d="M134 242v27h52v-27" fill="#64778f" {...CIZGI} /><circle cx="160" cy="284" r="12" fill="#4fb3c9" {...CIZGI} />
  </svg>;
}

function Uzayli() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Canlı setteki uzaylı avatarının profesyonel yorumu">
    <Sahne renk="#2fbf71" vurgu="#bff1d3" /><path d="M119 67 97 35M201 67l22-32" fill="none" stroke="#8cbf3f" strokeWidth="9" strokeLinecap="round" /><circle cx="93" cy="29" r="13" fill="#8cbf3f" {...CIZGI} /><circle cx="227" cy="29" r="13" fill="#8cbf3f" {...CIZGI} />
    <path d="M60 300q9-68 100-77 91 9 100 77" fill="#26365a" {...CIZGI} /><path d="M77 135q5-85 83-88 79 3 84 88 4 77-84 116-86-39-83-116Z" fill="#8cbf3f" {...CIZGI} /><path d="M103 119q57-30 114 0" fill="none" stroke="#6aa72d" strokeWidth="10" strokeLinecap="round" />
    <ellipse cx="160" cy="155" rx="42" ry="32" fill="#fff8ec" {...CIZGI} /><ellipse cx="165" cy="159" rx="18" ry="20" fill="#0b1220" /><circle cx="158" cy="151" r="6" fill="#fff8ec" /><circle cx="119" cy="192" r="6" fill="#65972f" /><circle cx="205" cy="188" r="5" fill="#65972f" /><path d="M132 213q29 18 58-3" fill="none" {...CIZGI} /><path d="M109 239q51 28 103-3l13 34q-65 27-129 0Z" fill="#4fb3c9" {...CIZGI} />
  </svg>;
}

function Astronot() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Canlı setteki astronot avatarının profesyonel yorumu">
    <Sahne renk="#5c7fa8" vurgu="#cfe3f5" /><path d="M54 300q8-66 106-77 98 11 106 77" fill="#fff8ec" {...CIZGI} /><circle cx="160" cy="151" r="111" fill="#cfe3f5" opacity=".22" stroke="#f2b23c" strokeWidth="8" /><circle cx="160" cy="151" r="99" fill="none" stroke="#fff8ec" strokeWidth="10" />
    <path d="M92 145q0-85 68-91 70 6 68 92-2 83-68 92-66-9-68-93Z" fill="#e6c79a" {...CIZGI} /><path d="M92 133Q84 80 123 55q42-27 82 5 23 19 27 62-25-10-38-32-36 19-86 11-3 18-16 32Z" fill="#26365a" {...CIZGI} />
    <path d="M113 145q15-10 29 1M181 144q15-9 29 2" fill="none" {...CIZGI} /><ellipse cx="129" cy="158" rx="9" ry="8" fill="#fff8ec" /><circle cx="132" cy="159" r="5" fill="#0b1220" /><ellipse cx="197" cy="157" rx="9" ry="8" fill="#fff8ec" /><circle cx="195" cy="158" r="5" fill="#0b1220" /><path d="M160 159q-6 24 5 27l9-2M132 202q28 19 58-4" fill="none" {...CIZGI} />
    <path d="M79 267q81 27 162 0M142 279h36" fill="none" stroke="#f2b23c" strokeWidth="9" strokeLinecap="round" /><path d="M108 77q13-19 35-23" fill="none" stroke="#fff8ec" strokeWidth="8" strokeLinecap="round" opacity=".75" />
  </svg>;
}

function Korsan() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Canlı setteki korsan avatarının profesyonel yorumu">
    <Sahne renk="#4fb3c9" vurgu="#c6f1ef" /><path d="M58 300q8-68 102-78 94 10 102 78" fill="#26365a" {...CIZGI} /><path d="M91 143q0-88 69-94 71 6 69 95-2 87-69 95-67-8-69-96Z" fill="#e6c79a" {...CIZGI} />
    <path d="M88 112q72-35 145 0V82q-73-32-145 0ZM88 93l-36 18 13 27 34-29M229 95l45 12-24 28-23-25" fill="#e8543f" {...CIZGI} /><path d="M110 144q14-10 29 1" fill="none" {...CIZGI} /><ellipse cx="126" cy="158" rx="10" ry="9" fill="#fff8ec" {...CIZGI} /><circle cx="129" cy="159" r="5" fill="#0b1220" />
    <rect x="177" y="137" width="44" height="34" rx="11" fill="#0b1220" /><path d="m218 143 24-22M160 160q-6 25 5 28l10-2" fill="none" {...CIZGI} /><path d="M127 202q35 25 69-5-6 35-35 36-26-1-34-31Z" fill="#0b1220" {...CIZGI} /><path d="M134 203h54v9h-51" fill="#fff8ec" /><circle cx="226" cy="181" r="8" fill="none" stroke="#f2b23c" strokeWidth="5" />
  </svg>;
}

function Asci() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Canlı setteki aşçı avatarının profesyonel yorumu">
    <Sahne renk="#e8543f" vurgu="#ffb09f" /><path d="M56 300q8-68 104-78 96 10 104 78" fill="#fff8ec" {...CIZGI} /><path d="M91 151q0-85 69-91 71 6 69 92-2 84-69 93-67-9-69-94Z" fill="#e6c79a" {...CIZGI} />
    <path d="M84 91q-12-48 33-49 10-31 43-13 32-18 43 13 44 1 32 49Z" fill="#fff8ec" {...CIZGI} /><path d="M84 84h152v31H84Z" fill="#e6e0d2" {...CIZGI} /><path d="M111 151q15-10 30 1M181 150q15-9 30 2" fill="none" {...CIZGI} /><circle cx="127" cy="164" r="7" fill="#0b1220" /><circle cx="197" cy="163" r="7" fill="#0b1220" />
    <path d="M160 164q-6 24 5 27l10-2" fill="none" {...CIZGI} /><path d="M124 201q36-22 72 0-36 20-72 0Z" fill="#3b4a6b" {...CIZGI} /><path d="M132 218q29 19 57-3M112 251q48 24 97-2M160 259v41" fill="none" {...CIZGI} />
  </svg>;
}

function Profesor() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Canlı setteki profesör avatarının profesyonel yorumu">
    <Sahne renk="#4a9dd9" vurgu="#bce7ff" /><path d="M58 300q8-68 102-78 94 10 102 78" fill="#26365a" {...CIZGI} /><circle cx="83" cy="124" r="36" fill="#c9d3e2" {...CIZGI} /><circle cx="237" cy="124" r="36" fill="#c9d3e2" {...CIZGI} /><circle cx="100" cy="82" r="27" fill="#c9d3e2" {...CIZGI} /><circle cx="220" cy="82" r="27" fill="#c9d3e2" {...CIZGI} />
    <path d="M91 149q0-86 69-92 71 6 69 93-2 85-69 94-67-9-69-95Z" fill="#e6c79a" {...CIZGI} /><path d="M107 143q16-10 31 1M183 142q16-9 31 2" fill="none" {...CIZGI} /><ellipse cx="125" cy="158" rx="17" ry="18" fill="#fff8ec" {...CIZGI} /><circle cx="129" cy="160" r="6" fill="#0b1220" /><ellipse cx="201" cy="157" rx="17" ry="18" fill="#fff8ec" {...CIZGI} /><circle cx="197" cy="159" r="6" fill="#0b1220" />
    <circle cx="125" cy="158" r="24" fill="none" stroke="#26365a" strokeWidth="7" /><circle cx="201" cy="157" r="24" fill="none" stroke="#26365a" strokeWidth="7" /><path d="M149 157h28M161 162q-6 24 5 27l10-2" fill="none" stroke="#26365a" strokeWidth="7" /><path d="M121 202q39-22 78 0-39 19-78 0Z" fill="#c9d3e2" {...CIZGI} /><path d="M129 219q31 17 61-3" fill="none" {...CIZGI} />
  </svg>;
}

function Kahraman() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Canlı setteki kahraman avatarının profesyonel yorumu">
    <Sahne renk="#d9536a" vurgu="#ffb9c4" /><path d="M53 300q8-68 107-79 99 11 107 79" fill="#26365a" {...CIZGI} /><path d="M92 146q0-87 68-93 70 6 68 94-2 85-68 93-66-8-68-94Z" fill="#e6c79a" {...CIZGI} /><path d="M90 128Q78 72 119 46q43-28 84 3 26 19 30 67-24-9-38-34-38 22-88 13-2 19-17 33Z" fill="#26365a" {...CIZGI} />
    <path d="M88 143h144l-14 49q-28 17-55-4-29 22-61 3Z" fill="#f2b23c" {...CIZGI} /><ellipse cx="126" cy="164" rx="13" ry="12" fill="#fff8ec" {...CIZGI} /><circle cx="130" cy="166" r="6" fill="#0b1220" /><ellipse cx="199" cy="163" rx="13" ry="12" fill="#fff8ec" {...CIZGI} /><circle cx="196" cy="165" r="6" fill="#0b1220" /><path d="M160 169q-5 21 5 23l9-2M130 210q31 20 63-4" fill="none" {...CIZGI} />
    <path d="m111 251 49 47 49-47" fill="#e8543f" {...CIZGI} /><path d="m160 266 12 15-12 15-12-15Z" fill="#f2b23c" />
  </svg>;
}

function Kopek() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Neşeli köpek avatarı">
    <Sahne renk="#4a9dd9" vurgu="#cfeeff" /><path d="M67 108Q24 84 42 168q8 34 38 17M253 108q43-24 25 60-8 34-38 17" fill="#8a5f16" {...CIZGI} />
    <path d="M56 300q10-70 104-79 94 9 104 79" fill="#c98a22" {...CIZGI} /><path d="M72 148q0-91 88-99 88 8 88 99-2 91-88 100-86-9-88-100Z" fill="#c98a22" {...CIZGI} />
    <path d="M97 143q18-14 38 1M184 143q19-13 39 2" fill="none" {...CIZGI} /><ellipse cx="123" cy="161" rx="14" ry="16" fill="#fff8ec" {...CIZGI} /><circle cx="128" cy="164" r="7" fill="#0b1220" /><ellipse cx="201" cy="160" rx="14" ry="16" fill="#fff8ec" {...CIZGI} /><circle cx="197" cy="163" r="7" fill="#0b1220" />
    <ellipse cx="160" cy="201" rx="48" ry="35" fill="#e6c79a" {...CIZGI} /><path d="M145 185q15-11 30 0-1 17-15 18-14-1-15-18Z" fill="#0b1220" /><path d="M160 203q-2 22-22 21M160 203q3 22 23 20" fill="none" {...CIZGI} /><path d="M149 220q12 24 25 0" fill="#e8543f" {...CIZGI} />
  </svg>;
}

function Baykus() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Bilge baykuş avatarı">
    <Sahne renk="#3fa9a0" vurgu="#c6f1ef" /><path d="M61 93 75 35l39 35M259 93l-14-58-39 35" fill="#26365a" {...CIZGI} /><path d="M55 300q8-72 105-82 97 10 105 82" fill="#26365a" {...CIZGI} />
    <path d="M69 145q0-91 91-98 91 7 91 98-3 83-91 109-88-26-91-109Z" fill="#3b4a6b" {...CIZGI} /><path d="M83 137q40-44 77 1 37-45 77-1-4 69-77 71-73-2-77-71Z" fill="#fff8ec" {...CIZGI} />
    <circle cx="124" cy="152" r="28" fill="#f2b23c" {...CIZGI} /><circle cx="196" cy="152" r="28" fill="#f2b23c" {...CIZGI} /><circle cx="129" cy="155" r="10" fill="#0b1220" /><circle cx="191" cy="155" r="10" fill="#0b1220" /><path d="m160 162-16 22 16 12 16-12Z" fill="#e8543f" {...CIZGI} /><path d="M121 224q39 22 78 0" fill="none" stroke="#4fb3c9" strokeWidth="10" strokeLinecap="round" />
  </svg>;
}

function Tilki() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kurnaz tilki avatarı">
    <Sahne renk="#4fb3c9" vurgu="#d5f5f0" /><path d="M68 112 76 30l68 58M252 112l-8-82-68 58" fill="#ee8b3c" {...CIZGI} /><path d="m84 88 3-38 34 32M236 88l-3-38-34 32" fill="#26365a" {...CIZGI} />
    <path d="M55 300q10-70 105-80 95 10 105 80" fill="#26365a" {...CIZGI} /><path d="M70 145q0-88 90-96 90 8 90 96-6 76-90 111-84-35-90-111Z" fill="#ee8b3c" {...CIZGI} /><path d="M81 183q79-23 158 0-17 65-79 73-62-8-79-73Z" fill="#fff8ec" {...CIZGI} />
    <path d="M103 145q19-13 38 1M179 145q19-13 38 1" fill="none" {...CIZGI} /><path d="M106 159q17 15 34 0M180 159q17 15 34 0" fill="none" {...CIZGI} /><path d="M145 184q15-10 30 0-2 16-15 16t-15-16Z" fill="#0b1220" /><path d="M160 201q0 21-28 25M160 201q0 21 28 25" fill="none" {...CIZGI} />
  </svg>;
}

function Penguen() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Şık penguen avatarı">
    <Sahne renk="#f2b23c" vurgu="#fff1b8" /><path d="M55 300q8-70 105-80 97 10 105 80" fill="#26365a" {...CIZGI} /><path d="M72 147q0-92 88-101 88 9 88 101-2 91-88 103-86-12-88-103Z" fill="#26365a" {...CIZGI} />
    <path d="M99 130q8-62 61-63 53 1 61 63l-7 81q-22 34-54 39-32-5-54-39Z" fill="#fff8ec" {...CIZGI} /><path d="M112 145q17-13 34 2M175 145q17-13 34 2" fill="none" {...CIZGI} /><circle cx="130" cy="160" r="8" fill="#0b1220" /><circle cx="192" cy="160" r="8" fill="#0b1220" /><path d="m160 170-22 20 22 12 22-12Z" fill="#ee8b3c" {...CIZGI} />
    <path d="m127 235 33 18 33-18-13 42-20-14-20 14Z" fill="#e8543f" {...CIZGI} /><circle cx="160" cy="253" r="8" fill="#f2b23c" {...CIZGI} />
  </svg>;
}

function Kurbaga() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Rahat kurbağa avatarı">
    <Sahne renk="#4fb3c9" vurgu="#c9f3ef" /><path d="M54 300q9-69 106-79 97 10 106 79" fill="#278d62" {...CIZGI} /><circle cx="111" cy="91" r="39" fill="#2fbf71" {...CIZGI} /><circle cx="209" cy="91" r="39" fill="#2fbf71" {...CIZGI} />
    <path d="M69 149q0-85 91-91 91 6 91 91-2 91-91 101-89-10-91-101Z" fill="#2fbf71" {...CIZGI} /><circle cx="111" cy="96" r="24" fill="#fff8ec" {...CIZGI} /><circle cx="209" cy="96" r="24" fill="#fff8ec" {...CIZGI} /><circle cx="116" cy="101" r="10" fill="#0b1220" /><circle cx="204" cy="101" r="10" fill="#0b1220" />
    <circle cx="133" cy="168" r="5" fill="#218452" /><circle cx="187" cy="168" r="5" fill="#218452" /><path d="M110 191q50 45 100 0-8 58-50 58-42 0-50-58Z" fill="#0b1220" {...CIZGI} /><path d="M127 210q33 19 66 0" fill="none" stroke="#e8543f" strokeWidth="12" strokeLinecap="round" /><circle cx="89" cy="181" r="13" fill="#e8543f" opacity=".45" /><circle cx="231" cy="181" r="13" fill="#e8543f" opacity=".45" />
  </svg>;
}

function Ayi() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Sıcakkanlı ayı avatarı">
    <Sahne renk="#57c9a0" vurgu="#d9f7e6" /><circle cx="91" cy="87" r="39" fill="#8a5f16" {...CIZGI} /><circle cx="229" cy="87" r="39" fill="#8a5f16" {...CIZGI} /><circle cx="91" cy="87" r="20" fill="#c98a22" /><circle cx="229" cy="87" r="20" fill="#c98a22" />
    <path d="M55 300q10-69 105-79 95 10 105 79" fill="#8a5f16" {...CIZGI} /><path d="M71 151q0-94 89-102 89 8 89 102-2 89-89 100-87-11-89-100Z" fill="#8a5f16" {...CIZGI} /><ellipse cx="160" cy="193" rx="57" ry="47" fill="#c98a22" {...CIZGI} />
    <ellipse cx="125" cy="153" rx="14" ry="16" fill="#fff8ec" {...CIZGI} /><circle cx="129" cy="157" r="7" fill="#0b1220" /><ellipse cx="197" cy="153" rx="14" ry="16" fill="#fff8ec" {...CIZGI} /><circle cx="193" cy="157" r="7" fill="#0b1220" /><path d="M143 181q17-13 34 0-2 18-17 18t-17-18Z" fill="#0b1220" /><path d="M160 200v12M160 212q-18 14-32 0M160 212q18 14 32 0" fill="none" {...CIZGI} />
  </svg>;
}

function Maymun() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Muzip maymun avatarı">
    <Sahne renk="#e0729a" vurgu="#ffd0df" /><circle cx="75" cy="151" r="42" fill="#c98a22" {...CIZGI} /><circle cx="245" cy="151" r="42" fill="#c98a22" {...CIZGI} /><path d="M55 300q8-70 105-79 97 9 105 79" fill="#8a5f16" {...CIZGI} />
    <path d="M72 146q0-91 88-99 88 8 88 99-2 94-88 105-86-11-88-105Z" fill="#8a5f16" {...CIZGI} /><path d="M100 130q13-62 60-55 47-7 60 55l-3 78q-23 42-57 43-34-1-57-43Z" fill="#e6c79a" {...CIZGI} />
    <ellipse cx="128" cy="151" rx="13" ry="15" fill="#fff8ec" {...CIZGI} /><circle cx="132" cy="154" r="7" fill="#0b1220" /><ellipse cx="195" cy="151" rx="13" ry="15" fill="#fff8ec" {...CIZGI} /><circle cx="191" cy="154" r="7" fill="#0b1220" /><circle cx="145" cy="183" r="5" fill="#8a5f16" /><circle cx="176" cy="183" r="5" fill="#8a5f16" /><path d="M122 205q38 32 77-4-6 47-39 48-32-1-38-44Z" fill="#0b1220" {...CIZGI} /><path d="M136 211h49" stroke="#fff8ec" strokeWidth="10" strokeLinecap="round" />
  </svg>;
}

function Ejderha() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Ateşli ejderha avatarı">
    <Sahne renk="#26365a" vurgu="#5c7fa8" /><path d="m96 83-22-54 47 31M224 83l22-54-47 31" fill="#f2b23c" {...CIZGI} /><path d="m118 62 13-38 29 31 28-33 15 42" fill="#d9536a" {...CIZGI} />
    <path d="M53 300q8-71 107-80 99 9 107 80" fill="#b93737" {...CIZGI} /><path d="M70 136q4-82 90-89 86 7 90 89l5 55q-9 57-95 65-86-8-95-65Z" fill="#e8543f" {...CIZGI} /><path d="M85 125q75 30 150 0" fill="none" stroke="#b93737" strokeWidth="13" strokeLinecap="round" />
    <path d="M101 145q21-16 42 2M177 147q21-18 43-1" fill="none" {...CIZGI} /><ellipse cx="125" cy="160" rx="15" ry="14" fill="#f2b23c" {...CIZGI} /><circle cx="131" cy="162" r="6" fill="#0b1220" /><ellipse cx="200" cy="160" rx="15" ry="14" fill="#f2b23c" {...CIZGI} /><circle cx="194" cy="162" r="6" fill="#0b1220" /><circle cx="146" cy="188" r="5" fill="#0b1220" /><circle cx="178" cy="188" r="5" fill="#0b1220" /><path d="M114 207q46 33 94-2-5 41-48 45-42-4-46-43Z" fill="#0b1220" {...CIZGI} /><path d="m131 214 11 18 12-17 12 18 12-18 11 15" fill="#fff8ec" />
  </svg>;
}

function Kopekbaligi() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Havalı köpekbalığı avatarı">
    <Sahne renk="#4fb3c9" vurgu="#c6f1ef" /><path d="m130 69 30-54 31 55" fill="#5c7fa8" {...CIZGI} /><path d="M47 300q12-68 113-79 101 11 113 79" fill="#3b4a6b" {...CIZGI} /><path d="M65 139q3-83 95-91 92 8 95 91l5 61q-19 52-100 57-81-5-100-57Z" fill="#5c7fa8" {...CIZGI} />
    <path d="M87 193q73-37 146 0-13 63-73 64-60-1-73-64Z" fill="#cfe3f5" {...CIZGI} /><path d="M99 142q21-14 42 3M180 144q21-16 43-1" fill="none" {...CIZGI} /><path d="M108 158h39M176 158h39" stroke="#0b1220" strokeWidth="9" strokeLinecap="round" /><circle cx="145" cy="181" r="4" fill="#26365a" /><circle cx="177" cy="181" r="4" fill="#26365a" /><path d="M111 205q49 31 99-2-7 45-50 47-42-2-49-45Z" fill="#0b1220" {...CIZGI} /><path d="m127 211 11 18 12-17 12 18 12-18 11 16 10-18" fill="#fff8ec" />
  </svg>;
}

function Ahtapot() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Şaşkın ahtapot avatarı">
    <Sahne renk="#f2b23c" vurgu="#fff0b2" /><path d="M47 300q8-70 113-79 105 9 113 79" fill="#b83e60" {...CIZGI} /><path d="M68 151q0-96 92-103 92 7 92 103v76l-20-16-18 21-18-21-18 21-18-21-18 21-18-21-20 16Z" fill="#d9536a" {...CIZGI} />
    <ellipse cx="122" cy="153" rx="19" ry="23" fill="#fff8ec" {...CIZGI} /><circle cx="128" cy="157" r="9" fill="#0b1220" /><ellipse cx="199" cy="153" rx="19" ry="23" fill="#fff8ec" {...CIZGI} /><circle cx="193" cy="157" r="9" fill="#0b1220" /><ellipse cx="160" cy="202" rx="17" ry="21" fill="#0b1220" {...CIZGI} /><path d="M91 126q25-25 50-3M179 123q25-22 50 3" fill="none" {...CIZGI} /><circle cx="91" cy="191" r="11" fill="#e88aa2" /><circle cx="229" cy="191" r="11" fill="#e88aa2" />
  </svg>;
}

function Ari() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Çalışkan arı avatarı">
    <Sahne renk="#26365a" vurgu="#5c7fa8" /><path d="M121 72 99 35M199 72l22-37" fill="none" stroke="#0b1220" strokeWidth="8" strokeLinecap="round" /><circle cx="95" cy="29" r="13" fill="#f2b23c" {...CIZGI} /><circle cx="225" cy="29" r="13" fill="#f2b23c" {...CIZGI} />
    <path d="M51 300q9-70 109-80 100 10 109 80" fill="#f2b23c" {...CIZGI} /><path d="M70 148q0-93 90-101 90 8 90 101-2 91-90 102-88-11-90-102Z" fill="#f2b23c" {...CIZGI} /><path d="M77 112h166M70 198h180" stroke="#0b1220" strokeWidth="19" />
    <ellipse cx="124" cy="153" rx="15" ry="18" fill="#fff8ec" {...CIZGI} /><circle cx="129" cy="156" r="7" fill="#0b1220" /><ellipse cx="198" cy="153" rx="15" ry="18" fill="#fff8ec" {...CIZGI} /><circle cx="194" cy="156" r="7" fill="#0b1220" /><path d="M128 178q32 30 65-2" fill="none" {...CIZGI} /><path d="M91 239q69 27 138 0" fill="none" stroke="#0b1220" strokeWidth="15" />
  </svg>;
}

function Ninja() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Sessiz ninja avatarı">
    <Sahne renk="#e8543f" vurgu="#ffb7a6" /><path d="M52 300q9-70 108-80 99 10 108 80" fill="#0b1220" {...CIZGI} /><path d="M70 147q0-92 90-101 90 9 90 101-2 91-90 102-88-11-90-102Z" fill="#26365a" {...CIZGI} />
    <path d="M83 132q77-33 154 0l-7 59q-70 34-140 0Z" fill="#e6c79a" {...CIZGI} /><path d="M105 148q21-15 43 2M174 150q21-17 43-1" fill="none" {...CIZGI} /><path d="M107 165q20 15 40 0M175 165q20 15 40 0" fill="none" {...CIZGI} /><path d="M70 102h180v27H70Z" fill="#d9536a" {...CIZGI} /><path d="m244 109 49 16-47 21" fill="#d9536a" {...CIZGI} /><path d="M121 224h78" stroke="#5c7fa8" strokeWidth="9" strokeLinecap="round" />
  </svg>;
}

function Sovalye() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Cesur şövalye avatarı">
    <Sahne renk="#c98a22" vurgu="#ffe19b" /><path d="M50 300q10-69 110-80 100 11 110 80" fill="#5c7fa8" {...CIZGI} /><path d="M70 131q0-74 90-82 90 8 90 82v106H70Z" fill="#8496b2" {...CIZGI} /><path d="M91 100q18-52 69-54 51 2 69 54" fill="#5c7fa8" {...CIZGI} />
    <path d="M83 130h154v66H83Z" fill="#26365a" {...CIZGI} /><rect x="102" y="148" width="45" height="24" rx="8" fill="#0b1220" /><rect x="174" y="148" width="45" height="24" rx="8" fill="#0b1220" /><rect x="116" y="155" width="18" height="10" rx="4" fill="#4fb3c9" /><rect x="188" y="155" width="18" height="10" rx="4" fill="#4fb3c9" /><path d="M151 160h18M126 218q34 19 69-2" fill="none" stroke="#26365a" strokeWidth="8" strokeLinecap="round" /><path d="M155 47v75" stroke="#f2b23c" strokeWidth="9" />
  </svg>;
}

function Buyucu() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Bilge büyücü avatarı">
    <Sahne renk="#3fa9a0" vurgu="#c8f3e9" /><path d="m86 105 74-94 75 94Z" fill="#26365a" {...CIZGI} /><path d="M63 100h194v28H63Z" fill="#26365a" {...CIZGI} /><circle cx="177" cy="55" r="10" fill="#f2b23c" /><path d="m198 77 8-18 8 18 18 8-18 8-8 18-8-18-18-8Z" fill="#f2b23c" />
    <path d="M54 300q8-70 106-79 98 9 106 79" fill="#26365a" {...CIZGI} /><path d="M86 145q0-78 74-85 74 7 74 85-2 74-74 83-72-9-74-83Z" fill="#e6c79a" {...CIZGI} /><path d="M105 151q18-14 37 1M178 151q19-14 38 1" fill="none" {...CIZGI} /><path d="M109 165q17 15 34 0M178 165q17 15 34 0" fill="none" {...CIZGI} /><path d="M110 195q50 82 100 0-3 77-50 91-47-14-50-91Z" fill="#fff8ec" {...CIZGI} /><path d="M135 204q25 18 50-2" fill="none" {...CIZGI} />
  </svg>;
}

function Dedektif() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Meraklı dedektif avatarı">
    <Sahne renk="#8496b2" vurgu="#dce4ef" /><path d="M54 300q8-69 106-79 98 10 106 79" fill="#8a5f16" {...CIZGI} /><path d="M88 145q0-83 72-90 72 7 72 90-2 82-72 91-70-9-72-91Z" fill="#e6c79a" {...CIZGI} />
    <path d="M70 89h180M100 89q8-54 60-55 52 1 60 55" fill="#8a5f16" {...CIZGI} /><path d="M112 144q16-10 32 2M177 145q16-11 33 1" fill="none" {...CIZGI} /><circle cx="128" cy="160" r="25" fill="#fff8ec" fillOpacity=".45" stroke="#26365a" strokeWidth="7" /><circle cx="200" cy="160" r="25" fill="#fff8ec" fillOpacity=".45" stroke="#26365a" strokeWidth="7" /><path d="M153 160h22" fill="none" {...CIZGI} /><circle cx="131" cy="162" r="6" fill="#0b1220" /><circle cx="197" cy="162" r="6" fill="#0b1220" /><path d="M160 165q-6 24 6 27l10-2" fill="none" {...CIZGI} /><path d="M126 206q34-17 68 0-34 13-68 0Z" fill="#3b4a6b" {...CIZGI} />
  </svg>;
}

function Viking() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Gür sakallı Viking avatarı">
    <Sahne renk="#5aa9e6" vurgu="#d5efff" /><path d="M92 95Q31 89 31 27q43 9 61 48M228 95q61-6 61-68-43 9-61 48" fill="#fff8ec" {...CIZGI} /><path d="M53 300q9-70 107-80 98 10 107 80" fill="#3b4a6b" {...CIZGI} />
    <path d="M84 147q0-86 76-94 76 8 76 94-2 83-76 92-74-9-76-92Z" fill="#e6c79a" {...CIZGI} /><path d="M75 115q11-70 85-73 74 3 85 73Z" fill="#8496b2" {...CIZGI} /><path d="M111 146q18-13 37 2M174 148q18-15 38-1" fill="none" {...CIZGI} /><circle cx="130" cy="162" r="8" fill="#0b1220" /><circle cx="194" cy="162" r="8" fill="#0b1220" /><path d="M111 194q49 86 98 0-3 88-49 103-46-15-49-103Z" fill="#ee8b3c" {...CIZGI} /><path d="M129 208q31 22 63-3" fill="none" {...CIZGI} /><path d="M160 231v56M128 246l32 14 32-14" fill="none" stroke="#c96c2a" strokeWidth="9" />
  </svg>;
}

function Hayalet() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Utangaç hayalet avatarı">
    <Sahne renk="#26365a" vurgu="#5c7fa8" /><path d="M64 300V145q0-95 96-99 96 4 96 99v155l-24-22-24 22-24-22-24 22-24-22-24 22-24-22Z" fill="#fff8ec" {...CIZGI} />
    <ellipse cx="124" cy="153" rx="18" ry="24" fill="#26365a" /><ellipse cx="198" cy="153" rx="18" ry="24" fill="#26365a" /><circle cx="119" cy="146" r="5" fill="#fff8ec" /><circle cx="193" cy="146" r="5" fill="#fff8ec" /><ellipse cx="160" cy="209" rx="16" ry="20" fill="#26365a" {...CIZGI} /><path d="M93 116q28-25 55-2M174 114q28-23 55 2" fill="none" stroke="#c9d3e2" strokeWidth="9" strokeLinecap="round" />
  </svg>;
}

function Zombi() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Şaşkın zombi avatarı">
    <Sahne renk="#8cbf3f" vurgu="#dff0a8" /><path d="M53 300q9-70 107-80 98 10 107 80" fill="#3b4a6b" {...CIZGI} /><path d="M73 147q0-91 87-100 87 9 87 100-2 92-87 103-85-11-87-103Z" fill="#57c9a0" {...CIZGI} />
    <path d="M86 101q18-62 74-60 54-2 72 45-47-12-71 12-37-20-75 3Z" fill="#278d62" {...CIZGI} /><path d="M102 139q21-13 41 4M178 145q18-17 40-3" fill="none" {...CIZGI} /><ellipse cx="126" cy="160" rx="17" ry="20" fill="#fff8ec" {...CIZGI} /><circle cx="121" cy="161" r="7" fill="#0b1220" /><ellipse cx="200" cy="160" rx="14" ry="16" fill="#fff8ec" {...CIZGI} /><circle cx="205" cy="163" r="6" fill="#0b1220" /><path d="M115 204q46 31 93-3-5 44-48 49-41-5-45-46Z" fill="#0b1220" {...CIZGI} /><path d="m130 211 12 18 13-17 13 18 12-18 11 15" fill="#fff8ec" /><path d="m84 179 22 8M214 126l20-17" fill="none" stroke="#218452" strokeWidth="7" strokeLinecap="round" />
  </svg>;
}

function Mumya() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Eski mumya avatarı">
    <Sahne renk="#c98a22" vurgu="#ffe1a2" /><path d="M53 300q9-70 107-80 98 10 107 80" fill="#cdc6b4" {...CIZGI} /><path d="M73 147q0-91 87-100 87 9 87 100-2 92-87 103-85-11-87-103Z" fill="#b8b0a0" {...CIZGI} />
    <path d="M82 94h155M74 132h174M73 176h174M83 219h154M101 55l130 51M80 154l158 49M105 236l98 39" fill="none" stroke="#fff8ec" strokeWidth="22" strokeLinecap="round" /><path d="M104 139q22-14 42 4M176 143q21-17 43-2" fill="none" {...CIZGI} /><ellipse cx="127" cy="159" rx="13" ry="15" fill="#0b1220" /><circle cx="123" cy="154" r="4" fill="#fff8ec" /><ellipse cx="200" cy="159" rx="13" ry="15" fill="#0b1220" /><circle cx="196" cy="154" r="4" fill="#fff8ec" /><path d="M132 211q28 18 57-3" fill="none" {...CIZGI} />
  </svg>;
}

function Palyaco() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Neşeli palyaço avatarı">
    <Sahne renk="#4a9dd9" vurgu="#bce7ff" /><circle cx="90" cy="96" r="44" fill="#e8543f" {...CIZGI} /><circle cx="160" cy="67" r="49" fill="#f2b23c" {...CIZGI} /><circle cx="230" cy="96" r="44" fill="#e8543f" {...CIZGI} /><path d="M53 300q9-70 107-80 98 10 107 80" fill="#d9536a" {...CIZGI} />
    <path d="M78 150q0-88 82-96 82 8 82 96-2 88-82 99-80-11-82-99Z" fill="#fff8ec" {...CIZGI} /><path d="M104 139q20-14 40 3M177 142q20-17 41-1" fill="none" stroke="#4a9dd9" strokeWidth="10" strokeLinecap="round" /><circle cx="127" cy="160" r="8" fill="#0b1220" /><circle cx="198" cy="160" r="8" fill="#0b1220" /><circle cx="161" cy="185" r="17" fill="#e8543f" {...CIZGI} /><path d="M116 207q44 42 89-3-7 54-45 57-37-3-44-54Z" fill="#0b1220" {...CIZGI} /><path d="M132 214q28 20 57-3" fill="none" stroke="#fff8ec" strokeWidth="10" strokeLinecap="round" /><path d="m111 258 49 29 49-29-12 42h-74Z" fill="#f2b23c" {...CIZGI} />
  </svg>;
}

function Kral() {
  return <svg viewBox="0 0 320 320" role="img" aria-label="Kendinden emin kral avatarı">
    <Sahne renk="#26365a" vurgu="#5c7fa8" /><path d="m76 92 12-62 42 34 30-51 31 51 41-34 12 62Z" fill="#f2b23c" {...CIZGI} /><circle cx="160" cy="45" r="10" fill="#e8543f" /><circle cx="99" cy="62" r="8" fill="#4fb3c9" /><circle cx="220" cy="62" r="8" fill="#4fb3c9" />
    <path d="M52 300q9-70 108-80 99 10 108 80" fill="#d9536a" {...CIZGI} /><path d="M83 146q0-86 77-94 77 8 77 94-2 84-77 93-75-9-77-93Z" fill="#e6c79a" {...CIZGI} /><path d="M106 145q18-13 37 2M178 147q18-15 38-1" fill="none" {...CIZGI} /><circle cx="128" cy="161" r="8" fill="#0b1220" /><circle cx="198" cy="161" r="8" fill="#0b1220" /><path d="M108 192q52 82 104 0-4 87-52 104-48-17-52-104Z" fill="#fff8ec" {...CIZGI} /><path d="M130 204q30 21 61-3" fill="none" {...CIZGI} /><path d="M104 266h112" stroke="#f2b23c" strokeWidth="11" strokeLinecap="round" />
  </svg>;
}

export const AVATAR_PRO = [
  { anahtar: "kedi-k01", Bilesen: Kedi },
  { anahtar: "kopek-k02", Bilesen: Kopek },
  { anahtar: "baykus-k03", Bilesen: Baykus },
  { anahtar: "tilki-k04", Bilesen: Tilki },
  { anahtar: "panda-k05", Bilesen: Panda },
  { anahtar: "penguen-k06", Bilesen: Penguen },
  { anahtar: "kurbaga-k07", Bilesen: Kurbaga },
  { anahtar: "ayi-k08", Bilesen: Ayi },
  { anahtar: "maymun-k09", Bilesen: Maymun },
  { anahtar: "dinozor-k10", Bilesen: Dinozor },
  { anahtar: "ejderha-k11", Bilesen: Ejderha },
  { anahtar: "kopekbaligi-k12", Bilesen: Kopekbaligi },
  { anahtar: "ahtapot-k13", Bilesen: Ahtapot },
  { anahtar: "ari-k14", Bilesen: Ari },
  { anahtar: "robot-k15", Bilesen: Robot },
  { anahtar: "uzayli-k16", Bilesen: Uzayli },
  { anahtar: "astronot-k17", Bilesen: Astronot },
  { anahtar: "ninja-k18", Bilesen: Ninja },
  { anahtar: "korsan-k19", Bilesen: Korsan },
  { anahtar: "sovalye-k20", Bilesen: Sovalye },
  { anahtar: "buyucu-k21", Bilesen: Buyucu },
  { anahtar: "dedektif-k22", Bilesen: Dedektif },
  { anahtar: "asci-k23", Bilesen: Asci },
  { anahtar: "profesor-k24", Bilesen: Profesor },
  { anahtar: "viking-k25", Bilesen: Viking },
  { anahtar: "hayalet-k26", Bilesen: Hayalet },
  { anahtar: "zombi-k27", Bilesen: Zombi },
  { anahtar: "mumya-k28", Bilesen: Mumya },
  { anahtar: "kahraman-k29", Bilesen: Kahraman },
  { anahtar: "palyaco-k30", Bilesen: Palyaco },
  { anahtar: "kral-k31", Bilesen: Kral },
];
