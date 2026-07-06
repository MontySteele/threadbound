# Threadbound — M1 Vertical Slice Plan

Source of truth: `docs/threadbound_design_doc.md` (referenced below as §N). Where this plan and the design doc conflict, the design doc wins.

## 1. Deliverable

Two people on different machines open a URL, join a room with a 5-letter code, and play the first third of Act 1: a 7-node linear map — 3 combats, a standard event, a rest site, a crossed-choice event, and The Mourner (elite). Functional, unpolished UI. Reconnection with no state loss.

## 2. Monorepo layout (§11)

```
package.json            # npm workspaces; scripts: test, sim, check
packages/
  engine/               # pure deterministic reducer; zero I/O; RNG inside state
    src/
      types.ts          # GameState, actions, content schemas
      rng.ts            # mulberry32; state is a uint32 in GameState
      hash.ts           # canonical-JSON + FNV-1a 64 state hash (replay verification)
      effects.ts        # data-op interpreter (damage/block/hex/…)
      combat.ts         # chain resolution, link/Resonance computation, enemy turn
      reducer.ts        # (state, action) -> state; throws IllegalAction on bad intents
      content/
        cards.ts        # 40 card defs (20/char) + mutations (§7 basic)
        enemies.ts      # 6 Act 1 designs incl. The Mourner
        events.ts       # 1 crossed-choice + 1 standard event
        encounters.ts   # M1 node map + combat compositions
        witness.ts      # Witness line pools (§10), no-repeat-within-run
    test/               # unit + property/fuzz + programmatic Covenant audit
  server/               # Node + ws; authoritative; rooms via 5-letter codes
    src/index.ts        # room mgmt, session tokens, intent validation, per-player redaction
  bots/                 # headless clients over the real WS protocol
    src/bot.ts          # greedy link-seeking policy
    src/sim.ts          # N-combat simulation + telemetry summary (§13)
  client/               # React + Vite + DOM/CSS; renders state, sends intents only
```

**Invariants:** all rules in `engine`; client never computes outcomes; identical (state, action) sequences produce identical states (state-hash-verified replays); all content data-driven.

## 3. Engine state shape

```ts
GameState {
  seed: number; rng: number;            // rng = current mulberry32 state (in-state RNG, §11)
  phase: 'lobby'|'map'|'combat'|'reward'|'event'|'rest'|'game_over'|'victory';
  turn: number; nodeIndex: number;      // linear M1 map position
  thread: number; threadMax: number;    // §5: start 6, max 10, +2/turn
  rebraidUsed: boolean;
  players: Record<'p1'|'p2', {
    character: 'vess'|'bram'; hp; maxHp; block; energy; energyMax;
    momentum: number; statuses: { weak; vulnerable; frayed };
    deck: CardInstance[];               // master list (run deck)
    draw: id[]; hand: id[]; discard: id[]; exhaust: id[];
    covetCharges: number;               // §8: start 1, +1/elite, max 2
    ready: boolean; pendingFray: number; // Basin consequence
  }>;
  combat?: {
    enemies: { id; defId; hp; maxHp; block; hex; weak; vulnerable; stun; strength;
               boundTo: 'p1'|'p2'; intent }[];
    chain: { cardInstanceId; owner; targetId? }[];   // shared ordered track (§2.1)
    threadActions: { player; action; params }[];      // declared in planning, resolve first (§5)
    soloStreakMax: number;              // fed to The Mourner (§6)
  };
  reward?: { sets: Record<player, CardDef[]>; picked; covetWindow };
  event?: { defId; chooser: 'p1'|'p2'; subject: 'p1'|'p2' };
  echoes: …;                            // Reclaim Echoes exhaust at end of combat (§5/§7)
  witnessSaid: string[];                // no-repeat-within-run (§13.3)
  log: GameEvent[];                     // last resolution's event list (client animates from this)
}
```

Card instances carry `{ instanceId, defId, echo?: boolean, mutated?: boolean }`. RNG is consumed only inside the reducer; every random draw advances `state.rng`.

## 4. Action / intent protocol

WebSocket envelope (client→server): `{ token, type, ... }`. Server messages: `{ type: 'state', state (redacted per player), hash }`, `{ type: 'error', message }`, `{ type: 'joined', token, room, playerId }`.

**Room layer (server-only):** `CREATE_ROOM {character}` → 5-letter code; `JOIN_ROOM {code}`; `HELLO {token}` (reconnect — state fully server-held, §11).

**Engine actions** (server validates each against reducer; reducer throws on illegal):

| Action | Phase | Payload |
|---|---|---|
| `START_RUN` | lobby | `{ seed }` (server supplies seed) |
| `STAGE_CARD` | combat | `{ player, cardInstanceId, slot, targetId? }` |
| `UNSTAGE_CARD` | combat | `{ player, cardInstanceId }` |
| `REORDER` | combat | `{ player, cardInstanceId, slot }` (own cards only, §2.1) |
| `DECLARE_THREAD` / `UNDECLARE_THREAD` | combat | `{ player, action: pulse|reclaim|sever|steady, params }` (§5) |
| `SET_READY` | combat | `{ player, ready }` — second Ready commits & resolves the turn in the same reduction |
| `REWARD_PICK` | reward | `{ player, cardDefId \| 'skip' }` (own set only, §8) |
| `COVET_PICK` | reward | `{ player, cardDefId \| 'pass' }` (partner's passed-over cards; costs a charge) |
| `EVENT_CHOOSE` | event | `{ player, optionId }` (crossed: only the designated chooser may act, §8) |
| `REST_CHOOSE` | rest | `{ player, option: rest|barter|rebraid }` (§8; no Upgrade in M1 — see OPEN-QUESTIONS) |
| `ADVANCE` | map/reward/event/rest | `{ player }` — both players must ADVANCE to move to next node |

Resolution is computed entirely inside the reducer when the second `SET_READY` lands; the emitted `log` drives client animation. No separate "resolve" message → determinism is trivial to replay.

## 5. Combat resolution order (§2, §5)

1. Thread actions in declaration order (Pulse, Reclaim, Sever Binding, Steady). Fraying: cost still resolves below 0 → clamp to 0 and both players gain Frayed (§5).
2. Link computation is **static**: link `i` fires iff slot `i-1`'s card tag matches slot `i`'s link condition (`any` matches all; rare `partner` condition matches if slot `i-1` is the partner's card). Computed up-front from the committed chain.
3. Resonance (§2.3): maximal runs of consecutive fired links of length ≥3 whose involved cards (the linked cards plus the card feeding the first link) include both players → final card of the streak gets +50% on primary numbers (round up). Solo streaks never ignite.
4. Chain resolves slot 1→N. Dead targets retarget to leftmost living enemy. Pulse buffs the partner's next card's primary number (+3).
5. Enemies act (bound targeting, §6; Stun skips; Weak −25%; Vulnerable +50%; Frayed +25% incoming per stack).
6. End of turn: discard hands, statuses tick, Thread +2 (cap 10), draw to 5, new intents, Mourner checks `soloStreakMax ≥ 4`.

## 6. M1 card list (20 per character) — Covenant audit in `docs/archive/content-audit.md`

Distribution per character: 10 common / 7 uncommon / 3 rare. Every broad tag appears at common in both pools (§4); zero self-similar commons; self-similar uncommons scarce (≤2/char); narrow link conditions (`partner`) only at rare (§2.2).

**Vess** — C: Needlework, Pinprick, Withering, Patient Knife, Stitchblade, Thornward, Wardknot, Loose Stitch, Quickening, Mendthread · U: Inheritance*, Black Lattice, Saturate, Lashing Coil, Seamripper, Knotward Veil, Spindle Step · R: Gravebloom†, Final Word, Unbroken Line

**Bram** — C: Opener, Rendcall, Crossguard, Bellows, Second Wind, Hammerfall, Spark, Brace, Kindle, Followthrough · U: Haymaker*, Dig In*, Stoke, Backdraft, Pyre Vault, Shoulder Through, Stamp Out · R: Avalanche†, Wildfire Heart, Call and Answer†

\* self-similar, uncommon by §2.3 (incl. two §9 sample cards). † narrow `Link (Partner)` condition, rare-only by §2.2. Full stats in `packages/engine/src/content/cards.ts`; audit (manual + programmatic test) before implementation freeze.

## 7. Enemies (6, §6) & map

Cinder Husk (basic attacker) · Tallow Wisp (Weak applier) · Thread-Leech (drains Thread on hit) · Reliquary Mite (attack scales off bound player's Momentum — binding puzzle) · Sexton of the Undercroft (bruiser, occasional AoE) · **The Mourner** (elite: +2 Strength any turn the Chain held 4+ consecutive same-player cards — punishes solitaire).

Map (linear): `C1 (2× Husk) → C2 (Wisp + Leech) → Event: The Cold Lantern (standard) → C3 (Sexton + Mite) → Rest → Event: The Basin (crossed choice) → Elite: The Mourner → victory screen`.

## 8. Testing & telemetry (M1 sign-off gates)

- **Fuzz:** thousands of seeded random action sequences; invariants: HP/Thread/energy/Hex never negative, Thread ≤ max, phase legality, hand/deck conservation; every sequence replayed from seed must produce identical state hashes.
- **Covenant test:** programmatic audit of `cards.ts` against §3/§2.3 (runs in CI alongside the written audit).
- **Bots:** headless WS clients (greedy link-seeking) playing full combats through the real server; `npm run sim` = 50-combat simulation printing telemetry: win rate, damage by tag, **link-fire % (target 40–60%)**, Resonance ignition count + tag diversity within streaks (§13.2).
- `npm run check` = full test suite + 50-combat sim + telemetry summary.

## 9. Build order

engine types/content → reducer+resolution → unit/fuzz/covenant tests → server → bots+sim → client → reconnection pass → audit docs → telemetry-verified sign-off.
