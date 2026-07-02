// Narrative truth content, SECRET HALF (nt-slice). The public ontology
// (questions/answers) lives in content/questions.ts; THIS module holds the
// VALID-COMBO table and the fragment→elimination maps and must stay off the
// client bundle — nothing under client/src may import it, and the engine
// index does not re-export it. Only the reducer consumes it. The wire-capture
// gate (S6.3/S6.9) covers the websocket; this import discipline covers the
// bundle. LORE PROVISIONAL until the lore bible session.

import { FragmentDef } from '../types';
import { rngInt } from '../rng';
import { ANSWERS_BY_ID, QUESTIONS_BY_ID } from './questions';

export { QUESTIONS, ANSWERS, QUESTIONS_BY_ID, ANSWERS_BY_ID, answersFor } from './questions';

// ---- the VALID-COMBO table ---------------------------------------------------
// The truth is drawn from THIS table, never from the raw answer product —
// coherence is content (spec data-model sketch). In the slice all twelve
// products happen to be coherent, but each is still an explicit authored row
// so future lore passes can strike rows without touching code.

type Truth = { q_who: string; q_what: string; q_why: string };

export const VALID_COMBOS: ReadonlyArray<Truth> = [
  { q_who: 'a_kin', q_what: 'a_sexton', q_why: 'a_hunger' },
  { q_who: 'a_kin', q_what: 'a_sexton', q_why: 'a_grief' },
  { q_who: 'a_kin', q_what: 'a_sexton', q_why: 'a_kept' },
  { q_who: 'a_kin', q_what: 'a_peal', q_why: 'a_hunger' },
  { q_who: 'a_kin', q_what: 'a_peal', q_why: 'a_grief' },
  { q_who: 'a_kin', q_what: 'a_peal', q_why: 'a_kept' },
  { q_who: 'a_hired', q_what: 'a_sexton', q_why: 'a_hunger' },
  { q_who: 'a_hired', q_what: 'a_sexton', q_why: 'a_grief' },
  { q_who: 'a_hired', q_what: 'a_sexton', q_why: 'a_kept' },
  { q_who: 'a_hired', q_what: 'a_peal', q_why: 'a_hunger' },
  { q_who: 'a_hired', q_what: 'a_peal', q_why: 'a_grief' },
  { q_who: 'a_hired', q_what: 'a_peal', q_why: 'a_kept' },
];

/** Seed-deterministic truth roll: one uniform draw over the combo table. */
export function rollTruth(rng: number): { value: Record<string, string>; state: number } {
  const r = rngInt(rng, VALID_COMBOS.length);
  return { value: { ...VALID_COMBOS[r.value] }, state: r.state };
}

// ---- fragments (S6.2) --------------------------------------------------------
// One variant per (event slot × eliminable answer). A variant that eliminates
// answer X is served only when X is FALSE under the rolled truth — its prose
// is evidence AGAINST X, and never a conclusion: the sentence completes out
// loud, between the players (worked-example pattern). Actor-channel prose is
// direct second person; partner-channel prose is Witness-voiced, because in
// solo the Witness speaks it.

const frag = (
  eventId: string, channel: 'actor' | 'partner', bearsOn: string,
  eliminates: string, text: string,
): FragmentDef => ({
  id: `f_${eventId.replace(/^nt_/, '')}_${channel === 'actor' ? 'a' : 'b'}_${eliminates.replace(/^a_/, '')}`,
  eventId, channel, text, bearsOn, eliminates: [eliminates], strength: 1,
});

export const FRAGMENTS: FragmentDef[] = [
  // ---- The Unrung Bell: A → q_what, B → q_why -----------------------------
  frag('nt_unrung_bell', 'actor', 'q_what', 'a_peal',
    'The clapper is bound in grave-cloth, knot over knot. Someone silenced this bell ON PURPOSE — it never got to speak.'),
  frag('nt_unrung_bell', 'actor', 'q_what', 'a_sexton',
    'The clapper is worn to a sliver and the sound-bow is bright with wear. Whatever else is true, this bell rang — long, and often, and recently.'),
  frag('nt_unrung_bell', 'partner', 'q_why', 'a_hunger',
    'Your friend hears a bell. I hear the pause after one — and whatever holds that pause, it is not appetite. Hunger keeps nothing — hunger only takes.'),
  frag('nt_unrung_bell', 'partner', 'q_why', 'a_grief',
    'There is no mourning in this metal. The chamber is squared away, swept, almost proud — and grief does not sweep.'),
  frag('nt_unrung_bell', 'partner', 'q_why', 'a_kept',
    'The pause after this bell was dropped, not kept — snapped off mid-breath. Whatever was being kept here, its keeper stopped keeping it.'),

  // ---- The Tithe Ledger: A → q_who, B → q_what -----------------------------
  frag('nt_tithe_ledger', 'actor', 'q_who', 'a_kin',
    'Your family name is not in the ledger. Not paid, not owing, not born, not buried. Whoever you are, this parish never wrote you down.'),
  frag('nt_tithe_ledger', 'actor', 'q_who', 'a_hired',
    'Your name IS in the ledger. Not in the tithes — in the debts column, generations deep, marked "carried forward." Nobody pays a hireling in inherited debt.'),
  frag('nt_tithe_ledger', 'partner', 'q_what', 'a_peal',
    'The last clerk billed the parish for grave-cloth and beeswax — muffling goods — and then for silence itself, one entry, unpriced. You do not buy silence for a bell that will not stop.'),
  frag('nt_tithe_ledger', 'partner', 'q_what', 'a_sexton',
    'The final pages are ruled into hours, and every hour is marked RANG. Page after page. Your friend’s clerk was not silencing anything — he was counting strokes until his hand gave out.'),

  // ---- The Emptied Stalls: A → q_why, B → q_who -----------------------------
  frag('nt_choir_stalls', 'actor', 'q_why', 'a_hunger',
    'The room remembers a last supper laid out and left UNEATEN — twelve portions gone to dust in place. Nobody starving walks away from bread.'),
  frag('nt_choir_stalls', 'actor', 'q_why', 'a_grief',
    'The room remembers singing — work-songs, tally-songs, nothing sorrowing. Right to the end they kept time like people with a job to finish, not a loss to carry.'),
  frag('nt_choir_stalls', 'actor', 'q_why', 'a_kept',
    'The room remembers the moment they broke their own rule — all twelve, at once, gladly. Whatever covenant held this parish, the choir did not die keeping it.'),
  frag('nt_choir_stalls', 'partner', 'q_who', 'a_kin',
    'Eleven robes for twelve seats, and the twelfth seat is sized for nobody in your friend’s bloodline — I have seen your friend sit, and that stall was not carved for such shoulders. Strangers’ shoulders, maybe.'),
  frag('nt_choir_stalls', 'partner', 'q_who', 'a_hired',
    'The twelfth robe is missing because it was sent away — the stall bears a departure blessing, the kind sung over kin leaving to return. Parishes do not bless the exits of the help.'),

  // ---- The Sexton’s Lodge: A → q_what, B → q_who ----------------------------
  frag('nt_sexton_lodge', 'actor', 'q_what', 'a_peal',
    'The lodge walls are packed with wool and sand — a house braced against a sound. But the wadding is pristine, unshaken after all these years. The deafening was built, and then never once needed.'),
  frag('nt_sexton_lodge', 'actor', 'q_what', 'a_sexton',
    'The lodge is a ringing-room: rope-burns on the beam, a striker’s bench, ear-wax votives in tidy rows. Whoever lived here served the bell’s VOICE. You do not keep a striker’s bench for a silenced bell.'),
  frag('nt_sexton_lodge', 'partner', 'q_who', 'a_kin',
    'The sexton kept portraits of every parish family — walls of them. I have been watching your friend’s face all this while, and it is on no wall in that lodge.'),
  frag('nt_sexton_lodge', 'partner', 'q_who', 'a_hired',
    'The sexton’s last letter, unfinished on the desk, begins "To my own, when you come home at last." It was never sent. It did not need to be. Hired hands are written to care of an agent.'),

  // ---- The Flooded Crypt: A → q_why, B → q_what -----------------------------
  frag('nt_flooded_crypt', 'actor', 'q_why', 'a_hunger',
    'The offerings on the upper steps are FOOD, untouched, laid row on row into the dark — loaves gone to stone with no tooth-mark on them. People asking about hunger eat the bread. These people were giving it away.'),
  frag('nt_flooded_crypt', 'actor', 'q_why', 'a_grief',
    'Not one offering is a mourning-gift — no cut hair, no rings paired on cord, none of grief’s grammar. Whatever they went down asking for, they were not asking it of the dead.'),
  frag('nt_flooded_crypt', 'actor', 'q_why', 'a_kept',
    'The offerings stop mid-row. Mid-GESTURE — a bowl set down crooked and never straightened. Covenants end in completion or in breach; this asking simply got its answer, and the answer was not "continue."'),
  frag('nt_flooded_crypt', 'partner', 'q_what', 'a_peal',
    'Below the waterline the votive stands are fitted with mufflers — cloth bells, tongue-tied, offered by the dozen. An offering is a wish. Nobody wishes muffling on a bell that is already silent.'),
  frag('nt_flooded_crypt', 'partner', 'q_what', 'a_sexton',
    'The deepest offerings are tiny bells, hundreds, every one with its clapper filed BRIGHT — eager to sound. These people were not asking for quiet. They were asking the ringing to keep on.'),

  // ---- The Stranger’s Stone: A → q_who, B → q_why ---------------------------
  frag('nt_stranger_stone', 'actor', 'q_who', 'a_kin',
    'The blank stone’s shape under your fingers is a stranger’s memorial — the parish mark for "one not of us, honored anyway." It is the most-touched stone in the wall. They loved someone from OUTSIDE.'),
  frag('nt_stranger_stone', 'actor', 'q_who', 'a_hired',
    'The blank stone carries the parish’s own mark, worn but unmistakable — this is family plot, held EMPTY, waiting. Parishes do not hold graves for the help. They hold them for kin expected home.'),
  frag('nt_stranger_stone', 'partner', 'q_why', 'a_hunger',
    'The hands that wore that stone smooth were not thin hands — the polish is deep and slow, decades of well-fed patience. Starving parishes leave other marks. I have seen them.'),
  frag('nt_stranger_stone', 'partner', 'q_why', 'a_grief',
    'Grief visits a stone and then, year by year, forgets the way. This stone was touched on a SCHEDULE — same height, same stroke, to the end. That is not sorrow. That is observance.'),
  frag('nt_stranger_stone', 'partner', 'q_why', 'a_kept',
    'The touching STOPPED — cleanly, all at once, dust settling undisturbed in the last season. A kept covenant does not stop being kept. Whatever this was, someone was released from it.'),
];

export const FRAGMENTS_BY_ID: Record<string, FragmentDef> = {};
for (const f of FRAGMENTS) {
  if (FRAGMENTS_BY_ID[f.id]) throw new Error(`duplicate fragment id ${f.id}`);
  if (!QUESTIONS_BY_ID[f.bearsOn]) throw new Error(`fragment ${f.id} bears on unknown question ${f.bearsOn}`);
  for (const a of f.eliminates) {
    if (ANSWERS_BY_ID[a]?.questionId !== f.bearsOn) {
      throw new Error(`fragment ${f.id} eliminates ${a} outside its question`);
    }
  }
  FRAGMENTS_BY_ID[f.id] = f;
}

/** Serve a clue event's two fragments: for each channel, pick (seeded) among
 *  the variants consistent with the rolled truth — a served fragment never
 *  eliminates a true answer. Null when an event has no slot on that channel. */
export function serveFragments(
  eventId: string, tuple: Record<string, string>, rng: number,
): { a: FragmentDef | null; b: FragmentDef | null; state: number } {
  let s = rng;
  const pick = (channel: 'actor' | 'partner'): FragmentDef | null => {
    const variants = FRAGMENTS.filter(
      (f) => f.eventId === eventId && f.channel === channel
        && !f.eliminates.includes(tuple[f.bearsOn]),
    );
    if (variants.length === 0) return null;
    const r = rngInt(s, variants.length);
    s = r.state;
    return variants[r.value];
  };
  return { a: pick('actor'), b: pick('partner'), state: s };
}
