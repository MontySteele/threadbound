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
