# Threadbound

A two-player cooperative deckbuilding roguelike, played in the browser.
Design: `docs/threadbound_design_doc.md` (Draft 3) · M2 plan: `docs/threadbound_M2_plan.md` · Playtest checklist: `docs/PLAYTEST-2.md`

## Play (two people, two machines)

```bash
npm install
npm run build
npm run server        # serves game + client on http://localhost:8080
```

`npm run server` **is the game** — no environment flags needed (S20.1
ruling): the knotwork braid map, the death/birth rites, and the narrative
truth tracks are all on by default, everywhere the server runs.

Full game: two acts (The Undercroft, The Hollow Choir) and the finale (The
Last Braid / The Unraveled) — branching maps, shops, relics, upgrades, the
Wedding Knife, down-but-not-out revival. Target run length 60–75 minutes.

1. **Player 1** opens `http://localhost:8080` (or the deployed URL), picks a
   character, clicks **Create room**, and reads out the 5-letter code.
2. **Player 2** opens the same URL on their machine and joins with the code.
   (For two machines on a LAN, player 2 uses `http://<player1-ip>:8080`; for the
   internet, deploy the server or tunnel the port, e.g. `npx localtunnel --port 8080`.)
3. Either player clicks **Begin the descent**.

Refreshing or dropping the connection is safe: the session token in
localStorage rejoins the room with no state loss — and the server snapshots
rooms on shutdown, so even a server restart mid-run only costs a refresh.

### Playing over the internet: use a tunnel, not a port-forward

```bash
npm run server                              # localhost:8080
cloudflared tunnel --url http://localhost:8080
```

`cloudflared` (Cloudflare quick tunnel, no account needed) prints a public
`https://….trycloudflare.com` URL — send that plus the room code. WebSockets
and TLS work through it out of the box (the client derives `wss://` from the
page origin automatically). For recurring sessions, prefer Tailscale
(`tailscale serve`) or the hosted deployment below; avoid router
port-forwarding (CGNAT-hostile, and serves plain `ws://` to the internet).

### Hosted deployment (S6 — where the public plays)

The quick tunnel stays the documented way to play from source; the hosted
URL is simply where strangers play. `Dockerfile` builds all workspaces into
one image (the server serves the client dist + websockets); `render.yaml`
is a ready blueprint for the ruled platform (Render Starter + a persistent
disk at `/data` — snapshots, telemetry, and feedback survive deploys, so a
deploy costs players one refresh).

Everything is env-driven with local-safe defaults (S6.7 — nothing assumes
Render):

| env | default | hosted value |
|---|---|---|
| `HUMAN_TELEMETRY` | off (`--human-session` → `./telemetry`) | `/data/telemetry` |
| `TB_FEEDBACK_DIR` | `./feedback` | `/data/feedback` |
| `PERSIST` | `.threadbound-rooms.json` | `/data/threadbound-rooms.json` |
| `TB_MAX_ROOMS` | 200 | 200 |
| `TB_ROOM_RATE` | 10 creates/IP/min | 10 |
| `TB_DRAIN` | off | `1` for a maintenance window |
| `BUILD_SHA` | `dev+<git short-hash>` | injected at image build |

Rate limiting is proxy-aware (`CF-Connecting-IP` → `X-Forwarded-For` → raw
socket), so it works identically behind Render's proxy and a `cloudflared`
tunnel. When `HUMAN_TELEMETRY` is on, clients are shown an opt-in consent
card (see `/data-note`); a run's telemetry file is written only if **both**
seats opted in. Pull hosted data local with
`TB_SSH_HOST=<ssh-addr> scripts/pull-telemetry.sh`, then aggregate it into
the battery format with `node scripts/aggregate-human.mjs <dir>`.

### Playtest instrumentation

```bash
node packages/server/dist/index.js --human-session   # per-run telemetry → ./telemetry/
```

During play, stamp the moment a feeling changes: `]` felt good, `[` felt bad,
`\` typed note (on a pad: **L1+R1**). Stamps land in the telemetry files with
act/turn/combat context for the Part A calibration.

**Solo testing (one browser, both seats):** open `http://localhost:8080/` in
one tab and `http://localhost:8080/?tab=2` in another — the `?tab=` param
namespaces the session token so the tabs hold independent seats (each still
reconnects after refresh). An incognito window works too.

## Development

```bash
npm test              # engine unit tests, Covenant audit, fuzz+replay, reconnection
npm run sim           # 50-run headless bot simulation + M2 telemetry gates
npm run check         # everything above
npm run client        # vite dev server (proxies ws to :8080)
```

### Archaeology flags (`=0` escapes)

Since S20.1 the shipped configuration is the default: `TB_RITES`,
`TB_TRACKS`, and `TB_KNOTWORK` are all ON when unset, for the server and
the bot fleet alike. The old baselines survive only as explicit opt-outs
for archaeology — comparing against pre-S15 behavior, or reproducing an
old battery:

| flag | `=0` restores |
|---|---|
| `TB_KNOTWORK=0` | the pre-S15 lane map generator (unbanded since S18/OQ#65) |
| `TB_RITES=0` | no vestry phase, no death/birth rites, no growth tallies |
| `TB_TRACKS=0` | no narrative truth system (no Tapestry, shrine, gated events) |

None of these belong on a hosted build; they exist so history stays
reproducible.

Architecture (§11): `packages/engine` (pure deterministic reducer — all rules
live here), `packages/server` (Node + ws, authoritative), `packages/client`
(React, renders state + sends intents only), `packages/bots` (headless WS
clients for integration tests and balance telemetry).
