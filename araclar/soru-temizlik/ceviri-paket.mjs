// supabase/functions/generate-questions/ceviri.ts saf mantığını (istemler, şemalar, makine kontrolleri, karar) Node'da kullanılabilir yapar.
// esbuild ile paketlenir (kalite.ts dahil) — ceviri-test.mjs ile aynı yöntem; mantık KOPYALANMAZ, tek kaynak ceviri.ts.
import path from 'node:path';
import { build } from 'esbuild';
import { KOK } from '../soru_denetim/ortak.mjs';

const cikti = await build({
  entryPoints: [path.join(KOK, 'supabase', 'functions', 'generate-questions', 'ceviri.ts')],
  bundle: true, write: false, format: 'esm', platform: 'neutral',
});
export const C = await import('data:text/javascript;base64,' + Buffer.from(cikti.outputFiles[0].text).toString('base64'));
