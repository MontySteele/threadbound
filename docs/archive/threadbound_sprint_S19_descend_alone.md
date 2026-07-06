# Threadbound — Sprint S19: Descend Alone

> **RECONSTRUCTION (S20 Part 6, 2026-07-06).** The original S19 sprint
> doc was delivered for the session but never committed —
> `docs/archive/S19-STATUS.md` cited it and the reference dangled (found in the
> S20 evidence pass, Part 0). This file is reconstructed FROM the
> status doc's execution record so the reference resolves and the
> project record reads whole. Charter language and D-table below are
> recovered from the rulings, probe protocols, and dispositions that
> S19-STATUS quotes; where the status record is silent, this document
> says so rather than inventing. The execution record itself
> (`docs/archive/S19-STATUS.md`) remains the authority.

**Charter (recovered):** solo is a supported mode, not a fallback —
but the pre-S19 solo partner never touched the game's flagship
cross-deck verb (Reclaim: 0.00/run on every pre-sprint leg, by
construction), planned its chain blind to the human's open hand, and
the Witness ran out of things to say in act 1 (`resonance_together`
exhausted in 100/100 runs at median turn 11.5). Make the Witness a
partner someone would descend with: it Reclaims when it can say why,
it reads the human's open hand, it protects a dying human's tempo, and
it keeps talking past the first act — with every behavior change
invisible to the pair fleet, byte-for-byte.

**Hard scope rules (recovered):** every policy branch behind
`mode === 'solo'` (bot-policy) or `state.botSeat` (elsewhere); the
co-op fleet byte-identical per commit (the S19 parity instrument, D0);
no balance number moves; strings land PROVISIONAL and stall at Part 7;
solo battery rows REPORTED, never banded (S14-R5 / S16 jitter law).

## The parts, as executed

1. **S19.1 (D0) — the parity instrument lands first**: pre-sprint
   S18-P2000 re-banked in-branch; `scripts/s19-parity-check.sh` (n=100
   vb + TBITEMS byte-diff) run after every commit; the `--solo`
   battery mode (headless human seat over the real WS transport
   against the production SoloBotDriver) with per-seat verb counts and
   the per-pool Witness line-budget report.
2. **S19.2 (D1, row R-a) — the solo Reclaim**: articulable pulls only
   (exact-tag held-link fires, or hex/detonate-axis feed into a pile
   ≥ 3), once per combat, courtesy floor 5 strict, top-of-turn,
   announced via `i_reclaimed_yours`.
3. **S19.3 (D2, +1.2) — tail-planning**: solo-only scoring term for a
   tail placement whose tag the human's open hand can link off.
4. **S19.4 (D3, row T-a) — protective targeting**: when the human
   reads lethal-adjacent, the bot's fallback target preference flips
   to enemies bound to the human. T-b (sever-side protection) stalled
   for a ruling, with the note that the spread-sever can rarely hand
   an enemy to a lethal-adjacent human.
5. **S19.5 (D4, cut-line) — resonance-streak staging term (+0.5)**:
   landed; the pre-approved cut was not needed.
6. **S19.6 (D5/D6) — Witness machinery**: five announce triggers wired
   silent (empty pools no-op until strings sign); pool growth targets
   12/12/12 for the three chatter pools; the client hint family
   (`WitnessHints`) once-per-run, act-1-only, solo-only, toggleable.
7. **Part 7 — strings**: 66 lines + the toggle label proposed
   (St-1..St-67), truth-law audited, PROVISIONAL pending ratification.
8. **Part 8 — exit gates**: fleet parity byte-identical (hard gate),
   suite 429/429, solo battery re-read (reclaims 4.9–5.8/run from
   zero), pool-exhaustion partial with a stop-and-report on
   `resonance_together` under bot resonance rates, designer smoke run
   riding the next session.

## D-list (recovered dispositions — the original recommendation column
is not recoverable and is not invented)

| D | subject | ruling as executed |
|---|---|---|
| D0 | parity instrument first | ratified; every commit byte-diffed |
| D1 | solo Reclaim | row R-a (articulable pulls only) |
| D2 | tail-planning weight | +1.2 |
| D3 | protective targeting | row T-a; T-b stalls with a note |
| D4 | resonance-streak term | land-if-time; LANDED |
| D5 | Witness pool counts | 12/12/12 ratified |
| D6 | hint family | ratified as tabled |

Evidence, batteries, string tables, and gate readings:
`docs/archive/S19-STATUS.md`.
