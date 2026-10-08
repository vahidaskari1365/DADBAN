/**
 * دیپلوی مستقیم DADBAN به Vercel بدون نیاز به اتصال Git در داشبورد
 *
 * Usage:
 *   bun scripts/vercel-deploy.ts <VERCEL_TOKEN> [--mode auto|git|files] [--wait]
 *
 * مراحل:
 *  1) یافتن پروژهٔ dadban-brown و نمایش وضعیت link
 *  2) تلاش برای دیپلوی production از git (gitSource)
 *  3) fallback: دیپلوی file-upload (کل کد مستقیم آپلود می‌شود — به گیت‌هاب/اتصال کاری ندارد)
 *  4) پایش تا READY/ERROR و چاپ URL
 */

const API = 'https://api.vercel.com';
const PROJECT = 'dadban-brown';
const GIT_ORG = 'vahidaskari1365';
const GIT_REPO = 'DADBAN';
const GIT_REF = 'main';

const args = process.argv.slice(2);
const token = args.find((a) => !a.startsWith('--')) ?? process.env.VERCEL_TOKEN;
const modeArg = args.find((a) => a === '--mode=git' || a === '--mode=files' || a === '--mode=auto');
const mode = modeArg ? modeArg.split('=')[1] : 'auto';

if (!token) {
  console.error('✗ توکن Vercel لازم است: bun scripts/vercel-deploy.ts <TOKEN>');
  process.exit(1);
}

type Json = Record<string, unknown>;

async function api<T = Json>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  if (!res.ok) {
    const msg = typeof body === 'object' && body ? JSON.stringify(body).slice(0, 500) : text.slice(0, 500);
    throw new Error(`API ${res.status} ${path}: ${msg}`);
  }
  return body as T;
}

async function jjson(res: Response): Promise<Json> {
  const text = await res.text();
  try {
    return JSON.parse(text) as Json;
  } catch {
    throw new Error(`پاسخ نامعتبر (${res.status}): ${text.slice(0, 300)}`);
  }
}

async function findProject(): Promise<{ id: string; orgId: string; name: string; link: unknown } | null> {
  const data = await api<{ projects: Array<Json> }>('/v9/projects?limit=100');
  for (const p of data.projects) {
    if (p.name === PROJECT) {
      console.log(`✓ پروژه پیدا شد: ${p.name} (id=${p.id})`);
      console.log(`  link = ${JSON.stringify(p.link ?? null)}`);
      return { id: p.id as string, orgId: p.accountId as string, name: p.name as string, link: p.link };
    }
  }
  console.error(`✗ پروژهٔ ${PROJECT} در این حساب یافت نشد؛ پروژه‌های موجود:`);
  for (const p of data.projects) console.error(`  - ${p.name}`);
  return null;
}

async function deployFromGit(): Promise<string> {
  console.log('→ تلاش دیپلوی از گیت (gitSource) …');
  const res = await fetch(`${API}/v13/deployments?skipAutoDetectionConfirmation=1`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: PROJECT,
      project: PROJECT,
      target: 'production',
      gitSource: { type: 'github', org: GIT_ORG, repo: GIT_REPO, ref: GIT_REF },
    }),
  });
  const body = await jjson(res);
  if (!res.ok) throw new Error(`gitSource ناموفق: ${JSON.stringify(body).slice(0, 400)}`);
  const d = body as { id: string; url?: string; readyState?: string };
  console.log(`✓ دیپلوی گیت ساخته شد: id=${d.id} url=${d.url ?? ''}`);
  return d.id;
}

function collectFiles(): Array<{ path: string; data: Buffer }> {
  const root = '/home/z/my-project';
  const out: Array<{ path: string; data: Buffer }> = [];
  const skipDirs = new Set([
    'node_modules', '.next', '.git', '.vercel', 'db', 'scripts', 'mini-services',
    '.turbo', '.cache', 'coverage', 'dist',
  ]);
  const skipFiles = new Set(['.env', '.env.local', 'dev.log', 'worklog.md', 'bun.lockb', 'yarn.lock', 'package-lock.json']);
  const walk = (dir: string) => {
    for (const e of require('fs').readdirSync(dir, { withFileTypes: true })) {
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        if (skipDirs.has(e.name)) continue;
        walk(full);
      } else {
        if (skipFiles.has(e.name) || e.name.endsWith('.db') || e.name.endsWith('.log')) continue;
        const data = require('fs').readFileSync(full);
        out.push({ path: full.slice(root.length + 1), data });
      }
    }
  };
  walk(root);
  return out;
}

async function deployFromFiles(): Promise<string> {
  console.log('→ دیپلوی file-upload (بدون وابستگی به گیت) …');
  const files = collectFiles();
  console.log(`  تعداد فایل‌ها: ${files.length}`);
  // 1) sha1 هر فایل
  const crypto = require('crypto') as typeof import('crypto');
  const manifest = files.map((f) => {
    const sha = crypto.createHash('sha1').update(f.data).digest('hex');
    return { sha, size: f.data.length, path: f.path, data: f.data };
  });
  // 2) آپلود فقط فایل‌هایی که شاید نباشند (POST /v2/files برای همه ساده‌تر است ولی limit دارد؛ دسته‌ای)
  const CHUNK = 50;
  for (let i = 0; i < manifest.length; i += CHUNK) {
    const chunk = manifest.slice(i, i + CHUNK);
    for (const f of chunk) {
      const res = await fetch(`${API}/v2/files`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/octet-stream',
          'x-vercel-digest': f.sha,
        },
        body: new Uint8Array(f.data),
      });
      if (!res.ok && res.status !== 409) {
        const t = await res.text();
        if (res.status !== 400 || !t.includes('already')) {
          throw new Error(`آپلود ${f.path} ناموفق (${res.status}): ${t.slice(0, 200)}`);
        }
      }
    }
    console.log(`  آپلود شد: ${Math.min(i + CHUNK, manifest.length)}/${manifest.length}`);
  }
  // 3) ساخت دیپلوی production متصل به پروژهٔ موجود
  const payload = {
    name: PROJECT,
    project: PROJECT,
    target: 'production',
    files: manifest.map((f) => ({ sha: f.sha, size: f.size, path: f.path })),
    projectSettings: { framework: 'nextjs' },
    skipAutoDetectionConfirmation: true,
  };
  const res = await fetch(`${API}/v13/deployments`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await jjson(res);
  if (!res.ok) throw new Error(`files-deploy ناموفق: ${JSON.stringify(body).slice(0, 400)}`);
  const d = body as { id: string };
  console.log(`✓ دیپلوی file-upload ساخته شد: id=${d.id}`);
  return d.id;
}

async function waitDeployment(id: string, timeoutMs = 600000): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    await new Promise((r) => setTimeout(r, 10000));
    const d = await api<{ readyState: string; url: string; errorMessage?: string; buildingAt?: number }>(`/v13/deployments/${id}`);
    console.log(`  وضعیت: ${d.readyState} (${Math.round((Date.now() - t0) / 1000)}s)`);
    if (d.readyState === 'READY') {
      console.log(`✓ دیپلوی READY → https://${d.url}`);
      return true;
    }
    if (d.readyState === 'ERROR' || d.readyState === 'CANCELED') {
      console.error(`✗ دیپلوی ${d.readyState}: ${d.errorMessage ?? 'بدون پیام'}`);
      return false;
    }
  }
  console.error('✗ timeout');
  return false;
}

async function main() {
  const proj = await findProject();
  if (!proj) process.exit(2);

  let depId: string | null = null;
  if (mode === 'git' || mode === 'auto') {
    try {
      depId = await deployFromGit();
    } catch (e) {
      console.error(String(e).slice(0, 300));
      if (mode === 'auto') console.log('→ fallback به file-upload …');
      else process.exit(3);
    }
  }
  if (!depId && (mode === 'files' || mode === 'auto')) {
    depId = await deployFromFiles();
  }
  if (!depId) {
    console.error('✗ هیچ دیپلوی ساخته نشد');
    process.exit(4);
  }
  const ok = await waitDeployment(depId);
  process.exit(ok ? 0 : 5);
}

main().catch((e) => {
  console.error('✗', e);
  process.exit(1);
});
