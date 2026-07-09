// S22.3 (D3) — Act 4: the Loom's floor. Fixed authored content, reachable
// ONLY behind the completion gate (state.act4Open — the host claim opens the
// floor, S22.2/D2). Nothing here enters any act pool: eventsForAct matches
// act 1|2|0 and this event is act 4, so the braid's queues, shuffles, and
// rng consumption are untouched by construction (flag covenant).
//
// The Threshold — a passage node, not a fight: the wrong-way traffic (§5b's
// cheap haunting item, S8.4's ww_wrong_way) crosses the pair at last,
// visibly ascending. Mechanically a scripted event; narratively the proof
// the Machine still births. The held reveal is OVER by the time anyone
// stands here (the codex is complete; the completion taught the word), so
// dawn enters the prose here first — deliberately (Part 6, Act 4 floor row).
//
// ALL PROSE PROVISIONAL — S22 Part 6 "Act 4 floor" row; signs as one table.

import { EventDef } from '../types';

export const ACT4_EVENTS: EventDef[] = [
  {
    id: 'act4_threshold', name: 'The Threshold', act: 4, crossed: false,
    prose:
      'The way down continues where it never did before, and the shaft beside it is '
      + 'full of lights going up. Small. Pale. Unhurried. Dozens, where once you saw '
      + 'one and called it wrong-way. They pass the pair of you the way rain passes a '
      + 'lit window — close, indifferent, each with a long way still to go. Below, '
      + 'under everything, a grey that is not lamplight is starting.',
    options: [
      {
        id: 'descend', label: 'Go down, through them',
        resultText:
          'You walk down through the rising lights, and none of them minds you. The '
          + 'traffic was never wrong — it was only unexplained, and now the book on '
          + 'your side of the thread explains it. The Machine still births. Weakly. '
          + 'Wrongly. But the floor below is where they come from, and it is rendering.',
        witness:
          'You watched one of these climb past you once, and I told you I do not guess in front of the record. The record is finished now, so: they were never going the wrong way. We were.',
        effects: [],
      },
    ],
  },
];
