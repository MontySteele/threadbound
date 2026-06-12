// Content registry: merges the M1 base content with the M2 expansion modules
// into the canonical lookup tables the engine uses. All content flows through
// here so the Covenant test suite audits one surface.

import { CardDef, EnemyDef, EventDef, RelicDef } from '../types';
import { CARDS } from './cards';
import { ENEMIES as M1_ENEMIES } from './enemies';
import { EVENTS as M1_EVENTS } from './events';
import { VESS_M2_CARDS, VESS_M1_OVERLAYS } from './vess-m2';
import { BRAM_M2_CARDS, BRAM_M1_OVERLAYS } from './bram-m2';
import { NEUTRAL_CARDS, RELICS } from './neutral-relics-m2';
import { M2_ENEMIES, M2_EVENTS } from './m2-world';

// ---- cards: M2 pools + overlays (mutations/upgrades for M1 cards) ----------

for (const card of [...VESS_M2_CARDS, ...BRAM_M2_CARDS, ...NEUTRAL_CARDS]) {
  if (CARDS[card.id]) throw new Error(`duplicate card id ${card.id}`);
  CARDS[card.id] = card;
}

for (const [id, overlay] of [...Object.entries(VESS_M1_OVERLAYS), ...Object.entries(BRAM_M1_OVERLAYS)]) {
  const card = CARDS[id];
  if (!card) throw new Error(`overlay for unknown card ${id}`);
  if (overlay.mutation && !card.mutation) card.mutation = overlay.mutation;
  if (overlay.upgrade && !card.upgrade) card.upgrade = overlay.upgrade;
}

export { CARDS };

// ---- enemies ----------------------------------------------------------------

export const ENEMIES: Record<string, EnemyDef> = { ...M1_ENEMIES };
for (const e of M2_ENEMIES) {
  if (ENEMIES[e.id]) throw new Error(`duplicate enemy id ${e.id}`);
  ENEMIES[e.id] = e;
}

// ---- Playtest-1 difficulty pass (§14.8) -------------------------------------
// The designer full-cleared act 1 with zero damage; the bot floor sat at 86%
// wins post-draw-5. Inverse of the A2 levers (those were written when the game
// was too HARD): one global enemy HP/damage scale, applied HERE so every
// displayed intent, log line, and tooltip reads the scaled truth. Tune these
// two numbers only against the A1 bands; do not stack per-def edits on top.

// Tuning ladder (seeded 50-run bot floor): 1.0 → 86% | 1.2/1.2 → 30% (the
// designer's calibration run) | then the §14.10 Hatpin buff pushed 1.2/1.2
// back to 74% | 1.3/1.25 → 50% | 1.4/1.3 → 34%, act-1 HP loss 21.4 —
// restores the floor the validated run sat on. Next human run rules.
//
// Env-overridable (review pass, pre-Playtest-2): TB_ENEMY_HP_SCALE /
// TB_ENEMY_DMG_SCALE soften or harden a live session without a commit — the
// proto-ascension slider. Server-side only by nature (the browser bundle has
// no env); safe because clients render enemy numbers from authoritative
// STATE, never from their local content tables. The active values ride along
// in every telemetry file so Part A data stays interpretable. Caveat:
// replaying an action log under different scales diverges — keep the file
// and the scales together.
const envScale = (name: string, fallback: number): number => {
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    const v = Number(process.env[name]);
    if (Number.isFinite(v) && v > 0) return v;
  }
  return fallback;
};
export const PT1_ENEMY_HP_SCALE = envScale('TB_ENEMY_HP_SCALE', 1.4);
export const PT1_ENEMY_DMG_SCALE = envScale('TB_ENEMY_DMG_SCALE', 1.3);

const dmg = (n: number): number => Math.round(n * PT1_ENEMY_DMG_SCALE);
for (const def of Object.values(ENEMIES)) {
  def.hp = [Math.round(def.hp[0] * PT1_ENEMY_HP_SCALE), Math.round(def.hp[1] * PT1_ENEMY_HP_SCALE)];
  def.script = def.script.map((it) => {
    switch (it.kind) {
      case 'attack': return { ...it, amount: dmg(it.amount) };
      case 'attack_all': return { ...it, amount: dmg(it.amount) };
      case 'attack_momentum': return { ...it, base: dmg(it.base) };
      case 'attack_drain': return { ...it, amount: dmg(it.amount) };
      case 'attack_fray': return { ...it, amount: dmg(it.amount) };
      default: return it;
    }
  });
}

// ---- events -------------------------------------------------------------------

export const EVENTS: Record<string, EventDef> = { ...M1_EVENTS };
for (const ev of M2_EVENTS) {
  if (EVENTS[ev.id]) throw new Error(`duplicate event id ${ev.id}`);
  EVENTS[ev.id] = ev;
}

export function eventsForAct(act: 1 | 2): EventDef[] {
  return Object.values(EVENTS).filter((e) => e.act === act || e.act === 0);
}

// ---- relics ---------------------------------------------------------------------

export const RELICS_BY_ID: Record<string, RelicDef> = {};
for (const r of RELICS) {
  if (RELICS_BY_ID[r.id]) throw new Error(`duplicate relic id ${r.id}`);
  RELICS_BY_ID[r.id] = r;
}
export const ALL_RELICS: RelicDef[] = RELICS;
