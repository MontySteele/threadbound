# Open Questions for the Designer

Conservative-reading + log protocol (working agreement). M1 entries were ruled on
2026-06 — rulings live in `docs/threadbound_M2_plan.md` Part A and are folded into
the design doc (§14 changelog). This file now carries the **M2 judgment calls**.

## Resolved (designer rulings, 2026-06)

M1 OQ#1 (hands) → discard at end of turn, drawn-cards carry, Keep keyword (M2-A1).
OQ#2 (Link-any) → not self-similar, confirmed. OQ#3 (Momentum) → once per
multi-hit; per-hit is rare link space. OQ#4 (energy) → Kindled (M2-A2). OQ#5
(detonation vs Block) → ignores Block, confirmed. OQ#6 (Steady) → confirmed.
OQ#7 (Mourner timing) → same-turn, confirmed. OQ#8 (death) → down-but-not-out
(M2-A3). OQ#9 (starters) → dedicated starter-only cards (M2-A5). OQ#10
(upgrades) → shipped (M2-B6). OQ#11 (standard event chooser) → seeded random,
confirmed. OQ#12/#13 (link rate, difficulty) → Part C gates, all passing.

## New in M2 (conservative readings, logged for review)

1. **Event `loseHp` caps at 1 HP** — the M2 plan stated this as the preferred
   option and delegated the call; taken as written (M2-A3).

2. **Per-hit Momentum rare** — the plan's Avalanche rewrite was an "e.g.";
   Avalanche keeps its `Link (Partner)` identity and the new Bram rare
   **Relentless** (Deal 5×4; Link (Surge): Momentum applies to every hit)
   carries the mechanic instead (M2-A4).

3. **Relic sources** — unspecified in the plan: elite/boss kills (random relic,
   random owner), treasure nodes, and shop stock. Wedding Knife is excluded
   from random drops until the pool is otherwise exhausted, so it stays a
   discovered-in-shop/treasure story beat... actually it can drop randomly last;
   flag if it should be shop-only.

   **OQ#3 ruling (S4 session, 2026-06-12): RESOLVED — CLOSED, no change.**
   The Wedding Knife stays droppable-last from the random pool; shop/treasure
   remain its primary sources.

4. **Sever Binding vs Choristers** (§6 "one is always unbound") — severing any
   chorister **rotates**: the unbound body takes the target's binding and
   becomes targetable; the target goes unbound/untargetable. Normal p1↔p2
   severing doesn't apply inside the chorus.

5. **Unbound Chorister behavior** — it can't attack a player it isn't bound to,
   so it **harmonizes**: +1 Strength to the chorus each turn. Pressure to sever
   onto it, which is the §6 intent.

6. **Mutation × upgrade stacking** — Echoes of upgraded cards mutate from the
   **base** form. Mutations are hand-authored against one shape; combinatorial
   variants would dodge the audit.

7. **`handRetainOne` relic** — retains the first eligible card in the committed
   hand (no player choice). A retain-picker UI is M3 polish.

8. **Shop removal escalation** — per-shop (3 slots at 75/100/125 gold), not
   per-run cumulative. Flag if removal should get globally scarcer.

   **OQ#8 ruling (S4 session, 2026-06-12): RESOLVED.** Unlimited removals per
   shop visit — the service never sells out, only gold gates it. Price is per
   player and run-persistent: 75 + 25 × (removals that player has bought this
   run, anywhere), paid from the shared purse. A player going small-deck can,
   at an escalating tax on the team's gold. Implemented S4.2 (§14.13);
   `removalsByPlayer`/`goldSpentByCategory` telemetry reads whether the
   escalation is a real constraint or theater.

9. **Wedding Knife flow** — an optional sub-flow at any rest site once a player
   owns the relic (offer → both confirm), on top of the normal rest choice, not
   replacing it. Changing an offer resets both confirmations.

10. **Treasure nodes** — §8 lists treasure; the M2 plan didn't spec it. Gives
    30–50 gold + a random relic to a random player, shown on the spoils screen.

11. **Boss rewards** — boss kills grant +1 Covet charge (like elites), a relic,
    and 70–85 gold, then card rewards before the next act. Not specified
    anywhere; mirror-of-elite seemed safest.

12. **Bot reorder pass** — bots now run one REORDER optimization before
    readying (fix own unfired links). This is presentation-level link
    bookkeeping (same computation the UI shows humans), not an engine oracle.

13. **Rite-condition link scarcity (§4)** — the drafted pool had 14 links
    reading Rite, the deliberately sparse tag, which structurally under-fire.
    Common-rarity Rite-readers were widened to broader conditions (Surge/
    Strike/Guard/any); six uncommon Thread-flavored Rite payoffs remain as
    deliberate build-arounds (Inheritance, Knotward Veil, Slow Burn, Measured
    Cut, Martyr's Knot +1). Flag if Rite links should instead become more
    common alongside more Rite cards.

14. **Hex-share gate sits near a bot behavioral bifurcation** — the 20–30%
    gate passed at 20.3% (50 runs) only after the bot staging policy got an
    explicit Hex-axis bonus; the share whipsawed 15–24% across earlier sims as
    link-placement preferences shifted. Human pairs who deliberately play the
    Vess→Bram detonation game should land comfortably inside; watch the stat in
    Playtest 2 rather than tuning content further on bot evidence alone.

## New in M3 (conservative readings, logged for review)

15. **Audio is procedural WebAudio synthesis**, not CC0 packs (Part C said
    freesound/Kenney). Rationale: loudness-consistent by construction, zero
    binary assets, no un-auditioned downloads; the sfx.ts surface is one
    function per sound, so swapping in curated samples later is mechanical.
    Flag if the synthesized palette reads too "chiptune" in playtest.

16. **The First-Chain tutorial rides the run's real first combat** (guided
    overlay, 5 steps, skippable, once per browser) instead of a separate
    scripted 1v1 vs a Cinder Husk. A scripted solo combat would need engine
    support for non-run combats; deferred unless the overlay proves confusing.

17. **Thread-action radial menu** (Square/X) is implemented as a focus jump to
    the THREAD button row rather than a literal radial — same four options,
    one press. Revisit if the row reads poorly on a TV.

18. **Resolution theater narrates over the final state** rather than stepping
    intermediate game states (true intermediate frames would require engine
    replay in the client, which §11 forbids the client to compute). Damage
    numbers, hitstop, shake, and cord effects all fire per log event; the
    one visible compromise is that enemy HP bars show end-of-turn values
    during the narration.

19. **handRetainOne retains the first eligible card** (no picker yet — the
    M3 plan's retain-picker remains open for a later pass).

## Post-M3-review changes (pre-playtest)

20. **Bots are now deterministic-by-construction where possible** (review
    finding 1): engine seeds fixed per run (`SEED` env selects the seed set),
    policy decisions are state-pure hashes (not consumed RNG streams), combat
    planning is lockstep (p1 acts on even move-counts, p2 on odd; serial once
    a partner readies), shops are browsed serially, and only p1 may Re-braid.
    Residual nondeterminism: rare socket arrival-order flips (~3/5 short runs
    identical byte-for-byte; aggregates at n=50 are stable). Lockstep also
    RAISED the coordination floor substantially (alternation = more
    cross-player links; bots now win most runs) — the M2-era gate readings are
    obsolete, which is fine: M3 Part A re-derives two-sided bands from human
    uplift over THIS baseline. Do not tune against the old numbers.

21. **Feedback stamps** (review suggestion): `]` good / `[` bad / `\` note
    (pad: L1+R1 chord) write context-stamped entries (phase/act/turn/node) to
    the room and, under `--human-session`, to `telemetry/feedback-<room>.jsonl`
    immediately (crash-safe). Included in the end-of-run telemetry JSON.

22. **Hands are open information** (designer request, this session): the server
    no longer redacts the partner's hand — §2.1 only ever specified that staged
    cards are public, and hiding hands in a voice-chat co-op game was friction,
    not stakes. The one remaining secret is draw-pile ORDER (contents were
    always derivable). Partner hand shows collapsed under their panel; the
    Deck overlay (header button / `d` / pad Create) shows tag summaries
    (Covenant 5), your draw/discard/exhaust contents, and both full decks.

23. **Downtime-list additions** (pre-playtest sidechat): phase-aware eviction
    (live runs survive 7 days idle; lobbies 24h; finished 1h after both leave —
    the Tuesday→Thursday run is safe, no save-button needed); end-of-run
    summary screen (per-player damage, biggest turn, detonations, Covets, seed,
    Witness epitaph — screenshot = playtest data); 6 contextual one-time hints;
    title/lobby cord motif with rude Witness greeting; both-confirm concede
    (routes through the summary, retractable until both agree). Colorblind
    check: player hues are cyan #7fd4ff / orange #ffb070 — already the safe
    pairing, no change needed; gold focus ring distinct from both. Explicitly
    NOT done per the skip list: balance levers, new content, mulligans, damage
    previews, art beyond the title treatment.

24. **Link (any) reads as "free stuff"** (Playtest 1, designer): an `any` link
    fires in every slot but the first — no ordering decision, no coordination
    texture. Data: the BASE pools are fine (10 of 115 linked cards are `any`:
    5c/3u/2r, zero starters; named broad tags dominate at 89). The flood is
    the M2-B6 upgrade convention — **73 upgrades widen a narrower link to
    `any`** ("upgrades prefer deepening the link: wider conditions"), so a
    late-game upgraded deck converges on always-on links and the weave puzzle
    evaporates exactly when decks get interesting. Note `any` was also the
    OQ#13 fix for sparse-tag links under-firing, and act-2 link-fire targets
    (45–60%) are partly delivered by this widening — any change must re-check
    those bands. Candidate directions (post-playtest, pick one):
    (a) re-aim the upgrade convention: widen one step to a named broad tag
        (incl. the partner's primary tags) instead of to `any`; keep `any`
        as the rare-tier payoff;
    (b) keep semantics, audit the budget: `any` payoffs priced ~half of
        narrow-tag payoffs (reliability is the product);
    (c) new conditions with texture instead of width (e.g. "partner's card
        anywhere earlier this chain", "fires twice if both neighbors match").
    Decision deferred mid-playtest; the difficulty pass (§14.8) just landed
    and stacking a link-economy rework on it would blind both readings.

    **OQ#24 ruling (review pass, 2026-06-11):** upgrades may widen a link by
    ONE step between named tags (e.g. (Hex) → (Hex or Rite) once multi-tag
    conditions exist, or to an adjacent broad tag); widening to (any) is
    reserved for rares; starters are exempt downward (Second Wind already
    narrowed, §14.10). Implementation is the post-playtest content pass —
    do not stack it onto the Friday difficulty reading.

25. **Playtest-2 (Friday) watch-list** (review pass — watch, don't build):
    - **Hex texture**: avg stacks per detonation now in telemetry/sim/summary.
      If it hovers near 1–2, §14.10 Hatpins have turned bank-and-burst into a
      drip and the big detonators are being cannibalized — lever: gate
      Hatpin's detonate behind Link (Hex) so sequencing is required, not free.
      If healthy, widen the 20–30% Hex-share band honestly (it was guessed
      against a starter reality that no longer exists).
    - **Sever economics vs self-retether**: a 3-Thread Sever an elite undoes
      ≤2 turns later reads as wasted thread. If the complaint lands, the fix
      is "a manual Sever resets that enemy's retether clock."
    - **Difficulty anchor caveats**: 1.4/1.3 is calibrated to the designer
      (best player alive, solo with a coordinated bot) and the validated run
      predates the planned-block UI fix. TB_ENEMY_HP_SCALE/TB_ENEMY_DMG_SCALE
      env knobs soften live (e.g. 1.2/1.2 for a first-timer pair); the active
      scales ride in every telemetry file so Part A stays interpretable.
      First-session fun outranks calibration purity.

26. **§14.12 deferred Thread levers** (S3.3b, 2026-06-12): the Pulse rework
    (force a dead link) shipped pre-playtest; the rest of the Thread economy
    loop is explicitly deferred until post-playtest data exists. Candidates,
    in the order we'd reach for them if Thread still idles:
    - **Links generate Thread** (close the loop: weaving feeds the pool that
      feeds the weave).
    - **Overcap strain** (regen wasted at cap becomes a cost, not a no-op —
      telemetry already counts it: `regenWastedAtCap`).
    - **Earlier thread-attacking enemies** (attrition that makes Steady/regen
      decisions real before the Unraveled).

27. **Pulsekeeper's Ring forced retext** (§14.12 collateral): the relic read
    "Pulse grants +4 instead of +3" — meaningless once the flat bonus died.
    Retexted to the closest equivalent: "Pulse costs 1 Thread instead of 2"
    (`pulseCostMinusOne`). A relic referencing a removed mechanic is a bug,
    not a scope save; flagged here because S3's hard scope rule said no relic
    changes. Designer may re-rule the effect.

    **OQ#27 ruling (S4 session, 2026-06-12): RESOLVED.** The flat cost break
    literally doubled Pulses per Thread — overpowered. `pulseCostMinusOne` is
    removed entirely (type, engine branches, relic def). New mechanic: a
    run-persistent charge counter on the owner — **every third Pulse costs 1
    Thread** instead of 2 (counter ≡ 0 mod 3 on the Pulse being cast; counting
    starts at acquisition). Retext: "Every third Pulse costs 1 Thread. The
    Ring keeps count." UI: 0–2 charge pips on the relic frame; the THREAD row
    shows the discounted cost when the next Pulse is the third.
    `ringDiscountsFired` telemetry watches for deadness at human Pulse rates
    (risk accepted knowingly); the pre-agreed escalation if it reads dead is
    variant (b): every third Pulse FREE — same average value, punchier moment.
    Implemented S4.3 (§14.13).

28. **S3.5 battery findings** (2026-06-12, full data in
    `docs/S3-BALANCE-REPORT.md`): at the 1.5/1.35 anchor, vb resonates more
    than either mirror (4.13/combat vs 3.36/3.21 — links are not too
    generic), but the vess mirror out-WINS vb 32% vs 26% on the back of the
    hex engine (84.7% Hex share, 13.1 stacks/burst, Worn Knife = 26% of all
    vv damage). Watch-list cards if a human vv run ever reproduces it:
    Saturate (doubleHex), uncapped Worn Knife scaling. Bram mirror is weak
    (16%, link-starved without a Hex supply) — asymmetric dependence may be
    the thesis working; designer may instead widen 1-2 Bram pool links in
    the OQ#24 content pass. Parity |vv−bb| = 16 vs bound 15. Proposed
    Hex-share gate band: 35–55% provisional (gate not edited).

## Playtest-2 live reports (2026-06-12, triaged mid-session)

UI bugs fixed on `s4-economy` same day (controller skipping every other card
in 8+ hands; right-stick unable to pan the Chain track; hex count hidden
below 10; no HP shown at rest sites; boss/elite re-tether not forecast in the
intent area; invisible relic-sourced Thread gains now logged by name).
Balance items below are LOGGED, not tuned — the difficulty anchor reading
comes first (§14.8 discipline), and they're content-pass material.

29. **Loom of Two Hands is too good** (designer, live): +1 Thread per own
    link fired, against a base regen of +2/turn — at the current ~55%+
    link-fire rates that's roughly +3–5 Thread/turn, which dissolves the
    Thread economy the §14.12 rework just made matter. Candidate nerfs for
    the post-playtest pass: cap at 1/turn ("the first time one of your links
    fires each turn"), make it Kindled instead of Thread, or price it as the
    premium relic it currently is. The new named "+N Thread" log lines (this
    session) make its contribution visible in any future session; candidate
    telemetry: thread gains by source.

30. **Stolen Breath is too good** (designer, live: "free power - add
    exhaust?"): 0-cost neutral COMMON, "Draw 1. Link (any): Gain Kindled 1."
    — a free chain-slot filler that replaces itself, extends Resonance
    streaks, and (link `any`) fires from any slot but the first. Designer
    proposes adding Exhaust; alternatives: drop the link to a named tag
    (OQ#24 direction), or uncommon rarity. Queued for the post-playtest
    content pass with OQ#24 — not changed mid-playtest.

31. **Resonance scaling coverage is thin and reads as "does nothing"**
    (designer, live: "Resonate 3+? No resonance on link effects? What does
    resonance do for things that are not damage or guard? Not showing
    anything"). Data (pool audit, this session): resonance scales only
    `primary`-flagged effect ops; **12 of 105 link clauses** carry the flag
    while **93 numeric link effects don't**, and **33 of 131 cards have no
    primary anywhere** — on those, igniting Resonance does nothing visible
    on the card itself. The tooltip now says exactly what scales (and that
    flagless cards still extend streaks + trigger Resonance relics), but the
    design questions stand for the content pass:
    (a) should link-clause numbers scale by default (primary on the link's
        main number), so the card that COMPLETES a streak feels it?
    (b) should no-primary cards get a fallback Resonance bonus (e.g. draw 1
        or +1 Kindled) so igniting on them never feels blank?
    Both change balance pool-wide; rule after the difficulty reading banks.

32. **"Thread math ain't matching" (needs repro)**: report arrived truncated
    ("seems like we ran ..."). Best hypothesis is invisible mid-resolution
    relic Thread gains — Loom of Two Hands (OQ#29) firing per link with no
    log line; regen eaten silently at the cap is the other usual suspect
    (`regenWastedAtCap` already counts it). Named "+N Thread" log lines added
    this session; if the mismatch reproduces with those visible, capture the
    seed + turn and the spend list from the Chain margin.

33. **link(any) too common on upgrades** (designer, live) — confirmation of
    OQ#24 from a fresh pair; no new decision needed. The ruling stands
    (one-step widening between named tags, `any` reserved for rares) and
    remains scheduled for the post-playtest content pass.

## Playtest-2 live reports, second batch (2026-06-12)

UI/bug items fixed on `s4-economy` same day: deck size shown on the header
Deck chip; the same card can no longer be declared for Reclaim twice in one
turn (engine guard + the panel greys out claimed cards); Momentum now
previews on cards (corner ➤+N badge on staged Strikes, halving walked down
the chain like the planned-Block estimate, and on hand Strikes for what a
stage-now would get); Cracked Bell retexted to its actual rule ("once per
burst, any size" — it was never per-stack); Stolen Breath's upgrade was a
byte-identical copy of its base link (a no-op "+") — now Link (any): Kindled
2, base untouched pending OQ#30.

**OQ#29 RULED (designer, live session):** Loom of Two Hands → "The first
time one of your links fires each turn, gain 1 Thread", and rare. "For now"
— revisit with Playtest-2 thread telemetry. Implementation: `oncePerTurn`
hook flag (generic, per holder+event, recharges at turn start) and a
`rare: true` relic flag at 1/3 drop weight in `randomUnownedRelic` (relics
had no rarity concept before this).

34. **Linked Shields seems underpowered** (designer, live): 2-cost uncommon,
    7 Block + Link (Guard): partner gains 4. It is the pool's single allowed
    self-similar uncommon (§2.3), so its link fires only off another Guard —
    the cost of being the rule's one exception may be priced into a body
    that's just small. Candidate buffs for the content pass: 8 Block base,
    or partner Block 4 → 6 (the co-op half is the identity). Logged, not
    tuned — same freeze as OQ#30.

35. **"Echo cards can't be removed" (needs repro)**: engine paths verified
    in-test this session — an Echo stages, UNSTAGES (energy refunded),
    restages, and exhausts on play; echoes never reach decks, so the shop
    removal service never lists them (by design — they die at combat end).
    If the report meant something else (a declared Reclaim that couldn't be
    cancelled? an Echo stuck in the overlap fan of a crowded hand?), a seed
    + turn would pin it.

36. **Two cards both named "Stolen Breath"** (found while triaging OQ#35):
    the neutral common (`stolen_breath`) AND Gathering Slack's mutation form
    (a different card entirely) share a display name — a table-talk hazard
    ("I reclaimed Stolen Breath" is ambiguous). Rename one in the
    post-playtest content pass. Logged, not changed mid-playtest.

## Playtest-3 live reports (2026-06-14, s4-economy)

Bugs fixed this session (client/UX only, no gameplay change):
- **Controller couldn't scroll the Deck overlay or the Reclaim list** — the
  right stick only ever scrolled the window. It now drives the focused
  element's nearest `overflow-y` container first (mirrors the PT2 horizontal
  `scrollerX` fix); the Reclaim list got a bounded scroll container so >1 row
  is pad-reachable.
- **Momentum preview ignored mid-turn gains** — the PT2 `➤+N` badge started
  from carried Momentum only and never added Momentum a chain card *grants*,
  so a Strike staged after a "gain Momentum" card read stale. The preview now
  walks effects in order, so gains feed the Strikes after them (and the
  hand-Strike `next` badge reflects them too).
- **Weak not reflected in the enemy intent number** — `intentText` now mirrors
  the engine's `floor((amount + Strength) × 0.75)` and tags the telegraph
  "(Weak)". (Target-side Vulnerable/Frayed deliberately not shown on the
  attacker's telegraph — they belong to whoever it lands on.)
- **Resonance read as a buff on cards that scale nothing** — a resonating
  chain card now shows `✦ RESONANCE +50%` only when it has a `primary` effect
  to scale, else `✦ RESONANCE · streak only`. (The deeper design question is
  OQ#31, below.)

Question answered directly: **link(Rite) cards do exist** — 6 in the pool
(e.g. a Bram Hex card, two neutral Thread cards, two Vess cards). Rite is the
deliberately-sparse tag (§4 / OQ#13), so a given run may show none; that's
working as intended, not a missing-content bug.

37. **Enemy HP snaps to final before the action narration plays** (report:
    "don't update the enemy hp until after the list of actions finishes
    firing, or the list is skipped"). This is the OQ#18 tradeoff surfacing in
    play: the resolution theater narrates over the FINAL state because §11
    forbids the client from computing intermediate states, so HP bars read
    end-of-turn while the beats play (and a skip suppresses the remaining
    floating numbers). Functionally everything fires — but it reads as if
    actions were skipped. Fix direction for the session: have the theater
    animate each enemy's HP bar DOWN per `damage`/`detonate` beat from a
    client-held display value (presentation-only, no engine replay — stays
    §11-clean). Scoped as a feature, not a one-liner, hence logged.

38. **Discard pile is often empty, so Reclaim has nothing to grab** (report).
    Fixed draw-of-5 (§14.7) keeps hands full and discards thin early in a
    turn, so the cross-player Reclaim engine is hard to even attempt. Design
    levers to weigh: Reclaim could also read the partner's EXHAUST or hand;
    or the friction is acceptable and Reclaim is a late-turn / long-combat
    tool by design. Couples to OQ#26 (Thread economy) and #5/#39 below.

39. **Thread recovers too fast — nerf regen to +1/turn?** (designer, live).
    Base regen is +2/turn (§5); with the Loom nerf (OQ#29) already landed,
    this is the next Thread-economy lever. Don't tune off bot sims — the
    Pulse rework (§14.12) made Thread matter and the right number wants human
    data. THE telemetry to read first: thread spent/combat, `regenWastedAtCap`,
    spend-mix. Explicitly a design-session call (OQ#26 family).

40. **Let players Sever an ACTIVE chain link, not just Pulse dead ones** —
    "control where Resonance lands" (designer, live). Today Pulse forces a
    dead link to fire (§14.12); there's no inverse (suppress a firing link to
    re-shape a streak). A real new verb — feature for the design session, not
    a fix. Weigh against complexity: it inverts Pulse and adds a second
    chain-editing Thread action.

41. **"All relics seem to only apply to Vess" / Ember Coal only gave Vess
    Momentum** (designer, live). Investigated: working as designed — relics
    are PER-HOLDER, and Ember Coal's `combatStart` Momentum (a self-resource)
    goes to whoever owns it; `runHooks` runs per-player on the holder's own
    relics, and the RelicBar colors each relic by owner. The co-op framing of
    the game makes players expect SHARED relic effects, which is the real
    gap. Design-session calls: (a) relic text should name whose resource it
    grants; (b) decide which relics should be co-op (use `partnerX` ops or
    affect both) vs personal. If a relic literally failed to apply to a
    player who OWNED it, that IS a bug — needs a seed + the relic id.

42. **"Pass on Coveting" and "Onward" are redundant on the reward screen**
    (designer, live). True: ADVANCE auto-passes an undecided Covet in the
    reducer, so Onward already declines. The only thing the separate button
    buys is decline-but-stay-on-screen. Quick UI call for the session: drop
    the button (rely on Onward's auto-pass) or keep it as an explicit decline.
    Trivial either way once decided — left as a judgment call, not a bug.

43. **Hex >> Momentum, "especially since you can repeatedly double it"**
    (designer, live). Echoes OQ#28 (the vess-mirror hex engine: Saturate's
    `doubleHex`, uncapped Worn Knife). Momentum halves on use; Hex banks and
    can be doubled — structurally asymmetric ceilings. Read the Playtest
    telemetry's Hex-share and per-tag damage before touching either; the
    candidate lever set (cap doubleHex, Momentum that doesn't fully halve,
    etc.) is content-pass / balance-session material, not a mid-playtest tune.

## Playtest-3 reports, second batch (2026-06-14, s4-economy)

Fixed/changed this session:
- **Starting gold 40 → 100** (designer ruling: 40 too low for first-shop
  agency). One line in `initialState`; reflected in the §14 changelog.
- **Call and Answer printed its link clause twice** — its `link.text`
  embedded "Link (Partner's card):", which the Card UI re-prefixes. Fixed to
  the convention (link.text = effect only) on base and upgrade.
- **Ascension picker ungated from partner presence** — see OQ#44.

Answered: **Binding does NOT carry across combats** (#4). `startCombat`
rebuilds every enemy's `boundTo` fresh from a per-combat coin flip
(`(enemyIndex + rng) % 2`); nothing persists between fights. And multi-enemy
fights SPLIT: a 2-enemy fight always binds one to each player, a 3-enemy
fight 2–1. So "all enemies on one player every combat" can't be literal for
the 2–3 enemy fights (those always hit both) — it's single-enemy ELITE/BOSS
fights, which ARE a pure per-combat coin flip, landing the same way by seed
luck across a short run. See OQ#45 for an optional fairness tweak.

44. **Ascension pick is fiddly / "doesn't seem to do anything before you open
    the room"** (designer, live). Two real causes: (a) the picker was gated
    behind partner-present, so a co-op host couldn't touch ascension until the
    partner connected — FIXED this session (ungated; the host's vote now
    persists into the partner's arrival). (b) The remaining friction is the
    **both-confirm** model (S4 chose "same pattern as concede"): in co-op a
    single player's pick records their vote but doesn't take effect until the
    partner picks the SAME level, and at START the server clamps the agreed
    level down to the LOWER of the two players' unlocked maxes — so a host who
    picks A2 next to a fresh-profile partner silently starts at A0. Design
    call: keep both-confirm, or make ascension a host-only lobby setting
    (clamped to the host's own unlock, with the partner simply along for the
    ride)? The latter matches how most co-op roguelikes handle difficulty and
    would remove the "nothing happened" feel. NEEDS a quick repro note: was
    the report solo or co-op, and did the other seat have unlocks? (Solo
    already auto-matches the bot's vote, so solo picks apply immediately.)

45. **Single-enemy binding is a pure coin flip → can streak onto one player**
    (from the #4 investigation). Multi-enemy fights self-balance, but elites
    and bosses (one body) bind p1/p2 50/50 each combat with no memory, so a
    run can randomly pile every elite/boss onto the same player. Not a bug —
    but an optional fairness tweak for the session: bias single-enemy binding
    toward whichever player has been bound LESS this run (anti-streak), the
    way some roguelikes de-randomize aggro. Cheap (a per-run bind counter);
    deferred as a design choice, not done unilaterally.

## Playtest-3 telemetry read (2026-06-14, two human full-clears)

Two pair runs, vess/bram, scales 1.5/1.35, both VICTORY (act-3 clear), ZERO
falls either run. `run-CADFM` = main/pre-S4 build (no gold/ascension fields);
`run-BVVSE` = s4-economy beta (gold telemetry + ascension:0).

- **Hex ≫ everything (confirms OQ#43 / #28, now with human data).** Hex share
  (Hex + HexScaling) = **64.9%** (CADFM) and **75.0%** (BVVSE) — far above the
  25–45% provisional band and the proposed 35–55%. HexScaling (Worn Knife +
  damagePerHex) is the single LARGEST bucket in both (898, 1371). Worn Knife
  ~**28 dmg/play** both runs (uncapped scaling, OQ#28). Detonation bursts
  **9.8 → 17.2 stacks/event** — the doubleHex (Saturate) engine. Strike sat
  flat (~709 both runs) while Hex ballooned. This is the strongest evidence
  yet that the Hex axis needs the OQ#28/#43 levers (cap doubleHex, cap or
  curve Worn Knife scaling). Strike/Momentum is not competitive.
- **Thread regen — data does NOT support a blanket +2→+1 nerf (OQ#39).** The
  beta run spent **101 Thread (~2/turn, ≈ regen)** with only **9 wasted at
  cap** and heavy Pulse use (**29 pulses**, 20/37 resonances pulse-bought) —
  Thread was a live, fully-used resource. The main run banked more (38 wasted,
  15 pulses). The difference is Pulse engagement, not regen being too fast; a
  +1 nerf would have starved the beta run. Recommend: leave base regen at +2;
  the §14.12 Pulse rework already made Thread matter. Re-check if a run shows
  high waste AND low Pulse together.
- **Gold/removals (OQ#8 + the 100 ruling).** BVVSE: removals ate **82% of all
  spend** (350g of 428; only 78g on cards), residual 89 on the OLD 40-gold
  start. Gold was tight and removals crowded out card-buying — supports the
  40→100 bump (more card agency). Escalation worked: each player self-capped
  at 2 removals (75 then 100). OQ#8 reads as a real constraint, not theater.
- **Difficulty (caveat, not an action).** Two skilled-pair full-clears, zero
  falls, at 1.5/1.35 — the anchor is likely soft for good players (the known
  designer-calibration caveat, §14.8). Don't move it mid-playtest; bank more
  runs incl. weaker pairs first.
- **Co-op health.** Link-fire 54–56% overall (healthy); BVVSE damage split
  even (vess 1370 / bram 1465), CADFM vess-dominant (72%). Pulse forcing is
  doing real work (forced links 15 → 29 across the builds).

46. **Enemy-applied Weak / Vulnerable / Fray wear off before they can act**
    (designer, live — both PT3 status notes are ONE bug). Player statuses are
    cleared at the START of the player's turn (`startTurn`: `frayed = 0`,
    `weak--`, `vulnerable--`), but enemies APPLY them during the enemy phase
    (end of `resolveTurn`). So a 1-stack lands at end of turn N and is wiped at
    the start of turn N+1 — before the next enemy phase (Vuln/Fray) or the
    player's next attack (Weak) can use it. Net: enemy Weak 1 / Vuln 1 do
    nothing, and **boss Fray does nothing at any amount** (Fray is hard-RESET
    to 0, not decremented — so the designer's "bump to 2/3" fixes Weak/Vuln but
    NOT Fray). Asymmetry note: player→enemy debuffs work (applied during the
    chain, used in the SAME turn's enemy phase) and thread-overdraft Fray works
    (applied during the player phase, active that same enemy phase) — only
    enemy→player-during-enemy-phase is broken.
    Recommended fix (one mechanic, fixes all three): route enemy-applied
    debuffs through a PENDING bucket that activates at the next `startTurn`
    AFTER the clear/decrement — exactly the existing `pendingFray` pattern (The
    Basin already does this for combat-start Fray). Then "1" means "lasts your
    next turn," matching the icons. Note this makes enemies meaningfully
    HARDER (their debuffs finally bite) — fine given the two zero-fall clears
    above, but it's a difficulty nudge, so flagged for a yes/no rather than
    done unilaterally mid-playtest. Content-bump alternative is viable for
    Weak/Vuln only and leaves Fray broken; not recommended.

    **RULED + IMPLEMENTED (designer, 2026-06-14): BOTH.** All enemy Weak /
    Vulnerable applications bumped 1 → 2, AND enemy-applied Weak/Vulnerable/Fray
    now defer to the start of the players' next turn via a `pendingStatus`
    bucket (activated in `startTurn` after the clear/decrement; thread-overdraft
    Fray stays immediate). Net: enemy Weak/Vuln last two effective turns, boss
    Fray bites for one. Difficulty nudge accepted (the two zero-fall clears had
    headroom). Covered by `pt3-status.test.ts`. §14.16.

## S5 sprint (2026-07-01, s5-balance)

47. **Second display-name collision: "Held Breath"** (found during S5.4 /
    OQ#36): the neutral common Stolen Breath's MUTATION form was named
    "Held Breath" — colliding with Bram's uncommon card of the same name
    (same table-talk hazard as OQ#36).
    **RULED + RESOLVED (designer sign-off, 2026-07-01):** mutation renamed
    to **"Caught Breath"**. Same sign-off also resolved OQ#36 (Gathering
    Slack's mutation "Stolen Breath" → **"Slipped Breath"**), OQ#34
    (Linked Shields partner Block 4 → 6), and amended sim gate 4: the
    Hex-share band applies to PAIR=vb only — mirror shares are telemetry,
    not gates.

## S8 sprint (2026-07-01, s8-witness-mutations)

48. **Witness voice register in co-op: whose codex?** (S8.7). The engine takes
    one `codexPct` per run (START_RUN), and the server currently passes the
    **MAX over the two seats' claimed codex fills** — chosen to mirror the S4
    union rule (a fresh player paired with a veteran plays with the veteran's
    unlocks; now they also hear the veteran's Witness). Consequence: the held
    reveal (§5b — the sacrament-quoting fall-rebind line, the quieter 70%
    registers) can reach a brand-new player early through a veteran partner.
    Alternatives: MIN (the reveal waits for the table's slowest codex —
    protects the held reveal, contradicts the union rule), or per-seat
    registers (the Witness speaks differently to each listener — Babel-true
    (§4) but needs per-viewer line projection, out of S8 scope).
    **RULED (2026-07-02, review-sweep B11): max-of-seats, ratified** —
    union-rule-consistent. Session consequence for the playtest: the host
    plays from a fresh profile, else the host codex pulls the quiet/high
    registers (possibly the sacrament quote) into a first-timer's first
    run.
