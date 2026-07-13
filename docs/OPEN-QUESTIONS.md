# Open Questions for the Designer

Conservative-reading + log protocol (working agreement). M1 entries were ruled on
2026-06 — rulings live in `docs/archive/threadbound_M2_plan.md` Part A and are folded into
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
    `docs/archive/S3-BALANCE-REPORT.md`): at the 1.5/1.35 anchor, vb resonates more
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

    **OQ#37 RULED (2026-07-05, S16-D9): theater HP bars animate per beat,
    APPROVED as a presentation part.** Client-held display value walked
    down per `damage`/`detonate` event; skip snaps to final. No engine
    replay — §11-clean by construction. *Implementation record (S16):
    verified ALREADY LIVE at `22a4061` (hpDelta/displayHp offsets, skip
    snap, enemy bars + player stats both consume them) — the ledger had
    never been closed; it is now. docs/archive/S16-STATUS.md Part 4.1. CLOSED.*

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

    **OQ#39 RULED (2026-07-04): CLOSED — base regen stays +2.** The PT3
    telemetry read stands (beta run: 101 spent ≈ regen, 9 wasted at cap,
    29 Pulses — a live resource; a +1 nerf would have starved it).
    Re-open only on a human run showing high waste AND low Pulse together.

40. **Let players Sever an ACTIVE chain link, not just Pulse dead ones** —
    "control where Resonance lands" (designer, live). Today Pulse forces a
    dead link to fire (§14.12); there's no inverse (suppress a firing link to
    re-shape a streak). A real new verb — feature for the design session, not
    a fix. Weigh against complexity: it inverts Pulse and adds a second
    chain-editing Thread action.

    **OQ#40 RULED (2026-07-05, S16-D10): PARKED.** No second chain-editing
    Thread verb lands mid-recalibration; revisit post-S16 with human
    Pulse-rate data.

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

    **OQ#41a RULED (2026-07-05, S16-D8): relic text names whose resource it
    grants**, adopted as a text CONVENTION. The affected relic retexts are
    strings: enumerate→propose→sign-off table at implementation
    (docs/archive/S16-STATUS.md, the D8 table — STALLS there until each string is
    signed). Effects untouched; OQ#41b (which relics become genuinely
    co-op) stays content-pass material, not this sprint.
    **RE-RULED (2026-07-06): the stall resolved toward presentation, not
    strings** — descriptions stay as written; the RelicBar now shows only
    relics the viewer benefits from (own relics + the partner's `coop:
    true` relics). The retext table is superseded, preserved for the
    record in docs/archive/S16-STATUS.md. CLOSED.
    **OQ#41b RULED (2026-07-06, S18 6c): PARKED to the content pass, as
    already scoped** — which relics become genuinely co-op is content-pass
    material; no S18 work.

42. **"Pass on Coveting" and "Onward" are redundant on the reward screen**
    (designer, live). True: ADVANCE auto-passes an undecided Covet in the
    reducer, so Onward already declines. The only thing the separate button
    buys is decline-but-stay-on-screen. Quick UI call for the session: drop
    the button (rely on Onward's auto-pass) or keep it as an explicit decline.
    Trivial either way once decided — left as a judgment call, not a bug.

    **OQ#42 RULED (2026-07-04): drop the button** — Onward's auto-pass is
    the decline. Rides S14.3 (docs/archive/threadbound_sprint_S14_instruments_reanchor.md).

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

    **OQ#44 RULED (2026-07-05, S16-D6): ascension becomes a host-only lobby
    setting**, clamped to the host's own unlock; the partner rides. The
    both-confirm model is retired. (Solo already auto-matched; now co-op
    matches the genre convention and kills the "nothing happened" read.)
    *Landed in S16: the S7.7 host-only dial was the first half; the clamp
    now reads the host's own unlock. CLOSED.*

45. **Single-enemy binding is a pure coin flip → can streak onto one player**
    (from the #4 investigation). Multi-enemy fights self-balance, but elites
    and bosses (one body) bind p1/p2 50/50 each combat with no memory, so a
    run can randomly pile every elite/boss onto the same player. Not a bug —
    but an optional fairness tweak for the session: bias single-enemy binding
    toward whichever player has been bound LESS this run (anti-streak), the
    way some roguelikes de-randomize aggro. Cheap (a per-run bind counter);
    deferred as a design choice, not done unilaterally.

    **OQ#45 RULED (2026-07-05, S16-D7): anti-streak single-enemy binding
    APPROVED.** Single-enemy (elite/boss) fights bias binding toward
    whichever player has been bound LESS this run (per-run bind counter).
    Multi-enemy split behavior unchanged. If the implementation alters the
    rng stream, the golden regen is forced, loud, and in its own commit —
    it lands inside this sprint's already-open re-anchor window. *Landed
    in S16: the rng stream is byte-identical (pinned); state hashes moved,
    golden regen in-commit. CLOSED.*

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

## S9b sprint (2026-07-04, playtest response)

49. **Thornward: the 19th restatement upgrade.** The S9b.2 parity gate's
    seeding scan found 19 upgrades deep-equal to their base, not the 18
    the S9b.3 table covers — thornward (V, C, 1: Gain 6 Block; Link (Hex):
    apply 2 Hex to ALL) was missed by the doc's count. Per
    enumerate→propose→sign-off it was NOT rewritten here; it sits alone on
    the covenant exemption list (loud, burn-down-checked). Proposed row for
    ruling, M2-B6 discipline (link deepened, non-Hex rider, no new Hex
    amounts): *Link: apply 2 Hex to ALL enemies and gain 3 Block.*
    **RULED (2026-07-04): proposed row accepted as written.** Landed with a
    pinning test; exemption list now EMPTY — S9b gate 1 reads clean.

50. **D8 → Branch A fired (T1): run length in band.** Baseline banked; the
    re-centering commit stays unspent. Filed per the S9b.4 paperwork rule.
    **CLOSED (fired branch, recorded).**

51. **D5 → Branch A signal at T1** (cross-player Reclaims occur and are
    articulated: "0-cost cards to start new links"). OQ#38 closes at T2 per
    the tier gate, not before. Re-read after S9b.1-3 (the reclaim list now
    shows arrival costs) in case cost-invisibility was steering target
    selection toward "mostly 0-cost cards". **SIGNAL LOGGED — T2 closes.**

52. **D9/D10 classification pending designer** (rite impact: duds vs
    concept; birth-rite read: stall vs intrigue vs no-registration). The
    fired EXECUTE joins the next sprint. NOTE: S9c pre-spends the likely
    verdicts (D9-C identity frame + first-draw naming = D9 Branch C's
    EXECUTE; D10-B pick line = D10 Branch B's EXECUTE) — if the designer
    classification lands differently, S9c's presentation commits already
    cover the stronger branch. **OPEN — designer.**
    **RULED (2026-07-04): D9 = Branch C** (identity communication failure;
    C's EXECUTE shipped in S9c, and S9d's grower redesign superseded the
    mechanical half) — CLOSED, no new work. **D10 classification DEFERRED:**
    the live read was "not impactful, not understood" (Branch-C class), but
    both halves were buffed after the observation (growers; braid arrival
    38–50% at act-2 L3) — re-observe at the next playtest (debrief question
    2 verbatim, unnamed). The D10-C EXECUTE (full-screen shrine treatment
    for the pick) stays UNFIRED pending that read.
    **S18 6e (2026-07-06): REMAINS on the playtest slate as filed** — the
    re-observe rides the first human playtest's pre-written agenda; no
    ruling owed, dated so the S18 ledger reads total.

53. **Linked Shields vs Immovable dominance evidence** filed to the §7
    guard-suite item: 7/6 vs 12/8 at equal cost; the niche (Guard
    self-trigger vs partner cross-play) exists but is illegible/underpriced.
    No action in S9b. S9d.A2 adds Immovable's partnerHeal 3 link to the
    same telemetry watch (same verb as Quiet Mending's A1 ritual, on the
    card the playtest already called strictly-better). **WATCH.**
    **S18 6e (2026-07-06): REMAINS on the playtest slate as filed** — the
    watch continues; dated so the S18 ledger reads total.

## S9c/S9d/S11 Wave A (2026-07-04, same branch)

54. **S9d grower rates retuned on first battery** (Knell per 2→3,
    Pyre-Brand 4→6, Mourner's 10→15) — the signed table read vb +8 /
    vv +11 vs post-S9c, outside the ±6 gate; retuned reads +7/+6/+4.
    Original rows in docs/archive/threadbound_sprint_S9d.md §S9d.1; evidence in
    docs/archive/S9B-S11-STATUS.md. **RULED (2026-07-04): retune RATIFIED**
    (vb's +7 read accepted as band-edge, pooled with escalation landing).
    Votive's tier shape (S9d.0-4) stands by the same ruling's default.

55. **S11.2 escalation calibration gate UNMET at ladder ×1** (last/first
    pair-HP ratio 1.07–1.27 vs the ≥2 gate). Recommendation: hold ×1 and
    treat the gate as open until S11.9 gives bots knot-pricing, then
    calibrate ladder and policy together (a steepened ladder against
    price-blind bots measures the wrong thing). PROBE DATA: a clean
    TB_ELITE_ESCALATION=2 battery (ladder 20/60/120, vb A0 ×200) reads
    ratio ~1.32–1.60 pooled ~1.44 — even doubling falls short of 2×,
    confirming the bottleneck is structural, not a constant.
    **RULED (2026-07-04): hold ladder ×1; the ≥2× calibration gate stays
    OPEN, to be calibrated together with S11.9 bot knot-pricing.** The
    open item moves to the S11.9 work queue, not this list.
    *S16 pointer: the composition lever (S16-D4, the knot sub-pool) landed —
    probe-leg ladder 1.09 → ~1.26; the ≥2 gate's stop-and-report decision
    packet is in docs/archive/S16-STATUS.md.*
    **RULED (2026-07-06, S18-D4): the ≥2 gate is RE-DERIVED — knot-2/knot-1
    pair-HP ratio ≥ 1.2 on the probe leg, a regression floor.** Braid paths
    meet at most TWO knots per act by construction; even a sub-pool of one
    tops out ~1.8 — the aspiration measured what the topology forbids. The
    floor banks the S16-D4 gain (final-build read 1.22–1.24, PASS). Option
    (b) per-run escalation returns as its own sprint if the post-D3 game
    still wants steeper knots; option (a) hot comps declined (×3 pierce
    lesson). **CLOSED into the S18 exit gates.**

56. **Battery environment offset**: this container reads the recorded
    S9a/S10a matrix ~8–26 points low on identical code+seeds (bb worst).
    All session gates were judged against same-environment baselines.
    Until the cause is found (cores/timing → bot concurrency?), treat
    cross-machine win-rate comparisons as unreliable; deltas within one
    environment hold. **OPEN — infra.**
    **RULED (2026-07-04): CLOSED-AS-MANAGED.** Absolute win rates are
    environment-local by standing policy; every gate is a same-environment
    pooled delta (n≥200 per S14-R5, which also banked the measured
    cross-invocation floor: ±7–10 pts/100-run leg, 61/99 same-seed flips).
    The real fix — a socket-free sim path (BotViews built from engine state,
    lockstep policy calls; per-run reproducibility) — is filed as a named
    backlog item, to land immediately before the first post-S15 sprint so
    its forced re-anchor is free.
    **Rider DISCHARGED (2026-07-06, S16 Part 1):** the socket-free path
    landed (engine-pure redaction, lockstep policy calls, per-run
    byte-reproducibility pinned), the re-anchor banked, and the offset's
    MECHANISM was identified — event-loop contention makes bots act on
    stale views, a one-directional misplay tax that scales with machine
    load. docs/archive/S16-STATUS.md carries the parity bridge.
    **CLOSED AS SUPERSEDED (2026-07-06, S18 6d), with verification.** A
    fresh container reproduced the S17 §12 exit board to the exact
    win-count on all three n=2000 rows (721/1118/1433 of 2000), repeat
    invocations are byte-identical, and tip-vs-S17.4-parent builds
    byte-compare equal at n=100 (mutations never fire under bot play).
    The offset was the WS-contention era; the socket-free path is
    deterministic per seed ACROSS environments. Evidence:
    docs/archive/S18-STATUS.md Part 6.

57. **Instrument gaps named**: "questions provable/run" (S11.3 target
    band) has no harness calculation — distinctEliminations is the proxy;
    "rite-card play rate" (S9c gate 2 direction read) is proxied by
    realized growth > 0. **CLOSED (2026-07-04): both real instruments
    landed** — questionsConfident/questionsNarrowed at run end, ritePlays
    per seat at the play site, sim readouts for both. Next battery reads
    the stated measures.

58. **Post-S11.5 win-rate drift ruled floor-demanded (gate 2 exception
    named).** Battery read vb 36 (pooled 600) / vv 26 / bb 34 — vb +11
    vs the S9d stage, outside ±6. Probe battery with deep stages
    DISABLED read vb 36 identically: the signed S11.5 stakes contribute
    ~zero; the drift is entirely the high-stakes [1,3] composition
    floor guaranteeing Broken Carillon + Drowned Hymnal (whose SHALLOW
    faces pay relic / rare card) on every flagged act-2 map, where
    queue weights previously buried plain events near-completely.
    **RULED (2026-07-04): re-baseline — the floor stays, the drift is
    named to it.** The post-S11.5 ledger row is the Wave A baseline
    for S11.6/S11.7 batteries. Human pricing of the gambles is a
    playtest read (bots are price-blind until S11.9). **CLOSED.**

59. **TB_KNOTWORK first battery: mirrors read +22 (S11.10 gate 2 UNMET).**
    vb 33 (−4 ✓) / vv 48 / bb 60 vs the Wave A baseline. Cause is
    structural, not per-fight: a strand-runner fights ~1 less per run
    (truth strand carries ≤2 combats incl. the opener) while taking more
    reward events; HP/combat is unchanged. PROPOSED quota amendment to
    the just-signed S11.11-4 table (one-line data changes,
    content/strand-targets.ts): truth combats ≥2 with events at exactly
    ≥3 (drop the 4th event slot for a mid combat); power combats ≥3
    (treasure moves to truth-only; the weave-wide ≥1 floor holds).
    Strand-runner fights return to ~5–6/act. Positive co-reads from the
    same battery, no action needed: D6/D7 improves on every measure vs
    the B6 ledger (gate 3 PASS), and the escalation ratio reads 1.45
    with knot-pricing live (from 1.03) — the ladder/policy joint
    recalibration has its instrument. **RULED (2026-07-04): the
    fights-vs-events-vs-treasure mix STANDS as a design choice — the
    quota amendment is REJECTED; the deeper systemic issue (card
    rewards don't seem to matter) becomes ITS OWN SPRINT.** Brief with
    all evidence, levers, and instrument needs: docs/S12-CARD-ECONOMY-
    BRIEF.md. S11.10 gate 2 defers to re-anchor after S12; TB_KNOTWORK
    stays default-off meanwhile. **CLOSED into S12.**
    **S20.1 (2026-07-06): the default-off rider is SUPERSEDED** — the
    ruling predated S15 ("the braid is the shipped game") and S18/OQ#65
    (lane topology unbanded). TB_KNOTWORK, TB_RITES, and TB_TRACKS are
    now the GLOBAL DEFAULT; flag-off bot runs are SUNSET; `=0` escapes
    remain for archaeology only (README table; the S20-R1 re-bank is
    the successor anchor set).
    DESIGNER HYPOTHESIS (2026-07-04, supersedes the quota amendment as
    the first lever): the inflation may indict the CARD-REWARD economy,
    not the fight count — a pair that routes around combat should do
    WORSE at the knots (their deck never grew), and instead they fight
    exactly as well (HP/combat 29.7 braid vs 29.6 Wave A — the single
    strongest datum). Card rewards may be too weak relative to relics
    (the S11.5 probe already showed one relic-bearing event/map = +11
    alone). Decomposition probe running: braid WITHOUT event-seeking
    (if mirrors stay hot → fight scarcity; if they cool → relic/event
    take), plus new economy instruments (relics + deck size per run,
    wins vs losses split). Bot-meta caveat applies (OQ#14): bots draft
    junk, so card value reads LOW on bot evidence — a card-economy
    rebalance should be sized against playtest reads too.

## S18 Tying Off (2026-07-06, docs/archive/S18-STATUS.md carries the evidence)

60. **gravebloom vs the S13.2 flat-hex-echo law (the S17.2 reverted
    buff).** **RULED (2026-07-06, S18-D5): THE LAW HOLDS.** Hex dominance
    was structural (OQ#28/#43); hookAll-hex past 2 is exactly what the law
    blocks, and bending it for one dead card licenses every floor-raise to
    petition. The D2 reshape did not lift it for free (flat, +5.2 → +5.0,
    same tool both sides). Different-axis enumeration PARKED at sign-off,
    nothing authored: (g-a) detonate-side rider (inside the ≤2 law);
    (g-b) draw hook on the existing partner-link trigger; (g-c) cost 2→1.
    Next audit/design session rules or discards. **CLOSED as ruled.**
    **g-row RULED (2026-07-07, S21-D5 by designer question): g-a — the
    detonate-side rider.** Second hook, first Detonation each turn
    re-blooms 2 Hex to ALL, inside the ≤2 law (flat, per-turn-capped,
    covenant-CI-checked); identity hook untouched. Paired battery: all
    movement attributes to gravebloom picks (vv ±0, vb −2 of 500; bb
    byte-identical — no vess seat); bots barely value it, the real read
    is the human table. Card text updated with the mechanics; St-g1
    signature row in S21-STATUS. **EXECUTED.**

61. **braided_censer effect trim (the S17 §12 stratified +5.4
    residual).** **RULED (2026-07-06, S18-D5): PARKED with a named
    trigger.** The residual is a bot-resonance-rate artifact until proven
    otherwise; fray/resonance items are where bot and human play diverge
    most. Trigger, pre-approved: if the next human playtest reads the
    censer as table-dominant, the trim is heal 2→1 — no new session
    needed. **PARKED.**

62. **Laws vs passes, generally.** **RATIFIED (2026-07-06, S18-D5) as
    standing procedure: laws outrank passes by default.** A pass that
    collides with a law stops and reports (S17.2's gravebloom revert is
    the model); a law bends only by its own sign-off row in a design
    session. **CLOSED.**

63. **Dead-shape cluster (measured_cut, slow_burn, tithe_of_thread,
    mendthread) + the Thread-glue pattern (votive_thread,
    litany_of_mending).** **RULED (2026-07-06, S18 6a): PARKED to the
    playtest pile.** Three S17 batteries prove scalar-immunity; whether
    Thread is over-supplied or bots under-bank it is adjudicable only by
    human data. Re-open trigger: first human playtest, Thread-banking
    debrief question, verbatim, unnamed. **No more +1s in the interim —
    ratified as a rule.** (S18 note: S-1 removed mendthread from the vess
    starter; it stays draftable and the playtest question is unchanged.)
    **PARKED.**

64. **Fray-relic trio (covetous_psalter, scar_votive, knotted_votive et
    al.).** **RULED (2026-07-06, S18 6b): PARKED.** Bots don't fray;
    these are the sloppier-human-pair relics by design. Human data rules.
    **PARKED.**

65. **S14-R1 band collision (S18 exit battery, stop-and-report fired).**
    The vb-default 40–55 band broke on the S18 final build (40.5 → 32.4)
    as a side effect of the D3 dose, which was ratified on the braid —
    the shipped topology (render.yaml runs TB_KNOTWORK=1). **RULED
    (2026-07-06): S14-R1 is RE-DERIVED onto the shipped topology** — the
    band binds vb at A0 on the BRAID at 45–55 (the S18-D3 target band;
    currently 48.6, mid-band PASS). Default-topology rows become
    REPORTED-not-banded (the fallback lane generator; its anchors are
    banked in docs/archive/S18-STATUS.md Part 8 for delta reads). Instrument
    change landed in sim.ts with the ruling. **CLOSED as re-derived.**
    **S20.1 (2026-07-06), the lane question SHARPENS:** with the canon
    flip the lane generator is now explicit-only dead config — no
    default path reaches it, no battery is owed on it, and its anchors
    are archaeology. Its DELETION is the natural next ruling; NOT taken
    in S20 (engine deletion is out of this sprint's scope beyond the
    flip itself). The 45–55 braid band this entry derived is itself
    superseded on the new canon — see OQ#70.
    **RULED + EXECUTED (2026-07-07, S21.5/D5): the lane generator is
    DELETED.** Own commit; both parity instruments byte-identical after
    (the braid canon provably cannot see it — no re-bank owed). The
    suite audit surfaced ten lane-pinned tests, dispositions on the
    record in S21-STATUS: the S11.1 composition-CI family (lib + test +
    script) measured only the deleted generator and left with it (the
    braid's own CI lives in s11-braid.test.ts); the tracks-covenant
    golden regenerated in-commit (flag-off runs are braid runs now);
    the S16-D7 anti-streak pin re-pinned to the invariant the mechanism
    actually provides (no 3-streak; strict alternation was lane-rng
    luck); the wrong-way clue:normal ceiling re-banked descriptively
    (the braid's truth strand is clue-scaled by design); lane rows
    dropped from the elite-sampling/pierce sweeps; lifecycle pins keep
    their transport coverage on the braid as ruled. TB_KNOTWORK is dead
    env; README says so. **CLOSED.**

66. **A3 tooth inversion (S18 fold-in read, reported per the S15 Part-3.3
    philosophy).** On the S18 final build, bb reads A2 17.5% → A3 20.0%
    (+2.5 — the A3 extra elite now PAYS at compressed win rates: its
    rewards outweigh its cost) and vb reads flat (22.2 → 22.4). The whole
    ascension curve steepened with the S17+S18 doses (S16-era A2/A3 read
    ~40s). **RULED (2026-07-06): REPORT → ROADMAP** — the
    ascension-implementation roadmap item inherits this as its first
    calibration input; every ascension number remains PROVISIONAL by
    design (ascension.ts header). No S18 scope grew. **FILED.**
    **READ + RULED (2026-07-07, S21.3/S21.4).** The full-grid survey on
    the new canon (docs/reference/s21-ladder-survey.txt) answered both
    halves: the S18-era A2/A3 cliff (~17–22) is NOT real on this canon
    (A2 reads 43–51 — the ladder floated with the S20 flip; A2-b as
    recommended: no tune, the read is filed); the A3 inversion IS real
    and now UNIVERSAL (A3 above A2 on all three pairings, paired
    per-seed net +18/+11/+16 of 500). **A3-a executed as recommended:
    the A3 extra crossing (CROSSING_LAYER_A3) pays NO card picks — a
    toll, not a knot; S16-D3's both-seat picks stay scoped to the base
    crossings; relic/covet/gold untouched; A0–A2 byte-identical by
    construction (parity PASS unchanged). Rung-3 copy retexted
    PROVISIONAL ("one more elite per act — a toll: its crossing pays no
    card picks"), signature row in S21-STATUS. A4 read as a bot no-op
    (OQ#64 blindspot — bots don't fray): REPORTED, unreadable by this
    instrument, human data rules it. A5 monotone and toothy (−9/−19/−17)
    — direction healthy, numbers stay PROVISIONAL. **CLOSED as ruled;
    the ladder's human calibration remains the roadmap item.**

67. **Co-op texture gate (1e) half-collision (S18 exit battery,
    stop-and-report fired).** vb kept the link-fire lead (55.6 vs vv
    45.1 / bb 51.7) but lost the thread-spent/combat lead to bb (3.90 vs
    4.18) — isolated to the ratified S-1: the vess starter's Thread
    generator (mendthread) left the deck while bram's kindle stayed, so
    the metric's old form was partly measuring starter composition.
    **RULED (2026-07-06): 1e RE-DERIVED — the link-fire lead is the
    binding half (the S3 thesis's cross-player signal); thread/combat
    becomes a REPORTED texture row.** Anchors for the reported row banked
    in docs/archive/S18-STATUS.md Part 8. **CLOSED as re-derived.**

## S20 First Impressions (2026-07-06, docs/S20-STATUS.md carries the evidence)

68. **Knot contact floor (braid elites are bypassable by design).**
    The S11.8 comment is explicit: bypassing a knot continues your
    strand — the crossing is the elite's reward, so a pair CAN route an
    act with zero elite contact. **RULED (2026-07-06): WORKING AS
    DESIGNED today; PARKED for the human read.** Free telemetry
    instrument already on the board: knot take-rate (map.knotsCut /
    eliteFights kill-order rows). The S11.11-1 "crossings stay scarce"
    pending row adjudicates with it at the same session. **PARKED.**

69. **Pulse legality read the UNGROWN def (S20.1 tracks-on audit,
    stop-and-report fired).** A mutated rite echo whose only Link is
    tier-granted (S9d growth) was a Pulse target everywhere that uses
    grownDef — resolution effects, client preview, bot policy — but the
    reducer's legality assert and computeForcedLinks read the ungrown
    effectiveDef: fleet livelock on 2–4% of rites-on runs, a spurious
    "no Link to force" for humans, a silenced solo partner. The
    pre-approved F-fallback did NOT dodge it (rites-only batteries
    stalled too). **RULED (2026-07-06): align the Pulse machinery on
    grownDef** (reducer legality + computeForcedLinks; regression test
    pins it). Byte-invisible to the rites-off canon (S19 parity PASS).
    **RESIDUAL, FILED:** computeLinksFired still reads the ungrown def,
    so a mutated grower's tier link fires only when FORCED, never
    naturally — a consistent rule, but worth an explicit ruling at the
    next design session. **CLOSED as ruled; residual OPEN.**
    **RESIDUAL RULED (2026-07-07, S21-D1): align `computeLinksFired` on
    grownDef** — the grown card IS the card all the way down (legality,
    preview, resolution, and natural fire agree; the S20.1 alignment
    completed). Paired same-seed battery n=500 ×3: every changed run
    attributes to rite_descant/rite_votive plays, zero non-grower
    movement; board-level drift −0.2/−0.15/+0.2 pts. Regression test pins
    the tier-granted echo link both directions. LOUD ruled re-bank per
    the S20-R1 convention (S21-R1, docs/reference/s21-p2000-bank.txt).
    **CLOSED entirely.**

70. **Band re-derivation owed on the S20-R1 board (re-bank re-read,
    stop-and-report fired).** On the all-flags-on canon the board
    floated up together (vv 67.1 / vb 69.7 / bb 76.2) with structure
    intact (gate 2 +6.5 IN, knot ratio IN, link-fire lead IN, floors
    IN). Three bands read OUT and **RULED (2026-07-06) convert to
    REPORTED-not-banded** rather than silently re-derive: the S18-D3
    vb 45–55 win band (69.7), the vb Hex-share 25–45 band (46.3), and
    the B22 reclaim <25% band (57–64% — it measured rites-off fleets;
    the S7.8 nudge now rides every canonical battery). Deriving fresh
    bands on the S20-R1 anchor set is the NEXT DESIGN SESSION's first
    instrument item. **OPEN — owed a session.**
    **CLOSED (2026-07-07, S21.2/D2 — the owed session).** Bands derived
    descriptively on the S21-R1 anchor set (docs/reference/
    s21-p2000-bank.txt; the anchor moved off S20-R1 by the ruled S21.1
    instrument event, paired attribution on record). The set: (2a) gate 2
    bb−vb ±8 RE-AFFIRMED as intent (reads +6.8); (2b) pair win tripwires
    ±5 of anchor per pairing at the canonical n=2000 same-seed board —
    drift alarms, not quality claims (anchors vv 66.9 / vb 69.6 /
    bb 76.4); (2c) vb Hex share 46.3 ±8 (reads 46.3; the old 25–45 was a
    lane-era read; mirrors stay telemetry); (2d) B22 reclaim <25% RETIRED
    — successor drift wire ±10 of anchor per pairing (vv 57.7 / vb 59.2 /
    bb 63.6); (2e) act-3 lethality JOINS the canonical report, baselines
    vv 1.0% / vb 2.5% / bb 2.3% of arrivals, NO band until the S18-D3
    texture target is re-ruled on human data; (2f) difficulty NOT
    re-dosed — the board is confounded and bot-read; FILED to the first
    human read with the S18-D3 texture framing attached (the human
    aggregator now prints the lethality line it will be read from).
    Wires encoded in sim.ts, binding ONLY at the canonical board form.

## S22 The Loom's Floor (2026-07-09, docs/S22-STATUS.md carries the evidence)

71. **Lore-bible open ruling #6 CLOSED (S22-D1, ruled in the charter):
    codex completion = per-question closure**, executed. Consequence
    taken WITH the ruling, needing a yes/no: "eliminated in some run" is
    adjudication, so the codex write at the Loom's Eye verdict now banks
    the shrine's pooled STRIKE-OUTS as eliminations alongside
    asserted-false answers (D1's own rationale — a pair that deduces
    efficiently eliminates more than it proves; a criterion reading only
    assertions would make completion a deliberate-wrong-answer grind).
    Side effect on the record: codexPct — the Witness register key —
    climbs faster for pairs who reach shrines; the voice arc inherits
    the criterion's recording rule. The S6.8 empty-eliminations test pin
    superseded with attribution (truth.test.ts). **RULED + EXECUTED;
    the recording-rule consequence OPEN for designer confirmation.**

72. **The client never sends `codexProven` in its claim** (found during
    the S22.2 claim work): profileClaim() has carried codexPct since
    S8.7 but never the proven-answer ids, so the S11.4 codex-keyed event
    doors (`requires.codexProven`) cannot open in production — only in
    tests and bot harnesses that hand-build claims. A one-line fix, but
    it CHANGES LIVE BEHAVIOR (veteran profiles would start opening
    doors), so it was logged, not landed (no S22 D-row covers it).
    **OPEN — designer; the fix is trivial once ruled.**

73. **Whose profile records the declaration (S22-D1b conservative
    reading, flagged):** the fifth question's answer writes to a profile
    only when THAT profile's own codex is complete — a partner with an
    unfinished book declares at the table but records nothing; the Eye
    comes to them when their own book closes (per-profile gestation).
    The union-precedent alternative (both profiles record; the partner's
    codex shows a final entry on an unfinished book) was NOT taken.
    Merge/normalize enforce the same invariant. **OPEN — designer may
    re-rule toward union; the conservative reading ships.**

---

## S23 — the design pass (2026-07-10, designer rulings in-session)

74. **S23-R1 — visual direction RULED: "the dark above, the table below."**
    The designer's read of the bare-bones report ("the top half and the
    bottom half feel too similar — no clean separation in presentation")
    became the anchor: enemies render as cool silhouettes in THE DARK
    (their intent line the only heat above the seam); the pair's half is
    THE TABLE (warm lamplit reliquary material); the Chain is the seam,
    strung on a lit warp. Ruled from four screenshot directions
    (Reliquary / Loom / Ember Rite / the blend); the blend anchors.
    Codified in **docs/STYLE-GUIDE.md** (new living doc, top level).
    Scope ruled WITH it: full client CSS pass, not tokens-only. CSS +
    enumerated display hooks only (`--seat-hue`, `--bound-hue`, `.hp-big`
    spans); zero engine, zero strings, zero layout logic; B6 untouched;
    suite green 460/460 before and after. **RULED + EXECUTED.**

75. **S23-R2 — one vendored display face RULED:** EB Garamond (OFL,
    latin subset, variable weight, ~44KB woff2, self-hosted at
    packages/client/src/fonts/ with its license). Names, emotional
    numerals, headers, the Witness, the wordmark. Fonts read as CHROME,
    not art — law 10 is about art sets; the designer may re-rule.
    Georgia remains the stack fallback. **RULED + EXECUTED.**

76. **`/?style` crashed on main since S22.4** (found during the S23
    survey): the Caretaker registers into ENEMIES as act 4 for
    lookup-only, and FullSetRow bucketed acts 1–3 literally —
    `byAct[4].push` threw and the designer's cheapest veto surface
    white-screened. Fixed in-pass (buckets derive from the registry's
    own acts; act-4 group labeled "the Loom's Floor"). A reminder with
    teeth: the style screen has no test pin, so registry-shape changes
    can kill it silently. **FIXED; a smoke pin for /?style is a
    candidate row for the next instruments pass.**

77. **S23 deferred deepeners (logged, not rules):** (a) planning-phase
    targeting threads — faint seat-hue strands from staged cards up to
    their targets, making "weaving upward" literal (SVG overlay, small
    client feature, wants its own sign-off); (b) enemy/hand scale
    asymmetry (pure CSS sizing). Neither needed for the two-worlds split
    to read; both stall until the designer asks. **PARKED.**

---

## S24 — the centering + braid declutter pass (2026-07-10, designer rulings in-session)

78. **S24-R1 — symmetric rail gutter RULED:** the S20.4 one-sided
    `padding-right` centered map and combat in the LEFTOVER space,
    ~146–180px left of the header's own center — the whole game read
    off-center once the rail landed (designer's report, this session).
    The gutter goes symmetric (`padding-inline`) on rail-mounting
    screens; past the app's 1500px cap it tapers away as the viewport's
    margins absorb the viewport-cornered rail; MapView's `availW`
    mirrors the CSS numbers and now also budgets the app cap (the old
    vw-only math let the braid outgrow its clipped column on wide
    monitors). `.enemies` wraps as the ~1100px-window safety. **RULED +
    EXECUTED.**

79. **S24-R2 — braid cord declutter RULED** (three riders picked
    together): the vertical WEAVE (neutral cords leave and arrive
    vertically — steep, uniform crossings; the hung-thread sag retired
    on the map), RIM TIES (cords trim at the medallion rims with
    label-side clearance; ink halos on node lettering), and GRADUATED
    EMPHASIS (`.cord-far` past one layer ahead; dead cords fade harder
    and stop rendering more than a layer behind). The warps, the trail,
    live picks, and every edge/pick rule untouched — presentation only.
    Codified as STYLE-GUIDE §7. Freebie found in-pass: a stale
    `.map-picks` 0.95em duplicate at styles.css's tail had silently
    overridden the S20.3 1.08em step-up — removed. **RULED + EXECUTED.**

80. **S24-R2 RE-RULED same session (designer veto on the first cut):**
    the vertical weave + distance fade shipped in the morning pass made
    the braid tidy and UNREADABLE — cords entering every node vertically
    all arrive alike, so a route could not be traced, and the .cord-far
    fade dropped the whole structure to 19% right when an act starts
    (position -1 puts everything past layer 0 "far"). Navigation
    outranks tidiness. Re-cut: TAUT DIAGONALS rim to rim (every cord
    points at its destination), full 34% weight for every reachable
    route cord (.cord-far retired), rim ties + halos + dead-edge
    cleanup kept, plus a ROUTE PREVIEW — the hovered / pad-focused node
    lights its onward cords (.cord-hot; pointer hit-test on the field
    because disabled buttons swallow mouse events, a .gp-focus
    MutationObserver for the pad). STYLE-GUIDE §7 rewritten to match.
    **RE-RULED + EXECUTED.**

---

## S25 — the planar braid (2026-07-11, designer rulings in-session)

81. **S25 — NO CORDS CROSS, EVER (designer law, ruled after two S24
    styling passes couldn't untangle what generation tangles):** the
    braid's embedding is now planar BY CONSTRUCTION, and
    s25-planar.test.ts (drawn-x mirror of the client, 100 seeds × both
    acts × A3 on/off) fails any regression. The rulings, in order:
    (a) **the breath is ONE shared rest** — the two identical rests were
    a fake pick that could only feed the mismatch penalty, and their
    both-strands-to-both-rests edges were the map's biggest X;
    (b) **A3's crossings respace to [1,3,5]** — adjacent knots (the old
    [2,4]+5) cannot both offer both-strand access planarly; the S11.11-1
    pending ruling is ruled in this form, and the S21 toll knot stays
    keyed to layer 5 (still the deepest knot);
    (c) **only the center-nearest slot enters a knot, and knots release
    onto each strand's nearest slot** — far-slot cords would cross the
    strand's own continuation (the widened micro-choice moves one pick
    earlier);
    (d) **strand sides are FIXED; the warps pinch at knots instead of
    X-ing through them** — found by the new test, not the eye: the
    side-flip forced BYPASS edges to swap sides mid-air, and two paths
    can only swap sides planarly through a point the bypass skips. The
    crossing stays real in the rules (strand switch = take the elite).
    The over/under casing retired with the mid-air X it sold;
    (e) **the warp threads the widened inner slot beside knots**, making
    every warp segment a real edge (edge-planarity covers the warps —
    also test-pinned).
    ENGINE CHANGE (edges + one node fewer + A3 layers), the first since
    the visual passes began: suite 464/464 (3 new planar tests + warp
    pin), tracks-covenant golden regenerated IN the commit per its own
    protocol, 50-run sim completes (the act-2 link-fire band miss
    pre-exists on main: 62.1% there / 61.1% here; n=2000 board pending
    per S21-R1). **RULED + EXECUTED.**

---

## S26 — the five stations (2026-07-12, designer rulings in-session)

82. **S26 — braid map geometry law RULED: the knotwork schematic.**
    The geometry fork (panel 1, straight strand rails + lens splits +
    diamond chords at knots, vs. panel 2, the woven rope with rails
    bending through knots) ruled for panel 1 ("Yeah, I think panel 1 is
    better") — the rope variant puts the heaviest ink back on the
    zigzag and implies the default route runs through the elite. The
    law: every drawn x belongs to one of five stations (truth rail,
    truth inner, center, power inner, power rail) and every cord is one
    stroke from the chord alphabet {0, RAIL−INNER, INNER, RAIL}.
    Constants (RAIL = clamp(96, 0.9·ROW, 150); INNER = 0.55·RAIL; PAD)
    PROVISIONAL to the S26 screenshot gate (G1). The station map is a
    monotone remap of the S25 x-order — same embedding, narrower — so
    s25-planar.test.ts passes untouched and s26-stations.test.ts pins
    the alphabet (not the pixels). **RULED + EXECUTED.**

83. **S26 — warp overlay retired; the rail IS the strand; one ink
    pass.** The warp builder (a second geometry over the same rooms,
    most of the spaghetti: center-pinch at every knot + inner-slot
    threading at 25–35° in the heaviest ink class) is deleted;
    within-strand edge segments collectively ARE the continuous rail.
    Seat hues (--p1/--p2) never key map geometry again — warps AND the
    .mapnode.strand-* borders re-keyed (the blue-vs-orange threads read
    as "my path vs. theirs" in a game about walking together; the
    reservation law lands in STYLE-GUIDE §5). Material RULED D2a
    (designer 2026-07-12, "I'll take your recommendation for D2a"): ONE
    undyed warp material for both strands, new token --warp #7d7060 —
    the warm palette is crowded, and on a fixed-sides planar map,
    position already answers "which strand am I on." D2b (two material
    hues: verdigris truth #9db4a4 / worn-copper power #a98262) rejected
    for the record — the copper's clearance from --enemy-warm and --p2
    was genuinely tight; if M2 (naming the rails) is ever taken up and
    wants hue support, D2b's swatches are the starting point. Hex
    gate-tunable with G1; the SHAPE (one material, not two) is the
    ruling. **RULED + EXECUTED.**

84. **S26 — severance grammar RULED: ink on the field means your
    history or your future.** A door stood at and refused leaves a
    severed stub (14·scale straight stroke along the chord bearing +
    two fray ticks, --line-soft @ 0.32 — the dead fade carries over,
    the dash dies); a route that was never the pair's renders NOTHING
    (the second declutter dividend — those branches used to persist as
    dashed hairlines). Replaces both .cord-dead and the S24
    hide->1-layer-behind rule on braid maps. The fray RHYMES with the
    soul-thread's severed state and shares nothing of its danger
    register — never --danger here (the soul-thread's wound is live
    drama; map stubs are cold history). Stub constants PROVISIONAL
    (G3). Retract animation skipped per spec (static stubs are the
    spec; the animation was garnish). **RULED + EXECUTED.**

85. **S26 — preview reweights, never adds; one hop.** Hover / pad
    focus toggles .previewing on the map SVG: the focused node's onward
    cords take .lit (the cord-hot treatment applied to already-rendered
    ink — the class renamed with its semantics), everything else dims
    to 0.45 (PROVISIONAL, G4); .cord-live and .cord-trail NEVER dim
    (the thread-gold reservation and the live-pick read outrank the
    preview); severed stubs dim with the field. Kills the "highlight
    adds an extra line" artifact at the root — the S24 hot-over-warp
    exception died with the warps. Rider: the full-trace-to-boss
    deepener stays PARKED — safe under this grammar (zero added ink)
    but it can still fight the live-pick read; it wants its own ruling
    with the reweight system in hand. **RULED + EXECUTED.**

86. **S26 — D4 (labels leave the field) HELD.** Gutter labels; bearings
    demoted to sigil + hover, possibly the Witness rail — strings, so
    not this sprint. Re-open triggers: the TB_TRACKS Part 2 verdict
    lands, OR the S26 gate shows label/chord collisions at the narrowed
    field. Minor collisions are handled inside S26 by widening PAD or
    clamping label width — never by silently pulling D4 forward.
    **HELD.**

87. **S26 — the mechanical candidates PARKED.** M1 fixed act glyph
    (pin widened layers per act, not per seed — engine + golden churn);
    trigger: seed-varied shapes annoy in human playtest. M2 strand
    identity made legible (naming the rails — strings); trigger: taken
    up with D4 post-TB_TRACKS. M3 layer diet / widened-layer removal;
    trigger: the map still reads busy after the S26 gate. **PARKED.**
