// Şık denge kapısı — tek kaynak veritabanındaki public.soru_kural_isaretleri().
// Eşik burada KOPYALANMAZ; yalnız SQL üretilir, çağıran kendi bağlantısıyla çalıştırır
// (soru:iceri → ortak.mjs › sorgu, migration üreticileri → pg-mini).
//
// Rekabetçi havuzdan düşüren işaret: soru_isaret_agirligi(i) >= soru_rekabetci_haric_agirlik (2).
// NOT: soru_sec bu dışlamayı yalnız denetim_durumu = 'bekliyor' sorularda uygular;
// denetimden 'duzeltildi' / 'onaylandi' olarak geçen soru işaretli olsa da havuza girer.
// Bu yüzden kapı, yazmadan ÖNCE engellemek zorundadır.
import crypto from "node:crypto";
import { jsonSabit } from './ortak.mjs';
import { jevSor, choice } from "../jev.mjs";

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

// ---------------------------------------------------------------------------
// Şık ipucu kapısı (Jev, soru metni GİZLİ) — 23 Eyl 2026, Şerit S1.
// Jev'e yalnız dört şık (karıştırılmış) verilir; soruyu görmeden doğru şıkkı seçip ona
// > SIK_IPUCU_ESIK olasılık veriyorsa şıklar cevabı ele veriyor demektir → soru geçmez.
// Soru kalıbı havuz taramasıyla (araclar/jev-tarama/sik-ipucu.md) BİREBİR aynıdır;
// sonuçlar karşılaştırılabilir kalsın diye DEĞİŞTİRME. Havuzdaki takılanlar
// `sik_ipucu_jev` işaretini taşır (migration 298, ağırlık 2 → rekabetçi havuz dışı).
// Kullananlar: soru:iceri (düzeltmeler), soru-parti-1000/jev-kapi.mjs (üretim hattı).

export const SIK_IPUCU_ESIK = 0.8;
export const SIK_IPUCU_ISARET = "sik_ipucu_jev";

function karistir(dizi, tohum) {
  let a = parseInt(crypto.createHash("sha1").update(String(tohum)).digest("hex").slice(0, 8), 16) >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const d = dizi.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/**
 * Soru metni verilmeden şıkların cevabı ele verip vermediğini Jev'e sorar.
 * @param {string[]} secenekler dört şık (sıra önemsiz, karıştırılır)
 * @param {string} dogru doğru şıkkın metni
 * @param {string} [tohum] karıştırma tohumu (aynı içerik → aynı sıra)
 * @returns {Promise<{secim:string|null, pDogru:number|null, takildi:boolean, atlandi?:string, jeton:number}>}
 * Jev hatası fırlatılır — çağıran "kapı çalışmadı" diye ele alır (sessizce geçirmez).
 */
export async function sikIpucuTesti(secenekler, dogru, tohum = "") {
  const siklar = (secenekler ?? []).map((s) => String(s));
  if (siklar.length !== 4 || !siklar.includes(dogru)) return { secim: null, pDogru: null, takildi: false, atlandi: "4 şık / doğru şık yok", jeton: 0 };
  if (new Set(siklar).size !== siklar.length) return { secim: null, pDogru: null, takildi: false, atlandi: "yinelenen şık", jeton: 0 };
  const karisik = karistir(siklar, tohum + "|" + JSON.stringify(siklar));
  const kriter = Object.fromEntries(karisik.map((s) => [s, null]));
  const y = await jevSor(
    { not: "Bir bilgi yarışması sorusunun dört şıkkı. Soru metni gösterilmiyor.", siklar: karisik },
    { dogru: choice("Bir bilgi yarışması sorusunun şıkları bunlar; soruyu görmeden hangisi doğru cevap olabilir?", kriter) },
  );
  const a = y.answers?.dogru;
  if (!a) throw new Error("Jev yanıtında 'dogru' yok");
  const pDogru = Number(a.probabilities?.[dogru] ?? (a.choice === dogru ? a.confidence : 0));
  return { secim: a.choice, pDogru, takildi: a.choice === dogru && pDogru > SIK_IPUCU_ESIK, jeton: y.usage?.input_tokens ?? 0 };
}

/**
 * Denetim sonucunun yazılacak son hâli (değişmeyen alan mevcut satırdan) + satırda
 * sik_ipucu_jev işareti var mı. `onayla` şıkları değiştirmez; işaretli soru onaylanırsa
 * 'bekliyor'dan çıkıp ipucuyla rekabetçi havuza girerdi.
 * @param {{id:string, karar:string, secenekler?:string[], dogru_cevap?:number}[]} satirlar
 * @returns {string} {id, karar, secenekler(jsonb), dogru_cevap, isaretli} döndüren SQL
 */
export function sikIpucuSonHalSorgusu(satirlar) {
  return `
    with g as (
      select * from jsonb_to_recordset(${jsonSabit(satirlar)})
               as x(id uuid, karar text, secenekler jsonb, dogru_cevap smallint)
    )
    select g.id::text id, g.karar,
           coalesce(g.secenekler, q.secenekler) secenekler,
           coalesce(g.dogru_cevap, q.dogru_cevap) dogru_cevap,
           ('${SIK_IPUCU_ISARET}' = any(coalesce(q.supheli_isaretler, '{}'))) isaretli
      from g join public.questions q on q.id = g.id;`;
}
