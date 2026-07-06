// Core types for the Threadbound engine. Design doc references as §N,
// M2 plan references as M2-§X (docs/threadbound_M2_plan.md).

export type PlayerId = 'p1' | 'p2';
export type CharacterId = 'vess' | 'bram';
export type BroadTag = 'Strike' | 'Guard' | 'Hex' | 'Surge' | 'Rite'; // §4
export type Rarity = 'common' | 'uncommon' | 'rare';

// Link conditions: broad tags + 'any' at all rarities; 'partner' is a narrow
// rare-only condition (§2.2 / content-audit).
export type LinkCondition = BroadTag | 'any' | 'partner';

export type Phase =
  | 'lobby'
  | 'rites' // S7.2: the death-rite offer, after character select, before act 1
  | 'map' // M2-B3: both players pick the same next node to advance
  | 'combat'
  | 'reward'
  | 'event'
  | 'loom' // nt-slice: the Loom's Eye shrine (flagged Act 3 only)
  | 'rest'
  | 'shop' // M2-B4
  | 'covet_treasure' // S11.7: the covet cache — one-of-two, flagged maps only
  | 'game_over'
  | 'victory';

// ---------------------------------------------------------------------------
// Effects — the data-op language card content is written in. The engine's
// interpreter (combat.ts) is the only place these are given meaning.
// ---------------------------------------------------------------------------

export type EffectOp =
  | { op: 'damage'; amount: number; times?: number; primary?: boolean }
  | { op: 'damageAll'; amount: number; primary?: boolean }
  // damage equal to base + perHex * target's Hex stacks (does not detonate).
  // Telemetry: logs to the HexScaling bucket (M2-B1).
  // max = S5.1 per-play ceiling on the hex-scaled total (applied pre-Momentum)
  | { op: 'damagePerHex'; base: number; perHex: number; max?: number; primary?: boolean }
  // Haymaker: +Momentum×mult damage rider, and optionally skip the halving
  | { op: 'momentumStrikeBonus'; mult: number; keepMomentum?: boolean }
  // M2-A4: this card's Momentum bonus applies to EVERY hit (rare design space)
  | { op: 'momentumPerHit' }
  | { op: 'block'; amount: number; primary?: boolean }
  | { op: 'partnerBlock'; amount: number }
  | { op: 'hex'; amount: number; primary?: boolean }
  | { op: 'hexAll'; amount: number; primary?: boolean }
  | { op: 'hexPerLinkFired'; per: number }
  | { op: 'doubleHex' }
  | { op: 'detonate'; max?: number } // detonate all (or up to max) Hexes on target
  | { op: 'detonateAllEnemies' }
  | { op: 'damagePerDetonated'; per: number }
  | { op: 'weak'; amount: number }
  | { op: 'weakAll'; amount: number }
  | { op: 'vulnerable'; amount: number }
  | { op: 'stun'; amount: number } // §4: rare
  | { op: 'momentum'; amount: number; primary?: boolean }
  | { op: 'draw'; amount: number }
  | { op: 'partnerDraw'; amount: number }
  // M2-A2 Kindled: gain N energy at the start of your next turn (banks, stacks)
  | { op: 'kindled'; amount: number }
  | { op: 'partnerKindled'; amount: number }
  | { op: 'thread'; amount: number }
  | { op: 'heal'; amount: number; primary?: boolean }
  | { op: 'partnerHeal'; amount: number }
  // taunt-style Guard (§6): bind the target enemy to this card's owner
  | { op: 'taunt' }
  | { op: 'power'; power: string }; // id into POWERS registry

// ---------------------------------------------------------------------------
// Powers & relics share one data-driven hook system (M2-B2).
// ---------------------------------------------------------------------------

export type HookEvent =
  | 'combatStart'
  | 'turnStart'
  | 'detonate' // fires once per detonation event
  | 'resonance'
  | 'fray'
  | 'covet'
  | 'linkFired' // one of the holder's cards fired its link
  | 'reclaim' // S8.1 (Dowry-Bound): the holder Reclaimed a partner's card
  // S13.2 rare-engine events (new keys match no pre-S13 content, so every
  // existing baseline holds by construction):
  | 'partnerLinkFired' // the PARTNER's card fired its link (cross-seat engines)
  | 'chainClose' // the resolved Chain's LAST card was the holder's
  | 'threadSpend'; // a declared Thread action spent from the shared pool (both seats' hooks run)

export type HookOp =
  | { op: 'block'; amount: number }
  | { op: 'partnerBlock'; amount: number }
  | { op: 'thread'; amount: number }
  | { op: 'kindled'; amount: number }
  | { op: 'draw'; amount: number }
  | { op: 'momentum'; amount: number }
  | { op: 'heal'; amount: number }
  | { op: 'partnerHeal'; amount: number }
  | { op: 'hexAll'; amount: number }
  | { op: 'damageAll'; amount: number };

export interface Hook {
  on: HookEvent;
  effects: HookOp[];
  /** PT2/OQ#29: fires at most once per turn (tracked per holder+event in
   *  CombatState.hookOnceFired, reset at turn start) */
  oncePerTurn?: boolean;
  /** S7.1: fires at most once per COMBAT (tracked in
   *  CombatState.hookCombatFired, never reset mid-combat) — the rite
   *  tables' 'first X each combat' pattern */
  oncePerCombat?: boolean;
}

/** Named passive behaviors special-cased by the engine. */
export type PassiveId =
  | 'momentumNoHalve' // Wildfire Heart
  // §14.13 (OQ#27): 'pulseCostMinusOne' removed — Pulsekeeper's Ring now uses
  // the run-persistent ringPulses counter (every 3rd Pulse is free — S17).
  | 'threadRegenPlusOne' // +1 Thread regen per turn
  | 'covetMaxPlusOne' // may hold 3 Covet charges
  | 'handRetainOne' // M2-A1: retain 1 card at end of turn
  | 'startCombatFrayImmune' // first Fray each combat is absorbed
  | 'wedding_knife' // §7: enables the rest-site trade (special-cased)
  // S8.1 birth-rite passives (numbers provisional, sign-off pending):
  | 'reclaimUpgraded' // Quickening: Reclaims that keep their name arrive upgraded (mutation precedence in effectiveDef hides the overlay on mutation-bearing cards)
  | 'cradleWarden' // partner's links fired off your cards: +1 linked effect
  | 'momentumCarry3' // Hearth-Keeper: momentum doesn't decay, carries up to 3
  | 'namingDay'; // your mutated cards' effects +2

export interface PowerDef {
  id: string;
  name: string;
  hooks?: Hook[];
  passives?: PassiveId[];
}

export interface RelicDef {
  id: string;
  name: string;
  text: string;
  /** ≥8 of the pool must be Thread/co-op-specific (M2-B2) */
  coop?: boolean;
  /** PT2/OQ#29: rare relics carry 1/3 the drop weight of the rest */
  rare?: boolean;
  hooks?: Hook[];
  passives?: PassiveId[];
  /** one-time grant when acquired */
  onPickup?: HookOp[];
}

/** S7.1 + S8.0 ruling 1 (docs/threadbound_sprint_S8.md, supersedes the S7
 *  passive death-rite tables): a DEATH rite is a CARD — one unique copy
 *  added to the starting deck at pick, removable at shops, a legal Reclaim
 *  target with an authored mutation. A BIRTH rite is a passive you become
 *  (hooks/passives, hidden-relic semantics). The asymmetry is deliberate
 *  held-reveal signal. */
export interface RiteDef {
  id: string;
  role: CharacterId;
  kind: 'death' | 'birth';
  name: string;
  /** one line, held-reveal discipline: no tutorialization (S8 owns voice) */
  flavor: string;
  text: string;
  /** death rites: the vestment card (riteOnly CardDef) */
  cardId?: string;
  /** birth rites: the mirror sacrament's mechanics */
  hooks?: Hook[];
  passives?: PassiveId[];
}

// ---------------------------------------------------------------------------
// S9d — stateless growth (the tally). Growth is DERIVED at resolution and
// preview time from state.tallies; no CardInstance field, no sync surface.
// Echoes and Reclaims inherit correctness for free (S9d.0-3).
// ---------------------------------------------------------------------------

export type GrowthAxis =
  | 'detonations'      // pair detonation events
  | 'falls'            // either seat falls
  | 'boundKills'       // enemies that die Bound to the HOLDER (per-seat)
  | 'threadSpent'      // pair Thread spent
  | 'kindledConsumed'  // pair Kindled converted to energy
  | 'linksFired'       // pair links fired
  | 'momentumSpent'    // pair Momentum cashed into Strikes
  | 'resonances';      // pair Resonance ignitions

export interface GrowthTier {
  /** axis value at which this tier's additions apply (ascending; the last
   *  tier is the terminal one — CI-required) */
  at: number;
  /** ops ADDED to base (never replacing — upgrades/mutations compose) */
  addBase?: EffectOp[];
  /** link replacement at this tier */
  link?: CardDef['link'];
}

export interface GrowthDef {
  axis: GrowthAxis;
  /** linear grower: +amount to `appliesTo` per `per` of the axis */
  per?: number;
  amount?: number;
  /** cap on the accumulated BONUS (CI-required for linear growers) */
  cap?: number;
  /** the op the linear bonus lands on (first matching op in base) */
  appliesTo?: 'damage' | 'block' | 'momentum';
  /** tiered grower (Votive/Descant shapes) */
  tiers?: GrowthTier[];
}

/** S9d.2: run tallies — AUTHORITATIVE state (hashed; telemetry is not).
 *  Present only when rites are on, so unflagged state shape and goldens
 *  hold by construction. */
export interface RunTallies {
  detonations: number;
  falls: number;
  boundKills: Record<PlayerId, number>;
  threadSpent: number;
  kindledConsumed: number;
  linksFired: number;
  momentumSpent: number;
  resonances: number;
  /** highest growth step each rite card has RESOLVED at (defId → bonus or
   *  tier count) — drives the once-per-step tally log line */
  seenStep: Record<string, number>;
}

export interface CardDef {
  id: string;
  name: string;
  character: CharacterId | 'neutral';
  rarity: Rarity;
  cost: number;
  tag: BroadTag;
  exhaust?: boolean;
  /** M2-A1: not discarded at end of turn */
  keep?: boolean;
  /** M2-A5: starter-only cards never appear in rewards/shops/events */
  starterOnly?: boolean;
  /** S8.1: rite vestment card — same pool exclusion as starterOnly; enters
   *  play only via the death-rite pick */
  riteOnly?: boolean;
  /** S9d: the grower spec (authored on the eight rite cards) */
  growsWith?: GrowthDef;
  /** S9d.3 display metadata — set by applyGrowth on the defs it returns
   *  (linear: the bonus; tiered: tiers reached). NEVER authored. */
  grownStep?: number;
  text: string;
  base: EffectOp[];
  link?: {
    condition: LinkCondition;
    text: string;
    effects: EffectOp[];
    /** if true, link effects REPLACE base effects ("draw 2 instead") */
    replace?: boolean;
  };
  needsTarget?: boolean;
  /** §7: deterministic hand-authored mutation applied when Reclaimed across the Thread */
  mutation?: {
    name: string;
    text: string;
    base: EffectOp[];
    link?: CardDef['link'];
  };
  /** M2-B6: hand-authored upgrade overlay; prefers deepening the link clause */
  upgrade?: {
    text?: string;
    cost?: number;
    base?: EffectOp[];
    link?: CardDef['link'];
    keep?: boolean;
  };
}

export interface CardInstance {
  instanceId: string;
  defId: string;
  upgraded?: boolean; // M2-B6
  /** Reclaimed Echo (§5): ethereal copy, exhausts at end of combat */
  echo?: boolean;
  /** Echo arrived mutated (§7) — mutations apply to the base (unupgraded) form */
  mutated?: boolean;
}

// ---------------------------------------------------------------------------
// Enemies (§6)
// ---------------------------------------------------------------------------

export type EnemyIntent =
  | { kind: 'attack'; amount: number; times?: number }
  | { kind: 'attack_all'; amount: number }
  | { kind: 'attack_momentum'; base: number; perMomentum: number }
  | { kind: 'attack_drain'; amount: number; threadDrain: number }
  | { kind: 'attack_fray'; amount: number } // hits and inflicts Fray on both (§6 Unraveled kit)
  /** S15.2A (sweep B5, D2 ruled C/A-first): post-block damage — the roster's
   *  ONE way through Block. Attacker/target modifiers (Strength, Weak,
   *  Vulnerable, Fray) still apply; only the block absorption is skipped. */
  | { kind: 'attack_pierce'; amount: number }
  | { kind: 'block'; amount: number }
  | { kind: 'block_all'; amount: number } // blocks self AND allies
  | { kind: 'buff_strength'; amount: number }
  | { kind: 'buff_strength_all'; amount: number }
  | { kind: 'debuff_weak'; amount: number }
  | { kind: 'debuff_vulnerable'; amount: number }
  | { kind: 'sever'; } // moves its own binding to the other player (binding manipulation)
  /** S10a The Unstrung: a genuine dilemma reading the Chain — if the pair
   *  Resonates this turn it Frays both (pending); if they hold the harmony
   *  back it attacks its bound player amount×2. Fully telegraphed. */
  | { kind: 'read_chain'; amount: number; fray: number };

export interface EnemyDef {
  id: string;
  name: string;
  act: 1 | 2 | 3;
  elite?: boolean;
  boss?: boolean;
  hp: [number, number];
  script: EnemyIntent[];
  /** Mourner-style (§6): +strength each turn the chain held a 4+ same-player run */
  mournerMechanic?: { strengthPerTrigger: number };
  /** gains N Block at end of any turn in which ≥1 of its holder's... links did NOT fire */
  chainReader?: { blockPerUnfiredLink: number }; // Act 2 pressure (M2-B3)
  /** Choristers (§6): members share one HP pool; exactly one is unbound/untargetable */
  chorus?: boolean;
  /** The Unraveled (§6): at 50% HP severs the Thread for N turns, then reignites at 10 */
  unraveled?: { severTurns: number };
  // ---- S10a co-op hooks (composition rule: every enemy touches the co-op
  // layer; numbers provisional, mechanics telegraphed via mechanicLine) ----
  /** Tithe-Taker: the pool refunds this much Thread when it dies */
  threadOnDeath?: number;
  /** Half-Carried: on death it comes apart into `count` copies of `defId` */
  splitsOnDeath?: { defId: string; count: number };
  /** Votive Snuffer: gains this much Block every time a link fires */
  blockOnLinkFire?: number;
  /** Pall Warden: each enemy turn, rebinds to whoever played the LAST card
   *  in the resolved Chain — binding churn the pair can steer */
  rebindsToLastPlayed?: boolean;
  /** The Mislaid Sexton: every Nth turn, exhausts the top card of its bound
   *  player's discard (feeds on the unburied — stresses the Reclaim window) */
  exhaustsDiscardEvery?: number;
  /** Bell Wretch, Cracked: takes +N damage from hits the turn AFTER a
   *  Resonance ignition (the harmony hurts it) */
  crackedByResonance?: number;
  /** Descant Mote: Weak/Vulnerable applied to any OTHER enemy is copied
   *  onto it (a follower's echo — rewards debuff spread) */
  echoesDebuffs?: boolean;
  /** Choir Silence: while it lives, the FIRST link each turn does not fire
   *  (a held pause; a Pulse still punches through) */
  silencesFirstLink?: boolean;
  /** S10a legibility rule: the co-op hook stated in the intent UI, always
   *  visible — mechanics are read, not discovered by autopsy */
  mechanicLine?: string;
  flavor: string;
}

export interface EnemyState {
  id: string;
  defId: string;
  hp: number;
  maxHp: number;
  block: number;
  hex: number;
  weak: number;
  vulnerable: number;
  stun: number;
  strength: number;
  boundTo: PlayerId | null; // null = unbound (Choristers' third body)
  untargetable: boolean;
  scriptIndex: number;
  intent: EnemyIntent;
  /** nt-slice S6.5 (flagged finale boss only) — all three are RENDERED
   *  strings, safe to cross the wire; the pools stay server-side. */
  nameOverride?: string; // real face name, when earned at the shrine
  telegraph?: string | null; // whispered one turn before a hidden mechanic's first firing
  revealedMechanics?: string[]; // reveal lines earned at the shrine
}

// ---------------------------------------------------------------------------
// Events / map (§8, M2-B3/B5)
// ---------------------------------------------------------------------------

export type EventEffectOp =
  | { op: 'heal'; amount: number }
  | { op: 'loseHp'; amount: number } // M2-A3: cannot reduce below 1
  | { op: 'maxHp'; amount: number }
  | { op: 'gainCard'; pool: Rarity }
  | { op: 'gainRelic' }
  | { op: 'gold'; amount: number }
  | { op: 'covetCharge'; amount: number }
  | { op: 'pendingFray'; amount: number }
  | { op: 'thread'; amount: number } // affects next combat start via pendingThread
  | { op: 'upgradeRandom' }
  | { op: 'removeRandomStarter' }
  /** nt-slice: serve this clue event's fragments — rendered text pinned to
   *  the actor's and partner's Tapestries server-side. The fragment table
   *  (content/truth.ts) picks variants consistent with the rolled truth. */
  | { op: 'fragments' }
  /** S11.5 codex doors: ONE truth-consistent thread from the whole pool,
   *  served through the bound-witness channel (S11.3's single supply
   *  ledger) and pinned to the door's ACTOR. Without tracks there is no
   *  Tapestry to pin to — the op is silently nothing, and consumes no rng
   *  (rites-only streams stay whole). */
  | { op: 'fragment' }
  | { op: 'nothing' };

/** S11.4 (ruling 4): a state-keyed option's gate. Every clause must hold.
 *  Codex-keyed options are the flywheel hook — meta-knowledge opening
 *  in-run doors (state.codexProven, claimed at START_RUN). */
export interface EventRequirement {
  /** pair Thread pool >= n */
  thread?: number;
  /** pair gold >= n */
  gold?: number;
  /** subject HP <= n (the desperate door) */
  hpAtMost?: number;
  /** subject HP >= n */
  hpAtLeast?: number;
  /** subject deck carries >= n cards of this tag */
  tagCount?: { tag: BroadTag; n: number };
  /** this character stands somewhere in the run */
  character?: CharacterId;
  /** the profile codex has PROVEN this answer id */
  codexProven?: string;
}

/** S11.4: a deeper stage of an event — press-on / walk-away structure,
 *  max 3 stages (covenant-enforced), the pot visible throughout. */
export interface EventStageDef {
  prose: string;
  options: EventOptionDef[];
}

export interface EventOptionDef {
  id: string;
  label: string;
  resultText: string;
  witness: string;
  effects: EventEffectOp[];
  /** S11.4: choosing this leads DEEPER instead of ending the event */
  next?: EventStageDef;
  /** S11.4: gate on run state; unmet options never render (R6: doors you
   *  cannot open are doors you do not see) */
  requires?: EventRequirement;
}

export interface EventDef {
  id: string;
  name: string;
  act: 1 | 2 | 0; // 0 = either act
  crossed: boolean;
  /** crossed events: 60% consequence / 40% comedy (M2-B5) */
  tone?: 'consequence' | 'comedy';
  /** nt-slice clue event: only enters the pool when tracks is set, at
   *  elevated queue weight (map.ts) */
  clue?: boolean;
  /** S7.3 character event: enters the pool only when this character is in
   *  the run AND rites are on; 4× queue weight (2× clue events' — B6
   *  ruling, 2026-07-02). The event's ACTOR earns 1 birth-rite progress. */
  character?: CharacterId;
  /** S8.4 rare event (the wrong-way event): enters the pool only on flagged
   *  runs (tracks OR rites — the clue-event gating pattern, so unflagged
   *  runs keep the exact plain shuffle and its rng consumption), at HALF a
   *  normal event's queue weight in map.ts's weighted branch — a run can
   *  miss it entirely, which is the point. Never repeats within a run
   *  (rides the seenGatedEvents exclusion). */
  rare?: boolean;
  /** S11.4: a deep event whose top-stage outcomes reach relic-or-HP-chunk
   *  scale. The composition CI bounds these per act ([1, 3] once any
   *  exist); every worst line stays run-survivable by construction. */
  highStakes?: boolean;
  prose: string;
  options: EventOptionDef[];
}

// ---------------------------------------------------------------------------
// Narrative truth system (nt-slice — docs/threadbound_narrative_track_slice.md).
// Flag-gated behind TB_TRACKS: with the flag off, none of this state exists
// and the rng stream is untouched. Lore text is PROVISIONAL until the lore
// bible session; the STRUCTURE is the commitment.
// ---------------------------------------------------------------------------

export type QuestionKind = 'world' | 'self';

export interface QuestionDef {
  id: string;
  text: string;
  /** world questions key boss reveals; self questions key personal payoffs */
  kind: QuestionKind;
  /** payoff binding, interpreted at the shrine/boss layers.
   *  Slice: bossFace (real name + mechanic 1) · bossMechanic (mechanic 2) ·
   *  healEach (provisional heal 6 each). S8.2 adds covetEach (q_came true →
   *  +1 Covet charge each, cap-respecting — PROVISIONAL, designer question). */
  /** S14.3 (B4, per R8): q_came re-keyed covetEach → pendingThread — the
   *  Covet charge was unspendable where it landed (the shrine sits after
   *  the run's last reward screen). */
  payoff: 'bossFace' | 'bossMechanic' | 'healEach' | 'pendingThread';
}

export interface AnswerDef {
  questionId: string;
  id: string;
  /** answer chip text on the shared sheet */
  text: string;
  /** prose written to the codex when this answer is proven true */
  codexTruthEntry: string;
}

export interface FragmentDef {
  id: string;
  eventId: string;
  /** fragment A goes to the event's actor; B to the partner (Witness in solo) */
  channel: 'actor' | 'partner';
  text: string;
  bearsOn: string; // questionId
  /** answerIds struck by this fragment — SERVER-SECRET (§11 extension);
   *  materializes only as pooled strike-outs at the Loom's Eye */
  eliminates: string[];
  /** ascension-fraying reserve (spec ruling 9) — carried from day one,
   *  always 1 in the slice */
  strength: number;
}

/** A fragment as pinned to ONE player's Tapestry — the client-visible shape.
 *  Rendered text only; the elimination mapping never leaves the server. */
export interface PinnedFragment {
  fragmentId: string;
  eventId: string;
  act: number;
  questionId: string;
  text: string;
}

/** Who struck an answer, shown on the sheet ("source noted", ruling 6). */
export interface StruckSource {
  eventId: string;
  holder: PlayerId;
}

export interface ShrineState {
  /** the coveted relic, revealed BEFORE commitment (spec ruling 1);
   *  null only in the degenerate every-relic-owned case */
  stakeRelicId: string | null;
  /** one shared sheet (spec ruling 3): questionId → asserted answerId,
   *  or null = leave unspoken */
  sheet: Record<string, string | null>;
  /** pooled strike-outs per question, computed server-side from BOTH boards.
   *  Sources are stored pre-rendered ({event, holder} — never fragment ids)
   *  so the client projection needs no access to the fragment table. */
  struck: Record<string, Record<string, StruckSource[]>>;
  /** both must confirm the same filled state; any edit resets both */
  confirmed: Record<PlayerId, boolean>;
  /** per-question verdict, null until both confirm; stated completely
   *  before the boss node unlocks */
  verdict: Record<string, 'true' | 'false' | 'blank'> | null;
  stakeLost: boolean;
}

export interface TruthState {
  /** questionId → rolled answerId. SERVER-SECRET; stripped by redaction. */
  tuple: Record<string, string>;
  /** per-player pinned fragments. Each client receives its OWN board and
   *  only countable stubs of the partner's (spec ruling 5). */
  boards: Record<PlayerId, PinnedFragment[]>;
  shrine: ShrineState | null;
  /** nt-slice S6.5: the finale boss's rolled identity — face keyed off the
   *  q_what answer; two live mechanics ([0] q_what-bound, [1] q_why-bound).
   *  SERVER-SECRET until revealed. */
  boss: { faceAnswerId: string; liveMechanics: string[] };
  /** payoffs earned at the verdict, consumed by the boss layer (S6.5):
   *  bossFace = real name + mechanic 1 in the intent UI · bossMechanic =
   *  mechanic 2 · openingIntent = the all-true boon (full opening turn
   *  shown at the pre-boss rest) */
  reveals: { bossFace: boolean; bossMechanic: boolean; openingIntent: boolean };
  /** clue events already visited this run — excluded from later act maps so
   *  a scene never replays with a different fragment (designer ruling,
   *  2026-07-01 review). Optional: absent on pre-fix snapshots. */
  seenClueEvents?: string[];
}

/** S9a: the run's unlocked rite ids per role — the UNION of both profiles'
 *  claims (the S4 union rule extended to rites). An absent record or empty
 *  pool means ALL of that role's rites (seeded state unlocks everything; the
 *  read-path exists now so gating is never retrofitted). */
export type RiteUnlocks = Record<'vess' | 'bram', { death: string[]; birth: string[] }>;

/** S7 run state for the Rites; present only when the rites flag is set. */
export interface RitesState {
  /** run-start death offer: 2 seeded of the role's 4, per player; null once
   *  both have picked */
  offer: Record<PlayerId, string[]> | null;
  /** S9a: unlocked rite pools the death offer and birth trio draw from
   *  (absent = all unlocked — pre-S9a states and claimless seats) */
  unlocks?: RiteUnlocks;
  /** character-event resolutions credited to each ACTOR (threshold 2) */
  progress: Record<PlayerId, number>;
  /** character events already visited — never re-offered (clue-dedup rule) */
  seenEvents: string[];
  /** player owed a birth-rite pick right now, at the event screen (S7.4:
   *  the mirror arrives as a reward, not a schedule) */
  birthChoice: PlayerId | null;
  birthPicked: Record<PlayerId, boolean>;
}

export type NodeKind = 'combat' | 'elite' | 'boss' | 'event' | 'rest' | 'shop' | 'treasure' | 'loom';

export interface MapNode {
  id: number;
  kind: NodeKind;
  /** indices of reachable nodes in the next layer */
  edges: number[];
  layer: number;
  lane: number;
  encounterId?: string;
  eventId?: string;
  /** S11.6 scouting: the relic this knot carries, pinned at generation from
   *  a DERIVED stream (the live rng is never consumed). Flagged runs only —
   *  absent on unflagged maps, so their shape/hash/goldens are untouched.
   *  Victory rolls exactly as before and prefers the pin while unowned. */
  scoutRelicId?: string;
  /** S11.7 pacing-node variants (ruling 6), same derived-stream discipline
   *  and the same flagged-only absence rule: 'toll' rests heal ONE seat by
   *  vote-match; 'covet' treasures offer one-of-two, the other seizable
   *  with a Covet charge. The breath-before-boss layer never varies. */
  variant?: 'toll' | 'covet';
  /** S11.8 (TB_KNOTWORK only): which warp strand this node rides. Absent
   *  on knots (crossings belong to the weave), the shared breath layer,
   *  the boss — and on every node of a non-braid map. */
  strand?: 'truth' | 'power';
}

export interface MapState {
  act: 1 | 2 | 3;
  nodes: MapNode[];
  /** current node id, or -1 before the first pick of the act */
  position: number;
  picks: Record<PlayerId, number | null>; // M2-B3: both must pick the same node
  mismatchStreak: number; // Witness material (M2-B5)
  /** S11.2: knots (elites) cut THIS act — each kill tightens the remaining
   *  snarls (escalation ladder). Resets with the act map. */
  knotsCut: number;
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export interface PlayerStatuses {
  weak: number;
  vulnerable: number;
  frayed: number;
}

export interface PlayerState {
  id: PlayerId;
  character: CharacterId;
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  energyMax: number;
  kindled: number; // M2-A2
  momentum: number;
  fallen: boolean; // M2-A3
  statuses: PlayerStatuses;
  /** OQ#46: debuffs an enemy applied during its phase, activating at the start
   *  of this player's NEXT turn (so a 1-stack actually lasts a turn instead of
   *  being wiped before it can bite). Player-phase Fray (thread overdraft)
   *  stays immediate and is NOT routed here. */
  pendingStatus: PlayerStatuses;
  powers: string[]; // PowerDef ids (dormant while fallen)
  relics: string[]; // RelicDef ids
  /** S7: picked rites (death, then birth). Hidden-relic semantics; absent on
   *  pre-S7 snapshots and unflagged runs. */
  rites?: string[];
  deck: CardInstance[];
  draw: string[];
  hand: string[];
  discard: string[];
  exhaust: string[];
  combatCards: CardInstance[];
  covetCharges: number;
  ready: boolean;
  pendingFray: number;
  /** §14.13 (OQ#27) Pulsekeeper's Ring: run-persistent Pulse count while the
   *  ring is owned. Only incremented when this player owns the ring, so
   *  Pulses before acquisition never count. Every 3rd (counter ≡ 0 mod 3 on
   *  the Pulse being cast) costs 1 Thread instead of 2. */
  ringPulses: number;
}

export type ThreadActionKind = 'pulse' | 'reclaim' | 'sever' | 'steady';

export interface DeclaredThreadAction {
  player: PlayerId;
  kind: ThreadActionKind;
  /** sever: enemy id · reclaim: card in partner's discard or exhaust (S7.6) · pulse (§14.12):
   *  a staged card whose Link won't currently fire — forced at resolution */
  targetId?: string;
}

export interface ChainSlot {
  cardInstanceId: string;
  owner: PlayerId;
  targetId?: string;
}

export interface CombatState {
  enemies: EnemyState[];
  chain: ChainSlot[];
  threadActions: DeclaredThreadAction[];
  turn: number;
  lastSoloRun: number;
  steadyShield: number;
  /** M2-A1: hand contents at commit; survivors discard at end of resolution */
  handSnapshot: Record<PlayerId, string[]>;
  /** The Unraveled (§6): >0 = Thread severed (no actions/regen/cross-player links) */
  severedTurns: number;
  severTriggered: boolean;
  /** S2.1: solo Witness chatter budget — capped per combat. Optional so
   *  pre-S1 persisted rooms restore cleanly. */
  witnessLines?: number;
  /** S9c.3: the rite_reclaim pool fires at most once per combat. Optional
   *  for persisted-room compatibility. */
  riteReclaimSaid?: boolean;
  /** S11.2 snarl escalation: the increment this combat carries (0 for
   *  non-elite fights). Optional for persisted-room compatibility. */
  escalation?: number;
  /** S11.2 calibration instrument: pair HP lost THIS combat. */
  hpLostThisCombat?: number;
  /** PT2/OQ#29: `holder:event` keys of oncePerTurn hooks already fired this
   *  turn. Optional for persisted-room compatibility. */
  hookOnceFired?: string[];
  /** S7.1: oncePerCombat hook charges — set at first fire, never reset */
  hookCombatFired?: string[];
  /** S10a: did the pair ignite a Resonance in the most recently RESOLVED
   *  chain? Set after each card loop (so during a resolution it still reads
   *  the previous turn). Keys Bell Wretch, Cracked and The Unstrung.
   *  Optional for persisted-room compatibility. */
  resonatedLastTurn?: boolean;
  /** S10a Pall Warden: owner of the last card in the last resolved chain */
  lastChainOwner?: PlayerId;
}

export interface RewardState {
  sets: Record<PlayerId, string[]>;
  picked: Record<PlayerId, string | 'skip' | null>;
  coveted: Record<PlayerId, string | 'pass' | null>;
  gold: number; // already collected; displayed
  relic?: string; // elite/treasure drop, auto-collected (alternates owners)
  /** S13.3 pick-with-removal (D4: option A — act-2+ screens only): taking a
   *  card on this screen opens a free, once-per-screen offer to remove one
   *  STARTER from the taker's deck (starters only, so it cannot strip-mine
   *  the picked engines; no gold interaction — the shop service stays the
   *  paid, escalating, any-card version). Keys are created LAZILY per seat
   *  at the moment a card is taken, so act-1 screens and pickless treasure
   *  screens keep their exact pre-S13 state shape. null = offer open;
   *  instanceId = the starter removed; 'pass' = declined. */
  removals?: Partial<Record<PlayerId, string | 'pass' | null>>;
}

export interface EventPhaseState {
  eventId: string;
  chooser: PlayerId;
  subject: PlayerId;
  chosen: string | null;
  resultText?: string;
  /** S11.4: option ids chosen so far on the way down (empty/absent = the
   *  first stage; the grammar is backward-compatible — existing events are
   *  1-stage and never set this) */
  stagePath?: string[];
  /** S11.4: the POT — every visible effect applied on the way down, shown
   *  to both seats while the wager deepens */
  pot?: EventEffectOp[];
  /** S11.4: the delta line — one generated sentence of what actually
   *  changed, rendered post-resolution (kills the oath-ring confusion) */
  deltaLine?: string;
}

export type RestOption = 'rest' | 'barter' | 'rebraid' | 'upgrade' | 'wedding';

export interface RestState {
  chosen: Record<PlayerId, RestOption | null>;
  /** M2-B6: chosen 'upgrade' → must then UPGRADE_PICK */
  upgradePicked: Record<PlayerId, boolean>;
  /** S11.7 toll-door rest: one seat heals (bigger), named by vote-match
   *  like NODE_PICK — the negotiation is the point. Present only at toll
   *  variant nodes (flagged maps); REST_CHOOSE is closed at the door. */
  toll?: { votes: Record<PlayerId, PlayerId | null>; healed: PlayerId | null };
  /** §7 Wedding Knife: both pick a card, both confirm, decks swap permanently */
  wedding: null | {
    offers: Record<PlayerId, string | null>; // cardInstanceId
    confirmed: Record<PlayerId, boolean>;
    done: boolean;
  };
}

export interface ShopItem {
  id: string;
  kind: 'card' | 'relic' | 'removal';
  /** cards are offered per-character; removal service rows are per-player
   *  (S4.2 — each player removes from their own deck at their own price) */
  forPlayer?: PlayerId;
  refId?: string; // cardDefId or relicId
  /** removal rows: ignored — the live price is removalPrice(state, player),
   *  run-persistent escalation per OQ#8 */
  price: number;
  sold: boolean;
}

export interface ShopState {
  items: ShopItem[];
}

export type GameEvent =
  | { e: 'thread_action'; player: PlayerId; kind: ThreadActionKind; detail?: string }
  | { e: 'fray' }
  | { e: 'card'; player: PlayerId; card: string; slot: number; linkFired: boolean; resonance: boolean }
  // M2-D2: hpLoss is post-block; blocked is the absorbed portion
  | { e: 'damage'; target: string; hpLoss: number; blocked: number }
  | { e: 'block'; target: string; amount: number }
  | { e: 'hex'; target: string; amount: number }
  | { e: 'detonate'; target: string; stacks: number; damage: number }
  | { e: 'enemy_action'; enemy: string; detail: string }
  | { e: 'enemy_dead'; enemy: string }
  | { e: 'player_hit'; player: PlayerId; hpLoss: number; blocked: number }
  | { e: 'fallen'; player: PlayerId } // M2-A3
  | { e: 'revived'; player: PlayerId }
  | { e: 'thread_severed'; turns: number } // Unraveled
  | { e: 'thread_reignited' }
  | { e: 'resonance_ignite'; slot: number; tags: string[]; card?: string } // card: S9c.5 rung i (log line names the ignited card)
  | { e: 'relic'; player: PlayerId; relic: string }
  | { e: 'witness'; line: string }
  | { e: 'info'; detail: string };

export interface GameState {
  version: 2;
  seed: number;
  rng: number;
  phase: Phase;
  /** S1: solo mode — which seat the in-process bot holds. Absent in co-op.
   *  Drives the Witness's solo voice profile (S2.1); never changes rules. */
  botSeat?: PlayerId;
  map: MapState;
  gold: number; // shared (§8)
  /** S4.2 (OQ#8): removals bought this RUN, per player — the run-persistent
   *  escalation counter. Price = 75 + 25 × this, paid from the shared purse. */
  removalsByPlayer: Record<PlayerId, number>;
  /** S4.4: active ascension level (0–5), applied at run start as composable
   *  rung flags (ascensionMods). All numbers provisional until Playtest 2. */
  ascension: number;
  /** S4.4: lobby votes — both players must confirm the same level (concede
   *  pattern). Default 0/0, so an untouched lobby starts at A0. */
  ascensionVotes: Record<PlayerId, number>;
  /** S4.5: union of both players' unlocked card sets, sent by the server at
   *  run start. Only consulted for ids in LOCKED_CARDS (empty until a locked
   *  set is authored), so the default ships with everything unlocked. */
  unlockedCards: string[];
  /** nt-slice: narrative truth run flag (server reads TB_TRACKS and passes it
   *  through START_RUN). Absent — not false — when unflagged, so flag-off
   *  serialized state is byte-identical to pre-slice state. */
  tracks?: true;
  /** nt-slice run state; present only when tracks is set */
  truth?: TruthState;
  /** S8.7 voice arc: profile codex fill % (0–100), the max over the two
   *  seats' claims, passed through START_RUN. Keys the Witness's register
   *  selection (witness-draw) — never rules. Absent — not 0 — when unset or
   *  zero, so pre-S8.7 serialized states stay byte-identical. */
  codexPct?: number;
  /** S11.4 flywheel hook: answer ids the profile codex has PROVEN (claimed
   *  at START_RUN, S4 union rule across seats) — codex-keyed event options
   *  read this. Absent on runs that claim nothing. */
  codexProven?: string[];
  /** S7: rites run flag (server reads TB_RITES and passes it through
   *  START_RUN). Absent — not false — when unflagged (tracks pattern). */
  rites?: true;
  /** S11.8 (Wave B): the braid run flag (server reads TB_KNOTWORK, tracks
   *  pattern — absent when unflagged, so flag-off state is byte-identical
   *  and the current generator remains the unflagged path). */
  knotwork?: true;
  /** S7 rites run state; present only when rites is set */
  ritesState?: RitesState;
  /** S9d.2 run tallies; present only when rites is set (grower rites) */
  tallies?: RunTallies;
  /** S8.4 rare events (wrong-way) already visited — never re-offered, the
   *  clue-dedup rule. Rare events are neither clue nor character, so they
   *  get their own list; it is only ever created on flagged runs (rare
   *  events exist in no unflagged pool), so flag-off serialized state is
   *  untouched. */
  seenRareEvents?: string[];
  /** S16-D7 (OQ#45, ruled): per-run count of single-enemy (elite/boss)
   *  binding assignments per seat — the anti-streak counter. Single-body
   *  fights bind toward the seat bound LESS; ties keep the rolled coin.
   *  Created on the first such fight (multi-enemy split behavior and its
   *  state shape are untouched). */
  bindsByPlayer?: Record<PlayerId, number>;
  /** event grants banked for the next combat's opening Thread */
  pendingThread: number;
  thread: number;
  threadMax: number;
  rebraidUsed: boolean;
  players: Record<PlayerId, PlayerState>;
  combat: CombatState | null;
  reward: RewardState | null;
  event: EventPhaseState | null;
  rest: RestState | null;
  shop: ShopState | null;
  /** S11.7 covet cache (flagged maps only — absent otherwise, so unflagged
   *  shape/hash hold): the treasure rolled its spoils as usual, but the pair
   *  takes ONE by vote-match; a Covet charge seizes the other. */
  covetTreasure?: CovetTreasureState | null;
  advanceReady: Record<PlayerId, boolean>;
  concede: Record<PlayerId, boolean>;
  witnessSaid: string[];
  log: GameEvent[];
  telemetry: Telemetry;
}

/** S11.7: the covet cache's table state. Spoils use the plain treasure's
 *  exact rolls (gold, relic, owner) — only the GRANT is negotiated. */
export interface CovetTreasureState {
  gold: number;
  relicId: string;
  /** the seat the relic goes to if taken/seized (the plain treasure's roll) */
  owner: PlayerId;
  votes: Record<PlayerId, 'gold' | 'relic' | null>;
  taken: 'gold' | 'relic' | null;
  seizedBy: PlayerId | null;
}

export interface ActStats {
  cardsPlayed: number;
  linksFired: number;
  combats: number;
  hpLost: number;
  /** S4.1: per-act gold flow */
  goldEarned: number;
  goldSpent: number;
}

/** S4.1: where gold comes from. */
export type GoldSource = 'combat' | 'elite' | 'boss' | 'event' | 'treasure';

/** S14.1 (sweep B23): where a relic came from. 'drop' = the elite
 *  after-combat roll; 'boss' = the same roll on a boss node. */
export type RelicSource = 'drop' | 'boss' | 'shop' | 'treasure' | 'event' | 'shrine';

export interface Telemetry {
  cardsPlayed: number;
  linksFired: number;
  resonances: number;
  /** per-encounter difficulty attribution: pair HP lost + combat count,
   *  keyed by encounterId (comfort pass, pre-S10a battery gate 4) */
  encounterStats?: Record<string, { combats: number; hpLost: number }>;
  /** S11.2 calibration gate: per elite fight, the kill ORDER it was fought
   *  at (0 = first knot of the act) and the pair HP it cost. The gate wants
   *  last-killed >= 2x first-killed across the battery. */
  eliteFights?: Array<{ act: number; order: number; hpLost: number; won: boolean }>;
  resonanceTagCounts: Record<string, number>;
  /** damage attribution; 'HexScaling' bucket for hex-scaling Strike damage (M2-B1) */
  damageByTag: Record<string, number>;
  /** end-of-run summary fodder (M3 downtime list) */
  damageByPlayer: Record<PlayerId, number>;
  detonatedStacks: number;
  /** review pass: bursts, for avg-stacks-at-detonation — is Hex still
   *  bank-and-burst, or did §14.10 Hatpins turn it into a drip? */
  detonationEvents: number;
  covetsSpent: Record<PlayerId, number>;
  biggestTurn: { damage: number; turn: number; act: number };
  turns: number;
  /** per-act link-fire climb + difficulty gates (M2-A5/C) */
  actStats: Record<number, ActStats>;
  /** S3.1 per-character splits (keyed by seat; reports map seat → character) */
  blockByPlayer: Record<PlayerId, number>;
  linkFiresByPlayer: Record<PlayerId, number>;
  fallsByPlayer: Record<PlayerId, number>;
  /** S3.1 scaling-floor health stat, counterpart to avg-stacks-at-detonation */
  wornKnife: { plays: number; damage: number };
  /** S3.1 thread economy */
  threadSpent: number;
  threadSpendByKind: Record<ThreadActionKind, number>;
  regenWastedAtCap: number;
  /** S3.3b: fired links that only fired because of a Pulse, and Resonance
   *  streaks that needed one */
  forcedLinkFires: number;
  resonancesForced: number;
  /** S4.1 gold economy: earned by source, spent per player by category */
  goldEarnedBySource: Record<GoldSource, number>;
  goldSpentByCategory: Record<PlayerId, { cards: number; relics: number; removals: number }>;
  /** S4.1: mirrors the S4.2 run counter, logged separately so the telemetry
   *  survives even if the counter implementation moves */
  removalsByPlayer: Record<PlayerId, number>;
  /** S4.1: purse at run end — is removal escalation a constraint or theater? */
  goldResidual: number;
  /** S4.3 (OQ#27): discounted Pulses fired by the Ring — is the relic dead
   *  at human Pulse rates? */
  ringDiscountsFired: number;
  /** S13.1c economy telemetry: per-act (NOT end-of-run — closes the
   *  run-length confound the S12 brief flagged) card-reward take/skip per
   *  seat, and per-act relic/deck growth. Observational only (never hashed). */
  economy: {
    /** reward-screen picks, per act per seat: taken (a card joined the deck)
     *  vs skipped. Treasure screens pre-fill 'skip' without a choice and are
     *  not counted — this reads DECISIONS. */
    picks: Record<number, Record<PlayerId, { taken: number; skipped: number }>>;
    /** relics granted per act (pair total) */
    relicsByAct: Record<number, number>;
    /** cards that joined a deck per act per seat — every channel (reward,
     *  covet, shop, event) flows through one choke point */
    deckAddsByAct: Record<number, Record<PlayerId, number>>;
    /** cards removed per act per seat (shop service, events, S13.3 lever) */
    deckRemovalsByAct: Record<number, Record<PlayerId, number>>;
  };
  /** S14.1 (sweep B23) per-card attribution — the "dead cards /
   *  never-bought relics" instrument the content-audit lens was blind
   *  without. picks counts every deck join per card def per seat (any
   *  channel — the addCardToDeck choke point); plays counts resolutions
   *  (starters included); winningDeck is written ONCE at victory (copies
   *  of each def in each seat's final deck). Observational only —
   *  telemetry is hash-excluded by design. */
  cards: {
    picks: Record<string, Record<PlayerId, number>>;
    plays: Record<string, Record<PlayerId, number>>;
    winningDeck: Record<string, Record<PlayerId, number>>;
  };
  /** S14.1 (sweep B23): each acquired relic's channel (relicId → source;
   *  relics are pair-unique, so one entry per relic per run) */
  relicSources: Record<string, RelicSource>;
  /** nt-slice S6.8: the slice's behavioral instrumentation (spec pass/fail
   *  is judged on this). Present only on flagged runs. */
  truth?: {
    clueEventsOffered: number;
    clueEventsTaken: number;
    fragmentsByPlayer: Record<PlayerId, number>;
    /** S11.3 fragment-supply keys (the stranger cohort's D2 instruments) */
    boundWitnessFragments?: number;
    distinctEliminations?: number;
    /** OQ#57 instruments (written at run end): questions with <=1 answer
     *  left standing (confident) and exactly 2 left (a narrowed gamble) —
     *  the S11.3 target band's REAL measure, replacing the elimination
     *  proxy. */
    questionsConfident?: number;
    questionsNarrowed?: number;
    /** T-key opens per act — is the board used? (client-reported) */
    boardOpensByAct: Record<number, number>;
    /** sheet-edit churn at the shrine (talk proxy) */
    sheetEdits: number;
    /** answers struck by pooled evidence at shrine entry */
    struckAtShrine: number;
    /** questions arriving pre-filled (all-but-one struck) */
    autoCompleted: number;
    /** per-question outcome, written at the verdict */
    outcome: Record<string, 'blank' | 'true' | 'false'> | null;
    stake: { relicId: string | null; rare: boolean; lost: boolean } | null;
    /** what the verdict wrote to the profile codex (spec S6.8 'codex
     *  writes') — mirrors the client rule: asserted-true → truths,
     *  asserted-false → eliminations. Written at the verdict. */
    codexWrites: { truths: string[]; eliminations: string[] } | null;
  };
  /** S7.8: rites instrumentation. Present only on flagged runs. */
  rites?: {
    deathPick: Record<PlayerId, string | null>;
    birthPick: Record<PlayerId, string | null>;
    characterEvents: Record<PlayerId, number>;
    /** where the birth pick landed — the data that arbitrates L7 vs L8 */
    birthTiming: Record<PlayerId, { act: number; layer: number } | null>;
    /** S9d gate 3: max growth step each rite card reached this run
     *  (defId → bonus or tier count) — "an axis nobody feeds is a dead
     *  archetype" needs an instrument */
    growth?: Record<string, number>;
    /** OQ#57 instrument: rite-card PLAYS per seat (S9c gate 2's direction
     *  read gets its real measure, replacing the realized-growth proxy) */
    ritePlays?: Record<PlayerId, number>;
  };
}

// ---------------------------------------------------------------------------
// Actions (intents)
// ---------------------------------------------------------------------------

export type Action =
  /** unlockedCards: S4.5 union of both players' unlocked sets (server-built;
   *  profiles are claims, the server clamps). Omitted = everything. */
  /** tracks: nt-slice narrative truth flag — server-set from TB_TRACKS */
  /** riteUnlocks: S9a union of both profiles' rite unlocks (server-built,
   *  same union rule as unlockedCards). Omitted = everything. */
  | { type: 'START_RUN'; seed: number; unlockedCards?: string[]; tracks?: boolean; rites?: boolean; knotwork?: boolean; codexPct?: number; riteUnlocks?: RiteUnlocks; codexProven?: string[] }
  /** S7.2/S7.4: pick a rite — from the death offer in the rites phase, or
   *  the birth trio when this player's birthChoice is owed at an event */
  | { type: 'RITE_PICK'; player: PlayerId; riteId: string }
  /** S4.4: lobby ascension vote — both players must land on the same level */
  | { type: 'SET_ASCENSION'; player: PlayerId; level: number }
  | { type: 'NODE_PICK'; player: PlayerId; nodeId: number } // M2-B3
  | { type: 'STAGE_CARD'; player: PlayerId; cardInstanceId: string; slot: number; targetId?: string }
  | { type: 'UNSTAGE_CARD'; player: PlayerId; cardInstanceId: string }
  | { type: 'REORDER'; player: PlayerId; cardInstanceId: string; slot: number }
  | { type: 'DECLARE_THREAD'; player: PlayerId; kind: ThreadActionKind; targetId?: string }
  | { type: 'UNDECLARE_THREAD'; player: PlayerId; kind: ThreadActionKind }
  | { type: 'SET_READY'; player: PlayerId; ready: boolean }
  | { type: 'REWARD_PICK'; player: PlayerId; pick: string | 'skip' }
  | { type: 'COVET_PICK'; player: PlayerId; pick: string | 'pass' }
  /** S13.3 pick-with-removal: spend this screen's open offer — remove one
   *  STARTER (by instanceId) from your own deck, or 'pass' to keep them all */
  | { type: 'REWARD_REMOVE'; player: PlayerId; pick: string | 'pass' }
  | { type: 'EVENT_CHOOSE'; player: PlayerId; optionId: string }
  | { type: 'REST_CHOOSE'; player: PlayerId; option: RestOption }
  // S11.7 pacing-node variants (flagged maps only)
  | { type: 'TOLL_PICK'; player: PlayerId; seat: PlayerId } // name who the door heals
  | { type: 'TREASURE_PICK'; player: PlayerId; choice: 'gold' | 'relic' }
  | { type: 'TREASURE_SEIZE'; player: PlayerId } // spend a Covet charge for the rest
  | { type: 'UPGRADE_PICK'; player: PlayerId; cardInstanceId: string } // M2-B6
  | { type: 'WEDDING_PICK'; player: PlayerId; cardInstanceId: string } // §7
  | { type: 'WEDDING_CONFIRM'; player: PlayerId }
  | { type: 'SHOP_BUY'; player: PlayerId; itemId: string } // M2-B4
  | { type: 'SHOP_REMOVE'; player: PlayerId; itemId: string; cardInstanceId: string }
  /** nt-slice S6.8: client-reported Tapestry open (telemetry only, no rules
   *  effect) — flagged runs only */
  | { type: 'BOARD_OPENED'; player: PlayerId }
  /** nt-slice S6.4: edit the ONE shared sheet (ruling 3) — assert an answer
   *  or return the question to unspoken (null). Any edit resets both
   *  confirmations. */
  | { type: 'LOOM_SHEET_SET'; player: PlayerId; questionId: string; answerId: string | null }
  /** both must confirm the same filled state; the verdict resolves when the
   *  second confirmation lands */
  | { type: 'LOOM_CONFIRM'; player: PlayerId; confirm: boolean }
  | { type: 'ADVANCE'; player: PlayerId }
  /** abandon the run — both must confirm; even quitting is co-op */
  | { type: 'CONCEDE'; player: PlayerId; confirm: boolean };

export class IllegalAction extends Error {}
