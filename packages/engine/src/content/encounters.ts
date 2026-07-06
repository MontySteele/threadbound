// Encounter compositions per act (M2-B3). The branching map generator
// (map.ts) assigns these to combat/elite/boss nodes.


export interface EncounterDef {
  id: string;
  enemies: string[];
  tier: 'easy' | 'normal' | 'elite' | 'boss';
}

export const ENCOUNTERS: Record<string, EncounterDef> = {};
function enc(e: EncounterDef): void {
  ENCOUNTERS[e.id] = e;
}

// ---- Act 1: The Undercroft --------------------------------------------------
enc({ id: 'a1_husks', enemies: ['cinder_husk', 'cinder_husk'], tier: 'easy' });
enc({ id: 'a1_wisp_leech', enemies: ['tallow_wisp', 'thread_leech'], tier: 'easy' });
enc({ id: 'a1_throng', enemies: ['votive_throng', 'votive_throng', 'tallow_wisp'], tier: 'easy' });
enc({ id: 'a1_gravewax', enemies: ['gravewax_husk', 'cinder_husk'], tier: 'normal' });
enc({ id: 'a1_sexton_mite', enemies: ['sexton', 'reliquary_mite'], tier: 'normal' });
enc({ id: 'a1_pallbearer', enemies: ['pallbearer', 'votive_throng'], tier: 'normal' });
enc({ id: 'a1_leech_pair', enemies: ['thread_leech', 'thread_leech', 'tallow_wisp'], tier: 'normal' });
enc({ id: 'a1_elite_mourner', enemies: ['mourner'], tier: 'elite' });
enc({ id: 'a1_elite_warden', enemies: ['warden_of_the_crossing'], tier: 'elite' });
enc({ id: 'a1_boss', enemies: ['interred_saint'], tier: 'boss' });
// S10a: variety compounds combinatorially — new enemies mixed with existing
enc({ id: 'a1_tithe_carried', enemies: ['tithe_taker', 'twice_carried'], tier: 'easy' });
enc({ id: 'a1_snuffer_throng', enemies: ['votive_snuffer', 'votive_throng', 'tallow_wisp'], tier: 'normal' });
enc({ id: 'a1_warden_leech', enemies: ['pall_warden', 'thread_leech', 'cinder_husk'], tier: 'normal' });
enc({ id: 'a1_elite_sexton', enemies: ['mislaid_sexton'], tier: 'elite' });

// ---- Act 2: The Hollow Choir -------------------------------------------------
enc({ id: 'a2_psalm_pair', enemies: ['psalm_eater', 'psalm_eater'], tier: 'easy' });
enc({ id: 'a2_bell_wretch', enemies: ['bell_husk', 'lectern_wretch'], tier: 'easy' });
enc({ id: 'a2_choristers', enemies: ['chorister_low', 'chorister_mid', 'chorister_high'], tier: 'normal' });
enc({ id: 'a2_bell_pair', enemies: ['bell_husk', 'bell_husk', 'psalm_eater'], tier: 'normal' });
enc({ id: 'a2_wretch_eater', enemies: ['lectern_wretch', 'psalm_eater', 'bell_husk'], tier: 'normal' });
enc({ id: 'a2_elite_cantor', enemies: ['the_cantor'], tier: 'elite' });
enc({ id: 'a2_elite_bellkeeper', enemies: ['bellkeeper', 'votive_throng'], tier: 'elite' });
enc({ id: 'a2_boss', enemies: ['choirmaster'], tier: 'boss' });
// S10a
enc({ id: 'a2_cracked_eater', enemies: ['bell_wretch_cracked', 'psalm_eater'], tier: 'easy' });
enc({ id: 'a2_mote_pair', enemies: ['descant_mote', 'descant_mote'], tier: 'easy' });
enc({ id: 'a2_silence_wretch', enemies: ['choir_silence', 'lectern_wretch', 'psalm_eater'], tier: 'normal' });
enc({ id: 'a2_cracked_mote_husk', enemies: ['bell_wretch_cracked', 'descant_mote', 'bell_husk'], tier: 'normal' });
enc({ id: 'a2_elite_unstrung', enemies: ['the_unstrung'], tier: 'elite' });
// S15.2A (sweep B5, D2 ruled C/A-first): the pierce enemy rides the act-2
// normal pool AND an elite composition — the elite pool is what knots draw,
// so this is the "eligible for knot encounters" half of the ruling. The
// braid's fewer-bloodier fights include the guard check either way.
enc({ id: 'a2_ripper_eater', enemies: ['seamripper', 'psalm_eater'], tier: 'normal' });
// Sizing history (S15 status doc, battery checkpoints): x2 read 28-36
// hp/combat — no guard check; x3 read 56-69 (hottest elite in the game)
// and broke the R1 band on vb default via the shared classic elite pool.
// Settled: x2 bodies with the def's damage MIX shifted pierce-ward — the
// differential (unpreventable) share is what checks guard pairs; the
// absolute total is what bled everyone at x3.
enc({ id: 'a2_knot_rippers', enemies: ['seamripper', 'seamripper'], tier: 'elite' });

// ---- Finale: The Last Braid ----------------------------------------------------
enc({ id: 'finale_boss', enemies: ['the_unraveled'], tier: 'boss' });

// S10a pool growth: act-2 easy 2→4; both normal pools +2; +1 elite per act.
// Act-1 easy also +1 (the table put Tithe-Taker/Half-Carried in that pool —
// they need a gentle debut even though the summary line elided the growth).
// At the L7 maps (~7 combats/act) the old pools repeated within one run.
export const ENCOUNTER_POOLS: Record<1 | 2, { easy: string[]; normal: string[]; elite: string[]; boss: string }> = {
  1: {
    easy: ['a1_husks', 'a1_wisp_leech', 'a1_throng', 'a1_tithe_carried'],
    normal: ['a1_gravewax', 'a1_sexton_mite', 'a1_pallbearer', 'a1_leech_pair', 'a1_snuffer_throng', 'a1_warden_leech'],
    elite: ['a1_elite_mourner', 'a1_elite_warden', 'a1_elite_sexton'],
    boss: 'a1_boss',
  },
  2: {
    easy: ['a2_psalm_pair', 'a2_bell_wretch', 'a2_cracked_eater', 'a2_mote_pair'],
    // S15.2A: +1 normal comp, +1 elite (knot-eligible) comp — pool-size
    // changes shift every act-2 draw → GOLDEN REGEN, loud, in-commit
    normal: ['a2_choristers', 'a2_bell_pair', 'a2_wretch_eater', 'a2_silence_wretch', 'a2_cracked_mote_husk', 'a2_ripper_eater'],
    elite: ['a2_elite_cantor', 'a2_elite_bellkeeper', 'a2_elite_unstrung', 'a2_knot_rippers'],
    boss: 'a2_boss',
  },
};

// S16-D4 (ruled): the braid's second-and-later crossings draw from this
// harder sub-pool — the guard-check comp plus the act's hottest named
// elites; the FIRST crossing keeps the full pool (the gentle debut stands).
// Act 2 composition is the ruling's own words (a2_knot_rippers +
// Bellkeeper tier); act 1 is the same rule applied to the S16.0e heat
// table (warden 26.7/27.6 > sexton 25.1/23.8 ≫ mourner 17.1/17.5).
// DATA, not code — a membership change here is a sign-off row. Constants
// stay [0,.10,.30,.60] as signed: last/first rises by composition.
export const KNOT_SUBPOOLS: Record<1 | 2, string[]> = {
  1: ['a1_elite_warden', 'a1_elite_sexton'],
  2: ['a2_knot_rippers', 'a2_elite_bellkeeper'],
};

