// Contextual first-time hints (M3 downtime list, priority 2): one-time
// popovers for what the tutorial can't catch in the moment. One line each,
// shown once per browser, dismissed on any input.

import React, { useEffect, useRef, useState } from 'react';
import { computeLinksFired, effectiveDef, witnessPoolLines } from '@threadbound/engine';
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

// ---------------------------------------------------------------------------
// S19.6 (D6) — the Witness teaches. Once-per-RUN, act-1-only, state-triggered
// hint lines in the narrator's voice, SOLO runs only (state.botSeat), behind
// a settings toggle (tb_witnessHints, default ON — the tb_dmgPreview
// pattern). The line pools live in ENGINE content (witness-solo.ts) and
// stall at the Part 7 strings sign-off; an empty pool renders nothing, so
// this machinery is inert until the rows are signed. Hints are Witness
// lines and obey the truth law: they describe what just happened and what
// the mechanic IS; they never promise outcomes.
// ---------------------------------------------------------------------------

interface WitnessHintDef {
  pool: string;
  when: (s: ClientState, prev: ClientState) => boolean;
}

/** a staged HUMAN card WITH a link that reads unfired at commit —
 *  Pulse-forced slots excluded, linkless cards excluded (a forced link
 *  fires, and a card with no link has nothing to read dead: either way the
 *  hint would state a falsehood) */
function humanDeadLinkAtCommit(prev: ClientState, threadFloor: number): boolean {
  if (!prev.combat || prev.thread < threadFloor) return false;
  const chain = prev.combat.chain;
  try {
    const fired = computeLinksFired(prev, chain);
    const pulsed = new Set(
      prev.combat.threadActions.filter((t) => t.kind === 'pulse').map((t) => t.targetId),
    );
    return chain.some((slot, i) => {
      if (slot.owner !== prev.you || fired[i] || pulsed.has(slot.cardInstanceId)) return false;
      const p = prev.players[slot.owner];
      const inst = p.deck.find((c) => c.instanceId === slot.cardInstanceId)
        ?? p.combatCards.find((c) => c.instanceId === slot.cardInstanceId);
      return !!inst && !!effectiveDef(inst).link;
    });
  } catch {
    return false;
  }
}

/** did the turn just commit? (resolveTurn bumps telemetry.turns) */
const committed = (s: ClientState, prev: ClientState): boolean =>
  s.telemetry.turns > prev.telemetry.turns;

const WITNESS_HINTS: WitnessHintDef[] = [
  {
    // shared Thread first drops below 4
    pool: 'hint_thread_floor',
    when: (s, prev) => prev.thread >= 4 && s.thread < 4,
  },
  {
    // a staged human card's link reads unfired at commit, first time
    pool: 'hint_link_read',
    when: (s, prev) => committed(s, prev) && humanDeadLinkAtCommit(prev, 0),
  },
  {
    // an enemy's binding first retargets
    pool: 'hint_binding',
    when: (s, prev) => {
      if (!s.combat || !prev.combat) return false;
      return s.combat.enemies.some((e) => {
        const before = prev.combat!.enemies.find((pe) => pe.id === e.id);
        return before && before.boundTo !== null && e.boundTo !== null && before.boundTo !== e.boundTo;
      });
    },
  },
  {
    // the bot's first Reclaim of the run resolves (pairs with i_reclaimed_yours)
    pool: 'hint_reclaim_exists',
    when: (s) => s.log.some((e) => e.e === 'thread_action' && e.kind === 'reclaim' && e.player === s.botSeat),
  },
  {
    // the human first ends a turn with a dead link and Thread >= 4
    pool: 'hint_pulse',
    when: (s, prev) => committed(s, prev) && humanDeadLinkAtCommit(prev, 4),
  },
];

const WH_KEY = 'tb_witness_hints_run';

/** stable per-run key for once-per-run tracking and across-run line variety:
 *  the act-1 map layout is a pure function of the run seed (which redaction
 *  masks while live) — hash it instead. Client-local; consumes no rng. */
function runKeyOf(s: ClientState): number {
  const src = JSON.stringify(s.map.nodes.map((n) => [n.id, n.kind, n.edges]));
  let h = 0x811c9dc5;
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function WitnessHints({ state }: { state: ClientState }): JSX.Element | null {
  const [line, setLine] = useState<string | null>(null);
  const prevRef = useRef<ClientState | null>(null);
  const runRef = useRef<{ run: number; seen: string[] } | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = state;
    if (line) return;
    if (!state.botSeat) return; // the Witness coaches only when it plays (solo)
    if (localStorage.getItem('tb_witnessHints') === '0') return; // toggle, default ON
    if (state.phase === 'lobby' || state.map.act !== 1) return; // act-1-only
    if (!prev) return;
    const run = runKeyOf(state);
    if (!runRef.current || runRef.current.run !== run) {
      const stored = JSON.parse(localStorage.getItem(WH_KEY) ?? 'null') as { run: number; seen: string[] } | null;
      runRef.current = stored && stored.run === run ? stored : { run, seen: [] };
    }
    for (const hint of WITNESS_HINTS) {
      if (runRef.current.seen.includes(hint.pool)) continue;
      const lines = witnessPoolLines(hint.pool);
      if (lines.length === 0) continue; // strings stall at Part 7 — inert until signed
      let fires = false;
      try { fires = hint.when(state, prev); } catch { fires = false; }
      if (!fires) continue;
      runRef.current.seen.push(hint.pool);
      localStorage.setItem(WH_KEY, JSON.stringify(runRef.current));
      setLine(lines[run % lines.length]); // variety across runs, not within
      return;
    }
  }, [state, line]);

  useEffect(() => {
    if (!line) return;
    const dismiss = () => setLine(null);
    const t = setTimeout(() => {
      window.addEventListener('pointerdown', dismiss, { once: true });
      window.addEventListener('keydown', dismiss, { once: true });
      window.addEventListener('gp-input', dismiss, { once: true });
    }, 600);
    return () => {
      clearTimeout(t);
      window.removeEventListener('pointerdown', dismiss);
      window.removeEventListener('keydown', dismiss);
      window.removeEventListener('gp-input', dismiss);
    };
  }, [line]);

  if (!line) return null;
  return (
    <div className="hint-pop">
      <span className="hint-pop-tag">◆</span> THE WITNESS: “{line}”
      <span className="muted"> — any input dismisses</span>
    </div>
  );
}

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
