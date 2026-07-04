// S6.1 build identity: human telemetry is pooled across patches — every
// telemetry file, feedback record, and client footer carries this manual
// content tag alongside the injected buildSha. Bump when content changes.
export const CONTENT_VERSION = 's10a';

export * from './types';
export * from './rng';
export * from './hash';
export { reduce, initialState, emptyTelemetry, removalPrice, STARTING_HP } from './reducer';
export { ascensionMods, scaleIntent, ASCENSION_MAX, ASCENSION_RUNGS } from './ascension';
export type { AscensionMods } from './ascension';
export {
  effectiveDef, otherPlayer, findInstance, hasPassive, reclaimEchoShape, targetableEnemies,
  computeLinksFired, computeResonanceSlots, computeForcedLinks, computePlannedBlock, computePlannedDamage, longestSoloRun, DETONATION_DAMAGE,
  // S9d: stateless growth (the tally)
  applyGrowth, grownDef, growthStep, tallyAxisValue, opClause, primaryMagnitude,
} from './combat';
export { generateActMap, generateFinaleMap, pickableNodes } from './map';
// nt-slice §11 extension: the truth surface meant for clients is the
// projection plus the public ontology (questions/answers — board columns and
// sheet chips). content/truth.ts (combo table, fragments, eliminations) is
// deliberately NOT re-exported; only the reducer touches it.
export { clientTruthView } from './truth-view';
export type { ClientTruthView, ClientShrineView, TruthStub } from './truth-view';
export { QUESTIONS, ANSWERS, QUESTIONS_BY_ID, ANSWERS_BY_ID, answersFor } from './content/questions';
export {
  CARDS, ENEMIES, EVENTS, RELICS_BY_ID, ALL_RELICS, LOCKED_CARDS, eventsForAct,
  PT1_ENEMY_HP_SCALE, PT1_ENEMY_DMG_SCALE,
} from './content/registry';
export { STARTER_DECKS, cardsForCharacter, neutralCards } from './content/cards';
export { POWERS } from './content/powers';
export { RITES, RITES_BY_ID, RITE_CARDS, ritesFor, unlockedRites } from './content/rites';
export { ENCOUNTERS, ENCOUNTER_POOLS } from './content/encounters';
export { WITNESS_POOLS, poolLines, witnessPoolLines } from './witness-draw';
export type { WitnessPool, WitnessRegister, RegisteredPool } from './witness-draw';
export { BotPolicy } from './bot-policy';
export type { BotView, BotPolicyOptions } from './bot-policy';
