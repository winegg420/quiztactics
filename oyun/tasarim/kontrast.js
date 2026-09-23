// Quiz Tactics tasarım sistemi — KONTRAST DENETİMİ (WCAG 2.x).
// Çiftler tek kaynaktır: /tasarim-sistemi sayfası bunları canlı CSS değerleriyle
// hesaplar; OKU.md'deki tablo da bu listeden üretildi. Yeni renk çifti
// kullanan bileşen eklenirse buraya da ekle.
// [ad, yazı token'ı, zemin token'ı, büyük yazı mı (≥ 24 px ya da ≥ 19 px kalın)]
export const KONTRAST_CIFTLERI = [
  ["Sayfa yazısı / zemin", "--qt-zemin-metin", "--qt-zemin", false],
  ["Soluk yazı / zemin", "--qt-zemin-soluk", "--qt-zemin", false],
  ["Soluk yazı / zemin-2", "--qt-zemin-soluk", "--qt-zemin-2", false],
  ["Gövde / yüzey", "--qt-metin", "--qt-yuzey", false],
  ["Soluk / yüzey", "--qt-metin-soluk", "--qt-yuzey", false],
  ["Soluk / yüzey-2", "--qt-metin-soluk", "--qt-yuzey-2", false],
  ["Soluk / yüzey-3 (devre dışı)", "--qt-metin-soluk", "--qt-yuzey-3", false],
  ["Birincil düğme", "--qt-vurgu-yazi", "--qt-vurgu", false],
  ["Mor düğme / seçili", "--qt-ikinci-yazi", "--qt-ikinci", false],
  ["Mor yazı / yüzey", "--qt-ikinci-koyu", "--qt-yuzey", false],
  ["Mor yazı / mor açık", "--qt-ikinci-koyu", "--qt-ikinci-acik", false],
  ["Doğru şık", "--qt-dogru-yazi", "--qt-dogru", false],
  ["Yeşil yazı / yüzey", "--qt-dogru-koyu", "--qt-yuzey", false],
  ["Yeşil yazı / yeşil açık", "--qt-dogru-koyu", "--qt-dogru-acik", false],
  ["Yanlış şık / tehlike düğmesi", "--qt-yanlis-yazi", "--qt-yanlis", false],
  ["Kırmızı yazı / yüzey", "--qt-yanlis-koyu", "--qt-yuzey", false],
  ["Kırmızı yazı / kırmızı açık", "--qt-yanlis-koyu", "--qt-yanlis-acik", false],
  ["Uyarı", "--qt-uyari-yazi", "--qt-uyari", false],
  ["Uyarı yazısı / uyarı açık", "--qt-uyari-koyu", "--qt-uyari-acik", false],
  ["Bilgi", "--qt-bilgi-yazi", "--qt-bilgi", false],
  ["Bilgi yazısı / bilgi açık", "--qt-bilgi-koyu", "--qt-bilgi-acik", false],
  ["Coin hapı", "--qt-coin-yazi", "--qt-coin", false],
  ["Coin yazısı / coin açık", "--qt-coin-yazi", "--qt-coin-acik", false],
  ["Gövde / vurgu açık", "--qt-metin", "--qt-vurgu-acik", false],
  ["Mod: Klasik", "--qt-mod-yazi", "--qt-mod-klasik", false],
  ["Mod: Düello", "--qt-mod-yazi", "--qt-mod-duello", false],
  ["Mod: Turnuva", "--qt-mod-yazi", "--qt-mod-turnuva", false],
  ["Mod: Grup", "--qt-mod-yazi", "--qt-mod-grup", false],
  ["Mod: Saf Bilgi", "--qt-mod-yazi", "--qt-mod-saf", false],
  ["Lig: Bronz", "--qt-lig-yazi", "--qt-lig-bronz", false],
  ["Lig: Gümüş", "--qt-lig-yazi", "--qt-lig-gumus", false],
  ["Lig: Altın", "--qt-lig-yazi", "--qt-lig-altin", false],
  ["Lig: Elmas", "--qt-lig-yazi", "--qt-lig-elmas", false],
  ["Lig: Efsane", "--qt-lig-yazi", "--qt-lig-efsane", false],
  ["Maç yazısı / maç zemini", "--qt-mac-metin", "--qt-mac-zemin", false],
  ["Maç soluk / maç zemini", "--qt-mac-soluk", "--qt-mac-zemin", false],
  ["Maç soluk / maç zemini 2", "--qt-mac-soluk", "--qt-mac-zemin-2", false],
];

function kanal(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function parlaklik(hex) {
  const h = hex.trim().replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
}
/** İki #rrggbb renk arasındaki WCAG kontrast oranı. */
export function kontrastOrani(a, b) {
  const [l1, l2] = [parlaklik(a), parlaklik(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
