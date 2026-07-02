# Threadbound — Lore Bible (draft 2)

Status: draft 2 incorporates the designer rulings of the second lore
session (Caretaker rivalry, never-lies law, the Rites mechanic, held
reveal + codex unlock economy). Items marked **[proposed]** await veto.
Part 2 of the lore work (final question set, answers-per-question quota,
fragment voice) still waits on SLICE PLAYTESTS, not implementation — the
slice is merged and flag-gated; run friend sessions with `TB_TRACKS=1`.

Spoiler discipline: this document is the drawer. None of §0–§5 is ever
stated in-game. The player-facing surface is fragments, flavor, the
Witness, and the codex.

## 0. The macro-truth (the drawer paragraph)

The Machine — the Loom — is a reflection of the world's collective
unconscious, built in an age when belief was unified, to carry souls:
downward out of the world by the funeral rite, upward into it by the
mirrored birth rite. The same figures serve both sacraments. As cultures
drifted and the metaphorical Tower of Babel fell, the Machine's parts
became incompatible with one another. Some parts suffer their new
incoherence; others cannot bear that the whole no longer agrees, and
purge — seeking unity by deletion. The rite jammed mid-cycle. The world
became collateral in the Machine's internal dispute. The Loom is unwell
and does not know why: a mind cannot see its own lesions.

## 1. The place

The descent is the underside of the funeral rite — a psychopomp machine
jammed mid-cycle. Everything encountered is cargo (souls in transit,
half-carried) or crew (the rite's figures and functionaries, deformed by
the schism). At the bottom sits the Machine itself: semi-metaphorical,
the source of Truth, and — apparently — the goal.

**Act 4 [designer 1.1 + proposed gate fiction]:** reaching the Machine
seems like the game's meta-goal and is "impossible" — because the Machine
renders the descent, and it cannot render what it can no longer describe.
The deepest floor is not locked; it is UNRENDERED. Completing the codex
re-describes the Machine to itself, and only then can it render its own
floor. **Act 4's boss is the Caretaker itself** (§4) — the confrontation
the codex was always building toward, whether or not the Witness knew.
An early attempt to push past Act 3 is a lore beat, not a wall: the way
down simply is not finished.

## 2. Thread, cards, and difficulty

- **Thread** is the Machine's own power, brought to bear against itself.
  Spending Thread is turning the Loom's strength on the Loom. **Fray** is
  the strand overdrawn — the Machine resisting its own misuse through
  you.
- **Cards are ceremonial craft.** Playing them locally re-defines what
  the Machine IS — patching gaps by re-description. Deckbuilding is
  theology. The work is necessary (it is how the Witness's codex gets
  written) and harmful: every re-description worsens the total damage.
- **Ascension is the harm accumulating.** The existing unlock rule
  already tells this story: clearing A(N) unlocks A(N+1) — the world is
  harder next time BECAUSE you succeeded last time. No retrofit needed;
  the ladder is the fiction. **[proposed framing, designer 1.2 substance]**
- **Character 3's seat [proposed]:** the **Tollkeeper** — the figure who
  collects the tithe of passage in the death rite and pays the dowry of
  arrival in the birth rite. A Thread-economy character is one who
  channels the Machine's power directly: the deepest complicity, the
  role that touches the Loom most intimately. (Tithe of Thread already
  in the pool; the seat makes it theirs.)

## 3. Roles, not people — and Vestments

Many pairs have descended. You play THIS descent's Hexweaver and
Cinderfist — costumes and symbolism of religious figures from the twin
sacraments (death: sending away; birth: welcoming in; same roles in
both). The stories of the people wearing the costumes vary run to run —
which is what the truth system's self-questions are ABOUT, and what the
codex records across a profile's lifetime.

**The Rites [mechanic, designer rulings this session]:** each player's
identity is worn in two picks.
- **Death-rite, chosen at the descent's start** from a RANDOMIZED offer
  (a subset of that role's unlocked death-rites — Neow-class variance,
  never the full menu). A small starting bonus; the costume you put on.
- **Birth-rite, earned midgame** — deliberately NOT at an act boundary
  (that's cloning Slay the Spire). It is the payoff for routing into
  **character events**: after taking N of them, the player picks their
  birth-rite. The mirror sacrament arrives as a reward for engaging with
  the rite, not as a schedule.
- **[proposed] "Character events"** = role-specific event content (the
  Hexweaver's stations, the Cinderfist's) — a distinct event subtype,
  which also gives future characters an authored surface ("character
  events multiply" was already the plan). Whether generic events count
  toward N is an open tuning question (§10.3).
- **Routing economy note:** clue events pay evidence; character events
  pay the birth-rite. Events-vs-elites is now ONE economy with two
  payoffs — tune it as one. **Map sizing [proposed lean]:** widen acts
  1–2 (nodes or event density) rather than expand act 3 to a full map —
  the capstone-finale shape is a deliberate pacing ruling, the Naming
  node owns act 3's pre-boss space, and the birth-rite wants to land
  mid-act-2 while it can still matter. Sim-test both once numbers exist.
- **Vestments** survives as the UI/flavor verb ("don the vestment
  of…"); the system's nouns are the rites themselves.

**Question-set consequence:** a player who PICKS a death-rite has
answered "who are you" out loud — two independent reasons now point to
that question leaving the deduction set. Final call still deferred to
the post-slice question-set decision (§10.6), with the Rites as input.

## 4. The Witness (fact sheet)

- **Identity [proposed — the twin-reflex reading]:** the Machine's
  REPAIR instinct, become self-aware. Its rival, the **Caretaker**
  (designer ruling: rival, not maker), is the Machine's PRESERVATION
  instinct, become self-aware — restore the original, purge what
  drifted. Nothing made either; they are two reflexes of one patient,
  each certain it is the cure. They are §0's two unhappinesses at the
  top of the fractal; every two-faced boss (§8) is a small
  Witness-versus-Caretaker.
- **Wants:** the codex complete — an instinct it acts on without
  understanding, because a reflex doesn't know why it fires. As the
  codex fills, it comes to understand what completion means: a Machine
  fully re-described AS IT IS leaves nothing for a restorer to restore.
  **The Witness seeks the Caretaker's destruction — unknowingly at
  first, willingly later** (designer ruling). The codex was always the
  weapon; Act 4 is the confrontation.
- **Voice arc:** the Witness's register evolves with the profile's
  codex fill — sardonic collector early, quieter and more deliberate as
  it understands itself. Implemented as codex-percentage-keyed line
  pools; cheap, haunting, now core rather than optional.
- **Knowledge boundary — THE writing rule: its ignorance is the
  damage.** It knows the rite's FORM perfectly: procedures, titles,
  songs, names, what each figure was for. It CANNOT know content the
  breakage took; its gaps map the lesions. Where a gap is, it deflects —
  the sarcasm is scar tissue. By midgame players should rightly suspect
  it knows more than it tells AND that some of its silences are real.
- **RATIFIED (designer): the Witness never states falsehoods.** It
  withholds, deprecates, misdirects by omission — never fabricates.
  Absolute writing law; every partner-channel fragment is reliable
  evidence because of it.
- **Why fragments are asymmetric [proposed, from designer's 1.5]:** the
  broken Machine cannot say the same thing to two listeners — Babel is
  the mechanic. The Witness is the last part that can still speak in one
  voice, and only to one person at a time (which is also the solo
  fallback's fiction).

## 5. The Codex

The Machine's attempt at self-repair by self-description — or
self-REPLACEMENT (designer: the codex as the Machine's recreation of
itself; whether repair and replacement are the same thing is a question
the meta-narrative may pose rather than answer). Each Named truth
re-describes a region; each recorded elimination maps a lesion's edge —
wrong answers are cartography too, which is why the codex keeps them.
Completion → the Machine can describe, and therefore render, its deepest
floor → Act 4 → the Caretaker. Completion criteria and pacing: waits on
the Part-2 quota (§10.6).

**The unlock economy (designer ruling):** codex progression unlocks new
death-rites and birth-rites, partly gated by ASCENSION — the full set is
unreachable at base difficulty alone. Collection, difficulty, and
identity pull the same rope. **Held reveal (designer ruling on §10.5):**
the mirror sacrament appears WITHOUT explanation in early runs
(birth-column words, the second rite arriving midgame, unexplained); the
codex filling in is what eventually makes it legible — the reveal is
enforced by unlock pacing, never by exposition. Inherited note: S4's
union rule now covers rites — a fresh player paired with a veteran plays
with the veteran's unlocks for that run, and credit still accrues to
both. Kept deliberately.

## 5b. The other half — where rebirth lives **[proposed, this session]**

The game must not read only as descent-to-Hell (designer). The mirror is
built at three scales, mostly from parts that already ship:

- **Master pattern: death is the run-scale loop; rebirth is the
  meta-scale loop.** Every run is a funeral performed by the pair; the
  codex accumulating across runs is a GESTATION (the Machine
  re-describing itself — §5); Act 4 is the delivery. Many deaths, one
  birth, at different zooms. Rebirth stays rare, earned, never ambient.
- **In-run, rebirth already exists unnamed — name it (quietly):**
  - **Reclaim/mutation IS the birth rite**: a card dies, passes through
    the partner, returns transformed and renamed. Content pass: some
    mutation names draw from the birth column ("Quickened," "Cradled,"
    "First-Drawn" alongside "Stitched"/"Hexbound").
  - **The fall-rebind is the welcome rite in miniature** — the thread
    pulls the fallen back; the partner receives them. Its existing
    out-loud line eventually quotes the right sacrament.
  - **The birth-rite pick** (§3) is the mirror arriving midgame as a
    mechanic.
  - **The wrong-way event [new, cheap, haunting]:** rarely, something
    ascends PAST the players — traffic in the other direction,
    unexplained. The machine still births, weakly, wrongly. The codex
    eventually explains what those were.
  Per the held-reveal ruling, none of this is explained early; it wears
  death's vocabulary until the codex teaches otherwise.
- **The inversion (Act 4's image): the bottom of the descent is where
  births come from.** The dead are carried down and the new carried up
  FROM THE SAME FLOOR — the Loom's floor is the cradle. When the codex
  finally renders Act 4, the palette breaks the game's own gradient:
  lamplit earth, bruised violet, ember dark — then DAWN. "Descent to
  Hell" was a permitted misreading; the players were descending to the
  living's origin, jammed.
- **The Witness's ending:** the repair reflex's victory is a healthy
  machine — which needs no reflexes. It marches, willingly by the end,
  toward its own obsolescence; its rebirth is to stop being needed.
  Whether it dissolves into the whole or becomes something new is posed,
  never answered.

## 6. Act gazetteer

- **Act 1 — the Undercroft** (lamplit earth): the rite's intake, where
  the dead were received and grief was staged. Cargo-heavy: the
  half-carried, the mislaid, low crew still performing fragments of
  their office.
- **Act 2 — the Hollow Choir** (bruised violet): the carrying — the
  song that lifted souls through. Now a descant with nothing to carry.
  The schism is loudest here: parts that mourn what they were, and
  parts that would purge the mourners for the discord.
- **Act 3 — the Last Braid** (ember dark): where threads were tied off —
  a soul's final knotting out of the world, and in the mirror rite, its
  first knotting in. Closest to the Loom; most damaged; the two-faced
  bosses live here because near the Machine, a thing's history and its
  present state have come apart (§8).
- **Act 4 — the Loom's floor**: unrendered. When it finally renders: the
  cradle, and dawn (§5b). See §1.

## 7. Naming lexicon (the word-drawer)

Compound funeral-craft nouns, now formally TWO columns:
- **Death column** (established): grave-cloth, tallow, votive, tithe,
  toll, descant, sexton, peal, knell, vigil, shroud, pyre, mourner.
- **Birth column [proposed]** (the mirror, used more sparingly):
  swaddle, cradle, christen, dowry, hearth, quickening, first-breath,
  naming-day. (Quickening is already in the pool — the mirror was
  always there.)
New content draws from the drawer. The birth column's rarity is itself
lore signal — §10.5 decides whether the mirror rite is early texture or
a held reveal.

## 8. Answer-pool themes (not final answers — quota waits on Part 2)

- **Who are you** (IF it stays deducible, §10.3): which figure's
  costume, and what its wearer carried down — debt, penance, grief,
  zeal.
- **Why did you come:** the pair's contract — paid, compelled,
  volunteered, fleeing.
- **What happened here:** the local instance of the schism — silenced
  to save; purged for unity; abandoned mid-rite; consumed by a starving
  part.
- **Why did it happen:** the schism's motives — mercy, unity, hunger,
  grief, debt.
- **Boss faces:** the slice's Sexton/Peal pattern generalizes — an
  arena's two truths are "the one who broke it to protect it" and "the
  thing it became." The two faces are the two unhappinesses of §0, which
  is to say: every two-faced boss is a small Witness-versus-Caretaker.

## 9. Consistency pass (target: near-zero retrofits)

First read finds no contradictions and several retroactive
confirmations: the Wedding Knife (the tool that binds — or cuts — a
pair's thread; the pairing sacrament was always implied), Quickening
(the birth column, already shipped), the act glows, the Mourner, the
between-acts heal ("the fall-rebind says so out loud"). Action item for
the content pass: audit all Witness solo lines against §4's knowledge
boundary and never-lies law once ratified.

## 10. Open rulings

1. ~~The twin-reflex reading (§4)~~ → **RATIFIED** (designer): Witness =
   repair instinct, Caretaker = preservation instinct, nothing made
   either — two reflexes of one patient, each certain it is the cure.
2. ~~Never-lies~~ → **RATIFIED.**
3. **Rites numbers** (design-doc work when the content pass opens, not
   now): rites per role at launch; the character-event threshold N for
   the birth-rite; whether generic events count toward N; bonus sizing;
   and the map-sizing choice (widen acts 1–2 [recommended] vs. expand
   act 3) — sim-test both.
4. ~~Act-4 gate fiction~~ → **RATIFIED** ("unrendered, not locked").
5. ~~Birth-rite prominence~~ → **RATIFIED** (held reveal, enforced by
   codex unlock pacing).
6. **Codex completion criteria + final question set** — deferred with
   the Part-2 quota (slice playtests), now with the Rites as an input
   ("who are you" likely leaves the deduction set).
7. **The chant/poem** — deferred until the roles are locked (agreed).
   Placeholder: verses = acts; each figure gets a line in each
   sacrament. Placeholder
   slot: verses = acts; each figure gets a line in each sacrament.
