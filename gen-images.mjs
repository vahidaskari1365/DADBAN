import ZAI from 'z-ai-web-dev-sdk';
import fs from 'fs';
const prompts = JSON.parse(fs.readFileSync('/tmp/img_prompts.json', 'utf8'));
const outDir = '/home/z/my-project/public/articles';
fs.mkdirSync(outDir, { recursive: true });
const tasks = Object.entries(prompts).filter(([slug]) => {
  const p = `${outDir}/${slug}.png`;
  if (fs.existsSync(p) && fs.statSync(p).size > 10000) { console.log('SKIP', slug); return false; }
  return true;
});
const zai = await ZAI.create();
async function gen([slug, prompt]) {
  const out = `${outDir}/${slug}.png`;
  for (let a = 1; a <= 2; a++) {
    try {
      const r = await zai.images.generations.create({ prompt, size: '1344x768' });
      const b64 = r?.data?.[0]?.base64;
      if (!b64) throw new Error('empty base64');
      fs.writeFileSync(out, Buffer.from(b64, 'base64'));
      console.log('OK', slug, fs.statSync(out).size);
      return;
    } catch (e) { console.log('ERR', slug, 'attempt', a, e.message?.slice(0,80)); await new Promise(r=>setTimeout(r,3000)); }
  }
  console.log('FAIL', slug);
}
const CONC = 3;
let i = 0;
async function worker() {
  while (i < tasks.length) { const t = tasks[i++]; await gen(t); }
}
await Promise.all(Array.from({length: CONC}, worker));
console.log('ALL DONE');
