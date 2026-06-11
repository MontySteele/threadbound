// B3 — the Thread gauge: a rendered cord between the two portraits. Value maps
// to tension + brightness; numeric pips remain (information over art). States:
// fray snap-shake, slack (Fallen) drop, severed cut, resonance fire.

import React, { useEffect, useRef, useState } from 'react';
import { CharacterSigil } from './sigils';

export type CordMode = 'normal' | 'slack' | 'severed';

export interface CordFx {
  kind: 'fray' | 'spend' | 'resonance' | 'reignite';
}

export function emitCordFx(fx: CordFx): void {
  window.dispatchEvent(new CustomEvent('tb-cord', { detail: fx }));
}

export function ThreadCord({ value, max, mode, left, right, compact }: {
  value: number; max: number; mode: CordMode; left: 'vess' | 'bram'; right: 'vess' | 'bram';
  /** combat layout: the player panels flank the cord, so its own portraits
   *  would double them — hide them and let the panels be the endpoints */
  compact?: boolean;
}): JSX.Element {
  const [fx, setFx] = useState<string | null>(null);
  const fxTimer = useRef(0);

  useEffect(() => {
    const onFx = (e: Event) => {
      const { kind } = (e as CustomEvent<CordFx>).detail;
      setFx(kind);
      window.clearTimeout(fxTimer.current);
      fxTimer.current = window.setTimeout(() => setFx(null), kind === 'resonance' ? 1200 : 700);
    };
    window.addEventListener('tb-cord', onFx);
    return () => window.removeEventListener('tb-cord', onFx);
  }, []);

  const t = Math.max(0, Math.min(1, value / max));
  // tension: full thread = taut (small sag), empty = deep sag; slack mode = limp
  const sag = mode === 'slack' ? 64 : 10 + (1 - t) * 36;
  const bright = mode === 'severed' ? 0.25 : 0.35 + t * 0.65;
  const W = 320;
  const H = 80;
  const y = 22;

  return (
    <div className={`cord ${mode} ${compact ? 'compact' : ''} ${fx ? `fx-${fx}` : ''}`} data-inspect="thread" data-gp="THREAD">
      {!compact && <div className="cord-portrait"><CharacterSigil who={left} size={56} /></div>}
      <div className="cord-mid">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          {mode === 'severed' ? (
            <>
              <path className="cord-line" d={`M 0 ${y} Q ${W * 0.22} ${y + sag} ${W * 0.38} ${y + sag * 0.9}`}
                fill="none" style={{ opacity: bright }} />
              <path className="cord-line" d={`M ${W * 0.62} ${y + sag * 0.9} Q ${W * 0.78} ${y + sag} ${W} ${y}`}
                fill="none" style={{ opacity: bright }} />
              <text x={W / 2} y={y + sag} textAnchor="middle" className="cord-severed-mark">✂</text>
            </>
          ) : (
            <path className="cord-line" d={`M 0 ${y} Q ${W / 2} ${y + sag} ${W} ${y}`}
              fill="none" style={{ opacity: bright }} />
          )}
          {fx === 'resonance' && mode === 'normal' && (
            <circle className="cord-spark" r={4}>
              <animateMotion dur="1.1s" repeatCount="1" path={`M 0 ${y} Q ${W / 2} ${y + sag} ${W} ${y}`} />
            </circle>
          )}
        </svg>
        <div className="cord-pips" aria-label={`Thread ${value} of ${max}`}>
          {Array.from({ length: max }, (_, i) => (
            <span key={i} className={`pip ${i < value ? 'lit' : ''}`} />
          ))}
          <span className="cord-num">{value}/{max}</span>
        </div>
        {mode === 'slack' && <div className="cord-state-label">SLACK — your partner has fallen</div>}
        {mode === 'severed' && <div className="cord-state-label">SEVERED</div>}
      </div>
      {!compact && <div className="cord-portrait"><CharacterSigil who={right} size={56} /></div>}
    </div>
  );
}
