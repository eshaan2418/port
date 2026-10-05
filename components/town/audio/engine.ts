/**
 * Ambient audio for the city (Web Audio, no dependencies).
 *
 *  music     /audio/day.mp3 + /audio/night.mp3 if present (looped, cross-faded
 *            with day/night); otherwise a procedural lo-fi jazz loop: FM
 *            electric-piano chords, a mellow bass, brushed drums, vinyl
 *            crackle. Day is brighter and fuller; night slower and sparser.
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

// ii–V–I–vi colours: brighter C major by day, a darker Ab/Eb colour at night
const PROGRESSIONS: Record<Variant, { root: number; voicing: number[] }[]> = {
  day: [
    { root: 38, voicing: [53, 57, 60, 64] }, // Dm9
    { root: 43, voicing: [53, 57, 59, 64] }, // G13
    { root: 48, voicing: [52, 55, 59, 62] }, // Cmaj9
    { root: 45, voicing: [55, 59, 60, 64] }, // Am9
  ],
  night: [
    { root: 41, voicing: [56, 60, 63, 67] }, // Fm9
    { root: 46, voicing: [56, 60, 62, 67] }, // Bb13
    { root: 39, voicing: [55, 58, 62, 65] }, // Ebmaj9
    { root: 36, voicing: [55, 58, 62, 63] }, // Cm(add9)
  ],
};
const TEMPO: Record<Variant, number> = { day: 82, night: 64 };

class CityAudio {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private music!: GainNode;
  private ambience!: GainNode;
  private sfx!: GainNode;
  private bus: Record<Variant, GainNode> = {} as Record<Variant, GainNode>;
  private noise!: AudioBuffer;
  private files: Partial<Record<Variant, AudioBuffer>> = {};
  private sched: Record<Variant, { step: number; next: number }> = { day: { step: 0, next: 0 }, night: { step: 0, next: 0 } };
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
    this.master.connect(comp).connect(ctx.destination);

    this.music = ctx.createGain();
    this.music.gain.value = 0.9;
    this.music.connect(this.master);
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
      // gentle tape-ish tone shaping per variant
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = v === "day" ? 3600 : 1900;
      g.connect(lp).connect(this.music);
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
        src.connect(this.bus[v]);
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
      g.linearRampToValueAtTime(k === v ? 1 : 0, t + 2.6);
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

  private tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== "running") return;
    const ahead = ctx.currentTime + 0.15;
    for (const v of ["day", "night"] as const) {
      if (this.files[v]) continue;
      const s = this.sched[v];
      // only voice the variant that's audible (or fading)
      const audible = this.bus[v].gain.value > 0.001 || v === this.active;
      const sixteenth = 60 / TEMPO[v] / 4;
      if (s.next < ctx.currentTime - 0.5) s.next = ctx.currentTime + 0.05; // catch up after suspend
      while (s.next < ahead) {
        if (audible) this.playStep(v, s.step, s.next, sixteenth);
        // swing: long-short sixteenth pairs
        s.next += sixteenth * (s.step % 2 === 0 ? 1.18 : 0.82);
        s.step = (s.step + 1) % (16 * 8);
      }
    }
  }

  private playStep(v: Variant, step: number, t: number, sixteenth: number) {
    const bar = Math.floor(step / 16);
    const pos = step % 16;
    // night holds each chord for two bars
    const chord = PROGRESSIONS[v][(v === "night" ? Math.floor(bar / 2) : bar) % 4];
    const out = this.bus[v];
    const beat = sixteenth * 4;

    if (v === "day") {
      if (pos === 0) this.chord(chord.voicing, t, 0.055, beat * 2.6, out, 0.012);
      if (pos === 7) this.chord(chord.voicing.slice(1), t, 0.032, beat * 1.4, out, 0.006);
      if (pos === 0) this.bass(chord.root, t, beat * 1.8, out);
      if (pos === 8) this.bass(chord.root + 7, t, beat * 1.2, out);
      if (pos === 14) this.bass(chord.root + 5, t, beat * 0.5, out, 0.6);
      if (pos === 0 || pos === 10) this.kick(t, out, 0.55);
      if (pos === 4 || pos === 12) this.brush(t, out, 0.2);
      if (pos % 2 === 0) this.hat(t, out, pos % 4 === 0 ? 0.05 : 0.03);
      if (bar % 4 === 3 && pos === 12) this.tine(chord.voicing[3] + 12, t, 0.03, beat * 2, out); // little fill
    } else {
      if (pos === 0 && bar % 2 === 0) this.chord(chord.voicing, t, 0.05, beat * 6, out, 0.04); // slow strum
      if (pos === 0 && bar % 2 === 1) this.tine(chord.voicing[2] + 12, t + beat * 1.5, 0.028, beat * 3, out);
      if (pos === 0) this.bass(chord.root, t, beat * 3.5, out, 0.8);
      if (pos === 0 && bar % 2 === 0) this.kick(t, out, 0.4);
      if (pos === 8) this.brush(t, out, 0.13);
      if (pos === 6 || pos === 14) this.hat(t, out, 0.018);
    }
  }

  /** Electric-piano-ish tine: FM sine with a fast-decaying modulation index. */
  private tine(note: number, t: number, gain: number, len: number, out: AudioNode) {
    const ctx = this.ctx!;
    const f = midi(note);
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const amp = ctx.createGain();
    car.frequency.value = f;
    car.detune.value = (Math.random() - 0.5) * 8;
    mod.frequency.value = f;
    modGain.gain.setValueAtTime(f * 1.6, t);
    modGain.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.4);
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(gain, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + len);
    mod.connect(modGain).connect(car.frequency);
    car.connect(amp).connect(out);
    car.start(t);
    mod.start(t);
    car.stop(t + len + 0.05);
    mod.stop(t + len + 0.05);
  }

  private chord(notes: number[], t: number, gain: number, len: number, out: AudioNode, strum: number) {
    notes.forEach((n, i) => this.tine(n, t + i * strum, gain, len, out));
  }

  private bass(note: number, t: number, len: number, out: AudioNode, vel = 1) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = "sine";
    o2.type = "triangle";
    o.frequency.value = midi(note);
    o2.frequency.value = midi(note);
    lp.type = "lowpass";
    lp.frequency.value = 420;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(lp);
    o2.connect(lp);
    lp.connect(g).connect(out);
    o.start(t);
    o2.start(t);
    o.stop(t + len + 0.05);
    o2.stop(t + len + 0.05);
  }

  private kick(t: number, out: AudioNode, vel: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(110, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel * 0.5, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.35);
  }

  /** brushed snare: a soft swish of band-passed noise */
  private brush(t: number, out: AudioNode, vel: number) {
    this.noiseHit(t, out, { type: "bandpass", freq: 1900, q: 0.6, attack: 0.02, len: 0.26, gain: vel });
  }
  private hat(t: number, out: AudioNode, vel: number) {
    this.noiseHit(t, out, { type: "highpass", freq: 7000, q: 0.7, attack: 0.002, len: 0.05, gain: vel });
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
    g.gain.value = 0.35;
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
