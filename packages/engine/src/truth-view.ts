// nt-slice S6.3 — the §11-extension projection. Everything a client may know
// about the truth system flows through clientTruthView; the server's redactor
// replaces GameState.truth with this per-viewer shape before anything crosses
// the wire. A player reading the websocket learns nothing their screen
// doesn't show.
//
// Never sent: the truth tuple, fragment→elimination maps, the partner's
// fragment text (stubs carry event + act only — not even the question, so a
// stub can't narrow the sheet). This module deliberately does NOT import
// content/truth.ts: shrine strike-out sources are stored pre-rendered.

import { PinnedFragment, PlayerId, ShrineState, StruckSource, TruthState } from './types';
import { otherPlayer } from './combat';

/** A partner-held thread, face down: "Bram holds a thread — ask him." */
export interface TruthStub {
  eventId: string;
  act: number;
}

export interface ClientShrineView {
  stakeRelicId: string;
  sheet: Record<string, string | null>;
  /** questionId → answerId → sources that struck it (pooled, both boards) */
  struck: Record<string, Record<string, StruckSource[]>>;
  confirmed: Record<PlayerId, boolean>;
  verdict: Record<string, 'true' | 'false' | 'blank'> | null;
  stakeLost: boolean;
}

export interface ClientTruthView {
  /** your own pinned fragments, rendered text included */
  board: PinnedFragment[];
  /** the partner's threads, text and question withheld (ruling 5) */
  partnerStubs: TruthStub[];
  shrine: ClientShrineView | null;
}

function shrineView(shrine: ShrineState): ClientShrineView {
  return {
    stakeRelicId: shrine.stakeRelicId,
    sheet: { ...shrine.sheet },
    struck: structuredClone(shrine.struck),
    confirmed: { ...shrine.confirmed },
    verdict: shrine.verdict ? { ...shrine.verdict } : null,
    stakeLost: shrine.stakeLost,
  };
}

export function clientTruthView(truth: TruthState, viewer: PlayerId): ClientTruthView {
  const partner = otherPlayer(viewer);
  return {
    board: truth.boards[viewer].map((p) => ({ ...p })),
    partnerStubs: truth.boards[partner].map((p) => ({ eventId: p.eventId, act: p.act })),
    shrine: truth.shrine ? shrineView(truth.shrine) : null,
  };
}
