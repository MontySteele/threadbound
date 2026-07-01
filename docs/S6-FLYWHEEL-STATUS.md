# S6 Status — The Soft-Release Flywheel

2026-07-01, branch `s6-flywheel` (from post-S5 main). Code side of every
section landed; the sign-off gates that need a hosted URL and two humans
are listed at the bottom with exact instructions. Hard scope rule held:
zero gameplay-surface diffs vs main (the engine diff is 5 lines — the
`CONTENT_VERSION` constant).

## What landed, per section

### S6.1 Build identity
- `buildSha`: `BUILD_SHA` env at build/deploy time; source checkouts fall
  back to `dev+<git short-hash>`, gitless environments to `dev` (never
  crashes). Long platform shas are shortened to 7 chars.
- `CONTENT_VERSION = 's5'` lives in the engine (`packages/engine/src/index.ts`)
  — bump it on content changes.
- Stamped into: every telemetry run file, every feedback/bug/survey record,
  the server startup log (`build dev+… · content s5`), and a small
  always-visible client footer (vite `define` injection).
- The aggregation script groups by buildSha by default (S6.4).

### S6.2 Hosted deployment (code parts)
- `Dockerfile`: one image, all workspaces, server serves client dist +
  websockets. `render.yaml` blueprint: Render Starter + 1 GB disk at
  `/data`; telemetry/feedback/persistence env-pointed there.
- Hardening: concurrent-room cap (`TB_MAX_ROOMS`, default 200), per-IP
  room-creation rate limit (`TB_ROOM_RATE`, default 10/min) with
  proxy-aware IP resolution (`CF-Connecting-IP` → first `X-Forwarded-For`
  hop → raw socket), friendly in-fiction errors.
- Drain flag `TB_DRAIN=1`: creates blocked, existing rooms play on,
  reconnects work; the client title screen shows "the loom is being
  restrung" via the new `status` lifecycle message (sent once per WS
  connection: drain, telemetryActive, build identity).
- Room snapshots (`PERSIST`) were already env-configurable — verified and
  documented; `startedAt` now rides the snapshot too.
- `scripts/pull-telemetry.sh`: rsync over the Render service's SSH address
  (`TB_SSH_HOST=srv-…@ssh.<region>.render.com`), works against any
  rsync-able host.

### S6.3 Consent + privacy
- Profile bumped to v2: anonymous `installId` (random UUID, stable from
  first load, regenerated on wipe, **never** in the export string) and
  `telemetryConsent` (null = never asked). v1 profiles migrate in place;
  merge keeps the device-local fields; tests extended.
- Opt-in consent card at first launch, shown ONLY when the server declares
  telemetry collection active (`status.telemetryActive`). Plain-language
  what-is/what-is-never-collected per the doc. Choice changeable any time
  in the settings (♪) popover; a mid-session toggle re-sends the claim
  (`profile` message) so the seat never reads stale.
- **Both-consent rule (ratified)**: `maybeWriteTelemetry` writes a run's
  file only when every human seat's claim says `telemetryConsent: true`
  (solo: the one human). Consent claims can only suppress a file.
- `/data-note`: short static data note served by the server, linked from
  the consent card and the title footer (relative paths only).

### S6.4 Aggregation
- Run files now carry `startedAt`/`endedAt` wall-clock; a consented run
  start appends one line to `starts-<date>.jsonl` (the completion-rate
  denominator — abandoned runs never write an end-of-run file).
- `scripts/aggregate-human.mjs <dir> [--pair vb|vv|bb] [--ascension N]
  [--mode pair|solo|all]`: groups by buildSha, prints the sim harness's
  summary line-for-line (win rate, act HP loss, link-fire, resonance,
  Hex share, thread economy, gold, per-seat splits, GATES readout incl.
  the S5 gate-4 vb-only Hex band), plus human-only lines: runs-per-install
  distribution, completion rate, median run minutes. The sim printer is
  mirrored, not imported (sim.ts prints from live in-memory RunResults
  inside the bots workspace); the file header says so.

### S6.5 Feedback funnel
- Every feedback record now carries `kind` (stamp/bug/survey) + `room` +
  `seed` + build identity; records land date-rotated in the feedback dir
  (`TB_FEEDBACK_DIR`, default `./feedback`).
- Bug report button (settings ♪ popover + both end screens): one tap
  captures seed, turn, act, build, pair, ascension + optional text.
- End-of-run micro-survey on both summary screens: 1–5 + optional text,
  one-tap skip, seed-deduped, never blocks return-to-title.
- Title footer: version stamp (fixed corner) + relative `/data-note` link +
  Discord placeholder — the URL is the `DISCORD_URL` const at the top of
  `App.tsx` with a TODO for the real invite.

### S6.6 Distribution surface
- Title-screen first-visit blurb: how rooms work, "descend alone with the
  Witness", where feedback goes (+ `#looking-for-thread` pointer).
  Dismissible once, localStorage. No accounts, no email capture.
  (The itch page itself is out of code scope.)

### S6.7 Environment parity
- All behavior env-driven with local-safe defaults; plain `npm run server`
  behaves exactly as before (no consent card, no telemetry, feedback to
  `./feedback`). No absolute URLs — the client keeps deriving everything
  from the page origin; data-note and footer links are relative.
- README self-hosting section updated (quick tunnel kept as the documented
  source flow; env table added).

## Verification

- `npm test`: **96/96 green** (was 86 on main; +10 new: both-consent,
  drain, room cap, rate-limit/IP resolution, feedback record kinds,
  profile v2/installId/consent).
- Engine diff vs main: `packages/engine/src/index.ts | 5 +` (the constant
  only). No other engine file touched; no client gameplay-flow changes.
- Live smoke: startup log shows `build dev+<sha> · content s5`;
  `/data-note` serves; the `status` message arrives with correct
  `telemetryActive`/`drain`.

### Battery spot-check (gate 7): 30-run vb, seed set 1000, A0

%BATTERY%

S5 final reference (50 runs, same seed set): 28% win, act-1 HP/combat
22.7, link-fire 52.1/57.4, Hex share 44.3%, Worn Knife 7.74. %VERDICT%

## HUMAN-ONLY sign-off gates (cannot be performed by this sprint's agent)

1. **Hosted 2-player run (gates 1, 3).** Create the Render service from
   `render.yaml` (New → Blueprint, point at the repo, `s6-flywheel` or
   main after merge). Set `HUMAN_TELEMETRY=/data/telemetry` (blueprint
   default). Two humans on different networks open the `*.onrender.com`
   URL, complete a full run start→victory/fall, each deliberately
   refreshing once mid-run and rejoining. Verify the footer shows the
   deployed sha (not `dev+…`) and that both were shown the consent card.
2. **Snapshot-across-deploy (gate 9).** Mid-run on the hosted URL, push
   any commit (or "Manual Deploy"). After the new container boots, both
   players refresh; the run must continue. Server logs should show
   `restored N room(s) from /data/threadbound-rooms.json`.
3. **Tunnel parity run (gate 8).** From a source checkout:
   `HUMAN_TELEMETRY=1 npm run server` + `cloudflared tunnel --url
   http://localhost:8080`. Complete a 2-player run through the
   `trycloudflare.com` URL: with telemetry on, the consent card must show
   on both browsers and a run file appears in `./telemetry` only if both
   said yes (opt one out via ♪ → "share run stats" and confirm NO file).
   Re-run with telemetry off (`npm run server`): no card, no files.
4. **Live bug-report repro (gate 5).** During any hosted/tunnel run, tap
   ♪ → "report a bug…" (or the end-screen button). Pull the feedback dir
   (`scripts/pull-telemetry.sh`) and confirm the `kind:"bug"` record
   carries seed/turn/act/buildSha/pair/ascension; start a local run with
   that seed (`?` → the lobby start accepts a seed via the bots' start
   message, or replay via the room's action log) and confirm the state
   reproduces.
5. **Consent round-trip on real hardware (gate 2, partially automated).**
   The unit tests cover file-vs-no-file; a human should still flip the
   settings toggle mid-run on the hosted URL and verify the run's file
   appears/doesn't per the final claims.
6. **Discord invite.** Replace `DISCORD_URL` in
   `packages/client/src/App.tsx` once the server exists (3–4 channels
   incl. `#looking-for-thread`).
