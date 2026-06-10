// Core types for the Threadbound engine. Design doc references as §N.

export type PlayerId = 'p1' | 'p2';
export type CharacterId = 'vess' | 'bram';
export type BroadTag = 'Strike' | 'Guard' | 'Hex' | 'Surge' | 'Rite'; // §4
export type Rarity = 'common' | 'uncommon' | 'rare';

// Link conditions: broad tags + 'any' at all rarities; 'partner' is a narrow
// rare-only condition (§2.2 / content-audit).
export type LinkCondition = BroadTag | 'any' | 'partner';

export type Phase =
  | 'lobby'
  | 'map'
  | 'combat'
  | 'reward'
  | 'event'
  | 'rest'
  | 'game_over'
  | 'victory';

// ---------------------------------------------------------------------------
// Effects — the data-op language card content is written in. The engine's
// interpreter (effects.ts) is the only place these are given meaning.
// ---------------------------------------------------------------------------

export type EffectOp =
  | { op: 'damage'; amount: number; times?: number; primary?: boolean }
  | { op: 'damageAll'; amount: number; primary?: boolean }
  // damage equal to base + perHex * target's Hex stacks (does not detonate)
  | { op: 'damagePerHex'; base: number; perHex: number; primary?: boolean }
  // Haymaker: +Momentum×mult damage rider, and optionally skip the halving
  | { op: 'momentumStrikeBonus'; mult: number; keepMomentum?: boolean }
  | { op: 'block'; amount: number; primary?: boolean }
  | { op: 'partnerBlock'; amount: number }
  | { op: 'hex'; amount: number; primary?: boolean }
  | { op: 'hexAll'; amount: number; primary?: boolean }
  // Needlework: +1 Hex per link fired earlier in this Chain
  | { op: 'hexPerLinkFired'; per: number }
  | { op: 'doubleHex' }
  | { op: 'detonate'; max?: number } // detonate all (or up to max) Hexes on target
  | { op: 'detonateAllEnemies' }
  // Final Word: after detonating everything, deal damage = stacks detonated
  | { op: 'damagePerDetonated'; per: number }
  | { op: 'weak'; amount: number }
  | { op: 'weakAll'; amount: number }
  | { op: 'vulnerable'; amount: number }
  | { op: 'momentum'; amount: number; primary?: boolean }
  | { op: 'draw'; amount: number }
  | { op: 'partnerDraw'; amount: number }
  | { op: 'energy'; amount: number }
  | { op: 'thread'; amount: number }
  | { op: 'power'; power: PowerId };

export type PowerId =
  | 'black_lattice' // §9: whenever Hexes detonate, gain 3 Block
  | 'stoke' // §9: at the start of your turn, gain 2 Momentum
  | 'unbroken_line' // at the start of each turn, gain 1 Thread
  | 'wildfire_heart'; // Momentum no longer halves

export interface CardDef {
  id: string;
  name: string;
  character: CharacterId | 'neutral';
  rarity: Rarity;
  cost: number;
  tag: BroadTag;
  exhaust?: boolean;
  text: string; // display text; rules live in `base`/`link`
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
}

export interface CardInstance {
  instanceId: string;
  defId: string;
  /** Reclaimed Echo (§5): ethereal copy, exhausts at end of combat */
  echo?: boolean;
  /** Echo arrived mutated (§7) — use def.mutation text/effects */
  mutated?: boolean;
}

// ---------------------------------------------------------------------------
// Enemies (§6)
// ---------------------------------------------------------------------------

export type EnemyIntent =
  | { kind: 'attack'; amount: number; times?: number }
  | { kind: 'attack_all'; amount: number }
  | { kind: 'attack_momentum'; base: number; perMomentum: number } // Reliquary Mite
  | { kind: 'attack_drain'; amount: number; threadDrain: number } // Thread-Leech
  | { kind: 'block'; amount: number }
  | { kind: 'buff_strength'; amount: number }
  | { kind: 'debuff_weak'; amount: number };

export interface EnemyDef {
  id: string;
  name: string;
  elite?: boolean;
  hp: [number, number]; // min/max roll at spawn
  /** fixed rotation of intents; index advances each turn (deterministic). */
  script: EnemyIntent[];
  /** The Mourner (§6): +strength each turn the chain held a 4+ same-player run */
  mournerMechanic?: { strengthPerTrigger: number };
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
  boundTo: PlayerId; // §6
  scriptIndex: number;
  intent: EnemyIntent;
}

// ---------------------------------------------------------------------------
// Events / map (§8)
// ---------------------------------------------------------------------------

export interface EventOptionDef {
  id: string;
  label: string;
  resultText: string;
  witness: string;
  effects: Array<
    | { op: 'heal'; amount: number }
    | { op: 'loseHp'; amount: number }
    | { op: 'gainCard'; pool: 'uncommon' }
    | { op: 'pendingFray'; amount: number }
    | { op: 'nothing' }
  >;
}

export interface EventDef {
  id: string;
  name: string;
  crossed: boolean; // §8 crossed choices: chooser picks for the subject
  prose: string;
  options: EventOptionDef[];
}

export type NodeKind = 'combat' | 'elite' | 'event' | 'rest';

export interface MapNode {
  kind: NodeKind;
  encounterId?: string; // combat/elite
  eventId?: string; // event
}

// ---------------------------------------------------------------------------
// Game state
// ---------------------------------------------------------------------------

export interface PlayerStatuses {
  weak: number;
  vulnerable: number;
  frayed: number; // §4/§5: +25% damage taken per stack, this turn
}

export interface PlayerState {
  id: PlayerId;
  character: CharacterId;
  hp: number;
  maxHp: number;
  block: number;
  energy: number;
  energyMax: number;
  momentum: number;
  statuses: PlayerStatuses;
  powers: PowerId[];
  deck: CardInstance[]; // run deck (master copies)
  draw: string[]; // instanceIds
  hand: string[];
  discard: string[];
  exhaust: string[];
  /** combat-only instances (Echoes) live here so the run deck stays clean */
  combatCards: CardInstance[];
  covetCharges: number; // §8
  ready: boolean;
  pendingFray: number; // Basin event consequence
  /** Pulse (§5): +3 to the primary number of this player's next resolved card */
  pulseBonus: number;
}

export type ThreadActionKind = 'pulse' | 'reclaim' | 'sever' | 'steady';

export interface DeclaredThreadAction {
  player: PlayerId;
  kind: ThreadActionKind;
  /** reclaim: partner discard instanceId; sever: enemyId */
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
  /** longest single-player consecutive run in last resolved chain (Mourner food) */
  lastSoloRun: number;
  /** Steady (§5): prevents the next Fray this turn */
  steadyShield: number;
}

export interface RewardState {
  sets: Record<PlayerId, string[]>; // cardDefIds
  picked: Record<PlayerId, string | 'skip' | null>;
  coveted: Record<PlayerId, string | 'pass' | null>;
}

export interface EventPhaseState {
  eventId: string;
  chooser: PlayerId; // who makes the choice
  subject: PlayerId; // who receives the outcome (== chooser when not crossed)
  chosen: string | null;
  resultText?: string;
}

export interface RestState {
  chosen: Record<PlayerId, 'rest' | 'barter' | 'rebraid' | null>;
}

export type GameEvent =
  | { e: 'thread_action'; player: PlayerId; kind: ThreadActionKind; detail?: string }
  | { e: 'fray' }
  | { e: 'card'; player: PlayerId; card: string; slot: number; linkFired: boolean; resonance: boolean }
  | { e: 'damage'; target: string; amount: number }
  | { e: 'block'; target: string; amount: number }
  | { e: 'hex'; target: string; amount: number }
  | { e: 'detonate'; target: string; stacks: number; damage: number }
  | { e: 'enemy_action'; enemy: string; detail: string }
  | { e: 'enemy_dead'; enemy: string }
  | { e: 'player_hit'; player: PlayerId; amount: number }
  | { e: 'resonance_ignite'; slot: number; tags: string[] }
  | { e: 'witness'; line: string }
  | { e: 'info'; detail: string };

export interface GameState {
  version: 1;
  seed: number;
  rng: number; // mulberry32 state — RNG lives inside state (§11)
  phase: Phase;
  nodeIndex: number; // -1 in lobby; index into the M1 map once running
  thread: number;
  threadMax: number;
  rebraidUsed: boolean;
  players: Record<PlayerId, PlayerState>;
  combat: CombatState | null;
  reward: RewardState | null;
  event: EventPhaseState | null;
  rest: RestState | null;
  advanceReady: Record<PlayerId, boolean>;
  witnessSaid: string[]; // §13.3 no-repeat-within-run
  log: GameEvent[]; // events from the most recent resolution/transition
  /** telemetry counters, maintained by the engine so bots/server can read them */
  telemetry: Telemetry;
}

export interface Telemetry {
  cardsPlayed: number;
  linksFired: number;
  resonances: number;
  resonanceTagCounts: Record<string, number>;
  damageByTag: Record<string, number>;
  turns: number;
}

// ---------------------------------------------------------------------------
// Actions (intents) — the full protocol surface (M1-PLAN §4)
// ---------------------------------------------------------------------------

export type Action =
  | { type: 'START_RUN'; seed: number }
  | { type: 'STAGE_CARD'; player: PlayerId; cardInstanceId: string; slot: number; targetId?: string }
  | { type: 'UNSTAGE_CARD'; player: PlayerId; cardInstanceId: string }
  | { type: 'REORDER'; player: PlayerId; cardInstanceId: string; slot: number }
  | { type: 'DECLARE_THREAD'; player: PlayerId; kind: ThreadActionKind; targetId?: string }
  | { type: 'UNDECLARE_THREAD'; player: PlayerId; kind: ThreadActionKind }
  | { type: 'SET_READY'; player: PlayerId; ready: boolean }
  | { type: 'REWARD_PICK'; player: PlayerId; pick: string | 'skip' }
  | { type: 'COVET_PICK'; player: PlayerId; pick: string | 'pass' }
  | { type: 'EVENT_CHOOSE'; player: PlayerId; optionId: string }
  | { type: 'REST_CHOOSE'; player: PlayerId; option: 'rest' | 'barter' | 'rebraid' }
  | { type: 'ADVANCE'; player: PlayerId };

export class IllegalAction extends Error {}
