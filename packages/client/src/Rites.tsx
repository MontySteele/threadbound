// The Rites (S7.2/S7.4/S7.3 — docs/threadbound_sprint_S7.md, superseded in
// part by S8.0/S8.1): death rites are CARDS donned at run start, birth rites
// are passives earned at the 2nd character event. This module renders the
// client half; the engine owns every rule (§11). Held-reveal discipline
// throughout: names, flavor, text — no explanation copy.

import React from 'react';
import { CARDS, GrowthAxis, RITES_BY_ID, PlayerId, RiteDef, applyGrowth, effectiveDef, tallyAxisValue, unlockedRites } from '@threadbound/engine';
import { ClientState, Net } from './net';
import { Card, Log } from './App';
import { CHAR_NAME } from './chars';

/** S9d.3: plain-language axis names — visible mechanics, zero narrative
 *  economy. S20.5 keeps them as the tiered rites' rule header. */
const AXIS_PHRASE: Record<GrowthAxis, string> = {
  detonations: 'grows with detonations',
  falls: 'grows each time either of you falls',
  boundKills: 'grows as enemies die Bound to you',
  threadSpent: 'grows as the pair spends Thread',
  kindledConsumed: 'grows with Kindled burned',
  linksFired: 'grows with links fired',
  momentumSpent: 'grows with Momentum spent',
  resonances: 'grows with Resonance ignitions',
};

// ---------------------------------------------------------------------------
// S20.5 (D-b, ruled shape) — every vestry card shows RULE + PROGRESS +
// CEILING; tiered rites get their own phrasing row as a ladder with the
// current tier marked. Strings PROVISIONAL pending the Part 7 sign-off
// (one row per rite, both forms — docs/S20-STATUS.md). Client-side only:
// nothing here reaches battery stdout, so no re-bank is owed (Part 5
// instrument note).
// ---------------------------------------------------------------------------

/** per-N rule strings, one row per linear grower (Part 7 rows St-r1..r6) */
const GROWTH_RULE: Record<string, string> = {
  rite_shroud: '+2 Block each time either of you falls',
  rite_vigil: '+1 Block for each enemy that dies Bound to you',
  rite_knell: '+1 damage per 3 detonations',
  rite_pyre_brand: '+1 damage per 6 Kindled burned',
  rite_mourners_step: '+1 Block per 15 Momentum spent',
  rite_toll: '+1 Momentum per 25 links fired',
};

/** tiered ladders, one phrasing row per rite (Part 7 rows St-r7..r8) */
const TIER_RULES: Record<string, string[]> = {
  rite_votive: [
    '8 Thread spent — Votive also draws 1',
    '20 Thread spent — its link deepens: your partner draws 2',
  ],
  rite_descant: [
    '6 Resonances — its link widens: you and your partner each draw 1',
    '14 Resonances — Descant draws 2',
  ],
};

/** S20.5: the growth line under a rite card — rule, current growth, ceiling.
 *  Reads the run tally (absent at the vestry ≙ 0; live mid-run on the worn
 *  re-read), so the same treatment follows the card everywhere it renders. */
export function RiteGrowth({ state, cardId, holder }: {
  state: ClientState; cardId: string; holder: PlayerId;
}): JSX.Element | null {
  const def = CARDS[cardId];
  const g = def?.growsWith;
  if (!g) return null;
  const v = state.tallies ? tallyAxisValue(state.tallies, g.axis, holder) : 0;
  if (g.tiers) {
    const rules = TIER_RULES[cardId] ?? [];
    const reached = g.tiers.filter((t) => v >= t.at).length;
    return (
      <div className="rite-growth">
        <p className="muted rite-axis">▲ {AXIS_PHRASE[g.axis]} · {v} so far</p>
        <ul className="rite-ladder">
          {g.tiers.map((t, i) => (
            <li key={t.at} className={i < reached ? 'tier-reached' : 'tier-ahead'}>
              <span className="tier-mark">{i < reached ? '✦' : '·'}</span> {rules[i] ?? `at ${t.at}`}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  const bonus = Math.min(g.cap ?? 0, Math.floor(v / (g.per ?? 1)) * (g.amount ?? 0));
  return (
    <p className="muted rite-axis rite-growth">
      ▲ {GROWTH_RULE[cardId] ?? AXIS_PHRASE[g.axis]} · +{bonus} so far · cap +{g.cap}
    </p>
  );
}

/** the card def a rite renders with — grown against the live tally, so a
 *  Shroud at +4 reads "Gain 8 Block" (grown segment marked by the ▲ chip) */
function grownRiteCard(state: ClientState, cardId: string, holder: PlayerId) {
  return applyGrowth(effectiveDef({ instanceId: `vestry_${cardId}`, defId: cardId }), state.tallies, holder);
}

/** The seat's picked death rite, if any (their choice is not secret). */
function deathRiteOf(state: ClientState, pid: PlayerId): RiteDef | undefined {
  return (state.players[pid].rites ?? [])
    .map((id) => RITES_BY_ID[id])
    .find((r) => r?.kind === 'death');
}

/** Short display name for the other seat; the bot seat speaks as the Witness. */
export function seatName(state: ClientState, pid: PlayerId): string {
  return pid === state.botSeat ? 'the Witness' : CHAR_NAME[state.players[pid].character].split(',')[0];
}

/** S7.2 death-rite offer screen (phase 'rites'): 2 seeded vestments of the
 *  role's 4, each shown as its CARD (the vestment IS a card — S8.0 ruling 1)
 *  plus name and flavor. Mandatory pick; the Witness's acknowledgement
 *  arrives via the normal log. */
export function RiteOffer({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const mine = deathRiteOf(state, you);
  const theirs = deathRiteOf(state, partner);
  const offered = state.ritesState?.offer?.[you] ?? [];

  return (
    <div className="center rites">
      <h2>The Vestry</h2>
      {!mine ? (
        <>
          <p className="muted">Two vestments are laid out for you. One must be worn into the dark.</p>
          <div className="rite-row">
            {offered.map((id) => {
              const rite = RITES_BY_ID[id];
              const card = rite?.cardId ? grownRiteCard(state, rite.cardId, you) : undefined;
              if (!rite || !card) return null;
              return (
                <div key={id} className="panel rite-option">
                  <h3>{rite.name}</h3>
                  <p className="muted rite-flavor">{rite.flavor}</p>
                  <div className="rite-cardwrap">
                    <Card def={card} />
                  </div>
                  {/* S9d.3 → S20.5 (D-b): the archetype declaration must be
                      legible at the moment of declaration — RULE + PROGRESS
                      + CEILING, visible mechanics, not narrative economy
                      (held reveal unaffected) */}
                  <RiteGrowth state={state} cardId={rite.cardId!} holder={you} />
                  <button className="big" data-gp="META"
                    onClick={() => net.act({ type: 'RITE_PICK', riteId: rite.id })}>
                    Don the vestment
                  </button>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <p>
            {/* S14.3 (B20): the worn vestment re-reads on demand */}
            You wear <b data-gp="META" data-inspect={`rite:${mine.id}`}>{mine.name}</b>.
          </p>
          <p className="muted rite-flavor">{mine.flavor}</p>
          {mine.cardId && CARDS[mine.cardId] && (
            <div className="rite-cardwrap rite-worn">
              {/* S20.5: the worn re-read shows the GROWN card + the rule */}
              <Card def={grownRiteCard(state, mine.cardId, you)} small />
            </div>
          )}
          {mine.cardId && <RiteGrowth state={state} cardId={mine.cardId} holder={you} />}
          <p className="muted">
            {theirs
              ? <>{seatName(state, partner)} wears <b>{theirs.name}</b>.</>
              : <>{seatName(state, partner)} is still choosing a vestment…</>}
          </p>
        </>
      )}
      <Log log={state.log} state={state} />
    </div>
  );
}

/** S7.3 birth-rite progress pips — a glanceable mark near each player's
 *  panel on flagged runs only (no ritesState → nothing at all; unflagged
 *  runs unchanged). Filled pips for character-event progress, capped at the
 *  threshold of 2; once the seat's birth rite is picked the pips become a
 *  single distinct mark carrying the rite's name on hover. Subtle by design
 *  and unexplained (held-reveal) — the routing decision is the game. */
export function RitePips({ state, pid }: { state: ClientState; pid: PlayerId }): JSX.Element | null {
  const rs = state.ritesState;
  if (!rs) return null;
  const born = (state.players[pid].rites ?? [])
    .map((id) => RITES_BY_ID[id])
    .find((r) => r?.kind === 'birth');
  // S14.3 (B20): the worn mark is inspectable and pad-reachable (RELICS
  // zone, the relic-chip pattern) — recall isn't reveal; the held-reveal
  // ruling covers the unpicked trio only
  if (born) return <span className="rite-pips rite-born" title={born.name} data-gp="RELICS" data-inspect={`rite:${born.id}`}>✳</span>;
  const n = Math.min(rs.progress[pid] ?? 0, 2);
  return (
    <span className="rite-pips" title={`${n}/2`}>
      {Array.from({ length: 2 }, (_, i) => (
        <span key={i} className={`rite-pip ${i < n ? 'lit' : ''}`} />
      ))}
    </span>
  );
}

/** S7.4 birth-rite trio, rendered at the event result panel when this seat
 *  is owed the pick (ritesState.birthChoice === you). Per the held-reveal
 *  ruling: NO explanation copy — the rites present themselves and that's it.
 *  The engine gates ADVANCE until the pick lands, so this stands where the
 *  Onward button would be. */
export function BirthRiteTrio({ state, net }: { state: ClientState; net: Net }): JSX.Element | null {
  const you = state.you;
  if (state.ritesState?.birthChoice !== you) return null;
  // S9a: the trio is the run's UNLOCKED trio (union of both profiles;
  // everything ships unlocked, so this is the read-path, not a gate)
  const trio = unlockedRites(state.players[you].character, 'birth', state.ritesState.unlocks)
    .map((id) => RITES_BY_ID[id]);
  return (
    <div className="rite-row rite-birth">
      {trio.map((rite) => (
        <button key={rite.id} className="panel rite-option rite-birth-option" data-gp="META"
          onClick={() => net.act({ type: 'RITE_PICK', riteId: rite.id })}>
          <h3>{rite.name}</h3>
          <p className="muted rite-flavor">{rite.flavor}</p>
          <p className="rite-text">{rite.text}</p>
        </button>
      ))}
    </div>
  );
}
