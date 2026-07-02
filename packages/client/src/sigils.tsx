// B6 — the shipped art set: deterministic typographic-sigil portraits
// (sanctioned fallback, "current aesthetic, intensified"). Whole-set
// consistency by construction: every mark is generated from the same grammar,
// seeded by the entity id. The AI-portrait pipeline (scripts/art/) can replace
// these wholesale; mixing sets is forbidden per the M3 plan.

import React from 'react';

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

export interface SigilProps {
  id: string;
  size?: number;
  hue?: string; // CSS color for the stroke; defaults derived from id
  aura?: boolean; // elites/bosses
  className?: string;
}

const PALETTE = ['#b98fd4', '#d4756f', '#7fd4ff', '#8fd48f', '#d4af6f', '#c7b9a2'];

/** A grave-mark / bound-spirit sigil: ring, spokes, knots, a crossing thread. */
export function Sigil({ id, size = 72, hue, aura, className }: SigilProps): JSX.Element {
  const r = new Rand(hash32(id));
  const stroke = hue ?? PALETTE[r.int(PALETTE.length)];
  const c = 50;
  const ringR = r.range(26, 34);
  const spokes = 3 + r.int(5);
  const knots = 2 + r.int(4);
  const parts: JSX.Element[] = [];

  // outer ring, sometimes broken
  const gap = r.next() < 0.5 ? r.range(0.4, 1.4) : 0;
  parts.push(
    <circle key="ring" cx={c} cy={c} r={ringR} fill="none" stroke={stroke} strokeWidth={1.6}
      strokeDasharray={gap ? `${ringR * (Math.PI * 2 - gap)} ${ringR * gap}` : undefined}
      transform={`rotate(${r.range(0, 360)} ${c} ${c})`} opacity={0.9} />,
  );
  // inner geometry: spokes
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2 + r.range(-0.1, 0.1);
    const r1 = r.range(4, 12);
    const r2 = ringR - r.range(0, 6);
    parts.push(
      <line key={`s${i}`} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1}
        x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2}
        stroke={stroke} strokeWidth={r.next() < 0.3 ? 2.2 : 1.2} opacity={0.85} />,
    );
  }
  // knots: small circles riding the ring or spokes
  for (let i = 0; i < knots; i++) {
    const a = r.range(0, Math.PI * 2);
    const kr = r.range(8, ringR);
    parts.push(
      <circle key={`k${i}`} cx={c + Math.cos(a) * kr} cy={c + Math.sin(a) * kr}
        r={r.range(1.6, 4)} fill={r.next() < 0.5 ? stroke : 'none'} stroke={stroke} strokeWidth={1} opacity={0.9} />,
    );
  }
  // the crossing thread — every mark carries one (it's that kind of place)
  const a1 = r.range(0, Math.PI * 2);
  const a2 = a1 + r.range(2, 4);
  const x1 = c + Math.cos(a1) * (ringR + 8);
  const y1 = c + Math.sin(a1) * (ringR + 8);
  const x2 = c + Math.cos(a2) * (ringR + 8);
  const y2 = c + Math.sin(a2) * (ringR + 8);
  parts.push(
    <path key="thread" d={`M ${x1} ${y1} Q ${c + r.range(-15, 15)} ${c + r.range(-15, 15)} ${x2} ${y2}`}
      fill="none" stroke="var(--thread)" strokeWidth={1} opacity={0.65} />,
  );

  return (
    <svg className={className} width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {aura && <circle cx={c} cy={c} r={44} fill="none" stroke={stroke} strokeWidth={5} opacity={0.13} />}
      {aura && <circle cx={c} cy={c} r={40} fill="none" stroke={stroke} strokeWidth={1} opacity={0.35} />}
      <circle cx={c} cy={c} r={38} fill="var(--ink-2)" opacity={0.85} />
      {parts}
    </svg>
  );
}

/** Character marks: fixed hues so Vess/Bram/the Witness always read the same. */
export function CharacterSigil({ who, size = 64 }: { who: 'vess' | 'bram' | 'witness'; size?: number }): JSX.Element {
  const hue = who === 'vess' ? 'var(--hex)' : who === 'bram' ? 'var(--p2)' : 'var(--witness)';
  return <Sigil id={`character_${who}`} size={size} hue={hue} />;
}
