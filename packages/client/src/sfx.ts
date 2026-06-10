// Part C — audio. Procedural WebAudio synthesis instead of vendored CC0 packs:
// loudness-consistent by construction, zero binary assets, swappable later
// (see OPEN-QUESTIONS). One ambient drone per act; the Witness is a text-blip.

type SfxName =
  | 'card_place' | 'card_unstage' | 'link_fire' | 'resonance' | 'detonate'
  | 'hit_light' | 'hit_mid' | 'hit_heavy' | 'block' | 'fray' | 'sever'
  | 'fallen' | 'revive' | 'covet' | 'purchase' | 'map_move'
  | 'ready_p1' | 'ready_p2' | 'witness_blip';

interface Volumes { master: number; sfx: number; ambient: number }

const VOL_KEY = 'tb_volumes';

class Audio {
  private ctx: AudioContext | null = null;
  private sfxGain!: GainNode;
  private ambientGain!: GainNode;
  private masterGain!: GainNode;
  private ambientNodes: AudioNode[] = [];
  private currentAct = 0;
  volumes: Volumes;

  constructor() {
    const saved = localStorage.getItem(VOL_KEY);
    this.volumes = saved ? JSON.parse(saved) : { master: 0.5, sfx: 0.6, ambient: 0.25 };
  }

  /** Browsers require a user gesture before audio; call from any click/keydown. */
  unlock(): void {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);
      this.ambientGain = this.ctx.createGain();
      this.ambientGain.connect(this.masterGain);
      this.applyVolumes();
    } catch {
      this.ctx = null;
    }
  }

  setVolume(kind: keyof Volumes, v: number): void {
    this.volumes[kind] = v;
    localStorage.setItem(VOL_KEY, JSON.stringify(this.volumes));
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    this.masterGain.gain.value = this.volumes.master;
    this.sfxGain.gain.value = this.volumes.sfx;
    this.ambientGain.gain.value = this.volumes.ambient;
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; slide?: number; delay?: number } = {}): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const osc = this.ctx.createOscillator();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + opts.slide), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(opts.gain ?? 0.18, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, opts: { gain?: number; lp?: number; hp?: number; delay?: number } = {}): void {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + (opts.delay ?? 0);
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    let node: AudioNode = src;
    if (opts.lp) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = opts.lp;
      node.connect(f);
      node = f;
    }
    if (opts.hp) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'highpass';
      f.frequency.value = opts.hp;
      node.connect(f);
      node = f;
    }
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(opts.gain ?? 0.15, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    node.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  play(name: SfxName): void {
    if (!this.ctx) return;
    switch (name) {
      case 'card_place': this.tone(660, 0.06, { type: 'triangle', gain: 0.1 }); this.noise(0.04, { gain: 0.05, lp: 3000 }); break;
      case 'card_unstage': this.tone(440, 0.06, { type: 'triangle', gain: 0.08, slide: -120 }); break;
      case 'link_fire': this.tone(880, 0.1, { type: 'sine', gain: 0.12 }); this.tone(1320, 0.12, { gain: 0.08, delay: 0.05 }); break;
      case 'resonance':
        this.tone(523, 0.4, { gain: 0.1 }); this.tone(659, 0.4, { gain: 0.1, delay: 0.06 });
        this.tone(784, 0.5, { gain: 0.12, delay: 0.12 }); this.tone(1047, 0.6, { gain: 0.1, delay: 0.18 });
        break;
      case 'detonate': this.noise(0.25, { gain: 0.3, lp: 1200 }); this.tone(90, 0.25, { type: 'square', gain: 0.18, slide: -50 }); break;
      case 'hit_light': this.noise(0.07, { gain: 0.12, lp: 2500 }); this.tone(200, 0.07, { type: 'square', gain: 0.07 }); break;
      case 'hit_mid': this.noise(0.12, { gain: 0.2, lp: 1800 }); this.tone(140, 0.12, { type: 'square', gain: 0.12, slide: -40 }); break;
      case 'hit_heavy': this.noise(0.2, { gain: 0.3, lp: 1200 }); this.tone(80, 0.22, { type: 'square', gain: 0.2, slide: -30 }); break;
      case 'block': this.tone(300, 0.08, { type: 'square', gain: 0.08 }); this.noise(0.05, { gain: 0.06, hp: 1500 }); break;
      case 'fray': this.noise(0.3, { gain: 0.2, hp: 2000 }); this.tone(1200, 0.18, { type: 'sawtooth', gain: 0.07, slide: -900 }); break;
      case 'sever': this.noise(0.15, { gain: 0.22, hp: 3000 }); this.tone(1600, 0.1, { type: 'sawtooth', gain: 0.08, slide: -1400 }); break;
      case 'fallen': this.tone(220, 0.8, { gain: 0.12, slide: -160 }); this.tone(110, 1.0, { gain: 0.1, slide: -70, delay: 0.1 }); break;
      case 'revive': this.tone(330, 0.3, { gain: 0.1 }); this.tone(495, 0.35, { gain: 0.1, delay: 0.12 }); this.tone(660, 0.45, { gain: 0.12, delay: 0.24 }); break;
      case 'covet': this.tone(740, 0.1, { type: 'triangle', gain: 0.1 }); this.tone(988, 0.14, { type: 'triangle', gain: 0.08, delay: 0.07 }); break;
      case 'purchase': this.tone(1175, 0.06, { type: 'triangle', gain: 0.1 }); this.tone(880, 0.08, { type: 'triangle', gain: 0.08, delay: 0.05 }); break;
      case 'map_move': this.noise(0.12, { gain: 0.08, lp: 900 }); this.tone(160, 0.1, { gain: 0.06 }); break;
      case 'ready_p1': this.tone(587, 0.12, { gain: 0.1 }); this.tone(880, 0.16, { gain: 0.08, delay: 0.08 }); break;
      case 'ready_p2': this.tone(494, 0.12, { gain: 0.1 }); this.tone(740, 0.16, { gain: 0.08, delay: 0.08 }); break;
      case 'witness_blip': this.tone(1100, 0.025, { type: 'square', gain: 0.045 }); break;
    }
  }

  /** One drone per act; sparser for the finale (Part C). */
  setAmbient(act: number): void {
    if (!this.ctx || act === this.currentAct) return;
    this.currentAct = act;
    for (const n of this.ambientNodes) {
      try { (n as OscillatorNode).stop?.(); } catch { /* already stopped */ }
      n.disconnect();
    }
    this.ambientNodes = [];
    if (act < 1) return;
    const roots: Record<number, number[]> = {
      1: [55, 82.4, 110],        // A1 minor stack — the Undercroft
      2: [61.7, 92.5, 123.5],    // B1 — the Hollow Choir, a step up and wronger
      3: [49, 98],               // G1 — the Last Braid, sparse
    };
    for (const [i, f] of (roots[act] ?? roots[1]).entries()) {
      const osc = this.ctx.createOscillator();
      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = 0.05 / (i + 1);
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.03;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.02;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      osc.connect(g);
      g.connect(this.ambientGain);
      osc.start();
      lfo.start();
      this.ambientNodes.push(osc, lfo, g);
    }
  }
}

export const audio = new Audio();
