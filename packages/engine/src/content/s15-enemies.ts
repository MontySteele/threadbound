// S15.2A (sweep B5, D2 RULED 2026-07-05: option C, A-first): the roster's
// one pierce-class enemy — the single way through Block, aimed so
// symmetric-guard pairs specifically must answer it. Design law (S15 doc
// Part 2): legible, telegraphed (attack_pierce wears its own tint), with
// real counterplay — Weak dulls it (modifiers apply pre-pierce) and kill
// priority ends it. Covenant check on record: post-block damage, not Hex;
// no Hex-amount growth; caps not implicated. Numbers and all strings
// RATIFIED as proposed — S16-D1 (2026-07-05), D5 rows 1–10.

import { EnemyDef } from '../types';

export const S15_ENEMIES: EnemyDef[] = [
  // Act 2 normal-pool body, ALSO carried by the knot-eligible elite
  // composition (a2_knot_rippers ×2) so the braid's fewer-bloodier fights
  // include the guard check. Co-op layer: kill-priority coordination — the
  // pair must decide together whose turn budget answers it.
  {
    id: 'seamripper',
    name: 'The Seamripper',
    act: 2,
    hp: [42, 48],
    // Battery-2 checkpoint re-mix: pierce 6→7, plain 11→9 — the loop's
    // unpreventable share rises (12+11 → 14+9) while total heat stays in
    // the normal-tier range. The differential is the lever; the total is
    // the collateral (x3 battery taught this the expensive way).
    script: [
      { kind: 'attack_pierce', amount: 7 },
      { kind: 'block', amount: 8 },
      { kind: 'attack', amount: 9 },
      { kind: 'attack_pierce', amount: 7 },
    ],
    mechanicLine: 'its needle passes under Block — banked guard will not stop it',
    flavor: 'It has never met a seam it respected, and it does not consider your guard a special case.',
  },
];
