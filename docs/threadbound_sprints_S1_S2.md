# Threadbound — Pre-Playtest Sprints S1 + S2

Two short sprints before the live playtest. Goal of S1: the designer can play full
runs alone, end to end, at testing speed. Goal of S2: visual touchups with zero
mechanical coupling, plus the Witness becoming the solo partner's voice.
Explicitly deferred to post-playtest: the ping/communication system, bot
personality depth, any balance change, and anything from the long-term roadmap.

**Carry-over check (do first if any are unlanded):** seeded bot PRNG, root build
includes client workspace, gate banner reword, feedback hotkey, room-eviction
exemption for in-progress runs.

---

## Sprint S1 — Solo mode (bot partner, basic functionality)

### S1.1 Lobby & room plumbing
- Lobby gains "Descend alone (the Witness will assist)" alongside create/join.
- Creates a room with seat 2 held by a server-side bot attached **in-process**
  to the room (no loopback websocket): the bot consumes the same redacted view
  and submits the same intents as a remote client — protocol parity preserved,
  §11 untouched.
- Human picks both characters at lobby (their own and the bot's).
- Reconnection: bot is part of the room; persists/restores with it. Solo runs
  survive refresh and server restart like any room.

### S1.2 Bot-partner behavior (pacing + minimal collaboration)
- Reuse the existing coordination policy (weave/reorder/axis). Changes are
  pacing and protocol-of-politeness only:
  - **Stages early, readies last.** Bot stages its cards promptly so the human
    can plan around them; it never hits Ready until the human has. After the
    human readies, bot does one final re-evaluation pass (may re-order/restage
    in response to the human's final chain) then readies within ~2s.
  - **Bot speed setting:** `paced` (default; small human-ish delays) and
    `instant` (testing). URL param `?botspeed=instant` plus a settings toggle.
- Decision delegation, keep-it-simple rules:
  - Map path: bot always follows the human's node choice (human navigates).
  - Crossed choices: bot chooses for the human using its event policy, biased
    to the lower-variance option. (Witness line lands in S2.)
  - Covet/draft/rest/shop: existing policies as-is. Shared gold: bot may spend,
    but never below a floor of 50% of current gold without the human having
    spent first this shop (crude courtesy rule; refine post-playtest).
  - Wedding Knife: bot never initiates; if the human initiates, bot accepts iff
    its draft score favors the trade, else declines (and the decline is fine —
    that's the mechanic).
- No advice, no chat, no pings in S1. The bot communicates exclusively through
  staged cards, like a quiet partner.

### S1.3 Telemetry & tests
- Solo runs tagged `mode: "solo"` in all telemetry — they must never pollute
  pair-calibration baselines (Part A of M3 remains 2-human data only).
- Feedback hotkey works in solo (this is the designer's act-2 bug-hunting tool).
- Tests: headless full solo run via the public protocol; reconnect-with-bot;
  determinism suite extended to in-process bot transport.

### S1 sign-off
Designer completes one full run (both character pairings, one win or honest
loss) using `?botspeed=instant` without touching a second browser tab.

---

## Sprint S2 — Art touchup + Witness solo voice

### S2.1 Witness as the solo voice
- Two frequency profiles in `witness.ts`:
  - `coop` (current behavior, unchanged sparse cadence), and
  - `solo`: chattier — up to 2–3 lines per combat, plus new categories.
- New solo line categories (write ~6–10 lines each, no-repeat tracking as now):
  - `solo_greeting` (lobby/run start: he resents being drafted into this),
  - `own_play` (low rotation — he comments on cards he plays),
  - `human_linked_off_me` (grudging acknowledgment),
  - `resonance_together` (the closest he comes to enthusiasm),
  - `crossed_choice_made` ("I chose for you. You're welcome."),
  - `covet_solo`, `fallen_human`, `fallen_self`, `revive_either`,
  - `solo_victory` / `solo_defeat` epitaphs (distinct from co-op endings).
- Voice rules: resentful, dry, never cruel about losses, and **never gives
  strategic advice** — backseat driving is the failure mode, and the future
  ping system is the sanctioned channel for that. He plays; he editorializes;
  he does not coach.
- Co-op games: zero new chatter (profile-gated). If anything, audit current
  co-op cadence and trim any line categories that fire too often.

### S2.2 Art touchups (hard rule: nothing that encodes game math)
- **Card frames:** rarity treatments (common/uncommon/rare border + texture),
  upgrade gilding, a visible mutation marker on Echoes/mutated cards.
- **Map screen:** nodes rendered as knots on branching cord paths (continues
  the B3/B4 motif); act-specific backdrop tint; cleared-path dimming.
- **Title/lobby:** cord motif treatment, two portrait frames that fill as
  players join (Witness occupies seat 2 in solo), favicon + page title pass.
  (Skip if already landed from the punch list.)
- **Boss presence:** act bosses and the Unraveled get larger composite sigils;
  the Unraveled's sigil visibly frays and parts during its sever phase.
- **Backgrounds:** per-act CSS-only atmosphere (gradient, parchment grain,
  vignette). No images that would fight a future commissioned art pass.
- **Status iconography:** one consistent glyph set for all keywords (feeds the
  existing tooltip registry; same glyphs on cards, intents, and status bars).
- **Victory/defeat screens:** styled, with the end-of-run summary (if the
  punch-list summary screen landed) and the Witness epitaph as the closer.

### S2 sign-off
- Style screen (`/?style`) updated with the new frames/glyphs for designer veto.
- One solo run and one 2-tab co-op run visually spot-checked: no layout
  regressions, co-op Witness cadence unchanged.

---

## Out of scope for both sprints (deliberate)
Ping/communication wheel; bot difficulty options or personality settings;
any balance lever (even "while we're in there"); Chorus/3–4p; ascension;
illustrated art or generated images; music beyond existing procedural audio;
Steam/itch packaging. The playtest is still the milestone these sprints serve.
