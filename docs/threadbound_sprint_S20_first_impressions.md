# Threadbound — Sprint S20: First Impressions ("the parts a stranger sees")

**Charter (designer, 2026-07-06):** every human who touches the game
this month goes through the title screen, the vestry, and the map —
and none of them reach A1. Make the first thirty minutes look like the
game the engine already is: a real title screen, a braid that reads as
a braid instead of boxes on black, rites that say what they do, the
Witness somewhere it can be heard, and a repo a successor can navigate.
Rulings taken this session: local flags pinned by default (D-a),
rite-growth retext shape (D-b), Witness side rail with scrollback
(D-c row b), UI before ascension (D-d) — the S21 ascension doc is
pre-authored for handoff regardless.

**Hard scope rules:** this is a CLIENT and REPO sprint plus ONE ruled
engine-instrument change (Part 1's default flip — no other engine
behavior changes); no balance number moves; map topology untouched
(map.ts is out of scope — presentation only). The one permitted
engine-adjacent change is rite description strings IF they live
engine-side (Part 5 instrument note). B6 holds: one art set, no
mixing — new art goes through the established pipeline
(scripts/art/prompts.json + post-process.sh) or it does not land.
Strings and art enumerate→propose→sign-off; deletions too (Part 6).

**Sequencing:** Part 1 (flags/scripts) first — it changes how every
subsequent local verification is run. Cleanup (Part 6) last, in its
own commits, after everything else has landed and its references are
final. Client-visual commits separate from strings commits separate
from cleanup commits.

---

## Part 0 — Evidence on record

- Local `npm run server` runs the flag-off baseline: lane map, no
  rites phase, no tracks. The hosted playtest build pins TB_RITES=1,
  TB_TRACKS=1, TB_KNOTWORK=1 (render.yaml). A friend-tester already
  hit the "no death-rite screen" confusion once (render.yaml comment);
  the designer hit the lane-map version today.
- OQ#59 ruled TB_KNOTWORK default-off; that ruling predates S15
  ("the braid is the shipped game") and S18/OQ#65 (lane topology now
  unbanded, bb-lane 27.5). The lane is the untested path.
- The braid renders (designer screenshot, s13 · dev+9af95bb): boxes on
  a black field, dashed straight edges, type-icon + word chips, the
  Witness line in a bar at the very bottom. Legible, joyless.
- Vestry cards show the growth AXIS only ("grows each time either of
  you falls"); engine rites.ts carries exact rules (Shroud
  falls/per 1/+2 block/cap 8; Vigil boundKills/per 1/+1 block/cap 9;
  threadSpent and resonances are TIERED).
- A sigil vocabulary exists (sigils.tsx; docs/reference/
  sigil_vocabulary_v2.html) — the map chips don't use it.
- docs/ holds ~50 files spanning M1→S19 with superseded plans, old
  one-off reports, and a stray patch file at top level. **Broken
  reference found:** S19-STATUS.md cites
  docs/threadbound_sprint_S19_descend_alone.md — never committed.

## Part 1 — S20.1 Flags: the canon environment flip (RULED, lands first)

**Ruled (designer, this session, supersedes OQ#59):** TB_RITES,
TB_TRACKS, TB_KNOTWORK become the GLOBAL DEFAULT (`envFlag` →
`!== '0'` for the three), `npm run server` needs no env prefix, and
**flag-off bot runs are SUNSET** — they serve no further purpose. The
`=0` escapes remain for archaeology only.

This is an instrument event, not a convenience: the canonical anchors
were banked rites-on + knotwork-on but **TRACKS-OFF** — flipping the
default changes the anchor environment (tracks adds gated events and
shrine nodes to the deal). Sequence, in order, each its own commit:

1. **Tracks-on sim audit** — verify the fleet handles the tracks
   surface deterministically (bot behavior at shrine/loom nodes and
   gated events; same-seed repeat + shard-invariance on a tracks-on
   n=100). If the fleet is NOT deterministic under tracks, STOP AND
   REPORT — the fallback row (F-fallback: rites+knotwork flip only,
   tracks stays server-default-on / sim-off) is pre-approved rather
   than landing a nondeterministic canon.
2. **Suite audit** — tests asserting flag-off behavior (lane maps,
   no-rites phases) pin their flags explicitly; the suite must be
   green under the new defaults for the right reasons.
3. **The flip** (`!== '0'`), render.yaml entries removed as
   redundant, README updated: `npm run server` is the game;
   `TB_KNOTWORK=0` etc. documented as archaeology.
4. **RE-BANK (S20-R1, LOUD):** the canonical anchor battery
   (seeds 20001–22000, n=2000 ×3) re-run under the new canon and
   re-banked as the successor anchor set; the parity script re-banked
   the same way. The S18 exit board was a tracks-off read — the
   re-bank IS the new board, expected to move (new event pool,
   shrine nodes); delta-form gates (HP tripwires, paired reads)
   survive by construction; the intent bands (gate 2 ±8, gate 4
   ≥1.2, co-op texture lead) are RE-READ on the new board in this
   commit and any excursion is a stop-and-report, not a silent
   re-derivation.
5. **Sunset note in OPEN-QUESTIONS:** OQ#59 closed by this ruling;
   OQ#65's lane question sharpens — the lane generator is now
   explicit-only dead config, and its DELETION becomes the natural
   next ruling (not taken here; engine deletion is not this sprint's
   scope beyond the flip itself).

## Part 2 — S20.2 The title screen

Current: tutorial popup + dead space. Target composition (single
screen, no scroll, mobile-width safe):

1. **Splash art** — one new piece through the pipeline: prompts.json
   entry + post-process.sh, same set as the existing art (B6). Subject
   proposal for the art row: the two figures and the soul-thread
   before the descent — the game's thesis in one image. The generated
   candidates go in the STATUS doc as an art sign-off row; the
   designer picks or rejects; no art lands unpicked.
2. **Title + epigraph** — "Threadbound", one line under it. The
   epigraph is a strings row (word-drawer; the Witness does NOT
   narrate the title screen — it hasn't met them yet, and the truth
   law extends to voice placement).
3. **Mode buttons** — Descend Together / Descend Alone, equal weight
   (solo is a supported mode as of S19, not a fallback).
4. **Tutorial → dismissible overlay** — opened from a "How to play"
   affordance, closeable (Esc / X / click-out), dismissal remembered
   client-side so it never auto-opens twice on one machine.
5. **Footer chrome** — version stamp (kept), TB_DRAIN banner support
   (kept), no other furniture.

## Part 3 — S20.3 The braid, drawn as a braid (client-only)

Direction for implementation, sign-off by screenshot (three widths:
desktop, ~1024, ~390):

1. **Strands as threads.** The two warp strands render as continuous
   curved SVG paths, not per-edge dashed lines — visually distinct
   (the established You/partner hues already in the map header are
   the natural keying). Edges BETWEEN strand positions remain lighter
   thread segments; dashing reserved for unreachable.
2. **Knots as crossings.** At knot columns the strands visibly cross
   — one passes OVER the other (the braid's whole topology thesis,
   currently invisible). The knot node sits on the crossing.
3. **Sigil medallions.** Node chips become circular medallions using
   the existing sigil vocabulary (sigils.tsx — combat, elite, rest,
   event, shop, treasure, covet, boss all have marks) with the word
   as a small caption. Event subtitle lines ("a door meant for you",
   "bears on …") stay — they're doing narrative work.
4. **State rendering.** Visited path: the thread behind you pulls
   taut and brightens (the run literally leaves a woven trail).
   Current position: the pair's marks on the node. Unreachable: dims,
   dashed. Legibility outranks decoration everywhere — the S15 knot
   lesson stands; if a treatment costs node-type recognition at a
   glance, the treatment loses.
5. **The field.** Not pure black: a barely-there loom texture or
   radial vignette behind the braid (CSS, no new art asset), so the
   map sits IN something. Restraint row: no animation beyond a subtle
   current-node pulse; nothing moves during choosing.

## Part 4 — S20.4 The Witness rail (D-c, ruled row b)

The Witness line leaves the bottom bar for a right-side rail,
present on map and combat screens: the current line emphasized, the
last ~5 lines above it in a quiet scrollback, hint-family lines
visually distinct (they are teaching, not color) and pinned slightly
longer. Requirement, not implementation: **no line is lost to a
screen transition** — anything said during reward/vestry/map hops is
still findable in the rail when the player looks up. Mobile: the rail
collapses to the latest line with tap-to-expand. (The S19 smoke-run
checklist item "nothing reads as noise" now has a place to be
verified against.)

## Part 5 — S20.5 Rite growth retext (D-b, ruled shape)

Every vestry card shows rule + progress + ceiling:

- per-N form: "▲ +2 Block each time either of you falls · +4 so far ·
  cap +8"
- tiered form (threadSpent, resonances): its own phrasing row per
  rite — tiers listed as a ladder, current tier marked.

The vestry card ALSO shows the current grown value on the card body
(a Shroud at +4 reads "Gain 8 Block", grown segment marked), and the
same treatment follows the card in-run. Exact strings per rite are
Part 7 sign-off rows. **Instrument note:** if any of these strings
live engine-side and appear in battery stdout, the parity bank is
re-banked in that commit with the diff shown strings-only — content
attribution stays loud (golden-regen discipline applies to banks).

## Part 6 — S20.6 The cleanup pass (lands last, own commits)

Rules ruled here: (1) **nothing is deleted without a signed inventory
row** — the full table is proposed in the STATUS doc and stalls;
(2) project record is ARCHIVED, not deleted — sprint docs, status
docs, and reports move to `docs/archive/` with a one-line index at
`docs/archive/README.md`; git history is not a substitute for
discoverability; (3) living docs stay top-level: OPEN-QUESTIONS,
REVIEW-SWEEP, the lore bible, the design doc, the word-drawer,
the current sprint + status pair, and the roadmap/handoff doc;
(4) dangling references are fixed, not silenced — **the missing S19
sprint doc is committed from the deliverable in this part**;
(5) scripts are removed only with a grep-proof of zero references
(candidates for the inventory: spotcheck-s1s2.js, the stray
docs/comfort-pass.patch whose content presumably landed long ago);
(6) the cleanup commits touch no code path — suite green before and
after is the mechanical proof.

## Part 7 — Strings & art sign-off (STALLS until signed)

Rows populated at implementation: title epigraph; tutorial overlay
copy (existing copy may carry over as-is — then the row says so);
rite growth strings (one row per rite, both forms); splash art
candidates (generated set attached, B6 statement included); any new
map caption strings. Witness lines: NONE this sprint — the rail moves
where lines live, not what is said.

## Part 8 — Exit gates

1. **Suite green** 429/429; **parity check byte-identical** (n=100,
   explicit flags) after Parts 1–4; if Part 5 re-banks, the re-bank
   commit shows a strings-only diff.
2. **No engine behavior diff:** the branch's engine changes are
   empty or strings-only (Part 5 case), proven by the parity story
   above. map.ts untouched entirely.
3. **Screenshot gate (designer):** title, vestry, braid map, combat
   with rail — three widths each, posted in the STATUS doc.
   PASS is the designer's eye; there is no battery for taste.
4. **Flag gate:** fresh clone + `npm run server` boots the braid
   with rites and tracks, no env prefix; `TB_KNOTWORK=0` archaeology
   path documented in README; S20-R1 re-bank committed with the
   band re-read on the record.
5. **Cleanup gate:** signed inventory executed exactly; top-level
   docs/ holds only living documents + archive/; the S19 sprint doc
   exists and S19-STATUS's reference resolves; suite green after.
6. **Designer smoke run** on the deployed build — the S19 checklist
   plus: the rail catches every line, the vestry numbers read at a
   glance, the braid reads as two strands crossing.

## Part 9 — Designer decisions (D-list)

| D | decision | options | recommendation |
|---|---|---|---|
| D0 | branch; Part 1 first, Part 6 last | as written | ratify |
| D1 | flags | RULED: global default flip + sunset; F-fallback pre-approved if tracks-sim nondeterministic | execute Part 1 sequence |
| D2 | title composition + splash art row | Part 2; art by candidate pick | ratify; art stalls at Part 7 |
| D3 | braid treatments | Part 3 items 1–5; legibility outranks all | ratify; screenshot gate decides |
| D4 | Witness rail | ruled (row b); mobile collapse as written | ratify |
| D5 | rite retext | ruled shape; tiered rows separate | ratify; strings at Part 7 |
| D6 | cleanup rules + inventory | Part 6 rules; inventory stalls in STATUS | ratify rules; sign inventory when tabled |

**Logged this session:** OQ#68 — knot contact floor (braid elites are
bypassable by design per the S11.8 comment; ruled WORKING AS DESIGNED
today; parked for the human read with the free telemetry instrument:
knot take-rate. The S11.11-1 'crossings stay scarce' pending row
adjudicates with it).

**After close:** the S21 ascension doc (pre-authored, travels with
the handoff package: LAWS.md + the two-human playtest protocol),
and the window closes with the game looking like itself.
