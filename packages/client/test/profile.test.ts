// S4.5 / sign-off gate 6: profile export → wipe → import round-trips
// identically; corrupted strings are rejected cleanly; merge is max/union.

import { beforeEach, describe, expect, it } from 'vitest';
import {
  codexEntries, emptyProfile, exportProfile, importProfile, loadProfile,
  mergeProfiles, recordClear, recordCodex, saveProfile,
} from '../src/profile';

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
    expect(loadProfile()).toEqual(emptyProfile());

    const imported = importProfile(exported);
    expect(imported).not.toBeNull();
    saveProfile(mergeProfiles(loadProfile(), imported!));
    expect(loadProfile()).toEqual(p);
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
