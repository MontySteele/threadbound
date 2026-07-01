// The Loom's Eye (S6.7) — the Act 3 shrine phase screen, per the nt-slice
// spec. Renders state.truth.shrine ONLY — the server-pushed projection
// (§11 extension); the client never computes a verdict or a strike-out.
// Stake revealed before commitment (ruling 1); ONE shared sheet either
// player edits (ruling 3); struck answers carry their pooled source
// (ruling 6); the verdict is stated completely before the boss unlocks.

import React, { useEffect, useRef } from 'react';
import { ANSWERS_BY_ID, EVENTS, QUESTIONS, RELICS_BY_ID, PlayerId, answersFor } from '@threadbound/engine';
import { ClientState, Net } from './net';
import { recordCodex } from './profile';
import { CHAR_NAME } from './App';

const SEAT: Record<PlayerId, string> = { p1: 'var(--p1)', p2: 'var(--p2)' };

export function LoomEye({ state, net }: { state: ClientState; net: Net }): JSX.Element | null {
  const shrine = state.truth?.shrine;
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';

  // seat → short display name; in solo the bot seat speaks as the Witness
  const seatName = (pid: PlayerId): string =>
    pid === state.botSeat ? 'the Witness' : CHAR_NAME[state.players[pid].character].split(',')[0];

  // S6.8 codex write — exactly once, when the verdict first appears on this
  // screen. truths = asserted ids proven true; eliminations = proven false
  // (engaged-but-wrong still advances the meta, ruling 4).
  const codexWritten = useRef(false);
  useEffect(() => {
    if (!shrine?.verdict || codexWritten.current) return;
    codexWritten.current = true;
    const truths: string[] = [];
    const eliminations: string[] = [];
    for (const q of QUESTIONS) {
      const asserted = shrine.sheet[q.id];
      if (!asserted) continue;
      if (shrine.verdict[q.id] === 'true') truths.push(asserted);
      else if (shrine.verdict[q.id] === 'false') eliminations.push(asserted);
    }
    recordCodex(truths, eliminations);
  }, [shrine?.verdict]);

  if (!shrine) return null; // no shrine projection — nothing to render

  const relic = shrine.stakeRelicId ? RELICS_BY_ID[shrine.stakeRelicId] : null;
  const sealed = shrine.verdict !== null;
  const myConfirmed = shrine.confirmed[you];
  const editable = !sealed && !myConfirmed;
  const anyAsserted = QUESTIONS.some((q) => shrine.sheet[q.id] !== null);

  return (
    <div className="center loom">
      <h2>The Loom&rsquo;s Eye</h2>

      {/* stake panel — revealed BEFORE commitment (ruling 1) */}
      <div className={`loom-stake ${sealed && shrine.stakeLost ? 'loom-stake-lost' : ''}`}>
        <div className="loom-stake-label">The shrine covets:</div>
        {relic ? (
          <>
            <div className="loom-stake-name" data-inspect={`relic:${relic.id}`}>
              {relic.name}
              <span className={`loom-rarity ${relic.rare ? 'loom-rarity-rare' : ''}`}>{relic.rare ? 'Rare' : 'Common'}</span>
            </div>
            <div className="loom-stake-text">{relic.text}</div>
            {sealed && (
              <div className="loom-stake-fate">
                {shrine.stakeLost ? 'The stake unravels. The shrine keeps what was coveted.' : 'The stake holds. It is yours.'}
              </div>
            )}
          </>
        ) : (
          // degenerate every-relic-owned case: nothing left to covet
          <div className="loom-stake-name">…nothing. Every relic here is already claimed.</div>
        )}
      </div>

      {sealed ? (
        <>
          {/* the verdict, stated completely before the boss unlocks */}
          <div className="loom-verdict">
            {QUESTIONS.map((q) => {
              const asserted = shrine.sheet[q.id];
              const v = shrine.verdict![q.id];
              return (
                <div key={q.id} className={`loom-verdict-row loom-verdict-${v}`}>
                  <div className="loom-question">{q.text}</div>
                  <div className="loom-verdict-answer">
                    {asserted ? `“${ANSWERS_BY_ID[asserted]?.text}”` : 'left unspoken'}
                  </div>
                  <div className="loom-verdict-mark">
                    {v === 'true' ? 'TRUE' : v === 'false' ? 'FALSE' : '—'}
                  </div>
                </div>
              );
            })}
          </div>
          <button className="big" data-gp="META" disabled={state.advanceReady[you]}
            onClick={() => net.act({ type: 'ADVANCE' } as any)}>
            {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
          </button>
        </>
      ) : (
        <>
          <p className="muted">
            One sheet between you — either of you may fill it (talk first).
            Silence is free; a false naming costs the stake.
          </p>

          {/* the shared sheet (ruling 3) */}
          <div className="loom-sheet">
            {QUESTIONS.map((q) => (
              <div key={q.id} className="loom-row">
                <div className="loom-question">{q.text}</div>
                <div className="loom-chips">
                  {answersFor(q.id).map((a) => {
                    const sources = shrine.struck[q.id]?.[a.id];
                    const asserted = shrine.sheet[q.id] === a.id;
                    if (sources) {
                      // struck by pooled evidence — source noted (ruling 6)
                      return (
                        <span key={a.id} className="loom-chip loom-struck">
                          <s>{a.text}</s>
                          <span className="loom-struck-src">
                            {' '}struck — {sources.map((s) => `${EVENTS[s.eventId]?.name ?? s.eventId} (${seatName(s.holder)})`).join(', ')}
                          </span>
                        </span>
                      );
                    }
                    return (
                      <button key={a.id} data-gp="META"
                        className={`loom-chip ${asserted ? 'loom-asserted' : ''}`}
                        disabled={!editable}
                        onClick={() => editable && !asserted &&
                          net.act({ type: 'LOOM_SHEET_SET', questionId: q.id, answerId: a.id } as any)}>
                        {a.text}
                      </button>
                    );
                  })}
                  <button data-gp="META"
                    className={`loom-chip loom-unspoken ${shrine.sheet[q.id] === null ? 'loom-asserted' : ''}`}
                    disabled={!editable}
                    onClick={() => editable && shrine.sheet[q.id] !== null &&
                      net.act({ type: 'LOOM_SHEET_SET', questionId: q.id, answerId: null } as any)}>
                    Leave unspoken
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* both-confirm footer — the same filled state, or nothing */}
          <div className="loom-confirm">
            {([you, partner] as PlayerId[]).map((pid) => (
              <span key={pid} className="loom-confirm-seat" style={{ color: SEAT[pid] }}>
                {pid === you ? 'You' : seatName(pid)}:{' '}
                <b>{shrine.confirmed[pid] ? 'confirmed' : 'weighing it…'}</b>
              </span>
            ))}
          </div>
          {myConfirmed ? (
            <>
              <p className="muted">You have confirmed this sheet — Reconsider to edit it again.</p>
              <button className="big" data-gp="META"
                onClick={() => net.act({ type: 'LOOM_CONFIRM', confirm: false } as any)}>
                Reconsider
              </button>
            </>
          ) : (
            <button className="big" data-gp="META"
              onClick={() => net.act({ type: 'LOOM_CONFIRM', confirm: true } as any)}>
              {anyAsserted ? 'Speak the name' : 'Pass in silence'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
