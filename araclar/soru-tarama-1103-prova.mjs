// Migration 1103 (soru tarama kararları + EN paketi) ölçümlü provası: ölç → uygula → ölç → ROLLBACK.
// --olc: yalnız mevcut durumu ölçer (uygulamadan sonra doğrulama için).
// Kategori aktif sayısı %20'den fazla düşerse çıkış kodu 2.
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';

const DOSYA = 'supabase/migrations/20260612001103_soru_tarama_karar_en.sql';
const yalnizOlc = process.argv.includes('--olc');
const db = await new PgIstemci(await baglantiDizgisi()).baglan();
const satir = r => r.rows ?? r;

async function olc() {
  const genel = satir(await db.sorgu(`select
      count(*) filter (where q.aktif) aktif,
      count(*) filter (where q.aktif and (q.dil = 'en' or exists (select 1 from public.question_translations t
        where t.question_id = q.id and t.dil = 'en' and not t.eskidi))) en_li_aktif,
      count(*) filter (where q.aktif and not (q.denetim_durumu = 'bekliyor'
        and q.supheli_agirlik >= public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)::int)) rekabetci,
      count(*) filter (where q.aktif and q.denetim_durumu = 'onaylandi') onayli
    from public.questions q`))[0];
  const kat = satir(await db.sorgu(`select kategori, count(*) filter (where aktif) n from public.questions group by 1 order by 1`));
  return { genel, kat: Object.fromEntries(kat.map(k => [k.kategori, +k.n])) };
}

try {
  await db.sorgu("set statement_timeout = '120s'");
  if (yalnizOlc) {
    console.log(JSON.stringify(await olc(), null, 1));
  } else {
    await db.sorgu('begin');
    const once = await olc();
    await db.sorgu(fs.readFileSync(DOSYA, 'utf8'));
    const sonra = await olc();
    const kontrol = satir(await db.sorgu(`select
        (select count(*) from public.soru_denetim where kaynak = 'codex_tarama_1103') denetim_satiri,
        (select count(*) from public.question_translations where dil = 'en' and eskidi and eskidi_at > now() - interval '5 minutes') en_eskidi,
        (select count(*) from public.ceviri_atlanan where kod = 'denetim_1103') en_atlanan`))[0];
    await db.sorgu('rollback');
    console.log('Genel önce :', JSON.stringify(once.genel));
    console.log('Genel sonra:', JSON.stringify(sonra.genel));
    console.log('Kontrol    :', JSON.stringify(kontrol));
    let dur = false;
    for (const k of Object.keys({ ...once.kat, ...sonra.kat })) {
      const a = once.kat[k] ?? 0, b = sonra.kat[k] ?? 0;
      const yuzde = a ? ((b - a) / a * 100) : 0;
      if (yuzde < -20) dur = true;
      console.log(`${k.padEnd(14)} ${String(a).padStart(6)} → ${String(b).padStart(6)}  ${yuzde.toFixed(1)}%${yuzde < -20 ? '  ✗ DUR' : ''}`);
    }
    console.log(dur ? 'SONUÇ: bir kategoride %20+ düşüş — DUR' : 'SONUÇ: hiçbir kategoride %20+ düşüş yok (ROLLBACK edildi)');
    if (dur) process.exitCode = 2;
  }
} finally {
  await db.kapat();
}
