const fs=require('fs');
const N='#1f2a44';
const TI={elmas:{n:'elmas'},bronz:{n:'bronz',b:'#C27A3E',d:'#8A4F1F',l:'#E8A96C'},gumus:{n:'gumus',b:'#CBD3DF',d:'#8E9AAE',l:'#F4F7FB'},altin:{n:'altin',b:'#F5C542',d:'#C58F0E',l:'#FFE58A'},efsane:{n:'efsane',b:'#E8552F',d:'#A63216',l:'#FF9A78'}};
const BL={b:'#B5E0F4',d:'#5AA5CF',l:'#F4FAFE'},MID={b:'#4DBDEB',d:'#1E7DB0',l:'#C4F1FF'},PL={b:'#9FD8F2',d:'#3F93C4',l:'#F2FAFF'};
const P=(r,a)=>{const t=a*Math.PI/180;return [r*Math.cos(t),r*Math.sin(t)];};
const f=v=>v.toFixed(1);
function band(t,ticks){
  let s=`<circle r="74" fill="${N}"/><circle r="71" fill="${t.b}"/>`;
  const a=P(71,20),b=P(71,200),c=P(59,200),d=P(59,20);
  s+=`<path d="M${f(a[0])} ${f(a[1])} A71 71 0 0 1 ${f(b[0])} ${f(b[1])} L${f(c[0])} ${f(c[1])} A59 59 0 0 0 ${f(d[0])} ${f(d[1])} Z" fill="${t.d}"/>`;
  const h1=P(65,208),h2=P(65,252);
  s+=`<path d="M${f(h1[0])} ${f(h1[1])} A65 65 0 0 1 ${f(h2[0])} ${f(h2[1])}" fill="none" stroke="${t.l}" stroke-width="5" stroke-linecap="round"/>`;
  if(ticks)[15,45,135,165,195,225,315,345].forEach(an=>{const p=P(65,an);s+=`<rect x="-1.8" y="-4.5" width="3.6" height="9" rx="1.8" fill="${N}" opacity=".45" transform="translate(${f(p[0])} ${f(p[1])}) rotate(${an+90})"/>`;});
  return s+`<circle r="60" fill="none" stroke="${N}" stroke-width="3"/>`;
}
function band12(t){
  let s=`<circle r="80" fill="${N}"/>`;const n=12,st=360/n;
  for(let i=0;i<n;i++){const a1=i*st-90,a2=a1+st,m=(a1+a2)/2*Math.PI/180,v=Math.sin(m)+Math.cos(m);
    const fill=v>0.6?t.d:(v>-0.4?t.b:t.l);
    const p1=P(77,a1),p2=P(77,a2),p3=P(60,a2),p4=P(60,a1);
    s+=`<path d="M${f(p1[0])} ${f(p1[1])} A77 77 0 0 1 ${f(p2[0])} ${f(p2[1])} L${f(p3[0])} ${f(p3[1])} A60 60 0 0 0 ${f(p4[0])} ${f(p4[1])} Z" fill="${fill}" stroke="${N}" stroke-width="2" stroke-linejoin="round"/>`;}
  return s+`<circle r="60" fill="none" stroke="${N}" stroke-width="3.2"/><circle r="63" fill="none" stroke="#fff" stroke-width="1.5" opacity=".85"/>`;
}
function star(x,y,r,fill){let p='';for(let i=0;i<12;i++){const rr=i%2?r*.5:r,t=Math.PI/6*i-Math.PI/2;p+=f(x+rr*Math.cos(t))+','+f(y+rr*Math.sin(t))+' ';}return `<polygon points="${p}" fill="${fill}" stroke="${N}" stroke-width="2.5" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="${f(r*.22)}" fill="${N}"/>`;}
function plate(t,tails){
  let s='';
  if(tails)s+=`<polygon points="-22,74 -42,72 -35,83 -42,94 -22,90" fill="${t.d}" stroke="${N}" stroke-width="3" stroke-linejoin="round"/><polygon points="22,74 42,72 35,83 42,94 22,90" fill="${t.d}" stroke="${N}" stroke-width="3" stroke-linejoin="round"/>`;
  s+=`<rect x="-24" y="72" width="48" height="22" rx="7" fill="${t.b}" stroke="${N}" stroke-width="3.5"/><path d="M-24 83 H24 V87 Q24 94 17 94 H-17 Q-24 94 -24 87Z" fill="${t.d}"/><rect x="-24" y="72" width="48" height="22" rx="7" fill="none" stroke="${N}" stroke-width="3.5"/>`;
  return s+star(0,83,10,t.l);
}
function crown(t,sc){
  let s=`<g transform="translate(0 -70) scale(${sc}) translate(0 70)">`;
  s+=`<polygon points="-22,-68 -22,-84 -11,-76 0,-91 11,-76 22,-84 22,-68" fill="${t.l}" stroke="${N}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s+=`<polygon points="0,-68 0,-91 11,-76 22,-84 22,-68" fill="${t.b}"/><polygon points="-22,-68 -22,-84 -11,-76 0,-91 11,-76 22,-84 22,-68" fill="none" stroke="${N}" stroke-width="3.5" stroke-linejoin="round"/>`;
  s+=`<rect x="-23" y="-73" width="46" height="9" rx="3" fill="${t.b}" stroke="${N}" stroke-width="3"/>`;
  s+=`<circle cx="-11" cy="-68.5" r="2.6" fill="#4C8DF0" stroke="${N}" stroke-width="1.5"/><circle cx="0" cy="-68.5" r="3" fill="#E24B4A" stroke="${N}" stroke-width="1.5"/><circle cx="11" cy="-68.5" r="2.6" fill="#4C8DF0" stroke="${N}" stroke-width="1.5"/>`;
  [[-22,-86],[0,-93],[22,-86]].forEach(p=>{s+=`<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#fff" stroke="${N}" stroke-width="2"/>`;});
  return s+'</g>';
}
function leaf(L,W,t){return `<path d="M0 0 Q${W} ${-L*.45} 0 ${-L} Q${-W} ${-L*.45} 0 0Z" fill="${t.b}" stroke="${N}" stroke-width="2.6" stroke-linejoin="round"/><path d="M0 0 Q${W} ${-L*.45} 0 ${-L}Z" fill="${t.d}"/><path d="M0 0 Q${W} ${-L*.45} 0 ${-L} Q${-W} ${-L*.45} 0 0Z" fill="none" stroke="${N}" stroke-width="2.6" stroke-linejoin="round"/><line x1="0" y1="-3" x2="0" y2="${-L*.8}" stroke="${N}" stroke-width="1.4" opacity=".5"/>`;}
function laurel(t){let half='';[[6,24,9],[24,23,9],[42,21,8],[60,19,8],[78,16,7]].forEach(o=>{const p=P(76,o[0]);half+=`<g transform="translate(${f(p[0])} ${f(p[1])}) rotate(${o[0]})">${leaf(o[1],o[2],t)}</g>`;});return `<g>${half}</g><g transform="scale(-1 1)">${half}</g>`;}
function feather(L,W,c){return `<path d="M0 ${-W} Q${L*.72} ${-W} ${L} 0 Q${L*.72} ${W} 0 ${W} Z" fill="${c.b}" stroke="${N}" stroke-width="3" stroke-linejoin="round"/><path d="M0 0 L${L} 0 Q${L*.72} ${W} 0 ${W} Z" fill="${c.d}"/><path d="M0 ${-W} Q${L*.72} ${-W} ${L} 0 Q${L*.72} ${W} 0 ${W} Z" fill="none" stroke="${N}" stroke-width="3" stroke-linejoin="round"/>`;}
function wings(){const c=TI.altin;let half='';[[38,44,10],[14,54,11],[-10,58,11],[-34,50,10]].forEach(o=>{half+=`<g transform="translate(66 -10) rotate(${o[0]})">${feather(o[1],o[2],c)}</g>`;});return `<g>${half}</g><g transform="scale(-1 1)">${half}</g>`;}
function shield(t){return `<polygon points="-17,-93 17,-93 17,-70 0,-56 -17,-70" fill="${t.l}" stroke="${N}" stroke-width="4" stroke-linejoin="round"/><polygon points="0,-93 17,-93 17,-70 0,-56" fill="${t.b}"/><polygon points="-17,-93 17,-93 17,-70 0,-56 -17,-70" fill="none" stroke="${N}" stroke-width="4" stroke-linejoin="round"/><polyline points="-9,-83 0,-89 9,-83" fill="none" stroke="${N}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><polyline points="-9,-73 0,-79 9,-73" fill="none" stroke="${N}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;}
function hex(x,y,r,t){let p='';for(let a=0;a<6;a++){const q=Math.PI/3*a;p+=f(x+r*Math.cos(q))+','+f(y+r*Math.sin(q))+' ';}return `<polygon points="${p}" fill="${t.b}" stroke="${N}" stroke-width="3.5" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="${f(r*.35)}" fill="${t.d}"/>`;}
function sideplates(t){const one=`<polygon points="66,-14 90,-9 90,9 66,14" fill="${t.l}" stroke="${N}" stroke-width="3.5" stroke-linejoin="round"/><polygon points="66,0 90,-9 90,9 66,14" fill="${t.b}"/><polygon points="66,-14 90,-9 90,9 66,14" fill="none" stroke="${N}" stroke-width="3.5" stroke-linejoin="round"/>`;return one+`<g transform="scale(-1 1)">${one}</g>`;}
function gem(cx,cy,s,t,sw=3.6,sw2=1.8){
  const GL=[-s,0],GR=[s,0],TL=[-.55*s,-.62*s],TR=[.55*s,-.62*s],B=[0,s],ML=[-.4*s,0],MR=[.4*s,0];
  const pts=a=>a.map(p=>f(cx+p[0])+','+f(cy+p[1])).join(' ');
  let o=`<polygon points="${pts([GL,GR,B])}" fill="${t.b}"/><polygon points="${pts([GL,ML,B])}" fill="${t.l}"/><polygon points="${pts([MR,GR,B])}" fill="${t.d}"/>`;
  o+=`<polygon points="${pts([GL,TL,ML])}" fill="${t.b}"/><polygon points="${pts([TL,TR,MR,ML])}" fill="${t.l}"/><polygon points="${pts([TR,GR,MR])}" fill="${t.d}"/>`;
  o+=`<polyline points="${pts([TL,ML,B,MR,TR])}" fill="none" stroke="${N}" stroke-width="${sw2}" stroke-linejoin="round"/><polygon points="${pts([GL,TL,TR,GR,B])}" fill="none" stroke="${N}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  return o;
}
function parts(k){
  const t=TI[k];let s='';
  if(k==='efsane')s+=wings();
  if(k==='altin')s+=laurel(t);
  if(k==='gumus')s+=sideplates(t);
  if(k==='elmas'){
    s+=band12(BL);
    [142,180,218,322,0,38].forEach(an=>{const p=P(68.5,an);s+=gem(p[0],p[1]-1.7,9.2,MID,2.6,1.3);});
    s+=gem(0,-90,26,MID)+plate(PL,true);
    return s;
  }
  s+=band(t,k!=='bronz');
  if(k==='bronz'){
    [22.5,67.5,112.5,157.5,202.5,247.5,292.5,337.5].forEach(a=>{const p=P(65.5,a);s+=`<circle cx="${f(p[0])}" cy="${f(p[1])}" r="3.8" fill="${t.l}" stroke="${N}" stroke-width="2"/>`;});
    s+=`<rect x="-15" y="-88" width="30" height="19" rx="6" fill="${t.b}" stroke="${N}" stroke-width="3.5"/><path d="M-15 -78 H15 V-75 Q15 -69 9 -69 H-9 Q-15 -69 -15 -75Z" fill="${t.d}"/><rect x="-15" y="-88" width="30" height="19" rx="6" fill="none" stroke="${N}" stroke-width="3.5"/><polyline points="-7,-77 0,-84 7,-77" fill="none" stroke="${N}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>`;
    s+=plate(t,false);
  }
  if(k==='gumus')s+=shield(t)+plate(t,false);
  if(k==='altin')s+=hex(0,-77,19,t)+star(0,-77,12,t.l)+plate(t,true);
  if(k==='efsane')s+=crown(TI.altin,1.35)+plate(TI.altin,true);
  return s;
}
function svg(k){
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="-140 -140 280 280" width="560" height="560">`;
  s+=`<defs><clipPath id="delik"><path clip-rule="evenodd" fill-rule="evenodd" d="M-140 -140 H140 V140 H-140 Z M56 0 A56 56 0 1 0 -56 0 A56 56 0 1 0 56 0 Z"/></clipPath></defs>`;
  s+=`<g clip-path="url(#delik)">${parts(k)}</g>`;
  s+=`<circle r="56" fill="none" stroke="${N}" stroke-width="3.5"/>`;
  return s+'</svg>';
}
fs.mkdirSync('out',{recursive:true});
['bronz','gumus','altin','elmas','efsane'].forEach(k=>fs.writeFileSync(`out/cerceve-${k}.svg`,svg(k)));
