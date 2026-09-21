const YAZI = '"Baloo 2", "Nunito", system-ui, sans-serif';

export const LOGO_KONSEPTLERI = [
  { no: "01", ad: "Orbit Q", aciklama: "Tek hamle çizgisinden oluşan güçlü Q; tek başına uygulama ikonu olarak da hatırlanır." },
  { no: "02", ad: "Tactics Block", aciklama: "Quiz sakin kalırken Tactics, turuncu bir oyun bloğu içinde marka vaadini üstlenir." },
  { no: "03", ad: "QT Merge", aciklama: "Q ve T aynı geometrik işarette birleşir; keşfedildikçe anlam kazanan kompakt bir monogramdır." },
  { no: "04", ad: "Next Move", aciklama: "Basamaklı rota ve ileri hamle çizgisi, tipografinin içine strateji duygusu taşır." },
  { no: "05", ad: "Play Pulse", aciklama: "Yumuşak köşeler ve ritmik renk noktalarıyla yetişkin ama enerjik bir oyun markasıdır." },
  { no: "06", ad: "Q Check", aciklama: "Soru ve doğru hamleyi tek minimal sembolde toplar; en küçük mobil ölçekte bile nettir." },
  { no: "07", ad: "Gold Standard", aciklama: "İnce altın çizgiler ve geniş harf aralığıyla daha seçkin, premium bir marka yönüdür." },
  { no: "08", ad: "Edge Tactics", aciklama: "Keskin T işareti ve ileri bakan açılarıyla rekabetçi, kontrollü bir enerji verir." },
  { no: "09", ad: "Signal Split", aciklama: "Cyan ve mor karşıtlığı Tactics kelimesini sahneye çıkarır; dijital ve yüksek görünürlüklüdür." },
  { no: "10", ad: "Curious Route", aciklama: "Soru işareti, konuşma balonu ve hamle rotası ikinci bakışta tek bir Q içinde birleşir." },
];

function Metin({ x, y, children, fill, size = 44, weight = 800, spacing = 0, anchor = "start", style }) {
  return <text x={x} y={y} fill={fill} fontFamily={YAZI} fontSize={size} fontWeight={weight}
    letterSpacing={spacing} textAnchor={anchor} style={style}>{children}</text>;
}

function Logo01({ ikon, koyu }) {
  const ink = koyu ? "#f7f9ff" : "#17213c";
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 520 150"} aria-label="Orbit Q logo konsepti" role="img">
    <g transform={ikon ? "translate(10 10)" : "translate(18 25)"}>
      <circle cx="50" cy="50" r="39" fill="none" stroke={ink} strokeWidth="15" />
      <path d="M54 55 89 91" stroke="#ff6b2c" strokeWidth="15" strokeLinecap="round" />
      <circle cx="50" cy="50" r="7" fill="#ffca45" />
    </g>
    {!ikon && <><Metin x="132" y="80" fill={ink} size="49">QUIZ</Metin><Metin x="264" y="80" fill="#ff6b2c" size="49">TACTICS</Metin><path d="M134 99h311" stroke={koyu ? "#526384" : "#dbe4f3"} strokeWidth="5" strokeLinecap="round" /><circle cx="444" cy="99" r="6" fill="#ffca45" /></>}
  </svg>;
}

function Logo02({ ikon, koyu }) {
  const ink = koyu ? "#ffffff" : "#17213c";
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 520 150"} aria-label="Tactics Block logo konsepti" role="img">
    {ikon ? <><rect x="14" y="14" width="92" height="92" rx="25" fill="#172549" /><Metin x="60" y="67" fill="#fff" size="46" anchor="middle">Q</Metin><rect x="57" y="69" width="36" height="13" rx="6.5" fill="#ff6b2c" transform="rotate(-11 57 69)" /></> : <>
      <Metin x="25" y="70" fill={koyu ? "#aebbd4" : "#71809f"} size="43" weight="700" spacing="2">QUIZ</Metin>
      <g transform="translate(153 28) rotate(-2 170 44)"><rect width="338" height="80" rx="18" fill="#ff6b2c" /><Metin x="169" y="57" fill="#fff" size="48" anchor="middle">TACTICS</Metin><path d="m309 80-25 18 5-18" fill="#e95114" /></g>
      <Metin x="29" y="119" fill={ink} size="14" weight="900" spacing="3">PLAY THE QUESTION</Metin>
    </>}
  </svg>;
}

function Logo03({ ikon, koyu }) {
  const ink = koyu ? "#eef5ff" : "#17213c";
  const Mark = <g transform={ikon ? "translate(10 10)" : "translate(22 25)"}>
    <path d="M50 1 96 27v52L50 105 4 79V27Z" fill="#172549" stroke="#3de1e7" strokeWidth="5" />
    <path d="M29 34q0-16 20-16t20 16v30q0 16-20 16T29 64Z" fill="none" stroke="#fff" strokeWidth="10" />
    <path d="m52 60 24 24M57 31h31M73 31v46" fill="none" stroke="#ffca45" strokeWidth="9" strokeLinecap="round" />
  </g>;
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 520 150"} aria-label="QT Merge logo konsepti" role="img">{Mark}{!ikon && <><Metin x="148" y="73" fill={ink} size="46">QUIZ TACTICS</Metin><Metin x="151" y="103" fill="#3b91e8" size="14" weight="900" spacing="4">THINK · MOVE · WIN</Metin></>}</svg>;
}

function Logo04({ ikon, koyu }) {
  const ink = koyu ? "#fff" : "#17213c";
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 520 150"} aria-label="Next Move logo konsepti" role="img">
    {ikon ? <><path d="M20 90V67h24V44h24V21h30" fill="none" stroke="#7c55ec" strokeWidth="13" strokeLinejoin="round" /><path d="m84 10 18 11-18 11" fill="none" stroke="#ffca45" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" /><circle cx="20" cy="90" r="9" fill="#3de1e7" /></> : <>
      <path d="M25 109V88h26V67h26V46h32" fill="none" stroke="#7c55ec" strokeWidth="10" strokeLinejoin="round" /><path d="m96 34 19 12-19 12" fill="none" stroke="#ffca45" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="25" cy="109" r="7" fill="#3de1e7" />
      <Metin x="138" y="74" fill={ink} size="47" spacing="-1">QUIZ</Metin><Metin x="267" y="74" fill="#7c55ec" size="47" style={{ fontStyle: "italic" }}>TACTICS</Metin><Metin x="141" y="106" fill={koyu ? "#9daaca" : "#71809f"} size="14" weight="900" spacing="4">YOUR NEXT MOVE?</Metin>
    </>}
  </svg>;
}

function Logo05({ ikon, koyu }) {
  const ink = koyu ? "#fff" : "#17213c";
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 520 150"} aria-label="Play Pulse logo konsepti" role="img">
    {ikon ? <><rect x="11" y="17" width="98" height="86" rx="31" fill="#7c55ec" /><path d="M37 61q0-23 23-23t23 23-23 23-23-23Z" fill="none" stroke="#fff" strokeWidth="10" /><path d="m65 68 20 18" stroke="#ffca45" strokeWidth="10" strokeLinecap="round" /><circle cx="94" cy="35" r="8" fill="#3de1e7" /></> : <>
      <g transform="translate(20 27)"><rect width="102" height="91" rx="31" fill="#7c55ec" /><path d="M25 45q0-24 25-24t25 24-25 24-25-24Z" fill="none" stroke="#fff" strokeWidth="10" /><path d="m55 53 22 20" stroke="#ffca45" strokeWidth="10" strokeLinecap="round" /><circle cx="86" cy="19" r="8" fill="#3de1e7" /></g>
      <Metin x="145" y="74" fill={ink} size="50">Quiz</Metin><Metin x="257" y="74" fill="#7c55ec" size="50">Tactics</Metin><circle cx="157" cy="105" r="6" fill="#3de1e7" /><circle cx="178" cy="105" r="6" fill="#ffca45" /><path d="M195 105h239" stroke={koyu ? "#526384" : "#dbe4f3"} strokeWidth="6" strokeLinecap="round" />
    </>}
  </svg>;
}

function Logo06({ ikon, koyu }) {
  const ink = koyu ? "#fff" : "#17213c";
  const Mark = <g transform={ikon ? "translate(8 8)" : "translate(24 26)"}><rect width="104" height="104" rx="26" fill={ink} /><path d="M29 48q0-24 24-24t24 24-24 24-24-24Z" fill="none" stroke={koyu ? "#17213c" : "#fff"} strokeWidth="10" /><path d="m55 65 17 18 28-37" fill="none" stroke="#20b874" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" /></g>;
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 520 150"} aria-label="Q Check logo konsepti" role="img">{Mark}{!ikon && <><Metin x="157" y="78" fill={ink} size="51">QUIZ</Metin><Metin x="291" y="78" fill="#20b874" size="51">TACTICS</Metin><Metin x="160" y="108" fill={koyu ? "#9daaca" : "#71809f"} size="13" weight="900" spacing="3">ANSWER WITH A PLAN</Metin></>}</svg>;
}

function Logo07({ ikon, koyu }) {
  const ink = koyu ? "#fffaf0" : "#17213c";
  const gold = "#d9a72e";
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 520 150"} aria-label="Gold Standard logo konsepti" role="img">
    {ikon ? <><path d="M60 9 106 60 60 111 14 60Z" fill="none" stroke={gold} strokeWidth="6" /><Metin x="60" y="72" fill={ink} size="40" anchor="middle" spacing="-5">QT</Metin><circle cx="60" cy="15" r="4" fill="#ffca45" /></> : <>
      <path d="M70 19 119 75 70 131 21 75Z" fill="none" stroke={gold} strokeWidth="5" /><Metin x="70" y="87" fill={ink} size="39" anchor="middle" spacing="-5">QT</Metin><circle cx="70" cy="26" r="4" fill="#ffca45" />
      <Metin x="148" y="69" fill={ink} size="39" weight="700" spacing="5">QUIZ</Metin><Metin x="148" y="106" fill={gold} size="31" weight="800" spacing="8">TACTICS</Metin><path d="M433 28v83" stroke={gold} strokeWidth="2" /><circle cx="433" cy="121" r="4" fill={gold} />
    </>}
  </svg>;
}

function Logo08({ ikon, koyu }) {
  const ink = koyu ? "#fff" : "#17213c";
  const Mark = <g transform={ikon ? "translate(8 12)" : "translate(19 27)"}><path d="M8 5h88L78 30H59L36 92H9l23-62H0Z" fill="#172549" /><path d="m64 31 36-26-17 43-19 13Z" fill="#ff6b2c" /><path d="M42 39 25 84" stroke="#3de1e7" strokeWidth="8" /></g>;
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 520 150"} aria-label="Edge Tactics logo konsepti" role="img">{Mark}{!ikon && <><Metin x="143" y="70" fill={ink} size="44" style={{ fontStyle: "italic" }}>QUIZ</Metin><Metin x="265" y="70" fill="#ff6b2c" size="44" style={{ fontStyle: "italic" }}>TACTICS</Metin><path d="M146 94h281l-18 16H146Z" fill={koyu ? "#3de1e7" : "#172549"} /><path d="M434 94h43l-18 16h-43Z" fill="#ff6b2c" /></>}
  </svg>;
}

function Logo09({ ikon, koyu }) {
  const ink = koyu ? "#fff" : "#17213c";
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 520 150"} aria-label="Signal Split logo konsepti" role="img">
    {ikon ? <><path d="M15 60a45 45 0 0 1 45-45v90A45 45 0 0 1 15 60Z" fill="#3de1e7" /><path d="M60 15a45 45 0 1 1 0 90Z" fill="#7c55ec" /><path d="M35 60q0-25 25-25t25 25-25 25-25-25Z" fill="none" stroke="#172549" strokeWidth="10" /><path d="m65 67 24 21" stroke="#ffca45" strokeWidth="10" strokeLinecap="round" /></> : <>
      <g transform="translate(20 28)"><path d="M0 47A47 47 0 0 1 47 0v94A47 47 0 0 1 0 47Z" fill="#3de1e7" /><path d="M47 0a47 47 0 1 1 0 94Z" fill="#7c55ec" /><path d="M20 47q0-27 27-27t27 27-27 27-27-27Z" fill="none" stroke="#172549" strokeWidth="10" /><path d="m52 55 24 21" stroke="#ffca45" strokeWidth="10" strokeLinecap="round" /></g>
      <Metin x="142" y="81" fill={ink} size="49">QUIZ</Metin><rect x="273" y="37" width="220" height="59" rx="17" fill="#7c55ec" /><Metin x="383" y="79" fill="#fff" size="42" anchor="middle">TACTICS</Metin>
    </>}
  </svg>;
}

function Logo10({ ikon, koyu }) {
  const ink = koyu ? "#fff" : "#17213c";
  const Mark = <g transform={ikon ? "translate(8 8)" : "translate(20 25)"}><path d="M17 9h71a16 16 0 0 1 16 16v54A16 16 0 0 1 88 95H57l-23 17 5-17H17A16 16 0 0 1 1 79V25A16 16 0 0 1 17 9Z" fill="#172549" /><path d="M31 48q0-24 25-24 24 0 24 19 0 12-13 17-11 4-11 14" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" /><circle cx="56" cy="84" r="6" fill="#ffca45" /><path d="M79 75h14V61" fill="none" stroke="#3de1e7" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" /><circle cx="93" cy="51" r="5" fill="#ff6b2c" /></g>;
  return <svg viewBox={ikon ? "0 0 120 120" : "0 0 520 150"} aria-label="Curious Route logo konsepti" role="img">{Mark}{!ikon && <><Metin x="151" y="72" fill={ink} size="47">QUIZ</Metin><Metin x="282" y="72" fill="#3b91e8" size="47">TACTICS</Metin><path d="M154 101h76l18-14 18 14h91l17-14 18 14h65" fill="none" stroke="#ff6b2c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="248" cy="87" r="6" fill="#ffca45" /><circle cx="374" cy="87" r="6" fill="#3de1e7" /></>}
  </svg>;
}

const LOGOLAR = [Logo01, Logo02, Logo03, Logo04, Logo05, Logo06, Logo07, Logo08, Logo09, Logo10];

export default function LogoExploration({ tip, ikon = false, koyu = false }) {
  const Logo = LOGOLAR[tip - 1] ?? Logo01;
  return <Logo ikon={ikon} koyu={koyu} />;
}
