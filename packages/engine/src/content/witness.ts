// The Witness (§10, §13.3): line pools drawn with no-repeat-within-run.
// Text authored in docs/m1-writing.md. He holds the sarcasm monopoly.

export type WitnessContext =
  | 'combat_start'
  | 'combat_victory'
  | 'player_death'
  | 'rest_site'
  | 'covet_pick'
  | 'resonance'
  | 'fray'
  | 'elite_mourner_intro'
  // §14.11 starter payoffs: one line each, first occurrence per run (solo + pair)
  | 'worn_knife_first'
  | 'knuckle_crack_first';

export const WITNESS_LINES: Record<WitnessContext, string[]> = {
  combat_start: [
    'Ah. Violence. How novel.',
    'Do try to die somewhere convenient.',
    "I've watched this fight a thousand times. Surprise me.",
    'They look hungry. You look edible. Proceed.',
    "Begin, then. I'll be here. I'm always here.",
    'Another scuffle. The thread trembles with what I assume is excitement.',
    'Weapons out. Wits optional, apparently.',
    'Go on. The dead are patient, but I have standards.',
  ],
  combat_victory: [
    'Congratulations. The corpses are very impressed.',
    "You survived. Lower your expectations and it's almost a triumph.",
    "Adequate. I've embroidered that on nothing.",
    'Victory. Do savor it; the Undercroft rarely repeats a kindness.',
    'Well fought. By one of you, anyway.',
    "It's over. Try to look like you planned it.",
    'Still breathing. The thread and I are equally astonished.',
    'Splendid. Now drag yourselves onward before something notices.',
  ],
  player_death: [
    "Down they go. I'd weep, but I left my tears in another century.",
    'One falls. The thread pulls taut. This is the part that hurts.',
    'Dead. Or resting ambitiously. The distinction matters less down here.',
    'I did mention the dying. Repeatedly.',
    'Half of you remains. Mathematically, this is going poorly.',
    'There they go. The thread remembers. Unfortunately, so do I.',
  ],
  rest_site: [
    "Sleep. I'll keep watch. It's not as if I have a choice.",
    "Rest, by all means. The horrors will wait. They're polite that way.",
    "A fire. How rustic. Do warm yourselves; you'll cool soon enough.",
    'Close your eyes. I never get to. Enjoy that for me.',
    'Naps in a tomb. Bold choice of venue.',
    'Mend, stitch, snore. The usual rituals of the briefly alive.',
  ],
  covet_pick: [
    'Taking their leavings? How dignified.',
    "One person's trash, another's strategy. Allegedly.",
    "They didn't want it. You do. This says something about you.",
    'Coveting already? The commandments saw you coming.',
    'Yes, take it. Scavenging from your dearest. Very touching.',
    'Their castoff, your treasure. Marriage is built on less.',
  ],
  resonance: [
    'Oh. You actually coordinated. Note the date.',
    "The thread sings. Don't let it go to your heads.",
    'Resonance. Even I felt that. Mildly.',
    'Look at that — two minds, one thought. Crowded, I imagine.',
    'The chain ignites. Almost as if you spoke to each other first.',
    "Harmony. Fleeting, accidental, but I'll record it anyway.",
  ],
  fray: [
    'You overdrew. Now you both pay. Poetry, really.',
    'The thread frays. So does my patience. Only one of us heals.',
    'Greedy. Both of you. The thread keeps receipts.',
    'Snap. That sound was your shared judgment.',
    "Frayed. A bold word for 'we didn't do the arithmetic.'",
    'You pulled too hard. The thread bites back. It learned that from me.',
  ],
  elite_mourner_intro: [
    'The Mourner. It feeds on loneliness. You two should be perfectly safe. Probably.',
    'It grieves for those who fight alone. Give it nothing to mourn.',
    'Ah, the Mourner. Play selfishly and it will love you to death.',
  ],
  worn_knife_first: [
    'The Worn Knife. It does not break a curse — it reads one. Sharper for every stitch she leaves in.',
  ],
  knuckle_crack_first: [
    'There it is: her curses, your knuckles. Perhaps this marriage will work after all.',
  ],
};
