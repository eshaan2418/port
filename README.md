# eshaan's city

An interactive low-poly New York City block you walk around in. A first-load chooser offers **free roam** (the 3D city), the **normal website** (a list view) or an **AI agent version** (`/agent`). Next.js 16 (App Router) · TypeScript · Tailwind v4 · React Three Fiber + drei · zustand · GSAP (UI only). A plain DOM "list view" carries all the content too (SEO, screen readers, reduced motion, no WebGL).

> Status: **milestones 1–7** and their change requests: the block, time of day, Home and the cinematic intro, the Experience Tower (one room per role), the Projects Gallery (one hall), the Extracurriculars Tower (5 animated floors), Education + the post-office contact room, the mode chooser, the normal website and the agent version.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

Node 22 is pinned in `mise.toml` (`mise install` if you use mise).

## Deploy (Hostinger or any static host)

The site is a static export: `npm run build` writes everything as plain HTML/CSS/JS into **`dist/`** (about 4 MB), including an `.htaccess` for Hostinger's web server (the 404 page, caching, compression).

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com npm run build   # the domain makes the share-preview (OG) links absolute
```

Then upload the **contents** of `dist/` (not the folder itself) into `public_html` with Hostinger's File Manager or FTP, keeping `.htaccess` (it's a hidden file; turn on "show hidden files"). Re-upload after every rebuild. Pages are folder-style (`/agent/` → `agent/index.html`), so no server rewrites are needed. Images are served as they are (static hosting has no image server). `npm run dev` keeps using `.next/`, so nothing from development ends up in `dist/`.

## Where to edit content

Everything lives in `/data`. No copy is hard-coded in components.

| File | What |
|---|---|
| `data/experiences.ts` | Experience, in display order (Cohere first). Each entry is only: logo, role, company (with " · Internship" where it applies), date range, and one short line; Vector also has the research paper `link`. The normal website, the Experience Tower rooms, the agent view and its files all read it. `hideOnWebsite` leaves an entry off the normal website only. |
| `data/projects.ts` | Projects, in display order (the same fixed order everywhere). `onWebsite: true` + a `shortDescription` (a condensation using only the description's own words) mark the ones on the normal website; the 3D gallery and the agent files always list every project with the full description. No language / tech tags are stored or shown. |
| `data/extracurriculars.ts`, `data/education.ts` | Extracurricular facts and education details, shared by the city, the list view and the agent view. |
| `components/town/interior/floors.ts` | What's on each tower floor: Experience rooms come from `data/experiences.ts` (array order = top to bottom); extracurriculars from `data/extracurriculars.ts` (the optional `link` on the records floor is for a source); floor moods. |
| `data/speech.ts` | Every speech-bubble line (see below). |
| `data/site.ts` | Name, the subtitle under it ("CS @ York University"), email, LinkedIn, GitHub. |
| `components/list/ListView.tsx` | The normal website's layout (contact copy lives here). |

## Logos

Each experience's `logo` (in `data/experiences.ts`) points to a file in `/public/logos/`, named after the experience `id`. **To swap a logo, replace the file** (same name), or drop in a new one and update the path's extension. Logos appear in the list view, the Experience Tower floor selector and floor plaques, and on the small brass plaque by each floor's elevator (the only logos drawn in 3D). Everywhere they sit in a fixed square slot on a small rounded cream tile with `object-fit: contain`: never stretched, never recoloured. Raster files keep their own background, with rounded corners on the tile.

| Company | File | Source |
|---|---|---|
| Cohere | `cohere.png` | official file (300 × 300) |
| Wealthsimple | `wealthsimple.jpeg` | official file (447 × 447) |
| Shopify | `shopify.svg` | simple-icons (CC0), brand green |
| Vector Institute | `vector-institute.jpeg` | official file (200 × 200) |
| Amazon Web Services (AWS) | `aws-sbg.svg` | devicon (MIT), original wordmark |
| York University | `york.png` | official file (300 × 300) |
| Mali | `mali.svg` | **monogram placeholder** |
| YU Blueprint | `yu-blueprint.png` | official file (158 × 132) |
| ITREB Canada | `itreb-canada.jpeg` | official file (200 × 200) |
| VEX Robotics | `vex-robotics.svg` | **monogram placeholder** |
| Prince Aly Khan Hospital | `prince-aly-khan-hospital.svg` | **monogram placeholder** |
| AIESEC | `aiesec.jpeg` | official file (200 × 200) |

The three monograms are Space Grotesk initials outlined to paths (self-contained SVG). For a crisp result, prefer an SVG or a square PNG of at least ~120 × 120 px with the mark filling most of the canvas.

## Project images

None are used. Every view shows text-first project cards (name, description and the GitHub link; no language or tech labels anywhere), and the 3D frames are typographic panels. If you ever add a real image at `public/projects/<slug>.webp`, it's picked up at build time and shown on that project's card, plaque and frame; otherwise there's no image box at all. `scripts/generate-project-images.ts` (`npm run images`) is still in the repo but nothing depends on it.

## The city

- `components/town/world/layout.ts`: the block as data: the 5 buildings (Home, Experience, Projects, Extracurriculars, Education; Education doubles as the post office, with a small "contact" board and mailbox) (position, size, floors, sign text), the street rings (square → street → sidewalk), street furniture, the park and pond, building signs, trees, and all colliders. Move or resize things here.
- `components/town/world/physics.ts`: circle/box collision that slides along walls (taxis add moving colliders). Every collider has a height (`h` in `layout.ts`): while flying, Eshaan clears anything below his altitude, and building tops are `roof` colliders he can land on (`floorAt`). `world/nav.ts`: fast-travel routes along the sidewalk ring.
- `components/town/scene/*`: ground (street, crosswalks, sidewalks, park, promenade, river), buildings (brownstone, art deco, brick loft with fire escapes, round brick tower, the limestone Education building; repeating parts are instanced), billboard signs (each building has its own typeface: Fraunces, Limelight, Bebas Neue, Bungee, Cinzel; street signs in Barlow Condensed, all local .woff files in `public/fonts/`), street props (lamps, signals, hydrants, newspaper boxes, street signs, pretzel cart, subway entrance, steam), traffic (sedans, bicycles with pedalling riders, a motorcycle and a sportscar; they obey the signals and stop for Eshaan) and pigeons, a cat, birds and fireflies (`scene/Ambient.tsx`), skyline + bridge, time of day, character, player controller, camera rig, pointer input.
- `components/town/hud/*`: identity card, the clock (click it for the time scrubber; no time-zone label is shown) + day/night toggle + POV toggle, contact icons, "?" (the how-to card), "view as list", fast-travel bar, door prompt, the "click on eshaan to get back focus" prompt + edge arrow, the start card, mobile joystick, interior HUD (room selector, plaque, back outside), speech bubble, loading screen.
- `components/town/interior/*`: the Home dollhouse (a diorama on its own stage you fade into: kitchen, study, bedroom with the front wall removed) and the enter / leave transitions.
- `components/town/intro/*`: the opening sequence (timeline, choreography, skip / handoff).
- `components/town/interior/Tower.tsx`: the shared tower cutaway: stacked floors with the front removed, an elevator on every floor, a camera that frames one floor at a time, his walk-out / arrival choreography and the speech anchor. `interior/<building>/*Interior.tsx` furnish each floor (`interior/kit.tsx` is the little furniture kit). `hud/TowerHud.tsx` is the floor selector, the plaques and "back outside".
- UI type: Manrope (UI), IBM Plex Mono (clocks, years, labels) and Fraunces (titles), via `next/font`.
- `components/town/TownShell.tsx` + `components/chooser/Chooser.tsx`: the mode chooser and what shows at `/` (see **Modes** below).

All signage is generic and stylised: no real logos, transit branding or landmark names. Street signs use palette names (tiffany ave, orange st, cream st, ink pl).

**Modes.** The first load shows a full-screen chooser: **free roam** (the 3D city; a "works best on a laptop" note on touch or modest hardware, judged from `hardwareConcurrency`, `deviceMemory` and the pointer type), **normal website** (the list view) or **ai agent version** (`/agent`). Cards: Tab + Enter or the keys 1 / 2 / 3. It shows on every visit to `/`; every view has a "switch mode" button (`/?choose=1`). The 3D bundle is only downloaded once free roam is picked, and free roam starts the intro; the other two skip it. `?view=list`, `?view=city` and `?view=agent` deep-link past the chooser. Reduced motion and no WebGL still go straight to the list (with a notice), and a slow device drops from the city to the list. The chooser is an overlay: all content stays in the server-rendered HTML at `/`.

**Agent version.** `/agent` is server-rendered semantic HTML in IBM Plex Mono, Tiffany on ink, with no canvas or scripts needed. The same content is at `/agent.md` and `/llms-full.txt` (Markdown) and `/agent.json` (structured data), with an index at `/llms.txt`. There's also JSON-LD (`Person`, `sameAs` LinkedIn and GitHub) on `/` and `/agent`, `<link rel="alternate">` tags, `/sitemap.xml` and `/robots.txt` (allow all). All of it is generated at build time from `/data/*` by `lib/agent.ts`, so there's one source of truth. Build with `NEXT_PUBLIC_SITE_URL` set to make the links in these files absolute.

**Normal website and fallbacks.** The normal website (or `?view=list`) is one server-rendered screen: on desktop (≥1100 × 800) it fits the window with no scrolling (a `100dvh` grid; type scales with `clamp()` / `vh`; shorter windows keep the columns and scroll). A slim top bar holds the name (Space Grotesk 600) with "CS @ York University" and the York logo, plus github / linkedin / email, "switch mode" and "explore in 3D →". Below it are three columns: experience (one row per role: logo, role, dates, company with an "Internship" chip, the one line; entries with `hideOnWebsite` are left out, currently VEX Robotics and AIESEC), projects (identical tiles, 3 columns, filling the height: the `onWebsite` projects with their `shortDescription`, each tile linking to its repo), and education, extracurriculars (one fact per row; this card fills the rest of the column) and a compact contact card. Nothing is ever truncated; text wraps in full. Under 1100px wide it stacks into one scrolling column (top bar, education, experience, extracurriculars, projects, contact), which is also the DOM order. Colours: a flat white page and navy cards with white text; every colour is a CSS variable at the top of the `.list-view` block in `app/globals.css` (all pairs pass WCAG AA). Fonts: Space Grotesk + DM Sans, local OFL files in `app/fonts/`. It's the default for `prefers-reduced-motion` and browsers without WebGL, and the city switches to it if the device is too slow (the median frame time of the first ~60 frames after load is over ~42 ms), each with a notice and "enter anyway". `?view=city` forces the city. Its content is always in the DOM (visually hidden in the other modes) for screen readers and search engines; the canvas is `aria-hidden`.

**The suit and flight.** Outside, Eshaan always wears an original navy-and-orange armour suit (helmet, chest core, glowing palms, boot thrusters; drawn in `scene/Character.tsx`, not a copy of any film suit). Inside Home he's in his usual clothes. He can fly anywhere outside: hold **Space** to go up (he hovers when you let go), hold **C** to come down and land, move with WASD as usual (Shift boosts). Flight has momentum, he leans forward into fast flight, the thrusters flame and hum with how hard he's pushing, and he can land on any roof. He tops out just above the highest roof (Experience's crown), below the tip of its spire, so he can land on any roof, including each step of the crown and the flat top of the Extracurriculars copper roof. Doors only work on the ground, and fast travel brings him down on the way. On touch screens, hold the ▲ / ▼ buttons above the joystick.

**The tutorial.** On a first visit, Eshaan teaches the controls himself in a speech bubble over his head (`components/town/hud/Tutorial.tsx`), one step at a time, and each step waits until you've done it: walk in all four directions (W A S D), run (Shift), fly up (Space), fly around, come down and land (C), fast travel with the bottom bar, and go inside a door (E). Touch screens get the joystick and ▲ / ▼ versions. Each step ends with a quick "nice!"; a closing line follows once you're back outside. It's remembered in `localStorage` (`eshaan-city-tutorial`), so later visits open the "how to move around" card instead. "skip tutorial" ends it, and "replay the tutorial" on the "?" card runs it again. The screenshot harness marks it done unless `TUTORIAL=1`.

**Controls.** Desktop: WASD / arrows, Shift to run (boost when flying), Space / C to fly up / down, click the ground to walk, click a building to walk to its door, E to enter (Esc or E to leave), drag to orbit (full 360°), right-drag / middle-drag / Shift + drag to pan (Shift + two-finger scroll on a trackpad), wheel to zoom, **V** for first person (pointer-lock mouse look; Esc to exit), **F** to bring the camera back to Eshaan, **?** for the how-to card. Mobile: joystick, ▲ / ▼ to fly, tap to walk, tap a door, one-finger drag to orbit, two-finger drag to pan, pinch to zoom; in first person, drag on the right half to look. The fast-travel bar works everywhere and is keyboard accessible; on arrival the camera turns to the building's sign for ~1.5 s.

**Time of day.** Everything reads one value: `timeOfDay` (hours) in the zustand store (`components/town/state.ts`). It starts at the current time in the site's time zone (`TIME_ZONE` in `lib/time.ts`, via `Intl.DateTimeFormat`, so daylight saving is handled; the HUD shows just the clock) and ticks in real time. The clock's scrubber jumps anywhere in the day ("now" returns to real time); the sun/moon toggle snaps it to 12:00 or 00:00. The visuals chase the clock as a quick time-lapse, and every hour's look (sky gradient, sun / moon arc and colour, fog, shadows, stars, glowing windows and lamps, fireflies) is keyframed in `scene/skyKeys.ts`: night → dawn (pale peach) → clear blue day → golden hour → sunset (orange) → dusk.

**Home and his day.** `lib/schedule.ts` is his routine (sleep 23:00–06:30; waking, stretching and breakfast 06:30–07:30; desk work 07:30–12:00 and 13:00–17:30; lunch 12:00–13:00; dinner then relaxing 17:30–19:30; studying 19:30–23:00). The Home dollhouse, the intro and his outdoor idles (coffee in the morning, stretching in the afternoon, watching the sunset, stargazing at night) all read it.

**The intro.** Every load opens inside the Home cutaway on what he's doing right now (the site clock, always real time, never a previously scrubbed one). He notices you ("!"), says the line for that activity (`intro_*` in `data/speech.ts`), gets up and heads out; the cutaway fades to the street, his front door opens, he comes down the stoop, waves, and sets off along the sidewalk while the camera swings round behind him. Then the HUD fades in and the "how to move around" card opens. About 15–17 s. Throughout, everything is hidden and locked (only letterbox bars and the speech bubble show, and every key / pointer is ignored) except the "skip intro →" button (bottom right, shown from the start, with an Enter key-cap hint on desktop), Esc and Enter, which jump straight to the handoff. The words go to a polite live region for screen readers. Reduced motion skips it entirely (as does the list view). Timings, the stroll and the camera are in `components/town/intro/intro.ts`; the in-house moves (sitting up, standing, the way to the stairs) are `INTRO_MOVES` in `interior/HomeInterior.tsx`.

**The towers.** Walk up to a door (or use the fast-travel bar) and press E / tap: you fade into a dollhouse cutaway. In the towers with several floors, the floor selector (right side on desktop, a strip at the bottom on phones; ↑ / ↓ keys too) sends him up and down: the view slides to the floor with motion streaks and the floor's tint, the elevator opens, he walks out, turns to you and says his line. Every floor has a plaque with the real details and links.

- **Experience Tower:** one small themed room per role, in the order of `data/experiences.ts` (Cohere at the top down to AIESEC), including a lecture room for the York TA role and a robot workshop for VEX. Each plaque shows only the role, company, dates, the one line (and Vector's paper link). The only real logos in 3D are the small brass plaques by the elevator.
- **Projects Gallery:** one hall (no floor selector) with every project hung in three rows on the back wall, in the fixed order from `data/projects.ts`, all the same size. Each frame is a typographic panel: the name in the gallery's board font and an orange or Tiffany border. Click a frame or pick a name on the plaque: he walks over, the camera moves in, he reads the project's description, and the plaque shows the description and the GitHub link.
- **Extracurriculars Tower:** hall of records (spotlights snap on, a medal turns, gold confetti), dojo (lanterns, tatami, petals; a kata and a slow-motion board break), the rink (laps with speed trails; inline → ice skates mid-way with a spin and an ice spray), brain gym (self-writing chalkboard, orbiting symbols, an ICPC-style scoreboard, a balloon per solved problem), AWS community hall (silhouettes fill the chairs as the counter climbs to 200+). Each plays from the moment he steps out of the elevator.
- **Education:** York University upstairs (cap and books), the post office downstairs: the contact card ("Send me a note →", LinkedIn, GitHub, © 2026) and a mailbox that sends a letter flying when he waves.

**Speech bubbles.** Every line is in `data/speech.ts` as `{ id, text, approved }`. Edit the text there; set `approved: true` once you're happy. While `REQUIRE_APPROVAL` is false every line shows so you can review them in place; flip it to true to show only approved lines. The list view repeats the Home and extracurricular lines in plain text (experience and project lines restate their plaques / descriptions, which the list shows in full). Gallery frames read each project's own description from `data/projects.ts`, unchanged.

### Music and sound

Audio plays only in free roam. Picking free roam on the chooser (or "explore in 3D" on the normal website) is the user gesture that starts it: the AudioContext is created in that click, so the music plays as the world loads. Reaching the city without a click (`?view=city`) starts it on the first click or key press. There's no sound button or volume slider; **M** is a silent mute / unmute shortcut. It pauses while the tab is hidden and stops whenever you leave the city (switch mode, the normal website, the agent view).

- **Your tracks:** drop loops at `public/audio/day.mp3` and `public/audio/night.mp3`. If a file exists it replaces that variant's procedural music: looped seamlessly, with a short fade in, cross-faded (~3 s) with day / night. Only use tracks whose licence allows use on a personal website, and keep each file's licence / attribution in `public/audio/LICENSES.md`. Sources that are fine:
  - **Pixabay Music** (Pixabay Content License): free for this use, no attribution required.
  - **Free Music Archive**: pick tracks licensed **CC0** (no attribution) or **CC BY** (attribution required). Avoid NC / ND variants unless you're sure they fit.
  - **Incompetech** (Kevin MacLeod): CC BY 4.0, so attribution is required.

  If a track needs attribution, add a credits line to the "how to move around" card (`components/town/hud/StartCard.tsx`), for example: "music: “Track” by Artist (CC BY 4.0)".
- **Fallback (current, no files):** an original procedural "suit up" anthem from the Web Audio API (`components/town/audio/engine.ts`), with no licensing concerns. It plays an 8-bar minor progression (day in E minor: Em · C · G · D · Em · C · Am · B; night the same a step lower):
  - **Day, 126 bpm:** distorted power-chord guitars (palm-muted chugs plus syncopated hits), a driving 8th-note synth bass, rock drums with crashes, and a brass/string bed.
  - **Night, 100 bpm:** half-time drums, square-wave arpeggios, pads and big sustained guitar chords.
  - **The theme:** an original synth-brass lead plays every other time through the form.

  A reverb, tape saturation and a limiter sit on the mix. The two variants cross-fade over ~3 s when day / night changes, and the music ducks ~2.5 dB as a vehicle passes close. To compare them by ear, add `?audio=day` or `?audio=night` to the URL (it pins that variant).
- **Under the music:** distant traffic rumble, wind, an occasional far-off horn, a motorcycle putter and a sportscar growl that swell as they pass, a bicycle bell when a cyclist is near, footstep ticks, the suit's thruster roar while flying, and a soft pop when a speech bubble opens.

### The character model

Drop a glTF at `public/models/eshaan.glb` and it's picked up automatically (the height is normalised to ~1.75 units). Expected animation clip names, all optional; missing ones fall back to procedural poses:

`idle`, `walk`, `run`, `sit`, `sleep`, `eat`, `type`, `read`, `kick`, `punch`, `skate`, `wave`, `celebrate`

Used so far: `idle`, `walk`, `run`, plus `sleep`, `eat`, `type`, `read`, `sit` (relaxing), `celebrate` (stretching, the cheer in the hall of records), `wave` (the intro, the post office), `punch` and `kick` (the dojo kata) and `skate` (the rink) when present; anything missing falls back to the placeholder's procedural pose with props (mug, fork, book, laptop, inline and ice skates). Skates are only drawn on the placeholder; a model should carry its own.

### Screenshots

`node scripts/screenshot.mjs <name> <width> <height> "x,z,playerYaw,camYaw,camPitch,camDist" …` against the dev server (`GPU=1` uses Chrome with the real GPU; `SHOTS_DIR` sets the output folder). The intro is skipped unless `INTRO=1`; then `TIME=<hours>` forces the routine from the first frame and `CUES="hold:1.6,notice:0.5,speak:3,walk:1.2,out:1.9,wave:0.7,swing:1.2,end,free"` captures at those points of the timeline.

## Scripts

- `npm run dev` / `build` / `start` / `lint`
- `npm run images`: project image generation (see above)
