// B0/B6 — style sample screen (/?style). S12: rebuilt as the B6 review
// instrument for the sigil vocabulary v2 (the adoption surface for sign-off
// gate 2): archetype row, tier row, act row, then the full registry set at
// combat-representative sizes — the LOD tiers must be reviewable HERE, not
// discovered in combat. The original B0 samples (cards, glyphs, gauge,
// tooltip) remain below; still the designer's cheapest veto point.

import React from 'react';
import { CARDS, ENEMIES, EnemyDef } from '@threadbound/engine';
import { Card } from './App';
import { GLYPH } from './keywords';
import { CharacterMark, Mark, MarkDefs, Tier } from './sigils';
import { ThreadCord } from './ThreadCord';
import { resolveInspect } from './Tooltip';

const tierOf = (def: EnemyDef): Tier => (def.boss ? 'boss' : def.elite ? 'elite' : 'normal');

/** Axis 1 exemplars — one per silhouette family (mirrors the reference doc). */
const ARCH_EXAMPLES: Array<{ id: string; act: 1 | 2 | 3; label: string }> = [
  { id: 'sexton', act: 1, label: 'figure — the interred' },
  { id: 'tallow_wisp', act: 1, label: 'flame — votive fire' },
  { id: 'bell_husk', act: 2, label: 'bell — the Choir' },
  { id: 'thread_leech', act: 1, label: 'crawler — parasites' },
  { id: 'votive_throng', act: 1, label: 'swarm — the many' },
  { id: 'the_unraveled', act: 3, label: 'frayed — coming apart' },
  { id: 'character_witness', act: 1, label: 'eye — the Witness' },
];

// 'minion' exists in the grammar but has no data source yet (S13+) — excluded.
const TIERS: Tier[] = ['normal', 'elite', 'boss', 'character'];

const ACT_LABEL: Record<number, string> = {
  1: 'Act 1 — the Undercroft', 2: 'Act 2 — the Hollow Choir', 3: 'Act 3 — the Last Braid',
  4: 'Act 4 — the Loom’s Floor', // S22.4 registered the Caretaker (lookup-only)
};

function MarkCell({ label, tier, children }: { label: string; tier?: string; children: React.ReactNode }): JSX.Element {
  return (
    <div className="mark-cell">
      {children}
      <div className="mark-label">{label}</div>
      {tier && <div className={`mark-tier ${tier}`}>{tier}</div>}
    </div>
  );
}

/** The full registry set (grouped by act) plus the characters, at one size.
 *  S23 fix: S22.4 registered the act-4 Caretaker into ENEMIES (lookup-only),
 *  which crashed this row's act 1–3 buckets — /?style white-screened on
 *  main. Buckets are now built from the registry's own acts. */
function FullSetRow({ size }: { size: number }): JSX.Element {
  const byAct: Record<number, Array<[string, EnemyDef]>> = {};
  for (const [id, def] of Object.entries(ENEMIES)) (byAct[def.act] ??= []).push([id, def]);
  const acts = Object.keys(byAct).map(Number).sort((a, b) => a - b);
  return (
    <>
      {acts.map((act) => (
        <div key={act}>
          <h4 className="mark-group">{ACT_LABEL[act]} <span className="muted">({size}px)</span></h4>
          <div className="mark-grid">
            {byAct[act].map(([id, def]) => (
              <MarkCell key={id} label={def.name} tier={tierOf(def)}>
                <Mark id={id} tier={tierOf(def)} act={def.act} size={size} />
              </MarkCell>
            ))}
          </div>
        </div>
      ))}
      <h4 className="mark-group">The bound pair, and the one who watches <span className="muted">({size}px)</span></h4>
      <div className="mark-grid">
        <MarkCell label="Vess" tier="character"><CharacterMark who="vess" size={size} /></MarkCell>
        <MarkCell label="Bram" tier="character"><CharacterMark who="bram" size={size} /></MarkCell>
        <MarkCell label="The Witness" tier="character"><CharacterMark who="witness" size={size} /></MarkCell>
      </div>
    </>
  );
}

export function StyleScreen(): JSX.Element {
  const sample = resolveInspect('card:rendcall');
  const rare = Object.values(CARDS).find((c) => c.rarity === 'rare' && !c.starterOnly);
  const uncommon = Object.values(CARDS).find((c) => c.rarity === 'uncommon' && !c.starterOnly);
  const mutable = Object.values(CARDS).find((c) => c.mutation);
  return (
    <div className="app style-screen">
      <MarkDefs />
      <header><span className="title">THREADBOUND — STYLE SAMPLE</span><span className="muted">/?style</span></header>

      <h3>Sigil vocabulary v2 — Axis 1: archetypes <span className="muted">(silhouette families)</span></h3>
      <div className="mark-grid">
        {ARCH_EXAMPLES.map((a) => (
          <MarkCell key={a.id} label={a.label}>
            {a.id === 'character_witness'
              ? <CharacterMark who="witness" size={96} />
              : <Mark id={a.id} tier="normal" act={a.act} size={96} />}
          </MarkCell>
        ))}
      </div>

      <h3>Axis 2: tier dress <span className="muted">(same entity, every rank — characters alone wear the unbroken ring)</span></h3>
      <div className="mark-grid">
        {TIERS.map((t) => (
          <MarkCell key={t} label={t}>
            <Mark id="sexton" tier={t} act={1} size={96} />
          </MarkCell>
        ))}
      </div>

      <h3>Axis 3: act <span className="muted">(same entity — accent pool and frame-tick construction shift per act)</span></h3>
      <div className="mark-grid">
        {([1, 2, 3] as const).map((a) => (
          <MarkCell key={a} label={`act ${a}`}>
            <Mark id="gravewax_husk" tier="normal" act={a} size={96} />
          </MarkCell>
        ))}
      </div>

      <h3>The full set at combat sizes <span className="muted">(64px = full LOD tier boundary review, 40px = smallest LOD)</span></h3>
      <FullSetRow size={64} />
      <FullSetRow size={40} />

      <h3>Cards</h3>
      <div className="hand">
        <Card def={CARDS.rendcall} />
        <Card def={CARDS.needlework} selected />
        <Card def={CARDS.patient_knife} disabled />
        <Card def={CARDS.second_wind} echo />
        <Card def={CARDS.haymaker} small />
      </div>

      <h3>Card frames — rarity, gilding, mutation (S2.2)</h3>
      <div className="hand">
        <Card def={CARDS.rendcall} small />
        {uncommon && <Card def={uncommon} small />}
        {rare && <Card def={rare} small />}
        {rare && <Card def={rare} small upgraded />}
        {mutable && <Card def={mutable} small echo mutated />}
      </div>

      {/* S13.4 rare legibility rider — the Gate B screenshot row. A rare
          must READ as rare before its text is read: doubled gilt frame,
          gilded name, spark mark. The vestment's lavender still wins on
          rite cards (a vestment is a vestment first). SIGNED OFF
          2026-07-04 (Gate B screenshot approved). */}
      <h3>S13.4 rare legibility — common · uncommon · rare engine · rare spike · vestment</h3>
      <div className="hand">
        <Card def={CARDS.needlework} />
        {uncommon && <Card def={uncommon} />}
        <Card def={CARDS.unbroken_line} />
        <Card def={CARDS.avalanche} />
        <Card def={CARDS.rite_shroud} />
      </div>

      <h3>Status glyph set — same marks on cards, intents, status bars</h3>
      <div className="statuses glyph-row">
        {Object.entries(GLYPH).map(([k, g]) => <span key={k}><b>{g}</b> {k}</span>)}
      </div>

      <h3>Enemy frames & marks <span className="muted">(combat chrome; Unraveled fraying mid-sever)</span></h3>
      <div className="enemies">
        {['cinder_husk', 'mourner', 'the_unraveled', 'chorister_mid'].map((id, i) => {
          const def = ENEMIES[id];
          return (
            <div key={id} className={`enemy ${def.boss ? 'boss' : ''} ${def.elite ? 'elite' : ''} ${def.unraveled ? 'sigil-fraying' : ''} ${i === 3 ? 'untargetable' : ''}`}
              /* S23: seat hue rides the bottom tether edge (--bound-hue) */
              style={{ '--bound-hue': i % 2 ? 'var(--p2)' : 'var(--p1)' } as React.CSSProperties}>
              <Mark id={id} tier={tierOf(def)} act={def.act} size={def.boss ? 104 : def.elite ? 82 : 64} className="enemy-sigil" />
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

      {/* S26 (OQ#82–#85): the braid map's ink, reviewable HERE before the
          field — one warp material, severance, and the preview reweight.
          Every constant behind these is gate-tunable (G1/G3/G4). */}
      <h3>Braid map ink (S26) <span className="muted">(five stations, one pass — hover reweights, never adds)</span></h3>
      <div className="map-ink-row">
        <div className="map-ink-cell">
          <svg width="120" height="90" viewBox="0 0 120 90" aria-hidden>
            <path className="map-cord cord-rail" d="M 30 6 L 30 84" fill="none" />
            <path className="map-cord cord-rail" d="M 30 6 L 62 45 L 30 84" fill="none" />
          </svg>
          <div className="mark-label">rail + lens bow (--warp)</div>
        </div>
        <div className="map-ink-cell">
          <svg width="120" height="90" viewBox="0 0 120 90" aria-hidden>
            <path className="map-cord cord-knot" d="M 20 84 L 60 45 L 100 84" fill="none" />
            <path className="map-cord cord-knot" d="M 20 6 L 60 45 L 100 6" fill="none" />
          </svg>
          <div className="mark-label">knot chords</div>
        </div>
        <div className="map-ink-cell">
          <svg width="120" height="90" viewBox="0 0 120 90" aria-hidden>
            <path className="map-cord cord-severed" d="M 40 30 L 54 44" fill="none" />
            <path className="map-cord cord-severed-fray" d="M 54 44 L 55.7 48.7 M 54 44 L 58.7 45.7" fill="none" />
          </svg>
          <div className="mark-label">severed stub + fray</div>
        </div>
        <div className="map-ink-cell">
          <svg width="120" height="90" viewBox="0 0 120 90" aria-hidden>
            <path className="map-cord lit" d="M 30 6 L 90 84" fill="none" />
          </svg>
          <div className="mark-label">lit (route preview)</div>
        </div>
        <div className="map-ink-cell">
          <svg className="previewing" width="120" height="90" viewBox="0 0 120 90" aria-hidden>
            <path className="map-cord cord-rail" d="M 20 6 L 20 84" fill="none" />
            <path className="map-cord cord-knot" d="M 20 6 L 60 45" fill="none" />
            <path className="map-cord cord-severed" d="M 20 40 L 34 54" fill="none" />
            <path className="map-cord lit" d="M 60 45 L 100 6" fill="none" />
          </svg>
          <div className="mark-label">previewing dim (0.45)</div>
        </div>
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
        <CharacterMark who="vess" size={84} /><CharacterMark who="witness" size={56} /><CharacterMark who="bram" size={84} />
      </div>

      <h3>Voice</h3>
      <p className="witness">“Yes, this is the style sample. Try to contain yourselves.”</p>
    </div>
  );
}
