// Entry point: boots the game server. Env:
//   PORT                 listen port (default 8080; 0 = ephemeral)
//   HUMAN_TELEMETRY=dir  M3-A1: write per-run telemetry files (or pass --human-session)
//   PERSIST=path         graceful-restart room snapshots (default .threadbound-rooms.json)
//   TB_ENEMY_HP_SCALE / TB_ENEMY_DMG_SCALE
//                        live difficulty override (defaults 1.4 / 1.3) — soften a
//                        first-timer session without a commit; logged in telemetry

import path from 'node:path';
import { GameServer } from './lib';

// `npm run server --human-session` doesn't reach argv — npm swallows unknown
// flags into npm_config_* env. Accept all three spellings.
const humanSession =
  process.argv.includes('--human-session') ||
  !!process.env.HUMAN_TELEMETRY ||
  process.env.npm_config_human_session === 'true';

const game = new GameServer({
  port: Number(process.env.PORT ?? 8080),
  humanTelemetryDir: humanSession
    ? (process.env.HUMAN_TELEMETRY || path.resolve(process.cwd(), 'telemetry'))
    : undefined,
  persistPath: process.env.PERSIST ?? path.resolve(process.cwd(), '.threadbound-rooms.json'),
});

game.listen().then((port) => {
  console.log(`Threadbound server listening on http://localhost:${port}`);
  if (humanSession) console.log('human-session telemetry enabled (M3-A1)');
});

// graceful restart (M3-D): snapshot rooms; clients rejoin via their tokens
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    console.log(`${sig}: persisting rooms and shutting down`);
    game.close();
    process.exit(0);
  });
}

// exported for the bot simulation / integration tests (legacy shape)
export const server = game.server;
export { game };
export { GameServer } from './lib';
export type { Room, Seat, GameServerOptions } from './lib';
