// S7.3 character events — the birth-rite routing economy. Three per role,
// act 0, gated into the pool only when that character is in the run AND the
// rites flag is set (map.ts, clue-event pattern), at the same 2x queue
// weight ("one economy, two payoffs"). The event's ACTOR (forced to the
// matching character's seat) earns 1 birth-rite progress on resolution.
//
// PROSE IS PLACEHOLDER (S7.3: structure and choices final, S8.3 authors
// voice). Each event is a real choice with real cost — no vending machines
// (M2 house rule). Witness partner-channel lines are stubs for the S8.7
// pools.

import { EventDef } from '../types';

export const CHARACTER_EVENTS: EventDef[] = [
  // ---- Vess (the Hexweaver): stations, wards, needlework ------------------
  {
    id: 'ce_vess_station', name: 'The Abandoned Station', act: 0, crossed: false,
    character: 'vess',
    prose:
      'A hexweaver’s station stands in the rubble, loom intact, a working half-finished in '
      + 'the frame. The pattern is one Vess knows — almost. The last hand left mid-row.',
    options: [
      {
        id: 'finish', label: 'Finish the row (the pattern will take from you)',
        resultText: 'The row completes itself once your hands begin it. The station accepts the work, and the work accepts you.',
        witness: 'Another weaver’s row. Finishing it is either homage or theft; the loom won’t say which.',
        effects: [{ op: 'loseHp', amount: 4 }, { op: 'gainCard', pool: 'uncommon' }],
      },
      {
        id: 'strip', label: 'Strip the frame for fittings',
        resultText: 'Good brass, better bone. The half-made working unravels quietly as you work.',
        witness: 'Scrapping a station. The guild would have your fingers. The guild is dead.',
        effects: [{ op: 'gold', amount: 18 }],
      },
    ],
  },
  {
    id: 'ce_vess_wardline', name: 'The Unfinished Ward', act: 0, crossed: false,
    character: 'vess',
    prose:
      'A ward-line crosses the corridor at chest height, woven into the stone — and stops, '
      + 'mid-sigil, where the weaver’s scaffold fell. Whatever it was holding out is long '
      + 'gone. Whatever it was holding IN may not be.',
    options: [
      {
        id: 'complete', label: 'Complete the sigil (your thread, your blood)',
        resultText: 'The line closes. Something on the far side of the stone stops listening.',
        witness: 'She finished a dead weaver’s ward on credit. Bold accounting.',
        effects: [{ op: 'loseHp', amount: 3 }, { op: 'thread', amount: 2 }],
      },
      {
        id: 'unpick', label: 'Unpick it for the thread',
        resultText: 'The ward comes apart in long silver lengths. The corridor feels wider than it did.',
        witness: 'Unpicking wards for yarn. I have seen looters with more ceremony.',
        effects: [{ op: 'gold', amount: 12 }, { op: 'pendingFray', amount: 1 }],
      },
    ],
  },
  {
    id: 'ce_vess_needle', name: 'The Sister’s Needle', act: 0, crossed: false,
    character: 'vess',
    prose:
      'On a workbench, in a case lined with grave-cloth, a bone needle the length of a hand. '
      + 'Weavers pass their needles down, hand to hand, name to name. This one was laid out '
      + 'to be found. Names are scratched down the shaft; there is room for one more.',
    options: [
      {
        id: 'take', label: 'Take up the needle (add your name)',
        resultText: 'The needle warms in your grip like something waking. Your name goes at the end of the line.',
        witness: 'She signed a dead woman’s needle. That contract has no exit clause.',
        effects: [{ op: 'loseHp', amount: 3 }, { op: 'maxHp', amount: 4 }],
      },
      {
        id: 'leave', label: 'Close the case and leave it for the next hand',
        resultText: 'You fold the grave-cloth back over it. Somewhere down the line, another weaver will choose.',
        witness: 'Left where it lay. Restraint, from this one. I am making a note.',
        effects: [{ op: 'heal', amount: 4 }],
      },
    ],
  },

  // ---- Bram (the Cinderfist): forges, embers, oaths -----------------------
  {
    id: 'ce_bram_forge', name: 'The Cold Forge', act: 0, crossed: false,
    character: 'bram',
    prose:
      'A fist-forge, cold. The quench-trough is dry and the anvil wears dust like a shroud. '
      + 'Bram knows the maker’s mark on the horn — knows it the way you know a signature you '
      + 'once watched being taught.',
    options: [
      {
        id: 'relight', label: 'Relight it, one working’s worth',
        resultText: 'The coals take from your cupped hands. One working, then you let it die properly this time.',
        witness: 'He lit a dead man’s forge to true his own gear. Sentiment, with a use.',
        effects: [{ op: 'loseHp', amount: 3 }, { op: 'upgradeRandom' }],
      },
      {
        id: 'quench', label: 'Leave it cold; take the good steel',
        resultText: 'The stock steel is honest weight. The forge stays dark, which is its own kind of respect.',
        witness: 'Stripping a master’s forge. He kept his eyes down the whole time.',
        effects: [{ op: 'gold', amount: 18 }],
      },
    ],
  },
  {
    id: 'ce_bram_emberpouch', name: 'The Ember Pouch', act: 0, crossed: false,
    character: 'bram',
    prose:
      'A fire-carrier’s pouch, still warm after all this time, hanging where its owner left '
      + 'it. Cinderfists carry their first fire until they die; the pouch outliving the '
      + 'carrier is not supposed to happen.',
    options: [
      {
        id: 'carry', label: 'Carry it onward (a second fire is a second debt)',
        resultText: 'The pouch settles against your ribs beside your own. Two heartbeats of heat, slightly out of step.',
        witness: 'He is carrying two fires now. Greedy, or dutiful. The Undercroft will find out which.',
        effects: [{ op: 'pendingFray', amount: 1 }, { op: 'covetCharge', amount: 1 }],
      },
      {
        id: 'bury', label: 'Bury it hot, as the rite demands',
        resultText: 'You cut the earth and lay the ember down still glowing. The ground keeps what it is given.',
        witness: 'He buried a fire with full honors while the ceiling dripped. I mean this: well done.',
        effects: [{ op: 'heal', amount: 4 }],
      },
    ],
  },
  {
    id: 'ce_bram_oath', name: 'The Broken Oath-Ring', act: 0, crossed: false,
    character: 'bram',
    prose:
      'Half an iron oath-ring in the sluice grating, snapped clean. Fist-brothers break a '
      + 'ring only for one reason, and each keeps his half so neither can pretend it '
      + 'didn’t happen. The other half is nowhere. Bram checks twice.',
    options: [
      {
        id: 'pocket', label: 'Pocket the half (someone should remember)',
        resultText: 'The iron is cold in your pocket and does not warm. Some weights are the point of themselves.',
        witness: 'He took up half an oath that was never his. The dead brother may want a word.',
        effects: [{ op: 'gainCard', pool: 'common' }, { op: 'loseHp', amount: 2 }],
      },
      {
        id: 'sink', label: 'Drop it through the grate, done is done',
        resultText: 'A long fall, a small splash. Whatever was sworn here is finally, fully over.',
        witness: 'Straight through the grate. He didn’t even slow his stride. Cold — or correct.',
        effects: [{ op: 'gold', amount: 10 }],
      },
    ],
  },
];
