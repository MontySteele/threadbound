// nt-slice public ontology: the fixed question set and answer chips
// (spec ruling 7 — same questions every run; stable board columns; the
// teachable layer). CLIENT-SAFE by design: this module must never grow a
// secret — combos, fragments, and eliminations live in content/truth.ts.
// codexTruthEntry text ships in the client bundle: write it spoiler-safe
// (public ontology only — no drawer facts). ALL PROSE PROVISIONAL pending
// the S8.8 sign-off tables.
//
// S8.2: the fourth question (q_came — the spec'd production question, never
// shipped) and the §8 answer expansion — q_what 2→4, q_why 3→5, q_came 0→4.
// q_who holds at 2: it is the question most likely to leave the deduction
// set post-playtest (the death-rite pick answers it out loud) — do not
// author against a question on the bubble. DESIGNER MAY OVERRIDE.

import { AnswerDef, QuestionDef } from '../types';

export const QUESTIONS: QuestionDef[] = [
  { id: 'q_who', text: 'Who are you?', kind: 'self', payoff: 'healEach' },
  // S14.3 (B4, RULED 2026-07-04 as S14-R8): a true naming leans the loom
  // toward the pair — +2 Thread for the finale (pendingThread). The S8.2
  // covetEach payoff was unspendable where it landed: the shrine sits after
  // the run's last reward screen (loom → rest → shop → boss).
  { id: 'q_came', text: 'Why did you come?', kind: 'self', payoff: 'pendingThread' },
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
  // Why did you come — self, 4 answers (§8: the pair's contract —
  // paid / compelled / volunteered / fleeing)
  {
    questionId: 'q_came', id: 'a_paid',
    text: 'Paid — a contract, weighed and signed.',
    codexTruthEntry: 'The pair came under contract, the descent priced in advance.',
  },
  {
    questionId: 'q_came', id: 'a_compelled',
    text: 'Compelled — sent under another’s will.',
    codexTruthEntry: 'The pair were sent down under another’s will, and went.',
  },
  {
    questionId: 'q_came', id: 'a_volunteered',
    text: 'Volunteered — you asked to descend.',
    codexTruthEntry: 'The pair asked for the descent, knowing no more than anyone.',
  },
  {
    questionId: 'q_came', id: 'a_fleeing',
    text: 'Fleeing — the way down was the only door left.',
    codexTruthEntry: 'The pair came down fleeing; the descent was the only door left open.',
  },
  // What happened here — world, 4 answers (§8: the local instance of the
  // schism). Each keys a boss face (S8.5): Sexton / Peal / Vigil / Tithe.
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
  {
    questionId: 'q_what', id: 'a_abandoned',
    text: 'The rite was abandoned midway.',
    codexTruthEntry: 'The Vigil-Keeper set down its office mid-rite, and what it carried was left half-carried.',
  },
  {
    questionId: 'q_what', id: 'a_starved',
    text: 'A starving part consumed the rite.',
    codexTruthEntry: 'The Tithe took its share and kept taking, until the rite itself was the share.',
  },
  // Why did it happen — world, 5 answers (§8: the schism's motives)
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
  {
    questionId: 'q_why', id: 'a_mercy',
    text: 'Mercy.',
    codexTruthEntry: 'It happened for mercy — a kindness that would not wait to be kind.',
  },
  {
    questionId: 'q_why', id: 'a_unity',
    text: 'Unity.',
    codexTruthEntry: 'It happened for unity — the whole made to agree, one deletion at a time.',
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

// ---------------------------------------------------------------------------
// S22.1 — the completion criterion (D1: lore-bible open ruling #6, taken)
// ---------------------------------------------------------------------------

/** A question CLOSES when every answer in its pool has been adjudicated —
 *  proven true in some run, or eliminated in some run — across the profile's
 *  history. The codex COMPLETES when every question in the deduction set is
 *  closed. Defined over the SET, never hardcoded counts (S22 hard scope: if
 *  q_who leaves the deduction set, nothing here breaks). Pure and
 *  client-safe: closure reads only the public ontology. */
export function questionClosed(questionId: string, adjudicated: ReadonlySet<string>): boolean {
  return answersFor(questionId).every((a) => adjudicated.has(a.id));
}

export function codexCompleteFor(truths: readonly string[], eliminations: readonly string[]): boolean {
  const adjudicated = new Set([...truths, ...eliminations]);
  return QUESTIONS.every((q) => questionClosed(q.id, adjudicated));
}

// ---------------------------------------------------------------------------
// S22.1 — the fifth question (D1b, RULED as amended: an interposed scene)
// ---------------------------------------------------------------------------
// NOT a deduction question and NOT in QUESTIONS: it never enters the combo
// table, the fragment maps, codexPct's denominator, or the shrine — the
// deduction machinery INVERTED (declared by the pair, never deduced). The
// question wording is D1b's own ruling, verbatim ("asked at the end by the
// thing they have been describing"); the ANSWER POOL and each answer's
// codex final-entry text are S22 Part 6 rows — ALL PROSE PROVISIONAL until
// the fifth-question table signs (themes are §8's, ruled: which figure's
// costume, and what its wearer carried down — debt, penance, grief, zeal).

export const FIFTH_QUESTION = { id: 'q_fifth', text: 'Who are you?' } as const;

export const FIFTH_ANSWERS: AnswerDef[] = [
  {
    questionId: 'q_fifth', id: 'a_fifth_debt',
    text: 'Debtors — we came down owing, and meant to pay.',
    codexTruthEntry: 'The pair who held the pen came down owing. The book is the payment.',
  },
  {
    questionId: 'q_fifth', id: 'a_fifth_penance',
    text: 'Penitents — we came down carrying what we did.',
    codexTruthEntry: 'The pair who held the pen came down to answer for something. The book is the answering.',
  },
  {
    questionId: 'q_fifth', id: 'a_fifth_grief',
    text: 'Mourners — we came down carrying someone.',
    codexTruthEntry: 'The pair who held the pen came down carrying someone. The book is where they set them down.',
  },
  {
    questionId: 'q_fifth', id: 'a_fifth_zeal',
    text: 'Zealots — we came down certain, and we are certain still.',
    codexTruthEntry: 'The pair who held the pen came down certain. The book is what the certainty made.',
  },
];

export const FIFTH_ANSWERS_BY_ID: Record<string, AnswerDef> = {};
for (const a of FIFTH_ANSWERS) {
  if (FIFTH_ANSWERS_BY_ID[a.id]) throw new Error(`duplicate fifth answer id ${a.id}`);
  if (ANSWERS_BY_ID[a.id]) throw new Error(`fifth answer ${a.id} collides with the deduction set`);
  FIFTH_ANSWERS_BY_ID[a.id] = a;
}
