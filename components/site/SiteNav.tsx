"use client";

import * as React from "react";
import { site, mailto } from "@/data/site";
import { SwitchModeButton } from "./SiteControls";

/**
 * The normal website's top nav: a skip link, then the five section links and
 * github / linkedin / email / switch mode. It's sticky, transparent over the
 * hero at the very top and solid black with a hairline from 8px of scroll. The
 * bar itself lets clicks through (only its links and buttons take them), so
 * it never blocks the hero underneath. It turns solid black as soon as the
 * page scrolls (8px). Below 800px the links fold into a
 * "menu" button and a full-width sheet. The current section's link is
 * highlighted (IntersectionObserver), never while the hero is in view. All
 * the text is in the server HTML.
 */
export const SECTIONS = ["experience", "projects", "education", "extracurriculars", "contact"] as const;
type Section = (typeof SECTIONS)[number];

const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** scroll to a section (smoothly unless reduced motion; its scroll-margin clears the nav) and put it in the URL without a jump */
export function goToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return false;
  el.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
  if (location.hash !== "#" + id) window.history.replaceState(window.history.state, "", "#" + id);
  return true;
}

/** a plain left click on a section link: scroll there ourselves (modified clicks keep the browser's behaviour) */
function onAnchor(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  if (goToSection(id)) e.preventDefault();
}

export function SiteNav() {
  const navRef = React.useRef<HTMLElement>(null);
  const menuBtn = React.useRef<HTMLButtonElement>(null);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  const [active, setActive] = React.useState<Section | null>(null);
  const [solid, setSolid] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const sheetId = React.useId();

  // solid black (with its hairline) as soon as the page has scrolled at all, so nothing ever shows through it
  React.useEffect(() => {
    const sync = () => setSolid(window.scrollY > 8);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  // the current section: watch a band from just under the nav to 40% down the screen. While the hero is in it,
  // nothing is current; otherwise the last section in it (the one whose top has come up past the band's
  // bottom, which also gets the short last section at the end of the page)
  React.useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof IntersectionObserver === "undefined") return;
    const ids = ["top", ...SECTIONS];
    const els = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    const inBand = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inBand.add(e.target.id);
          else inBand.delete(e.target.id);
        }
        if (inBand.has("top")) return setActive(null);
        const last = [...SECTIONS].reverse().find((id) => inBand.has(id));
        if (last) setActive(last);
      },
      { rootMargin: `-${(nav.offsetHeight || 64) + 8}px 0px -60% 0px` },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const close = React.useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) menuBtn.current?.focus({ preventScroll: true });
  }, []);

  // the sheet: focus into it on open; Esc and a tap outside close it
  React.useEffect(() => {
    if (!open) return;
    sheetRef.current?.querySelector<HTMLElement>("a,button")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: PointerEvent) => {
      if (!navRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close]);

  const sectionLinks = (inSheet: boolean) =>
    SECTIONS.map((id) => (
      <li key={id}>
        <a
          href={"#" + id}
          className="sn-link"
          aria-current={active === id ? "true" : undefined}
          onClick={(e) => {
            onAnchor(e, id);
            if (inSheet) close();
          }}
        >
          {id}
        </a>
      </li>
    ));
  const outLinks = (inSheet: boolean) => (
    <>
      <li>
        <a href={site.github} target="_blank" rel="noopener noreferrer" className="sn-out" onClick={inSheet ? () => close() : undefined}>
          github<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </li>
      <li>
        <a href={site.linkedin} target="_blank" rel="noopener noreferrer" className="sn-out" onClick={inSheet ? () => close() : undefined}>
          linkedin<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </li>
      <li>
        <a href={mailto} className="sn-out" onClick={inSheet ? () => close() : undefined}>
          email
        </a>
      </li>
    </>
  );

  return (
    <>
      <a href="#content" className="sn-skip">
        skip to content
      </a>
      <nav ref={navRef} className="sn" aria-label="Sections" data-solid={solid || open || undefined}>
        <div className="sn-bar">
          <ul className="sn-sections">{sectionLinks(false)}</ul>
          <ul className="sn-outs">
            {outLinks(false)}
            <li className="sn-switch">
              <SwitchModeButton />
            </li>
          </ul>
          <button ref={menuBtn} type="button" className="sn-menu" aria-expanded={open} aria-controls={sheetId} onClick={() => (open ? close() : setOpen(true))}>
            menu
          </button>
        </div>
        <div ref={sheetRef} id={sheetId} className="sn-sheet" hidden={!open}>
          <ul>
            {sectionLinks(true)}
            {outLinks(true)}
            <li className="sn-switch" onClickCapture={() => setOpen(false)}>
              <SwitchModeButton />
            </li>
          </ul>
        </div>
      </nav>
    </>
  );
}
