// S2.1 — the Witness as the solo partner's voice. These pools only ever fire
// when state.botSeat is set (the solo profile); co-op cadence is untouched.
// Voice rules (sprint doc): resentful, dry, never cruel about losses, and
// NEVER strategic advice — he plays, he editorializes, he does not coach.
// No-repeat-within-run tracking applies as everywhere else (witness-draw).

export const SOLO_WITNESS: Record<string, string[]> = {
  // lobby / run start: he resents being drafted into this
  solo_greeting: [
    "Yes, fine. I'll hold the other end. It's not as if I had eternity planned.",
    'A solo descent. Meaning: you, plus me, doing the half you couldn’t recruit for.',
    'I watch. I narrate. Apparently now I also play. The job rots like everything else down here.',
    'One binder short, so the furniture gets drafted. Very well. I was a legend once.',
    'You and I, then. Lower your expectations of me; I lowered mine centuries ago.',
    "I'll take the second seat. Don't read anything tender into it. The thread needs two hands.",
    'Alone, with me for company. The Undercroft does have a sense of humor.',
  ],
  // low rotation — he comments on cards he plays
  own_play: [
    'I play this one. I remember when it meant something.',
    'There. Centuries of technique, spent on a Tuesday.',
    "Observe. No, don't applaud. It unsettles me.",
    'My card. My choice. The consequences, as ever, are shared.',
    'I still have the hands for this. Somewhere.',
    'Adequate placement, if I say so myself. I am the only one who would.',
  ],
  // the human linked off one of his cards — grudging acknowledgment
  human_linked_off_me: [
    "You built on my card. Bold of you to assume I'd set it up properly. I had, but still.",
    "Off my play. Yes. That was the idea. Don't look so surprised.",
    "A link, off mine. I'd say we make a fine pair, but then I'd have to mean it.",
    "You read my card and answered it. Careful — that's nearly partnership.",
    'Linked. Off me. Note that I left it there on purpose, and tell no one.',
    'So you do watch what I do. Flattering. Faintly alarming.',
  ],
  // the closest he comes to enthusiasm
  resonance_together: [
    'Resonance. With me in the weave. I had forgotten the warmth of it.',
    'The thread sings, and one of the voices is mine. Well. There it is.',
    "We did that. Both of us. I'll be insufferable about it for at least an act.",
    'Ignition. My old masters swore I would never resonate with the living again. Keep proving them wrong.',
    'Oh. Oh. It still works. I still work.',
    "The weave catches — ours, this time. Don't speak. Let me have it.",
  ],
  // crossed events where he chose for the human
  crossed_choice_made: [
    "I chose for you. You're welcome.",
    'Your fate, my hands. I went with the option least likely to need bandages.',
    'Decided. If it goes poorly, recall that you brought me here.',
    "I picked the sensible one. One of us has to be the adult, and I'm the one who's dead.",
    "Done. You'd have dithered. I've watched you shop.",
    'The choice was mine. I have made worse, with higher stakes. Considerably worse.',
  ],
  // coveting in a solo run — either direction
  covet_solo: [
    "Taking from my pile? I'm dead, not blind.",
    "Covet away. It's not as if I can take it with me. Again.",
    'Yes, help yourself to my leavings. The Witness provides. Apparently.',
    'Coveting from a ghost. The commandments never imagined your kind of nerve.',
    "Fine. I wasn't using it. I wasn't going to get to use it.",
    "I'll be taking that one. Consider it back rent for the haunting.",
    'Mine now. Eternity teaches one to grab.',
  ],
  // the human goes down; he holds the line
  fallen_human: [
    'Down. No — stay there. I have this. I had this a thousand years before you.',
    "You're down. The thread holds; I hold it. Rest. That isn't kindness, it's logistics.",
    'Fallen. Do you know the paperwork a dead partner makes? Stay alive-adjacent.',
    "I'll carry this part. You've carried me all run; fair is fair. Tell no one I said that.",
    'Down they go. The plan is me now. Try not to dwell on that.',
    "Breathe. Or whatever it is you do. I'll keep the dark busy.",
  ],
  // he goes down; the indignity wounds deeper
  fallen_self: [
    "I'm down. Insofar as I can be. The indignity is the larger wound.",
    'Fallen. Me. I want it on record that I died properly the first time.',
    "I'm out. You're the plan now. I have notes, but no advice. Mostly notes.",
    'The thread goes slack on my end. Carry it a while. I never had the cardio for this. Or the heart. Literally.',
    'Down. Dead twice now, by my count. It does not improve with practice.',
    "I'll just lie here. Win, and we will agree this never happened.",
  ],
  // either of them gets back up after the fight
  revive_either: [
    "Up. Both ends of the thread accounted for. I'd call it a miracle, but then I'd owe someone thanks.",
    'Revived. One hit point between dignity and the floor. Spend it well.',
    'Back on our feet. Collectively. The thread does love a stubborn pair.',
    'Alive again. The Undercroft hates that. Cherish it.',
    'Up you get. Up I get. Nobody mention the falling-down part.',
    'We stand. Barely counts, still counts.',
  ],
  // solo endings — distinct from the co-op epitaphs
  solo_victory: [
    "We won. You and I. I intend to dine on this for a century, and I don't eat.",
    'The braid holds — half-woven by a ghost. Let history choke on that.',
    "It's done. You descended alone and came out otherwise. I'll be in the telling of this; tell it right.",
    'Victory. Mine and yours. Mostly yours. The record will say otherwise; I keep the record.',
    'The dark blinked. I was holding one end of the thread when it did. That is all I ever asked.',
    'Won. With me at the other end. Somewhere, my old masters are filing a complaint.',
  ],
  solo_defeat: [
    "Down we go. You'll wake at the door. I'll already be here. I'm always already here.",
    'Lost. Not the worst run I have witnessed. The worst was also mine, so — symmetry.',
    'The thread slackens. No shame in it; the Undercroft has had more practice than the both of us.',
    "We fall. I'd say it gets easier, but I've died here twice now and it doesn't.",
    'Done. Rest. The dark will keep — it keeps everything.',
    'It ends here, this time. The door upstairs remembers your shape. Use it.',
  ],
};
