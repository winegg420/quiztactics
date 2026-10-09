// Test hesaplarını temizler. Varsayılan DRY-RUN; --uygula ile yedekler ve tek transaction'da siler.
// Kural (Ida): test hesapları iş bitince sormadan silinir; sahip, botlar ve gerçek oyuncular ASLA.
// Kullanım: IZIN_CANLI_TEST=1 node araclar/test-hesap-temizle.mjs [--uygula]
// Aday = anonim + e-postasız + bot değil + hile_yetkisi yok + push aboneliği yok + test betiği adlandırması.
// Adı belirsiz hesaplar (ör. "Oyuncu", "sila") silinmez; "belirsiz" diye listelenir.
import fs from 'node:fs';
import { PgIstemci, baglantiDizgisi } from './pg-mini.mjs';

const SAHIP_ID = 'e4f6006f-d6bb-4ca8-be67-3bdf9efc9708';
const TEST_AD = '^(deneme[0-9]*|test[a-z]*[0-9]*|testoyuncu[0-9]+|quiztestida|squaretest[0-9]+|arayuzdeneme|arayuzdenetim[0-9]+|hisdenetim[0-9]+|senkron[ab][0-9]+|aja[nı][a-z]*[0-9]+|duel[ab][0-9]+|gorev[ab][0-9]+|gecikme[ab][0-9]+|yenioyuncu[0-9]+|perftest[0-9]+|m1test[0-9]+|yenilemetest[0-9]+|canlitest[0-9]+|sahnetest[0-9]+)$';
const uygula = process.argv.includes('--uygula');
const tarih = new Date().toISOString().slice(0, 10);

const db = await new PgIstemci(await baglantiDizgisi()).baglan();
try {
  const aday = await db.sorgu(`select p.id, p.gorunen_ad ad, to_char(p.created_at,'YYYY-MM-DD') olusma, p.toplam_mac::int mac
    from public.profiles p join auth.users u on u.id = p.id
    where p.id <> '${SAHIP_ID}' and coalesce(p.is_bot,false) = false and coalesce(p.hile_yetkisi,false) = false
      and u.is_anonymous and coalesce(u.email,'') = '' and p.gorunen_ad ~* '${TEST_AD}'
      and not exists (select 1 from public.push_subscriptions s where s.user_id = p.id)
    order by p.created_at`);
  const idler = aday.map((a) => a.id).filter((i) => /^[0-9a-f-]{36}$/.test(i));
  console.log(`Aday: ${idler.length}`);
  for (const a of aday) console.log(`${a.id.slice(0, 8)} ${a.ad} ${a.olusma} mac=${a.mac}`);
  if (!uygula || !idler.length) { console.log(uygula ? 'Silinecek yok.' : 'DRY-RUN: silinmedi. --uygula ile sil.'); process.exit(0); }

  const liste = idler.map((i) => `'${i}'`).join(',');
  // Yedek: profiller ve profiles(id) / auth.users(id)'ye bağlı tüm satırlar (şifre hash'i, e-posta, jeton yok).
  const fk = await db.sorgu(`select c.conrelid::regclass::text tablo, a.attname kolon from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid in ('public.profiles'::regclass, 'auth.users'::regclass) and array_length(c.conkey,1) = 1
      and c.conrelid::regclass::text not like 'auth.%'`);
  const yedek = { tarih, profiller: await db.sorgu(`select * from public.profiles where id in (${liste})`) };
  for (const f of fk) {
    try { yedek[`${f.tablo}.${f.kolon}`] = await db.sorgu(`select * from ${f.tablo} where ${f.kolon} in (${liste})`); }
    catch (e) { yedek[`${f.tablo}.${f.kolon}`] = `OKUNAMADI: ${e.message}`; }
  }
  const yol = `docs/test-hesap-yedek-${tarih}.json`;
  fs.writeFileSync(yol, JSON.stringify(yedek, null, 1));
  console.log(`Yedek yazıldı: ${yol}`);

  await db.sorgu('begin');
  try {
    await db.sorgu(`delete from auth.users where id in (${liste})`); // profil + bağlı satırlar cascade
    const kalan = await db.sorgu(`select count(*)::int n from public.profiles where id in (${liste})`);
    if (Number(kalan[0].n) !== 0) throw new Error(`Profil kaldı: ${kalan[0].n}`);
    await db.sorgu('commit');
    console.log(`Silindi: ${idler.length} hesap`);
  } catch (e) { await db.sorgu('rollback'); throw e; }
} finally { await db.kapat(); }
