// M2 world content (M2-B3/B5, design doc §6/§8/§10): new enemies for both
// acts plus the finale, the expanded event pool, and the Witness's new and
// expanded line pools. Ids are disjoint from content/enemies.ts, events.ts,
// and witness.ts. Tone rules: enemy flavor and event prose stay somber;
// the Witness keeps the sarcasm monopoly.

import { EnemyDef, EventDef } from '../types';

// ---------------------------------------------------------------------------
// Enemies — Act 1: the Undercroft (graves, husks, sextons, votive things);
// Act 2: the Hollow Choir (choirs, cantors, bell-things, psalm-eaters);
// Act 3: The Last Braid (The Unraveled).
// ---------------------------------------------------------------------------

export const M2_ENEMIES: EnemyDef[] = [
  // ---- Act 1 normals ------------------------------------------------------
  {
    id: 'votive_throng',
    name: 'Votive Throng',
    act: 1,
    hp: [18, 22],
    script: [
      { kind: 'attack', amount: 3, times: 2 },
      { kind: 'debuff_weak', amount: 2 },
      { kind: 'attack', amount: 3, times: 2 },
      { kind: 'block', amount: 5 },
    ],
    flavor: 'A hundred small flames lit for the dead, still burning long after anyone remained to want them answered.',
  },
  {
    id: 'gravewax_husk',
    name: 'Gravewax Husk',
    act: 1,
    hp: [28, 34],
    script: [
      { kind: 'attack', amount: 8 },
      { kind: 'block', amount: 7 },
      { kind: 'attack', amount: 8 },
      { kind: 'debuff_vulnerable', amount: 2 },
    ],
    flavor: 'The tallow of old funerals, melted down and poured into the rough shape of someone it half remembers.',
  },
  {
    id: 'pallbearer',
    name: 'Pallbearer',
    act: 1,
    hp: [38, 45],
    script: [
      { kind: 'attack', amount: 10 },
      { kind: 'buff_strength', amount: 1 },
      { kind: 'attack', amount: 10 },
      { kind: 'block', amount: 9 },
      { kind: 'attack_all', amount: 6 },
    ],
    flavor: 'It still carries the coffin, and it has decided, after all these years, that the coffin should not be empty.',
  },
  // ---- Act 1 elite --------------------------------------------------------
  // Co-op interaction: sever — it walks its own binding back and forth across
  // the Thread, forcing the pair to renegotiate "who holds this one" every
  // rotation (and taxing Sever Binding budget if they fight it).
  {
    id: 'warden_of_the_crossing',
    name: 'Warden of the Crossing',
    act: 1,
    elite: true,
    hp: [78, 88],
    script: [
      { kind: 'attack', amount: 11 },
      { kind: 'sever' },
      { kind: 'attack', amount: 7, times: 2 },
      { kind: 'block', amount: 12 },
      { kind: 'attack', amount: 11 },
    ],
    flavor: 'It stands where two paths meet and will not say which of you it has come to collect, because it has not decided.',
  },
  // ---- Act 1 boss ---------------------------------------------------------
  // Co-op interaction: attack_drain bleeds the shared Thread while strength
  // escalation forces an early kill — the pair must budget Pulse/Sever
  // against a shrinking pool instead of hoarding it for the finish.
  {
    id: 'interred_saint',
    name: 'The Interred Saint',
    act: 1,
    boss: true,
    hp: [140, 158],
    script: [
      { kind: 'attack', amount: 12 },
      { kind: 'attack_drain', amount: 8, threadDrain: 2 },
      { kind: 'buff_strength', amount: 2 },
      { kind: 'attack', amount: 8, times: 2 },
      { kind: 'block', amount: 14 },
      { kind: 'attack_all', amount: 9 },
    ],
    flavor: 'They buried her with honors, then with chains, then with the whole of the Undercroft, and none of it was enough.',
  },

  // ---- Act 2 normals ------------------------------------------------------
  {
    id: 'psalm_eater',
    name: 'Psalm-Eater',
    act: 2,
    hp: [34, 40],
    script: [
      { kind: 'attack_drain', amount: 7, threadDrain: 1 },
      { kind: 'attack', amount: 9 },
      { kind: 'attack_drain', amount: 7, threadDrain: 1 },
      { kind: 'block', amount: 8 },
    ],
    flavor: 'It swallowed every prayer this place ever raised, and it is still hungry for whatever passes between you.',
  },
  {
    id: 'bell_husk',
    name: 'Bell Husk',
    act: 2,
    hp: [40, 48],
    script: [
      { kind: 'attack_fray', amount: 8 },
      { kind: 'block', amount: 10 },
      { kind: 'attack', amount: 11 },
      { kind: 'attack_fray', amount: 8 },
    ],
    flavor: 'A bell that was rung once too often, now wearing the bellringer, still tolling a note that unravels things.',
  },
  {
    id: 'lectern_wretch',
    name: 'Lectern Wretch',
    act: 2,
    hp: [44, 52],
    script: [
      { kind: 'attack_momentum', base: 7, perMomentum: 2 },
      { kind: 'debuff_weak', amount: 2 },
      { kind: 'attack_momentum', base: 7, perMomentum: 2 },
      { kind: 'block', amount: 11 },
      { kind: 'attack', amount: 12 },
    ],
    flavor: 'Bent over a book whose pages were eaten centuries ago, it reads your fervor back to you, word for word.',
  },
  // ---- Act 2 Chorister pack (chorus: true — engine pools their HP; §6) ----
  // Co-op interaction: three bodies, one health pool, two players — one body
  // is always unbound and untargetable until a binding is severed onto it.
  {
    id: 'chorister_low',
    name: 'Chorister of the Low Note',
    act: 2,
    chorus: true,
    hp: [38, 38],
    script: [
      { kind: 'attack', amount: 13 },
      { kind: 'block_all', amount: 7 },
      { kind: 'attack', amount: 13 },
      { kind: 'attack', amount: 9, times: 2 },
    ],
    flavor: 'It holds the note beneath hearing, the one you feel in the floor of your chest like a second pulse.',
  },
  {
    id: 'chorister_mid',
    name: 'Chorister of the Held Note',
    act: 2,
    chorus: true,
    hp: [38, 38],
    script: [
      { kind: 'buff_strength_all', amount: 1 },
      { kind: 'attack', amount: 10 },
      { kind: 'block_all', amount: 9 },
      { kind: 'buff_strength_all', amount: 1 },
      { kind: 'attack', amount: 10 },
    ],
    flavor: 'It has sustained the same note since the choir died, and it will not breathe until the song is finished.',
  },
  {
    id: 'chorister_high',
    name: 'Chorister of the High Note',
    act: 2,
    chorus: true,
    hp: [38, 38],
    script: [
      { kind: 'debuff_vulnerable', amount: 2 },
      { kind: 'attack_all', amount: 7 },
      { kind: 'debuff_weak', amount: 2 },
      { kind: 'attack_all', amount: 7 },
    ],
    flavor: 'The descant that was meant to carry the dead upward, still climbing, with nothing left to carry.',
  },
  // ---- Act 2 elites -------------------------------------------------------
  // Co-op interaction: chainReader — every staged link that fails to fire
  // feeds its Block. A sloppy, uncoordinated Chain armors it; a clean weave
  // leaves it bare. It punishes playing near each other instead of with.
  {
    id: 'the_cantor',
    name: 'The Cantor',
    act: 2,
    elite: true,
    hp: [102, 116],
    chainReader: { blockPerUnfiredLink: 4 },
    script: [
      { kind: 'attack', amount: 13 },
      { kind: 'debuff_weak', amount: 2 },
      { kind: 'attack', amount: 9, times: 2 },
      { kind: 'buff_strength', amount: 2 },
      { kind: 'attack', amount: 13 },
    ],
    flavor: 'It conducts whether or not anyone sings, and it can hear, precisely, every place your voices fail to meet.',
  },
  // Co-op interaction: sever + attack_fray — it rings the binding from one of
  // you to the other mid-rotation, so every defensive plan made during
  // planning must survive the bell deciding otherwise.
  {
    id: 'bellkeeper',
    name: 'The Bellkeeper',
    act: 2,
    elite: true,
    hp: [108, 122],
    script: [
      { kind: 'attack', amount: 14 },
      { kind: 'sever' },
      { kind: 'attack_fray', amount: 10 },
      { kind: 'block', amount: 14 },
      { kind: 'attack', amount: 10, times: 2 },
    ],
    flavor: 'Each toll names one of you, and it has kept the bell oiled all these years for exactly this occasion.',
  },
  // ---- Act 2 boss ---------------------------------------------------------
  // Co-op interaction: mournerMechanic — it grows stronger each turn the
  // Chain holds a 4+ same-player run, and its chainReader Block punishes
  // unfired links; the only way through is a genuinely woven Chain.
  {
    id: 'choirmaster',
    name: 'The Choirmaster',
    act: 2,
    boss: true,
    hp: [188, 206],
    mournerMechanic: { strengthPerTrigger: 2 },
    chainReader: { blockPerUnfiredLink: 3 },
    script: [
      { kind: 'attack', amount: 14 },
      { kind: 'attack_all', amount: 10 },
      { kind: 'buff_strength', amount: 2 },
      { kind: 'attack', amount: 10, times: 2 },
      { kind: 'block', amount: 16 },
      { kind: 'attack_drain', amount: 9, threadDrain: 2 },
    ],
    flavor: 'The Choir went hollow the day it demanded one voice from many, and it has been rehearsing you since you arrived.',
  },

  // ---- Act 3 finale boss --------------------------------------------------
  // Co-op interaction: the Thread itself, weaponized (§6) — it drains and
  // frays the Thread, and at 50% HP severs it outright for two turns, forcing
  // both engines to prove the Covenant's solo floor before the reignition.
  {
    id: 'the_unraveled',
    name: 'The Unraveled',
    act: 3,
    boss: true,
    hp: [200, 220],
    unraveled: { severTurns: 2 },
    script: [
      { kind: 'attack_drain', amount: 10, threadDrain: 2 },
      { kind: 'attack', amount: 16 },
      { kind: 'attack_fray', amount: 12 },
      { kind: 'block', amount: 18 },
      { kind: 'attack', amount: 11, times: 2 },
      { kind: 'attack_drain', amount: 10, threadDrain: 2 },
    ],
    flavor: 'It was bound to someone once, and it remembers the cut better than the binding, and it wants you to remember it too.',
  },
];

// ---------------------------------------------------------------------------
// Events (M2-B5). With cold_lantern and basin carried over this makes 12;
// basin + silent_psalter + tailors_form are consequence-crossed, moth_feast +
// reliquary_crown are comedy-crossed: 3/2 ≈ the 60/40 ruling.
// ---------------------------------------------------------------------------

export const M2_EVENTS: EventDef[] = [
  // ---- Standard events ----------------------------------------------------
  {
    id: 'ossuary_toll',
    name: 'The Ossuary Toll',
    act: 1,
    crossed: false,
    prose:
      'The gate through the bone-wall is shut, and a small iron box hangs beside it on a chain. ' +
      'A toll box. The slot is worn smooth by centuries of coins, though no toll-keeper remains — ' +
      'only a femur propped against the bars like a staff someone meant to come back for. ' +
      'The lock is rusted to lace. You could pay, as the dead once paid. ' +
      'Or you could simply break the box and take what the dead left behind.',
    options: [
      {
        id: 'pay',
        label: 'Pay the toll and pass',
        resultText: 'The coin falls a long way before it lands. The gate opens without a sound, as if it had only been waiting to be asked properly.',
        witness: 'Paying tolls to a femur. Your fiscal instincts remain a marvel.',
        effects: [{ op: 'gold', amount: -25 }, { op: 'heal', amount: 8 }],
      },
      {
        id: 'break',
        label: 'Break the box open',
        resultText: 'The box gives way in a breath of rust. The coins inside are old and heavy, and the dark behind the gate feels suddenly less patient.',
        witness: 'Robbing the dead at their own gate. Bold. They keep ledgers, you know.',
        effects: [{ op: 'gold', amount: 45 }, { op: 'pendingFray', amount: 1 }],
      },
    ],
  },
  {
    id: 'seamstress_alcove',
    name: "The Seamstress's Alcove",
    act: 0,
    crossed: false,
    prose:
      'Someone worked here, in the dark, for a very long time. A stool, a lamp gone dry, and a wall ' +
      'of needles arranged by size — hundreds of them, each one labeled in a hand too small to read ' +
      'without kneeling. On the table lies an unfinished mending: a sleeve, a careful seam, a needle ' +
      'still threaded mid-stitch, as if she stood up meaning to return. The thread in the needle is ' +
      'the same color as the one between you.',
    options: [
      {
        id: 'finish',
        label: 'Finish her stitch',
        resultText: 'Your hands know the work better than you do. The seam closes, and something in your own weave sits straighter for it.',
        witness: 'Needlepoint in a tomb. I once served kings. Now I supervise crafts.',
        effects: [{ op: 'upgradeRandom' }],
      },
      {
        id: 'unpick',
        label: 'Unpick the old work',
        resultText: 'You draw the thread out stitch by stitch, and with it goes something clumsy you had been carrying since the surface.',
        witness: 'Unraveling a dead woman’s mending to improve yourself. The dead are so generous when unconscious.',
        effects: [{ op: 'removeRandomStarter' }],
      },
    ],
  },
  {
    id: 'wax_garden',
    name: 'The Wax Garden',
    act: 1,
    crossed: false,
    prose:
      'A side chapel has flooded with candle-wax, generations deep, and things have grown in it. ' +
      'Pale stalks. Blooms with wicks for stamens, a few of them still alight. Whoever tended this ' +
      'place planted votives the way other people plant seeds, and the harvest is light: soft, ' +
      'cold, and entirely indifferent to you. One bloom near the path has come loose at the root. ' +
      'It would be easy to take. It might even be wise.',
    options: [
      {
        id: 'take_bloom',
        label: 'Take the burning bloom',
        resultText: 'The wax weeps once around your fingers and goes still. The light keeps. Somewhere behind you, another wick gutters out in answer.',
        witness: 'Picking flowers. In a crypt. Shall I fetch a vase, or is the looting purely sentimental?',
        effects: [{ op: 'gainCard', pool: 'uncommon' }, { op: 'loseHp', amount: 5 }],
      },
      {
        id: 'tend',
        label: 'Tend the garden and move on',
        resultText: 'You right a fallen stalk and trim a drowned wick, and the garden, in its cold way, breathes easier. So do you.',
        witness: 'Gardening for ghosts. Unpaid, naturally. I respect the tradition.',
        effects: [{ op: 'heal', amount: 7 }],
      },
    ],
  },
  {
    id: 'broken_carillon',
    name: 'The Broken Carillon',
    act: 2,
    crossed: false,
    prose:
      'The carillon fills the whole tower above you: forty bells, every one of them cracked, every ' +
      'crack stuffed with wax and rag by hands that wanted very badly for the ringing to stop. ' +
      'The clappers have been bound with cord — old cord, frayed cord, cord that is mostly memory. ' +
      'One bell, the smallest, has worked loose. It hangs by a thread of fiber, swaying slightly ' +
      'in air that does not move, wanting only the smallest excuse.',
    options: [
      {
        id: 'cut',
        label: 'Cut it down and take it',
        resultText: 'You catch the bell before it can speak. It is heavier than it should be, and warm, like a held breath. The tower stays silent. Barely.',
        witness: 'Yes, take the cursed bell. Souvenirs were going so well for you.',
        effects: [{ op: 'gainRelic' }, { op: 'loseHp', amount: 7 }],
      },
      {
        id: 'silence',
        label: 'Re-bind the clapper and leave',
        resultText: 'You knot the cord the way the old hands did, and the bell settles into stillness. The Choir owes you a silence now, for whatever that is worth.',
        witness: 'You climbed all that way to tie a knot. The heroism is suffocating.',
        effects: [{ op: 'gold', amount: 35 }],
      },
    ],
  },
  {
    id: 'reliquary_lots',
    name: 'The Reliquary Lots',
    act: 0,
    crossed: false,
    prose:
      'A reliquary cabinet stands open, its velvet gone to dust, its treasures long since carried ' +
      'off — all but a clay cup of casting-lots, the kind the old sextons threw to settle who dug ' +
      'which grave. The lots are knuckle-bones, polished by worry. A plaque beneath the cup reads: ' +
      'THE BONES DECIDE, THAT NO MAN NEED CARRY THE CHOOSING. The cup sits exactly at hand height. ' +
      'It has clearly been waiting for hands.',
    options: [
      {
        id: 'cast',
        label: 'Cast the lots',
        resultText: 'The bones rattle, scatter, and settle into a pattern you do not know how to read but somehow do. The choosing is carried. Not by you.',
        witness: 'Gambling with grave-dice. The sextons died doing this, but do enjoy yourselves.',
        effects: [{ op: 'covetCharge', amount: 1 }, { op: 'loseHp', amount: 4 }],
      },
      {
        id: 'refuse_lots',
        label: 'Leave the choosing to the dead',
        resultText: 'You set the cup back on its shelf, unthrown. Some questions are better carried than settled.',
        witness: 'Declining free fate. How disciplined. How dull.',
        effects: [{ op: 'thread', amount: 2 }],
      },
    ],
  },
  {
    id: 'drowned_hymnal',
    name: 'The Drowned Hymnal',
    act: 2,
    crossed: false,
    prose:
      'A font of black water, and at the bottom of it, a hymnal — open, weighted with a stone, its ' +
      'pages somehow unswollen after all this time. The ink has not run. From above, through the ' +
      'water, you can read a single line of the psalm: a note held between two voices, neither one ' +
      'sufficient alone. The water is very cold. The book is just within reach, if you do not mind ' +
      'your arm learning what the book already knows.',
    options: [
      {
        id: 'retrieve',
        label: 'Reach in and take the hymnal',
        resultText: 'The cold takes your arm to the shoulder and gives it back changed. The page you wanted comes away dry in your fist.',
        witness: 'An arm for sheet music. The Choir thanks you for your patronage.',
        effects: [{ op: 'gainCard', pool: 'rare' }, { op: 'maxHp', amount: -4 }],
      },
      {
        id: 'read',
        label: 'Read what you can from above',
        resultText: 'You memorize the line through the water and leave the book to its drowning. Some psalms are meant to be carried, not held.',
        witness: 'Window-shopping at a font. Frugal to the last.',
        effects: [{ op: 'gainCard', pool: 'common' }, { op: 'heal', amount: 4 }],
      },
    ],
  },

  // ---- Crossed choices (the chooser picks the outcome the partner gets) ---
  {
    id: 'silent_psalter',
    name: 'The Silent Psalter',
    act: 2,
    crossed: true,
    tone: 'consequence',
    prose:
      'The psalter chained to the lectern has one unburned page, and the page is singing — soundlessly, ' +
      'the way a struck glass sings after you still it with a finger. Whoever reads it aloud will ' +
      'carry the verse out of this place in their chest, and verses from the Hollow Choir do not ' +
      'travel free. The chain is long enough for one reader. Only one. ' +
      'Your partner stands at the lectern. You decide whether they read.',
    options: [
      {
        id: 'read_verse',
        label: 'They read the verse',
        resultText: 'They speak it once, quietly, and the page goes dark, its work done. The verse settles into them, heavier than words have any right to be. (They gain a rare card, but begin the next combat Frayed.)',
        witness: 'You volunteered their lungs for the haunted hymn. Teamwork, of a kind.',
        effects: [{ op: 'gainCard', pool: 'rare' }, { op: 'pendingFray', amount: 1 }],
      },
      {
        id: 'close_book',
        label: 'They close the book unread',
        resultText: 'They shut the psalter, and the soundless singing stops like a held breath released. The verse stays where verses belong: with the dead.',
        witness: 'You closed the book on them. Literally, for once.',
        effects: [{ op: 'heal', amount: 6 }],
      },
    ],
  },
  {
    id: 'tailors_form',
    name: "The Tailor's Form",
    act: 0,
    crossed: true,
    tone: 'consequence',
    prose:
      'A dressmaker’s form stands in the lamplight, and stretched upon it, half-finished, is a ' +
      'second skin — not leather, not cloth, something the needle-wall’s owner was weaving from ' +
      'the same stuff as the thread between you. It is sized, you realize slowly, for one of you. ' +
      'Exactly one. Wearing it would mean being mended at the seams, permanently, the way garments ' +
      'are mended: cut first, then sewn stronger. Your partner stands before the form. You decide ' +
      'whether they are fitted.',
    options: [
      {
        id: 'fitted',
        label: 'They are fitted',
        resultText: 'The weave closes over them like water and tightens like a promise. The cutting is brief. The sewing is not. They come away from the form standing straighter than the wound should allow. (They lose HP now; their flesh holds more, after.)',
        witness: 'You had them sewn into the haunted suit. For their own good, I am sure.',
        effects: [{ op: 'loseHp', amount: 7 }, { op: 'maxHp', amount: 7 }],
      },
      {
        id: 'unfitted',
        label: 'The form stays empty',
        resultText: 'You step them back from the lamplight. The form holds its shape, patient, half-made, fitted for someone who will never come. The needles on the wall keep their counsel.',
        witness: 'You declined the upgrade on their behalf. Generous with their potential, as ever.',
        effects: [{ op: 'gold', amount: 25 }],
      },
    ],
  },
  {
    id: 'moth_feast',
    name: 'The Moth Feast',
    act: 1,
    crossed: true,
    tone: 'comedy',
    prose:
      'The alcove is full of grave-moths, fat and slow and faintly luminous, gorged on votive wax ' +
      'and whatever else accumulates down here. A stone plate sits beneath their roost, and on it, ' +
      'arranged with unmistakable ceremony, a dozen of the largest — dusted in something golden, ' +
      'laid out like a course at a feast. The old sextons swore by them. Restorative, the carvings ' +
      'insist. Sustaining. One of you may partake. The other decides.',
    options: [
      {
        id: 'eat_moths',
        label: 'They eat the moths',
        resultText: 'They chew. The glow goes down with everything else. Warmth spreads from somewhere a meal has no business reaching, and the carvings, infuriatingly, were right.',
        witness: 'You fed them the glowing tomb-moths. I want it noted that they trusted you.',
        effects: [{ op: 'maxHp', amount: 5 }],
      },
      {
        id: 'spare_moths',
        label: 'They do not eat the moths',
        resultText: 'You wave the plate away on their behalf. The moths resettle, unbothered, and your partner will simply never know what the sextons knew.',
        witness: 'You spared them the moth banquet. They looked almost disappointed. Almost.',
        effects: [{ op: 'heal', amount: 5 }],
      },
    ],
  },
  {
    id: 'reliquary_crown',
    name: 'The Reliquary Crown',
    act: 0,
    crossed: true,
    tone: 'comedy',
    prose:
      'The saint sits upright in her niche, perfectly composed, hands folded, skull tilted at an ' +
      'angle best described as expectant. On her brow rests a crown of braided silver and finger-bones, ' +
      'and the inscription beneath her is direct: THE CROWN SERVES. LET IT SERVE. The fit looks ' +
      'snug. The previous wearer, evidence suggests, did not remove it voluntarily — or possibly ' +
      'at all. One of you could wear it out of here. The other decides who.',
    options: [
      {
        id: 'crown_them',
        label: 'They wear the crown',
        resultText: 'It settles onto their head with a click that sounds distressingly final. The saint, somehow, looks satisfied. The crown begins, as promised, to serve.',
        witness: "You crowned them with a dead woman's finger-bones. Long live whatever they are now.",
        effects: [{ op: 'gainRelic' }, { op: 'loseHp', amount: 6 }],
      },
      {
        id: 'leave_crown',
        label: 'They go uncrowned',
        resultText: 'You leave the crown to the saint who earned it. Her skull tilts a fraction further, which you elect not to think about, and the silver keeps its shine for the next fools through.',
        witness: 'Denied royalty by committee of one. A very small committee.',
        effects: [{ op: 'gold', amount: 30 }],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Witness line pools (M2-B5, A3). New pools plus expansions for existing
// keys; no line duplicates content/witness.ts. Merge into WITNESS_LINES at
// registry-assembly time (new keys added; same keys concatenated).
// ---------------------------------------------------------------------------

export const M2_WITNESS: Record<string, string[]> = {
  partner_fallen: [
    'One of you is napping. The other is the plan now.',
    'Down, not out. The thread holds. Try to be worth holding.',
    'Half a partnership. Do show me what the Covenant was for.',
    "They'll get up if you win. No pressure. Well. Some pressure.",
    'The thread goes slack. I hate it when the thread goes slack.',
    'Alone at last. Is it everything you hoped?',
  ],
  revival: [
    'Back from the brink. The brink sends its regards.',
    'One heartbeat. Spend it more carefully than the last batch.',
    'They breathe. You carried them. Neither of you will mention it.',
    'Up you get. The dirt down there is reserved, anyway.',
    'A single hit point. I have seen sturdier candle flames. Walk gently.',
  ],
  shop: [
    'Ah, commerce. The one ritual that survived the apocalypse intact.',
    'Those prices are robbery. Says the merchant in a tomb. To looters.',
    'Spend it together or argue about it. Either entertains me.',
    'Shared gold. The fastest way to learn what your partner truly values.',
    'Buy something or stop fondling the merchandise.',
    "Haggle if you like. The dead don't discount.",
  ],
  // §14.13 (S4.2) tone budget: exactly one line, for a player's 4th+ removal
  removal_fourth: [
    'Cutting away at yourself again. The Thread notices.',
  ],
  map_disagree: [
    'Two destinations, one thread. Physics is against you.',
    'You do realize you are tied together. Pick a direction.',
    'Left, right, left, right. Shall I cut you in half and settle it?',
    'A compass has one needle for a reason. Confer.',
  ],
  victory_screen: [
    'You actually did it. I am revising centuries of pessimism. Slightly.',
    'The braid holds. Against all evidence, all odds, and all my predictions.',
    'It is done. Go home. Some of us have to stay.',
    'Two of you, one thread, and the dark blinked first. Noted, with reluctant pride.',
  ],
  act2_start: [
    'The Hollow Choir. Mind the acoustics. They mind you.',
    'Listen. That silence is rehearsed. They know you are coming.',
    'Deeper, then. The Undercroft was the welcome mat.',
    'The Choir went hollow before your grandparents were a rumor. Sing carefully.',
  ],
  finale_start: [
    'The Last Braid. Everything down here ends in thread. Including you, possibly.',
    'It is waiting. It has been waiting longer than I have, which is saying something.',
    'One more knot to tie. Or be tied into. Do get it right.',
  ],
  combat_start: [
    'More of them. Fewer of you. The usual arithmetic.',
    'Places, everyone. The dead do love a performance.',
    'Try coordinating this time. As an experiment.',
    'On your guard. Or someone else will be wearing it.',
  ],
  combat_victory: [
    'Done. The thread is intact. My amazement is not.',
    'A win. I shall alert absolutely no one.',
    'They fell, you stand. Order is restored, briefly.',
    'You two are developing competence. Catching, I hope, like a disease.',
  ],
  fray: [
    'Frayed again. The thread will start charging interest.',
    'That tearing sound? Your safety margin.',
    'The thread forgives. The thread also remembers. Mostly the second one.',
  ],
  resonance: [
    'The weave catches fire. Briefly, you deserve each other.',
    'Resonance. Whatever you just did — and I know you do not know — do it again.',
    'The thread blazes. Somewhere, my old masters are quietly furious.',
  ],
};
