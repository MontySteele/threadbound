// S12 — the motif map (data, not code). Silhouette archetype carries identity;
// flags dress the archetype per entity. Adding or re-skinning an entity is a
// map edit, never a grammar edit. The grammar renders a sane default
// (`figure`, no flags) for any id missing from the map — but a missing id is
// also a CI failure (marks.test.ts, Gate A), so the default is a safety net,
// not a workflow. Assignments ratified in the S12 sprint doc (tables 1.1–1.2,
// rulings R1); mislaid_sexton ratified by designer follow-up 2026-07-04
// (figure + tool — shares the Sexton lineage deliberately, same pattern as
// bell_wretch_cracked sharing the Bell Husk family; elite dress differentiates).

export type Archetype = 'figure' | 'flame' | 'bell' | 'crawler' | 'swarm' | 'frayed' | 'eye';

export interface Motif {
  arch: Archetype;
  crest?: 'flame' | 'bell';
  // archetype flags (all optional): wide, small, big, melt, veil, bars,
  // chains, tool, burden, book, weave, crack, maw, member ('flame'), pitch (0|1|2)
  [flag: string]: unknown;
}

export const MOTIFS: Record<string, Motif> = {
  // ---- demo set (table 1.1) -------------------------------------------------
  cinder_husk: { arch: 'figure', crest: 'flame' },
  tallow_wisp: { arch: 'flame' },
  thread_leech: { arch: 'crawler' },
  reliquary_mite: { arch: 'crawler', small: true },
  sexton: { arch: 'figure', tool: true },
  mourner: { arch: 'figure', veil: true },
  votive_throng: { arch: 'swarm', member: 'flame' },
  gravewax_husk: { arch: 'figure', melt: true },
  pallbearer: { arch: 'figure', wide: true, burden: true },
  warden_of_the_crossing: { arch: 'figure', bars: true },
  interred_saint: { arch: 'figure', chains: true },
  psalm_eater: { arch: 'frayed', maw: true },
  bell_husk: { arch: 'bell', crack: true },
  lectern_wretch: { arch: 'figure', book: true },
  chorister_low: { arch: 'figure', pitch: 0 },
  chorister_mid: { arch: 'figure', pitch: 1 },
  chorister_high: { arch: 'figure', pitch: 2 },
  the_cantor: { arch: 'figure', crest: 'bell' },
  bellkeeper: { arch: 'bell', big: true },
  choirmaster: { arch: 'figure', crest: 'bell' },
  the_unraveled: { arch: 'frayed' },
  character_vess: { arch: 'figure', weave: true },
  character_bram: { arch: 'figure', crest: 'flame' },
  character_witness: { arch: 'eye' },

  // ---- S10 enemies (table 1.2, ruling R1) -----------------------------------
  tithe_taker: { arch: 'figure', tool: true }, // the haft reads as the tithe-staff
  twice_carried: { arch: 'figure', wide: true, burden: true },
  mislaid: { arch: 'frayed' }, // a lost thing coming apart
  votive_snuffer: { arch: 'flame' },
  pall_warden: { arch: 'figure', bars: true, wide: true }, // warden lineage + pall weight
  mislaid_sexton: { arch: 'figure', tool: true }, // Sexton lineage; ratified 2026-07-04
  bell_wretch_cracked: { arch: 'bell', crack: true }, // shares Bell Husk family (same lineage)
  descant_mote: { arch: 'swarm' }, // small voices, many
  choir_silence: { arch: 'figure', veil: true }, // a chorister with no note to hold
  the_unstrung: { arch: 'frayed' }, // pre-echo of the Unraveled; elite dress differentiates

  // ---- S15.2A (D5 row 9, RATIFIED — S16-D1) ----------------------------------
  seamripper: { arch: 'crawler', tool: true }, // a slider carrying a point — low, under the seams

  // ---- S22.4 (PROVISIONAL — the Caretaker's table row; signs with Part 6) ----
  // The twin-reflex thesis in the vocabulary's own grammar: the Witness is
  // an 'eye', and its rival is the SAME archetype — two reflexes of one
  // patient (§4; every two-faced boss is a small Witness-versus-Caretaker).
  // Boss tier, act-4 accents, and the id's own seeded rings differentiate;
  // a map edit, never a grammar edit (S12 rule).
  the_caretaker: { arch: 'eye', big: true },
};
