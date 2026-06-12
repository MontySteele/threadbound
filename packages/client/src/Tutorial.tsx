// M3-D — the First-Chain tutorial (~90s): a guided overlay through the first
// combat of a player's first run on this browser. Steps advance by watching
// real state; skippable; never shown again once finished or skipped.
// (Deviation from "scripted single combat" logged in OPEN-QUESTIONS: the guide
// rides the run's real first combat instead of a separate scripted one.)

import React, { useEffect, useRef, useState } from 'react';
import { ClientState } from './net';

const DONE_KEY = 'tb_tutorial_done';

interface Step {
  id: string;
  text: string;
  done: (s: ClientState) => boolean;
}

const STEPS: Step[] = [
  {
    id: 'stage',
    text: 'This is the Chain — the sentence you write together. Click a card in your HAND to stage it. (Cards with a target want an enemy clicked next.)',
    done: (s) => !!s.combat && s.combat.chain.some((c) => c.owner === s.you),
  },
  {
    id: 'links',
    text: 'See the arc between staged cards? A Link fires when the card BEFORE it matches its named tag — yours or your partner’s. Lit arc = it will fire.',
    done: (s) => !!s.combat && s.combat.chain.length >= 2,
  },
  {
    id: 'reorder',
    text: 'Order is everything. Use ◀ ▶ on your own staged cards (or L2/R2 on a pad) to weave links. Three fired links with both of you in the streak = RESONANCE: +50% on the finisher.',
    done: (s) => !!s.combat && s.combat.chain.filter((c) => c.owner === s.you).length >= 2,
  },
  {
    id: 'ready',
    text: 'When the sentence reads well, hit READY. The turn commits when you both are; the Chain resolves left to right, then enemies act.',
    done: (s) => !!s.combat && s.players[s.you].ready,
  },
  {
    id: 'thread',
    text: 'The cord between your portraits is the THREAD — a shared pool. Try a Pulse (2 Thread): pick a staged card with a dead Link and force it to fire — it even counts toward Resonance. Overdraft and you BOTH fray.',
    done: (s) => !!s.combat && s.combat.threadActions.length > 0,
  },
];

export function Tutorial({ state }: { state: ClientState }): JSX.Element | null {
  const [stepIdx, setStepIdx] = useState(0);
  const [active, setActive] = useState(() => !localStorage.getItem(DONE_KEY));
  // the thread step is the only one a player can decline (no Thread action
  // wanted, or none possible while severed/slack) — record the turn it
  // appeared and let it pass once a turn resolves without one
  const threadTurn = useRef<number | null>(null);

  useEffect(() => {
    if (!active || state.phase !== 'combat') {
      threadTurn.current = null;
      return;
    }
    const step = STEPS[stepIdx];
    if (step?.id === 'thread' && threadTurn.current === null) threadTurn.current = state.combat!.turn;
    const declined =
      step?.id === 'thread' && threadTurn.current !== null && state.combat!.turn !== threadTurn.current;
    if (step && (step.done(state) || declined)) {
      if (stepIdx + 1 >= STEPS.length) {
        localStorage.setItem(DONE_KEY, '1');
        setActive(false);
      } else {
        setStepIdx(stepIdx + 1);
      }
    }
  }, [state, active, stepIdx]);

  if (!active || state.phase !== 'combat') return null;
  // the thread step can't complete while severed/slack — let it pass
  const step = STEPS[stepIdx];
  if (!step) return null;
  return (
    <div className="tutorial">
      <div className="tutorial-step">FIRST CHAIN · {stepIdx + 1}/{STEPS.length}</div>
      <div>{step.text}</div>
      <button className="chip" data-gp="META" onClick={() => { localStorage.setItem(DONE_KEY, '1'); setActive(false); }}>
        skip tutorial
      </button>
    </div>
  );
}
