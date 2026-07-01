import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// S6.1 build identity: BUILD_SHA env (hosted builds), else the local git
// short-hash as `dev+<sha>`, else plain `dev` (S6.7: never crashes a
// source checkout without git).
function buildSha(): string {
  const env = process.env.BUILD_SHA;
  // platforms hand over the full 40-char commit — keep the stamp short
  if (env) return /^[0-9a-f]{12,40}$/i.test(env) ? env.slice(0, 7) : env;
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return sha ? `dev+${sha}` : 'dev';
  } catch {
    return 'dev';
  }
}

// In dev the vite server proxies websockets to the game server (port 8080);
// in production the game server serves the built bundle itself, same origin.
export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_SHA__: JSON.stringify(buildSha()),
  },
  server: {
    proxy: {
      '/ws': { target: 'ws://localhost:8080', ws: true },
      '/data-note': { target: 'http://localhost:8080' },
    },
  },
});
