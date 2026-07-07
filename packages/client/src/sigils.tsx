// S12 — sigil vocabulary v2 (B6, sanctioned fallback: "current aesthetic,
// intensified"). Silhouette ARCHETYPE carries identity, TIER dress carries
// rank, ACT carries accent hue and frame-tick construction. Constant
// throughlines hold the set as one hand: the crossing thread, the grave-mark
// brand (the old ring-and-spokes grammar surviving as a stamp), the pale line
// palette, the shared ground. Every mark is deterministic from its id — the
// generation below is ported verbatim from the visual spec
// (docs/reference/sigil_vocabulary_v2.html): same hash32, same LCG, same call
// order per archetype. The snapshot gate (marks.test.ts, Gate B) enforces it.
//
// Ring semantic (R3, canon): characters alone are held in an UNBROKEN ring;
// every enemy ring is broken.
//
// The AI-portrait pipeline (scripts/art/) can replace this set wholesale;
// mixing sets is forbidden per the M3 plan.

import React from 'react';
import { MOTIFS, Motif } from './motifs';

export type Tier = 'normal' | 'elite' | 'boss' | 'character';
/** 'minion' is supported by the grammar (shrunken mark, tickless frame) but
 *  has no data source yet — EnemyDef carries no minion field until S13+. */
type GrammarTier = Tier | 'minion';

function hash32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

class Rand {
  constructor(private s: number) {}
  next(): number {
    this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
    return this.s / 4294967296;
  }
  range(a: number, b: number): number {
    return a + this.next() * (b - a);
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
}

const f = (n: number): string => n.toFixed(1);

const ACT_ACCENTS: Record<number, string[]> = {
  1: ['#d4af6f', '#d4756f', '#c7b9a2', '#e0a060'],
  2: ['#b98fd4', '#b9a8d4', '#7fd4ff'],
  3: ['#ff8a5c', '#d4756f', '#ffd470'],
  // S22.3: the Loom's floor — the dawn (palette tokens only; B6 untouched)
  4: ['#ffd9a0', '#a9c9d6', '#f0e2c0'],
};

// ---- shared primitive: harmonic closed path ---------------------------------

interface Harm { k: number; A: number; ph: number }
interface Spike { th: number; amt: number; w: number }

function blob(
  _r: Rand, cx: number, cy: number, R0: number, harm: Harm[], spikes: Spike[],
  bottomBias: number, sx: number, sy: number,
): string {
  sx = sx || 1; sy = sy || 1;
  const N = 96; const pts: Array<[number, number]> = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2; let rad = R0;
    for (let h = 0; h < harm.length; h++) rad += harm[h].A * Math.sin(harm[h].k * th + harm[h].ph);
    rad += bottomBias * Math.max(0, Math.sin(th));
    for (let s = 0; s < spikes.length; s++) {
      const d = Math.atan2(Math.sin(th - spikes[s].th), Math.cos(th - spikes[s].th));
      rad += spikes[s].amt * Math.exp(-(d * d) / (spikes[s].w * spikes[s].w));
    }
    pts.push([cx + Math.cos(th) * rad * sx, cy + Math.sin(th) * rad * sy]);
  }
  const m0 = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
  let dstr = 'M ' + f(m0[0]) + ' ' + f(m0[1]);
  for (let j = 1; j <= 96; j++) {
    const p = pts[j % 96]; const q = pts[(j + 1) % 96];
    dstr += ' Q ' + f(p[0]) + ' ' + f(p[1]) + ' ' + f((p[0] + q[0]) / 2) + ' ' + f((p[1] + q[1]) / 2);
  }
  return dstr + ' Z';
}

function stdHarm(r: Rand, tat: number): Harm[] { // tat: tatter amplitude multiplier (elite)
  tat = tat || 1;
  const h: Harm[] = [
    { k: 2, A: r.range(1.5, 3.5), ph: r.range(0, 6.28) },
    { k: 3, A: r.range(1.5, 3), ph: r.range(0, 6.28) },
  ];
  if (tat > 1) {
    h.push({ k: 5, A: r.range(1.5, 3) * tat * 0.7, ph: r.range(0, 6.28) });
    h.push({ k: 7, A: r.range(1, 2) * tat * 0.7, ph: r.range(0, 6.28) });
  }
  return h;
}

function spikeSet(r: Rand, n: number): Spike[] {
  const s: Spike[] = [];
  for (let i = 0; i < n; i++) s.push({ th: r.range(0, 6.28), amt: r.range(4, 8), w: r.range(0.1, 0.18) });
  return s;
}

// ---- archetype constructors --------------------------------------------------
// Each returns {fills, rims, extra, cx, cy, brandAt, brandR, crestAt?}: fills
// are drawn dark, rims get the top-lit gradient stroke. 'ACC' in extra is a
// placeholder replaced with the act accent.

interface ArchOut {
  fills: string[];
  rims: string[];
  extra: string;
  cx: number;
  cy: number;
  brandAt: [number, number] | null;
  brandR: number;
  crestAt?: [number, number];
}

function archFigure(r: Rand, tier: GrammarTier, m: Motif): ArchOut {
  const tat = tier === 'elite' ? 1.8 : 1; const cx = 60; const cy = 70;
  const sx = m.wide ? 0.86 : 0.62; const sy = 1.12; const R0 = r.range(24, 27) * (m.small ? 0.8 : 1);
  const sp = tier === 'elite' ? spikeSet(r, 2) : [];
  const body = blob(r, cx, cy, R0, stdHarm(r, tat), sp, r.range(3, 6), sx, sy);
  const hr = r.range(6.5, 8.5); const hx = cx + r.range(-2, 2); let hy = cy - R0 * sy - hr * 0.45;
  const head = blob(r, hx, hy, hr, [{ k: 2, A: r.range(0.6, 1.4), ph: r.range(0, 6.28) }], [], 1, 1, 1);
  let extra = '';
  if (m.melt) { // gravewax: drips off the base
    for (let i = 0; i < 3; i++) {
      const dx = cx + r.range(-14, 14);
      extra += '<path d="M ' + f(dx) + ' ' + f(cy + R0 * sy - 2) + ' q ' + f(r.range(-2, 2)) + ' ' + f(r.range(7, 13)) + ' 0 ' + f(r.range(9, 15)) + '" stroke="var(--text-dim)" stroke-width="1" fill="none" opacity="0.7"/>';
    }
  }
  if (m.veil) { // mourner: hanging strands over the mass
    for (let v = 0; v < 4; v++) {
      const vx = hx + r.range(-9, 9);
      extra += '<path d="M ' + f(vx) + ' ' + f(hy) + ' q ' + f(r.range(-4, 4)) + ' ' + f(r.range(18, 30)) + ' ' + f(r.range(-3, 3)) + ' ' + f(r.range(34, 44)) + '" stroke="var(--text)" stroke-width="0.7" fill="none" opacity="0.55"/>';
    }
  }
  if (m.bars) { // warden: gate verticals through the mark
    for (let b = 0; b < 3; b++) {
      const bx = cx - 14 + b * 14;
      extra += '<line x1="' + f(bx) + '" y1="' + f(cy - R0 * sy - 14) + '" x2="' + f(bx) + '" y2="' + f(cy + R0 * sy + 4) + '" stroke="var(--text-dim)" stroke-width="1" opacity="0.5"/>';
    }
  }
  if (m.chains) { // interred saint: dashed binding arcs
    extra += '<path d="M ' + f(cx - R0 * sx - 8) + ' ' + f(cy - 6) + ' Q ' + f(cx) + ' ' + f(cy + 10) + ' ' + f(cx + R0 * sx + 8) + ' ' + f(cy - 10) + '" stroke="var(--text)" stroke-width="1" stroke-dasharray="3 3" fill="none" opacity="0.7"/>'
      + '<path d="M ' + f(cx - R0 * sx - 6) + ' ' + f(cy + 12) + ' Q ' + f(cx) + ' ' + f(cy + 24) + ' ' + f(cx + R0 * sx + 6) + ' ' + f(cy + 8) + '" stroke="var(--text)" stroke-width="1" stroke-dasharray="3 3" fill="none" opacity="0.55"/>';
  }
  if (m.tool) { // sexton: a leaning haft
    extra += '<line x1="' + f(cx + R0 * sx + 2) + '" y1="' + f(cy + R0 * sy + 2) + '" x2="' + f(cx + R0 * sx + 14) + '" y2="' + f(hy - 4) + '" stroke="var(--text-dim)" stroke-width="1.3" opacity="0.75"/>'
      + '<line x1="' + f(cx + R0 * sx + 11) + '" y1="' + f(hy) + '" x2="' + f(cx + R0 * sx + 17) + '" y2="' + f(hy - 8) + '" stroke="var(--text-dim)" stroke-width="1.3" opacity="0.75"/>';
  }
  if (m.burden) { // pallbearer: the carried box above the shoulders
    extra += '<rect x="' + f(cx - 20) + '" y="' + f(hy - 13) + '" width="40" height="9" fill="#0b0908" stroke="var(--text-dim)" stroke-width="0.9" opacity="0.95" transform="rotate(' + f(r.range(-4, 4)) + ' 60 ' + f(hy - 9) + ')"/>';
    hy += 3;
  }
  if (m.book) { // lectern: open leaves before the mass
    extra += '<path d="M ' + f(cx - 11) + ' ' + f(cy + 8) + ' q 5 -4 11 -2 q 6 -2 11 2 l 0 6 q -5 -3 -11 -1 q -6 -2 -11 1 Z" fill="#0b0908" stroke="var(--text)" stroke-width="0.8" opacity="0.95"/>';
  }
  if (m.weave) { // vess: hex arcs woven around
    extra += '<path d="M ' + f(cx - 24) + ' ' + f(cy - 8) + ' Q ' + f(cx) + ' ' + f(cy - 30) + ' ' + f(cx + 24) + ' ' + f(cy - 4) + '" stroke="var(--hex)" stroke-width="0.9" fill="none" opacity="0.75"/>'
      + '<path d="M ' + f(cx - 22) + ' ' + f(cy + 8) + ' Q ' + f(cx) + ' ' + f(cy + 26) + ' ' + f(cx + 22) + ' ' + f(cy + 4) + '" stroke="var(--hex)" stroke-width="0.9" fill="none" opacity="0.6"/>';
  }
  if (typeof m.pitch === 'number') { // choristers: a note held low / mid / high
    const py = [cy + 13, cy - 2, cy - 17][m.pitch];
    extra += '<line x1="' + f(cx - 16) + '" y1="' + f(py) + '" x2="' + f(cx + 16) + '" y2="' + f(py) + '" stroke="var(--text-dim)" stroke-width="0.6" opacity="0.8"/>'
      + '<circle cx="' + f(cx + r.range(-8, 8)) + '" cy="' + f(py) + '" r="2.6" fill="ACC" opacity="0.95"/>';
  }
  return { fills: [body, head], rims: [body, head], extra, cx, cy, brandAt: [cx, cy + 2], brandR: r.range(10, 13), crestAt: [hx, hy - hr - 2] };
}

function archFlame(r: Rand, tier: GrammarTier, _m: Motif): ArchOut {
  const cx = 60; const cy = 68; let w = r.range(15, 19); let h = r.range(46, 54); const lean = r.range(-7, 7);
  if (tier === 'elite') { w *= 1.12; h *= 1.08; }
  const wob = (a: number, b: number): number => r.range(a, b);
  const d = 'M ' + f(cx) + ' ' + f(cy + h / 2)
    + ' C ' + f(cx - w) + ' ' + f(cy + h / 2) + ' ' + f(cx - w * 0.95) + ' ' + f(cy + wob(-2, 4)) + ' ' + f(cx - w * 0.4) + ' ' + f(cy - h * 0.22)
    + ' C ' + f(cx - w * 0.18) + ' ' + f(cy - h * 0.38) + ' ' + f(cx + lean * 0.5) + ' ' + f(cy - h * 0.34) + ' ' + f(cx + lean) + ' ' + f(cy - h / 2)
    + ' C ' + f(cx + lean * 0.4 + w * 0.32) + ' ' + f(cy - h * 0.26) + ' ' + f(cx + w * 0.95) + ' ' + f(cy + wob(-2, 4)) + ' ' + f(cx + w) + ' ' + f(cy + h * 0.28)
    + ' C ' + f(cx + w) + ' ' + f(cy + h * 0.46) + ' ' + f(cx + w * 0.45) + ' ' + f(cy + h / 2) + ' ' + f(cx) + ' ' + f(cy + h / 2) + ' Z';
  // the unburned heart: hollow inner flame
  const iw = w * 0.42; const ih = h * 0.4;
  const inner = 'M ' + f(cx) + ' ' + f(cy + h * 0.42) + ' C ' + f(cx - iw) + ' ' + f(cy + h * 0.3) + ' ' + f(cx - iw * 0.5) + ' ' + f(cy - ih * 0.2) + ' ' + f(cx + lean * 0.5) + ' ' + f(cy - ih * 0.55)
    + ' C ' + f(cx + iw * 0.6) + ' ' + f(cy - ih * 0.1) + ' ' + f(cx + iw) + ' ' + f(cy + h * 0.28) + ' ' + f(cx) + ' ' + f(cy + h * 0.42) + ' Z';
  const extra = '<path d="' + inner + '" fill="none" stroke="ACC" stroke-width="0.9" opacity="0.8"/>';
  return { fills: [d], rims: [d], extra, cx, cy, brandAt: [cx, cy + h * 0.28], brandR: r.range(8, 10) };
}

function archBell(r: Rand, _tier: GrammarTier, m: Motif): ArchOut {
  const cx = 60; const cy = 64; let w = r.range(21, 25); let h = r.range(40, 46);
  if (m.big) { w *= 1.15; h *= 1.1; }
  const d = 'M ' + f(cx - w * 0.24) + ' ' + f(cy - h * 0.5)
    + ' C ' + f(cx - w * 0.85) + ' ' + f(cy - h * 0.42) + ' ' + f(cx - w * 0.5) + ' ' + f(cy + h * 0.1) + ' ' + f(cx - w) + ' ' + f(cy + h * 0.34)
    + ' L ' + f(cx - w) + ' ' + f(cy + h * 0.44) + ' L ' + f(cx + w) + ' ' + f(cy + h * 0.44) + ' L ' + f(cx + w) + ' ' + f(cy + h * 0.34)
    + ' C ' + f(cx + w * 0.5) + ' ' + f(cy + h * 0.1) + ' ' + f(cx + w * 0.85) + ' ' + f(cy - h * 0.42) + ' ' + f(cx + w * 0.24) + ' ' + f(cy - h * 0.5) + ' Z';
  let extra = '<line x1="' + f(cx - w) + '" y1="' + f(cy + h * 0.34) + '" x2="' + f(cx + w) + '" y2="' + f(cy + h * 0.34) + '" stroke="var(--text)" stroke-width="0.7" opacity="0.7"/>'
    + '<circle cx="' + f(cx) + '" cy="' + f(cy + h * 0.52) + '" r="' + f(r.range(2.6, 3.6)) + '" fill="ACC" opacity="0.95"/>'
    + '<path d="M ' + f(cx - w * 0.22) + ' ' + f(cy - h * 0.5) + ' q ' + f(w * 0.22) + ' ' + f(-6) + ' ' + f(w * 0.44) + ' 0" stroke="var(--text)" stroke-width="1" fill="none" opacity="0.85"/>';
  if (m.crack) { extra += '<path d="M ' + f(cx + r.range(-6, 6)) + ' ' + f(cy + h * 0.44) + ' l ' + f(r.range(-3, 3)) + ' -9 l ' + f(r.range(-4, 4)) + ' -8" stroke="#0b0908" stroke-width="1.6" fill="none"/>'; }
  return { fills: [d], rims: [d], extra, cx, cy, brandAt: [cx, cy - h * 0.08], brandR: r.range(9, 11) };
}

function archCrawler(r: Rand, _tier: GrammarTier, m: Motif): ArchOut {
  const n = (m.small ? 4 : 5) + r.int(2); const cx = 60; const cy = 72;
  const x0 = cx - 26; const x1 = cx + 26; const qx = cx + r.range(-10, 10); const qy = cy - r.range(14, 22);
  const fills: string[] = []; const rims: string[] = []; const R = m.small ? 7.5 : 9.5;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1); const it = 1 - t;
    const px = it * it * x0 + 2 * it * t * qx + t * t * x1; const py = it * it * cy + 2 * it * t * qy + t * t * cy;
    const rr = R * (1 - 0.55 * t) * r.range(0.9, 1.1);
    const seg = blob(r, px, py, rr, [{ k: 2, A: r.range(0.5, 1.2), ph: r.range(0, 6.28) }], [], 0.8, 1, 1);
    fills.push(seg); rims.push(seg);
  }
  // proboscis toward the thread
  const extra = '<path d="M ' + f(x1) + ' ' + f(cy) + ' q 8 -2 12 -8" stroke="var(--text)" stroke-width="0.9" fill="none" opacity="0.8"/>';
  return { fills, rims, extra, cx, cy, brandAt: [x0 + 6, cy - 2], brandR: 7.5 };
}

function archSwarm(r: Rand, _tier: GrammarTier, m: Motif): ArchOut {
  const cx = 60; const cy = 66; const n = 6 + r.int(3); const pts: Array<[number, number]> = [];
  const fills: string[] = []; const rims: string[] = []; let extra = '';
  for (let i = 0; i < n; i++) {
    const a = r.range(0, 6.28); const d = r.range(6, 26);
    pts.push([cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8]);
  }
  // constellation hairlines first
  for (let j = 0; j < n - 1; j++) {
    extra += '<line x1="' + f(pts[j][0]) + '" y1="' + f(pts[j][1]) + '" x2="' + f(pts[j + 1][0]) + '" y2="' + f(pts[j + 1][1]) + '" stroke="var(--text-faint)" stroke-width="0.5" opacity="0.7"/>';
  }
  for (let k = 0; k < n; k++) {
    const rr = r.range(2.4, 4.6) * (k === 0 ? 1.7 : 1);
    const b = blob(r, pts[k][0], pts[k][1], rr, [{ k: 2, A: r.range(0.3, 0.9), ph: r.range(0, 6.28) }], [], 0.5, 1, 1);
    fills.push(b); rims.push(b);
    if (m.member === 'flame') { extra += '<path d="M ' + f(pts[k][0]) + ' ' + f(pts[k][1] - rr) + ' q ' + f(r.range(-2, 2)) + ' -4 ' + f(r.range(-1.5, 1.5)) + ' -6" stroke="ACC" stroke-width="0.8" fill="none" opacity="0.85"/>'; }
  }
  return { fills, rims, extra, cx, cy, brandAt: [pts[0][0], pts[0][1]], brandR: 6 };
}

function archFrayed(r: Rand, _tier: GrammarTier, m: Motif): ArchOut {
  const cx = 60; const cy = 68; const R0 = r.range(22, 26);
  const body = blob(r, cx, cy, R0, stdHarm(r, 1.6), spikeSet(r, 2), r.range(2, 5), 1, 1.02);
  let extra = '';
  const n = 6 + r.int(3);
  for (let i = 0; i < n; i++) { // escaping thread-ends
    const a = r.range(0, 6.28); const ex = cx + Math.cos(a) * R0; const ey = cy + Math.sin(a) * R0;
    extra += '<path d="M ' + f(ex) + ' ' + f(ey) + ' q ' + f(Math.cos(a) * 10 + r.range(-5, 5)) + ' ' + f(Math.sin(a) * 10 + r.range(-5, 5)) + ' ' + f(Math.cos(a) * 20 + r.range(-8, 8)) + ' ' + f(Math.sin(a) * 20 + r.range(-8, 8)) + '" stroke="var(--thread)" stroke-width="0.7" fill="none" opacity="0.6"/>';
  }
  if (m.maw) {
    extra += '<path d="M ' + f(cx - 10) + ' ' + f(cy + 4) + ' q 10 9 20 0" stroke="var(--text)" stroke-width="1.1" fill="none" opacity="0.9"/>'
      + '<line x1="' + f(cx - 5) + '" y1="' + f(cy + 7) + '" x2="' + f(cx - 4) + '" y2="' + f(cy + 11) + '" stroke="var(--text)" stroke-width="0.8" opacity="0.8"/>'
      + '<line x1="' + f(cx + 4) + '" y1="' + f(cy + 8) + '" x2="' + f(cx + 5) + '" y2="' + f(cy + 12) + '" stroke="var(--text)" stroke-width="0.8" opacity="0.8"/>';
  }
  return { fills: [body], rims: [body], extra, cx, cy, brandAt: [cx, cy - 4], brandR: r.range(9, 12) };
}

function archEye(_r: Rand, _tier: GrammarTier, _m: Motif): ArchOut {
  const cx = 60; const cy = 66; const w = 30; const h = 16;
  const d = 'M ' + f(cx - w) + ' ' + f(cy) + ' Q ' + f(cx) + ' ' + f(cy - h * 1.6) + ' ' + f(cx + w) + ' ' + f(cy) + ' Q ' + f(cx) + ' ' + f(cy + h * 1.6) + ' ' + f(cx - w) + ' ' + f(cy) + ' Z';
  let extra = '<circle cx="60" cy="' + f(cy) + '" r="8.5" fill="none" stroke="var(--text)" stroke-width="1" opacity="0.9"/>'
    + '<circle cx="60" cy="' + f(cy) + '" r="3.4" fill="ACC" opacity="0.95"/>';
  for (let i = 0; i < 5; i++) {
    const a = -0.5 - i * 0.55;
    extra += '<line x1="' + f(cx + Math.cos(a) * w * 0.8) + '" y1="' + f(cy + Math.sin(a) * h * 1.25) + '" x2="' + f(cx + Math.cos(a) * (w * 0.8 + 7)) + '" y2="' + f(cy + Math.sin(a) * (h * 1.25) - 5) + '" stroke="var(--text-dim)" stroke-width="0.7" opacity="0.8"/>';
  }
  return { fills: [d], rims: [d], extra, cx, cy, brandAt: null, brandR: 0 };
}

const ARCHS: Record<string, (r: Rand, tier: GrammarTier, m: Motif) => ArchOut> = {
  figure: archFigure, flame: archFlame, bell: archBell, crawler: archCrawler,
  swarm: archSwarm, frayed: archFrayed, eye: archEye,
};

// ---- crests (small marks above the head) -------------------------------------

function crest(kind: string, x: number, y: number, acc: string): string {
  if (kind === 'flame') return '<path d="M ' + f(x) + ' ' + f(y) + ' q -3 -4 -1 -8 q 3 3 2 -4 q 3 5 1 9 q -1 2 -2 3 Z" fill="none" stroke="' + acc + '" stroke-width="0.9" opacity="0.9"/>';
  if (kind === 'bell') return '<path d="M ' + f(x - 4) + ' ' + f(y) + ' q 0 -7 4 -7 q 4 0 4 7 Z" fill="none" stroke="' + acc + '" stroke-width="0.9" opacity="0.9"/><circle cx="' + f(x) + '" cy="' + f(y + 1.5) + '" r="1" fill="' + acc + '"/>';
  return '';
}

// ---- frame ticks by act: 1 squared, 2 curved, 3 frayed ------------------------

function frameTicks(act: number): string {
  if (act === 2) return '<path d="M3 11 Q3 3 11 3 M109 3 Q117 3 117 11 M117 109 Q117 117 109 117 M11 117 Q3 117 3 109" fill="none" stroke="var(--text-faint)" stroke-width="0.8"/>';
  if (act === 3) return '<path d="M3 11 V5 M6 8 H11 M109 3 H115 M112 6 V11 M117 109 V115 M114 112 H109 M11 117 H5 M8 114 V109" fill="none" stroke="var(--text-faint)" stroke-width="0.8"/>';
  return '<path d="M3 11 V3 H11 M109 3 H117 V11 M117 109 V117 H109 M11 117 H3 V109" fill="none" stroke="var(--text-faint)" stroke-width="0.8"/>';
}

// ---- brand: the grave-mark (ring / spokes / knot) ------------------------------
// Returned in parts so the LOD rules can drop the spokes at small sizes without
// touching the seed stream (everything is always computed).

function brand(r: Rand, bx: number, by: number, bR: number, acc: string): { ring: string; spokes: string; knot: string } {
  if (!bR) return { ring: '', spokes: '', knot: '' };
  const bgap = r.next() < 0.6 ? r.range(0.5, 1.5) : 0;
  const bdash = bgap ? 'stroke-dasharray="' + f(bR * (Math.PI * 2 - bgap)) + ' ' + f(bR * bgap) + '"' : '';
  const ring = '<circle cx="' + f(bx) + '" cy="' + f(by) + '" r="' + f(bR) + '" fill="none" stroke="var(--text)" stroke-width="1" ' + bdash
    + ' transform="rotate(' + f(r.range(0, 360)) + ' ' + f(bx) + ' ' + f(by) + ')" opacity="0.9"/>';
  let spokes = '';
  const bsp = 3 + r.int(3);
  for (let i = 0; i < bsp; i++) {
    const a = (i / bsp) * Math.PI * 2 + r.range(-0.12, 0.12); const r1 = r.range(1.5, 4); const r2 = bR - r.range(0, 2.5);
    spokes += '<line x1="' + f(bx + Math.cos(a) * r1) + '" y1="' + f(by + Math.sin(a) * r1) + '" x2="' + f(bx + Math.cos(a) * r2) + '" y2="' + f(by + Math.sin(a) * r2) + '" stroke="var(--text)" stroke-width="0.8" opacity="0.85"/>';
  }
  const ka = r.range(0, 6.28); const kr = r.range(3, bR - 1);
  const knot = '<circle cx="' + f(bx + Math.cos(ka) * kr) + '" cy="' + f(by + Math.sin(ka) * kr) + '" r="' + f(r.range(1.1, 2)) + '" fill="' + acc + '" opacity="0.95"/>';
  return { ring, spokes, knot };
}

// ---- the mark ------------------------------------------------------------------

/** Pure generator: the inner markup of a mark's <svg> (viewBox 0 0 120 120),
 *  deterministic from (id, tier, act, size, hue). Exported for the CI gates
 *  (marks.test.ts) — call sites use the <Mark> component.
 *
 *  Level-of-detail is a function of the `size` prop and changes only what is
 *  DRAWN, never the seed stream — the RNG is consumed identically at all
 *  sizes, so a mark is the same mark at every scale:
 *    size >= 72          full mark
 *    48 <= size < 72     drop grain + the boss inscription ring
 *    size < 48           additionally drop frame ticks + brand spokes
 *                        (brand ring + accent knot stay); the thread never
 *                        LODs away — it is the set's signature. */
export function markSvg(id: string, tier: GrammarTier, act: 1 | 2 | 3 | 4, size: number, hue?: string): string {
  const lodFull = size >= 72; // grain, boss inscription ring
  const lodMid = size >= 48; // frame ticks, brand spokes

  const m: Motif = MOTIFS[id] || { arch: 'figure' };
  const r = new Rand(hash32(id));
  const pool = ACT_ACCENTS[act] || ACT_ACCENTS[1];
  const acc = hue || pool[r.int(pool.length)];
  const uid = id.replace(/[^a-z0-9_]/gi, '') + '_' + act + '_' + tier;
  const A = ARCHS[m.arch](r, tier, m);
  const extra = A.extra.split('ACC').join(acc);

  let fills = ''; let rims = '';
  for (let i = 0; i < A.fills.length; i++) fills += '<path d="' + A.fills[i] + '" fill="#0b0908"/>';
  for (let j = 0; j < A.rims.length; j++) rims += '<path d="' + A.rims[j] + '" fill="none" stroke="url(#rim-' + uid + ')" stroke-width="1.2"/>';
  if (tier === 'elite') { // notched double rim
    for (let e = 0; e < A.rims.length; e++) rims += '<path d="' + A.rims[e] + '" fill="none" stroke="' + acc + '" stroke-width="0.6" stroke-dasharray="4 5" opacity="0.55" transform="translate(0 -1.5)"/>';
  }
  const crestSvg = m.crest && A.crestAt ? crest(m.crest, A.crestAt[0], A.crestAt[1], acc) : '';
  const b = A.brandAt ? brand(r, A.brandAt[0], A.brandAt[1], A.brandR, acc) : { ring: '', spokes: '', knot: '' };
  const brandSvg = b.ring + (lodMid ? b.spokes : '') + b.knot;

  // the crossing thread — constant throughline, never LODs away
  const ty1 = r.range(24, 100); const ty2 = r.range(24, 100); const tqx = 60 + r.range(-22, 22); const tqy = 64 + r.range(-26, 18);
  const tD = 'M -4 ' + f(ty1) + ' Q ' + f(tqx) + ' ' + f(tqy) + ' 124 ' + f(ty2);
  const thread = '<path d="' + tD + '" fill="none" stroke="var(--thread)" stroke-width="0.9" opacity="0.3"/>'
    + '<path class="thread-anim" d="' + tD + '" fill="none" stroke="var(--thread)" stroke-width="1.2" stroke-dasharray="1.5 6.5" opacity="0.7"/>';

  // tier dress
  let dress = ''; let frame = ''; let shoulder = '';
  const frameRect = '<rect x="3" y="3" width="114" height="114" fill="none" stroke="var(--line-soft)" stroke-width="0.8"/>';
  const ticks = lodMid ? frameTicks(act) : '';
  if (tier === 'minion') { frame = frameRect; }
  else if (tier === 'elite') {
    frame = frameRect + ticks
      + '<path d="M 60 3 l -4 4 4 4 4 -4 Z M 60 117 l -4 -4 4 -4 4 4 Z" fill="none" stroke="' + acc + '" stroke-width="0.8" opacity="0.8"/>';
  } else if (tier === 'boss') {
    const hr2 = 38; const ha = -2.45; const hb = -0.7;
    const s2 = new Rand(hash32(id + '::shoulder'));
    shoulder = '<path d="' + blob(s2, 60 + s2.range(-1, 1) * s2.range(16, 20), 74, s2.range(11, 14), stdHarm(s2, 1), [], 3, 1, 1) + '" fill="#0d0a08" opacity="0.9"/>';
    const inscription = '<circle cx="60" cy="64" r="52" fill="none" stroke="' + acc + '" stroke-width="0.6" stroke-dasharray="3 6" opacity="0.4"/>';
    const crown = '<path d="M ' + f(60 + Math.cos(ha) * hr2) + ' ' + f(64 + Math.sin(ha) * hr2) + ' A ' + hr2 + ' ' + hr2 + ' 0 0 1 ' + f(60 + Math.cos(hb) * hr2) + ' ' + f(64 + Math.sin(hb) * hr2) + '" fill="none" stroke="' + acc + '" stroke-width="1.3" opacity="0.85"/>';
    dress = (lodFull ? inscription : '') + crown;
    frame = frameRect + '<rect x="6" y="6" width="108" height="108" fill="none" stroke="var(--line-soft)" stroke-width="0.5"/>' + ticks;
  } else if (tier === 'character') {
    dress = '<circle cx="60" cy="64" r="51" fill="none" stroke="' + acc + '" stroke-width="1.1" opacity="0.85"/>'; // unbroken (R3)
    frame = frameRect + ticks;
  } else { frame = frameRect + ticks; }

  let inner = dress + shoulder + fills + rims + extra + crestSvg + brandSvg;
  if (tier === 'minion') inner = '<g transform="translate(60 64) scale(0.74) translate(-60 -64)">' + inner + '</g>';

  const grain = lodFull ? '<rect width="120" height="120" filter="url(#tb-grain)" opacity="0.045"/>' : '';
  return '<defs><linearGradient id="rim-' + uid + '" x1="0" y1="0" x2="0" y2="1">'
    + '<stop offset="0" stop-color="' + acc + '" stop-opacity="0.85"/>'
    + '<stop offset="0.55" stop-color="' + acc + '" stop-opacity="0.15"/>'
    + '<stop offset="1" stop-color="' + acc + '" stop-opacity="0"/></linearGradient></defs>'
    + '<rect width="120" height="120" fill="url(#tb-ground)"/>'
    + grain
    + inner + thread + frame;
}

// ---- components ----------------------------------------------------------------

/** Shared defs for every mark (ground gradient + grain filter): mount ONE of
 *  these at the app root; marks reference them by url(#tb-…). Per-mark defs
 *  exist only for the accent rim gradient (id-suffixed, inside each mark). */
export function MarkDefs(): JSX.Element {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <radialGradient id="tb-ground" cx="50%" cy="42%" r="72%">
          <stop offset="0%" stopColor="#1f1913" />
          <stop offset="62%" stopColor="#14110f" />
          <stop offset="100%" stopColor="#0b0908" />
        </radialGradient>
        <filter id="tb-grain" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="7" stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 .85  0 0 0 0 .8  0 0 0 0 .72  0 0 0 .6 0" />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
      </defs>
    </svg>
  );
}

export interface MarkProps {
  id: string;
  tier: Tier;
  act: 1 | 2 | 3 | 4;
  size?: number;
  hue?: string;
  className?: string;
}

/** An entity's mark. Pure function of (id, tier, act, size, hue) — memoized. */
export const Mark = React.memo(function Mark({ id, tier, act, size = 72, hue, className }: MarkProps): JSX.Element {
  const inner = React.useMemo(() => markSvg(id, tier, act, size, hue), [id, tier, act, size, hue]);
  return (
    <svg
      className={className} width={size} height={size} viewBox="0 0 120 120" aria-hidden
      dangerouslySetInnerHTML={{ __html: inner }}
    />
  );
});

/** Character marks: fixed hues so Vess/Bram/the Witness always read the same.
 *  Characters alone are held in an unbroken ring (R3). */
export function CharacterMark({ who, size = 64 }: { who: 'vess' | 'bram' | 'witness'; size?: number }): JSX.Element {
  const hue = who === 'vess' ? 'var(--hex)' : who === 'bram' ? 'var(--p2)' : 'var(--witness)';
  return <Mark id={`character_${who}`} tier="character" act={1} size={size} hue={hue} />;
}

// ---------------------------------------------------------------------------
// S20.3 — map-node MEDALLIONS. The map chips join the vocabulary: same hand
// (seeded ring, pale line palette, accent knot, shared ground), one small
// deterministic glyph per node KIND — never per encounter (scouting stays
// the asymmetric layer; a combat medallion must not leak WHICH combat).
// Ring semantic extends R3: fight kinds (combat / elite / boss) wear a
// BROKEN ring like every enemy mark; shelter and passage kinds wear whole
// ones. Deterministic from (kind, variant, act) — no consumed rng streams.
// ---------------------------------------------------------------------------

export type NodeKindId =
  | 'combat' | 'elite' | 'boss' | 'event' | 'rest' | 'shop' | 'treasure' | 'loom';
export type NodeVariantId = 'toll' | 'covet' | undefined;

/** inner markup of a medallion's <svg> (viewBox 0 0 64 64) — exported for
 *  the style screen and any future snapshot gate */
export function nodeMedallionSvg(kind: NodeKindId, variant: NodeVariantId, act: 1 | 2 | 3 | 4): string {
  const key = `node_${kind}${variant ? `_${variant}` : ''}`;
  const r = new Rand(hash32(key));
  const pool = ACT_ACCENTS[act] || ACT_ACCENTS[1];
  const acc = pool[r.int(pool.length)];
  const cx = 32; const cy = 32;
  const fight = kind === 'combat' || kind === 'elite' || kind === 'boss';
  const R = kind === 'boss' ? 24 : kind === 'elite' ? 23 : 21;
  // the ring: broken for fight kinds (enemy grammar), whole otherwise
  const gap = fight ? r.range(0.7, 1.3) : 0;
  const dash = gap ? `stroke-dasharray="${f(R * (Math.PI * 2 - gap))} ${f(R * gap)}"` : '';
  let out = `<circle cx="${cx}" cy="${cy}" r="${R + 6}" fill="url(#tb-ground)"/>`
    + `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--text)" stroke-width="1.2" ${dash}`
    + ` transform="rotate(${f(r.range(0, 360))} ${cx} ${cy})" opacity="0.9"/>`;
  if (kind === 'elite') { // the knot doubles its ring — a snarl, not a bead
    out += `<circle cx="${cx}" cy="${cy}" r="${R - 3.5}" fill="none" stroke="${acc}" stroke-width="0.7" stroke-dasharray="4 5" opacity="0.6"/>`;
  }
  if (kind === 'boss') {
    out += `<circle cx="${cx}" cy="${cy}" r="${R - 4}" fill="none" stroke="var(--text-dim)" stroke-width="0.6" opacity="0.8"/>`;
  }
  const S = 'stroke="var(--text)" stroke-width="1.6" stroke-linecap="round" fill="none"';
  const soft = 'stroke="var(--text-dim)" stroke-width="1.2" stroke-linecap="round" fill="none"';
  switch (kind) {
    case 'combat': // two crossing cut-threads
      out += `<path d="M 22 22 Q 32 30 42 42" ${S}/><path d="M 42 22 Q 32 30 22 42" ${S}/>`;
      break;
    case 'elite': // the knot itself: a loop pulled tight around the crossing
      out += `<path d="M 21 40 C 27 26 37 26 43 40" ${S}/>`
        + `<path d="M 21 26 C 27 40 37 40 43 26" ${S}/>`
        + `<circle cx="32" cy="33" r="3" fill="${acc}" opacity="0.95"/>`;
      break;
    case 'boss': // the crown arc over a heavy center
      out += `<path d="M 21 30 A 13 13 0 0 1 43 30" stroke="${acc}" stroke-width="1.6" fill="none" opacity="0.9"/>`
        + `<circle cx="32" cy="36" r="4.5" fill="#0b0908" stroke="var(--text)" stroke-width="1.1"/>`;
      break;
    case 'event': // a door meant for someone: frame + threshold
      out += `<path d="M 25 43 V 29 Q 32 21 39 29 V 43" ${S}/><line x1="22" y1="43" x2="42" y2="43" ${soft}/>`;
      break;
    case 'rest':
      if (variant === 'toll') { // the toll-door: frame + the coin it wants
        out += `<path d="M 25 43 V 29 Q 32 21 39 29 V 43" ${S}/>`
          + `<circle cx="32" cy="37" r="3.2" fill="none" stroke="${acc}" stroke-width="1.2"/>`;
      } else { // a kept ember over a hearth line
        out += `<line x1="24" y1="41" x2="40" y2="41" ${soft}/>`
          + `<path d="M 32 38 q -4 -5 -1.5 -10 q 3.5 4 2.5 -5 q 4 6 1.5 11 q -1 2.5 -2.5 4 Z" stroke="${acc}" stroke-width="1.1" fill="none" opacity="0.95"/>`;
      }
      break;
    case 'shop': // the balance: beam + two hanging pans
      out += `<line x1="32" y1="22" x2="32" y2="27" ${soft}/><line x1="23" y1="27" x2="41" y2="27" ${S}/>`
        + `<path d="M 23 27 v 7 m -3.5 0 h 7" ${soft}/><path d="M 41 27 v 7 m -3.5 0 h 7" ${soft}/>`;
      break;
    case 'treasure':
      if (variant === 'covet') { // the case: spark behind old glass
        out += `<rect x="23" y="24" width="18" height="16" ${soft}/>`
          + `<path d="M 32 27 l 2 4 4 1 -4 1 -2 4 -2 -4 -4 -1 4 -1 Z" fill="${acc}" opacity="0.9"/>`;
      } else { // the spark itself
        out += `<path d="M 32 21 l 3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3 Z" fill="none" stroke="${acc}" stroke-width="1.3"/>`
          + `<circle cx="32" cy="32" r="1.8" fill="${acc}"/>`;
      }
      break;
    case 'loom': // the Loom's Eye
      out += `<path d="M 20 32 Q 32 21 44 32 Q 32 43 20 32 Z" ${S}/>`
        + `<circle cx="32" cy="32" r="4.5" fill="none" stroke="var(--text)" stroke-width="1"/>`
        + `<circle cx="32" cy="32" r="1.8" fill="${acc}"/>`;
      break;
  }
  // the crossing thread — the set's signature, never dropped
  const ty1 = r.range(14, 50); const ty2 = r.range(14, 50);
  out += `<path d="M -2 ${f(ty1)} Q 32 ${f(r.range(18, 46))} 66 ${f(ty2)}" fill="none" stroke="var(--thread)" stroke-width="0.7" opacity="0.28"/>`;
  return out;
}

export interface NodeMedallionProps {
  kind: NodeKindId;
  variant?: 'toll' | 'covet';
  act: 1 | 2 | 3 | 4;
  size?: number;
  className?: string;
}

/** A map node's medallion. Pure function of (kind, variant, act) — memoized. */
export const NodeMedallion = React.memo(function NodeMedallion({ kind, variant, act, size = 52, className }: NodeMedallionProps): JSX.Element {
  const inner = React.useMemo(() => nodeMedallionSvg(kind, variant, act), [kind, variant, act]);
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 64 64" aria-hidden
      dangerouslySetInnerHTML={{ __html: inner }} />
  );
});
