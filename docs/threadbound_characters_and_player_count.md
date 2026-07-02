# Threadbound — Characters & Player Count: Design-Space Map

Status: **design doc, not build work.** Nothing in here is implementable
until Playtest 2 data is banked and the OQ#24 content pass lands. Its job is
to (a) name the identity spaces so the Bram polish pass knows what Bram is
*by comparison*, (b) reserve spaces for characters 3 and 4 so near-term
content decisions don't eat them, and (c) write down the player-count
principle and its sanity checklist so character 3 isn't authored in a shape
that only parses at exactly two players.

Designer rulings already embedded: balance targets the 2-player experience;
3+ is checked for legibility, not balance ("the chaos IS the fun"); no
overhaul until the Bram/Vess synergy space is explored by humans.

---

## 1. The axes — five identity spaces the engine supports natively

A Threadbound character is defined less by "class fantasy" than by its
position in the tag economy: what it **produces**, what it **reads**, and
what it **banks**.

1. **External-state banker** — stockpiles state *on enemies* and cashes it
   out (yours or, canonically, your partner's cash-out). Banked resource
   lives on the board.
2. **Self-state tempo** — stockpiles state *on itself* and converts to
   immediate output. Banked resource lives on the player.
3. **Thread economy** — generates, banks, or deliberately Frays the shared
   Thread. Banked resource lives in the *pool both players share*.
4. **Binding architect** — manipulates who enemies are bound to: taunt,
   deliberate Sever play, retaliation, "I am the bound one, on purpose."
   Banked resource is *threat itself*.
5. **Chain topology** — reads *position* rather than tags: slot copying,
   echo placement, Resonance-streak extension, reorder tricks.

## 2. Where Vess and Bram sit (and the OQ#28 evidence)

- **Vess = space 1**, fully occupied. Hex is the canonical external bank;
  the S3.5 battery shows she runs the engine even solo (vv mirror: 84.7%
  Hex share, 13.1 stacks/burst, 32% win).
- **Bram = space 2**, currently *underbuilt*. Momentum is exactly a
  self-state bank, but his pool is mostly immediate damage plus link
  payoffs that read someone else's supply — which is why the bb mirror
  starves (16% win, link-starved without a Hex source).
- The asymmetry itself may be the thesis working (synergy beats
  duplication: vb out-resonates both mirrors at 4.13/combat). The problem
  isn't that Bram needs Vess to hit his ceiling — that's the game. The
  problem is whether he has a *floor* that's his own.

## 3. Bram polish brief (post-Playtest-2)

Goal: **consolidate space 2.** Give Bram a functional floor built on the
resource he already owns, without touching his ceiling's cross-player shape.

Hard constraints:
- **No Hex GROWTH — but the Covenant floor stays.** Bram produces Hex at
  floor rate by design (6 Hex tags in his M2 pool vs Vess's 13; §3 requires
  all five broad tags from every character, enforced in covenant.test.ts).
  Removing it would brick his own 12 Hex-reading links in any non-Vess pair
  AND break plug-compatibility with future characters. The constraint is on
  the polish pass: no new Hex scaling, Hex payoffs, or Hex density — the
  *engine* is Vess's. (Ruled this session, correcting an earlier draft of
  this doc that said "no Hex access.")
- **The diagnosis is link-condition mismatch, not tag supply:** 12 of his
  links read Hex (floor-produced, 6) while Strike (13) and Surge are
  over-produced and under-read. The primary lever is re-aiming a few link
  conditions, not touching producers.
- His *best* lines must still run through cross-player links (Knuckle-Crack
  → Rendcall remains the founding image).
- Floor, not ceiling: the bb mirror should climb off 16%, not threaten vb.

Candidate directions (directions, not card specs):
- **Re-aim link conditions (primary):** convert a few of Bram's 12
  Hex-reading links to Surge/Strike where flavor allows — this is where the
  OQ#28 report's "widen 1–2 Bram pool links" note lands, executed in the
  OQ#24 content pass under these constraints. Re-aiming beats widening:
  (Hex)→(Surge) keeps a sequencing decision; (Hex)→(Hex or Surge) is the
  one-step widening OQ#24 permits; (any) stays rare-tier.
- Deepen **Momentum as a bank**: more ways to build it, hold it across
  turns, and spend it big — the self-state mirror of bank-and-burst.
- **Surge self-synergy**: links in Bram's own pool that read Surge (which
  he over-produces) so a Bram-inclusive pair always has live arcs even when
  the partner isn't a Hex supplier.

Success criteria (re-run the S3.5 battery): bb win rate off the floor and
inside the parity bound (|vv−bb| ≤ 15); vb still out-resonates both
mirrors; Hex share in vb stays inside whatever band Playtest 2 re-derives.

## 4. Character 3 reservation: the Thread-economy character (space 3)

Frontrunner, for two structural reasons:

**(a) The OQ#26 collision rule.** The deferred global lever "links generate
Thread" and a character who generates Thread are the same design wearing
two hats. Ruling proposed: if character 3 owns Thread generation, the
global lever stays off permanently — "the weave feeds the pool" is stronger
as something one character *brings* than as a law of physics. Corollary:
hold OQ#26's first lever until this character is decided, even if
Playtest 2 says Thread idles (reach for overcap strain / earlier
thread-attackers first).

**(b) The OQ#13 answer.** Rite links under-fire because Rite is sparse —
because nobody *produces* Rite as an identity. The six uncommon
Thread-flavored Rite build-arounds (Inheritance, Knotward Veil, Slow Burn,
Measured Cut, Martyr's Knot) are a payoff shelf waiting for a supplier.
Character 3 as the **Rite producer / Thread engine** makes that shelf come
alive in any pair that includes them, and resolves OQ#13 structurally
instead of by widening conditions.

Identity sketch (to be developed post-playtest): produces Rite; generates
Thread through play; deliberately courts and manages Fray as a cost
mechanic; their partner-facing gift is *budget* (the partner can Pulse/
Sever more freely) the way Vess's gift is *supply*.

## 5. Character 4 reservation: the Binding architect (space 4)

A taunt/threat character reads better once there are three-plus bodies to
bind across — at exactly 2 players, Binding manipulation is a coin with
one other face. Reserve space 4 for the character that ships alongside (or
after) 3-player support. Defensive identity note: Guard is currently a tag
everyone produces and nobody is *about*; this character is where Guard
gets an owner.

**Parked: space 5 (chain topology).** The most novel and the most fragile —
it lives entirely in the sequencing texture that OQ#24 just established is
vulnerable to width creep. Do not author into this space until the link
economy is settled and re-measured.

## 6. Player count: "balanced for 2, legible at 3+"

Principle (designer ruling): the game is *balanced* around the 2-player
experience. 3+ player support, when it comes, is gated on **legibility
checks, not balance gates** — at 3+, the multiplayer chaos is the fun, and
the only failures that matter are structural ones. The checklist below is
what "not going completely sideways" means concretely.

Legibility checklist (each is a design decision to make before any build):

1. **Chain alternation** — round-robin staging order is the obvious
   generalization; confirm the lockstep/serial commit machinery (S3 #20)
   generalizes to N seats.
2. **Resonance cross-player rule** — "both players participated" does not
   generalize. Proposed re-rule: a streak Resonates if it contains
   contributions from **≥2 distinct players** (any 2 of N). Designer note
   (this session): this needs fine-tuning — more players means more cards
   in the chain and links fire more easily, so the participation rule alone
   will be too loose. The natural knob is **streak-length threshold scaling
   with player count** (+1 required streak length per player beyond 2 as
   the starting guess); calibration work, post-everything.
3. **Thread pool scaling — RULED (this session): fixed shared pool.** No
   regen-per-player. "Make more Thread" is reserved as a character concept
   (§4); if that character is disproportionately strong at higher player
   counts, that's accepted — a Thread generator mattering more when the
   pool is tighter per capita is the design working, not a bug.
4. **Binding with N players** — the "one is always unbound" Chorister rule
   and retether clocks need an N-player statement; sever-rotation must not
   create unbound-lock states with 3 valid targets.
5. **Covenant coverage** — the §3 pool-audit must hold across **any trio**
   (any character subset produces Strikes/Guards/Surges); this is
   bot-verifiable the same way pairs are.
6. **Enemy scaling** — naive HP × N is wrong (fights lengthen, don't
   sharpen); prefer +bodies and +intents-per-binding over stat inflation.
   Values are calibration work, post-everything.
7. **UI real estate** — a third player panel, third hand-collapse, third
   color (the cyan/orange colorblind-safe pair needs a vetted third hue),
   pad navigation across 3 zones.
8. **Session plumbing** — 3 reconnect tokens, eviction rules, and the
   both-confirm patterns (concede, Wedding Knife, ascension select) become
   all-confirm.

**Constraint exported to §4 above:** character 3 must parse at BOTH 2 and 3
players. The Thread-economy identity passes this test naturally (a shared
pool exists at any count); it's part of why it's the frontrunner over a
binding architect.

## 7. Open decisions for the designer (OQ-style, no rush)

1. Ratify the OQ#26 collision rule (§4a): character 3 owns Thread
   generation ⇒ the global links-generate-Thread lever is permanently off?
   (Designer leaning interested as of this session; not yet ratified.)
2. Resonance at 3+: "≥2 distinct players" + streak-length scaling per §6.2
   — exact thresholds are calibration work when 3-player exists.
3. ~~Thread pool at 3+~~ → **RULED: fixed pool** (§6.3, this session).
4. ~~Character 3 sequencing~~ → **RULED: Bram reaches a good state before
   any new character work begins** (this session). The S3.5 battery re-run
   with the polish pass is the gate.
