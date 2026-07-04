// S11.6 asymmetric scouting — stage 1, cheap, feeds the vote (map knotwork
// session §3c). Nodes show different FACES per seat, through the ruling-5
// machinery: these lines are rendered server-side, per viewer, and never
// cross screens — the partner learns them the way the design wants, by
// being asked "what do you see on your side?".
//
// Vess's seat reads which question an upcoming clue event bears on; Bram's
// seat reads the relic a knot carries (pinned at map generation from a
// DERIVED stream — the live rng is never consumed); a character scene names
// its existence to its own seat only ("a door meant for you" —
// existence-naming, held-reveal-compatible: never contents).
//
// Flag-gated like every scouted source (clue events need tracks, character
// scenes and the knot pins need a flag): unflagged runs scout nothing and
// the projection ships no field. This module imports content/truth — in the
// client bundle that resolves to the empty stub (bundle secrecy), and the
// client never calls this: scout lines arrive pre-rendered in the view.

import { GameState, PlayerId } from './types';
import { EVENTS, RELICS_BY_ID } from './content/registry';
import { QUESTIONS_BY_ID } from './content/questions';
import { FRAGMENTS } from './content/truth';

/** The question a clue event's ACTOR channel bears on — the seat that takes
 *  the event reads this face (the partner channel stays their surprise). */
function clueBearing(eventId: string): string | null {
  return FRAGMENTS.find((f) => f.eventId === eventId && f.channel === 'actor')?.bearsOn ?? null;
}

/** Per-seat scout lines, keyed by node id. Computed server-side at
 *  projection time; the reducer never reads this (render-only, no state). */
export function scoutView(state: GameState, viewer: PlayerId): Record<number, string> {
  const out: Record<number, string> = {};
  if (!state.tracks && !state.rites) return out;
  const you = state.players[viewer].character;
  for (const n of state.map.nodes) {
    if (n.kind === 'elite' && n.scoutRelicId && you === 'bram') {
      const relic = RELICS_BY_ID[n.scoutRelicId];
      if (relic) out[n.id] = `carries ${relic.name}`;
      continue;
    }
    if (n.kind !== 'event' || !n.eventId) continue;
    const def = EVENTS[n.eventId];
    if (!def) continue;
    if (def.character && def.character === you) {
      out[n.id] = 'a door meant for you';
    } else if (def.clue && you === 'vess') {
      const q = clueBearing(n.eventId);
      if (q && QUESTIONS_BY_ID[q]) out[n.id] = `bears on “${QUESTIONS_BY_ID[q].text}”`;
    }
  }
  return out;
}
