# Threadbound — Sprint S13: The Card Economy ("card rewards must matter")

Purpose: implement the designer-ruled response to OQ#59. Supersedes
docs/S12-CARD-ECONOMY-BRIEF.md. **Numbering note (D1, needs
ratification):** the art overhaul (PR #9, branch
`claude/art-overhaul-sprint-t1cvgx`) landed under the S12 label in
commit messages with no sprint doc; commits are immutable, so this
sprint takes S13 and the brief is renamed on merge. If the designer
prefers to reclaim S12, strike this note and rename the doc.

Branch: `s13-card-economy`, from current main (post-PR #10). Hard scope
rule: sim instruments, bot draft policy, the rare identity pass, ONE
dilution lever, and the rare legibility rider ONLY. No relic-supply
damping (symptom, deferred). No gold levers (covenant: gold is a human
agency knob). No Hex-amount growth anywhere (covenant). No map/braid
changes; TB_KNOTWORK stays default-OFF. No Act 4. Balance commits
separate from content commits; content via enumerate→propose→sign-off;
golden regens only when forced, loudly.

Designer rulings already on record (2026-07-04): the braid's
fights-vs-events-vs-treasure mix STANDS as design; the card-reward
economy is the sprint; **difficulty re-evaluation is DEFERRED until
this sprint's batteries land** — once card rewards matter, re-read the
HP bands, the braid's S11.10 gate 2 re-anchor, and the fight-price
question with fresh data.

---

## Part 0 — Evidence (2026-07-04 decomposition session, in-env)

All rows: default (flag-off) topology, TB_RITES=1 TB_BOT_SEEK_EVENTS=1,
A0, 100-run shards, one seed set, judged as SAME-ENVIRONMENT deltas.
This container reads base vb at 48 vs the prior environment's 37 —
the known cross-environment drift; absolute levels are not comparable
across sessions, deltas within this session are the datum.

### The decomposition matrix

| Probe | vb win | bb win | act-1 HP/combat (vb) |
|---|---|---|---|
| base | 48 | 48 | 28.0 |
| skip ALL card picks | **8** | **4** | 36.1 |
| no relics | 34 | — | 28.2 |
| all starters upgraded | 62 | — | 19.4 |
| +25% enemy scales, base | 2 | — | 48.6 |

### The deck-size sweep (vb; ceiling = 10 starters + N net adds/seat)

| Net adds/seat | 0 | 2 | 4 | 8 | 12 | uncapped (~12–15) |
|---|---|---|---|---|---|---|
| win % | 8 | 23 | 27 | 39 | 43 | 48 |
| act-1 HP/combat | 36.1 | 31.5 | 29.0 | 28.1 | 29.3 | 28.0 |
| act-2 link-fire | — | 48.5 | 52.4 | 55.6 | 56.2 | — |

### The verdict (supersedes the brief's "not load-bearing")

The card stream is the single MOST load-bearing progression system
(−40 win points when removed; relics −14) — and it SATURATES:

- The per-fight economy is finished by ~+4 picks/seat (HP/combat never
  improves past 29). Win rate keeps climbing through act-2 channels
  (link-fire, consistency) at a decaying marginal value: ~7.5 win
  points/pick for the first two, ~1 point/pick past eight.
- At ~9 fights/run, 60–70% of card rewards land in the ~1-point tail.
- The flip: a late pick is worth ~1 point; the fight that pays it
  charges ~27 pair HP, which is worth more. Fight-avoidance is the
  rational policy PAST THE KNEE — the braid didn't create it, it
  exposed it. The braid's "flat HP/combat" read was an act-1-heavy
  instrument comparing two already-saturated decks.
- Dilution is the disease: dilution-FREE quality (upgrading a handful
  of starters) is worth +14 win / −8.6 HP per fight. The bots agree —
  94% of their gold spend is removals.
- The rare slot's working members (`unbroken_line`, `wildfire_heart`)
  are POWERS: value independent of deck size. That is the template.

Caveats on record: (a) bot draft policy weights rarity at +1 — every
number above UNDERSTATES rare value; S13.1b is therefore a
prerequisite for gating S13.2. (b) OQ#14 precedent — bot evidence
understates human card value generally; magnitudes re-read at the next
playtest. (c) Provenance: probe code was reviewed and rebuilt from
source before the sweep; three unattributed early cap-probe logs were
excluded and the sweep re-run clean.

---

## Part 1 — S13.1 Instruments (land first; gate every later part)

**S13.1a — probe flags become permanent sim knobs** (sim-only; no
production surface reads them; documented in sim.js header):
- `TB_BOT_SKIP_PICKS=1` — forgo all reward picks, covets, shop card
  buys.
- `TB_NO_RELICS=1` — grantRelic no-ops; shops stock no relics.
- `TB_UPGRADE_ALL=1` — start with every upgradeable starter upgraded.
- `TB_BOT_PICK_CAP=N` — deck-SIZE ceiling: draft normally until
  deck.length ≥ 10 + N, then skip (removals free slots back up —
  intentionally the dilution variable, not a pick counter). Shop card
  buys share the gate. Constant is the true starter size (10), with a
  pinning test so a starter-deck change can't silently skew the sweep.

**S13.1b — bot draft policy v2** (`TB_BOT_DRAFT_V2=1`, default OFF
this sprint so historical batteries stay comparable; **D7 RULED:
flagged this sprint, default-on in one loud, recorded re-anchor after
its first clean battery** — S11.5 re-baseline precedent). Surface note
on record: BotPolicy is shared with the server's in-process solo
partner, so the default flip changes how the bot seat drafts for real
solo players — the flag protects the public build until v2 has a clean
battery behind it, and the flip is a decision, not a side effect. One
policy only; no v1/v2 fork is carried. draftScore learns (i) powers/engines: +4; (ii) rare: +1 → +3;
(iii) a simple dilution term: score − max(0, deckSize − 16) × 0.4, so
the bot's take-rate falls as the deck grows (matches the observed
human/StS meta and the sweep's knee). v1-vs-v2 base-config delta is
REPORTED in the status doc, not banded — v2 changing outcomes where
rares matter is the point.

**S13.1c — economy telemetry** in the sim summary: per-act pick
take-rate and skip-rate per seat; per-act (not end-of-run) relic and
deck growth, closing the run-length confound the brief flagged.

## Part 2 — S13.2 Rare identity pass (content; enumerate→propose→sign-off)

Design law for this pass: **a rare must be dilution-resistant** — a
power, a build-around, or a card that scales with chain/pair/run state
rather than with its own draw frequency. Engine caps REQUIRED on
anything that scales (Worn Knife/Saturate precedent); the covenant CI
extends to every row here. No Hex-amount growth in any design.

Enumerated verdicts on the existing six (proposals; numbers at
sign-off):

| Card | Verdict | Direction |
|---|---|---|
| unbroken_line (V) | KEEP | on-template (Thread engine) |
| wildfire_heart (B) | KEEP | on-template (Momentum enabler) |
| final_word (V) | KEEP | build-around payoff; watch caps |
| avalanche (B) | KEEP-AS-SPIKE | the honest big body; its linked face (8×5) is the pair-texture spike — one such rare is fine |
| gravebloom (V) | REVISE | hex BODY → hex ENGINE (e.g., power: capped per-turn hex echo on partner link-fire) — cross-seat, capped, covenant-clean |
| call_and_answer (B) | REVISE | smooth utility → cross-seat engine (e.g., power: when partner's card fires a link, gain capped Kindled/draw) |

New rares, +2 per character (briefs; full designs at sign-off), each a
co-op texture engine per the design thesis (vb pairs must lead on
texture, not just parity): a chain-position payoff (V), a Resonance
amplifier (B), a Reclaim-keyed engine (V — pull-based only, per
covenant), a Thread-spend payoff (B). All four are powers or
exhaust-to-permanent effects.

Rarity odds (60/30/10) are NOT touched this sprint — the sweep says the
tail's ceiling is the problem, not rare frequency; odds are a
post-battery lever if the tail-slope gate misses.

## Part 3 — S13.3 The dilution lever (one only)

**Pick-with-removal:** on reward screens, taking a card also offers an
optional removal of one STARTER from the taker's deck (same screen,
free, once per screen; starters only, so it cannot strip-mine the
picked engines; no gold interaction). Designer options (D4):
- **A (recommended): act-2+ screens only** — act 1 keeps its steep,
  simple picks; the lever arrives exactly where the tail begins.
- B: every screen.
- C: rare picks only (couples the two systems; weakest coverage).

This makes every late pick dilution-neutral BY CONSTRUCTION — the
direct answer to the sweep — without touching the removal service's
gold economics (covenant intact; the shop service stays the paid,
escalating, any-card version).

## Part 4 — S13.4 Rare legibility rider (client + Witness)

Playtest feedback on record: card borders alone don't distinguish
rarity. Sequenced mechanics-first (legibility before numbers applies to
the WHOLE pass: a rare must BE distinct before any frame can make it
FEEL distinct):
- Rare frame treatment using the S9c funerary-frame precedent (rite
  cards' lavender frame + fleuron): a distinct rare treatment — visual
  direction to designer taste, one sign-off screenshot gate (Gate B
  snapshot precedent from the art sprint).
- The Witness NAMES a rare on first pick (first-draw naming machinery
  from S9c D9-C; one authored line per rare, PROVISIONAL until the
  witness read). Witness never lies: lines mark the card's weight
  without promising outcomes.

## Part 5 — S13.5 Batteries & gates

Battery discipline: re-anchor ALL base rows same-environment at battery
time (resolves cross-env drift operationally; no comparisons to this
doc's absolute numbers). Pairs vb/vv/bb, A0, default topology; braid
re-read deferred to the difficulty re-evaluation.

1. **CI (structure):** covenant gate extended — every S13.2 card
   carries caps where it scales; render-parity sweep covers revised
   texts; pick-with-removal has pinning tests (starter-only, once per
   screen, act gating per D4).
2. **Load-bearing check:** skip-probe delta vs base must hold or widen
   (cards must not get LESS necessary).
3. **Tail-slope gate (D6 RULED: ≥ 2 points/pick):** re-run the
   deck-size sweep with draft v2; marginal win value on the
   8→12→uncapped legs must read ≥ 2 points/pick (vs ~1 today). This is
   THE gate the sprint exists for. **Same-instrument anchor REQUIRED:**
   before S13.2 content lands, bank one v2 sweep on pre-S13.2 content —
   the gate reads v2-vs-v2, never v2-vs-v1, so the content's effect is
   never confounded with the policy's. Statistical floor: 2 points/pick
   is ≥8 points over a four-pick leg, outside 100-run shard noise;
   smaller thresholds gate inside the error bars. Reserve lever if the
   gate misses: rarity odds (60/30/10, deliberately untouched this
   sprint).
4. **Texture gate:** vb retains its co-op texture lead (resonances,
   link-fire, Thread engagement) vs mirrors — the new rares must feed
   the thesis, not erode it.
5. **Solo manual pass** rides the next playtest, as ever.

Post-sprint (designer-ruled sequencing): the difficulty re-evaluation —
HP bands (act-1 loss has sat above the 16–22 watch band since S10a),
the fight-price question (~27 pair HP/fight vs its reward bundle), and
the braid's S11.10 gate 2 re-anchor — runs on S13's batteries, not
before.

## Designer decisions — ALL RULED (2026-07-04)

- **D1 RULED:** S13 numbering ratified; the brief renames on merge.
- **D2 RULED:** six-rare verdict table signed off as proposed (Part 2).
- **D3 RULED:** all four new-rare briefs approved; full designs return
  as sign-off rows at implementation.
- **D4 RULED: option A** — pick-with-removal on act-2+ screens only.
- **D5 RULED:** Witness rare-pick lines authored at implementation,
  PROVISIONAL tags per precedent, witness read closes them.
- **D6 RULED: ≥2 points/pick** on the post-knee sweep legs, v2-vs-v2
  anchored (gate 3).
- **D7 RULED:** draft v2 flagged this sprint; default-on in one loud
  re-anchor after its first clean battery. Solo-partner surface note
  on record (S13.1b); no dual-policy fork.

This document is implementation-ready. Hand to Claude Code as the S13
packet; branch `s13-card-economy` from current main.
