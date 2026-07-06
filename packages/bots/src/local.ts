// S16.0a — the socket-free sim path (the OQ#56 rider's instrument). One run,
// entirely in-process: engine state → per-seat BotView through the SAME pure
// redaction the server sends over the wire (engine redactFor — same code
// path, no wire), lockstep policy calls, reduce() applied directly. No
// server import, no socket, no timers, no sleeps. Deterministic per seed by
// construction: the engine is a pure reducer, the policy is state-pure and
// seeded, and the seat iteration order below is fixed — so the same seed
// yields byte-identical telemetry every invocation (the S13.6 jitter class
// dies here, for sims).
//
// Fidelity notes vs the WS transport, on record:
//   - Transient IllegalActions are part of the live protocol (a bot ADVANCEs
//     before its partner picked; the server rejects; the watchdog retries).
//     Here a rejected intent is simply skipped for that round — the partner
//     acts, state moves, the retry happens naturally on the next round.
//   - The WS path remains the protocol/covenant instrument (wire-capture and
//     the §11 assertions still cross a real socket); TB_SIM_SOCKET=1 in
//     sim.ts restores it for any row.

import {
  Action, BotPolicy, BotPolicyOptions, BotView, CharacterId, IllegalAction,
  PlayerId, initialState, reduce, redactFor,
} from '@threadbound/engine';
import { RunResult } from './bot';

export interface LocalRunFlags {
  tracks: boolean;
  rites: boolean;
  knotwork: boolean;
}

export interface LocalRunOptions {
  /** the run seed — the value the WS path sends as `start.seed` */
  seed: number;
  characters: Record<PlayerId, CharacterId>;
  ascension: number;
  flags: LocalRunFlags;
  /** per-seat policy knobs (seed is derived per seat, S3-compatible:
   *  p1 = seed*3+1, p2 = seed*3+2 — the WS harness's assignment) */
  policy: Omit<BotPolicyOptions, 'seed'>;
  /** action budget before declaring a stall (default 100k — a full run
   *  observes ~500–700 applied actions; 100k means something is wedged) */
  maxActions?: number;
}

/** Play one full run in-process. Throws on stall (loudly — a deterministic
 *  instrument must never hang silently the way a socket run could). */
export function playRunLocal(opts: LocalRunOptions): RunResult {
  const { seed } = opts;
  let state = initialState(seed, opts.characters);
  // lobby flow, engine-true: the ascension vote must agree before START_RUN
  // (S16-D6 makes the rung host-set + mirrored on the wire; the engine's
  // vote-agreement machinery is what both transports drive)
  if (opts.ascension > 0) {
    state = reduce(state, { type: 'SET_ASCENSION', player: 'p1', level: opts.ascension } as Action);
    if (state.ascensionVotes.p2 !== opts.ascension) {
      state = reduce(state, { type: 'SET_ASCENSION', player: 'p2', level: opts.ascension } as Action);
    }
  }
  // START_RUN exactly as the server constructs it for bot seats: bots claim
  // no profile, so the unlock union is empty and codex/rite claims are absent
  state = reduce(state, {
    type: 'START_RUN', seed,
    unlockedCards: [],
    tracks: opts.flags.tracks,
    rites: opts.flags.rites,
    knotwork: opts.flags.knotwork,
  } as Action);

  const policies: Record<PlayerId, BotPolicy> = {
    p1: new BotPolicy({ ...opts.policy, seed: seed * 3 + 1 }),
    p2: new BotPolicy({ ...opts.policy, seed: seed * 3 + 2 }),
  };

  const budget = opts.maxActions ?? 100_000;
  let applied = 0;
  while (state.phase !== 'victory' && state.phase !== 'game_over') {
    let progressed = false;
    // fixed seat order: determinism is the whole point. Lockstep parity
    // (BotPolicy) still owns the combat interleaving; this order only
    // breaks ties the wire used to break with arrival timing.
    for (const pid of ['p1', 'p2'] as PlayerId[]) {
      const view = redactFor(state, pid);
      const action = policies[pid].decide(view);
      if (!action) continue;
      (action as { player?: PlayerId }).player = pid;
      try {
        state = reduce(state, action);
      } catch (err) {
        if (err instanceof IllegalAction) continue; // partner not done yet — retry next round
        throw err;
      }
      progressed = true;
      break;
    }
    if (!progressed) {
      throw new Error(`socket-free run stalled: seed ${seed}, phase ${state.phase}, after ${applied} actions`);
    }
    if (++applied > budget) {
      throw new Error(`socket-free run exceeded action budget: seed ${seed}, phase ${state.phase}`);
    }
  }

  // settle p1's combats-won counter on the terminal view (the WS bot's decide
  // fires once on the victory/game_over broadcast; mirror that)
  policies.p1.decide(redactFor(state, 'p1'));

  return {
    outcome: state.phase as 'victory' | 'game_over',
    act: state.map.act,
    combatsWon: policies.p1.combatsWon,
    characters: { p1: state.players.p1.character, p2: state.players.p2.character },
    relicsEnd: state.players.p1.relics.length + state.players.p2.relics.length,
    deckEnd: state.players.p1.deck.length + state.players.p2.deck.length,
    telemetry: state.telemetry,
  };
}
