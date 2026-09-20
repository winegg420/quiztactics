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

test("aktif maç skill listesi yalnız v1 dört skillini içerir", () => {
  assert.deepEqual(AKTIF_MAC_SKILLERI, ["elli", "sure", "soru_degistir", "zaman_baskisi"]);
  assert.deepEqual(KLASIK_JOKERLER, AKTIF_MAC_SKILLERI);
  assert.deepEqual(SALDIRI_JOKERLERI, ["zaman_baskisi"]);
  assert.deepEqual(VARSAYILAN_SKILL_SETI, ["elli", "sure", "soru_degistir"]);
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
