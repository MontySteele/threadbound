// Deck overview (player request + Covenant 5: "deck summaries show tag
// frequencies at a glance"). In combat, your draw pile's CONTENTS are shown
// (derivable: deck minus every visible zone) — its order stays unknown.
// Opens via the Deck button, the pad's Create/touchpad button, or `d`.

import React from 'react';
import { CARDS, BroadTag, CardInstance, PlayerId } from '@threadbound/engine';
import { ClientState } from './net';
import { Card } from './App';

const TAGS: BroadTag[] = ['Strike', 'Guard', 'Hex', 'Surge', 'Rite'];

function tagSummary(deck: CardInstance[]): string {
  const counts: Record<string, number> = {};
  for (const c of deck) {
    const tag = CARDS[c.defId]?.tag ?? '?';
    counts[tag] = (counts[tag] ?? 0) + 1;
  }
  return TAGS.filter((t) => counts[t])
    .sort((a, b) => counts[b] - counts[a])
    .map((t) => `${t} ${counts[t]}`)
    .join(' · ');
}

function sortByName(ids: CardInstance[]): CardInstance[] {
  return [...ids].sort((a, b) => (CARDS[a.defId]?.name ?? '').localeCompare(CARDS[b.defId]?.name ?? ''));
}

function CardRow({ state, owner, cards, empty }: {
  state: ClientState; owner: PlayerId; cards: CardInstance[]; empty: string;
}): JSX.Element {
  if (cards.length === 0) return <i className="muted">{empty}</i>;
  return (
    <div className="hand deck-row">
      {sortByName(cards).map((c) => (
        <Card key={c.instanceId} small echo={c.echo} upgraded={c.upgraded} mutated={c.mutated}
          def={(() => {
            const d = CARDS[c.defId];
            return c.upgraded && d.upgrade
              ? { ...d, name: `${d.name}+`, text: d.upgrade.text ?? d.text, cost: d.upgrade.cost ?? d.cost, link: d.upgrade.link !== undefined ? d.upgrade.link : d.link }
              : d;
          })()}
          inspect={c.upgraded ? `card:${c.defId}:upgraded` : `card:${c.defId}`} />
      ))}
    </div>
  );
}

export function DeckOverlay({ state, onClose }: { state: ClientState; onClose: () => void }): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const me = state.players[you];
  const combat = state.combat;

  const byId = (pid: PlayerId) => {
    const p = state.players[pid];
    const all = new Map<string, CardInstance>();
    for (const c of [...p.deck, ...p.combatCards]) all.set(c.instanceId, c);
    return all;
  };
  const mine = byId(you);
  const lookup = (ids: string[]) => ids.map((id) => mine.get(id)).filter((c): c is CardInstance => !!c);

  // draw-pile contents = everything of mine not visible in another zone
  const stagedMine = combat?.chain.filter((s) => s.owner === you).map((s) => s.cardInstanceId) ?? [];
  const elsewhere = new Set([...me.hand, ...me.discard, ...me.exhaust, ...stagedMine]);
  const drawContents = combat ? [...mine.values()].filter((c) => !elsewhere.has(c.instanceId)) : [];

  return (
    <div className="deck-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="deck-panel">
        <div className="deck-head">
          <h3>Decks</h3>
          <button className="chip" data-gp="META" data-gp-action="cancel" onClick={onClose}>close ✕</button>
        </div>

        <h4>
          You — {me.deck.length} cards <span className="muted">({tagSummary(me.deck)})</span>
        </h4>
        {combat ? (
          <>
            <div className="deck-section">Draw pile · {drawContents.length} <span className="muted">(contents known, order hidden)</span></div>
            <CardRow state={state} owner={you} cards={drawContents} empty="empty" />
            <div className="deck-section">Discard · {me.discard.length}</div>
            <CardRow state={state} owner={you} cards={lookup(me.discard)} empty="empty" />
            <div className="deck-section">Exhausted · {me.exhaust.length}</div>
            <CardRow state={state} owner={you} cards={lookup(me.exhaust)} empty="nothing exhausted" />
          </>
        ) : (
          <CardRow state={state} owner={you} cards={me.deck} empty="empty" />
        )}

        <h4>
          {state.players[partner].character} — {state.players[partner].deck.length} cards{' '}
          <span className="muted">({tagSummary(state.players[partner].deck)})</span>
        </h4>
        <CardRow state={state} owner={partner} cards={state.players[partner].deck} empty="empty" />
      </div>
    </div>
  );
}
