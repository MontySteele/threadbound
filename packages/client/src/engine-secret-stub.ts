// §11 extension (nt-slice S6.3/S6.5): build-time stub. The engine's secret
// content modules (content/truth = combo table + fragments/eliminations,
// content/faces = boss faces/mechanic pools) are transitively imported by
// reducer/combat, which the client bundles for its planning helpers — but the
// client must never SHIP those tables. vite.config.ts aliases both modules
// here, so the bundle carries empty tables and throwing rolls. The client is
// render-only (§11): none of these paths execute in the browser. The
// bundle-secrecy test greps the built assets to keep this true.

const serverOnly = (): never => {
  throw new Error('narrative truth content is server-only (§11 extension)');
};

// content/truth surface
export const FRAGMENTS: never[] = [];
export const FRAGMENTS_BY_ID: Record<string, never> = {};
export const VALID_COMBOS: never[] = [];
export const rollTruth = serverOnly;
export const serveFragments = serverOnly;
export const serveBoundWitness = serverOnly; // S11.3/S11.5 single supply ledger

// content/faces surface
export const FACES: never[] = [];
export const FACE_BY_ANSWER: Record<string, never> = {};
export const rollLiveMechanics = serverOnly;
export const mechanicFireTurns = serverOnly;

// content/witness surface (S14.3 B10): the 70%-gated held-reveal registers
// (the sacrament fall-rebind quote, the procession-direction hint) must not
// be datamine-able from the bundle — same channel class as the Vigil/
// Half-Carried leaks already treated as bugs. The client renders Witness
// lines from the wire only, so the whole pool module ships empty.
export const WITNESS_LINES: Record<string, string[]> = {};
export const S8_WITNESS: Record<string, string[]> = {};
export const WITNESS_REGISTERS: Record<string, { minPct: number; lines: string[] }[]> = {};

// content/truth re-exports the public ontology; anything bundled should be
// importing it from content/questions (kept in the bundle), but satisfy the
// export surface just in case.
export { QUESTIONS, ANSWERS, QUESTIONS_BY_ID, ANSWERS_BY_ID, answersFor } from '@threadbound/engine';
