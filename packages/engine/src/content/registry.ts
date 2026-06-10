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
