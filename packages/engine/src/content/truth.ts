// Narrative truth content (nt-slice — docs/threadbound_narrative_track_slice.md).
// LORE IS PROVISIONAL: every line here is placeholder prose awaiting the lore
// bible session; ids and structure are the commitment.
//
// §11-extension caveat: this module holds the VALID-COMBO table and (as of
// S6.2) the fragment→elimination maps. It must stay off the client bundle —
// nothing under client/src may import it, directly or via registry re-export.
// The wire-capture gate (S6.3) covers the websocket; keeping this import
// server-side covers the bundle.

import { AnswerDef, QuestionDef } from '../types';
import { rngInt } from '../rng';

// ---- the fixed question set (spec ruling 7: same questions every run) -------

export const QUESTIONS: QuestionDef[] = [
  { id: 'q_who', text: 'Who are you?', kind: 'self', payoff: 'healEach' },
  { id: 'q_what', text: 'What happened here?', kind: 'world', payoff: 'bossFace' },
  { id: 'q_why', text: 'Why did it happen?', kind: 'world', payoff: 'bossMechanic' },
];

export const ANSWERS: AnswerDef[] = [
  // Who are you — self, 2 answers
  {
    questionId: 'q_who', id: 'a_kin',
    text: 'Kin of the parish — you have stood here before.',
    codexTruthEntry: 'The pair were kin of the drowned parish.',
  },
  {
    questionId: 'q_who', id: 'a_hired',
    text: 'Hired hands — you came for the pay.',
    codexTruthEntry: 'The pair came as hired hands, and stayed anyway.',
  },
  // What happened here — world, 2 answers: the boss faces (provisional
  // Sexton / Peal, spec slice scope)
  {
    questionId: 'q_what', id: 'a_sexton',
    text: 'The bell was silenced on purpose.',
    codexTruthEntry: 'The Sexton silenced the bell and sealed what had heard it.',
  },
  {
    questionId: 'q_what', id: 'a_peal',
    text: 'The bell rang once and never stopped.',
    codexTruthEntry: 'The Peal rang until the parish came apart around it.',
  },
  // Why did it happen — world, 3 answers
  {
    questionId: 'q_why', id: 'a_hunger',
    text: 'Hunger.',
    codexTruthEntry: 'It happened for hunger, in the end.',
  },
  {
    questionId: 'q_why', id: 'a_grief',
    text: 'Grief.',
    codexTruthEntry: 'It happened for grief, which does not bargain.',
  },
  {
    questionId: 'q_why', id: 'a_kept',
    text: 'A covenant, still being kept.',
    codexTruthEntry: 'It happened because a covenant was kept long past its keeper.',
  },
];

export const QUESTIONS_BY_ID: Record<string, QuestionDef> = {};
for (const q of QUESTIONS) {
  if (QUESTIONS_BY_ID[q.id]) throw new Error(`duplicate question id ${q.id}`);
  QUESTIONS_BY_ID[q.id] = q;
}

export const ANSWERS_BY_ID: Record<string, AnswerDef> = {};
for (const a of ANSWERS) {
  if (ANSWERS_BY_ID[a.id]) throw new Error(`duplicate answer id ${a.id}`);
  if (!QUESTIONS_BY_ID[a.questionId]) throw new Error(`answer ${a.id} for unknown question ${a.questionId}`);
  ANSWERS_BY_ID[a.id] = a;
}

export function answersFor(questionId: string): AnswerDef[] {
  return ANSWERS.filter((a) => a.questionId === questionId);
}

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
