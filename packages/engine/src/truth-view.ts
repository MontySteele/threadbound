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
  stakeRelicId: string | null;
  sheet: Record<string, string | null>;
  /** questionId → answerId → sources that struck it (pooled, both boards) */
  struck: Record<string, Record<string, StruckSource[]>>;
  confirmed: Record<PlayerId, boolean>;
  verdict: Record<string, 'true' | 'false' | 'blank'> | null;
  stakeLost: boolean;
}

export interface ClientTruthView {
  /** your own pinned fragments, rendered text included. In solo the Witness
   *  VOICES the partner channel (ruling 8): those pins appear here too,
   *  marked witness, and pin to the thread-gold column. */
  board: (PinnedFragment & { witness?: true })[];
  /** the partner's threads, text and question withheld (ruling 5).
   *  Always empty in solo — there is no second screen to protect. */
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

export function clientTruthView(truth: TruthState, viewer: PlayerId, botSeat?: PlayerId): ClientTruthView {
  const partner = otherPlayer(viewer);
  if (botSeat && viewer !== botSeat) {
    // solo (ruling 8): the bot's board is the Witness channel, spoken aloud
    return {
      board: [
        ...truth.boards[viewer].map((p) => ({ ...p })),
        ...truth.boards[partner].map((p) => ({ ...p, witness: true as const })),
      ],
      partnerStubs: [],
      shrine: truth.shrine ? shrineView(truth.shrine) : null,
    };
  }
  return {
    board: truth.boards[viewer].map((p) => ({ ...p })),
    partnerStubs: truth.boards[partner].map((p) => ({ eventId: p.eventId, act: p.act })),
    shrine: truth.shrine ? shrineView(truth.shrine) : null,
  };
}
