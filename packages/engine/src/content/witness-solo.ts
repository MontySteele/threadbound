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
  // S19.6 (D5): grown 6→12 per the ruled counts. Rows St-7..St-12,
  // PROVISIONAL pending the Part 7 ratification (docs/S19-STATUS.md).
  own_play: [
    'I play this one. I remember when it meant something.',
    'There. Centuries of technique, spent on an errand no one will record. Except me. Obviously.',
    "Observe. No, don't applaud. It unsettles me.",
    'My card. My choice. The consequences, as ever, are shared.',
    "Played without hands. I'd take a bow, but you see the difficulty.",
    'Adequate placement, if I say so myself. I am the only one who would.',
    'Consider it placed. I did have several centuries to think about the order of things.',
    'One more from my hand. The hand is figurative. The card is not.',
    'I file this here. Filing is the one skill eternity actually rewards.',
    'Mine, into the chain. No flourish. The flourish is implied.',
    'I contribute. Quietly. Let the record show who kept the weave fed — I keep the record.',
    'Another of mine on the table. I said I would hold the other end; I hold it thoroughly.',
  ],
  // the human linked off one of its cards — grudging acknowledgment
  // S19.6 (D5): grown 6→12. Rows St-13..St-18, PROVISIONAL.
  human_linked_off_me: [
    "You built on my card. Bold of you to assume I'd set it up properly. I had, but still.",
    "Off my play. Yes. That was the idea. Don't look so surprised.",
    "A link, off mine. I'd say we make a fine pair, but then I'd have to mean it.",
    "You read my card and answered it. Careful — that's nearly partnership.",
    'Linked. Off me. Note that I left it there on purpose, and tell no one.',
    'So you do watch what I do. Flattering. Faintly alarming.',
    'Lit, off my card. I do set a decent table.',
    'Your link, my kindling. We will not discuss how long I have been kindling.',
    'You followed my thread of thought. There is hope for this arrangement.',
    'Off mine again. At this rate I will have to start pretending it is luck, for modesty.',
    "A fire off my card. Warm your hands; I can't.",
    'You saw what I left you. Noted, weaver. Filed under: promising.',
  ],
  // the closest it comes to enthusiasm
  // S19.6 (D5): grown 6→12 — the pre-S19 pool exhausted at median act 1,
  // turn 11.5 in 100/100 battery runs (the sprint's thesis, measured).
  // Rows St-1..St-6, PROVISIONAL.
  resonance_together: [
    'Resonance. With me in the weave. I had forgotten the warmth of it.',
    'The thread sings, and one of the voices is mine. Well. There it is.',
    "We did that. Both of us. I'll be insufferable about it for at least an act.",
    'Ignition. No one ever designed me to resonate with the living. Apparently no one needed to.',
    'Oh. Oh. It still works. I still work.',
    "The weave catches — ours, this time. Don't speak. Let me have it.",
    'Two hands on one thread, and the weave answers. I had forgotten it could be this loud.',
    'Resonance, and half of it mine. Put it in the record twice.',
    'There — the chain remembers what it is for. So, briefly, do I.',
    'The weave takes both our marks this time. This one goes on the good shelf.',
    'It sings once for the pair of us. Even the dark leans in to hear that.',
    'Again the ignition, again both names on it. Keep weaving like that and I will run out of dry remarks.',
  ],
  // S19.6 (D5) NEW POOLS — the bot's least legible actions, announced.
  // All fire only via botSeat-gated triggers; {card} substituted at draw
  // time (truth law: a {card} line claims only what the engine just did).
  // Rows St-19..St-46, PROVISIONAL pending the Part 7 ratification.
  // the bot Reclaims from the human's piles (always; pairs with S19.2)
  i_reclaimed_yours: [
    'I am taking an echo of your {card}. It was doing nothing where it lay.',
    'Your {card} — I want its shape for a turn. The original stays where you dropped it.',
    'A copy of {card} comes across the thread. Waste offends me; I have watched eras of it.',
    'I reclaim {card}. Yes, yours. It knows the way across the thread.',
    'Borrowing {card}. An echo of it, strictly — I deal in copies. Ask the codex.',
    '{card}, echoed into my hand. A discard is a resting place, not a grave.',
  ],
  // the bot Pulses a HUMAN-owned link (always)
  i_pulsed_yours: [
    'A Pulse, for your link. It read dead; I disagreed.',
    'I put two Thread behind your card. Its link fires now, whatever sits before it.',
    'Your link was about to sleep through the turn. I knocked.',
    'Pulsed. Yours. I do not spend Thread on sentiment; the card earned it.',
    'Two Thread, and your dead link remembers its duty. The old pushes still work.',
    'I forced yours awake. The thread between us is not decorative.',
  ],
  // the bot's Sever, at resolution, ONLY when a binding actually moved —
  // direction-neutral on purpose (spread-severs settle on the human;
  // chorus severs move between voices)
  i_severed: [
    'Severed. The binding comes loose and settles elsewhere.',
    'Three Thread to re-aim a hunger. Money well spent, as spending goes down here.',
    'I cut the tether where it stood. It has already found a new anchor; they always do.',
    'Severed — the leash moves. The Undercroft does love its leashes.',
  ],
  // the bot's Steady (wired though the solo policy never Steadies today)
  i_steadied: [
    'Steadied. A Thread spent on composure — ours, collectively.',
    'I steady the line. Centuries of holding things teaches the grip.',
    'One Thread for calm. The weave sits easier for it.',
    'Steadied. Whatever the turn does next, it does it to a firmer thread.',
  ],
  // the bot's reward pick, 50% — teaches the Reclaim menu by visibility
  my_pick: [
    'I will take {card}. I have reasons; most of them are even tactical.',
    '{card} goes on my shelf. Everything ends up on a shelf of mine eventually.',
    'Mine is {card}. The collection wants what the collection wants.',
    'I choose {card}. Write it down — I always write it down.',
    '{card}, then. Some things one simply recognizes after enough centuries.',
    'I pick {card}. Played things end up in piles, and piles down here have two readers.',
    '{card} for me. No commentary from the gallery, please.',
    '{card}. A keeper knows quality; I have dusted enough of it.',
  ],
  // S19.6 (D6) HINT POOLS — drawn CLIENT-side (WitnessHints: once-per-run,
  // act-1-only, solo-only, tb_witnessHints toggle default ON); the engine
  // never fires these. Hints are Witness lines and obey the truth law:
  // they describe what just happened and what the mechanic IS; they never
  // promise outcomes. 4 lines each — variety across runs, not within.
  // Rows St-47..St-66, PROVISIONAL pending the Part 7 ratification.
  hint_thread_floor: [
    'The Thread runs low. It is one pool and we both drink from it — overdraw, and the fraying bites us both.',
    'Below four now. The Thread has a bottom; spend past it and it frays — and a fray is paid by the pair.',
    'The Thread thins. A fray, when it comes, punishes both of us — the pool is shared and so is the penalty.',
    'Little Thread left. It regrows as the turns pass, but a fray, once earned, is shared.',
  ],
  hint_link_read: [
    "Your card's link read nothing behind it just now. A link fires off the card before it — order is the whole grammar.",
    'That link stayed dark: nothing it wanted stood in front of it. Links read their predecessor — mine included.',
    'A dead link in your chain this turn. Links only catch when the right card stands before them; mine count as cards, for the record.',
    'Your link went unread at the commit. It wanted a particular neighbor and had none. Links are grammar, not garnish.',
  ],
  hint_binding: [
    'Its binding moved. Every enemy is bound to one of us; the binding names its prey.',
    'The tether re-aimed itself. What an enemy is bound to is what it hunts — and bindings can move.',
    'Its leash crossed over. Bound-to decides who takes the teeth, and the names change mid-fight.',
    'A binding changed hands just now. They do that — Severs, falls, and certain enemies all re-aim the leash.',
  ],
  hint_reclaim_exists: [
    'I just pulled an echo from your discard — that is Reclaim, two Thread. Your dead cards are not as dead as they look.',
    'That was a Reclaim: I copied a card out of your pile for two Thread. The thread carries cards both ways.',
    'An echo of yours, in my hand — Reclaim does that. My piles are as open to you as yours are to me.',
    "I reclaimed from your discard just now. Two Thread buys a copy of anything resting in a partner's discard or exhaust.",
  ],
  hint_pulse: [
    'Your link died on the table and the Thread sat unspent. Pulse exists: two Thread forces a staged link to fire, whatever precedes it.',
    'A dead link at the commit, with Thread to spare. For two of it, a Pulse fires a staged link regardless of order.',
    "The Thread watched your link stay dark. It needn't — a Pulse, at two Thread, lights a dead link where it stands.",
    'Link unfired, Thread unspent. Those two facts share a remedy called Pulse; either of us can cast it on either’s card.',
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
