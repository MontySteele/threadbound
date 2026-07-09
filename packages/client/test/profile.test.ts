// S4.5 / sign-off gate 6: profile export → wipe → import round-trips
// identically; corrupted strings are rejected cleanly; merge is max/union.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  Profile,
  codexComplete, codexEntries, emptyProfile, exportProfile, importProfile, loadProfile,
  mergeProfiles, profileClaim, recordClear, recordCodex, recordDeclaration, saveProfile, setTelemetryConsent,
} from '../src/profile';
import { ANSWERS, FIFTH_ANSWERS } from '@threadbound/engine';

/** installId is random per emptyProfile() — compare progress fields only. */
const progress = (p: Profile) => {
  const { installId: _id, telemetryConsent: _tc, ...rest } = p;
  return rest;
};

// node has no localStorage — give the module a tiny stand-in
const store = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
};

beforeEach(() => store.clear());

describe('profile export/import round-trip (gate 6)', () => {
  it('export → wipe localStorage → import → identical profile', () => {
    const p = emptyProfile();
    p.clears.vess = { count: 3, bestAscension: 2 };
    p.ascensionUnlocked.vess = 3;
    p.unlockedCards = ['hollow_seam', 'graverust'];
    saveProfile(p);
    const exported = exportProfile(loadProfile());

    store.clear(); // the wipe
    expect(progress(loadProfile())).toEqual(progress(emptyProfile()));

    const imported = importProfile(exported);
    expect(imported).not.toBeNull();
    saveProfile(mergeProfiles(loadProfile(), imported!));
    // S6.3: progress round-trips; installId/consent are device-local and
    // regenerate on a wipe — they are NOT carried by the export string
    expect(progress(loadProfile())).toEqual(progress(p));
  });

  it('rejects corrupted strings cleanly', () => {
    const good = exportProfile(emptyProfile());
    expect(importProfile(good.slice(0, -1) + (good.endsWith('0') ? '1' : '0'))).toBeNull(); // checksum break
    expect(importProfile('not even close')).toBeNull();
    expect(importProfile('')).toBeNull();
    // payload tamper without fixing the checksum
    const [b64, sum] = [good.slice(0, good.lastIndexOf('.')), good.slice(good.lastIndexOf('.') + 1)];
    const tampered = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b64, 'base64').toString()), version: 99 })).toString('base64');
    expect(importProfile(`${tampered}.${sum}`)).toBeNull();
  });

  it('merge is max/union — never downgrades', () => {
    const a = emptyProfile();
    a.clears.vess = { count: 5, bestAscension: 1 };
    a.ascensionUnlocked.vess = 2;
    a.unlockedCards = ['x'];
    const b = emptyProfile();
    b.clears.vess = { count: 2, bestAscension: 4 };
    b.ascensionUnlocked.bram = 1;
    b.unlockedCards = ['y'];
    const m = mergeProfiles(a, b);
    expect(m.clears.vess).toEqual({ count: 5, bestAscension: 4 });
    expect(m.ascensionUnlocked).toEqual({ vess: 2, bram: 1 });
    expect(m.unlockedCards.sort()).toEqual(['x', 'y']);
  });
});

describe('S6.3 installId + telemetry consent (profile v2)', () => {
  it('mints a stable installId once, including for migrated v1 profiles', () => {
    const v1 = { version: 1, clears: { vess: { count: 2, bestAscension: 0 }, bram: { count: 0, bestAscension: -1 } }, unlockedCards: [], ascensionUnlocked: { vess: 1, bram: 0 } };
    store.set('tb_profile', JSON.stringify(v1));
    const first = loadProfile();
    expect(first.version).toBe(2);
    expect(first.installId.length).toBeGreaterThanOrEqual(8);
    expect(first.telemetryConsent).toBeNull(); // never asked
    expect(first.clears.vess.count).toBe(2); // progress survives the bump
    expect(loadProfile().installId).toBe(first.installId); // stable across loads
  });

  it('export string never carries installId or consent; merge keeps the local ones', () => {
    const p = loadProfile();
    setTelemetryConsent(true);
    expect(exportProfile(loadProfile())).not.toContain(p.installId);
    const imported = importProfile(exportProfile(loadProfile()))!;
    expect(imported.installId).not.toBe(p.installId); // freshly minted on import
    const merged = mergeProfiles(loadProfile(), imported);
    expect(merged.installId).toBe(p.installId);
    expect(merged.telemetryConsent).toBe(true);
  });

  it('profileClaim carries installId ONLY with explicit consent (review fix)', () => {
    // never asked (null): no id crosses the wire
    expect(loadProfile().telemetryConsent).toBeNull();
    expect('installId' in profileClaim()).toBe(false);
    // declined: still no id
    setTelemetryConsent(false);
    expect('installId' in profileClaim()).toBe(false);
    // consented: the id rides the claim — telemetry has it exactly when needed
    setTelemetryConsent(true);
    expect(profileClaim().installId).toBe(loadProfile().installId);
    expect(profileClaim().telemetryConsent).toBe(true);
    // opting back out withdraws it again
    setTelemetryConsent(false);
    expect('installId' in profileClaim()).toBe(false);
  });

  it('consent round-trips through the settings toggle', () => {
    expect(loadProfile().telemetryConsent).toBeNull();
    setTelemetryConsent(true);
    expect(loadProfile().telemetryConsent).toBe(true);
    setTelemetryConsent(false);
    expect(loadProfile().telemetryConsent).toBe(false);
  });
});

describe('S6.8 codex persistence', () => {
  it('normalize upgrades a legacy v1 profile (no codex) to an empty codex', () => {
    const legacy = { ...emptyProfile(), version: 1 } as Record<string, unknown>;
    delete legacy.codex;
    store.set('tb_profile', JSON.stringify(legacy));
    expect(loadProfile().codex).toEqual({ truths: [], eliminations: [] });
  });

  it('drops garbage codex entries: non-strings and unknown ids', () => {
    const p = emptyProfile() as unknown as Record<string, unknown>;
    p.codex = { truths: ['a_kin', 7, null, 'a_fake', 'a_kin'], eliminations: 'nope' };
    store.set('tb_profile', JSON.stringify(p));
    expect(loadProfile().codex).toEqual({ truths: ['a_kin'], eliminations: [] });
  });

  it('recordCodex appends novel valid ids only, keeping insertion order', () => {
    recordCodex(['a_kin'], ['a_hunger']);
    recordCodex(['a_kin', 'a_sexton', 'not_an_answer'], ['a_hunger', 'a_grief']);
    expect(loadProfile().codex).toEqual({
      truths: ['a_kin', 'a_sexton'],
      eliminations: ['a_hunger', 'a_grief'],
    });
    // selector resolves ids to defs
    const entries = codexEntries();
    expect(entries.truths.map((a) => a.id)).toEqual(['a_kin', 'a_sexton']);
    expect(entries.eliminations[0].codexTruthEntry).toBeTruthy();
  });

  it('merge unions both codexes — base order first, never removes', () => {
    const a = emptyProfile();
    a.codex = { truths: ['a_kin', 'a_sexton'], eliminations: ['a_hunger'] };
    const b = emptyProfile();
    b.codex = { truths: ['a_sexton', 'a_hired'], eliminations: ['a_grief'] };
    expect(mergeProfiles(a, b).codex).toEqual({
      truths: ['a_kin', 'a_sexton', 'a_hired'],
      eliminations: ['a_hunger', 'a_grief'],
    });
  });

  it('export/import round-trips a populated codex', () => {
    recordCodex(['a_peal'], ['a_kept']);
    const exported = exportProfile(loadProfile());
    store.clear();
    const imported = importProfile(exported);
    expect(imported).not.toBeNull();
    expect(imported!.codex).toEqual({ truths: ['a_peal'], eliminations: ['a_kept'] });
  });
});

describe('S4.4 unlock condition', () => {
  it('clearing A(N) unlocks A(N+1) for the character played, capped at A5', () => {
    recordClear('vess', 0);
    expect(loadProfile().ascensionUnlocked.vess).toBe(1);
    expect(loadProfile().ascensionUnlocked.bram).toBe(0);
    expect(loadProfile().clears.vess).toEqual({ count: 1, bestAscension: 0 });
    recordClear('vess', 5);
    expect(loadProfile().ascensionUnlocked.vess).toBe(5);
    recordClear('vess', 2); // lower clear never downgrades
    expect(loadProfile().ascensionUnlocked.vess).toBe(5);
    expect(loadProfile().clears.vess.bestAscension).toBe(5);
  });
});

describe('S8.7 codex fill claim (codexPct)', () => {
  it('an empty codex claims 0; fills climb against the PUBLIC ontology (ANSWERS length)', async () => {
    const { ANSWERS } = await import('@threadbound/engine');
    expect(profileClaim().codexPct).toBe(0);
    recordCodex(['a_peal'], ['a_kept']);
    expect(profileClaim().codexPct).toBe(Math.round((100 * 2) / ANSWERS.length));
    // truths + eliminations dedup: recording the same ids again moves nothing
    recordCodex(['a_peal'], ['a_kept']);
    expect(profileClaim().codexPct).toBe(Math.round((100 * 2) / ANSWERS.length));
  });

  it('a full codex claims exactly 100 — never above (server re-clamps anyway)', async () => {
    const { ANSWERS } = await import('@threadbound/engine');
    recordCodex(ANSWERS.map((a: { id: string }) => a.id), []);
    expect(profileClaim().codexPct).toBe(100);
  });
});

describe('S9a rite unlocks (profile storage + union rule)', () => {
  it('a fresh profile seeds ALL current rites unlocked, per role (the S7 ruling)', async () => {
    const { ritesFor } = await import('@threadbound/engine');
    const p = emptyProfile();
    for (const role of ['vess', 'bram'] as const) {
      expect(p.unlocks[role].deathRites).toEqual(ritesFor(role, 'death').map((r) => r.id));
      expect(p.unlocks[role].birthRites).toEqual(ritesFor(role, 'birth').map((r) => r.id));
    }
  });

  it('a pre-S9a stored profile (no unlocks field) normalizes to seeded-all; unknown ids drop', () => {
    const p = emptyProfile();
    const stored = { ...p } as Record<string, unknown>;
    delete stored.unlocks;
    localStorage.setItem('tb_profile', JSON.stringify(stored));
    expect(loadProfile().unlocks).toEqual(emptyProfile().unlocks);

    const garbage = { ...p, unlocks: { vess: { deathRites: ['dr_shroud', 'not_a_rite'], birthRites: [] }, bram: p.unlocks.bram } };
    localStorage.setItem('tb_profile', JSON.stringify(garbage));
    expect(loadProfile().unlocks.vess.deathRites).toEqual(['dr_shroud']);
    expect(loadProfile().unlocks.vess.birthRites).toEqual([]);
  });

  it('merge is union (never downgrades), and the claim carries the wire shape', () => {
    const a = emptyProfile();
    const b = emptyProfile();
    a.unlocks.vess.deathRites = ['dr_shroud'];
    b.unlocks.vess.deathRites = ['dr_votive'];
    const m = mergeProfiles(a, b);
    expect(m.unlocks.vess.deathRites.sort()).toEqual(['dr_shroud', 'dr_votive']);

    saveProfile(a);
    const claim = profileClaim();
    expect(claim.riteUnlocks.vess.death).toEqual(['dr_shroud']);
    expect(claim.riteUnlocks.bram.birth).toEqual(a.unlocks.bram.birthRites);
  });
});

describe('S22.1/S22.2 — completion, the declaration, and the claim', () => {
  const allIds = () => ANSWERS.map((a) => a.id);

  it('codexComplete reads per-question closure; the claim carries it with pct 100', () => {
    const p = emptyProfile();
    p.codex.truths = allIds().slice(0, 3);
    p.codex.eliminations = allIds().slice(3);
    saveProfile(p);
    expect(codexComplete()).toBe(true);
    const c = profileClaim();
    expect(c.codexComplete).toBe(true);
    expect(c.codexPct).toBe(100);
    // one missing answer holds the book open — and the claim honest
    const q = emptyProfile();
    q.codex.eliminations = allIds().slice(1);
    saveProfile(q);
    expect(codexComplete()).toBe(false);
    expect(profileClaim().codexComplete).toBe(false);
  });

  it('recordDeclaration writes once, only onto a complete book, only fifth answers', () => {
    const p = emptyProfile();
    p.codex.eliminations = allIds().slice(1);
    saveProfile(p);
    recordDeclaration(FIFTH_ANSWERS[0].id); // incomplete book — refused
    expect(loadProfile().codex.declared).toBeUndefined();

    const full = emptyProfile();
    full.codex.eliminations = allIds();
    saveProfile(full);
    recordDeclaration('a_kin'); // deduction id — refused
    expect(loadProfile().codex.declared).toBeUndefined();
    recordDeclaration(FIFTH_ANSWERS[0].id);
    expect(loadProfile().codex.declared).toBe(FIFTH_ANSWERS[0].id);
    recordDeclaration(FIFTH_ANSWERS[1].id); // written exactly once
    expect(loadProfile().codex.declared).toBe(FIFTH_ANSWERS[0].id);
    expect(profileClaim().codexDeclared).toBe(FIFTH_ANSWERS[0].id);
  });

  it('normalize drops a declaration pasted onto an unfinished or garbage codex', () => {
    const p = emptyProfile();
    p.codex.eliminations = allIds().slice(1);
    (p.codex as Record<string, unknown>).declared = FIFTH_ANSWERS[0].id;
    localStorage.setItem('tb_profile', JSON.stringify(p));
    expect(loadProfile().codex.declared).toBeUndefined();

    const full = emptyProfile();
    full.codex.eliminations = allIds();
    (full.codex as Record<string, unknown>).declared = 'not_an_answer';
    localStorage.setItem('tb_profile', JSON.stringify(full));
    expect(loadProfile().codex.declared).toBeUndefined();

    (full.codex as Record<string, unknown>).declared = FIFTH_ANSWERS[2].id;
    localStorage.setItem('tb_profile', JSON.stringify(full));
    expect(loadProfile().codex.declared).toBe(FIFTH_ANSWERS[2].id);
  });

  it('merge keeps the declaration when the merged book supports it', () => {
    const a = emptyProfile();
    const b = emptyProfile();
    a.codex.truths = allIds().slice(0, 5);
    b.codex.eliminations = allIds().slice(5);
    b.codex.declared = FIFTH_ANSWERS[3].id; // only valid post-merge
    // b alone is incomplete, so normalize would drop it — merge re-derives
    const m = mergeProfiles(a, b);
    expect(m.codex.declared).toBe(FIFTH_ANSWERS[3].id);
  });
});
