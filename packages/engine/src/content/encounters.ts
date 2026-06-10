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

// ---- Act 2: The Hollow Choir -------------------------------------------------
enc({ id: 'a2_psalm_pair', enemies: ['psalm_eater', 'psalm_eater'], tier: 'easy' });
enc({ id: 'a2_bell_wretch', enemies: ['bell_husk', 'lectern_wretch'], tier: 'easy' });
enc({ id: 'a2_choristers', enemies: ['chorister_low', 'chorister_mid', 'chorister_high'], tier: 'normal' });
enc({ id: 'a2_bell_pair', enemies: ['bell_husk', 'bell_husk', 'psalm_eater'], tier: 'normal' });
enc({ id: 'a2_wretch_eater', enemies: ['lectern_wretch', 'psalm_eater', 'bell_husk'], tier: 'normal' });
enc({ id: 'a2_elite_cantor', enemies: ['the_cantor'], tier: 'elite' });
enc({ id: 'a2_elite_bellkeeper', enemies: ['bellkeeper', 'votive_throng'], tier: 'elite' });
enc({ id: 'a2_boss', enemies: ['choirmaster'], tier: 'boss' });

// ---- Finale: The Last Braid ----------------------------------------------------
enc({ id: 'finale_boss', enemies: ['the_unraveled'], tier: 'boss' });

export const ENCOUNTER_POOLS: Record<1 | 2, { easy: string[]; normal: string[]; elite: string[]; boss: string }> = {
  1: {
    easy: ['a1_husks', 'a1_wisp_leech', 'a1_throng'],
    normal: ['a1_gravewax', 'a1_sexton_mite', 'a1_pallbearer', 'a1_leech_pair'],
    elite: ['a1_elite_mourner', 'a1_elite_warden'],
    boss: 'a1_boss',
  },
  2: {
    easy: ['a2_psalm_pair', 'a2_bell_wretch'],
    normal: ['a2_choristers', 'a2_bell_pair', 'a2_wretch_eater'],
    elite: ['a2_elite_cantor', 'a2_elite_bellkeeper'],
    boss: 'a2_boss',
  },
};

