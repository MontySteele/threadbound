// 6 Act 1 enemy designs incl. The Mourner elite (§6). Intents are fixed
// rotations so fights are deterministic given spawn rolls; variety comes from
// HP rolls, bindings, and script offsets.

import { EnemyDef } from '../types';

export const ENEMIES: Record<string, EnemyDef> = {
  cinder_husk: {
    id: 'cinder_husk',
    name: 'Cinder Husk',
    hp: [22, 26],
    script: [
      { kind: 'attack', amount: 7 },
      { kind: 'attack', amount: 7 },
      { kind: 'block', amount: 6 },
    ],
    flavor: 'What remains when a fire is given a body and the body is given nothing else.',
  },
  tallow_wisp: {
    id: 'tallow_wisp',
    name: 'Tallow Wisp',
    hp: [16, 20],
    script: [
      { kind: 'debuff_weak', amount: 1 },
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 5 },
    ],
    flavor: 'A votive flame that outlived its prayer and now searches for someone to grieve.',
  },
  thread_leech: {
    id: 'thread_leech',
    name: 'Thread-Leech',
    hp: [20, 24],
    script: [
      { kind: 'attack_drain', amount: 4, threadDrain: 1 },
      { kind: 'attack', amount: 6 },
      { kind: 'attack_drain', amount: 4, threadDrain: 1 },
      { kind: 'block', amount: 5 },
    ],
    flavor: 'It does not want your blood; it wants the thing that binds you, and it is patient.',
  },
  reliquary_mite: {
    id: 'reliquary_mite',
    name: 'Reliquary Mite',
    hp: [18, 22],
    script: [
      { kind: 'attack_momentum', base: 4, perMomentum: 2 }, // "who holds this one" puzzle (§6)
      { kind: 'block', amount: 5 },
      { kind: 'attack_momentum', base: 4, perMomentum: 2 },
    ],
    flavor: "Small enough to live inside a saint's knucklebone, and old enough to have eaten the saint.",
  },
  sexton: {
    id: 'sexton',
    name: 'Sexton of the Undercroft',
    hp: [38, 44],
    script: [
      { kind: 'attack', amount: 9 },
      { kind: 'block', amount: 8 },
      { kind: 'attack_all', amount: 6 },
      { kind: 'attack', amount: 9 },
    ],
    flavor: 'He still digs the graves, though no one has died here in a hundred years who stayed dead.',
  },
  mourner: {
    id: 'mourner',
    name: 'The Mourner',
    elite: true,
    hp: [70, 78],
    mournerMechanic: { strengthPerTrigger: 2 }, // §6: punishes 4+ same-player runs
    script: [
      { kind: 'attack', amount: 8 },
      { kind: 'debuff_weak', amount: 1 },
      { kind: 'attack', amount: 6, times: 2 },
      { kind: 'block', amount: 10 },
    ],
    flavor: 'It weeps for every soul that fought alone, and it will make mourners of you both if you give it the chance.',
  },
};
