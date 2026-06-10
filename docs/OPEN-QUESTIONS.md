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
