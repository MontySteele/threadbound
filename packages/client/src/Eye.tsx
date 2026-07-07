// S22.1 (D1b, RULED with amendment) — the interposed Eye scene: the fifth
// question. NOT a node and not routable around: the first time the pair
// stands on a map screen with a complete codex, the descent halts and the
// Loom's Eye manifests where they are — the Machine reaching out now that
// it can finally describe itself. The deduction machinery inverted: no
// shrine, no stake, no verdict — the pair DECLARES, together (both seats
// must pick the same answer; the map's own convention).
//
// VOICE (Part 6 constraint): the scene and question are MACHINE text, not
// Witness voice. The Witness's one recognition line is its own register-
// gated row — reserved pool 'eye_manifest', ships EMPTY until signed.
// ALL SCENE PROSE PROVISIONAL — S22 Part 6 "fifth question" row; the
// question wording itself is D1b's ruling, verbatim.

import React, { useEffect, useState } from 'react';
import { FIFTH_ANSWERS, FIFTH_QUESTION, PlayerId } from '@threadbound/engine';
import { ClientState, Net } from './net';
import { CHAR_NAME } from './chars';

// the three beats (halt · the Eye opens · the asking), client-paced; any
// input reveals everything (the scene is unmissable, not unskippable-slow)
const BEATS: string[] = [
  'The descent halts. The falling dust hangs where it is. Below you, above you, the whole stair holds still, the way a throat holds still before it speaks.',
  'The Eye opens — not the shrine this time, not a keyhole at the third act’s edge. The thing the shrine was a keyhole INTO stands in the way where the way was, and it is looking at the two of you.',
  'The book on your side of the thread is full. Everything down here has a name in it now, true ground and lesion’s edge alike — everything but the pair holding the pen. It asks:',
];

const BEAT_MS = 2400;

export function EyeScene({ state, net }: { state: ClientState; net: Net }): JSX.Element | null {
  const eye = state.eye;
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    if (beat >= BEATS.length) return;
    const t = setTimeout(() => setBeat((b) => b + 1), BEAT_MS);
    return () => clearTimeout(t);
  }, [beat]);

  if (!eye) return null;

  const revealed = beat >= BEATS.length;
  const yourPick = eye.picks[you];
  const partnerPick = eye.picks[partner];
  const partnerName = partner === state.botSeat
    ? 'the Witness'
    : CHAR_NAME[state.players[partner].character].split(',')[0];

  return (
    <div className="center eye-scene" onClick={() => setBeat(BEATS.length)}>
      {BEATS.slice(0, Math.max(beat, 1)).map((b, i) => (
        <p key={i} className="eye-beat">{b}</p>
      ))}
      {revealed && (
        <>
          <h2 className="eye-question">{FIFTH_QUESTION.text}</h2>
          <div className="eye-answers">
            {FIFTH_ANSWERS.map((a) => (
              <button
                key={a.id}
                className={`loom-chip eye-chip ${yourPick === a.id ? 'eye-picked' : ''} ${partnerPick === a.id ? 'eye-partner-picked' : ''}`}
                data-gp="META"
                onClick={(e) => { e.stopPropagation(); net.act({ type: 'EYE_DECLARE', answerId: a.id }); }}
              >
                {a.text}
              </button>
            ))}
          </div>
          {/* both-seats-agree UX copy — Part 6 fifth-question row, PROVISIONAL */}
          <p className="muted">
            {state.botSeat
              ? 'The Witness will answer with your voice. Whatever you say, you say together.'
              : 'Both of you must give the same answer. It will be written exactly once.'}
          </p>
          {!state.botSeat && (
            <p className="muted">
              You: <b>{yourPick ? 'answered' : 'undecided'}</b>
              {' · '}{partnerName}: <b>{partnerPick ? 'answered' : 'undecided'}</b>
            </p>
          )}
        </>
      )}
    </div>
  );
}
