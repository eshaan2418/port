"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import generated from "@/data/project-images.json";
import { Brain, Cloud, DoorOpen, GraduationCap, Mailbox, Medal, Snowflake, Swords, type LucideIcon } from "lucide-react";
import { projectsOnFloor, projects, type Project } from "@/data/projects";
import { site, mailto } from "@/data/site";
import { GitHubIcon, LinkedInIcon } from "@/components/icons";
import { LogoMark } from "@/components/LogoMark";
import { useTown } from "../state";
import { EDUCATION_FLOORS, EXPERIENCE_FLOORS, EXTRA_FLOORS, PROJECTS_FLOORS, TOWERS, isTower, type TowerId } from "../interior/floors";
import { leaveInterior } from "../interior/transitions";
import { Streaks } from "./InteriorHud";

const pill = "pointer-events-auto rounded-full border border-ink/10 bg-cream/90 shadow-[0_10px_30px_-14px_rgb(18_18_18/0.4)] backdrop-blur-md";
const panel = "pointer-events-auto border border-ink/10 bg-cream/90 shadow-[0_10px_30px_-14px_rgb(18_18_18/0.4)] backdrop-blur-md";
const card =
  "pointer-events-auto rounded-[18px] border border-ink/10 bg-paper/95 shadow-[0_20px_40px_-20px_rgb(18_18_18/0.5)] backdrop-blur-md";
const linkCls =
  "inline-flex items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-[0.8rem] font-medium text-cream transition-colors hover:bg-orange hover:text-ink";

const EXTRA_ICON: Record<string, LucideIcon> = { records: Medal, dojo: Swords, rink: Snowflake, brain: Brain, aws: Cloud };

/**
 * Inside a tower: the floor selector (a side index on desktop, a scrolling
 * strip on phones; ↑ / ↓ keys too), the plaque for the current floor (real
 * details and links), "back outside", and the streaks + tint on floor changes.
 */
export function TowerHud() {
  const interior = useTown((s) => s.interior);
  const floor = useTown((s) => s.floor);
  const setFloor = useTown((s) => s.setFloor);
  const tower = isTower(interior) ? TOWERS[interior] : null;
  const meta = tower?.floors[Math.min(floor, tower.floors.length - 1)];
  const [streak, setStreak] = useState<{ key: number; color: string } | null>(null);
  const prev = useRef<string | undefined>(meta?.id);
  const strip = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (meta && prev.current && prev.current !== meta.id) setStreak({ key: performance.now(), color: meta.mood });
    prev.current = meta?.id;
    // keep the current chip in view on the phone strip
    strip.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [meta]);

  // ↑ / ↓ (and PageUp / PageDown) change floors; Esc leaves
  useEffect(() => {
    if (!tower) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      const s = useTown.getState();
      if (s.startOpen || s.intro) return;
      if (e.key === "Escape") leaveInterior();
      const n = tower.floors.length;
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        setFloor(Math.max(0, s.floor - 1));
      }
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        setFloor(Math.min(n - 1, s.floor + 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tower, setFloor]);

  if (!tower || !meta || !isTower(interior)) return null;
  return (
    <>
      {streak && <Streaks key={streak.key} color={streak.color} onDone={() => setStreak(null)} />}

      <nav
        aria-label={`${tower.title} floors`}
        className="absolute inset-x-0 bottom-[4.1rem] px-3 md:inset-x-auto md:top-1/2 md:right-6 md:bottom-auto md:-translate-y-1/2 md:px-0"
      >
        <p className="micro-label mb-2 hidden text-right text-[0.6rem] text-ink/70 md:block">{tower.title}</p>
        <ol
          ref={strip}
          className={`${panel} flex max-w-full gap-0.5 overflow-x-auto rounded-[18px] p-1 [scrollbar-width:none] md:max-h-[calc(100vh-14rem)] md:w-[17.5rem] md:flex-col md:gap-0.5 md:overflow-y-auto md:p-1.5`}
        >
          {tower.floors.map((f, i) => (
            <li key={f.id} className="shrink-0">
              <button
                type="button"
                aria-current={i === floor ? "true" : undefined}
                onClick={() => setFloor(i)}
                className={`flex w-full items-center gap-2 rounded-[12px] px-2.5 py-1.5 text-left transition-colors md:gap-2.5 md:py-1.5 ${
                  i === floor ? "bg-ink text-cream" : "hover:bg-ink/10"
                }`}
              >
                <FloorChip tower={interior} i={i} current={i === floor} />
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <section aria-label={`${tower.title}: ${meta.label}`} className="absolute inset-x-3 bottom-[7.9rem] md:inset-x-auto md:bottom-6 md:left-6 md:w-[23rem]">
        <Plaque tower={interior} i={floor} />
      </section>

      <div className="absolute inset-x-0 bottom-3 flex justify-center md:bottom-6">
        <button type="button" onClick={leaveInterior} className={`${pill} inline-flex h-11 items-center gap-2 px-5 text-[0.85rem] font-medium hover:bg-ink hover:text-cream`}>
          <DoorOpen size={16} strokeWidth={1.7} aria-hidden="true" />
          back outside
          <kbd className="hidden rounded border border-current/30 px-1.5 font-mono text-[0.68rem] opacity-70 md:inline">esc</kbd>
        </button>
      </div>
    </>
  );
}

/** one row of the floor selector */
function FloorChip({ tower, i, current }: { tower: TowerId; i: number; current: boolean }) {
  const muted = current ? "text-cream/60" : "text-muted";
  if (tower === "experience") {
    const f = EXPERIENCE_FLOORS[i];
    return (
      <>
        <LogoMark src={f.logo!} alt={`${f.label} logo`} size={18} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[0.74rem] font-medium md:text-[0.8rem]">{f.label}</span>
          <span className={`hidden truncate text-[0.66rem] md:block ${muted}`}>{f.sub}</span>
        </span>
        <span className={`ml-auto hidden pl-1 font-mono text-[0.62rem] md:inline ${muted}`}>{f.year}</span>
      </>
    );
  }
  if (tower === "projects") {
    const f = PROJECTS_FLOORS[i];
    return (
      <>
        <span className="text-[0.74rem] whitespace-nowrap lowercase md:text-[0.82rem]">{f.label}</span>
      </>
    );
  }
  if (tower === "extracurriculars") {
    const f = EXTRA_FLOORS[i];
    const Icon = EXTRA_ICON[f.id];
    return (
      <>
        <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
        <span className="text-[0.74rem] whitespace-nowrap md:text-[0.82rem]">{f.label}</span>
      </>
    );
  }
  const f = EDUCATION_FLOORS[i];
  const Icon = f.id === "contact" ? Mailbox : GraduationCap;
  return (
    <>
      <Icon size={15} strokeWidth={1.7} aria-hidden="true" />
      <span className="text-[0.74rem] whitespace-nowrap md:text-[0.82rem]">{f.label}</span>
    </>
  );
}

/** the floor's plaque; on phones the long text folds away behind "more" */
function Plaque({ tower, i }: { tower: TowerId; i: number }) {
  if (tower === "experience") return <ExperiencePlaque i={i} />;
  if (tower === "projects") return <ProjectsPlaque i={i} />;
  if (tower === "extracurriculars") return <ExtraPlaque i={i} />;
  return <EducationPlaque i={i} />;
}

function Fold({ head, children, id }: { head: ReactNode; children: ReactNode; id: string }) {
  // the open state is keyed by the floor, so a new floor starts folded
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === id;
  return (
    <div className={`${card} max-h-[44vh] overflow-y-auto px-4 py-3 md:max-h-[calc(100vh-9rem)] md:p-5`}>
      {head}
      <div className={`${open ? "block" : "hidden"} md:block`}>{children}</div>
      <button
        type="button"
        onClick={() => setOpenFor(open ? null : id)}
        aria-expanded={open}
        className="micro-label mt-2 rounded-full px-2 py-1 text-[0.58rem] text-muted hover:bg-ink hover:text-cream md:hidden"
      >
        {open ? "less" : "more"}
      </button>
    </div>
  );
}

function ExperiencePlaque({ i }: { i: number }) {
  const f = EXPERIENCE_FLOORS[i];
  const e = f.exp;
  return (
    <Fold
      id={f.id}
      head={
        <div className="flex items-center gap-3">
          <LogoMark src={e.logo} alt={`${e.company} logo`} size={30} />
          <div className="min-w-0">
            <p className="micro-label text-[0.58rem] text-muted">
              <span className="font-mono">{e.year}</span>
            </p>
            <p className="font-display text-[1.3rem] leading-tight">{e.company}</p>
            <p className="text-[0.8rem] text-ink/75">{e.role}</p>
          </div>
        </div>
      }
    >
      <p className="mt-3 text-[0.84rem] leading-relaxed text-ink/85">{e.summary}</p>
      {e.link && (
        <a href={e.link.href} target="_blank" rel="noopener noreferrer" className={`${linkCls} mt-3`}>
          {e.link.label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </Fold>
  );
}

/** the gallery: this floor's frames as a list (the "side list"), and the picked one */
function ProjectsPlaque({ i }: { i: number }) {
  const f = PROJECTS_FLOORS[i];
  const item = useTown((s) => s.item);
  const setItem = useTown((s) => s.setItem);
  const list = projectsOnFloor(f.floor);
  const picked = projects.find((p) => p.slug === item && p.floor === f.floor);
  return (
    <div className={`${card} max-h-[46vh] overflow-y-auto px-4 py-3 md:max-h-[calc(100vh-9rem)] md:p-5`}>
      <p className="micro-label text-[0.58rem] text-muted">projects gallery</p>
      <p className="font-display text-[1.25rem] leading-tight lowercase">{f.label}</p>
      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {list.map((p) => (
          <li key={p.slug}>
            <button
              type="button"
              onClick={() => setItem(p.slug)}
              aria-pressed={p.slug === item}
              className={`rounded-full border px-2.5 py-1 text-[0.74rem] transition-colors ${
                p.slug === item ? "border-ink bg-ink text-cream" : "border-ink/20 hover:bg-ink/10"
              }`}
            >
              {p.featured && <span aria-hidden="true">★ </span>}
              {p.name}
            </button>
          </li>
        ))}
      </ul>
      {picked ? <ProjectCard p={picked} /> : <p className="mt-3 text-[0.8rem] text-ink/70">pick a frame (or a name above) and he&apos;ll walk you over.</p>}
    </div>
  );
}

/** written by scripts/generate-project-images.ts for every image that exists */
const IMAGES = generated as Record<string, { blurDataURL?: string }>;

function ProjectCard({ p }: { p: Project }) {
  const [openFor, setOpenFor] = useState<string | null>(null);
  const meta = IMAGES[p.slug];
  const open = openFor === p.slug; // phones: image + description fold away (he reads the description out)
  return (
    <article className="mt-3 border-t border-ink/10 pt-3">
      <div className={`relative aspect-[16/9] overflow-hidden rounded-[10px] bg-ink ${open ? "block" : "hidden"} md:block`}>
        {meta ? (
          <Image
            src={p.image}
            alt={`Illustration for ${p.name}`}
            fill
            sizes="(min-width: 768px) 340px, 90vw"
            placeholder={meta.blurDataURL ? "blur" : "empty"}
            blurDataURL={meta.blurDataURL}
            className="object-cover"
          />
        ) : (
          <div aria-hidden="true" className="absolute inset-0" style={{ background: gradientFor(p) }} />
        )}
      </div>
      <h3 className="mt-2.5 text-[1rem] font-semibold tracking-tight">{p.name}</h3>
      <p className={`mt-1 text-[0.82rem] leading-relaxed text-ink/80 ${open ? "block" : "hidden"} md:block`}>{p.description}</p>
      <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[0.62rem] tracking-[0.1em] text-muted uppercase">
        {p.tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
      <div className="mt-3 flex items-center gap-2">
        <a href={p.repoUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
          <GitHubIcon size={13} /> view on github
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <button
          type="button"
          onClick={() => setOpenFor(open ? null : p.slug)}
          aria-expanded={open}
          className="micro-label rounded-full px-2 py-1 text-[0.58rem] text-muted hover:bg-ink hover:text-cream md:hidden"
        >
          {open ? "less" : "more"}
        </button>
      </div>
    </article>
  );
}

/** same idea as the list view's placeholder: ink with a soft accent glow, seeded per project */
export function gradientFor(p: Project) {
  let h = 0;
  for (const ch of p.slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const accent = p.accent === "orange" ? "#F37021" : "#81D8D0";
  const gx = 30 + (h % 45);
  const gy = 20 + ((h >> 5) % 50);
  return `radial-gradient(70% 85% at ${gx}% ${gy}%, color-mix(in srgb, ${accent} 55%, transparent) 0%, transparent 60%), linear-gradient(160deg, #1c1b19 0%, #121212 70%)`;
}

function ExtraPlaque({ i }: { i: number }) {
  const f = EXTRA_FLOORS[i];
  const Icon = EXTRA_ICON[f.id];
  return (
    <Fold
      id={f.id}
      head={
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink" style={{ background: f.mood }}>
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <div>
            <p className="micro-label text-[0.58rem] text-muted">extracurriculars</p>
            <p className="font-display text-[1.3rem] leading-tight lowercase">{f.label}</p>
          </div>
        </div>
      }
    >
      <ul className="mt-3 space-y-1">
        {f.plaque.map((l) => (
          <li key={l} className="text-[0.88rem] text-ink/85">
            {l}
          </li>
        ))}
      </ul>
      {f.link && (
        <a href={f.link} target="_blank" rel="noopener noreferrer" className={`${linkCls} mt-3`}>
          {f.link.replace(/^https?:\/\//, "").replace(/\/$/, "")} →<span className="sr-only"> (opens in a new tab)</span>
        </a>
      )}
    </Fold>
  );
}

function EducationPlaque({ i }: { i: number }) {
  const f = EDUCATION_FLOORS[i];
  if (f.id === "contact")
    return (
      <div className={`${card} px-4 py-4 md:p-6`}>
        <p className="micro-label text-[0.58rem] text-muted">post office · contact</p>
        <p className="mt-1 font-display text-[1.6rem] leading-tight lowercase md:text-[1.9rem]">let&apos;s work together.</p>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-ink/80">
          want to collaborate? chat?
          <br />
          i&apos;m always down to meet curious and kind people.
        </p>
        <a href={mailto} className="mt-4 inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[0.95rem] font-medium text-cream transition-colors hover:bg-orange hover:text-ink">
          Send me a note <span aria-hidden="true">→</span>
        </a>
        <div className="mt-3 flex gap-2">
          <a href={site.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/25 px-3.5 text-[0.8rem] hover:bg-tiffany">
            <LinkedInIcon size={13} /> LinkedIn<span className="sr-only"> (opens in a new tab)</span>
          </a>
          <a href={site.github} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full border border-ink/25 px-3.5 text-[0.8rem] hover:bg-tiffany">
            <GitHubIcon size={14} /> GitHub<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <p className="micro-label mt-4 text-[0.55rem] text-muted">© 2026 {site.name}</p>
      </div>
    );
  return (
    <Fold
      id={f.id}
      head={
        <div>
          <p className="micro-label text-[0.58rem] text-muted">education</p>
          <p className="font-display text-[1.45rem] leading-tight lowercase">york university</p>
          <p className="text-[0.82rem] text-ink/75">Lassonde School of Engineering</p>
        </div>
      }
    >
      <dl className="mt-3 border-t border-ink/10 text-[0.82rem]">
        {[
          ["Degree", "B.Sc (Hons) Computer Science"],
          ["Location", "Toronto, ON, Canada"],
          ["Scholarship", "Tentanda Via Scholar ($120,000)"],
          ["Honours", "Dean's Honor Roll"],
        ].map(([k, v]) => (
          <div key={k} className="grid grid-cols-[6.2rem_1fr] gap-3 border-b border-ink/10 py-1.5">
            <dt className="micro-label pt-0.5 text-[0.55rem] text-muted">{k}</dt>
            <dd className="font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Fold>
  );
}

