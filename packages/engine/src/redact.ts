// S16.0a — the per-seat redaction as a PURE ENGINE FUNCTION. This is the §11
// projection the server has always sent over the wire, factored out so the
// socket-free sim path consumes the SAME code path with no wire and no server
// import (the OQ#56 rider's instrument). GameServer.redactFor delegates here;
// the construction is byte-for-byte the server's original (key order included
// — the wire hash digests this object, so field order is part of the wire
// covenant).
//
// Hands are open information (designer ruling, OQ#22) — co-op has no
// hidden-hand stakes and you'd say it on voice anyway. Only the draw piles
// stay redacted: their ORDER is the one true unknown. Truth state is replaced
// wholesale by the per-viewer projection (§11 extension); the seed+rng pair
// is masked while the run is live (review-fix: it IS the run's hidden future).

import { GameState, PlayerId } from './types';
import { clientTruthView } from './truth-view';
import { scoutView } from './scout';
import { BotView } from './bot-policy';

export function redactFor(state: GameState, viewer: PlayerId): BotView {
  const clone: GameState = structuredClone(state);
  const other: PlayerId = viewer === 'p1' ? 'p2' : 'p1';
  const counts = {
    [viewer]: { hand: clone.players[viewer].hand.length, draw: clone.players[viewer].draw.length },
    [other]: { hand: clone.players[other].hand.length, draw: clone.players[other].draw.length },
  };
  clone.players.p1.draw = [];
  clone.players.p2.draw = [];
  // review-fix (§11 / §11 extension): the seed+rng pair IS the run's hidden
  // future — draw-pile order, and on flagged runs the truth tuple and live
  // mechanics are pure functions of it. Masked while the run is live; the
  // seed returns on the end screens (Summary shows it for sharing/repro),
  // and the lobby's placeholder seed predates the real roll at START_RUN.
  if (clone.phase !== 'lobby' && clone.phase !== 'victory' && clone.phase !== 'game_over') {
    clone.seed = 0;
    clone.rng = 0;
  }
  const truth = clone.truth ? clientTruthView(clone.truth, viewer, clone.botSeat) : undefined;
  // S11.6 asymmetric scouting: per-seat node faces, rendered HERE so the
  // text never crosses screens (ruling 5) — each seat's lines ride only
  // that seat's view. Empty (and absent) on unflagged runs.
  const scout = scoutView(state, viewer);
  return {
    ...clone, ...(truth ? { truth } : {}),
    ...(Object.keys(scout).length > 0 ? { scout } : {}),
    counts, you: viewer,
  } as unknown as BotView;
}
