import { experiences, type Experience } from "@/data/experiences";
import { extracurriculars } from "@/data/extracurriculars";
import type { BuildingId } from "../world/layout";

/**
 * What's on each floor of the four towers (no three.js here: the HUD, the
 * 3D rooms and the list view all read it). Floors are listed top first, the
 * way the floor selector shows them.
 */

export type FloorMeta = {
  id: string;
  label: string;
  sub?: string;
  year?: number;
  logo?: string;
  /** backdrop + transition tint */
  mood: string;
  /** line he says on arriving (data/speech.ts) */
  speech: string;
};

export type TowerId = Exclude<BuildingId, "home">;

/* ── Experience Tower: Cohere on top (floor 01) down to AIESEC (floor 10) ── */
const EXP_MOOD: Record<string, string> = {
  cohere: "#3B3F8F",
  wealthsimple: "#D9D2C3",
  shopify: "#7FB069",
  "vector-institute": "#2A3B4F",
  "aws-sbg": "#E59A3A",
  mali: "#B5654A",
  "yu-blueprint": "#4C7BB8",
  "itreb-canada": "#6E8C8A",
  "prince-aly-khan-hospital": "#8FCFC4",
  aiesec: "#3C78C8",
};
export const EXPERIENCE_FLOORS: (FloorMeta & { exp: Experience })[] = experiences.map((e) => ({
  id: e.id,
  label: e.company,
  sub: e.role,
  year: e.year,
  logo: e.logo,
  mood: EXP_MOOD[e.id] ?? "#5FB8AE",
  speech: `exp-${e.id}`,
  exp: e,
}));

/* ── Projects Gallery: one hall with every project ─────────────────────── */
export const PROJECTS_FLOORS: FloorMeta[] = [{ id: "hall", label: "projects gallery", mood: "#2E5E4E", speech: "proj-hall" }];

/* ── Extracurriculars Tower: hall of records on top ───────────────────── */
const EXTRA_MOOD: Record<string, { mood: string; sub?: string }> = {
  records: { mood: "#C99A2E" }, // gold
  dojo: { mood: "#B8352E", sub: "martial arts" }, // lantern red
  rink: { mood: "#8CCBEA", sub: "skating" }, // ice blue
  brain: { mood: "#3E6B52", sub: "ICPC · math" }, // chalk green
  aws: { mood: "#E8EEF4", sub: "200+ members" }, // cloud white
};
export const EXTRA_FLOORS: (FloorMeta & { link?: string; plaque: string[] })[] = extracurriculars.map((x) => ({
  id: x.id,
  label: x.label,
  sub: EXTRA_MOOD[x.id]?.sub,
  mood: EXTRA_MOOD[x.id]?.mood ?? "#5FB8AE",
  speech: `extra-${x.id}`,
  plaque: x.facts,
  link: x.link,
}));

/* ── Education (+ the post-office contact room on the ground floor) ───── */
export const EDUCATION_FLOORS: FloorMeta[] = [
  { id: "education", label: "education", sub: "york university", mood: "#3D5A8C", speech: "edu-education" },
  { id: "contact", label: "contact", sub: "post office", mood: "#E9A26B", speech: "edu-contact" },
];

export const TOWERS: Record<TowerId, { floors: FloorMeta[]; start: number; title: string }> = {
  experience: { floors: EXPERIENCE_FLOORS, start: 0, title: "experience tower" },
  projects: { floors: PROJECTS_FLOORS, start: 0, title: "projects gallery" },
  extracurriculars: { floors: EXTRA_FLOORS, start: 0, title: "extracurriculars tower" },
  education: { floors: EDUCATION_FLOORS, start: 0, title: "education" },
};

export const isTower = (id: BuildingId | null): id is TowerId => !!id && id !== "home";
