// B0 — style sample screen (/?style): card, tooltip, enemy frame, and gauge
// states side by side. The designer's cheapest veto point before asset work.

import React from 'react';
import { CARDS, ENEMIES } from '@threadbound/engine';
import { Card } from './App';
import { Sigil, CharacterSigil } from './sigils';
import { ThreadCord } from './ThreadCord';
import { resolveInspect } from './Tooltip';

export function StyleScreen(): JSX.Element {
  const sample = resolveInspect('card:rendcall');
  return (
    <div className="app style-screen">
      <header><span className="title">THREADBOUND — STYLE SAMPLE</span><span className="muted">/?style</span></header>

      <h3>Cards</h3>
      <div className="hand">
        <Card def={CARDS.rendcall} />
        <Card def={CARDS.needlework} selected />
        <Card def={CARDS.patient_knife} disabled />
        <Card def={CARDS.second_wind} echo />
        <Card def={CARDS.haymaker} small />
      </div>

      <h3>Enemy frames & sigils</h3>
      <div className="enemies">
        {['cinder_husk', 'mourner', 'the_unraveled', 'chorister_mid'].map((id, i) => {
          const def = ENEMIES[id];
          return (
            <div key={id} className={`enemy ${i === 3 ? 'untargetable' : ''}`} style={{ borderColor: i % 2 ? 'var(--p2)' : 'var(--p1)' }}>
              <Sigil id={id} size={64} aura={def.elite || def.boss} className="enemy-sigil" />
              <div className="ename">{def.name}{def.elite ? ' ☠' : def.boss ? ' ♛' : ''}</div>
              <div className="hpbar"><div className="hpfill" style={{ width: '62%' }} /></div>
              <div>26/42 <span className="chipblock">🛡6</span></div>
              <div className="hexmotes">{[0, 1, 2].map((m) => <span key={m} className="mote" style={{ animationDelay: `${m * 0.35}s` }} />)}</div>
              <div className="intent">⚔ 9 & FRAYS</div>
              <div className="bound" style={{ color: 'var(--p1)' }}>bound to vess</div>
            </div>
          );
        })}
      </div>

      <h3>Thread gauge states</h3>
      <ThreadCord value={8} max={10} mode="normal" left="vess" right="bram" />
      <ThreadCord value={2} max={10} mode="normal" left="vess" right="bram" />
      <ThreadCord value={0} max={10} mode="slack" left="vess" right="bram" />
      <ThreadCord value={0} max={10} mode="severed" left="vess" right="bram" />

      <h3>Tooltip panel</h3>
      <div className="inspect-panel" style={{ position: 'static', maxWidth: 360 }}>
        <div className="inspect-title">{sample?.title}</div>
        <div className="inspect-sub">{sample?.subtitle}</div>
        {sample?.body?.map((l, i) => <p key={i}>{l}</p>)}
        <div className="inspect-keywords">
          {sample?.keywords.map((k) => <div key={k.id}><b>{k.name}.</b> {k.rule}</div>)}
        </div>
        <div className="inspect-aside">“{sample?.aside}”</div>
      </div>

      <h3>Character marks</h3>
      <div className="home-sigils">
        <CharacterSigil who="vess" size={84} /><CharacterSigil who="witness" size={56} /><CharacterSigil who="bram" size={84} />
      </div>

      <h3>Voice</h3>
      <p className="witness">“Yes, this is the style sample. Try to contain yourselves.”</p>
    </div>
  );
}
