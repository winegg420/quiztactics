const cizgi = {
  stroke: "#18233f",
  strokeWidth: 5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function PandaAvatar() {
  return (
    <svg viewBox="0 0 320 320" role="img" aria-label="Rahat ve zeki ifadeli panda avatarı">
      <rect width="320" height="320" rx="34" fill="#e9d9b8" />
      <path d="M33 69c25 2 42-8 56-29M43 97c25 1 40-7 52-25" fill="none" stroke="#77a272" strokeWidth="9" strokeLinecap="round" opacity=".7" />
      <path d="M235 42c18 14 33 17 52 13M244 68c17 10 29 12 44 8" fill="none" stroke="#d49062" strokeWidth="8" strokeLinecap="round" opacity=".55" />
      <path d="M74 294c6-48 38-73 86-73s84 25 89 73" fill="#246d70" {...cizgi} />
      <circle cx="92" cy="94" r="35" fill="#242943" {...cizgi} />
      <circle cx="229" cy="88" r="34" fill="#242943" {...cizgi} />
      <path d="M78 161c0-60 35-103 85-103 57 0 88 42 83 105-4 60-31 95-85 95-52 0-83-38-83-97Z" fill="#f7f0df" {...cizgi} />
      <path d="M101 150c3-27 18-45 37-41 15 3 20 22 12 46-7 22-22 33-36 26-12-6-16-18-13-31Z" fill="#242943" transform="rotate(8 125 145)" />
      <path d="M175 148c6-28 23-43 40-36 16 6 17 27 7 48-9 20-26 28-39 18-10-8-12-19-8-30Z" fill="#242943" transform="rotate(-7 199 146)" />
      <ellipse cx="129" cy="148" rx="8" ry="10" fill="#fff" />
      <circle cx="131" cy="151" r="5" fill="#18233f" />
      <ellipse cx="200" cy="150" rx="8" ry="10" fill="#fff" />
      <circle cx="198" cy="153" r="5" fill="#18233f" />
      <path d="M145 182q17-12 32 0-2 18-16 18t-16-18Z" fill="#18233f" />
      <path d="M130 210q31 18 61-4" fill="none" {...cizgi} />
      <path d="M113 225q48 30 96-4l16 37q-64 27-125 0Z" fill="#e96b3c" {...cizgi} />
      <path d="M107 92q13-15 28-18" fill="none" {...cizgi} />
    </svg>
  );
}

function InsanAvatar() {
  return (
    <svg viewBox="0 0 320 320" role="img" aria-label="Meraklı ve karakterli insan avatarı">
      <rect width="320" height="320" rx="34" fill="#bcd6d1" />
      <path d="m35 83 24-19 8 27 22 5-25 17-6-23Z" fill="#f5b83d" opacity=".8" />
      <path d="M248 55q26 5 33 27M259 43l-7 40" fill="none" stroke="#f07747" strokeWidth="7" strokeLinecap="round" opacity=".7" />
      <path d="M68 298c4-48 37-76 92-76 58 0 91 28 95 76" fill="#354b78" {...cizgi} />
      <path d="M103 247q15-17 22-19h70q16 8 25 25l-18 48H93Z" fill="#eb6b3c" {...cizgi} />
      <path d="M131 213v31q31 18 58-1v-35" fill="#bd7552" {...cizgi} />
      <path d="M91 145c0-61 31-100 77-100 50 0 79 40 75 103-4 62-30 91-76 91-48 0-76-34-76-94Z" fill="#c9825d" {...cizgi} />
      <path d="M89 142Q75 58 139 35q48-22 89 17 25 24 19 69-17-18-29-45-26 24-63 27-31 3-52-10-4 26-14 49Z" fill="#30354d" {...cizgi} />
      <path d="M112 77q-20 26-18 62" fill="none" stroke="#46506d" strokeWidth="12" strokeLinecap="round" />
      <path d="M204 89q19 20 35 43" fill="none" stroke="#46506d" strokeWidth="10" strokeLinecap="round" />
      <path d="M112 143q13-9 27 0M187 141q14-9 27 1" fill="none" {...cizgi} />
      <ellipse cx="127" cy="153" rx="8" ry="7" fill="#fff" />
      <circle cx="129" cy="154" r="4" fill="#18233f" />
      <ellipse cx="201" cy="152" rx="8" ry="7" fill="#fff" />
      <circle cx="199" cy="153" r="4" fill="#18233f" />
      <path d="M166 150q-7 26 4 29l11-2" fill="none" {...cizgi} />
      <path d="M132 194q34 23 69-5-7 35-36 36-24-1-33-31Z" fill="#fff2df" {...cizgi} />
      <path d="M110 131q16-11 31-2M187 128q15-8 29 3" fill="none" {...cizgi} />
      <circle cx="215" cy="178" r="4" fill="#8f4c42" />
    </svg>
  );
}

function TrexAvatar() {
  return (
    <svg viewBox="0 0 320 320" role="img" aria-label="Komik ve havalı T-Rex avatarı">
      <rect width="320" height="320" rx="34" fill="#c8d7a4" />
      <circle cx="56" cy="57" r="17" fill="#f2ad43" opacity=".75" />
      <path d="M248 38v35M230 55h36" stroke="#6a9564" strokeWidth="9" strokeLinecap="round" opacity=".65" />
      <path d="M73 295q6-71 62-88l62 3q47 22 53 85" fill="#4f8e5d" {...cizgi} />
      <path d="M181 245q38-8 61 17l-22 14-29-10M137 247q-35-2-55 24l25 9 25-12" fill="#75a966" {...cizgi} />
      <path d="M85 129q5-69 80-81 54-9 82 28 12 16 13 42 33 17 29 51-4 38-43 49l-89 3q-73 0-77-54-1-20 5-38Z" fill="#75a966" {...cizgi} />
      <path d="M85 132q36 3 62-24 29 28 108 15" fill="none" stroke="#4f8e5d" strokeWidth="13" strokeLinecap="round" opacity=".8" />
      <path d="M218 139q14-7 28 3" fill="none" {...cizgi} />
      <ellipse cx="232" cy="153" rx="13" ry="15" fill="#fff3d7" {...cizgi} />
      <circle cx="235" cy="155" r="6" fill="#18233f" />
      <path d="M262 167q10 3 14 11" fill="none" {...cizgi} />
      <circle cx="257" cy="174" r="5" fill="#355c48" />
      <path d="M131 173q49 26 137 8-19 47-82 49-44 1-55-57Z" fill="#e6c98e" {...cizgi} />
      <path d="m163 188 14 19 13-22 15 20 13-22" fill="#fff9e8" {...cizgi} />
      <path d="M176 224q24 10 49-4" fill="none" stroke="#b45c45" strokeWidth="6" strokeLinecap="round" />
      <path d="M113 93q12-15 28-17M108 114q15-10 27-7" fill="none" stroke="#4f8e5d" strokeWidth="8" strokeLinecap="round" />
      <path d="M117 232q41 18 83 2l8 27q-52 20-101-1Z" fill="#ef7743" {...cizgi} />
    </svg>
  );
}

function KaplanAvatar() {
  return (
    <svg viewBox="0 0 320 320" role="img" aria-label="Güçlü ve tatlı kaplan avatarı">
      <rect width="320" height="320" rx="34" fill="#e8bf73" />
      <path d="M35 246q24-28 51-5t49-8" fill="none" stroke="#cc7046" strokeWidth="10" strokeLinecap="round" opacity=".55" />
      <path d="M240 53q19 10 37 0M252 73q14 6 27 1" fill="none" stroke="#fff1cc" strokeWidth="9" strokeLinecap="round" opacity=".75" />
      <path d="M72 298q7-66 88-77 78 11 87 77" fill="#2c7775" {...cizgi} />
      <path d="M85 93 54 62q-9 44 19 63M231 91l33-30q8 45-21 64" fill="#d86c35" {...cizgi} />
      <path d="m65 76 23 19-16 17q-11-15-7-36ZM254 76l-23 19 16 17q11-15 7-36Z" fill="#f3c29b" />
      <path d="M77 158q0-92 83-104 85 14 83 105-1 83-83 99-81-15-83-100Z" fill="#e98239" {...cizgi} />
      <path d="M115 98 96 73M137 88l-8-29M204 96l19-24M183 87l8-28" fill="none" stroke="#29314a" strokeWidth="10" strokeLinecap="round" />
      <path d="M83 147q22 7 40 28M238 146q-22 8-40 29" fill="none" stroke="#29314a" strokeWidth="9" strokeLinecap="round" />
      <path d="M108 140q14-11 29-2M183 137q16-9 30 3" fill="none" {...cizgi} />
      <ellipse cx="127" cy="153" rx="11" ry="12" fill="#f7e8bd" {...cizgi} />
      <circle cx="130" cy="154" r="5" fill="#18233f" />
      <ellipse cx="198" cy="152" rx="11" ry="12" fill="#f7e8bd" {...cizgi} />
      <circle cx="195" cy="153" r="5" fill="#18233f" />
      <path d="M111 180q49-31 98 0 16 12 5 36-13 29-53 29-43 0-55-30-10-23 5-35Z" fill="#f5d7a6" {...cizgi} />
      <path d="M144 183q17-11 34 0-2 18-17 18t-17-18Z" fill="#7e463d" {...cizgi} />
      <path d="M161 201v13M161 214q-19 14-32-1M161 214q19 14 34-2" fill="none" {...cizgi} />
      <path d="M102 234q57 34 116-2l9 32q-67 31-132 0Z" fill="#f3f0dc" {...cizgi} />
    </svg>
  );
}

export const AVATAR_V2 = [
  { ad: "Momo", tur: "Panda", etiket: "Rahat stratejist", Bilesen: PandaAvatar },
  { ad: "Deniz", tur: "İnsan", etiket: "Meraklı oyuncu", Bilesen: InsanAvatar },
  { ad: "Riko", tur: "T-Rex", etiket: "Sempatik tehdit", Bilesen: TrexAvatar },
  { ad: "Tora", tur: "Kaplan", etiket: "Tatlı güç", Bilesen: KaplanAvatar },
];
