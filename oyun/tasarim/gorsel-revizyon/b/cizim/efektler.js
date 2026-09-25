// Ajan B gölgelendiricileri — tur2 motorunun (premium/tur2/motor.js) TEK paylaşılan WebGL bağlamında çalışır.
// Oyundaki dosyalar DEĞİŞMEZ: motor programı efekt adıyla PARCALAR'dan tembel okur; burada yalnız çalışma
// anında yeni adlar eklenir (grLig). KOSE (ortak yardımcılar: P, D, lum, isik, ust, fbm, yildiz, kivilcimYer, kenar)
// motor tarafından başa eklenir. Yumuşak mod (u_yumusak) motordan gelir: zaman 0,4 hızda, parçacık yarı, flaş yok.
//
// u_a = (hale gücü, toz 0/1, kip, renk sırası)
//   kip 0 metal yansıması · 1 kristal (tayf kırılması) · 2 alev (efsane; siluetin ARKASINDA yanar) · 3 ışın (dönen hüzme)
//   renk 0 bronz · 1 gümüş · 2 altın · 3 elmas · 4 efsane · 5 turnuva · 6 level-kızıl · 7 level-mor
// u_n[i] = parıltı noktası (x, y, boyut, faz)
import { PARCALAR } from "../../../premium/tur2/golgelendiriciler.js";

const GR_LIG = `
vec3 renkAl(float i){
  if (i < .5) return vec3(1., .66, .38);
  if (i < 1.5) return vec3(.86, .93, 1.);
  if (i < 2.5) return vec3(1., .86, .3);
  if (i < 3.5) return vec3(.55, .95, 1.);
  if (i < 4.5) return vec3(1., .5, .86);
  if (i < 5.5) return vec3(1., .84, .34);
  if (i < 6.5) return vec3(1., .55, .22);
  return vec3(.75, .55, 1.);
}
vec3 tayf(float h){ return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
void main(){
  vec2 p = P(); float r = length(p); float t = u_t;
  vec4 o = vec4(0.);
  vec4 c = D(p);
  float sanat = c.a * u_dokuVar;
  vec3 R = renkAl(u_a.w);
  float kip = u_a.z;
  // hale: siluetin dışındaki boşlukta yumuşak ışık
  float hale = exp(-max(r - 50., 0.) / 14.) * smoothstep(40., 52., r) * (1. - sanat);
  o = isik(o, R * hale * u_a.x * (.8 + .2 * sin(t * 1.3)));
  // ışın (kip 3): arkada yavaş dönen hüzmeler
  if (kip > 2.5) {
    float ang = atan(p.x, -p.y);
    float isin = pow(max(0., cos(ang * 6. + t * .45)), 5.) * smoothstep(50., 58., r) * smoothstep(84., 60., r);
    o = isik(o, R * isin * .42 * (1. - sanat));
  }
  // alev (kip 2): yukarı akan gürültü alevi, halkanın dışında, siluetin arkasında
  if (kip > 1.5 && kip < 2.5) {
    vec2 q = vec2(p.x * .12, p.y * .045 + t * 1.5);
    float n = fbm(q) * .65 + fbm(q * 2.3 + 7.) * .35;
    float d = r - 48.;
    float ust_ = smoothstep(35., -50., p.y);
    float L = (6. + 28. * ust_) * (.25 + 1.5 * n);
    float isi = clamp(1. - d / L, 0., 1.) * step(0., d);
    vec3 fc = mix(vec3(.42, .16, .82), vec3(1., .45, .78), smoothstep(.15, .5, isi));
    fc = mix(fc, vec3(1., .95, 1.), smoothstep(.62, .92, isi));
    o = ust(o, fc, smoothstep(.04, .2, isi) * (1. - sanat * .92) * .95);
    o = isik(o, vec3(.9, .4, 1.) * smoothstep(.0, .3, isi) * .18 * (1. - sanat));
  }
  if (u_dokuVar > .5) {
    float parlak = dot(c.rgb, vec3(.3, .59, .11));
    float metal = c.a * smoothstep(.36, .62, parlak);
    float ex = 1.1;
    float hx = lum(D(p + vec2(ex, 0.))) - lum(D(p - vec2(ex, 0.)));
    float hy = lum(D(p + vec2(0., ex))) - lum(D(p - vec2(0., ex)));
    vec3 N = normalize(vec3(-hx * 3.2, -hy * 3.2, 1.));
    vec2 L1 = vec2(cos(t * .5), sin(t * .5)) * .75;
    float spec = pow(max(0., dot(N, normalize(vec3(L1, .5)))), 22.);
    float ang = atan(p.x, -p.y);
    float dolas = pow(max(0., cos(ang - t * .8)), 28.);
    float sup = pow(max(0., sin(dot(p, vec2(.6, .8)) * .045 - t * 1.05)), 40.);
    vec3 S = mix(vec3(1.), R, .35);
    o = isik(o, S * metal * (spec * .8 + dolas * .45 + sup * .75));
    if (kip > .5 && kip < 1.5) {
      // kristal: yüzeylerde kayan tayf ışığı
      float h = fract(dot(p, vec2(.021, .013)) - t * .12);
      float band = pow(max(0., sin(dot(p, vec2(.05, -.03)) * 3. + t * 1.4)), 10.);
      o = isik(o, tayf(h) * metal * band * .5);
    }
  }
  for (int i = 0; i < 10; i++) {
    if (float(i) < u_nSay) {
      vec4 n = u_n[i];
      float tw = pow(max(0., sin(t * 1.2 + n.w * 6.283)), 6.);
      float y = yildiz(p - n.xy, n.z * (.55 + .45 * tw), .78 + sin(t * .4 + n.w) * .3);
      o = isik(o, mix(vec3(1.), R, .25) * y * tw);
    }
  }
  if (u_a.y > .5) {
    for (int i = 0; i < 8; i++) {
      if (u_yumusak > .5 && mod(float(i), 2.) > .5) continue;
      float yas; float bo;
      vec2 k = kivilcimYer(float(i) + 30., t * .45, 1.4, 50., yas, bo);
      float dd = length(p - k);
      float tw = .6 + .4 * sin(t * 5. + float(i));
      o = isik(o, mix(R, vec3(1.), .3) * (smoothstep(bo * .8, 0., dd) * 1.2 + exp(-dd / (bo * 2.)) * .3) * yas * tw * smoothstep(44., 48., length(k)));
    }
  }
  gl_FragColor = o * kenar(p);
}`;

let kuruldu = false;
/** Motor yüklenmeden önce bir kez çağrılır (motor programı ilk kullanımda derler). */
export function efektleriKaydet() {
  if (kuruldu) return;
  kuruldu = true;
  if (!PARCALAR.grLig) PARCALAR.grLig = GR_LIG;
}
