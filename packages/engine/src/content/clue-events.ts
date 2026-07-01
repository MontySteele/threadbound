// nt-slice clue events (S6.2 — docs/threadbound_narrative_track_slice.md).
// LORE PROVISIONAL. Six events, flag-gated into the pool at elevated weight.
// Each has a REAL non-clue choice with real value, and the clue choice has a
// real cost — clue events must not be free lore dispensers or the
// fights-vs-events routing tension dies.
//
// This module is CLIENT-SAFE: scene prose and option text only. Fragment
// text and elimination maps live in content/truth.ts (server-side, §11 ext);
// the 'fragments' effect op is resolved there. resultText on clue options is
// deliberately generic — the actual fragment arrives on each player's own
// Tapestry, never in the shared result.

import { EventDef } from '../types';

const PINNED = 'A thread pulls loose and pins itself to each of your Tapestries.';

export const CLUE_EVENTS: EventDef[] = [
  // Fragment slots (authored in truth.ts): A → q_what, B → q_why
  {
    id: 'nt_unrung_bell',
    name: 'The Unrung Bell',
    act: 0,
    crossed: false,
    clue: true,
    prose:
      'A bell lies half-buried in the nave floor — a bell too heavy to have ever been hung. ' +
      'No tower above it, no beam that could have held it. It is simply here, canted in the ' +
      'broken stone, its mouth full of dust and its surface unscarred. Bells are made to be ' +
      'heard. Someone went to enormous trouble so this one never would be.',
    options: [
      {
        id: 'ring',
        label: 'Ring it (the sound will go through you)',
        resultText: 'The sound goes through you like a hand through water, and leaves something behind. ' + PINNED,
        witness: 'You rang the enormous ominous bell. Of course you did.',
        effects: [{ op: 'loseHp', amount: 4 }, { op: 'fragments' }],
      },
      {
        id: 'scavenge',
        label: 'Scavenge the fittings',
        resultText: 'The mounting brackets alone are worth a purse. The bell watches you work, in the way of heavy things.',
        witness: 'Stripping a bell for scrap. The parish would be scandalized, if it were less dead.',
        effects: [{ op: 'gold', amount: 15 }],
      },
    ],
  },
  // A → q_who, B → q_what
  {
    id: 'nt_tithe_ledger',
    name: 'The Tithe Ledger',
    act: 0,
    crossed: false,
    clue: true,
    prose:
      'The vestry desk has kept its ledger dry for a century. Columns of names, tithes paid and ' +
      'owed, in a clerk’s hand that gets worse as the pages go on — and then stops being a ' +
      'clerk’s hand at all. The last entries are heavy, gouged, the pen pressed nearly through ' +
      'the paper. Reading it properly would take time you can feel you do not have. Or there is ' +
      'the cash box, which asks nothing of you.',
    options: [
      {
        id: 'read',
        label: 'Read the last pages properly',
        resultText: 'The names rearrange themselves behind your eyes. Some of them will not sit down again. ' + PINNED,
        witness: 'Bookkeeping. We came all this way to audit the dead.',
        effects: [{ op: 'pendingFray', amount: 1 }, { op: 'fragments' }],
      },
      {
        id: 'cashbox',
        label: 'Take the cash box',
        resultText: 'The box is heavier than it looks. The ledger stays shut, and keeps whatever it was pressing.',
        witness: 'Straight for the money. I respect the honesty of it.',
        effects: [{ op: 'gold', amount: 30 }],
      },
    ],
  },
  // A → q_why, B → q_who
  {
    id: 'nt_choir_stalls',
    name: 'The Emptied Stalls',
    act: 0,
    crossed: false,
    clue: true,
    prose:
      'The choir stalls are intact, which is wrong — everything else in this place has been ' +
      'broken by time or by hands, and these carved seats stand untouched, robes folded on each ' +
      'one as if laundered yesterday. Twelve seats. Eleven robes. You could sit in the bare ' +
      'stall and listen to what a room like this remembers. Or take the robes — the cloth is ' +
      'fine, and the dead sing no colder for being robbed.',
    options: [
      {
        id: 'sit',
        label: 'Sit in the bare stall and listen',
        resultText: 'The room remembers at you, all at once, and it costs you something to hold it. ' + PINNED,
        witness: 'Twelve seats, eleven robes, and my companion sits in the cursed one. Naturally.',
        effects: [{ op: 'loseHp', amount: 5 }, { op: 'fragments' }],
      },
      {
        id: 'robes',
        label: 'Bundle up the robes',
        resultText: 'Good cloth, warm and close-woven. Whoever the twelfth was, they left nothing behind to take.',
        witness: 'Grave-robbing, but make it textiles.',
        effects: [{ op: 'gold', amount: 20 }, { op: 'heal', amount: 4 }],
      },
    ],
  },
  // A → q_what, B → q_who
  {
    id: 'nt_sexton_lodge',
    name: 'The Sexton’s Lodge',
    act: 0,
    crossed: false,
    clue: true,
    prose:
      'A groundskeeper’s lodge, built against the crypt wall, its door bricked over from the ' +
      'inside. The bricks are laid badly — hurried — but the mortar was mixed with care, as if ' +
      'the mason had all the skill and none of the time. There is a gap where the flue was. You ' +
      'could break the wall and go in through the ruin of someone’s last decision. Or leave it ' +
      'sealed and take the toolshed’s worth of good iron leaning outside.',
    options: [
      {
        id: 'break_in',
        label: 'Break through the bricked door',
        resultText: 'The wall comes down harder than it went up. Inside, the lodge tells you what it was for. ' + PINNED,
        witness: 'Someone bricked that door from the inside, and you have un-decided it for them.',
        effects: [{ op: 'loseHp', amount: 4 }, { op: 'fragments' }],
      },
      {
        id: 'tools',
        label: 'Take the good iron and move on',
        resultText: 'Sound tools, honest weight. The wall keeps its counsel and you keep your questions.',
        witness: 'Prudence! From you two! The Undercroft must be freezing over.',
        effects: [{ op: 'gainCard', pool: 'common' }],
      },
    ],
  },
  // A → q_why, B → q_what
  {
    id: 'nt_flooded_crypt',
    name: 'The Flooded Crypt',
    act: 0,
    crossed: false,
    clue: true,
    prose:
      'The lower crypt is drowned in black, still water, and the water is full of offerings: ' +
      'bowls, rings, loaves gone to stone, all laid in careful rows on the submerged steps as ' +
      'far down as light reaches. Offerings are answers, if you can read what they were asking ' +
      'for. The cold of that water is nothing friendly. Or you could fish out the rings and ' +
      'leave the asking to the dead.',
    options: [
      {
        id: 'wade',
        label: 'Wade down and read the offerings',
        resultText: 'The cold takes its toll, and the rows give up their grammar. Someone was asking for something, over and over. ' + PINNED,
        witness: 'Wading into the dark water. I would stop you if I had arms.',
        effects: [{ op: 'loseHp', amount: 6 }, { op: 'fragments' }],
      },
      {
        id: 'fish',
        label: 'Fish the rings off the top step',
        resultText: 'Gold is gold, wet or dry. The deeper rows keep their questions.',
        witness: 'Skimming the shallow end of a votive lake. A connoisseur’s sacrilege.',
        effects: [{ op: 'gold', amount: 35 }, { op: 'pendingFray', amount: 1 }],
      },
    ],
  },
  // A → q_who, B → q_why
  {
    id: 'nt_stranger_stone',
    name: 'The Stranger’s Stone',
    act: 0,
    crossed: false,
    clue: true,
    prose:
      'In the memorial wall, among generations of carved parish names, one stone is blank — ' +
      'no name, no dates, set with more care than any of the others and worn smooth by ' +
      'hands. Somebody has been touching this stone for a long time. There is a seam where it ' +
      'could be levered out. Behind it will be a niche, and niches are never empty. Reading a ' +
      'grave with your fingers is slow work, and this place does not love being read.',
    options: [
      {
        id: 'trace',
        label: 'Trace the blank stone until it answers',
        resultText: 'Under your fingers the smoothness has a shape, and the shape is familiar in a way you dislike. ' + PINNED,
        witness: 'Fondling the anonymous gravestone. This is why we cannot have nice expeditions.',
        effects: [{ op: 'pendingFray', amount: 1 }, { op: 'fragments' }],
      },
      {
        id: 'lever',
        label: 'Lever it out and take the niche’s hoard',
        resultText: 'The stone comes free with a sigh. Coin and a knotted cord, and a dark you decline to reach further into.',
        witness: 'Prying open the one unmarked grave. Your instincts are a museum of bad ideas.',
        effects: [{ op: 'gold', amount: 25 }, { op: 'covetCharge', amount: 1 }],
      },
    ],
  },
];
