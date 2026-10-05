/**
 * Eshaan's day at Home, by Toronto time (hours, 0–24). One source of truth for
 * the Home interior, the intro shot, the outdoor idles and the list view.
 */

export type HomeRoom = "bedroom" | "study" | "kitchen";
export type HomePose = "sleep" | "stretch" | "eat" | "type" | "relax" | "read";

export type Activity = {
  id: string;
  label: string; // shown on the plaque, lowercase
  from: number;
  to: number;
  room: HomeRoom;
  pose: HomePose;
  /** where in the room he does it */
  spot: "bed" | "bedside" | "table" | "desk" | "armchair";
};

// Brief: night 23:00–06:30 sleep · 06:30–07:30 wake, stretch, breakfast ·
// 07:30–12:00 + 13:00–17:30 desk work · 12:00–13:00 lunch ·
// 17:30–19:30 dinner then relaxing · 19:30–23:00 studying
export const SCHEDULE: Activity[] = [
  { id: "sleep-early", label: "sleeping", from: 0, to: 6.5, room: "bedroom", pose: "sleep", spot: "bed" },
  { id: "wake", label: "waking up, stretching", from: 6.5, to: 6.95, room: "bedroom", pose: "stretch", spot: "bedside" },
  { id: "breakfast", label: "breakfast", from: 6.95, to: 7.5, room: "kitchen", pose: "eat", spot: "table" },
  { id: "work-am", label: "working at the desk", from: 7.5, to: 12, room: "study", pose: "type", spot: "desk" },
  { id: "lunch", label: "lunch", from: 12, to: 13, room: "kitchen", pose: "eat", spot: "table" },
  { id: "work-pm", label: "working at the desk", from: 13, to: 17.5, room: "study", pose: "type", spot: "desk" },
  { id: "dinner", label: "dinner", from: 17.5, to: 18.75, room: "kitchen", pose: "eat", spot: "table" },
  { id: "relax", label: "relaxing", from: 18.75, to: 19.5, room: "study", pose: "relax", spot: "armchair" },
  { id: "study", label: "studying, books and a lamp", from: 19.5, to: 23, room: "study", pose: "read", spot: "desk" },
  { id: "sleep-late", label: "sleeping", from: 23, to: 24, room: "bedroom", pose: "sleep", spot: "bed" },
];

export function activityAt(h: number): Activity {
  const t = ((h % 24) + 24) % 24;
  return SCHEDULE.find((a) => t >= a.from && t < a.to) ?? SCHEDULE[0];
}

/** Outdoor idle when he's left alone for a few seconds. */
export type OutdoorIdle = "coffee" | "stretch" | "sunset" | "stargaze";
export function outdoorIdleAt(h: number): OutdoorIdle {
  const t = ((h % 24) + 24) % 24;
  if (t >= 5.5 && t < 11) return "coffee";
  if (t >= 11 && t < 17) return "stretch";
  if (t >= 17 && t < 19.6) return "sunset";
  return "stargaze";
}

export const fmtHour = (h: number) => {
  const hh = Math.floor(h) % 24;
  const mm = Math.round((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

/** which intro line fits what he's doing */
export function introLineFor(a: Activity): string {
  switch (a.id) {
    case "sleep-early":
    case "sleep-late":
      return "intro_sleeping";
    case "wake":
    case "breakfast":
      return "intro_breakfast";
    case "lunch":
      return "intro_lunch";
    case "dinner":
    case "relax": // brief: "17:30–19:30 dinner then relaxing"
      return "intro_dinner";
    case "study":
      return "intro_studying";
    default:
      return "intro_working";
  }
}
