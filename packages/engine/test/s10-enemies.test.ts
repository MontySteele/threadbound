// S10a combat breadth — mechanics tests for the new co-op hooks. Each test
// does state surgery to stand the target enemy up (same pattern as
// combat.test.ts's elite-retarget test) and drives real resolutions.

import { describe, expect, it } from 'vitest';
import { GameState, PlayerId } from '../src/types';
import { initialState, reduce } from '../src/reducer';
import { computeLinksFired, computePlannedDamage } from '../src/combat';
import { ENEMIES } from '../src/content/registry';
import { ENCOUNTERS, ENCOUNTER_POOLS } from '../src/content/encounters';
import { pickableNodes } from '../src/map';

function combatState(seed = 42): GameState {
  const s0 = initialState(seed, { p1: 'vess', p2: 'bram' });
  let s = reduce(s0, { type: 'START_RUN', seed });
  const node = pickableNodes(s.map)[0];
  s = reduce(s, { type: 'NODE_PICK', player: 'p1', nodeId: node });
  s = reduce(s, { type: 'NODE_PICK', player: 'p2', nodeId: node });
  expect(s.phase).toBe('combat');
  return s;
}

function forceHand(state: GameState, pid: PlayerId, defIds: string[]): string[] {
  const p = state.players[pid];
  const ids: string[] = [];
  defIds.forEach((defId, i) => {
    const instanceId = `test_${pid}_${defId}_${i}`;
    p.deck.push({ instanceId, defId });
    ids.push(instanceId);
  });
  p.draw = [...p.hand, ...p.draw, ...p.discard].filter(Boolean);
  p.discard = [];
  p.hand = [...ids];
  return ids;
}

function ready(state: GameState): GameState {
  let s = reduce(state, { type: 'SET_READY', player: 'p1', ready: true });
  s = reduce(s, { type: 'SET_READY', player: 'p2', ready: true });
  return s;
}

/** Replace the rolled encounter with a single enemy of `defId` (surgery). */
function becomeEnemy(state: GameState, defId: string, hp = 500): void {
  const def = ENEMIES[defId];
  expect(def, `unknown enemy ${defId}`).toBeTruthy();
  state.combat!.enemies = [{
    id: `e0_${defId}`, defId,
    hp, maxHp: hp,
    block: 0, hex: 0, weak: 0, vulnerable: 0, stun: 0, strength: 0,
    boundTo: 'p1', untargetable: false,
    scriptIndex: 0, intent: def.script[0],
  }];
  state.players.p1.hp = 999; state.players.p1.maxHp = 999;
  state.players.p2.hp = 999; state.players.p2.maxHp = 999;
}

describe('S10a content registration', () => {
  it('all nine enemies + the Mislaid spawn exist, with mechanic lines', () => {
    for (const id of ['tithe_taker', 'twice_carried', 'mislaid', 'votive_snuffer', 'pall_warden',
      'mislaid_sexton', 'bell_wretch_cracked', 'descant_mote', 'choir_silence', 'the_unstrung']) {
      expect(ENEMIES[id], id).toBeTruthy();
      if (id !== 'mislaid') expect(ENEMIES[id].mechanicLine, `${id} mechanicLine`).toBeTruthy();
    }
  });

  it('pool growth: a2 easy 2→4, both normals +2, +1 elite per act; every entry resolves', () => {
    expect(ENCOUNTER_POOLS[1].easy.length).toBe(4);
    expect(ENCOUNTER_POOLS[1].normal.length).toBe(6);
    expect(ENCOUNTER_POOLS[1].elite.length).toBe(3);
    expect(ENCOUNTER_POOLS[2].easy.length).toBe(4);
    expect(ENCOUNTER_POOLS[2].normal.length).toBe(5);
    expect(ENCOUNTER_POOLS[2].elite.length).toBe(3);
    for (const act of [1, 2] as const) {
      for (const pool of [...ENCOUNTER_POOLS[act].easy, ...ENCOUNTER_POOLS[act].normal, ...ENCOUNTER_POOLS[act].elite]) {
        expect(ENCOUNTERS[pool], pool).toBeTruthy();
        for (const eid of ENCOUNTERS[pool].enemies) expect(ENEMIES[eid], `${pool}:${eid}`).toBeTruthy();
      }
    }
    // the Mislaid is spawn-only: never in a pool entry
    for (const enc of Object.values(ENCOUNTERS)) expect(enc.enemies).not.toContain('mislaid');
  });
});

describe('Tithe-Taker: Thread refund on death', () => {
  it('killing it refunds Thread to the pool', () => {
    let s = combatState();
    becomeEnemy(s, 'tithe_taker', 3);
    s.thread = 4;
    const [pin] = forceHand(s, 'p1', ['hatpin']);
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: pin, slot: 0, targetId: 'e0_tithe_taker' });
    s = ready(s);
    expect(s.log.some((e) => e.e === 'enemy_dead')).toBe(true);
    // 4 + 2 refund (victory ends the combat before any regen)
    expect(s.thread).toBe(6);
  });
});

describe('Twice-Carried: splits into two Mislaid', () => {
  it('death mid-chain spawns two live Mislaid bound like the parent; combat continues', () => {
    let s = combatState();
    becomeEnemy(s, 'twice_carried', 3);
    const [pin] = forceHand(s, 'p1', ['hatpin']);
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: pin, slot: 0, targetId: 'e0_twice_carried' });
    s = ready(s);
    expect(s.phase).toBe('combat'); // the Mislaid keep the fight alive
    const mislaid = s.combat!.enemies.filter((e) => e.defId === 'mislaid');
    expect(mislaid.length).toBe(2);
    for (const m of mislaid) {
      expect(m.hp).toBeGreaterThan(0);
      expect(m.boundTo).toBe('p1'); // inherits the parent's binding
    }
  });
});

describe('Votive Snuffer: +2 Block per fired link', () => {
  it('gains Block when a link fires, and the forecast mirrors it', () => {
    let s = combatState();
    becomeEnemy(s, 'votive_snuffer');
    // needlework (Hex) → rendcall Link (Hex) fires
    const [needle] = forceHand(s, 'p1', ['needlework']);
    const [rend] = forceHand(s, 'p2', ['rendcall']);
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: needle, slot: 0, targetId: 'e0_votive_snuffer' });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 1, targetId: 'e0_votive_snuffer' });
    const forecast = computePlannedDamage(s);
    const before = s.combat!.enemies[0].hp;
    const done = ready(s);
    expect(done.log.some((e) => e.e === 'enemy_action' && /snuffs/.test((e as { detail?: string }).detail ?? ''))).toBe(true);
    // preview == reality even with the mid-chain Block gain
    expect(before - done.combat!.enemies[0].hp).toBe(forecast['e0_votive_snuffer']);
  });
});

describe('Pall Warden: rebinds to the last hand in the Chain', () => {
  it('follows whoever played the LAST card', () => {
    let s = combatState();
    becomeEnemy(s, 'pall_warden');
    expect(s.combat!.enemies[0].boundTo).toBe('p1');
    const [pin] = forceHand(s, 'p2', ['second_wind']); // p2 plays last (and only)
    forceHand(s, 'p1', ['wardknot']);
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: pin, slot: 0 });
    s = ready(s);
    expect(s.combat!.enemies[0].boundTo).toBe('p2');
  });
});

describe('The Mislaid Sexton: exhausts the bound discard every 3rd turn', () => {
  it('moves the top of the bound player’s discard to exhaust on turn 3', () => {
    let s = combatState();
    becomeEnemy(s, 'mislaid_sexton');
    // seed p1's discard so there is something to feed on
    const c = s.players.p1.draw.pop()!;
    s.players.p1.discard.push(c);
    // NOTE: the elite §14.8 self-retether also fires on turn 3, so the feed
    // lands on whoever holds the tether THEN — assert across both seats
    const total = (st: GameState) => st.players.p1.exhaust.length + st.players.p2.exhaust.length;
    const exhaustBefore = total(s);
    s = ready(s); // turn 1
    s = ready(s); // turn 2
    expect(total(s)).toBe(exhaustBefore);
    s = ready(s); // turn 3 — it feeds
    expect(total(s)).toBeGreaterThan(exhaustBefore);
    expect(s.log.some((e) => e.e === 'enemy_action' && /unburied/.test((e as { detail?: string }).detail ?? ''))).toBe(true);
  });
});

describe('Bell Wretch, Cracked: +2 from hits the turn after a Resonance', () => {
  it('applies the bonus exactly when resonatedLastTurn is set', () => {
    let s = combatState();
    becomeEnemy(s, 'bell_wretch_cracked');
    s.combat!.resonatedLastTurn = true;
    const [pin] = forceHand(s, 'p1', ['hatpin']); // plain Deal 4
    forceHand(s, 'p2', ['wardknot']);
    const forecast = computePlannedDamage(
      reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: pin, slot: 0, targetId: 'e0_bell_wretch_cracked' }),
    );
    expect(forecast['e0_bell_wretch_cracked']).toBe(4 + 2);
    const before = s.combat!.enemies[0].hp;
    let s2 = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: pin, slot: 0, targetId: 'e0_bell_wretch_cracked' });
    s2 = ready(s2);
    expect(before - s2.combat!.enemies[0].hp).toBe(6);
    // and without the flag, the plain 4
    let s3 = combatState();
    becomeEnemy(s3, 'bell_wretch_cracked');
    const [pin3] = forceHand(s3, 'p1', ['hatpin']);
    forceHand(s3, 'p2', ['wardknot']);
    const b3 = s3.combat!.enemies[0].hp;
    s3 = reduce(s3, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: pin3, slot: 0, targetId: 'e0_bell_wretch_cracked' });
    s3 = ready(s3);
    expect(b3 - s3.combat!.enemies[0].hp).toBe(4);
  });
});

describe('Descant Mote: echoes Weak/Vulnerable laid on others', () => {
  it('copies a single-target Vulnerable onto itself (and not back again)', () => {
    let s = combatState();
    becomeEnemy(s, 'cinder_husk');
    const def = ENEMIES['descant_mote'];
    s.combat!.enemies.push({
      id: 'e1_descant_mote', defId: 'descant_mote',
      hp: 40, maxHp: 40, block: 0, hex: 0, weak: 0, vulnerable: 0, stun: 0, strength: 0,
      boundTo: 'p2', untargetable: false, scriptIndex: 0, intent: def.script[0],
    });
    const [with_] = forceHand(s, 'p1', ['carrion_lace']); // single-target Vulnerable 1
    forceHand(s, 'p2', ['wardknot']);
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: with_, slot: 0, targetId: 'e0_cinder_husk' });
    s = ready(s);
    const husk = s.combat!.enemies.find((e) => e.id === 'e0_cinder_husk')!;
    const mote = s.combat!.enemies.find((e) => e.id === 'e1_descant_mote')!;
    // both decremented once in the same enemy phase — equal stacks prove the echo
    expect(mote.vulnerable).toBe(husk.vulnerable);
    expect(s.log.some((e) => e.e === 'enemy_action' && /echoes/.test((e as { detail?: string }).detail ?? ''))).toBe(true);
  });
});

describe('Choir Silence: the first link each turn does not fire', () => {
  it('suppresses the first would-be link in computeLinksFired while it lives', () => {
    let s = combatState();
    becomeEnemy(s, 'choir_silence');
    const [needle] = forceHand(s, 'p1', ['needlework']);
    const [rend] = forceHand(s, 'p2', ['rendcall']);
    s = reduce(s, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: needle, slot: 0, targetId: 'e0_choir_silence' });
    s = reduce(s, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 1, targetId: 'e0_choir_silence' });
    // rendcall's Link (Hex) would fire — the Silence holds it
    expect(computeLinksFired(s, s.combat!.chain)).toEqual([false, false]);
    // dead Silence releases the pause
    s.combat!.enemies[0].hp = 0;
    expect(computeLinksFired(s, s.combat!.chain)).toEqual([false, true]);
  });
});

describe('The Unstrung: reads the Chain', () => {
  it('attacks twice when the pair did not resonate, frays (pending) when they did', () => {
    let s = combatState();
    becomeEnemy(s, 'the_unstrung');
    s.combat!.enemies[0].intent = { kind: 'read_chain', amount: 10, fray: 1 };
    s.combat!.enemies[0].scriptIndex = ENEMIES['the_unstrung'].script.findIndex((x) => x.kind === 'read_chain');
    forceHand(s, 'p1', ['wardknot']);
    forceHand(s, 'p2', ['wardknot']);
    const hpBefore = s.players.p1.hp;
    const done = ready(s); // no resonance staged — the double attack lands
    const hits = done.log.filter((e) => e.e === 'player_hit');
    expect(hits.length).toBe(2);
    expect(done.players.p1.hp).toBeLessThan(hpBefore);

    // resonated branch: force the flag the enemy phase reads
    let s2 = combatState();
    becomeEnemy(s2, 'the_unstrung');
    s2.combat!.enemies[0].intent = { kind: 'read_chain', amount: 10, fray: 1 };
    const [needle2, stitch] = forceHand(s2, 'p1', ['needlework', 'loose_stitch']);
    const [rend, opener] = forceHand(s2, 'p2', ['rendcall', 'opener']);
    s2 = reduce(s2, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: needle2, slot: 0, targetId: 'e0_the_unstrung' });
    s2 = reduce(s2, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: rend, slot: 1, targetId: 'e0_the_unstrung' });
    s2 = reduce(s2, { type: 'STAGE_CARD', player: 'p1', cardInstanceId: stitch, slot: 2 });
    s2 = reduce(s2, { type: 'STAGE_CARD', player: 'p2', cardInstanceId: opener, slot: 3, targetId: 'e0_the_unstrung' });
    const done2 = ready(s2);
    expect(done2.log.some((e) => e.e === 'resonance_ignite')).toBe(true);
    expect(done2.log.some((e) => e.e === 'enemy_action' && /heard the harmony/.test((e as { detail?: string }).detail ?? ''))).toBe(true);
    // pending Fray activates at next turn start (OQ#46)
    expect(done2.players.p1.statuses.frayed).toBeGreaterThan(0);
  });
});
