# S13.6 difficulty review — the designer-deferred re-read, on S13's batteries

Ruled sequencing honored: this re-read runs on the S13 card-economy
batteries (S13-ECONOMY-STATUS.md), not before. Same environment, same
instrument discipline: every comparison below is same-container,
100-run legs (4 × 25 shards, seeds 1000+), TB_RITES=1
TB_BOT_SEEK_EVENTS=1, A0, draft v2 default (the S13.6 flip, commit
`f9b1d59`) unless a row says v1.

Assessment only — **no knob was turned in this pass.** Every
recommendation below is a designer yes/no; levers stay untouched until
ruled.

---

## 0. The flip re-anchor (D7 second half — the loud, recorded row)

Draft v2 became the default in `f9b1d59` (BotPolicy, sim harness, AND
the server's in-process solo partner — the surface note honored: real
solo drafting changed, as a decision). TB_BOT_DRAFT_V2=0 is the v1
escape hatch, comparison-only. Sanity rows on the flipped build:

| Leg | win % | act-1 HP/combat | Reads against |
|---|---|---|---|
| default vb (flip build) | XX_FLIP_DEFAULT | XX | v2-vb 60 on the pre-flip build — must match within noise (identical resolved policy) |
| v1 vb (TB_BOT_DRAFT_V2=0) | XX_FLIP_V1 | XX | v1-base 50 pre-flip — the escape hatch is intact |

## 1. Win-rate band: the 25–35% A0 gate no longer describes the instrument

The S9a/S10a gate ("each pair inside 25–35% at A0") was authored
against draft-v1 bots — a coordination floor that undervalued rares,
never removed a card, and drafted itself into 41-card decks. That
instrument no longer exists as the default. Under v2:

| Pair | win % (S13 build) | vs the 25–35 band |
|---|---|---|
| vb | 60 | +25 over the ceiling |
| vv | 40 (n=99) | +5 over |
| bb | 37 | +2 over |

The sim's even older M2 header gate (win ≤ 40%) now reads FAIL on vb
by construction. **This is not evidence the game got easier for
humans** — the game's numbers did not move; the bots got smarter in
exactly the dimension the sprint built (draft quality). The bands were
calibrated to the old bot; the old bot is gone.

Also in-band context: pair spread is 23 points (60/40/37) vs the old
≤15 gate — but the vv/bb mirrors are texture probes, not tuning
targets (S5 gate-4 precedent), and vb leading is the co-op thesis
working.

## 2. HP watch band (act-1, 16–22 pair HP/combat): still hot, unchanged by S13

| Stage | act-1 pair HP/combat |
|---|---|
| S10a battery | 23.6–25.8 |
| Wave B stages | 25–29 |
| S13 v1 base | 28.0 |
| S13 v2 default | 28.4 (pooled 377 combats) |
| S13 mirrors | vv 26.9 / bb 26.0 |

4–7 points over the band, exactly the pre-existing S10a drift; S13
neither caused nor cured it (v1 28.0 vs v2 28.4 — noise). The floor
("must not sag below 16", S9d.A1) holds everywhere.

**The two bands now conflict in OPPOSITE directions** — win rate says
"too easy," HP loss says "too bloody." One global knob cannot satisfy
both: TB_ENEMY_DMG_SCALE is the sensitive lever (~9 win-points per
0.05 notch, comfort-pass ladder) and it moves both numbers the SAME
way (+DMG lowers win rate AND worsens HP loss). This is the S3.4
"bands conflict" precedent, now wider. The resolution is a band
decision, not a knob search.

## 3. The fight-price question: ANSWERED — fights pay now

The question on record: ~27 pair HP/fight (≈19% of the 146-HP vb
pool) — is the reward bundle worth it? Post-S13, per fight won the
bundle is ~10.3 gold + one card offer per seat (a post-knee pick now
buys ~3 win-points — gate 3's tail-slope) + relic odds on elites.

The OQ#59 outcome split (v2-vb, n=100) is decisive:

- **combats/run: wins 7.7–7.9 vs losses 5.3–5.9** — winners FIGHT MORE
- relics/run: wins 5.9–6.3 vs losses 3.0–3.9
- deck size: wins 32–34 vs losses 35 — smaller decks win (the
  dilution thesis, again)

Pre-S13 the hypothesis was that fights were a bad trade (the braid's
route-around-combat pairs lost nothing by skipping them). Under the
new economy, combat participation correlates with winning. The
fight's PRICE didn't change; its PAYOUT did. **Recommendation: close
the fight-price question — no repricing.**

Per-encounter attribution (unchanged shape, still healthy): the a2
boss remains the run-killer (60.5 pair HP/combat under v2, 74.9 under
v1), then a1 boss ~54, finale ~48–60, bellkeeper elite ~47. Normals
16–33. No new outlier flags.

Watch item kept open: the S11.2 elite escalation ladder reads
last/first 1.06–1.11 vs its "≥2 needs steepening" note — the ladder
still isn't biting (bots take ~1.5 elites/run so kill-3 rows barely
sample). Parked with OQ#55's joint-recalibration framing; braid
batteries are its real instrument.

## 4. S11.10 gate 2 re-anchor (the braid, TB_KNOTWORK=1)

The deferred gate: braid win rate within ±6 of the same-build
non-braid row, per pair. The pre-S13 read was vb −4 ✓ / vv +22 ✗ /
bb +22 ✗, with the designer hypothesis that the CARD ECONOMY was the
culprit — strand-runners fought ~1 less combat and paid nothing
because decks didn't matter. S13 made decks matter (tail-slope 3.0
points/pick). The re-anchor, all on the flipped build:

| Pair | non-braid | braid | Δ | ±6 verdict |
|---|---|---|---|---|
| vb | XX_NB_VB | XX_BR_VB | XX | XX |
| vv | 40 (n=99) | XX_BR_VV | XX | XX |
| bb | 37 | XX_BR_BB | XX | XX |

XX_GATE2_VERDICT

## 5. Recommendations (each a designer yes/no; nothing pre-empted)

1. **Re-author the bot win-rate band around the v2 instrument** —
   propose 45–60% at A0 for vb, mirrors reported not banded (S5
   gate-4 pattern). The alternative (re-centering difficulty until v2
   bots read 25–35) means tuning the game ~2 DMG notches harder to
   chase a bot upgrade the players never felt — rejected on the
   S3.6/S4.1 "bots are instruments, not players" principle. The next
   playtest re-reads human difficulty on the new content; human data
   rules, as ever (OQ#14).
2. **Keep the 16–22 act-1 HP band as a HUMAN watch band; stop reading
   it against bots.** It has been 4–7 over for four sprints across
   every policy/content stage — it is measuring the bots' guardless
   turns, not the encounter design. If the playtest ALSO reads bloody,
   the lever is a −0.05 DMG notch (own commit, own battery, S5.5
   precedent) — which would also lift bot win rates further above
   band 1, hence: band decision first, knob second.
3. **Close the fight-price question** (§3 — fights pay post-S13).
4. **S11.10 gate 2: XX_REC_GATE2**
5. The M2-era sim header gates (win ≤40% etc.) are historical print
   rows, not CI — leave them as archaeology or re-author alongside
   rec 1; they gate nothing today.

## Post-review pointers

- Next playtest carries: solo manual pass (S13 gate 5), witness read
  on the 26 PROVISIONAL naming lines (D5), human difficulty re-read
  (recs 1–2), rare-frame taste check (Gate B screenshot delivered).
- If rec 4 lands as PASS, the TB_KNOTWORK default-on question
  (S11.11-5, "not yet") becomes askable again — its own decision, its
  own re-anchor, same D7 pattern.
