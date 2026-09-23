// WCAG 2.x göreli parlaklık ve kontrast oranı (sRGB).
function kanal(c) {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
function parlaklik(hex) {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * kanal(r) + 0.7152 * kanal(g) + 0.0722 * kanal(b);
}
export function kontrastOrani(a, b) {
  const [l1, l2] = [parlaklik(a), parlaklik(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
