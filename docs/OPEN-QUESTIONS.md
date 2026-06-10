# Open Questions for the Designer

Where the design doc was ambiguous, M1 implements the most conservative reading
and logs the question here (per working agreement). Each entry: question →
what M1 does today.

1. **Hand persistence.** §2.1 says "each player draws **to** 5", implying hands
   persist between turns (and draw effects matter beyond the current turn).
   → M1: hands persist; unplayed cards are kept; draw-to-5 tops up; hand cap 10.
   Without this, Reclaim (resolves before the Chain, §5) and all draw effects
   would be dead letters under simultaneous planning.

2. **Is `Link (any)` self-similar?** §2.3 bans "tag X with Link (X)" at common.
   A `Link (any)` card technically includes its own tag but can be fed by every
   tag, so it can't drive mono-keyword spam. → M1: `Link (any)` is allowed at
   common (Needlework, Wardknot, Second Wind). Flag if you want it stricter.

3. **Momentum application.** §4: "your next Strike deals +N, then Momentum
   halves." For multi-hit Strikes (Avalanche), does +N apply per hit or once?
   → M1: once, on the first hit (conservative). Halving (floor) occurs after the
   Strike resolves; Wildfire Heart / linked Haymaker skip the halving.

4. **Energy gained during resolution.** Under simultaneous planning, energy
   gained mid-resolution can't be spent (planning is over). → M1: `gain energy`
   ops on *base* effects raise that player's staging budget during planning
   (Second Wind, Spindle Step effectively read "this turn you may stage 1 more
   energy's worth"). Two link-clause energy grants were redesigned to partner-draw
   (Quickening, Call and Answer) because link-granted energy would do nothing.

5. **Detonation vs Block.** §4 doesn't say whether Hex detonation damage is
   absorbed by enemy Block. → M1: detonation ignores Block (poison-idiom,
   protects the set-up/payoff fantasy). Flip in one line if undesired.

6. **Steady's "remove a Frayed stack."** From whom? → M1: removes one stack from
   *both* players (Fray is always applied to both), else banks a shield that
   prevents the next Fray this turn.

7. **The Mourner's timing.** "Gains strength each turn the Chain contains 4+
   consecutive cards from the same player" — before or after it acts that turn?
   → M1: immediately after Chain resolution, so the punishment bites the same
   turn. (This is the *harsher* reading; chosen because the elite's lesson is
   the point. Flag if it should lag a turn.)

8. **Player death.** Does the run end when one player falls? → M1: yes — either
   player at 0 HP ends the run (full roguelike, §13.6). Down-but-not-out
   mechanics would be new design.

9. **Starter decks.** Not specified in the design doc. → M1: 10-card starters
   composed from each character's common pool (see `cards.ts`). Dedicated
   starter-only cards (StS-style Strikes/Defends) are an M2 decision.

10. **Rest-site Upgrade.** §8 lists "standard rest/upgrade" but M1 has no card
    upgrades. → M1 rest options: Rest (heal 30%), Barter (+1 Covet), Re-braid
    (+1 max Thread, once/run). Upgrades arrive with M2 content.

11. **Standard (non-crossed) event chooser.** §8 doesn't say who decides at a
    standard event. → M1: a seeded-random player is both subject and chooser.

12. **Bot link-fire telemetry.** Greedy bots land at ~38–42% link-fire rate —
    at/under the 40–60% design band (§11). Humans coordinating on voice should
    land higher (bots can't plan around each other's unstaged hands). Watch in
    Playtest 1 before touching content.

13. **Difficulty.** Greedy bots win 100% of runs (52/52 combats in the 50-combat
    sim) without ever using Steady defensively or alpha-ordering the Chain.
    Act 1's first third should probably threaten more. §9 calls all numbers
    placeholder-grade — recommend +15–20% enemy HP/damage after Playtest 1
    confirms the bots aren't just outplaying humans.
