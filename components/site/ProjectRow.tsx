"use client";

/**
 * Projects as a curved row: images stream right to left round the inside of a
 * cylinder, flat at the centre and bending toward you at the ends. Click or tap
 * a tile and the row eases to a stop, a card lifts out of that tile, flies to
 * the centre and flips over to the project's name, its technical focus as a
 * sentence (typed out) and a GitHub link. Every tile carries its name beneath it.
 *
 * The band is adapted from "Tilted Grid Hero" on 21st.dev (the author isn't
 * named in the component's prompt; check its licence on its 21st.dev page
 * before reusing it elsewhere): the cylinder maths, the sliced tiles, the
 * single animation per tile and the image hand-off on wrap are the original's.
 * Changes: tiles are click targets (the original band is aria-hidden and
 * pointer-events: none), the row pauses with an eased playback rate (clicks,
 * keyboard focus, off screen), fewer slices on small screens, tiles mount and
 * images prefetch only once the section nears the viewport, and the FLIP card,
 * live region and keyboard list are new.
 */

import * as React from "react";
import { GitHubIcon } from "@/components/icons";
import type { ResolvedProject } from "@/lib/website-project-images";
import { useReducedMotion } from "@/lib/hooks";

/* ── the cylinder (from the original) ── */
const CAMERA = 1.6;
const MAX_WIDTH = 55;
function arc(bend: number) {
  return (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend));
}
function measure(width: number, height: number, tile: number, aspect: number, gap: number, bend: number) {
  const h = Math.min((tile / 100) * height, ((MAX_WIDTH / 100) * width) / aspect);
  const radius = width * arc(bend);
  if (!(h > 0) || !(radius > 0)) return { columns: 2, sweep: 0, unit: 0, limit: 0, width, slices: 16 };
  const deg = (rad: number) => (rad * 180) / Math.PI;
  const unit = deg(h / radius);
  const pitch = (aspect + gap / 100) * unit;
  const limit = deg(bend) + (aspect * unit) / 2;
  const columns = Math.min(60, Math.max(2, Math.ceil((2 * limit) / pitch)));
  const round = (n: number) => +n.toFixed(4);
  const sweep = round((columns * pitch) / 2);
  // small screens: fewer, wider facets (the curve is gentler there and the DOM lighter)
  const slices = width < 640 ? 10 : 16;
  return { columns, sweep, unit: round(unit), limit: round(Math.min(sweep, limit)), width, slices };
}
type Layout = ReturnType<typeof measure>;

/* ── the row's settings ── */
const SPEED = 5.5; // seconds per tile
const ASPECT = 16 / 10; // the photos are 16:10
const GAP = 7;
const AXIS = 50;
/** by the row's width: the tile height (% of the row), the curve (°) and the edge fade (%), so about four to
 * five tiles show on desktop, two to three on tablets and two (with a third fading in) on phones */
function rowSettings(w: number) {
  const s = w < 640 ? { tile: 44, curve: 46, fade: 8 } : w < 1024 ? { tile: 46, curve: 62, fade: 10 } : { tile: 40, curve: 70, fade: 9 };
  return { ...s, bend: (s.curve * Math.PI) / 180 };
}

const LIFT_MS = 460;
const FLIP_MS = 620;
const TYPE_MS = 22;

type Rect = { x: number; y: number; w: number; h: number };
type Phase = "from" | "center" | "flipped" | "unflip" | "back";
type Open = { i: number; from: Rect; tile: number; button: HTMLButtonElement | null };

export function ProjectRow({ projects }: { projects: ResolvedProject[] }) {
  const reduced = useReducedMotion();
  const rootRef = React.useRef<HTMLDivElement>(null);
  const bandRef = React.useRef<HTMLDivElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const orbit = `tgh-o-${id}`;
  const tileClass = `tgh-t-${id}`;

  const [layout, setLayout] = React.useState<Layout | null>(null);
  const [size, setSize] = React.useState({ w: 1200, h: 540 });
  const [shown, setShown] = React.useState<Record<number, number>>({});
  const [near, setNear] = React.useState(false);
  const [onScreen, setOnScreen] = React.useState(false);
  const [hold, setHold] = React.useState(false); // keyboard focus in the project list
  const [open, setOpen] = React.useState<Open | null>(null);
  const [phase, setPhase] = React.useState<Phase>("from");
  const [typed, setTyped] = React.useState(0);

  /* size the loop from the section's own box */
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width < 50 || height < 50) return; // hidden (the other modes): keep the last real size
      setSize({ w: width, h: height });
      const st = rowSettings(width);
      const next = measure(width, height, st.tile, ASPECT, GAP, st.bend);
      setLayout((prev) => (prev && prev.columns === next.columns && prev.sweep === next.sweep && prev.unit === next.unit && prev.slices === next.slices ? prev : next));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* mount the tiles (and fetch every image) once the section nears the viewport; pause while it's off screen */
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const nearIo = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setNear(true);
        nearIo.disconnect();
      }
    }, { rootMargin: "800px 0px" });
    const visIo = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting));
    nearIo.observe(el);
    visIo.observe(el);
    return () => {
      nearIo.disconnect();
      visIo.disconnect();
    };
  }, []);
  React.useEffect(() => {
    if (!near) return;
    for (const p of projects) new Image().src = p.src;
  }, [near, projects]);

  /* pausing: ease every tile's playback rate to 0 (or back to 1), so the row never stops dead */
  const rate = React.useRef(1);
  const ramp = React.useRef(0);
  const paused = open !== null || hold || !onScreen;
  const anims = React.useCallback(() => (bandRef.current?.getAnimations({ subtree: true }) ?? []).filter((a) => (a as CSSAnimation).animationName === orbit), [orbit]);
  React.useEffect(() => {
    const target = paused ? 0 : 1;
    const ms = !onScreen ? 0 : paused ? 380 : 520;
    cancelAnimationFrame(ramp.current);
    const list = anims();
    const from = rate.current;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = ms ? Math.min(1, (now - t0) / ms) : 1;
      const e = 1 - (1 - k) * (1 - k);
      rate.current = from + (target - from) * e;
      for (const a of list) a.playbackRate = rate.current;
      if (k < 1) ramp.current = requestAnimationFrame(tick);
    };
    ramp.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ramp.current);
  }, [paused, onScreen, anims, layout, near]);

  /* the card: lift out of the tile, fly to the centre, flip; and back */
  const cardBox = React.useMemo<Rect>(() => {
    const w = Math.min(600, size.w * 0.9);
    const h = Math.min(size.h * 0.9, Math.max(w / ASPECT, 300));
    return { x: (size.w - w) / 2, y: (size.h - h) / 2, w, h };
  }, [size]);

  const timers = React.useRef<number[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const openCard = React.useCallback(
    (i: number, from: Rect | null, tile: number, button: HTMLButtonElement | null) => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      setTyped(0);
      setOpen({ i, from: from ?? { x: cardBox.x + cardBox.w * 0.2, y: cardBox.y + cardBox.h * 0.2, w: cardBox.w * 0.6, h: cardBox.h * 0.6 }, tile, button });
      if (reduced) {
        setPhase("flipped");
        return;
      }
      setPhase("from");
      requestAnimationFrame(() => requestAnimationFrame(() => setPhase("center")));
      later(() => setPhase("flipped"), LIFT_MS + 40);
    },
    [cardBox, reduced],
  );

  const closeCard = React.useCallback(() => {
    if (!open) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const back = open.button;
    if (reduced) {
      setOpen(null);
      back?.focus({ preventScroll: true });
      return;
    }
    setPhase("unflip");
    later(() => setPhase("back"), FLIP_MS);
    later(() => {
      setOpen(null);
      setPhase("from");
    }, FLIP_MS + LIFT_MS);
    back?.focus({ preventScroll: true });
  }, [open, reduced]);

  /* the back: type the focus line out, announce it, move focus in */
  const project = open ? projects[open.i] : null;
  React.useEffect(() => {
    if (!project || phase !== "flipped") return;
    cardRef.current?.querySelector<HTMLElement>(".pc-link")?.focus({ preventScroll: true });
    const total = project.technicalFocus.length + 1;
    if (reduced) return; // shown in full straight away (see `typedNow`)
    let n = 0;
    const t = window.setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= total) window.clearInterval(t);
    }, TYPE_MS);
    return () => window.clearInterval(t);
  }, [project, phase, reduced]);

  /* Esc closes; Tab stays inside the card while it's open */
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCard();
      }
      if (e.key === "Tab" && cardRef.current) {
        const f = [...cardRef.current.querySelectorAll<HTMLElement>("a[href], button")];
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (!cardRef.current.contains(document.activeElement)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeCard]);

  /* a click on a tile (ignored at the faded ends) */
  const onBandClick = (e: React.MouseEvent) => {
    const tile = (e.target as HTMLElement).closest<HTMLElement>("[data-tile]");
    const root = rootRef.current;
    if (!tile || !root || open) return;
    const rb = root.getBoundingClientRect();
    // the faded ends don't count (judged by where the click lands: a tile curling toward the camera has huge projected bounds)
    const px = e.clientX - rb.left;
    const edge = (rb.width * rowSettings(rb.width).fade) / 100;
    if (px < edge || px > rb.width - edge) return;
    // the card lifts out of the tile's on-screen box, kept inside the section
    const tb = tile.getBoundingClientRect();
    const x0 = Math.max(0, tb.left - rb.left);
    const y0 = Math.max(0, tb.top - rb.top);
    const x1 = Math.min(rb.width, tb.right - rb.left);
    const y1 = Math.min(rb.height, tb.bottom - rb.top);
    openCard(Number(tile.dataset.img), { x: x0, y: y0, w: Math.max(40, x1 - x0), h: Math.max(25, y1 - y0) }, Number(tile.dataset.tile), null);
  };

  /* keyboard: open from the hidden list, starting from a visible tile showing that project if there is one */
  const openFromButton = (i: number, button: HTMLButtonElement) => {
    const root = rootRef.current;
    let from: Rect | null = null;
    let tileIndex = -1;
    if (root && bandRef.current) {
      const rb = root.getBoundingClientRect();
      let best = Infinity;
      for (const t of bandRef.current.querySelectorAll<HTMLElement>(`[data-tile][data-img="${i}"]`)) {
        const tb = t.getBoundingClientRect();
        const cx = (tb.left + tb.right) / 2 - rb.left;
        const d = Math.abs(cx - rb.width / 2);
        if (getComputedStyle(t).visibility === "visible" && cx > (rb.width * rowSettings(rb.width).fade) / 100 && cx < rb.width * (1 - rowSettings(rb.width).fade / 100) && d < best) {
          best = d;
          from = { x: tb.left - rb.left, y: tb.top - rb.top, w: tb.width, h: tb.height };
          tileIndex = Number(t.dataset.tile);
        }
      }
    }
    openCard(i, from, tileIndex, button);
  };

  /* ── the band ── */
  const S = rowSettings(size.w);
  const L = layout ?? measure(size.w, size.h, S.tile, ASPECT, GAP, S.bend);
  const { columns, sweep, unit, limit, slices } = L;
  const u = (n: number) => `calc(${+n.toFixed(4)} * min(${S.tile}cqh, ${+(MAX_WIDTH / ASPECT).toFixed(4)}cqw))`;
  const r = 100 * arc(S.bend);
  const radius = `${+r.toFixed(3)}cqw`;
  const turn = (deg: number) => `translateZ(${radius}) rotateY(${+deg.toFixed(4)}deg) translateZ(-${radius})`;
  const hide = +(((sweep - limit) / (2 * sweep || 1)) * 100).toFixed(4);
  const css =
    `@keyframes ${orbit}{from{transform:${turn(-sweep)}}to{transform:${turn(sweep)}}` +
    `0%,${hide}%,${100 - hide}%,100%{visibility:hidden}${hide + 0.001}%,${100 - hide - 0.001}%{visibility:visible}}` +
    `@media(prefers-reduced-motion:reduce){.${tileClass}{animation-play-state:paused}}`;
  const share = ASPECT / slices;
  const duration = columns * SPEED;
  const mask = `linear-gradient(90deg,transparent,#000 ${S.fade}%,#000 ${100 - S.fade}%,transparent)`;
  const mounted = near && layout !== null;

  /* the card's transform for each phase */
  const box = cardBox;
  const from = open?.from;
  const atTile = from ? `translate(${(from.x - box.x).toFixed(1)}px, ${(from.y - box.y).toFixed(1)}px) scale(${(from.w / box.w).toFixed(4)}, ${(from.h / box.h).toFixed(4)})` : "none";
  const moved = phase === "from" || phase === "back" ? atTile : "none";
  const flipped = phase === "flipped";
  // the focus line as one sentence, typed out (its words exactly as given, with a full stop)
  const announce = project && phase === "flipped" ? `${project.name}. ${project.technicalFocus}. GitHub link.` : "";
  const typedNow = reduced ? Number.MAX_SAFE_INTEGER : typed;
  const sentence = project ? `${project.technicalFocus}.` : "";
  const shownText = sentence.slice(0, Math.min(sentence.length, typedNow));

  return (
    <div className="pr-wrap">
      <div ref={rootRef} className="pr" style={{ containerType: "size" }} data-open={open ? "" : undefined}>
        <style>{css}</style>
        <div
          ref={bandRef}
          className="pr-band"
          aria-hidden="true"
          onClick={onBandClick}
          style={{
            opacity: mounted ? 1 : 0,
            perspective: `${+(r * 1.6).toFixed(3)}cqw`,
            perspectiveOrigin: `50% ${AXIS}%`,
            maskImage: mask,
            WebkitMaskImage: mask,
          }}
        >
          {mounted &&
            Array.from({ length: columns }, (_, t) => {
              const first = columns - 1 - t;
              const n = Math.max(projects.length, 1);
              const imgIndex = (shown[t] ?? first) % n;
              const img = projects[imgIndex];
              const dim = open !== null && open.tile !== t;
              return (
                <div
                  key={t}
                  data-tile={t}
                  data-img={imgIndex}
                  className={`${tileClass} pr-tile`}
                  style={{
                    left: `calc(50% - ${u(ASPECT / 2)})`,
                    top: `calc(${AXIS}% - ${u(0.5)})`,
                    width: u(ASPECT),
                    height: u(1),
                    transformStyle: "preserve-3d",
                    animation: `${orbit} ${duration}s linear ${-t * SPEED}s infinite`,
                    ["--pr-dur" as string]: `${duration}s`,
                    opacity: dim ? 0.4 : 1,
                  }}
                  onAnimationIteration={(e) => {
                    const lap = Math.round(e.elapsedTime / duration);
                    setShown((prev) => {
                      const next = lap * columns + first;
                      return prev[t] === next ? prev : { ...prev, [t]: next };
                    });
                  }}
                >
                  {img && (
                    <span className="pr-name" style={{ top: `calc(100% + ${u(0.07)})`, fontSize: u(0.12), transform: turn(0) }}>
                      {img.name}
                    </span>
                  )}
                  {Array.from({ length: slices }, (_, k) => (
                    <div
                      key={k}
                      className={`pr-slice${k === 0 ? " pr-l" : ""}${k === slices - 1 ? " pr-r" : ""}`}
                      style={{
                        left: u((ASPECT - share) / 2),
                        width: k === slices - 1 ? u(share) : `calc(${u(share)} + 1px)`,
                        height: u(1),
                        transform: turn((ASPECT / 2 - (k + 0.5) * share) * unit),
                      }}
                    >
                      {img && (
                        // eslint-disable-next-line @next/next/no-img-element -- local files; the static export has no image optimiser
                        <img src={img.src} alt="" draggable={false} loading="lazy" decoding="async" style={{ left: u(-k * share), width: u(ASPECT), height: u(1) }} />
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
        </div>

        {open && project && (
          <>
            {/* a click anywhere outside the card closes it */}
            <div className="pc-backdrop" onClick={closeCard} aria-hidden="true" />
            <div
              ref={cardRef}
              className="pc"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${id}-pc-h`}
              data-reduced={reduced || undefined}
              data-phase={phase}
              style={{
                left: box.x,
                top: box.y,
                width: box.w,
                height: box.h,
                transform: reduced ? undefined : moved,
                transition: reduced || phase === "from" ? "none" : `transform ${LIFT_MS}ms cubic-bezier(.2,.8,.2,1)`,
              }}
            >
              <div className="pc-flip" style={{ transform: `rotateY(${flipped ? 180 : 0}deg)`, transition: reduced ? "none" : `transform ${FLIP_MS}ms cubic-bezier(.3,.9,.3,1)` }}>
                <div className="pc-face pc-front" aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local files; the static export has no image optimiser */}
                  <img src={project.src} alt="" />
                </div>
                <div className="pc-face pc-back">
                  <button type="button" className="pc-close" onClick={closeCard} aria-label="Close">
                    <svg viewBox="0 0 20 20" aria-hidden="true">
                      <path d="M5 5 L15 15 M15 5 L5 15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                    </svg>
                  </button>
                  <h3 id={`${id}-pc-h`} className="pc-name">
                    {project.name}
                  </h3>
                  <p className="pc-text" aria-hidden="true">
                    {shownText}
                    {shownText.length < sentence.length && <span className="pc-caret" />}
                    {/* reserves the full sentence's space so the card doesn't reflow while typing */}
                    <span className="pc-rest">{sentence.slice(shownText.length)}</span>
                  </p>
                  <p className="sr-only">{sentence}</p>
                  <a className="pc-link" href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                    <GitHubIcon size={20} /> GitHub<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </div>
            </div>
          </>
        )}

        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>

      {/* the projects for keyboard and screen-reader users (and in the static HTML for crawlers and no-JS visitors) */}
      <ul
        className="pr-list"
        onFocus={() => setHold(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setHold(false);
        }}
      >
        {projects.map((p, i) => (
          <li key={p.slug}>
            <button type="button" onClick={(e) => openFromButton(i, e.currentTarget)}>
              {p.name}
            </button>
            <p>{p.technicalFocus}</p>
            <a href={p.repoUrl} target="_blank" rel="noopener noreferrer">
              {p.name} on GitHub<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
