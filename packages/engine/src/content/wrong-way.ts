// S8.4 — the wrong-way event (§5b: "the machine still births, weakly,
// wrongly"). Something ascends PAST the players, unexplained, while
// everything else in this place goes down. Texture, not economy: both
// options carry deliberately small consequences, and neither is explained.
//
// RARE: gated like clue events (enters the pool only when tracks OR rites
// is set — unflagged runs keep the plain shuffle and its exact rng
// consumption) and carries HALF a normal event's weight in map.ts's
// weighted queue, so a run can miss it entirely. Never repeats within a
// run (seenRareEvents → the seenGatedEvents exclusion in generateActMap).
//
// Held reveal (§5b): no birth vocabulary here — it wears death's grammar
// until the codex teaches otherwise. The Witness line must read either as
// not-knowing or as not-saying, and asserts nothing false either way (§4).
//
// codex hook reserved: codex_ww_wrong_way — the codex explains what these
// were, much later. Wiring is out of scope for S8.4.
//
// PROSE PROVISIONAL pending sign-off (S8 discipline).

import { EventDef } from '../types';

export const WRONG_WAY_EVENTS: EventDef[] = [
  {
    id: 'ww_wrong_way', name: 'The Wrong Way', act: 0, crossed: false,
    rare: true,
    prose:
      'The shaft beside the stair runs farther down than lamplight cares to follow, and '
      + 'everything in it is falling, slowly: dust, water, a fine snow of ash and grave-cloth '
      + 'fibers, all of it going down, the way everything here goes down. Then a light passes '
      + 'you, going up. Small. Pale. Unhurried. It does not notice you, or it does not mind '
      + 'you, and it climbs past with the patience of something that has a long way to go, '
      + 'and is gone above — where nothing goes.',
    options: [
      {
        id: 'watch', label: 'Watch it pass',
        resultText: 'You hold still, the both of you, until the light is out of sight and the shaft is only falling things again. Nothing follows it. Nothing explains it. The stillness stays with you a while, like heat from a doorway you did not open.',
        witness: 'It went up. Everything here goes down — the dust, the water, the dead, present company. I do not guess in front of the record. Keep to the stair.',
        effects: [{ op: 'heal', amount: 2 }],
      },
      {
        id: 'reach', label: 'Reach out',
        resultText: 'Your fingers pass its edge, barely — a warmth with a pull to it, going where it is going regardless of you. It takes something small on its way, and leaves something small, and neither of you can say which of the two you are still holding.',
        witness: 'You touched it. I am not going to tell you what that was. Whether that is discretion or ignorance, I leave to you.',
        effects: [{ op: 'loseHp', amount: 2 }, { op: 'thread', amount: 1 }],
      },
    ],
  },
];
