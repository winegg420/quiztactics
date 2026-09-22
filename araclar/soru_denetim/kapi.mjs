// Şık denge kapısı — tek kaynak veritabanındaki public.soru_kural_isaretleri().
// Eşik burada KOPYALANMAZ; yalnız SQL üretilir, çağıran kendi bağlantısıyla çalıştırır
// (soru:iceri → ortak.mjs › sorgu, migration üreticileri → pg-mini).
//
// Rekabetçi havuzdan düşüren işaret: soru_isaret_agirligi(i) >= soru_rekabetci_haric_agirlik (2).
// NOT: soru_sec bu dışlamayı yalnız denetim_durumu = 'bekliyor' sorularda uygular;
// denetimden 'duzeltildi' / 'onaylandi' olarak geçen soru işaretli olsa da havuza girer.
// Bu yüzden kapı, yazmadan ÖNCE engellemek zorundadır.
import { jsonSabit } from './ortak.mjs';

/**
 * Ham (henüz veritabanında olmayan) sorular için kapı sorgusu.
 * @param {{anahtar:string, soru:string, secenekler:string[], dogru_cevap:number}[]} kayitlar
 * @returns {string} satır başına {anahtar, isaretler(text[]), agir(text[])} döndüren SQL
 */
export function hamKapiSorgusu(kayitlar) {
  return `
    with g as (
      select * from jsonb_to_recordset(${jsonSabit(kayitlar)})
               as x(anahtar text, soru text, secenekler jsonb, dogru_cevap smallint)
    ), b as (
      select g.anahtar, public.soru_kural_isaretleri(g.soru, g.secenekler, g.dogru_cevap) isaret from g
    )
    select b.anahtar,
           array_to_string(b.isaret, ',') isaretler,
           coalesce((select string_agg(i, ',') from unnest(b.isaret) i
                      where public.soru_isaret_agirligi(i) >= public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)), '') agir
      from b;`;
}

/**
 * Denetim düzeltmeleri için kapı sorgusu: değişmeyen alanlar mevcut satırdan tamamlanır.
 * @param {{id:string, soru?:string, secenekler?:string[], dogru_cevap?:number}[]} duzeltmeler
 * @returns {string} yalnız TAKILAN satırları {id, isaretler} döndüren SQL
 */
export function duzeltmeKapiSorgusu(duzeltmeler) {
  return `
    with g as (
      select * from jsonb_to_recordset(${jsonSabit(duzeltmeler)})
               as x(id uuid, soru text, secenekler jsonb, dogru_cevap smallint)
    ), b as (
      select g.id, public.soru_kural_isaretleri(
               coalesce(g.soru, q.soru),
               coalesce(g.secenekler, q.secenekler),
               coalesce(g.dogru_cevap, q.dogru_cevap)) isaret
        from g join public.questions q on q.id = g.id
    )
    select b.id::text id, string_agg(i, ', ') isaretler
      from b, unnest(b.isaret) i
     where public.soru_isaret_agirligi(i) >= public.ayar_sayi('soru_rekabetci_haric_agirlik', 2)
     group by b.id;`;
}
