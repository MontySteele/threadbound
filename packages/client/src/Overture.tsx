// S22-R1 — the Overture (the title crawl): an intro movie in the oldest
// sense. One screen of fluff doing exactly one job: hand a stranger the
// PERMITTED MISREADING (§5b — "descent to Hell") so their first run makes
// sense, while the held-reveal law keeps everything it protects.
//
// Writing law (rider, rejection criteria): funeral direction ONLY — no
// births, no mirror, no cradle, no dawn, no "carried up"; canon-true under
// permitted simplification (nothing false, much withheld); word-drawer
// lexicon, austere, no proper nouns beyond the Loom; the final line is
// St-e1 verbatim — the crawl resolves into the title it decorates.
//
// VOICE: AUTHORIAL (the epigraph's register) — the Witness has not met
// them yet (S20 ruling; the truth law extends to voice placement).
//
// Mechanics (rider D-rows):
//   O-1 first arrival: auto-plays once per browser (tb_overture_seen, the
//       tutorial-dismissal pattern); never auto-plays again after a skip
//       or a completion.
//   O-2 attract loop: TITLE screen only, 150s idle (Home owns the timer);
//       any input ends it instantly; never over an open lobby, join flow,
//       or the how-to overlay (Home gates on those).
//   O-3 skip: always visible ("skip — Esc"), plus Esc/Space/Enter/click-
//       anywhere; instant, no fade-out tax.
//   O-4 prefers-reduced-motion: the scroll becomes a paced fade sequence,
//       same lines, same skip.
//   O-5 duration: full read ~35–45s, derived from stanza count so future
//       edits don't need retiming.
//
// CRAWL TEXT: PROVISIONAL rev. 2 (rider row Ov-1 — signs as one row; the
// skip label is row Ov-2). "The half-carried" is the lore bible's own
// cargo term; "the living go down" holds true across all four q_came
// origins; line 5 = St-e1 (SIGNED, S21.5) — on resolve, the title and
// epigraph are already on screen.

import React, { useEffect, useMemo, useState } from 'react';

const CRAWL: string[] = [
  'There was one rite, once, and one machine to keep it:\nthe Loom, which carried the dead out of the world.',
  'When the world stopped agreeing with itself, so did the Loom —\nand the rite jammed, half-turned, unfinished.',
  'The dead still go down. But nothing carries them now,\nand the dark below is crowded with the half-carried.',
  'So the living go down after the dead, to walk the rite’s road\nand finish it by hand — for the way is long,\nand it was never work for one.',
  'Two go down together, bound by one thread.',
];

/** O-5: seconds per stanza × stanza count — edits retime themselves. */
const SECONDS_PER_STANZA = 7.5;
const DURATION_S = CRAWL.length * SECONDS_PER_STANZA; // 37.5s at five stanzas

export const OVERTURE_SEEN_KEY = 'tb_overture_seen';

export function Overture({ attract, onDone }: { attract: boolean; onDone: () => void }): JSX.Element {
  const reduced = useMemo(
    () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  );
  // O-4: the fade sequence's cursor (reduced motion only)
  const [fadeIdx, setFadeIdx] = useState(0);
  // the last moments soften into the title underneath — never taxing a skip
  const [ending, setEnding] = useState(false);

  // natural end (both motion modes share the derived duration)
  useEffect(() => {
    if (reduced) return; // the fade chain below owns the reduced clock
    const soften = setTimeout(() => setEnding(true), (DURATION_S - 1.2) * 1000);
    const done = setTimeout(onDone, DURATION_S * 1000);
    return () => { clearTimeout(soften); clearTimeout(done); };
  }, [reduced]);

  useEffect(() => {
    if (!reduced) return;
    if (fadeIdx >= CRAWL.length) { onDone(); return; }
    const t = setTimeout(() => setFadeIdx((i) => i + 1), SECONDS_PER_STANZA * 1000);
    return () => clearTimeout(t);
  }, [reduced, fadeIdx]);

  // O-3 (+ O-2's any-input rule for attract replays): skipping is instant
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (attract || e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') onDone();
    };
    const pad = () => onDone(); // a gamepad press ends it in either mode
    window.addEventListener('keydown', key);
    window.addEventListener('gp-input', pad);
    return () => {
      window.removeEventListener('keydown', key);
      window.removeEventListener('gp-input', pad);
    };
  }, [attract]);

  return (
    <div className={`overture ${ending ? 'overture-out' : ''}`} onClick={onDone}>
      {reduced ? (
        fadeIdx < CRAWL.length && (
          <div className="overture-fade" key={fadeIdx}>
            <p className={fadeIdx === CRAWL.length - 1 ? 'overture-final' : ''}>{CRAWL[fadeIdx]}</p>
          </div>
        )
      ) : (
        <div className="overture-scroll" style={{ animationDuration: `${DURATION_S}s` }}>
          {CRAWL.map((stanza, i) => (
            <p key={i} className={i === CRAWL.length - 1 ? 'overture-final' : ''}>{stanza}</p>
          ))}
        </div>
      )}
      {/* Ov-2 (PROVISIONAL): the always-visible skip */}
      <button className="chip overture-skip" data-gp="META" onClick={onDone}>skip — Esc</button>
    </div>
  );
}
