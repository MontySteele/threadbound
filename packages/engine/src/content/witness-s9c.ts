// S9c Witness pools (S9c.2–S9c.4). ALL STRINGS PROVISIONAL — designer read
// against the never-lies / wrong-way fences gates the merge (S9c gate 4).
//
// Register (S9c.3): disdain with an edge of reluctant recognition — the
// Witness has seen funerals; it has not often seen them shared. Fences:
// never lies, never explains the pip economy, no wrong-way lines.
//
// Every pool here fires only from rite-gated triggers (rite cards exist
// only in rites-flagged runs), so unflagged rng consumption is untouched
// by construction.

export const S9C_WITNESS: Record<string, string[]> = {
  // S9c.3 — a player Reclaims the PARTNER's rite card. At most once per
  // combat (combat.riteReclaimSaid); standard rotation via no-repeat.
  rite_reclaim: [
    'That was made for their hands. It seems not to mind yours.',
    'Grave-goods, borrowed. The dead keep poor inventories.',
    'You wear each other’s mourning now. How economical.',
    'A rite passed hand to hand. The Machine files that under “irregular.”',
  ],

  // S9c.4 / D10-B — the birth pick exists and is yours; zero explanation
  // of stakes or economy. Single line + no-repeat = once per run.
  rite_birth_pick: [
    'It wants naming. That part, at least, is yours to do.',
  ],

  // S11.7 — the toll door resolves: one seat healed, by agreement. Fires
  // only at toll variants (flagged maps only carry them). PROVISIONAL.
  toll_door: [
    'One of you, mended. The other, edified. The door considers this fair.',
    'The door asked its question and you answered together. It keeps a list of couples who could not.',
    'A single mercy, split zero ways. The Undercroft admires clean arithmetic.',
  ],

  // S11.7 — a Covet charge spent on the cache's remainder. Fires only at
  // covet variants (flagged maps only carry them). PROVISIONAL.
  covet_cache: [
    'Both, then. The case was a question about you, and you answered it.',
    'The rite has provisions for wanting everything. You have just used one.',
    'Coveting from a locked box now. At least the box will not resent you.',
  ],

  // S11.3 — the bound witness: an elite kill pays a guaranteed fragment
  // (combat paying narrative). Register: the collector at work. PROVISIONAL.
  bound_witness: [
    'Hold still. I am reading what it was.',
    'Every snarl is a record of what snagged. This one kept accounts.',
    'It fought like something with a story. I have taken the story.',
    'The Machine unpicks the dead. I merely take notes.',
  ],

  // S9c.2 — existence-naming on the rite card's first draw of the run:
  // what it is, never what it's for. One line per card; the single-line
  // pool + no-repeat-within-run machinery IS the once-per-run fence.
  rite_first_draw_rite_shroud: [
    'Shroud-work. Funeral cloth, cut for the living to wear. She does not intend to wait for the occasion.',
  ],
  rite_first_draw_rite_votive: [
    'A Votive. Grief, paid for in advance. At least someone here keeps accounts.',
  ],
  rite_first_draw_rite_knell: [
    'That is a Knell. A bell gets rung once per ending. She carries hers loose.',
  ],
  rite_first_draw_rite_vigil: [
    'A Vigil. Someone taught her that watching the dying is work. They were not wrong.',
  ],
  rite_first_draw_rite_toll: [
    'A Toll. The crossing-price, carried in hand. He means to pay it personally.',
  ],
  rite_first_draw_rite_pyre_brand: [
    'Pyre-Brand. A coal taken from the fire that took the rest. It has not forgiven anyone either.',
  ],
  rite_first_draw_rite_mourners_step: [
    'The Mourner’s Step. There is a gait for carrying weight. He did not learn it here.',
  ],
  rite_first_draw_rite_descant: [
    'A Descant. The high line sung over the coffin-line. Funerals have arrangements. Apparently.',
  ],
};
