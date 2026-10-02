// Generates 14 professional lawyer profile photos → public/lawyers/{slug}.jpg
// Run once: bun scripts/gen-lawyer-photos.ts
import ZAI from "z-ai-web-dev-sdk";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const OUT_DIR = path.join(process.cwd(), "public", "lawyers");
fs.mkdirSync(OUT_DIR, { recursive: true });

interface Spec { slug: string; gender: "male" | "female"; age: string; }

const LAWYERS: Spec[] = [
  { slug: "sohrab-mohammadi", gender: "male", age: "in his early 50s" },
  { slug: "neda-karimi", gender: "female", age: "in her late 30s" },
  { slug: "amirhossein-rostami", gender: "male", age: "in his mid 30s" },
  { slug: "mahsa-ebrahimi", gender: "female", age: "in her early 40s" },
  { slug: "reza-najafi", gender: "male", age: "in his mid 40s" },
  { slug: "sara-mousavi", gender: "female", age: "in her mid 30s" },
  { slug: "kaveh-ahmadi", gender: "male", age: "in his early 30s" },
  { slug: "leila-sadeghi", gender: "female", age: "in her early 40s" },
  { slug: "mohammadreza-ghasemi", gender: "male", age: "in his late 40s" },
  { slug: "fateme-nouri", gender: "female", age: "in her mid 30s" },
  { slug: "alireza-bahrami", gender: "male", age: "in his early 50s" },
  { slug: "zahra-farahmand", gender: "female", age: "in her mid 40s" },
  { slug: "hossein-alamdari", gender: "male", age: "in his early 40s" },
  { slug: "negar-soleimani", gender: "female", age: "in her early 30s" },
];

function promptFor(s: Spec): string {
  const base =
    "Professional corporate headshot portrait of an Iranian lawyer, " + s.age +
    ", warm confident subtle smile, looking at camera, realistic photography";
  const attire = s.gender === "male"
    ? "wearing an elegant dark navy suit with white shirt and tie"
    : "wearing professional formal attire with an elegant dark headscarf (hijab) and modest blazer";
  const style =
    "soft studio lighting, clean neutral light-gray office background, sharp focus on face, " +
    "head and shoulders framing, high-end law firm portrait style, photorealistic, high quality, detailed";
  return `${base}, ${attire}, ${style}`;
}

async function generateOne(zai: Awaited<ReturnType<typeof ZAI.create>>, s: Spec, attempt = 1): Promise<boolean> {
  const outPath = path.join(OUT_DIR, `${s.slug}.jpg`);
  if (fs.existsSync(outPath)) {
    console.log(`↷ exists, skip: ${s.slug}.jpg`);
    return true;
  }
  try {
    const res = await zai.images.generations.create({
      prompt: promptFor(s),
      size: "1024x1024",
    });
    const b64 = res?.data?.[0]?.base64;
    if (!b64) throw new Error("empty base64");
    const buf = Buffer.from(b64, "base64");
    await sharp(buf)
      .resize(512, 512, { fit: "cover", position: "attention" })
      .jpeg({ quality: 82 })
      .toFile(outPath);
    console.log(`✓ ${s.slug}.jpg`);
    return true;
  } catch (e) {
    console.error(`✗ ${s.slug} (attempt ${attempt}):`, e instanceof Error ? e.message : e);
    if (attempt < 3) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      return generateOne(zai, s, attempt + 1);
    }
    return false;
  }
}

async function main() {
  const zai = await ZAI.create();
  const failed: string[] = [];
  // concurrency 3
  const queue = [...LAWYERS];
  const workers = Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const s = queue.shift()!;
      const ok = await generateOne(zai, s);
      if (!ok) failed.push(s.slug);
    }
  });
  await Promise.all(workers);
  console.log(failed.length ? `FAILED: ${failed.join(", ")}` : "ALL DONE");
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
