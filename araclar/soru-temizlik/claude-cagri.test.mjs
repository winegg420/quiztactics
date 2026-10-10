// Maliyet hesabı doğrulaması: node araclar/soru-temizlik/claude-cagri.test.mjs (API çağrısı yok)
import assert from 'node:assert/strict';
import { modelUsd, kullanimEkle, iptalEkle } from './claude-cagri.mjs';

// Elle hesap — Opus 5.5 (girdi $4, çıktı $20, okuma 0,05×, yazma 5dk 1,25× / 1sa 2×):
//  girdi 100.000 → 0,40 · 5dk yazma 50.000×1,25 = 62.500 → 0,25 · 1sa yazma 10.000×2 = 20.000 → 0,08
//  okuma 400.000×0,05 = 20.000 → 0,08 · çıktı 30.000 → 0,60  ⇒ toplam 1,41
const o = {};
kullanimEkle(o, { input_tokens: 100000, output_tokens: 30000, cache_creation_input_tokens: 60000, cache_creation: { ephemeral_1h_input_tokens: 10000 }, cache_read_input_tokens: 400000 });
assert.equal(o.cagri, 1);
assert.ok(Math.abs(modelUsd('claude-opus-5-5', o) - 1.41) < 1e-9, `opus ${modelUsd('claude-opus-5-5', o)}`);

// Sonnet 5.5 ($2/$10, okuma 0,1×): girdi 1M → 2 · okuma 1M×0,1 → 0,2 · çıktı 100.000 → 1  ⇒ 3,2
const s = {};
kullanimEkle(s, { input_tokens: 1e6, output_tokens: 1e5, cache_read_input_tokens: 1e6 });
assert.ok(Math.abs(modelUsd('claude-sonnet-5-5', s) - 3.2) < 1e-9);

// Zaman aşımı (Opus): girdi 30.000 karakter → 10.000 jeton (0,04) + maxJeton 16.000 çıktı (0,32) ⇒ 0,36
const z = {};
iptalEkle(z, { istemKarakter: 30000, maxJeton: 16000, zamanAsimi: true });
assert.ok(Math.abs(modelUsd('claude-opus-5-5', z) - 0.36) < 1e-9);
// Kopma (zaman aşımı değil): yalnız girdi ⇒ 0,04
const k = {};
iptalEkle(k, { istemKarakter: 30000, maxJeton: 16000, zamanAsimi: false });
assert.ok(Math.abs(modelUsd('claude-opus-5-5', k) - 0.04) < 1e-9);

// Eski durum.json (yeni alanlar yok) hâlâ hesaplanır
assert.ok(modelUsd('claude-opus-5-5', { girdi: 1e6, cikti: 1e6, cagri: 1 }) === 24);
console.log('claude-cagri maliyet testi: TAMAM');
