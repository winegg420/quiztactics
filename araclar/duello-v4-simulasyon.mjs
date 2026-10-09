// Düello v4 — bot ve sunucu mantığı simülasyonu. TEK transaction, sonunda ROLLBACK (canlıya iz bırakmaz).
//
// Canlıyı korumak için işlem İÇİNDE (ROLLBACK ile geri döner):
//   · sahte oyuncular (auth.users → profiles tetikleyicisi): insan taklidi + bot; gerçek oyuncu/bot satırına dokunulmaz,
//   · paylaşılan satıra yazan yan etkiler geçici olarak etkisiz: cron_hizlandir_trg (cron.job satırı), soru_sayac
//     (questions satırları), duello_bitir (yalnız durum/kazanan — ödül Aşama 1'de sınandı), sezon/rozet tetikleyici
//     fonksiyonları, kategori_istatistik_yaz / kategori_dogru_arttir (tohumlanan oranlar sabit kalsın).
// İşlem içinde now() sabit → "zaman geçti" satırdaki süreler geriye çekilerek taklit edilir; maç süresi her fazın
// gerçek süre formülüyle (gösterim payı, bot gecikmesi, insan düşünme süresi, süre dolumu + geç varış payı) TAHMİN edilir.
//
// Maç türleri: bot-bot · insan-insan · insan-bot. Seviye çiftleri: eşit (62/62) · biraz güçlü (70/60) · çok güçlü (82/50).
// İnsan taklidi: kategori başına isabet = taban ± 12 (sabit) + soru zorluğu farkı (bot formülüyle aynı); %4 cevapsız;
// kartta %8 süre dolumu, %50 akıllı (rakibin en düşük gösterilen oranı / kendi en yüksek), kalanı rastgele.
// Bot: duello4_bot_tik (gerçek kod). Bot oranları = tohumlanan kategori_istatistik; isabeti bot_kategori_sapma ile aynı vektör.
//
// Kullanım: node araclar/duello-v4-simulasyon.mjs [--n 120]   (n = tür×seviye başına maç; 9 grup → 9n maç)
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';
import fs from 'node:fs';

const nI = process.argv.indexOf('--n');
const N = nI > 0 ? Number(process.argv[nI + 1]) : 120;
const UYGULAMA = 'duello-v4-simulasyon';
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const tek = (s) => db.tek(s);
const bekci = setTimeout(async () => {
  console.error('⏱ süre aşıldı — ROLLBACK + kapat');
  try { await db.sorgu('rollback'); } catch { /* */ }
  await db.kapat(); process.exit(3);
}, 30 * 60 * 1000);

const SEVIYE = { esit: [0.62, 0.62], biraz: [0.70, 0.60], cok: [0.82, 0.50] };
const TURLER = ['bot-bot', 'insan-insan', 'insan-bot'];

const SIM_SQL = `
create table pg_temp.sim_acc (u uuid, kat text, acc double precision, primary key (u, kat));

create function pg_temp.sim_isabet(p_u uuid, p_kat text, p_soru uuid) returns double precision language sql as $f$
  select least(0.98, greatest(0.05, coalesce((select acc from pg_temp.sim_acc where u = p_u and kat = p_kat), 0.6)
    + coalesce((select case q.zorluk when 1 then 0.15 when 2 then 0.08 when 3 then 0 when 4 then -0.08 when 5 then -0.15 else 0 end
                  from public.questions q where q.id = p_soru), 0)));
$f$;

create function pg_temp.sim_mac(p1 uuid, p2 uuid) returns jsonb language plpgsql as $f$
declare
  m uuid;
  d public.duellolar%rowtype;
  adim int := 0;
  sure double precision := 3;          -- giriş (3-2-1)
  t double precision;
  u uuid;
  bot1 boolean; bot2 boolean; ubot boolean;
  v_soru uuid; v_kat text; v_dc smallint; v_c smallint;
  on_kontrol uuid; on_len int; on_faz text;
  reset int := 0; notr5 boolean := false;
  kartlar text[]; rprof jsonb; oprof jsonb;
  g text; s text; en_zayif text; en_guclu text;
  bg_iyi int := 0; bg_n int := 0; bs_iyi int := 0; bs_n int := 0;
  ornek jsonb := '[]'::jsonb;
  t1 double precision; t2 double precision;
  oto int := 0;
  hata text;
begin
  m := public.duello_olustur(p1, p2, false);
  select coalesce(is_bot, false) into bot1 from public.profiles where id = (select oyuncu1 from public.duellolar where id = m);
  select coalesce(is_bot, false) into bot2 from public.profiles where id = (select oyuncu2 from public.duellolar where id = m);
  loop
    adim := adim + 1;
    if adim > 600 then hata := 'takildi'; exit; end if;
    select * into d from public.duellolar where id = m;
    exit when d.durum <> 'aktif';
    if d.surum <> 4 then hata := 'surum ' || d.surum; exit; end if;

    if d.faz in ('notr', 'cevap', 'son') then
      t := 0;
      foreach u in array array[d.oyuncu1, d.oyuncu2] loop
        ubot := case when u = d.oyuncu1 then bot1 else bot2 end;
        if ubot then
          t := greatest(t, public.duello4_bot_gecikme(m, u));
        elsif random() < 0.04 then
          t := greatest(t, 2 + 15 + 5);                       -- cevapsız: süre + geç varış payı
        else
          v_soru := case when u = d.oyuncu1 then d.soru_id1 else d.soru_id2 end;
          v_kat := case when u = d.oyuncu1 then d.kategori1 else d.kategori2 end;
          select dogru_cevap into v_dc from public.questions where id = v_soru;
          if random() < pg_temp.sim_isabet(u, v_kat, v_soru) then v_c := v_dc;
          else select x into v_c from generate_series(0, 3) x where x <> v_dc order by random() limit 1; end if;
          update public.duellolar set cevaplar = cevaplar || jsonb_build_object(u::text, jsonb_build_object('cevap', v_c, 'at', now()))
           where id = m;
          t := greatest(t, 2 + 3 + random() * 9);
        end if;
      end loop;
      update public.duellolar set soru_baslangic = now() - interval '60 seconds' where id = m;
      perform public.duello4_bot_tik(m);
      select * into d from public.duellolar where id = m;
      if d.durum = 'aktif' and d.faz in ('notr', 'cevap', 'son') then
        update public.duellolar set bitis1 = now() - interval '20 seconds', bitis2 = now() - interval '20 seconds',
                                    faz_bitis = now() - interval '20 seconds' where id = m;
        perform public.duello4_ilerlet(m);
      end if;
      sure := sure + t;

    elsif d.faz = 'kart' then
      kartlar := d.v4_kartlar;
      ubot := case when d.v4_kontrol = d.oyuncu1 then bot1 else bot2 end;
      rprof := case when d.v4_kontrol = d.oyuncu1 then d.profil2 else d.profil1 end;
      oprof := case when d.v4_kontrol = d.oyuncu1 then d.profil1 else d.profil2 end;
      if ubot then
        t1 := least(1.2 + 1.8 * public.bot_rasgele('d4k1:' || m::text || ':' || d.v4_tur), 5);
        t2 := least(t1 + 0.8 + 1.2 * public.bot_rasgele('d4k2:' || m::text || ':' || d.v4_tur), 6.5);
        update public.duellolar set faz_bitis = now() + interval '0.3 seconds' where id = m;
        perform public.duello4_bot_tik(m);
        select * into d from public.duellolar where id = m;
        g := d.v4_gonderilen; s := d.v4_secilen;
        select k into en_zayif from unnest(kartlar) k order by coalesce(public.duello4_oran(rprof, k), 50), k limit 1;
        select k into en_guclu from unnest(kartlar) k where k <> g order by public.bot_kategori_isabet(d.v4_kontrol, k) desc, k limit 1;
        bg_n := bg_n + 1; bs_n := bs_n + 1;
        if g = en_zayif then bg_iyi := bg_iyi + 1; end if;
        if s = en_guclu then bs_iyi := bs_iyi + 1; end if;
        if jsonb_array_length(ornek) < 3 then
          ornek := ornek || jsonb_build_object('kartlar',
            (select jsonb_agg(jsonb_build_object('k', k, 'rakip', public.duello4_oran(rprof, k),
                                                 'bot_isabet', round(public.bot_kategori_isabet(d.v4_kontrol, k)::numeric, 2))) from unnest(kartlar) k),
            'gonderdi', g, 'aldi', s);
        end if;
        sure := sure + 2 + t2;
        if d.faz = 'kart' then hata := 'bot kart secmedi'; exit; end if;
      elsif random() < 0.08 then
        update public.duellolar set faz_bitis = now() - interval '20 seconds' where id = m;
        perform public.duello4_ilerlet(m);
        oto := oto + 1;
        sure := sure + 2 + 10 + 3;
      else
        if random() < 0.5 then
          select k into g from unnest(kartlar) k order by coalesce(public.duello4_oran(rprof, k), 50), random() limit 1;
          select k into s from unnest(kartlar) k where k <> g order by coalesce(public.duello4_oran(oprof, k), 50) desc, random() limit 1;
        else
          select k into g from unnest(kartlar) k order by random() limit 1;
          select k into s from unnest(kartlar) k where k <> g order by random() limit 1;
        end if;
        perform public.duello4_kart_uygula(m, g, null, false);
        perform public.duello4_kart_uygula(m, null, s, false);
        sure := sure + 2 + 2 + random() * 4;
      end if;

    elsif d.faz = 'sonuc' then
      on_kontrol := d.v4_kontrol; on_len := coalesce(cardinality(d.v4_kullanilan), 0);
      update public.duellolar set faz_bitis = now() - interval '1 second' where id = m;
      perform public.duello4_ilerlet(m);
      sure := sure + 3;
      select * into d from public.duellolar where id = m;
      if d.faz = 'kart' and d.v4_kontrol = on_kontrol and on_len > 0 and coalesce(cardinality(d.v4_kullanilan), 0) = 0 then
        reset := reset + 1;
      end if;
      if d.faz = 'son' and d.v4_kontrol is null and d.v4_notr_seri >= d.v4_notr_max then notr5 := true; end if;
    else
      hata := 'bilinmeyen faz ' || d.faz; exit;
    end if;
  end loop;

  select * into d from public.duellolar where id = m;
  return jsonb_build_object(
    'id', m, 'hata', hata, 'adim', adim, 'durum', d.durum, 'kazanan', d.kazanan,
    'tur', d.v4_tur, 'soru', d.v4_soru_no, 'son', d.v4_son,
    'seri_bitis', d.durum = 'bitti' and not d.v4_son and d.kazanan is not null,
    'notr5', notr5, 'reset', reset, 'oto', oto, 'sure', round(sure::numeric, 1),
    'el', (select count(*) from public.duello_hamleler h where h.duello_id = m and h.v4 ->> 'sonuc' = 'el_degisti'),
    'notr_soru', (select count(*) from public.duello_hamleler h where h.duello_id = m and h.v4 ->> 'tip' = 'notr'),
    'bg', jsonb_build_array(bg_iyi, bg_n), 'bs', jsonb_build_array(bs_iyi, bs_n), 'ornek', ornek,
    'null_alan', (select count(*) from public.duello_hamleler h where h.duello_id = m
                    and (h.v4 is null or h.v4 -> 'oyuncular' is null or h.soru_id is null)));
exception when others then
  return jsonb_build_object('id', m, 'hata', sqlerrm || ' [' || sqlstate || ']', 'adim', adim);
end $f$;
`;

const STUB_SQL = `
create or replace function public.cron_hizlandir_trg() returns trigger language plpgsql as $f$ begin return null; end $f$;
create or replace function public.soru_sayac(p_question uuid, p_dogru boolean) returns void language sql as $f$ select $f$;
create or replace function public.kategori_istatistik_yaz(p_user uuid, p_kategori text, p_dogru boolean) returns void language sql as $f$ select $f$;
create or replace function public.trg_sezon_duello() returns trigger language plpgsql as $f$ begin return null; end $f$;
create or replace function public.trg_rozet_duello() returns trigger language plpgsql as $f$ begin return null; end $f$;
create or replace function public.duello_bitir(p_id uuid, p_kazanan uuid) returns void language plpgsql security definer set search_path to 'public' as $f$
begin
  update public.duellolar set durum = 'bitti', kazanan = p_kazanan, bitis = now(), son_hareket = now(),
         faz = case when faz = 'altin' then 'sonuc' else faz end
   where id = p_id and durum = 'aktif';
end $f$;
`;

const sonuclar = [];
try {
  await db.sorgu(`set application_name = '${UYGULAMA}'`);
  const imzalar = await db.sorgu(`select p.oid::regprocedure::text s from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('soru_sayac','kategori_istatistik_yaz','kategori_dogru_arttir','duello_bitir','cron_hizlandir_trg')`);
  console.log('stub imzaları:', imzalar.map((x) => x.s).join(' · '));
  if ((await tek(`select count(*)::text from pg_proc where proname = 'duello4_durum'`)) !== '1') throw new Error('1014 canlıda değil');

  await db.sorgu('begin');
  await db.sorgu("set local lock_timeout = '3s'");
  await db.sorgu("set local statement_timeout = '90s'");
  await db.sorgu("set local idle_in_transaction_session_timeout = '120s'");
  await db.sorgu(STUB_SQL);
  await db.sorgu(`create or replace function public.kategori_dogru_arttir(p_user uuid, p_kategori text) returns void language sql as $f$ select $f$`);
  await db.sorgu(SIM_SQL);
  await db.sorgu(`update oyun_ayarlari set deger = '"acik"' where anahtar = 'duello_v4_acik'`);
  // --ayar anahtar=değer (tekrarlanabilir): yalnız bu işlemde, ör. --ayar duello4_max_tur=20
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] !== '--ayar') continue;
    const [k, v] = process.argv[i + 1].split('=');
    if (!/^duello4_[a-z_]+$/.test(k) || !/^[0-9.]+$/.test(v)) throw new Error(`geçersiz --ayar ${process.argv[i + 1]}`);
    await db.sorgu(`update oyun_ayarlari set deger = '${v}'::jsonb where anahtar = '${k}'`);
    console.log(`ayar (yalnız işlem içinde): ${k} = ${v}`);
  }
  const KAT = (await tek(`select array_to_string(duello_kategorileri(), ',')`)).split(',');

  // Sahte oyuncular: her seviye çifti için güçlü (G) + zayıf (Z), insan ve bot ayrı.
  const oyuncular = {};
  async function yeni(ad, taban, bot) {
    const id = await tek(`select gen_random_uuid()::text`);
    await db.sorgu(`insert into auth.users (id) values ('${id}')`);
    await db.sorgu(`update profiles set username = 'sim_${ad}_${id.slice(0, 6)}', takma_ad = 'sim_${ad}_${id.slice(0, 6)}'
      ${bot ? `, is_bot = true, bot_turu = 'gizli', bot_isabet = ${taban}, bot_gecikme_min = 2, bot_gecikme_max = 8` : ''} where id = '${id}'`);
    for (const k of KAT) {
      const acc = Math.min(0.95, Math.max(0.1, taban + (Math.random() * 0.24 - 0.12)));
      await db.sorgu(`insert into pg_temp.sim_acc values ('${id}', '${k}', ${acc})`);
      await db.sorgu(`insert into kategori_istatistik (user_id, kategori, dogru, toplam) values ('${id}', '${k}', ${Math.round(30 * acc)}, 30)
        on conflict (user_id, kategori) do update set dogru = excluded.dogru, toplam = 30`);
      if (bot) await db.sorgu(`insert into bot_kategori_sapma (bot_id, kategori, sapma) values ('${id}', '${k}', ${Math.round((acc - taban) * 100)})
        on conflict do nothing`);
    }
    await db.sorgu(`select nabiz_yaz('${id}')`);
    return id;
  }
  for (const [sv, [g, z]] of Object.entries(SEVIYE)) {
    oyuncular[sv] = { ig: await yeni(`${sv}_ig`, g, false), iz: await yeni(`${sv}_iz`, z, false),
                      bg: await yeni(`${sv}_bg`, g, true), bz: await yeni(`${sv}_bz`, z, true) };
  }
  console.log(`sahte oyuncular hazır (${Object.keys(SEVIYE).length * 4}), maç: ${N * 9}`);

  const bas = Date.now();
  for (const tur of TURLER) {
    for (const sv of Object.keys(SEVIYE)) {
      const o = oyuncular[sv];
      // güçlü taraf: insan-bot'ta yarısı insan güçlü, yarısı bot güçlü
      for (let i = 0; i < N; i++) {
        let p1, p2;
        if (tur === 'bot-bot') { p1 = o.bg; p2 = o.bz; }
        else if (tur === 'insan-insan') { p1 = o.ig; p2 = o.iz; }
        else if (i % 2 === 0) { p1 = o.ig; p2 = o.bz; } else { p1 = o.bg; p2 = o.iz; }
        // 20 maçta bir kayıt noktasına geri dön: tek işlemde ~100 bin satır sürümü birikip taramaları yavaşlatmasın
        // (sonuçlar JS'te; dış işlem ve sondaki ROLLBACK aynen).
        if (i % 20 === 0) await db.sorgu('savepoint parti');
        const r = JSON.parse(await tek(`select pg_temp.sim_mac('${p1}', '${p2}')::text`));
        r.tur_ = tur; r.sv = sv; r.guclu = p1;
        sonuclar.push(r);
        if (i % 20 === 19 || i === N - 1) await db.sorgu('rollback to savepoint parti');
      }
      console.log(`  ${tur} / ${sv}: ${N} maç · ${Math.round((Date.now() - bas) / 1000)} sn`);
    }
  }
} catch (err) {
  console.error('HATA:', err.message);
  process.exitCode = 1;
} finally {
  try { await db.sorgu('rollback'); } catch { /* */ }
  clearTimeout(bekci);
  const artik = await db.sorgu(`select count(*)::text n from pg_stat_activity where application_name = '${UYGULAMA}' and pid <> pg_backend_pid()`).catch(() => [{ n: '?' }]);
  await db.kapat();
  console.log(`ROLLBACK · artık oturum: ${artik[0].n}`);
}

// ---------------------------------------------------------------- rapor
if (sonuclar.length) {
  const ort = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const yuzde = (n, t) => `%${t ? ((100 * n) / t).toFixed(1) : '0'}`;
  const ozet = (R, ad) => {
    const tamam = R.filter((r) => !r.hata && r.durum === 'bitti');
    const son = tamam.filter((r) => r.son).length;
    const seri = tamam.filter((r) => r.seri_bitis).length;
    const guclu = tamam.filter((r) => r.kazanan === r.guclu).length;
    return `${ad.padEnd(22)} n=${String(R.length).padStart(4)} hata=${R.filter((r) => r.hata).length} · tur ort ${ort(tamam.map((r) => r.tur)).toFixed(1)}`
      + ` · soru ort ${ort(tamam.map((r) => r.soru)).toFixed(1)} · süre ort ${(ort(tamam.map((r) => r.sure)) / 60).toFixed(1)} dk`
      + ` · 3/3 ${yuzde(seri, tamam.length)} · Son Düello ${yuzde(son, tamam.length)} · güçlü kazandı ${yuzde(guclu, tamam.length)}`
      + ` · 5 nötr ${tamam.filter((r) => r.notr5).length} · havuz sıfır ${tamam.reduce((x, r) => x + r.reset, 0)}`
      + ` · el değişimi ort ${ort(tamam.map((r) => r.el)).toFixed(1)}`;
  };
  console.log('\n=== RAPOR ===');
  console.log(ozet(sonuclar, 'TOPLAM'));
  for (const t of TURLER) for (const sv of Object.keys(SEVIYE)) console.log(ozet(sonuclar.filter((r) => r.tur_ === t && r.sv === sv), `${t}/${sv}`));
  const h = sonuclar.filter((r) => r.hata);
  if (h.length) console.log('HATALAR:', JSON.stringify(h.slice(0, 5)));
  console.log('takılan (600 adım):', sonuclar.filter((r) => r.hata === 'takildi').length,
    '· bitmeyen:', sonuclar.filter((r) => !r.hata && r.durum !== 'bitti').length,
    '· null alanlı hamle:', sonuclar.reduce((x, r) => x + (r.null_alan || 0), 0),
    '· maks adım:', Math.max(...sonuclar.map((r) => r.adim || 0)),
    '· maks tur:', Math.max(...sonuclar.map((r) => r.tur || 0)),
    '· maks soru:', Math.max(...sonuclar.map((r) => r.soru || 0)));
  const bg = sonuclar.reduce((a, r) => [a[0] + (r.bg?.[0] || 0), a[1] + (r.bg?.[1] || 0)], [0, 0]);
  const bs = sonuclar.reduce((a, r) => [a[0] + (r.bs?.[0] || 0), a[1] + (r.bs?.[1] || 0)], [0, 0]);
  console.log(`bot kart: rakibin en zayıfını gönderdi ${yuzde(bg[0], bg[1])} (${bg[0]}/${bg[1]}) · kendine en güçlüsünü aldı ${yuzde(bs[0], bs[1])} (${bs[0]}/${bs[1]})`);
  const ornekler = sonuclar.flatMap((r) => r.ornek || []).slice(0, 3);
  for (const o of ornekler) console.log('  örnek:', o.kartlar.map((k) => `${k.k}(rakip %${k.rakip}, bot ${k.bot_isabet})`).join(' '), '→ gönderdi', o.gonderdi, '· aldı', o.aldi);
  const sureler = sonuclar.filter((r) => !r.hata).map((r) => r.sure).sort((a, b) => a - b);
  console.log(`süre dağılımı: medyan ${(sureler[Math.floor(sureler.length / 2)] / 60).toFixed(1)} dk · %90 ${(sureler[Math.floor(sureler.length * 0.9)] / 60).toFixed(1)} dk · maks ${(sureler.at(-1) / 60).toFixed(1)} dk`);
  fs.writeFileSync(new URL('../araclar/.duello-v4-simulasyon-son.json', import.meta.url), JSON.stringify(sonuclar.map(({ ornek, ...r }) => r)));
}
