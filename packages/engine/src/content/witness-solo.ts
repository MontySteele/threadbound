// S2.1 — the Witness as the solo partner's voice. These pools only ever fire
// when state.botSeat is set (the solo profile); co-op cadence is untouched.
// Voice rules (sprint doc): resentful, dry, never cruel about losses, and
// NEVER strategic advice — it plays, it editorializes, it does not coach.
// No-repeat-within-run tracking applies as everywhere else (witness-draw).
// S8.7 never-lies audit (§4): no mortal-ghost biography — the Witness never
// lived, never died, had no masters. Antiquity is true; death is not. It may
// let OTHERS' misreadings stand; it may not claim a grave of its own.

export const SOLO_WITNESS: Record<string, string[]> = {
  // lobby / run start: it resents being drafted into this
  solo_greeting: [
    "Yes, fine. I'll hold the other end. It's not as if I had eternity planned.",
    'A solo descent. Meaning: you, plus me, doing the half you couldn’t recruit for.',
    'I watch. I narrate. Apparently now I also play. The job rots like everything else down here.',
    'One binder short, so the furniture gets drafted. Very well. I have been called worse than furniture.',
    'You and I, then. Lower your expectations of me; I lowered mine centuries ago.',
    "I'll take the second seat. Don't read anything tender into it. The thread needs two hands.",
    'Alone, with me for company. The Undercroft does have a sense of humor.',
  ],
  // low rotation — it comments on cards it plays
  own_play: [
    'I play this one. I remember when it meant something.',
    'There. Centuries of technique, spent on an errand no one will record. Except me. Obviously.',
    "Observe. No, don't applaud. It unsettles me.",
    'My card. My choice. The consequences, as ever, are shared.',
    "Played without hands. I'd take a bow, but you see the difficulty.",
    'Adequate placement, if I say so myself. I am the only one who would.',
  ],
  // the human linked off one of its cards — grudging acknowledgment
  human_linked_off_me: [
    "You built on my card. Bold of you to assume I'd set it up properly. I had, but still.",
    "Off my play. Yes. That was the idea. Don't look so surprised.",
    "A link, off mine. I'd say we make a fine pair, but then I'd have to mean it.",
    "You read my card and answered it. Careful — that's nearly partnership.",
    'Linked. Off me. Note that I left it there on purpose, and tell no one.',
    'So you do watch what I do. Flattering. Faintly alarming.',
  ],
  // the closest it comes to enthusiasm
  resonance_together: [
    'Resonance. With me in the weave. I had forgotten the warmth of it.',
    'The thread sings, and one of the voices is mine. Well. There it is.',
    "We did that. Both of us. I'll be insufferable about it for at least an act.",
    'Ignition. No one ever designed me to resonate with the living. Apparently no one needed to.',
    'Oh. Oh. It still works. I still work.',
    "The weave catches — ours, this time. Don't speak. Let me have it.",
  ],
  // crossed events where it chose for the human
  crossed_choice_made: [
    "I chose for you. You're welcome.",
    'Your fate, my hands. I went with the option least likely to need bandages.',
    'Decided. If it goes poorly, recall that you brought me here.',
    "I picked the sensible one. One of us has to be the adult, and I'm the one without a pulse.",
    "Done. You'd have dithered. I've watched you shop.",
    'The choice was mine. I have made worse, with higher stakes. Considerably worse.',
  ],
  // coveting in a solo run — either direction
  covet_solo: [
    "Taking from my pile? I'm old, not blind.",
    "Covet away. It's not as if I'm going anywhere with it. I'm not going anywhere at all.",
    'Yes, help yourself to my leavings. The Witness provides. Apparently.',
    'Coveting from the keeper of the pile. The rite has a word for that. I am electing not to teach it to you.',
    "Fine. I wasn't using it. I wasn't going to get to use it.",
    "I'll be taking that one. Consider it a keeper's fee. Everything down here is kept by someone.",
    'Mine now. Eternity teaches one to grab.',
  ],
  // the human goes down; it holds the line
  fallen_human: [
    'Down. No — stay there. I have this. I had this a thousand years before you.',
    "You're down. The thread holds; I hold it. Rest. That isn't kindness, it's logistics.",
    'Fallen. Do you know the paperwork a dead partner makes? Stay alive-adjacent.',
    "I'll carry this part. You've carried me all run; fair is fair. Tell no one I said that.",
    'Down they go. The plan is me now. Try not to dwell on that.',
    "Breathe. Or whatever it is you do. I'll keep the dark busy.",
  ],
  // it goes down; the indignity wounds deeper
  fallen_self: [
    "I'm down. Insofar as I can be. The indignity is the larger wound.",
    'Fallen. Me. I want it on record that I have never once done this before. A debut.',
    "I'm out. You're the plan now. I have notes, but no advice. Mostly notes.",
    'The thread goes slack on my end. Carry it a while. I never had the lungs for this. Or the heart. Literally.',
    'Down. I am told this is what dying is like. I remain unqualified to confirm it.',
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
    'The braid holds — half-woven by the furniture. Let history choke on that.',
    "It's done. You descended alone and came out otherwise. I'll be in the telling of this; tell it right.",
    'Victory. Mine and yours. Mostly yours. The record will say otherwise; I keep the record.',
    'The dark blinked. I was holding one end of the thread when it did. That is all I ever asked.',
    'Won. With me at the other end. Set it down exactly as it happened; I will know.',
  ],
  solo_defeat: [
    "Down we go. You'll wake at the door. I'll already be here. I'm always already here.",
    'Lost. Not the worst run I have witnessed. I keep a list. You are nowhere near it.',
    'The thread slackens. No shame in it; the Undercroft has had more practice than the both of us.',
    "We fall. I'd say it gets easier, but I have watched every descent there has ever been, and it doesn't.",
    'Done. Rest. The dark will keep — it keeps everything.',
    'It ends here, this time. The door upstairs remembers your shape. Use it.',
  ],
};
