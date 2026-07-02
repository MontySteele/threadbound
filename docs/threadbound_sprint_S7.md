# Threadbound — Sprint S7: The Rites

Purpose: close the gap between canon lore and shipped mechanics BEFORE the
slice playtests. The lore bible (§3, §5b) describes a death-rite/birth-rite
identity loop, a character-event routing economy, and widened early acts —
none of which exist in code. Playtesting the slice without them would
verdict an outdated build. S7 builds the systems; S8 (content realignment)
authors against them; the combined playtest runs `TB_TRACKS=1 TB_RITES=1`.

Branch: `s7-rites`, from main. New flag: `TB_RITES` (default off), separate
from `TB_TRACKS` so playtest sessions can attribute problems by toggling
independently. Hard scope rule: NO unlock economy (codex/ascension gating of
rites waits on post-playtest Part-2 quota decisions — all seeded rites are
available from the first run), no Act 4 work, no question-set changes, no
new answer content beyond what character events minimally need (S8 owns
content). Balance changes and bug fixes in separate commits, as always.

## S7.0 Rulings already resolved (designer, this session)

1. **Seed counts:** 4 death-rites + 3 birth-rites per role. Death-rite
   offer: randomized 2 of the role's pool (Neow-class variance, never the
   full menu). Birth-rite pick: choose 1 of all 3 (pool too small to
   randomize yet; revisit when unlocks grow it).
2. **Threshold N = 2 character events**, credited to the event's ACTOR.
   Generic events do NOT count. At N=2 with the widened maps, a player who
   routes for it lands the birth-rite mid-act-2, while it can still matter.
3. **Map sizing: BOTH levers, not layers alone.** Sim experiment (this
   session, 1000-map composition + 50-run batteries): today's L6 maps have
   a routing ceiling of ~1.24 events/act — ~2.5 events across acts 1–2
   against a two-track demand of 5–8. Layers alone scale badly (L9 only
   reaches 2.6/act while adding ~3.7 combats/act). Adopted provisional
   config: **LAYERS 6→7 for acts 1–2 AND event roll share 22%→32%**
   (ceiling ~2.3/act, ~4.6 across acts 1–2; combats/map nearly flat,
   5.77→6.08; +1 path node per act). L8/E32 (ceiling ~2.9/act) is the
   reserve config if S7.4's timing telemetry says demand is unmet.
4. **Reclaim (OQ#38): Reclaim additionally reads the partner's EXHAUST
   pile.** Smallest change that makes the birth rite attemptable from
   turn 1; exhaust-as-the-place-things-return-from is exactly the fiction.
5. **OQ#44: host-only ascension picker.** Cheap while run-start UI is open.

Battery finding to carry: every widened/eventier config drifted bot win
rates UP (vb 20→26–34%, bb 22→34% in this session's environment) — the
risk is easing, not breaking. Re-centering via `TB_ENEMY_*` scales is a
separate balance commit AFTER the rites land, informed by the S7.8 battery.
Caveat: those sims ran the existing event pool; character events pay
birth-rite progress rather than loot, so magnitudes will shift.

## S7.1 Rite data model + registry

- `RiteDef`: id, role (`CharacterId`), kind (`death` | `birth`), name,
  flavor line, effect. Effects MUST compile to existing hook/effect ops
  (`HookEvent`, relic-style hooks) — a rite is mechanically a hidden
  relic granted at pick time. If a proposed rite in the S7.2/S7.4 tables
  can't express in existing ops, flag it for redesign rather than growing
  the op set this sprint.
- Registry follows the content-module pattern (`content/rites.ts`).
- Covenant test extension: every role has ≥4 death + ≥3 birth rites;
  **no rite effect may add Hex application, Hex scaling, or Hex density**
  (the OQ#28/OQ#43 caps are load-bearing; enforce by review checklist in
  the sign-off table, plus a test asserting no rite effect op references
  Hex application).
- Inherited note for later sprints: S4's union rule will cover rite
  unlocks (lore bible ruling). Nothing to build now; don't preclude it.

## S7.2 Death-rite offer (run start)

- After character select, before act 1: each player is offered 2 of their
  role's 4 death-rites (seeded rng, per player). Pick is mandatory; the
  Witness gets one line acknowledging the vestment ("don the vestment
  of…" is the UI verb — lore bible §3).
- Solo: the human picks for their seat; the engine seat picks randomly.
- Telemetry: rite id per player per run, joined into the battery summary.
- Proposed seed set — **enumerate→propose→sign-off: numbers and wording
  all provisional; nothing lands unapproved.** Names draw the death
  column of the word-drawer (§7).

  | Role | Rite | Effect (directional) | Notes |
  |---|---|---|---|
  | Vess | Shroud-Taker | Start each combat with 3 Block | Defensive floor; eases the mirrors' hot act 1 |
  | Vess | Votive-Bearer | First link fire each combat: gain 1 Thread | Link economy, Hex-neutral |
  | Vess | Knell-Marked | First detonation each combat deals +3 | Cash-out side only — cap-safe |
  | Vess | Vigil-Keeper | Once per combat, partner drops below half HP: both gain 2 Block | Co-op texture |
  | Bram | Toll-Paid | Start each combat with 2 Momentum | Space-2 floor, exactly the consolidation brief |
  | Bram | Pyre-Sworn | First Strike each combat deals +2 | Reads his over-produced tag |
  | Bram | Mourner's-Gait | First HP loss each combat: gain 1 Momentum | Self-state bank from taking hits |
  | Bram | Descant-Step | First Surge card each combat: draw 1 | Surge self-synergy per the polish brief |

## S7.3 Character events (new subtype)

- `EventDef` gains `character?: CharacterId`. Character events enter the
  act pool only when that character is in the run and `TB_RITES` is set
  (mirror the `tracks` gating pattern in `map.ts`, including exact rng
  consumption parity when off).
- Queue weighting: character events carry the same 2× weight as clue
  events (they're the other track; the two compete fairly for the same
  slots — "one economy, two payoffs").
- The event's ACTOR gains 1 birth-rite progress; partner channel gets a
  Witness line, not progress. Progress is visible (small per-player pip
  near the portrait — exact UI Claude Code's call, but it must be
  glanceable; the routing decision is the game).
- Seed content: 3 character events per role, placeholder-quality prose is
  acceptable (S8 polishes voice); structure and choices must be final.
  Each offers a real choice (M2 house rule: no vending-machine events).

## S7.4 Birth-rite pick (threshold payoff)

- On resolving a player's 2nd character event: that player picks 1 of
  their 3 birth-rites, immediately, at the event screen — deliberately NOT
  deferred to an act boundary. The mirror sacrament arrives as a reward
  for engaging, not as a schedule.
- Per the held-reveal ruling: NO explanation. Birth-column names, no
  tutorialization, the Witness says something that will only make sense
  later. (S8 owns the lines; S7 ships with minimal text.)
- Telemetry: pick timing (act, layer, node index) per player per run.
  This is the data that arbitrates L7/E32 vs L8/E32.
- Proposed seed set — same sign-off discipline; birth-column names (§7):

  | Role | Rite | Effect (directional) | Notes |
  |---|---|---|---|
  | Vess | Quickening | Your Reclaimed cards' effects +1 this run | Reclaim pull, cap-safe if the card isn't Hex-applying — needs the no-Hex-growth check |
  | Vess | First-Breath | When a Resonance ignites: both players heal 1 | Streak incentive, mirrors' HP relief |
  | Vess | Cradle-Warden | Once per turn, partner's link off your card: they gain 1 Block | Set-up seat identity |
  | Bram | Hearth-Keeper | Keep 1 Momentum between turns | Bank deepening — the space-2 brief verbatim |
  | Bram | Dowry-Bound | When you Reclaim a partner's card: gain 2 Momentum | Ties Reclaim engagement to his engine |
  | Bram | Naming-Day | Your mutated cards deal/apply +1 | Mutation-loop pull (mutations loosen — ruled) |

## S7.5 Map sizing (lands UNFLAGGED, separate commit, own battery)

- Acts 1–2: `LAYERS = 7`, event roll share `32%` (combat share absorbs
  the delta; rest/treasure shares unchanged). Act 3 finale untouched —
  the capstone shape is a deliberate pacing ruling.
- Keep both knobs env-overridable (`TB_MAP_LAYERS`, `TB_MAP_EVENT_PCT`)
  following the `TB_ENEMY_*` pattern — this session's experiment needed
  exactly those knobs and future tuning will too.
- This is a tuning change to the UNFLAGGED game, so it lands as its own
  commit with its own 50×3 battery, and becomes the new baseline that
  S7.8's flag-off parity gate compares against. The public build gets
  wider maps; that's intended (they're strictly more routing choice) —
  flag it in the deploy notes.

## S7.6 Reclaim engagement (OQ#38)

- Reclaim's candidate set becomes: own discard + partner's discard +
  **partner's exhaust** (ruled). The existing once-per-run-per-card chip
  rule extends across the new source unchanged.
- Separate commit; battery isolation before/after (this is the one part
  most likely to move balance on its own — Dowry-Bound and Quickening
  both amplify it).
- Sign-off gate contribution: bot Reclaim attempts in the S7.8 battery
  must be > 0 (from literal zero). If the bot policy can't reach Reclaim
  even with the wider window, the harness gets a minimal policy nudge —
  as a sim-only change, clearly marked, per the S6.2 precedent of
  sim-facing accommodations.

## S7.7 Run-start housekeeping

- OQ#44: ascension picker becomes host-only (ruled). Non-host seats see
  the selected rung, read-only.
- Bot harness: `TB_BOT_SEEK_EVENTS=1` — bots prefer event nodes over the
  lowest-id rule when reachable. Today's bots route arbitrarily, so
  ambient event exposure would never exercise the birth-rite path;
  without this knob, S7.8's timing gate is unmeasurable. Sim-only,
  default off, no production surface.

## S7.8 Sign-off gates

1. **Rite tables approved** (S7.2 + S7.4, all 14) before any rite is
   implemented. Redesigns for inexpressible effects come back to the
   table, not into code.
2. **Flag-off parity:** `TB_RITES` off → 30-run vb aggregate within noise
   of the S7.5 post-map-change baseline; zero rng-consumption drift
   (tracks-pattern test).
3. **Full battery** 50×3 with `TB_RITES=1 TB_BOT_SEEK_EVENTS=1`: each
   pair within ±8 pts of its flag-off rate (re-centering deferred to the
   follow-up balance commit); act-1 HP loss within the watch band.
4. **Birth-rite timing:** median pick lands in act 2 before the act-2
   boss layer for event-seeking bots. If it lands act 3 / not at all,
   escalate to L8/E32 (reserve config) or N stays 2 and weighting rises —
   designer call with the telemetry in hand.
5. **Reclaim engagement > 0** in the battery (S7.6).
6. **No-Hex-growth check:** covenant-style test green; manual review of
   all 14 effects against the OQ#28/OQ#43 caps.
7. Tests green from fresh clone; `npm run build` before any battery
   (house rule).

## Out of scope

Unlock economy and held-reveal pacing, codex completion criteria, final
question set (the death-rite "who are you" consequence stays deferred),
answers-per-question quota, the wrong-way event, mutation renames, Witness
voice arc, boss faces (all S8); Act 4 / the Caretaker; character 3;
anything `TB_TRACKS` owns that already shipped.
