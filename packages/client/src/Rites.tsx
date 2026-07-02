// The Rites (S7.2/S7.4/S7.3 — docs/threadbound_sprint_S7.md, superseded in
// part by S8.0/S8.1): death rites are CARDS donned at run start, birth rites
// are passives earned at the 2nd character event. This module renders the
// client half; the engine owns every rule (§11). Held-reveal discipline
// throughout: names, flavor, text — no explanation copy.

import React from 'react';
import { CARDS, RITES_BY_ID, PlayerId, RiteDef } from '@threadbound/engine';
import { ClientState, Net } from './net';
import { Card, Log } from './App';
import { CHAR_NAME } from './chars';

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
              const card = rite?.cardId ? CARDS[rite.cardId] : undefined;
              if (!rite || !card) return null;
              return (
                <div key={id} className="panel rite-option">
                  <h3>{rite.name}</h3>
                  <p className="muted rite-flavor">{rite.flavor}</p>
                  <div className="rite-card">
                    <Card def={card} />
                  </div>
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
            You wear <b>{mine.name}</b>.
          </p>
          <p className="muted rite-flavor">{mine.flavor}</p>
          {mine.cardId && CARDS[mine.cardId] && (
            <div className="rite-card rite-worn">
              <Card def={CARDS[mine.cardId]} small />
            </div>
          )}
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
