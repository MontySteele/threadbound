# Threadbound — Sprint S6: The Soft-Release Flywheel

Purpose: turn "two human runs per playtest evening" into a steady stream of
consented human telemetry and feedback from strangers. Every open design
question currently terminates in "needs human data" (gate-1 parity ruling,
the HP watch item, Reclaim engagement, and soon the narrative slice's
verdict) — this sprint builds the pipe.

Branch: `s6-flywheel`, from the post-S5 main. Runs in PARALLEL with
`nt-slice` — S6 touches deployment, consent, and telemetry plumbing, not
the gameplay surface the slice is building on. Hard scope rule: no balance
changes, no content, no new game mechanics. If a gameplay bug surfaces
during deployment testing, it gets its own commit against main per the
no-bundling rule.

## S6.1 Build identity first (everything downstream depends on it)

Human data will be pooled ACROSS patches; unversioned telemetry is
unusable. Before anything ships:
- Stamp `buildSha` (git short hash, injected at build time) + a manual
  `contentVersion` string into: every telemetry file, every feedback/bug
  record, the client footer (small, always visible), and the server's
  startup log.
- The aggregation script (S6.4) MUST group by buildSha by default.

## S6.2 Hosted deployment

- Dockerfile for the server (serves client dist + websockets).
  **Platform (ruled): Render, Starter tier + a small persistent disk**
  mounted at `/data`. Flat monthly price, Git-push deploys, websockets
  and TLS out of the box. Ship on the free `*.onrender.com` subdomain;
  a custom domain waits for the itch page and a settled public name
  (it's only a DNS pointer later).
- Telemetry/feedback write to the volume (`/data/telemetry`,
  `/data/feedback`), JSONL, log-rotated by date. A pull script
  (`scripts/pull-telemetry.sh`, rsync or platform CLI) brings files local
  for analysis.
- Server hardening, minimum viable: cap concurrent rooms (env,
  default 200), rate-limit room creation per client IP, idle-room reaping
  (verify the existing lifecycle cleanup fires under hosted conditions),
  bound in-memory state, restart-on-crash via the platform.
  **Proxy-aware IPs:** on Render the server sits behind the platform
  proxy, and behind a cloudflared tunnel every player arrives from
  Cloudflare edge IPs — rate limiting MUST read `X-Forwarded-For` /
  `CF-Connecting-IP` (with the raw socket as fallback) or it will
  throttle everyone as one client. Limits stay lenient enough for two
  players behind one NAT.
- **Deploys must only cost a refresh.** The server already snapshots
  rooms on shutdown (README); the S6 requirement is that the snapshot
  file writes to the persistent disk (`/data`) so the post-deploy
  container restores it — verify the restore path fires on Render's
  deploy cycle. The **drain flag** (`TB_DRAIN=1`: no new rooms, "the
  loom is being restrung" on the title screen) ships as a nicety for
  long maintenance windows, not as the deploy mechanism.
- Playtest reality check as the deploy gate: two humans on different
  networks complete a full run start→victory/fall on the hosted URL,
  including one deliberate refresh-reconnect each.

## S6.3 Consent + privacy

- Telemetry is OPT-IN, asked once at first launch (a plain-language card:
  what's collected — gameplay statistics, seed, build version, an
  anonymous random id; what's never collected — names, emails, chat,
  anything typed except explicit feedback text). Choice stored in the
  profile; changeable in settings.
- Anonymous `installId` (random UUID in the profile) included in
  telemetry so runs can be grouped without identity. Regenerated if the
  profile is wiped; explicitly not tracking across devices.
- **Both-consent rule (RATIFIED, designer 2026-07-01):** a run's
  telemetry file is written only if BOTH seats opted in (solo: the one
  human). Conservative, simple, and no one's file describes an
  unconsented partner.
- **The consent card appears only when the server declares telemetry
  collection active** (`HUMAN_TELEMETRY` on). Plain local dev never asks;
  a tunnel playtest with telemetry on asks — friends deserve the same
  consent as strangers.
- A short data note reachable from the consent card and the title screen
  footer (static page served by the server).

## S6.4 Aggregation — human files must read like battery reads

The design loop only closes if human telemetry lands in the same shape as
bot batteries. Build `scripts/aggregate-human.mjs`:
- Input: a directory of per-run telemetry JSONL; groups by buildSha (and
  optionally pair, ascension).
- Output: the SAME summary format the sim harness prints (win rate,
  act HP loss, link-fire, resonance counts, Hex share, thread economy,
  gold, gate readout) so every existing band and gate can be checked
  against human data directly — this is the M3 Part A human-uplift
  calibration path.
- Plus human-only lines: runs per installId distribution, completion
  rate (started vs finished), median run length in minutes.

## S6.5 Feedback funnel

- The existing in-run feedback stamp stays; ensure stamps land in
  `/data/feedback` with buildSha + seed + turn + room attached.
- **Bug report button** (pause menu + defeat/victory screens): one tap
  captures seed, turn, act, buildSha, pair, ascension + an optional text
  field. Every "needs a seed + turn to repro" OQ from PT2/PT3 becomes a
  one-tap artifact.
- **End-of-run micro-survey**, two items max, skippable in one tap:
  "How was this run?" (1–5) + optional free text. Never blocks the
  return-to-title flow.
- Title screen footer: version stamp + links (data note; **community
  link ruled: a small Discord server** — 3–4 channels max, including
  `#looking-for-thread`, which IS the matchmaking system while real
  matchmaking stays out of scope; the itch page joins later as
  storefront/devlog).

## S6.6 Distribution surface

The server is authoritative (§11), so the game can't be a static itch
embed. The itch.io page is the storefront/landing: description, GIFs,
and a prominent "Play in browser" link to the hosted domain. Title
screen gains a first-visit blurb: how rooms work, "play solo with the
Witness," and where to leave feedback. No accounts, no email capture.

## S6.7 Environment parity — local + tunnel dev stays first-class

The existing dev flow (README: `npm run server` on localhost:8080,
`cloudflared tunnel --url http://localhost:8080` for remote playtests)
must remain fully functional so development and local testing continue in
parallel with the hosted deployment. Nothing in S6 may assume Render.

- All S6 behavior is env-driven with LOCAL-SAFE DEFAULTS: telemetry dir
  defaults to `./telemetry` (as today), `/data/...` only via env; drain
  off; room cap generous; consent card absent when `HUMAN_TELEMETRY` is
  off (S6.3).
- `buildSha` falls back to `dev` + local git short-hash when no build-time
  injection is present; never crashes a source checkout.
- No absolute URLs anywhere: the client keeps deriving `ws(s)://` and all
  links from the page origin (already true — preserve it); the data-note
  page and footer links are relative paths.
- The tunnel is a proxy: keep the client-IP handling of S6.2 correct
  behind `trycloudflare.com` (CF-Connecting-IP) as well as Render.
- README's self-hosting section gets updated, not replaced: quick tunnel
  remains the documented way to play from source; the hosted URL is
  simply where the public plays.

## S6.8 Sign-off gates

1. Hosted URL: full remote 2-player run incl. refresh-reconnects (S6.2).
2. Consent honored: telemetry file written with both seats opted in;
   NO file when either seat opts out; settings toggle round-trips.
3. buildSha present in telemetry, feedback, bug reports, client footer.
4. Aggregation script produces a battery-style summary + gate readout
   from a directory of real human files.
5. Bug report from a live run arrives with seed/turn/build attached and
   reproduces locally via the seed.
6. Drain flag verified: blocks new rooms, message shows, active room
   finishes undisturbed.
7. Tests green from fresh clone; zero gameplay-surface diffs vs main
   (battery spot-check: 30-run vb aggregate within noise of S5 final).
8. **Tunnel parity:** a full 2-player run completes through a fresh
   `cloudflared` quick-tunnel URL from a source checkout — with
   `HUMAN_TELEMETRY` on, the consent card shows and both-consent is
   honored; with it off, no card and no files.
9. **Snapshot-across-deploy:** a Render deploy mid-run restores the room
   from the `/data` snapshot; both clients rejoin with a refresh and the
   run continues.

## Rulings resolved (designer, 2026-07-01)

1. Platform: **Render Starter + persistent disk**, free
   `*.onrender.com` subdomain for the soft release; custom domain
   deferred to the itch launch.
2. Consent: **both-consent** required to write a run's telemetry.
3. Community link: **Discord** (small: 3–4 channels incl.
   `#looking-for-thread`); itch page follows later.
4. Local + cloudflared quick-tunnel development remains a first-class,
   documented flow (S6.7).

## Out of scope

Accounts, cloud saves, matchmaking, spectating, Steam packaging, mobile
layout work, analytics dashboards (the aggregation script is the
dashboard), localization, and anything the `nt-slice` branch owns.
