// S4.5 browser profile + unlock machinery (meta-progression substrate).
// No accounts: the profile lives in localStorage next to the session token,
// with a base64+checksum export string as the save-state. The server treats
// everything here as a CLAIM and clamps (§11) — this file is bookkeeping,
// not authority.

import { CharacterId } from '@threadbound/engine';

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
}

const KEY = 'tb_profile';
const ASCENSION_CAP = 5;

function newInstallId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `xx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyProfile(): Profile {
  return {
    version: 2,
    installId: newInstallId(),
    telemetryConsent: null,
    clears: { vess: { count: 0, bestAscension: -1 }, bram: { count: 0, bestAscension: -1 } },
    unlockedCards: [],
    ascensionUnlocked: { vess: 0, bram: 0 },
  };
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

/** The claim sent at room join (create/join/hello). S6.3: carries the
 *  anonymous installId and this seat's telemetry consent — the server's
 *  both-consent rule reads these claims. */
export function profileClaim(): {
  unlockedCards: string[];
  ascensionUnlocked: Record<CharacterId, number>;
  installId: string;
  telemetryConsent: boolean | null;
} {
  const p = loadProfile();
  return {
    unlockedCards: p.unlockedCards,
    ascensionUnlocked: p.ascensionUnlocked,
    installId: p.installId,
    telemetryConsent: p.telemetryConsent,
  };
}
