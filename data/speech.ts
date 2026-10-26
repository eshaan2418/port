/**
 * Every line Eshaan says in a speech bubble. Edit freely; set `approved: true`
 * once you're happy with a line. Lines only use facts from the brief.
 *
 * REQUIRE_APPROVAL: while false, all lines show (so you can review them in
 * place). Flip it to true to show only approved lines; unapproved ones are
 * then skipped silently.
 */
import { projects } from "./projects";

export const REQUIRE_APPROVAL = false;

export type SpeechLine = { id: string; text: string; approved: boolean };

export const speech: SpeechLine[] = [
  // intro on load: he notices you mid-activity (one line per routine)
  { id: "intro_sleeping", text: "zzz... oh! hi! i was fast asleep. anyway, i'm so glad you're here. let's head out!", approved: false },
  { id: "intro_breakfast", text: "oh, hey! i was just having breakfast. anyway, i'm glad you're here. let's head out!", approved: false },
  { id: "intro_working", text: "oh, hi! i was in the middle of some work. anyway, i'm glad you're here. let's head out!", approved: false },
  { id: "intro_lunch", text: "oh! i was just grabbing lunch. anyway, i'm glad you're here. let's head out!", approved: false },
  { id: "intro_dinner", text: "oh, hey! i was just having dinner. anyway, i'm glad you're here. let's head out!", approved: false },
  { id: "intro_studying", text: "oh! i was deep in my books. anyway, i'm glad you're here. let's head out!", approved: false },

  // Home rooms (said on arriving in a room)
  { id: "home-bedroom", text: "this is my bedroom. if it's late, you'll probably find me asleep up here.", approved: false },
  { id: "home-study", text: "my desk. this is where the work happens by day, and the studying at night.", approved: false },
  { id: "home-kitchen", text: "the kitchen. breakfast, lunch and dinner all happen at this table.", approved: false },

  // Experience Tower (said on arriving at each room; only what data/experiences.ts says)
  { id: "exp-cohere", text: "i'm a member of technical staff intern at cohere, on north models. incoming winter'27.", approved: false },
  { id: "exp-wealthsimple", text: "i'm an engineering intern at wealthsimple, working on financial markets.", approved: false },
  { id: "exp-shopify", text: "i was an engineering intern at shopify: sidekick, recommendations and search relevance. i received a return offer.", approved: false },
  { id: "exp-york-ta", text: "i was a teaching assistant for eecs 1021 at york university.", approved: false },
  { id: "exp-aws-sbg", text: "i was a student builder group leader with aws, and founded a 200+ member community.", approved: false },
  { id: "exp-vector-institute", text: "i was a researcher at the vector institute, and authored a paper on inference.", approved: false },
  { id: "exp-mali", text: "i was a founding engineer at mali: backed by ibm, with a 5-figure exit.", approved: false },
  { id: "exp-yu-blueprint", text: "yu blueprint: a university club where i made friends and built projects.", approved: false },
  { id: "exp-itreb-canada", text: "at itreb canada i built software used by thousands of community members.", approved: false },
  { id: "exp-vex-robotics", text: "i was a bot programmer for vex robotics, and built some cool bots using c++.", approved: false },
  { id: "exp-prince-aly-khan-hospital", text: "at prince aly khan hospital i built tools that helped hospital teams manage information and support day-to-day medical work.", approved: false },
  { id: "exp-aiesec", text: "i was vp of technology at aiesec.", approved: false },

  // Projects Gallery (on arriving; each frame then reads its project's own description, below)
  { id: "proj-hall", text: "this is the projects gallery. pick a frame to take a closer look.", approved: false },

  // Extracurriculars Tower
  { id: "extra-records", text: "world champion in martial arts, and a guinness world records holder.", approved: false },
  { id: "extra-dojo", text: "this is the dojo. martial arts is where i became a world champion.", approved: false },
  { id: "extra-rink", text: "i'm a speed inline roller skater, and i love ice skating too.", approved: false },
  { id: "extra-brain", text: "icpc, competitive programming and math. this is where i train my brain.", approved: false },
  { id: "extra-aws", text: "our aws student builder group, formerly cloud club: a 200+ member cloud community.", approved: false },

  // Education
  { id: "edu-education", text: "york university, lassonde school of engineering. b.sc (hons) computer science, as a tentanda via scholar.", approved: false },
  { id: "edu-contact", text: "want to collaborate? chat? i'm always down to meet curious and kind people.", approved: false },

  // Projects Gallery frames: each project's own description, unchanged
  ...projects.map((p) => ({ id: `project-${p.slug}`, text: p.description, approved: false })),
];

export function line(id: string): string | null {
  const l = speech.find((s) => s.id === id);
  if (!l) return null;
  if (REQUIRE_APPROVAL && !l.approved) return null;
  return l.text;
}
