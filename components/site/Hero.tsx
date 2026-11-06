"use client";

// The normal website's hero, on black. A storm of lowercase letters streams
// across, shutters away, and "Eshaan" rolls into place letter by letter like a
// slot reel (real text) on one row at the left, then "Kapooswalla" rolls in
// on a second row, right-aligned to the nav's right edge, and a hand-inked
// character rises beside "Eshaan", from behind its baseline, and waves. Hover a letter
// and it re-rolls; hover / click / Enter on the character and he waves back;
// click the background to throw letters.
//
// Adapted from "Waving Portfolio Landing" by Kedhareswer (21st.dev,
// https://21st.dev/@kedhareswer): the intro timeline, storm, reels and
// character are the original's. Changes: one word ("Eshaan", in Inter) on
// one row with the character beside it (one group), no labels / rules / dots,
// the site nav above it (./SiteNav) and a scroll cue, the CSS in a static
// stylesheet (./site.css), and the intro only plays while the normal website
// is actually showing. Check the licence on the component's 21st.dev page.
import * as React from "react";
import dynamic from "next/dynamic";
import { site } from "@/data/site";
import { useTown } from "@/components/town/state";
import { goToSection } from "./SiteNav";
import { az, hash, r2 } from "./util";

// the walking crowd behind the hero (./HeroCrowd): its own chunk, with gsap, loaded only once it's wanted
const HeroCrowd = dynamic(() => import("./HeroCrowd"), { ssr: false });
/** when the intro's letters have settled (Kapooswalla's last letter lands at about 3.85 s) */
const CROWD_AT = 3900;

const ACCENT = "#e5262c";
const BG = "#000000";
const SURFACE = "#0f0f0f";
const FG = "#ffffff";
const WORD = "Eshaan";
const WORD2 = "Kapooswalla";
const GREETING = "hello!";

// #region layout
// "Eshaan" on one row in Inter at the left, and the character standing right
// beside it, rising from behind the same baseline: one group, in the upper
// half, below the sticky nav. The word takes about half the width on
// wide stages; on tall ones the whole group scales to fit the width. The
// layout is in the stage's own pixels.
// Inter's metrics at weight 500 (measured from the font file): "Eshaan" is
// 3.4805em wide, less 6 × 0.04em of tracking; caps are 0.7275em tall; in a
// line-height-1 box the baseline sits 0.8637em below the top.
const WORD_EM = 3.4805 - 6 * 0.04;
// "Kapooswalla": 6.0889em, less 11 × 0.04em; its last "a" ends 0.0722em before its advance, so its ink ends
// 0.0322em inside the word's box (the box ends 0.04em short of the last advance)
const WORD2_EM = 6.0889 - 11 * 0.04;
const WORD2_INK_END = 0.0722 - 0.04;
/** baseline to baseline, in the words' size: tight, so the two rows read as one stacked lockup */
const ROW2_LEAD = 0.95;
const CAP_EM = 0.7275;
const BASELINE_EM = 0.8637;
const CHAR_RATIO = 1.3; // the group's vertical fit, in cap heights (the word's place comes from this)
const CHAR_SIZE = 1.75; // the character's frame height, in cap heights: he stands taller than that fit, rising higher above the letters
const CHAR_PAD = 60; // the empty strip on the left of his 460-wide frame (his lean and folded elbow reach to about here)
const GAP_EM = 0.14; // between the word and him


function layoutPoster(W: number, H: number) {
  const portrait = W / H < 0.9;
  const minDim = Math.min(W, H);
  // the space kept clear above the group (it clears the sticky nav with room to spare; on tall screens it's where the wrapped link bar used to end)
  const top = Math.min(168, Math.max(64, minDim * 0.15)) + (portrait ? 48 : 0);
  // the page margin (--pm in site.css): the words line up with the nav's edges and the content below
  const margin = Math.min(40, Math.max(16, W * 0.025));
  const groupTop = top + (portrait ? 20 : 28);
  const charEm = CAP_EM * CHAR_RATIO; // the group's height in em (the word's place)
  const charWEm = ((460 - CHAR_PAD) / 600) * CAP_EM * CHAR_SIZE; // his visible width in em
  const groupEm = WORD_EM + GAP_EM + charWEm;

  // both words share one size: "Eshaan" about 47% of a wide screen, as large as both rows allow
  const right = W - margin; // the nav's right edge
  const avail = W - 2 * margin;
  const fitRow2 = (right - margin) / WORD2_EM; // "Kapooswalla" between the left margin and the nav's edge
  let F = Math.min(portrait ? avail / groupEm : (W * 0.47) / WORD_EM, fitRow2);
  if (!portrait) {
    if (F * groupEm > avail) F = avail / groupEm;
    const maxF = (H * 0.62 - groupTop) / (charEm + ROW2_LEAD); // keep both rows in the upper part
    if (F > maxF && maxF > 40) F = maxF;
  }
  let baseline = groupTop + F * charEm;
  // clear of the nav at the very top: the cap tops and his hair at least 24px under its bottom edge
  const navBottom = W < 800 ? 56 : 64;
  const clearTop = Math.min(baseline - CAP_EM * F, baseline - F * CAP_EM * CHAR_SIZE * (1 - 8 / 600));
  if (clearTop < navBottom + 24) baseline += navBottom + 24 - clearTop;
  const wordTop = baseline - BASELINE_EM * F;
  const charH = F * CAP_EM * CHAR_SIZE;
  const charTop = baseline - charH;
  const k = charH / 600;
  const charLeft = margin + F * (WORD_EM + GAP_EM) - CHAR_PAD * k;

  // row 2, "Kapooswalla", the same size: right-aligned so its last "a" touches the nav's right edge
  const F2 = F;
  const baseline2 = baseline + ROW2_LEAD * F2;
  const word2Top = baseline2 - BASELINE_EM * F2;
  const word2Left = right + WORD2_INK_END * F2 - WORD2_EM * F2;

  // the bubble: right of his raised hand where there's room, otherwise under the group
  const fs = Math.min(22, Math.max(14, minDim * 0.021));
  const bs = fs / 26;
  const bw = (GREETING.length * 15 + 48) * bs;
  const bh = 56 * bs;
  const handRight = charLeft + 440 * k;
  let bubble: Bubble;
  if (!portrait && handRight + 14 + bw <= W - margin * 0.5) {
    bubble = { x: handRight + 14, y: Math.max(charTop, charTop + 90 * k - bh), w: bw, h: bh, s: bs, tail: "left" };
  } else {
    const bx = Math.min(W - margin - bw, handRight - bw);
    // under both rows, so it never covers "Kapooswalla"
    bubble = { x: Math.max(margin, bx), y: baseline2 + 0.3 * F2 + 30 * bs, w: bw, h: bh, s: bs, tail: "up" };
  }
  return { width: W, height: H, k, charLeft, charTop, portrait, bubble, font: F, wordLeft: margin, wordTop, font2: F2, word2Left, word2Top, right };
}

type Bubble = { x: number; y: number; w: number; h: number; s: number; tail: "left" | "up" };

/** the bubble outline: its tail points down-left at his hand, or up at him from below */
function bubblePath(b: Bubble) {
  const { x, y, w, h, s } = b;
  const pts =
    b.tail === "left"
      ? [[x, y], [x + w, y], [x + w, y + h], [x + 34 * s, y + h], [x + 4 * s, y + h + 22 * s], [x + 10 * s, y + h], [x, y + h]]
      : [[x, y], [x + w - 46 * s, y], [x + w - 30 * s, y - 22 * s], [x + w - 18 * s, y], [x + w, y], [x + w, y + h], [x, y + h]];
  return "M " + pts.map(([px, py]) => r2(px) + " " + r2(py)).join(" L ") + " Z";
}

// #endregion layout

// Intro timeline, ms. The CSS carries the same beats.
const WAVE_AT = 4950;
const READY_AT = 7000;
const WAVE_MS = 1500;

type Burst = { id: number; x: number; y: number; bits: { ch: string; dx: number; dy: number; rot: number }[] };

const noop = () => () => {};
/** the pre-paint script in app/layout.tsx marks a direct ?view=list visit before hydration */
const initialList = () => document.documentElement.dataset.initialView === "list";

export function Hero() {
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const headRef = React.useRef<SVGGElement>(null);
  const wavingRef = React.useRef(false);
  const frame = React.useRef(0);
  const timers = React.useRef<number[]>([]);
  const lastRoll = React.useRef<number[]>([]);
  const burstId = React.useRef(0);

  // play only while the normal website is what's on screen (it's in the DOM, hidden, in the other modes)
  const mode = useTown((s) => s.mode);
  const checked = useTown((s) => s.checked);
  const listReason = useTown((s) => s.listReason);
  // the server HTML starts the intro (so a direct visit never flashes the finished poster); a hidden mode stops it on hydration
  const directList = React.useSyncExternalStore(noop, initialList, () => true);
  const active = checked ? mode === "list" : directList;

  const [run, setRun] = React.useState(0);
  const [reduced, setReduced] = React.useState(false);
  const [doneRun, setDoneRun] = React.useState(-1);
  const [waving, setWaving] = React.useState(false);
  const [rolls, setRolls] = React.useState<number[]>([]);
  const [bursts, setBursts] = React.useState<Burst[]>([]);
  // the stage's size
  const [box, setBox] = React.useState({ w: 1440, h: 900 });
  // the server lays out for 1440 × 900; until the real size is known the word and the character stay invisible
  // (with JS only; see site.css) so they don't visibly jump into place
  const [sized, setSized] = React.useState(false);

  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  };

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const t = timers.current;
    return () => {
      mq.removeEventListener("change", sync);
      t.forEach(clearTimeout);
      cancelAnimationFrame(frame.current);
    };
  }, []);

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height: h } = e.contentRect;
      // hidden (the list is in the DOM, visually hidden, in the other modes): keep the last real size
      if (width < 200 || h < 200) return;
      setBox({ w: Math.round(width), h: Math.round(h) });
      setSized(true);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const wave = React.useCallback(() => {
    if (wavingRef.current) return;
    wavingRef.current = true;
    setWaving(true);
    const id = window.setTimeout(() => {
      wavingRef.current = false;
      setWaving(false);
    }, WAVE_MS);
    timers.current.push(id);
  }, []);

  // coming back to the normal website (from the chooser or the city) plays the intro again
  const [prevActive, setPrevActive] = React.useState(active);
  if (active !== prevActive) {
    setPrevActive(active);
    if (active) setRun((r) => r + 1);
  }

  // the intro is over once its timer has fired for this run (or straight away when it isn't playing)
  const playing = active && !reduced;
  const ready = !playing || doneRun === run;
  React.useEffect(() => {
    if (!playing) return;
    const a = window.setTimeout(wave, WAVE_AT);
    const b = window.setTimeout(() => setDoneRun(run), READY_AT);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [run, playing, wave]);

  // the crowd: never with reduced motion or on the slow-device fallback; after the letters settle, or once idle
  const crowdAllowed = active && !reduced && !(listReason && /slow/.test(listReason));
  const [crowdRun, setCrowdRun] = React.useState(-1);
  React.useEffect(() => {
    if (!crowdAllowed) return;
    if (playing && doneRun !== run) {
      const t = window.setTimeout(() => setCrowdRun(run), CROWD_AT);
      return () => clearTimeout(t);
    }
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setCrowdRun(run), { timeout: 1500 });
      return () => window.cancelIdleCallback(id);
    }
    const t = window.setTimeout(() => setCrowdRun(run), 200);
    return () => clearTimeout(t);
  }, [crowdAllowed, playing, doneRun, run]);
  const showCrowd = crowdAllowed && crowdRun === run;

  const L = React.useMemo(() => layoutPoster(box.w, box.h), [box]);
  const letters = (WORD + WORD2).toLowerCase();

  // the storm: rows of lowercase letters in the same face, white / grey / red, some hollow
  const storm = React.useMemo(() => {
    const pool = WORD.toLowerCase() + WORD.toLowerCase() + az;
    return Array.from({ length: 7 }, (_, row) => {
      let text = "";
      for (let k = 0; k < 30; k++) text += pool[Math.floor(hash(row * 97 + k * 13) * pool.length)];
      return { row, text };
    });
  }, []);

  const onMove = (e: React.PointerEvent) => {
    if (reduced || e.pointerType === "touch") return;
    const px = e.clientX;
    const py = e.clientY;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const root = rootRef.current;
      if (!root) return;
      const r = root.getBoundingClientRect();
      root.style.setProperty("--wpl-mx", (((px - r.left) / r.width) * 2 - 1).toFixed(3));
      root.style.setProperty("--wpl-my", (((py - r.top) / r.height) * 2 - 1).toFixed(3));
      const k = (v: number, d: number) => Math.max(-1, Math.min(1, v / d));
      const h = headRef.current?.getBoundingClientRect();
      if (!h) return;
      const dx = px - (h.left + h.width / 2);
      const dy = py - (h.top + h.height / 2);
      root.style.setProperty("--wpl-ex", (k(dx, 260) * 4.5).toFixed(2));
      root.style.setProperty("--wpl-ey", (k(dy, 260) * 3.5).toFixed(2));
      root.style.setProperty("--wpl-hr", (k(dx, 700) * 7).toFixed(2));
    });
  };

  const onLeave = () => {
    const root = rootRef.current;
    if (!root) return;
    for (const v of ["--wpl-mx", "--wpl-my", "--wpl-ex", "--wpl-ey", "--wpl-hr"]) root.style.setProperty(v, "0");
  };

  const onDown = (e: React.PointerEvent) => {
    if (reduced) return;
    if ((e.target as Element).closest("a,button,.wpl-char,.wpl-cell")) return;
    const r = rootRef.current?.getBoundingClientRect();
    if (!r) return;
    const bits = Array.from({ length: 10 }, (_, i) => {
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.5;
      const d = 50 + Math.random() * 90;
      return { ch: letters[(Math.random() * letters.length) | 0], dx: Math.cos(a) * d, dy: Math.sin(a) * d - 24, rot: (Math.random() - 0.5) * 260 };
    });
    const id = ++burstId.current;
    setBursts((b) => [...b.slice(-5), { id, x: e.clientX - r.left, y: e.clientY - r.top, bits }]);
    later(() => setBursts((b) => b.filter((q) => q.id !== id)), 1100);
  };

  const reroll = (i: number, now: number) => {
    if (!ready || reduced) return;
    if (now - (lastRoll.current[i] ?? 0) < 750) return;
    lastRoll.current[i] = now;
    setRolls((r) => {
      const n = [...r];
      n[i] = (n[i] ?? 0) + 1;
      return n;
    });
  };

  const onCharKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      wave();
    }
  };

  /** a word as a row of slot-reel letters; `at` is its index in the re-roll list, `delay` + `spread` its roll-in timing (s) */
  const renderWord = (word: string, at: number, pos: React.CSSProperties, delay: number, spread: number) => (
    <div className="wpl-par-letters wpl-word" aria-hidden="true" style={pos}>
      {[...word].map((ch, j) => {
        const i = at + j;
        const roll = rolls[i] ?? 0;
        const rolling = playing || roll > 0;
        const n = roll > 0 ? 6 : 10;
        const reel = rolling ? Array.from({ length: n - 1 }, (_, k) => az[Math.floor(hash(i * 131 + roll * 977 + k * 53) * 26)]) : [];
        const style = { "--n": n - 1, "--delay": (roll > 0 ? 0 : delay + (j / word.length) * spread) + "s", "--dur": roll > 0 ? "0.7s" : "1s" } as React.CSSProperties;
        return (
          <span key={j} className="wpl-cell hl" onPointerEnter={(e) => reroll(i, e.timeStamp)}>
            <span className="hl-sizer">{ch}</span>
            <span key={roll} className={"hl-reel" + (rolling ? " is-rolling" : "")} style={style}>
              <span>{ch}</span>
              {reel.map((c, k) => (
                <span key={k}>{c}</span>
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );

  const stage = ready ? "done" : "on";
  const k = L.k;

  return (
    <div
      ref={rootRef}
      id="top"
      className="wpl-root"
      data-intro={stage}
      data-sized={sized || undefined}
      data-portrait={L.portrait || undefined}
      style={{ "--wpl-accent": ACCENT, "--wpl-paper": BG, "--wpl-ink": FG } as React.CSSProperties}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onPointerDown={onDown}
    >
      <h1 className="wpl-sr">{site.name.toLowerCase()}</h1>
      {showCrowd && <HeroCrowd />}

      <div className="wpl-stage" key={run}>
        <svg className="wpl-poster" viewBox={"0 0 " + r2(L.width) + " " + r2(L.height)} preserveAspectRatio="xMidYMin meet">
          <g className="wpl-par-char">
            <svg x={r2(L.charLeft)} y={r2(L.charTop)} width={r2(460 * k)} height={r2(600 * k)} viewBox="0 0 460 600" overflow="hidden">
              <g
                className={"wpl-char" + (waving ? " is-waving" : "")}
                role="button"
                tabIndex={0}
                aria-label="Wave hello"
                onPointerEnter={(e) => {
                  if (ready && e.pointerType !== "touch") wave();
                }}
                onClick={wave}
                onKeyDown={onCharKey}
              >
                <Character shirtId={"wpl-" + uid + "-shirt"} headRef={headRef} />
              </g>
            </svg>
          </g>

          {waving && (
            <g className="wpl-bubble" aria-hidden="true">
              <path d={bubblePath(L.bubble)} fill={SURFACE} stroke={FG} strokeWidth={2.5 * L.bubble.s} strokeLinejoin="round" />
              <text className="wpl-label wpl-bubble-text" x={r2(L.bubble.x + L.bubble.w / 2)} y={r2(L.bubble.y + 38 * L.bubble.s)} textAnchor="middle" style={{ fontSize: 26 * L.bubble.s }}>
                {GREETING}
              </text>
            </g>
          )}
        </svg>

        {/* the words, in real text: each letter is a window onto a reel of lowercase letters that rolls in and lands */}
        {renderWord(WORD, 0, { left: r2(L.wordLeft), top: r2(L.wordTop), fontSize: r2(L.font) }, 1, 0.6)}
        {/* row 2 rolls in just after "Eshaan" has landed, and is done before the wave */}
        {renderWord(WORD2, WORD.length, { left: r2(L.word2Left), top: r2(L.word2Top), fontSize: r2(L.font2) }, 2.2, 0.7)}

        {playing && !ready && (
          <div className="wpl-storm" aria-hidden="true">
            {storm.map(({ row, text }) => (
              <div key={row} className="wpl-srow" data-dir={row % 2 ? "r" : "l"} style={{ animationDelay: row * 0.04 + "s, " + (1.25 + row * 0.06) + "s" }}>
                <div className="wpl-strip" data-dir={row % 2 ? "r" : "l"} data-tone={row % 3} style={{ animationDuration: 4.6 + (row % 3) * 1.5 + "s" }}>
                  <span>{text}</span>
                  <span>{text}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <a
          className="wpl-cue"
          href="#experience"
          aria-label="Scroll to experience"
          onClick={(e) => {
            if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
            if (goToSection("experience")) e.preventDefault();
          }}
        >
          <svg viewBox="0 0 40 64" aria-hidden="true">
            <path className="wpl-draw" pathLength={1} d="M 20 4 C 18 20 22 36 20 56" fill="none" stroke={FG} strokeWidth={3.4} strokeLinecap="round" />
            <path className="wpl-draw" pathLength={1} d="M 8 44 L 20 58 L 32 44" fill="none" stroke={FG} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
      </div>

      {bursts.map((b) => (
        <div key={b.id} className="wpl-burst" style={{ left: b.x, top: b.y }} aria-hidden="true">
          {b.bits.map((bit, n) => (
            <span key={n} className="wpl-bit" data-tone={n % 3} style={{ "--dx": bit.dx + "px", "--dy": bit.dy + "px", "--rot": bit.rot + "deg" } as React.CSSProperties}>
              {bit.ch}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

// #region character
// Local frame 0 0 460 600; the bottom edge is the baseline he rises from (he's cropped at the hips there).
// Rig pivots (mirrored in the CSS transform-origins): tilt/breathe at the feet
// (205, 600), shoulder (288, 248), elbow (348, 346), wrist (392, 216), neck
// (203, 200).
/* his colours for the black page: white linework, light skin, a red shirt with white specks, white hair,
   grey trousers; the face's small features stay dark on the light skin so they read (glasses included) */
const C = { line: "#ffffff", skin: "#f1dccb", shirt: "#e5262c", speck: "#ffffff", hair: "#ffffff", pants: "#6b6b6b", seam: "#3a3a3a", feature: "#1a1a1a" };

function Character({ shirtId, headRef }: { shirtId: string; headRef: React.Ref<SVGGElement> }) {
  const torso =
    "M 120 240 C 134 222 166 213 202 213 C 240 213 272 221 290 238 C 300 285 298 345 292 392 C 288 440 288 478 290 520 L 120 520 C 120 478 118 440 114 392 C 108 345 108 285 120 240 Z";
  const limb = (d: string, w: number) => (
    <>
      <path d={d} fill="none" stroke={C.line} strokeWidth={w + 8} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={C.skin} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
  const fingers = ["M 388 170 L 380 116", "M 399 166 L 399 106", "M 410 168 L 418 112", "M 419 178 L 434 136", "M 382 192 L 352 170"];
  const specks = Array.from({ length: 64 }, (_, k) => [r2(110 + hash(k * 3.1) * 190), r2(215 + hash(k * 5.7 + 1) * 305), r2(1 + hash(k * 9.3 + 2) * 1.8)]);
  return (
    <g className="wpl-rise">
      <g className="wpl-tilt">
        <g className="wpl-breathe">
          <path d="M 128 505 L 286 505 L 294 640 L 120 640 Z" fill={C.pants} />
          <path d="M 206 548 L 208 640" stroke={C.seam} strokeWidth={3} />

          <path d="M 184 158 L 184 226 L 222 226 L 222 158 Z" fill={C.skin} stroke={C.line} strokeWidth={4} />
          <clipPath id={shirtId}>
            <path d={torso} />
          </clipPath>
          <path d={torso} fill={C.shirt} stroke={C.line} strokeWidth={3} />
          <g clipPath={"url(#" + shirtId + ")"} fill={C.speck} opacity={0.45}>
            {specks.map(([x, y, r], k) => (
              <circle key={k} cx={x} cy={y} r={r} />
            ))}
          </g>
          <path d="M 178 216 L 203 262 L 228 216 Z" fill={C.skin} />
          <path d="M 168 218 L 180 252 L 200 267 M 238 218 L 226 252 L 206 267" fill="none" stroke={C.line} strokeWidth={3} strokeLinejoin="round" />
          <path d="M 203 280 L 203 505" stroke={C.line} strokeWidth={6} strokeLinecap="round" strokeDasharray="0 36" />
          <path d="M 122 512 C 160 518 250 518 288 512" fill="none" stroke={C.line} strokeWidth={3} />

          {/* his right arm, folded across the waist */}
          {limb("M 118 384 C 140 410 168 428 194 438", 30)}
          <circle cx={204} cy={440} r={24} fill={C.line} />
          <circle cx={204} cy={440} r={20} fill={C.skin} />
          <path d="M 206 426 C 214 430 218 438 216 448 M 196 446 C 202 452 210 454 216 450" fill="none" stroke={C.feature} strokeWidth={3} strokeLinecap="round" />
          <path d="M 124 250 C 110 300 106 345 112 382" fill="none" stroke={C.line} strokeWidth={56} strokeLinecap="round" />
          <path d="M 124 250 C 110 300 106 345 112 382" fill="none" stroke={C.shirt} strokeWidth={50} strokeLinecap="round" />
          <path d="M 144 282 C 136 320 134 350 138 376" fill="none" stroke={C.line} strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" />
          <path d="M 90 380 C 102 394 126 396 140 386" fill="none" stroke={C.line} strokeWidth={2.5} strokeLinecap="round" />

          {/* the waving arm */}
          <g className="wpl-uarm">
            <g className="wpl-farm">
              {limb("M 350 350 L 392 214", 30)}
              <path d="M 381 252 L 387 233" stroke={C.line} strokeWidth={40} />
              <circle cx={384} cy={243} r={8} fill={C.shirt} stroke={C.seam} strokeWidth={3} />
              <g className="wpl-hand">
                <ellipse cx={400} cy={180} rx={31} ry={35} fill={C.line} transform="rotate(12 400 180)" />
                {fingers.map((d) => (
                  <path key={"o" + d} d={d} stroke={C.line} strokeWidth={24} strokeLinecap="round" />
                ))}
                <ellipse cx={400} cy={180} rx={27} ry={31} fill={C.skin} transform="rotate(12 400 180)" />
                {fingers.map((d) => (
                  <path key={"f" + d} d={d} stroke={C.skin} strokeWidth={16} strokeLinecap="round" />
                ))}
                <path d="M 392 196 C 400 202 410 200 416 192 M 394 150 L 394 164 M 405 148 L 405 162" fill="none" stroke={C.feature} strokeWidth={2.5} strokeLinecap="round" />
              </g>
            </g>
            <path d="M 288 250 C 312 280 330 310 344 340" fill="none" stroke={C.line} strokeWidth={56} strokeLinecap="round" />
            <path d="M 288 250 C 312 280 330 310 344 340" fill="none" stroke={C.shirt} strokeWidth={50} strokeLinecap="round" />
            <path d="M 282 294 C 296 316 306 334 314 350" fill="none" stroke={C.line} strokeOpacity={0.7} strokeWidth={2.5} strokeLinecap="round" />
            <path d="M 318 344 Q 342 356 364 324" fill="none" stroke={C.line} strokeWidth={2.5} strokeLinecap="round" />
          </g>

          <g className="wpl-head" ref={headRef}>
            <g className="wpl-look">
              <ellipse cx={158} cy={118} rx={12} ry={18} fill={C.skin} stroke={C.line} strokeWidth={4} />
              <path d="M 156 110 C 162 112 162 124 156 126" fill="none" stroke={C.feature} strokeWidth={2.5} />
              <path
                d="M 160 92 C 158 142 172 180 206 184 C 240 182 258 150 258 100 C 258 64 236 46 208 46 C 180 46 162 64 160 92 Z"
                fill={C.skin}
                stroke={C.line}
                strokeWidth={4}
              />
              <path
                d="M 154 108 C 146 70 156 30 196 18 C 232 8 276 16 284 44 C 288 60 278 72 264 72 C 250 62 226 60 206 66 C 186 72 172 86 168 110 Z"
                fill={C.hair}
              />
              <path d="M 160 94 L 166 126 L 173 104 Z" fill={C.hair} />
              <path d="M 196 30 C 220 22 250 24 266 38 M 190 44 C 210 36 236 38 250 46" fill="none" stroke={C.feature} strokeOpacity={0.35} strokeWidth={2.5} strokeLinecap="round" />
              <g className="wpl-brows">
                <path d="M 176 88 C 184 84 194 84 202 87 M 218 87 C 226 84 238 84 246 88" fill="none" stroke={C.feature} strokeWidth={4.5} strokeLinecap="round" />
              </g>
              <g className="wpl-eyes">
                <g className="wpl-pupils">
                  <circle cx={189} cy={110} r={4.4} fill={C.feature} />
                  <circle cx={232} cy={110} r={4.4} fill={C.feature} />
                </g>
              </g>
              <path className="wpl-happy" d="M 182 113 Q 189 104 196 113 M 225 113 Q 232 104 239 113" fill="none" stroke={C.feature} strokeWidth={3.5} strokeLinecap="round" />
              <path d="M 172 102 L 160 100 M 206 105 C 209 101 211 101 214 105" fill="none" stroke={C.feature} strokeWidth={4} strokeLinecap="round" />
              <rect x={172} y={96} width={34} height={26} rx={5} fill="none" stroke={C.feature} strokeWidth={4.5} />
              <rect x={214} y={96} width={36} height={26} rx={5} fill="none" stroke={C.feature} strokeWidth={4.5} />
              <path d="M 214 118 C 211 132 206 142 214 146 C 219 148 224 146 226 143" fill="none" stroke={C.feature} strokeWidth={3.5} strokeLinecap="round" />
              <path className="wpl-smile" d="M 196 158 C 206 166 222 166 234 156" fill="none" stroke={C.feature} strokeWidth={3.5} strokeLinecap="round" />
              <path className="wpl-grin" d="M 195 156 C 206 174 226 172 236 154 Z" fill={C.feature} stroke={C.feature} strokeWidth={3} strokeLinejoin="round" />
              <path d="M 238 150 C 241 153 241 157 239 160" fill="none" stroke={C.feature} strokeWidth={2.5} strokeLinecap="round" />
            </g>
          </g>
        </g>
      </g>
    </g>
  );
}
