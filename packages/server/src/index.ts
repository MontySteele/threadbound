// Entry point: boots the game server. Env (S6.7: all local-safe defaults):
//   PORT                 listen port (default 8080; 0 = ephemeral)
//   HUMAN_TELEMETRY=dir  M3-A1: write per-run telemetry files (or pass --human-session)
//   TB_FEEDBACK_DIR=dir  S6.2: feedback + bug reports, date-rotated JSONL (default ./feedback)
//   PERSIST=path         graceful-restart room snapshots (default .threadbound-rooms.json;
//                        point at /data/... on a hosted persistent disk)
//   TB_MAX_ROOMS=n       S6.2: concurrent-room cap (default 200)
//   TB_ROOM_RATE=n       S6.2: room creations per client IP per minute (default 10)
//   TB_TRUSTED_PROXY=... which forwarding header the rate limiter may trust:
//                        cloudflare (CF-Connecting-IP — cloudflared tunnels),
//                        proxy (rightmost X-Forwarded-For hop — behind exactly
//                        one trusted proxy, e.g. Render), unset = raw socket
//   TB_DRAIN=1           S6.2: drain — no new rooms, existing rooms play on
//   TB_MAX_FEEDBACK=n    review fix: per-room cap on stored feedback records
//                        (default 200) — beyond it nothing is stored/written
//   BUILD_SHA=sha        S6.1: build identity (source checkouts derive dev+<git hash>)
//   TB_ENEMY_HP_SCALE / TB_ENEMY_DMG_SCALE
//                        live difficulty override (defaults 1.45 / 1.30) — soften a
//                        first-timer session without a commit; logged in telemetry

import path from 'node:path';
import { CONTENT_VERSION } from '@threadbound/engine';
import { buildSha } from './build';
import { GameServer, proxyTrustFromEnv } from './lib';

// `npm run server --human-session` doesn't reach argv — npm swallows unknown
// flags into npm_config_* env. Accept all three spellings.
const humanSession =
  process.argv.includes('--human-session') ||
  !!process.env.HUMAN_TELEMETRY ||
  process.env.npm_config_human_session === 'true';

const game = new GameServer({
  port: Number(process.env.PORT ?? 8080),
  // HUMAN_TELEMETRY is a dir; bare flag values ('1'/'true') take the default
  humanTelemetryDir: humanSession
    ? ((process.env.HUMAN_TELEMETRY && !['1', 'true'].includes(process.env.HUMAN_TELEMETRY))
        ? process.env.HUMAN_TELEMETRY
        : path.resolve(process.cwd(), 'telemetry'))
    : undefined,
  feedbackDir: process.env.TB_FEEDBACK_DIR || path.resolve(process.cwd(), 'feedback'),
  persistPath: process.env.PERSIST ?? path.resolve(process.cwd(), '.threadbound-rooms.json'),
  maxRooms: Number(process.env.TB_MAX_ROOMS ?? 200) || 200,
  roomCreatesPerMin: Number(process.env.TB_ROOM_RATE ?? 10) || 10,
  trustedProxy: proxyTrustFromEnv(),
  drain: process.env.TB_DRAIN === '1',
  maxFeedback: Number(process.env.TB_MAX_FEEDBACK ?? 200) || 200,
});

game.listen().then((port) => {
  console.log(`Threadbound server listening on http://localhost:${port}`);
  console.log(`build ${buildSha()} · content ${CONTENT_VERSION}`); // S6.1
  if (humanSession) console.log('human-session telemetry enabled (M3-A1)');
  if (process.env.TB_DRAIN === '1') console.log('DRAIN: no new rooms; existing rooms play on (S6.2)');
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
