// Chain resolution (§2), Thread actions (§5), enemy phase (§6), M2 revisions
// (Kindled M2-A2, Fallen M2-A3, hand discard M2-A1, hooks M2-B2, Unraveled/
// Choristers M2-B3). The reducer deep-clones before calling in; mutation here
// is of the working copy only.

import { CARDS } from './content/cards';
import { ENEMIES } from './content/registry';
import { POWERS } from './content/powers';
import { RELICS_BY_ID } from './content/registry';
import {
  CardDef, CardInstance, ChainSlot, EffectOp, EnemyState, GameState, HookEvent, HookOp,
  PassiveId, PlayerId, PlayerState,
} from './types';
import { rngInt, rngShuffle } from './rng';
import { maybeSaySolo, sayWitness } from './witness-draw';

export function otherPlayer(p: PlayerId): PlayerId {
  return p === 'p1' ? 'p2' : 'p1';
}

export function findInstance(player: PlayerState, instanceId: string): CardInstance | undefined {
  return (
    player.deck.find((c) => c.instanceId === instanceId) ??
    player.combatCards.find((c) => c.instanceId === instanceId)
  );
}

/**
 * Effective rules for an instance. Upgrades overlay the base (M2-B6); mutated
 * Echoes use the mutation overlay of the BASE form (mutations are authored
 * against one shape — see OPEN-QUESTIONS).
 */
export function effectiveDef(inst: CardInstance): CardDef {
  const def = CARDS[inst.defId];
  if (inst.mutated && def.mutation) {
    return { ...def, name: def.mutation.name, text: def.mutation.text, base: def.mutation.base, link: def.mutation.link };
  }
  if (inst.upgraded && def.upgrade) {
    return {
      ...def,
      name: `${def.name}+`,
      text: def.upgrade.text ?? def.text,
      cost: def.upgrade.cost ?? def.cost,
      base: def.upgrade.base ?? def.base,
      link: def.upgrade.link !== undefined ? def.upgrade.link : def.link,
      keep: def.upgrade.keep ?? def.keep,
    };
  }
  return def;
}

export function hasPassive(player: PlayerState, passive: PassiveId): boolean {
  if (player.relics.some((r) => RELICS_BY_ID[r]?.passives?.includes(passive))) return true;
  if (player.fallen) return false; // powers go dormant while Fallen (M2-A3)
  return player.powers.some((p) => POWERS[p]?.passives?.includes(passive));
}

// ---------------------------------------------------------------------------
// Hooks (M2-B2): powers + relics share one event system.
// ---------------------------------------------------------------------------

export function runHooks(state: GameState, holder: PlayerId, event: HookEvent): void {
  const p = state.players[holder];
  const sources: Array<{ name: string; hooks?: { on: HookEvent; effects: HookOp[] }[] }> = [
    ...p.relics.map((r) => RELICS_BY_ID[r]).filter(Boolean),
    ...(p.fallen ? [] : p.powers.map((pw) => POWERS[pw]).filter(Boolean)),
  ];
  for (const src of sources) {
    for (const hook of src.hooks ?? []) {
      if (hook.on !== event) continue;
      for (const eff of hook.effects) applyHookOp(state, p, eff);
    }
  }
}

export function applyHookOp(state: GameState, p: PlayerState, eff: HookOp): void {
  const partner = state.players[otherPlayer(p.id)];
  switch (eff.op) {
    case 'block': p.block += eff.amount; break;
    case 'partnerBlock': partner.block += eff.amount; break;
    case 'thread': gainThread(state, eff.amount); break;
    case 'kindled': p.kindled += eff.amount; break;
    case 'draw': drawCards(state, p, eff.amount); break;
    case 'momentum': p.momentum += eff.amount; break;
    case 'heal': p.hp = Math.min(p.maxHp, p.hp + eff.amount); break;
    case 'partnerHeal': partner.hp = Math.min(partner.maxHp, partner.hp + eff.amount); break;
    case 'hexAll':
      for (const e of livingEnemies(state)) e.hex += eff.amount;
      break;
    case 'damageAll':
      for (const e of livingEnemies(state)) applyEnemyHpLoss(state, e, eff.amount, 'relic');
      break;
  }
}

// ---------------------------------------------------------------------------
// Static link / Resonance computation (§2.3)
// ---------------------------------------------------------------------------

export function computeLinksFired(state: GameState, chain: ChainSlot[]): boolean[] {
  const severed = (state.combat?.severedTurns ?? 0) > 0; // Unraveled (§6)
  return chain.map((slot, i) => {
    if (i === 0) return false;
    const def = effectiveDef(mustFind(state, slot));
    if (!def.link) return false;
    const prev = chain[i - 1];
    // a severed Thread carries no links between the two of you (§6)
    if (severed && prev.owner !== slot.owner) return false;
    if (def.link.condition === 'partner') return prev.owner !== slot.owner;
    if (def.link.condition === 'any') return true;
    const prevDef = effectiveDef(mustFind(state, prev));
    return prevDef.tag === def.link.condition;
  });
}

export function computeResonanceSlots(chain: ChainSlot[], fired: boolean[]): Set<number> {
  const out = new Set<number>();
  let i = 0;
  while (i < chain.length) {
    if (!fired[i]) { i++; continue; }
    let j = i;
    while (j + 1 < chain.length && fired[j + 1]) j++;
    const runLen = j - i + 1;
    if (runLen >= 3) {
      const owners = new Set<PlayerId>();
      for (let k = i - 1; k <= j; k++) owners.add(chain[k].owner);
      if (owners.size === 2) out.add(j); // solo streaks never ignite (§2.3)
    }
    i = j + 1;
  }
  return out;
}

/** Static planning preview (§11-sanctioned, like computeLinksFired): the
 *  Block each player would gain from the chain as currently staged —
 *  base + fired-link effects, with Pulse landing and Resonance scaling
 *  mirrored from resolution. An ESTIMATE: hooks (relics/powers) excluded. */
export function computePlannedBlock(state: GameState): Record<PlayerId, number> {
  const out: Record<PlayerId, number> = { p1: 0, p2: 0 };
  const combat = state.combat;
  if (!combat) return out;
  const chain = combat.chain;
  const fired = computeLinksFired(state, chain);
  const resonance = computeResonanceSlots(chain, fired);
  const pulse: Record<PlayerId, number> = {
    p1: state.players.p1.pulseBonus,
    p2: state.players.p2.pulseBonus,
  };
  for (const ta of combat.threadActions) {
    if (ta.kind !== 'pulse') continue;
    const recipient = otherPlayer(ta.player);
    pulse[recipient] += hasPassive(state.players[ta.player], 'pulsePlusOne') ? 4 : 3;
  }
  const pulseSpent: Record<PlayerId, boolean> = { p1: false, p2: false };
  for (let i = 0; i < chain.length; i++) {
    const slot = chain[i];
    const def = effectiveDef(mustFind(state, slot));
    const effects: EffectOp[] =
      fired[i] && def.link
        ? def.link.replace ? def.link.effects : [...def.base, ...def.link.effects]
        : def.base;
    const hasPrimary = effects.some((e) => 'primary' in e && (e as { primary?: boolean }).primary);
    const myPulse = hasPrimary && !pulseSpent[slot.owner] ? pulse[slot.owner] : 0;
    if (hasPrimary && !pulseSpent[slot.owner]) pulseSpent[slot.owner] = true;
    for (const eff of effects) {
      if (eff.op === 'block') {
        let v = eff.amount;
        if (eff.primary) {
          v += myPulse;
          if (resonance.has(i)) v = Math.ceil(v * 1.5);
        }
        out[slot.owner] += v;
      } else if (eff.op === 'partnerBlock') {
        out[otherPlayer(slot.owner)] += eff.amount;
      }
    }
  }
  return out;
}

export function longestSoloRun(chain: ChainSlot[]): number {
  let best = 0;
  let cur = 0;
  let owner: PlayerId | null = null;
  for (const slot of chain) {
    cur = slot.owner === owner ? cur + 1 : 1;
    owner = slot.owner;
    best = Math.max(best, cur);
  }
  return best;
}

function mustFind(state: GameState, slot: ChainSlot): CardInstance {
  const inst = findInstance(state.players[slot.owner], slot.cardInstanceId);
  if (!inst) throw new Error(`missing instance ${slot.cardInstanceId}`);
  return inst;
}

// ---------------------------------------------------------------------------
// Enemy HP / chorus pools / damage plumbing
// ---------------------------------------------------------------------------

function livingEnemies(state: GameState): EnemyState[] {
  return state.combat!.enemies.filter((e) => e.hp > 0);
}

export function targetableEnemies(state: GameState): EnemyState[] {
  return livingEnemies(state).filter((e) => !e.untargetable);
}

function retarget(state: GameState, targetId: string | undefined): EnemyState | undefined {
  const living = targetableEnemies(state);
  return living.find((e) => e.id === targetId) ?? living[0];
}

/** Choristers (§6): members share one HP pool — HP loss syncs the group. */
function applyEnemyHpLoss(state: GameState, enemy: EnemyState, hpLoss: number, _why: string): void {
  enemy.hp = Math.max(0, enemy.hp - hpLoss);
  if (ENEMIES[enemy.defId]?.chorus) {
    for (const other of state.combat!.enemies) {
      if (other.id !== enemy.id && ENEMIES[other.defId]?.chorus) other.hp = enemy.hp;
    }
  }
  if (enemy.hp <= 0) state.log.push({ e: 'enemy_dead', enemy: enemy.id });
}

/** Player-sourced hit. Returns total damage dealt (for telemetry). */
function hitEnemy(state: GameState, attacker: PlayerState, enemy: EnemyState, raw: number): number {
  let amt = raw;
  if (attacker.statuses.weak > 0) amt = Math.floor(amt * 0.75);
  if (enemy.vulnerable > 0) amt = Math.floor(amt * 1.5);
  if (amt < 0) amt = 0;
  const blocked = Math.min(enemy.block, amt);
  enemy.block -= blocked;
  const hpLoss = Math.min(enemy.hp, amt - blocked);
  applyEnemyHpLoss(state, enemy, hpLoss, 'attack');
  // M2-D2: the log must not lie — post-block HP loss + blocked, separately
  state.log.push({ e: 'damage', target: enemy.id, hpLoss, blocked });
  return amt;
}

/** Detonation (§4): 3 damage per stack, ignores Block (OQ#5 confirmed). */
function detonate(state: GameState, enemy: EnemyState, maxStacks?: number, by?: PlayerId): number {
  const stacks = Math.min(enemy.hex, maxStacks ?? enemy.hex);
  if (stacks <= 0) return 0;
  enemy.hex -= stacks;
  const dmg = stacks * DETONATION_DAMAGE;
  applyEnemyHpLoss(state, enemy, dmg, 'detonate');
  state.telemetry.damageByTag.Hex = (state.telemetry.damageByTag.Hex ?? 0) + dmg;
  state.telemetry.detonatedStacks += stacks;
  if (by) state.telemetry.damageByPlayer[by] += dmg;
  turnDamage += dmg;
  state.log.push({ e: 'detonate', target: enemy.id, stacks, damage: dmg });
  runHooks(state, 'p1', 'detonate');
  runHooks(state, 'p2', 'detonate');
  return stacks;
}

/** M2-B1 Hex rebalance lever 2: raised 3 → 4 after sim baselining (Part C). */
export const DETONATION_DAMAGE = 4;

function gainThread(state: GameState, amount: number): void {
  state.thread = Math.min(state.threadMax, state.thread + amount);
}

export function spendThread(state: GameState, cost: number): void {
  state.thread -= cost;
  if (state.thread < 0) {
    state.thread = 0;
    if (state.combat && state.combat.steadyShield > 0) {
      state.combat.steadyShield--;
      state.log.push({ e: 'info', detail: 'Steady absorbed the Fray.' });
    } else {
      state.players.p1.statuses.frayed++;
      state.players.p2.statuses.frayed++;
      state.log.push({ e: 'fray' });
      sayWitness(state, 'fray');
      runHooks(state, 'p1', 'fray');
      runHooks(state, 'p2', 'fray');
    }
  }
}

function drawCards(state: GameState, player: PlayerState, n: number): void {
  if (player.fallen) return;
  for (let i = 0; i < n; i++) {
    if (player.hand.length >= 10) return;
    if (player.draw.length === 0) {
      if (player.discard.length === 0) return;
      const r = rngShuffle(state.rng, player.discard);
      state.rng = r.state;
      player.draw = r.value;
      player.discard = [];
    }
    player.hand.push(player.draw.shift()!);
  }
}

// ---------------------------------------------------------------------------
// Effect interpreter
// ---------------------------------------------------------------------------

interface CardContext {
  owner: PlayerState;
  partner: PlayerState;
  slotIndex: number;
  targetId?: string;
  def: CardDef;
  fired: boolean[];
  resonance: boolean;
  pulse: number;
  detonatedStacks: number;
  momentumSpent: boolean;
  keepMomentum: boolean;
  momentumPerHit: boolean;
}

function scale(ctx: CardContext, amount: number, primary: boolean | undefined): number {
  if (!primary) return amount;
  let v = amount + ctx.pulse;
  if (ctx.resonance) v = Math.ceil(v * 1.5);
  return v;
}

function dmgTelemetry(state: GameState, tag: string, dealt: number, player?: PlayerId): void {
  state.telemetry.damageByTag[tag] = (state.telemetry.damageByTag[tag] ?? 0) + dealt;
  if (player) state.telemetry.damageByPlayer[player] += dealt;
  turnDamage += dealt;
}

/** accumulator for the biggest-single-turn stat; reset/flushed by resolveTurn */
let turnDamage = 0;

function applyMomentum(ctx: CardContext, amt: number, hitIndex: number): number {
  const { owner, def } = ctx;
  if (def.tag !== 'Strike' || owner.momentum <= 0) return amt;
  if (ctx.momentumPerHit) {
    ctx.momentumSpent = true;
    return amt + owner.momentum; // M2-A4 rare design space
  }
  if (hitIndex === 0 && !ctx.momentumSpent) {
    ctx.momentumSpent = true;
    return amt + owner.momentum; // OQ#3: once, on the first hit
  }
  return amt;
}

function applyEffect(state: GameState, ctx: CardContext, eff: EffectOp): void {
  const { owner, partner } = ctx;
  const tag = ctx.def.tag;
  switch (eff.op) {
    case 'damage': {
      const first = retarget(state, ctx.targetId);
      if (!first) return;
      const times = eff.times ?? 1;
      for (let t = 0; t < times; t++) {
        const target = retarget(state, first.id);
        if (!target) return;
        const amt = applyMomentum(ctx, scale(ctx, eff.amount, eff.primary), t);
        dmgTelemetry(state, tag, hitEnemy(state, owner, target, amt), owner.id);
      }
      break;
    }
    case 'damageAll': {
      let used = false;
      for (const enemy of livingEnemies(state)) {
        if (enemy.untargetable) continue;
        let amt = scale(ctx, eff.amount, eff.primary);
        if (tag === 'Strike' && !ctx.momentumSpent && owner.momentum > 0) {
          amt += owner.momentum;
          used = true;
        }
        dmgTelemetry(state, tag, hitEnemy(state, owner, enemy, amt), owner.id);
      }
      if (used) ctx.momentumSpent = true;
      break;
    }
    case 'damagePerHex': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy) return;
      const amt = applyMomentum(ctx, scale(ctx, eff.base + eff.perHex * enemy.hex, eff.primary), 0);
      // M2-B1: hex-scaling damage gets its own attribution bucket
      dmgTelemetry(state, 'HexScaling', hitEnemy(state, owner, enemy, amt), owner.id);
      break;
    }
    case 'momentumStrikeBonus': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy) return;
      dmgTelemetry(state, tag, hitEnemy(state, owner, enemy, owner.momentum * eff.mult), owner.id);
      if (eff.keepMomentum) ctx.keepMomentum = true;
      ctx.momentumSpent = true;
      break;
    }
    case 'momentumPerHit':
      ctx.momentumPerHit = true; // ordered before the damage op by content convention
      break;
    case 'block': {
      const amt = scale(ctx, eff.amount, eff.primary);
      owner.block += amt;
      state.log.push({ e: 'block', target: owner.id, amount: amt }); // M2-D2: scaled value
      break;
    }
    case 'partnerBlock':
      partner.block += eff.amount;
      state.log.push({ e: 'block', target: partner.id, amount: eff.amount });
      break;
    case 'hex': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy) return;
      const amt = scale(ctx, eff.amount, eff.primary);
      enemy.hex += amt;
      state.log.push({ e: 'hex', target: enemy.id, amount: amt });
      break;
    }
    case 'hexAll':
      for (const enemy of livingEnemies(state)) {
        const amt = scale(ctx, eff.amount, eff.primary);
        enemy.hex += amt;
        state.log.push({ e: 'hex', target: enemy.id, amount: amt });
      }
      break;
    case 'hexPerLinkFired': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy) return;
      let count = 0;
      for (let i = 0; i < ctx.slotIndex; i++) if (ctx.fired[i]) count++;
      enemy.hex += count * eff.per;
      break;
    }
    case 'doubleHex': {
      const enemy = retarget(state, ctx.targetId);
      if (enemy) enemy.hex *= 2;
      break;
    }
    case 'detonate': {
      const enemy = retarget(state, ctx.targetId);
      if (enemy) ctx.detonatedStacks += detonate(state, enemy, eff.max, ctx.owner.id);
      break;
    }
    case 'detonateAllEnemies':
      for (const enemy of livingEnemies(state)) ctx.detonatedStacks += detonate(state, enemy, undefined, ctx.owner.id);
      break;
    case 'damagePerDetonated': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy || ctx.detonatedStacks <= 0) return;
      dmgTelemetry(state, tag, hitEnemy(state, owner, enemy, ctx.detonatedStacks * eff.per), owner.id);
      break;
    }
    case 'weak': {
      const enemy = retarget(state, ctx.targetId);
      if (enemy) enemy.weak += eff.amount;
      break;
    }
    case 'weakAll':
      for (const enemy of livingEnemies(state)) enemy.weak += eff.amount;
      break;
    case 'vulnerable': {
      const enemy = retarget(state, ctx.targetId);
      if (enemy) enemy.vulnerable += eff.amount;
      break;
    }
    case 'stun': {
      const enemy = retarget(state, ctx.targetId);
      if (enemy) enemy.stun += eff.amount;
      break;
    }
    case 'taunt': {
      // §6 taunt-style Guard: pull the target's binding onto this card's owner
      const enemy = retarget(state, ctx.targetId);
      if (enemy && enemy.boundTo !== null) enemy.boundTo = owner.id;
      break;
    }
    case 'momentum':
      owner.momentum += scale(ctx, eff.amount, eff.primary);
      break;
    case 'draw':
      drawCards(state, owner, eff.amount);
      break;
    case 'partnerDraw':
      drawCards(state, partner, eff.amount);
      break;
    case 'kindled':
      owner.kindled += eff.amount; // M2-A2: energy next turn
      break;
    case 'partnerKindled':
      partner.kindled += eff.amount;
      break;
    case 'thread':
      gainThread(state, eff.amount);
      break;
    case 'heal':
      owner.hp = Math.min(owner.maxHp, owner.hp + scale(ctx, eff.amount, eff.primary));
      break;
    case 'partnerHeal':
      partner.hp = Math.min(partner.maxHp, partner.hp + eff.amount);
      break;
    case 'power':
      if (!owner.powers.includes(eff.power)) owner.powers.push(eff.power);
      break;
  }
}

// ---------------------------------------------------------------------------
// Turn resolution
// ---------------------------------------------------------------------------

export function resolveTurn(state: GameState): void {
  const combat = state.combat!;
  state.log = [];
  const act = state.map.act;
  turnDamage = 0;

  // M2-A1: snapshot hands at commit; survivors discard at end of resolution
  combat.handSnapshot = { p1: [...state.players.p1.hand], p2: [...state.players.p2.hand] };

  // 1. Thread actions in declaration order (§5) — none exist while severed/Fallen
  // (blocked at declaration; the list is already empty in those states).
  for (const ta of combat.threadActions) {
    const actor = state.players[ta.player];
    const partner = state.players[otherPlayer(ta.player)];
    switch (ta.kind) {
      case 'pulse':
        spendThread(state, 2);
        partner.pulseBonus += hasPassive(actor, 'pulsePlusOne') ? 4 : 3;
        break;
      case 'reclaim': {
        spendThread(state, 2);
        const src = findInstance(partner, ta.targetId!);
        if (!src || !partner.discard.includes(ta.targetId!)) break;
        const def = CARDS[src.defId];
        const echo: CardInstance = {
          instanceId: `echo_${src.instanceId}_t${combat.turn}_${actor.combatCards.length}`,
          defId: src.defId,
          echo: true,
          mutated: !!def.mutation,
        };
        actor.combatCards.push(echo);
        if (actor.hand.length < 10) actor.hand.push(echo.instanceId);
        break;
      }
      case 'sever': {
        spendThread(state, 3);
        const enemy = combat.enemies.find((e) => e.id === ta.targetId && e.hp > 0);
        if (!enemy) break;
        if (ENEMIES[enemy.defId]?.chorus) {
          severChorus(state, enemy);
        } else if (enemy.boundTo !== null) {
          enemy.boundTo = otherPlayer(enemy.boundTo);
        }
        break;
      }
      case 'steady':
        spendThread(state, 1);
        if (state.players.p1.statuses.frayed > 0 || state.players.p2.statuses.frayed > 0) {
          state.players.p1.statuses.frayed = Math.max(0, state.players.p1.statuses.frayed - 1);
          state.players.p2.statuses.frayed = Math.max(0, state.players.p2.statuses.frayed - 1);
        } else {
          combat.steadyShield++;
        }
        break;
    }
    state.log.push({ e: 'thread_action', player: ta.player, kind: ta.kind });
  }

  // 2-3. Static link + Resonance computation (§2.3)
  const chain = combat.chain;
  const fired = computeLinksFired(state, chain);
  const resonanceSlots = computeResonanceSlots(chain, fired);
  combat.lastSoloRun = longestSoloRun(chain);
  const actStats = state.telemetry.actStats[act] ?? (state.telemetry.actStats[act] = { cardsPlayed: 0, linksFired: 0, combats: 0, hpLost: 0 });

  // 4. Resolve slots 1 → N
  for (let i = 0; i < chain.length; i++) {
    const slot = chain[i];
    const owner = state.players[slot.owner];
    const partner = state.players[otherPlayer(slot.owner)];
    const inst = mustFind(state, slot);
    const def = effectiveDef(inst);
    const resonance = resonanceSlots.has(i);

    const effects: EffectOp[] =
      fired[i] && def.link
        ? def.link.replace
          ? def.link.effects
          : [...def.base, ...def.link.effects]
        : def.base;

    // M2-D4: Pulse skips cards with no primary number and carries forward
    const hasPrimary = effects.some((e) => 'primary' in e && e.primary);
    const ctx: CardContext = {
      owner, partner, slotIndex: i, targetId: slot.targetId, def, fired, resonance,
      pulse: hasPrimary ? owner.pulseBonus : 0,
      detonatedStacks: 0, momentumSpent: false, keepMomentum: false, momentumPerHit: false,
    };
    if (hasPrimary) owner.pulseBonus = 0;

    state.log.push({ e: 'card', player: slot.owner, card: def.name, slot: i, linkFired: fired[i], resonance });
    if (state.botSeat) {
      // S2.1 solo chatter (capped per combat; no-op in co-op)
      if (slot.owner === state.botSeat) maybeSaySolo(state, 'own_play', 7);
      else if (fired[i] && i > 0 && chain[i - 1].owner === state.botSeat) maybeSaySolo(state, 'human_linked_off_me', 18);
    }
    if (resonance) {
      let start = i;
      while (start > 0 && fired[start]) start--;
      const streakTags = chain.slice(start, i + 1).map((s) => effectiveDef(mustFind(state, s)).tag);
      state.log.push({ e: 'resonance_ignite', slot: i, tags: streakTags });
      // S2.1: in solo the streak includes HIM — the closest he comes to joy
      sayWitness(state, state.botSeat ? 'resonance_together' : 'resonance');
      state.telemetry.resonances++;
      for (const t of streakTags) {
        state.telemetry.resonanceTagCounts[t] = (state.telemetry.resonanceTagCounts[t] ?? 0) + 1;
      }
      runHooks(state, 'p1', 'resonance');
      runHooks(state, 'p2', 'resonance');
    }

    for (const eff of effects) applyEffect(state, ctx, eff);

    if (def.tag === 'Strike' && ctx.momentumSpent && !ctx.keepMomentum && !hasPassive(owner, 'momentumNoHalve')) {
      owner.momentum = Math.floor(owner.momentum / 2);
    }

    const hi = owner.hand.indexOf(slot.cardInstanceId);
    if (hi >= 0) owner.hand.splice(hi, 1);
    if (inst.echo || def.exhaust) owner.exhaust.push(slot.cardInstanceId);
    else owner.discard.push(slot.cardInstanceId);

    state.telemetry.cardsPlayed++;
    actStats.cardsPlayed++;
    if (fired[i]) {
      state.telemetry.linksFired++;
      actStats.linksFired++;
      runHooks(state, slot.owner, 'linkFired');
    }
  }

  combat.chain = [];
  combat.threadActions = [];

  if (turnDamage > state.telemetry.biggestTurn.damage) {
    state.telemetry.biggestTurn = { damage: turnDamage, turn: combat.turn, act };
  }

  // M2-A1: discard what was in hand at commit (Keep cards and retained card stay)
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    let retainCharges = hasPassive(p, 'handRetainOne') ? 1 : 0;
    for (const id of combat.handSnapshot[pid]) {
      const idx = p.hand.indexOf(id);
      if (idx < 0) continue; // was played or already gone
      const inst = findInstance(p, id);
      if (inst && effectiveDef(inst).keep) continue;
      if (retainCharges > 0) { retainCharges--; continue; }
      p.hand.splice(idx, 1);
      p.discard.push(id);
    }
  }

  if (livingEnemies(state).length === 0) return; // victory — reducer handles the rest

  // The Unraveled (§6): at 50% HP, sever the Thread
  for (const enemy of livingEnemies(state)) {
    const def = ENEMIES[enemy.defId];
    if (def.unraveled && !combat.severTriggered && enemy.hp <= enemy.maxHp / 2) {
      combat.severTriggered = true;
      combat.severedTurns = def.unraveled.severTurns;
      state.thread = 0;
      state.log.push({ e: 'thread_severed', turns: def.unraveled.severTurns });
      state.log.push({ e: 'info', detail: 'The Thread is SEVERED. No Thread actions; no links between your cards and your partner’s.' });
    }
  }

  // The Mourner (§6): feeds on 4+ same-player runs, same-turn (OQ#7)
  if (combat.lastSoloRun >= 4) {
    for (const enemy of livingEnemies(state)) {
      const def = ENEMIES[enemy.defId];
      if (def.mournerMechanic) {
        enemy.strength += def.mournerMechanic.strengthPerTrigger;
        state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `swells with grief (+${def.mournerMechanic.strengthPerTrigger} Strength)` });
      }
    }
  }

  // Chain-readers (M2-B3): gain Block per unfired link in the resolved chain
  const unfired = fired.filter((f, i) => !f && i > 0).length;
  if (unfired > 0) {
    for (const enemy of livingEnemies(state)) {
      const def = ENEMIES[enemy.defId];
      if (def.chainReader) {
        enemy.block += def.chainReader.blockPerUnfiredLink * unfired;
        state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `reads the slack in your chain (+${def.chainReader.blockPerUnfiredLink * unfired} Block)` });
      }
    }
  }

  // 5. Enemy phase (§6)
  for (const enemy of combat.enemies) {
    if (enemy.hp <= 0) continue;
    enemy.block = 0;
    // Playtest-1 (§14.8): elites and bosses re-tether on their own every 3rd
    // turn — parking one player on guard-soak duty stops being a solved fight.
    // Deterministic cadence: learnable, no hidden rolls.
    const selfDef = ENEMIES[enemy.defId];
    if ((selfDef.elite || selfDef.boss) && combat.turn % 3 === 0 && enemy.boundTo !== null) {
      const other = otherPlayer(enemy.boundTo);
      if (!state.players[other].fallen) {
        enemy.boundTo = other;
        state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `re-tethers of its own will — now bound to ${other}` });
      }
    }
    if (enemy.stun > 0) {
      enemy.stun--;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: 'stunned — skips its turn' });
    } else {
      enemyAct(state, enemy);
    }
    if (enemy.weak > 0) enemy.weak--;
    if (enemy.vulnerable > 0) enemy.vulnerable--;
    const def = ENEMIES[enemy.defId];
    enemy.scriptIndex = (enemy.scriptIndex + 1) % def.script.length;
    enemy.intent = def.script[enemy.scriptIndex];
  }
}

/**
 * Sever Binding on a chorus (§6 ruling, OPEN-QUESTIONS): bindings rotate — the
 * unbound body takes the target's binding and the target goes unbound and
 * untargetable. "One is always unbound."
 */
function severChorus(state: GameState, target: EnemyState): void {
  const members = state.combat!.enemies.filter((e) => ENEMIES[e.defId]?.chorus && e.hp > 0);
  const unbound = members.find((e) => e.boundTo === null);
  if (!unbound || unbound.id === target.id || target.boundTo === null) return;
  unbound.boundTo = target.boundTo;
  unbound.untargetable = false;
  target.boundTo = null;
  target.untargetable = true;
  state.log.push({ e: 'info', detail: 'The chorus rearranges itself; a different voice steps forward.' });
}

function boundPlayer(state: GameState, enemy: EnemyState): PlayerState {
  const pid = enemy.boundTo ?? 'p1';
  const p = state.players[pid];
  // a Fallen player draws no aggro: M2-A3 rebinds at fall, but stay defensive
  return p.fallen ? state.players[otherPlayer(pid)] : p;
}

function enemyAct(state: GameState, enemy: EnemyState): void {
  // unbound chorus bodies don't act on players; they harmonize (buff)
  if (enemy.boundTo === null && ENEMIES[enemy.defId]?.chorus) {
    for (const ally of livingEnemies(state)) ally.strength += 1;
    state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: 'harmonizes — the chorus gains 1 Strength' });
    return;
  }
  const bound = boundPlayer(state, enemy);
  const intent = enemy.intent;
  switch (intent.kind) {
    case 'attack': {
      const times = intent.times ?? 1;
      for (let t = 0; t < times; t++) hitPlayer(state, enemy, bound, intent.amount);
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `attacks ${bound.id} for ${intent.amount}${times > 1 ? `×${times}` : ''}` });
      break;
    }
    case 'attack_all':
      for (const pid of ['p1', 'p2'] as PlayerId[]) {
        if (!state.players[pid].fallen) hitPlayer(state, enemy, state.players[pid], intent.amount);
      }
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `attacks BOTH for ${intent.amount}` });
      break;
    case 'attack_momentum': {
      const amt = intent.base + intent.perMomentum * bound.momentum;
      hitPlayer(state, enemy, bound, amt);
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `attacks ${bound.id} for ${amt} (feeds on Momentum)` });
      break;
    }
    case 'attack_drain':
      hitPlayer(state, enemy, bound, intent.amount);
      state.thread = Math.max(0, state.thread - intent.threadDrain);
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `attacks ${bound.id} for ${intent.amount} and drains ${intent.threadDrain} Thread` });
      break;
    case 'attack_fray':
      hitPlayer(state, enemy, bound, intent.amount);
      state.players.p1.statuses.frayed++;
      state.players.p2.statuses.frayed++;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `attacks ${bound.id} for ${intent.amount} — the Thread FRAYS` });
      break;
    case 'block':
      enemy.block += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `braces for ${intent.amount} Block` });
      break;
    case 'block_all':
      for (const ally of livingEnemies(state)) ally.block += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `shields its kin (+${intent.amount} Block to all)` });
      break;
    case 'buff_strength':
      enemy.strength += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `gains ${intent.amount} Strength` });
      break;
    case 'buff_strength_all':
      for (const ally of livingEnemies(state)) ally.strength += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `incites its kin (+${intent.amount} Strength to all)` });
      break;
    case 'debuff_weak':
      bound.statuses.weak += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `applies ${intent.amount} Weak to ${bound.id}` });
      break;
    case 'debuff_vulnerable':
      bound.statuses.vulnerable += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `applies ${intent.amount} Vulnerable to ${bound.id}` });
      break;
    case 'sever': {
      // binding manipulation (M2-B3): the enemy moves its own tether
      if (enemy.boundTo !== null) {
        enemy.boundTo = state.players[otherPlayer(enemy.boundTo)].fallen ? enemy.boundTo : otherPlayer(enemy.boundTo);
        state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `severs its own tether — now bound to ${enemy.boundTo}` });
      }
      break;
    }
  }
}

function hitPlayer(state: GameState, enemy: EnemyState, player: PlayerState, raw: number): void {
  if (player.fallen) return;
  let amt = raw + enemy.strength;
  if (enemy.weak > 0) amt = Math.floor(amt * 0.75);
  if (player.statuses.vulnerable > 0) amt = Math.floor(amt * 1.5);
  if (player.statuses.frayed > 0) amt = Math.floor(amt * (1 + 0.25 * player.statuses.frayed));
  if (amt < 0) amt = 0;
  const blocked = Math.min(player.block, amt);
  player.block -= blocked;
  const hpLoss = amt - blocked;
  player.hp = Math.max(0, player.hp - hpLoss);
  if (hpLoss > 0) {
    state.log.push({ e: 'player_hit', player: player.id, hpLoss, blocked });
    const act = state.map.act;
    const actStats = state.telemetry.actStats[act] ?? (state.telemetry.actStats[act] = { cardsPlayed: 0, linksFired: 0, combats: 0, hpLost: 0 });
    actStats.hpLost += hpLoss;
  }
  if (player.hp <= 0 && !player.fallen) fall(state, player);
}

/** M2-A3: down-but-not-out. */
function fall(state: GameState, player: PlayerState): void {
  player.fallen = true;
  player.block = 0;
  player.momentum = 0;
  player.pulseBonus = 0;
  player.kindled = 0;
  // staged cards fizzle (relevant if a fall could ever occur mid-planning) + hand discards
  if (state.combat) {
    state.combat.chain = state.combat.chain.filter((s) => s.owner !== player.id);
    state.combat.threadActions = [];
  }
  player.discard.push(...player.hand);
  player.hand = [];
  player.ready = true; // takes no turns
  // enemies rebind to the survivor immediately
  const survivor = otherPlayer(player.id);
  if (state.combat) {
    for (const e of state.combat.enemies) {
      if (e.boundTo === player.id) e.boundTo = survivor;
    }
  }
  state.log.push({ e: 'fallen', player: player.id });
  sayWitness(state, state.botSeat
    ? (player.id === state.botSeat ? 'fallen_self' : 'fallen_human')
    : 'partner_fallen');
}

// ---------------------------------------------------------------------------
// Turn start (§2.1 phase 1)
// ---------------------------------------------------------------------------

export function startTurn(state: GameState): void {
  const combat = state.combat!;
  combat.turn++;
  state.telemetry.turns++;
  combat.steadyShield = 0;

  // Unraveled sever countdown → reignition at full 10 (§6)
  if (combat.severedTurns > 0) {
    combat.severedTurns--;
    if (combat.severedTurns === 0) {
      state.thread = state.threadMax;
      state.log.push({ e: 'thread_reignited' });
      state.log.push({ e: 'info', detail: 'The Thread REIGNITES at full strength.' });
    }
  }

  const anyFallen = state.players.p1.fallen || state.players.p2.fallen;
  const severed = combat.severedTurns > 0;
  if (!anyFallen && !severed) {
    let regen = 2; // §5
    if (hasPassive(state.players.p1, 'threadRegenPlusOne') || hasPassive(state.players.p2, 'threadRegenPlusOne')) regen++;
    gainThread(state, regen);
  }

  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    if (p.fallen) {
      p.ready = true;
      continue;
    }
    p.block = 0;
    p.energy = p.energyMax + p.kindled; // M2-A2
    p.kindled = 0;
    p.ready = false;
    p.pulseBonus = 0;
    p.statuses.frayed = 0;
    if (p.statuses.weak > 0) p.statuses.weak--;
    if (p.statuses.vulnerable > 0) p.statuses.vulnerable--;
    runHooks(state, pid, 'turnStart');
    // Fixed FIVE fresh cards (playtest ruling, supersedes draw-to-5): cards
    // carried from resolution draws, Keep, and retain-1 are EXTRA — otherwise
    // "Draw N" only previews cards instead of netting any (M2-A1's stated
    // "N extra next turn"). Hand cap 10 still binds inside drawCards.
    drawCards(state, p, 5);
  }
}

// ---------------------------------------------------------------------------
// Combat setup
// ---------------------------------------------------------------------------

export function startCombat(state: GameState, enemyDefIds: string[]): void {
  const enemies: EnemyState[] = [];
  const first = rngInt(state.rng, 2);
  state.rng = first.state;
  const chorusIds = enemyDefIds.filter((id) => ENEMIES[id]?.chorus);
  let chorusSeen = 0;
  enemyDefIds.forEach((defId, i) => {
    const def = ENEMIES[defId];
    const roll = rngInt(state.rng, def.hp[1] - def.hp[0] + 1);
    state.rng = roll.state;
    const hp = def.hp[0] + roll.value;
    const start = rngInt(state.rng, def.script.length);
    state.rng = start.state;
    // Choristers (§6): exactly one body starts unbound + untargetable
    const isChorusOdd = def.chorus && chorusIds.length >= 3 && chorusSeen++ === chorusIds.length - 1;
    enemies.push({
      id: `e${i}_${defId}`,
      defId,
      hp, maxHp: hp,
      block: 0, hex: 0, weak: 0, vulnerable: 0, stun: 0, strength: 0,
      boundTo: isChorusOdd ? null : (i + first.value) % 2 === 0 ? 'p1' : 'p2',
      untargetable: !!isChorusOdd,
      scriptIndex: start.value,
      intent: def.script[start.value],
    });
  });

  // chorus pool: all members share the lowest rolled HP so the bar reads true
  const chorusMembers = enemies.filter((e) => ENEMIES[e.defId]?.chorus);
  if (chorusMembers.length > 0) {
    const pool = Math.min(...chorusMembers.map((e) => e.hp));
    for (const m of chorusMembers) { m.hp = pool; m.maxHp = pool; }
  }

  state.combat = {
    enemies,
    chain: [],
    threadActions: [],
    turn: 0,
    lastSoloRun: 0,
    steadyShield: 0,
    handSnapshot: { p1: [], p2: [] },
    severedTurns: 0,
    severTriggered: false,
    witnessLines: 0,
  };
  state.thread = 6; // §5
  state.phase = 'combat';

  const act = state.map.act;
  const actStats = state.telemetry.actStats[act] ?? (state.telemetry.actStats[act] = { cardsPlayed: 0, linksFired: 0, combats: 0, hpLost: 0 });
  actStats.combats++;

  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    p.combatCards = [];
    p.momentum = 0;
    p.block = 0;
    p.kindled = 0;
    p.fallen = false;
    p.powers = [];
    p.statuses = { weak: 0, vulnerable: 0, frayed: 0 };
    p.exhaust = [];
    p.discard = [];
    p.hand = [];
    const shuffled = rngShuffle(state.rng, p.deck.map((c) => c.instanceId));
    state.rng = shuffled.state;
    p.draw = shuffled.value;
  }

  const before = state.thread;
  startTurn(state);
  state.thread = before; // turn 1 opens at exactly 6 (§5)

  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    if (hasPassive(p, 'startCombatFrayImmune')) state.combat.steadyShield++;
    runHooks(state, pid, 'combatStart');
    if (p.pendingFray > 0) {
      p.statuses.frayed = p.pendingFray; // The Basin's bill comes due (§8)
      p.pendingFray = 0;
    }
  }
}
