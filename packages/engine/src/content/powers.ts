// Power registry (M2-B2): powers are data — hooks + passives interpreted by
// the engine, same system as relics. M1's four powers migrated here; new
// powers from the M2 card pools are appended below.

import { PowerDef } from '../types';

export const POWERS: Record<string, PowerDef> = {};

export function defPower(p: PowerDef): void {
  POWERS[p.id] = p;
}

// §9 originals
defPower({ id: 'black_lattice', name: 'Black Lattice', hooks: [{ on: 'detonate', effects: [{ op: 'block', amount: 3 }] }] });
defPower({ id: 'stoke', name: 'Stoke', hooks: [{ on: 'turnStart', effects: [{ op: 'momentum', amount: 2 }] }] });
defPower({ id: 'unbroken_line', name: 'Unbroken Line', hooks: [{ on: 'turnStart', effects: [{ op: 'thread', amount: 1 }] }] });
defPower({ id: 'wildfire_heart', name: 'Wildfire Heart', passives: ['momentumNoHalve'] });

// M2 pool powers (declared via POWER NEEDED comments in vess-m2.ts / bram-m2.ts)
defPower({ id: 'spitespun_mantle', name: 'Spitespun Mantle', hooks: [{ on: 'detonate', effects: [{ op: 'hexAll', amount: 1 }] }] });
defPower({ id: 'loom_of_hours', name: 'Loom of Hours', hooks: [{ on: 'turnStart', effects: [{ op: 'kindled', amount: 1 }, { op: 'block', amount: 2 }] }] });
defPower({ id: 'forgefire', name: 'Forgefire', hooks: [{ on: 'turnStart', effects: [{ op: 'kindled', amount: 1 }] }] });
defPower({ id: 'eye_for_an_opening', name: 'Eye for an Opening', hooks: [{ on: 'linkFired', effects: [{ op: 'momentum', amount: 1 }] }] });
defPower({ id: 'aftershock', name: 'Aftershock', hooks: [{ on: 'detonate', effects: [{ op: 'damageAll', amount: 3 }] }] });

// S13.2 rare identity pass: every hook capped (oncePerTurn — the Worn
// Knife/Saturate cap discipline, CI-enforced); no Hex-amount growth.
// gravebloom / call_and_answer are the D2 REVISE rows; the other four are
// the D3 new rares (s13-rares.ts). Numbers PROVISIONAL until sign-off.
defPower({ id: 'gravebloom', name: 'Gravebloom', hooks: [{ on: 'partnerLinkFired', effects: [{ op: 'hexAll', amount: 2 }], oncePerTurn: true }] });
defPower({ id: 'call_and_answer', name: 'Call and Answer', hooks: [{ on: 'partnerLinkFired', effects: [{ op: 'kindled', amount: 1 }, { op: 'draw', amount: 1 }], oncePerTurn: true }] });
defPower({ id: 'selvage', name: 'Selvage', hooks: [{ on: 'chainClose', effects: [{ op: 'block', amount: 3 }, { op: 'partnerBlock', amount: 3 }], oncePerTurn: true }] });
defPower({ id: 'keepsake', name: 'Keepsake', hooks: [{ on: 'reclaim', effects: [{ op: 'thread', amount: 1 }, { op: 'draw', amount: 1 }], oncePerTurn: true }] });
defPower({ id: 'bellmetal', name: 'Bellmetal', hooks: [{ on: 'resonance', effects: [{ op: 'momentum', amount: 3 }, { op: 'draw', amount: 1 }], oncePerTurn: true }] });
defPower({ id: 'stokers_due', name: 'Stoker’s Due', hooks: [{ on: 'threadSpend', effects: [{ op: 'momentum', amount: 2 }, { op: 'block', amount: 3 }], oncePerTurn: true }] });
