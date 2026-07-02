// S7.3 character events — the birth-rite routing economy. Three per role,
// act 0, gated into the pool only when that character is in the run AND the
// rites flag is set (map.ts, clue-event pattern), at the same 2x queue
// weight ("one economy, two payoffs"). The event's ACTOR (forced to the
// matching character's seat) earns 1 birth-rite progress on resolution.
//
// S8.3 voice pass: prose, labels, resultText, and Witness partner-channel
// lines authored to full quality (PROVISIONAL pending sign-off). Structure,
// ids, and effects are S7.3-final — do not touch. Witness lines obey the §4
// laws: it knows the rite's FORM perfectly (procedures, titles, songs,
// names); it cannot know content the breakage took, and where a gap is, it
// deflects. It never states a falsehood.

import { EventDef } from '../types';

export const CHARACTER_EVENTS: EventDef[] = [
  // ---- Vess (the Hexweaver): stations, wards, needlework ------------------
  {
    id: 'ce_vess_station', name: 'The Abandoned Station', act: 0, crossed: false,
    character: 'vess',
    prose:
      'A weaver’s station stands whole in the wreckage: loom squared, warp still under tension, '
      + 'a working half-made in the frame. Vess reads the pattern the way you read a letter that '
      + 'stops mid-word — ward-knots, a binding row, and then nothing. The last hand left '
      + 'mid-row, and the shed is still open, waiting for the next pass. Stations are never left '
      + 'like this. A weaver banks her loom the way other trades bank a fire.',
    options: [
      {
        id: 'finish', label: 'Finish the row (the pattern will take from you)',
        resultText: 'Your hands find the rhythm before you consent to it. The row closes, the working settles into the frame like a held breath let out, and the pattern comes away with you — learned, the way a burn is learned.',
        witness: 'A station banked mid-row. There is a procedure for that — three knots and a witness, as it happens. What she was weaving, I cannot tell you. That is not modesty.',
        effects: [{ op: 'loseHp', amount: 4 }, { op: 'gainCard', pool: 'uncommon' }],
      },
      {
        id: 'strip', label: 'Strip the frame for fittings',
        resultText: 'Good brass, better bone. The heddles come away like teeth. The half-made working sighs out of the warp as you work, and then it is nowhere, and then it never was.',
        witness: 'The guild fined loom-breakers a year of thread — I could cite you the statute, article and knot. There is no one left to collect. Apparently that passes for permission.',
        effects: [{ op: 'gold', amount: 18 }],
      },
    ],
  },
  {
    id: 'ce_vess_wardline', name: 'The Unfinished Ward', act: 0, crossed: false,
    character: 'vess',
    prose:
      'A ward crosses the corridor at chest height, woven into the stone itself — silver thread '
      + 'run through granite as if through linen. It stops mid-sigil. Below the break, the '
      + 'weaver’s scaffold lies where it fell. Whatever the ward was raised to keep out has long '
      + 'since gone around. Whatever it was raised to keep in has had years to study the gap.',
    options: [
      {
        id: 'complete', label: 'Close the sigil (your thread, your blood)',
        resultText: 'You wet the thread and finish another weaver’s sentence. The line takes, seals, sings one low note through the stone — and something on the far side of it stops listening. The leftover lengths coil to your wrist as if they have decided about you.',
        witness: 'Ward-work closed with the weaver’s own blood. That is the old form — the correct form, if you want a professional opinion, and I am the last professional. What it wards, I won’t say.',
        effects: [{ op: 'loseHp', amount: 3 }, { op: 'thread', amount: 2 }],
      },
      {
        id: 'unpick', label: 'Unpick it for the silver',
        resultText: 'The ward comes apart in long silver lengths, warm as a living thing. The corridor feels wider than it did. It is not wider.',
        witness: 'She unpicked a standing ward for the thread. I have watched looters do the same. The looters, at least, had the sense to run afterward.',
        effects: [{ op: 'gold', amount: 12 }, { op: 'pendingFray', amount: 1 }],
      },
    ],
  },
  {
    id: 'ce_vess_needle', name: 'The Sister’s Needle', act: 0, crossed: false,
    character: 'vess',
    prose:
      'On the workbench, in a case lined with grave-cloth, a needle of hand-worn bone as long '
      + 'as your palm. Weavers pass their needles down — hand to hand, name to name, each name '
      + 'scratched into the shaft by the one who inherits it. This case was not dropped. It was '
      + 'laid out, squared to the bench’s edge, to be found. There is room on the shaft for one '
      + 'more name.',
    options: [
      {
        id: 'take', label: 'Take up the needle (add your name)',
        resultText: 'It warms in your grip like something waking from a shallow sleep. You scratch your name below the last, and the whole line of them settles into your hand — every stitch those hands ever made, ready to be made again.',
        witness: 'The needle-line. I could recite every name on that shaft, and the vigil-song sung at each passing-down — all of it, note for note. The woman who laid it out to be found: her, I cannot account for.',
        effects: [{ op: 'loseHp', amount: 3 }, { op: 'maxHp', amount: 4 }],
      },
      {
        id: 'leave', label: 'Fold the grave-cloth back over it',
        resultText: 'You square the case to the bench’s edge, exactly as it was left for you. Somewhere down the line another weaver will kneel here, and choose, and the line will not have been broken by you.',
        witness: 'Left where it lay, in proper order, grave-cloth folded to the correct third. Restraint. From one of you. I am recording the date.',
        effects: [{ op: 'heal', amount: 4 }],
      },
    ],
  },

  // ---- Bram (the Cinderfist): forges, embers, oaths -----------------------
  {
    id: 'ce_bram_forge', name: 'The Cold Forge', act: 0, crossed: false,
    character: 'bram',
    prose:
      'A fist-forge, cold. The quench-trough is dry and the anvil wears its dust like a shroud. '
      + 'The maker’s mark on the horn is one Bram knows — knows the way you know a signature you '
      + 'once watched being taught, stroke by stroke, to your own hand. A forge is never left '
      + 'cold. It is banked, or it is buried. This one was neither.',
    options: [
      {
        id: 'relight', label: 'Relight it, one working’s worth',
        resultText: 'The coals take from your cupped hands as if they remember the arrangement. One working — your own gear, trued on a dead man’s anvil — then you rake the fire down and let it die the way it should have been let die the first time.',
        witness: 'One fire, one working, then banked and killed by the forms. That is how a forge is put to rest; I know the rite entire, verse and hammer-count. Whose forge, and why it went cold unburied — ask me something easier.',
        effects: [{ op: 'loseHp', amount: 3 }, { op: 'upgradeRandom' }],
      },
      {
        id: 'quench', label: 'Leave it cold; take the good steel',
        resultText: 'The stock steel is honest weight, and the dead have no more use for honesty than for weight. The forge stays dark behind you — which is its own kind of respect, or near enough that you can carry it.',
        witness: 'Stripping a master’s stock with his mark still on the horn. He kept his eyes down the whole time he worked. I noticed. Noticing is most of what I have left.',
        effects: [{ op: 'gold', amount: 18 }],
      },
    ],
  },
  {
    id: 'ce_bram_emberpouch', name: 'The Ember Pouch', act: 0, crossed: false,
    character: 'bram',
    prose:
      'A fire-carrier’s pouch hangs where its owner left it, and it is warm. After all this '
      + 'time, warm. A Cinderfist takes his first fire from his master’s forge and carries it '
      + 'until he dies; the pouch outliving the carrier is not supposed to happen. There is a '
      + 'rite for a carrier’s death, and this is not what it leaves behind.',
    options: [
      {
        id: 'carry', label: 'Carry it onward (a second fire is a second debt)',
        resultText: 'The pouch settles against your ribs beside your own. Two heats, slightly out of step, like two hearts disagreeing about the hour. Whatever the first carrier owed, you have set your mark under it.',
        witness: 'Two fires on one man. The forms allow it — briefly, for a bearer carrying a dead brother’s flame home. Where home would be, for that one: there I have nothing for you.',
        effects: [{ op: 'pendingFray', amount: 1 }, { op: 'covetCharge', amount: 1 }],
      },
      {
        id: 'bury', label: 'Bury it hot, as the rite demands',
        resultText: 'You cut the earth and lay the ember down still glowing, and speak what you can remember of the words over it. The ground keeps what it is given. It has kept a great deal.',
        witness: 'Buried hot, with the words, while the ceiling dripped on his neck. I have seen that rite done worse by men who were paid for it. I mean this plainly: well done.',
        effects: [{ op: 'heal', amount: 4 }],
      },
    ],
  },
  {
    id: 'ce_bram_oath', name: 'The Broken Oath-Ring', act: 0, crossed: false,
    character: 'bram',
    prose:
      'Half an iron oath-ring, snapped clean, caught in the sluice grating. Fist-brothers break '
      + 'a ring for one reason only, and each keeps his half afterward, so that neither man can '
      + 'pretend it did not happen. The other half is not here. Bram checks twice — and then a '
      + 'third time, which is not like him.',
    options: [
      {
        id: 'pocket', label: 'Pocket the half (someone should remember)',
        resultText: 'The iron sits cold in your pocket and does not warm against you, which broken oath-iron never does. Someone swore this, and someone broke it, and now someone carries it. Some weights are the point of themselves; this one, at least, teaches the carrying.',
        witness: 'Half a ring, kept. That is the form — the keeping is the whole of the penance. What was sworn, and which brother broke it, the breaking took with it. I would tell you if I could. Sit with how rarely I say that.',
        effects: [{ op: 'gainCard', pool: 'common' }, { op: 'loseHp', amount: 2 }],
      },
      {
        id: 'sink', label: 'Drop it through the grate; done is done',
        resultText: 'You work the half free and let it go: a long fall, a small splash, far below. In the silt where it sat, toll-coins, washed down from somewhere with better luck. Whatever was sworn here is finally, fully over.',
        witness: 'Straight through the grate, and he never broke stride. There is a word for that in the old fist-oaths. I decline to say which one.',
        effects: [{ op: 'gold', amount: 10 }],
      },
    ],
  },
];
