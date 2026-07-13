# Threadbound — Style Guide (S23, ruled 2026-07-10)

**What this is:** the codified visual language. B0 established "everything
visual reads from tokens"; design doc §10 set the direction ("readable over
illustrated; atmosphere through palette and motion"). This document is the
law between those two: what the tokens *mean*, which surfaces wear what, and
the rules a future visual change must not break. It was ruled in the S23
design-pass workshop (designer, 2026-07-10) from four screenshot directions;
the anchor is **Direction D: "the dark above, the table below."**

Sign-off instrument, unchanged: the **designer's eye on the 3-width
screenshot gate** (desktop / ~1024 / ~390 — S20 Part 8 convention). There is
no battery for taste. `/?style` is the cheapest veto point (repaired this
pass; it had crashed on S22.4's act-4 registrant).

Scope guard: palette tokens are not art (law 10); B6 untouched — the sigil
vocabulary, enemy art set, and art pipeline are outside this guide. The
engine is outside everything here.

---

## 1. The thesis — two worlds, one seam

The combat screen's information flows top to bottom; S23 makes the *light*
flow with it. The screen is composed as two worlds:

- **THE DARK (above the seam).** Where the enemies live. Cool, faintly
  bruised ground; enemies are silhouettes — translucent cool panels, pale
  names, their sigils lit rather than their frames. **The only heat above
  the seam is theirs: the intent line.** Nothing else up there is warm.
- **THE TABLE (below the seam).** Where the pair sits. Warm lamplit
  parchment; engraved panels with gold-leaf inner lines; the players'
  cards are plaques — artifacts on a table, top-lit, with zones.
- **THE SEAM (the Chain).** The literal center of the game (§10) is the
  boundary where the worlds meet: a lit warp thread runs the full track and
  the staged cards hang on it — warm plaques strung into the dark. The
  Thread between the portraits is the brightest continuous thing on screen.

The fiction is the composition: two binders at the bottom of somewhere
dark, weaving upward against what lives there. The braid map belongs to the
dark (the descent); the vestry, shops, rewards, and rests belong to the
table (places the pair stands together).

**Per-act ambience moves THE DARK, never the table.** Act tokens shift the
upper half's sky and glow (`body.act-N`); the lamplight below is constant —
until the act-4 dawn (S22.3), which inverts the whole gradient: the table's
light floods upward, light from below for the first time.

## 2. Tokens (theme.css) — what they mean

Ground and material, the dark:

| token | value | meaning |
|---|---|---|
| `--dark` | `#0d0c12` | the descent's ground; braid-field base |
| `--dark-panel` / `--dark-panel-2` | `#12111ad9` / `#16141f` | enemy silhouette fills (translucent — the dark shows through) |
| `--dark-line` | `#262433` | frames in the dark; never used below the seam |
| `--cool-text` / `--cool-dim` | `#b8b4c8` / `#767288` | lettering in the dark |

Ground and material, the table:

| token | value | meaning |
|---|---|---|
| `--ink` / `--ink-2` | `#171310` / `#1d1712` | table ground / sunken wells |
| `--panel` / `--panel-2` | `#241d15` / `#2b2318` | raised warm surfaces (always as a top-lit gradient, §4) |
| `--line` / `--line-soft` | `#4d4133` / `#372e22` | table frames / quiet dividers |
| `--gilt` / `--gilt-hi` | `#8a7248` / `#c9a86b` | gold leaf: cost gems, inner frame lines, the wordmark |
| `--edge-hi` | `#f0e0c010` | the top-light on every raised table surface |
| `--frame-gilt` | inset 2.5px `#8a724826` | the table's inner gilt hairline |
| `--shadow-panel` / `--shadow-deep` | see theme.css | lamplit drop / the dark's heavier drop |

Reserved hues — **the reservation laws:**

| token | value | law |
|---|---|---|
| `--p1` / `--p2` | `#7fd4ff` / `#ffb070` | **seat hues are reserved.** They appear only as ownership marks (selvage stripes, tethers, name tints, pick rings). No chrome, no semantic state may wear them. (The S14 B7 note — tier-2 sigil cyan — remains the one audited holdout.) |
| `--enemy-warm` | `#e89a58` | enemy intent/target heat. Deliberately **not** `--p2`. |
| `--ignite` | `#ff8248` | Resonance and Pulse-forced links own ember. Nothing else ignites. |
| `--thread` / `--thread-gold` | `#d4af6f` | the Thread, fired links, gold chrome accents, the Witness's Tapestry channel |
| `--warp` | `#7d7060` | **the braid rails' one undyed material** (S26/OQ#83), both strands — between `--line` and `--text-dim`, deliberately below `--thread` in saturation and lightness so live/lit/trail always pop above the rails. Map geometry only; hex gate-tunable (G1), the shape (one material, not two) is the ruling. |
| `--witness` | `#b9a8d4` | the Witness's voice and vestment frames only |
| `--pierce` | `#f0e6da` | bone-bright, outside every faction hue (S15.2A) |
| tag hues | strike/guard/hex/surge/rite | card tag identity; guard intentionally shares p1's cyan family (audited, accepted) |

## 3. Typography

Two faces, one discipline:

- **`--font-display`** — `'EB Garamond'` (vendored, OFL, latin subset,
  variable weight, ~44KB — `packages/client/src/fonts/`), falling back to
  Georgia. Wears: names (cards, enemies, characters), numerals that carry
  emotion (HP, costs), headers, the Witness, the wordmark, Ready.
- **`--font-ui`** — the system stack. Wears: rules text, chrome, buttons,
  meta. Unchanged from B0.

**The lettering discipline:** engraved labels are `font-variant: small-caps`
+ `letter-spacing: var(--label-track)`. One composition, many wearers
(`.ctag`, `.bound`, `.chain-label`, `.rail-speaker`, `.deck-section`,
`.tutorial-step`, …). Labels *identify*; they never shout — small, tracked,
dimmed.

**Scale carries importance** (biggest first, combat screen): the pair's HP
values (`.hp-big`, display face) → the wordmark/act header → card and enemy
names (~1.05–1.2em, display face) → rules text (1em ui) → labels (0.7–0.8em
small-caps). If everything is the same size, nothing is important — that was
finding #3 of the S23 critique; do not regress it.

Typography is chrome, not art: faces and scale changes ride visual commits,
not the art pipeline. (Ruled with the vendoring decision, 2026-07-10.)

## 4. Material grammar — the panel recipes

Every raised surface composes the same few moves. Recipes (authoritative
forms live in styles.css):

- **Table panel** (`.panel`, `.pstat`, vestry/loom/deck panels): warm
  gradient `linear-gradient(178deg, --panel-2, --panel 46%, #1e1811)` +
  `--frame-gilt` inner line + `--edge-hi` top-light + `--shadow-panel`.
- **Plaque** (`.card`): the same material, tighter — nameplate seam under
  the title row (dark rule + top-light), gilt cost gem
  (`radial-gradient` + `--gilt` ring), stitched link seam (dotted top
  border on `.clink`).
- **Dark panel** (`.enemy`, `.witness-rail`): cool translucent fill,
  `--dark-line` frame, `--shadow-deep`. **No gilt, no top-light** — gold
  leaf and lamplight are table things.
- **Engraved button** (all buttons): vertical warm gradient, `--edge-hi`
  top-light, sunken on `:active`, gilt border on hover.
- **The ember commit** (`button[data-gp-action='ready']`): the one button
  that glows — ember radial from below, gilt ring, warm text halo. There is
  exactly one of these per screen.

Elevation law: **sunken things are wells** (`--ink-2`, inset shadow: the
log, HP bar troughs, cost gem fields); **raised things are lit from above**
(`--edge-hi`). No flat fills on interactive surfaces.

## 5. Ownership grammar — the selvage

Ownership is woven in, not painted on. A surface owned by a seat wears the
seat hue as a **selvage stripe** — a 3px left edge (`--seat-hue` custom
property, set inline by the client) — plus at most a name tint. Full
hue-frames are retired (they made ownership shout over content).

The Binding inverts the direction: an enemy's tether is a 2px **bottom**
edge in the bound seat's hue (`--bound-hue`) with a soft downward glow —
the tether reaches down toward the pair. Boss frames thicken it to 3px.

Hooks (display-only, set in App.tsx / StyleScreen.tsx): `--seat-hue` on
`.pstat` and `.chaincard`; `--bound-hue` on `.enemy`. These custom
properties are the *only* sanctioned way seat color enters chrome.

**The reservation amendment (S26/OQ#83): seat hues key seat marks and
nothing else; map geometry never wears them.** The braid's warps and the
`.mapnode.strand-*` borders used to ride `--p1`/`--p2` — the header said
"You" in p1-blue while the map showed a blue thread and an orange thread
wandering separately, reading as "my path vs. theirs" in a game whose
thesis is that the pair walks together. Both re-keyed to `--warp`.

## 6. The seam — Chain spec

- The Chain panel is transparent; a **warp line** (`.chain::before`, 2px,
  thread-gold at ~40%, soft glow) runs the full visible track behind the
  cards. The sentence is strung on the Thread itself.
- Staged cards are plaques hung on the warp: table material, selvage
  stripe, `z-index` above the line. The inner `.card` inside a `.chaincard`
  goes frameless (the plaque is the frame) — except rares, vestments, and
  upgrades, whose signed treatments (S13.4, S9c.2) still read inside.
- Arc states (unchanged semantics, §14.12): dashed faint = dead; solid
  gold + glow = fires; ember + strand-walk = Pulse-forced (forced ≠ natural
  at a glance); ember + shimmer = Resonance. The resonating card lifts
  (ember halo). Kindled/pulse-target arcs breathe in `--kindled`.
- The Thread cord: 3px stroke, doubled glow — brightest continuous element
  on screen. State language unchanged (slack greys, severed bleeds,
  ignition flashes ember).

## 7. The braid — the station grammar

**(S26/OQ#82, ruled 2026-07-12 — third rewrite of this section in four
sprints; this one is load-bearing. S24's taut-diagonals text is
superseded wholesale, though its surviving laws are restated below.)**

**The station law: every drawn x-coordinate on a braid map belongs to
one of five stations, and every cord is one stroke from a four-entry
alphabet.** The braid map is a KNOTWORK SCHEMATIC, not a graph drawing —
the eye reads "tidy" when ink comes from a small repeating vocabulary
of strokes. Stop drawing a graph; draw a textile.

The five stations (x-offsets from center `xC`):

| station | x | who sits there |
|---|---|---|
| truth rail | `xC − RAIL` | truth primaries (lane 0/2) |
| truth inner | `xC − INNER` | truth widened slots (lane 1/3) |
| center | `xC` | knots (elite), the breath, the boss |
| power inner | `xC + INNER` | power widened slots |
| power rail | `xC + RAIL` | power primaries |

`RAIL = clamp(96, 0.9·ROW, 150)`, `INNER = 0.55·RAIL`,
`PAD = max(120, 0.9·RAIL + 40)`, `W = 2·(RAIL + PAD)`; `scale` keys off
ROW alone. All constants PROVISIONAL (G1) — gate-tunable, ratified by
the designer's eye at the screenshot gate. The 0.9·ROW target puts
rail→center knot chords near 45°; INNER keeps inner→knot chords
steeper (~60°).

The chord alphabet — every edge spans exactly one layer; its |dx| must
be one of:

| \|dx\| | stroke | which edges |
|---|---|---|
| `0` | rail continuation | within-strand primary→primary (incl. the knot-layer bypass) |
| `RAIL − INNER` | lens bow | primary↔widened-inner (the widened micro-choice: the rail runs STRAIGHT through the primary; one bow deviates inward and rejoins — two strokes, not a symmetric split) |
| `INNER` | inner chord | widened-inner↔knot, widened-inner→breath |
| `RAIL` | rail chord | primary↔knot (un-widened entry/release), primary→breath converge |

Plus the single vertical breath→boss cord. Nothing else may be drawn.
`s26-stations.test.ts` pins the alphabet (not the pixels) across 100
seeds × both acts × A3 on/off.

**The one-ink-pass law (S26/OQ#83): the rail IS the strand.** There is
exactly one ink pass — the edges — and hue/weight are properties of an
edge, never a second geometry layered on top (the warp overlay is
retired). Edge treatments:

- **within-strand** (rail continuation, lens bow): `--warp` material,
  2.0px @ 55% — these segments collectively ARE the continuous rail.
- **knot chord / breath converge**: `--warp`, 1.6px @ 45% — one step
  under the rail.
- **breath→boss**: the neutral base cord, unchanged.
- **trail / live / lit**: thread-gold family, exactly as before — the
  reservation holds (a strand keeps its color only where the run has
  been or can still go).

Both strands wear ONE undyed warp material (`--warp` — G2, RULED D2a).
Strand identity is carried by SIDE (fixed since S25) plus node
composition. Seat hues never key map geometry (see §5).

**The severance law (S26/OQ#84): ink on the field means your history or
your future.** Per edge, braid maps only:

- `trail` — walked, the taut gold line.
- live-renderable — both endpoints visited-or-reachable: normal
  material.
- `severed` — the source was stood at and departed, the edge untaken:
  a straight stub (`14·scale`px along the original chord bearing) with
  two fray ticks (~±25°), `--line-soft` @ 0.32. Cold history. It rhymes
  with the soul-thread's severed state but NEVER borrows `--danger` —
  the soul-thread's wound is a live dramatic register; map stubs are
  not.
- everything else (source never visited, target unreachable) —
  **renders nothing at all.**

This replaces both the dashed dead-cord treatment and the S24
hide-behind rule on braid maps. Constants PROVISIONAL (G3).

**The preview law (S26/OQ#85): hover and pad focus change the WEIGHT of
existing ink; they never add geometry.** The focused node's onward
cords take `.lit` (the old cord-hot treatment, applied to
already-rendered cords); everything else dims to 0.45 (PROVISIONAL,
G4). **Never dims:** `.cord-live` and `.cord-trail` — the thread-gold
reservation and the live-pick read outrank the preview. Severed stubs
dim with the field. One hop stays one hop (the full-trace deepener
stays parked, OQ#85 rider). Display-only, as before: pointer hit-test
on the field + a `.gp-focus` observer; picks and reachability
untouched.

**Surviving S24/S25 laws, restated:** no two cords may cross, ever
(planar BY GENERATION — s25-planar.test.ts; the station map is a
monotone remap of the S25 x-order, so the embedding is the same
embedding, narrower). Cords are taut diagonals, rim-tied, with the ink
halo on node lettering; every reachable route cord keeps full weight —
navigation outranks tidiness.

**The rail's gutter (S20.4 → S24):** on rail-mounting screens the stage
inset is SYMMETRIC, so map and combat sit on the true center under the
header; the rail lives in the right gutter it already owned. Past the
app's 1500px cap the gutter tapers away as the viewport's own margins
absorb the (viewport-cornered) rail. Below 1100px the rail overlays, as
shipped. MapView's `availW` mirrors the CSS numbers exactly.

## 8. Light discipline

Glow means importance, and the budget is small:

1. **Gold glow** — the Thread, fired links, rares, the Ready ember, victory.
2. **Ember glow** — ignition only: Resonance, forced links, detonation
   moments, the act-3 sky.
3. **Seat glow** — pick rings on the map, focus states, tether shadows.
4. **Lavender** — the Witness's seam on the rail, vestments.
5. **Cool violet haze** — the dark's ambient (enemy sigil drop-shadows).

If a new element wants a glow, it must name which of these it is. Two glows
of the same family adjacent to each other: dim one.

## 9. What stays true everywhere (the standing laws, restated)

- **Legibility outranks decoration** (S15 knot lesson; S20.3 item 4). If a
  treatment costs node-type recognition, intent readability, or rules-text
  contrast, the treatment loses.
- **Same words, same numbers.** S23 changed no strings and no layout logic
  — display hooks only (enumerated: `--seat-hue`, `--bound-hue`, `.hp-big`
  spans, the StyleScreen act fix). Any future visual pass holds this bar
  unless a strings row signs.
- **Reduced motion is honored** on every animation this guide adds or
  keeps; the map moves nothing while choosing except the current-node pulse.
- **The screenshot gate is the sign-off.** Three widths, four surfaces
  minimum (title, vestry, braid, combat-with-rail), posted in the STATUS
  doc; PASS is the designer's eye.
- **Seat hues stay reserved** (§2). The B7 sigil-cyan holdout is the only
  tolerated exception until its human-glance row adjudicates.

## 10. Out of scope for this guide

The sigil vocabulary v2 (its own reference doc + `/?style` rows), the art
pipeline and any raster art (B6), audio, the Overture's choreography
(S22-R1), engine anything. The deferred deepeners from the S23 workshop —
planning-phase targeting threads from staged cards to their targets, and
enemy/hand scale asymmetry — are logged as future rows, not rules.
