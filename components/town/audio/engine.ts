/**
 * Ambient audio for the city (Web Audio, no dependencies).
 *
 *  music     /audio/day.mp3 + /audio/night.mp3 if present (looped, cross-faded
 *            with day/night); otherwise a procedural New York jazz-lofi band
 *            over an 8-bar form with a turnaround: a Rhodes-style electric
 *            piano (9ths / 13ths, tremolo, humanized timing + velocity), a
 *            walking upright bass, swung brushes and ride, a sparse muted-
 *            trumpet lead (dorian / pentatonic phrases), soft string pads,
 *            vinyl crackle, reverb and tape warmth. Day ~92 bpm and brighter;
 *            night ~72 bpm, sparser, wetter. The music ducks ~2.5 dB under
 *            passing vehicles, and a limiter keeps the whole mix in check.
 *  ambience  distant traffic rumble, wind, the occasional far-off horn, and
 *            passing vehicles: a motorcycle putter and a sportscar growl that
 *            swell as they go by (driven by distance)
 *  sfx       footstep ticks while walking, a bicycle bell, speech-bubble pops
 *
 * Nothing is created until `start()` is called from a user gesture, and the
 * context is suspended while muted or while the tab is hidden.
 */

type Variant = "day" | "night";

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/**
 * One chord: bass root, a rootless Rhodes voicing, pad tones, and the scale
 * the lead may use. `beats` is how long it lasts (bars of 4/4 = 4 beats).
 */
type Chord = { root: number; rhodes: number[]; pad: number[]; scale: number[]; beats: number };
const ch = (root: number, rhodes: number[], pad: number[], scale: number[], beats = 4): Chord => ({ root, rhodes, pad, scale, beats });
// scales as semitone offsets from the chord root
const DORIAN = [0, 2, 3, 5, 7, 9, 10];
const MIXO = [0, 2, 4, 7, 9, 10]; // mixolydian, no 4th (avoid note)
const MAJ_PENT = [0, 2, 4, 7, 9];
const MIN_PENT = [0, 3, 5, 7, 10];

/*
 * 8-bar forms with a turnaround.
 * Day, in F:  | Gm9 | C13 | Fmaj9 | Dm9 | Gm9 | C7(b9) | Am7 D7 | Gm7 C7 |
 * Night, in Db: | Ebm9 | Ab13 | Dbmaj9 | Bbm9 | Ebm9 | Ab7(b9) | Fm7 Bb7 | Ebm7 Ab7 |
 */
const FORMS: Record<Variant, Chord[]> = {
  day: [
    ch(43, [58, 62, 65, 69], [55, 62, 65], DORIAN), // Gm9
    ch(48, [58, 62, 64, 69], [58, 64, 69], MIXO), // C13
    ch(41, [57, 60, 64, 67], [57, 64, 67], MAJ_PENT), // Fmaj9
    ch(38, [57, 60, 64, 65], [53, 60, 65], DORIAN), // Dm9
    ch(43, [58, 62, 65, 69], [55, 62, 65], DORIAN), // Gm9
    ch(48, [58, 61, 64, 67], [58, 64, 67], MIXO), // C7(b9)
    ch(45, [55, 60, 64, 67], [55, 60, 64], MIN_PENT, 2), // Am7
    ch(50, [54, 60, 64, 66], [54, 60, 66], MIXO, 2), // D7
    ch(43, [53, 58, 62, 65], [53, 58, 62], DORIAN, 2), // Gm7
    ch(48, [52, 58, 62, 64], [52, 58, 64], MIXO, 2), // C7
  ],
  night: [
    ch(39, [54, 58, 61, 65], [51, 58, 61], DORIAN), // Ebm9
    ch(44, [54, 58, 60, 65], [54, 60, 65], MIXO), // Ab13
    ch(37, [53, 56, 60, 63], [53, 60, 63], MAJ_PENT), // Dbmaj9
    ch(46, [53, 56, 60, 61], [49, 56, 61], DORIAN), // Bbm9
    ch(39, [54, 58, 61, 65], [51, 58, 61], DORIAN), // Ebm9
    ch(44, [54, 57, 60, 63], [54, 60, 63], MIXO), // Ab7(b9)
    ch(41, [51, 56, 60, 63], [51, 56, 60], MIN_PENT, 2), // Fm7
    ch(46, [50, 56, 60, 62], [50, 56, 62], MIXO, 2), // Bb7
    ch(39, [49, 54, 58, 61], [49, 54, 58], DORIAN, 2), // Ebm7
    ch(44, [48, 54, 58, 60], [48, 54, 60], MIXO, 2), // Ab7
  ],
};
const TEMPO: Record<Variant, number> = { day: 92, night: 72 };
/** reverb send per variant (night is wetter) */
const WET: Record<Variant, number> = { day: 0.22, night: 0.42 };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
/** a little human looseness: ± ms */
const hum = (ms: number) => rnd(-ms, ms) / 1000;

class CityAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private ambience!: GainNode;
  private sfx!: GainNode;
  private bus: Record<Variant, GainNode> = {} as Record<Variant, GainNode>;
  private noise!: AudioBuffer;
  private files: Partial<Record<Variant, AudioBuffer>> = {};
  /** per variant: the next swung eighth to schedule, and where we are in the form */
  private sched: Record<Variant, { step: number; next: number; chord: number; beatInChord: number; phraseLeft: number; lastLead: number }> = {
    day: { step: 0, next: 0, chord: 0, beatInChord: 0, phraseLeft: 0, lastLead: 70 },
    night: { step: 0, next: 0, chord: 0, beatInChord: 0, phraseLeft: 0, lastLead: 66 },
  };
  private duck!: GainNode;
  private verbIn!: GainNode;
  private sends: Partial<Record<Variant, GainNode>> = {};
  private vehicleLevel = { moto: 0, sports: 0 };
  private active: Variant = "day";
  private timer: ReturnType<typeof setInterval> | undefined;
  private hornTimer: ReturnType<typeof setTimeout> | undefined;
  private volume = 0.6;
  private voices: Partial<Record<"moto" | "sports", { gain: GainNode; oscs: OscillatorNode[]; base: number[]; lfo?: OscillatorNode }>> = {};
  private enabled = false;
  private hidden = false;

  get started() {
    return !!this.ctx;
  }
  /** for the HUD / tests */
  get status() {
    return { state: this.ctx?.state ?? "none", files: Object.keys(this.files), variant: this.active, enabled: this.enabled };
  }

  /**
   * Call this inside the click / key handler that picks free roam: the
   * AudioContext is created (or resumed) synchronously while the user
   * gesture is still active, and the music is switched on.
   */
  startFromGesture() {
    void this.start();
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
    this.setEnabled(true);
  }

  /** Must be called from (or after) a user gesture. Safe to call repeatedly. */
  async start() {
    if (this.ctx) return;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 3;
    // a brick-wall-ish limiter last, so nothing is ever harsh or too loud
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -3;
    limiter.knee.value = 0;
    limiter.ratio.value = 20;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.2;
    this.master.connect(comp).connect(limiter).connect(ctx.destination);

    // music → duck (dips under passing vehicles) → master
    this.duck = ctx.createGain();
    this.duck.gain.value = 1;
    this.duck.connect(this.master);
    this.music = ctx.createGain();
    this.music.gain.value = 0.9;
    this.music.connect(this.duck);
    // a shared plate-ish reverb for the music (a generated decaying-noise impulse)
    const verb = ctx.createConvolver();
    verb.buffer = this.impulse(ctx, 3.2);
    this.verbIn = ctx.createGain();
    this.verbIn.gain.value = 1;
    const verbOut = ctx.createGain();
    verbOut.gain.value = 0.55;
    this.verbIn.connect(verb).connect(verbOut).connect(this.music);
    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0.55;
    this.ambience.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.5;
    this.sfx.connect(this.master);

    // white-noise buffer reused by drums, wind, crackle and footsteps
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    for (const v of ["day", "night"] as const) {
      const g = ctx.createGain();
      g.gain.value = v === this.active ? 1 : 0;
      // tape warmth: gentle saturation, then a rolled-off top (darker at night)
      const sat = ctx.createWaveShaper();
      sat.curve = this.tapeCurve();
      sat.oversample = "2x";
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = v === "day" ? 5200 : 3000;
      lp.Q.value = 0.5;
      g.connect(sat).connect(lp).connect(this.music);
      const send = ctx.createGain();
      send.gain.value = WET[v];
      lp.connect(send).connect(this.verbIn);
      this.sends[v] = send;
      this.bus[v] = g;
    }

    await this.loadFiles();
    if (!this.files.day || !this.files.night) this.crackle();
    for (const v of ["day", "night"] as const) {
      const file = this.files[v];
      if (file) {
        const src = ctx.createBufferSource();
        src.buffer = file;
        src.loop = true;
        const fade = ctx.createGain();
        fade.gain.setValueAtTime(0, ctx.currentTime);
        fade.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5); // a short fade in
        src.connect(fade).connect(this.bus[v]);
        src.start();
      }
    }
    this.startAmbience();
    this.startVehicleVoices();
    const now = ctx.currentTime + 0.1;
    this.sched.day.next = now;
    this.sched.night.next = now;
    this.timer = setInterval(() => this.tick(), 25);
    this.scheduleHorn();
    this.apply();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    this.apply();
  }
  setVolume(v: number) {
    this.volume = v;
    this.apply();
  }
  setHidden(hidden: boolean) {
    this.hidden = hidden;
    this.apply();
  }
  /** Cross-fade the music between the day and night variants. */
  setVariant(v: Variant) {
    if (v === this.active) return;
    this.active = v;
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const k of ["day", "night"] as const) {
      const g = this.bus[k].gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(k === v ? 1 : 0, t + 3);
    }
    this.ambience.gain.setTargetAtTime(v === "day" ? 0.55 : 0.38, t, 1);
  }

  /** One footstep: a short, slightly random filtered tick. */
  step(running: boolean) {
    const ctx = this.ctx;
    if (!ctx || !this.audible()) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 700 + Math.random() * 500;
    bp.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(running ? 0.32 : 0.22, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(bp).connect(g).connect(this.sfx);
    src.start(t, Math.random() * 1.5, 0.09);
  }

  /** Passing-vehicle loudness (0–1) and engine rate (≈ speed factor). */
  setVehicle(kind: "moto" | "sports", level: number, rate = 1) {
    const ctx = this.ctx;
    const v = this.voices[kind];
    if (!ctx || !v) return;
    const t = ctx.currentTime;
    v.gain.gain.setTargetAtTime(level * (kind === "moto" ? 0.11 : 0.09), t, 0.12);
    v.oscs.forEach((o, i) => o.frequency.setTargetAtTime(v.base[i] * rate, t, 0.2));
    v.lfo?.frequency.setTargetAtTime(15 * rate, t, 0.2);
    // duck the music ~2.5 dB (→ 0.75) as the closest vehicle passes
    this.vehicleLevel[kind] = level;
    const near = Math.min(1, Math.max(this.vehicleLevel.moto, this.vehicleLevel.sports));
    this.duck.gain.setTargetAtTime(1 - 0.25 * near, t, 0.25);
  }

  /** A bicycle bell: two bright partials, rung twice. */
  bell() {
    const ctx = this.ctx;
    if (!ctx || !this.audible()) return;
    const t0 = ctx.currentTime + 0.02;
    for (const dt of [0, 0.19]) {
      for (const [f, g] of [
        [2637, 0.05],
        [3951, 0.025],
      ]) {
        const o = ctx.createOscillator();
        const a = ctx.createGain();
        o.frequency.value = f;
        a.gain.setValueAtTime(0, t0 + dt);
        a.gain.linearRampToValueAtTime(g, t0 + dt + 0.004);
        a.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.55);
        o.connect(a).connect(this.sfx);
        o.start(t0 + dt);
        o.stop(t0 + dt + 0.6);
      }
    }
  }

  /** A tiny "pop" when a speech bubble opens. */
  pop() {
    const ctx = this.ctx;
    if (!ctx || !this.audible()) return;
    const t = ctx.currentTime + 0.01;
    const o = ctx.createOscillator();
    const a = ctx.createGain();
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(980, t + 0.06);
    a.gain.setValueAtTime(0, t);
    a.gain.linearRampToValueAtTime(0.09, t + 0.008);
    a.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(a).connect(this.sfx);
    o.start(t);
    o.stop(t + 0.15);
  }

  private startVehicleVoices() {
    const ctx = this.ctx!;
    // motorcycle: low sawtooth + square through a lowpass, chopped by a fast LFO (the putter)
    {
      const out = ctx.createGain();
      out.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 520;
      const chop = ctx.createGain();
      chop.gain.value = 0.6;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 15;
      const depth = ctx.createGain();
      depth.gain.value = 0.4;
      lfo.connect(depth).connect(chop.gain);
      const base = [46, 92];
      const oscs = base.map((f, i) => {
        const o = ctx.createOscillator();
        o.type = i ? "square" : "sawtooth";
        o.frequency.value = f;
        o.connect(lp);
        o.start();
        return o;
      });
      lp.connect(chop).connect(out).connect(this.ambience);
      lfo.start();
      this.voices.moto = { gain: out, oscs, base, lfo };
    }
    // sportscar: two detuned saws (a growl) + a breathy band of noise (the whoosh)
    {
      const out = ctx.createGain();
      out.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1100;
      const base = [78, 117.5];
      const oscs = base.map((f) => {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.connect(lp);
        o.start();
        return o;
      });
      const whoosh = ctx.createBufferSource();
      whoosh.buffer = this.noise;
      whoosh.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 900;
      bp.Q.value = 0.8;
      const wg = ctx.createGain();
      wg.gain.value = 0.5;
      whoosh.connect(bp).connect(wg).connect(out);
      whoosh.start();
      lp.connect(out).connect(this.ambience);
      this.voices.sports = { gain: out, oscs, base };
    }
  }

  private audible() {
    return this.enabled && !this.hidden && this.volume > 0;
  }

  private apply() {
    const ctx = this.ctx;
    if (!ctx) return;
    const on = this.audible();
    const t = ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(this.master.gain.value, t);
    this.master.gain.linearRampToValueAtTime(on ? this.volume * 0.8 : 0, t + 0.4);
    if (on && ctx.state === "suspended") void ctx.resume();
    if (!on) setTimeout(() => !this.audible() && ctx.state === "running" && void ctx.suspend(), 500);
  }

  private async loadFiles() {
    const ctx = this.ctx!;
    await Promise.all(
      (["day", "night"] as const).map(async (v) => {
        try {
          const res = await fetch(`/audio/${v}.mp3`);
          if (!res.ok || (res.headers.get("content-type") ?? "").includes("text/html")) return;
          this.files[v] = await ctx.decodeAudioData(await res.arrayBuffer());
        } catch {}
      }),
    );
  }

  /* ── procedural music ────────────────────────────────────────────── */

  /** schedule a little ahead, one swung eighth at a time, for each audible variant */
  private tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const ahead = ctx.currentTime + 0.2;
    for (const v of ["day", "night"] as const) {
      if (this.files[v]) continue;
      const s = this.sched[v];
      const audible = this.bus[v].gain.value > 0.001 || v === this.active;
      const beat = 60 / TEMPO[v];
      if (s.next < ctx.currentTime - 0.5) s.next = ctx.currentTime + 0.05; // catch up after suspend
      while (s.next < ahead) {
        const onBeat = s.step % 2 === 0;
        if (audible) this.playEighth(v, s, s.next, beat);
        // swing: a triplet feel (long 2/3, short 1/3 of each beat)
        s.next += beat * (onBeat ? 0.64 : 0.36);
        s.step++;
        if (!onBeat) {
          // a beat went by: advance through the form
          s.beatInChord++;
          if (s.beatInChord >= FORMS[v][s.chord].beats) {
            s.beatInChord = 0;
            s.chord = (s.chord + 1) % FORMS[v].length;
          }
        }
      }
    }
  }

  private playEighth(v: Variant, s: (typeof this.sched)[Variant], t: number, beat: number) {
    const form = FORMS[v];
    const c = form[s.chord];
    const next = form[(s.chord + 1) % form.length];
    const onBeat = s.step % 2 === 0;
    const b = s.beatInChord; // beat within this chord
    const beatOfBar = (s.step >> 1) % 4;
    const out = this.bus[v];
    const day = v === "day";
    const chordStart = onBeat && b === 0;

    // strings: a soft pad under every chord
    if (chordStart) this.pad(c.pad, t, c.beats * beat, out, day ? 0.022 : 0.026, day ? 1400 : 900);

    // Rhodes comping
    if (day) {
      if (chordStart) this.rhodes(c.rhodes, t + hum(10), rnd(0.75, 1), beat * (c.beats >= 4 ? 2.2 : 1.4), out);
      if (!onBeat && b === 1 && c.beats >= 4 && Math.random() < 0.7) this.rhodes(c.rhodes.slice(1), t + hum(8), rnd(0.45, 0.6), beat * 0.9, out); // the "and of 2"
      if (!onBeat && b === c.beats - 1 && Math.random() < 0.35) this.rhodes(next.rhodes, t + hum(8), rnd(0.4, 0.55), beat * 1.1, out); // anticipation
    } else {
      if (chordStart) this.rhodes(c.rhodes, t + hum(14), rnd(0.65, 0.85), beat * c.beats * 0.95, out, 0.035); // slow roll
      if (onBeat && b === 2 && c.beats >= 4 && Math.random() < 0.3) this.rhodes([c.rhodes[1], c.rhodes[3]], t + hum(12), 0.4, beat * 1.6, out);
    }

    // walking bass (quarters by day; halves at night)
    if (onBeat && (day || b % 2 === 0)) {
      const len = day ? beat * 0.9 : beat * 1.9;
      this.upright(this.walk(c, next, b, day), t + hum(6), len, out, b === 0 ? 1 : rnd(0.75, 0.9));
    }

    // drums: ride ("ding, ding-da ding"), brushes on 2 and 4, a feathered kick
    if (onBeat) this.ride(t + hum(4), out, day ? (beatOfBar % 2 === 1 ? 0.06 : 0.045) : 0.035);
    else if (beatOfBar % 2 === 1 && (day || Math.random() < 0.5)) this.ride(t + hum(4), out, day ? 0.03 : 0.022); // the skip note
    if (onBeat && beatOfBar % 2 === 1) this.brush(t + hum(6), out, day ? 0.16 : 0.1);
    if (!onBeat && day) this.sweep(t, out, 0.018);
    if (onBeat && (day ? beatOfBar % 2 === 0 : beatOfBar === 0 && s.chord % 2 === 0)) this.kick(t, out, day ? 0.32 : 0.24);

    // the lead: a sparse phrase now and then, mostly resting
    if (s.phraseLeft === 0 && onBeat && b === 0 && s.chord % 2 === 0 && Math.random() < (day ? 0.5 : 0.32)) s.phraseLeft = Math.round(rnd(3, day ? 7 : 5));
    if (s.phraseLeft > 0 && Math.random() < (day ? 0.62 : 0.45)) {
      const note = this.leadNote(c, s.lastLead, day);
      s.lastLead = note;
      s.phraseLeft--;
      const last = s.phraseLeft === 0;
      this.trumpet(note, t + hum(15), (last ? beat * 1.6 : beat * rnd(0.4, 0.9)) * (day ? 1 : 1.3), out, rnd(0.7, 1));
    }
  }

  /** a walking line: root, chord tones, then a chromatic approach to the next root */
  private walk(c: Chord, next: Chord, b: number, day: boolean) {
    const fit = (n: number) => {
      while (n > 50) n -= 12;
      while (n < 33) n += 12;
      return n;
    };
    if (b === 0) return fit(c.root);
    if (b === c.beats - 1 || (!day && b === c.beats - 2)) return fit(next.root + (Math.random() < 0.5 ? 1 : -1)); // approach
    const tones = [c.root + 3 + (c.scale === MIXO || c.scale === MAJ_PENT ? 1 : 0), c.root + 7, c.root + 10, c.root + 5];
    return fit(tones[(b + Math.floor(Math.random() * 2)) % tones.length]);
  }

  /** the next lead note: a step or a small leap within the chord's scale, kept in range */
  private leadNote(c: Chord, last: number, day: boolean) {
    const lo = day ? 64 : 60;
    const hi = day ? 79 : 74;
    const pool: number[] = [];
    for (let n = lo; n <= hi; n++) if (c.scale.includes((((n - c.root) % 12) + 12) % 12)) pool.push(n);
    const near = pool.filter((n) => Math.abs(n - last) <= (Math.random() < 0.75 ? 3 : 7) && n !== last);
    const from = near.length ? near : pool;
    return from[Math.floor(Math.random() * from.length)];
  }

  /**
   * Rhodes-style electric piano: per note, an FM tine (1:1 modulator with a
   * fast-decaying index, plus a short bright 14:1 "bark") with a gentle
   * stereo tremolo. `roll` spreads the notes like a hand.
   */
  private rhodes(notes: number[], t: number, vel: number, len: number, out: AudioNode, roll = 0.012) {
    const ctx = this.ctx!;
    const pan = ctx.createStereoPanner();
    const trem = ctx.createOscillator();
    const tremDepth = ctx.createGain();
    trem.frequency.value = 4.2;
    tremDepth.gain.value = 0.35;
    trem.connect(tremDepth).connect(pan.pan);
    pan.connect(out);
    trem.start(t);
    trem.stop(t + len + 0.6);
    notes.forEach((note, i) => {
      const at = t + i * roll + hum(4);
      const f = midi(note);
      const v = vel * rnd(0.85, 1.05) * 0.05;
      const car = ctx.createOscillator();
      const mod = ctx.createOscillator();
      const modG = ctx.createGain();
      const bark = ctx.createOscillator();
      const barkG = ctx.createGain();
      const amp = ctx.createGain();
      car.frequency.value = f;
      car.detune.value = rnd(-5, 5);
      mod.frequency.value = f;
      modG.gain.setValueAtTime(f * (1.2 + vel), at);
      modG.gain.exponentialRampToValueAtTime(f * 0.05, at + 0.6);
      bark.frequency.value = f * 14;
      barkG.gain.setValueAtTime(f * 0.9 * vel, at);
      barkG.gain.exponentialRampToValueAtTime(1, at + 0.06);
      amp.gain.setValueAtTime(0, at);
      amp.gain.linearRampToValueAtTime(v, at + 0.006);
      amp.gain.exponentialRampToValueAtTime(v * 0.35, at + 0.5);
      amp.gain.exponentialRampToValueAtTime(0.0001, at + len + 0.4);
      mod.connect(modG).connect(car.frequency);
      bark.connect(barkG).connect(car.frequency);
      car.connect(amp).connect(pan);
      for (const o of [car, mod, bark]) {
        o.start(at);
        o.stop(at + len + 0.5);
      }
    });
  }

  /** upright bass: a plucked sine + triangle, a hint of pitch drop, woody lowpass */
  private upright(note: number, t: number, len: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    const f = midi(note);
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = "sine";
    o2.type = "triangle";
    for (const x of [o, o2]) {
      x.frequency.setValueAtTime(f * 1.012, t);
      x.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    }
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.exponentialRampToValueAtTime(380, t + 0.25);
    const peak = 0.19 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(peak * 0.45, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.1);
    o.connect(lp);
    o2.connect(lp);
    lp.connect(g).connect(out);
    for (const x of [o, o2]) {
      x.start(t);
      x.stop(t + len + 0.15);
    }
  }

  /** muted trumpet / sax-ish lead: a filtered saw with a breathy swell and delayed vibrato */
  private trumpet(note: number, t: number, len: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    const f = midi(note);
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.07); // a little scoop into the note
    const vib = ctx.createOscillator();
    const vibG = ctx.createGain();
    vib.frequency.value = 5.4;
    vibG.gain.setValueAtTime(0, t);
    vibG.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(len, 0.5));
    vib.connect(vibG).connect(o.frequency);
    const formant = ctx.createBiquadFilter(); // the mute
    formant.type = "bandpass";
    formant.frequency.value = 1350;
    formant.Q.value = 1.6;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(2400, t + 0.12);
    const g = ctx.createGain();
    const peak = 0.05 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.07);
    g.gain.setValueAtTime(peak * 0.9, t + Math.max(0.08, len - 0.12));
    g.gain.linearRampToValueAtTime(0, t + len + 0.08);
    o.connect(formant).connect(lp).connect(g).connect(out);
    for (const x of [o, vib]) {
      x.start(t);
      x.stop(t + len + 0.15);
    }
  }

  /** soft strings: three detuned saws per note, slow attack and release */
  private pad(notes: number[], t: number, len: number, out: AudioNode, gain: number, cutoff: number) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    lp.Q.value = 0.3;
    const g = ctx.createGain();
    const atk = Math.min(1.2, len * 0.4);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + atk);
    g.gain.setValueAtTime(gain, t + Math.max(atk, len - 0.3));
    g.gain.linearRampToValueAtTime(0, t + len + 0.9);
    lp.connect(g).connect(out);
    for (const n of notes) {
      for (const d of [-7, 0, 6]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = midi(n);
        o.detune.value = d;
        o.connect(lp);
        o.start(t);
        o.stop(t + len + 1);
      }
    }
  }

  /** ride cymbal: a cluster of inharmonic squares through a high band, a long-ish shimmer */
  private ride(t: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 5200;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 8200;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.003);
    g.gain.exponentialRampToValueAtTime(vel * 0.25, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    hp.connect(bp).connect(g).connect(out);
    for (const fr of [329, 474, 597, 793, 1034, 1201]) {
      const o = ctx.createOscillator();
      o.type = "square";
      o.frequency.value = fr * 1.7;
      o.connect(hp);
      o.start(t);
      o.stop(t + 0.95);
    }
  }

  private kick(t: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.32);
  }

  /** brushed snare on 2 and 4: a soft swish of band-passed noise */
  private brush(t: number, out: AudioNode, vel: number) {
    this.noiseHit(t, out, { type: "bandpass", freq: 2100, q: 0.55, attack: 0.025, len: 0.3, gain: vel });
  }
  /** the brush circling on the head between beats */
  private sweep(t: number, out: AudioNode, vel: number) {
    this.noiseHit(t, out, { type: "bandpass", freq: 3200, q: 0.4, attack: 0.08, len: 0.22, gain: vel });
  }
  private noiseHit(t: number, out: AudioNode, o: { type: BiquadFilterType; freq: number; q: number; attack: number; len: number; gain: number }) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = o.type;
    f.frequency.value = o.freq;
    f.Q.value = o.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(o.gain, t + o.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.len);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 1.5, o.len + 0.05);
  }

  /** a generated reverb impulse: stereo noise with an exponential decay */
  private impulse(ctx: AudioContext, seconds: number) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    return buf;
  }

  /** soft tape saturation */
  private tapeCurve() {
    const n = 1024;
    const curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 1.6) / Math.tanh(1.6);
    }
    return curve;
  }

  /** vinyl crackle: sparse pops over a faint hiss, looped */
  private crackle() {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.012;
      if (Math.random() < 0.0004) d[i] = (Math.random() * 2 - 1) * 0.7;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 900;
    const g = ctx.createGain();
    g.gain.value = 0.28;
    src.connect(hp).connect(g).connect(this.music);
    src.start();
  }

  /* ── city ambience ───────────────────────────────────────────────── */

  private loopNoise(filter: BiquadFilterType, freq: number, q: number, gain: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.ambience);
    src.start();
    return { f, g };
  }

  private lfo(param: AudioParam, rate: number, depth: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = depth;
    o.connect(g).connect(param);
    o.start();
  }

  private startAmbience() {
    const traffic = this.loopNoise("lowpass", 260, 0.5, 0.22); // distant rumble
    this.lfo(traffic.g.gain, 0.045, 0.07);
    const wind = this.loopNoise("bandpass", 520, 0.6, 0.06);
    this.lfo(wind.f.frequency, 0.07, 260);
    this.lfo(wind.g.gain, 0.05, 0.035);
  }

  /** a far-off taxi horn every so often (one or two short honks) */
  private scheduleHorn() {
    this.hornTimer = setTimeout(() => {
      this.horn();
      this.scheduleHorn();
    }, 16000 + Math.random() * 26000);
  }
  private horn() {
    const ctx = this.ctx;
    if (!ctx || !this.audible()) return;
    const t0 = ctx.currentTime + 0.05;
    const honks = Math.random() < 0.4 ? 2 : 1;
    const pan = ctx.createStereoPanner();
    pan.pan.value = Math.random() * 1.6 - 0.8;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1100;
    const g = ctx.createGain();
    g.gain.value = 0;
    lp.connect(g).connect(pan).connect(this.ambience);
    for (let h = 0; h < honks; h++) {
      const t = t0 + h * 0.32;
      for (const f of [392, 466]) {
        const o = ctx.createOscillator();
        o.type = "square";
        o.frequency.value = f + Math.random() * 4;
        o.connect(lp);
        o.start(t);
        o.stop(t + 0.22);
      }
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.06, t + 0.02);
      g.gain.setValueAtTime(0.06, t + 0.18);
      g.gain.linearRampToValueAtTime(0, t + 0.22);
    }
  }
}

export const cityAudio = new CityAudio();
