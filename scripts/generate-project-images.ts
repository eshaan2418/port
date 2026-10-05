/**
 * Generate project tile images once, at build-prep time (never at runtime).
 *
 *   IMAGE_PROVIDER=openai npx tsx scripts/generate-project-images.ts
 *   npx tsx scripts/generate-project-images.ts --force          # regenerate all
 *   npx tsx scripts/generate-project-images.ts --only=distdata  # one project
 *
 * Reads keys from .env.local. Providers (IMAGE_PROVIDER):
 *   openai     OPENAI_API_KEY        (model: OPENAI_IMAGE_MODEL, default gpt-image-1)
 *   gemini     GEMINI_API_KEY        (model: GEMINI_IMAGE_MODEL, default imagen-4.0-generate-001)
 *   replicate  REPLICATE_API_TOKEN   (model: REPLICATE_MODEL, default black-forest-labs/flux-1.1-pro)
 *
 * Output: public/projects/<slug>.webp at 1600×1000, plus a tiny blur
 * placeholder per image in data/project-images.json. Existing files are
 * skipped unless --force. Commit the outputs.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import sharp from "sharp";
import { projects } from "../data/projects";

config({ path: ".env.local" });

export const STYLE_PREFIX =
  "Cinematic editorial still life, premium luxury product-photography aesthetic, deep near-black background with warm cream highlights, a restrained palette of Hermès orange (#F37021) and Tiffany blue (#81D8D0) as the only accent colors, soft studio lighting, subtle film grain, shallow depth of field, 3D-rendered glossy and matte materials, centered composition with negative space, no text, no letters, no logos, no UI screenshots, no people.";

const OUT_DIR = path.join(process.cwd(), "public", "projects");
const META_FILE = path.join(process.cwd(), "data", "project-images.json");
const WIDTH = 1600;
const HEIGHT = 1000;

type Provider = (prompt: string) => Promise<Buffer>;

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} (add it to .env.local)`);
  return v;
}

const providers: Record<string, Provider> = {
  async openai(prompt) {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
        prompt,
        size: "1536x1024",
        quality: "high",
        n: 1,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { data: { b64_json: string }[] };
    return Buffer.from(json.data[0].b64_json, "base64");
  },

  async gemini(prompt) {
    const model = process.env.GEMINI_IMAGE_MODEL ?? "imagen-4.0-generate-001";
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": requireEnv("GEMINI_API_KEY"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1, aspectRatio: "16:9" },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { predictions: { bytesBase64Encoded: string }[] };
    return Buffer.from(json.predictions[0].bytesBase64Encoded, "base64");
  },

  async replicate(prompt) {
    const model = process.env.REPLICATE_MODEL ?? "black-forest-labs/flux-1.1-pro";
    const res = await fetch(`https://api.replicate.com/v1/models/${model}/predictions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${requireEnv("REPLICATE_API_TOKEN")}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: { prompt, aspect_ratio: "3:2", output_format: "png", safety_tolerance: 2 },
      }),
    });
    if (!res.ok) throw new Error(`Replicate ${res.status}: ${await res.text()}`);
    let prediction = (await res.json()) as {
      status: string;
      output?: string | string[];
      error?: string;
      urls: { get: string };
    };
    // "Prefer: wait" usually returns the finished prediction; poll if not.
    while (prediction.status === "starting" || prediction.status === "processing") {
      await new Promise((r) => setTimeout(r, 2000));
      const poll = await fetch(prediction.urls.get, {
        headers: { Authorization: `Bearer ${requireEnv("REPLICATE_API_TOKEN")}` },
      });
      prediction = await poll.json();
    }
    if (prediction.status !== "succeeded" || !prediction.output) {
      throw new Error(`Replicate failed: ${prediction.error ?? prediction.status}`);
    }
    const url = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
    return Buffer.from(await (await fetch(url)).arrayBuffer());
  },
};

async function exists(file: string) {
  return fs
    .access(file)
    .then(() => true)
    .catch(() => false);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.find((a) => a.startsWith("--only="))?.split("=")[1];

  const name = process.env.IMAGE_PROVIDER;
  const provider = name ? providers[name] : undefined;
  if (!provider) {
    throw new Error(
      `Set IMAGE_PROVIDER to one of: ${Object.keys(providers).join(", ")} (got "${name ?? ""}")`,
    );
  }

  await fs.mkdir(OUT_DIR, { recursive: true });
  const meta: Record<string, { blurDataURL: string }> = JSON.parse(
    await fs.readFile(META_FILE, "utf8").catch(() => "{}"),
  );

  const queue = projects.filter((p) => !only || p.slug === only);
  for (const p of queue) {
    const file = path.join(OUT_DIR, `${p.slug}.webp`);
    if (!force && (await exists(file))) {
      console.log(`· skip ${p.slug} (exists)`);
      continue;
    }
    const prompt = `${STYLE_PREFIX} Subject: ${p.imagePrompt}.`;
    console.log(`→ ${p.slug} via ${name}`);
    try {
      const raw = await provider(prompt);
      const img = sharp(raw).resize(WIDTH, HEIGHT, { fit: "cover", position: "attention" });
      await img.clone().webp({ quality: 82 }).toFile(file);
      const blur = await img.clone().resize(16, 10).webp({ quality: 40 }).toBuffer();
      meta[p.slug] = { blurDataURL: `data:image/webp;base64,${blur.toString("base64")}` };
      await fs.writeFile(META_FILE, JSON.stringify(meta, null, 2) + "\n");
      console.log(`  ✓ public/projects/${p.slug}.webp`);
    } catch (err) {
      console.error(`  ✗ ${p.slug}: ${(err as Error).message}`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
