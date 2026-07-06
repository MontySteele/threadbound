# S18 status — Tying Off (implementation record)

Sprint doc: `docs/threadbound_sprint_S18_tying_off.md` (the charter and
the D-list live there; this file is the execution record). Designer
kickoff 2026-07-06: the D-list recommendations ratified as proposed —
"if there are no open questions, let's get to it." Probe-dependent
ratifications (D2 row choice, D3 dose/band) recorded below at their
sign-off points, per house law.

Instrument note, first thing, on the record: this session runs in a
fresh container. The canonical battery reproduced the S17 §12 exit
board **exactly** on the same build+seeds (see Part 1) — the
socket-free path is deterministic across environments, which is the
6d verification's load-bearing read.

## Part 1 — S18.1 gate-band re-derivation (D1, ruled as proposed)

**S18-P2000, the named anchor battery** (1a): seeds 20001–22000,
n=2000 per pairing, braid (TB_KNOTWORK=1), A0, base economy, draft v2,
socket-free, TB_SIM_SHARDS=4. Banked on the tip build (post-S17.4
merge, `627366d`) in this container, 2026-07-06:

| row | win % | died a1 | died a2 | died a3 (of arrivals) | act-1 pair HP/combat | overall link-fire | thread/combat | knot-2/knot-1 |
|---|---|---|---|---|---|---|---|---|
| vv | **36.0** (721/2000) | 38.0% | 25.4% | 12 (1.6% of 733) | 35.1 | 47.8% | 3.01 | 1.24 |
| vb | **55.9** (1118/2000) | 3.2% | 40.0% | 19 (1.7% of 1137) | 27.6 | 55.8% | 4.47 | 1.25 |
| bb | **71.7** (1433/2000) | 0.3% | 27.4% | 12 (0.8% of 1445) | 26.7 | 51.9% | 4.03 | 1.25 |

The board reproduces S17 §12 pass B **exactly** — same wins-counts to
the run (see the 6d evidence line, Part 6). Act-3 lethality pooled:
43/3315 arrivals = 1.3% (the S17.0 read was 0.7%; the texture problem
stands unchanged in shape).

The ruled bands (1a–1e, D1 ratified as proposed):

- **1a** — S18-P2000 above is the canonical anchor set for absolute
  reads (successor to S16-P100); the paired S16-R1 form (same seeds on
  build A/B, per-seed outcomes differenced, discordants reported)
  unchanged for deltas.
- **1b** — **gate 2: bb−vb within ±8**, read at n=2000 same-seed.
  Current: **+15.8, OUT** — the D2 packet is pointed at exactly this.
- **1c** — trio spread ≤15 **RETIRED** (D2-4 ratified the (c) half —
  vv accepted as identity-hard). Replaced by the **vv floor watch**:
  vv act-1 death rate reported every battery, tripwire at +5 pts over
  its post-D2 anchor (banked in Part 2 when the D2 row lands; the
  pre-D2 read is 38.0%).
- **1d** — HP tripwires: S14-R2 paired form unchanged (+4 pooled
  regression vs banked anchor, per pair per topology; floor ≥16).
  Anchor act-1 reads banked above; floor check 26.7 ≥ 16 PASS.
- **1e** — co-op texture gate unchanged, currently **PASS**: vb leads
  link-fire (55.8 vs vv 47.8 / bb 51.9) and thread/combat (4.47 vs
  vv 3.01 / bb 4.03) on the braid.

Instrument facts re-verified on tip, on the record: the ALL_KNOTS
probe leg ≡ the braid rows at A0, identically (n=100 vb, byte-diff
modulo the knob header) — so the braid rows' knot-2/knot-1 column IS
the gate-4 probe-leg read. No behavior change in this commit.
