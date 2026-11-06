"use client";

import { TeamLanyardRail, type LanyardMember } from "./LanyardRail";
import { useMediaQuery } from "@/lib/hooks";
import { isInternship, roles } from "./content";

/**
 * Experience as lanyard badges, built from /data/experiences.ts (exact
 * strings; VEX Robotics is left out by its hideOnWebsite flag). From 1280px
 * all eleven hang on one rail; from 1024px on two rails with one badge size
 * (the first six on top, the last five below, newest first); narrower
 * screens get one carousel of all of them. The badge text has floors (11.5px
 * names, 10.5px for the rest) so it never shrinks with the badges.
 */
const items: LanyardMember[] = roles.map((e, i) => ({
  id: e.id,
  name: e.org,
  role: e.role,
  team: e.dates,
  image: e.logo,
  bio: e.line,
  tags: isInternship(e.company) ? ["Internship"] : undefined,
  links: e.link ? [{ label: "View research paper", href: e.link.href }] : undefined,
  tone: ((i % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6,
}));
const TOP = items.slice(0, 6);
const BOTTOM = items.slice(6);

/** one rail of all eleven (badges about 94px wide and up, text at its floors) from here; two rails of six and
 * five from TWO_RAILS; the carousel below that (measured: see the README) */
export const ONE_RAIL = "(min-width: 1280px)";
export const TWO_RAILS = "(min-width: 1024px)";

const LABELS = { flip: "Click or press Enter to flip the badge", back: "Click again or press Esc to turn it back", show: "Show" };

export function ExperienceRails() {
  const one = useMediaQuery(ONE_RAIL, true);
  const wide = useMediaQuery(TWO_RAILS, true);
  const touch = useMediaQuery("(pointer: coarse)");
  const caption = touch ? "tap a badge to flip it" : "hover a badge, pull it down, click to flip it";
  const labels = touch ? { ...LABELS, flip: "Tap to flip the badge", back: "Tap again to turn it back" } : LABELS;
  if (one) return <TeamLanyardRail items={items} sizeFor={items.length} mode="rail" caption={caption} labels={labels} aria-label="Experience badges, newest first" />;
  if (!wide)
    return <TeamLanyardRail items={items} mode="carousel" caption={caption} labels={labels} aria-label="Experience badges, newest first" />;
  return (
    <div className="ex-rails-pair">
      <TeamLanyardRail items={TOP} sizeFor={6} mode="rail" labels={labels} aria-label="Experience badges, newest first" />
      <TeamLanyardRail items={BOTTOM} sizeFor={6} mode="rail" caption={caption} labels={labels} aria-label="Experience badges, continued" />
    </div>
  );
}
