// Threadbound client — M3: controller-first (B1), tooltips (B2), thread cord
// (B3), chain choreography (B4), enemy presence (B5), sigil art (B6),
// procedural audio (C), tutorial (D). Renders state, sends intents (§11).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CARDS, EVENTS, ENEMIES, RELICS_BY_ID, POWERS, CardDef, CardInstance, GameEvent, MapNode, PlayerId,
  computeLinksFired, computeResonanceSlots, effectiveDef, hasPassive,
} from '@threadbound/engine';
import { ClientState, Net } from './net';
import { controller, GLYPHS } from './gamepad';
import { audio } from './sfx';
import { Sigil, CharacterSigil } from './sigils';
import { InspectPanel, inspectElement } from './Tooltip';
import { ThreadCord } from './ThreadCord';
import { ResolutionTheater } from './Theater';
import { StyleScreen } from './StyleScreen';
import { Tutorial } from './Tutorial';

type Character = 'vess' | 'bram';
const CHAR_NAME: Record<string, string> = { vess: 'Vess, the Hexweaver', bram: 'Bram, the Cinderfist' };
const PCOLOR: Record<PlayerId, string> = { p1: 'var(--p1)', p2: 'var(--p2)' };
const ACT_NAME: Record<number, string> = { 1: 'Act 1 — The Undercroft', 2: 'Act 2 — The Hollow Choir', 3: 'The Last Braid' };
const NODE_ICON: Record<string, string> = {
  combat: '⚔', elite: '☠', boss: '♛', event: '?', rest: '♨', shop: '⚖', treasure: '✦',
};

function inst(state: ClientState, owner: PlayerId, id: string): CardInstance | undefined {
  const p = state.players[owner];
  return p.deck.find((c) => c.instanceId === id) ?? p.combatCards.find((c) => c.instanceId === id);
}

function defFor(state: ClientState, owner: PlayerId, id: string): CardDef {
  const i = inst(state, owner, id);
  return i ? effectiveDef(i) : ({ name: '?', text: '', cost: 0, tag: 'Strike', base: [] } as unknown as CardDef);
}

function inspectKeyFor(state: ClientState, owner: PlayerId, id: string): string {
  const i = inst(state, owner, id);
  if (!i) return '';
  if (i.mutated) return `card:${i.defId}:mprev`;
  if (i.upgraded) return `card:${i.defId}:upgraded`;
  return `card:${i.defId}`;
}

// ---------------------------------------------------------------------------

export default function App(): JSX.Element {
  const [state, setState] = useState<ClientState | null>(null);
  const [joined, setJoined] = useState<{ code: string; playerId: PlayerId; character: string } | null>(null);
  const [error, setError] = useState('');
  const [partnerOn, setPartnerOn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [, padTick] = useState(0);
  const netRef = useRef<Net | null>(null);

  useEffect(() => {
    netRef.current = new Net({
      onState: setState,
      onJoined: (info) => setJoined(info),
      onError: (m) => { setError(m); setTimeout(() => setError(''), 4000); },
      onPresence: setPartnerOn,
      onConnection: setConnected,
    });
    controller.onChange = () => padTick((n) => n + 1);
    controller.onInspect = (el) => inspectElement(el);
    controller.start();
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    const refocus = setInterval(() => controller.ensureFocus(), 400);
    return () => { controller.stop(); clearInterval(refocus); };
  }, []);

  useEffect(() => {
    audio.setAmbient(state && state.phase !== 'lobby' ? state.map.act : 0);
  }, [state?.map.act, state?.phase]);

  const net = netRef.current;

  if (new URLSearchParams(location.search).has('style')) return <StyleScreen />;
  if (!net || !connected) return <div className="center">Connecting…</div>;

  return (
    <>
      <div id="fx-overlay" />
      <InspectPanel />
      {!joined || !state ? (
        <Home net={net} error={error} />
      ) : (
        <div className="app">
          <header>
            <span className="title">THREADBOUND</span>
            <span className="header-mid">
              {state.phase !== 'lobby' && <b>{ACT_NAME[state.map.act]} · </b>}
              room <b>{joined.code}</b> · <b style={{ color: PCOLOR[state.you] }}>{CHAR_NAME[state.players[state.you].character]}</b>
              {' · '}gold <b>{state.gold}</b>
            </span>
            <span className="header-right">
              <Settings />
              <span className={partnerOn ? 'on' : 'off'}>{partnerOn ? '● partner' : '○ partner'}</span>
            </span>
          </header>
          <RelicBar state={state} />
          {error && <div className="error">{error}</div>}
          <Phase state={state} net={net} partnerOn={partnerOn} />
          <ResolutionTheater log={state.log} pname={(p) => state.players[p].character} />
          <Tutorial state={state} />
          <HintBar />
        </div>
      )}
    </>
  );
}

function HintBar(): JSX.Element | null {
  if (!controller.active) return null;
  const g = GLYPHS[controller.flavor];
  return (
    <div className="hintbar">
      <span><b>{g.confirm}</b> select</span>
      <span><b>{g.cancel}</b> back</span>
      <span><b>{g.menu}</b> thread</span>
      <span><b>{g.inspect}</b> inspect</span>
      <span><b>{g.zone}</b> zones</span>
      <span><b>{g.reorder}</b> reorder</span>
      <span><b>{g.ready}</b> ready</span>
    </div>
  );
}

function Settings(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  return (
    <span className="settings">
      <button className="chip" data-gp="META" onClick={() => setOpen(!open)}>♪</button>
      {open && (
        <div className="settings-pop">
          {(['master', 'sfx', 'ambient'] as const).map((k) => (
            <label key={k}>
              {k}
              <input type="range" min={0} max={1} step={0.05} value={audio.volumes[k]}
                onChange={(e) => { audio.setVolume(k, Number(e.target.value)); tick((n) => n + 1); }} />
            </label>
          ))}
        </div>
      )}
    </span>
  );
}

function RelicBar({ state }: { state: ClientState }): JSX.Element {
  const relics = (['p1', 'p2'] as PlayerId[]).flatMap((pid) =>
    state.players[pid].relics.map((r) => ({ pid, relic: RELICS_BY_ID[r] })),
  );
  if (relics.length === 0) return <></>;
  return (
    <div className="relicbar">
      {relics.map(({ pid, relic }, i) => (
        <span key={i} className="relic" style={{ borderColor: PCOLOR[pid] }} data-inspect={`relic:${relic?.id}`}>
          {relic?.name ?? '?'}
        </span>
      ))}
    </div>
  );
}

function Home({ net, error }: { net: Net; error: string }): JSX.Element {
  const [code, setCode] = useState('');
  const [character, setCharacter] = useState<Character>('vess');
  return (
    <div className="center home">
      <h1>THREADBOUND</h1>
      <div className="home-sigils">
        <CharacterSigil who="vess" size={84} /><CharacterSigil who="witness" size={56} /><CharacterSigil who="bram" size={84} />
      </div>
      <p className="muted">Two spirit-binders, one thread. Bring a friend.</p>
      {error && <div className="error">{error}</div>}
      <div className="panel">
        <h3>Create a room</h3>
        <label>
          Play as{' '}
          <select value={character} onChange={(e) => setCharacter(e.target.value as Character)}>
            <option value="vess">Vess, the Hexweaver</option>
            <option value="bram">Bram, the Cinderfist</option>
          </select>
        </label>
        <button data-gp="META" onClick={() => net.create(character)}>Create room</button>
      </div>
      <div className="panel">
        <h3>Join a room</h3>
        <input placeholder="5-letter code" value={code} maxLength={5} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button data-gp="META" onClick={() => net.join(code)}>Join</button>
      </div>
    </div>
  );
}

function Phase({ state, net, partnerOn }: { state: ClientState; net: Net; partnerOn: boolean }): JSX.Element {
  switch (state.phase) {
    case 'lobby':
      return (
        <div className="center">
          <h2>The Undercroft awaits</h2>
          <p>Share the room code. {partnerOn ? 'Your partner is here.' : 'Waiting for your partner…'}</p>
          {partnerOn && <button className="big" data-gp="META" onClick={() => net.start()}>Begin the descent</button>}
        </div>
      );
    case 'map':
      return <MapView state={state} net={net} />;
    case 'combat':
      return <Combat state={state} net={net} />;
    case 'reward':
      return <Reward state={state} net={net} />;
    case 'event':
      return <EventView state={state} net={net} />;
    case 'rest':
      return <Rest state={state} net={net} />;
    case 'shop':
      return <Shop state={state} net={net} />;
    case 'victory':
      return (
        <div className="center">
          <h2>The Unraveled lies still. The braid holds.</h2>
          <Log log={state.log} state={state} />
          <p className="muted">A full clear. Create a new room to descend again.</p>
        </div>
      );
    case 'game_over':
      return (
        <div className="center">
          <h2>The thread goes slack.</h2>
          <Log log={state.log} state={state} />
          <p className="muted">Death is a fresh run. Create a new room to descend again.</p>
        </div>
      );
    default:
      return <div className="center">…</div>;
  }
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

function MapView({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const map = state.map;
  const pickable: number[] =
    map.position === -1
      ? map.nodes.filter((n) => n.layer === 0).map((n) => n.id)
      : map.nodes.find((n) => n.id === map.position)?.edges ?? [];
  const layers = new Map<number, MapNode[]>();
  for (const n of map.nodes) {
    if (!layers.has(n.layer)) layers.set(n.layer, []);
    layers.get(n.layer)!.push(n);
  }
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  return (
    <div className="center">
      <h2>{ACT_NAME[map.act]}</h2>
      <p className="muted">
        Pick your next node — you must both pick the <i>same</i> one.
        {map.picks[partner] !== null && <b> Your partner has chosen.</b>}
        {map.mismatchStreak > 0 && <span className="crossed"> You disagreed {map.mismatchStreak}×.</span>}
      </p>
      <div className="map">
        {[...layers.keys()].sort((a, b) => a - b).map((layer) => (
          <div key={layer} className="maplayer">
            {layers.get(layer)!.map((n) => {
              const here = n.id === map.position;
              const can = pickable.includes(n.id);
              const myPick = map.picks[you] === n.id;
              const theirPick = map.picks[partner] === n.id;
              return (
                <button
                  key={n.id}
                  data-gp="META"
                  className={`mapnode ${here ? 'here' : ''} ${can ? 'can' : ''} ${myPick ? 'mypick' : ''}`}
                  style={theirPick ? { borderColor: PCOLOR[partner], borderStyle: 'dashed' } : undefined}
                  disabled={!can}
                  onClick={() => { audio.play('map_move'); net.act({ type: 'NODE_PICK', nodeId: n.id } as any); }}
                >
                  {NODE_ICON[n.kind]} {n.kind}{theirPick ? ' ◄' : ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <Log log={state.log} state={state} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Combat
// ---------------------------------------------------------------------------

const TELEGRAPH: Record<string, string> = {
  attack: 'tel-attack', attack_all: 'tel-attack', attack_momentum: 'tel-attack',
  attack_drain: 'tel-attack', attack_fray: 'tel-attack',
  block: 'tel-guard', block_all: 'tel-guard',
  buff_strength: 'tel-buff', buff_strength_all: 'tel-buff',
  debuff_weak: 'tel-debuff', debuff_vulnerable: 'tel-debuff', sever: 'tel-debuff',
};

function Combat({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const me = state.players[you];
  const combat = state.combat!;
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [pendingSever, setPendingSever] = useState(false);
  const [reclaimOpen, setReclaimOpen] = useState(false);

  const fired = useMemo(() => {
    try { return computeLinksFired(state, combat.chain); } catch { return combat.chain.map(() => false); }
  }, [state, combat.chain]);
  const resonance = useMemo(() => computeResonanceSlots(combat.chain, fired), [combat.chain, fired]);
  const severed = combat.severedTurns > 0;
  const anyFallen = state.players.p1.fallen || state.players.p2.fallen;
  // Pulse bookkeeping (§5 + M2-D4): the bonus lands on the recipient's FIRST
  // staged card (chain order) whose effective effects carry a primary number;
  // cards with nothing to boost are skipped. The UI shows the landing spot.
  const slotHasPrimary = (i: number): boolean => {
    const slot = combat.chain[i];
    const def = defFor(state, slot.owner, slot.cardInstanceId);
    const effects = fired[i] && def.link
      ? def.link.replace ? def.link.effects : [...def.base, ...def.link.effects]
      : def.base;
    return effects.some((e) => 'primary' in e && (e as { primary?: boolean }).primary);
  };
  const pulseBonus: Record<PlayerId, number> = { p1: 0, p2: 0 };
  for (const ta of combat.threadActions) {
    if (ta.kind !== 'pulse') continue;
    const recipient: PlayerId = ta.player === 'p1' ? 'p2' : 'p1';
    pulseBonus[recipient] += hasPassive(state.players[ta.player], 'pulsePlusOne') ? 4 : 3;
  }
  const pulseLanding: Record<string, number> = {};
  const pulseWaiting: PlayerId[] = [];
  for (const pid of ['p1', 'p2'] as PlayerId[]) {
    if (pulseBonus[pid] === 0) continue;
    const idx = combat.chain.findIndex((s, i) => s.owner === pid && slotHasPrimary(i));
    if (idx >= 0) pulseLanding[combat.chain[idx].cardInstanceId] = pulseBonus[pid];
    else pulseWaiting.push(pid);
  }
  const partnerHasPrimary = combat.chain.some((s, i) => s.owner === partner && slotHasPrimary(i));
  const cordMode = severed ? 'severed' : anyFallen ? 'slack' : 'normal';

  const stage = (cardId: string, targetId?: string) => {
    audio.play('card_place');
    net.act({ type: 'STAGE_CARD', cardInstanceId: cardId, slot: combat.chain.length, targetId } as any);
    setPendingCard(null);
  };

  const onHandClick = (cardId: string) => {
    const def = defFor(state, you, cardId);
    if (def.needsTarget) setPendingCard(pendingCard === cardId ? null : cardId);
    else stage(cardId);
  };

  const onEnemyClick = (enemyId: string) => {
    if (pendingSever) {
      net.act({ type: 'DECLARE_THREAD', kind: 'sever', targetId: enemyId } as any);
      setPendingSever(false);
    } else if (pendingCard) {
      stage(pendingCard, enemyId);
    }
  };

  return (
    <div className="combat">
      {severed && (
        <div className="severed" data-inspect="kw:severed_thread">
          THE THREAD IS SEVERED — {combat.severedTurns} turn{combat.severedTurns > 1 ? 's' : ''} remain. No Thread
          actions. Links do not cross between you.
        </div>
      )}
      <div className="enemies">
        {combat.enemies.map((e, i) => {
          const def = ENEMIES[e.defId];
          return (
            <div
              key={e.id}
              data-fxid={e.id}
              data-gp={e.hp > 0 && !e.untargetable ? 'ENEMIES' : undefined}
              data-inspect={`enemy:${e.defId}`}
              className={`enemy ${e.hp <= 0 ? 'dead' : ''} ${e.untargetable ? 'untargetable' : ''} ${pendingCard || pendingSever ? 'targetable' : ''} ${TELEGRAPH[e.intent.kind] ?? ''}`}
              style={{ borderColor: e.boundTo ? PCOLOR[e.boundTo] : 'var(--line)', animationDelay: `${(i * 0.7) % 2}s` }}
              onClick={() => e.hp > 0 && !e.untargetable && onEnemyClick(e.id)}
            >
              <Sigil id={e.defId} size={64} aura={def.elite || def.boss} className="enemy-sigil" />
              <div className="ename">{def.name}{def.elite ? ' ☠' : def.boss ? ' ♛' : ''}</div>
              <div className="hpbar"><div className="hpfill" style={{ width: `${(100 * e.hp) / e.maxHp}%` }} /></div>
              <div>{e.hp}/{e.maxHp}{e.block > 0 && <span className="chipblock"> 🛡{e.block}</span>}</div>
              {e.hex > 0 && (
                <div className="hexmotes" data-inspect="kw:hex">
                  {Array.from({ length: Math.min(e.hex, 9) }, (_, m) => (
                    <span key={m} className="mote" style={{ animationDelay: `${m * 0.35}s` }} />
                  ))}
                  {e.hex > 9 && <span className="motecount">{e.hex}</span>}
                </div>
              )}
              <div className="statuses">
                {e.weak > 0 && <span data-inspect="kw:weak">Weak {e.weak}</span>}
                {e.vulnerable > 0 && <span data-inspect="kw:vulnerable">Vuln {e.vulnerable}</span>}
                {e.stun > 0 && <span data-inspect="kw:stun">Stun {e.stun}</span>}
                {e.strength > 0 && <span>Str +{e.strength}</span>}
              </div>
              <div className="intent">{e.hp > 0 && intentText(e.intent, e.strength)}</div>
              <div className="bound" style={{ color: e.boundTo ? PCOLOR[e.boundTo] : 'var(--text-dim)' }} data-inspect="kw:bound">
                {e.untargetable ? 'unbound — untargetable' : e.boundTo ? `bound to ${state.players[e.boundTo].character}` : 'unbound'}
              </div>
            </div>
          );
        })}
      </div>

      {(pendingCard || pendingSever) && (
        <div className="hint">
          Pick an enemy to {pendingSever ? 'sever its binding' : 'target'}.
          <button className="chip" data-gp-action="cancel" onClick={() => { setPendingCard(null); setPendingSever(false); }}>cancel</button>
        </div>
      )}

      <ChainTrack state={state} fired={fired} resonance={resonance} net={net} pulseLanding={pulseLanding} />

      <ThreadCord value={state.thread} max={state.threadMax} mode={cordMode}
        left={state.players.p1.character} right={state.players.p2.character} />

      <div className="thread-bar">
        <button data-gp="THREAD" data-inspect="kw:pulse" disabled={me.ready || me.fallen || severed || anyFallen || !partnerHasPrimary}
          onClick={() => net.act({ type: 'DECLARE_THREAD', kind: 'pulse' } as any)}>
          Pulse (2)
        </button>
        <button data-gp="THREAD" data-inspect="kw:reclaim" disabled={me.ready || me.fallen || severed || anyFallen} onClick={() => setReclaimOpen(!reclaimOpen)}>Reclaim (2)…</button>
        <button data-gp="THREAD" data-inspect="kw:sever" disabled={me.ready || me.fallen || severed || anyFallen} onClick={() => setPendingSever(!pendingSever)}>Sever (3)…</button>
        <button data-gp="THREAD" data-inspect="kw:steady" disabled={me.ready || me.fallen || severed || anyFallen} onClick={() => net.act({ type: 'DECLARE_THREAD', kind: 'steady' } as any)}>Steady (1)</button>
        {pulseWaiting.length > 0 && (
          <span className="muted pulse-waiting">
            Pulse waits for {pulseWaiting.map((p) => state.players[p].character).join(' & ')}’s first boostable card
          </span>
        )}
        {combat.threadActions.length > 0 && (
          <span className="declared">
            {combat.threadActions.map((t, i) => (
              <button key={i} className="chip" data-gp="THREAD" style={{ color: PCOLOR[t.player] }}
                onClick={() => t.player === you && net.act({ type: 'UNDECLARE_THREAD', kind: t.kind } as any)}>
                {t.kind}{t.player === you ? ' ✕' : ''}
              </button>
            ))}
          </span>
        )}
      </div>

      {reclaimOpen && (
        <div className="panel">
          <b>Partner’s discard</b> <span className="muted">(Reclaims arrive mutated — inspect to preview)</span>{' '}
          {state.players[partner].discard.length === 0 && <i>empty</i>}
          {state.players[partner].discard.map((id) => (
            <button key={id} className="chip" data-gp="THREAD" data-inspect={`card:${inst(state, partner, id)!.defId}:mprev`}
              onClick={() => {
                net.act({ type: 'DECLARE_THREAD', kind: 'reclaim', targetId: id } as any);
                setReclaimOpen(false);
              }}>
              {defFor(state, partner, id).name}{CARDS[inst(state, partner, id)!.defId].mutation ? ' ◈' : ''}
            </button>
          ))}
        </div>
      )}

      <div className="players">
        {[you, partner].map((pid) => {
          const p = state.players[pid];
          return (
            <div key={pid} data-fxid={pid} className={`pstat ${p.fallen ? 'fallen' : ''}`} style={{ borderColor: PCOLOR[pid] }}>
              <b style={{ color: PCOLOR[pid] }}>{CHAR_NAME[p.character]}</b> {pid === you && '(you)'}
              {p.fallen && <b className="fray" data-inspect="kw:fallen"> — FALLEN</b>}
              <div>
                HP {p.hp}/{p.maxHp} · Block {p.block} · Energy {p.energy}
                {p.kindled > 0 && <span className="kindled" data-inspect="kw:kindled"> · Kindled {p.kindled}</span>}
                {p.momentum > 0 && <span data-inspect="kw:momentum"> · Momentum {p.momentum}</span>}
              </div>
              <div className="statuses">
                {p.statuses.frayed > 0 && <span className="fray" data-inspect="kw:frayed">Frayed {p.statuses.frayed}</span>}
                {p.statuses.weak > 0 && <span data-inspect="kw:weak">Weak {p.statuses.weak}</span>}
                {p.statuses.vulnerable > 0 && <span data-inspect="kw:vulnerable">Vuln {p.statuses.vulnerable}</span>}
                {p.powers.map((pw) => <span key={pw}>{POWERS[pw]?.name ?? pw}</span>)}
                {p.ready && <span className="ready">READY</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hand">
        {me.hand.map((id) => {
          const def = defFor(state, you, id);
          return (
            <Card key={id} def={def} echo={!!inst(state, you, id)?.echo}
              gpZone="HAND"
              inspect={inspectKeyFor(state, you, id)}
              selected={pendingCard === id}
              disabled={me.ready || me.fallen || def.cost > me.energy}
              onClick={() => !me.ready && !me.fallen && def.cost <= me.energy && onHandClick(id)} />
          );
        })}
        {me.hand.length === 0 && <i className="muted">{me.fallen ? 'you are fallen' : 'hand empty'}</i>}
      </div>

      <div className="actions">
        <button className="big" data-gp="META" data-gp-action="ready" disabled={me.fallen}
          onClick={() => { audio.play(you === 'p1' ? 'ready_p1' : 'ready_p2'); net.act({ type: 'SET_READY', ready: !me.ready } as any); }}>
          {me.ready ? 'Unready' : 'Ready'}
        </button>
        {state.players[partner].ready && !me.ready && <span className="nudge">your partner is ready</span>}
        <span className="muted">
          draw {state.counts[you].draw} · discard {me.discard.length} · partner hand {state.counts[partner].hand}
        </span>
      </div>

      <Log log={state.log} state={state} />
    </div>
  );
}

function ChainTrack({ state, fired, resonance, net, pulseLanding }: {
  state: ClientState; fired: boolean[]; resonance: Set<number>; net: Net; pulseLanding: Record<string, number>;
}): JSX.Element {
  const you = state.you;
  const chain = state.combat!.chain;
  return (
    <div className="chain">
      <div className="chain-label">THE CHAIN</div>
      {chain.length === 0 && <i className="muted">stage cards here — they resolve left to right</i>}
      {chain.map((slot, i) => {
        const def = defFor(state, slot.owner, slot.cardInstanceId);
        const mine = slot.owner === you;
        const target = slot.targetId ? state.combat!.enemies.find((e) => e.id === slot.targetId) : null;
        return (
          <React.Fragment key={slot.cardInstanceId}>
            {i > 0 && (
              // B4: link arcs between adjacent staged cards; pre-light when satisfied
              <div className={`arc ${fired[i] ? 'arc-on' : ''} ${resonance.has(i) ? 'arc-resonance' : ''}`} data-inspect="kw:link">
                <svg viewBox="0 0 40 24" width="40" height="24"><path d="M 2 22 Q 20 -8 38 22" fill="none" /></svg>
              </div>
            )}
            <div className={`chaincard ${fired[i] ? 'fires' : ''} ${resonance.has(i) ? 'resonates' : ''}`}
              style={{ borderColor: PCOLOR[slot.owner] }}>
              <div className="slotnum">{i + 1}</div>
              <Card def={def} small echo={!!inst(state, slot.owner, slot.cardInstanceId)?.echo}
                gpZone={mine ? 'CHAIN' : undefined}
                inspect={inspectKeyFor(state, slot.owner, slot.cardInstanceId)}
                onClick={() => mine && net.act({ type: 'UNSTAGE_CARD', cardInstanceId: slot.cardInstanceId } as any)} />
              {pulseLanding[slot.cardInstanceId] && (
                <div className="pulse-badge" data-inspect="kw:pulse">⊕ Pulse +{pulseLanding[slot.cardInstanceId]}</div>
              )}
              {target && <div className="target">→ {ENEMIES[target.defId].name}</div>}
              {def.link && <div className={`linkstate ${fired[i] ? 'on' : 'off'}`}>{fired[i] ? '⚡ fires' : `link: ${def.link.condition}`}</div>}
              {resonance.has(i) && <div className="resonance" data-inspect="kw:resonance">✦ RESONANCE</div>}
              {mine && (
                <div className="reorder">
                  <button data-gp-reorder="left" onClick={() => net.act({ type: 'REORDER', cardInstanceId: slot.cardInstanceId, slot: Math.max(0, i - 1) } as any)}>◀</button>
                  <button data-gp-reorder="right" onClick={() => net.act({ type: 'REORDER', cardInstanceId: slot.cardInstanceId, slot: Math.min(chain.length - 1, i + 1) } as any)}>▶</button>
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function Card({ def, onClick, small, selected, disabled, echo, gpZone, inspect }: {
  def: CardDef; onClick?: () => void; small?: boolean; selected?: boolean; disabled?: boolean; echo?: boolean;
  gpZone?: string; inspect?: string;
}): JSX.Element {
  return (
    <div
      className={`card tag-${def.tag} ${small ? 'small' : ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${echo ? 'echo' : ''}`}
      data-gp={!disabled && onClick ? gpZone : undefined}
      data-inspect={inspect ?? `card:${def.id}`}
      onClick={onClick}>
      <div className="cardtop"><span className="cost">{def.cost}</span> <span className="cname">{def.name}</span></div>
      <div className="ctag">{def.tag}{def.keep ? ' · Keep' : ''}{echo ? ' · Echo' : ''}</div>
      <div className="ctext">{def.text}</div>
      {def.link && <div className="clink"><b>Link ({def.link.condition}):</b> {def.link.text}</div>}
    </div>
  );
}

function intentText(intent: any, strength: number): string {
  const s = (n: number) => n + strength;
  switch (intent.kind) {
    case 'attack': return `⚔ ${s(intent.amount)}${intent.times ? `×${intent.times}` : ''}`;
    case 'attack_all': return `⚔ ${s(intent.amount)} BOTH`;
    case 'attack_momentum': return `⚔ ${s(intent.base)} + 2×your Momentum`;
    case 'attack_drain': return `⚔ ${s(intent.amount)} & drains ${intent.threadDrain} Thread`;
    case 'attack_fray': return `⚔ ${s(intent.amount)} & FRAYS`;
    case 'block': return `🛡 ${intent.amount}`;
    case 'block_all': return `🛡 ${intent.amount} ALL`;
    case 'buff_strength': return `↑ Str ${intent.amount}`;
    case 'buff_strength_all': return `↑ Str ${intent.amount} ALL`;
    case 'debuff_weak': return `☁ Weak ${intent.amount}`;
    case 'debuff_vulnerable': return `☁ Vuln ${intent.amount}`;
    case 'sever': return '✂ moves its tether';
    default: return '?';
  }
}

// ---------------------------------------------------------------------------
// Reward / Event / Rest / Shop (zones: everything META; cards inspectable)
// ---------------------------------------------------------------------------

function Reward({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const r = state.reward!;
  const me = state.players[you];
  const treasureOnly = r.sets.p1.length === 0 && r.sets.p2.length === 0;
  return (
    <div className="center">
      <h2>Spoils</h2>
      <p className="muted">
        +{r.gold} gold{r.relic && <> · relic: <b data-inspect={`relic:${r.relic}`}>{RELICS_BY_ID[r.relic]?.name}</b></>}
      </p>
      {!treasureOnly && (
        <>
          <p className="muted" data-inspect="kw:covet">Pick from your own set — or skip and Covet. Charges: {me.covetCharges}</p>
          <div className="reward-row">
            {[you, partner].map((pid) => (
              <div key={pid} className="panel" style={{ borderColor: PCOLOR[pid] }}>
                <h3 style={{ color: PCOLOR[pid] }}>{pid === you ? 'Your rewards' : 'Partner’s rewards'}</h3>
                <div className="hand">
                  {r.sets[pid].map((defId) => {
                    const taken = r.picked[pid] === defId || r.coveted[you === pid ? partner : you] === defId;
                    const canPick = pid === you && r.picked[you] === null;
                    const canCovet = pid === partner && r.picked[partner] !== null && r.coveted[you] === null
                      && r.picked[partner] !== defId && me.covetCharges > 0;
                    return (
                      <div key={defId} className={taken ? 'taken' : ''}>
                        <Card def={CARDS[defId]} gpZone={canPick || canCovet ? 'META' : undefined}
                          onClick={() => {
                            if (canPick) { audio.play('purchase'); net.act({ type: 'REWARD_PICK', pick: defId } as any); }
                            else if (canCovet) { audio.play('covet'); net.act({ type: 'COVET_PICK', pick: defId } as any); }
                          }} />
                        {taken && <div className="muted">taken</div>}
                      </div>
                    );
                  })}
                </div>
                {pid === you && r.picked[you] === null && (
                  <button data-gp="META" onClick={() => net.act({ type: 'REWARD_PICK', pick: 'skip' } as any)}>Skip</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <div>
        {!treasureOnly && r.picked[you] !== null && r.coveted[you] === null && me.covetCharges > 0 && r.picked[partner] !== null && (
          <button data-gp="META" onClick={() => net.act({ type: 'COVET_PICK', pick: 'pass' } as any)}>Pass on Coveting</button>
        )}{' '}
        <button className="big" data-gp="META" disabled={(!treasureOnly && (r.picked.p1 === null || r.picked.p2 === null)) || state.advanceReady[you]}
          onClick={() => net.act({ type: 'ADVANCE' } as any)}>
          {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
        </button>
      </div>
      <Log log={state.log} state={state} />
    </div>
  );
}

function EventView({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const ev = state.event!;
  const def = EVENTS[ev.eventId];
  const youChoose = ev.chooser === you;
  return (
    <div className="center event">
      <h2>{def.name}</h2>
      <p className="prose">{def.prose}</p>
      {def.crossed && (
        <p className="crossed">
          Crossed choice: <b style={{ color: PCOLOR[ev.chooser] }}>{state.players[ev.chooser].character}</b> decides
          for <b style={{ color: PCOLOR[ev.subject] }}>{state.players[ev.subject].character}</b>.
          {youChoose ? ' The choice is yours.' : ' Your fate is in their hands.'}
        </p>
      )}
      {ev.chosen === null ? (
        youChoose ? (
          def.options.map((o) => (
            <button key={o.id} className="big" data-gp="META" onClick={() => net.act({ type: 'EVENT_CHOOSE', optionId: o.id } as any)}>
              {o.label}
            </button>
          ))
        ) : (
          <p className="muted">Waiting for {state.players[ev.chooser].character} to choose…</p>
        )
      ) : (
        <>
          <p className="prose">{ev.resultText}</p>
          <Log log={state.log} state={state} />
          <button className="big" data-gp="META" disabled={state.advanceReady[you]} onClick={() => net.act({ type: 'ADVANCE' } as any)}>
            {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
          </button>
        </>
      )}
    </div>
  );
}

function Rest({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const rest = state.rest!;
  const me = state.players[you];
  const chosen = rest.chosen[you];
  const hasKnife = state.players.p1.relics.includes('wedding_knife') || state.players.p2.relics.includes('wedding_knife');
  const needUpgradePick = chosen === 'upgrade' && !rest.upgradePicked[you];
  return (
    <div className="center">
      <h2>Rest Site</h2>
      <Log log={state.log} state={state} />
      {chosen === null ? (
        <>
          <button className="big" data-gp="META" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'rest' } as any)}>Rest (heal 30%)</button>
          <button className="big" data-gp="META" data-inspect="kw:upgrade" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'upgrade' } as any)}>Upgrade a card</button>
          <button className="big" data-gp="META" data-inspect="kw:covet" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'barter' } as any)}>Barter (+1 Covet charge)</button>
          <button className="big" data-gp="META" disabled={state.rebraidUsed} onClick={() => net.act({ type: 'REST_CHOOSE', option: 'rebraid' } as any)}>
            Re-braid (+1 max Thread, once per run)
          </button>
        </>
      ) : needUpgradePick ? (
        <>
          <p>Choose a card — upgrades tighten the weave (inspect for the preview):</p>
          <div className="hand">
            {me.deck.filter((c) => !c.upgraded && CARDS[c.defId].upgrade).map((c) => (
              <Card key={c.instanceId} def={CARDS[c.defId]} small gpZone="META" inspect={`card:${c.defId}:uprev`}
                onClick={() => net.act({ type: 'UPGRADE_PICK', cardInstanceId: c.instanceId } as any)} />
            ))}
          </div>
        </>
      ) : (
        <>
          <p>You chose: <b>{chosen}</b>. Partner: <b>{rest.chosen[partner] ?? '…deciding'}</b></p>
          <button className="big" data-gp="META" disabled={state.advanceReady[you]} onClick={() => net.act({ type: 'ADVANCE' } as any)}>
            {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
          </button>
        </>
      )}
      {hasKnife && chosen !== null && !needUpgradePick && <Wedding state={state} net={net} />}
    </div>
  );
}

function Wedding({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const w = state.rest!.wedding;
  const me = state.players[you];
  const [open, setOpen] = useState(false);
  if (w?.done) return <p className="crossed">The Wedding Knife has cut. The trade is sealed.</p>;
  return (
    <div className="panel">
      <h3 data-inspect="relic:wedding_knife">The Wedding Knife</h3>
      <p className="muted">Once per rest site: permanently trade one card each. Both must confirm.</p>
      {!open && !w && <button data-gp="META" onClick={() => setOpen(true)}>Offer a trade…</button>}
      {(open || w) && (
        <>
          <div>
            Your offer: <b>{w?.offers[you] ? CARDS[inst(state, you, w.offers[you]!)!.defId].name : '—'}</b>
            {' · '}Partner’s: <b>{w?.offers[partner] ? CARDS[inst(state, partner, w.offers[partner]!)!.defId].name : '—'}</b>
          </div>
          <div className="hand">
            {me.deck.filter((c) => !CARDS[c.defId].starterOnly).map((c) => (
              <Card key={c.instanceId} def={CARDS[c.defId]} small gpZone="META" selected={w?.offers[you] === c.instanceId}
                onClick={() => net.act({ type: 'WEDDING_PICK', cardInstanceId: c.instanceId } as any)} />
            ))}
          </div>
          {w?.offers.p1 && w?.offers.p2 && (
            <button className="big" data-gp="META" disabled={w.confirmed[you]} onClick={() => net.act({ type: 'WEDDING_CONFIRM' } as any)}>
              {w.confirmed[you] ? 'waiting for partner to confirm…' : 'Confirm the trade (permanent)'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function Shop({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const shop = state.shop!;
  const me = state.players[you];
  const [removing, setRemoving] = useState<string | null>(null);
  return (
    <div className="center">
      <h2>Shop</h2>
      <p className="muted">Shared gold: <b>{state.gold}</b>. One purse between you — discuss.</p>
      <Log log={state.log} state={state} />
      <div className="reward-row">
        {(['p1', 'p2'] as PlayerId[]).map((pid) => (
          <div key={pid} className="panel" style={{ borderColor: PCOLOR[pid] }}>
            <h3 style={{ color: PCOLOR[pid] }}>{state.players[pid].character}’s cards</h3>
            <div className="hand">
              {shop.items.filter((i) => i.kind === 'card' && i.forPlayer === pid).map((item) => (
                <div key={item.id} className={item.sold ? 'taken' : ''}>
                  <Card def={CARDS[item.refId!]} small
                    gpZone={!item.sold && pid === you && item.price <= state.gold ? 'META' : undefined}
                    disabled={item.sold || item.price > state.gold || pid !== you}
                    onClick={() => {
                      if (!item.sold && pid === you) { audio.play('purchase'); net.act({ type: 'SHOP_BUY', itemId: item.id } as any); }
                    }} />
                  <div className={item.price > state.gold ? 'muted' : ''}>{item.sold ? 'sold' : `${item.price}g`}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="panel">
        <h3>Relics & services</h3>
        {shop.items.filter((i) => i.kind === 'relic').map((item) => (
          <div key={item.id} className={item.sold ? 'taken' : ''}>
            <button data-gp="META" data-inspect={`relic:${item.refId}`} disabled={item.sold || item.price > state.gold}
              onClick={() => { audio.play('purchase'); net.act({ type: 'SHOP_BUY', itemId: item.id } as any); }}>
              {RELICS_BY_ID[item.refId!]?.name} — {item.sold ? 'sold' : `${item.price}g`}
            </button>
            <span className="muted"> {RELICS_BY_ID[item.refId!]?.text}</span>
          </div>
        ))}
        {shop.items.filter((i) => i.kind === 'removal').map((item) => (
          <div key={item.id}>
            <button data-gp="META" disabled={item.sold || item.price > state.gold}
              onClick={() => setRemoving(removing === item.id ? null : item.id)}>
              Remove a card — {item.sold ? 'used' : `${item.price}g`}
            </button>
          </div>
        ))}
        {removing && (
          <div className="hand">
            {me.deck.map((c) => (
              <Card key={c.instanceId} def={CARDS[c.defId]} small gpZone="META"
                onClick={() => {
                  net.act({ type: 'SHOP_REMOVE', itemId: removing, cardInstanceId: c.instanceId } as any);
                  setRemoving(null);
                }} />
            ))}
          </div>
        )}
      </div>
      <button className="big" data-gp="META" disabled={state.advanceReady[you]} onClick={() => net.act({ type: 'ADVANCE' } as any)}>
        {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Log({ log, state }: { log: GameEvent[]; state: ClientState }): JSX.Element {
  if (!log || log.length === 0) return <></>;
  return (
    <div className="log">
      {log.map((e, i) => (
        <div key={i} className={e.e === 'witness' ? 'witness' : e.e === 'resonance_ignite' ? 'resonance' : ''}>
          {renderEvent(e, state)}
        </div>
      ))}
    </div>
  );
}

function renderEvent(e: GameEvent, state: ClientState): string {
  const pname = (p: PlayerId) => state.players[p].character;
  const ename = (id: string) => {
    const en = state.combat?.enemies.find((x) => x.id === id);
    return en ? ENEMIES[en.defId].name : id;
  };
  switch (e.e) {
    case 'witness': return `THE WITNESS: “${e.line}”`;
    case 'card': return `[${e.slot + 1}] ${pname(e.player)} plays ${e.card}${e.linkFired ? ' ⚡' : ''}${e.resonance ? ' ✦' : ''}`;
    case 'damage': return `  → ${ename(e.target)} loses ${e.hpLoss} HP${e.blocked ? ` (${e.blocked} blocked)` : ''}`;
    case 'detonate': return `  ✸ ${ename(e.target)}: ${e.stacks} Hex detonate for ${e.damage}`;
    case 'hex': return `  ☠ ${ename(e.target)} +${e.amount} Hex`;
    case 'block': return `  🛡 ${e.target === 'p1' || e.target === 'p2' ? pname(e.target as PlayerId) : ename(e.target)} +${e.amount} Block`;
    case 'enemy_action': return `${ename(e.enemy)} ${e.detail}`;
    case 'enemy_dead': return `${ename(e.enemy)} is destroyed.`;
    case 'player_hit': return `${pname(e.player)} loses ${e.hpLoss} HP${e.blocked ? ` (${e.blocked} blocked)` : ''}.`;
    case 'fallen': return `${pname(e.player)} has FALLEN. The Thread goes slack.`;
    case 'revived': return `${pname(e.player)} is carried out and revives at 1 HP.`;
    case 'thread_severed': return `THE THREAD IS SEVERED for ${e.turns} turns.`;
    case 'thread_reignited': return 'THE THREAD REIGNITES at full strength.';
    case 'thread_action': return `${pname(e.player)} uses ${e.kind}.`;
    case 'fray': return 'The Thread FRAYS — you both pay for it.';
    case 'resonance_ignite': return `✦ RESONANCE — [${e.tags.join(' → ')}]`;
    case 'relic': return `${pname(e.player)} claims a relic: ${RELICS_BY_ID[e.relic]?.name ?? e.relic}.`;
    case 'info': return e.detail;
    default: return JSON.stringify(e);
  }
}
