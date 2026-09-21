import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  AKTIF_MAC_SKILLERI,
  KLASIK_JOKERLER,
  SALDIRI_JOKERLERI,
  SKILL_TANIMLARI,
  VARSAYILAN_SKILL_SETI,
  skillSlotSayisi,
} from "../lib/jokerler.js";
import { kalanSure, sunucuOffsetMs } from "../lib/zaman.js";

test("aktif maç skill listesi yeni Klasik skilllerini içerir", () => {
  assert.deepEqual(AKTIF_MAC_SKILLERI, ["elli", "sure", "soru_degistir", "zaman_baskisi", "sigorta", "cifte_puan", "ikinci_sans"]);
  assert.deepEqual(KLASIK_JOKERLER, AKTIF_MAC_SKILLERI);
  assert.deepEqual(SALDIRI_JOKERLERI, ["zaman_baskisi"]);
  assert.deepEqual(VARSAYILAN_SKILL_SETI, ["elli", "sure", "soru_degistir"]);
});

test("Sigorta ve 2X yalnız Klasik, İkinci Şans Klasik ve Düello içindir", () => {
  assert.deepEqual(SKILL_TANIMLARI.sigorta.allowedModes, ["1v1"]);
  assert.deepEqual(SKILL_TANIMLARI.cifte_puan.allowedModes, ["1v1"]);
  assert.deepEqual(SKILL_TANIMLARI.ikinci_sans.allowedModes, ["1v1", "duello"]);
});

test("kaldırılan combat skillleri geçmiş uyumluluğu için kayıtlı ama pasif ve mağazada gizli", () => {
  for (const id of ["sis", "savunma_kilidi", "saldiri_degistir"]) {
    assert.equal(SKILL_TANIMLARI[id].aktif, false);
    assert.equal(SKILL_TANIMLARI[id].shopVisible, false);
  }
  assert.equal(SKILL_TANIMLARI.seri_koruma.macIci, false);
});

test("slot sayısı tek config kaynağından okunur ve güvenli varsayılana döner", () => {
  assert.equal(skillSlotSayisi({ skill_seti_slot: 4 }), 4);
  assert.equal(skillSlotSayisi({ skill_seti_slot: 0 }), 3);
  assert.equal(skillSlotSayisi({}), 3);
});

test("migration seçim kapısını ve kişisel soru değişimini server-side uygular", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/20260612000254_skill_sistemi_v1.sql", import.meta.url), "utf8");
  assert.match(sql, /skill_setimi_kaydet/);
  assert.match(sql, /Bu skill maç setinde değil/);
  assert.match(sql, /if p_tur <> 'zaman_baskisi' then return/);
  assert.doesNotMatch(sql, /values\('1v1',p_mac_id,v_rakip,p_index,v_ben_soru/);
  assert.match(sql, /array\['zaman_baskisi','soru_degistir'\]/);
});

test("hardening migrationı Klasik 6/2/1 ve tek Düello saldırısını uygular", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/20260612000255_skill_hardening.sql", import.meta.url), "utf8");
  assert.match(sql, /klasik_skill_toplam_hak', '6'/);
  assert.match(sql, /klasik_skill_tur_basi_hak', '2'/);
  assert.match(sql, /klasik_skill_soru_basi_hak', '1'/);
  assert.match(sql, /if p_tur <> 'zaman_baskisi'/);
  assert.match(sql, /p_tur not in \('elli','sure','soru_degistir'\)/);
});

test("genişletme migrationı puanları, ikinci seçimi ve rövanş iptalini sunucuda uygular", async () => {
  const sql = await readFile(new URL("../../supabase/migrations/20260612000266_skill_mobil_deneyim.sql", import.meta.url), "utf8");
  assert.match(sql, /v_skill='cifte_puan' then 20/);
  assert.match(sql, /v_skill='sigorta' then 5/);
  assert.match(sql, /tekrar_hakki boolean/);
  assert.match(sql, /skill_ikinci_sans_denemeleri/);
  assert.match(sql, /Bu skill Düello modunda kullanılamaz/);
  assert.match(sql, /duello_rovans_iptal/);
  assert.match(sql, /least\(v_carpan,public\.ayar_ondalik\('saf_bilgi_odul_carpani',0\.5\)\)/);
});

test("sunucu saat farkı ağ isteğinin orta noktasından hesaplanır", () => {
  const sunucu = "2026-09-20T12:00:00.000Z";
  const ornek = Date.parse(sunucu) - 250;
  assert.equal(sunucuOffsetMs(sunucu, ornek), 250);
  const baslangic = "2026-09-20T11:59:50.000Z";
  const gercekNow = Date.now;
  Date.now = () => Date.parse(sunucu) - 250;
  try { assert.equal(kalanSure(baslangic, 250, 15), 5); }
  finally { Date.now = gercekNow; }
});
