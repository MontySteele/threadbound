# S7 Status — The Rites

2026-07-01, branch `s7-rites` (off `s6-review-fixes`, which carries the S6
review fixes and is itself unpushed/unmerged — merge order matters:
s6-review-fixes → main, then s7-rites → main). Mid-sprint the designer
issued the S8 doc whose S8.0/S8.1 rulings SUPERSEDE S7's passive
death-rites; the re-ruling arrived before any passive implementation
existed, so the S8.1 design (death rites are CARDS, birth rites are
retuned passives) landed directly — nothing was built twice.

## What landed, per section

- **S7.5 map widening (UNFLAGGED, own commit + battery):** acts 1–2
  LAYERS 6→7, event roll share 22%→32% (combat absorbs the delta;
  rest/treasure and the act-3 finale untouched). Env knobs
  `TB_MAP_LAYERS` / `TB_MAP_EVENT_PCT` (TB_ENEMY_* pattern). Golden
  covenant fixtures regenerated in the same commit, recording the drift
  explicitly. **New 50×3 baseline: vb 24% / vv 14% / bb 38%**, all sim
  gates pass. WATCH: vv dropped hard (14%) and its act-1 HP loss reads
  26.7 vs the 16–22 band — wider maps mean more combats for the mirror.
  Re-centering deferred per the doc.
- **S7.0/S7.1 + S8.1 model:** `TB_RITES` flag (tracks pattern, fully
  independent toggle). RiteDef: death → `riteOnly` CardDef (8 vestment
  cards, rare, excluded from every draft pool, each with an authored
  mutation AND upgrade — Reclaim-legal, shop-removable); birth → passives
  (6). New machinery: `Hook.oncePerCombat`, `'reclaim'` HookEvent,
  passives `reclaimUpgraded` / `cradleWarden` / `momentumCarry3` /
  `namingDay`. Rites ride the relic hook/passive plumbing, never dormant.
- **S7.2 death offer:** new `rites` phase after START_RUN — seeded 2-of-4
  per player, mandatory RITE_PICK vests the card; both vested → map.
  Client: the Vestry screen (cards rendered by the real Card component).
- **S7.3 character events:** 6 events (3/role, `ce_*`), placeholder prose
  with real costed choices (S8.3 owns voice). Pool-gated on character
  presence AND the rites flag, clue-event 2× queue weight, dedup across
  acts (never re-offered), actor = the matching seat (mirror pairs keep
  the subject roll — fixed after the gate battery caught p2 at 0 picks).
- **S7.4 birth pick:** 2nd character event owes the pick immediately at
  the event screen; ADVANCE gated for the owing seat only; passive
  granted on pick; timing telemetry (act/layer). Client: the trio panel,
  zero explanation copy (held reveal); progress pips beside seat names.
- **S7.6 Reclaim (OQ#38):** partner's EXHAUST joins their discard as a
  source; everything downstream source-blind. **CLARIFIED mid-sprint:
  Reclaim stays partner-only** — an own-discard reading of the doc was
  briefly implemented and dropped same-hour (designer correction).
  NOTE: the doc's "once-per-run-per-card chip rule" does not exist in
  code — only the PT2 once-per-TURN-per-card guard. Doc/code mismatch
  for the ledger.
- **S7.7:** host-only ascension (client picker + server enforcement:
  non-host rejected in-fiction, host's vote mirrored to both, clamps
  intact; bot joiner flow adjusted). `TB_BOT_SEEK_EVENTS=1` sim knob
  (prefer reachable event nodes; sim-only, default off, solo untouched).
- **S7.8 harness:** sim summary gains rites readouts (death-pick
  distribution with 10%/60% tuning flags — NOTE: shares of PICKS, not
  offers; offer telemetry would touch the pick path and can be added on
  request), birth pick rate + median timing, reclaim attempts. Unflagged
  summaries byte-identical to before. Gate-5 accommodation: a
  clearly-marked sim-only reclaim nudge, wired only when TB_RITES is set
  on the harness (unflagged batteries verified reclaim=0).

## S7.8 gate readout

| Gate | Verdict | Reading |
|---|---|---|
| 1. Rite tables approved | **PENDING DESIGNER** | Implemented as-proposed from the S8.1 tables; deviations listed below need explicit sign-off. |
| 2. Flag-off parity | **PASS** | 30-run vb flags-off: 27% vs baseline 24%, bands within noise; golden covenant lock green. |
| 3. Flagged battery ±8 pts | **FAIL (vb, vv) / PASS (bb)** | TB_RITES+seek-events 50-run: vb 58% (+34 vs 24%), vv 40% (+26 vs 14%), bb 40% (+2 vs 38%). The rites are a large power injection (free rare card + free passive + nudged reclaim card-advantage). This is the doc's anticipated trigger for the SEPARATE re-centering balance commit — deferred to designer direction; nothing tuned here. Act-1 HP loss 20.0–23.0 (inside watch band). |
| 4. Birth-rite timing | **PASS** | Median pick act 2, layers 2.5–4 (pre-boss) for event-seeking bots. Pick RATE is the watch item: 22–48% of seats/run pick at all (post-mirror-fix). If the playtest wants higher, L8/E32 stays the reserve config. |
| 5. Reclaim engagement > 0 | **PASS** | 600–750 attempts per 50-run flagged battery (nudged). |
| 6. No-Hex-growth | **PASS** | Covenant test green over rite card base/link/mutation/upgrade + birth hooks; manual review clean (Knell's Detonate is cash-out only). |
| 7. Fresh clone green | **PASS** | Local fresh clone: build + full suite green (187 tests). |

## Designer decision list (S7 additions)

1. **Gate-3 overshoot:** vb +34 / vv +26 pts. Re-centering options per the
   doc: TB_ENEMY_* scales notch(es) up for flagged play, or rite-card cost
   tuning. Needs your direction; the battery data is banked above.
2. **Death-pick distribution flags (vb):** dr_shroud 5%, dr_pyre_brand 7%,
   dr_descant 8% of picks — under the 10% floor. Bot pick policy is
   near-uniform over offers, so this reads as OFFER randomization variance
   plus role mix, not card weakness per se; interpret gently.
3. **Interpretation calls implemented, need ratification:**
   - `momentumCarry3` (Hearth-Keeper): no end-of-turn momentum decay
     exists in code — the Strike-spend halving IS the decay, so the
     passive keeps up to 3 through the halving instead.
   - `namingDay`: "+2 to mutated cards' effects" bumps damage/block/heal
     amounts only (Hex barred by covenant; draw/economy degenerate).
   - `reclaimUpgraded` (Quickening): the Echo arrives upgraded (mutation
     precedence unchanged — mutations still apply to the base form).
   - `cradleWarden`: +1 to the partner's linked numeric effects when the
     link fired off your card; Hex ops excluded.
4. **Once-per-run reclaim rule** in the doc doesn't exist in code (only
   once-per-turn). Author it, or amend the doc?
5. **Rite cards in the Wedding trade:** currently legal (only starters are
   barred) — "the vestment passes through the partner" fiction supports
   it, but it wasn't explicitly ruled.
6. Vestment card numbers, mutation/upgrade authoring, flavor lines: all
   provisional (gate 1).

## Out of scope / deferred

Unlock economy, Act 4, question-set changes, the re-centering balance
commit (gate-3 data banked, awaiting direction), S8's content parts.
