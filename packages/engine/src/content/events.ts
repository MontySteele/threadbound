// M1 events (§8): one standard, one crossed-choice. Prose/tone from
// docs/m1-writing.md (§10 — events stay somber; the Witness gets the sarcasm).

import { EventDef } from '../types';

export const EVENTS: Record<string, EventDef> = {
  cold_lantern: {
    id: 'cold_lantern',
    name: 'The Cold Lantern',
    act: 1,
    crossed: false,
    prose:
      'The lantern stands upright in the silt, as if set down by someone who meant to return. ' +
      'Its glass is unbroken. Its flame burns a pale, steady blue — and gives off no heat at all. ' +
      'The hand that left it is nearby, still curled in the shape of carrying. Whatever the light ' +
      'is for, it is not warmth. It has waited here a long while, patient as the dark around it, ' +
      'and it does not gutter when you breathe on it.',
    options: [
      {
        id: 'take',
        label: 'Take the lantern',
        resultText: "The cold climbs your arm and settles somewhere it shouldn't. The light is yours now. (Gain a card. Lose 6 HP.)",
        witness: "A dead man's light. I'm sure he won't mind. He didn't last time.",
        effects: [{ op: 'gainCard', pool: 'uncommon' }, { op: 'loseHp', amount: 6 }],
      },
      {
        id: 'leave',
        label: 'Leave it',
        resultText: 'You step back into the dark, and the dark, for once, feels kind. (Heal 6.)',
        witness: "Restraint. In this place. I'll have to recalibrate my contempt.",
        effects: [{ op: 'heal', amount: 6 }],
      },
    ],
  },
  basin: {
    id: 'basin',
    name: 'The Basin',
    act: 1,
    crossed: true, // §8: the chooser picks the outcome their PARTNER receives
    prose:
      'The basin is older than the walls around it, stone worn smooth by hands long gone to dust. ' +
      'The water inside is black and perfectly still — too still, as if it has been holding its ' +
      'breath since the Undercroft was sealed. It smells of iron and deep earth. Old script around ' +
      'the rim has been deliberately chiseled away, save for one word: mend. ' +
      'One of you may drink. The other decides.',
    options: [
      {
        id: 'drink',
        label: 'They drink',
        resultText: 'The water goes down cold and keeps going. Their wounds close. Something in the thread pulls loose. (They heal 12, but begin the next combat Frayed.)',
        witness: "You fed your partner the mystery water. They'll thank you. Through gritted teeth.",
        effects: [{ op: 'heal', amount: 12 }, { op: 'pendingFray', amount: 1 }],
      },
      {
        id: 'refuse',
        label: 'They do not drink',
        resultText: 'You turn them from the basin. The black water does not ripple. It can wait.',
        witness: 'You denied them the healing basin. Bold. Do explain it to their face.',
        effects: [{ op: 'nothing' }],
      },
    ],
  },
};
