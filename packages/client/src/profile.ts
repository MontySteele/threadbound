// S4.5 browser profile + unlock machinery (meta-progression substrate).
// No accounts: the profile lives in localStorage next to the session token,
// with a base64+checksum export string as the save-state. The server treats
// everything here as a CLAIM and clamps (§11) — this file is bookkeeping,
// not authority.

import { CharacterId } from '@threadbound/engine';

export interface Profile {
  version: 1;
  clears: Record<CharacterId, { count: number; bestAscension: number }>;
  unlockedCards: string[];
  ascensionUnlocked: Record<CharacterId, number>;
}

const KEY = 'tb_profile';
const ASCENSION_CAP = 5;

export function emptyProfile(): Profile {
  return {
    version: 1,
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
  return p;
}

// checked per call, not at import — node test environments stub localStorage
// after this module loads
const hasStorage = (): boolean => typeof localStorage !== 'undefined';

export function loadProfile(): Profile {
  if (!hasStorage()) return emptyProfile();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? normalize(JSON.parse(raw)) : emptyProfile();
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

/** base64(JSON) + '.' + short checksum. */
export function exportProfile(p: Profile): string {
  const json = JSON.stringify(p);
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
    if (parsed?.version !== 1) return null;
    return normalize(parsed);
  } catch {
    return null;
  }
}

/** Max/union semantics — merging never downgrades either side. */
export function mergeProfiles(a: Profile, b: Profile): Profile {
  const out = emptyProfile();
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

/** The claim sent at room join (create/join/hello). */
export function profileClaim(): { unlockedCards: string[]; ascensionUnlocked: Record<CharacterId, number> } {
  const p = loadProfile();
  return { unlockedCards: p.unlockedCards, ascensionUnlocked: p.ascensionUnlocked };
}
