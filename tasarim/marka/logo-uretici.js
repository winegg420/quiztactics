// Marka logosu üreticisi (Ida onaylı, 30 Eyl 2026): logo-q.svg, logo-yatay.svg, uygulama-simgesi.svg üretir.
// Çalıştır: node logo-uretici.js (bu klasörde). Renkler: zemin #3D8CE8, halka beyaz, ok #FFB020, kontur #1f2a44.
const fs=require('fs');
const N='#1f2a44',OR='#FFB020';
const f=v=>v.toFixed(1);
const LT={T:'M3 6H27M15 6V38',A:'M3 38L15 6L27 38M8 26H22',C:'M27 14Q23 6 15 6Q3 6 3 22Q3 38 15 38Q23 38 27 30',I:'M15 6V38',S:'M26 13Q23 6 15 6Q5 6 5 14Q5 21 15 22.5Q26 24 26 31Q26 38 15 38Q7 38 4 31',U:'M5 6V27Q5 38 15 38Q26 38 26 27V6',Z:'M5 6H26L5 38H26'};
function word(s,x,y,sc,fill){
  let o='';const w=9;
  const adv=c=>c==='I'?23:35, off=c=>c==='I'?-4:0;
  let cur=x;const pos=[];
  for(const c of s){pos.push(cur+off(c)*sc);cur+=adv(c)*sc;}
  for(let i=0;i<s.length;i++){const tx=`translate(${f(pos[i])} ${f(y)}) scale(${sc})`;o+=`<path d="${LT[s[i]]}" transform="${tx}" fill="none" stroke="${N}" stroke-width="${w+8}" stroke-linecap="round" stroke-linejoin="round"/>`;}
  for(let i=0;i<s.length;i++){const tx=`translate(${f(pos[i])} ${f(y)}) scale(${sc})`;o+=`<path d="${LT[s[i]]}" transform="${tx}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;}
  return o;
}
function mark(){
  const d='M72 72V100H94';
  let s=`<circle cx="50" cy="50" r="34" fill="none" stroke="${N}" stroke-width="32"/><circle cx="50" cy="50" r="34" fill="none" stroke="#fff" stroke-width="22"/>`;
  s+=`<path d="${d}" fill="none" stroke="${N}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`;
  s+=`<polygon points="114,100 94,86 94,114" fill="${OR}" stroke="${N}" stroke-width="5" stroke-linejoin="round"/>`;
  s+=`<path d="${d}" fill="none" stroke="${OR}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>`;
  return s;
}
const X='xmlns="http://www.w3.org/2000/svg"';
fs.writeFileSync('logo-q.svg',`<svg ${X} viewBox="-6 -6 132 132" width="528" height="528">${mark()}</svg>`);
fs.writeFileSync('logo-yatay.svg',`<svg ${X} viewBox="0 0 345 84" width="1035" height="252"><g transform="translate(0 2) scale(.66)">${mark()}</g>${word('UIZ',90,8,.5,'#fff')}${word('TACTICS',96,32,1.06,OR)}</svg>`);
fs.writeFileSync('uygulama-simgesi.svg',`<svg ${X} viewBox="0 0 1024 1024" width="1024" height="1024"><rect width="1024" height="1024" fill="#3D8CE8"/><circle cx="250" cy="90" r="600" fill="#fff" opacity=".12"/><g transform="translate(512 512) scale(4.6) translate(-57 -57)">${mark()}</g></svg>`);
