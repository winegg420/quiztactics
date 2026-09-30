// Coin amblemi referans üreticisi (Ida onaylı, 30 Eyl 2026): out/coin.svg ve out/coin-kucuk.svg.
// Canlı çizim oyun/components/ParaIkonlari.jsx › CoinIkon içindedir; bu dosya referanstır.
const fs=require('fs');
const N='#1f2a44',DK='#5C3A00',LT='#FFF3B0',DKS='#1f2a44';
const f=v=>v.toFixed(1);
const pt=(r,a)=>{const t=a*Math.PI/180;return [50+r*Math.cos(t),50+r*Math.sin(t)];};
function emblem(c,sw){
  return `<circle cx="45" cy="45" r="14.5" fill="none" stroke="${c}" stroke-width="${sw}"/>`+
  `<path d="M56 56V66H63" fill="none" stroke="${c}" stroke-width="${sw*0.62}" stroke-linecap="round" stroke-linejoin="round"/>`+
  `<polygon points="70,66 62.5,61.5 62.5,70.5" fill="${c}" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"/>`;
}
function coin(kucuk){
  const sc=kucuk?1.0:0.82, ow=kucuk?4.8:5;
  let s=`<circle cx="50" cy="55" r="42" fill="#C58F0E" stroke="${N}" stroke-width="${ow}"/><circle cx="50" cy="50" r="42" fill="#F5C542" stroke="${N}" stroke-width="${ow}"/>`;
  if(!kucuk)s+=`<circle cx="50" cy="50" r="32" fill="#FFD34D" stroke="#C58F0E" stroke-width="3.5"/>`;
  else s+=`<circle cx="50" cy="50" r="33" fill="#FFD34D"/>`;
  const a=pt(37,200),b=pt(37,248);
  s+=`<path d="M${f(a[0])} ${f(a[1])} A37 37 0 0 1 ${f(b[0])} ${f(b[1])}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".75"/>`;
  const sw=kucuk?11.5:9;
  s+=`<g transform="translate(50 50) scale(${sc}) translate(-48 -48)"><g transform="translate(-1.8 -1.8)">${emblem(LT,sw)}</g>${emblem(kucuk?DKS:DK,sw)}</g>`;
  return s;
}
const X='xmlns="http://www.w3.org/2000/svg"';
fs.mkdirSync('out',{recursive:true});
fs.writeFileSync('out/coin.svg',`<svg ${X} viewBox="0 0 100 100" width="512" height="512">${coin(false)}</svg>`);
fs.writeFileSync('out/coin-kucuk.svg',`<svg ${X} viewBox="0 0 100 100" width="512" height="512">${coin(true)}</svg>`);
