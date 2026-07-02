# Threadbound — Tonight's Build: S9a Plumbing + S10a Combat Breadth

Purpose: extend tonight's S7+S8 push with (a) the structure-invariant
half of S9 — meta-progression bones and codex surfaces for tomorrow's
vibe check — and (b) combat breadth, because at the L7 maps (~7
combats/act) the current pools (act 1: 3 easy/4 normal; act 2: 2 easy/3
normal) repeat within a single run. Then a stacked battery matrix across
pairs and ascensions, and ONE difficulty re-centering commit.

## Ordering + fallback discipline (non-negotiable — four sprints stack tonight)

Merge order: S7 → S8 → S9a → S10a → battery matrix → re-centering.
After EACH stage's gates pass, tag it (`test-candidate-N`). Tomorrow's
friend sessions run the NEWEST PASSING TAG, not HEAD. If S10a enemies
misbehave at 2am, tomorrow tests the post-S9a tag and loses nothing —
the sessions were designed against S7+S8 content anyway. No stage's
failure may block the tag behind it.

## Part A — S9a: meta-progression plumbing (structure-invariant)

Everything here survives every possible playtest verdict; only NUMBERS
are deferred, and none land tonight.

- **Profile unlock storage:** `unlocks: { deathRites: string[],
  birthRites: string[] }` per role, plus highest ascension cleared
  (may already exist via S4). Seeded state: ALL current rites unlocked
  (the S7 ruling stands — no gating tonight, the field just exists and
  the offer reads it).
- **Union rule extension to rites** (the S4 rule, per the lore bible's
  inherited note): a pair plays with the UNION of both profiles'
  unlocks for the run; credit accrues to both. Trivial while all rites
  are unlocked, but the read-path must go through it now so the rule is
  never retrofitted. Matters tomorrow if one friend accumulates profile
  state across runs.
- **Codex screen (the vibe-check surface):** promote the title-screen
  stub to a minimal real screen: entries grouped by question, truths
  and eliminations distinguished, per-question "N of M answers proven"
  counters, undiscovered entries as unlabeled slots (count visible,
  content hidden — the gestation should look like something filling).
  No art, no unlock rewards, no completion state. Reachable from title
  AND from the run's pause surface.
- **Codex-percentage hook:** verify S8.7's Witness registers key off
  the PROFILE codex fill (not run-local state); if S8.7 wired it
  run-local, fix tonight — the voice arc is a meta-scale loop.
- Explicitly NOT tonight: unlock pacing, rite gating logic beyond the
  read-path, completion criteria, codex meta-rewards, ascension
  fraying.

## Part B — S10a: combat breadth

Pool targets: act-2 easy 2→4; both normal pools +2; +1 elite per act.
That implies ~8–9 new enemies and ~7 new encounter entries. Bosses
untouched (S8.5 owns faces).

**Composition rule (hard):** every new enemy interacts with the co-op
layer — Binding, Thread, the Chain/links/Resonance, or the
discard/exhaust/Reclaim space. No pure stat-blocks; same-iness is a
composition problem. Bias: mostly enemies that REWARD co-op literacy
(punishers are elite-tier texture, max two tonight) — the thesis should
feel good against the new roster, not policed by it.

Proposed table (enumerate→propose→sign-off — designer approves this
table before implementation; numbers provisional; names from the
word-drawer):

| Act/pool | Enemy | Co-op hook (directional) |
|---|---|---|
| A1 easy | **Tithe-Taker** | Its attack also drains 1 Thread from the pool; refunds 2 on death — a Thread-economy fight with a payoff |
| A1 easy | **Half-Carried** | On death, splits into two frail Mislaid (cargo that was never one thing) — tests AoE vs chain sequencing |
| A1 normal | **Votive Snuffer** | Gains 2 Block whenever a link fires — rewards deliberately UN-linked plays; texture against autopilot chaining |
| A1 normal | **Pall Warden** | Rebinds itself each turn to whoever played the LAST card in the Chain — Binding churn the pair can steer |
| A1 elite | **The Mislaid Sexton** | Every 3rd turn, exhausts the top card of one player's discard (feeds on the unburied) — directly stresses the new Reclaim window |
| A2 easy | **Bell Wretch, Cracked** | Takes +2 damage the turn after a Resonance ignition (the harmony hurts it) — thesis-rewarding |
| A2 easy | **Descant Mote** | Copies 1 Weak/Vulnerable applied to any OTHER enemy onto itself (a follower's echo) — rewards debuff spread |
| A2 normal | **Choir Silence** | While alive, the FIRST link each turn doesn't fire (a held pause) — the pair sequences a throwaway first; punisher, normal-tier exception, watch it in battery |
| A2 elite | **The Unstrung** | On its turn, if the pair resonated last turn, it Frays 1; if they didn't, it attacks twice — a genuine dilemma reading the Chain |

Encounter entries mix new with existing enemies (variety compounds
combinatorially — that's the cheap multiplier). Telegraph lines for all
mechanics; the co-op hooks must be legible from intent UI, not
discovered by autopsy.

## Part C — battery matrix + re-centering

After S10a lands: PAIR {vb, vv, bb} × ASCEND {0, 2, 4}, 50 runs each,
`TB_RITES=1 TB_BOT_SEEK_EVENTS=1` — nine batteries (~10 min at current
harness speed).

Gates:
1. A0: each pair inside 25–35% win; act-1 HP loss in the watch band;
   |max−min| across pairs ≤ 15 pts.
2. Monotone difficulty: per pair, win(A0) > win(A2) > win(A4), no
   inversion.
3. Reclaim engagement > 0 and < 25% of acquisitions; rite picks inside
   the 10–60% band.
4. No single new encounter with an outlier HP-loss signature (> ~2× its
   pool's mean) — flag, don't block, unless it's a wipe machine.

If gate 1 fails on the stacked build (likely — the maps eased things),
ONE `TB_ENEMY_*` re-centering commit, separate, then re-run the A0 row
only. Do not touch individual enemies for global drift; do not
re-center more than once tonight.

## Tomorrow-morning checklist (before friends arrive)

1. Smoke run on the newest passing tag: full run, both flags on, rite
   pick → character event → birth-rite → shrine → boss, no stalls.
2. Codex screen shows last night's smoke-run writes.
3. Telemetry writing locally; consent flow behaves.
4. Fallback tag name written down where you can see it.
5. Debrief script printed (question 2 verbatim — do not name the
   birth-rite).

## Out of scope tonight

Unlock pacing numbers, archetype support cards, boss faces beyond S8.5,
Act 4, per-enemy balance tuning beyond gate 4 flags, anything the
playtest plan gates on human reads.
