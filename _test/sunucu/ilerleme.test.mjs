// Paket 2 · Şerit A — İlerleme ve ödül: coin (yeni test değerleri) + XP + level + rütbe.
//
// NE KORUYOR:
//   1. Klasik galibiyet/beraberlik/mağlubiyet coin + XP (sayılar oyun_ayarlari'ndan okunur).
//   2. Serbest ve Saf Bilgi: coin %50 (indirimler çarpılmaz), XP TAM.
//   3. Düello galibiyet/mağlubiyet coin + XP; hemen terk eden (hamlesiz) kaybedene XP yok.
//   4. Aynı çift koruması XP'ye de uygulanır (6. maç %50, 11. maç 0).
//   5. Level atlama: her level coin, her 5 levelde envantere 1 skill hakkı, rütbe atlamada coin;
//      tek seferde çok level atlanırsa her birinin ödülü; ödül günlük coin tavanına takılmaz.
//   6. Aynı maç iki kez XP/ödül yazmaz.
//   7. Turnuva katılım + ilk 3 XP'si; açık bot XP indirimi; bot XP almaz; bot level'i türetilir.
//   8. level_kazancim okuması.
// Migration'lar (277–279) canlıda yoksa testler kendiliğinden atlanır; prova:
//   node oyun/_test/ilerleme-db-calistir.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { islem, oyuncuKur as kur, olarak, sunucuOlarak, baglantiVarMi, alintila as a } from './yardim.mjs';

const sec = { skip: !(await baglantiVarMi()) ? 'veritabanı bağlantısı yok' : false };

// Günlük seri bonusu sayılara karışmasın (odul-dagitimi.test.mjs ile aynı yöntem)
const oyuncuKur = (c, ad, ek = {}) =>
  kur(c, ad, { seri_bonus_tarihi: "sql:(now() at time zone 'Europe/Istanbul')::date", ...ek });

async function hazirMi(c, t) {
  const var_ = await c.tek(`select to_regprocedure('public.xp_ver(uuid,integer,text,jsonb)') is not null`);
  if (var_ !== 't') { t.skip('277–279 uygulanmamış (prova: node oyun/_test/ilerleme-db-calistir.mjs)'); return false; }
  return true;
}

const sayi = async (c, sql) => Number(await c.tek(sql));
const ayar = (c, k, v) => sayi(c, `select public.ayar_ondalik(${a(k)}, ${v})`);
const xpToplam = (c, u) => sayi(c, `select xp from public.profiles where id = ${a(u)}`);
const macCoin = (c, u, ref) =>
  sayi(c, `select coalesce(sum(miktar),0) from public.coin_hareketleri where user_id = ${a(u)} and tur = 'mac' and referans = ${a(ref)}`);
const gerekenJs = (L, taban, kat, us) => Math.max(1, Math.round(taban + kat * Math.pow(Math.max(L, 1), us)));

/** Klasik maç kurar, cevap satırlarını yazar ve sonuçlandırır. */
async function klasik(c, o1, o2, { kazanan = null, dereceli = true, jokersiz = false, cevaplayan = [o1, o2] } = {}) {
  const mac = await c.tek(
    `insert into public.matches (oyuncu1, oyuncu2, durum, dereceli, jokersiz)
     values (${a(o1)}, ${a(o2)}, 'aktif', ${a(dereceli)}, ${a(jokersiz)}) returning id`);
  for (const u of cevaplayan) {
    await c.sorgu(`insert into public.match_answers (match_id, user_id, soru_index, cevap, dogru)
                   values (${a(mac)}, ${a(u)}, 0, 1, true)`);
  }
  const kaybeden = kazanan ? (kazanan === o1 ? o2 : o1) : null;
  await c.sorgu(`select public.mac_sonuclandir(${a(mac)}, ${kazanan ? a(kazanan) : 'null'}, ${kaybeden ? a(kaybeden) : 'null'})`);
  return mac;
}

test('Klasik: galibiyet / beraberlik / mağlubiyet coin + XP', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const [x, y] = [await oyuncuKur(c, 'kg1'), await oyuncuKur(c, 'kg2')];
    const [cG, cB] = [await ayar(c, 'coin_mac_galibiyet', 0), await ayar(c, 'coin_mac_beraberlik', 0)];
    const [xG, xB, xM] = [await ayar(c, 'xp_mac_galibiyet', 0), await ayar(c, 'xp_mac_beraberlik', 0), await ayar(c, 'xp_mac_maglubiyet', 0)];
    assert.deepEqual([cG, cB, xG, xB, xM], [30, 12, 30, 15, 10], 'test değerleri');

    const m1 = await klasik(c, x, y, { kazanan: x });
    assert.equal(await macCoin(c, x, m1), cG);
    assert.equal(await macCoin(c, y, m1), 0, 'mağlubiyette coin yok');
    assert.equal(await xpToplam(c, x), xG);
    assert.equal(await xpToplam(c, y), xM, 'kaybeden de az XP alır');

    const m2 = await klasik(c, x, y, { kazanan: null });
    assert.equal(await macCoin(c, x, m2), cB);
    assert.equal(await macCoin(c, y, m2), cB);
    assert.equal(await xpToplam(c, x), xG + xB);
    assert.equal(await xpToplam(c, y), xM + xB);
  });
});

test('Serbest ve Saf Bilgi: coin %50 (çarpılmaz), XP tam', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const cG = await ayar(c, 'coin_mac_galibiyet', 0);
    const cB = await ayar(c, 'coin_mac_beraberlik', 0);
    const xG = await ayar(c, 'xp_mac_galibiyet', 0);
    const durumlar = [
      { ad: 'serbest', dereceli: false, jokersiz: false },
      { ad: 'safbilgi', dereceli: true, jokersiz: true },
      { ad: 'ikisi', dereceli: false, jokersiz: true },
    ];
    for (const d of durumlar) {
      const [x, y] = [await oyuncuKur(c, d.ad + '1'), await oyuncuKur(c, d.ad + '2')];
      const m = await klasik(c, x, y, { kazanan: x, dereceli: d.dereceli, jokersiz: d.jokersiz });
      assert.equal(await macCoin(c, x, m), Math.floor(cG * 0.5), `${d.ad}: galibiyet coin %50 (15)`);
      assert.equal(await xpToplam(c, x), xG, `${d.ad}: XP tam`);
      const b = await klasik(c, x, y, { kazanan: null, dereceli: d.dereceli, jokersiz: d.jokersiz });
      assert.equal(await macCoin(c, y, b), Math.floor(cB * 0.5), `${d.ad}: beraberlik coin %50 (6)`);
    }
  });
});

test('Klasik: hiç cevabı olmayan kaybedene XP yok', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const [x, y] = [await oyuncuKur(c, 'oy1'), await oyuncuKur(c, 'oy2')];
    await klasik(c, x, y, { kazanan: x, cevaplayan: [x] });
    assert.equal(await xpToplam(c, y), 0);
    assert.equal(await xpToplam(c, x), await ayar(c, 'xp_mac_galibiyet', 0));
  });
});

test('Düello: galibiyet / mağlubiyet coin + XP; hamlesiz kaybedene XP yok', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const [x, y] = [await oyuncuKur(c, 'dg1'), await oyuncuKur(c, 'dg2')];
    const cG = await ayar(c, 'coin_duello_galibiyet', 0);
    const [xG, xM] = [await ayar(c, 'xp_duello_galibiyet', 0), await ayar(c, 'xp_duello_maglubiyet', 0)];
    assert.deepEqual([cG, xG, xM], [45, 45, 15]);

    const id = await c.tek(`select public.duello_olustur(${a(x)}, ${a(y)}, true, null)`);
    await c.sorgu(`insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, dogru)
                   values (${a(id)}, 1, ${a(x)}, ${a(y)}, 'tarih', false)`);
    await sunucuOlarak(c);
    await c.sorgu(`select public.duello_bitir(${a(id)}, ${a(x)})`);
    const ref = 'duello:' + id;
    assert.equal(await macCoin(c, x, ref), cG);
    assert.equal(await macCoin(c, y, ref), 0);
    assert.equal(await xpToplam(c, x), xG);
    assert.equal(await xpToplam(c, y), xM);

    // Hemen terk: hamle yok → kaybeden XP almaz
    const [p, q] = [await oyuncuKur(c, 'dt1'), await oyuncuKur(c, 'dt2')];
    const id2 = await c.tek(`select public.duello_olustur(${a(p)}, ${a(q)}, false, null)`);
    await c.sorgu(`select public.duello_bitir(${a(id2)}, ${a(p)})`);
    assert.equal(await xpToplam(c, q), 0);
    assert.equal(await xpToplam(c, p), xG, 'serbest düelloda da XP tam');
    assert.equal(await macCoin(c, p, 'duello:' + id2), Math.floor(cG * 0.5), 'serbest düello coin %50');
  });
});

test('aynı çift koruması XP’ye de uygulanır (6. maç %50, 11. maç 0)', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const [x, y] = [await oyuncuKur(c, 'cx1'), await oyuncuKur(c, 'cx2')];
    const tam = await ayar(c, 'mac_cift_tam_sinir', 5);
    const yari = await ayar(c, 'mac_cift_yari_sinir', 10);
    const xG = await ayar(c, 'xp_mac_galibiyet', 0);
    const kazanc = [];
    for (let i = 1; i <= yari + 1; i++) {
      const m = await klasik(c, x, y, { kazanan: x });
      kazanc.push(await sayi(c, `select xp from public.xp_hareketleri where user_id = ${a(x)} and kaynak = ${a('mac:' + m)}`));
    }
    assert.equal(kazanc[0], xG);
    assert.equal(kazanc[tam - 1], xG);
    assert.equal(kazanc[tam], Math.floor(xG * 0.5));
    assert.equal(kazanc[yari], 0);
  });
});

test('level atlama: coin, 5. levelde skill hakkı, rütbe coini; ödül tavana takılmaz', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const u = await oyuncuKur(c, 'lv');
    const gerek4 = await sayi(c, `select public.level_gereken_xp(4)`);
    const levelCoin = await ayar(c, 'level_odul_coin', 0);
    const rutbeCoin = await ayar(c, 'rutbe_odul_coin', 0);
    assert.deepEqual([levelCoin, rutbeCoin], [20, 100]);
    // Günlük coin tavanını doldur: level ödülü yine de gelmeli
    await c.sorgu(`insert into public.coin_hareketleri (user_id, miktar, tur, referans, bakiye_sonra)
                   values (${a(u)}, 400, 'reklam', 'tavan-testi', 0)`);
    await c.sorgu(`update public.profiles set level = 4, level_xp = ${gerek4 - 1} where id = ${a(u)}`);
    const skillOnce = await sayi(c, `select coalesce(sum(adet),0) from public.joker_envanter where user_id = ${a(u)}`);
    const coinOnce = await sayi(c, `select coin from public.profiles where id = ${a(u)}`);
    await c.sorgu(`select public.xp_ver(${a(u)}, 5, 'mac:00000000-0000-4000-8000-00000000a001', '{}'::jsonb)`);
    assert.equal(await sayi(c, `select level from public.profiles where id = ${a(u)}`), 5);
    assert.equal(await sayi(c, `select level_xp from public.profiles where id = ${a(u)}`), 4);
    assert.equal(await sayi(c, `select coin from public.profiles where id = ${a(u)}`) - coinOnce, levelCoin, 'L5: +20 coin (tavan dışı)');
    assert.equal(await sayi(c, `select coalesce(sum(adet),0) from public.joker_envanter where user_id = ${a(u)}`) - skillOnce, 1, 'L5: +1 skill hakkı');
    const tur = await c.tek(`select tur from public.joker_islemleri where user_id = ${a(u)} and kaynak = 'hediye' and ref = 'seviye:5'`);
    assert.equal(await c.tek(`select public.skill_aktif(${a(tur)})`), 't', 'aktif bir skill');

    // Rütbe: L9 → L10 (Bilge) = level coini + rütbe coini
    const gerek9 = await sayi(c, `select public.level_gereken_xp(9)`);
    await c.sorgu(`update public.profiles set level = 9, level_xp = ${gerek9 - 1} where id = ${a(u)}`);
    const c2 = await sayi(c, `select coin from public.profiles where id = ${a(u)}`);
    await c.sorgu(`select public.xp_ver(${a(u)}, 1, 'mac:00000000-0000-4000-8000-00000000a002', '{}'::jsonb)`);
    assert.equal(await sayi(c, `select coin from public.profiles where id = ${a(u)}`) - c2, levelCoin + rutbeCoin, 'L10: 20 + 100');
    assert.equal(await c.tek(`select public.level_rutbe(level) from public.profiles where id = ${a(u)}`), 'Bilge');
  });
});

test('tek seferde çok level: her levelin ödülü ayrı verilir', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const u = await oyuncuKur(c, 'cok');
    const [taban, kat, us] = [await ayar(c, 'level_xp_taban', 60), await ayar(c, 'level_xp_katsayi', 0.5), await ayar(c, 'level_xp_us', 1.5)];
    const XP = 1000;
    let L = 1, kalan = XP;
    while (kalan >= gerekenJs(L, taban, kat, us)) { kalan -= gerekenJs(L, taban, kat, us); L++; }
    const coinOnce = await sayi(c, `select coin from public.profiles where id = ${a(u)}`);
    await c.sorgu(`select public.xp_ver(${a(u)}, ${XP}, 'turnuva:00000000-0000-4000-8000-00000000b001', '{}'::jsonb)`);
    const p = JSON.parse(await c.tek(`select jsonb_build_object('level', level, 'level_xp', level_xp, 'xp', xp)::text from public.profiles where id = ${a(u)}`));
    assert.deepEqual(p, { level: L, level_xp: kalan, xp: XP });
    const atlanan = L - 1;
    assert.equal(await sayi(c, `select count(*) from public.coin_hareketleri where user_id = ${a(u)} and tur = 'seviye' and referans like 'seviye:%'`), atlanan);
    const besler = Math.floor(L / 5);
    assert.equal(await sayi(c, `select count(*) from public.joker_islemleri where user_id = ${a(u)} and kaynak = 'hediye' and ref like 'seviye:%'`), besler);
    const rutbe = L >= 10 ? 1 : 0;
    assert.equal(await sayi(c, `select coin from public.profiles where id = ${a(u)}`) - coinOnce, atlanan * 20 + rutbe * 100);
  });
});

test('aynı maç iki kez XP/ödül yazmaz', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const [x, y] = [await oyuncuKur(c, 'ik1'), await oyuncuKur(c, 'ik2')];
    const m = await klasik(c, x, y, { kazanan: x });
    const once = await xpToplam(c, x);
    await c.sorgu(`select public.mac_sonuclandir(${a(m)}, ${a(x)}, ${a(y)})`);
    await c.sorgu(`select public.xp_ver(${a(x)}, 500, ${a('mac:' + m)}, '{}'::jsonb)`);
    assert.equal(await xpToplam(c, x), once);
    assert.equal(await sayi(c, `select count(*) from public.xp_hareketleri where user_id = ${a(x)} and kaynak = ${a('mac:' + m)}`), 1);
  });
});

test('turnuva: katılım XP, ilk 3 ek XP', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const tid = await c.tek(`insert into public.tournaments (tarih, durum) values (current_date, 'bitti') returning id`);
    const oyuncular = [];
    for (let i = 0; i < 5; i++) {
      const u = await oyuncuKur(c, 'tr' + i);
      oyuncular.push(u);
      await c.sorgu(`insert into public.tournament_players (tournament_id, user_id, elendi, elenme_sorusu, dogru_sayisi)
                     values (${a(tid)}, ${a(u)}, ${i > 0}, ${i === 0 ? 'null' : 20 - i}, ${20 - i})`);
    }
    await sunucuOlarak(c);
    await c.sorgu(`select public.turnuva_odullerini_dagit(${a(tid)}, ${a(oyuncular[0])})`);
    const [k, ilk3] = [await ayar(c, 'xp_turnuva_katilim', 0), await ayar(c, 'xp_turnuva_ilk3', 0)];
    assert.deepEqual([k, ilk3], [20, 50]);
    for (let i = 0; i < 5; i++) {
      assert.equal(await xpToplam(c, oyuncular[i]), k + (i < 3 ? ilk3 : 0), `${i + 1}. sıra`);
    }
    await olarak(c, oyuncular[0]);
    const lk = JSON.parse(await c.tek(`select public.level_kazancim(${a('turnuva:' + tid)})::text`));
    assert.equal(lk.hazir, true);
    assert.equal(lk.xp, k + ilk3);
  });
});

test('botlar: XP almaz, level türetilir; açık botla maçta XP %50', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const gizli = await oyuncuKur(c, 'gb', { is_bot: true, bot_turu: 'gizli', bot_seviye_puan: 80 });
    const lv = await sayi(c, `select level from public.profiles where id = ${a(gizli)}`);
    assert.ok(lv >= 48 && lv <= 88, `seviye 80 bot makul level (48-88): ${lv}`);
    const acik = await oyuncuKur(c, 'ab', { is_bot: true, bot_turu: 'acik', bot_isabet: 0.6 });
    const insan = await oyuncuKur(c, 'ins');
    const xG = await ayar(c, 'xp_mac_galibiyet', 0);

    const m1 = await klasik(c, insan, gizli, { kazanan: insan });
    assert.equal(await xpToplam(c, insan), xG, 'gizli bot: tam XP');
    const botXp = await xpToplam(c, gizli);
    await klasik(c, insan, gizli, { kazanan: gizli });
    assert.equal(await xpToplam(c, gizli), botXp, 'bota XP yazılmaz');
    assert.equal(await sayi(c, `select level from public.profiles where id = ${a(gizli)}`), lv, 'bot level sabit');

    const once = await xpToplam(c, insan);
    await klasik(c, insan, acik, { kazanan: insan });
    assert.equal(await xpToplam(c, insan) - once, Math.floor(xG * (await ayar(c, 'xp_acik_bot_carpani', 0.5))), 'açık bot XP %50');

    await olarak(c, insan);
    const lk = JSON.parse(await c.tek(`select public.level_kazancim(${a('mac:' + m1)})::text`));
    assert.equal(lk.hazir, true);
    assert.equal(lk.xp, xG);
    assert.equal(lk.level, 1);
    assert.ok(lk.level_gereken > 0);
  });
});

test('profilim level_gereken döndürür; başkasının level’i okunur, xp okunmaz', sec, async (t) => {
  await islem(async (c) => {
    if (!(await hazirMi(c, t))) return;
    const [x, y] = [await oyuncuKur(c, 'pr1'), await oyuncuKur(c, 'pr2')];
    await olarak(c, x);
    const p = JSON.parse(await c.tek(`select public.profilim()::text`));
    assert.equal(p.level, 1);
    assert.equal(p.level_gereken, await sayi(c, `select public.level_gereken_xp(1)`));
    await c.sorgu(`set local role authenticated`);
    assert.equal(await sayi(c, `select level from public.profiles where id = ${a(y)}`), 1);
    await c.sorgu('savepoint s');
    let hata = null;
    try { await c.sorgu(`select xp from public.profiles where id = ${a(y)}`); } catch (e) { hata = e.message; }
    await c.sorgu('rollback to savepoint s');
    assert.ok(hata && /permission denied/i.test(hata), 'xp kolonu istemciye kapalı');
    await c.sorgu(`reset role`);
  });
});
