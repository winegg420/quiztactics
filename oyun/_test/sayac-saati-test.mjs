// Sayaç saati birim testi (16 Eki 2026, Hazine kök neden) — lib/sunucuSaati.js › sayacSimdiMs / sayacSaatiHizala.
// Ağ yok, tarayıcı yok: performance.now ve Date.now elle sürülür.
// Denetimler: (1) daha iyi saat örneği gelince sayaç sıçramaz, 0,9–1,1 hızla kayar, hiç geri gitmez · (2) 1,5 sn üstü sapma
// bir kerede uygulanır ve akış izlemesine bildirilir · (3) faz başında hizalama anında · (4) telefonun saati (Date.now)
// ileri/geri atlasa da sayaç saati etkilenmez · (5) 60 sn'lik pencereden en iyi örnek düşünce de sıçrama yok.
import test from "node:test";
import assert from "node:assert/strict";
import { saatOrnegiEkle, sayacSimdiMs, sayacSaatiHizala, saatSapmaDinle, _saatOrnekleriniSifirla, _sayacSaatiniSifirla } from "../lib/sunucuSaati.js";

let mono = 0;          // performance.now (ms)
let duvarKayma = 0;    // Date.now − gerçek zaman (telefonun saat hatası)
const KOK = 1_760_000_000_000;
const gercek = () => KOK + mono;
performance.now = () => mono;
Object.defineProperty(performance, "timeOrigin", { value: KOK, configurable: true });
Date.now = () => gercek() + duvarKayma;
let SUNUCU_ILERI = 3000;   // sunucu saati gerçekten 3 sn ileride (uyku testinde değişir)
const ornek = (gidis, donus) => {   // gidiş/dönüş yolu ayrı süreler (asimetrik ağ)
  const gonder = Date.now(); mono += gidis; const sz = gercek() + SUNUCU_ILERI; mono += donus;
  saatOrnegiEkle(gonder, Date.now(), sz);
};
const sifirla = () => { _saatOrnekleriniSifirla(); _sayacSaatiniSifirla(); mono = 0; duvarKayma = 0; };
const ilerle = (ms, adim = 50) => { const l = []; for (let t = 0; t < ms; t += adim) { mono += adim; l.push([mono, sayacSimdiMs()]); } return l; };
const hizlar = (l) => l.slice(1).map(([t, s], i) => (s - l[i][1]) / (t - l[i][0]));

test("daha iyi örnek: sıçrama yok, 0,9–1,1 hız, geri gitmez", () => {
  sifirla();
  ornek(100, 900);              // kötü örnek: yanıt yolu uzun → fark ~400 ms hatalı
  sayacSaatiHizala();
  const ilk = sayacSimdiMs() - (gercek() + SUNUCU_ILERI);
  assert.ok(Math.abs(ilk + 400) < 5, `ilk hata ${ilk}`);
  ornek(40, 40);                // iyi örnek: gerçek fark
  const l = ilerle(8000);
  const h = hizlar(l);
  assert.ok(Math.min(...h) >= 0.899 && Math.max(...h) <= 1.101, `hız ${Math.min(...h)}–${Math.max(...h)}`);
  const son = l.at(-1)[1] - (gercek() + SUNUCU_ILERI);
  assert.ok(Math.abs(son) < 5, `sonunda hata ${son}`);
});

test("büyük sapma (> 1,5 sn) bir kerede + izlemeye bildirilir", () => {
  sifirla();
  const bildirilen = [];
  saatSapmaDinle((ms) => bildirilen.push(ms));
  ornek(50, 50); sayacSaatiHizala(); sayacSimdiMs();
  mono += 200;
  // telefon uyudu: tekdüze saat 2,5 sn durdu → sunucuya göre fark 2,5 sn büyüdü
  SUNUCU_ILERI += 2500;
  ornek(20, 20);
  const once = sayacSimdiMs() - (gercek() + SUNUCU_ILERI);
  SUNUCU_ILERI -= 2500;
  saatSapmaDinle(null);
  assert.ok(Math.abs(once) < 5, `büyük sapma bir kerede uygulanmadı (${once})`);
  assert.ok(bildirilen.length === 1 && bildirilen[0] >= 2400, `sapma bildirimi ${JSON.stringify(bildirilen)}`);
});

test("faz başında hizalama anında", () => {
  sifirla();
  ornek(100, 1300); sayacSaatiHizala(); sayacSimdiMs();
  ornek(30, 30);
  mono += 100;
  sayacSaatiHizala();
  const hata = sayacSimdiMs() - (gercek() + SUNUCU_ILERI);
  assert.ok(Math.abs(hata) < 5, `hizalama sonrası hata ${hata}`);
});

test("telefonun saati değişse de sayaç saati aynı akar", () => {
  sifirla();
  ornek(40, 40); sayacSaatiHizala();
  const once = ilerle(2000);
  duvarKayma = 1800;            // telefon saati 1,8 sn ileri atladı (NTP düzeltmesi)
  const sonra = ilerle(2000);
  const h = hizlar([once.at(-1), ...sonra]);
  assert.ok(Math.max(...h) <= 1.101 && Math.min(...h) >= 0.899, `saat atlamasında hız ${Math.max(...h)}`);
  duvarKayma = -2500;           // geri atladı
  const geri = ilerle(1000);
  assert.ok(hizlar([sonra.at(-1), ...geri]).every((x) => x > 0.89), "geri atlamada sayaç geri gitti");
});

test("en iyi örnek 60 sn pencereden düşünce sıçrama yok", () => {
  sifirla();
  ornek(20, 20); sayacSaatiHizala();     // çok iyi örnek
  const l = [];
  for (let i = 0; i < 90; i++) { l.push(...ilerle(1000, 100)); ornek(60, 400); }   // sonrakiler asimetrik (~170 ms hatalı)
  const h = hizlar(l);
  assert.ok(Math.min(...h) >= 0.899 && Math.max(...h) <= 1.101, `hız ${Math.min(...h)}–${Math.max(...h)}`);
});

test("saat istek yoldayken atlarsa bozuk örnek alınmaz, sayaç sıçramaz", () => {
  sifirla();
  ornek(40, 40); sayacSaatiHizala();
  const once = ilerle(1000);
  // istek gönderildi, yoldayken telefon saati 1 sn geri atladı, yanıt geldi (gidiş-dönüş "kısa" görünür → en iyi örnek olurdu)
  const gonder = Date.now(); mono += 60; const sz = gercek() + SUNUCU_ILERI; mono += 60; duvarKayma = -1000;
  saatOrnegiEkle(gonder, Date.now(), sz);
  const sonra = ilerle(3000);
  ornek(40, 40);
  const son = ilerle(3000);
  const h = hizlar([once.at(-1), ...sonra, ...son]);
  assert.ok(Math.min(...h) >= 0.899 && Math.max(...h) <= 1.101, `hız ${Math.min(...h)}–${Math.max(...h)}`);
  assert.ok(Math.abs(son.at(-1)[1] - (gercek() + SUNUCU_ILERI)) < 50, "sayaç saati doğruya dönmedi");
});

test("saat atladıktan sonra gelen örneklerle de sıçrama yok", () => {
  sifirla();
  ornek(40, 40); sayacSaatiHizala();
  const l = [...ilerle(1000)];
  duvarKayma = -1000;
  for (let i = 0; i < 8; i++) { ornek(30 + i * 10, 200 + i * 50); l.push(...ilerle(500)); }
  duvarKayma = 500;
  for (let i = 0; i < 8; i++) { ornek(40, 600); l.push(...ilerle(500)); }
  const h = hizlar(l);
  assert.ok(Math.min(...h) >= 0.899 && Math.max(...h) <= 1.101, `hız ${Math.min(...h).toFixed(3)}–${Math.max(...h).toFixed(3)}`);
});
