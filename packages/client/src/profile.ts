// S4.5 browser profile + unlock machinery (meta-progression substrate).
// No accounts: the profile lives in localStorage next to the session token,
// with a base64+checksum export string as the save-state. The server treats
// everything here as a CLAIM and clamps (§11) — this file is bookkeeping,
// not authority.

import {
  AnswerDef, ANSWERS, ANSWERS_BY_ID, CharacterId, FIFTH_ANSWERS_BY_ID, RiteUnlocks,
  codexCompleteFor, ritesFor,
} from '@threadbound/engine';

export interface Profile {
  version: 2;
/** S6.3: anonymous random id — groups runs without identity. Regenerated
   *  if the profile is wiped; explicitly NOT tracking across devices. */
  installId: string;
  /** S6.3 opt-in telemetry consent: null = never asked (card shows when the
   *  server declares collection active), true/false = the stored choice. */
  telemetryConsent: boolean | null;
  clears: Record<CharacterId, { count: number; bestAscension: number }>;
  unlockedCards: string[];
  ascensionUnlocked: Record<CharacterId, number>;
  /** S6.8 codex — answer IDS (not prose), permanent, insertion-ordered.
   *  truths: proven TRUE at a Loom's Eye verdict; eliminations: answers
   *  adjudicated FALSE at a verdict — asserted-and-wrong (engaged-but-wrong
   *  still advances the meta) AND, since S22.1 (D1), the shrine's pooled
   *  strike-outs (the shrine is where eliminations materialize, S6.4
   *  ruling 6, so it is where they bank — "eliminated in some run" is
   *  adjudication; wrong answers are cartography).
   *  declared (S22.1/D1b): the fifth question's answer id — the codex's
   *  final entry, recorded once when this profile's own codex is complete
   *  and the pair declares at the Eye. */
  codex: { truths: string[]; eliminations: string[]; declared?: string };
  /** S9a rite unlocks per role. Seeded state: ALL current rites (the S7
   *  ruling — no gating tonight; the field exists and the offer reads it).
   *  A pair plays with the UNION of both profiles' unlocks; credit accrues
   *  to both (nothing accrues yet — unlock pacing is deferred). */
  unlocks: Record<CharacterId, { deathRites: string[]; birthRites: string[] }>;
}

const KEY = 'tb_profile';
const ASCENSION_CAP = 5;

function newInstallId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `xx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** S9a seeded state: every rite currently in the content set, per role. */
function allRitesUnlocked(): Profile['unlocks'] {
  const forRole = (role: CharacterId) => ({
    deathRites: ritesFor(role, 'death').map((r) => r.id),
    birthRites: ritesFor(role, 'birth').map((r) => r.id),
  });
  return { vess: forRole('vess'), bram: forRole('bram') };
}

export function emptyProfile(): Profile {
  return {
    version: 2,
    installId: newInstallId(),
    telemetryConsent: null,
    clears: { vess: { count: 0, bestAscension: -1 }, bram: { count: 0, bestAscension: -1 } },
    unlockedCards: [],
    ascensionUnlocked: { vess: 0, bram: 0 },
    codex: { truths: [], eliminations: [] },
    unlocks: allRitesUnlocked(),
  };
}

/** Codex entries must be real answer ids — drop strings the content set
 *  doesn't know (and anything that isn't a string), dedup, keep order. */
function validAnswerIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter((x): x is string => typeof x === 'string' && x in ANSWERS_BY_ID))];
}

/** Defensive shape repair — a profile is user-editable storage. */
function normalize(raw: unknown): Profile {
  const p = emptyProfile();
  if (!raw || typeof raw !== 'object') return p;
  const r = raw as Record<string, unknown>;
  for (const c of ['vess', 'bram'] as CharacterId[]) {
    const clears = (r.clears as Record<string, { count?: unknown; bestAscension?: unknown }> | undefined)?.[c];
    if (clears) {
      p.clears[c].count = Math.max(0, Math.floor(Number(clears.count) || 0));
      p.clears[c].bestAscension = Math.min(ASCENSION_CAP, Math.floor(Number(clears.bestAscension ?? -1)));
    }
    const au = (r.ascensionUnlocked as Record<string, unknown> | undefined)?.[c];
    p.ascensionUnlocked[c] = Math.max(0, Math.min(ASCENSION_CAP, Math.floor(Number(au) || 0)));
  }
  if (Array.isArray(r.unlockedCards)) {
    p.unlockedCards = (r.unlockedCards as unknown[]).filter((x): x is string => typeof x === 'string');
  }
  // S6.3 (v1 → v2): keep a stored installId; a missing one gets the fresh
  // uuid emptyProfile generated. Consent defaults to null (= never asked).
  if (typeof r.installId === 'string' && r.installId.length >= 8 && r.installId.length <= 64) {
    p.installId = r.installId;
  }
  if (r.telemetryConsent === true || r.telemetryConsent === false) p.telemetryConsent = r.telemetryConsent;
  // v1 profiles have no codex — upgrade to empty; v2 garbage gets filtered
  const codex = r.codex as Record<string, unknown> | undefined;
  p.codex.truths = validAnswerIds(codex?.truths);
  p.codex.eliminations = validAnswerIds(codex?.eliminations);
  // S22.1: the declared final entry — kept only when it is a real fifth
  // answer AND the stored codex it rides on is complete (a declaration
  // cannot be pasted onto an unfinished book)
  if (typeof codex?.declared === 'string' && codex.declared in FIFTH_ANSWERS_BY_ID
    && codexCompleteFor(p.codex.truths, p.codex.eliminations)) {
    p.codex.declared = codex.declared;
  }
  // S9a: rite unlocks. A profile predating the field keeps the seeded
  // all-unlocked default from emptyProfile; a stored field is kept as the
  // intersection with the role's real rite set (unknown ids drop).
  const un = r.unlocks as Record<string, { deathRites?: unknown; birthRites?: unknown }> | undefined;
  if (un && typeof un === 'object') {
    for (const c of ['vess', 'bram'] as CharacterId[]) {
      if (!un[c] || typeof un[c] !== 'object') continue;
      const keep = (raw: unknown, kind: 'death' | 'birth'): string[] => {
        const real = new Set(ritesFor(c, kind).map((x) => x.id));
        return Array.isArray(raw)
          ? [...new Set((raw as unknown[]).filter((x): x is string => typeof x === 'string' && real.has(x)))]
          : [];
      };
      p.unlocks[c] = { deathRites: keep(un[c].deathRites, 'death'), birthRites: keep(un[c].birthRites, 'birth') };
    }
  }
  return p;
}

// checked per call, not at import — node test environments stub localStorage
// after this module loads
const hasStorage = (): boolean => typeof localStorage !== 'undefined';

export function loadProfile(): Profile {
  if (!hasStorage()) return emptyProfile();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      // S6.3: the installId must be stable from the very first load
      const fresh = emptyProfile();
      saveProfile(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw);
    const p = normalize(parsed);
    // S6.3 migration: a v1 profile gets its installId minted exactly once —
    // persist it so the id is stable across loads
    if (parsed?.version !== 2 || parsed?.installId !== p.installId) saveProfile(p);
    return p;
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p: Profile): void {
  if (!hasStorage()) return;
  localStorage.setItem(KEY, JSON.stringify(p));
}

// ---- export / import string -------------------------------------------------

function hash32(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function toB64(s: string): string {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(s)));
  return Buffer.from(s, 'utf8').toString('base64');
}

function fromB64(s: string): string {
  if (typeof atob === 'function') return decodeURIComponent(escape(atob(s)));
  return Buffer.from(s, 'base64').toString('utf8');
}

/** base64(JSON) + '.' + short checksum. The export string is PROGRESS, not
 *  identity: installId + consent stay device-local (S6.3 — no tracking
 *  across devices; a wiped profile regenerates its id). */
export function exportProfile(p: Profile): string {
  const { installId: _id, telemetryConsent: _tc, ...progress } = p;
  const json = JSON.stringify(progress);
  return `${toB64(json)}.${hash32(json).toString(36)}`;
}

/** Validates version + checksum; returns null on anything corrupt. */
export function importProfile(s: string): Profile | null {
  try {
    const dot = s.trim().lastIndexOf('.');
    if (dot < 0) return null;
    const json = fromB64(s.trim().slice(0, dot));
    if (hash32(json).toString(36) !== s.trim().slice(dot + 1)) return null;
    const parsed = JSON.parse(json);
    // v1 exports predate the codex (and never carried device-local identity)
    // — normalize upgrades them
    if (parsed?.version !== 1 && parsed?.version !== 2) return null;
    return normalize(parsed);
  } catch {
    return null;
  }
}

/** Max/union semantics — merging never downgrades either side. */
export function mergeProfiles(a: Profile, b: Profile): Profile {
  const out = emptyProfile();
  // device-local fields follow THIS device (a), never the imported side
  out.installId = a.installId;
  out.telemetryConsent = a.telemetryConsent;
  for (const c of ['vess', 'bram'] as CharacterId[]) {
    out.clears[c] = {
      count: Math.max(a.clears[c].count, b.clears[c].count),
      bestAscension: Math.max(a.clears[c].bestAscension, b.clears[c].bestAscension),
    };
    out.ascensionUnlocked[c] = Math.max(a.ascensionUnlocked[c], b.ascensionUnlocked[c]);
  }
  out.unlockedCards = [...new Set([...a.unlockedCards, ...b.unlockedCards])];
  // codex union — never removes; base order first, then incoming novelties
  out.codex.truths = [...new Set([...a.codex.truths, ...b.codex.truths])];
  out.codex.eliminations = [...new Set([...a.codex.eliminations, ...b.codex.eliminations])];
  // S22.1: the declaration merges like everything else — never downgrades;
  // this device's entry wins where both declared
  const declared = a.codex.declared ?? b.codex.declared;
  if (declared && codexCompleteFor(out.codex.truths, out.codex.eliminations)) {
    out.codex.declared = declared;
  }
  // S9a rite unlocks — same union rule
  for (const c of ['vess', 'bram'] as CharacterId[]) {
    out.unlocks[c] = {
      deathRites: [...new Set([...a.unlocks[c].deathRites, ...b.unlocks[c].deathRites])],
      birthRites: [...new Set([...a.unlocks[c].birthRites, ...b.unlocks[c].birthRites])],
    };
  }
  return out;
}

/** S4.4 unlock rule: clearing A(N) unlocks A(N+1) for the character you
 *  played. Credit accrues in THIS browser's profile; the partner's browser
 *  records its own seat (union rule — both profiles advance). */
export function recordClear(character: CharacterId, ascension: number): Profile {
  const p = loadProfile();
  p.clears[character].count++;
  p.clears[character].bestAscension = Math.max(p.clears[character].bestAscension, ascension);
  p.ascensionUnlocked[character] = Math.max(
    p.ascensionUnlocked[character],
    Math.min(ASCENSION_CAP, ascension + 1),
  );
  saveProfile(p);
  return p;
}

/** S6.3: settings toggle + consent card both land here. */
export function setTelemetryConsent(consent: boolean): Profile {
  const p = loadProfile();
  p.telemetryConsent = consent;
  saveProfile(p);
  return p;
}

/** S6.8 codex writes at a Loom's Eye verdict. Ids are validated against the
 *  content set; only novel ids append (insertion order = discovery order). */
export function recordCodex(truths: string[], eliminations: string[]): void {
  const p = loadProfile();
  for (const id of validAnswerIds(truths)) {
    if (!p.codex.truths.includes(id)) p.codex.truths.push(id);
  }
  for (const id of validAnswerIds(eliminations)) {
    if (!p.codex.eliminations.includes(id)) p.codex.eliminations.push(id);
  }
  saveProfile(p);
}

/** Resolve stored codex ids to answer defs (title-screen list, future UI). */
export function codexEntries(): { truths: AnswerDef[]; eliminations: AnswerDef[] } {
  const p = loadProfile();
  return {
    truths: p.codex.truths.map((id) => ANSWERS_BY_ID[id]),
    eliminations: p.codex.eliminations.map((id) => ANSWERS_BY_ID[id]),
  };
}

/** S22.1 (D1 — lore-bible open ruling #6, taken): completion is
 *  per-question closure over the deduction SET, computed profile-side (D2).
 *  Pure passthrough to the engine's client-safe helper. */
export function codexComplete(p: Profile = loadProfile()): boolean {
  return codexCompleteFor(p.codex.truths, p.codex.eliminations);
}

/** S22.1 (D1b): record the pair's declared answer — the codex's final
 *  entry. Written once, only onto a complete book (the conservative
 *  reading, flagged in S22-STATUS: a partner whose own codex is not yet
 *  complete declares at the table but records nothing — the Eye will come
 *  to them when their own book closes). */
export function recordDeclaration(answerId: string): void {
  const p = loadProfile();
  if (p.codex.declared) return;
  if (!(answerId in FIFTH_ANSWERS_BY_ID)) return;
  if (!codexComplete(p)) return;
  p.codex.declared = answerId;
  saveProfile(p);
}

/** S8.7 voice arc: this profile's codex fill as a percentage of the PUBLIC
 *  ontology (ANSWERS length — ids only, no prose crosses the wire). Truths
 *  and eliminations both count: wrong answers are cartography too (§5). */
export function codexPct(p: Profile = loadProfile()): number {
  if (ANSWERS.length === 0) return 0;
  const known = new Set([...p.codex.truths, ...p.codex.eliminations]).size;
  return Math.max(0, Math.min(100, Math.round((100 * known) / ANSWERS.length)));
}

/** The claim sent at room join (create/join/hello). S6.3: carries the
 *  anonymous installId and this seat's telemetry consent — the server's
 *  both-consent rule reads these claims. Codex CONTENT deliberately excluded
 *  (pure client-side narrative bookkeeping); S8.7 adds only its fill
 *  PERCENTAGE, which keys the Witness's voice register for the run.
 *  review fix: installId rides the claim ONLY with explicit consent — a
 *  non-consenting player's id must never reach the server (it was landing
 *  in the rooms persistence snapshot). Telemetry needs the id exactly when
 *  consent is true, so nothing consented loses it. */
export function profileClaim(): {
  unlockedCards: string[];
  ascensionUnlocked: Record<CharacterId, number>;
  installId?: string;
  telemetryConsent: boolean | null;
  codexPct: number;
  codexComplete: boolean;
  codexDeclared?: string;
  riteUnlocks: RiteUnlocks;
} {
  const p = loadProfile();
  return {
    unlockedCards: p.unlockedCards,
    ascensionUnlocked: p.ascensionUnlocked,
    ...(p.telemetryConsent === true ? { installId: p.installId } : {}),
    telemetryConsent: p.telemetryConsent,
    codexPct: codexPct(p),
    // S22.2 (D2): completion rides the claim beside codexPct; the server
    // clamps (pct-100 coherence) and applies the host convention. The
    // declared final entry rides with it once made.
    codexComplete: codexComplete(p),
    ...(p.codex.declared ? { codexDeclared: p.codex.declared } : {}),
    // S9a: wire shape matches the engine's RiteUnlocks (death/birth keys)
    riteUnlocks: {
      vess: { death: p.unlocks.vess.deathRites, birth: p.unlocks.vess.birthRites },
      bram: { death: p.unlocks.bram.deathRites, birth: p.unlocks.bram.birthRites },
    },
  };
}
