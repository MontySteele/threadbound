// Contextual first-time hints (M3 downtime list, priority 2): one-time
// popovers for what the tutorial can't catch in the moment. One line each,
// shown once per browser, dismissed on any input.

import React, { useEffect, useRef, useState } from 'react';
import { computeLinksFired } from '@threadbound/engine';
import { ClientState } from './net';

interface Hint {
  id: string;
  when: (s: ClientState, prev: ClientState | null) => boolean;
  text: (s: ClientState) => string;
}

const HINTS: Hint[] = [
  {
    id: 'first_link_prelight',
    when: (s) => {
      if (s.phase !== 'combat' || !s.combat) return false;
      try { return computeLinksFired(s, s.combat.chain).some(Boolean); } catch { return false; }
    },
    text: (s) => {
      const partner = s.you === 'p1' ? 'p2' : 'p1';
      return `That lit arc means the link will FIRE — the card reads the one before it, ${s.players[partner].character}’s included. Order is everything.`;
    },
  },
  {
    id: 'first_fray',
    when: (s) => s.log.some((e) => e.e === 'fray'),
    text: () => 'You overdrew the Thread — that’s a FRAY: you BOTH take +25% damage this turn. Steady (1 Thread) soothes or shields it.',
  },
  {
    id: 'first_covet_charge',
    when: (s, prev) =>
      !!prev && (['p1', 'p2'] as const).some((p) => s.players[p].covetCharges > prev.players[p].covetCharges),
    text: () => 'You gained a COVET charge. At rewards, after your partner picks, spend it to take a card they passed over.',
  },
  {
    id: 'first_fallen',
    when: (s) => s.players.p1.fallen || s.players.p2.fallen,
    text: (s) => {
      const down = s.players.p1.fallen ? 'p1' : 'p2';
      return `${s.players[down].character} has FALLEN — not dead. Enemies rebind to the survivor and the Thread goes slack. Win the fight and they rise at 1 HP.`;
    },
  },
  {
    id: 'first_severed',
    when: (s) => (s.combat?.severedTurns ?? 0) > 0,
    text: () => 'The Thread is SEVERED: no Thread actions, and links no longer cross between you. Your engines must briefly stand alone. It comes back.',
  },
  {
    id: 'first_echo',
    when: (s) => s.players[s.you].combatCards.some((c) => c.echo),
    text: () => 'That dashed card is an ECHO — a mutated copy of your partner’s card. It’s yours for this combat, then it fades.',
  },
];

const KEY = 'tb_hints_seen';

export function Hints({ state }: { state: ClientState }): JSX.Element | null {
  const [active, setActive] = useState<Hint | null>(null);
  const prevRef = useRef<ClientState | null>(null);
  const seen = useRef<Set<string>>(new Set(JSON.parse(localStorage.getItem(KEY) ?? '[]')));

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = state;
    if (active) return;
    for (const hint of HINTS) {
      if (seen.current.has(hint.id)) continue;
      if (hint.when(state, prev)) {
        seen.current.add(hint.id);
        localStorage.setItem(KEY, JSON.stringify([...seen.current]));
        setActive(hint);
        return;
      }
    }
  }, [state, active]);

  useEffect(() => {
    if (!active) return;
    // dismiss on any input, after a grace period so the triggering click doesn't eat it
    const dismiss = () => setActive(null);
    const t = setTimeout(() => {
      window.addEventListener('pointerdown', dismiss, { once: true });
      window.addEventListener('keydown', dismiss, { once: true });
      window.addEventListener('gp-input', dismiss, { once: true }); // pad buttons (B1)
    }, 600);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('gp-input', dismiss);
    };
  }, [active]);

  if (!active) return null;
  return (
    <div className="hint-pop">
      <span className="hint-pop-tag">✦</span> {active.text(state)}
      <span className="muted"> — any input dismisses</span>
    </div>
  );
}
