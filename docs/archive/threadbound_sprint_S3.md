# Threadbound — Sprint S3: Starter Payoff Redesign + Character Balance Battery

Pre-playtest sprint. Replaces the §14.10 Hatpin-detonates patch with a design that
preserves bank-and-burst, moves the burst payoff cross-player (the game's thesis,
in the starters), and adds the instrumentation to verify (a) Vess and Bram are
comparably strong and (b) the mixed pair outperforms either mirror — synergy must
beat duplication. Record the outcome as §14.11 in DESIGN.md with a changelog entry.

Hard scope rule: no changes outside this doc. No pool content, no relics, no
keyword changes, no UI work beyond telemetry display if trivial.

---

## S3.1 Telemetry first (so every ladder run below produces the new stats)

Add to engine telemetry + sim summary + human-session files:
1. **avgStackAtDetonation** — mean Hex stack size at the moment of each detonation
   (the bank-and-burst health stat; near 1–2 = the fantasy is dead).
2. **Per-character splits**: damage dealt, block gained, link-fires, Falls,
   Covet picks by direction (who took from whose pack).
3. **Worn Knife tracking**: count played + mean damage per play (the scaling-mode
   health stat, counterpart to #1).
4. **Thread economy stats**: thread spent per combat, spend mix by action type
   (Pulse/Reclaim/Sever/Steady), regen wasted at cap per combat, % of fired links
   that were forced via Pulse (post-S3.3b), Resonance streaks completed by a
   forced link.
5. **Run header**: log mode (solo/pair), character assignment, and the active
   PT1_ENEMY_HP_SCALE / PT1_ENEMY_DMG_SCALE values into every telemetry file and
   sim summary. Friday's pair data is uninterpretable without the scale on record.

## S3.2 Env-overridable difficulty scales

- `PT1_ENEMY_HP_SCALE` / `PT1_ENEMY_DMG_SCALE` read from `process.env` with the
  committed values as defaults. Server-side only; clients display values from
  authoritative state, so no client rebuild is needed to soften a live session.
  Verify no UI element derives enemy numbers from a locally-assembled registry.
- Purpose: mid-session softening on playtest night without a commit (e.g.
  `PT1_ENEMY_HP_SCALE=1.2 PT1_ENEMY_DMG_SCALE=1.2 npm run server`).

## S3.3 Starter redesign (§14.11)

**Vess** (starter: 3× Hatpin, 1× Worn Knife, 3× Patchwork, Pinprick, Loose Stitch,
Mendthread — one Hatpin's slot becomes the knife):
- **Hatpin** reverts to plain: "1 — Strike — Deal 4." Upgrade: "Deal 6."
  (Remove detonate from base and upgrade.)
- **NEW: Worn Knife** — "1 — Strike — Deal 2. +1 damage per Hex on the target
  (does not detonate)." Normal (blockable) damage — deliberate contrast with
  detonation's pierce. Upgrade: "Deal 4. +1 per Hex." Starter-only; never in pools.

**Bram** (starter: 3× Jab, 1× Knuckle-Crack, 3× Brace-Up, Opener, Second Wind,
Kindle — one Jab's slot becomes Knuckle-Crack):
- **NEW: Knuckle-Crack** — "1 — Strike — Deal 4. Link (Hex): Detonate 2."
  Upgrade: "Deal 5. Link (Hex): Detonate 3." Starter-only; never in pools.

Covenant audit (record in content-audit.md): both new cards playable standalone ✓;
Knuckle-Crack is Strike with Link (Hex) — not self-similar ✓; Worn Knife has no
link (pure floor) ✓; burst payoff is cross-player, scaling floor is self-owned —
amplified-never-dependent holds in both directions ✓.

Witness: one new line each for the first Worn Knife play and the first
Knuckle-Crack detonation per run (low rotation, solo + pair).

## S3.3b Thread rework — pre-playtest slice (§14.12)

Designer finding (solo runs): the Thread is ignorable — Pulse is a forgettable
flat bonus, the defensive actions are self-cancelling for a player who ignores
the pool, and the bot's correct-but-silent spends hid the system entirely.
This slice ships the structural fix; the economy loop (links generate Thread),
overcap strain, and earlier thread-attacking enemies are explicitly deferred
to post-playtest data.

**Mechanic change — Pulse redesigned:**
- OLD: "2 Thread: partner's next card +3 to its primary number." REMOVE.
- NEW **Pulse**: "2 Thread: choose a staged card whose Link will not currently
  fire — its Link counts as fired when it resolves." Declared during planning
  like other thread actions, but targeted at a specific staged card; either
  player may Pulse either player's card. The forced link counts for Resonance
  streaks. UI: dead (unlit) link arcs become Pulse targets; a Pulsed arc lights
  in the ignition hue with a thread-strand motif so forced ≠ natural at a glance.
- Tooltip/keyword registry updated; tutorial's Pulse beat updated to teach
  "light a dead link."

**Salience fixes:**
- Thread action declarations render in the Chain track margin (not a side
  panel) in stage order, visible to both players during planning.
- Bot thread spends get an explicit callout line ("The Witness pulses your
  Rendcall."), pair and solo.
- End-of-run summary adds the thread economy stats from S3.1.

**Bot courtesy + wiring:**
- Courtesy rule (solo only): the bot does not spend the pool below 5 except
  for Sever/Steady under lethal-adjacent pressure.
- Policy wiring (both modes): during the bot's final re-evaluation pass, score
  each dead link among staged cards — value of the link payoff, plus a large
  bonus if forcing it completes a Resonance streak — and Pulse the best one
  when score clears a threshold and thread (after courtesy floor in solo)
  allows. Bots must exercise the new Pulse for the A/B below to mean anything.

**A/B measurement (does it move the needle):**
- At the CURRENT anchor (pre-S3.4), fixed seed set, 50-run VB batches:
  (a) baseline = commit before this slice, (b) rework = after. Compare: win
  rate, link-fire rate, Resonance/combat, thread spent/combat, spend mix,
  regen wasted at cap, % links forced.
- Success signals: thread spent/combat up meaningfully (target ≥ 2× baseline),
  regen-wasted-at-cap down, forced links a visible minority of fires (~5–15%
  — grease, not crutch), Resonance/combat up. Win rate WILL drift up (forcing
  links is pure player upside) — that is expected and is corrected by S3.4,
  which re-anchors AFTER this slice precisely so the difficulty floor absorbs
  the Pulse buff and the starter changes together, in one ladder walk.
- Record both batches in `docs/archive/S3-BALANCE-REPORT.md` alongside the battery.

**Ordering note (binding):** S3.1 → S3.2 → S3.3 → S3.3b → A/B → S3.4 re-anchor
→ S3.5 battery. Do not re-anchor before the Pulse rework lands or the floor
will be walked twice.

## S3.4 Re-anchor the difficulty floor

After S3.3, walk the documented ladder in `registry.ts` (both knobs only — no
per-enemy edits) on seeded 50-run VB sims until:
- bot full-run win rate lands **25–35%**, and
- act-1 HP lost/combat lands **16–22**.
Expected landing zone is back near 1.2/1.2–1.3/1.25 (the Hatpin buff the 1.4/1.3
anchor compensated for no longer exists). Update the ladder comment with the new
data points; commit the chosen values as the new defaults.

## S3.5 Character balance battery

Add a character-assignment flag to the sim harness (e.g. `PAIR=vv|bb|vb npm run
sim`) using the existing solo/mirror plumbing; bots otherwise unchanged.

Run, at the S3.4 anchor, fixed seed set, 50 runs each:
1. `PAIR=vb` (baseline), 2. `PAIR=vv`, 3. `PAIR=bb`.

Report per batch: win rate, furthest-act distribution, act-1 HP loss, link-fire
rate, Resonance ignitions/combat, avgStackAtDetonation, Worn Knife mean damage,
per-character damage/block/Fall splits (vb only).

**Acceptance bands:**
- **Synergy premium (the headline):** vb win rate exceeds BOTH vv and bb by
  ≥ 10 percentage points, AND vb Resonance/combat exceeds both mirrors.
  The pairing must beat duplication — this is the design's core promise.
- **Character parity:** |vv − bb| win rate ≤ 15 points. Larger gap → the weaker
  mirror's character needs a look; report, don't auto-tune.
- **Texture stats:** avgStackAtDetonation ≥ 3 in vb (bank-and-burst restored);
  Worn Knife mean damage between Jab-1 and Jab+3 (4–8) in vb (floor, not engine).
- **Within-pair contribution (vb):** neither character > 60% of combined
  damage+block; Falls not > 70% one-sided.

**Interpretation caveats (print with results):** bot policy has archetype
affinity (hex-converging); mirror gaps partially measure bot fit, not card
strength — read direction and magnitude, not decimals. Mirrors are a solo-mode
configuration; the tuned product remains vb.

## S3.6 Failure playbook (if a band misses)

- Synergy premium missing → check whether mirrors are achieving Resonance at
  near-vb rates (links too generic) before touching cards; report findings as an
  OPEN-QUESTIONS entry. Do not nerf mirror play — strengthen cross-archetype
  link payoffs only with designer sign-off.
- vv ≫ bb or reverse → identify top-3 overperforming cards by damage share in
  the strong mirror; report, designer rules.
- avgStackAtDetonation < 3 → confirm Knuckle-Crack (not pool detonators) is the
  consumer; if pool detonators drip, that's a pool issue — report.
- All reports land in `docs/archive/S3-BALANCE-REPORT.md`; no tuning beyond S3.4's two
  knobs without a logged designer ruling.

## S3 sign-off
- Tests green incl. new covenant entries for the two starter cards and engine
  tests for forced-link Pulse (fires payoff, counts for Resonance, both-player
  targeting, courtesy floor honored in solo).
- S3.3b A/B recorded; thread spend/combat ≥ 2× baseline and regen waste down,
  else escalate to designer before proceeding to S3.4.
- S3.4 anchor committed with updated ladder comment (absorbing starter + Pulse
  changes in one walk).
- `docs/archive/S3-BALANCE-REPORT.md` with the A/B and all three battery batches, bands
  evaluated, caveats printed.
- DESIGN.md §14.11 (starters) and §14.12 (Pulse rework) entries written; the
  deferred Thread levers (link-generated Thread economy, overcap strain, earlier
  thread-attacking enemies) logged in OPEN-QUESTIONS as post-playtest candidates.
- Hex-share gate band revisited honestly against the new data (the 20–30% band
  predates starter payoffs existing at all) — propose a new band in the report
  rather than editing the gate silently.
