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
