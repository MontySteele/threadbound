# THREADBOUND — Design Document (Draft 3 — M2 revisions folded in; see §14 changelog)

*A two-player cooperative deckbuilding roguelike, played in the browser.*

**Elevator pitch:** Two spirit-binders, joined by a soul-thread, descend into something that should have stayed buried. Every turn, you and your partner weave your cards into a single shared Chain — and the cards you play don't just do things, they *read each other*. The fundamental unit of play isn't your turn; it's a sentence you write together.

**Target experience:** The feeling at a D&D table when the rogue's sneak attack lands off the fighter's trip. Set-up and payoff, negotiated out loud, with the dice-roll tension of "will the big hit land."

**Success bar:** A genuinely fun afternoon-plus of co-op play. Two characters, two acts and a finale, enough card pool depth that runs feel different across 5–10 attempts.

---

## 1. Design Pillars

1. **Co-op is the mechanic, not a mode.** Every system must answer: "what does this make the two players *say to each other*?" If a system generates no table-talk, cut it or rework it.
2. **Set-up / payoff over parallel solitaire.** The Chain makes sequencing across players the core skill expression.
3. **Amplified, never dependent.** (The Covenant, §3.) No player's deck can be bricked by the other's choices. Links are upside, not enablement.
4. **Networking-trivial by design.** Turn-based, server-authoritative, no prediction or rollback anywhere. The hard engineering budget goes into content and polish instead.
5. **Readable over illustrated.** Typography-forward card design, strong iconography, atmosphere through palette and motion rather than illustration quality.

---

## 2. Core Combat Loop

### 2.1 Turn structure

Each combat turn has three phases:

1. **Draw & Intents.** Each player draws 5 fresh cards (hand cap 10); cards carried from resolution draws, **Keep**, or retention are extra. *(Playtest-1 ruling — supersedes Draft 3's draw-to-5, which made "Draw N" net zero cards.)* Enemy intents are revealed (StS-style icons), including which player each enemy is **Bound** to (§6).
2. **Planning (simultaneous).** Both players stage cards from hand onto the shared **Chain track** — a row of numbered slots visible to both. You may place, remove, and reorder *your own* cards freely. You see your partner's staged cards live (face-up, with full text). Either player hits **Ready**; when both are Ready, the turn commits. Thread actions (§5) are also declared during planning.
3. **Resolution.** The Chain resolves slot 1 → N in order, then enemies act. At the end of resolution, each player discards every card that was in hand when the turn committed; cards **drawn during resolution** are kept and carried into the next turn's hand. Cards with **Keep** are never discarded this way. *(M2 ruling, supersedes Draft 2's persistent hands.)*

There is no hard time limit on planning (a soft "your partner is ready" nudge appears after 45s). Friends on voice chat are the target context, but the staged-card visibility means the game is fully playable over text or in silence.

### 2.2 Energy

Each player has **3 energy per turn** (modified by relics/powers). Cards cost 0–3. Energy is personal, not shared — the shared resource is the Thread (§5). Energy effects on cards grant **Kindled (N)**: gain N energy at the start of your next turn (banks, stacks, clears on use) — under simultaneous planning, mid-resolution energy can only ever be next turn's energy. *(M2 ruling.)*

### 2.3 The Chain and Link clauses

Most cards have two parts:

> **Rendcall** — 1 energy — Attack
> Deal 8 damage. **Link (Hex):** detonate all Hexes on the target.

- The base effect always works, played anywhere, by anyone. *(Covenant rule 1.)*
- The **Link clause** checks the card in the previous Chain slot. If it matches the named tag, the bonus fires. The previous card can belong to *either* player — but since you control your own ordering and can see your partner's staged cards, engineering cross-player links is the game.
- Link conditions reference **broad tags** (§4) at common/uncommon rarity. Narrow conditions (specific tag pairs, "previous two cards," "previous card was your partner's") appear only at rare rarity, as deliberate build-arounds.

**Resonance (chain-length payoff):** if a turn's Chain contains a streak of 3+ consecutive fired links **with both players contributing cards to the streak**, the final card in the streak gets +50% effect (the thread between portraits ignites). Links daisy-chain — each card reads the previous card and provides its own tag to the next — so a 3-link streak is 4 cards minimum and does not require a shared keyword (e.g., Hex → Strike *fires* → Surge *fires* → Strike *fires*). Solo streaks earn their link bonuses but never ignite Resonance: the Thread only burns for both of you. *(Tuning knobs: streak threshold, and a fallback tag-diversity requirement if mono-tag streaks prove degenerate — see §13.)*

**Anti-degeneracy pool rule:** **self-similar cards** (tag X with a Link (X) clause) are the enabler of mono-keyword spam chains. They do not exist at common rarity, are scarce at uncommon, and at rare are deliberate build-arounds. Sustaining a streak therefore requires alternating tags — the weaving texture the game is named for.

### 2.4 Why this can't degrade into parallel solitaire

- Link clauses are the majority of card value at the top end; two players ignoring each other play at perhaps 70% power. The floor is survivable (Covenant), the ceiling requires conversation.
- Enemy Binding (§6) forces threat conversations even when decks aren't interacting.
- Several enemy designs explicitly attack solo play (e.g., enemies that punish the *longest single-player streak* in a Chain).

---

## 3. The Covenant (co-op design rules — enforced across the entire pool)

1. **Every card is playable standalone.** Link clauses are pure upside, never required for the card to function. Worst-case draft outcome is "fine card," never "dead card."
2. **Common/uncommon links read broad tags only** — tags every character's pool produces naturally (§4). A partner cannot accidentally starve them.
3. **Cross-pollination is pull-based and consensual.** Nothing is ever pushed into your deck. Your deck drifts only by your own choice (§7).
4. **No archetype in the pool can be disabled by partner behavior.** Audit rule: for every build-around, ask "what partner play pattern turns this off?" If the answer is a *natural* play pattern (not a bizarre edge case), redesign.
5. **Draft is an open conversation.** Card rewards are a shared screen; both players see both reward sets and can discuss before picking. Deck summaries show tag frequencies at a glance ("Vess: Hex-heavy, low Guard").

---

## 4. Tag Taxonomy

Every card carries exactly one **primary tag** (what Link clauses read) plus zero or more keywords.

**Broad tags (linkable at all rarities):**

| Tag | Meaning | Appears in |
|---|---|---|
| **Strike** | Direct damage | Both characters, heavily |
| **Guard** | Block / damage prevention | Both characters |
| **Hex** | Applies or manipulates Hex stacks | Vess-heavy, Bram-light |
| **Surge** | Momentum, energy, draw — tempo effects | Bram-heavy, Vess-light |
| **Rite** | Powers, persistent effects, thread manipulation | Both, sparse |

Design target: each character's pool is ~35% their heavy tag, but **every broad tag appears at common rarity in both pools**, so any link can be fed by any partner who drafts toward it even slightly.

**Keywords (status effects):**

- **Hex (N)** — a charge placed on enemies. Inert until **detonated** (each stack deals 3 damage when detonated; some cards consume Hexes for other effects). The set-up/payoff status.
- **Momentum (N)** — player buff; your next Strike deals +N, then Momentum halves. Bram's engine.
- **Frayed** — both players take +25% damage this turn. The Thread overdraft penalty (§5).
- **Kindled (N)** — gain N energy at the start of your next turn (M2).
- **Keep** — this card is not discarded at end of turn (M2).
- Standard fare: **Weak**, **Vulnerable**, **Stun** (rare, enemies skip a turn).

---

## 5. The Thread

A single shared resource pool, displayed as a literal animated line connecting the two character portraits. **Max 10. Starts each combat at 6. Regenerates +2 at the start of each turn.**

**Thread actions** (declared during planning, by either player, resolved before the Chain):

| Action | Cost | Effect |
|---|---|---|
| **Pulse** | 2 | Your partner's next card this turn gets +3 to its primary number (damage/block/Hex count). |
| **Reclaim** | 2 | Take a card of your choice from your partner's discard pile into your hand as an **Echo** (an ethereal copy — exhausts at end of combat). Echoes arrive **mutated** (§7). |
| **Sever Binding** | 3 | Move one enemy's Binding from one player to the other (§6). |
| **Steady** | 1 | Remove a Frayed stack, or prevent the next Fray this turn. |

**Fraying:** any action that would drop the Thread below 0 still resolves, but inflicts **Frayed** on both players. Desperation plays are allowed — at a cost you'll both pay. This makes the Thread a genuine negotiation ("if I yank that elite off you, we can't afford your Pulse").

Some cards and relics also read or spend Thread ("**Threadwork** cards"), mostly in the Rite tag.

*(Tuning knobs: regen rate, starting value, Pulse magnitude. These are the numbers most likely to move after playtest 1.)*

---

## 6. Enemies & Binding

Every enemy is **Bound** to one player at spawn (telegraphed by a colored tether). Bound enemies target only their bound player (AoE attacks excepted). This creates a real threat axis:

- Spawn bindings are semi-random but weighted, so fights open with an asymmetric problem to solve.
- **Sever Binding** (Thread) and taunt-style Guard cards move bindings mid-fight — the tank/spike dynamic, opt-in.
- Some enemy attacks scale off their bound player's state ("deals damage equal to twice your Momentum") — making "who holds this one" a per-fight puzzle, not a fixed role.

**Enemy design targets:** ~20 designs across two acts + finale. Each elite and boss must interact with a co-op system specifically. Examples:

- **The Mourner** (Act 1 elite): gains strength each turn the Chain contains 4+ consecutive cards from the same player. Punishes solitaire.
- **Choristers** (Act 2 pack): three bodies sharing one health pool, each bound to a different… wait, there are two of you. One is always unbound and untargetable until a binding is severed onto it.
- **The Unraveled** (final boss): attacks the Thread itself — drains Thread, inflicts Fray, and at 50% HP **severs the Thread entirely for two turns** (no Thread actions, no links across players' cards — your engines must briefly survive solo, proving the Covenant's floor). Then the Thread reignites at full 10 for the finale. The whole game's systems, weaponized, then handed back.

---

## 7. Cross-Pollination & Mutation

When a card crosses the Thread (via **Reclaim**, or rarer permanent-transfer events/relics), it arrives **mutated** into a variant keyed to the receiving character:

- A Vess Hex card Reclaimed by Bram might arrive as a **Cinder-touched** variant: Hex count halved, but +Momentum rider.
- Mutations are deterministic per card (hand-authored variant text, not procedural), so they're learnable and discussable: "Reclaim my Withering, it turns into a draw engine on your side."

**Defaults chosen for fun-safety:** Reclaimed cards are temporary Echoes (this combat only). Permanent transfer exists only behind explicit, named choices: the relic **Wedding Knife** (once per rest site, permanently trade one card each — both must confirm) and one or two map events. By Act 2 of a good run, both decklists visibly carry the other's fingerprints — but only ever on purpose.

---

## 8. Run Structure

Conventional StS-style node map (the innovation budget is spent on combat): combats, elites, events, shops, rest sites, treasure. **Act 1 (The Undercroft, ~14 nodes) → Act 2 (The Hollow Choir, ~14 nodes) → Finale (The Last Braid: a 3-node capstone — rest site → optional shop → The Unraveled).** The finale is deliberately not a full act.

**Target run length: 60–75 minutes** for a full clear.

**Co-op-specific structure:**

- **Card rewards (the Covet system):** each combat offers two reward sets of 3 — yours and your partner's. By default, **you pick only from your own set** (or skip), keeping decks themed and character identities intact. However, each player carries **Covet charges**: after your partner picks (or skips), you may spend a charge to take one of the cards *they passed over* instead of picking from your own set. You start each run with 1 charge, gain +1 per elite defeated (max 2 held), and rest sites offer **Barter** (gain 1 Covet charge) as an alternative to resting/upgrading. This rescues dead packs, lets you grab a high-rolled rare on their side, and makes every Covet a deliberate, discussable event — without letting both decks dissolve into tag soup.
- **Crossed choices (events):** ~⅓ of map events present a choice where **you pick the outcome your partner receives.** ("One of you may drink from the basin. Vess's player: choose whether Bram drinks.") Tone split: **~60% consequence, ~40% comedy** — enough genuine stakes that crossed choices matter, enough absurdity ("you chose *this* for me?") that they generate stories.
- **Rest sites:** standard rest/upgrade, plus Thread-specific options (e.g., **Re-braid:** permanently +1 max Thread, once per run).
- **Shops:** shared gold pool. One more negotiation surface, zero extra systems.

---

## 9. The Characters

Two launch characters, designed as complementary halves with deliberately overlapping tag floors (Covenant rule 2).

### Vess, the Hexweaver *(control / set-up / scaling)*
Quiet, precise, stitches curses into things. Deck identity: apply Hexes, manipulate and multiply them, detonate on her terms — or better, hand the detonation to Bram.

Sample cards:

- **Needlework** — 1 — Hex. Apply 3 Hex. **Link (any):** apply 1 additional Hex per link fired earlier this Chain.
- **Withering** — 1 — Hex. Apply 2 Hex to ALL enemies. **Link (Guard):** also apply 1 Weak to all.
- **Patient Knife** — 2 — Strike. Deal 6. **Link (Hex):** deal damage equal to 6 + 2× target's Hex (does not detonate).
- **Black Lattice** — 2 — Rite (Power). Whenever Hexes detonate, gain 3 Block.
- **Loose Stitch** — 0 — Surge. Draw 1. **Link (Strike):** draw 2 instead. *(Her Surge floor for Bram's links.)*
- **Inheritance** — 1 — Rite. Gain 2 Thread. **Link (Rite):** gain 3 and your partner draws 1.

### Bram, the Cinderfist *(tempo / momentum / detonation)*
Loud, kinetic, fights like an argument he's winning. Deck identity: chained Strikes building Momentum, big payoff swings, the natural detonator for Vess's Hexes.

Sample cards:

- **Opener** — 0 — Strike. Deal 4. Gain 2 Momentum. **Link (Surge):** gain 4 instead.
- **Haymaker** — 2 — Strike. Deal 12. **Link (Strike):** deal +Momentum×2 and don't halve Momentum.
- **Rendcall** — 1 — Strike. Deal 8. **Link (Hex):** detonate all Hexes on the target. *(The signature cross-character card.)*
- **Dig In** — 1 — Guard. Gain 8 Block. **Link (Guard):** your partner also gains 5 Block. *(His Guard floor for Vess.)*
- **Second Wind** — 1 — Surge. Gain 1 energy, draw 1. **Link (Strike):** also gain 1 Thread. *(§14.10: was Link (any) — free in a starter.)*
- **Stoke** — 1 — Rite (Power). At the start of your turn, gain 2 Momentum.

**Starter decks (M2):** 10 dedicated starter-only cards per character (weak, mostly linkless: Vess 4× Hatpin / 3× Patchwork + pinprick, loose stitch, mendthread; Bram 4× Jab / 3× Brace-Up + opener, second wind, kindle). Starter-only cards never appear in rewards; removal services are their pressure valve. Link-fire rate is expected to start below the 40–60% band and climb over a run.

**Pool targets:** ~55 cards per character (25 common / 20 uncommon / 10 rare) + ~15 neutral. ~28 relics (8 of which are Thread/co-op-specific). All numbers above are placeholder-grade and expected to move in tuning.

---

## 10. UI / UX & Visual Direction

- **Layout:** both characters bottom-center side by side, Thread animated between their portraits; enemies arrayed above with binding tethers color-coded per player; the Chain track as a horizontal row of slots between the parties — the literal center of the screen, because it's the center of the game.
- **Partner legibility:** partner's staged cards render face-up at full fidelity. Hovering any staged card highlights which staged cards would satisfy its Link. A small "link preview" glyph shows live whether each staged Link will currently fire — *the UI does the bookkeeping; the humans do the strategy.*
- **Card design:** typography-forward dark-parchment frames, tag iconography, color-coded link clause text. No illustration dependency; small generated emblem art per card if quality holds, pure typographic otherwise.
- **Juice budget (real-time feel in a turn-based game):** chain resolution animates card-by-card with snappy pacing (~400ms/card, skippable), link triggers flash the thread, Resonance ignites it, Hex detonations crack the screen. Audio: free SFX packs (e.g., Kenney, freesound CC0) + a small generated ambient score.
- **Tone:** somber, intimate, wry — with a streak of dry, sarcastic contempt delivered by **the Witness**, a long-dead spirit bound to the Thread who serves as narrator. Think a disdainful, long-suffering steward who finds your heroics tedious: he comments on crossed choices ("How generous. I'm sure they'll thank you."), deaths, rest sites, and Covet picks. Pure text, so he's nearly free to build and carries an outsized share of the game's personality. Card flavor text stays somber-wry; the Witness holds the sarcasm monopoly so the tones don't muddy.

---

## 11. Technical Architecture

**Stack:** TypeScript monorepo.

- `packages/engine` — pure, deterministic game logic. A reducer: `(state, action) → state`. Zero I/O, zero randomness (RNG is seeded and part of state). Shared by server and client. **All rules live here and nowhere else.**
- `packages/server` — Node + `ws`. Authoritative: clients send intents (`STAGE_CARD`, `REORDER`, `THREAD_ACTION`, `READY`), server validates against the engine, broadcasts resulting state. Rooms via 5-letter join codes. No accounts; a session token in localStorage enables reconnection (state is fully server-held, so a refresh or dropped connection costs nothing).
- `packages/client` — React + DOM/CSS for cards and UI (snappier to build and iterate than canvas for this genre), with a lightweight animation layer for chain resolution and the thread itself.

**Why this is networking-trivial:** turn-based + server-authoritative = no prediction, no rollback, no tick rate, no interpolation. The only latency-sensitive moment is planning-phase staging visibility, and 100–300ms of delay on seeing your partner stage a card is imperceptible in a talking-out-loud game.

**Deployment:** single small VPS or free-tier host (Fly.io/Railway-class); the server is one Node process with in-memory rooms. Client is a static bundle. Distribution = send your friend a URL + room code.

**Testing without being able to feel the game (the part I take seriously):**

- Property/fuzz tests on the engine: thousands of seeded random action sequences asserting invariants (no negative HP/Thread, Chain resolution order deterministic, state hash identical across replays).
- **Headless bot clients** that play full runs via the real WebSocket protocol — catches protocol/sync bugs and produces balance telemetry (win rates by act, average damage per tag, link-fire frequency).
- Link-fire frequency is the #1 telemetry stat: the design intends links to fire on **40–60% of played cards** in a coordinated game. Outside that band, the core fantasy is failing.

---

## 12. Milestones & Playtest Plan

- **M1 — Vertical slice:** engine + netcode + 20 cards per character + 6 enemies + Act 1 first third + functional (ugly) UI. → **Playtest 1** (you + friend, ~30 min). Questions: Does the Chain feel like the point? Do links fire often enough? Is the Thread a real negotiation? Planning-phase pacing?
- **M2 — Full content:** complete card pools, relics, both acts, finale boss, events, shops, map. → **Playtest 2** (full run attempt). Questions: difficulty curve, deck identity, does cross-pollination earn its complexity?
- **M3 — Polish:** juice pass, audio, balance from telemetry + your notes, onboarding (a 90-second interactive "first Chain" tutorial), edge cases (disconnects mid-resolution, etc.).

**Out of scope for v1 (listed so we agree on the cuts):** more than 2 characters, ascension/difficulty modifiers, 3+ player support, spectating, mobile layout, matchmaking (join codes only).

**Stretch goals (post-v1, if the game passes the test):** meta-progression via unlocks — additional cards entering the pool after milestones such as beating target ascension levels — plus the ascension ladder itself to hang them on. The engine's card pool will be data-driven from day one so gating cards behind unlock flags is cheap to add later.

---

## 13. Decisions Log & Remaining Questions

**Resolved (Draft 2):**

1. **Run length:** finale is a 3-node capstone, not a full act; target 60–75 min per clear.
2. **Meta-progression:** stretch goal post-v1 (unlock-gated cards via ascension wins); engine built data-driven to support it cheaply.
3. **Crossed choices:** ~60% consequence / ~40% comedy.
4. **Drafting:** Covet charge system (start 1, +1 per elite, max 2, Barter at rest sites) replaces open cross-picking.
5. **Tone:** somber-wry base + the Witness as sarcastic narrator.
6. **Failure friction:** full roguelike, death = fresh run (no meta-progression in v1). **Down-but-not-out (M2):** a player at 0 HP in combat is **Fallen** — no turns, Powers dormant, their enemies rebind to the survivor, the Thread goes slack (no regen/actions; the Covenant's standalone floor is what the survivor lives on). If the survivor wins, the Fallen revives at 1 HP; if the survivor also falls, the run ends. Outside combat, HP loss cannot reduce below 1.

**Still open (low-stakes, can resolve during M1):**

1. **Covet cadence tuning:** the start-1 / +1-per-elite / max-2 numbers are a first guess; telemetry + playtest 1 will say whether Covets feel scarce-and-precious or annoyingly stingy.
2. **Resonance degeneracy watch:** levers in order — (a) self-similar card scarcity (in effect, §2.3), (b) cross-player streak requirement (in effect, §2.3), (c) require ≥2 unique cards/tags in the streak (back pocket), (d) raise threshold to 4 links. Bot telemetry tracks tag diversity within Resonance streaks to detect mono-tag dominance.
3. **The Witness's volume:** confirmed default — every event and crossed choice, ~25% of combats, all deaths. Lines are drawn from large per-context pools with no-repeat-within-run tracking, so commentary never becomes an echoed catchphrase.


---

## 14. Changelog — Draft 3 (M2 rules revisions)

Each change traces to a designer ruling on `docs/OPEN-QUESTIONS.md` (2026-06), specified in `docs/threadbound_M2_plan.md` Part A:

1. **Hands discard at end of turn** (OQ#1 ruling → M2-A1): supersedes Draft 2 §2.1's persistent hands. Cards drawn during resolution carry; **Keep** keyword added as retention design space.
2. **Kindled energy banking** (OQ#4 ruling → M2-A2): replaces M1's planning-budget energy; link-clause energy grants are meaningful again.
3. **Down-but-not-out** (OQ#8 ruling → M2-A3): Fallen state replaces either-death-ends-run; Thread slack while a player is down; revival at 1 HP on combat win.
4. **Confirmed as-is** (M2-A4): Link (any) not self-similar; Momentum once per multi-hit Strike (per-hit is rare link design space); detonation ignores Block; Steady semantics; Mourner same-turn; seeded chooser for standard events.
5. **Dedicated starter decks** (OQ#9 ruling → M2-A5): starter-only cards excluded from pools; per-act link-fire telemetry tracks the draft climb.
6. **Detonation damage 3 → 4 per stack** (M2-B1 Hex rebalance lever 2) and stronger common Hex application (lever 3), tuned against the Part C telemetry gates.
7. **Fixed draw of 5** (Playtest-1 ruling, 2026-06-11): start of turn draws 5 fresh cards instead of drawing **to** 5. M2-A1 promised "Draw N mid-resolution = N extra cards next turn" while also saying carried cards count toward the 5 — the implementation honored the latter, making draw effects, Keep, and retain-1 pure card *selection* with zero card advantage. Carried/Kept/retained cards are now extra; hand cap 10 unchanged. Sim baselines pre-dating this are obsolete (re-baseline before M3 Part A).
8. **Playtest-1 difficulty pass** (2026-06-11): the designer full-cleared act 1 with zero damage (post-draw-5 bot floor: 86% wins). (a) Global enemy retune — HP and attack damage scaled by `PT1_ENEMY_HP_SCALE` / `PT1_ENEMY_DMG_SCALE` in `content/registry.ts`, applied at registry assembly so every displayed intent and log line reads the scaled truth; tune only these two numbers against the A1 bands. (b) **Elites and bosses re-tether on their own every 3rd turn** (deterministic, logged, surfaced in the Bound tooltip and enemy inspect panels) — guard-soak parking is no longer a solved fight.
9. **Act-transition heal** (Playtest-1 ruling, 2026-06-11): both players heal 30% (one free rest's worth) when an act's boss reward advances to the next act. The docs were silent on between-act healing and the implicit no-heal default plus the §14.8 retune made post-boss attrition brutal (a Fallen revival entered act 2 at 1 HP). Tune later; removable as an ascension modifier. Also: when a player Falls, the forced rebind of every enemy to the survivor is now logged ("Severed bindings are undone") — the silent overwrite read as the boss ignoring a Sever.
10. **Starter tweaks** (Playtest-1 ruling, 2026-06-11): Hatpin is now "Deal 2. Detonate 1 Hex." (6 total on a hexed target, the 4 piercing Block; 2 dry) — Vess's basic strike becomes the starter's Hex payoff and makes sequencing matter from turn 1; its upgrade follows ("Deal 3. Detonate 2. Link (Hex): apply 1"). Second Wind's link narrows (any) → (Strike) — a starter card with an unconditional link was free stuff (OQ#24); its upgrade still widens to (any) per the M2-B6 convention pending the OQ#24 ruling.
11. **Starter payoff redesign** (S3 ruling, 2026-06-12, supersedes the §14.10 Hatpin change): the detonating Hatpin made Hex a self-owned drip — Vess banked AND burst her own stacks, single stacks at a time, which cut against both bank-and-burst and the game's cross-player thesis. Hatpin reverts to plain ("Deal 4.", upgrade "Deal 6."). The starter Hex payoff moves to two new **starter-only** cards, one per deck (each replaces one basic-strike slot): **Worn Knife** (Vess, 1, Strike) "Deal 2. +1 damage per Hex on the target (does not detonate)" — her self-owned scaling floor, normal blockable damage in deliberate contrast with detonation's pierce; upgrade "Deal 4. +1 per Hex". **Knuckle-Crack** (Bram, 1, Strike) "Deal 4. Link (Hex): Detonate 2" — the burst payoff is cross-player by construction (Bram detonates what Vess banks); upgrade "Deal 5. Link (Hex): Detonate 3". Amplified-never-dependent holds in both directions: burst payoff cross-player, scaling floor self-owned. Audited in `docs/content-audit.md`; enforced in covenant.test.ts. The Witness gets one line each for the first Worn Knife play and first Knuckle-Crack detonation per run.
12. **Pulse rework — force a dead link** (§14.12, S3.3b ruling, 2026-06-12): the designer's solo runs found the Thread ignorable — old Pulse ("2 Thread: partner's next card +3") was a forgettable flat bonus and the defensive actions self-cancel for a player who ignores the pool. New **Pulse**: "2 Thread: choose a staged card whose Link will not currently fire — its Link counts as fired when it resolves." Targeted at a specific staged card during planning; **either player may Pulse either player's card**; the forced link counts toward Resonance streaks. UI: dead link arcs become Pulse targets; a forced arc lights in the ignition hue with a thread-strand motif (forced ≠ natural at a glance); thread declarations render in the Chain track margin in stage order; the bot's spends get an explicit named callout line. Bot wiring: both modes score dead links (payoff value + large bonus for completing a Resonance) and Pulse past a threshold; solo adds a courtesy floor (never take the pool below 5, except Sever/Steady under lethal-adjacent pressure). Pulsekeeper's Ring forcibly retexted to "Pulse costs 1 Thread instead of 2" (OQ#27). The wider Thread economy loop (link-generated Thread, overcap strain, earlier thread-attacking enemies) is deferred to post-playtest data (OQ#26).
13. **Economy rulings + ascension skeleton** (§14.13, S4, post-rulings session 2026-06-12 — landed on branch `s4-economy`; main stays frozen as the Playtest-2 build until that telemetry is banked). Three designer rulings plus the substrate they need:
    - **OQ#3 → CLOSED, no change**: Wedding Knife stays droppable-last from the random pool; shop/treasure remain its primary sources.
    - **Shop removal rework (OQ#8)**: removals are **unlimited per shop visit** — the service never sells out, only gold gates it. Price for a player = **75 + 25 × removals that player has bought this RUN** (counter on run state, `removalsByPlayer`, survives between shops), paid from the **shared purse**. Design intent verbatim: a player going small-deck can, at an escalating tax on the team's gold. Each player removes only from their own deck; the shop shows each player their own next price AND the partner's (the negotiation is the point). Bots evaluate their per-player price with the remove-a-starter preference and deck-size > 8 guard — policy parity, not policy ambition (note: pre-S4 bot code had an unguarded removal branch that made the deck-size guard dead code; S4 consolidates to the guarded path, the one S4's sprint doc describes as current). The Witness gets one tone-budget line for a player's 4th+ removal.
    - **Pulsekeeper's Ring rework (OQ#27)**: `pulseCostMinusOne` removed entirely (it doubled Pulses per Thread). New: run-persistent charge counter on the owner — **every third Pulse costs 1 Thread** (3rd, 6th, 9th…; counting starts at acquisition). Retext: "Every third Pulse costs 1 Thread. The Ring keeps count." UI: 0–2 pips on the relic frame; the THREAD row's Pulse button shows the discounted cost when the next one is the third. `ringDiscountsFired` telemetry watches for deadness at human Pulse rates (designer accepted the risk; pre-agreed escalation: every third Pulse FREE).
    - **Gold telemetry (S4.1)**: `goldEarnedBySource` (combat/elite/boss/event/treasure), per-player `goldSpentByCategory` (cards/relics/removals), `removalsByPlayer` (mirrors the run counter independently), `goldResidual` at run end, and per-act earned/spent in `actStats` — in the engine Telemetry, sim summary (mean income/run, mean residual, removals/player/run, removal-spend %), end-of-run summary screen, and human-session files. Gold had zero coverage before this; the OQ#8 escalation is unreadable without it.
    - **Ascension ladder skeleton (S4.4)**: A0–A5 picked in the lobby (both-confirm, concede pattern; solo Witness follows the human; default A0), rungs as composable engine flags applied at run start — A1 enemy HP ×1.1 (multiplicative on the §14.8 anchor), A2 enemy damage ×1.1 (intents stored scaled, displayed truth preserved), A3 +1 elite per act, A4 Fray threshold −1 (spending the pool to exactly 0 frays; provisional), A5 rest heal 30%→20% (provisional). **Every number provisional until Playtest 2 + soft-release data; do not tune.** TB_ENEMY_HP_SCALE/TB_ENEMY_DMG_SCALE stay orthogonal live overrides. Ascension level stamps every telemetry file and the sim header; `ASCEND=N` selects bot-battery level. Clearing A(N) unlocks A(N+1) per character.
    - **Browser profile + unlock machinery (S4.5)**: no accounts — localStorage profile `{version, clears, unlockedCards, ascensionUnlocked}` with a base64+checksum **export/import string** on the title screen (import merges max/union, never downgrades; corrupt strings rejected). **Union rule (designer ruling, this session)**: the run's card pool is the union of both players' unlocked sets, and clear credit accrues to BOTH players' profiles (each browser banks its own seat). Pool assembly filters by the union via `LOCKED_CARDS`, which **ships empty — everything unlocked, zero behavioral change** until a locked set is authored (post-playtest content pass, same pass as OQ#24). Client sends the profile as a **claim** at room join; the authoritative server (§11) clamps ascension to both players' unlocked max and builds the union itself.
    - **A0 parity (S4.6 gate 2)**: 50-run battery at A0, seeds 1000+, vs the branch point — win 26% vs 28% (one flipped run), act-1 HP/combat 22.8 vs 22.5, link-fire 52.8%/61.8% vs 52.8%/61.8%, Hex share 46.7% vs 47.5%; same two pre-existing gate readings (act-2 link-fire high, Hex share above the unedited 25–45 band — both documented S3 carryovers). The one designed diff, removal pricing: bots now buy ~1.2 removals/run pair-total under the guarded policy.
14. **Playtest-2 live triage** (§14.14, 2026-06-12, on `s4-economy` — main untouched, still the frozen playtest build): two batches of in-session reports. **Bugs fixed**: controller skipped every other card in crowded 8+ hands (rectangle-nav edge test vs fanned overlap; strictly-forward centers now qualify); right-stick pan now drives the focused element's own overflow-x container (the Chain track was unreachable past one screenful); boss/elite §14.8 self-retether is forecast on the enemy card during planning ("re-tethers this turn → X" — the displayed binding was stale exactly on retether turns); hex stack count always shown; rest sites show both players' HP; deck size on the header Deck chip; relic-sourced Thread gains get named log lines (the pool moved invisibly mid-resolution); Resonance tooltip states what actually scales (primary number ×1.5); same-card double-Reclaim guarded (engine assert + greyed panel rows); Stolen Breath's upgrade was a byte-identical no-op (now Link (any): Kindled 2, base untouched pending OQ#30); Cracked Bell retexted to its real rule (once per burst, any size); Momentum previews as ➤+N badges on hand and staged Strikes (halving walked down the chain; estimate-class display like planned Block). **OQ#29 RULED**: Loom of Two Hands → first own link fire each turn only, and rare — shipped via a generic `oncePerTurn` hook flag and a `rare` relic flag (1/3 drop weight; relics had no rarity before). **Logged, not tuned** (OQ#30–35): Stolen Breath exhaust proposal, resonance primary-flag coverage (12/105 link clauses scale; 33/131 cards inert), Linked Shields underpowered, thread-math repro ask, link(any)-upgrade report (= OQ#24 confirmation), the Stolen Breath name collision (neutral card vs Gathering Slack's mutation).
15. **Playtest-3 live triage** (§14.15, 2026-06-14, `s4-economy`; main still the frozen build). **Balance ruling**: starting gold **40 → 100** (designer: 40 too low for first-shop agency) — `initialState`. **Bug fixes (client/content)**: controller can now scroll the Deck overlay and Reclaim list (right-stick drives the focused element's `overflow-y` container; new `scrollerY`); the Momentum `➤+N` preview now folds in Momentum gained mid-chain (walks effects in order); enemy intents reflect Weak (`floor((amount+Str)×0.75)`, tagged "(Weak)"); a resonating card with no `primary` effect reads "RESONANCE · streak only" instead of a bare buff; Call and Answer no longer prints its link clause twice (`link.text` is the effect only, matching convention); the lobby ascension picker is ungated from partner-presence so a co-op host can pre-set it. **Answered**: link(Rite) cards exist (6 in pool; Rite is the sparse tag); enemy Binding does not carry across combats (rebuilt per fight; multi-enemy fights split p1/p2). **Logged for the design session** (OQ#37–45): HP-narration timing (#37), Reclaim/discard friction (#38), Thread regen too fast (#39), sever-active-links feature (#40), relic ownership/co-op clarity (#41), reward "Pass on Coveting" redundancy (#42), Hex≫Momentum (#43), ascension both-confirm vs host-only (#44), single-enemy binding anti-streak option (#45). Balance items await the human telemetry file, not bot sims.
16. **Status-timing fix + enemy debuff bump** (§14.16, OQ#46 ruling, 2026-06-14, `s4-economy`). Two PT3 reports (enemy Weak/Vuln 1 "wears off immediately"; boss Fray "does nothing") were one bug: player statuses are cleared at the start of the player's turn, but enemies apply them during the enemy phase — so a 1-stack was wiped before it could bite, and Fray (hard-reset to 0) did nothing at any amount. Fix: (a) all enemy `debuff_weak`/`debuff_vulnerable` intents bumped 1 → 2; (b) enemy-applied Weak/Vulnerable/Fray route through a new `PlayerState.pendingStatus` bucket that activates at the next `startTurn` (after the clear/decrement), so they take hold on the players' next turn and persist — Weak/Vuln for two effective turns, boss Fray for one. Thread-overdraft Fray stays IMMEDIATE (applied during the player phase, bites that same enemy phase) and is not routed through pending; player→enemy debuffs are unchanged. A deliberate difficulty increase (enemy debuffs finally matter), accepted against two zero-fall human full-clears. Covered by `pt3-status.test.ts`; full suite + fuzz replay green.
17. **Duplicate-enemy numbering + damage forecast** (§14.17, PT3, 2026-06-14, `s4-economy`). (a) When the same enemy NAME appears more than once in a fight, the client appends a 1-based ordinal ("Cinder Husk 2") on the enemy card, the chain card's target line, and the combat log — so a card's target is unambiguous (numbering is by spawn order and stays stable as enemies die). (b) New §11-sanctioned static preview `computePlannedDamage(state)` (engine, alongside `computePlannedBlock`): forecasts each enemy's HP loss from the staged chain over working copies — targeting, Momentum first-hit + halving, Weak/Vulnerable, Block absorption, Hex apply/double, detonation, Resonance scaling. An ESTIMATE (relic/power hooks and the rare per-hit-Momentum rider excluded). The client shows it per enemy (a hatched chunk on the HP bar + "−X → N" / "☠ lethal"), toggled by a "dmg preview" chip in the combat actions row, **ON by default** and persisted to localStorage (`tb_dmgPreview`) so it survives reloads and is trivially revertible. Resolution-parity tests in `combat.test.ts` assert forecast == actual HP loss for Block-absorption and Hex-scaling cases; full suite 85/85.
18. **Mouse drag-to-reorder** (§14.18, PT3, 2026-06-14, `s4-economy`). Staged chain cards are now draggable with a mouse to rearrange them — an alternative to the ◀▶ buttons (and the pad's L2/R2), emitting the same `REORDER` action. Only your OWN cards are `draggable` (server still asserts ownership), but any position is a valid drop target so you can weave your card between the partner's. A left/right inset edge marks the insertion point during the drag (`drop-left`/`drop-right`), and the dragged card dims. The insertion index is corrected for `REORDER`'s remove-then-splice semantics (a gap past the source shifts left by one), so the card lands exactly where the indicator shows. Mouse-only by design (HTML5 DnD; controller/touch keep their existing paths). Build clean, full suite 85/85; the drag *feel* wants a human glance like other pointer/controller sign-offs.
