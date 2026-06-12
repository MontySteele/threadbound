// End-of-run summary (M3 downtime list, priority 1): the "stories" payoff
// crystallized, capped with a Witness epitaph. Doubles as playtest data —
// screenshot this and send it back.

import React from 'react';
import { GameEvent, PlayerId } from '@threadbound/engine';
import { ClientState } from './net';

const ACT_NAME: Record<number, string> = { 1: 'the Undercroft', 2: 'the Hollow Choir', 3: 'the Last Braid' };

export function RunSummary({ state, won }: { state: ClientState; won: boolean }): JSX.Element {
  const t = state.telemetry;
  const linkRate = t.cardsPlayed ? Math.round((100 * t.linksFired) / t.cardsPlayed) : 0;
  const epitaph = [...state.log].reverse().find((e: GameEvent) => e.e === 'witness');
  const name = (p: PlayerId) => state.players[p].character;
  const totalDamage = Object.values(t.damageByTag).reduce((a, b) => a + b, 0);

  const rows: Array<[string, string]> = [
    ['Reached', `act ${state.map.act} — ${ACT_NAME[state.map.act]}`],
    ['Turns woven', `${t.turns}`],
    ['Cards played', `${t.cardsPlayed} (${name('p1')} & ${name('p2')})`],
    ['Links fired', `${t.linksFired} — ${linkRate}% of cards`],
    ['Resonance ignitions', `${t.resonances}`],
    ['Damage dealt', `${totalDamage} (${name('p1')} ${t.damageByPlayer.p1} · ${name('p2')} ${t.damageByPlayer.p2})`],
    ['By tag', Object.entries(t.damageByTag).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · ')],
    ['Hexes detonated', `${t.detonatedStacks} stacks${t.detonationEvents ? ` · avg ${(t.detonatedStacks / t.detonationEvents).toFixed(1)}/burst` : ''}`],
    ['Biggest single turn', t.biggestTurn.damage > 0 ? `${t.biggestTurn.damage} damage (turn ${t.biggestTurn.turn}, act ${t.biggestTurn.act})` : '—'],
    ['Covets spent', `${t.covetsSpent.p1 + t.covetsSpent.p2} (${name('p1')} ${t.covetsSpent.p1} · ${name('p2')} ${t.covetsSpent.p2})`],
    ['Seed', `${state.seed}`],
  ];

  return (
    <div className="summary">
      <div className="summary-verdict">{won ? 'THE BRAID HELD' : 'THE THREAD WENT SLACK'}</div>
      <table className="summary-table">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}><td className="muted">{k}</td><td>{v}</td></tr>
          ))}
        </tbody>
      </table>
      {epitaph && epitaph.e === 'witness' && (
        <p className="witness summary-epitaph">THE WITNESS: “{epitaph.line}”</p>
      )}
    </div>
  );
}
