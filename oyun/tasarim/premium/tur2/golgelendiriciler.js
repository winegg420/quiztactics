/**
 * TUR 2 FRAGMAN GÖLGELENDİRİCİLERİ (GLSL ES 1.0 / WebGL 1 — iOS dahil her yerde).
 *
 * Koordinat: p = SVG birimi (kutunun %1'i), merkez 0,0, y AŞAĞI; tuval −85…85 (kutunun %170'i).
 * Halka dış yarıçapı 50, avatar dairesi 43. Çıktı ön-çarpılmış (premultiplied) renk:
 *   ust()  — normal örtme (duman, alev gövdesi)
 *   isik() — ışık: alfa = en parlak kanal → koyu zeminde toplamsal (additive) parlama gibi görünür,
 *            açık zeminde renkli ışık olarak kalır.
 * Sanat dokusu (u_doku) çerçevenin SVG çiziminin kendisidir: maske (altın/buz/çatlak nerede) ve
 * yükseklik (parlaklıktan normal → yansıma) için okunur.
 * Ortak uniform: u_t (sn) · u_px (tuval px) · u_a (efekte özel) · u_n[10] (nokta: x, y, boyut, faz) · u_nSay.
 */
export const KOSE = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 v;
uniform float u_t;
uniform float u_px;
uniform sampler2D u_doku;
uniform float u_dokuVar;
uniform vec4 u_a;
uniform vec4 u_n[10];
uniform float u_nSay;
const float PI = 3.14159265;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float h11(float n){ return h21(vec2(n, n * 1.37 + .11)); }
float gn(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1., 0.)), f.x), mix(h21(i + vec2(0., 1.)), h21(i + vec2(1., 1.)), f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.; float a = .5;
  for (int i = 0; i < 4; i++) { s += a * gn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; }
  return s;
}
float fbm3(vec2 p){
  float s = 0.; float a = .5;
  for (int i = 0; i < 3; i++) { s += a * gn(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; }
  return s / .875;
}
vec4 ust(vec4 alt, vec3 c, float a){ a = clamp(a, 0., 1.); return vec4(clamp(c, 0., 1.) * a, a) + alt * (1. - a); }
vec4 isik(vec4 alt, vec3 c){
  c = clamp(c, 0., 1.);
  float a = max(c.r, max(c.g, c.b));
  return vec4(c, a) + alt * (1. - a);
}
vec3 kor(float x){
  x = clamp(x, 0., 1.);
  vec3 c = mix(vec3(.30, .02, .0), vec3(.93, .20, .02), smoothstep(0., .32, x));
  c = mix(c, vec3(1., .52, .06), smoothstep(.28, .58, x));
  c = mix(c, vec3(1., .84, .30), smoothstep(.55, .82, x));
  return mix(c, vec3(1., .98, .86), smoothstep(.82, 1., x));
}
vec2 P(){ return vec2(v.x, -v.y) * 85.; }
/* Tuval kenarına yaklaşınca her şey sıfıra iner (kesik kare kenarı görünmesin). */
float kenar(vec2 p){ return smoothstep(85., 74., max(abs(p.x), abs(p.y))) * smoothstep(118., 96., length(p)); }
vec4 D(vec2 p){ return texture2D(u_doku, (p + 85.) / 170.); }
float lum(vec4 c){ return dot(c.rgb, vec3(.3, .59, .11)) * c.a; }
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a; vec2 ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0., 1.); return length(pa - ba * h); }
/* Dört kollu yıldız parlaması (bloom + ışın). */
float yildiz(vec2 d, float r, float don){
  float c = cos(don); float s = sin(don);
  d = mat2(c, -s, s, c) * d;
  float l = length(d);
  float cekirdek = exp(-l / (r * .22));
  float isin = exp(-abs(d.y) / (r * .05)) * exp(-abs(d.x) / r) + exp(-abs(d.x) / (r * .05)) * exp(-abs(d.y) / r);
  return cekirdek + isin * .8 + exp(-l / (r * .9)) * .25;
}
/* Yükselen kıvılcım: i = sıra, yay = başlangıç açı aralığı (radyan, tepe 0), R = doğduğu yarıçap. */
vec2 kivilcimYer(float i, float t, float yay, float R, out float yas, out float boy){
  float hs = h11(i * 7.31);
  float per = 1.2 + hs * 1.5;
  float c = t / per + h11(i * 3.17);
  float dongu = floor(c);
  float ph = fract(c);
  float a = (h11(i * 1.71 + dongu * .37) * 2. - 1.) * yay;
  vec2 bas = vec2(sin(a), -cos(a)) * (R + hs * 4.);
  yas = 1. - ph;
  boy = .5 + hs * .6;
  return bas + vec2(sin(t * 2.7 + i) * 3. * ph + (hs - .5) * 12. * ph, -ph * (20. + hs * 26.));
}
`;

/* ------------------------------------------------------------------ Sönmeyen Alev */
const ALEV = `
void main(){
  vec2 p = P(); float r = length(p); vec2 n = p / max(r, .001);
  float t = u_t; float d = r - 50.; float yuk = -n.y;
  vec4 o = vec4(0.);
  // duman: tepede, alevlerin üstünde yükselen koyu is
  float dm = fbm3(vec2(p.x * .05 + sin(t * .3) * .4, p.y * .045 + t * .5));
  float dmB = smoothstep(-38., -64., p.y) * smoothstep(58., 18., abs(p.x)) * smoothstep(10., 22., d);
  o = ust(o, vec3(.14, .11, .12), dmB * smoothstep(.4, .78, dm) * .6);
  // ısı ışıması (hale) + avatarın kenarına düşen sıcak ışık
  float hale = exp(-max(d, 0.) / 15.) * smoothstep(-10., 0., d);
  float titre = .82 + .1 * sin(t * 5.3) + .08 * sin(t * 8.9 + 1.);
  o = isik(o, vec3(1., .36, .05) * hale * .42 * titre);
  o = isik(o, vec3(1., .45, .1) * smoothstep(36., 43., r) * step(r, 43.) * .16 * titre);
  // alev alanı: yukarı akan iki katlı gürültü + açısal alev dilleri; eşikle ayrık diller, beyaz sıcak kök
  vec2 q = p;
  q.x += sin(p.y * .35 + t * 7.) * .8 * smoothstep(0., 20., d);
  float ang = atan(p.x, -p.y);
  float boy = 10. + 23. * smoothstep(-.5, 1., yuk);
  float n1 = fbm(vec2(q.x * .07, q.y * .06 + t * 1.7));
  float n2 = fbm3(vec2(q.x * .16 + 4., q.y * .13 + t * 2.9));
  float dil = gn(vec2(ang * 9., t * 1.1)) * .6 + gn(vec2(ang * 17. + 3., t * 1.7)) * .4;
  float h = (d + 1.5) / boy;
  float alan = n1 * .55 + n2 * .3 + dil * .5;
  float I = clamp((alan * 1.45 - h * 1.15 - .12) * 1.7, 0., 1.);
  I *= smoothstep(-5., -1., d);
  o = ust(o, kor(I), smoothstep(.04, .3, I) * .96);
  o = isik(o, vec3(1., .8, .4) * smoothstep(.7, 1., I) * .5);
  // kök: halkanın dış kenarında yanan ince kor çizgisi
  o = isik(o, vec3(1., .5, .1) * exp(-abs(d - .6) / 1.4) * (.45 + .25 * gn(vec2(ang * 12., t * 2.))));
  // ısı dalgası: alevin üstünde saydam titreşen hava
  float isi = smoothstep(.55, .92, gn(vec2(p.x * .26 + sin(p.y * .2 + t * 3.) * 1.2, p.y * .12 + t * 3.)));
  isi *= smoothstep(16., 26., d) * smoothstep(52., 30., d) * smoothstep(-.3, .6, yuk);
  o = isik(o, vec3(1., .62, .32) * isi * .1);
  // halkadaki kor çatlakları (sanat dokusu: turuncu çizgiler) — nabız + yumuşak taşma
  if (u_dokuVar > .5) {
    vec4 c = D(p);
    float catlak = smoothstep(.55, .85, c.r) * smoothstep(.05, .25, c.r - c.b) * c.a;
    float b = 0.;
    for (int k = 0; k < 6; k++) {
      float a = float(k) * 1.0472;
      vec4 s = D(p + vec2(cos(a), sin(a)) * 2.6);
      b += smoothstep(.55, .85, s.r) * smoothstep(.05, .25, s.r - s.b) * s.a;
    }
    float nabiz = .55 + .45 * fbm3(vec2(atan(p.x, -p.y) * 3., t * 1.3));
    o = isik(o, vec3(1., .66, .2) * catlak * nabiz * .7 + vec3(1., .35, .04) * (b / 6.) * .5 * nabiz);
  }
  // kıvılcımlar (üst ve yanlardan yükselir, avatarın üstüne düşmez)
  for (int i = 0; i < 14; i++) {
    float yas; float bo;
    vec2 k = kivilcimYer(float(i), t, 1.9, 51., yas, bo);
    float dd = length(p - k);
    float g = (smoothstep(bo, 0., dd) * 1.5 + exp(-dd / (bo * 2.4)) * .4) * yas * smoothstep(44., 48., length(k));
    o = isik(o, vec3(1., .64, .2) * g);
  }
  gl_FragColor = o * kenar(p);
}`;

/* ------------------------------------------------------------------ Ejderha
   u_n[0] göz (x, y, yarıçap, görünür) · u_n[1] ikinci göz · u_n[2] ağız (x, y, yön x, yön y) · u_n[3] burun delği */
const EJDERHA = `
void main(){
  vec2 p = P(); float r = length(p); float t = u_t;
  vec4 o = vec4(0.);
  vec2 M = u_n[2].xy; vec2 Dr = normalize(u_n[2].zw); vec2 Nr = vec2(-Dr.y, Dr.x);
  float dongu = fract(t / 4.4);
  float nefes = smoothstep(0., .06, dongu) * (1. - smoothstep(.46, .6, dongu));
  // pullara vuran ışık + alevin başı/halkayı aydınlatması (sanat dokusu)
  if (u_dokuVar > .5) {
    vec4 c = D(p);
    float kirmizi = smoothstep(.12, .4, c.r - c.g) * c.a;
    float ang = atan(p.x, -p.y);
    float bant = pow(max(0., sin(ang * 1.5 - t * 1.1 + r * .03)), 16.);
    o = isik(o, vec3(1., .6, .45) * kirmizi * bant * .42);
    float yakin = exp(-length(p - (M + Dr * 6.)) / 20.) * nefes;
    o = isik(o, vec3(1., .5, .12) * yakin * c.a * .5);
  }
  // alev ışığının çevreye yayılan halesi
  o = isik(o, vec3(1., .38, .06) * exp(-length(p - (M + Dr * 16.)) / 16.) * .42 * nefes);
  // ağızdan alev jeti: akışa göre kıvrılan iki katlı gürültü, genişleyen koni, beyaz sıcak çekirdek
  vec2 q = p - M; float boy = dot(q, Dr); float yan = dot(q, Nr);
  float L = 50. * (.3 + .7 * nefes);
  if (boy > -3.) {
    float g = 2.2 + max(boy, 0.) * .5;
    float ak1 = fbm(vec2(boy * .12 - t * 8., yan * .16 + t * .6));
    float ak2 = fbm3(vec2(boy * .27 - t * 12., yan * .32 - 3.));
    float kenar = abs(yan + sin(boy * .18 - t * 9.) * boy * .06) + (ak1 - .5) * g * 1.4 + (ak2 - .5) * g * .7;
    float I = smoothstep(g, g * .1, kenar) * (1. - smoothstep(L * .62, L, boy + ak1 * 12.)) * smoothstep(-3., .5, boy);
    I *= (.18 + .82 * nefes) * (1.35 - boy / max(L, 1.) * .6);
    I = clamp(I, 0., 1.);
    o = ust(o, kor(I), smoothstep(.1, .42, I) * .96);
    o = isik(o, vec3(1., .9, .62) * smoothstep(.68, 1., I) * .6);
    // jetin ucundan kopan duman
    float dm = fbm3(vec2(boy * .08 - t * 2., yan * .1)) * smoothstep(L * .7, L * 1.05, boy) * smoothstep(L * 1.5, L * 1.05, boy);
    o = ust(o, vec3(.16, .12, .12), smoothstep(.45, .8, dm) * smoothstep(g * 1.4, 0., abs(yan)) * .45 * nefes);
  }
  // ağızdan saçılan kıvılcımlar
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    float per = .7 + h11(fi * 5.1) * .6;
    float c = t / per + h11(fi * 2.3);
    float ph = fract(c); float dg = floor(c);
    float aci = (h11(fi * 1.9 + dg * .71) - .5) * .9;
    vec2 yon = Dr * cos(aci) + Nr * sin(aci);
    vec2 k = M + yon * ph * (26. + h11(fi) * 18.) + vec2(0., -ph * ph * 10.);
    float dd = length(p - k);
    float bo = .45 + h11(fi * 9.) * .5;
    o = isik(o, vec3(1., .7, .25) * (smoothstep(bo, 0., dd) * 1.4 + exp(-dd / (bo * 2.5)) * .35) * (1. - ph) * nefes);
  }
  // burun deliğinden ince duman (nefes aralarında)
  vec2 B = u_n[3].xy;
  vec2 bq = p - B;
  float dmb = fbm3(vec2(bq.x * .18 + sin(bq.y * .2 + t) * .6, bq.y * .12 + t * 1.4));
  float dmbB = smoothstep(0., -3., bq.y) * smoothstep(-26., -6., bq.y) * smoothstep(3. + abs(bq.y) * .35, 0., abs(bq.x + bq.y * .25));
  o = ust(o, vec3(.55, .5, .52), smoothstep(.4, .75, dmb) * dmbB * .5 * (1. - nefes));
  // gözler: sıcak çekirdek, geniş parlama ve yatay ışık çizgisi
  for (int i = 0; i < 2; i++) {
    vec4 e = u_n[i];
    if (e.w > .5) {
      vec2 dq = p - e.xy; float dd = length(dq);
      float nb = .78 + .22 * sin(t * 3.1 + float(i) * 2.);
      o = isik(o, vec3(1., .78, .2) * (exp(-dd / (e.z * 1.1)) * 1.3 + exp(-dd / (e.z * 4.5)) * .5) * nb);
      o = isik(o, vec3(1., .85, .4) * exp(-abs(dq.y) / .3) * exp(-abs(dq.x) / (e.z * 4.)) * .7 * nb);
    }
  }
  // halkadan yükselen közler
  for (int i = 0; i < 6; i++) {
    float yas; float bo;
    vec2 k = kivilcimYer(float(i) + 30., t * .8, 2.4, 55., yas, bo);
    float dd = length(p - k);
    o = isik(o, vec3(1., .5, .15) * (smoothstep(bo, 0., dd) + exp(-dd / (bo * 2.2)) * .3) * yas * smoothstep(44., 50., length(k)));
  }
  gl_FragColor = o * kenar(p);
}`;

/* ------------------------------------------------------------------ Buz Kristali
   u_n[i] parıltı noktası (x, y, boyut, faz) */
const BUZ = `
void main(){
  vec2 p = P(); float r = length(p); float t = u_t;
  vec4 o = vec4(0.);
  float d = r - 50.;
  // soğuk hale
  o = isik(o, vec3(.3, .72, 1.) * exp(-max(d, 0.) / 12.) * smoothstep(-6., 0., d) * (.3 + .06 * sin(t * 1.7)));
  // soğuk buğu: halkanın dışında süzülen, alt yarıda yoğunlaşan sis
  vec2 q = p * .045 + vec2(t * .12, -t * .04);
  float m = fbm(q + vec2(fbm3(q * 1.7 + t * .1), 0.) * .9);
  float bolge = smoothstep(46., 56., r) * smoothstep(86., 62., r) * (.45 + .55 * smoothstep(-30., 40., p.y));
  o = ust(o, vec3(.86, .95, 1.), smoothstep(.42, .8, m) * bolge * .5);
  if (u_dokuVar > .5) {
    vec4 c = D(p);
    float buz = c.a * smoothstep(.15, .5, c.b - c.r * .55);
    // kırılan ışık: kristallerin içinden geçen tayf bandı (r, g, b ayrık → renk ayrışması)
    float x = dot(p, vec2(.8, -.6)) * .05 - t * 1.25;
    float bc = pow(max(0., sin(x)), 24.);
    vec3 band = vec3(bc) * .9 + vec3(pow(max(0., sin(x - .16)), 40.) * .35, 0., pow(max(0., sin(x + .16)), 40.) * .45);
    o = isik(o, band * buz * 1.1);
    // iç kostik ışığı
    float k = gn(p * .2 + vec2(t * .35, -t * .25)) + gn(p * .41 - vec2(t * .2, t * .3)) * .5;
    float kos = pow(1. - abs(fract(k * 1.4) * 2. - 1.), 8.);
    o = isik(o, vec3(.62, .92, 1.) * kos * buz * .38);
    // kenar parlaması
    float s = 1.3;
    float e = D(p + vec2(s, 0.)).a + D(p - vec2(s, 0.)).a + D(p + vec2(0., s)).a + D(p - vec2(0., s)).a;
    float kenar = clamp(c.a * 4. - e, 0., 1.) * smoothstep(.3, .6, c.b);
    o = isik(o, vec3(.75, .96, 1.) * kenar * (.55 + .45 * sin(t * 2. + p.x * .1 + p.y * .07)));
  }
  // uçlarda yanıp sönen yıldız parıltıları
  for (int i = 0; i < 10; i++) {
    if (float(i) < u_nSay) {
      vec4 n = u_n[i];
      float tw = pow(max(0., sin(t * 1.5 + n.w * 6.283)), 5.);
      o = isik(o, vec3(.85, .97, 1.) * yildiz(p - n.xy, n.z * (.6 + .4 * tw), .2 + t * .15) * tw * .9);
    }
  }
  // düşen buz tozu
  for (int i = 0; i < 10; i++) {
    float fi = float(i);
    float per = 3. + h11(fi * 4.1) * 3.;
    float c = t / per + h11(fi * 2.9);
    float ph = fract(c); float dg = floor(c);
    float xx = (h11(fi * 1.3 + dg * .7) * 2. - 1.) * 78.;
    vec2 k = vec2(xx + sin(t * 1.3 + fi) * 3., -80. + ph * 160.);
    if (length(k) < 47.) k.x += sign(k.x + .01) * 40.;
    float dd = length(p - k);
    float tw = .5 + .5 * sin(t * 6. + fi * 2.);
    o = isik(o, vec3(.8, .95, 1.) * (smoothstep(.6, 0., dd) + exp(-dd / 1.4) * .25) * tw * smoothstep(0., .1, ph) * smoothstep(1., .85, ph));
  }
  gl_FragColor = o * kenar(p);
}`;

/* ------------------------------------------------------------------ Şimşek (enerji)
   u_a.x elektrot sayısı · u_a.y ilk elektrotun açısı (radyan) · u_a.z elektrot yarıçapı */
const SIMSEK = `
float yildirimD(vec2 p, vec2 S, vec2 dir, float L, float tohum, float titre){
  vec2 nr = vec2(-dir.y, dir.x);
  float dm = 1e3; vec2 onc = S; vec2 dalB = S;
  for (int j = 1; j <= 9; j++) {
    float fj = float(j); float u = fj / 9.;
    float sap = (h11(tohum * 13.1 + fj * 7.7 + titre * .013) - .5) * L * .34 * (1. - (1. - u) * (1. - u));
    vec2 nk = S + dir * L * u + nr * sap;
    dm = min(dm, sdSeg(p, onc, nk));
    if (j == 3) dalB = nk;
    onc = nk;
  }
  float yan = h11(tohum * 3.3) > .5 ? 1. : -1.;
  vec2 dd = normalize(dir + nr * .95 * yan);
  onc = dalB;
  for (int j = 1; j <= 5; j++) {
    float fj = float(j);
    vec2 nk = dalB + dd * L * .5 * fj / 5. + vec2(-dd.y, dd.x) * (h11(tohum * 5.1 + fj * 3.3 + titre * .017) - .5) * L * .16;
    dm = min(dm, sdSeg(p, onc, nk) * 1.35);
    onc = nk;
  }
  return dm;
}
void main(){
  vec2 p = P(); float r = length(p); float t = u_t;
  vec4 o = vec4(0.);
  float aa = 170. / u_px;
  float ang = atan(p.x, -p.y);
  // halkanın oluğunda akan plazma: ince parlak iplikler + mor-camgöbeği parlama
  float d = r - 47.;
  float f1 = fbm(vec2(ang * 4. + t * 2.2, r * .2 - t * 4.2));
  float f2 = fbm3(vec2(ang * 7. - t * 3.1, r * .3 + t * 2.));
  float ip = .012 / (abs(f1 - .5) + .012) + .008 / (abs(f2 - .5) + .01) * .6;
  float bant = exp(-abs(d) / 3.2);
  o = isik(o, vec3(.35, .75, 1.) * ip * bant * .6 + vec3(.55, .3, 1.) * bant * .2 * (.75 + .25 * sin(t * 9.)));
  // halkanın dışındaki mavi hale
  o = isik(o, vec3(.25, .45, 1.) * exp(-max(r - 51., 0.) / 11.) * smoothstep(44., 51., r) * .22);
  // elektrotlar
  float ES = u_a.x; float E0 = u_a.y; float ER = u_a.z;
  for (int i = 0; i < 8; i++) {
    if (float(i) < ES) {
      float a = E0 + float(i) * 6.2832 / ES;
      vec2 e = vec2(sin(a), -cos(a)) * ER;
      float dd = length(p - e);
      float tit = .7 + .3 * step(.4, h11(floor(t * 18.) + float(i)));
      o = isik(o, (vec3(.7, .9, 1.) * exp(-dd / 1.5) * 1.3 + vec3(.35, .55, 1.) * exp(-dd / 6.) * .45) * tit);
    }
  }
  // dallı yıldırımlar: elektrotlardan dışarı çakar (4 yuva, farklı ritim)
  for (int k = 0; k < 4; k++) {
    float fk = float(k);
    float per = .78 + fk * .29;
    float c = t / per + fk * .31;
    float id = floor(c); float ph = fract(c);
    float omur = .3;
    if (ph < omur) {
      float e = floor(h11(id * 1.9 + fk * 7.) * ES);
      float a = E0 + e * 6.2832 / ES;
      vec2 S = vec2(sin(a), -cos(a)) * ER;
      float sapma = (h11(id * 2.7 + fk) - .5) * 1.1;
      vec2 dir = vec2(sin(a + sapma), -cos(a + sapma));
      float L = 22. + h11(id * 4.3 + fk) * 14.;
      float titre = floor(t * 26.);
      float dd = yildirimD(p, S, dir, L, id * 3. + fk, titre);
      float env = (1. - ph / omur) * (.55 + .45 * step(.3, h11(titre + fk * 11.)));
      float cek = smoothstep(.45 + aa, 0., dd);
      o = isik(o, (vec3(.5, .68, 1.) * (exp(-dd / 1.9) * 1.1 + exp(-dd / 8.) * .45) + vec3(1.) * cek) * env);
      // çakma anı: yıldırımın çevresi (avatar dahil) kısa, yumuşak aydınlanır
      float fl = smoothstep(.06, 0., ph);
      o = isik(o, vec3(.55, .72, 1.) * fl * exp(-length(p - (S + dir * L * .45)) / 34.) * .4);
    }
  }
  // ara sıra bütün çerçeveyi aydınlatan büyük şimşek
  float b = fract(t / 5.7);
  float fl2 = smoothstep(.035, 0., b) + smoothstep(.07, .05, b) * smoothstep(.04, .05, b) * .6;
  o = isik(o, vec3(.62, .78, 1.) * fl2 * smoothstep(92., 20., r) * .3);
  gl_FragColor = o * kenar(p);
}`;

/* ------------------------------------------------------------------ Altın (Kraliyet, Altın Lig)
   Sanat dokusundan yükseklik → normal; hareketli ışık kutusu + ufuk yansıması (ortam yansıması),
   halka boyunca dolaşan parlak yansıma, mücevher parıltıları, altın tozu.
   u_a.x hale gücü · u_a.y altın tozu (0/1) · u_n[i] mücevher/uç (x, y, boyut, faz) */
const ALTIN = `
void main(){
  vec2 p = P(); float r = length(p); float t = u_t;
  vec4 o = vec4(0.);
  vec4 c = D(p);
  float dokuVar = u_dokuVar;
  // altın hale: sanatın dışındaki boşlukta sıcak ışık
  float hale = exp(-max(r - 50., 0.) / 15.) * smoothstep(40., 50., r) * (1. - c.a * dokuVar);
  o = isik(o, vec3(1., .78, .22) * hale * u_a.x * (.82 + .18 * sin(t * 1.3)));
  if (dokuVar > .5) {
    float altin = c.a * smoothstep(.45, .75, c.r) * smoothstep(.18, .45, c.r - c.b) * smoothstep(.3, .55, c.g);
    float ex = 1.1;
    float hx = lum(D(p + vec2(ex, 0.))) - lum(D(p - vec2(ex, 0.)));
    float hy = lum(D(p + vec2(0., ex))) - lum(D(p - vec2(0., ex)));
    vec3 N = normalize(vec3(-hx * 3.2, -hy * 3.2, 1.));
    vec2 L1 = vec2(cos(t * .55), sin(t * .55)) * .75;
    float spec = pow(max(0., dot(N, normalize(vec3(L1, .5)))), 22.);
    float ufuk = smoothstep(.88, 1., sin((N.x * .8 + N.y * .6) * 6. + t * 1.3));
    float ang = atan(p.x, -p.y);
    float dolas = pow(max(0., cos(ang - t * .85)), 26.) + pow(max(0., cos(ang + 2.4 - t * .85)), 40.) * .6;
    // kaymalı çapraz ışık süpürmesi (taç ve süslerde)
    float sup = pow(max(0., sin(dot(p, vec2(.6, .8)) * .045 - t * 1.1)), 40.);
    o = isik(o, vec3(1., .97, .82) * altin * (spec * .95 + ufuk * .4 + dolas * .5 + sup * .8));
    o = isik(o, vec3(1., .86, .25) * altin * .07);
    // mücevherlerin iç ateşi (doygun kırmızı/mavi/yeşil alanlarda renk kayması)
    float mc = c.a * smoothstep(.35, .6, max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b))) * (1. - altin);
    float ates = pow(max(0., sin(dot(p, vec2(.7, -.7)) * .3 + t * 2.4)), 10.);
    o = isik(o, vec3(1.) * mc * ates * .55);
  }
  // mücevher ve uç parıltıları (renk ayrışmalı yıldız)
  for (int i = 0; i < 10; i++) {
    if (float(i) < u_nSay) {
      vec4 n = u_n[i];
      float tw = pow(max(0., sin(t * 1.25 + n.w * 6.283)), 6.);
      float y = yildiz(p - n.xy, n.z * (.55 + .45 * tw), .78 + sin(t * .4 + n.w) * .3);
      o = isik(o, vec3(1., .97, .85) * y * tw);
    }
  }
  // altın tozu: tepede yavaşça yükselen parlak zerreler
  if (u_a.y > .5) {
    for (int i = 0; i < 8; i++) {
      float yas; float bo;
      vec2 k = kivilcimYer(float(i) + 60., t * .45, 1.3, 50., yas, bo);
      float dd = length(p - k);
      float tw = .6 + .4 * sin(t * 5. + float(i));
      o = isik(o, vec3(1., .86, .4) * (smoothstep(bo * .8, 0., dd) * 1.2 + exp(-dd / (bo * 2.)) * .3) * yas * tw * smoothstep(44., 48., length(k)));
    }
  }
  gl_FragColor = o * kenar(p);
}`;

export const PARCALAR = { alev: ALEV, ejderha: EJDERHA, buz: BUZ, simsek: SIMSEK, altin: ALTIN };
