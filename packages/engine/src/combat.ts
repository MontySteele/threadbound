// Chain resolution (§2), Thread actions (§5), enemy phase (§6).
// Everything here mutates a working copy owned by the reducer — the reducer
// deep-clones state before calling in, so reduce() stays pure.

import { CARDS } from './content/cards';
import { ENEMIES } from './content/enemies';
import {
  CardDef, CardInstance, ChainSlot, EffectOp, EnemyState, GameState, PlayerId, PlayerState,
} from './types';
import { rngInt, rngShuffle } from './rng';
import { sayWitness } from './witness-draw';

export function otherPlayer(p: PlayerId): PlayerId {
  return p === 'p1' ? 'p2' : 'p1';
}

export function findInstance(player: PlayerState, instanceId: string): CardInstance | undefined {
  return (
    player.deck.find((c) => c.instanceId === instanceId) ??
    player.combatCards.find((c) => c.instanceId === instanceId)
  );
}

/** Effective rules text for an instance: mutated Echoes use the mutation overlay (§7). */
export function effectiveDef(inst: CardInstance): CardDef {
  const def = CARDS[inst.defId];
  if (inst.mutated && def.mutation) {
    return { ...def, name: def.mutation.name, text: def.mutation.text, base: def.mutation.base, link: def.mutation.link };
  }
  return def;
}

// ---------------------------------------------------------------------------
// Static link / Resonance computation (§2.3). Link firing depends only on the
// committed chain's tags and ownership, so it is computed up-front.
// ---------------------------------------------------------------------------

export function computeLinksFired(state: GameState, chain: ChainSlot[]): boolean[] {
  return chain.map((slot, i) => {
    if (i === 0) return false;
    const def = effectiveDef(mustFind(state, slot));
    if (!def.link) return false;
    const prev = chain[i - 1];
    const prevDef = effectiveDef(mustFind(state, prev));
    if (def.link.condition === 'any') return true;
    if (def.link.condition === 'partner') return prev.owner !== slot.owner;
    return prevDef.tag === def.link.condition;
  });
}

/**
 * Resonance (§2.3): maximal runs of >=3 consecutive fired links whose involved
 * cards (linked cards plus the card feeding the first link) include both
 * players. The final card of each qualifying streak gets +50%.
 */
export function computeResonanceSlots(chain: ChainSlot[], fired: boolean[]): Set<number> {
  const out = new Set<number>();
  let i = 0;
  while (i < chain.length) {
    if (!fired[i]) { i++; continue; }
    let j = i;
    while (j + 1 < chain.length && fired[j + 1]) j++;
    const runLen = j - i + 1; // number of fired links
    if (runLen >= 3) {
      const owners = new Set<PlayerId>();
      for (let k = i - 1; k <= j; k++) owners.add(chain[k].owner);
      if (owners.size === 2) out.add(j); // solo streaks never ignite (§2.3)
    }
    i = j + 1;
  }
  return out;
}

/** Longest single-owner consecutive run in the chain (Mourner food, §6). */
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
// Shared damage plumbing
// ---------------------------------------------------------------------------

function livingEnemies(state: GameState): EnemyState[] {
  return state.combat!.enemies.filter((e) => e.hp > 0);
}

function retarget(state: GameState, targetId: string | undefined): EnemyState | undefined {
  const living = livingEnemies(state);
  const chosen = living.find((e) => e.id === targetId);
  return chosen ?? living[0]; // dead/missing target → leftmost living
}

/** Player-sourced hit on an enemy. Returns damage dealt (post-block HP loss + block absorbed). */
function hitEnemy(state: GameState, attacker: PlayerState, enemy: EnemyState, raw: number): number {
  let amt = raw;
  if (attacker.statuses.weak > 0) amt = Math.floor(amt * 0.75);
  if (enemy.vulnerable > 0) amt = Math.floor(amt * 1.5);
  if (amt < 0) amt = 0;
  const blocked = Math.min(enemy.block, amt);
  enemy.block -= blocked;
  const hpLoss = Math.min(enemy.hp, amt - blocked);
  enemy.hp -= hpLoss;
  state.log.push({ e: 'damage', target: enemy.id, amount: amt });
  if (enemy.hp <= 0) state.log.push({ e: 'enemy_dead', enemy: enemy.id });
  return amt;
}

/** Detonation (§4): 3 damage per stack, ignores Block (see OPEN-QUESTIONS). */
function detonate(state: GameState, enemy: EnemyState, maxStacks?: number): number {
  const stacks = Math.min(enemy.hex, maxStacks ?? enemy.hex);
  if (stacks <= 0) return 0;
  enemy.hex -= stacks;
  const dmg = stacks * 3;
  enemy.hp = Math.max(0, enemy.hp - dmg);
  state.telemetry.damageByTag.Hex = (state.telemetry.damageByTag.Hex ?? 0) + dmg;
  state.log.push({ e: 'detonate', target: enemy.id, stacks, damage: dmg });
  if (enemy.hp <= 0) state.log.push({ e: 'enemy_dead', enemy: enemy.id });
  // Black Lattice (§9): whenever Hexes detonate, its owner gains 3 Block.
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    if (p.powers.includes('black_lattice')) {
      p.block += 3;
      state.log.push({ e: 'block', target: pid, amount: 3 });
    }
  }
  return stacks;
}

function gainThread(state: GameState, amount: number): void {
  state.thread = Math.min(state.threadMax, state.thread + amount);
}

/** Spend Thread; overdraft frays both players unless a Steady shield absorbs it (§5). */
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
    }
  }
}

function drawCards(state: GameState, player: PlayerState, n: number): void {
  for (let i = 0; i < n; i++) {
    if (player.hand.length >= 10) return; // hand cap
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
  pulse: number; // consumed Pulse bonus for this card
  detonatedStacks: number;
  momentumSpent: boolean; // a Strike damage hit consumed Momentum
  keepMomentum: boolean;
}

/** primary-number scaling: +Pulse, then ×1.5 (round up) under Resonance (§2.3, §5). */
function scale(ctx: CardContext, amount: number, primary: boolean | undefined): number {
  if (!primary) return amount;
  let v = amount + ctx.pulse;
  if (ctx.resonance) v = Math.ceil(v * 1.5);
  return v;
}

function applyEffect(state: GameState, ctx: CardContext, eff: EffectOp): void {
  const { owner, partner } = ctx;
  const tag = ctx.def.tag;
  switch (eff.op) {
    case 'damage': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy) return;
      const times = eff.times ?? 1;
      for (let t = 0; t < times; t++) {
        let amt = scale(ctx, eff.amount, eff.primary);
        // Momentum (§4): the next Strike deals +N (flat, first hit), then halves.
        if (tag === 'Strike' && t === 0 && !ctx.momentumSpent && owner.momentum > 0) {
          amt += owner.momentum;
          ctx.momentumSpent = true;
        }
        const target = retarget(state, enemy.id) ?? retarget(state, undefined);
        if (!target) return;
        const dealt = hitEnemy(state, owner, target, amt);
        state.telemetry.damageByTag[tag] = (state.telemetry.damageByTag[tag] ?? 0) + dealt;
      }
      break;
    }
    case 'damageAll': {
      for (const enemy of livingEnemies(state)) {
        let amt = scale(ctx, eff.amount, eff.primary);
        if (tag === 'Strike' && !ctx.momentumSpent && owner.momentum > 0) amt += owner.momentum;
        const dealt = hitEnemy(state, owner, enemy, amt);
        state.telemetry.damageByTag[tag] = (state.telemetry.damageByTag[tag] ?? 0) + dealt;
      }
      if (tag === 'Strike' && owner.momentum > 0) ctx.momentumSpent = true;
      break;
    }
    case 'damagePerHex': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy) return;
      let amt = scale(ctx, eff.base + eff.perHex * enemy.hex, eff.primary);
      if (tag === 'Strike' && !ctx.momentumSpent && owner.momentum > 0) {
        amt += owner.momentum;
        ctx.momentumSpent = true;
      }
      const dealt = hitEnemy(state, owner, enemy, amt);
      state.telemetry.damageByTag[tag] = (state.telemetry.damageByTag[tag] ?? 0) + dealt;
      break;
    }
    case 'momentumStrikeBonus': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy) return;
      const dealt = hitEnemy(state, owner, enemy, owner.momentum * eff.mult);
      state.telemetry.damageByTag[tag] = (state.telemetry.damageByTag[tag] ?? 0) + dealt;
      if (eff.keepMomentum) ctx.keepMomentum = true;
      break;
    }
    case 'block':
      owner.block += scale(ctx, eff.amount, eff.primary);
      state.log.push({ e: 'block', target: owner.id, amount: eff.amount });
      break;
    case 'partnerBlock':
      partner.block += eff.amount;
      state.log.push({ e: 'block', target: partner.id, amount: eff.amount });
      break;
    case 'hex': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy) return;
      enemy.hex += scale(ctx, eff.amount, eff.primary);
      state.log.push({ e: 'hex', target: enemy.id, amount: eff.amount });
      break;
    }
    case 'hexAll':
      for (const enemy of livingEnemies(state)) {
        enemy.hex += scale(ctx, eff.amount, eff.primary);
        state.log.push({ e: 'hex', target: enemy.id, amount: eff.amount });
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
      if (enemy) ctx.detonatedStacks += detonate(state, enemy, eff.max);
      break;
    }
    case 'detonateAllEnemies':
      for (const enemy of livingEnemies(state)) ctx.detonatedStacks += detonate(state, enemy);
      break;
    case 'damagePerDetonated': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy || ctx.detonatedStacks <= 0) return;
      const dealt = hitEnemy(state, owner, enemy, ctx.detonatedStacks * eff.per);
      state.telemetry.damageByTag[tag] = (state.telemetry.damageByTag[tag] ?? 0) + dealt;
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
    case 'momentum':
      owner.momentum += scale(ctx, eff.amount, eff.primary);
      break;
    case 'draw':
      drawCards(state, owner, eff.amount);
      break;
    case 'partnerDraw':
      drawCards(state, partner, eff.amount);
      break;
    case 'energy':
      break; // energy is a planning-budget effect; spent during staging validation
    case 'thread':
      gainThread(state, eff.amount);
      break;
    case 'power':
      if (!owner.powers.includes(eff.power)) owner.powers.push(eff.power);
      break;
  }
}

// ---------------------------------------------------------------------------
// Turn resolution (§2.1 phase 3 + §5)
// ---------------------------------------------------------------------------

export function resolveTurn(state: GameState): void {
  const combat = state.combat!;
  state.log = [];

  // 1. Thread actions, in declaration order (§5).
  for (const ta of combat.threadActions) {
    const actor = state.players[ta.player];
    const partner = state.players[otherPlayer(ta.player)];
    switch (ta.kind) {
      case 'pulse':
        spendThread(state, 2);
        partner.pulseBonus += 3;
        break;
      case 'reclaim': {
        spendThread(state, 2);
        // An Echo is an ethereal COPY (§5); the original stays in the partner's discard.
        const src = findInstance(partner, ta.targetId!);
        if (!src || !partner.discard.includes(ta.targetId!)) break; // validated at declare; defensive
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
        if (enemy) enemy.boundTo = otherPlayer(enemy.boundTo);
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

  // 2-3. Static link + Resonance computation (§2.3).
  const chain = combat.chain;
  const fired = computeLinksFired(state, chain);
  const resonanceSlots = computeResonanceSlots(chain, fired);
  combat.lastSoloRun = longestSoloRun(chain);

  // 4. Resolve slots 1 → N.
  for (let i = 0; i < chain.length; i++) {
    const slot = chain[i];
    const owner = state.players[slot.owner];
    const partner = state.players[otherPlayer(slot.owner)];
    const inst = mustFind(state, slot);
    const def = effectiveDef(inst);
    const resonance = resonanceSlots.has(i);
    const ctx: CardContext = {
      owner, partner, slotIndex: i, targetId: slot.targetId, def, fired, resonance,
      pulse: owner.pulseBonus, detonatedStacks: 0, momentumSpent: false, keepMomentum: false,
    };
    owner.pulseBonus = 0;

    const effects: EffectOp[] =
      fired[i] && def.link
        ? def.link.replace
          ? def.link.effects
          : [...def.base, ...def.link.effects]
        : def.base;

    state.log.push({ e: 'card', player: slot.owner, card: def.name, slot: i, linkFired: fired[i], resonance });
    if (resonance) {
      let start = i;
      while (start > 0 && fired[start]) start--;
      const streakTags = chain.slice(start, i + 1).map((s) => effectiveDef(mustFind(state, s)).tag);
      state.log.push({ e: 'resonance_ignite', slot: i, tags: streakTags });
      sayWitness(state, 'resonance');
      state.telemetry.resonances++;
    }

    for (const eff of effects) applyEffect(state, ctx, eff);

    // Momentum halves after a Strike that used it (§4), unless kept.
    if (def.tag === 'Strike' && ctx.momentumSpent && !ctx.keepMomentum && !owner.powers.includes('wildfire_heart')) {
      owner.momentum = Math.floor(owner.momentum / 2);
    }

    // move the played card out of hand
    const hi = owner.hand.indexOf(slot.cardInstanceId);
    if (hi >= 0) owner.hand.splice(hi, 1);
    if (inst.echo || def.exhaust) owner.exhaust.push(slot.cardInstanceId);
    else owner.discard.push(slot.cardInstanceId);

    state.telemetry.cardsPlayed++;
    if (i > 0 && def.link) {
      // link-fire telemetry counts only cards that HAVE a link and a previous slot
      if (fired[i]) state.telemetry.linksFired++;
    }
    if (resonance) {
      // tag diversity within the igniting streak (§13.2)
      let start = i;
      while (start > 0 && fired[start]) start--;
      for (let k = start; k <= i; k++) {
        const t = effectiveDef(mustFind(state, chain[k])).tag;
        state.telemetry.resonanceTagCounts[t] = (state.telemetry.resonanceTagCounts[t] ?? 0) + 1;
      }
    }
  }

  combat.chain = [];
  combat.threadActions = [];

  // victory check before enemies act
  if (livingEnemies(state).length === 0) return;

  // The Mourner (§6): feeds on 4+ same-player runs, effective immediately.
  if (combat.lastSoloRun >= 4) {
    for (const enemy of livingEnemies(state)) {
      const def = ENEMIES[enemy.defId];
      if (def.mournerMechanic) {
        enemy.strength += def.mournerMechanic.strengthPerTrigger;
        state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `The Mourner swells (+${def.mournerMechanic.strengthPerTrigger} Strength).` });
      }
    }
  }

  // 5. Enemy phase (§6).
  for (const enemy of combat.enemies) {
    if (enemy.hp <= 0) continue;
    enemy.block = 0; // block lasts until the enemy's next action
    if (enemy.stun > 0) {
      enemy.stun--;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: 'Stunned — skips its turn.' });
      continue;
    }
    enemyAct(state, enemy);
    // enemy status tick
    if (enemy.weak > 0) enemy.weak--;
    if (enemy.vulnerable > 0) enemy.vulnerable--;
    // advance script
    const def = ENEMIES[enemy.defId];
    enemy.scriptIndex = (enemy.scriptIndex + 1) % def.script.length;
    enemy.intent = def.script[enemy.scriptIndex];
  }
}

function enemyAct(state: GameState, enemy: EnemyState): void {
  const bound = state.players[enemy.boundTo];
  const intent = enemy.intent;
  switch (intent.kind) {
    case 'attack': {
      const times = intent.times ?? 1;
      for (let t = 0; t < times; t++) hitPlayer(state, enemy, bound, intent.amount);
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `attacks ${bound.id} for ${intent.amount}${times > 1 ? `×${times}` : ''}` });
      break;
    }
    case 'attack_all':
      hitPlayer(state, enemy, state.players.p1, intent.amount);
      hitPlayer(state, enemy, state.players.p2, intent.amount);
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
    case 'block':
      enemy.block += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `braces for ${intent.amount} Block` });
      break;
    case 'buff_strength':
      enemy.strength += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `gains ${intent.amount} Strength` });
      break;
    case 'debuff_weak': {
      bound.statuses.weak += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `applies ${intent.amount} Weak to ${bound.id}` });
      break;
    }
  }
}

function hitPlayer(state: GameState, enemy: EnemyState, player: PlayerState, raw: number): void {
  let amt = raw + enemy.strength;
  if (enemy.weak > 0) amt = Math.floor(amt * 0.75);
  if (player.statuses.vulnerable > 0) amt = Math.floor(amt * 1.5);
  // Frayed (§4): +25% damage taken per stack, this turn.
  if (player.statuses.frayed > 0) amt = Math.floor(amt * (1 + 0.25 * player.statuses.frayed));
  if (amt < 0) amt = 0;
  const blocked = Math.min(player.block, amt);
  player.block -= blocked;
  const hpLoss = amt - blocked;
  player.hp = Math.max(0, player.hp - hpLoss);
  if (hpLoss > 0) state.log.push({ e: 'player_hit', player: player.id, amount: hpLoss });
}

// ---------------------------------------------------------------------------
// Turn start (§2.1 phase 1)
// ---------------------------------------------------------------------------

export function startTurn(state: GameState): void {
  const combat = state.combat!;
  combat.turn++;
  state.telemetry.turns++;
  combat.steadyShield = 0;
  gainThread(state, 2); // §5 regen
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    p.block = 0;
    p.energy = p.energyMax;
    p.ready = false;
    p.pulseBonus = 0;
    // statuses gained last turn expire at the new turn's start
    p.statuses.frayed = 0;
    if (p.statuses.weak > 0) p.statuses.weak--;
    if (p.statuses.vulnerable > 0) p.statuses.vulnerable--;
    if (p.powers.includes('stoke')) p.momentum += 2;
    if (p.powers.includes('unbroken_line')) gainThread(state, 1);
    // §2.1: draw TO 5 (hand persists between turns)
    if (p.hand.length < 5) drawCards(state, p, 5 - p.hand.length);
  }
}

// ---------------------------------------------------------------------------
// Combat setup
// ---------------------------------------------------------------------------

export function startCombat(state: GameState, enemyDefIds: string[]): void {
  const enemies: EnemyState[] = [];
  // Bindings (§6): semi-random but weighted — alternate from a random start so
  // multi-enemy fights open asymmetric but never all-on-one... unless solo enemy.
  const first = rngInt(state.rng, 2);
  state.rng = first.state;
  enemyDefIds.forEach((defId, i) => {
    const def = ENEMIES[defId];
    const roll = rngInt(state.rng, def.hp[1] - def.hp[0] + 1);
    state.rng = roll.state;
    const hp = def.hp[0] + roll.value;
    const start = rngInt(state.rng, def.script.length);
    state.rng = start.state;
    enemies.push({
      id: `e${i}_${defId}`,
      defId,
      hp, maxHp: hp,
      block: 0, hex: 0, weak: 0, vulnerable: 0, stun: 0, strength: 0,
      boundTo: (i + first.value) % 2 === 0 ? 'p1' : 'p2',
      scriptIndex: start.value,
      intent: def.script[start.value],
    });
  });

  state.combat = {
    enemies,
    chain: [],
    threadActions: [],
    turn: 0,
    lastSoloRun: 0,
    steadyShield: 0,
  };
  state.thread = 6; // §5: starts each combat at 6
  state.phase = 'combat';

  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    p.combatCards = [];
    p.momentum = 0;
    p.block = 0;
    p.powers = [];
    p.statuses = { weak: 0, vulnerable: 0, frayed: 0 };
    p.exhaust = [];
    p.discard = [];
    p.hand = [];
    const shuffled = rngShuffle(state.rng, p.deck.map((c) => c.instanceId));
    state.rng = shuffled.state;
    p.draw = shuffled.value;
  }

  // thread regen + draws happen in startTurn; cancel the extra regen on turn 1
  const before = state.thread;
  startTurn(state);
  state.thread = before; // turn 1 opens at exactly 6 (§5)

  // The Basin's consequence (§8): begin the next combat Frayed.
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    if (p.pendingFray > 0) {
      p.statuses.frayed = p.pendingFray;
      p.pendingFray = 0;
    }
  }
}
