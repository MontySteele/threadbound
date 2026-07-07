// S21.1 (ruled, designer 2026-07-07 — the OQ#69 residual): natural link fire
// reads the GROWN def. The S20.1 ruling aligned Pulse legality and
// computeForcedLinks on grownDef but left computeLinksFired on the ungrown
// effectiveDef — so a mutated grower echo whose ONLY link is tier-granted
// (First-Drawn Descant past resonances ≥ 6) showed a live link in every
// preview yet fired only when Pulsed. This pins the alignment both
// directions: the tier-granted link fires NATURALLY on its condition once
// the tally reaches the tier, and does NOT exist below it.

import { describe, expect, it } from 'vitest';
import { GameState } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { computeLinksFired, effectiveDef, grownDef } from '../src/combat';
import { pickableNodes } from '../src/map';

/** Start a RITES run (tallies exist) and walk both players onto the first
 *  combat node — the s20-pulse-grown-link harness. */
function ritesCombatState(seed = 42): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  let s = reduce(s0, { type: 'START_RUN', seed, rites: true } as never);
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

/** Two mutated Descant echoes in p1's hand: slot 0 supplies the Surge tag,
 *  slot 1 is the card under test (its grown link reads Link (Surge)). */
function stageEchoPair(s0: GameState): GameState {
  for (const iid of ['test_p1_descant_a', 'test_p1_descant_b']) {
    const inst = { instanceId: iid, defId: 'rite_descant', mutated: true, echo: true };
    s0.players.p1.deck.push(inst);
    s0.players.p1.hand.push(inst.instanceId);
  }
  let s = reduce(s0, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: 'test_p1_descant_a', slot: 0 } as never);
  s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: 'test_p1_descant_b', slot: 1 } as never);
  return s;
}

describe('S21.1 — natural fire on a tier-granted echo link', () => {
  it('fires the grown link NATURALLY (no Pulse) once the tier is reached', () => {
    const s0 = ritesCombatState();
    s0.tallies!.resonances = 6; // First-Drawn Descant tier 1: Link (Surge)
    const probe = { instanceId: 'probe', defId: 'rite_descant', mutated: true, echo: true };
    // the disagreement under test: ungrown NO link, grown Link (Surge)
    expect(effectiveDef(probe).link).toBeUndefined();
    expect(grownDef(s0, probe, 'p1')?.link?.condition).toBe('Surge');

    let s = stageEchoPair(s0);
    // the static preview reads the grown link: slot 1 fires off slot 0's
    // Surge tag with no Thread action declared anywhere
    expect(computeLinksFired(s, s.combat!.chain)).toEqual([false, true]);

    // and resolution agrees (the log flag is the pin, S20 convention)
    s = reduce(s, { type: 'SET_READY', player: 'p1', ready: true } as never);
    s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true } as never);
    const played = s.log.filter((e) => e.e === 'card');
    expect(played.find((e) => (e as { slot?: number }).slot === 1)).toMatchObject({ linkFired: true });
    expect(s.telemetry.forcedLinkFires).toBe(0); // natural, not forced
  });

  it('grants no link below the tier — the fire is growth, not a freebie', () => {
    const s0 = ritesCombatState();
    s0.tallies!.resonances = 5; // one short of the tier
    let s = stageEchoPair(s0);
    expect(computeLinksFired(s, s.combat!.chain)).toEqual([false, false]);
    s = reduce(s, { type: 'SET_READY', player: 'p1', ready: true } as never);
    s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true } as never);
    const slot1 = s.log.find((e) => e.e === 'card' && (e as { slot?: number }).slot === 1);
    expect(slot1).toMatchObject({ linkFired: false });
  });
});
