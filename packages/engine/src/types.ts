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
  | 'map' // M2-B3: both players pick the same next node to advance
  | 'combat'
  | 'reward'
  | 'event'
  | 'rest'
  | 'shop' // M2-B4
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
  | { op: 'damagePerHex'; base: number; perHex: number; primary?: boolean }
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
  | 'linkFired'; // one of the holder's cards fired its link

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
}

/** Named passive behaviors special-cased by the engine. */
export type PassiveId =
  | 'momentumNoHalve' // Wildfire Heart
  | 'pulsePlusOne' // Pulse grants +4 instead of +3 (relic space)
  | 'threadRegenPlusOne' // +1 Thread regen per turn
  | 'covetMaxPlusOne' // may hold 3 Covet charges
  | 'handRetainOne' // M2-A1: retain 1 card at end of turn
  | 'startCombatFrayImmune' // first Fray each combat is absorbed
  | 'echoesDontExhaust' // Echoes persist for the whole combat... still combat-only
  | 'wedding_knife'; // §7: enables the rest-site trade (special-cased)

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
  hooks?: Hook[];
  passives?: PassiveId[];
  /** one-time grant when acquired */
  onPickup?: HookOp[];
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
  | { kind: 'block'; amount: number }
  | { kind: 'block_all'; amount: number } // blocks self AND allies
  | { kind: 'buff_strength'; amount: number }
  | { kind: 'buff_strength_all'; amount: number }
  | { kind: 'debuff_weak'; amount: number }
  | { kind: 'debuff_vulnerable'; amount: number }
  | { kind: 'sever'; }; // moves its own binding to the other player (binding manipulation)

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
  | { op: 'nothing' };

export interface EventOptionDef {
  id: string;
  label: string;
  resultText: string;
  witness: string;
  effects: EventEffectOp[];
}

export interface EventDef {
  id: string;
  name: string;
  act: 1 | 2 | 0; // 0 = either act
  crossed: boolean;
  /** crossed events: 60% consequence / 40% comedy (M2-B5) */
  tone?: 'consequence' | 'comedy';
  prose: string;
  options: EventOptionDef[];
}

export type NodeKind = 'combat' | 'elite' | 'boss' | 'event' | 'rest' | 'shop' | 'treasure';

export interface MapNode {
  id: number;
  kind: NodeKind;
  /** indices of reachable nodes in the next layer */
  edges: number[];
  layer: number;
  lane: number;
  encounterId?: string;
  eventId?: string;
}

export interface MapState {
  act: 1 | 2 | 3;
  nodes: MapNode[];
  /** current node id, or -1 before the first pick of the act */
  position: number;
  picks: Record<PlayerId, number | null>; // M2-B3: both must pick the same node
  mismatchStreak: number; // Witness material (M2-B5)
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
  powers: string[]; // PowerDef ids (dormant while fallen)
  relics: string[]; // RelicDef ids
  deck: CardInstance[];
  draw: string[];
  hand: string[];
  discard: string[];
  exhaust: string[];
  combatCards: CardInstance[];
  covetCharges: number;
  ready: boolean;
  pendingFray: number;
  pulseBonus: number;
}

export type ThreadActionKind = 'pulse' | 'reclaim' | 'sever' | 'steady';

export interface DeclaredThreadAction {
  player: PlayerId;
  kind: ThreadActionKind;
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
}

export interface RewardState {
  sets: Record<PlayerId, string[]>;
  picked: Record<PlayerId, string | 'skip' | null>;
  coveted: Record<PlayerId, string | 'pass' | null>;
  gold: number; // already collected; displayed
  relic?: string; // elite/treasure drop, auto-collected (alternates owners)
}

export interface EventPhaseState {
  eventId: string;
  chooser: PlayerId;
  subject: PlayerId;
  chosen: string | null;
  resultText?: string;
}

export type RestOption = 'rest' | 'barter' | 'rebraid' | 'upgrade' | 'wedding';

export interface RestState {
  chosen: Record<PlayerId, RestOption | null>;
  /** M2-B6: chosen 'upgrade' → must then UPGRADE_PICK */
  upgradePicked: Record<PlayerId, boolean>;
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
  forPlayer?: PlayerId; // cards are offered per-character
  refId?: string; // cardDefId or relicId
  price: number;
  sold: boolean;
}

export interface ShopState {
  items: ShopItem[];
  removalsBought: number;
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
  | { e: 'resonance_ignite'; slot: number; tags: string[] }
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
  advanceReady: Record<PlayerId, boolean>;
  concede: Record<PlayerId, boolean>;
  witnessSaid: string[];
  log: GameEvent[];
  telemetry: Telemetry;
}

export interface ActStats {
  cardsPlayed: number;
  linksFired: number;
  combats: number;
  hpLost: number;
}

export interface Telemetry {
  cardsPlayed: number;
  linksFired: number;
  resonances: number;
  resonanceTagCounts: Record<string, number>;
  /** damage attribution; 'HexScaling' bucket for hex-scaling Strike damage (M2-B1) */
  damageByTag: Record<string, number>;
  /** end-of-run summary fodder (M3 downtime list) */
  damageByPlayer: Record<PlayerId, number>;
  detonatedStacks: number;
  covetsSpent: Record<PlayerId, number>;
  biggestTurn: { damage: number; turn: number; act: number };
  turns: number;
  /** per-act link-fire climb + difficulty gates (M2-A5/C) */
  actStats: Record<number, ActStats>;
}

// ---------------------------------------------------------------------------
// Actions (intents)
// ---------------------------------------------------------------------------

export type Action =
  | { type: 'START_RUN'; seed: number }
  | { type: 'NODE_PICK'; player: PlayerId; nodeId: number } // M2-B3
  | { type: 'STAGE_CARD'; player: PlayerId; cardInstanceId: string; slot: number; targetId?: string }
  | { type: 'UNSTAGE_CARD'; player: PlayerId; cardInstanceId: string }
  | { type: 'REORDER'; player: PlayerId; cardInstanceId: string; slot: number }
  | { type: 'DECLARE_THREAD'; player: PlayerId; kind: ThreadActionKind; targetId?: string }
  | { type: 'UNDECLARE_THREAD'; player: PlayerId; kind: ThreadActionKind }
  | { type: 'SET_READY'; player: PlayerId; ready: boolean }
  | { type: 'REWARD_PICK'; player: PlayerId; pick: string | 'skip' }
  | { type: 'COVET_PICK'; player: PlayerId; pick: string | 'pass' }
  | { type: 'EVENT_CHOOSE'; player: PlayerId; optionId: string }
  | { type: 'REST_CHOOSE'; player: PlayerId; option: RestOption }
  | { type: 'UPGRADE_PICK'; player: PlayerId; cardInstanceId: string } // M2-B6
  | { type: 'WEDDING_PICK'; player: PlayerId; cardInstanceId: string } // §7
  | { type: 'WEDDING_CONFIRM'; player: PlayerId }
  | { type: 'SHOP_BUY'; player: PlayerId; itemId: string } // M2-B4
  | { type: 'SHOP_REMOVE'; player: PlayerId; itemId: string; cardInstanceId: string }
  | { type: 'ADVANCE'; player: PlayerId }
  /** abandon the run — both must confirm; even quitting is co-op */
  | { type: 'CONCEDE'; player: PlayerId; confirm: boolean };

export class IllegalAction extends Error {}
