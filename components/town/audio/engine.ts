/**
 * Ambient audio for the city (Web Audio, no dependencies).
 *
 *  music     /audio/day.mp3 + /audio/night.mp3 if present (looped, cross-faded
 *            with day/night); otherwise an original, procedural "suit up"
 *            anthem over an 8-bar minor progression: distorted power-chord
 *            guitars (palm-muted chugs + syncopated hits), a driving synth
 *            bass, rock drums with crashes, string/brass pads and a soaring
 *            synth-brass lead theme on every other pass. Day: E minor, 126
 *            bpm, full band. Night: the same theme a step lower (D minor),
 *            100 bpm, half-time, arpeggios and pads, wetter. The music ducks
 *            ~2.5 dB under passing vehicles; a limiter keeps the mix in check.
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

/** one bar of the form: the root (MIDI, low register), whether it's major, and the lead's notes for it */
type Bar = { root: number; major: boolean; lead: [eighth: number, note: number, eighths: number][] };

/*
 * The theme (original), in E minor, 8 bars of 4/4:
 *   | Em | C | G | D | Em | C | Am | B |
 * The lead rises B–D–E, falls back, climbs to a held high G, and ends on
 * D#–F# over B (the "here it comes again" turnaround). Night plays the same
 * form 2 semitones lower (D minor).
 */
const THEME: Bar[] = [
  { root: 40, major: false, lead: [[0, 71, 3], [3, 74, 1], [4, 76, 4]] }, // Em
  { root: 36, major: true, lead: [[0, 76, 2], [2, 74, 2], [4, 72, 4]] }, // C
  { root: 43, major: true, lead: [[0, 74, 3], [3, 71, 1], [4, 67, 4]] }, // G
  { root: 38, major: true, lead: [[0, 69, 2], [2, 71, 2], [4, 74, 3], [7, 78, 1]] }, // D
  { root: 40, major: false, lead: [[0, 79, 6], [6, 78, 1], [7, 76, 1]] }, // Em
  { root: 36, major: true, lead: [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 71, 2]] }, // C
  { root: 45, major: false, lead: [[0, 72, 3], [3, 71, 1], [4, 69, 2], [6, 72, 2]] }, // Am
  { root: 47, major: true, lead: [[0, 75, 4], [4, 78, 2], [6, 71, 2]] }, // B
];
const SHIFT: Record<Variant, number> = { day: 0, night: -2 };
const TEMPO: Record<Variant, number> = { day: 126, night: 100 };
/** reverb send per variant (night is wetter) */
const WET: Record<Variant, number> = { day: 0.18, night: 0.4 };
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
/** a little human looseness: ± ms */
const hum = (ms: number) => rnd(-ms, ms) / 1000;
/** triad tones above a root */
const triad = (root: number, major: boolean) => [root, root + (major ? 4 : 3), root + 7];

class CityAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private ambience!: GainNode;
  private sfx!: GainNode;
  private bus: Record<Variant, GainNode> = {} as Record<Variant, GainNode>;
  private noise!: AudioBuffer;
  private files: Partial<Record<Variant, AudioBuffer>> = {};
  /** per variant: the next eighth to schedule (step counts eighths from the start) */
  private sched: Record<Variant, { step: number; next: number }> = { day: { step: 0, next: 0 }, night: { step: 0, next: 0 } };
  private distCurve: Float32Array | null = null;
  private duck!: GainNode;
  private verbIn!: GainNode;
  private sends: Partial<Record<Variant, GainNode>> = {};
  private vehicleLevel = { moto: 0, sports: 0 };
  private thruster: { gain: GainNode; filter: BiquadFilterNode; hum: OscillatorNode } | null = null;
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
      lp.frequency.value = v === "day" ? 9000 : 5200;
      lp.Q.value = 0.5;
      g.connect(sat).connect(lp).connect(this.music);
      const send = ctx.createGain();
      send.gain.value = WET[v];
      lp.connect(send).connect(this.verbIn);
      this.sends[v] = send;
      this.bus[v] = g;
    }

    await this.loadFiles();
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

  /** The suit's thrusters, 0–1: a jet roar (filtered noise) over a low turbine hum. */
  setThrust(level: number) {
    const ctx = this.ctx;
    const v = this.thruster;
    if (!ctx || !v) return;
    const t = ctx.currentTime;
    v.gain.gain.setTargetAtTime(level * 0.16, t, 0.08);
    v.filter.frequency.setTargetAtTime(500 + level * 1400, t, 0.1);
    v.hum.frequency.setTargetAtTime(70 + level * 60, t, 0.15);
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
    // the suit's thrusters: band-passed noise + a low triangle hum, silent until he flies
    {
      const out = ctx.createGain();
      out.gain.value = 0;
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 600;
      filter.Q.value = 0.6;
      const hum = ctx.createOscillator();
      hum.type = "triangle";
      hum.frequency.value = 70;
      const humG = ctx.createGain();
      humG.gain.value = 0.35;
      src.connect(filter).connect(out);
      hum.connect(humG).connect(out);
      out.connect(this.sfx);
      src.start();
      hum.start();
      this.thruster = { gain: out, filter, hum };
    }
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

  /** schedule a little ahead, one straight eighth at a time, for each audible variant */
  private tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const ahead = ctx.currentTime + 0.2;
    for (const v of ["day", "night"] as const) {
      if (this.files[v]) continue;
      const s = this.sched[v];
      const audible = this.bus[v].gain.value > 0.001 || v === this.active;
      const eighth = 60 / TEMPO[v] / 2;
      if (s.next < ctx.currentTime - 0.5) s.next = ctx.currentTime + 0.05; // catch up after suspend
      while (s.next < ahead) {
        if (audible) this.playEighth(v, s.step, s.next, eighth);
        s.next += eighth;
        s.step++;
      }
    }
  }

  private playEighth(v: Variant, step: number, t: number, eighth: number) {
    const out = this.bus[v];
    const day = v === "day";
    const e = step % 8; // eighth within the bar
    const barN = Math.floor(step / 8);
    const bar = THEME[barN % THEME.length];
    const pass = Math.floor(barN / THEME.length); // which time through the form
    const root = bar.root + SHIFT[v];
    const chord = triad(root + 12, bar.major); // mid register
    const power = [root + 12, root + 19, root + 24]; // root, 5th, octave
    const withLead = pass % 2 === 1; // the theme plays every other pass
    const bigBar = barN % 4 === 0;

    if (day) {
      // guitars: palm-muted eighth chugs, big chords on 1, the "and" of 2, and 4
      if (e === 0 || e === 3 || e === 6) this.guitar(power, t + hum(4), eighth * (e === 6 ? 2 : 1.5), out, e === 0 ? 1 : 0.85, false);
      else this.guitar([root + 12, root + 19], t + hum(4), eighth * 0.55, out, 0.55, true);
      // bass: driving eighths, the octave on the off-beats
      this.synthBass(root + (e % 2 ? 12 : 0), t, eighth * 0.85, out, e === 0 ? 1 : 0.8);
      // drums
      if (e === 0 || e === 4 || e === 5) this.kick(t, out, e === 5 ? 0.6 : 0.9);
      if (e === 2 || e === 6) this.snare(t + hum(3), out, 0.55);
      this.hat(t + hum(3), out, e % 2 ? 0.035 : 0.05);
      if (e === 0 && bigBar) this.crash(t, out, withLead ? 0.22 : 0.15);
      // brass / strings swell under each bar
      if (e === 0) this.pad(chord.map((n) => n + 12), t, eighth * 8, out, withLead ? 0.02 : 0.014, 2600);
    } else {
      // night: arpeggios over pads, half-time drums, a big sustained chord every 2 bars
      const arp = [chord[0], chord[1], chord[2], chord[0] + 12, chord[2], chord[1], chord[2] + 12, chord[1] + 12];
      this.arp(arp[e] + 12, t + hum(3), eighth * 0.9, out, e % 2 ? 0.6 : 0.85);
      if (e === 0) this.pad(chord, t, eighth * 8, out, 0.028, 1600);
      if (e === 0 && barN % 2 === 0) this.guitar(power, t, eighth * 14, out, 0.45, false, 1400);
      if (e % 2 === 0) this.synthBass(root, t, eighth * 1.7, out, e === 0 ? 0.95 : 0.7);
      if (e === 0) this.kick(t, out, 0.75);
      if (e === 4) this.snare(t + hum(3), out, 0.4);
      if (e % 2 === 1) this.hat(t, out, 0.022);
      if (e === 0 && bigBar && withLead) this.crash(t, out, 0.1);
    }

    // the lead theme
    if (withLead) {
      for (const [at, note, len] of bar.lead) {
        if (at === e) this.lead(note + SHIFT[v], t + hum(6), eighth * len * (day ? 0.95 : 1.05), out, day ? 1 : 0.8);
      }
    }
  }

  /** a hard-clipping distortion curve (shared) */
  private distortion() {
    if (this.distCurve) return this.distCurve;
    const n = 2048;
    const c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      c[i] = Math.tanh(x * 9) * 0.9;
    }
    this.distCurve = c;
    return c;
  }

  /**
   * Distorted guitar: two detuned saws per note → distortion → cabinet
   * filtering. `muted` = a short, dark palm-muted chug.
   */
  private guitar(notes: number[], t: number, len: number, out: AudioNode, vel: number, muted: boolean, tone = 3600) {
    const ctx = this.ctx!;
    const pre = ctx.createGain();
    pre.gain.value = 0.35;
    const dist = ctx.createWaveShaper();
    dist.curve = this.distortion() as Float32Array<ArrayBuffer>;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 90;
    const cab = ctx.createBiquadFilter();
    cab.type = "lowpass";
    cab.frequency.value = muted ? 1100 : tone;
    cab.Q.value = 0.7;
    const mid = ctx.createBiquadFilter();
    mid.type = "peaking";
    mid.frequency.value = 1600;
    mid.gain.value = 3;
    const amp = ctx.createGain();
    const peak = (muted ? 0.05 : 0.07) * vel;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak, t + 0.005);
    amp.gain.setValueAtTime(peak * 0.85, t + Math.max(0.01, len - 0.06));
    amp.gain.linearRampToValueAtTime(0, t + len + (muted ? 0.02 : 0.25));
    pre.connect(dist).connect(hp).connect(cab).connect(mid).connect(amp).connect(out);
    for (const n of notes) {
      for (const d of [-8, 8]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = midi(n);
        o.detune.value = d;
        o.connect(pre);
        o.start(t);
        o.stop(t + len + 0.3);
      }
    }
  }

  /** synth bass: a saw + a sine sub, with a filter that snaps shut */
  private synthBass(note: number, t: number, len: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    const f = midi(note);
    const saw = ctx.createOscillator();
    saw.type = "sawtooth";
    saw.frequency.value = f;
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = f / 2;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 4;
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(260, t + Math.min(0.25, len));
    const g = ctx.createGain();
    const peak = 0.12 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.006);
    g.gain.setValueAtTime(peak * 0.8, t + Math.max(0.01, len - 0.03));
    g.gain.linearRampToValueAtTime(0, t + len + 0.03);
    saw.connect(lp);
    sub.connect(lp);
    lp.connect(g).connect(out);
    for (const o of [saw, sub]) {
      o.start(t);
      o.stop(t + len + 0.05);
    }
  }

  /** the lead: a bright synth-brass (two saws + a square an octave up), a filter that opens, delayed vibrato */
  private lead(note: number, t: number, len: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    const f = midi(note);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(3800, t + 0.12);
    const g = ctx.createGain();
    const peak = 0.045 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.04);
    g.gain.setValueAtTime(peak * 0.9, t + Math.max(0.05, len - 0.08));
    g.gain.linearRampToValueAtTime(0, t + len + 0.15);
    const vib = ctx.createOscillator();
    const vibG = ctx.createGain();
    vib.frequency.value = 5.6;
    vibG.gain.setValueAtTime(0, t);
    vibG.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(len, 0.45));
    vib.connect(vibG);
    lp.connect(g).connect(out);
    const oscs: OscillatorNode[] = [];
    for (const [type, mult, det, gain] of [
      ["sawtooth", 1, -6, 1],
      ["sawtooth", 1, 6, 1],
      ["square", 2, 0, 0.35],
    ] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mult;
      o.detune.value = det;
      vibG.connect(o.frequency);
      const og = ctx.createGain();
      og.gain.value = gain;
      o.connect(og).connect(lp);
      oscs.push(o);
    }
    for (const o of [...oscs, vib]) {
      o.start(t);
      o.stop(t + len + 0.2);
    }
  }

  /** night arpeggio: a plucky square through a closing filter */
  private arp(note: number, t: number, len: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.value = midi(note);
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(2600, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + len);
    const g = ctx.createGain();
    const peak = 0.03 * vel;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.05);
    o.connect(lp).connect(g).connect(out);
    o.start(t);
    o.stop(t + len + 0.08);
  }

  /** strings / brass bed: three detuned saws per note, slow attack and release */
  private pad(notes: number[], t: number, len: number, out: AudioNode, gain: number, cutoff: number) {
    const ctx = this.ctx!;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    lp.Q.value = 0.3;
    const g = ctx.createGain();
    const atk = Math.min(0.6, len * 0.3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + atk);
    g.gain.setValueAtTime(gain, t + Math.max(atk, len - 0.2));
    g.gain.linearRampToValueAtTime(0, t + len + 0.5);
    lp.connect(g).connect(out);
    for (const n of notes) {
      for (const d of [-7, 0, 6]) {
        const o = ctx.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = midi(n);
        o.detune.value = d;
        o.connect(lp);
        o.start(t);
        o.stop(t + len + 0.6);
      }
    }
  }

  private kick(t: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.7, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.3);
    // a click on top, so it cuts through the guitars
    this.noiseHit(t, out, { type: "highpass", freq: 3000, q: 0.7, attack: 0.001, len: 0.02, gain: vel * 0.12 });
  }

  /** rock snare: a noise crack plus a short tonal body */
  private snare(t: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    this.noiseHit(t, out, { type: "bandpass", freq: 2200, q: 0.6, attack: 0.002, len: 0.2, gain: vel * 0.9 });
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(210, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vel * 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.14);
  }
  private hat(t: number, out: AudioNode, vel: number) {
    this.noiseHit(t, out, { type: "highpass", freq: 8000, q: 0.7, attack: 0.001, len: 0.045, gain: vel });
  }
  private crash(t: number, out: AudioNode, vel: number) {
    this.noiseHit(t, out, { type: "highpass", freq: 4500, q: 0.4, attack: 0.002, len: 1.6, gain: vel });
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
    src.start(t, Math.random() * Math.max(0, 1.9 - o.len), o.len + 0.05); // stay inside the 2 s noise buffer
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
