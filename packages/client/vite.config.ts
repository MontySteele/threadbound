import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the vite server proxies websockets to the game server (port 8080);
// in production the game server serves the built bundle itself, same origin.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // §11 extension (nt-slice): the engine's secret narrative content must
      // not ship in the browser bundle — swap it for the throwing stub. The
      // bundle-secrecy test enforces this stays effective.
      { find: /^\.{1,2}\/content\/(truth|faces)(\.js)?$/, replacement: path.resolve(__dirname, 'src/engine-secret-stub.ts') },
    ],
  },
  server: {
    proxy: {
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
});
