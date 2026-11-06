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
 * Changed: the sheet is local (/public/crowd/peeps.png, not the CDN) and
 * flipped for black once into an offscreen canvas (white linework, black
 * fills); a set number of people walk at once (by width); people are small and scale a little with depth; the white
 * linework dimmed to about 62% (baked into the sheet, so people stay opaque
 * and overlap properly); sized from its own box (ResizeObserver, debounced, with
 * a short fade); paused when the hero is out of view or the tab is hidden;
 * no wrapper, label or text.
 */
import { gsap } from "gsap";
import * as React from "react";

const SRC = "/crowd/peeps.png";
const COLS = 15; // sprites across the sheet (the original calls this `rows`)
const ROWS = 7; // sprites down the sheet
const CELL_W = 240; // the sheet is 3600 × 2268
const CELL_H = 324;
/* the people are drawn opaque (so the ones in front hide the ones behind) with the dimming baked into the
   sheet: the white linework at 62% (#9e9e9e on black looks like white at 62% opacity) */
const DIM = "#9e9e9e";

type Peep = {
  cell: number;
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

/** the sheet flipped for black: lines light and fills black (difference against white), then dimmed (multiply) */
function flipSheet(img: HTMLImageElement, scale: number, tint: string) {
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * scale);
  c.height = Math.round(img.naturalHeight * scale);
  const g = c.getContext("2d")!;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, c.width, c.height);
  g.globalCompositeOperation = "difference";
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = "multiply";
  g.fillStyle = tint;
  g.fillRect(0, 0, c.width, c.height);
  // back to the sheet's own alpha (the fills above covered its transparent parts too)
  g.globalCompositeOperation = "destination-in";
  g.drawImage(img, 0, 0, c.width, c.height);
  return c;
}

export default function HeroCrowd() {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const hero = canvas.closest(".wpl-root") ?? canvas.parentElement!;

    let dead = false;
    let img: HTMLImageElement | null = null;
    const sheets: { white: HTMLCanvasElement | null; scale: number } = { white: null, scale: 0 };
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

    const ensureSheets = () => {
      if (!img) return;
      // the sheet at about the resolution the people are drawn at (never above the original, at most 3 MP)
      const want = Math.min(1, Math.max(0.3, (baseH() * 1.15 * stage.dpr) / CELL_H), Math.sqrt(3e6 / (img.naturalWidth * img.naturalHeight)));
      if (sheets.white && want <= sheets.scale * 1.25 && want >= sheets.scale * 0.6) return;
      sheets.scale = want;
      sheets.white = flipSheet(img, want, DIM);
    };

    const reset = (p: Peep) => {
      const dir = Math.random() > 0.5 ? 1 : -1;
      const depth = powerIn(Math.random()); // 0 = front (low, larger), 1 = back (high, smaller)
      const s = 1.15 - 0.35 * depth;
      p.h = baseH() * s;
      p.w = (p.h * CELL_W) / CELL_H;
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

    const render = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const sc = sheets.scale;
      const cw = CELL_W * sc;
      const ch = CELL_H * sc;
      const sheet = sheets.white;
      if (!sheet) return;
      for (const p of crowd) {
        ctx.setTransform(p.scaleX * stage.dpr, 0, 0, stage.dpr, p.x * stage.dpr, p.y * stage.dpr);
        ctx.drawImage(sheet, (p.cell % COLS) * cw, ((p.cell / COLS) | 0) * ch, cw, ch, 0, 0, p.w, p.h);
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

    const build = () => {
      stage.w = canvas.clientWidth;
      stage.h = canvas.clientHeight;
      stage.dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(stage.w * stage.dpr);
      canvas.height = Math.round(stage.h * stage.dpr);
      ensureSheets();
      for (const p of [...crowd]) remove(p);
      available.length = 0;
      available.push(...all);
      const n = crowdSize(stage.w);
      for (let i = 0; i < n; i++) add()?.walk?.progress(Math.random());
      render();
    };

    const start = async () => {
      img = new Image();
      img.src = SRC;
      try {
        await img.decode();
      } catch {
        return;
      }
      if (dead) return;
      for (let i = 0; i < COLS * ROWS; i++) all.push({ cell: i, x: 0, y: 0, anchorY: 0, w: 0, h: 0, scaleX: 1, walk: null });
      build();
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
        fadeT = window.setTimeout(() => {
          if (dead) return;
          build();
          canvas.setAttribute("data-on", "");
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
      if (sheets.white) sheets.white.width = sheets.white.height = 0;
      sheets.white = null;
      canvas.width = canvas.height = 0;
      img = null;
    };
  }, []);

  return <canvas ref={ref} className="wpl-crowd" aria-hidden="true" />;
}
