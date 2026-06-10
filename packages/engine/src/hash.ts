// State hashing for replay verification (§11): canonical JSON (sorted keys,
// telemetry/log excluded since they are observational) + FNV-1a 64-bit.

import { GameState } from './types';

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys
    .filter((k) => obj[k] !== undefined)
    .map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`)
    .join(',')}}`;
}

export function fnv1a64(str: string): string {
  let h = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < str.length; i++) {
    h ^= BigInt(str.charCodeAt(i));
    h = (h * prime) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, '0');
}

export function hashState(state: GameState): string {
  const { log: _log, telemetry: _t, ...rest } = state;
  return fnv1a64(canonicalJson(rest));
}
