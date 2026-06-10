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
