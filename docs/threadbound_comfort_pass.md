# Threadbound — Comfort Pass for Tonight's Build

Companion to `threadbound_tonight_s9a_s10a.md`. Three deliverables: a
working harness/telemetry patch (`comfort-pass.patch`, tested in a live
sandbox against main), the knob-sensitivity sweep findings, and checklist
additions. Everything in the patch was built and run today; apply it
early in tonight's sequence (it's harness/telemetry only — no gameplay
surface except two env-default-preserving knobs).

## 1. The patch (apply with `git apply comfort-pass.patch`)

- **Per-encounter HP-loss telemetry** (`Telemetry.encounterStats`,
  written at combat start + damage time, printed by the sim as a sorted
  table with `!! outlier` flags at >2× the mean of n≥5 encounters).
  This is what tonight's battery gate 4 reads; it did not exist before.
- **Parallel sim runs**: bounded worker pool, `TB_SIM_CONC` (default 8,
  `=1` reproduces sequential). 61s → 40s per 50-run battery even on a
  single core; the server runs in-process so one battery is
  core-bound — hence:
- **`scripts/sim-shard.sh`**: launches N sim processes with disjoint
  seed ranges and pools win rates. On a multicore machine this is the
  real speedup (6 shards ≈ 6×). Usage:
  `PAIR=vb SHARDS=6 RUNS=300 scripts/sim-shard.sh`.
- **Env knobs**: `TB_MAP_LAYERS` / `TB_MAP_EVENT_PCT` (this IS the
  S7.5 knob deliverable — if tonight's S7.5 already built them,
  reconcile rather than duplicate) and `TB_START_GOLD` (sweep-only;
  default unchanged at 100).
- `scripts/map-composition.js`: the static map-supply analyzer from the
  layer experiment, committed for reuse.

## 2. What the new telemetry immediately found (current main, vb, 50 runs)

- **`a2_bell_pair` is an outlier-class NORMAL encounter: 54.6 pair-HP
  per combat — costlier than either act-2 elite** (bellkeeper 47.1,
  cantor 35.8). Pre-existing, not caused by any recent work. Recommend:
  note it, do NOT tune tonight (separate-commit discipline; and the
  re-centering knob will move it too). If tomorrow's friends wipe to
  it, you'll know why.
- `a1_wisp_leech` is a freebie (8.4). Act-2 normals run systematically
  hotter than act-1's — the act ramp is steeper than the elite/normal
  distinction. Worth a designer look after tomorrow, not before.

## 3. Sweep findings (vb, 50 runs/config; noise ±6 pts — two identical
     baseline configs scored 14% and 20%)

| Knob | Range | Win-rate response | Read |
|---|---|---|---|
| `TB_ENEMY_DMG_SCALE` | 1.15 / 1.30 / 1.45 | 38 / 30 / 10% | **The sensitive knob** — ~28 pts across the range, ~3× HP's slope; also directly drives the HP-loss watch band |
| `TB_ENEMY_HP_SCALE` | 1.30 / 1.45 / 1.60 | 26 / 26 / 16% | Coarse; flat until 1.6. Stretches fights (pacing) more than it endangers |
| `TB_START_GOLD` | 40 / 100 / 200 | 16 / 22 / 20% | Flat within noise. NOT a difficulty lever for bots; remains the human-agency knob per the PT3 ruling |
| Map L×E (from earlier session) | L6E22 → L8E32 | drift UP across all configs | Widening eases the game; re-center after, not via maps |

**Re-centering guidance for tonight:** reach for DMG first, steps of
~0.05, one commit. Caveat: sweep ran on pre-S7/S8 main — absolute
numbers won't transfer to the stacked build, but the sensitivity
ordering (DMG ≫ HP ≫ gold) will.

## 4. Checklist additions for tonight / tomorrow morning

1. **Gate-1 resolution fix:** at ±6 pts of jitter, a single 50-run
   battery cannot resolve the 25–35 band. The A0 row of the matrix runs
   pooled shards (150+ runs per pair) on your machine. The A2/A4
   monotonicity rows can stay at 50 (the expected deltas are large).
2. **Run-timeout check:** `RUN_TIMEOUT_MS` is 300s; rites + L7 maps
   make runs longer. If any run FAILs with "timed out" tonight, raise
   it before concluding anything — a timeout mid-battery poisons the
   win-rate read.
3. **Smoke-test two paths the specs added late:** rite-card removal at
   a shop (the removability ruling's code path), and codex persistence
   across a browser refresh (profile is client-side).
4. **Jitter cleanup (parked, not tonight):** run outcomes vary with
   socket timing despite seeded engine+policy. Fine for batteries read
   at ±6; a someday-item for a lockstep/deterministic transport mode if
   batteries ever need to resolve <5 pt differences.
5. The `a2_bell_pair` note above goes in tomorrow's session notes — if
   friends hit it, distinguish "hard fight" feedback from systemic
   difficulty feedback.
