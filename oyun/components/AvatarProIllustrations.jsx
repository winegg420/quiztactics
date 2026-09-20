const CIZGI = {
  stroke: "#0b1220",
  strokeWidth: 5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Sahne({ renk, vurgu = "#fff8ec" }) {
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

export const AVATAR_PRO = [
  { anahtar: "kedi-k01", Bilesen: Kedi },
  { anahtar: "panda-k05", Bilesen: Panda },
  { anahtar: "dinozor-k10", Bilesen: Dinozor },
  { anahtar: "robot-k15", Bilesen: Robot },
  { anahtar: "uzayli-k16", Bilesen: Uzayli },
  { anahtar: "astronot-k17", Bilesen: Astronot },
  { anahtar: "korsan-k19", Bilesen: Korsan },
  { anahtar: "asci-k23", Bilesen: Asci },
  { anahtar: "profesor-k24", Bilesen: Profesor },
  { anahtar: "kahraman-k29", Bilesen: Kahraman },
];
