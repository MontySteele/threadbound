# S8 Status — Content Realignment

2026-07-01, branch `s8-content` (off `s7-rites` → `s6-review-fixes` →
main; merge in that order). Everything below is PROVISIONAL pending the
S8.8 gate-1 sign-off tables — enumerate→propose→sign-off discipline held:
this doc is the enumerate+propose; nothing is final until you sign.

## What landed, per part

- **S8.1 (rite redesign):** landed during S7 — the mid-sprint re-ruling
  arrived before any passive death-rite existed, so the card design went
  in directly. See docs/S7-RITES-STATUS.md.
- **S8.2 — the fourth question + pools:** `q_came` (paid / compelled /
  volunteered / fleeing), q_what 2→4 (+abandoned mid-rite, +consumed by a
  starving part), q_why 3→5 (+mercy, +unity), q_who held at 2 (bubble
  question; override open). VALID_COMBOS = 80 authored rows (product
  minus 7 excluded families, generated in code with per-family rationale
  so future passes strike families, not rows). Clue events 6→10 (The
  Toll-Gate, The Tallow Court, The Bearers' Steps, The Winding-Room).
  Fragments 28→78 — every slot covers every answer of its question,
  including new variants for the six original events' grown questions.
  Deducibility gate test: every answer ≥2 bearing fragments from ≥2
  events; every question reachable from ≥3 events; serveFragments
  property holds over all 80×10. q_came payoff PROVISIONAL: each player
  gains 1 Covet charge on a true naming (alternatives listed in the
  reducer comment — DESIGNER QUESTION). The all-true boon now requires
  all four questions.
- **S8.3 — character-event voice pass:** all 6 events fully authored
  (Hexweaver stations/wards diction vs Cinderfist forge/oath diction);
  structure/effects untouched. Witness lines follow the §4 pattern:
  total confidence on FORM, deflection where content was lost.
- **S8.4 — the wrong-way event:** `ww_wrong_way`, flagged-runs-only pool
  entry at half normal weight (weighted branch re-based 4:2:1; unflagged
  rng untouched — golden lock green), never repeats, no explanation
  either way, codex hook `codex_ww_wrong_way` reserved.
- **S8.5 — two new faces:** **The Vigil-Keeper** (a_abandoned; renamed
  from "The Vigil" post-audit — collided with the Vigil death-rite card)
  and **The Tithe** (a_starved), 3-mechanic pools each, existing intent
  kinds, telegraph+reveal lines; covenant test asserts all four q_what
  answers carry a face.
- **S8.6 — mutation renames:** 21 renames toward the birth column
  (+8 rite-card mutations already there = 29/117 ≈ 1 in 4), weighted to
  renewal effects; full old→new→rationale table in docs/content-audit.md.
- **S8.7 — the Witness pass:** never-lies audit over ~60 lines with all
  ghost-biography lines rewritten to repair-instinct canon (audit table
  in docs/content-audit.md); codex-keyed voice registers (0/30/70
  provisional; sardonic pools go quiet at 70) with the §5b sacrament
  fall-rebind quote gated at 70; new pools for death-rite pick and
  birth-rite arrival ({rite} substitution); `codexPct` plumbed
  client→server→engine (max of seats — **OQ#48**, designer question);
  zero extra rng unflagged (golden lock unchanged by the mechanism).

## The adversarial audit (and fixes)

A fresh-eyes audit against the lore bible ran over ALL new content and
found the S6 falsehood class had recurred at scale: five provable-
falsehood clusters in the fragment corpus (worst: co-served actor+partner
contradictions visible in a single run), five Witness-biography residues
the purge missed, one held-reveal breach (the birth-rite pool taught the
mirror structure ungated), a face/rite name collision, and five
anachronisms. **All fixed** on the ratified-law basis (never-lies is
absolute; the fix patterns match the ones you approved in the S6 pass):
fragments rewritten negative-only with co-tenable physical loci, the
a_paid eliminators re-keyed to descent-contract FORMS (safe under
hired×fleeing), residue purged (banned-marker test extended), the
procession line moved under the 70% register, face renamed, tone fixed.
Full before/after in the three "S8 audit fixes" commits.

## S8.8 gate readout

| Gate | Verdict | Reading |
|---|---|---|
| 1. Sign-off tables approved | **PENDING DESIGNER** | All tables enumerated (this doc + content-audit.md + the agents' commit messages). |
| 2. Deducibility | **PASS** | Test green: every answer ≥2 bearing fragments; every question coverable; property test over 80 truths × 10 events. |
| 3. Post-S8.1 battery | **PARTIAL** | Ran as the S7.8 battery (S8.1 landed in S7): rite distribution mostly inside 10–60 (3 FLAGs at 5–8% in vb), Reclaim > 0 (nudged); the ±8 win-rate band FAILS for vb/vv — the deferred re-centering commit is triggered, designer-gated. |
| 4. Full-content battery | **DATA BANKED** | TB_TRACKS+TB_RITES+seek-events 50×3: vb 44 / vv 38 / bb 44; act-1 HP 22.6–24.2. KEY FINDING: with both tracks live, birth-pick rate collapses to 0–6% of seats (10 clue events crowd 6 character events out of ~4.6 event visits/run). This is gate 4's arbitration data: L8/E32 reserve config, character-event weight above clue weight, or accept slower birth arrival — designer call. |
| 5. Flag-off parity | **PASS** | 30-run vb flags-off 23% vs S7 baseline 24%; golden covenant lock green throughout (regenerated only for authored witness-prose changes, hash-verified zero gameplay drift). |
| 6. Witness audit complete | **PASS (post-fix)** | Audit table complete; adversarial re-audit ran; residues fixed; canon test enforces banned markers. |
| 7. Fresh clone green | **PASS** | 214/214 from a fresh clone at branch tip. |

## Designer decision list (S8)

1. **Two-track event competition (gate 4):** birth picks 0–6% under
   combined flags. Options: L8/E32, raise character-event weight above
   clue weight, or accept. The playtest question ("is assembling the
   truth together fun?") argues against starving either track.
2. **Re-centering (gate 3, inherited from S7):** vb/vv flagged win rates
   still far above flag-off. TB_ENEMY_* notches vs rite-card costs.
3. **q_came payoff:** 1 Covet charge each (provisional) — alternatives in
   the reducer comment.
4. **hired×fleeing combo:** kept ("pay can be a door out") but its
   rationale strains against the hired×volunteered exclusion's logic.
   The fragment falsehoods it caused are fixed text-side; the structural
   question (exclude the family vs keep) remains yours.
5. **OQ#48:** codexPct = max of the two seats' codex fill — or min/avg?
6. **The Tithe's "everything it takes, it keeps"** vs the Witness's
   "hunger keeps nothing" law — defensible motive/mechanism split; rule
   once and we'll state the split in the truth.ts header.
7. **Machine-voice lines** ("I have carried kings down this stair"):
   Witness-as-repair-reflex vs the Machine's carrier office — rule once.
8. **a_unity codex diction** ("one deletion at a time") leans on §0's
   drawer phrasing in a client-bundled string — keep or soften?
9. Borderline interior-fact fragments (choir "gladly", crypt "asking the
   ringing to keep on") — kept, flagged as against the negative-only
   law's spirit though not provably false.
10. "First-Drawn" (4 names) is off the strict §7 list (drawer has
    "first-breath"); birth-column density 25% vs "used more sparingly".

## Out of scope / not done

Unlock economy, codex completion criteria, Act 4, the chant (§10.7),
character 3, the itch page; the re-centering balance commit (awaiting
direction); q_who's post-playtest fate.
