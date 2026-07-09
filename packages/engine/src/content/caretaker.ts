// S22.4 (D4) — the Caretaker: the Machine's preservation instinct, the
// Witness's rival, Act 4's encounter. The codex was always the weapon; this
// is the pattern of every two-faced boss at full scale.
//
// Pillars, from the reflex it is (all RULED, S22 Part 4):
//   1. It restores the original — Restoration intents drive the grownDef
//      machinery in reverse, one turn at a time (combat.ts).
//   2. It purges what drifted — phase two exiles cards from the chain
//      (run-scale cruelty, never meta-scale), and it binds to NEITHER
//      player: it does not acknowledge the pair as parts of the Machine.
//   3. Truths are armor — each RUN truth named this descent cancels one
//      Restoration before it lands (the profile codex opens the door; the
//      RUN earns the fight).
//   4. The declaration loads the opening — the fifth question's answer
//      picks the first face and opening pattern (the q_what→bossFace
//      plumbing at meta-scale; CARETAKER_FACES below).
//   5. The Witness intervenes once, at the phase turn (combat.ts).
//
// The fairness laws hold: telegraphed, counterable, no falsehoods in any
// mechanicLine — the encounter that reverts cards SAYS so plainly.
//
// NUMBERS PROVISIONAL BY DECLARATION (REPORTED-not-banded in batteries —
// the ascension-header law; Part 7 Phase B). ALL PROSE PROVISIONAL — S22
// Part 6 "The Caretaker" table; signs as one table.

import { EnemyDef } from '../types';

export const CARETAKER: EnemyDef = {
  id: 'the_caretaker',
  name: 'The Caretaker',
  act: 4,
  boss: true,
  hp: [235, 255],
  // phase 1 — Restoration: revert the drift, wear the pair down
  script: [
    { kind: 'restore' },
    { kind: 'attack_all', amount: 10 },
    { kind: 'block', amount: 22 },
    { kind: 'attack_all', amount: 12 },
    { kind: 'restore' },
    { kind: 'buff_strength', amount: 2 },
  ],
  // phase 2 — Purge: what cannot be restored is deleted
  caretaker: {
    phase2Script: [
      { kind: 'purge', count: 1 },
      { kind: 'attack_all', amount: 12 },
      { kind: 'restore' },
      { kind: 'purge', count: 1 },
      { kind: 'attack_all', amount: 10 },
      { kind: 'block', amount: 16 },
    ],
  },
  mechanicLine:
    'it binds to NEITHER of you. Its Restoration makes what you grew, reclaimed, and upgraded resolve as first cut, for one turn — each truth named this descent cancels one. At half its blood, it begins to purge.',
  flavor:
    'The other reflex. It has kept the original all this time, and it is not wrong that the original is gone — only about what that means.',
};

/** Pillar 4: the declared fifth answer picks the first face and opening
 *  pattern. `opening` indexes the phase-1 script; `title` overrides the
 *  name the way the act-3 faces do; `mechanicLine` states the opening
 *  plainly (a ward may cancel a Restoration LANDING — the intent still
 *  opens, so each line claims only the intent). 2–4 faces per the answer
 *  pool, per the ruling — one per declared theme. */
export const CARETAKER_FACES: Record<string, { title: string; opening: number; mechanicLine: string }> = {
  a_fifth_debt: {
    title: 'The Caretaker, Who Keeps Accounts',
    opening: 0,
    mechanicLine: 'its first intent is a Restoration — what you grew resolves as first cut, for a turn',
  },
  a_fifth_penance: {
    title: 'The Caretaker, Who Keeps the Forms',
    opening: 2,
    mechanicLine: 'its first intent is to brace behind Block',
  },
  a_fifth_grief: {
    title: 'The Caretaker, Who Keeps What Was',
    opening: 1,
    mechanicLine: 'its first intent strikes you both',
  },
  a_fifth_zeal: {
    title: 'The Caretaker, Who Keeps the Faith',
    opening: 5,
    mechanicLine: 'its first intent gathers Strength',
  },
};
