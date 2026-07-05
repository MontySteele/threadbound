// S10a combat breadth (docs/threadbound_tonight_s9a_s10a.md Part B): 9 new
// enemies + the Mislaid spawn body. Composition rule (hard): every enemy
// interacts with the co-op layer — Binding, Thread, the Chain/links/
// Resonance, or the discard/exhaust/Reclaim space. Mostly co-op-literacy
// REWARDERS; the two punishers (Choir Silence, and the Sexton's discard
// feed) are texture, per the doc's bias. All numbers PROVISIONAL — raw
// values here; the registry applies the global TB_ENEMY_* scales.
// Every mechanic is stated in mechanicLine (legible from intent UI, not
// discovered by autopsy). Names from the word-drawer via the signed table.

import { EnemyDef } from '../types';

export const S10_ENEMIES: EnemyDef[] = [
  // ---- Act 1 easy -----------------------------------------------------------
  {
    id: 'tithe_taker',
    name: 'Tithe-Taker',
    act: 1,
    hp: [17, 21],
    script: [
      { kind: 'attack_drain', amount: 4, threadDrain: 1 },
      { kind: 'attack', amount: 5 },
      { kind: 'attack_drain', amount: 4, threadDrain: 1 },
      { kind: 'block', amount: 4 },
    ],
    threadOnDeath: 2,
    mechanicLine: 'its blows tithe the Thread — its death refunds 2',
    flavor: 'It collects what the parish owes. The parish has owed for a very long time.',
  },
  {
    id: 'twice_carried',
    name: 'Twice-Carried',
    act: 1,
    hp: [20, 24],
    script: [
      { kind: 'attack', amount: 5 },
      { kind: 'attack', amount: 6 },
      { kind: 'block', amount: 4 },
    ],
    splitsOnDeath: { defId: 'mislaid', count: 2 },
    mechanicLine: 'on death it comes apart — two Mislaid',
    flavor: 'Cargo that was never one thing, carried by bearers who never asked.',
  },
  {
    // spawn-only body (Half-Carried's split); appears in no encounter pool
    id: 'mislaid',
    name: 'Mislaid',
    act: 1,
    hp: [7, 9],
    script: [
      { kind: 'attack', amount: 3 },
      { kind: 'attack', amount: 4 },
    ],
    flavor: 'Something set down in the dark and never claimed.',
  },

  // ---- Act 1 normal -----------------------------------------------------------
  {
    id: 'votive_snuffer',
    name: 'Votive Snuffer',
    act: 1,
    hp: [30, 36],
    script: [
      { kind: 'attack', amount: 7 },
      { kind: 'debuff_weak', amount: 2 },
      { kind: 'attack', amount: 8 },
      { kind: 'block', amount: 6 },
    ],
    blockOnLinkFire: 2,
    mechanicLine: 'gains 2 Block whenever a link fires',
    flavor: 'Wherever two flames answer each other, it pinches one out.',
  },
  {
    id: 'pall_warden',
    name: 'Pall Warden',
    act: 1,
    hp: [36, 42],
    script: [
      { kind: 'attack', amount: 9 },
      { kind: 'block', amount: 8 },
      { kind: 'attack', amount: 9 },
      { kind: 'attack_all', amount: 5 },
    ],
    rebindsToLastPlayed: true,
    mechanicLine: 'rebinds each turn to the last hand in the Chain',
    flavor: 'It follows the freshest grief in the room, and grief moves with the hands.',
  },

  // ---- Act 1 elite ------------------------------------------------------------
  {
    id: 'mislaid_sexton',
    name: 'The Mislaid Sexton',
    act: 1,
    elite: true,
    hp: [72, 80],
    script: [
      { kind: 'attack', amount: 10 },
      { kind: 'block', amount: 10 },
      { kind: 'attack', amount: 7, times: 2 },
      { kind: 'debuff_vulnerable', amount: 2 },
      { kind: 'attack', amount: 10 },
    ],
    exhaustsDiscardEvery: 3,
    // S14.3 (B8) trim, RATIFIED 2026-07-05 (D4)
    mechanicLine: 'every 3rd turn it eats the top of its bound one’s discard',
    flavor: 'The other sexton buried what stayed dead. This one keeps what was left lying out.',
  },

  // ---- Act 2 easy -------------------------------------------------------------
  {
    id: 'bell_wretch_cracked',
    name: 'Bell Wretch, Cracked',
    act: 2,
    hp: [36, 42],
    script: [
      { kind: 'attack_fray', amount: 7 },
      { kind: 'attack', amount: 10 },
      { kind: 'block', amount: 8 },
    ],
    crackedByResonance: 2,
    mechanicLine: 'the turn after a Resonance, every hit strikes it +2 — the harmony hurts it',
    flavor: 'A bell rung once too truly. The crack remembers the note.',
  },
  {
    id: 'descant_mote',
    name: 'Descant Mote',
    act: 2,
    hp: [30, 34],
    script: [
      { kind: 'attack', amount: 8 },
      { kind: 'debuff_weak', amount: 2 },
      { kind: 'attack', amount: 8 },
      { kind: 'block', amount: 7 },
    ],
    echoesDebuffs: true,
    mechanicLine: 'Weak or Vulnerable laid on another lands on it too — a follower’s echo',
    flavor: 'It cannot sing the melody. It sings whatever happens to the choir instead.',
  },

  // ---- Act 2 normal -----------------------------------------------------------
  {
    id: 'choir_silence',
    name: 'Choir Silence',
    act: 2,
    hp: [42, 50],
    script: [
      { kind: 'block_all', amount: 8 },
      { kind: 'attack', amount: 11 },
      { kind: 'debuff_weak', amount: 2 },
      { kind: 'attack', amount: 11 },
    ],
    silencesFirstLink: true,
    // punisher, normal-tier exception — watch it in the battery (gate 4)
    // S14.3 (B8) trim, RATIFIED 2026-07-05 (D4)
    mechanicLine: 'the first link each turn is held — a Pulse still forces it',
    flavor: 'The held breath between verses, standing up and refusing to sit back down.',
  },

  // ---- Act 2 elite ------------------------------------------------------------
  {
    id: 'the_unstrung',
    name: 'The Unstrung',
    act: 2,
    elite: true,
    hp: [100, 112],
    script: [
      { kind: 'read_chain', amount: 8, fray: 1 },
      { kind: 'attack', amount: 12 },
      { kind: 'read_chain', amount: 8, fray: 1 },
      { kind: 'block', amount: 12 },
      { kind: 'read_chain', amount: 8, fray: 1 },
    ],
    // S14.3 (B8) trim — the intent restates the dilemma; RATIFIED 2026-07-05 (D4)
    mechanicLine: 'Resonate and the Thread Frays; hold back and it strikes twice',
    flavor: 'It had a thread once. It listens for yours the way the deaf watch mouths.',
  },
];
