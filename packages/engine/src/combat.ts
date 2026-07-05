// Chain resolution (§2), Thread actions (§5), enemy phase (§6), M2 revisions
// (Kindled M2-A2, Fallen M2-A3, hand discard M2-A1, hooks M2-B2, Unraveled/
// Choristers M2-B3). The reducer deep-clones before calling in; mutation here
// is of the working copy only.

import { CARDS } from './content/cards';
import { ELITE_ESCALATION_SCALE, ENEMIES } from './content/registry';
import { POWERS } from './content/powers';
import { RITES_BY_ID, RITE_CARDS } from './content/rites';
import { RELICS_BY_ID } from './content/registry';
import {
  ActStats, CardDef, CardInstance, ChainSlot, EffectOp, EnemyState, GameState, GrowthAxis,
  HookEvent, HookOp, PassiveId, PlayerId, PlayerState, RunTallies,
} from './types';
import { rngInt, rngShuffle } from './rng';
import { FACE_BY_ANSWER, mechanicFireTurns } from './content/faces';
import { ascensionMods, scaleIntent } from './ascension';
import { maybeSaySolo, sayWitness } from './witness-draw';

/** OQ#57: rite-card ids, for the play-rate instrument. */
const RITE_CARD_IDS = new Set(RITE_CARDS.map((c) => c.id));

/** S4.1: ActStats grew gold columns — one initializer for every site. */
export function emptyActStats(): ActStats {
  return { cardsPlayed: 0, linksFired: 0, combats: 0, hpLost: 0, goldEarned: 0, goldSpent: 0 };
}

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

// ---------------------------------------------------------------------------
// S9d — the tally (stateless growth). Effective amounts are DERIVED from
// state.tallies at resolution and preview time; Echoes/Reclaims inherit
// correctness because nothing is stored on the instance.
// ---------------------------------------------------------------------------

/** Axis reader. `holder` matters only for the per-seat axis (boundKills —
 *  "enemies that die Bound to YOU" reads on the seat holding the card). */
export function tallyAxisValue(t: RunTallies, axis: GrowthAxis, holder: PlayerId): number {
  switch (axis) {
    case 'detonations': return t.detonations;
    case 'falls': return t.falls;
    case 'boundKills': return t.boundKills[holder];
    case 'threadSpent': return t.threadSpent;
    case 'kindledConsumed': return t.kindledConsumed;
    case 'linksFired': return t.linksFired;
    case 'momentumSpent': return t.momentumSpent;
    case 'resonances': return t.resonances;
  }
}

/** The growth step a def sits at: linear growers report the BONUS, tiered
 *  growers the count of tiers reached. 0 = ungrown. */
export function growthStep(state: GameState, def: CardDef, holder: PlayerId): number {
  const g = def.growsWith;
  if (!g || !state.tallies) return 0;
  const v = tallyAxisValue(state.tallies, g.axis, holder);
  if (g.tiers) return g.tiers.filter((t) => v >= t.at).length;
  return Math.min(g.cap ?? 0, Math.floor(v / (g.per ?? 1)) * (g.amount ?? 0));
}

/** S9d.3 auto-render: one clause per effect op. Growers regenerate their
 *  whole card text from effective ops — a grown card can never lie. */
export function opClause(e: EffectOp): string {
  switch (e.op) {
    case 'damage': return `Deal ${e.amount}${(e.times ?? 1) > 1 ? ` ${e.times === 2 ? 'twice' : `${e.times} times`}` : ''}.`;
    case 'damageAll': return `Deal ${e.amount} to ALL enemies.`;
    case 'block': return `Gain ${e.amount} Block.`;
    case 'partnerBlock': return `Your partner gains ${e.amount} Block.`;
    case 'momentum': return `Gain ${e.amount} Momentum.`;
    case 'thread': return `Gain ${e.amount} Thread.`;
    case 'draw': return `Draw ${e.amount}.`;
    case 'partnerDraw': return `Your partner draws ${e.amount}.`;
    case 'heal': return `Heal ${e.amount}.`;
    case 'partnerHeal': return `Your partner heals ${e.amount}.`;
    case 'kindled': return `Gain Kindled ${e.amount}.`;
    case 'partnerKindled': return `Your partner gains Kindled ${e.amount}.`;
    case 'taunt': return 'Bind the target to you.';
    case 'detonate': return 'max' in e && e.max !== undefined ? `Detonate up to ${e.max} Hexes on the target.` : 'Detonate.';
    case 'hex': return `Apply ${e.amount} Hex.`;
    case 'hexAll': return `Apply ${e.amount} Hex to ALL enemies.`;
    case 'weak': return `Apply ${e.amount} Weak.`;
    case 'weakAll': return `Apply ${e.amount} Weak to all.`;
    default: return '';
  }
}

/** Render base-op clauses, merging same-op amount pairs first so a tier's
 *  added `draw 1` over a base `draw 1` reads "Draw 2." (mechanics stay two
 *  ops — the merge is display-only and value-exact). */
function renderBase(ops: EffectOp[]): string {
  const merged: EffectOp[] = [];
  for (const e of ops) {
    const prior = merged.find((m) => m.op === e.op && 'amount' in m && 'amount' in e
      && (m as { times?: number }).times === (e as { times?: number }).times);
    if (prior && 'amount' in prior && 'amount' in e) {
      (prior as { amount: number }).amount += e.amount as number;
    } else {
      merged.push(JSON.parse(JSON.stringify(e)));
    }
  }
  return merged.map(opClause).filter(Boolean).join(' ');
}

/** S9d.2: the def a grower resolves and renders with — effectiveDef plus the
 *  tally. Linear growers patch the first `appliesTo` base op and regenerate
 *  text; tiered growers append their added ops and swap links. Non-growers
 *  (and tally-less unflagged runs, where growers cannot exist) pass through
 *  untouched. */
export function grownDef(state: GameState, inst: CardInstance, holder: PlayerId): CardDef {
  return applyGrowth(effectiveDef(inst), state.tallies, holder);
}

/** The growth application itself, shared by grownDef, the bot's defOf, and
 *  the client's card rendering. */
export function applyGrowth(def: CardDef, tallies: RunTallies | undefined, holder: PlayerId): CardDef {
  const g = def.growsWith;
  if (!g || !tallies) return def;
  const v = tallyAxisValue(tallies, g.axis, holder);
  if (g.tiers) {
    let base = def.base;
    let link = def.link;
    for (const t of g.tiers) {
      if (v < t.at) break; // ascending
      if (t.addBase) base = [...base, ...t.addBase];
      if (t.link !== undefined) link = t.link;
    }
    if (base === def.base && link === def.link) return def;
    const text = `${renderBase(base)}${link ? ` Link (${link.condition}): ${link.text}` : ''}`;
    return { ...def, base, link, text, grownStep: g.tiers!.filter((t) => v >= t.at).length };
  }
  const bonus = Math.min(g.cap ?? 0, Math.floor(v / (g.per ?? 1)) * (g.amount ?? 0));
  if (bonus <= 0) return def;
  let patched = false;
  const base = def.base.map((e) => {
    if (!patched && e.op === g.appliesTo && 'amount' in e) {
      patched = true;
      return { ...e, amount: (e.amount as number) + bonus };
    }
    return e;
  });
  if (!patched) return def;
  const text = `${renderBase(base)}${def.link ? ` Link (${def.link.condition}): ${def.link.text}` : ''}`;
  return { ...def, base, text, grownStep: bonus };
}

/** Tally increment — a no-op on unflagged runs (tallies absent), so every
 *  call site is parity-safe by construction. */
export function bumpTally(state: GameState, axis: Exclude<GrowthAxis, 'boundKills'>, n = 1): void {
  if (!state.tallies || n <= 0) return;
  state.tallies[axis] += n;
}

/** S9b.1-3: the shape a Reclaimed card ARRIVES in — one source of truth for
 *  the reducer's echo construction and the client's reclaim-list preview
 *  (arrival cost, Quickening marker). Mutation precedence over the upgrade
 *  overlay lives in effectiveDef, not here. */
export function reclaimEchoShape(
  actor: PlayerState, defId: string,
): Pick<CardInstance, 'defId' | 'echo' | 'mutated' | 'upgraded'> {
  const def = CARDS[defId];
  return {
    defId,
    echo: true,
    mutated: !!def.mutation,
    // S8.1 Quickening: what returns through you comes back more alive
    ...(hasPassive(actor, 'reclaimUpgraded') && def.upgrade ? { upgraded: true } : {}),
  };
}

export function hasPassive(player: PlayerState, passive: PassiveId): boolean {
  if (player.relics.some((r) => RELICS_BY_ID[r]?.passives?.includes(passive))) return true;
  // S7/S8.1: birth-rite passives ride the relic slot semantics (never dormant)
  if ((player.rites ?? []).some((r) => RITES_BY_ID[r]?.passives?.includes(passive))) return true;
  if (player.fallen) return false; // powers go dormant while Fallen (M2-A3)
  return player.powers.some((p) => POWERS[p]?.passives?.includes(passive));
}

// ---------------------------------------------------------------------------
// Hooks (M2-B2): powers + relics share one event system.
// ---------------------------------------------------------------------------

export function runHooks(state: GameState, holder: PlayerId, event: HookEvent): void {
  const p = state.players[holder];
  const sources: Array<{ id: string; name: string; hooks?: { on: HookEvent; effects: HookOp[]; oncePerTurn?: boolean; oncePerCombat?: boolean }[] }> = [
    ...p.relics.map((r) => RELICS_BY_ID[r]).filter(Boolean),
    // S7/S8.1: birth-rite hooks — hidden-relic semantics, never dormant
    ...(p.rites ?? []).map((r) => RITES_BY_ID[r]).filter(Boolean),
    ...(p.fallen ? [] : p.powers.map((pw) => POWERS[pw]).filter(Boolean)),
  ];
  for (const src of sources) {
    for (const hook of src.hooks ?? []) {
      if (hook.on !== event) continue;
      // PT2/OQ#29 (Loom ruling): oncePerTurn hooks spend their charge here
      if (hook.oncePerTurn && state.combat) {
        const key = `${holder}:${src.id}:${hook.on}`;
        const fired = (state.combat.hookOnceFired ??= []);
        if (fired.includes(key)) continue;
        fired.push(key);
      }
      // S7.1: oncePerCombat charges never recharge mid-combat ('first X
      // each combat' — the rite-table pattern)
      if (hook.oncePerCombat && state.combat) {
        const key = `${holder}:${src.id}:${hook.on}`;
        const fired = (state.combat.hookCombatFired ??= []);
        if (fired.includes(key)) continue;
        fired.push(key);
      }
      for (const eff of hook.effects) {
        // Playtest 2: relic-sourced Thread gains were invisible — the pool
        // moved mid-resolution and the math "didn't match". Name the source.
        if (eff.op === 'thread') {
          const before = state.thread;
          applyHookOp(state, p, eff);
          const gained = state.thread - before;
          if (gained > 0) state.log.push({ e: 'info', detail: `${src.name}: +${gained} Thread` });
          continue;
        }
        applyHookOp(state, p, eff);
      }
    }
  }
}

export function applyHookOp(state: GameState, p: PlayerState, eff: HookOp): void {
  const partner = state.players[otherPlayer(p.id)];
  switch (eff.op) {
    case 'block': p.block += eff.amount; blockTelemetry(state, p.id, eff.amount); break;
    case 'partnerBlock': partner.block += eff.amount; blockTelemetry(state, partner.id, eff.amount); break;
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

/** S14.2 (B14): the ONE link computation, pure over aligned defs/owners —
 *  resolution, the client preview, and bot planning all call this (the
 *  three hand-rolled copies in bot-policy drifted: Choir Silence
 *  blindness was the bug the duplication caused). */
export function computeLinksFiredFrom(
  defs: readonly CardDef[], owners: readonly PlayerId[], severed: boolean, silenceFirst: boolean,
): boolean[] {
  const fired = defs.map((def, i) => {
    if (i === 0 || !def.link) return false;
    // a severed Thread carries no links between the two of you (§6)
    if (severed && owners[i - 1] !== owners[i]) return false;
    if (def.link.condition === 'partner') return owners[i - 1] !== owners[i];
    if (def.link.condition === 'any') return true;
    return defs[i - 1].tag === def.link.condition;
  });
  // S10a Choir Silence: while it stands, the FIRST link each turn doesn't
  // fire (a held pause). Computed here so every caller shows the truth;
  // a Pulse still punches through (forcing happens downstream of this).
  if (silenceFirst) {
    const first = fired.findIndex(Boolean);
    if (first >= 0) fired[first] = false;
  }
  return fired;
}

/** S14.2 (B14): does a standing enemy hold the first link? Shared by the
 *  engine path and bot planning (bots read the same redacted enemy list). */
export function silencesFirstLinkActive(enemies: readonly { hp: number; defId: string }[] | undefined): boolean {
  return !!enemies?.some((e) => e.hp > 0 && ENEMIES[e.defId]?.silencesFirstLink);
}

export function computeLinksFired(state: GameState, chain: ChainSlot[]): boolean[] {
  return computeLinksFiredFrom(
    chain.map((slot) => effectiveDef(mustFind(state, slot))),
    chain.map((slot) => slot.owner),
    (state.combat?.severedTurns ?? 0) > 0, // Unraveled (§6)
    silencesFirstLinkActive(state.combat?.enemies),
  );
}

/** S9c.6: the size of the PRIMARY effect a slot will resolve with (link
 *  replacement respected) — the "note" Resonance rung ii compares. Multi-hit
 *  primaries count their total (amount × times); primaries without a flat
 *  amount (e.g. damagePerHex) read 0 and defer to the tie-break. */
export function primaryMagnitude(def: CardDef, fired: boolean): number {
  const effects: EffectOp[] =
    fired && def.link
      ? def.link.replace ? def.link.effects : [...def.base, ...def.link.effects]
      : def.base;
  let best = 0;
  for (const e of effects) {
    if ((e as { primary?: boolean }).primary && 'amount' in e) {
      const v = (e.amount as number) * ((e as { times?: number }).times ?? 1);
      if (v > best) best = v;
    }
  }
  return best;
}

/** S9c.6 rung ii ("the loudest note carries"): a qualifying streak ignites
 *  its LARGEST primary effect, not its last slot; ties go to the latest
 *  slot among the tied (which also reproduces the old last-slot behavior
 *  when nothing in the streak scales). `defAt` resolves a slot's effective
 *  card — resolution, previews, bots, and the client MUST pass the same
 *  resolver so preview==reality holds by construction. */
export function computeResonanceSlots(
  chain: ChainSlot[], fired: boolean[], defAt: (slot: ChainSlot) => CardDef,
): Set<number> {
  const out = new Set<number>();
  let i = 0;
  while (i < chain.length) {
    if (!fired[i]) { i++; continue; }
    let j = i;
    while (j + 1 < chain.length && fired[j + 1]) j++;
    const runLen = j - i + 1;
    if (runLen >= 3) {
      const owners = new Set<PlayerId>();
      // i can be 0 when slot 0's link was Pulse-forced (§14.12)
      for (let k = Math.max(0, i - 1); k <= j; k++) owners.add(chain[k].owner);
      if (owners.size === 2) { // solo streaks never ignite (§2.3)
        let pick = j;
        let best = -1;
        // candidates are the FIRED slots (ignition sits on a fired link,
        // as before); >= walks ascending, so ties land on the latest
        for (let k = i; k <= j; k++) {
          const v = primaryMagnitude(defAt(chain[k]), fired[k]);
          if (v >= best) { best = v; pick = k; }
        }
        out.add(pick);
      }
    }
    i = j + 1;
  }
  return out;
}

/** §14.12 Pulse: declared pulses force a staged card's dead Link — it counts
 *  as fired when it resolves (and toward Resonance). Returns the per-slot
 *  forced flags; combine with computeLinksFired for the effective fired set.
 *  §11-sanctioned static helper, shared by resolution and the client preview. */
export function computeForcedLinks(state: GameState, chain: ChainSlot[], fired: boolean[]): boolean[] {
  const pulsed = new Set(
    (state.combat?.threadActions ?? [])
      .filter((t) => t.kind === 'pulse' && t.targetId)
      .map((t) => t.targetId!),
  );
  return chain.map((slot, i) => {
    if (fired[i] || !pulsed.has(slot.cardInstanceId)) return false;
    return !!effectiveDef(mustFind(state, slot)).link;
  });
}

/** Static planning preview (§11-sanctioned, like computeLinksFired): the
 *  Block each player would gain from the chain as currently staged —
 *  base + fired-link effects (Pulse-forced links included, §14.12), with
 *  Resonance scaling mirrored from resolution. An ESTIMATE: hooks
 *  (relics/powers) excluded. */
export function computePlannedBlock(state: GameState): Record<PlayerId, number> {
  const out: Record<PlayerId, number> = { p1: 0, p2: 0 };
  const combat = state.combat;
  if (!combat) return out;
  const chain = combat.chain;
  const natural = computeLinksFired(state, chain);
  const forced = computeForcedLinks(state, chain, natural);
  const fired = natural.map((f, i) => f || forced[i]);
  const resonance = computeResonanceSlots(chain, fired, (slot) => grownDef(state, mustFind(state, slot), slot.owner));
  for (let i = 0; i < chain.length; i++) {
    const slot = chain[i];
    const def = grownDef(state, mustFind(state, slot), slot.owner); // S9d: tally included
    const effects: EffectOp[] =
      fired[i] && def.link
        ? def.link.replace ? def.link.effects : [...def.base, ...def.link.effects]
        : def.base;
    for (const eff of effects) {
      if (eff.op === 'block') {
        let v = eff.amount;
        if (eff.primary && resonance.has(i)) v = Math.ceil(v * 1.5);
        out[slot.owner] += v;
      } else if (eff.op === 'partnerBlock') {
        out[otherPlayer(slot.owner)] += eff.amount;
      }
    }
  }
  return out;
}

/** Static planning preview (§11-sanctioned, like computePlannedBlock): the HP
 *  loss each enemy would take from the chain as currently staged, keyed by
 *  enemy id. Mirrors the resolution math (targeting, Momentum first-hit +
 *  halving, Weak/Vulnerable, Block absorption, Hex apply/double, detonation,
 *  Resonance scaling) over WORKING COPIES — the real state is never touched.
 *  An ESTIMATE: relic/power hooks (e.g. Cracked Bell's on-detonate splash) and
 *  the rare per-hit-Momentum rider are excluded, so it can read slightly low. */
export function computePlannedDamage(state: GameState): Record<string, number> {
  const dealt: Record<string, number> = {};
  const combat = state.combat;
  if (!combat) return dealt;
  const chain = combat.chain;
  const natural = computeLinksFired(state, chain);
  const forced = computeForcedLinks(state, chain, natural);
  const fired = natural.map((f, i) => f || forced[i]);
  const resonance = computeResonanceSlots(chain, fired, (slot) => grownDef(state, mustFind(state, slot), slot.owner));

  // working copies — forecasting must not mutate authoritative state
  const enemies = combat.enemies.map((e) => ({
    id: e.id, defId: e.defId, hp: e.hp, block: e.block, hex: e.hex, vulnerable: e.vulnerable, untargetable: e.untargetable,
  }));
  const mom: Record<PlayerId, number> = { p1: state.players.p1.momentum, p2: state.players.p2.momentum };
  const weak: Record<PlayerId, number> = { p1: state.players.p1.statuses.weak, p2: state.players.p2.statuses.weak };
  const living = () => enemies.filter((e) => e.hp > 0);
  const targetable = () => living().filter((e) => !e.untargetable);
  const retarget = (id?: string) => targetable().find((e) => e.id === id) ?? targetable()[0];
  type E = (typeof enemies)[number];
  const hit = (owner: PlayerId, tgt: E, raw: number): void => {
    let amt = raw;
    if (weak[owner] > 0) amt = Math.floor(amt * 0.75);
    if (tgt.vulnerable > 0) amt = Math.floor(amt * 1.5);
    // S10a Bell Wretch, Cracked — parity with hitEnemy (preview == reality)
    const cracked = ENEMIES[tgt.defId]?.crackedByResonance;
    if (cracked && combat.resonatedLastTurn && amt > 0) amt += cracked;
    if (amt < 0) amt = 0;
    const blocked = Math.min(tgt.block, amt);
    tgt.block -= blocked;
    const hpLoss = Math.min(tgt.hp, amt - blocked);
    tgt.hp -= hpLoss;
    dealt[tgt.id] = (dealt[tgt.id] ?? 0) + hpLoss;
  };
  const burn = (tgt: E, stacks: number): void => {
    if (stacks <= 0) return;
    tgt.hex -= stacks;
    const hpLoss = Math.min(tgt.hp, stacks * DETONATION_DAMAGE); // detonation ignores Block
    tgt.hp -= hpLoss;
    dealt[tgt.id] = (dealt[tgt.id] ?? 0) + hpLoss;
  };

  for (let i = 0; i < chain.length; i++) {
    const slot = chain[i];
    const owner = slot.owner;
    const def = grownDef(state, mustFind(state, slot), slot.owner); // S9d: tally included
    const res = resonance.has(i);
    const sc = (amt: number, primary?: boolean): number => (primary && res ? Math.ceil(amt * 1.5) : amt);
    const effects: EffectOp[] =
      fired[i] && def.link ? (def.link.replace ? def.link.effects : [...def.base, ...def.link.effects]) : def.base;
    let momSpent = false;
    let keepMomentum = false; // mirrors resolution: momentumStrikeBonus(keepMomentum) skips the halve
    let detonated = 0;
    for (const eff of effects) {
      switch (eff.op) {
        case 'damage': {
          const first = retarget(slot.targetId);
          if (!first) break;
          for (let t = 0; t < (eff.times ?? 1); t++) {
            const tgt = retarget(first.id);
            if (!tgt) break;
            let amt = sc(eff.amount, eff.primary);
            if (def.tag === 'Strike' && t === 0 && !momSpent && mom[owner] > 0) { amt += mom[owner]; momSpent = true; }
            hit(owner, tgt, amt);
          }
          break;
        }
        case 'damageAll': {
          let used = false;
          for (const tgt of targetable()) {
            let amt = sc(eff.amount, eff.primary);
            if (def.tag === 'Strike' && !momSpent && mom[owner] > 0) { amt += mom[owner]; used = true; }
            hit(owner, tgt, amt);
          }
          if (used) momSpent = true;
          break;
        }
        case 'damagePerHex': {
          const tgt = retarget(slot.targetId);
          if (!tgt) break;
          let amt = Math.min(sc(eff.base + eff.perHex * tgt.hex, eff.primary), eff.max ?? Infinity);
          if (def.tag === 'Strike' && !momSpent && mom[owner] > 0) { amt += mom[owner]; momSpent = true; }
          hit(owner, tgt, amt);
          break;
        }
        case 'momentumStrikeBonus': {
          const tgt = retarget(slot.targetId);
          if (tgt) hit(owner, tgt, mom[owner] * eff.mult);
          momSpent = true;
          if (eff.keepMomentum) keepMomentum = true;
          break;
        }
        case 'detonate': {
          const tgt = retarget(slot.targetId);
          if (tgt) { const s = Math.min(tgt.hex, eff.max ?? tgt.hex); detonated += s; burn(tgt, s); }
          break;
        }
        case 'detonateAllEnemies':
          for (const tgt of living()) { detonated += tgt.hex; burn(tgt, tgt.hex); }
          break;
        case 'damagePerDetonated': {
          const tgt = retarget(slot.targetId);
          if (tgt && detonated > 0) hit(owner, tgt, detonated * eff.per);
          break;
        }
        case 'hex': { const tgt = retarget(slot.targetId); if (tgt) tgt.hex += sc(eff.amount, eff.primary); break; }
        case 'hexAll': for (const tgt of living()) tgt.hex += sc(eff.amount, eff.primary); break;
        case 'doubleHex': { const tgt = retarget(slot.targetId); if (tgt) tgt.hex += Math.min(tgt.hex, DOUBLE_HEX_CAP); break; }
        case 'vulnerable': {
          const tgt = retarget(slot.targetId);
          if (!tgt) break;
          tgt.vulnerable += eff.amount;
          // S10a Descant Mote echo — parity with applyEnemyDebuff
          for (const mote of living()) {
            if (mote.id !== tgt.id && ENEMIES[mote.defId]?.echoesDebuffs) mote.vulnerable += eff.amount;
          }
          break;
        }
        case 'momentum': mom[owner] += sc(eff.amount, eff.primary); break;
        default: break; // non-damaging ops don't affect the enemy-damage forecast
      }
    }
    // S10a Votive Snuffer — parity with the resolution's per-fired-link Block
    // (granted after the firing card's own effects, absorbing LATER hits)
    if (fired[i]) {
      for (const en of living()) {
        const b = ENEMIES[en.defId]?.blockOnLinkFire;
        if (b) en.block += b;
      }
    }
    if (def.tag === 'Strike' && momSpent && !keepMomentum && !hasPassive(state.players[owner], 'momentumNoHalve')) {
      // S8.1 Hearth-Keeper: the halving IS the decay — keep up to 3 instead
      mom[owner] = hasPassive(state.players[owner], 'momentumCarry3')
        ? Math.max(Math.floor(mom[owner] / 2), Math.min(mom[owner], 3))
        : Math.floor(mom[owner] / 2);
    }
  }
  return dealt;
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

/** S10a Descant Mote: single-target Weak/Vulnerable lands on the target AND
 *  echoes onto every OTHER living mote (a follower's echo — rewards debuff
 *  spread). Echoes never re-echo: the copy is applied directly. */
function applyEnemyDebuff(state: GameState, enemy: EnemyState, kind: 'weak' | 'vulnerable', amount: number): void {
  enemy[kind] += amount;
  for (const mote of livingEnemies(state)) {
    if (mote.id === enemy.id || !ENEMIES[mote.defId]?.echoesDebuffs) continue;
    mote[kind] += amount;
    state.log.push({ e: 'enemy_action', enemy: mote.id, detail: `echoes the ${kind === 'weak' ? 'Weak' : 'Vulnerable'} laid on ${ENEMIES[enemy.defId].name}` });
  }
}

/** Choristers (§6): members share one HP pool — HP loss syncs the group. */
function applyEnemyHpLoss(state: GameState, enemy: EnemyState, hpLoss: number, _why: string): void {
  const wasAlive = enemy.hp > 0;
  enemy.hp = Math.max(0, enemy.hp - hpLoss);
  if (ENEMIES[enemy.defId]?.chorus) {
    for (const other of state.combat!.enemies) {
      if (other.id === enemy.id || !ENEMIES[other.defId]?.chorus) continue;
      const otherWasAlive = other.hp > 0;
      other.hp = enemy.hp;
      // a synced member's death must be witnessed too — the theater keys its
      // dissolve on enemy_dead per instance. (Death hooks deliberately fire
      // only for the struck member; no chorus def carries one today.)
      if (otherWasAlive && other.hp <= 0) state.log.push({ e: 'enemy_dead', enemy: other.id });
    }
  }
  if (wasAlive && enemy.hp <= 0) state.log.push({ e: 'enemy_dead', enemy: enemy.id });
  if (wasAlive && enemy.hp <= 0) onEnemyDeath(state, enemy);
}

/** S10a death hooks — fire exactly once, on the hit that crosses to 0. */
function onEnemyDeath(state: GameState, enemy: EnemyState): void {
  // S9d: Vigil's axis — dying Bound to a seat is that SEAT's tally
  if (state.tallies && enemy.boundTo) state.tallies.boundKills[enemy.boundTo]++;
  const def = ENEMIES[enemy.defId];
  // Tithe-Taker: a Thread-economy fight with a payoff
  if (def.threadOnDeath) {
    // PT2/OQ#32 honest-gain convention: log what actually arrived — the cap
    // can swallow the refund, and the log must not lie (M2-D2)
    const before = state.thread;
    gainThread(state, def.threadOnDeath);
    const gained = state.thread - before;
    if (gained > 0) state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `the tithe returns — +${gained} Thread` });
  }
  // Half-Carried: the cargo comes apart — tests AoE vs chain sequencing.
  // Spawns inherit the parent's binding and arrive stunned for one turn
  // (they right themselves before acting — no same-phase surprise).
  if (def.splitsOnDeath) {
    const sdef = ENEMIES[def.splitsOnDeath.defId];
    const mods = ascensionMods(state.ascension);
    for (let k = 0; k < def.splitsOnDeath.count; k++) {
      const roll = rngInt(state.rng, sdef.hp[1] - sdef.hp[0] + 1);
      state.rng = roll.state;
      const hp = mods.hpScale === 1 ? sdef.hp[0] + roll.value : Math.round((sdef.hp[0] + roll.value) * mods.hpScale);
      const start = rngInt(state.rng, sdef.script.length);
      state.rng = start.state;
      state.combat!.enemies.push({
        id: `e${state.combat!.enemies.length}_${sdef.id}`,
        defId: sdef.id,
        hp, maxHp: hp,
        block: 0, hex: 0, weak: 0, vulnerable: 0, stun: 1, strength: 0,
        boundTo: enemy.boundTo ?? (k % 2 === 0 ? 'p1' : 'p2'),
        untargetable: false,
        scriptIndex: start.value,
        intent: scaleIntent(sdef.script[start.value], mods.dmgScale),
      });
    }
    state.log.push({ e: 'info', detail: `The ${def.name} comes apart — what it carried was never one thing.` });
  }
}

/** Player-sourced hit. Returns total damage dealt (for telemetry). */
function hitEnemy(state: GameState, attacker: PlayerState, enemy: EnemyState, raw: number): number {
  let amt = raw;
  if (attacker.statuses.weak > 0) amt = Math.floor(amt * 0.75);
  if (enemy.vulnerable > 0) amt = Math.floor(amt * 1.5);
  // S10a Bell Wretch, Cracked: the harmony hurts it — flat bonus on every
  // hit the turn after a Resonance ignition (flag holds LAST turn's value
  // during this card loop; it flips after the loop)
  const cracked = ENEMIES[enemy.defId]?.crackedByResonance;
  if (cracked && state.combat?.resonatedLastTurn && amt > 0) amt += cracked;
  if (amt < 0) amt = 0;
  const blocked = Math.min(enemy.block, amt);
  enemy.block -= blocked;
  const hpLoss = Math.min(enemy.hp, amt - blocked);
  // M2-D2: the log must not lie — post-block HP loss + blocked, separately.
  // The hit is logged BEFORE the hp loss applies so the killing blow's beat
  // plays before enemy_dead (the theater dissolves on enemy_dead).
  state.log.push({ e: 'damage', target: enemy.id, hpLoss, blocked });
  applyEnemyHpLoss(state, enemy, hpLoss, 'attack');
  return amt;
}

/** Detonation (§4): 3 damage per stack, ignores Block (OQ#5 confirmed). */
function detonate(state: GameState, enemy: EnemyState, maxStacks?: number, by?: PlayerId): number {
  const stacks = Math.min(enemy.hex, maxStacks ?? enemy.hex);
  if (stacks <= 0) return 0;
  enemy.hex -= stacks;
  const dmg = stacks * DETONATION_DAMAGE;
  // the burst's beat plays before enemy_dead (see hitEnemy)
  state.log.push({ e: 'detonate', target: enemy.id, stacks, damage: dmg });
  applyEnemyHpLoss(state, enemy, dmg, 'detonate');
  state.telemetry.damageByTag.Hex = (state.telemetry.damageByTag.Hex ?? 0) + dmg;
  state.telemetry.detonatedStacks += stacks;
  state.telemetry.detonationEvents = (state.telemetry.detonationEvents ?? 0) + 1;
  bumpTally(state, 'detonations'); // S9d: Knell's axis
  if (by) state.telemetry.damageByPlayer[by] += dmg;
  turnDamage += dmg;
  runHooks(state, 'p1', 'detonate');
  runHooks(state, 'p2', 'detonate');
  return stacks;
}

/** M2-B1 Hex rebalance lever 2: raised 3 → 4 after sim baselining (Part C). */
export const DETONATION_DAMAGE = 4;
export const DOUBLE_HEX_CAP = 6; // S5.1: doubling adds at most +6 — the engine goes linear past 6 (OQ#28/#43)

function gainThread(state: GameState, amount: number): void {
  state.thread = Math.min(state.threadMax, state.thread + amount);
}

export function spendThread(state: GameState, cost: number): void {
  state.thread -= cost;
  // S4.4 A4 (provisional): the Fray line moves up one — spending the pool to
  // exactly 0 already frays. A0–A3 keep the classic below-zero trigger.
  if (state.thread < ascensionMods(state.ascension).frayThreshold) {
    if (state.thread < 0) state.thread = 0;
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
    const drawnId = player.draw.shift()!;
    player.hand.push(drawnId);
    // S9c.2: the Witness NAMES a rite card the first time it is drawn each
    // run (existence-naming; the single-line pool's no-repeat IS the fence).
    // Rite cards exist only in rites-flagged runs — unflagged rng untouched.
    const drawnInst = findInstance(player, drawnId);
    if (drawnInst && CARDS[drawnInst.defId]?.riteOnly) {
      sayWitness(state, `rite_first_draw_${drawnInst.defId}`);
    }
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
  detonatedStacks: number;
  momentumSpent: boolean;
  keepMomentum: boolean;
  momentumPerHit: boolean;
}

function scale(ctx: CardContext, amount: number, primary: boolean | undefined): number {
  if (!primary) return amount;
  return ctx.resonance ? Math.ceil(amount * 1.5) : amount;
}

/** S3.1 per-character split: block gained, whoever sourced it. */
function blockTelemetry(state: GameState, recipient: PlayerId, amount: number): void {
  state.telemetry.blockByPlayer[recipient] += amount;
}

function dmgTelemetry(state: GameState, tag: string, dealt: number, player?: PlayerId): void {
  state.telemetry.damageByTag[tag] = (state.telemetry.damageByTag[tag] ?? 0) + dealt;
  if (player) state.telemetry.damageByPlayer[player] += dealt;
  turnDamage += dealt;
}

/** accumulator for the biggest-single-turn stat; reset/flushed by resolveTurn */
let turnDamage = 0;

function applyMomentum(state: GameState, ctx: CardContext, amt: number, hitIndex: number): number {
  const { owner, def } = ctx;
  if (def.tag !== 'Strike' || owner.momentum <= 0) return amt;
  if (ctx.momentumPerHit) {
    if (!ctx.momentumSpent) bumpTally(state, 'momentumSpent', owner.momentum); // S9d: Mourner's axis (once per card)
    ctx.momentumSpent = true;
    return amt + owner.momentum; // M2-A4 rare design space
  }
  if (hitIndex === 0 && !ctx.momentumSpent) {
    ctx.momentumSpent = true;
    bumpTally(state, 'momentumSpent', owner.momentum); // S9d: Mourner's axis
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
        const amt = applyMomentum(state, ctx, scale(ctx, eff.amount, eff.primary), t);
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
      if (used && !ctx.momentumSpent) bumpTally(state, 'momentumSpent', ctx.owner.momentum); // S9d
      if (used) ctx.momentumSpent = true;
      break;
    }
    case 'damagePerHex': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy) return;
      const amt = applyMomentum(state, ctx, Math.min(scale(ctx, eff.base + eff.perHex * enemy.hex, eff.primary), eff.max ?? Infinity), 0);
      // M2-B1: hex-scaling damage gets its own attribution bucket
      dmgTelemetry(state, 'HexScaling', hitEnemy(state, owner, enemy, amt), owner.id);
      break;
    }
    case 'momentumStrikeBonus': {
      const enemy = retarget(state, ctx.targetId);
      if (!enemy) return;
      dmgTelemetry(state, tag, hitEnemy(state, owner, enemy, owner.momentum * eff.mult), owner.id);
      if (eff.keepMomentum) ctx.keepMomentum = true;
      if (!ctx.momentumSpent) bumpTally(state, 'momentumSpent', owner.momentum); // S9d
      ctx.momentumSpent = true;
      break;
    }
    case 'momentumPerHit':
      ctx.momentumPerHit = true; // ordered before the damage op by content convention
      break;
    case 'block': {
      const amt = scale(ctx, eff.amount, eff.primary);
      owner.block += amt;
      blockTelemetry(state, owner.id, amt);
      state.log.push({ e: 'block', target: owner.id, amount: amt }); // M2-D2: scaled value
      break;
    }
    case 'partnerBlock':
      partner.block += eff.amount;
      blockTelemetry(state, partner.id, eff.amount);
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
      if (enemy) enemy.hex += Math.min(enemy.hex, DOUBLE_HEX_CAP);
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
      if (enemy) applyEnemyDebuff(state, enemy, 'weak', eff.amount);
      break;
    }
    case 'weakAll':
      // all-target: every mote already receives it directly — no echo on top
      for (const enemy of livingEnemies(state)) enemy.weak += eff.amount;
      break;
    case 'vulnerable': {
      const enemy = retarget(state, ctx.targetId);
      if (enemy) applyEnemyDebuff(state, enemy, 'vulnerable', eff.amount);
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
    let cost = ta.kind === 'sever' ? 3 : ta.kind === 'steady' ? 1 : 2;
    switch (ta.kind) {
      case 'pulse': {
        // §14.12: the forcing itself happens in the link computation below;
        // here we pay, and say which card so the spend is legible to both.
        // §14.13 (OQ#27) Pulsekeeper's Ring: the owner's run-persistent
        // counter ticks on every Pulse they cast; each 3rd costs 1.
        let discounted = false;
        if (actor.relics.includes('pulsekeepers_ring')) {
          actor.ringPulses = (actor.ringPulses ?? 0) + 1;
          if (actor.ringPulses % 3 === 0) {
            cost = 1;
            discounted = true;
            state.telemetry.ringDiscountsFired++;
          }
        }
        spendThread(state, cost);
        const slot = combat.chain.find((s) => s.cardInstanceId === ta.targetId);
        if (slot) {
          const name = effectiveDef(mustFind(state, slot)).name;
          state.log.push({
            e: 'thread_action', player: ta.player, kind: 'pulse',
            detail: `pulses ${name} — its Link fires no matter what precedes it${discounted ? ' (the Ring kept count: 1 Thread)' : ''}`,
          });
        }
        break;
      }
      case 'reclaim': {
        spendThread(state, 2);
        const src = findInstance(partner, ta.targetId!);
        // S7.6 (OQ#38, ruled): partner's exhaust is a legal source alongside
        // the discard — everything downstream (echo, mutation, hooks) is
        // source-blind on purpose.
        if (!src || !(partner.discard.includes(ta.targetId!) || partner.exhaust.includes(ta.targetId!))) break;
        const echo: CardInstance = {
          instanceId: `echo_${src.instanceId}_t${combat.turn}_${actor.combatCards.length}`,
          ...reclaimEchoShape(actor, src.defId),
        };
        actor.combatCards.push(echo);
        if (actor.hand.length < 10) actor.hand.push(echo.instanceId);
        // S9c.3: the rite_reclaim pool — a rite passed hand to hand. At most
        // once per combat; rite cards exist only in rites-flagged runs.
        if (CARDS[src.defId]?.riteOnly && !combat.riteReclaimSaid) {
          combat.riteReclaimSaid = true;
          sayWitness(state, 'rite_reclaim');
        }
        // S8.1 Dowry-Bound: reclaiming a partner's card feeds the engine
        runHooks(state, ta.player, 'reclaim');
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
    // S3.1 thread economy: spend mix by action type (cost reflects any
    // Ring discount applied above)
    state.telemetry.threadSpent += cost;
    bumpTally(state, 'threadSpent', cost); // S9d: Votive's axis
    state.telemetry.threadSpendByKind[ta.kind]++;
    // S13.2 Stoker's Due: the pool is the PAIR's, so either seat's spend
    // stokes both seats' engines (each holder's oncePerTurn cap gates its
    // own). New event key — no pre-S13 content listens.
    runHooks(state, 'p1', 'threadSpend');
    runHooks(state, 'p2', 'threadSpend');
    if (ta.kind !== 'pulse') state.log.push({ e: 'thread_action', player: ta.player, kind: ta.kind });
  }

  // 2-3. Static link + Resonance computation (§2.3); §14.12: Pulse-forced
  // links count as fired — for effects, telemetry, and Resonance alike
  const chain = combat.chain;
  const natural = computeLinksFired(state, chain);
  const forcedSlots = computeForcedLinks(state, chain, natural);
  const fired = natural.map((f, i) => f || forcedSlots[i]);
  const resonanceSlots = computeResonanceSlots(chain, fired, (slot) => grownDef(state, mustFind(state, slot), slot.owner));
  combat.lastSoloRun = longestSoloRun(chain);
  const actStats = state.telemetry.actStats[act] ?? (state.telemetry.actStats[act] = emptyActStats());

  // 4. Resolve slots 1 → N
  for (let i = 0; i < chain.length; i++) {
    const slot = chain[i];
    const owner = state.players[slot.owner];
    const partner = state.players[otherPlayer(slot.owner)];
    const inst = mustFind(state, slot);
    const def = grownDef(state, inst, slot.owner); // S9d: the tally applies
    const resonance = resonanceSlots.has(i);
    // S9d.3: one log line when a rite crosses a growth step — the Machine's
    // bookkeeping, not the Witness's voice
    if (def.growsWith && state.tallies) {
      const step = growthStep(state, def, slot.owner);
      if (step > (state.tallies.seenStep[def.id] ?? 0)) {
        state.tallies.seenStep[def.id] = step;
        if (state.telemetry.rites) {
          (state.telemetry.rites.growth ??= {})[def.id] = step;
        }
        state.log.push({
          e: 'info',
          detail: `The Machine keeps its tally: ${def.name} ${def.growsWith.tiers ? `reaches its ${step === 1 ? 'first' : step === 2 ? 'second' : `${step}th`} mark` : `+${step}`}.`,
        });
      }
    }

    // S8.1 Cradle-Warden: the partner's link fired off YOUR card — +2 to the
    // linked effect (S9c.1 table: +1 → +2; never Hex ops: the OQ#28/OQ#43
    // caps are load-bearing)
    const wardenBoost =
      fired[i] && def.link && i > 0
      && chain[i - 1].owner !== slot.owner
      && hasPassive(state.players[chain[i - 1].owner], 'cradleWarden');
    const BUMPABLE = new Set(['damage', 'block', 'partnerBlock', 'draw', 'partnerDraw',
      'kindled', 'partnerKindled', 'momentum', 'thread', 'heal', 'partnerHeal']);
    const bump = (ops: EffectOp[], by: number): EffectOp[] => ops.map((e) =>
      BUMPABLE.has(e.op) && 'amount' in e ? { ...e, amount: (e.amount as number) + by } : e);
    const linkEffects = def.link ? (wardenBoost ? bump(def.link.effects, 2) : def.link.effects) : [];
    let effects: EffectOp[] =
      fired[i] && def.link
        ? def.link.replace
          ? linkEffects
          : [...def.base, ...linkEffects]
        : def.base;
    // S8.1 Naming-Day: your mutated cards' effects +2 (damage/block/heal
    // only — Hex growth is covenant-barred, draw/economy would be degenerate)
    if (inst.mutated && hasPassive(owner, 'namingDay')) {
      const NAMED = new Set(['damage', 'block', 'heal']);
      effects = effects.map((e) =>
        NAMED.has(e.op) && 'amount' in e ? { ...e, amount: (e.amount as number) + 2 } : e);
    }

    const ctx: CardContext = {
      owner, partner, slotIndex: i, targetId: slot.targetId, def, fired, resonance,
      detonatedStacks: 0, momentumSpent: false, keepMomentum: false, momentumPerHit: false,
    };

    state.log.push({ e: 'card', player: slot.owner, card: def.name, slot: i, linkFired: fired[i], resonance });
    if (state.botSeat) {
      // S2.1 solo chatter (capped per combat; no-op in co-op)
      if (slot.owner === state.botSeat) maybeSaySolo(state, 'own_play', 7);
      else if (fired[i] && i > 0 && chain[i - 1].owner === state.botSeat) maybeSaySolo(state, 'human_linked_off_me', 18);
    }
    if (resonance) {
      let start = i;
      while (start > 0 && fired[start]) start--;
      // S9c.6: the ignited slot can sit MID-streak now ("the loudest note
      // carries") — walk forward too so the logged streak is whole
      let end = i;
      while (end + 1 < chain.length && fired[end + 1]) end++;
      const streakTags = chain.slice(start, end + 1).map((s) => effectiveDef(mustFind(state, s)).tag);
      // S3.1: did this streak need a Pulse to exist?
      for (let k = start; k <= end; k++) {
        if (forcedSlots[k]) { state.telemetry.resonancesForced++; break; }
      }
      state.log.push({ e: 'resonance_ignite', slot: i, tags: streakTags, card: def.name });
      // S2.1: in solo the streak includes HIM — the closest he comes to joy
      sayWitness(state, state.botSeat ? 'resonance_together' : 'resonance');
      state.telemetry.resonances++;
      bumpTally(state, 'resonances'); // S9d: Descant's axis
      for (const t of streakTags) {
        state.telemetry.resonanceTagCounts[t] = (state.telemetry.resonanceTagCounts[t] ?? 0) + 1;
      }
      runHooks(state, 'p1', 'resonance');
      runHooks(state, 'p2', 'resonance');
    }

    const dmgBefore = state.telemetry.damageByPlayer[slot.owner];
    for (const eff of effects) applyEffect(state, ctx, eff);

    // S3.1: Worn Knife mean damage = the scaling floor's health stat (§14.11)
    if (inst.defId === 'worn_knife') {
      state.telemetry.wornKnife.plays++;
      state.telemetry.wornKnife.damage += state.telemetry.damageByPlayer[slot.owner] - dmgBefore;
      if (state.telemetry.wornKnife.plays === 1) sayWitness(state, 'worn_knife_first');
    }
    // §14.11: first Knuckle-Crack detonation per run — the 1-line pool
    // self-gates afterward (sayWitness returns pre-rng once exhausted)
    if (inst.defId === 'knuckle_crack' && ctx.detonatedStacks > 0) {
      sayWitness(state, 'knuckle_crack_first');
    }

    if (def.tag === 'Strike' && ctx.momentumSpent && !ctx.keepMomentum && !hasPassive(owner, 'momentumNoHalve')) {
      // S8.1 Hearth-Keeper: the halving IS the decay — keep up to 3 instead
      owner.momentum = hasPassive(owner, 'momentumCarry3')
        ? Math.max(Math.floor(owner.momentum / 2), Math.min(owner.momentum, 3))
        : Math.floor(owner.momentum / 2);
    }

    const hi = owner.hand.indexOf(slot.cardInstanceId);
    if (hi >= 0) owner.hand.splice(hi, 1);
    if (inst.echo || def.exhaust) owner.exhaust.push(slot.cardInstanceId);
    else owner.discard.push(slot.cardInstanceId);

    state.telemetry.cardsPlayed++;
    actStats.cardsPlayed++;
    // S14.1 (B23): per-card play attribution, starters included
    {
      const cell = (state.telemetry.cards.plays[inst.defId] ??= { p1: 0, p2: 0 });
      cell[slot.owner]++;
    }
    // OQ#57 instrument: rite-card play rate, the real measure (rites
    // telemetry exists only on flagged runs — zero unflagged footprint)
    if (state.telemetry.rites && RITE_CARD_IDS.has(inst.defId)) {
      (state.telemetry.rites.ritePlays ??= { p1: 0, p2: 0 })[slot.owner]++;
    }
    if (fired[i]) {
      state.telemetry.linksFired++;
      bumpTally(state, 'linksFired'); // S9d: Toll's axis
      state.telemetry.linkFiresByPlayer[slot.owner]++;
      if (forcedSlots[i]) state.telemetry.forcedLinkFires++; // §14.12
      actStats.linksFired++;
      runHooks(state, slot.owner, 'linkFired');
      // S13.2: cross-seat engines answer the PARTNER's fire (gravebloom,
      // call_and_answer). New event key — pre-S13 content carries no such
      // hook, so existing baselines are untouched.
      runHooks(state, otherPlayer(slot.owner), 'partnerLinkFired');
      // S10a Votive Snuffer: answers every fired link with Block — from this
      // moment on, so damage already dealt this chain stays dealt
      for (const en of livingEnemies(state)) {
        const bd = ENEMIES[en.defId];
        if (bd.blockOnLinkFire) {
          en.block += bd.blockOnLinkFire;
          state.log.push({ e: 'enemy_action', enemy: en.id, detail: `snuffs the answering spark (+${bd.blockOnLinkFire} Block)` });
        }
      }
    }
  }

  // S10a bookkeeping on the RESOLVED chain, set before the enemy phase:
  // The Unstrung reads this turn's harmony on its turn; Bell Wretch, Cracked
  // read it during the NEXT card loop (the turn after ignition).
  combat.resonatedLastTurn = resonanceSlots.size > 0;
  // Pall Warden: the last hand in the Chain
  if (chain.length > 0) {
    combat.lastChainOwner = chain[chain.length - 1].owner;
    // S13.2 Selvage: the chain-position payoff — the resolved Chain closed
    // on this seat's card (once per turn by construction; the hook's
    // oncePerTurn cap is belt-and-braces for the CI)
    runHooks(state, combat.lastChainOwner, 'chainClose');
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
    // S10a Pall Warden: follows the freshest grief — rebinds to whoever
    // played the LAST card in the resolved Chain (steerable churn)
    if (selfDef.rebindsToLastPlayed && enemy.boundTo !== null && combat.lastChainOwner
      && !state.players[combat.lastChainOwner].fallen && enemy.boundTo !== combat.lastChainOwner) {
      enemy.boundTo = combat.lastChainOwner;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `follows the last hand in the Chain — now bound to ${combat.lastChainOwner}` });
    }
    // S10a Mislaid Sexton: deterministic cadence, same contract as the §14.8
    // re-tether — every Nth turn the bound one's top discard is exhausted
    // (which opens it to the partner's Reclaim: the unburied change hands)
    if (selfDef.exhaustsDiscardEvery && combat.turn % selfDef.exhaustsDiscardEvery === 0) {
      const victim = boundPlayer(state, enemy);
      const top = victim.discard.pop();
      if (top) {
        victim.exhaust.push(top);
        const inst = findInstance(victim, top);
        const name = inst ? effectiveDef(inst).name : 'a card';
        state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `feeds on the unburied — ${victim.id}'s ${name} is exhausted` });
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
    // S4.4 A2: intents are stored scaled, so every displayed number is the
    // truth the hit will use (same contract as the §14.8 registry scales)
    enemy.intent = scaleIntent(def.script[enemy.scriptIndex], ascensionMods(state.ascension).dmgScale * (1 + (state.combat?.escalation ?? 0)));
    // nt-slice S6.5: the face's live mechanics override the script on their
    // fixed turns; hidden ones whisper one turn before their first firing
    applyBossMechanicIntent(state, enemy, combat.turn + 1);
  }
}

/** nt-slice S6.5: if `upcomingTurn` is a live-mechanic turn for the flagged
 *  finale boss, swap the mechanic in as the (fully visible, scaled) intent.
 *  Unrevealed mechanics telegraph exactly once, the turn before they first
 *  fire; revealed ones were named in the intent UI from the start. */
function applyBossMechanicIntent(state: GameState, enemy: EnemyState, upcomingTurn: number): void {
  if (!state.truth) return;
  const def = ENEMIES[enemy.defId];
  if (!def.boss || def.act !== 3) return;
  enemy.telegraph = null;
  const face = FACE_BY_ANSWER[state.truth.boss.faceAnswerId];
  state.truth.boss.liveMechanics.forEach((mechId, slot) => {
    const { first, period } = mechanicFireTurns(slot);
    if (upcomingTurn < first || (upcomingTurn - first) % period !== 0) return;
    const mech = face.mechanicPool.find((m) => m.id === mechId)!;
    enemy.intent = scaleIntent(mech.intent, ascensionMods(state.ascension).dmgScale * (1 + (state.combat?.escalation ?? 0)));
    const revealed = slot === 0 ? state.truth!.reveals.bossFace : state.truth!.reveals.bossMechanic;
    if (upcomingTurn === first && !revealed) {
      enemy.telegraph = mech.telegraphLine;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: mech.telegraphLine });
    }
  });
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
      // OQ#46: enemy-applied Fray takes hold at the start of the players' next
      // turn (so it actually bites — was wiped before it could)
      state.players.p1.pendingStatus.frayed++;
      state.players.p2.pendingStatus.frayed++;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `attacks ${bound.id} for ${intent.amount} — the Thread will FRAY next turn` });
      break;
    case 'read_chain':
      // S10a The Unstrung: a genuine dilemma reading the Chain just resolved
      if (state.combat!.resonatedLastTurn) {
        state.players.p1.pendingStatus.frayed += intent.fray;
        state.players.p2.pendingStatus.frayed += intent.fray;
        state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `heard the harmony — the Thread will FRAY next turn` });
      } else {
        for (let t = 0; t < 2; t++) hitPlayer(state, enemy, bound, intent.amount);
        state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `found no harmony to read — attacks ${bound.id} for ${intent.amount}×2` });
      }
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
      // OQ#46: enemy debuffs take hold next turn (see pendingStatus)
      bound.pendingStatus.weak += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `applies ${intent.amount} Weak to ${bound.id} (next turn)` });
      break;
    case 'debuff_vulnerable':
      bound.pendingStatus.vulnerable += intent.amount;
      state.log.push({ e: 'enemy_action', enemy: enemy.id, detail: `applies ${intent.amount} Vulnerable to ${bound.id} (next turn)` });
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
    if (state.combat) state.combat.hpLostThisCombat = (state.combat.hpLostThisCombat ?? 0) + hpLoss;
    const act = state.map.act;
    const actStats = state.telemetry.actStats[act] ?? (state.telemetry.actStats[act] = emptyActStats());
    actStats.hpLost += hpLoss;
    const encId = state.map.nodes.find((n) => n.id === state.map.position)?.encounterId;
    if (encId) {
      const encStats = (state.telemetry.encounterStats ??= {});
      (encStats[encId] ??= { combats: 0, hpLost: 0 }).hpLost += hpLoss;
    }
  }
  if (player.hp <= 0 && !player.fallen) fall(state, player);
}

/** M2-A3: down-but-not-out. */
function fall(state: GameState, player: PlayerState): void {
  player.fallen = true;
  player.block = 0;
  player.momentum = 0;
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
  let rebound = 0;
  if (state.combat) {
    for (const e of state.combat.enemies) {
      if (e.boundTo === player.id && e.hp > 0) {
        e.boundTo = survivor;
        rebound++;
      }
    }
  }
  state.telemetry.fallsByPlayer[player.id]++;
  bumpTally(state, 'falls'); // S9d: Shroud's axis
  state.log.push({ e: 'fallen', player: player.id });
  if (rebound > 0) {
    // say it out loud (playtest 1): the silent rebind undid a player's Sever
    // and read as "the boss ignored my sever" — a bug-shaped surprise
    state.log.push({ e: 'info', detail: `Every tether snaps to ${survivor} — nothing hunts the Fallen. Severed bindings are undone.` });
  }
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
  combat.hookOnceFired = []; // PT2/OQ#29: oncePerTurn hooks recharge

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
    const before = state.thread;
    gainThread(state, regen);
    // S3.1 thread economy: regen the cap ate (a high number = the pool idles)
    state.telemetry.regenWastedAtCap += regen - (state.thread - before);
  }

  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    const p = state.players[pid];
    if (p.fallen) {
      p.ready = true;
      continue;
    }
    p.block = 0;
    p.energy = p.energyMax + p.kindled; // M2-A2
    bumpTally(state, 'kindledConsumed', p.kindled); // S9d: Pyre-Brand's axis
    p.kindled = 0;
    p.ready = false;
    p.statuses.frayed = 0;
    if (p.statuses.weak > 0) p.statuses.weak--;
    if (p.statuses.vulnerable > 0) p.statuses.vulnerable--;
    // OQ#46: debuffs an enemy applied last turn activate NOW (after the
    // clear/decrement), so they live through this turn — Fray for the turn,
    // Weak/Vuln decrementing from here. Player-phase Fray (overdraft) already
    // landed directly on statuses and isn't double-counted.
    p.statuses.weak += p.pendingStatus.weak;
    p.statuses.vulnerable += p.pendingStatus.vulnerable;
    p.statuses.frayed += p.pendingStatus.frayed;
    p.pendingStatus = { weak: 0, vulnerable: 0, frayed: 0 };
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

/** S11.2 snarl escalation (ruling 2, STEEP): after each knot cut this act,
 *  the remaining knots tighten — cumulative +10% / +30% / +60% HP and DMG,
 *  scaled by TB_ELITE_ESCALATION. Cutting a snarl pulls the weave tighter
 *  everywhere else. */
export function escalationFactor(knotsCut: number): number {
  const LADDER = [0, 0.10, 0.30, 0.60];
  return LADDER[Math.min(knotsCut, LADDER.length - 1)] * ELITE_ESCALATION_SCALE;
}

export function startCombat(state: GameState, enemyDefIds: string[]): void {
  const enemies: EnemyState[] = [];
  // S4.4 A1/A2: ascension rungs stack multiplicatively on the §14.8 anchor.
  // Identity at A0 by construction (scale 1 short-circuits) — same rng draws,
  // same numbers, byte-equal combats.
  const mods = ascensionMods(state.ascension);
  // S11.2: elite fights carry the act's current escalation. No extra rolls;
  // factor 0 keeps the integer HP path (byte-equal non-elite combats).
  const esc = enemyDefIds.some((id) => ENEMIES[id]?.elite)
    ? escalationFactor(state.map?.knotsCut ?? 0) : 0;
  const hpScale = mods.hpScale * (1 + esc);
  const dmgScale = mods.dmgScale * (1 + esc);
  const first = rngInt(state.rng, 2);
  state.rng = first.state;
  const chorusIds = enemyDefIds.filter((id) => ENEMIES[id]?.chorus);
  let chorusSeen = 0;
  enemyDefIds.forEach((defId, i) => {
    const def = ENEMIES[defId];
    const roll = rngInt(state.rng, def.hp[1] - def.hp[0] + 1);
    state.rng = roll.state;
    const hp = hpScale === 1 ? def.hp[0] + roll.value : Math.round((def.hp[0] + roll.value) * hpScale);
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
      intent: scaleIntent(def.script[start.value], dmgScale),
    });
  });

  // nt-slice S6.5: the flagged finale boss wears its face. The opening index
  // is pinned to 0 (roll above still consumed — the flag adds no rolls) so
  // the all-true boon can honestly show the opening at the pre-boss rest.
  // Shrine reveals surface here as rendered strings only.
  if (state.truth) {
    for (const es of enemies) {
      const def = ENEMIES[es.defId];
      if (!def.boss || def.act !== 3) continue;
      es.scriptIndex = 0;
      es.intent = scaleIntent(def.script[0], mods.dmgScale);
      const face = FACE_BY_ANSWER[state.truth.boss.faceAnswerId];
      const lines: string[] = [];
      if (state.truth.reveals.bossFace) {
        es.nameOverride = face.realName;
        const m = face.mechanicPool.find((x) => x.id === state.truth!.boss.liveMechanics[0])!;
        lines.push(m.revealLine);
      }
      if (state.truth.reveals.bossMechanic) {
        const m = face.mechanicPool.find((x) => x.id === state.truth!.boss.liveMechanics[1])!;
        lines.push(m.revealLine);
      }
      if (lines.length > 0) es.revealedMechanics = lines;
      es.telegraph = null;
    }
  }

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
    hookOnceFired: [],
    // S11.2: carried so per-turn intent rescaling keeps the tightened DMG
    ...(esc > 0 ? { escalation: esc } : {}),
  };
  state.thread = 6; // §5
  state.phase = 'combat';

  const act = state.map.act;
  const actStats = state.telemetry.actStats[act] ?? (state.telemetry.actStats[act] = emptyActStats());
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
    p.pendingStatus = { weak: 0, vulnerable: 0, frayed: 0 }; // OQ#46
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
