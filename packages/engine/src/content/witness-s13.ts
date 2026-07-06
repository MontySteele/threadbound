// S13.4 Witness pools — the rare legibility rider (D5). The Witness NAMES a
// rare the first time it joins a deck (any acquisition channel: reward pick,
// covet, shop, event), the S9c D9-C first-draw naming machinery on the PICK
// trigger: one authored line per draftable rare, single-line pools, and the
// no-repeat-within-run rotation IS the once-per-run fence.
//
// ALL 26 LINES RATIFIED — designer witness read passed 2026-07-04 (D5;
// S9c gate-4 precedent). Edits from here are content changes, not drafts.
// S17 bucket moves (ruled 2026-07-06): four rares demoted (aftershock,
// stokers_due, selvage, unbroken_line) — their lines retired with them,
// preserved in docs/S17-POWER-AUDIT.md; two uncommons promoted to rare
// (pale_unmaking, rend_the_weave) — their naming lines RATIFIED at the
// 8b sign-off (designer, 2026-07-06).
// Register (S9c.3): disdain with an edge of reluctant recognition. Fences:
// existence-naming — what the card IS, never what it's for; marks the
// card's weight without promising outcomes; never lies; no pip economy.
//
// Rite vestments are named at first DRAW (witness-s9c.ts) and are excluded
// from this trigger in the reducer — a vestment is not a spoil.

export const S13_WITNESS: Record<string, string[]> = {
  // ---- Vess ----------------------------------------------------------------
  rare_first_pick_gravebloom: [
    'Gravebloom. It flowers where her partner strikes. Graves do feed a garden.',
  ],
  rare_first_pick_final_word: [
    'The Final Word. Every argument she has been saving, spent in one breath.',
  ],
  rare_first_pick_funeral_lace: [
    'Funeral Lace. Fine work. It is only ever seen finished at the end.',
  ],
  rare_first_pick_widows_arithmetic: [
    'Widow’s Arithmetic. What is already owed, counted twice.',
  ],
  rare_first_pick_tally_of_griefs: [
    'A Tally of Griefs. It lengthens as the Chain does. Lists are like that.',
  ],
  rare_first_pick_needles_verdict: [
    'The Needle’s Verdict. It reads what the Hexes wrote, then closes the case.',
  ],
  // S17 promotions — RATIFIED (8b sign-off, 2026-07-06)
  rare_first_pick_pale_unmaking: [
    'Pale Unmaking. She writes the curse and reads it out in the same motion.',
  ],
  rare_first_pick_rend_the_weave: [
    'Rend the Weave. A tear that takes the stitching with it — when there is stitching to take.',
  ],
  rare_first_pick_eye_of_the_loom: [
    'The Eye of the Loom. It watches over both of you. Do not mistake that for kindness.',
  ],
  rare_first_pick_borrowed_hour: [
    'A Borrowed Hour. Time taken now, repaid next turn. The Machine keeps the note.',
  ],
  rare_first_pick_loom_of_hours: [
    'The Loom of Hours. It pays out a little every turn, the way patient debts do.',
  ],
  rare_first_pick_keepsake: [
    'A Keepsake. What returns through her hands comes back with something folded in.',
  ],

  // ---- Bram ----------------------------------------------------------------
  rare_first_pick_avalanche: [
    'An Avalanche. It falls, and keeps falling. In company, it falls longer.',
  ],
  rare_first_pick_wildfire_heart: [
    'A Wildfire Heart. His momentum stops apologizing for itself.',
  ],
  rare_first_pick_call_and_answer: [
    'Call and Answer. The old form: one voice strikes, the other is already replying.',
  ],
  rare_first_pick_relentless: [
    'Relentless. Four blows. He means all of them.',
  ],
  rare_first_pick_cinderfall: [
    'Cinderfall. The whole field burns at once — if the kindling was laid.',
  ],
  rare_first_pick_final_bell: [
    'The Final Bell. Rung once, properly. Everything after it is aftermath.',
  ],
  rare_first_pick_immovable: [
    'Immovable. He stands, and the standing spreads to whoever stands with him.',
  ],
  rare_first_pick_ash_harvest: [
    'An Ash Harvest. He sows the burning and reaps it in the same breath.',
  ],
  rare_first_pick_share_the_fire: [
    'Share the Fire. Warmth, passed hand to hand. The Undercroft remembers the custom.',
  ],
  rare_first_pick_bellmetal: [
    'Bellmetal. Struck in harmony, it keeps ringing into his hands.',
  ],
  // ---- Neutral ---------------------------------------------------------------
  rare_first_pick_two_as_one: [
    'Two as One. The Machine files you jointly now. There are provisions for that.',
  ],
  rare_first_pick_crossing_blow: [
    'A Crossing Blow. It lands hardest where your paths cross.',
  ],
};
