# Threadbound

A two-player cooperative deckbuilding roguelike, played in the browser.
Design: `docs/threadbound_design_doc.md` (Draft 3) · M2 plan: `docs/threadbound_M2_plan.md` · Playtest checklist: `docs/PLAYTEST-2.md`

## Play (two people, two machines)

```bash
npm install
npm run build
npm run server        # serves game + client on http://localhost:8080
```

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
localStorage rejoins the room with no state loss.

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

Architecture (§11): `packages/engine` (pure deterministic reducer — all rules
live here), `packages/server` (Node + ws, authoritative), `packages/client`
(React, renders state + sends intents only), `packages/bots` (headless WS
clients for integration tests and balance telemetry).
