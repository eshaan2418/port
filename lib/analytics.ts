import { site } from "@/data/site";

/**
 * Google Analytics 4 and Umami, only where they're allowed without asking first
 * (there is no consent banner, by design). Both load only when every check passes:
 *
 * 1. a production build on a real domain (never `next dev` or localhost);
 * 2. the server says the visitor's location doesn't need prior consent:
 *    /ga/gate.php reads Hostinger GeoIP and answers true only for the US and
 *    Canada outside Quebec. It fails closed: an unknown location, no PHP, a
 *    missing file or any error = no analytics;
 * 3. the browser doesn't send Global Privacy Control / Do Not Track, and the
 *    visitor hasn't opted out with ?analytics=off (?analytics=on undoes it).
 *
 * Otherwise neither loads: no script, no cookies, no requests (not even
 * consent-mode "cookieless pings"). See README → Analytics.
 */
export const GA_ID = "G-0JKP2C1CMB";
export const UMAMI_WEBSITE_ID = "9a2ca957-ae47-4000-bb94-81246c86658f";

const OPT_OUT_KEY = "analytics-opt-out";

type Params = Record<string, string | number | undefined>;
type GaWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  umami?: { track: (name?: string, data?: Params) => void };
};

let state: "idle" | "checking" | "on" | "off" = "idle";
/** events from while the gate is being checked: sent if it opens, dropped if not */
let pending: [string, Params][] = [];
/** events waiting for Umami's script to arrive (null once it has) */
let umamiQueue: [string, Params][] | null = [];
/** which version of the site is showing (chooser / list / city / agent) */
let siteView = "";
/** in the city: the building he's in ("outdoors" on the street) */
let citySection = "";

export function setSiteView(view: string) {
  siteView = view;
}

export function setCitySection(section: string) {
  citySection = section;
}

/** a GA4 + Umami event; a no-op wherever analytics isn't running */
export function track(name: string, params: Params = {}) {
  const p = { site_view: siteView || defaultView(), ...params };
  if (state === "checking") pending.push([name, p]);
  else if (state === "on") send(name, p);
}

function send(name: string, p: Params) {
  const w = window as GaWindow;
  w.gtag?.("event", name, p);
  if (umamiQueue) umamiQueue.push([name, p]);
  else w.umami?.track(name, p);
}

/** runs once per page load (the root layout's <Analytics />) */
export async function initAnalytics() {
  if (state !== "idle") return;
  state = "checking";
  if (!(await allowed())) {
    state = "off";
    pending = [];
    return;
  }
  load();
  loadUmami();
  state = "on";
  for (const [name, p] of pending) send(name, p);
  pending = [];
  document.addEventListener("click", onLinkClick, true);
  document.addEventListener("auxclick", onLinkClick, true); // middle-click: opened in a new tab
}

async function allowed() {
  if (process.env.NODE_ENV !== "production") return false;
  if (/^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname)) return false;
  if (optedOut() || browserOptOut()) return false;
  try {
    const res = await fetch("/ga/gate.php", { cache: "no-store" });
    if (!res.ok) return false;
    const gate = (await res.json()) as { analytics?: unknown };
    return gate.analytics === true;
  } catch {
    return false;
  }
}

function optedOut() {
  const q = new URLSearchParams(location.search).get("analytics");
  try {
    if (q === "off") localStorage.setItem(OPT_OUT_KEY, "1");
    if (q === "on") localStorage.removeItem(OPT_OUT_KEY);
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    return q === "off";
  }
}

function browserOptOut() {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === "1";
}

function load() {
  const w = window as GaWindow;
  if (w.gtag) return; // already set up (one tag per page, ever)
  w.dataLayer = w.dataLayer || [];
  w.gtag = function gtag() {
    // gtag.js needs the real `arguments` object, not an array
    // eslint-disable-next-line prefer-rest-params
    w.dataLayer!.push(arguments);
  };
  // analytics only: nothing for ads, ever
  w.gtag("consent", "default", {
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    analytics_storage: "granted",
  });
  w.gtag("js", new Date());
  // sends this page's page_view; no Google signals, no ad personalisation
  w.gtag("config", GA_ID, { allow_google_signals: false, allow_ad_personalization_signals: false });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

/**
 * Umami (cookieless). Its automatic tracking is off: it would count the site's
 * own ?view= URL rewrites (history.replaceState) as extra page views. Instead
 * exactly one page view is sent per page load, with the real URL and the
 * browser's real referrer, then the queued events.
 */
function loadUmami() {
  if (document.querySelector("script[data-website-id]")) return; // one tracker per page, ever
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://cloud.umami.is/script.js";
  s.dataset.websiteId = UMAMI_WEBSITE_ID;
  s.dataset.autoTrack = "false";
  s.dataset.doNotTrack = "true";
  s.dataset.domains = "eshaankapooswalla.com,www.eshaankapooswalla.com";
  s.onload = () => {
    const umami = (window as GaWindow).umami;
    if (!umami) return;
    umami.track(); // the page view
    for (const [name, p] of umamiQueue ?? []) umami.track(name, p);
    umamiQueue = null;
  };
  s.onerror = () => {
    umamiQueue = null; // blocked or offline: stop queueing
  };
  document.head.appendChild(s);
}

function defaultView() {
  return location.pathname.startsWith("/agent") ? "agent" : "chooser";
}

/**
 * One delegated listener for every link on every view: contact, profile,
 * project and résumé links get their own event. Other outbound links are left
 * to GA's enhanced measurement (`click`), so nothing is counted twice under
 * one name. Only the kind of link is sent: never an email address.
 */
function onLinkClick(e: MouseEvent) {
  if (e.type === "auxclick" && e.button !== 1) return;
  const a = (e.target as Element | null)?.closest?.("a[href]");
  if (!(a instanceof HTMLAnchorElement)) return;
  const event = classify(a.href);
  if (event) track(event[0], { ...event[1], link_location: locationOf(a) });
}

function classify(href: string): [string, Params] | null {
  if (href.startsWith("mailto:")) return ["contact_click", { method: "email" }];
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, "");
  const path = url.pathname.split("/").filter(Boolean);
  const file = path.at(-1) ?? "";
  // any résumé / CV PDF (there's none on the site yet: this picks one up when it's added)
  if (/\.pdf$/i.test(file) && /(^|[^a-z])(resume|résumé|cv)([^a-z]|$)/i.test(decodeURIComponent(file)))
    return ["resume_download", { file_name: file }];
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return ["social_click", { platform: "linkedin" }];
  if (host === "github.com" && path[0]?.toLowerCase() === site.githubUser.toLowerCase()) {
    if (path.length === 1) return ["social_click", { platform: "github" }];
    return ["project_click", { project_name: path[1], link_type: "github" }];
  }
  return null;
}

/** where on the page the link was: the section it's in, the top bar, or the city building */
function locationOf(a: Element) {
  const section = a.closest("section");
  const name =
    section?.id ||
    section?.getAttribute("aria-labelledby")?.replace(/^(agent|h)-/, "") ||
    section?.getAttribute("aria-label")?.toLowerCase();
  if (name) return name;
  if (a.closest("header, nav")) return "header";
  return citySection || "page";
}
