# THREADBOUND — Design Document (Draft 2)

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

1. **Draw & Intents.** Each player draws to 5. Enemy intents are revealed (StS-style icons), including which player each enemy is **Bound** to (§6).
2. **Planning (simultaneous).** Both players stage cards from hand onto the shared **Chain track** — a row of numbered slots visible to both. You may place, remove, and reorder *your own* cards freely. You see your partner's staged cards live (face-up, with full text). Either player hits **Ready**; when both are Ready, the turn commits. Thread actions (§5) are also declared during planning.
3. **Resolution.** The Chain resolves slot 1 → N in order, then enemies act.

There is no hard time limit on planning (a soft "your partner is ready" nudge appears after 45s). Friends on voice chat are the target context, but the staged-card visibility means the game is fully playable over text or in silence.

### 2.2 Energy

Each player has **3 energy per turn** (modified by relics/powers). Cards cost 0–3. Energy is personal, not shared — the shared resource is the Thread (§5).

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
- **Second Wind** — 1 — Surge. Gain 1 energy, draw 1. **Link (any):** also gain 1 Thread.
- **Stoke** — 1 — Rite (Power). At the start of your turn, gain 2 Momentum.

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
6. **Failure friction:** full roguelike, death = fresh run (no meta-progression in v1).

**Still open (low-stakes, can resolve during M1):**

1. **Covet cadence tuning:** the start-1 / +1-per-elite / max-2 numbers are a first guess; telemetry + playtest 1 will say whether Covets feel scarce-and-precious or annoyingly stingy.
2. **Resonance degeneracy watch:** levers in order — (a) self-similar card scarcity (in effect, §2.3), (b) cross-player streak requirement (in effect, §2.3), (c) require ≥2 unique cards/tags in the streak (back pocket), (d) raise threshold to 4 links. Bot telemetry tracks tag diversity within Resonance streaks to detect mono-tag dominance.
3. **The Witness's volume:** confirmed default — every event and crossed choice, ~25% of combats, all deaths. Lines are drawn from large per-context pools with no-repeat-within-run tracking, so commentary never becomes an echoed catchphrase.
