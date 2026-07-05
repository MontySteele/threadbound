// S15.2A (sweep B5, D2 RULED 2026-07-05: option C, A-first): the roster's
// one pierce-class enemy — the single way through Block, aimed so
// symmetric-guard pairs specifically must answer it. Design law (S15 doc
// Part 2): legible, telegraphed (attack_pierce wears its own tint), with
// real counterplay — Weak dulls it (modifiers apply pre-pierce) and kill
// priority ends it. Covenant check on record: post-block damage, not Hex;
// no Hex-amount growth; caps not implicated. Numbers and all strings
// PROVISIONAL pending the D5 sign-off table (S15 status doc).

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
    script: [
      { kind: 'attack_pierce', amount: 6 },
      { kind: 'block', amount: 8 },
      { kind: 'attack', amount: 11 },
      { kind: 'attack_pierce', amount: 6 },
    ],
    mechanicLine: 'its needle passes under Block — banked guard will not stop it',
    flavor: 'It has never met a seam it respected, and it does not consider your guard a special case.',
  },
];
