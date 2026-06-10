// M1 node map: first third of Act 1, The Undercroft (§8, §12). Linear for M1.

import { MapNode } from '../types';

export interface EncounterDef {
  id: string;
  enemies: string[]; // EnemyDef ids
}

export const ENCOUNTERS: Record<string, EncounterDef> = {
  c1_husks: { id: 'c1_husks', enemies: ['cinder_husk', 'cinder_husk'] },
  c2_wisp_leech: { id: 'c2_wisp_leech', enemies: ['tallow_wisp', 'thread_leech'] },
  c3_sexton_mite: { id: 'c3_sexton_mite', enemies: ['sexton', 'reliquary_mite'] },
  elite_mourner: { id: 'elite_mourner', enemies: ['mourner'] },
};

export const M1_MAP: MapNode[] = [
  { kind: 'combat', encounterId: 'c1_husks' },
  { kind: 'combat', encounterId: 'c2_wisp_leech' },
  { kind: 'event', eventId: 'cold_lantern' },
  { kind: 'combat', encounterId: 'c3_sexton_mite' },
  { kind: 'rest' },
  { kind: 'event', eventId: 'basin' },
  { kind: 'elite', encounterId: 'elite_mourner' },
];
