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
// coherence is content (spec data-model sketch). S8.2: the table is the
// 2×4×4×5 product MINUS the authored exclusion families below. Every excluded
// family carries its bible rationale; everything not excluded is a coherent
// truth. Future lore passes strike families (or add row-level exceptions)
// without touching code elsewhere. ALL EXCLUSIONS PROVISIONAL pending the
// S8.8 sign-off table.

type Truth = { q_who: string; q_came: string; q_what: string; q_why: string };

/** Incoherent answer pairings, with rationale (the excluded FAMILIES).
 *  A combo containing any listed pair is struck from the table. */
export const EXCLUDED_FAMILIES: ReadonlyArray<{
  pair: [string, string];
  why: string;
}> = [
  // -- who × came: the pair's contract must cohere with who wears the costume
  {
    pair: ['a_kin', 'a_paid'],
    why: 'kin of the parish are not paid to bury their own — the tithe ledger has no column for it; a priced descent needs an outside party (§8: paid = the contract)',
  },
  {
    pair: ['a_hired', 'a_compelled'],
    why: 'hire is consent — the compelled came under another’s will, not a wage; a hireling under compulsion is no hireling',
  },
  {
    pair: ['a_hired', 'a_volunteered'],
    why: 'the hired chip states the pay was the reason; a volunteer takes none (hired × fleeing stays — pay can be a door out)',
  },
  // -- what × why: the schism's local instance must cohere with its motive (§0/§8)
  {
    pair: ['a_sexton', 'a_hunger'],
    why: 'silencing-to-protect is not an appetite’s act — hunger takes, it does not bind and seal (the Unrung Bell’s own law: hunger keeps nothing)',
  },
  {
    pair: ['a_abandoned', 'a_hunger'],
    why: 'abandonment is a walking-away; hunger stays where the food is and feeds — a mid-rite desertion is not an appetite’s act',
  },
  {
    pair: ['a_abandoned', 'a_unity'],
    why: 'unity’s agents purge — they do not down tools; a rite ended for unity is a deletion, not a desertion (§0: unity by deletion is an ACT)',
  },
  {
    pair: ['a_starved', 'a_mercy'],
    why: 'a starving part consuming the rite is appetite wearing an office — mercy does not eat what it meant to spare (starved × unity stays: purge-by-consumption is §0’s deletion)',
  },
];

const excludedPairs = new Set(EXCLUDED_FAMILIES.map((f) => f.pair.slice().sort().join('|')));
const excluded = (t: Truth): boolean => {
  const ids = Object.values(t);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (excludedPairs.has([ids[i], ids[j]].sort().join('|'))) return true;
    }
  }
  return false;
};

export const VALID_COMBOS: ReadonlyArray<Truth> = (() => {
  const rows: Truth[] = [];
  for (const who of answersForLocal('q_who')) {
    for (const came of answersForLocal('q_came')) {
      for (const what of answersForLocal('q_what')) {
        for (const why of answersForLocal('q_why')) {
          const row: Truth = { q_who: who, q_came: came, q_what: what, q_why: why };
          if (!excluded(row)) rows.push(row);
        }
      }
    }
  }
  return rows; // 2×4×4×5 = 160 products → 80 coherent truths
})();

function answersForLocal(questionId: string): string[] {
  return Object.values(ANSWERS_BY_ID)
    .filter((a) => a.questionId === questionId)
    .map((a) => a.id);
}

/** Seed-deterministic truth roll: one uniform draw over the combo table. */
export function rollTruth(rng: number): { value: Record<string, string>; state: number } {
  const r = rngInt(rng, VALID_COMBOS.length);
  return { value: { ...VALID_COMBOS[r.value] }, state: r.state };
}

// ---- fragments (S6.2, expanded S8.2) -----------------------------------------
// One variant per (event slot × eliminable answer). A variant that eliminates
// answer X is served only when X is FALSE under the rolled truth — its prose
// is evidence AGAINST X, and never a conclusion: the sentence completes out
// loud, between the players (worked-example pattern). Actor-channel prose is
// direct second person; partner-channel prose is Witness-voiced, because in
// solo the Witness speaks it.
//
// PROSE LAW (S6 lore audit; bible §4 never-lies): a fragment eliminating X is
// served in EVERY truth where X is false, so its text must be true in ALL of
// them — argue only the negative; never assert a positive fact that names
// some other answer. Partner prose additionally respects the knowledge
// boundary: the Witness knows rite FORMS and what it has observed, never
// private facts. Within one event, the actor and partner fragments are read
// side by side — scope physical scene claims so no servable pair contradicts.
// S8.2 note: several S6 fragments asserted positives that were safe in a
// 2-answer q_what / 3-answer q_why world and become falsifiable under the
// grown pools — those texts are REWRITTEN here to the negative-only form.

const frag = (
  eventId: string, channel: 'actor' | 'partner', bearsOn: string,
  eliminates: string, text: string,
): FragmentDef => ({
  id: `f_${eventId.replace(/^nt_/, '')}_${channel === 'actor' ? 'a' : 'b'}_${eliminates.replace(/^a_/, '')}`,
  eventId, channel, text, bearsOn, eliminates: [eliminates], strength: 1,
});

export const FRAGMENTS: FragmentDef[] = [
  // ---- The Unrung Bell: A → q_what, B → q_why -----------------------------
  // (S8.2 rewrite: the old a_peal text concluded "silenced ON PURPOSE" and
  // the old a_sexton text concluded "this bell rang, recently" — positives
  // that name a specific other answer and can be false under the grown pool)
  frag('nt_unrung_bell', 'actor', 'q_what', 'a_peal',
    'The dust lay years deep in the bell’s mouth before your stroke scattered it — fine, level, undisturbed, the slow work of a long stillness. A bell that had been sounding on and on holds no such dust; every stroke sweeps its own house. Whatever harrowed this parish, it was not this metal ringing without end.'),
  frag('nt_unrung_bell', 'actor', 'q_what', 'a_sexton',
    'You go over the clapper, the crown, the sound-bow, looking for what a deliberate silencing leaves behind — grave-cloth bindings, wax seals, the lashing-mark where a muffle sat and was cut away. The silencing rite signs its work; the signing is half the rite. There is no such signature anywhere on this bell.'),
  frag('nt_unrung_bell', 'actor', 'q_what', 'a_abandoned',
    'Every rope, wedge, and fitting is stowed in its bracket; the ringing-gear is squared away to the last strap. Whoever tended this bell closed their work out like people who meant to. Nothing in this chamber was dropped mid-gesture.'),
  frag('nt_unrung_bell', 'actor', 'q_what', 'a_starved',
    'The bell is whole to the last ounce — bronze unpitted, silver still in the crown, tallow caked thick on the fittings. A starving thing strips a feast like this first, and leaves tooth-marks where it fed. There are none, anywhere you look.'),
  frag('nt_unrung_bell', 'partner', 'q_why', 'a_hunger',
    'Your friend hears a bell. I hear the pause after one — and whatever holds that pause, it is not appetite. Hunger keeps nothing — hunger only takes.'),
  frag('nt_unrung_bell', 'partner', 'q_why', 'a_grief',
    'There is no mourning in this metal. The chamber is squared away, swept, almost proud — and grief does not sweep.'),
  frag('nt_unrung_bell', 'partner', 'q_why', 'a_kept',
    'Keeping has its forms in this rite — observance marks renewed, the keeper’s small offices done and done over, season on season; I know them all. I have circled this bell twice looking for any of it. There is not one trace of tending anywhere near it. Whatever this silence is, nobody is keeping it.'),
  frag('nt_unrung_bell', 'partner', 'q_why', 'a_mercy',
    'I know mercy’s forms in this rite — the small kindnesses it leaves like coins wherever it has passed. I have looked twice, for your friend’s sake. There is not one kindness in this chamber. Whatever was done here was not done gently.'),
  frag('nt_unrung_bell', 'partner', 'q_why', 'a_unity',
    'Where the purge-for-sameness passes, it leaves everything agreeing — one shape, one note, the discord scoured out. Look at this chamber: nothing in it was made to match anything else. The scouring never came through here.'),

  // ---- The Tithe Ledger: A → q_who, B → q_what -----------------------------
  frag('nt_tithe_ledger', 'actor', 'q_who', 'a_kin',
    'Your family name is not in the ledger. Not paid, not owing, not born, not buried. Whoever you are, this parish never wrote you down.'),
  frag('nt_tithe_ledger', 'actor', 'q_who', 'a_hired',
    'Your name IS in the ledger. Not in the tithes — in the debts column, generations deep, marked "carried forward." Nobody pays a hireling in inherited debt.'),
  // (S8.2 rewrite: both q_what variants asserted positive ledger contents —
  // "billed for silence itself" / "every hour marked RANG" — that name a
  // specific other answer; falsifiable under abandoned/starved truths)
  frag('nt_tithe_ledger', 'partner', 'q_what', 'a_peal',
    'A bell that will not stop bankrupts a parish in wax and wadding — I have read those ledgers, page after desperate page of muffling goods. There is no such page here. Whatever this parish was buying at its end, it was not relief from a ringing.'),
  frag('nt_tithe_ledger', 'partner', 'q_what', 'a_sexton',
    'A deliberate silencing is bought and provisioned — grave-cloth beyond the burials’ own, wadding, hands hired for the muffling. I have read every column twice. None of that was ever bought here, and this parish wrote down everything it bought.'),
  frag('nt_tithe_ledger', 'partner', 'q_what', 'a_abandoned',
    'A rite abandoned mid-stroke shows in the money first — the money always quits before the faith does. These accounts run full and funded to the last ruled line: candles, cloth, bread for the singers, all kept up. Nobody was walking away from this while there was still ink.'),
  frag('nt_tithe_ledger', 'partner', 'q_what', 'a_starved',
    'I have read the ledgers of parishes that something fed on. They all end the same way — goods paid for that never arrive, sums that thin out between one line and the next. Every sum in this book lands where it was sent. Nothing was eating this parish out from under its clerk.'),

  // ---- The Emptied Stalls: A → q_why, B → q_who -----------------------------
  frag('nt_choir_stalls', 'actor', 'q_why', 'a_hunger',
    'The room remembers a final meal laid out and left UNEATEN — a full portion at every seat, gone to dust in place. Nobody starving walks away from bread.'),
  frag('nt_choir_stalls', 'actor', 'q_why', 'a_grief',
    'The room remembers singing — work-songs, tally-songs, nothing sorrowing. Right to the end they kept time like people with a job to finish, not a loss to carry.'),
  frag('nt_choir_stalls', 'actor', 'q_why', 'a_kept',
    'The room remembers the moment they broke their own rule — all twelve, at once, gladly. Whatever covenant held this parish, the choir did not die keeping it.'),
  frag('nt_choir_stalls', 'actor', 'q_why', 'a_mercy',
    'The room remembers the choir being drilled at the end — taken back to the first bar, again, again, past weariness, past any kindness. Nobody in this room was being spared anything. Whatever the singing served at the last, it was not mercy.'),
  frag('nt_choir_stalls', 'actor', 'q_why', 'a_unity',
    'The room remembers twelve voices that never once sang the same line — parts, always parts, braided and stubborn, and nobody ever tried to sand them into one note. Sameness was not what this music was for.'),
  frag('nt_choir_stalls', 'partner', 'q_who', 'a_kin',
    'Eleven robes for twelve seats — and look at the twelfth stall’s joinery: it carries the stranger’s join and the guest-blessing mark, the forms a parish cuts for one not of its own. I know both cuttings, kin and guest, stroke for stroke. Whoever that seat was made to hold, the parish did not cut it as kin.'),
  frag('nt_choir_stalls', 'partner', 'q_who', 'a_hired',
    'The twelfth robe is missing because it was sent away — the stall bears a departure blessing, the kind sung over kin leaving to return. Parishes do not bless the exits of the help.'),

  // ---- The Sexton’s Lodge: A → q_what, B → q_who ----------------------------
  frag('nt_sexton_lodge', 'actor', 'q_what', 'a_peal',
    'The lodge walls are packed with wool and sand — a house braced against a sound. But the wadding is pristine, unshaken after all these years. The deafening was built, and then never once needed.'),
  frag('nt_sexton_lodge', 'actor', 'q_what', 'a_sexton',
    'The lodge is a ringing-room: rope-burns on the beam, a striker’s bench, ear-wax votives in tidy rows. Whoever lived here served the bell’s VOICE. You do not keep a striker’s bench for a silenced bell.'),
  frag('nt_sexton_lodge', 'actor', 'q_what', 'a_abandoned',
    'The duty-board runs to the end of its final month, every watch initialed, no shift left blank — and the last entry is closed out in a steady hand. Whoever kept this office kept it to the last line of it. Nothing here was walked off from in the middle.'),
  frag('nt_sexton_lodge', 'actor', 'q_what', 'a_starved',
    'The larder is stocked and the lamp-oil full — bread gone to stone uneaten, tallow unmelted, all the fat a hungry thing takes first, sitting untaken. Whatever came for this parish, it did not come to feed.'),
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
  frag('nt_flooded_crypt', 'actor', 'q_why', 'a_mercy',
    'Read what the rows ask for: not one offering begs relief for anybody — no fever-charms, no passage-tokens, none of the grammar of let-it-be-quick. Whatever these people wanted of the dark, it was not gentleness, for themselves or anyone else.'),
  frag('nt_flooded_crypt', 'actor', 'q_why', 'a_unity',
    'Every row is offered differently — mismatched bowls, knots tied a dozen ways, no two hands alike, and nobody ever straightened them into a scheme. People who want oneness ask for it in unison. This asking never once agreed with itself.'),
  // (S8.2 rewrite: the old a_peal text asserted votive mufflers "offered by
  // the dozen" — a positive that reads as a loud bell and can mislead under
  // abandoned/starved truths; recast as the negative it was reaching for)
  frag('nt_flooded_crypt', 'partner', 'q_what', 'a_peal',
    'I have seen the offering-lakes of parishes that lived under a bell that would not stop: wax for the ears, mufflers by the hundred, an asking gone deaf and desperate. This asking is patient — laid straight, one row a season, below the waterline. Nobody kneels that calmly under an unceasing ringing.'),
  frag('nt_flooded_crypt', 'partner', 'q_what', 'a_sexton',
    'The deepest offerings are tiny bells, hundreds, every one with its clapper filed BRIGHT — eager to sound. These people were not asking for quiet. They were asking the ringing to keep on.'),
  frag('nt_flooded_crypt', 'partner', 'q_what', 'a_abandoned',
    'The crypt’s tenders kept a station below the waterline — every offering-rite does; I know the office and its gear. Abandonment writes itself at the tender’s own post: regalia dropped where the keeper stood, the skimming-pole left mid-office, the station quit in the middle of its work. I have read this water twice. That grammar is nowhere in it.'),
  frag('nt_flooded_crypt', 'partner', 'q_what', 'a_starved',
    'Bread gone to stone, wax by the bowlful, tallow votives past counting — an open larder underwater, and not one thing in it so much as nibbled. If something starving had taken this parish, it would have started here, where the food was already gathered. Nothing ever started here.'),

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
    'The touching STOPPED — cleanly, all at once, dust settling undisturbed in the last season. A kept covenant does not stop being kept. Whatever this observance was, it ended, and it ended all at once — the dust will swear to that much and no more.'),
  frag('nt_stranger_stone', 'partner', 'q_why', 'a_mercy',
    'No flowers ever rotted at this stone’s foot; no tokens of comfort, no small mercies left for whoever it stands for — none of kindness’s litter, and kindness always litters. Whatever kept hands coming back to this stone, it was not a tenderness.'),
  frag('nt_stranger_stone', 'partner', 'q_why', 'a_unity',
    'One blank stone in a wall of named ones — an odd stone out, tolerated for generations, worn smooth instead of pried loose. The purge-for-sameness does not touch what disagrees with it; it removes it. This stone was let stand, and let disagree, for as long as hands have worn it.'),

  // ---- The Toll-Gate (S8.2): A → q_came, B → q_what -------------------------
  frag('nt_toll_gate', 'actor', 'q_came', 'a_paid',
    'A PURCHASED descent files itself at a gate like this — earnest coin lodged in the box, a surety mark chalked at the post, the toll-forms stamped for the contract; that is the whole office of a toll-gate. It takes your measure and finds no such filing to set against you. Whatever brought you down here, nobody priced the bringing.'),
  frag('nt_toll_gate', 'actor', 'q_came', 'a_compelled',
    'The gate has a mark for those sent under another’s seal — it stamps them through unweighed, the way you wave through driven cattle. It weighs you like anyone free. No seal, no sender, no goad at your back.'),
  frag('nt_toll_gate', 'actor', 'q_came', 'a_volunteered',
    'There is a lintel of names above the gate, chalked proud — those who ASKED to go down sign before they pass; it is the volunteers’ privilege and their vanity. You look for a long moment. Your hand already knows your name is not up there.'),
  frag('nt_toll_gate', 'actor', 'q_came', 'a_fleeing',
    'The gate reads the road behind a traveler — that is how it prices them — and the road behind you reads quiet. Nothing hunts down the stair after you; nothing has your scent. People running leave a different wake, and you have not left one.'),
  frag('nt_toll_gate', 'partner', 'q_what', 'a_sexton',
    'A gate like this logs every deliberate order that ever crossed it — closures, sealings, silencings; the forms exist and I know them all. I have read this gate’s log twice for your friend’s sake. No one ever ordered anything here stilled.'),
  frag('nt_toll_gate', 'partner', 'q_what', 'a_peal',
    'The gate’s wardstones crack under a sound held too long — they are made to, so the crack can be read as a warning. Every stone in this arch stands whole. Whatever went wrong in this parish, it did not spend years ringing through these stones.'),
  frag('nt_toll_gate', 'partner', 'q_what', 'a_abandoned',
    'Nobody downed their office mid-stroke at this gate — its last entries are finished entries, every crossing closed out, the final toll counted and boxed. A rite abandoned in the middle strands its traffic, and no traffic was ever stranded here.'),
  frag('nt_toll_gate', 'partner', 'q_what', 'a_starved',
    'When a starving part feeds near a toll-gate, it takes the tolls first — easy fat, already gathered, no chase in it. The box is full to its hinges. Nothing that hungers has been through here.'),

  // ---- The Tallow Court (S8.2): A → q_why, B → q_came ------------------------
  frag('nt_tallow_court', 'actor', 'q_why', 'a_hunger',
    'The tallow was never eaten. Renderable fat, a famine’s worth of it, standing untouched in figure after figure — hunger does not leave candles. Hunger renders them down and licks the moulds.'),
  frag('nt_tallow_court', 'actor', 'q_why', 'a_grief',
    'These are votive figures, not memorial ones — work-lights, cast for doing, not for missing anyone. Grief’s candles burn low at the base from nights sat up beside them. Not one of these was ever sat with.'),
  frag('nt_tallow_court', 'actor', 'q_why', 'a_kept',
    'Every figure was snuffed — pinched out, deliberate, and by the look of the wicks all in one going. A covenant kept keeps its lights; that is half of what keeping means down here. Someone stopped keeping these.'),
  frag('nt_tallow_court', 'actor', 'q_why', 'a_mercy',
    'Mercy tends what it cannot save — trims wicks, straightens what leans; the kindness is in the tending. These figures were let slump where they melted, uncorrected, for years. No gentle hand has been through this room.'),
  frag('nt_tallow_court', 'actor', 'q_why', 'a_unity',
    'No two figures match — different hands, different fats, different feast-days, left different on purpose. Whoever kept this court let it disagree with itself to the end. Whatever undid this parish, it was not a scouring-for-sameness.'),
  frag('nt_tallow_court', 'partner', 'q_came', 'a_paid',
    'A purchased descent comes down showing its price — the earnest token carried where an escort can sight it, the surety knot at the belt, toll-receipts for each stage; the forms are strict, and I know every one of them. I was at the door when you two came through, and I have looked at each landing since. Not one of the purchase’s forms came down with you.'),
  frag('nt_tallow_court', 'partner', 'q_came', 'a_compelled',
    'The compelled walk like the door behind them is the dangerous one — I have carried enough of them to know the gait. I was at the door when you two came through it. Neither of you looked back at it once.'),
  frag('nt_tallow_court', 'partner', 'q_came', 'a_volunteered',
    'Those who ask for this place arrive schooled — the asking has its forms, petitions and titles studied out beforehand, and I know every form of it. Your friend called the Undercroft "the cellar" on the first stair. Whatever carried you two down, it did not come by way of the petitions.'),
  frag('nt_tallow_court', 'partner', 'q_came', 'a_fleeing',
    'I know the pace of the pursued — I have carried enough of them too. They spend the first act of any descent listening behind themselves. You two listen ahead. Whatever you left above, it is not chasing you.'),

  // ---- The Bearers’ Steps (S8.2): A → q_came, B → q_why ----------------------
  frag('nt_bearers_steps', 'actor', 'q_came', 'a_paid',
    'A priced carry is marked before the first step — an earnest token tied at the pole-head, the hirer’s tally scored into the wood; that is the trade’s form, older than the stair. The poles settle into your hands carrying no token, no tally, no score. Whatever this descent is, nobody bought it.'),
  frag('nt_bearers_steps', 'actor', 'q_came', 'a_compelled',
    'Driven bearers set their heels — the third flight still carries drag-marks, generations old, where the pressed and the sentenced went down. Your feet leave nothing like them. Nothing about your footing argues a goad behind you.'),
  frag('nt_bearers_steps', 'actor', 'q_came', 'a_volunteered',
    'There is a bearers’ blessing carved at the first step, kissed smooth by everyone who ever chose this work — choosing it is what the kiss is FOR. You pass it without knowing to stop. The stair does not read you as one who asked for this.'),
  frag('nt_bearers_steps', 'actor', 'q_came', 'a_fleeing',
    'Runners take stairs like this two at a time and never learn the ledges. You set the poles down at the right ledge without being told. You carry like someone with somewhere to be — not like someone getting away from somewhere.'),
  frag('nt_bearers_steps', 'partner', 'q_why', 'a_hunger',
    'Bearers ate at the third ledge — there are crumbs in the grooves, generations deep, and the last layer lies as thick as any before it. To its end, this parish had bread to drop. Hunger was not what was wrong here.'),
  frag('nt_bearers_steps', 'partner', 'q_why', 'a_grief',
    'The count-marks on the wall tally the carried — a bearers’ habit, kept level and businesslike to the last stroke. Grief’s tallies waver; I have read ten thousand of them. These never do.'),
  frag('nt_bearers_steps', 'partner', 'q_why', 'a_kept',
    'A covenant of bearers keeps a rhythm — I have listened to ten thousand carries, and a kept covenant sounds like a heartbeat on a stair like this. What this stair remembers of its end is nothing so regular. Whatever moved this parish at the last, it did not move to a kept promise’s beat.'),
  frag('nt_bearers_steps', 'partner', 'q_why', 'a_mercy',
    'Mercy pads the poles — always, everywhere; it is the first kindness bearers are taught. These poles are bare wood, worn sharp at the shoulder, and nobody ever wrapped them. Whatever moved this parish at the end, it did not think to be kind about it.'),
  frag('nt_bearers_steps', 'partner', 'q_why', 'a_unity',
    'The steps are cut to a dozen gauges — every generation carved its own and none were made to agree, and they were left that way, cheerfully, forever. The scouring-for-sameness never reached this stair. It would not have survived the first landing.'),

  // ---- The Winding-Room (S8.2): A → q_what, B → q_came -----------------------
  frag('nt_winding_room', 'actor', 'q_what', 'a_sexton',
    'The last shroud is mid-weave with the shuttle still in the shed — nobody drew this work to a close. A deliberate ending ties off; that is what ending a thing MEANS in a room like this. No one tied anything off here.'),
  frag('nt_winding_room', 'actor', 'q_what', 'a_peal',
    'The weft is even, line on line to the last thrown pick — a weaver’s hands put the room’s troubles into the cloth, and there is no tremor anywhere in this cloth. Whatever happened to this parish did not spend years deafening the people it happened to.'),
  frag('nt_winding_room', 'actor', 'q_what', 'a_abandoned',
    'Read the floor, bench to door: nothing dropped between the frames, no load set down half-carried, no tools shed where somebody’s nerve went. A room walked out on mid-work keeps the walking-out — the leavings fall where the leaving started. Nothing here fell anywhere. However the weavers went, they did not bolt from their benches in the middle of it.'),
  frag('nt_winding_room', 'actor', 'q_what', 'a_starved',
    'Wool, flax, tallow for dressing the thread — a larder of the eatable and the burnable, shelf on shelf, untouched. Starving parts strip a room like this to bare stone; it is the first place they go. The shelves are full.'),
  frag('nt_winding_room', 'partner', 'q_came', 'a_paid',
    'A purchased descent is a papered thing — toll-forms filed at the gate, an earnest shown at every station, a surety worn where the rite can read it; I know each form by heart. I have had the whole descent to look for them on you both, and nothing of the purchase’s kit came down with you. However you two came to this stair, no one filed it as a purchase.'),
  frag('nt_winding_room', 'partner', 'q_came', 'a_compelled',
    'The compelled do the task in front of them and not one thing more — it is how you tell them, in any age, on any stair. Nobody made your friend unroll anything. I watched the choosing. It was a choosing.'),
  frag('nt_winding_room', 'partner', 'q_came', 'a_volunteered',
    'Those who volunteer for a descent dress for it — I know the kit lists; I could recite the forms they are copied from, article by article. You two came down in what you stood up in. Nobody plans a pilgrimage in those boots.'),
  frag('nt_winding_room', 'partner', 'q_came', 'a_fleeing',
    'I checked the door behind you for a long while after you came through it — an old habit; call it professional interest. Nothing followed. Nobody flees at the unhurried pace you two keep.'),
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
