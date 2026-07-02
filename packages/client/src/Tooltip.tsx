// B2 — keyword tooltip panel. Hover (250ms) on anything carrying data-inspect,
// or controller-inspect (△/Y). One panel, side-docked; lists every keyword
// present on the element, plus upgrade/mutation previews where relevant.

import React, { useEffect, useState } from 'react';
import { CARDS, ENEMIES, RELICS_BY_ID, CardDef } from '@threadbound/engine';
import { KEYWORDS, KeywordDef, keywordsIn, linkBody } from './keywords';

const WITNESS_ASIDES = [
  'Yes, I wrote the glossary. No, I’m not proud of it.',
  'Read carefully. The dead skimmed.',
  'Knowledge is power. Power is briefly not dying.',
  'You could also just guess. People do.',
];

export interface InspectContent {
  title: string;
  subtitle?: string;
  body?: string[];
  keywords: KeywordDef[];
  aside?: string;
}

function cardLines(def: CardDef): string[] {
  const lines = [`${def.cost} energy — ${def.tag}${def.keep ? ' — Keep' : ''}${def.exhaust ? ' — Exhaust' : ''}`, def.text];
  if (def.link) lines.push(`Link (${def.link.condition}): ${linkBody(def.link.text)}`);
  return lines;
}

export function resolveInspect(key: string): InspectContent | null {
  // scan:<free text> — surface every keyword the text mentions (event prose,
  // option labels, result lines). Null when nothing matches: no empty panel.
  if (key.startsWith('scan:')) {
    const kws = keywordsIn(key.slice(5));
    if (kws.length === 0) return null;
    return { title: 'Terms', keywords: kws };
  }
  const [kind, id, flag] = key.split(':');
  switch (kind) {
    case 'card': {
      const def = CARDS[id];
      if (!def) return null;
      const body = cardLines(def);
      if (flag === 'uprev' && def.upgrade) {
        body.push('— Upgrade preview —', def.upgrade.text ?? def.text);
      }
      if (flag === 'mprev' && def.mutation) {
        body.push('— Reclaims as —', `${def.mutation.name}: ${def.mutation.text}`);
        if (def.mutation.link) body.push(`Link (${def.mutation.link.condition}): ${linkBody(def.mutation.link.text)}`);
      }
      if (flag === 'upgraded' && def.upgrade) {
        body.length = 0;
        body.push(`${def.upgrade.cost ?? def.cost} energy — ${def.tag}`, def.upgrade.text ?? def.text);
      }
      return {
        title: def.name + (flag === 'upgraded' ? '+' : ''),
        subtitle: `${def.rarity}${def.starterOnly ? ' · starter' : ''}${def.riteOnly ? ' · rite vestment' : ''} · ${def.character}`,
        body,
        keywords: keywordsIn(...body, def.link?.condition === 'partner' ? 'link' : ''),
        aside: WITNESS_ASIDES[hashStr(id) % WITNESS_ASIDES.length],
      };
    }
    case 'enemy': {
      const def = ENEMIES[id];
      if (!def) return null;
      const mech: string[] = [];
      // S10a enemies state their mechanic on the frame — the inspect panel
      // must never know less than the frame under it
      if (def.mechanicLine) mech.push(def.mechanicLine);
      if (def.mournerMechanic) mech.push(`Swells (+${def.mournerMechanic.strengthPerTrigger} Strength) any turn your Chain holds 4+ cards in a row from one player.`);
      if (def.chainReader) mech.push(`Reads the chain: +${def.chainReader.blockPerUnfiredLink} Block per link that failed to fire.`);
      if (def.chorus) mech.push('A chorus: the bodies share one pool of life. One is always unbound and untargetable — sever a binding to rotate who stands forward.');
      if (def.unraveled) mech.push(`At half health it SEVERS the Thread for ${def.unraveled.severTurns} turns, then the Thread reignites at full.`);
      if (def.elite || def.boss) mech.push('Re-tethers on its own every 3rd turn — no one stays safe on soak duty.');
      return {
        title: def.name,
        subtitle: `${def.boss ? 'boss' : def.elite ? 'elite' : 'enemy'} · act ${def.act}`,
        body: [def.flavor, ...mech],
        keywords: keywordsIn(...mech, 'bound'),
      };
    }
    case 'relic': {
      const def = RELICS_BY_ID[id];
      if (!def) return null;
      return {
        title: def.name,
        subtitle: def.coop ? 'relic · co-op' : 'relic',
        body: [def.text],
        keywords: keywordsIn(def.text),
      };
    }
    case 'kw': {
      const k = KEYWORDS[id];
      return k ? { title: k.name, body: [k.rule, ...(k.flavor ? [k.flavor] : [])], keywords: [] } : null;
    }
    case 'thread':
      return {
        title: 'The Thread',
        body: [KEYWORDS.thread.rule],
        keywords: [KEYWORDS.pulse, KEYWORDS.reclaim, KEYWORDS.sever, KEYWORDS.steady, KEYWORDS.frayed],
      };
    default:
      return null;
  }
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Singleton inspect state, driven by hover delegation + controller inspect. */
let setGlobalKey: ((key: string | null, pinned: boolean) => void) | null = null;
let currentKey: string | null = null; // mirror for module-level decisions
/** △ is a sticky toggle: closing the panel keeps it closed across focus
 *  moves; opening it resumes the focus-preview. Mouse hover ignores this —
 *  pointing at something is already a deliberate ask. */
let padPreviewOn = true;

export function inspectElement(el: HTMLElement | null): void {
  if (currentKey) {
    padPreviewOn = false;
    setGlobalKey?.(null, false);
    return;
  }
  padPreviewOn = true;
  setGlobalKey?.(el?.dataset.inspect ?? null, true);
}

/** Pad-focus preview: hover parity for the controller (unpinned). */
export function previewInspect(el: HTMLElement | null): void {
  if (!padPreviewOn) return;
  setGlobalKey?.(el?.dataset.inspect ?? null, false);
}

export function InspectPanel(): JSX.Element | null {
  const [key, setKey] = useState<string | null>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    setGlobalKey = (k, p) => {
      currentKey = k; // toggle logic lives in inspectElement now
      setKey(k);
      setPinned(p);
    };
    let timer = 0;
    let hoverEl: HTMLElement | null = null;
    const over = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-inspect]');
      if (el === hoverEl) return;
      hoverEl = el;
      window.clearTimeout(timer);
      if (el) {
        timer = window.setTimeout(() => setGlobalKey?.(el.dataset.inspect!, false), 250);
      } else if (!pinnedRef) {
        setGlobalKey?.(null, false); // keep the module mirror honest
      }
    };
    let pinnedRef = false;
    const sub = (p: boolean) => (pinnedRef = p);
    subPinned = sub;
    document.addEventListener('mouseover', over);
    return () => document.removeEventListener('mouseover', over);
  }, []);
  useEffect(() => {
    subPinned?.(pinned);
  }, [pinned]);

  if (!key) return null;
  const content = resolveInspect(key);
  if (!content) return null;
  return (
    <aside className="inspect-panel" onClick={() => setGlobalKey?.(null, false)}>
      <div className="inspect-title">{content.title}</div>
      {content.subtitle && <div className="inspect-sub">{content.subtitle}</div>}
      {content.body?.map((line, i) => (
        <p key={i} className={line.startsWith('—') ? 'inspect-divider' : ''}>{line}</p>
      ))}
      {content.keywords.length > 0 && (
        <div className="inspect-keywords">
          {content.keywords.map((k) => (
            <div key={k.id}>
              <b>{k.name}.</b> {k.rule}
            </div>
          ))}
        </div>
      )}
      {content.aside && <div className="inspect-aside">“{content.aside}”</div>}
      {pinned && <div className="inspect-hint">inspect again to close</div>}
    </aside>
  );
}

let subPinned: ((p: boolean) => void) | null = null;
