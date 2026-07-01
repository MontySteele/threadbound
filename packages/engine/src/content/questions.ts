// nt-slice public ontology: the fixed question set and answer chips
// (spec ruling 7 — same questions every run; stable board columns; the
// teachable layer). CLIENT-SAFE by design: this module must never grow a
// secret — combos, fragments, and eliminations live in content/truth.ts.
// LORE PROVISIONAL until the lore bible session.

import { AnswerDef, QuestionDef } from '../types';

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
