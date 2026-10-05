import { experiences, type Experience } from "@/data/experiences";
import { PROJECT_FLOORS } from "@/data/projects";
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

/* ── Projects Gallery: floor 5 (top) … floor 1 (ground) ───────────────── */
const PROJ_MOOD = ["#2E5E4E", "#384A6B", "#5B3F7A", "#B0603C", "#C9A227"];
export const PROJECTS_FLOORS: (FloorMeta & { floor: number })[] = [...PROJECT_FLOORS].reverse().map((f) => ({
  id: `floor-${f.floor}`,
  label: f.theme,
  mood: PROJ_MOOD[f.floor - 1],
  speech: `proj-floor-${f.floor}`,
  floor: f.floor,
}));

/* ── Extracurriculars Tower: hall of records on top ───────────────────── */
export const EXTRA_FLOORS: (FloorMeta & { link?: string; plaque: string[] })[] = [
  {
    id: "records",
    label: "hall of records",
    mood: "#C99A2E", // gold
    speech: "extra-records",
    plaque: ["world champion, martial arts", "Guinness World Records holder"],
    link: "", // optional: a source link for the record, add it here later
  },
  { id: "dojo", label: "dojo", sub: "martial arts", mood: "#B8352E", speech: "extra-dojo", plaque: ["martial arts", "world champion"] },
  { id: "rink", label: "the rink", sub: "skating", mood: "#8CCBEA", speech: "extra-rink", plaque: ["speed inline roller skater", "loves ice skating"] },
  { id: "brain", label: "brain gym", sub: "ICPC · math", mood: "#3E6B52", speech: "extra-brain", plaque: ["ICPC", "competitive programming", "math"] },
  {
    id: "aws",
    label: "aws community hall",
    sub: "200+ members",
    mood: "#E8EEF4", // cloud white
    speech: "extra-aws",
    plaque: ["AWS Student Builder Groups (formerly Cloud Club)", "200+ member cloud community"],
    link: "https://awsyorkucloud.com/",
  },
];

/* ── Education (+ the post-office contact room on the ground floor) ───── */
export const EDUCATION_FLOORS: FloorMeta[] = [
  { id: "education", label: "education", sub: "york university", mood: "#3D5A8C", speech: "edu-education" },
  { id: "contact", label: "contact", sub: "post office", mood: "#E9A26B", speech: "edu-contact" },
];

export const TOWERS: Record<TowerId, { floors: FloorMeta[]; start: number; title: string }> = {
  experience: { floors: EXPERIENCE_FLOORS, start: 0, title: "experience tower" },
  projects: { floors: PROJECTS_FLOORS, start: PROJECTS_FLOORS.length - 1, title: "projects gallery" },
  extracurriculars: { floors: EXTRA_FLOORS, start: 0, title: "extracurriculars tower" },
  education: { floors: EDUCATION_FLOORS, start: 0, title: "education" },
};

export const isTower = (id: BuildingId | null): id is TowerId => !!id && id !== "home";
