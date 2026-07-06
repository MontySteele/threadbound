# S9a + S10a Status — Tonight's Stacked Build

2026-07-02, `main`. Stages per docs/archive/threadbound_tonight_s9a_s10a.md, each
tagged after its gates passed: comfort pass + bug fixes →
`test-candidate-1/2` interleaved, S9a → `test-candidate-2`, S10a →
`test-candidate-3`, battery + docs → `test-candidate-4`. Tomorrow's
friend sessions run the NEWEST PASSING TAG.

## What landed, per stage

- **Comfort pass:** applied minus the map.ts hunk — S7.5 had already
  landed TB_MAP_LAYERS / TB_MAP_EVENT_PCT in content/registry.ts, so the
  patch's map knobs were reconciled by omission per its own instruction.
  Per-encounter HP telemetry (battery gate 4 reads it), TB_SIM_CONC
  parallel sim, scripts/sim-shard.sh, TB_START_GOLD. Later addition:
  TB_RUN_TIMEOUT_MS (one bb shard run hit the 300s ceiling — checklist
  item 2 says raise before concluding).
- **Bug reports (3):**
  1. *Controller can't select 'Descend alone':* the two inline character
     selects pushed the button off the pad's vertical column and move()'s
     cross-axis penalty skipped past it. Button gets its own centered
     line; `<select>`s are now pad-operable (left/right or confirm cycles
     options) so pad players can change the pairing at all.
  2. *Solo: no death-rite screen:* not a code bug — the hosted deploy ran
     flag-off (rites default off; the engine skips the phase). render.yaml
     now sets TB_RITES=1 TB_TRACKS=1 — **the playtest config ships on the
     next deploy; remove both envVars to return to the flag-off baseline.**
  3. *HP bars snap at turn kick-over:* the ResolutionTheater animated
     numbers over bars already showing final state. Bars now render
     playback HP (live hp + un-narrated deltas from the log), falling
     per-beat; skip still snaps to live values. Client-only.
- **S9a:** profile `unlocks.{role}.{deathRites,birthRites}` seeded
  all-unlocked (S7 ruling); union rule extended to rites end-to-end
  (claim → server per-role union → engine offer/birth-trio/bot via
  `unlockedRites()`; absent/empty/sub-2-death pools fall back to the full
  set so a claim can never brick the mandatory offer). Codex screen
  promoted to real: grouped by question, truths vs eliminations
  distinguished, N-of-M counters, undiscovered as unlabeled slots;
  reachable from title AND the ♪ pause pop. S8.7 verify item: registers
  already key off PROFILE codex fill — nothing to fix.
- **S10a:** all 9 table enemies + the Mislaid spawn body, mechanics as
  specified, every mechanic stated in an always-visible `mechanicLine`.
  New machinery: death-crossing hooks (thread refund / split),
  `resonatedLastTurn` + `lastChainOwner` combat bookkeeping, debuff-echo
  path, `read_chain` intent (scaled everywhere intents scale; a true
  dilemma read against the chain that just resolved).
  computePlannedDamage mirrors the Cracked bonus, mote echo, and snuffer
  block — preview == reality is parity-tested. Pools: a2 easy 2→4, both
  normals +2, +1 elite/act, **plus a1 easy +1** (deviation — see below).
  Golden covenant fixture regenerated in the S10a commit (pool sizes
  shift flag-off encounter picks; S7.5 precedent).

## Battery matrix (TB_RITES=1 TB_BOT_SEEK_EVENTS=1; A0 pooled 200 runs/pair, A2/A4 50 — bb re-run pooled 200)

| Pair | A0 | A2 | A4 |
|---|---|---|---|
| vb | **29%** (200) | 14% (50) | 10% (50) |
| vv | **34%** (200) | 26% (50) | 14% (50) |
| bb | **39%** (199) | 12% (200) | 15% (200) |

| Gate | Verdict | Reading |
|---|---|---|
| 1. A0 25–35%, spread ≤15, act-1 HP band | **PARTIAL** | vb 29 / vv 34 PASS; bb 39 is +4 over (95% CI ±7 — overlaps the band edge). Spread 10 ≤ 15 PASS. Act-1 HP loss 23.6–25.8 — ABOVE the 16–22 watch band (was 22–24 pre-stack; S10a normals bite). |
| 2. Monotone per pair | **PASS (vb, vv) / FLAT (bb)** | vb 29>14>10, vv 34>26>14. bb's 50-run "inversion" (6→18) was noise: pooled 200-run re-run reads A2 12 / A4 15 — statistically flat, not inverted. Designer note: the A3/A4 rungs (extra elite, fray threshold) may not bite for the double-guard pair. |
| 3. Reclaim + rite bands | **PASS (with a caveat)** | Reclaim 595 attempts/50-run battery (S7's passing range), > 0. The "<25% of acquisitions" denominator isn't emitted by the harness — attempts vs thread-spend mix reads healthy (pulse 597 / reclaim 595). Death-rite picks all ≥10% in the pooled A0 rows; no >60%. |
| 4. New-encounter outliers | **FLAG, not blocked** | Pooled hp/combat: a2_silence_wretch **62.3** (n=22) — right at 2× the ~30 flagged-battery mean, the doc's predicted Choir Silence watch item; comparable to pre-existing hot normals (a2_wretch_eater 72, a2_bell_pair 54.6 in the comfort read). a1_warden_leech 39.6 runs warm for an act-1 normal. Neither is a wipe machine. Rest of the new roster: tithe_carried 11.1 / mote_pair 12.9 (gentle), cracked_eater 22.5, snuffer_throng 28.2, elite_sexton 30.1, elite_unstrung 24.4, cracked_mote_husk 44.9. |

## Re-centering decision: NOT taken (the one commit stays unspent)

The doc anticipated gate 1 failing HIGH globally ("the maps eased
things"). Instead the S10a roster already pulled the stacked build DOWN
into the band for 2 of 3 pairs. The sensitivity ladder (DMG ≈ 9 pts per
0.05 notch) offers no global move that brings bb (+4 over) inside
without pushing vb (29) below 25 — and act-1 HP loss already sits above
its watch band, arguing against any +DMG. Per-enemy tuning for global
drift is barred by the doc. Banked for the designer: bb runs ~5–10 pts
easier than vb/vv across all rungs (double-guard survivability, a
pre-existing S7.5 signature), which is a pair-asymmetry question, not a
global-scale one.

## Designer decision list

1. **Half-Carried → Twice-Carried rename:** the table's name is the
   Vigil-Keeper's SECRET S8.5 mechanic (`m_vg_half_carried`) — the
   bundle-secrecy test caught the leak (same class as the S8 Vigil/rite
   collision). Renamed; re-rule if you want a different word.
2. **a1 easy pool +1 deviation:** the Part-B summary line elided act-1
   easy growth, but the signed table places Tithe-Taker/Twice-Carried in
   that pool — they got one gentle debut entry (a1_tithe_carried). Strike
   it if the 3-entry a1 easy pool was intentional.
3. **bb over-band (39%) + flat A2/A4:** pair asymmetry, not global drift
   — options: bram-side tuning, rung redesign for guard pairs, or accept
   until tomorrow's human read.
4. **a2_silence_wretch at ~2× mean:** the predicted punisher watch item.
   If friends wipe to it, distinguish "hard fight" from systemic reads
   (same note as a2_bell_pair in the comfort-pass findings).
5. **Act-1 HP loss 23.6–25.8 vs the 16–22 band:** the two bands (win %
   vs HP loss) now conflict by ~2–4 HP at this meta — same shape as the
   S3.4 precedent; next human run rules.
6. **Gate 3's "acquisitions" denominator:** not emitted by the harness;
   add if the <25% band should be enforced numerically.

## Checklist coverage (comfort pass §4)

1. Gate-1 resolution: A0 rows pooled at 200 runs/pair ✔ (jitter across
   shards ran 8–14 pts — the fix was warranted).
2. Run timeouts: one bb A0 run timed out at 300s (49/50 kept);
   TB_RUN_TIMEOUT_MS added, re-runs at 600s had zero timeouts ✔.
3. Late-spec paths: rite-card shop removal now engine-tested
   (rites.test.ts); codex persistence across refresh covered by the
   S6.8 suite + the new S9a normalize tests ✔.
4. Jitter cleanup: still parked.
5. a2_bell_pair note carried into tomorrow's session notes, joined by
   a2_silence_wretch.

## Out of scope tonight (unchanged from the doc)

Unlock pacing numbers, rite gating beyond the read-path, codex
completion/meta-rewards, ascension fraying, archetype support cards,
boss faces beyond S8.5, Act 4, per-enemy balance beyond gate-4 flags.
