// TEMPORARY project tiles: writes /public/projects/temp/<slug>.svg, a flat 16:10
// card per website project (dark, one simple red or white shape, the name in
// Inter). They stand in until the real photos are dropped in as
// /public/projects/<slug>.webp. The name is set in Inter from a tiny subset of
// the font embedded in each file (an <img> can't use the page's fonts).
// Run: npx tsx scripts/make-project-tiles.ts  (needs a subset font per tile:
// INTER_SUBSET_DIR=<dir with <slug>.woff2> — see README)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { websiteProjects } from "../data/website-projects";

const W = 1600, H = 1000;
const BG = "#0f0f0f", RED = "#e5262c", FG = "#ffffff";
const SHAPES = [
  (c: string) => `<circle cx="1210" cy="340" r="230" fill="${c}"/>`,
  (c: string) => `<rect x="1000" y="130" width="400" height="400" fill="${c}" transform="rotate(12 1200 330)"/>`,
  (c: string) => `<path d="M1210 90 L1450 560 L970 560 Z" fill="${c}"/>`,
];
const dir = process.env.INTER_SUBSET_DIR;

mkdirSync(new URL("../public/projects/temp/", import.meta.url), { recursive: true });
websiteProjects.forEach((p, i) => {
  const shape = SHAPES[i % SHAPES.length](i % 2 ? FG : RED);
  const font = dir && existsSync(`${dir}/${p.slug}.woff2`) ? readFileSync(`${dir}/${p.slug}.woff2`).toString("base64") : "";
  const face = font ? `<style>@font-face{font-family:T;src:url(data:font/woff2;base64,${font}) format("woff2");font-weight:500}</style>` : "";
  // a name that's too long for one line at full size gets a smaller size (it never truncates)
  const size = Math.min(150, Math.floor((W - 220) / (p.name.length * 0.58)));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<!-- TEMPORARY placeholder for ${p.name}: replace with /public/projects/${p.slug}.webp -->${face}` +
    `<rect width="${W}" height="${H}" fill="${BG}"/>` +
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" fill="none" stroke="#ffffff" stroke-opacity="0.14" stroke-width="2"/>${shape}` +
    `<text x="110" y="${H - 120}" fill="${FG}" font-family="T, Inter, Helvetica, Arial, sans-serif" font-weight="500" font-size="${size}" letter-spacing="${(-0.04 * size).toFixed(1)}">${p.name}</text></svg>`;
  writeFileSync(new URL(`../public/projects/temp/${p.slug}.svg`, import.meta.url), svg);
  console.log("wrote", p.slug, svg.length, "bytes", font ? "(Inter subset embedded)" : "(system sans fallback)");
});
