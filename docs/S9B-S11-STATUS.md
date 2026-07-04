# S9b → S9c → S9d → S11 Wave A — implementation status (2026-07-04)

One session, one branch (`claude/design-docs-review-kiesjw`), sequenced per
the packet: S9b (playtest response) → S9c (feel slice, as amended by
S9d.A) → S9d (the tally) → S11 Wave A (knotwork on current topology).
Suite: **284 tests green**; goldens regenerated twice, both loudly and
in-commit (S11.1 map repairs; the map shape changes were the design).

## ⚠ The battery environment does not reproduce the recorded matrix

This 4-core container reads the S9a/S10a baseline (vb 29 / vv 34 / bb 39)
as **vb 21 / vv 22 / bb 13** on identical code and seeds. Every gate below
is therefore judged against SAME-ENVIRONMENT baselines run this session.
All win-rate numbers are 200-run pooled shards, TB_RITES=1
TB_BOT_SEEK_EVENTS=1, A0, unless noted. Absolute levels here are not
comparable to numbers in older status docs; deltas are.

## Battery ledger (in-environment)

| Stage | vb | vv | bb | Notes |
|---|---|---|---|---|
| pre-S9b (1e5e076) | 21 | 22 | 13 | in-env baseline |
| post-S9b | 19 | 24 | 17 | all Δ within ±6 ✓ (gate 2 PASS) |
| post-S9c | 18 | 18 | 25* | bb pooled 600 runs/side: +5.0, inside ±6 (first 200-run read was +9; two confirm rounds pulled it in). vv −6 at band edge — watch. |
| post-S9d (signed rates) | 26 | 29 | 29 | vb +8 / vv +11 — OUTSIDE ±6 → rate retune per the "provisional pending battery" clause |
| post-S9d (retuned) + S11.2 escalation | 25 | 24 | 29 | vb +7 / vv +6 / bb +4 vs post-S9c. vb still a point over; see sign-off row 2. |

Act-1 HP loss runs 25–29 across all stages — ABOVE the 16–22 watch band,
as it already was post-S10a (23.6–25.8 documented). Pre-existing, not
introduced here; S9d.A1's "must not sag below 16" holds everywhere.
Hex share (vb): 40.9 → 44.8 (post-S9b, top edge — Pale Unmaking) →
38–40.6 (post-S9d; Knell's damage growth displaces Hex share). In band
throughout.

## S9b — landed in full

- **S9b.1** bugfixes, each with a pinning test: needlework+/spark+ stale
  texts; shop duplicate relic (exclusion set; rng consumption unchanged);
  reclaim list shows arrival cost via `reclaimEchoShape` — the same
  constructor the reducer builds the echo from (preview cannot drift).
- **S9b.2** upgrade-parity covenant gate: restatement check + number lint
  (prose numerals AND link-line text understood). Exemption list burned
  down to ONE entry: **thornward** — a 19th restatement upgrade the
  S9b.3 table missed (OQ#49, proposed row awaits ruling).
- **S9b.3** all 18 rows as signed, incl. Pummel 4×4=16 (S9b.0-2), Pale
  Unmaking cost 2→1 (S9b.0-3), and row 7 per **S9d.A1** (Quiet Mending
  exhausts; upgrade = 6 Block, link heal 3 + partner heals 2).
- **S9b.4** OQ#49–53 filed (D8→A banked, D5→A signal logged, D9/D10
  pending designer, Linked Shields + Immovable watch).

## S9c — landed as amended by S9d.A3

- Death-rite magnitude rows STRUCK (superseded by S9d growers). Birth
  rows landed: First-Breath heal 2 (oncePerCombat-fenced), Cradle-Warden
  +2.
- D9-C identity: rite cards wear a lavender funerary frame + fleuron;
  the Witness NAMES each rite card on first draw (8 authored lines,
  PROVISIONAL). S9c.3 rite_reclaim pool (4 doc-verbatim lines, once per
  combat). S9c.4 D10-B birth-pick line (doc-verbatim).
- Resonance rung i: the ignited slot renders explicit math (base ×1.5 →
  result); log + theater name the ignited card and streak length.
- Rung ii SHIPPED (S9c.0-3 recommended): the streak's LARGEST primary
  (amount × times) ignites; ties latest. Def resolver is a required
  param of computeResonanceSlots — resolution, previews, bots, client
  share one truth. bb drifted +9 on the first read; pooled 600v600 runs
  settled at +5.0 (inside band) — **rung ii stays**, the pre-ruled
  revert (its own commit) remains available.

## S9d — landed with a first-battery rate retune

Engine: growth DERIVED from `state.tallies` (hashed authoritative state,
created only on rites runs — unflagged shape and goldens hold). Axes
wired at 8 sites; Vigil per-seat (S9d.0-2); Echoes/Reclaims inherit via
statelessness (S9d.0-3). Auto-rendered grower text (a grown card can
never lie) + covenant CI (caps required, no Hex ops, render-parity sweep
over tally states). Tally chip + axis-at-the-death-pick presentation.

**Sign-off row 1 (S9d.0-1 — rates).** The signed table read vb +8 /
vv +11. Retuned in-commit: Knell per 2→**3**, Pyre-Brand per 4→**6**,
Mourner's per 10→**15** (Shroud/Vigil/Toll/Votive/Descant untouched).
Post-retune: +7/+6/+4. Overrule or amend freely — one data row each.

Direction gates all PASS: realized growth > 0 at every rite, every pair
(Shroud lowest at 0.3–1.1 — the falls axis is self-balancing by design);
death-pick distribution 10–36%, inside the 5–40 band. Votive's tier
shape (S9d.0-4 designer flag) realized 1.9–2.0 tiers/pick — it functions;
the shape question stands.

## S11 Wave A — S11.1–S11.4 landed; S11.5 blocked on sign-off; S11.6/7 pending

- **S11.1** composition CI landed **hard on every assertion** (no staged
  list): exact elites, ≥1 shop, ≥1 treasure, ≥2 distinct approach
  compositions per knot, ≥2 character-event opportunities per seat per
  act, high-stakes [1,3] armed when content exists. Generator repairs
  are all rng-FREE post-passes (consumption byte-identical): treasure
  guarantee fixed; approach-diversity repair ladder (pacing flips →
  event RELOCATION — character scenes always survive, clue slots
  sacrificed last); character-opportunity guarantee (ratio-aware retag
  preserving the S8.4 clue:normal contract; combats convert before
  pacing nodes; rare-then-clue steals only on dense maps). Standalone
  runner: `node scripts/map-composition.js`. **This materially helps
  D6/D7** (≥2 char-event nodes per seat per act now guaranteed at
  generation); the full re-battery vs the B6 ledger stays scheduled
  with Wave B as ruled.
- **S11.2** snarl escalation: +10/+30/+60% HP+DMG cumulative per knot
  cut this act (TB_ELITE_ESCALATION scales), knotsCut on MapState,
  rides ascension's scaling paths (A0 identity at factor 0).
  **Sign-off row 2 (S11.11-2 — ladder numbers).** The calibration gate
  (last-killed ≥ 2× first-killed pair-HP) reads **1.27 / 1.07 / 1.25**
  (vb/vv/bb) at ladder ×1 — UNMET. A ×2 probe battery ran (see
  wave-a-battery2 results in the session log). Two honest caveats:
  (a) bots don't yet price knot-taking (that's S11.9), so they walk
  into escalated elites at unchanged rates — the ratio may be
  bot-limited rather than ladder-limited; (b) at ×2 the DMG side
  reaches +120% on a third kill, which likely blows the A3 read.
  Recommendation: hold ladder ×1 for the merge, treat the calibration
  gate as OPEN until S11.9 lands routing that prices escalation, then
  calibrate ladder and policy together. Overrule if you want the
  steepening now.
- **S11.3** bound witness + tapestry dedup rung 0, one supply ledger:
  elites pay a guaranteed fragment (dedup-preferred, never the same
  fragment twice); serveFragments prefers fresh eliminations
  (second channel counts the first's). Telemetry: boundWitnessFragments,
  distinctEliminations + sim readout. The "~1 confident + 1 narrowed
  gamble" target band needs a provability calculation the harness
  doesn't have yet — distinctEliminations is the proxy instrument;
  named as an instrument gap.
- **S11.4** event grammar v2 in full (ruling 4): stages (max 3,
  covenant-held), visible pot, generated effect stubs (secrecy by
  omission — R6), generated delta line, requires over
  thread/gold/HP/tag-counts/character/**codexProven** (claims cross at
  START_RUN, S4 union). No shipped event uses stages or keys yet
  (CI-proven) — flag-off parity holds by construction.
- **S11.6 asymmetric scouting, S11.7 toll-door rest + Covet treasure:
  NOT YET IMPLEMENTED** — next session, alongside Wave B.

## S11.5 deep-event proposal table (enumerate→propose→SIGN-OFF)

Per ruling 5: 2 per act, first pass. All four are EXTENSIONS of existing
events (no new events needed yet). Stage trees stay within the 3-stage
covenant; every worst line is run-survivable by construction (loseHp
never kills — M2-A3 holds engine-wide).

| # | Event (act) | Stage tree | Stake ladder | Worst line | Codex key |
|---|---|---|---|---|---|
| 1 | The Ossuary Toll (A1) | pay → **count the alms** → (take back double / leave it) | 15g → −25g or +40g + relic-tier | −40g total, 0 HP — survivable (gold-only; "never gold" applies to enemy pricing, not wagers) | codexProven: the toll-keeper's answer opens "name the dead instead" (free pass + fragment) |
| 2 | The Wax Garden (A1) | tend → **wait out the bloom** → (harvest all / pinch one) | −3 HP → −8 HP total or uncommon+rare card | −8 HP, no card — survivable | tagCount ≥4 Hex opens "read the veins" (+1 confident fragment) |
| 3 | The Broken Carillon (A2) | cut → **climb into the frame** → (ring it once / wedge it silent) | −4 HP → −10 HP total or relic + 15g | −10 HP — survivable | codexProven: the bell answer opens "ring the TRUE peal" (relic + fragment, no HP) |
| 4 | The Drowned Hymnal (A2) | retrieve → **dive for the spine** → (wring it out / leave with pages) | −5 HP + pendingFray → relic-or-HP-chunk (−12 HP total) | −12 HP + Fray at next fight — survivable, scary | hpAtLeast 20 gates the dive (the desperate can't) |

High-stakes flags land on rows 3 and 4 (one per act, inside the [1,3]
CI bound). Authoring starts on your strike/amend of this table.

## Remaining (next session)

1. S11.6 scouting, S11.7 pacing-node variants (Wave A close-out).
2. Wave B in full: TB_KNOTWORK braid generator, strand data tables
   (S11.11-4 sign-off first), bot strand routing (S11.9), D6/D7
   re-battery vs the B6 ledger, golden lock both flag states.
3. S11.5 authoring once this table is ruled.
4. A2 battery legs (the S9d gate asks A0 + A2; only A0 ran — named).
5. Witness-string designer read (S9c gate 4 / S11.3 pool) before any
   public build.

## Open designer rows (quick strike list)

1. Thornward upgrade row (OQ#49).
2. S9d rates: retune stands / amend (sign-off row 1).
3. Escalation ladder: hold ×1 + calibrate with S11.9 (recommended) /
   steepen now (sign-off row 2).
4. S11.5 table above.
5. Votive tier shape (S9d.0-4) — stands unless re-shaped.
