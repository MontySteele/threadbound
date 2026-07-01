// nt-slice S6.5: the finale boss's two faces (slice economy — ONE body, the
// Unraveled's stats and script, wearing a truth). Face keyed off the rolled
// *what happened* answer; per-face mechanic pool; two live mechanics rolled
// seed-deterministically at run start, slot 0 bound to q_what (revealed with
// the real name), slot 1 to q_why.
//
// SERVER-SIDE module (§11 extension): the live mechanic list and the pools
// must never reach a client — only rendered reveal/telegraph strings do.
// Not re-exported from the engine index. LORE PROVISIONAL.

import { EnemyIntent } from '../types';
import { rngInt } from '../rng';

export interface BossMechanicDef {
  id: string;
  name: string;
  /** what it does when it fires (scaled like any script intent) */
  intent: EnemyIntent;
  /** whispered one turn before FIRST firing, when unrevealed */
  telegraphLine: string;
  /** shown in the intent UI from combat start, when revealed at the shrine */
  revealLine: string;
}

export interface BossFaceDef {
  /** the q_what answer this face embodies */
  answerId: string;
  realName: string;
  mechanicPool: BossMechanicDef[];
}

export const FACES: BossFaceDef[] = [
  {
    answerId: 'a_sexton',
    realName: 'The Sexton',
    mechanicPool: [
      {
        id: 'm_sx_tolling_silence',
        name: 'Tolling Silence',
        intent: { kind: 'attack_drain', amount: 12, threadDrain: 3 },
        telegraphLine: 'The air goes thick, the way it does before a struck bell — but no bell comes.',
        revealLine: 'Tolling Silence — it will strike and drink the Thread between you.',
      },
      {
        id: 'm_sx_grave_cloth',
        name: 'Grave-cloth',
        intent: { kind: 'debuff_weak', amount: 2 },
        telegraphLine: 'Cloth stirs at the edge of the light, reaching for your hands.',
        revealLine: 'Grave-cloth — it will bind your arms weak, as it once bound a clapper.',
      },
      {
        id: 'm_sx_seal_the_door',
        name: 'Seal the Door',
        intent: { kind: 'block_all', amount: 20 },
        telegraphLine: 'Mortar dust sifts down through the dark. Something is closing.',
        revealLine: 'Seal the Door — it will brick itself behind stone, as it did once before.',
      },
    ],
  },
  {
    answerId: 'a_peal',
    realName: 'The Peal',
    mechanicPool: [
      {
        id: 'm_pl_second_toll',
        name: 'The Second Toll',
        intent: { kind: 'attack_all', amount: 9 },
        telegraphLine: 'A hum builds in your teeth, in the stone, in the water.',
        revealLine: 'The Second Toll — it will sound through both of you at once.',
      },
      {
        id: 'm_pl_crescendo',
        name: 'Crescendo',
        intent: { kind: 'buff_strength', amount: 3 },
        telegraphLine: 'The ringing climbs a register no throat should hold.',
        revealLine: 'Crescendo — it will climb, and every stroke after will land harder.',
      },
      {
        id: 'm_pl_shatter_note',
        name: 'Shatter-Note',
        intent: { kind: 'attack_fray', amount: 10 },
        telegraphLine: 'The note bends toward breaking, and it is not the note that will break.',
        revealLine: 'Shatter-Note — it will strike at the braid itself and fray you both.',
      },
    ],
  },
];

export const FACE_BY_ANSWER: Record<string, BossFaceDef> = {};
for (const f of FACES) {
  if (FACE_BY_ANSWER[f.answerId]) throw new Error(`duplicate face for ${f.answerId}`);
  FACE_BY_ANSWER[f.answerId] = f;
}

/** Two distinct live mechanics from the face's pool, seed-deterministic.
 *  Slot order matters: [0] is q_what-bound, [1] is q_why-bound. */
export function rollLiveMechanics(faceAnswerId: string, rng: number): { value: string[]; state: number } {
  const pool = FACE_BY_ANSWER[faceAnswerId].mechanicPool.map((m) => m.id);
  const first = rngInt(rng, pool.length);
  const rest = pool.filter((_, i) => i !== first.value);
  const second = rngInt(first.state, rest.length);
  return { value: [pool[first.value], rest[second.value]], state: second.state };
}

/** Mechanic firing schedule: slot 0 first fires on turn 3, slot 1 on turn 5,
 *  each every 4 turns after. Fixed and learnable — no hidden rolls. */
export function mechanicFireTurns(slot: number): { first: number; period: number } {
  return { first: 3 + slot * 2, period: 4 };
}
