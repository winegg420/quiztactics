// Üretimdeki skill sistemi nesnelerini salt-okunur olarak doğrular.
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';

const dizgi = await baglantiDizgisi();
if (!dizgi) throw new Error('Veritabanı bağlantı bilgisi bulunamadı.');

const db = await new PgIstemci(dizgi).baglan();
try {
  const [nesneler, ayarlar, migrationlar, migrationKolonlari] = await db.sorguCoklu(`
    select 'tablo:oyuncu_skill_setleri' as nesne,
           to_regclass('public.oyuncu_skill_setleri') is not null as var
    union all
    select 'fonksiyon:skill_setim',
           to_regprocedure('public.skill_setim()') is not null
    union all
    select 'fonksiyon:skill_setimi_kaydet',
           exists (
             select 1 from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'skill_setimi_kaydet'
           )
    union all
    select 'trigger:skill_kullanim_kapisi_trg',
           exists (
             select 1 from pg_trigger
             where tgname = 'skill_kullanim_kapisi_trg' and not tgisinternal
           );

    select anahtar, deger
      from public.oyun_ayarlari
     where anahtar in (
       'skill_seti_slot', 'skill_ek_sure_sn',
       'klasik_skill_toplam_hak', 'klasik_skill_tur_basi_hak',
       'klasik_skill_soru_basi_hak'
     )
     order by anahtar;

    select version
      from supabase_migrations.schema_migrations
     where version >= '20260612000250'
     order by version;

    select column_name,data_type,is_nullable,column_default
      from information_schema.columns
     where table_schema='supabase_migrations' and table_name='schema_migrations'
     order by ordinal_position;
  `);

  console.log(JSON.stringify({ nesneler, ayarlar, migrationlar, migrationKolonlari }, null, 2));
  const eksikler = nesneler.filter((satir) => satir.var !== 't');
  if (eksikler.length) process.exitCode = 2;
} finally {
  await db.kapat();
}
