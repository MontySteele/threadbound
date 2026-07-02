// S6.1 build identity (server side). Precedence: BUILD_SHA env, then the
// .build-sha file a hosted Docker build persisted (review fix — the nested
// ENV default was legacy-builder fragile), then `git rev-parse` for source
// checkouts (S6.7: never crashes — dev machines get `dev+<short-hash>`,
// gitless environments `dev`).

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let cached: string | undefined;

/** Platforms hand over the full 40-char commit — keep stamps short. */
function shorten(sha: string): string {
  return /^[0-9a-f]{12,40}$/i.test(sha) ? sha.slice(0, 7) : sha;
}

export function buildSha(): string {
  if (cached) return cached;
  if (process.env.BUILD_SHA) return (cached = shorten(process.env.BUILD_SHA));
  // hosted image: the Dockerfile resolves the sha at build time and writes
  // it beside the workspace root (WORKDIR /app)
  for (const f of [path.resolve(process.cwd(), '.build-sha'), path.resolve(__dirname, '../../../.build-sha')]) {
    try {
      const sha = fs.readFileSync(f, 'utf8').trim();
      if (sha) return (cached = shorten(sha));
    } catch { /* not a hosted image — fall through to git */ }
  }
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    cached = sha ? `dev+${sha}` : 'dev';
  } catch {
    cached = 'dev';
  }
  return cached;
}
