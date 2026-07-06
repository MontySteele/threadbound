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

## Part 2 — S18.2 the pairing packet (D2)

Probe protocol executed as enumerated (paired S16-R1, same seeds
20001–22000, braid A0; the S-2 dose rows both probed since D2-3 said
the probe decides). bb is invariant under every row by construction
(vess-only starter changes) — verified byte-identical on the S-1 leg,
0 discordant, and skipped thereafter.

| row (paired Δ, n=2000) | vv | vb | gate 2 (bb−vb, ±8) | vv act-1 deaths |
|---|---|---|---|---|
| anchor | 36.0 | 55.9 | +15.8 OUT | 38.0% |
| S-1 (tenth slot: mendthread → 2nd pinprick) | 46.4 (+10.3, 578↑/372↓) | 63.6 (+7.8, 547↑/392↓) | +8.0 (edge) | 31.4% |
| S-2a (patchwork 3 Block + 1 Hex) | 36.9 (+0.8) | 54.1 (−1.8) | +17.5 OUT | **40.8% — inverts the target** |
| S-2b (patchwork 4 Block + 1 Hex) | 42.4 (+6.3) | 58.7 (+2.8) | +13.0 OUT | 35.2% |
| **S-1 + S-2b (RATIFIED)** | **48.6** (+12.6) | **65.0** (+9.1) | **+6.7 IN** | **30.3%** |

**Probe findings, on the record:**

- **D2-3 was decided by the probe against the proposed primary dose.**
  3 Block + 1 Hex trades away exactly the floor the lever exists to
  raise: act-1 deaths *rose* on both vess-seated pairings (vv
  38.0→40.8, vb 3.2→4.6). The −1 Block costs more early survival than
  the +1 Hex buys setup. The 4 Block + 1 Hex dose row is the S-2 that
  works, and it reads the predicted shape (vv double +6.3, vb half
  +2.8).
- **S-1 is the big lever, not the garnish** — +10.3 on the mirror by
  itself, and it alone brings gate 2 to +8.0 (the letter of the band
  with zero margin). The doc's "lean S-2 primary" did not survive
  contact with the probe; the tenth-slot asymmetry was carrying more
  of the gap than the Guard shape.
- **S-3 not fired** — nothing read short.

**Ratification (designer, 2026-07-06): D2-2 = S-1 + S-2b lands.**
Gate 2 closes at **+6.7** with real margin; vv act-1 death rate
30.3% (the 1c floor-watch anchor — tripwire now 35.3%); the S-2
identity ("her defense turn IS her setup turn") ships at the dose
that actually raises the floor. The vb-side cost of the frame, on
the record per the M2-A5 note: vb rises to 65.0, so D3 starts from a
higher shelf — priced in, D3 is sequenced after D2 for exactly this.
D2-1 starter reshape ✓, D2-4 (c) vv identity-hard ✓ (gate 2 binds
bb−vb only, Part 1c watch armed), D2-5 P1 subsumed ✓.

### Part 7 strings — the D2 rows (RATIFIED with the D2 row, designer 2026-07-06)

| # | string | text | status |
|---|---|---|---|
| St-1 | patchwork base | "Gain 4 Block. Apply 1 Hex." | RATIFIED (the D2-3 dose row) |
| St-2 | patchwork upgrade | "Gain 5 Block. Apply 1 Hex. Link (Surge): gain 2 more." | RATIFIED — the rider survives the upgrade (upgrading must not strip the setup identity) |
| St-3 | patchwork mutation | Riveted Patchwork UNCHANGED ("Gain 3 Block. Gain 1 Momentum.") | checked — the cross-thread form is bram-flavored by design; momentum mirrors the hex rider at equal weight |
| St-4 | S-1 | no strings (card list edit only; mendthread stays draftable) | — |

Witness copy: no line references either card (checked engine witness
tables + client); nothing owed. Targeting note on the record: the
rider is untargeted — the engine lands it on the first targetable
enemy (`retarget`, combat.ts); Pinprick remains the aimed Hex. A
Guard gains no aiming step.

**Golden regen, loud:** the starter reshape moves every shuffle, so
the random-walk covenant goldens moved — regenerated IN the balance
commit per the fixture's own law (S16.3.5 precedent); the S18
charter's "own commits" is satisfied by this commit carrying ONLY
the ruled levers + their regen. Suite 429/429 green after regen.
