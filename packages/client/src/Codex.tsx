// S9a — the Codex, promoted from title-screen stub to a minimal real screen
// (the vibe-check surface). Entries grouped by question; truths and
// eliminations distinguished; per-question "N of M answers proven" counters;
// undiscovered entries are unlabeled slots — count visible, content hidden,
// so the gestation looks like something filling. No art, no unlock rewards,
// no completion state (explicitly deferred). Reachable from the title screen
// AND the run's pause surface (the ♪ settings pop).
//
// Client-safe by construction: renders only the public ontology
// (questions/answers) plus this browser's profile codex ids.

import React, { useState } from 'react';
import { ANSWERS, QUESTIONS } from '@threadbound/engine';
import { loadProfile } from './profile';

export function CodexScreen({ onClose }: { onClose: () => void }): JSX.Element {
  const p = loadProfile();
  const truths = new Set(p.codex.truths);
  const elims = new Set(p.codex.eliminations);
  const known = new Set([...p.codex.truths, ...p.codex.eliminations]).size;
  return (
    <div className="deck-overlay codex-overlay" onClick={onClose}>
      <div className="deck-panel codex-panel" onClick={(e) => e.stopPropagation()}>
        <div className="deck-head">
          <h2>The Codex</h2>
          <button className="chip" data-gp="META" data-gp-action="cancel" onClick={onClose}>close ✕</button>
        </div>
        <p className="muted">
          {known === 0
            ? 'Nothing is proven yet. The Undercroft keeps its answers until a Loom’s Eye verdict.'
            : `${known} of ${ANSWERS.length} answers proven, across every descent from this frame.`}
        </p>
        {QUESTIONS.map((q) => {
          const answers = ANSWERS.filter((a) => a.questionId === q.id);
          const proven = answers.filter((a) => truths.has(a.id) || elims.has(a.id)).length;
          return (
            <div key={q.id} className="codex-group">
              <h4>
                {q.text}
                <span className="muted codex-count">{proven} of {answers.length} answers proven</span>
              </h4>
              {answers.map((a) =>
                truths.has(a.id) ? (
                  <div key={a.id} className="codex-entry codex-truth">✦ {a.codexTruthEntry}</div>
                ) : elims.has(a.id) ? (
                  // S14.3 (B18): per-descent phrasing — truths vary run to
                  // run, so a later descent could prove a "never" true
                  <div key={a.id} className="codex-entry codex-elim">✕ Not that descent: <s>{a.text}</s></div>
                ) : (
                  // an unproven answer: the slot is visible, the content is not
                  <div key={a.id} className="codex-entry codex-slot">▢ ·····</div>
                ),
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The entry point both surfaces share: a chip with the fill count, opening
 *  the screen. Self-contained state so Home and Settings stay untouched
 *  beyond one line each. */
export function CodexButton(): JSX.Element {
  const [open, setOpen] = useState(false);
  const p = loadProfile();
  const known = new Set([...p.codex.truths, ...p.codex.eliminations]).size;
  return (
    <>
      <button className="chip" data-gp="META" onClick={() => setOpen(true)}>
        codex — {known}/{ANSWERS.length}
      </button>
      {open && <CodexScreen onClose={() => setOpen(false)} />}
    </>
  );
}
