import { CROSSWALKS, rad } from "./layout";

/**
 * Traffic signals, shared by the lamps (StreetProps) and the vehicles
 * (Traffic) so they always agree. One 14 s cycle for the whole block:
 * green for traffic 0–9 s, red (pedestrians cross) 9–14 s.
 */
export const SIGNAL_CYCLE = 14;
export const SIGNAL_GREEN = 9;
export const signalRed = (t: number) => t % SIGNAL_CYCLE >= SIGNAL_GREEN;

/** crosswalk centres in radians, and their half-width along the street (m) */
export const CROSSWALK_ANGLES = CROSSWALKS.map(rad);
export const CROSSWALK_HALF = 1.35;
