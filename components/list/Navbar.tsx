"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTown } from "@/components/town/state";

const LINKS = [
  { id: "experience", label: "Experience" },
  { id: "projects", label: "Projects" },
  { id: "extracurriculars", label: "Extracurriculars" },
  { id: "education", label: "Education" },
  { id: "contact", label: "Contact" },
];

/**
 * The list view's navbar: a solid ink bar fixed to the top (it never moves
 * the page), the name, section links with the current one marked, and the
 * way back into the city. On phones the links fold into a menu. If the list
 * is showing by default (reduced motion, no WebGL, a slow device) the reason
 * sits in a thin line under the bar.
 */
export function Navbar() {
  const mode = useTown((s) => s.mode);
  const reason = useTown((s) => s.listReason);
  const setMode = useTown((s) => s.setMode);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const inList = mode === "list";

  // mark the section in view
  useEffect(() => {
    if (!inList) return;
    const els = LINKS.map((l) => document.getElementById(l.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setCurrent(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [inList]);

  // Esc closes the phone menu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const back = (
    <button
      type="button"
      onClick={() => setMode("town")}
      className="btn inline-flex h-10 shrink-0 items-center rounded-full bg-orange px-5 text-[0.9rem] font-semibold text-ink transition-colors hover:bg-cream"
    >
      {reason ? "Enter the city anyway" : "Back to the city"} <span aria-hidden="true" className="ml-1.5">→</span>
    </button>
  );

  return (
    <div className="list-nav fixed inset-x-0 top-0 z-40">
      <nav aria-label="List view" className="bg-ink text-cream">
        <div className="list-wrap flex h-16 items-center justify-between gap-6">
          <a href="#top" className="font-display text-[1.25rem] tracking-[-0.02em] lowercase no-underline" onClick={() => setOpen(false)}>
            eshaan kapooswalla
          </a>
          <ul className="hidden items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <li key={l.id}>
                <a
                  href={`#${l.id}`}
                  aria-current={current === l.id ? "true" : undefined}
                  className="nav-link relative rounded-full px-3 py-2 text-[0.9rem] font-medium text-cream/85 no-underline transition-colors hover:text-cream aria-[current=true]:text-cream"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">{inList && back}</div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-cream hover:bg-cream/10 lg:hidden"
              aria-expanded={open}
              aria-controls="list-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
            </button>
          </div>
        </div>
        {open && (
          <div id="list-menu" className="border-t border-cream/15 lg:hidden">
            <ul className="list-wrap py-3">
              {LINKS.map((l) => (
                <li key={l.id}>
                  <a
                    href={`#${l.id}`}
                    onClick={() => setOpen(false)}
                    aria-current={current === l.id ? "true" : undefined}
                    className="flex items-center justify-between border-b border-cream/10 py-3.5 text-[1.05rem] font-medium text-cream no-underline last:border-0"
                  >
                    {l.label}
                    <span aria-hidden="true" className="text-cream/60">
                      →
                    </span>
                  </a>
                </li>
              ))}
              {inList && <li className="pt-4 sm:hidden">{back}</li>}
            </ul>
          </div>
        )}
      </nav>
      {inList && reason && (
        <p className="border-b border-ink/10 bg-paper py-2 text-center text-[0.85rem] text-ink">Showing the list view because {reason}.</p>
      )}
    </div>
  );
}
