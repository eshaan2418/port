"use client";

/**
 * A crowd of Open Peeps walking across the bottom of the hero, behind the
 * word and the character, on the black page.
 *
 * Adapted from "Skiper 39 Canvas_Landing_004 — React + Canvas" (Skiper UI,
 * author @gurvinder-singh02, https://gxuri.me, https://skiper-ui.com), which
 * its header says is "inspired by and adapted from
 * https://codepen.io/zadvorsky/pen/xxwbBQV", with the "illustration by
 * https://www.openpeeps.com/". The component's header states: "Free to use
 * and modify in both personal and commercial projects. Attribution to Skiper
 * UI is required when using the free version. No attribution required with
 * Skiper UI Pro." (Credited in the page footer; re-check the terms on
 * skiper-ui.com and openpeeps.com before publishing.)
 *
 * Kept from the original: slicing the sprite sheet into its 15 × 7 grid, the
 * GSAP walk (a 10 s straight walk across with a 0.25 s yoyo bob, each at a
 * random time scale of 0.5–1.5), depth sorting by anchor Y, recycling a
 * person once they've crossed, and devicePixelRatio handling.
 * Changed: the sheet is local and bundled (./peeps.png, served under a
 * content-hashed name, not from the CDN) and cut once into one small image
 * per person, each flipped for black (white linework, black fills), after a
 * check that the sheet is the expected grid (else no crowd at all); a set number of people walk at once (by width); people are small and scale a little with depth; the white
 * linework dimmed to about 62% (baked into the sheet, so people stay opaque
 * and overlap properly); sized from its own box (ResizeObserver, debounced, with
 * a short fade); paused when the hero is out of view or the tab is hidden;
 * no wrapper, label or text.
 */
import { gsap } from "gsap";
import * as React from "react";
// imported, so the build gives it a content-hashed URL (/_next/static/media/peeps.<hash>.png): a stale cached
// copy can never pair with a newer chunk
import peeps from "./peeps.png";

const COLS = 15; // sprites across the sheet (the original calls this `rows`)
const ROWS = 7; // sprites down the sheet
/** the original sheet is 3600 × 2268 (240 × 324 cells); a host may serve it scaled, which is fine as long as
 * the grid's shape survives: the cells are always measured from the decoded image itself */
const SHEET_ASPECT = 3600 / 2268;
/* the people are drawn opaque (so the ones in front hide the ones behind) with the dimming baked into the
   sheet: the white linework at 62% (#9e9e9e on black looks like white at 62% opacity) */
const DIM = "#9e9e9e";

type Peep = {
  sprite: number;
  x: number;
  y: number;
  anchorY: number;
  w: number;
  h: number;
  scaleX: number;
  walk: gsap.core.Timeline | null;
};

/** how many people walk at once, by the hero's width: 30–34 from 1280px, 16 on tablets, 9 on phones */
const crowdSize = (w: number) => (w >= 1280 ? Math.round(Math.min(34, 30 + (w - 1280) / 160)) : w >= 600 ? 16 : 9);

type Sprites = { list: (ImageBitmap | HTMLCanvasElement)[]; aspect: number; scale: number };

/**
 * The sheet, checked and cut into one small image per person. The grid comes from the decoded image only
 * (naturalWidth / COLS, naturalHeight / ROWS, cell edges rounded to whole pixels), each cell is copied into its
 * own canvas at `scale` and flipped for black there (lines light, fills black: `difference` against white, then
 * dimmed with `multiply`, then the cell's own alpha back with `destination-in`; compositing only, no
 * `ctx.filter`). Drawing then never refers to the sheet again. Returns null, with one console warning, when the
 * sheet doesn't look like the expected grid: no crowd is better than a garbled one.
 */
async function cutSprites(img: HTMLImageElement, scale: number): Promise<Sprites | null> {
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const cw = W / COLS;
  const ch = H / ROWS;
  const problems: string[] = [];
  if (!W || !H) problems.push("the image has no size");
  if (Math.abs(W / H / SHEET_ASPECT - 1) > 0.02) problems.push(`aspect ${(W / H).toFixed(3)}, expected ${SHEET_ASPECT.toFixed(3)}`);
  if (W % COLS > COLS / 2 && COLS - (W % COLS) > COLS / 2) problems.push(`width ${W} isn't close to a multiple of ${COLS}`);
  if (H % ROWS > ROWS / 2 && ROWS - (H % ROWS) > ROWS / 2) problems.push(`height ${H} isn't close to a multiple of ${ROWS}`);
  if (cw < 40 || ch < 54) problems.push(`cells of ${cw.toFixed(1)} × ${ch.toFixed(1)} are too small`);
  if (problems.length) {
    console.warn(`[hero crowd] not drawn: the sprite sheet (${W} × ${H}) failed its check: ${problems.join("; ")}`);
    return null;
  }
  const edge = (i: number, step: number) => Math.round(i * step);
  const aspect = (edge(1, cw) - edge(0, cw)) / (edge(1, ch) - edge(0, ch));
  const list: (ImageBitmap | HTMLCanvasElement)[] = [];
  let blank = 0;
  for (let k = 0; k < COLS * ROWS; k++) {
    const c0 = k % COLS;
    const r0 = (k / COLS) | 0;
    const sx = edge(c0, cw);
    const sy = edge(r0, ch);
    const sw = edge(c0 + 1, cw) - sx;
    const sh = edge(r0 + 1, ch) - sy;
    if (Math.abs(sw / sh / aspect - 1) > 0.05) {
      console.warn(`[hero crowd] not drawn: cell ${k} is ${sw} × ${sh}, unlike the first cell's shape`);
      return null;
    }
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(sw * scale));
    c.height = Math.max(1, Math.round(sh * scale));
    const g = c.getContext("2d", { willReadFrequently: k === 0 })!;
    g.imageSmoothingQuality = "high";
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    g.globalCompositeOperation = "difference";
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "multiply";
    g.fillStyle = DIM;
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = "destination-in";
    g.drawImage(img, sx, sy, sw, sh, 0, 0, c.width, c.height);
    // some ink in it? (sample a coarse grid of alpha)
    const a = g.getImageData(0, 0, c.width, c.height).data;
    let ink = 0;
    for (let i = 3; i < a.length; i += 4 * 7) if (a[i] > 32) ink++;
    if (ink < 20) blank++;
    list.push(c);
  }
  if (blank > 0) {
    console.warn(`[hero crowd] not drawn: ${blank} of the ${COLS * ROWS} cells came out empty`);
    return null;
  }
  // GPU-friendly bitmaps where the browser has them (the canvases otherwise)
  if (typeof createImageBitmap === "function") {
    try {
      const bitmaps = await Promise.all(list.map((c) => createImageBitmap(c as HTMLCanvasElement)));
      for (const c of list) (c as HTMLCanvasElement).width = 0;
      return { list: bitmaps, aspect, scale };
    } catch {
      /* keep the canvases */
    }
  }
  return { list, aspect, scale };
}

const freeSprites = (s: Sprites | null) => {
  for (const b of s?.list ?? []) {
    if ("close" in b) b.close();
    else b.width = b.height = 0;
  }
};

export default function HeroCrowd() {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const hero = canvas.closest(".wpl-root") ?? canvas.parentElement!;

    let dead = false;
    let img: HTMLImageElement | null = null;
    let sprites: Sprites | null = null;
    const stage = { w: 0, h: 0, dpr: 1 };
    const all: Peep[] = [];
    const available: Peep[] = [];
    const crowd: Peep[] = [];
    let running = false;
    let visible = true;
    let rebuildT = 0;
    let fadeT = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    const take = <T,>(arr: T[]) => arr.splice((Math.random() * arr.length) | 0, 1)[0];
    const powerIn = gsap.parseEase("power2.in");

    /** the base sprite height: about 11% of the hero (9% on phones), front people up to 15% larger */
    const baseH = () => (hero as HTMLElement).clientHeight * (stage.w < 600 ? 0.09 : 0.11);

    /** the sprites at about the resolution the people are drawn at (never above the sheet's own); false if the sheet failed its check */
    const ensureSprites = async () => {
      if (!img) return false;
      const want = Math.min(1, Math.max(0.2, (baseH() * 1.15 * stage.dpr) / (img.naturalHeight / ROWS)));
      if (sprites && want <= sprites.scale * 1.25 && want >= sprites.scale * 0.6) return true;
      const next = await cutSprites(img, want);
      if (dead) {
        freeSprites(next);
        return false;
      }
      if (!next) return false;
      freeSprites(sprites);
      sprites = next;
      return true;
    };

    const reset = (p: Peep) => {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const depth = powerIn(Math.random()); // 0 = front (low, larger), 1 = back (high, smaller)
      const s = 1.15 - 0.35 * depth;
      p.h = baseH() * s;
      p.w = p.h * (sprites?.aspect ?? 240 / 324);
      // the back rows stay below the two hero words (descenders included): the busiest part is the bottom of the hero
      const startY = stage.h - p.h + p.h * 0.3 - depth * stage.h * 0.4;
      const startX = dir === 1 ? -p.w : stage.w + p.w;
      const endX = dir === 1 ? stage.w : 0;
      p.scaleX = dir;
      p.x = startX;
      p.y = startY;
      p.anchorY = startY;
      return { startY, endX };
    };

    const walkOf = (p: Peep, { startY, endX }: { startY: number; endX: number }) => {
      const xDuration = 10;
      const yDuration = 0.25;
      const tl = gsap.timeline({ paused: !running });
      tl.timeScale(rand(0.5, 1.5));
      tl.to(p, { duration: xDuration, x: endX, ease: "none" }, 0);
      tl.to(p, { duration: yDuration, repeat: xDuration / yDuration, yoyo: true, y: startY - p.h * 0.06 }, 0);
      return tl;
    };

    const add = () => {
      if (!available.length) return null;
      const p = take(available);
      p.walk = walkOf(p, reset(p)).eventCallback("onComplete", () => {
        remove(p);
        add();
      });
      crowd.push(p);
      crowd.sort((a, b) => a.anchorY - b.anchorY);
      return p;
    };
    const remove = (p: Peep) => {
      const i = crowd.indexOf(p);
      if (i >= 0) crowd.splice(i, 1);
      p.walk?.kill();
      p.walk = null;
      available.push(p);
    };

    // the one place the device pixel ratio is applied: the backing store (in build) and this base transform;
    // everything else is in CSS pixels
    const render = () => {
      ctx.setTransform(stage.dpr, 0, 0, stage.dpr, 0, 0);
      ctx.clearRect(0, 0, stage.w, stage.h);
      const list = sprites?.list;
      if (!list) return;
      for (const p of crowd) {
        const sprite = list[p.sprite];
        if (!sprite) continue;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(p.scaleX, 1);
        ctx.drawImage(sprite, 0, 0, p.w, p.h);
        ctx.restore();
      }
    };

    const play = (on: boolean) => {
      const want = on && visible && !document.hidden;
      if (want === running) return;
      running = want;
      for (const p of crowd) {
        if (want) p.walk?.resume();
        else p.walk?.pause();
      }
      if (want) gsap.ticker.add(render);
      else gsap.ticker.remove(render);
    };

    const build = async () => {
      stage.w = canvas.clientWidth;
      stage.h = canvas.clientHeight;
      stage.dpr = Math.min(2, window.devicePixelRatio || 1);
      if (!(await ensureSprites()) || dead) return false;
      canvas.width = Math.round(stage.w * stage.dpr);
      canvas.height = Math.round(stage.h * stage.dpr);
      for (const p of [...crowd]) remove(p);
      available.length = 0;
      available.push(...all);
      const n = crowdSize(stage.w);
      for (let i = 0; i < n; i++) add()?.walk?.progress(Math.random());
      render();
      return true;
    };

    const start = async () => {
      img = new Image();
      img.src = typeof peeps === "string" ? peeps : peeps.src;
      try {
        await img.decode();
      } catch {
        console.warn("[hero crowd] not drawn: the sprite sheet didn't load or decode");
        return;
      }
      if (dead) return;
      for (let i = 0; i < COLS * ROWS; i++) all.push({ sprite: i, x: 0, y: 0, anchorY: 0, w: 0, h: 0, scaleX: 1, walk: null });
      if (!(await build()) || dead) return;
      play(true);
      // fade in (CSS, 1.2 s)
      requestAnimationFrame(() => !dead && canvas.setAttribute("data-on", ""));
    };

    // size from its own box; rebuild after the size settles, behind a short fade
    let lastW = 0;
    let lastH = 0;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (!all.length || width < 1 || (Math.abs(width - lastW) < 1 && Math.abs(height - lastH) < 1)) {
        lastW = width;
        lastH = height;
        return;
      }
      lastW = width;
      lastH = height;
      clearTimeout(rebuildT);
      rebuildT = window.setTimeout(() => {
        canvas.removeAttribute("data-on");
        clearTimeout(fadeT);
        fadeT = window.setTimeout(async () => {
          if (dead) return;
          if (await build()) canvas.setAttribute("data-on", "");
        }, 160);
      }, 200);
    });
    ro.observe(canvas);

    // only while the hero is on screen (at least ~10% of it) and the tab is visible
    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.intersectionRatio >= 0.1;
        play(true);
      },
      { threshold: [0, 0.1, 0.2] },
    );
    io.observe(hero);
    const onVis = () => play(true);
    document.addEventListener("visibilitychange", onVis);

    void start();

    return () => {
      dead = true;
      clearTimeout(rebuildT);
      clearTimeout(fadeT);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      gsap.ticker.remove(render);
      for (const p of all) p.walk?.kill();
      crowd.length = available.length = all.length = 0;
      freeSprites(sprites);
      sprites = null;
      canvas.width = canvas.height = 0;
      img = null;
    };
  }, []);

  return <canvas ref={ref} className="wpl-crowd" aria-hidden="true" />;
}
