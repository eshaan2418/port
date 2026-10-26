/**
 * The site clock, via Intl so daylight saving is handled by the platform's tz
 * database (never a fixed UTC−5 offset).
 */
export const TIME_ZONE = "America/Toronto"; // internal only: sets the default time of day, never displayed

const fmt =
  typeof Intl !== "undefined"
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hourCycle: "h23",
      })
    : null;

/** Current wall-clock time in TIME_ZONE as fractional hours, 0 ≤ h < 24. */
export function clockHours(date = new Date()) {
  if (!fmt) return 12;
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return (Number(parts.hour) % 24) + Number(parts.minute) / 60 + Number(parts.second) / 3600;
}

/** Day is 06:30–18:30 on the site clock. */
export const DAY_START = 6.5;
export const DAY_END = 18.5;
export const isDayTime = (h: number) => h >= DAY_START && h < DAY_END;

export function formatClock(h: number) {
  const hh = Math.floor(((h % 24) + 24) % 24);
  const mm = Math.floor((h - Math.floor(h)) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
