// Düello 1.0 (surum = 2) BOTLARI — migration 269.
//
// NE KORUYOR:
//  1. KATEGORİ: bot saldırırken kendi GÜÇLÜ kategorisini seçer (bot_kategori_isabet),
//     v2 kuralına uyar (maçta 2 kez, üst üste değil), 8 sn'lik süre içinde.
//  2. CEVAP: bot savunurken de saldırırken de, uzatmada da cevaplar; cevap duello2 akışıyla
//     yazılır ve iki taraf tamamsa soru çözümlenir. İsabet kategoriye göre.
//  3. ZAMANLAMA: açık bot 0,3–0,8 sn; gizli bot gerçekçi sürede, kişisel bitişi aşmadan.
//  4. SKILL: Klasik bot deseni; sınırlar 4 / aynı skill 2 / soruda 1.
//  5. v1 DOKUNULMAZ: duello_tik_hepsi'nin v2 bloğu dışındaki metni canlıdakiyle aynı.
//  6. is_bot istemciye sızmaz.
//
// İşlem içinde now() sabittir: zaman, soru_baslangic / faz_bitis GERİYE çekilerek ilerletilir.
// Yalnız 268 + 269 birleşik provasında çalışır:  node oyun/_test/duello2-bot-db-calistir.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from '../../araclar/pg-mini.mjs';
import { islem, oyuncuKur, olarak, sunucuOlarak, ayarla, baglantiVarMi, alintila as a } from './yardim.mjs';

const onceSql = process.env.TEST_ONCE_SQL ? fs.readFileSync(process.env.TEST_ONCE_SQL, 'utf8') : '';
const prova = onceSql.includes('duello2_bot_tik') && onceSql.includes('duello2_ilerlet');
const sec = { skip: !(await baglantiVarMi()) || !prova ? 'yalnız 268 + 269 provasında çalışır (node oyun/_test/duello2-bot-db-calistir.mjs)' : false };

const satir = async (c, id) => JSON.parse(await c.tek(`select to_jsonb(d)::text from public.duellolar d where d.id = ${a(id)}`));
const tik = async (c, id) => { await sunucuOlarak(c); return Number(await c.tek(`select public.duello2_bot_tik(${a(id)})`)); };
const dogruCevap = async (c, id) => Number(await c.tek(`select q.dogru_cevap from public.duellolar d join public.questions q on q.id = d.soru_id where d.id = ${a(id)}`));
const cevapla = async (c, id, u, n) => { await olarak(c, u); return c.sorgu(`select public.duello_cevap(${a(id)}, ${n}::smallint)`); };
const gecikme = async (c, id, bot) => Number(await c.tek(`select public.duello2_bot_cevap_gecikme(${a(id)}, ${a(bot)})`));
/** Soru açılalı `sn` saniye olmuş gibi (bitişler yerinde kalır). */
const soruGecti = (c, id, sn) => c.sorgu(`update public.duellolar set soru_baslangic = now() - make_interval(secs => ${sn}) where id = ${a(id)}`);
/** Kategori fazı açılalı `sn` saniye olmuş gibi. */
const kategoriGecti = (c, id, sn) => c.sorgu(`update public.duellolar
   set faz_bitis = now() + make_interval(secs => public.ayar_sayi('duello2_kategori_sn', 8) - ${sn}) where id = ${a(id)}`);
const botSkill = (c, id, bot) => c.sorgu(`select tur, soru_index from public.joker_kullanimlari
   where mac_tur = 'duello' and mac_id = ${a(id)} and user_id = ${a(bot)} order by id`);

/**
 * v2 maç: insan + bot. `botSaldiran` = ilk turun saldıranı bot mu. Botun kişiliği sabitlenir:
 * GUCLU kategoride +30, ZAYIF'ta -30, diğerleri 0 (bot_isabet 0.6 → 0.9 / 0.3 / 0.6).
 */
async function kur(c, { tur = 'acik', botSaldiran = false, isabet = 0.6, sapma = null } = {}) {
  await ayarla(c, 'duello_surum', 2);
  await ayarla(c, 'duello2_bot_skill_yuzde', 0);   // skill testleri kendisi açar
  const insan = await oyuncuKur(c, 'd2insan');
  const bot = await oyuncuKur(c, 'd2bot', {
    is_bot: true, bot_turu: tur, bot_isabet: isabet,
    bot_gecikme_min: 3, bot_gecikme_max: 5,
  });
  const katlar = (await c.sorgu(`select k from unnest(public.duello_kategorileri()) k order by k`)).map((r) => r.k);
  const guclu = katlar[katlar.length - 1];
  const zayif = katlar[0];
  await c.sorgu(`delete from public.bot_kategori_sapma where bot_id = ${a(bot)}`);
  for (const k of katlar) {
    const s = sapma ? (sapma[k] ?? 0) : k === guclu ? 30 : k === zayif ? -30 : 0;
    await c.sorgu(`insert into public.bot_kategori_sapma (bot_id, kategori, sapma) values (${a(bot)}, ${a(k)}, ${s})`);
  }
  const id = await c.tek(`select public.duello_olustur(${a(insan)}, ${a(bot)}, true, null)`);
  const d = await satir(c, id);
  // İlk saldıran rastgele (oyuncu1); test istediği tarafı oyuncu1 yapar.
  const istenen = botSaldiran ? bot : insan;
  if (d.oyuncu1 !== istenen) {
    await c.sorgu(`update public.duellolar set oyuncu1 = oyuncu2, oyuncu2 = oyuncu1, saldiran = oyuncu2,
                     profil1 = profil2, profil2 = profil1, zayif1 = zayif2, zayif2 = zayif1 where id = ${a(id)}`);
  }
  return { id, insan, bot, katlar, guclu, zayif };
}

/** İnsan saldırıyor: uygun ilk kategoriyi seçer, soru iki oyuncuya açılır. */
async function insanSecer(c, id, insan, kat) {
  await olarak(c, insan);
  if (!kat) kat = JSON.parse(await c.tek(`select public.duello_durum(${a(id)})::text`)).uygun_kategoriler[0];
  await c.sorgu(`select public.duello_kategori_sec(${a(id)}, ${a(kat)})`);
  return kat;
}

/** Aynı maçta istenen indeksteki soruyu (verilen kategoride) doğrudan açar. */
async function soruyaGec(c, id, { tur, sira, kat }) {
  const soru = await c.tek(`select id from public.questions where aktif and kategori = ${a(kat)} order by random() limit 1`);
  await c.sorgu(`update public.duellolar set tur = ${tur}, saldiri_sirasi = ${sira}, faz = 'cevap', cevaplar = '{}'::jsonb,
                   kategori = ${a(kat)}, soru_id = ${a(soru)}, soru_baslangic = now(),
                   bitis1 = now() + interval '15 seconds', bitis2 = now() + interval '15 seconds',
                   faz_bitis = now() + interval '15 seconds', elli1 = null, elli2 = null, zaman_baskisi = false
                 where id = ${a(id)}`);
}

// ---------------------------------------------------------------- kategori

test('bot saldırırken GÜÇLÜ kategorisini seçer, süre içinde ve gecikmeyle', sec, async () => {
  await islem(async (c) => {
    const { id, bot, guclu } = await kur(c, { botSaldiran: true });
    let d = await satir(c, id);
    assert.equal(d.saldiran, bot);
    assert.equal(d.faz, 'kategori');
    assert.equal(await tik(c, id), 0, 'kategori fazı yeni açıldı: bot hemen seçmez');
    await kategoriGecti(c, id, 1);
    assert.equal(await tik(c, id), 0, '1 sn: henüz seçmez (en az 1,5 sn)');
    await kategoriGecti(c, id, 4.1);
    await tik(c, id);
    d = await satir(c, id);
    assert.equal(d.faz, 'cevap', '4 sn içinde seçer (8 sn dolmadan)');
    assert.equal(d.kategori, guclu, 'botun en güçlü kategorisi');
    assert.ok(d.soru_id);
    assert.deepEqual(d.cevaplar, {}, 'soru yeni açıldı: bot aynı anda cevaplamaz');
  });
});

test('bot kategori seçimi v2 kuralına uyar: güçlü kategori 2 kez dolunca sıradakine geçer', sec, async () => {
  await islem(async (c) => {
    const { id, bot, insan, katlar, guclu } = await kur(c, { botSaldiran: true });
    // Güçlü kategori maçta 2 kez oynanmış; ikinci güçlüyü belirle.
    const ikinci = katlar[1];
    await c.sorgu(`update public.bot_kategori_sapma set sapma = 20 where bot_id = ${a(bot)} and kategori = ${a(ikinci)}`);
    await c.sorgu(`insert into public.duello_hamleler (duello_id, tur, saldiran, savunan, kategori, dogru, surum)
                   select ${a(id)}, 0, ${a(bot)}, ${a(insan)}, ${a(guclu)}, true, 2 from generate_series(1, 2)`);
    await kategoriGecti(c, id, 5);
    await tik(c, id);
    const d = await satir(c, id);
    assert.equal(d.faz, 'cevap');
    assert.equal(d.kategori, ikinci, 'kural dışı kategori seçilmez; uygunların en güçlüsü');
  });
});

// ---------------------------------------------------------------- cevap + zamanlama

test('açık bot savunurken 0,3–0,8 sn içinde cevaplar; insan cevaplayınca soru çözümlenir', sec, async () => {
  await islem(async (c) => {
    const { id, insan, bot } = await kur(c, { tur: 'acik' });
    await insanSecer(c, id, insan);
    const g = await gecikme(c, id, bot);
    assert.ok(g >= 0.3 && g <= 0.8, `açık bot gecikmesi 0,3–0,8 sn olmalı, ${g}`);
    await soruGecti(c, id, 0.25);
    await tik(c, id);
    assert.equal((await satir(c, id)).cevaplar[bot], undefined, '0,25 sn: henüz cevaplamadı');
    await soruGecti(c, id, 0.85);
    await tik(c, id);
    let d = await satir(c, id);
    assert.ok(d.cevaplar[bot], '0,85 sn: cevapladı');
    assert.equal(d.faz, 'cevap', 'insan cevaplamadan çözümlenmez');
    await tik(c, id);
    assert.equal(Object.keys((await satir(c, id)).cevaplar).length, 1, 'bot ikinci kez cevaplamaz');

    await cevapla(c, id, insan, await dogruCevap(c, id));
    d = await satir(c, id);
    assert.equal(d.faz, 'sonuc', 'iki taraf tamam: çözümlendi');
    const h = (await c.sorgu(`select cevap, cevap_saldiran, yanitsiz_savunan, surum from public.duello_hamleler
                                where duello_id = ${a(id)}`))[0];
    assert.equal(Number(h.surum), 2);
    assert.equal(h.yanitsiz_savunan, 'f', 'botun cevabı kayda geçti (Yanıtsız değil)');
    assert.notEqual(h.cevap, null);
  });
});

test('bot insan cevapladıktan sonra cevaplarsa soru hemen çözümlenir', sec, async () => {
  await islem(async (c) => {
    const { id, insan, bot } = await kur(c, { tur: 'acik' });
    await insanSecer(c, id, insan);
    await cevapla(c, id, insan, await dogruCevap(c, id));
    await soruGecti(c, id, 1);
    await tik(c, id);
    const d = await satir(c, id);
    assert.equal(d.faz, 'sonuc');
    assert.equal(d.son_hamle.cevaplar[bot].yanitsiz, false);
  });
});

test('bot saldırırken de cevaplar (aynı soru aynı anda)', sec, async () => {
  await islem(async (c) => {
    const { id, insan, bot, guclu } = await kur(c, { tur: 'acik', botSaldiran: true });
    await kategoriGecti(c, id, 5);
    await tik(c, id);
    assert.equal((await satir(c, id)).kategori, guclu);
    await soruGecti(c, id, 1);
    await tik(c, id);
    let d = await satir(c, id);
    assert.ok(d.cevaplar[bot], 'saldıran bot da cevaplar');
    await cevapla(c, id, insan, await dogruCevap(c, id));
    d = await satir(c, id);
    assert.equal(d.faz, 'sonuc');
    assert.equal(d.son_hamle.saldiran, bot);
    assert.equal(d.son_hamle.cevaplar[bot].yanitsiz, false);
  });
});

test('gizli bot gerçekçi sürede cevaplar, kişisel bitişi aşmaz', sec, async () => {
  await islem(async (c) => {
    const { id, insan, bot } = await kur(c, { tur: 'gizli' });
    await insanSecer(c, id, insan);
    const g = await gecikme(c, id, bot);
    assert.ok(g >= 1 && g <= 13, `gizli bot gecikmesi 1–13 sn olmalı (15 − 2 sn pay), ${g}`);
    await soruGecti(c, id, 0.9);
    await tik(c, id);
    assert.equal((await satir(c, id)).cevaplar[bot], undefined, 'açık bot hızında (0,9 sn) cevaplamaz');
    await soruGecti(c, id, g + 0.05);
    await tik(c, id);
    assert.ok((await satir(c, id)).cevaplar[bot], 'kendi gecikmesi dolunca cevaplar');

    // Zaman Baskısı yemiş gibi: kişisel bitiş 4 sn'ye inerse gecikme de ona göre kısalır.
    await c.sorgu(`update public.duellolar set cevaplar = '{}'::jsonb, soru_baslangic = now(),
                     bitis1 = now() + interval '4 seconds', bitis2 = now() + interval '4 seconds' where id = ${a(id)}`);
    const g2 = await gecikme(c, id, bot);
    assert.ok(g2 <= 2.0001, `bitişe 2 sn pay kalmalı, ${g2}`);
  });
});

test('uzatmada bot cevaplar', sec, async () => {
  await islem(async (c) => {
    const { id, bot } = await kur(c, { tur: 'acik' });
    await c.sorgu(`update public.duellolar set tur = public.ayar_sayi('duello_max_tur', 10), saldiri_sirasi = 1,
                     saldiran = oyuncu2, can1 = 2, can2 = 2, faz = 'sonuc', faz_bitis = now() - interval '1 second',
                     son_hamle = '{}'::jsonb where id = ${a(id)}`);
    await tik(c, id);   // tik önce faz makinesini ilerletir → uzatma sorusu
    let d = await satir(c, id);
    assert.equal(d.uzatma, true);
    assert.equal(d.faz, 'cevap');
    await soruGecti(c, id, 1);
    await tik(c, id);
    d = await satir(c, id);
    assert.ok(d.cevaplar[bot], 'uzatma sorusunu cevapladı');
  });
});

test('isabet kategoriye göre: güçlü kategoride çok, zayıfta az doğru', sec, async () => {
  await islem(async (c) => {
    const { id, bot, guclu, zayif } = await kur(c, { tur: 'acik', isabet: 0.5 });
    // Güçlü 0.5 + 0.45 = 0.95, zayıf 0.5 − 0.45 = 0.05.
    await c.sorgu(`update public.bot_kategori_sapma set sapma = case when kategori = ${a(guclu)} then 45 else -45 end
                    where bot_id = ${a(bot)} and kategori in (${a(guclu)}, ${a(zayif)})`);
    const say = async (kat) => {
      let dogru = 0;
      for (let i = 0; i < 12; i++) {
        await soruyaGec(c, id, { tur: 0, sira: 0, kat });
        await soruGecti(c, id, 1);
        await tik(c, id);
        const d = await satir(c, id);
        assert.ok(d.cevaplar[bot], 'her soruda cevaplar');
        if (Number(d.cevaplar[bot].cevap) === (await dogruCevap(c, id))) dogru++;
      }
      return dogru;
    };
    const g = await say(guclu);   // isabet 0.95
    const z = await say(zayif);   // isabet 0.05
    assert.ok(g >= 8, `güçlü kategoride 12'de en az 8 doğru beklenir, ${g}`);
    assert.ok(z <= 4, `zayıf kategoride 12'de en çok 4 doğru beklenir, ${z}`);
  });
});

// ---------------------------------------------------------------- skill

test('bot skill: Klasik deseni, sınırlar 4 / aynı skill 2 / soruda 1', sec, async () => {
  await islem(async (c) => {
    const { id, bot, katlar } = await kur(c, { tur: 'gizli' });
    await ayarla(c, 'duello2_bot_skill_yuzde', 100);
    const kat = katlar[Math.floor(katlar.length / 2)];
    for (let idx = 0; idx < 10; idx++) {
      await soruyaGec(c, id, { tur: Math.floor(idx / 2), sira: idx % 2, kat });
      const g = await gecikme(c, id, bot);
      // Skill anı gecikmenin %35–75'i; %80'de skill zamanı gelmiş, cevap zamanı gelmemiş.
      await soruGecti(c, id, g * 0.8);
      await tik(c, id);
      await tik(c, id);   // ikinci tik aynı soruda ikinci skill açmaz
      const d = await satir(c, id);
      const bu = (await botSkill(c, id, bot)).filter((k) => Number(k.soru_index) === idx);
      assert.ok(bu.length <= 1, `soruda en çok 1 skill (indeks ${idx})`);
      if (bu[0]?.tur === 'zaman_baskisi') assert.equal(d.zaman_baskisi, true, 'Zaman Baskısı etkisi uygulandı');
    }
    const hepsi = await botSkill(c, id, bot);
    assert.equal(hepsi.length, 4, 'maçta toplam 4 skill (yüzde 100 iken sınıra kadar)');
    const say = (t) => hepsi.filter((k) => k.tur === t).length;
    assert.equal(say('zaman_baskisi'), 2, 'aynı skill en çok 2');
    assert.equal(say('soru_degistir'), 2, 'aynı skill en çok 2');
    assert.ok(hepsi.every((k) => ['zaman_baskisi', 'soru_degistir'].includes(k.tur)), 'yalnız izinli havuz');
  });
});

test('bot skill: kimse cevaplamamışken; insan cevapladıysa kullanmaz', sec, async () => {
  await islem(async (c) => {
    const { id, insan, bot } = await kur(c, { tur: 'gizli' });
    await ayarla(c, 'duello2_bot_skill_yuzde', 100);
    await insanSecer(c, id, insan);
    await cevapla(c, id, insan, await dogruCevap(c, id));
    const g = await gecikme(c, id, bot);
    await soruGecti(c, id, g * 0.8);
    await tik(c, id);
    assert.equal((await botSkill(c, id, bot)).length, 0);
  });
});

test('bot skill yüzde 0 iken skill kullanmaz ama cevaplar', sec, async () => {
  await islem(async (c) => {
    const { id, insan, bot } = await kur(c, { tur: 'acik' });
    await insanSecer(c, id, insan);
    await soruGecti(c, id, 1);
    await tik(c, id);
    assert.equal((await botSkill(c, id, bot)).length, 0);
    assert.ok((await satir(c, id)).cevaplar[bot]);
  });
});

// ---------------------------------------------------------------- güvenlik / v1

test('is_bot istemciye sızmaz; bot iç fonksiyonları istemciye kapalı', sec, async () => {
  await islem(async (c) => {
    const { id, insan } = await kur(c, { tur: 'gizli' });
    await olarak(c, insan);
    const metin = await c.tek(`select public.duello_durum(${a(id)})::text`);
    assert.ok(!/is_bot|bot_turu|acik_bot|bot_isabet/.test(metin), 'duello_durum bot bilgisi taşımaz');
    for (const f of ['duello2_bot_tik(uuid)', 'duello2_bot_cevap(uuid,uuid,smallint)', 'duello2_bot_skill_dene(uuid,uuid)',
                     'duello2_bot_kategori(uuid,uuid)', 'duello2_bot_cevap_gecikme(uuid,uuid)', 'duello2_bot_acik_mi(uuid)',
                     'duello_tik_hepsi()']) {
      for (const rol of ['anon', 'authenticated']) {
        assert.equal(await c.tek(`select has_function_privilege(${a(rol)}, ${a('public.' + f)}, 'execute')::text`), 'false', `${rol} → ${f}`);
      }
      assert.equal(await c.tek(`select prosecdef::text from pg_proc where oid = ${a('public.' + f)}::regprocedure`), 'true', `${f} security definer`);
    }
    // duello2_bot_cevap yalnız bot içindir: insan kimliğiyle çağrılamaz.
    await sunucuOlarak(c);
    await c.sorgu('savepoint s');
    await assert.rejects(c.sorgu(`select public.duello2_bot_cevap(${a(id)}, ${a(insan)}, 0::smallint)`), /Yalnız bot/);
    await c.sorgu('rollback to savepoint s');
  });
});

test('duello_tik_hepsi: v2 bloğu dışında canlı tanımla birebir aynı; v2 maçı bot tikine yönlenir', sec, async () => {
  const blokSil = (t) => t.replace(/\r\n/g, '\n')
    .replace(/ *-- >>> Düello 1\.0 botu[\s\S]*?-- <<< Düello 1\.0 botu\n/, '').trim();
  // Canlı tanım: işlem DIŞINDAN ayrı bağlantıyla (migration uygulanmamış hâl).
  const canli = await new PgIstemci(await baglantiDizgisi()).baglan();
  let eski;
  try { eski = await canli.tek(`select pg_get_functiondef('public.duello_tik_hepsi()'::regprocedure)`); }
  finally { await canli.kapat(); }
  await islem(async (c) => {
    const yeni = await c.tek(`select pg_get_functiondef('public.duello_tik_hepsi()'::regprocedure)`);
    assert.match(yeni, /if d\.surum = 2 then\s+perform public\.duello2_bot_tik\(d\.id\);/);
    assert.match(yeni, /for update skip locked/);
    assert.equal(blokSil(yeni), blokSil(eski), 'surum = 1 davranışı değişmedi');
    const botTik = await c.tek(`select pg_get_functiondef('public.duello2_bot_tik(uuid)'::regprocedure)`);
    assert.match(botTik, /for update skip locked/, 'bot tiki satırı SKIP LOCKED ile alır');
  });
});

test('v1 maçta duello2_bot_tik hiçbir şey yapmaz', sec, async () => {
  await islem(async (c) => {
    await ayarla(c, 'duello_surum', 1);
    const insan = await oyuncuKur(c, 'v1insan');
    const bot = await oyuncuKur(c, 'v1bot', { is_bot: true, bot_turu: 'acik' });
    const id = await c.tek(`select public.duello_olustur(${a(bot)}, ${a(insan)}, true, null)`);
    await c.sorgu(`update public.duellolar set faz_bitis = now() - interval '30 seconds' where id = ${a(id)}`);
    const once = await satir(c, id);
    assert.equal(Number(once.surum), 1);
    assert.equal(await tik(c, id), 0);
    const sonra = await satir(c, id);
    assert.equal(sonra.faz, once.faz, 'v1 maçın fazına dokunulmadı');
  });
});
