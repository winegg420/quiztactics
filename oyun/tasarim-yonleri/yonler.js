// Tasarım Yönleri — üç görsel yönün TEK veri kaynağı.
// Buradaki renkler hem sayfadaki palet sergisine hem de CSS değişkenlerine
// (`--ty-*`) aynı anda gider; sergi ile ekran asla ayrışmaz.
// Kontrast çiftleri `KONTRAST_CIFTLERI` altında durur ve sayfada WCAG oranıyla
// birlikte gösterilir (hesap: kontrast.js).

export const YONLER = [
  {
    kod: "a",
    ad: "Şeker Kutusu",
    etiket: "Yön A",
    ozet:
      "Parlak, yuvarlak, kabartmalı: her düğme elle bastırılan bir oyuncak gibi aşağı iner. " +
      "Neşeli ve affedici; ilk kez oynayan, kısa mola veren, her yaştan oyuncuya hitap eder. " +
      "Bugünkü Baloo 2 / Nunito ve kabartma dilinin en cesur, en renkli hâli.",
    yazi: { baslik: "Baloo 2", govde: "Nunito", not: "Yuvarlak, tıknaz başlık · yumuşak gövde · rakamlar eş genişlikli" },
    ikon: "Kalın (2,4 px) yuvarlak uçlu çizgi + yarı saydam dolgu; köşeler yumuşak.",
    dugme: "Hap şekli, 5 px alt dudak; basınca 5 px iner, dudak kaybolur (120 ms).",
    ses: [
      "Dokunuş: yumuşak, kısa bir 'pop' (tahta blok sesi).",
      "Doğru: yükselen iki nota + küçük zil pırıltısı.",
      "Yanlış: alçak, yuvarlak bir 'bonk' — azarlamaz, güldürür.",
      "Son 5 sn: tahta tik-tak, her saniye biraz daha tiz.",
      "50:50: iki cam kırılma 'tıngırtısı', ardından hafif düşüş sesi.",
    ],
    renk: {
      zemin: "#dff0ff", zemin2: "#c6e3ff", zeminYazi: "#1d2152", zeminSoluk: "#46507f",
      yuzey: "#ffffff", yuzey2: "#f1f6ff", murekkep: "#1d2152", soluk: "#4f5987", cizgi: "#c9d8f2",
      vurgu: "#ff7a2e", vurguYazi: "#1d2152", vurguDudak: "#c24a0c",
      ikinci: "#6a48f5", ikinciYazi: "#ffffff", ikinciDudak: "#4526c4",
      dogru: "#2fd27a", dogruYazi: "#0d2a1b", yanlis: "#ff5a6a", yanlisYazi: "#2a0710",
      altin: "#ffc933", altinYazi: "#3a2600",
      mod1: "#ff8a3d", mod1Dudak: "#c7560f", mod2: "#ff6f91", mod2Dudak: "#c93a5d",
      mod3: "#ffc933", mod3Dudak: "#c28b00", mod4: "#3fd58f", mod4Dudak: "#1f9a61", modYazi: "#1d2152",
      macZemin: "#3b2a93", macZemin2: "#2a1d74", macYazi: "#ffffff", macSoluk: "#d6ccff",
      sik: "#ffffff", sikYazi: "#1d2152", sikDudak: "#b3bde6", menu: "#ffffff",
    },
  },
  {
    kod: "b",
    ad: "Arena Gecesi",
    etiket: "Yön B",
    ozet:
      "Koyu zemin, keskin kesik köşeler, elektrik mavisi ve limon vurgular: bir e-spor sahnesi. " +
      "Hızlı, gergin, iddialı; sıralamayı kovalayan, rakibini yenmek isteyen rekabetçi oyuncuya hitap eder. " +
      "Sayılar ve sayaç ekranın kahramanıdır.",
    yazi: { baslik: "Barlow Condensed", govde: "Barlow", not: "Dar, büyük harfli başlık · teknik gövde · tabular rakam" },
    ikon: "İnce (2 px) keskin köşeli çizgi, düz uçlar; dolgu yok, vurgu rengiyle parlar.",
    dugme: "Kesik köşeli (chamfer) panel, 1 px ışık kenarı; basınca %97'ye çöker ve içten parlar (110 ms).",
    ses: [
      "Dokunuş: kuru, dijital 'tik' (klavye anahtarı).",
      "Doğru: kısa synth 'şarj' sesi, yükselen tını.",
      "Yanlış: düşük frekanslı dijital 'glitch' vuruşu.",
      "Son 5 sn: nabız gibi bas vuruşu, son 3 saniyede ikiye katlanır.",
      "Skill: her skill'e özel elektrik 'zap' imzası.",
    ],
    renk: {
      zemin: "#070b16", zemin2: "#0d1428", zeminYazi: "#eef3ff", zeminSoluk: "#98a8cc",
      yuzey: "#111a31", yuzey2: "#18233f", murekkep: "#eef3ff", soluk: "#98a8cc", cizgi: "#2a3a63",
      vurgu: "#19e0ff", vurguYazi: "#03141c", vurguDudak: "#0a8ea6",
      ikinci: "#c8ff3d", ikinciYazi: "#172100", ikinciDudak: "#7fa81c",
      dogru: "#2bf59a", dogruYazi: "#03200f", yanlis: "#ff3b6b", yanlisYazi: "#1c0209",
      altin: "#ffd23f", altinYazi: "#2a1f00",
      mod1: "#19e0ff", mod1Dudak: "#0a8ea6", mod2: "#ff3b6b", mod2Dudak: "#a8173d",
      mod3: "#ffd23f", mod3Dudak: "#a78412", mod4: "#c8ff3d", mod4Dudak: "#7fa81c", modYazi: "#03141c",
      macZemin: "#05080f", macZemin2: "#0b1122", macYazi: "#eef3ff", macSoluk: "#98a8cc",
      sik: "#111a31", sikYazi: "#eef3ff", sikDudak: "#2a3a63", menu: "#0b1122",
    },
  },
  {
    kod: "c",
    ad: "Stüdyo Işıkları",
    etiket: "Yön C",
    ozet:
      "Bordo perde, sıcak spot ışığı, altın çerçeve ve ampul dizileri: akşam kuşağının büyük yarışma programı. " +
      "Prestijli ve heyecanlı; bilgisiyle övünen, turnuvada sahneye çıkmak isteyen yetişkin oyuncuya hitap eder. " +
      "Kazanmak bir tören gibi hissettirir.",
    yazi: { baslik: "Fraunces", govde: "Manrope", not: "Karakterli serif başlık · temiz gövde · sayılar serif ve iri" },
    ikon: "Orta (2,2 px) yuvarlak çizgi, altın ton; ödül ikonları çift çizgili.",
    dugme: "Krem panel, altın çift çerçeve; basınca içe gömülür, gölge içe döner (140 ms).",
    ses: [
      "Dokunuş: yumuşak ahşap 'tok' ve hafif stüdyo yankısı.",
      "Doğru: pirinç üflemeli kısa fanfar + seyirci 'ooh'u.",
      "Yanlış: alçak, kadife bir gong; seyirci iç çeker.",
      "Son 5 sn: saat tik-takı + gerilim davulu (trampet ruloları).",
      "Kazanma: ampul dizileri yanarken tam fanfar ve alkış.",
    ],
    renk: {
      zemin: "#2b0a17", zemin2: "#4a1229", zeminYazi: "#fff4df", zeminSoluk: "#e2c3b0",
      yuzey: "#fff4df", yuzey2: "#f8e6c4", murekkep: "#2a0e18", soluk: "#6b4550", cizgi: "#e0c48f",
      vurgu: "#f2b53a", vurguYazi: "#2a0e18", vurguDudak: "#8f5f0c",
      ikinci: "#c9344c", ikinciYazi: "#ffffff", ikinciDudak: "#7d1627",
      dogru: "#3fbf7f", dogruYazi: "#08231a", yanlis: "#e0485f", yanlisYazi: "#210208",
      altin: "#f5c451", altinYazi: "#2a0e18",
      mod1: "#f0a23b", mod1Dudak: "#8f5f0c", mod2: "#e65c70", mod2Dudak: "#861a2d",
      mod3: "#f5c451", mod3Dudak: "#8f6a0c", mod4: "#3fb5a0", mod4Dudak: "#1d6d60", modYazi: "#2a0e18",
      macZemin: "#1e0610", macZemin2: "#3d0e22", macYazi: "#fff4df", macSoluk: "#e2c3b0",
      sik: "#fff4df", sikYazi: "#2a0e18", sikDudak: "#b58a4a", menu: "#fff4df",
    },
  },
];

// Sergide gösterilecek renkler (anahtar → görünen ad).
export const SERGI = [
  ["zemin", "Zemin"], ["yuzey", "Yüzey"], ["murekkep", "Mürekkep"], ["soluk", "Soluk yazı"],
  ["vurgu", "Vurgu"], ["ikinci", "İkinci vurgu"], ["dogru", "Doğru"], ["yanlis", "Yanlış"],
  ["altin", "Altın / ödül"], ["macZemin", "Maç zemini"],
];

// Kontrol edilen yazı/zemin çiftleri: [ad, yazı anahtarı, zemin anahtarı, büyük yazı mı].
export const KONTRAST_CIFTLERI = [
  ["Gövde yazısı / yüzey", "murekkep", "yuzey", false],
  ["Soluk yazı / yüzey", "soluk", "yuzey", false],
  ["Sayfa yazısı / zemin", "zeminYazi", "zemin", false],
  ["Soluk yazı / zemin", "zeminSoluk", "zemin", false],
  ["Vurgu düğmesi yazısı", "vurguYazi", "vurgu", false],
  ["İkinci vurgu yazısı", "ikinciYazi", "ikinci", false],
  ["Doğru şık yazısı", "dogruYazi", "dogru", false],
  ["Yanlış şık yazısı", "yanlisYazi", "yanlis", false],
  ["Altın rozet yazısı", "altinYazi", "altin", false],
  ["Şık yazısı", "sikYazi", "sik", false],
  ["Maç yazısı / maç zemini", "macYazi", "macZemin", false],
  ["Maç soluk yazı / maç zemini", "macSoluk", "macZemin", false],
  ["Maç soluk yazı / maç zemini 2", "macSoluk", "macZemin2", false],
  ["Mod kartı yazısı / Klasik", "modYazi", "mod1", false],
  ["Mod kartı yazısı / Düello", "modYazi", "mod2", false],
  ["Mod kartı yazısı / Turnuva", "modYazi", "mod3", false],
  ["Mod kartı yazısı / Grup", "modYazi", "mod4", false],
];

// Renk nesnesini CSS değişkenlerine çevirir: vurguYazi → --ty-vurgu-yazi
export function cssDegiskenleri(renk) {
  const cikti = {};
  for (const [k, v] of Object.entries(renk)) {
    cikti["--ty-" + k.replace(/[A-Z]/g, (h) => "-" + h.toLowerCase())] = v;
  }
  return cikti;
}
