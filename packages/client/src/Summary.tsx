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
  ];

  // S3.1/§14.12 thread economy — make the shared pool's story visible
  const combats = Object.values(t.actStats ?? {}).reduce((a, s) => a + s.combats, 0);
  const mix = Object.entries(t.threadSpendByKind ?? {}).filter(([, n]) => n > 0).map(([k, n]) => `${k} ${n}`).join(' · ');
  rows.push(['Thread spent', t.threadSpent
    ? `${t.threadSpent}${combats ? ` (${(t.threadSpent / combats).toFixed(1)}/combat)` : ''}${mix ? ` — ${mix}` : ''}`
    : '0']);
  if ((t.regenWastedAtCap ?? 0) > 0) rows.push(['Thread regen wasted at cap', `${t.regenWastedAtCap}`]);
  if ((t.forcedLinkFires ?? 0) > 0) {
    rows.push(['Links forced (Pulse)', `${t.forcedLinkFires}${t.resonancesForced ? ` · ${t.resonancesForced} Resonance${t.resonancesForced > 1 ? 's' : ''} needed one` : ''}`]);
  }
  if ((t.wornKnife?.plays ?? 0) > 0) {
    rows.push(['Worn Knife', `${t.wornKnife.plays} plays · mean ${(t.wornKnife.damage / t.wornKnife.plays).toFixed(1)} damage`]);
  }

  // S4.1 gold economy — the purse's story, end to end
  const earnedEntries = Object.entries(t.goldEarnedBySource ?? {}).filter(([, g]) => g > 0);
  const earned = earnedEntries.reduce((a, [, g]) => a + g, 0);
  if (earned > 0) {
    rows.push(['Gold earned', `${earned} (${earnedEntries.map(([k, g]) => `${k} ${g}`).join(' · ')})`]);
  }
  const spentBy = t.goldSpentByCategory ?? { p1: { cards: 0, relics: 0, removals: 0 }, p2: { cards: 0, relics: 0, removals: 0 } };
  const spentTotal = (['p1', 'p2'] as PlayerId[]).reduce((a, p) => a + spentBy[p].cards + spentBy[p].relics + spentBy[p].removals, 0);
  if (spentTotal > 0) {
    const catTotals = (['cards', 'relics', 'removals'] as const)
      .map((c) => [c, spentBy.p1[c] + spentBy.p2[c]] as const)
      .filter(([, v]) => v > 0);
    rows.push(['Gold spent', `${spentTotal} (${catTotals.map(([c, v]) => `${c} ${v}`).join(' · ')})`]);
  }
  const removals = (t.removalsByPlayer?.p1 ?? 0) + (t.removalsByPlayer?.p2 ?? 0);
  if (removals > 0) {
    rows.push(['Cards removed', `${removals} (${name('p1')} ${t.removalsByPlayer.p1} · ${name('p2')} ${t.removalsByPlayer.p2})`]);
  }
  rows.push(['Gold left in the purse', `${t.goldResidual ?? state.gold}`]);
  if ((t.ringDiscountsFired ?? 0) > 0) {
    rows.push(['Ring discounts', `${t.ringDiscountsFired} Pulses at 1 Thread`]);
  }
  if ((state.ascension ?? 0) > 0) rows.push(['Ascension', `A${state.ascension}`]);
  rows.push(['Seed', `${state.seed}`]);

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
