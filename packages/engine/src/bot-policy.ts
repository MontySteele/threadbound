// Bot decision policy (§11, S1): pure state → intent, shared by every bot
// transport (the ws sim bot in @threadbound/bots and the server's in-process
// solo partner). Lives in the engine so the server can host a bot without a
// bots↔server package cycle. Reads engine CONTENT for lookups but never
// computes outcomes.
//
// Modes:
//   'sim'  — the paired-bot coordination floor. Its behavior is the seeded
//            50-run baseline (M3 review); DO NOT change sim-mode decisions or
//            roll purposes without re-baselining.
//   'solo' — S1.2 etiquette for partnering a human: stages early, readies
//            last, follows the human's map pick, takes the lower-variance
//            crossed choice, respects a shop gold floor, never initiates the
//            Wedding Knife.

import { Action, CardDef, EventOptionDef, GameState, PlayerId } from './types';
import { CARDS, EVENTS } from './content/registry';
import { unlockedRites } from './content/rites';
import { applyGrowth, computeLinksFiredFrom, computeResonanceSlots, escalationFactor, silencesFirstLinkActive } from './combat';
import { eventOptionAvailable, eventStageAt, removalPrice } from './reducer';
import { ClientTruthView } from './truth-view';

/** What a bot actually sees: the REDACTED per-seat view. In particular
 *  `truth` is the ClientTruthView projection (truth-view.ts), never the
 *  engine's TruthState — bots must not be able to read the hidden tuple. */
export interface BotView extends Omit<GameState, 'truth'> {
  you: PlayerId;
  counts: Record<PlayerId, { hand: number; draw: number }>;
  truth?: ClientTruthView;
}

export interface BotPolicyOptions {
  seed?: number;
  mode?: 'sim' | 'solo';
  /** sim-mode only: parity-gated planning. Defaults on (the determinism
   *  device for bot pairs); turn OFF when the sim policy partners a
   *  non-lockstep peer (e.g. the human seat in solo tests) or both sides
   *  stall waiting for each other's slot. */
  lockstep?: boolean;
  /** S7.7 SIM-ONLY (TB_BOT_SEEK_EVENTS): prefer reachable EVENT nodes over
   *  the lowest-id rule so the battery can measure birth-rite timing.
   *  Default off; the server's solo driver must never set it — the solo
   *  bot follows the human's pick and this knob never applies there. */
  seekEvents?: boolean;
  /** S7.8 gate-5 sim accommodation (S6.2 precedent, clearly marked): flagged
   *  batteries only — occasionally Reclaim from the partner's piles so the
   *  engagement gate is measurable. NEVER set in production/solo. */
  reclaimNudge?: boolean;
  /** S13.1a SIM-ONLY (TB_BOT_SKIP_PICKS): forgo ALL card acquisition — reward
   *  picks, covets, shop card buys. The decomposition probe's skip-all leg,
   *  now a permanent knob. Never set in production/solo. */
  skipPicks?: boolean;
  /** S13.1a SIM-ONLY (TB_BOT_PICK_CAP=N): deck-SIZE ceiling — draft normally
   *  until deck.length >= STARTER_DECK_SIZE + N, then skip. Removals free
   *  slots back up (intentionally the dilution variable, not a pick counter);
   *  covets and shop card buys share the gate. Never set in production/solo. */
  pickCap?: number;
  /** S13.1b (TB_BOT_DRAFT_V2): draftScore v2. Learns (i) powers/engines +4,
   *  (ii) rare +3 (was +1), (iii) a dilution term (score − max(0, deckSize −
   *  16) × 0.4). ONE policy, no v1/v2 fork.
   *
   *  S13.6 — DEFAULT ON (D7 second half, designer-ruled 2026-07-04): flipped
   *  in its own loud re-anchor after v2's first clean battery (post-content
   *  v2 60% vs v1 50% same-environment; S13-ECONOMY-STATUS.md). v1 remains
   *  reachable via TB_BOT_DRAFT_V2=0 / draftV2:false as the instrumented
   *  comparison policy (gate-2 load-bearing rows) — never the default.
   *  Surface note: BotPolicy is shared with the server's in-process solo
   *  partner, so this flip changed real solo drafting — that was the
   *  decision, not a side effect. */
  draftV2?: boolean;
}

/** S13.1a: the true starter size the pick-cap gate anchors on. Pinned by
 *  test so a starter-deck change can't silently skew the deck-size sweep. */
export const STARTER_DECK_SIZE = 10;

/** S14.2 (B14): bot link-planning shares the engine's link computation —
 *  the drift bug this kills is Choir Silence blindness (bots staged into
 *  the held link and could never Pulse it). */
function linksFiredIn(view: BotView, defs: readonly CardDef[], owners: readonly PlayerId[]): boolean[] {
  const combat = view.combat!;
  return computeLinksFiredFrom(defs, owners, combat.severedTurns > 0, silencesFirstLinkActive(combat.enemies));
}

function defOf(view: BotView, owner: PlayerId, instanceId: string): CardDef {
  const p = view.players[owner];
  const inst =
    p.deck.find((c) => c.instanceId === instanceId) ??
    p.combatCards.find((c) => c.instanceId === instanceId);
  const def = CARDS[inst!.defId];
  // S9d: growers show the bot their grown numbers — first-pass policy
  // simply values the number in front of it (routing toward axes is
  // S11.9's problem, explicitly out of scope here)
  if (inst!.mutated && def.mutation) return applyGrowth({ ...def, base: def.mutation.base, link: def.mutation.link }, view.tallies, owner);
  if (inst!.upgraded && def.upgrade) {
    return applyGrowth({ ...def, cost: def.upgrade.cost ?? def.cost, base: def.upgrade.base ?? def.base, link: def.upgrade.link !== undefined ? def.upgrade.link : def.link }, view.tallies, owner);
  }
  return applyGrowth(def, view.tallies, owner);
}

function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export class BotPolicy {
  /** policy seed — decisions are STATE-PURE: hashed from (seed, situation,
   *  purpose), never a consumed stream, so transport timing and watchdog
   *  re-decides cannot change what the bot does in a given situation. */
  seed: number;
  readonly mode: 'sim' | 'solo';
  private lockstep: boolean;
  private seekEvents: boolean;
  private reclaimNudge: boolean;
  private skipPicks: boolean;
  private pickCap: number | undefined;
  private draftV2: boolean;
  private reclaimedTurn = -1;
  private pulsedTurn = -1;
  private reorderedTurn = -1;
  private reorderCount = 0;
  /** solo: the turn on which we granted the post-human-ready re-evaluation pass */
  private finalPassTurn = -1;
  combatsWon = 0;
  private lastPhase = '';

  constructor(opts: BotPolicyOptions = {}) {
    this.seed = opts.seed ?? 12345;
    this.mode = opts.mode ?? 'sim';
    this.lockstep = opts.lockstep ?? true;
    this.seekEvents = opts.seekEvents ?? false;
    this.reclaimNudge = opts.reclaimNudge ?? false;
    this.skipPicks = opts.skipPicks ?? false;
    this.pickCap = opts.pickCap;
    this.draftV2 = opts.draftV2 ?? true; // S13.6: v2 IS the policy (D7 flip)
  }

  /** S13.1a: is this seat's deck at (or past) the pick-cap ceiling? The gate
   *  is deck SIZE, not picks taken — removals free slots back up. */
  private atPickCap(view: BotView): boolean {
    if (this.pickCap === undefined) return false;
    return view.players[view.you].deck.length >= STARTER_DECK_SIZE + this.pickCap;
  }

  /** Deterministic in [0,1): same seed + situation + purpose → same roll. */
  private roll(view: BotView, purpose: string): number {
    const combat = view.combat;
    const key = [
      this.seed, purpose, view.phase, view.map.act, view.map.position,
      combat?.turn ?? -1, combat?.chain.length ?? -1,
      view.players[view.you].hand.length, view.telemetry.cardsPlayed, view.gold,
    ].join(':');
    return hash32(key) / 4294967296;
  }

  private chance(view: BotView, p: number, purpose: string): boolean {
    return this.roll(view, purpose) < p;
  }

  private pickIdx(view: BotView, n: number, purpose: string): number {
    return Math.floor(this.roll(view, purpose) * n);
  }

  /** Next intent for this view, or null to wait. At most one action per call;
   *  transports re-invoke on every new state (plus a watchdog). */
  decide(view: BotView): Action | null {
    const you = view.you;
    if (view.phase !== 'combat' && this.lastPhase === 'combat') this.combatsWon++;
    if (view.phase === 'game_over' && this.lastPhase === 'combat') this.combatsWon--;
    this.lastPhase = view.phase;

    // S1.2: abandoning needs both confirmations — the solo bot defers to the
    // human on quitting (a run the human can't end is a trap, not co-op)
    if (
      this.mode === 'solo' &&
      !['lobby', 'game_over', 'victory'].includes(view.phase) &&
      view.concede[otherOf(you)] && !view.concede[you]
    ) {
      return { type: 'CONCEDE', player: you, confirm: true };
    }

    switch (view.phase) {
      case 'map': {
        if (this.mode === 'solo') {
          // S1.2: the human navigates; the bot always follows their pick
          const human = otherOf(you);
          const theirs = view.map.picks[human];
          if (theirs !== null && view.map.picks[you] !== theirs) {
            return { type: 'NODE_PICK', player: you, nodeId: theirs };
          }
          return null;
        }
        // both sim bots take the lowest-id reachable node → instant agreement (M2-B3)
        if (view.map.picks[you] === null) {
          const options = this.pickable(view);
          if (options.length > 0) {
            // S11.9 strand routing: braid maps ONLY — the non-braid policy
            // below is byte-identical, so every Wave A baseline holds
            if (view.knotwork && view.map.nodes.some((n) => n.strand)) {
              return { type: 'NODE_PICK', player: you, nodeId: this.pickBraidNode(view, options) };
            }
            // S7.7 TB_BOT_SEEK_EVENTS (sim-only): reachable EVENT nodes win;
            // among events, lowest id — both seats still agree instantly
            if (this.seekEvents) {
              const events = options.filter((id) =>
                view.map.nodes.find((n) => n.id === id)?.kind === 'event');
              if (events.length > 0) return { type: 'NODE_PICK', player: you, nodeId: Math.min(...events) };
            }
            return { type: 'NODE_PICK', player: you, nodeId: Math.min(...options) };
          }
        }
        return null;
      }
      case 'rites': {
        // S7.2: don a vestment — seeded pick from the 2-card offer
        const offer = view.ritesState?.offer?.[you];
        const vested = (view.players[you].rites ?? []).length > 0;
        if (offer && offer.length > 0 && !vested) {
          return { type: 'RITE_PICK', player: you, riteId: offer[this.pickIdx(view, offer.length, 'rite:death')] };
        }
        return null;
      }
      case 'combat':
        return this.playCombat(view);
      case 'reward':
        return this.playReward(view);
      case 'event':
        return this.playEvent(view);
      case 'rest':
        return this.playRest(view);
      case 'covet_treasure':
        return this.playCovetTreasure(view);
      case 'shop':
        return this.playShop(view);
      case 'loom': {
        // nt-slice S6.8: sims speak only the pre-filled certainties (the
        // shrine sheet arrives auto-completed where evidence allows) — they
        // confirm as-is and move on. Solo: the human drives; the engine
        // mirrors this seat's confirm/advance.
        if (this.mode === 'solo') return null;
        const shrine = view.truth?.shrine;
        if (!shrine) return null;
        if (shrine.verdict) {
          return view.advanceReady[you] ? null : { type: 'ADVANCE', player: you };
        }
        return shrine.confirmed[you] ? null : { type: 'LOOM_CONFIRM', player: you, confirm: true };
      }
      default:
        return null; // lobby / victory / game_over — nothing to decide
    }
  }

  private pickable(view: BotView): number[] {
    const map = view.map;
    if (map.position === -1) return map.nodes.filter((n) => n.layer === 0).map((n) => n.id);
    return map.nodes.find((n) => n.id === map.position)?.edges ?? [];
  }

  private playCombat(view: BotView): Action | null {
    const you = view.you;
    const me = view.players[you];
    if (me.ready || me.fallen) return null;
    const combat = view.combat!;
    const living = combat.enemies.filter((e) => e.hp > 0);
    const targetable = living.filter((e) => !e.untargetable);
    if (living.length === 0 || targetable.length === 0) {
      return { type: 'SET_READY', player: you, ready: true };
    }

    const anyFallen = view.players.p1.fallen || view.players.p2.fallen;
    const severed = combat.severedTurns > 0;
    const partnerIsReady = view.players[otherOf(you)].ready;

    if (this.mode === 'sim' && this.lockstep) {
      // Lockstep planning (determinism): moves alternate by parity — p1 acts on
      // even (chain+thread) counts, p2 on odd — unless the partner has readied,
      // after which the remaining bot acts serially. Kills arrival-order noise
      // AND produces the woven interleaving the Chain wants.
      const moves = combat.chain.length + combat.threadActions.length;
      const mySlot = moves % 2 === (you === 'p1' ? 0 : 1);
      if (!partnerIsReady && !mySlot) return null;
    }
    // solo: no parity gate — stage early so the human can plan around us (S1.2)

    // sever to spread bindings (pre-§14.12 heuristic, kept) — courtesy-gated
    if (!anyFallen && !severed && this.pulsedTurn !== combat.turn && this.chance(view, 0.35, 'pulse')) {
      const myEnemies = targetable.filter((e) => e.boundTo === you);
      if (myEnemies.length === living.length && living.length > 1 && this.maySpend(view, 3, 'sever')) {
        this.pulsedTurn = combat.turn;
        return { type: 'DECLARE_THREAD', player: you, kind: 'sever', targetId: myEnemies[0].id };
      }
    }

    const affordable = me.hand
      .map((id) => ({ id, def: defOf(view, you, id) }))
      .filter((c) => c.def.cost <= me.energy);
    if (affordable.length === 0) {
      // before committing: one weaving pass — REORDER an own card whose link
      // isn't firing into a slot where it would (what humans do while talking)
      if (this.reorderedTurn !== combat.turn) {
        this.reorderedTurn = combat.turn;
        this.reorderCount = 0;
      }
      // solo: when the human readies, grant ONE fresh re-evaluation pass in
      // response to their final chain, then ready within the driver's delay
      if (this.mode === 'solo' && partnerIsReady && this.finalPassTurn !== combat.turn) {
        this.finalPassTurn = combat.turn;
        this.reorderCount = 0;
      }
      if (this.reorderCount < 3) {
        const reorder = this.tryReorder(view);
        if (reorder) {
          this.reorderCount++;
          return reorder;
        }
      }
      // §14.12: with the chain settled, force the best remaining dead link
      if (!anyFallen && !severed && this.pulsedTurn !== combat.turn) {
        const pulse = this.tryPulse(view);
        if (pulse) {
          this.pulsedTurn = combat.turn;
          return pulse;
        }
      }
      // S7.8 gate-5 sim accommodation: with thread to spare, sometimes pull a
      // partner card across (state-pure roll — deterministic per situation)
      if (this.reclaimNudge && !anyFallen && !severed && this.reclaimedTurn !== combat.turn
        && view.thread >= 5 && me.hand.length < 10) {
        const partner = view.players[you === 'p1' ? 'p2' : 'p1'];
        const pool = [...partner.discard, ...partner.exhaust].filter(
          (id) => !combat.threadActions.some((t) => t.kind === 'reclaim' && t.targetId === id),
        );
        if (pool.length > 0 && this.roll(view, 'reclaim-nudge') < 0.3) {
          this.reclaimedTurn = combat.turn;
          return { type: 'DECLARE_THREAD', player: you, kind: 'reclaim', targetId: pool[0] };
        }
      }
      if (this.mode === 'solo' && !partnerIsReady) return null; // readies last (S1.2)
      return { type: 'SET_READY', player: you, ready: true };
    }

    // The same link bookkeeping the human UI previews — the engine's own
    // computation (S14.2 B14), so the suppression is planned around too
    const chainDefs = combat.chain.map((s) => defOf(view, s.owner, s.cardInstanceId));
    const chainOwners = combat.chain.map((s) => s.owner);
    const baseFired = linksFiredIn(view, chainDefs, chainOwners);

    // pick best (card, position): fire own link, enable the next card's link,
    // never break a link that currently fires
    const lowHp = me.hp < me.maxHp * 0.55;
    let best: { card: typeof affordable[0]; pos: number; score: number } | null = null;
    for (const card of affordable) {
      for (let pos = 0; pos <= combat.chain.length; pos++) {
        const defsWith = [...chainDefs.slice(0, pos), card.def, ...chainDefs.slice(pos)];
        const ownersWith = [...chainOwners.slice(0, pos), you, ...chainOwners.slice(pos)];
        const firedWith = linksFiredIn(view, defsWith, ownersWith);
        const fires = firedWith[pos] ? 2 : 0;
        let next = 0;
        if (pos < combat.chain.length) {
          const firedBefore = baseFired[pos];
          const firesAfter = firedWith[pos + 1];
          if (firedBefore && !firesAfter) next = -3; // never break a firing link
          else if (!firedBefore && firesAfter) next = 1.5; // enable the next card
        }
        const guardBonus = lowHp && card.def.tag === 'Guard' ? 2.5 : 0;
        // keep the Hex→detonate axis alive even when other links outshine it
        const cardText = JSON.stringify(card.def.base) + JSON.stringify(card.def.link?.effects ?? []);
        const isVess = view.players[you].character === 'vess';
        const bigPile = targetable.some((e) => e.hex >= 4);
        const axisBonus =
          (isVess && (cardText.includes("'hex'") || cardText.includes('hexAll') || cardText.includes('doubleHex')) ? 0.9 : 0) +
          (cardText.includes('detonate') && bigPile ? 1.3 : 0) +
          (cardText.includes('damagePerHex') && targetable.some((e) => e.hex >= 3) ? 1.2 : 0);
        const score = fires + next + guardBonus + axisBonus + card.def.cost * 0.1;
        if (!best || score > best.score) best = { card, pos, score };
      }
    }
    const pick = best!.card;
    const text = JSON.stringify(pick.def);
    const hexed = [...targetable].sort((a, b) => b.hex - a.hex)[0];
    // detonators and hex-appliers converge on the same pile (the co-op axis)
    const target =
      (text.includes('detonate') && hexed) ||
      (text.includes("'hex'") && hexed && hexed.hex > 0 && hexed) ||
      targetable.find((e) => e.boundTo === you) ||
      targetable[0];
    return {
      type: 'STAGE_CARD', player: you, cardInstanceId: pick.id,
      slot: best!.pos, targetId: pick.def.needsTarget ? target.id : undefined,
    };
  }

  /** §14.12 solo courtesy: never take the shared pool below 5 — except
   *  Sever/Steady under lethal-adjacent pressure. Sim bots just need the
   *  thread to exist (plus a buffer so a spend can't fray the pair). */
  private maySpend(view: BotView, cost: number, kind: 'pulse' | 'sever' | 'steady'): boolean {
    if (view.thread < cost + 2) return false; // never spend into fray range
    if (this.mode !== 'solo' || view.thread - cost >= 5) return true;
    if (kind === 'pulse') return false;
    const me = view.players[view.you];
    const incoming = view.combat!.enemies
      // S10a read_chain counts as a threat (its no-resonance branch is ×2 —
      // read conservatively as one hit here, same as `times` elsewhere)
      .filter((e) => e.hp > 0 && e.boundTo === view.you
        && (e.intent.kind.startsWith('attack') || e.intent.kind === 'read_chain'))
      .reduce((a, e) => {
        const raw = 'amount' in e.intent ? e.intent.amount : 'base' in e.intent ? e.intent.base : 0;
        return a + raw + e.strength;
      }, 0);
    return me.hp - Math.max(0, incoming - me.block) < me.maxHp * 0.25; // lethal-adjacent
  }

  /** §14.12: score each staged card whose Link won't fire — link payoff value
   *  plus a large bonus when forcing it completes a Resonance streak — and
   *  Pulse the best one past a threshold. Deterministic: no rolls. */
  private tryPulse(view: BotView): Action | null {
    const you = view.you;
    const combat = view.combat!;
    const chain = combat.chain;
    if (chain.length < 2) return null;
    if (!this.maySpend(view, 2, 'pulse')) return null;
    const defs = chain.map((s) => defOf(view, s.owner, s.cardInstanceId));
    // S14.2 (B14): the engine's computation — a Choir-Silence-held link now
    // reads unfired here, which makes it exactly what Pulse exists to force
    const fired = linksFiredIn(view, defs, chain.map((s) => s.owner));
    const pulsed = new Set(
      combat.threadActions.filter((t) => t.kind === 'pulse').map((t) => t.targetId),
    );
    const targetable = combat.enemies.filter((e) => e.hp > 0 && !e.untargetable);
    const bigPile = targetable.some((e) => e.hex >= 4);
    // S9c.6: same def resolver as resolution — the bot prices the streaks
    // the engine will actually ignite
    const resonancesAt = (f: boolean[]): number =>
      computeResonanceSlots(chain, f, (slot) => defs[chain.indexOf(slot)]).size;
    const baseRes = resonancesAt(fired);
    let best: { id: string; score: number } | null = null;
    for (let i = 0; i < chain.length; i++) {
      const def = defs[i];
      if (!def.link || fired[i] || pulsed.has(chain[i].cardInstanceId)) continue;
      const text = JSON.stringify(def.link.effects);
      let score = 1;
      if (text.includes('detonate') && bigPile) score += 2;
      if (text.includes('"hex"') || text.includes('hexAll')) score += 1;
      if (text.includes('"damage"') || text.includes('damageAll') || text.includes('damagePerHex')) score += 1;
      const withForced = fired.slice();
      withForced[i] = true;
      if (resonancesAt(withForced) > baseRes) score += 4;
      if (!best || score > best.score) best = { id: chain[i].cardInstanceId, score };
    }
    if (!best || best.score < 3) return null;
    return { type: 'DECLARE_THREAD', player: you, kind: 'pulse', targetId: best.id };
  }

  private tryReorder(view: BotView): Action | null {
    const you = view.you;
    const combat = view.combat!;
    const chain = combat.chain;
    if (chain.length < 2) return null;
    const defs = chain.map((s) => defOf(view, s.owner, s.cardInstanceId));
    // S14.2 (B14): permuted orders priced by the engine's computation
    const firesAt = (order: number[]): number =>
      linksFiredIn(view, order.map((i) => defs[i]), order.map((i) => chain[i].owner))
        .filter(Boolean).length;
    const identity = chain.map((_, i) => i);
    const baseline = firesAt(identity);
    let best: { from: number; to: number; gain: number } | null = null;
    for (let from = 0; from < chain.length; from++) {
      if (chain[from].owner !== you) continue; // own cards only (§2.1)
      for (let to = 0; to < chain.length; to++) {
        if (to === from) continue;
        const order = identity.filter((i) => i !== from);
        order.splice(to, 0, from);
        const gain = firesAt(order) - baseline;
        if (gain > 0 && (!best || gain > best.gain)) best = { from, to, gain };
      }
    }
    if (!best) return null;
    return { type: 'REORDER', player: you, cardInstanceId: chain[best.from].cardInstanceId, slot: best.to };
  }

  /** Draft scoring: the bots are a coordination floor — they draft like a pair
   *  that wants links to fire and the Hex→detonate axis to exist.
   *
   *  S13.1b (draftV2 — DEFAULT since the S13.6 D7 flip; TB_BOT_DRAFT_V2=0
   *  restores v1 for instrumented comparisons): v2 learns what the S13 decomposition
   *  proved — (i) powers/engines are dilution-resistant (+4), (ii) rares are
   *  systematically undervalued at +1 (→ +3; the OQ#59 caveat (a) fix),
   *  (iii) dilution is the disease: score − max(0, deckSize − 16) × 0.4, so
   *  the take-rate falls as the deck grows (matches the observed human/StS
   *  meta and the sweep's knee at ~+4 picks/seat). */
  private draftScore(view: BotView, defId: string): number {
    const def = CARDS[defId];
    const character = view.players[view.you].character;
    let score = 0;
    if (def.link) score += 3;
    if (def.link?.condition === 'any') score += 1;
    const heavy = character === 'vess' ? 'Hex' : 'Strike';
    if (def.tag === heavy) score += 2;
    const text = JSON.stringify(def.base) + JSON.stringify(def.link?.effects ?? []);
    if (text.includes('detonate')) score += 5;
    if (text.includes("'hex'") || text.includes('hexAll')) score += character === 'vess' ? 3 : 0;
    if (text.includes('damagePerHex')) score += character === 'vess' ? 3 : 0;
    if (def.rarity === 'rare') score += this.draftV2 ? 3 : 1;
    if (def.cost <= 2) score += 1;
    if (this.draftV2) {
      const isPower = [...def.base, ...(def.link?.effects ?? [])].some((e) => e.op === 'power');
      if (isPower) score += 4;
      score -= Math.max(0, view.players[view.you].deck.length - 16) * 0.4;
    }
    return score;
  }

  private playReward(view: BotView): Action | null {
    const you = view.you;
    const reward = view.reward!;
    const partner = otherOf(you);
    if (reward.picked[you] === null && reward.sets[you].length > 0) {
      // S13.1a: the skip-all probe and the deck-size ceiling gate every
      // acquisition channel (covets below share both gates)
      if (this.skipPicks || this.atPickCap(view)) {
        return { type: 'REWARD_PICK', player: you, pick: 'skip' };
      }
      const ranked = [...reward.sets[you]].sort((a, b) => this.draftScore(view, b) - this.draftScore(view, a));
      const pick = this.draftScore(view, ranked[0]) >= 3 || this.chance(view, 0.5, 'draft') ? ranked[0] : 'skip';
      return { type: 'REWARD_PICK', player: you, pick };
    }
    if (
      !this.skipPicks && !this.atPickCap(view) &&
      reward.coveted[you] === null && reward.picked[partner] !== null && reward.sets[partner].length > 0 &&
      view.players[you].covetCharges > 0
    ) {
      const leftovers = reward.sets[partner]
        .filter((c) => c !== reward.picked[partner])
        .sort((a, b) => this.draftScore(view, b) - this.draftScore(view, a));
      if (leftovers.length > 0 && this.draftScore(view, leftovers[0]) >= 4 && this.chance(view, 0.7, 'covet')) {
        return { type: 'COVET_PICK', player: you, pick: leftovers[0] };
      }
    }
    // S13.3 pick-with-removal: v2 spends the free offer (it knows dilution
    // is the disease — the bots' 94%-removal gold spend, now free at the
    // screen); v1 ignores it so historical batteries stay comparable.
    if (reward.removals?.[you] === null) {
      if (this.draftV2) {
        const starter = view.players[you].deck.find((c) => CARDS[c.defId].starterOnly);
        return { type: 'REWARD_REMOVE', player: you, pick: starter?.instanceId ?? 'pass' };
      }
      // v1 passes explicitly only when it would otherwise idle — never blocks
    }
    if (!view.advanceReady[you]) return { type: 'ADVANCE', player: you };
    return null;
  }

  /** S1.2 crossed choices: crude variance score per option — the bot chooses
   *  for the human, biased to the predictable outcome. (Refine post-playtest.) */
  private optionRisk(opt: EventOptionDef): number {
    let risk = 0;
    for (const eff of opt.effects) {
      switch (eff.op) {
        case 'loseHp': risk += 2 + eff.amount * 0.2; break;
        case 'pendingFray': risk += 2.5 * eff.amount; break;
        case 'gainCard': risk += 0.75; break; // random card = variance
        case 'gainRelic': risk += 0.75; break;
        case 'upgradeRandom': risk += 0.5; break;
        case 'removeRandomStarter': risk += 0.5; break;
        case 'maxHp': risk += eff.amount < 0 ? 3 : 0; break;
        case 'gold': risk += eff.amount < 0 ? 1 : 0; break;
      }
    }
    return risk;
  }

  private playEvent(view: BotView): Action | null {
    const you = view.you;
    // S7.4: a birth-rite pick owed at this screen blocks ADVANCE — choose
    if (view.ritesState?.birthChoice === you) {
      // S9a: pick from the run's UNLOCKED trio (union read-path)
      const pool = unlockedRites(view.players[you].character, 'birth', view.ritesState.unlocks);
      return { type: 'RITE_PICK', player: you, riteId: pool[this.pickIdx(view, pool.length, 'rite:birth')] };
    }
    const ev = view.event!;
    if (ev.chosen === null) {
      if (ev.chooser !== you) return null;
      // S11.5: the CURRENT stage's OPEN doors (deep events; unflagged views
      // see stage 1 and no keyed options — same list as before). First-pass
      // policy: deep options are valued by their immediate effects only;
      // pot-aware pressing is S11.9's routing problem, out of scope here.
      const options = eventStageAt(EVENTS[ev.eventId], ev.stagePath ?? []).options
        .filter((o) => eventOptionAvailable(view as never, ev.subject, o));
      let opt: EventOptionDef;
      if (this.mode === 'solo') {
        const minRisk = Math.min(...options.map((o) => this.optionRisk(o)));
        const safest = options.filter((o) => this.optionRisk(o) === minRisk);
        opt = safest[this.pickIdx(view, safest.length, 'event:' + ev.eventId)];
      } else {
        opt = options[this.pickIdx(view, options.length, 'event:' + ev.eventId)];
      }
      return { type: 'EVENT_CHOOSE', player: you, optionId: opt.id };
    }
    if (!view.advanceReady[you]) return { type: 'ADVANCE', player: you };
    return null;
  }

  /** S1.2 Wedding Knife: never initiates. If the human has offered, accept
   *  (offer our lowest-value tradeable card, then confirm) iff the draft score
   *  favors the trade; otherwise decline by silence — there is no decline
   *  action, and an unanswered offer IS the mechanic working. */
  private weddingMove(view: BotView): Action | null {
    if (this.mode !== 'solo') return null;
    const you = view.you;
    const human = otherOf(you);
    const w = view.rest?.wedding;
    if (!w || w.done) return null;
    const humanOffer = w.offers[human];
    if (!humanOffer) return null;
    const humanCard = view.players[human].deck.find((c) => c.instanceId === humanOffer);
    if (!humanCard) return null;
    const tradeable = view.players[you].deck
      .filter((c) => !CARDS[c.defId].starterOnly)
      .sort((a, b) => this.draftScore(view, a.defId) - this.draftScore(view, b.defId));
    if (tradeable.length === 0) return null;
    const give = tradeable[0];
    if (this.draftScore(view, humanCard.defId) <= this.draftScore(view, give.defId)) return null; // decline
    if (w.offers[you] !== give.instanceId) {
      return { type: 'WEDDING_PICK', player: you, cardInstanceId: give.instanceId };
    }
    if (!w.confirmed[you]) return { type: 'WEDDING_CONFIRM', player: you };
    return null;
  }

  private playRest(view: BotView): Action | null {
    const you = view.you;
    const rest = view.rest!;
    const me = view.players[you];
    const wedding = this.weddingMove(view);
    if (wedding) return wedding;
    // S11.7 toll door: name the hurt seat (both seats compute the same
    // fraction → instant vote-match; solo mirrors the human anyway)
    if (rest.toll) {
      if (rest.toll.healed === null) {
        if (this.mode === 'solo') return null; // the human names it
        if (rest.toll.votes[you] !== null) return null; // voted; wait
        const frac = (pid: PlayerId): number => view.players[pid].hp / view.players[pid].maxHp;
        const seat: PlayerId = frac('p1') <= frac('p2') ? 'p1' : 'p2';
        return { type: 'TOLL_PICK', player: you, seat };
      }
      if (!view.advanceReady[you]) return { type: 'ADVANCE', player: you };
      return null;
    }
    if (rest.chosen[you] === null) {
      // heal when hurt, otherwise upgrade; sprinkle barter/rebraid
      const hurt = me.hp < me.maxHp * 0.6;
      const option = hurt ? 'rest'
        : this.chance(view, 0.85, 'rest:upgrade') ? 'upgrade'
        : this.chance(view, 0.5, 'rest:barter') ? 'barter'
        : !view.rebraidUsed && you === 'p1' ? 'rebraid' : 'rest';
      return { type: 'REST_CHOOSE', player: you, option };
    }
    if (rest.chosen[you] === 'upgrade' && !rest.upgradePicked[you]) {
      const candidates = me.deck
        .filter((c) => !c.upgraded && CARDS[c.defId].upgrade)
        .sort((a, b) => {
          const widen = (defId: string): number => {
            const d = CARDS[defId];
            if (!d.upgrade?.link) return 0;
            if (d.upgrade.link.condition === 'any' && d.link?.condition !== 'any') return 2;
            if (!d.link) return 2;
            return 1;
          };
          return widen(b.defId) - widen(a.defId);
        });
      if (candidates.length > 0) {
        return { type: 'UPGRADE_PICK', player: you, cardInstanceId: candidates[0].instanceId };
      }
    }
    if (!view.advanceReady[you]) return { type: 'ADVANCE', player: you };
    return null;
  }

  /** S11.9 (Wave B): strand routing on braid maps. A pick is valued by its
   *  best-path summed node utility through the act — a deterministic DP
   *  over the DAG. Knot pricing: the elite's own utility pays the S11.3
   *  reward table MINUS the escalation ladder's current price, while the
   *  crossing's value rides the DP naturally (a knot's forward max spans
   *  BOTH strands; a bypass sees only its own). Seat-symmetric inputs and
   *  a lowest-id tie-break: both seats name the same node instantly, so
   *  the NODE_PICK vote never thrashes. Non-braid maps never reach this —
   *  every Wave A baseline holds byte-identically. */
  private pickBraidNode(view: BotView, options: number[]): number {
    const byId = new Map(view.map.nodes.map((n) => [n.id, n]));
    // seat-SYMMETRIC on purpose: both seats must compute identical values
    const worstHp = Math.min(
      view.players.p1.hp / view.players.p1.maxHp,
      view.players.p2.hp / view.players.p2.maxHp,
    );
    const cut = view.map.knotsCut ?? 0;
    const kindValue = (n: { kind: string }): number => {
      switch (n.kind) {
        case 'event': return this.seekEvents ? 3 : 1.25;
        case 'shop': return view.gold >= 150 ? 1.5 : 0.75;
        case 'treasure': return 1.5;
        case 'rest': return worstHp < 0.5 ? 2 : 1;
        // the knot: gold + relic + bound witness + the crossing, priced by
        // the ladder (+10/+30/+60 → the third knot this act is near-free
        // to skip). First-pass constants; the ladder gate recalibrates
        // against THIS policy (OQ#55's ruling: calibrate them together).
        case 'elite': return 3 - escalationFactor(cut) * 5;
        case 'combat': return 0.5;
        default: return 0;
      }
    };
    const memo = new Map<number, number>();
    const best = (id: number): number => {
      const seen = memo.get(id);
      if (seen !== undefined) return seen;
      const n = byId.get(id)!;
      memo.set(id, 0); // DAG — the guard only protects against bad data
      const forward = n.edges.length > 0 ? Math.max(...n.edges.map(best)) : 0;
      const v = kindValue(n) + forward;
      memo.set(id, v);
      return v;
    };
    let bestId = options[0];
    let bestVal = -Infinity;
    for (const id of [...options].sort((a, b) => a - b)) {
      const v = best(id);
      if (v > bestVal + 1e-9) {
        bestVal = v;
        bestId = id;
      }
    }
    return bestId;
  }

  /** S11.7 covet cache: vote the relic (both seats agree instantly by the
   *  same rule); the richer-in-charges seat seizes the coin after (tie →
   *  p1, so the pair never double-attempts). Solo: the human drives. */
  private playCovetTreasure(view: BotView): Action | null {
    const you = view.you;
    const ct = view.covetTreasure!;
    if (ct.taken === null) {
      if (this.mode === 'solo') return null;
      if (ct.votes[you] !== null) return null;
      return { type: 'TREASURE_PICK', player: you, choice: 'relic' };
    }
    if (ct.seizedBy === null && this.mode !== 'solo') {
      const mine = view.players[you].covetCharges;
      const theirs = view.players[otherOf(you)].covetCharges;
      const seizer: PlayerId = theirs > mine ? otherOf(you) : mine > theirs ? you : 'p1';
      if (seizer === you && mine > 0) return { type: 'TREASURE_SEIZE', player: you };
    }
    if (!view.advanceReady[you]) return { type: 'ADVANCE', player: you };
    return null;
  }

  private playShop(view: BotView): Action | null {
    const you = view.you;
    if (this.mode === 'sim' && you === 'p2' && !view.advanceReady.p1) return null; // deterministic serial shopping
    // S1.2 courtesy, playtest-1 revision: gold AND stock are shared (3 removal
    // services per shop) — a floor on gold alone let the bot slam the scarce
    // services before the human clicked anything. The bot now buys NOTHING
    // until the human advances; then it shops the leftovers and follows.
    if (this.mode === 'solo' && !view.advanceReady[otherOf(you)]) return null;
    const shop = view.shop!;

    const affordable = shop.items.filter((i) => !i.sold && i.kind !== 'removal' && i.price <= view.gold);
    const myCard = affordable.find((i) => i.kind === 'card' && i.forPlayer === you);
    const relic = affordable.find((i) => i.kind === 'relic');
    // S4.2: the removal service never sells out; the bot evaluates its OWN
    // run-escalated price (policy parity, not policy ambition — no small-deck
    // strategy this sprint: starter preference + deck-size > 8 guard kept)
    const removal = shop.items.find((i) => i.kind === 'removal' && (!i.forPlayer || i.forPlayer === you));
    const me = view.players[you];
    const starter = me.deck.find((c) => CARDS[c.defId].starterOnly);
    if (removal && starter && removalPrice(view, you) <= view.gold && me.deck.length > 8) {
      return { type: 'SHOP_REMOVE', player: you, itemId: removal.id, cardInstanceId: starter.instanceId };
    }
    // S13.1a: shop card buys share the skip/cap gates (deck-size ceiling)
    if (myCard && !this.skipPicks && !this.atPickCap(view) && this.draftScore(view, myCard.refId!) >= 5) {
      return { type: 'SHOP_BUY', player: you, itemId: myCard.id };
    }
    if (relic && this.chance(view, 0.4, 'shop:relic')) {
      return { type: 'SHOP_BUY', player: you, itemId: relic.id };
    }
    if (!view.advanceReady[you]) return { type: 'ADVANCE', player: you };
    return null;
  }
}

function otherOf(p: PlayerId): PlayerId {
  return p === 'p1' ? 'p2' : 'p1';
}
