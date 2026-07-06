// S20.1 (ruled, designer 2026-07-06 — the tracks-on audit's stop-and-report):
// Pulse legality must read the GROWN def. Resolution fires grown links
// (grownDef, S9d) and the client offers them as Pulse targets, but the
// legality assert read the ungrown effectiveDef — so a mutated rite echo
// whose ONLY link is tier-granted (First-Drawn Descant at resonances ≥ 6)
// was a Pulse target everywhere except the reducer. The bot proposed it
// forever (fleet livelock, ~2–4% of rites-on runs); a human got a spurious
// "that card has no Link to force"; the solo driver went silent.

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { grownDef, effectiveDef } from '../src/combat';
import { pickableNodes } from '../src/map';

/** Start a RITES run (tallies exist) and walk both players onto the first
 *  combat node. */
function ritesCombatState(seed = 42): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  let s = reduce(s0, { type: 'START_RUN', seed, rites: true } as never);
  // the vestry pick is mandatory before the map (offer = 2 seeded of 4)
  for (const pid of ['p1', 'p2'] as const) {
    const offer = s.ritesState!.offer[pid]![0];
    s = reduce(s, { type: 'RITE_PICK', player: pid, riteId: offer } as never);
  }
  const node = pickableNodes(s.map)[0];
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node } as never);
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node } as never);
  expect(s.phase).toBe('combat');
  return s;
}

describe('S20.1 — Pulse legality on grown links', () => {
  it('accepts a Pulse on a mutated rite echo whose link exists only via growth', () => {
    const s0 = ritesCombatState();
    // the wedge shape: an echo of rite_descant arrives MUTATED (First-Drawn
    // Descant — "Draw 2.", no base link) and the pair has ignited 6
    // Resonances, so tier 1 grants "Link (Surge): both draw 1"
    s0.tallies!.resonances = 6;
    const inst = { instanceId: 'test_p1_descant_echo', defId: 'rite_descant', mutated: true, echo: true };
    s0.players.p1.deck.push(inst);
    s0.players.p1.hand.push(inst.instanceId);
    // sanity: the ungrown def has NO link; the grown def HAS one — this is
    // exactly the disagreement that wedged the fleet
    expect(effectiveDef(inst).link).toBeUndefined();
    expect(grownDef(s0, inst, 'p1')?.link?.condition).toBe('Surge');

    let s = reduce(s0, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: inst.instanceId, slot: 0 } as never);
    // pre-fix this threw IllegalAction: "that card has no Link to force"
    s = reduce(s, { type: 'DECLARE_THREAD', player: 'p2', kind: 'pulse', targetId: inst.instanceId } as never);
    expect(s.combat!.threadActions.some((t) => t.kind === 'pulse' && t.targetId === inst.instanceId)).toBe(true);

    // and the forced link RESOLVES with the grown effects (both seats draw)
    const drawBefore = { p1: s.players.p1.hand.length, p2: s.players.p2.hand.length };
    s = reduce(s, { type: 'SET_READY', player: 'p1', ready: true } as never);
    s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true } as never);
    const played = s.log.find((e) => e.e === 'card' && e.slot === 0);
    expect(played).toMatchObject({ linkFired: true });
    void drawBefore; // hand sizes churn with the refill — the log flag is the pin
  });

  it('still rejects a Pulse on a card with no link, grown or otherwise', () => {
    const s0 = ritesCombatState();
    const inst = { instanceId: 'test_p1_patchwork', defId: 'patchwork' };
    s0.players.p1.deck.push(inst);
    s0.players.p1.hand.push(inst.instanceId);
    const s = reduce(s0, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: inst.instanceId, slot: 0 } as never);
    expect(() =>
      reduce(s, { type: 'DECLARE_THREAD', player: 'p2', kind: 'pulse', targetId: inst.instanceId } as never),
    ).toThrow(/no Link to force/);
  });
});
