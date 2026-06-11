// B4/B5 — resolution choreography. When a state arrives carrying a resolution
// log, narrate it card-by-card (~400ms/beat, click/✕ to skip): SFX, floating
// damage numbers over enemies/players, hitstop + screen shake on heavy hits,
// cord effects. Reconnection replays the same log instead of snapping (M3-D).

import React, { useEffect, useRef, useState } from 'react';
import { GameEvent, PlayerId } from '@threadbound/engine';
import { audio } from './sfx';
import { controller, GLYPHS } from './gamepad';
import { emitCordFx } from './ThreadCord';

const BEAT = 400;
const HITSTOP_MS = 80;

function logKey(log: GameEvent[]): string {
  let h = 0;
  const s = JSON.stringify(log);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `${log.length}:${h}`;
}

function isResolution(log: GameEvent[]): boolean {
  return log.some((e) => e.e === 'card' || e.e === 'enemy_action' || e.e === 'fallen' || e.e === 'detonate');
}

/** Floating combat number over the element tagged data-fxid=<target>. */
function spawnNumber(target: string, text: string, cls: string): void {
  const host = document.querySelector<HTMLElement>(`[data-fxid="${target}"]`);
  const overlay = document.getElementById('fx-overlay');
  if (!host || !overlay) return;
  const r = host.getBoundingClientRect();
  const el = document.createElement('div');
  el.className = `fx-number ${cls}`;
  el.textContent = text;
  el.style.left = `${r.left + r.width / 2 + (Math.random() * 30 - 15)}px`;
  el.style.top = `${r.top + r.height * 0.3}px`;
  overlay.appendChild(el);
  setTimeout(() => el.remove(), 950);
  host.classList.remove('fx-hit');
  void host.offsetWidth; // restart the animation
  host.classList.add('fx-hit');
}

function shake(heavy: boolean): void {
  const app = document.querySelector('.app');
  if (!app) return;
  app.classList.remove('fx-shake', 'fx-shake-heavy');
  void (app as HTMLElement).offsetWidth;
  app.classList.add(heavy ? 'fx-shake-heavy' : 'fx-shake');
}

interface Beat {
  text: string;
  cls?: string;
  extraMs?: number;
  run?: () => void;
}

function eventBeat(e: GameEvent, pname: (p: PlayerId) => string): Beat | null {
  switch (e.e) {
    case 'thread_action':
      return { text: `${pname(e.player)} — ${e.kind}`, cls: 'b-thread', run: () => { audio.play('card_place'); emitCordFx({ kind: 'spend' }); } };
    case 'card':
      return {
        text: `${e.slot + 1}. ${pname(e.player)} · ${e.card}${e.linkFired ? '  ⚡' : ''}${e.resonance ? '  ✦' : ''}`,
        cls: e.resonance ? 'b-resonance' : e.linkFired ? 'b-link' : 'b-card',
        run: () => audio.play(e.resonance ? 'resonance' : e.linkFired ? 'link_fire' : 'card_place'),
      };
    case 'resonance_ignite':
      return { text: `✦ RESONANCE — ${e.tags.join(' → ')}`, cls: 'b-resonance', extraMs: 200, run: () => emitCordFx({ kind: 'resonance' }) };
    case 'damage': {
      const total = e.hpLoss + e.blocked;
      const heavy = total >= 15;
      return {
        text: '', extraMs: heavy ? HITSTOP_MS : 0,
        run: () => {
          audio.play(heavy ? 'hit_heavy' : total >= 8 ? 'hit_mid' : 'hit_light');
          if (e.hpLoss > 0) spawnNumber(e.target, `${e.hpLoss}`, heavy ? 'n-heavy' : 'n-dmg');
          if (e.blocked > 0) spawnNumber(e.target, `(${e.blocked})`, 'n-block');
          if (heavy) shake(true);
        },
      };
    }
    case 'detonate':
      return {
        text: `✸ ${e.stacks} Hex detonate`, cls: 'b-detonate', extraMs: e.stacks >= 4 ? HITSTOP_MS : 0,
        run: () => {
          audio.play('detonate');
          spawnNumber(e.target, `${e.damage}`, 'n-hex');
          shake(e.stacks >= 4);
        },
      };
    case 'hex':
      return { text: '', run: () => spawnNumber(e.target, `+${e.amount} hex`, 'n-hexapply') };
    case 'block':
      return { text: '', run: () => { audio.play('block'); spawnNumber(e.target, `+${e.amount}`, 'n-block'); } };
    case 'enemy_action':
      return { text: `${e.enemy.replace(/^e\d+_/, '').replace(/_/g, ' ')} ${e.detail}`, cls: 'b-enemy' };
    case 'enemy_dead':
      return { text: '', run: () => document.querySelector(`[data-fxid="${e.enemy}"]`)?.classList.add('fx-dissolve') };
    case 'player_hit':
      return {
        text: '', extraMs: e.hpLoss >= 12 ? HITSTOP_MS : 0,
        run: () => {
          audio.play(e.hpLoss >= 12 ? 'hit_heavy' : 'hit_mid');
          spawnNumber(e.player, `${e.hpLoss}`, 'n-heavy');
          if (e.blocked > 0) spawnNumber(e.player, `(${e.blocked})`, 'n-block');
          shake(e.hpLoss >= 12);
        },
      };
    case 'fallen':
      return { text: `${pname(e.player)} FALLS`, cls: 'b-fallen', extraMs: 400, run: () => { audio.play('fallen'); } };
    case 'revived':
      return { text: `${pname(e.player)} rises — 1 HP`, cls: 'b-resonance', run: () => audio.play('revive') };
    case 'fray':
      return { text: 'the Thread FRAYS', cls: 'b-fray', run: () => { audio.play('fray'); emitCordFx({ kind: 'fray' }); } };
    case 'thread_severed':
      return { text: 'THE THREAD IS SEVERED', cls: 'b-fray', extraMs: 400, run: () => audio.play('sever') };
    case 'thread_reignited':
      return { text: 'the Thread REIGNITES', cls: 'b-resonance', run: () => { audio.play('revive'); emitCordFx({ kind: 'reignite' }); } };
    case 'witness':
      return { text: `THE WITNESS: “${e.line}”`, cls: 'b-witness', extraMs: 350, run: () => audio.play('witness_blip') };
    case 'relic':
      return { text: `relic claimed`, cls: 'b-thread', run: () => audio.play('covet') };
    case 'info':
      return { text: e.detail, cls: 'b-info' };
    default:
      return null;
  }
}

export function ResolutionTheater({ log, pname }: { log: GameEvent[]; pname: (p: PlayerId) => string }): JSX.Element | null {
  const [lines, setLines] = useState<Beat[] | null>(null);
  const playedRef = useRef<string>('');
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!log || log.length === 0 || !isResolution(log)) return;
    const key = logKey(log);
    if (playedRef.current === key) return; // same broadcast — already played
    playedRef.current = key;

    cancelRef.current?.();
    let cancelled = false;
    cancelRef.current = () => (cancelled = true);
    const beats = log.map((e) => eventBeat(e, pname)).filter((b): b is Beat => !!b);

    const shown: Beat[] = [];
    setLines([]);
    (async () => {
      for (const beat of beats) {
        if (cancelled) {
          // skip: run remaining side effects instantly (numbers suppressed)
          continue;
        }
        beat.run?.();
        if (beat.text) {
          shown.push(beat);
          setLines([...shown.slice(-6)]);
          await new Promise((r) => setTimeout(r, BEAT + (beat.extraMs ?? 0)));
        } else {
          await new Promise((r) => setTimeout(r, 120 + (beat.extraMs ?? 0)));
        }
      }
      if (!cancelled) setTimeout(() => setLines(null), 1200);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [log]);

  if (!lines) return null;
  return (
    <div className="theater" onClick={() => { cancelRef.current?.(); setLines(null); }} data-gp-action="cancel">
      {lines.map((b, i) => (
        <div key={i} className={`beat ${b.cls ?? ''} ${i === lines.length - 1 ? 'beat-now' : ''}`}>{b.text}</div>
      ))}
      <div className="beat-skip">click{controller.connected ? ` / ${GLYPHS[controller.flavor].cancel}` : ''} to skip</div>
    </div>
  );
}
