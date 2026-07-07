// S4.4 ascension ladder skeleton. Rungs are composable modifiers applied at
// run start — discrete flags the engine consumes, NOT multiplied env math
// (TB_ENEMY_HP_SCALE / TB_ENEMY_DMG_SCALE stay orthogonal live overrides).
// A-level N applies all rungs ≤ N (StS convention).
//
// EVERY NUMBER HERE IS PROVISIONAL: structure shipped ahead of data. M-next
// recalibrates against Playtest 2 + soft-release telemetry. Do not tune.

import { EnemyIntent } from './types';

export const ASCENSION_MAX = 5;

export interface AscensionMods {
  /** A1: stacks multiplicatively on the §14.8 anchor (applied at combat start) */
  hpScale: number;
  /** A2: enemy damage scale (applied to intents as they're assigned) */
  dmgScale: number;
  /** A3: +1 elite per act (map generation) */
  extraElite: boolean;
  /** A4: Fray fires when the pool drops below this (0 normally; 1 = spending
   *  the last point already frays) */
  frayThreshold: number;
  /** S15.2B (sweep B5 option B, D2 ruled C): at A4 the Fray damage bonus
   *  lands PAST Block — the rung finally has teeth against turtles. Below
   *  A4, Fray stays a pre-block multiplier (byte-identical arithmetic). */
  frayPierces: boolean;
  /** A5: rest-site heal fraction (30% → 20%) */
  restHeal: number;
}

export function ascensionMods(level: number): AscensionMods {
  const n = Math.max(0, Math.min(ASCENSION_MAX, Math.floor(level || 0)));
  return {
    hpScale: n >= 1 ? 1.1 : 1,
    dmgScale: n >= 2 ? 1.1 : 1,
    extraElite: n >= 3,
    frayThreshold: n >= 4 ? 1 : 0,
    frayPierces: n >= 4, // S15.2B
    restHeal: n >= 5 ? 0.2 : 0.3,
  };
}

/** Lobby copy — one line per rung, cumulative. */
export const ASCENSION_RUNGS: Record<number, string> = {
  1: 'enemies have +10% HP',
  2: 'enemies hit +10% harder',
  // S21.4 (A3-a, ruled on the survey): the extra crossing pays no card
  // picks — the copy says so (truth law; the old line implied a knot like
  // any other). PROVISIONAL pending the S21 Part 5 signature row.
  3: 'one more elite per act — a toll: its crossing pays no card picks',
  // S15.2B: copy RATIFIED (D5 row 8 — S16-D1) — the rung's new teeth stated
  4: 'the Thread frays on its last point — and Fray bites past Block',
  5: 'rest sites heal 20% instead of 30%',
};

/** A2: scale an enemy intent's damage numbers. Identity at scale 1 (A0/A1
 *  parity — the exact same object comes back, no float round-trips). */
export function scaleIntent(intent: EnemyIntent, scale: number): EnemyIntent {
  if (scale === 1) return intent;
  const s = (n: number): number => Math.round(n * scale);
  switch (intent.kind) {
    case 'attack': return { ...intent, amount: s(intent.amount) };
    case 'attack_all': return { ...intent, amount: s(intent.amount) };
    case 'attack_drain': return { ...intent, amount: s(intent.amount) };
    case 'attack_fray': return { ...intent, amount: s(intent.amount) };
    case 'attack_pierce': return { ...intent, amount: s(intent.amount) }; // S15.2A
    case 'attack_momentum': return { ...intent, base: s(intent.base) };
    case 'read_chain': return { ...intent, amount: s(intent.amount) }; // S10a
    default: return intent;
  }
}
