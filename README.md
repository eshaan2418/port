# eshaan's city

An interactive low-poly New York City block you walk around in: there is no landing page. Next.js 16 (App Router) · TypeScript · Tailwind v4 · React Three Fiber + drei · zustand · GSAP (UI only). A plain DOM "list view" carries all the content too (SEO, screen readers, reduced motion, no WebGL).

> Status: **milestones 1–7**: the block, time of day, Home and the cinematic intro, the Experience Tower (10 floors), the Projects Gallery (5 floors), the Extracurriculars Tower (5 animated floors), Education + the post-office contact room, and the polish pass (list view, slow-device fallback, accessibility, SEO).

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

Then upload the **contents** of `dist/` (not the folder itself) into `public_html` with Hostinger's File Manager or FTP, keeping `.htaccess` (it's a hidden file; turn on "show hidden files"). Re-upload after every rebuild. Pages are folder-style (`/projects/jobber/` → `projects/jobber/index.html`), so no server rewrites are needed. Images are served as they are (static hosting has no image server). `npm run dev` keeps using `.next/`, so nothing from development ends up in `dist/`.

## Where to edit content

Everything lives in `/data`. No copy is hard-coded in components.

| File | What |
|---|---|
| `data/experiences.ts` | Experience rows, 3D gift tags, mobile cards. `role` is the short label shown everywhere; `summary` is the card body; `link` renders a real `<a>` (new tab, `rel="noopener noreferrer"`). Array order is the display order everywhere (newest first). |
| `data/projects.ts` | Projects. `floor` picks its gallery hall (`PROJECT_FLOORS` maps it to the theme: fintech & trading, systems & embedded, ML & AI, full-stack & apps, play & math; it's an internal key, never shown); `featured` ones get the big frames, large list tiles and a `/projects/<slug>` case-study placeholder. `imagePrompt` feeds the image script. |
| `components/town/interior/floors.ts` | What's on each tower floor: Experience rooms come from `data/experiences.ts` (array order = top to bottom); extracurricular plaques (and the optional `link` on the records floor for a source); floor moods. |
| `data/speech.ts` | Every speech-bubble line (see below). |
| `data/site.ts` | Name, email, LinkedIn, GitHub. |
| `components/Education.tsx`, `components/Contact.tsx` | Education facts and contact copy. |

## Logos

Each experience's `logo` (in `data/experiences.ts`) points to a file in `/public/logos/`, named after the experience `id`. **To swap a logo, replace the file** (same name), or drop in a new one and update the path's extension. Logos appear in the list view, the Experience Tower floor selector and floor plaques, and on the small brass plaque by each floor's elevator (the only logos drawn in 3D). Everywhere they sit in a fixed square slot on a small rounded cream tile with `object-fit: contain`: never stretched, never recoloured. Raster files keep their own background, with rounded corners on the tile.

| Company | File | Source |
|---|---|---|
| Cohere | `cohere.png` | official file (300 × 300) |
| Wealthsimple | `wealthsimple.jpeg` | official file (447 × 447) |
| Shopify | `shopify.svg` | simple-icons (CC0), brand green |
| Vector Institute | `vector-institute.jpeg` | official file (200 × 200) |
| Amazon Web Services (SBG) | `aws-sbg.svg` | devicon (MIT), original wordmark |
| Mali | `mali.svg` | **monogram placeholder** |
| YU Blueprint | `yu-blueprint.png` | official file (158 × 132) |
| ITREB Canada | `itreb-canada.jpeg` | official file (200 × 200) |
| Prince Aly Khan Hospital | `prince-aly-khan-hospital.svg` | **monogram placeholder** |
| AIESEC | `aiesec.jpeg` | official file (200 × 200) |

The two monograms are Space Grotesk initials outlined to paths (self-contained SVG). For a crisp result, prefer an SVG or a square PNG of at least ~120 × 120 px with the mark filling most of the canvas.

## Project images

Generated once at build-prep time, never at runtime, then committed.

```bash
# .env.local: IMAGE_PROVIDER=openai|gemini|replicate plus the matching key
#   OPENAI_API_KEY / GEMINI_API_KEY / REPLICATE_API_TOKEN
npm run images                      # only missing images
npm run images -- --force           # regenerate everything
npm run images -- --only=distdata   # one project (combine with --force to redo it)
```

Writes `public/projects/<slug>.webp` (1600×1000) and a blur placeholder into `data/project-images.json`. The shared style prefix is in `scripts/generate-project-images.ts`. Until an image exists, its tile shows an ink + accent gradient.

## The city

- `components/town/world/layout.ts`: the block as data: the 5 buildings (Home, Experience, Projects, Extracurriculars, Education; Education doubles as the post office, with a small "contact" board and mailbox) (position, size, floors, sign text), the street rings (square → street → sidewalk), street furniture, the park and pond, building signs, trees, and all colliders. Move or resize things here.
- `components/town/world/physics.ts`: circle/box collision that slides along walls (taxis add moving colliders). `world/nav.ts`: fast-travel routes along the sidewalk ring.
- `components/town/scene/*`: ground (street, crosswalks, sidewalks, park, promenade, river), buildings (brownstone, art deco, brick loft with fire escapes, round brick tower, the limestone Education building; repeating parts are instanced), billboard signs (each building has its own typeface: Fraunces, Limelight, Bebas Neue, Bungee, Cinzel; street signs in Barlow Condensed, all local .woff files in `public/fonts/`), street props (lamps, signals, hydrants, newspaper boxes, street signs, pretzel cart, subway entrance, steam), traffic (sedans, bicycles with pedalling riders, a motorcycle and a sportscar; they obey the signals and stop for Eshaan) and pigeons, a cat, birds and fireflies (`scene/Ambient.tsx`), skyline + bridge, time of day, character, player controller, camera rig, pointer input.
- `components/town/hud/*`: identity card, the clock (click it for the time scrubber; no time-zone label is shown) + day/night toggle + POV toggle, contact icons, "?" (the how-to card), sound toggle + volume, "view as list", fast-travel bar, door prompt, the "click on eshaan to get back focus" prompt + edge arrow, the start card, mobile joystick, interior HUD (room selector, plaque, back outside), speech bubble, loading screen.
- `components/town/interior/*`: the Home dollhouse (a diorama on its own stage you fade into: kitchen, study, bedroom with the front wall removed) and the enter / leave transitions.
- `components/town/intro/*`: the opening sequence (timeline, choreography, skip / handoff).
- `components/town/interior/Tower.tsx`: the shared tower cutaway: stacked floors with the front removed, an elevator on every floor, a camera that frames one floor at a time, his walk-out / arrival choreography and the speech anchor. `interior/<building>/*Interior.tsx` furnish each floor (`interior/kit.tsx` is the little furniture kit). `hud/TowerHud.tsx` is the floor selector, the plaques and "back outside".
- UI type: Manrope (UI), IBM Plex Mono (clocks, years, labels) and Fraunces (titles), via `next/font`.
- `components/town/TownShell.tsx`: city vs. list. `?view=list` deep-links to the list; reduced motion / no WebGL default to it with a notice and an "enter the town anyway" button.

All signage is generic and stylised: no real logos, transit branding or landmark names. Street signs use palette names (tiffany ave, orange st, cream st, ink pl).

**List view and fallbacks.** "view as list" (or `?view=list`) is a fast DOM page with everything: experiences newest first, projects by theme, extracurriculars, education and contact. It has its own look, in solid colours: a fixed ink navbar (section links with the current one underlined in orange, "back to the city", a menu on phones), a cream page, paper cards with a hairline, ink text, Hermès-orange accents and soft-Tiffany tags; Fraunces headings and DM Sans body (a local OFL file in `app/fonts/`, loaded with `next/font/local`). Experiences stack one per row; projects are text-only cards (the generated images are used in the 3D gallery). It's the default for `prefers-reduced-motion` and browsers without WebGL, and the city switches to it if the device is too slow (the median frame time of the first ~60 frames after load is over ~42 ms), each with a notice and "enter the town anyway". `?view=city` forces the city. The list is always in the DOM (visually hidden in city mode) for screen readers and search engines; the canvas is `aria-hidden`.

**Controls.** Desktop: WASD / arrows, Shift to run, click the ground to walk, click a building to walk to its door, E to enter (Esc or E to leave), drag to orbit (full 360°), right-drag / middle-drag / Shift + drag to pan (Shift + two-finger scroll on a trackpad), wheel to zoom, **V** for first person (pointer-lock mouse look; Esc to exit), **F** or Space to bring the camera back to Eshaan, **?** for the how-to card. Mobile: joystick, tap to walk, tap a door, one-finger drag to orbit, two-finger drag to pan, pinch to zoom; in first person, drag on the right half to look. The fast-travel bar works everywhere and is keyboard accessible; on arrival the camera turns to the building's sign for ~1.5 s.

**Time of day.** Everything reads one value: `timeOfDay` (hours) in the zustand store (`components/town/state.ts`). It starts at the current **America/Toronto** time (via `Intl.DateTimeFormat`, so daylight saving is handled; the HUD shows just the clock, without a "Toronto" label) and ticks in real time. The clock's scrubber jumps anywhere in the day ("now" returns to real time); the sun/moon toggle snaps it to 12:00 or 00:00. The visuals chase the clock as a quick time-lapse, and every hour's look (sky gradient, sun / moon arc and colour, fog, shadows, stars, glowing windows and lamps, fireflies) is keyframed in `scene/skyKeys.ts`: night → dawn (pale peach) → clear blue day → golden hour → sunset (orange) → dusk.

**Home and his day.** `lib/schedule.ts` is his routine (sleep 23:00–06:30; waking, stretching and breakfast 06:30–07:30; desk work 07:30–12:00 and 13:00–17:30; lunch 12:00–13:00; dinner then relaxing 17:30–19:30; studying 19:30–23:00). The Home dollhouse, the intro and his outdoor idles (coffee in the morning, stretching in the afternoon, watching the sunset, stargazing at night) all read it.

**The intro.** Every load opens inside the Home cutaway on what he's doing right now in Toronto (always real time, never a previously scrubbed one). He notices you ("!"), says the line for that activity (`intro_*` in `data/speech.ts`), gets up and heads out; the cutaway fades to the street, his front door opens, he comes down the stoop, waves, and sets off along the sidewalk while the camera swings round behind him. Then the HUD fades in and the "how to move around" card opens; its button is the first interaction, which unlocks audio (sound itself stays off until toggled). About 15–17 s. Throughout, everything is hidden and locked (only letterbox bars and the speech bubble show, and every key / pointer is ignored) except a small "skip" (bottom right, after ~3 s), Esc and Enter, which jump straight to the handoff. The words go to a polite live region for screen readers. Reduced motion skips it entirely (as does the list view). Timings, the stroll and the camera are in `components/town/intro/intro.ts`; the in-house moves (sitting up, standing, the way to the stairs) are `INTRO_MOVES` in `interior/HomeInterior.tsx`.

**The towers.** Walk up to a door (or use the fast-travel bar) and press E / tap: you fade into a dollhouse cutaway. The floor selector (right side on desktop, a strip at the bottom on phones; ↑ / ↓ keys too) sends him up and down: the view slides to the floor with motion streaks and the floor's tint, the elevator opens, he walks out, turns to you and says his line. Every floor has a plaque with the real details and links.

- **Experience Tower:** 10 floors, newest first (Cohere at the top down to AIESEC), each a small themed room. The only real logos in 3D are the small brass plaques by the elevator.
- **Projects Gallery:** 5 themed gallery halls (fintech & trading at the bottom up to play & math at the top), with framed screens (the featured four are bigger). Click a frame or pick a name on the plaque: he walks over and reads the project's description, and the plaque shows its image, tags and GitHub link. Frames show `/public/projects/<slug>.webp` once generated, else the gradient.
- **Extracurriculars Tower:** hall of records (spotlights snap on, a medal turns, gold confetti), dojo (lanterns, tatami, petals; a kata and a slow-motion board break), the rink (laps with speed trails; inline → ice skates mid-way with a spin and an ice spray), brain gym (self-writing chalkboard, orbiting symbols, an ICPC-style scoreboard, a balloon per solved problem), AWS community hall (silhouettes fill the chairs as the counter climbs to 200+). Each plays from the moment he steps out of the elevator.
- **Education:** York University upstairs (cap and books), the post office downstairs: the contact card ("Send me a note →", LinkedIn, GitHub, © 2026) and a mailbox that sends a letter flying when he waves.

**Speech bubbles.** Every line is in `data/speech.ts` as `{ id, text, approved }`. Edit the text there; set `approved: true` once you're happy. While `REQUIRE_APPROVAL` is false every line shows so you can review them in place; flip it to true to show only approved lines. The list view repeats the Home and extracurricular lines in plain text (experience and project lines restate their plaques / descriptions, which the list shows in full). Gallery frames read each project's own description from `data/projects.ts`, unchanged.

### Music and sound

Muted by default; audio starts only after the visitor turns it on (a user gesture), pauses while the tab is hidden, and has a keyboard-accessible mute toggle and volume slider.

- **Your tracks:** put royalty-free or CC0 loops at `public/audio/day.mp3` and `public/audio/night.mp3`. If both exist they're used (looped, cross-faded with day/night). Keep the licence/attribution for each file in `public/audio/LICENSES.md` (or the README), and only use tracks whose licence allows use on a personal website.
- **Fallback (current):** a procedural lo-fi jazz loop generated with the Web Audio API (`components/town/audio/engine.ts`): FM electric-piano chords, mellow bass, brushed drums and vinyl crackle; brighter at 82 bpm by day, slower and sparser at 64 bpm at night. It's original and has no licensing concerns.
- **Under the music:** distant traffic rumble, wind, an occasional far-off horn, a motorcycle putter and a sportscar growl that swell as they pass, a bicycle bell when a cyclist is near, footstep ticks, and a soft pop when a speech bubble opens.

### The character model

Drop a glTF at `public/models/eshaan.glb` and it's picked up automatically (the height is normalised to ~1.75 units). Expected animation clip names, all optional; missing ones fall back to procedural poses:

`idle`, `walk`, `run`, `sit`, `sleep`, `eat`, `type`, `read`, `kick`, `punch`, `skate`, `wave`, `celebrate`

Used so far: `idle`, `walk`, `run`, plus `sleep`, `eat`, `type`, `read`, `sit` (relaxing), `celebrate` (stretching, the cheer in the hall of records), `wave` (the intro, the post office), `punch` and `kick` (the dojo kata) and `skate` (the rink) when present; anything missing falls back to the placeholder's procedural pose with props (mug, fork, book, laptop, inline and ice skates). Skates are only drawn on the placeholder; a model should carry its own.

### Screenshots

`node scripts/screenshot.mjs <name> <width> <height> "x,z,playerYaw,camYaw,camPitch,camDist" …` against the dev server (`GPU=1` uses Chrome with the real GPU; `SHOTS_DIR` sets the output folder). The intro is skipped unless `INTRO=1`; then `TIME=<hours>` forces the routine from the first frame and `CUES="hold:1.6,notice:0.5,speak:3,walk:1.2,out:1.9,wave:0.7,swing:1.2,end,free"` captures at those points of the timeline.

## Scripts

- `npm run dev` / `build` / `start` / `lint`
- `npm run images`: project image generation (see above)
