// The Witness (§10, §13.3): line pools drawn with no-repeat-within-run.
// Text authored in docs/m1-writing.md. It holds the sarcasm monopoly.
//
// S8.7 never-lies audit (lore bible §4, RATIFIED): the Witness never states
// falsehoods — it withholds, deprecates, misdirects by omission, and deflects
// where it does not know. It never lived, never died, and had no masters; no
// line may assert a mortal biography. Mere antiquity ("centuries") is fine.
// No real-world scripture or calendar. And it is "it", never "he".

export type WitnessContext =
  | 'combat_start'
  | 'combat_victory'
  | 'player_death'
  | 'rest_site'
  | 'covet_pick'
  | 'resonance'
  | 'fray'
  | 'elite_mourner_intro'
  // S15.2A (D5, PROVISIONAL): the pierce enemy's telegraph in the Witness's
  // voice — same pattern as the Mourner intro, keyed on its encounters
  | 'seamripper_intro'
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
    "Down they go. I'd weep, but weeping was never in my design.",
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
    'Coveting already? The rite has provisions for your kind. Filed under inevitable.',
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
  // S15.2A (D5, PROVISIONAL until the sign-off table): never-lies audit —
  // no biography, no falsehood; the mechanic stated straight, sardonically
  seamripper_intro: [
    'The Seamripper. Your guard is a seam like any other. It knows the way through.',
    'Block it all you like. The needle was never aiming at the wall.',
    'It took the choir apart one stitch at a time. Do keep it off its rhythm.',
  ],
  worn_knife_first: [
    'The Worn Knife. It does not break a curse — it reads one. Sharper for every stitch she leaves in.',
  ],
  knuckle_crack_first: [
    'There it is: her curses, your knuckles. Perhaps this marriage will work after all.',
  ],
};

// ---------------------------------------------------------------------------
// S8.7 new pools (S7 stubbed these as hardcoded lines in the reducer).
// {rite} is substituted by sayWitness at draw time. ALL PROVISIONAL pending
// the S8.8 gate-1 sign-off.
//
// RESERVED POOL KEY (do not author here): 'wrong_way' — the S8.4 wrong-way
// event owns its Witness lines and lands with that event (parallel work).
// ---------------------------------------------------------------------------

export const S8_WITNESS: Record<string, string[]> = {
  // the death-rite pick — the vestment donned at the door (§3)
  rite_death_pick: [
    'Don the vestment of {rite}, then. It has been waiting.',
    'The vestment of {rite}. It will fit. It always fits; that is the unsettling part.',
    '{rite}, worn again. The cloth remembers the office, whoever wears it.',
    'So: {rite}. The rite does not care who you were. The vestment is who you are now.',
  ],
  // the birth-rite arrival — the mirror sacrament, unexplained (§5b held
  // reveal: these lines only make sense much later)
  rite_birth_arrival: [
    '{rite}. Hm. The other half of that arrives before you understand it.',
    '{rite}. That word is from the other column of the ledger. I did not expect to hear it down here.',
    'Taken, not given — {rite} was never part of the descent. That is already more than I meant to say.',
  ],
};

// ---------------------------------------------------------------------------
// S8.7 voice-arc registers (lore bible §4): codex-percentage-keyed variants —
// the sardonic collector goes quieter and more deliberate as the profile's
// codex fills. Authored SPARINGLY: only the most-heard pools (combat_start,
// resonance) plus the fall-rebind line's sacrament version (§5b — the welcome
// rite in miniature, itself a held reveal). Thresholds 0/30/70 provisional
// per the sprint doc; only the 70% register is authored in S8.
// ---------------------------------------------------------------------------

export const WITNESS_REGISTERS: Record<string, { minPct: number; lines: string[] }[]> = {
  combat_start: [
    {
      minPct: 70,
      lines: [
        'Begin. I am watching more closely than I used to. You have given me reasons.',
        'They are what the breakage left. Go gently anyway. Then go through.',
      ],
    },
  ],
  resonance: [
    {
      minPct: 70,
      lines: [
        'Resonance. I used to mock this. I find I have stopped.',
        'The thread holds one note between you. I know that note. I have always known it.',
      ],
    },
  ],
  // the fall-rebind (§5b): the thread pulls the fallen back; the partner
  // receives them. At the 70% register the line finally quotes the right
  // sacrament — the welcome rite in miniature. The base pool stays as-is.
  revival: [
    {
      minPct: 70,
      lines: [
        '"What the thread carries, the hands receive. Be welcome, be warm, be borne." — the old words fit you better than they should.',
      ],
    },
  ],
  // the birth-rite arrival's directional hint (§5b held reveal): pulled from
  // the ungated base pool (S8 audit — it landed on the FIRST pick) and held
  // behind the 70% register, where the reveal is earned.
  rite_birth_arrival: [
    {
      minPct: 70,
      lines: [
        '{rite}. The procession that used this word walked the other way. That is all I will say about the direction.',
      ],
    },
  ],
};
