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

- Dockerfile for the server (serves client dist + websockets). Target:
  designer's choice of Fly.io / Railway / Render — all handle websockets
  and a persistent volume; the doc assumes "a small always-on node box
  with a volume at /data". Domain + TLS via the platform.
- Telemetry/feedback write to the volume (`/data/telemetry`,
  `/data/feedback`), JSONL, log-rotated by date. A pull script
  (`scripts/pull-telemetry.sh`, rsync or platform CLI) brings files local
  for analysis.
- Server hardening, minimum viable: cap concurrent rooms (env,
  default 200), rate-limit room creation per IP, idle-room reaping
  (verify the existing lifecycle cleanup fires under hosted conditions),
  bound in-memory state, restart-on-crash via the platform.
- Deploys kill in-memory rooms (reconnect tokens don't survive a process
  swap). Add a **drain flag**: `TB_DRAIN=1` stops NEW room creation and
  shows "the loom is being restrung — back in a few minutes" on the title
  screen; deploy when active rooms hit zero or after a posted window.
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
- **Both-consent rule (proposed):** a run's telemetry file is written
  only if BOTH seats opted in (solo: the one human). Conservative,
  simple, and avoids "my partner's file contains my run." Designer
  yes/no.
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
- Title screen footer: version stamp + links (data note; a community
  link — itch page or Discord, designer's choice — as an external URL).

## S6.6 Distribution surface

The server is authoritative (§11), so the game can't be a static itch
embed. The itch.io page is the storefront/landing: description, GIFs,
and a prominent "Play in browser" link to the hosted domain. Title
screen gains a first-visit blurb: how rooms work, "play solo with the
Witness," and where to leave feedback. No accounts, no email capture.

## S6.7 Sign-off gates

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

## Designer decisions needed

1. Hosting platform (Fly / Railway / Render / other) + domain name.
2. Both-consent rule: ratify or per-seat alternative.
3. Community link target for the footer (itch page vs Discord vs none
   for now).

## Out of scope

Accounts, cloud saves, matchmaking, spectating, Steam packaging, mobile
layout work, analytics dashboards (the aggregation script is the
dashboard), localization, and anything the `nt-slice` branch owns.
