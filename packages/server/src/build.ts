// S6.1 build identity (server side). Precedence: BUILD_SHA env (set by the
// hosted build), then `git rev-parse` for source checkouts (S6.7: never
// crashes — dev machines get `dev+<short-hash>`, gitless environments `dev`).

import { execSync } from 'node:child_process';

let cached: string | undefined;

export function buildSha(): string {
  if (cached) return cached;
  if (process.env.BUILD_SHA) return (cached = process.env.BUILD_SHA);
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    cached = sha ? `dev+${sha}` : 'dev';
  } catch {
    cached = 'dev';
  }
  return cached;
}
