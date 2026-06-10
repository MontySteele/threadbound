import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In dev the vite server proxies websockets to the game server (port 8080);
// in production the game server serves the built bundle itself, same origin.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ws': { target: 'ws://localhost:8080', ws: true },
    },
  },
});
