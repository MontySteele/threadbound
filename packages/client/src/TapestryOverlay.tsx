// The Tapestry (S6.6) — the in-run evidence board, per the nt-slice spec.
// One column per question (ruling 7: fixed set, stable columns); your own
// fragments render in full, the partner's only as face-down stubs (ruling 5 —
// text and question never cross screens). Solo (ruling 8): the Witness VOICES
// the partner channel — its fragments arrive on YOUR board marked witness and
// pin to the columns in thread-gold; there is no stub strip. Renders
// state.truth ONLY — the server-pushed projection (§11 extension); the client
// infers nothing. Opens via the Tapestry button or `t`.

import React from 'react';
import { EVENTS, QUESTIONS, PlayerId } from '@threadbound/engine';
import { ClientState } from './net';
import { CHAR_NAME } from './App';

const SEAT: Record<PlayerId, string> = { p1: 'var(--p1)', p2: 'var(--p2)' };

function eventTag(eventId: string, act: number): string {
  return `Act ${act} — ${EVENTS[eventId]?.name ?? eventId}`;
}

function byAct<T extends { act: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.act - b.act); // stable: act, then pin order
}

export function TapestryOverlay({ state, onClose }: { state: ClientState; onClose: () => void }): JSX.Element | null {
  const truth = state.truth;
  if (!truth) return null; // unflagged run — the overlay does not exist
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const solo = state.botSeat === partner;
  const partnerName = CHAR_NAME[state.players[partner].character].split(',')[0];
  const stubColor = SEAT[partner];
  const stubLine = `${partnerName} holds a thread — ask them.`;

  return (
    <div className="deck-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="deck-panel tapestry-panel">
        <div className="deck-head">
          <h3>The Tapestry</h3>
          <button className="chip" data-gp="META" data-gp-action="cancel" onClick={onClose}>close ✕</button>
        </div>

        <div className="tapestry-columns">
          {QUESTIONS.map((q) => {
            const pinned = byAct(truth.board.filter((f) => f.questionId === q.id));
            return (
              <div key={q.id} className="tapestry-col">
                <h4>{q.text}</h4>
                {pinned.length === 0 && <i className="muted">No thread yet.</i>}
                {pinned.map((f) => (
                  <div key={f.fragmentId} className="tapestry-card" style={{ borderLeftColor: f.witness ? 'var(--thread-gold)' : SEAT[you] }}>
                    <div className="tapestry-tag">{f.witness ? 'The Witness · ' : ''}{eventTag(f.eventId, f.act)}</div>
                    <div className="tapestry-text">{f.text}</div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* stubs carry event + act only — no question, no text (ruling 5).
            Solo has no strip: the Witness column above IS the partner channel. */}
        {!solo && (
          <>
            <h4>{partnerName}</h4>
            <div className="tapestry-stub-row">
              {truth.partnerStubs.length === 0 && <i className="muted">No thread yet.</i>}
              {byAct(truth.partnerStubs).map((s, i) => (
                <div key={i} className="tapestry-card tapestry-stub" style={{ borderLeftColor: stubColor }}>
                  <div className="tapestry-tag">{eventTag(s.eventId, s.act)}</div>
                  <div className="tapestry-stub-line">{stubLine}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
