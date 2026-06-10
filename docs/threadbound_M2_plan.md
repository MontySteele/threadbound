# Threadbound — M2 Plan (Full Content + Rules Revisions)

M2 turns the vertical slice into the complete game described in `docs/DESIGN.md` §12-M2,
and revises core rules per the designer's OPEN-QUESTIONS rulings (2026-06). Where this
doc and DESIGN.md conflict, **this doc wins** — it supersedes §2.1 hand rules, energy
handling, and player-death rules. Fold these changes back into DESIGN.md as part of M2.

---

## Part A — Rules revisions (designer rulings)

### A1. Hands discard at end of turn (supersedes OQ#1 / M1 behavior)

- At the end of resolution, each player discards every card that was **in hand when the
  turn committed**. Cards **drawn during resolution** (Loose Stitch, Quickening, etc.)
  are kept and carried into the next turn's hand. Implementation: snapshot hand at
  commit; discard the snapshot's survivors; keep post-snapshot arrivals.
- Start of turn remains **draw to 5** — carried cards count toward the 5; if carries
  exceed 5, keep them all (hand cap 10 unchanged). Net effect: "Draw N" mid-resolution
  = N extra cards next turn. Draw effects stay alive; hands no longer accumulate.
- **Retention is now design space**: add a Surge keyword `Keep` (this card is not
  discarded at end of turn) on 2–3 cards, and at least one relic granting "retain 1
  card each turn."

### A2. Energy banks to next turn — the Kindled status (supersedes OQ#4 / M1 planning-budget)

- Remove the planning-budget energy hack entirely (`energyBudget` no longer inspects
  base effects — this also closes the stage-Second-Wind-last pre-spend exploit found
  in review).
- New status: **Kindled (N)** — gain N energy at the start of your next turn (stacks,
  clears on use). All `energy` ops become Kindled grants, including in **link clauses**,
  which are now meaningful again:
  - **Second Wind** → "Gain Kindled 1. Draw 1. Link (any): also gain 1 Thread." (unchanged shape)
  - **Call and Answer** (rare) → revert toward original intent: link grants Kindled.
  - **Quickening** keeps its partner-draw link (good co-op texture; do not revert).

### A3. Down-but-not-out (supersedes OQ#8: either-death-ends-run)

When a player reaches 0 HP **in combat**:

- They are **Fallen**: staged cards fizzle back to nothing (discarded), hand discards,
  they take no turns; their Powers go dormant.
- All enemies bound to the Fallen player **rebind to the survivor immediately**.
- The Thread goes **slack**: no regen, no Thread actions while a player is Fallen.
  (Cross-player links and Resonance become impossible by construction — only one
  player is playing. The Covenant's standalone floor is what the survivor lives on.)
- If the survivor **wins the combat**, the Fallen partner revives at **1 HP**.
- If the survivor also reaches 0 HP, the run ends.
- Outside combat (events), HP loss still ends the run at 0 — or, preferred: event
  `loseHp` cannot reduce below 1 (cap it); decide during implementation, log either way.
- Witness line categories added: `partner_fallen`, `revival`.

### A4. Confirmed as-is (no change)

- Link (any) is not self-similar (OQ#2).
- Momentum applies once per multi-hit Strike; per-hit application is link/rare design
  space (OQ#3) — add one rare expressing it (e.g., Avalanche: "Link (Surge): Momentum
  applies to every hit").
- Detonation ignores Block (OQ#5). Steady removes Fray from both / banks shield (OQ#6).
  Mourner triggers same-turn (OQ#7). Rest options (OQ#10). Seeded chooser for standard
  events (OQ#11).

### A5. Starter decks (OQ#9)

Dedicated starter-only cards (weak, mostly linkless commons) so early decks are
genuinely poor and drafting matters:

- **Vess (10):** 4× *Hatpin* (1 — Strike — Deal 4), 3× *Patchwork* (1 — Guard — Gain 4
  Block), 1× Pinprick, 1× Loose Stitch, 1× Mendthread.
- **Bram (10):** 4× *Jab* (1 — Strike — Deal 5), 3× *Brace-Up* (1 — Guard — Gain 4
  Block), 1× Opener, 1× Second Wind, 1× Kindle.
- Starter-only cards never appear in rewards. Removal (shop service, §B4) is their
  pressure valve.
- Expectation: link-fire rate starts well below the 40–60% band and climbs over a run.
  Telemetry gains **per-act link-fire** breakdown to verify the climb.

---

## Part B — Content to full scope (DESIGN.md targets)

### B1. Card pools
- 55 cards per character (25C/20U/10R) + 15 neutrals, per §9 identities. Starter-only
  cards are additional and excluded from pools.
- **Mutations** (§7) required for all commons and uncommons; rares may omit (Echoing a
  rare delivers it unmutated). Hand-authored, deterministic, audited.
- Covenant test suite scales with the pool automatically — extend the self-similar
  scarcity bound (≤4/char at uncommon for the larger pool, still 0 at common) and add:
  every broad tag ≥3 commons per character.
- **Hex rebalance (review finding):** detonation contributed ~6% of damage in M1 sims.
  Levers, apply in order until Hex damage share reaches 20–30% for a Vess-led pair:
  (1) widen detonation access (target ~6 detonator cards across both pools + 1 neutral),
  (2) raise per-stack damage 3 → 4, (3) cheapen Hex application. Re-attribute telemetry
  first: hex-scaling Strike damage (Patient Knife) should log to a `HexScaling` bucket
  so the measurement isn't lying before the tuning starts.

### B2. Relics (~28, ≥8 co-op/Thread-specific)
Including the §7 **Wedding Knife** (rest site: permanently trade one card each, both
must confirm — the only permanent cross-deck flow). Relic hooks needed in engine:
start-of-combat, start-of-turn, on-detonate, on-resonance, on-fray, on-covet, on-link-fired.

### B3. Acts, map, and finale
- Replace the linear M1_MAP with a **branching StS-style map** per act (~14 nodes,
  2–3 lanes). **Path choice requires both players to agree** (both click the same next
  node) — one more negotiation surface, zero new systems.
- Act 1 (The Undercroft): expand to ~10 enemy designs incl. 2 elites + act boss.
- Act 2 (The Hollow Choir): ~10 new designs, 2 elites + act boss; enemy mechanics
  escalate co-op pressure (binding manipulation, chain-reading enemies per §6).
- Finale (The Last Braid): rest → optional shop → **The Unraveled**, implementing the
  §6 thread-sever phase (at 50% HP: Thread severed 2 turns — no Thread actions, no
  cross-player link credit; then reignites at 10).

### B4. Shops & gold
Shared gold pool (§8). Stock: cards (own pool each), relics, card **removal** service,
potions out of scope. Both players browse one shop screen; purchases are individually
initiated, gold is shared — friction is the feature.

### B5. Events & the Witness
- ~12 events (≥4 crossed). Crossed-choice tone: **60% consequence / 40% comedy** (OQ
  ruling). The Cold Lantern and Basin carry over.
- Witness line pools expanded to cover: combat start/victory (25%), elites, deaths,
  `partner_fallen`, `revival`, fray, resonance, covet, rest, shop (haggling contempt),
  map-path disagreement (if players ping different nodes 3+ times), victory screen.
  No-repeat-within-run tracking already exists; keep.

### B6. Upgrades
Rest-site Upgrade (replaces one M1 gap): each card has one hand-authored upgrade.
House identity rule: **upgrades prefer deepening the link clause** (wider condition,
bigger link payoff) over inflating base numbers — upgrading literally tightens the weave.

---

## Part C — Difficulty & telemetry gates

Order of operations (do not parallelize 1 and 3):
1. Ship starter decks (A5) + Hex rebalance (B1) → re-baseline bot sim.
2. Fix telemetry attribution (B1) and the two combat-log accuracy bugs (D2) first so
   measurements are honest.
3. Then tune enemies: starting point +15–20% HP/damage on Act 1 (OQ#13), fresh numbers
   for Act 2 at a steeper curve.

**M2 sign-off gates (50-run bot sim, greedy policy):**
- Full-run bot win rate **≤ 40%** (bots are a coordination floor; humans should beat them).
- Average player HP lost per Act 1 combat ≥ 8 (no more 0-damage fights).
- Link-fire rate: Act 1 ≥ 30%, Act 2 within 40–60% (the climb proves the draft arc).
- Resonance streak tag diversity: no single tag > 50% of resonance-streak cards.
- Hex damage share (incl. HexScaling bucket) 20–30% in Vess-weighted runs.

## Part D — Engineering fixes from M1 review

1. **Reconnect test failure:** `@threadbound/server` lacks an `exports` field resolvable
   by vitest pre-build. Fix package.json exports (or vitest alias to src). Suite must be
   fully green for M2 sign-off.
2. **Combat log accuracy:** `hitEnemy` logs pre-block damage; `block` op logs unscaled
   amount (ignores Pulse/Resonance). Log post-block HP loss + blocked separately, and
   scaled block values — the UI log is a teaching tool and must not lie.
3. **Room lifecycle:** rooms map grows forever. Evict rooms after 24h idle or on
   game_over/victory + both sockets closed for 1h; clean tokenIndex with them.
4. **Pulse on non-primary cards:** Pulse now skips cards with no primary number and
   carries to the next card that has one (and the client greys the Pulse declaration
   if the partner has nothing staged that can use it).
5. **Client polish pass is M3, not M2** — M2's UI additions are limited to: map screen,
   shop screen, relic bar, Fallen/revive states, Kindled/Keep indicators, upgrade picker.

## Part E — Working agreements (unchanged from kickoff, plus)

- Covenant audit updates with every content batch; `docs/content-audit.md` regenerated.
- New OPEN-QUESTIONS entries follow the same most-conservative-reading + log protocol.
- Update `docs/DESIGN.md` in place for Part A revisions (single source of truth), with
  a changelog section noting the OQ ruling each change came from.
- End state of M2: deployed build, telemetry summary meeting Part C gates, and a
  playtest-2 checklist for the designer (full-run attempt, both characters).
