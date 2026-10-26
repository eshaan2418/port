// Screenshot harness for the town (dev server only; uses the dev-only window.__town hook).
// usage: node scripts/screenshot.mjs <name> <width> <height> [shot ...]
//   shot = "x,z,playerYaw,camYaw,camPitch,camDist"  (any field may be left empty)
// env: URL (default http://localhost:3000), SHOTS_DIR, START=1 keeps the start card open, GPU=1 (real GPU via Chrome/Metal), SETTLE ms,
//      TIME=<hours> sets the clock (e.g. TIME=0 for night), POV=1 first person,
//      HOME_ROOM=<room|follow> goes inside Home, ENTER=<tower> FLOOR=<i> ITEM=<slug> ARRIVE=<ms> goes inside a tower,
//      INTRO=1 plays the intro instead of skipping it (TIME is then forced from the first frame), and
//      CUES="hold:1.6,notice:0.5,speak:3,walk:1.2,out:1.9,wave:0.7,swing:1.2,end,free" captures at
//      those points of the timeline (phase:seconds-into-phase; "end" = just after the handoff, card open;
//      "free" = card closed)
import { chromium } from "playwright";

const OUT = process.env.SHOTS_DIR ?? ".";
const [, , name = "shot", w = "1440", h = "900", ...shots] = process.argv;
const mobile = +w < 768;
const browser = await chromium.launch(
  process.env.GPU
    ? { channel: "chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] }
    : { args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] },
);
const page = await browser.newPage({ viewport: { width: +w, height: +h }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
const logs = [];
page.on("console", (m) => m.type() === "error" && logs.push(m.text()));
page.on("pageerror", (e) => logs.push(e.message));
if (process.env.INTRO === "1" && process.env.TIME !== undefined)
  await page.addInitScript((h) => (window.__forceHour = h), +process.env.TIME); // the store reads it on creation
// the first-visit tutorial would talk over every shot: mark it done unless TUTORIAL=1
if (process.env.TUTORIAL !== "1") await page.addInitScript(() => localStorage.setItem("eshaan-city-tutorial", "done"));
await page.goto(process.env.URL ?? "http://localhost:3000/?view=city", { waitUntil: "load", timeout: 60000 });
await page.waitForFunction(() => window.__town?.useTown.getState().ready, null, { timeout: 60000 });

if (process.env.INTRO === "1") {
  const ORDER = ["hold", "notice", "speak", "getup", "walk", "out", "wave", "swing"];
  const cues = (process.env.CUES ?? "hold:1.6,notice:0.5,speak:3,walk:1.2,out:1.9,wave:0.7,swing:1.2,end,free").split(",");
  for (const cue of cues) {
    const [phase, at = "0"] = cue.split(":");
    if (phase === "free") {
      // the controls card dismissed: what the visitor is handed
      await page.evaluate(() => window.__town.useTown.getState().closeStart());
      await page.waitForTimeout(1500);
    } else if (phase === "end") {
      await page.waitForFunction(() => !window.__town.useTown.getState().intro, null, { timeout: 40000 });
      await page.waitForTimeout(900);
    } else {
      await page.waitForFunction(
        ({ i, at, order }) => {
          const it = window.__town.intro;
          const k = order.indexOf(it.phase);
          return k > i || k < 0 || (k === i && it.t >= at);
        },
        { i: ORDER.indexOf(phase), at: +at, order: ORDER },
        { timeout: 40000, polling: "raf" },
      ).catch(() => {});
    }
    await page.screenshot({ path: `${OUT}/${name}-${phase}.png` });
  }
  console.log(logs.slice(0, 10).join("\n") || "no console errors");
  await browser.close();
  process.exit(0);
}

// skip the intro (straight to the handoff), then close the controls card unless START=1
await page.evaluate(() => window.__town.useTown.getState().intro && window.__town.skipIntro());
await page.waitForFunction(() => !window.__town.useTown.getState().intro, null, { timeout: 10000 });
await page.waitForTimeout(500);
if (process.env.START !== "1") await page.evaluate(() => window.__town.useTown.getState().closeStart());
if (process.env.TIME !== undefined) {
  await page.evaluate((h) => window.__town.useTown.getState().setTimeOfDay(h), +process.env.TIME);
  await page.waitForTimeout(3500); // let the day/night cross-fade finish
}
if (process.env.POV === "1") await page.evaluate(() => window.__town.setPov(true));
if (process.env.ENTER) {
  // inside a tower: ENTER=experience|projects|extracurriculars|education, FLOOR=<index, top = 0>, ITEM=<project slug>
  await page.evaluate((id) => window.__town.enterBuilding(id), process.env.ENTER);
  await page.waitForTimeout(700);
  if (process.env.FLOOR !== undefined) await page.evaluate((f) => window.__town.useTown.getState().setFloor(f), +process.env.FLOOR);
  if (process.env.ITEM) {
    await page.waitForTimeout(2500);
    await page.evaluate((it) => window.__town.useTown.getState().setItem(it), process.env.ITEM);
  }
  if (process.env.TIMES) {
    // TIMES="1,2.5,4": capture the floor's arrival choreography at those seconds, then exit
    for (const at of process.env.TIMES.split(",").map(Number)) {
      await page.waitForFunction((at) => window.__town.runtime.room.t >= at, at, { timeout: 30000, polling: "raf" });
      await page.screenshot({ path: `${OUT}/${name}-t${at}.png` });
    }
    console.log(logs.slice(0, 10).join("\n") || "no console errors");
    await browser.close();
    process.exit(0);
  }
  await page.waitForTimeout(+(process.env.ARRIVE ?? 2600));
}
if (process.env.HOME_ROOM) {
  await page.evaluate((room) => {
    const s = window.__town.useTown.getState();
    s.setInterior("home");
    s.setHomeRoom(room === "follow" ? null : room);
  }, process.env.HOME_ROOM);
  await page.waitForTimeout(900);
}
await page.waitForTimeout(800);
for (const [i, s] of (shots.length ? shots : [""]).entries()) {
  const [x, z, yaw, cy, cp, cd] = s.split(",").map((v) => (v === "" || v === undefined ? undefined : +v));
  await page.evaluate(({ x, z, yaw, cy, cp, cd }) => {
    const { runtime } = window.__town;
    if (x !== undefined) runtime.player.x = x;
    if (z !== undefined) runtime.player.z = z;
    if (yaw !== undefined) runtime.player.yaw = yaw;
    if (cy !== undefined) runtime.camera.yaw = cy;
    if (cp !== undefined) runtime.camera.pitch = cp;
    if (cd !== undefined) runtime.camera.dist = cd;
  }, { x, z, yaw, cy, cp, cd });
  await page.waitForTimeout(+(process.env.SETTLE ?? 1600));
  await page.screenshot({ path: `${OUT}/${name}-${i}.png` });
}
console.log(logs.slice(0, 10).join("\n") || "no console errors");
await browser.close();
