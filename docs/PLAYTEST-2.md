# Playtest 2 Checklist (M2 sign-off → §12 "full run attempt")

Setup: `npm run server`, two machines (or two tabs: `/` and `/?tab=2`).
Target: one full run attempt per character assignment (Vess/Bram, then swap).
Expected length 60–75 min per clear (§8).

## Core questions (from §12-M2)

- [ ] **Difficulty curve** — Act 1 should hurt (~8+ HP lost per combat between
      you) but be winnable; Act 2 should demand the Thread actions; did any
      fight feel unloseable or hopeless? Note WHERE.
- [ ] **Deck identity** — by the Act 1 boss, does Vess feel like control/set-up
      and Bram like tempo/payoff, even after Covets? Did the starter cards
      (Hatpin/Jab) make early drafting feel meaningful?
- [ ] **Does cross-pollination earn its complexity?** Use Reclaim at least
      twice (mutations!), spend Covets, and — if the Wedding Knife shows up —
      trade. Was each one a conversation?

## M2 systems to deliberately exercise

- [ ] Path negotiation: disagree about a map node at least once (the Witness
      has opinions at 3 disagreements).
- [ ] Hands now discard at end of turn: does planning feel tighter or just
      punishing? Do Keep cards and Kindled read clearly in the UI?
- [ ] Get someone **Fallen** at least once (it will happen): does the
      slack-Thread solo turn prove the Covenant floor? Is revival at 1 HP
      legible and dramatic?
- [ ] Shop: was the shared purse a negotiation or a formality?
- [ ] Upgrade at a rest site: do "deepened link" upgrades feel like the
      interesting choice vs healing?
- [ ] Fight the Choristers (Act 2): is the unbound/untargetable body + sever
      rotation comprehensible without explanation?
- [ ] The Unraveled: does the 2-turn sever phase land as the thesis statement
      ("your engines must briefly survive solo")? Is the reignition at 10 a
      release?

## Telemetry to compare against the bot baseline

After your runs, run `npm run sim` and compare your felt experience against:
win rate ≤40% (bots) — you should do better; link-fire Act 1 ~35% / Act 2 ~42%
(bots) — you should beat both on voice; Hex share 20–30% in a Vess-led pair.

## Known rough edges (don't report these)

Retain-picker for the handRetainOne relic (auto-retains first card for now);
AI portrait pass not yet generated (sigil set is the shipped art);
difficulty calibration (M3 Part A) deliberately waits on this playtest.

## M3 additions to exercise (controller playtest)

- [ ] Full run on the pad, no mouse (M3 Part E sign-off): zones via L1/R1,
      stage with ✕, inspect with △, hold Options to Ready, L2/R2 reorder.
- [ ] /?style — review the style sample BEFORE asset generation (cheapest veto
      point for art direction; sigils are the shipped set).
- [ ] Does the resolution theater pace right at ~400ms/beat? Is skip (click/○)
      discoverable?
- [ ] Tooltips: hover anything confusing — does the keyword panel answer it?
- [ ] Tutorial: clear localStorage (or new browser) and check the First Chain
      steps make sense to a fresh player.
- [ ] Volume sliders (♪, top right) — are the synth SFX tolerable on speakers?
- [ ] To record your session for calibration: `node packages/server/dist/index.js --human-session`
      (writes per-run telemetry JSON to ./telemetry/ — bring these to Part A).
