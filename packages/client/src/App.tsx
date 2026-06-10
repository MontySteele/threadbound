// Threadbound client (§10/§11): functional M1 UI. Renders server state and
// sends intents; all game rules live in the engine on the server.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CARDS, EVENTS, ENEMIES, CardDef, CardInstance, GameEvent, PlayerId,
  computeLinksFired, computeResonanceSlots, effectiveDef,
} from '@threadbound/engine';
import { ClientState, Net } from './net';

type Character = 'vess' | 'bram';
const CHAR_NAME: Record<string, string> = { vess: 'Vess, the Hexweaver', bram: 'Bram, the Cinderfist' };
const PCOLOR: Record<PlayerId, string> = { p1: '#7fd4ff', p2: '#ffb070' };

function inst(state: ClientState, owner: PlayerId, id: string): CardInstance | undefined {
  const p = state.players[owner];
  return p.deck.find((c) => c.instanceId === id) ?? p.combatCards.find((c) => c.instanceId === id);
}

function defFor(state: ClientState, owner: PlayerId, id: string): CardDef {
  const i = inst(state, owner, id);
  return i ? effectiveDef(i) : ({ name: '?', text: '', cost: 0, tag: 'Strike' } as unknown as CardDef);
}

// ---------------------------------------------------------------------------

export default function App(): JSX.Element {
  const [state, setState] = useState<ClientState | null>(null);
  const [joined, setJoined] = useState<{ code: string; playerId: PlayerId; character: string } | null>(null);
  const [error, setError] = useState('');
  const [partnerOn, setPartnerOn] = useState(false);
  const [connected, setConnected] = useState(false);
  const netRef = useRef<Net | null>(null);

  useEffect(() => {
    netRef.current = new Net({
      onState: setState,
      onJoined: (info) => setJoined(info),
      onError: (m) => { setError(m); setTimeout(() => setError(''), 4000); },
      onPresence: setPartnerOn,
      onConnection: setConnected,
    });
  }, []);
  const net = netRef.current;

  if (!net || !connected) return <div className="center">Connecting…</div>;
  if (!joined || !state) return <Home net={net} error={error} />;

  return (
    <div className="app">
      <header>
        <span className="title">THREADBOUND</span>
        <span>room <b>{joined.code}</b> · you are <b style={{ color: PCOLOR[state.you] }}>{CHAR_NAME[state.players[state.you].character]}</b></span>
        <span className={partnerOn ? 'on' : 'off'}>{partnerOn ? 'partner connected' : 'partner disconnected'}</span>
      </header>
      {error && <div className="error">{error}</div>}
      <Phase state={state} net={net} partnerOn={partnerOn} />
    </div>
  );
}

function Home({ net, error }: { net: Net; error: string }): JSX.Element {
  const [code, setCode] = useState('');
  const [character, setCharacter] = useState<Character>('vess');
  return (
    <div className="center home">
      <h1>THREADBOUND</h1>
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
        <button onClick={() => net.create(character)}>Create room</button>
      </div>
      <div className="panel">
        <h3>Join a room</h3>
        <input
          placeholder="5-letter code"
          value={code}
          maxLength={5}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <button onClick={() => net.join(code)}>Join</button>
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
          {partnerOn && <button className="big" onClick={() => net.start()}>Begin the descent</button>}
        </div>
      );
    case 'combat':
      return <Combat state={state} net={net} />;
    case 'reward':
      return <Reward state={state} net={net} />;
    case 'event':
      return <EventView state={state} net={net} />;
    case 'rest':
      return <Rest state={state} net={net} />;
    case 'victory':
      return (
        <div className="center">
          <h2>The first third of the Undercroft is behind you.</h2>
          <p className="witness">“Don’t celebrate. It gets worse from here. It always gets worse.”</p>
          <Log log={state.log} state={state} />
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
// Combat (§2, §5, §6, §10)
// ---------------------------------------------------------------------------

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

  const stage = (cardId: string, targetId?: string) => {
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
      <div className="enemies">
        {combat.enemies.map((e) => (
          <div
            key={e.id}
            className={`enemy ${e.hp <= 0 ? 'dead' : ''} ${pendingCard || pendingSever ? 'targetable' : ''}`}
            style={{ borderColor: PCOLOR[e.boundTo] }}
            onClick={() => e.hp > 0 && onEnemyClick(e.id)}
            title={ENEMIES[e.defId].flavor}
          >
            <div className="ename">{ENEMIES[e.defId].name}</div>
            <div>HP {e.hp}/{e.maxHp}{e.block > 0 && ` 🛡${e.block}`}</div>
            <div className="statuses">
              {e.hex > 0 && <span className="hex">Hex {e.hex}</span>}
              {e.weak > 0 && <span>Weak {e.weak}</span>}
              {e.vulnerable > 0 && <span>Vuln {e.vulnerable}</span>}
              {e.strength > 0 && <span>Str +{e.strength}</span>}
            </div>
            <div className="intent">{e.hp > 0 && intentText(e.intent, e.strength)}</div>
            <div className="bound" style={{ color: PCOLOR[e.boundTo] }}>
              bound to {state.players[e.boundTo].character}
            </div>
          </div>
        ))}
      </div>

      {(pendingCard || pendingSever) && (
        <div className="hint">Click an enemy to {pendingSever ? 'sever its binding' : 'target'} (or click the card again to cancel).</div>
      )}

      <ChainTrack state={state} fired={fired} resonance={resonance} net={net} />

      <div className="thread-bar">
        <span className="thread">THREAD {state.thread}/{state.threadMax}</span>
        <button disabled={me.ready} onClick={() => net.act({ type: 'DECLARE_THREAD', kind: 'pulse' } as any)}>Pulse (2): partner’s next card +3</button>
        <button disabled={me.ready} onClick={() => setReclaimOpen(!reclaimOpen)}>Reclaim (2): copy from partner’s discard…</button>
        <button disabled={me.ready} onClick={() => setPendingSever(!pendingSever)}>Sever Binding (3): pick enemy…</button>
        <button disabled={me.ready} onClick={() => net.act({ type: 'DECLARE_THREAD', kind: 'steady' } as any)}>Steady (1): soothe a Fray</button>
        {combat.threadActions.length > 0 && (
          <span className="declared">
            declared: {combat.threadActions.map((t, i) => (
              <button key={i} className="chip" style={{ color: PCOLOR[t.player] }}
                onClick={() => t.player === you && net.act({ type: 'UNDECLARE_THREAD', kind: t.kind } as any)}>
                {t.kind}{t.player === you ? ' ✕' : ''}
              </button>
            ))}
          </span>
        )}
      </div>

      {reclaimOpen && (
        <div className="panel">
          <b>Partner’s discard:</b>{' '}
          {state.players[partner].discard.length === 0 && <i>empty</i>}
          {state.players[partner].discard.map((id) => (
            <button key={id} className="chip" onClick={() => {
              net.act({ type: 'DECLARE_THREAD', kind: 'reclaim', targetId: id } as any);
              setReclaimOpen(false);
            }}>
              {defFor(state, partner, id).name}{CARDS[inst(state, partner, id)!.defId].mutation ? ' (mutates)' : ''}
            </button>
          ))}
        </div>
      )}

      <div className="players">
        {[you, partner].map((pid) => {
          const p = state.players[pid];
          return (
            <div key={pid} className="pstat" style={{ borderColor: PCOLOR[pid] }}>
              <b style={{ color: PCOLOR[pid] }}>{CHAR_NAME[p.character]}</b> {pid === you && '(you)'}
              <div>HP {p.hp}/{p.maxHp} · Block {p.block} · Energy {p.energy} {p.momentum > 0 && `· Momentum ${p.momentum}`}</div>
              <div className="statuses">
                {p.statuses.frayed > 0 && <span className="fray">Frayed {p.statuses.frayed}</span>}
                {p.statuses.weak > 0 && <span>Weak {p.statuses.weak}</span>}
                {p.powers.map((pw) => <span key={pw}>{CARDS[pw === 'black_lattice' ? 'black_lattice' : pw]?.name ?? pw}</span>)}
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
              selected={pendingCard === id}
              disabled={me.ready || def.cost > me.energy}
              onClick={() => !me.ready && def.cost <= me.energy && onHandClick(id)} />
          );
        })}
        {me.hand.length === 0 && <i className="muted">hand empty</i>}
      </div>

      <div className="actions">
        <button className="big" onClick={() => net.act({ type: 'SET_READY', ready: !me.ready } as any)}>
          {me.ready ? 'Unready' : 'Ready'}
        </button>
        {state.players[partner].ready && !me.ready && <span className="nudge">your partner is ready</span>}
        <span className="muted">draw {state.counts[you].draw} · discard {me.discard.length} · partner hand {state.counts[partner].hand}</span>
      </div>

      <Log log={state.log} state={state} />
    </div>
  );
}

function ChainTrack({ state, fired, resonance, net }: {
  state: ClientState; fired: boolean[]; resonance: Set<number>; net: Net;
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
        return (
          <div key={slot.cardInstanceId} className={`chaincard ${fired[i] ? 'fires' : ''} ${resonance.has(i) ? 'resonates' : ''}`}
            style={{ borderColor: PCOLOR[slot.owner] }}>
            <div className="slotnum">{i + 1}</div>
            <Card def={def} small echo={!!inst(state, slot.owner, slot.cardInstanceId)?.echo}
              onClick={() => mine && net.act({ type: 'UNSTAGE_CARD', cardInstanceId: slot.cardInstanceId } as any)} />
            {slot.targetId && <div className="target">→ {ENEMIES[state.combat!.enemies.find((e) => e.id === slot.targetId)!.defId].name}</div>}
            {def.link && <div className={`linkstate ${fired[i] ? 'on' : 'off'}`}>{fired[i] ? '⚡ link fires' : `link: ${def.link.condition}`}</div>}
            {resonance.has(i) && <div className="resonance">✦ RESONANCE +50%</div>}
            {mine && (
              <div className="reorder">
                <button onClick={() => net.act({ type: 'REORDER', cardInstanceId: slot.cardInstanceId, slot: Math.max(0, i - 1) } as any)}>◀</button>
                <button onClick={() => net.act({ type: 'REORDER', cardInstanceId: slot.cardInstanceId, slot: Math.min(chain.length - 1, i + 1) } as any)}>▶</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Card({ def, onClick, small, selected, disabled, echo }: {
  def: CardDef; onClick?: () => void; small?: boolean; selected?: boolean; disabled?: boolean; echo?: boolean;
}): JSX.Element {
  return (
    <div className={`card tag-${def.tag} ${small ? 'small' : ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${echo ? 'echo' : ''}`}
      onClick={onClick}>
      <div className="cardtop"><span className="cost">{def.cost}</span> <span className="cname">{def.name}</span></div>
      <div className="ctag">{def.tag}{echo ? ' · Echo' : ''}</div>
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
    case 'block': return `🛡 ${intent.amount}`;
    case 'buff_strength': return `↑ Strength ${intent.amount}`;
    case 'debuff_weak': return `☁ Weak ${intent.amount}`;
    default: return '?';
  }
}

// ---------------------------------------------------------------------------
// Reward / Covet (§8)
// ---------------------------------------------------------------------------

function Reward({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const r = state.reward!;
  const me = state.players[you];
  return (
    <div className="center">
      <h2>Spoils</h2>
      <p className="muted">Pick from your own set — or skip and Covet what your partner passes over. Covet charges: {me.covetCharges}</p>
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
                    <Card def={CARDS[defId]}
                      onClick={() => {
                        if (canPick) net.act({ type: 'REWARD_PICK', pick: defId } as any);
                        else if (canCovet) net.act({ type: 'COVET_PICK', pick: defId } as any);
                      }} />
                    {taken && <div className="muted">taken</div>}
                  </div>
                );
              })}
            </div>
            {pid === you && r.picked[you] === null && (
              <button onClick={() => net.act({ type: 'REWARD_PICK', pick: 'skip' } as any)}>Skip</button>
            )}
          </div>
        ))}
      </div>
      <div>
        {r.picked[you] !== null && r.coveted[you] === null && me.covetCharges > 0 && r.picked[partner] !== null && (
          <button onClick={() => net.act({ type: 'COVET_PICK', pick: 'pass' } as any)}>Pass on Coveting</button>
        )}{' '}
        <button className="big" disabled={r.picked.p1 === null || r.picked.p2 === null || state.advanceReady[you]}
          onClick={() => net.act({ type: 'ADVANCE' } as any)}>
          {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
        </button>
      </div>
      <Log log={state.log} state={state} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Events (§8) & Rest
// ---------------------------------------------------------------------------

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
          what happens to <b style={{ color: PCOLOR[ev.subject] }}>{state.players[ev.subject].character}</b>.
          {youChoose ? ' The choice is yours.' : ' Your fate is in their hands.'}
        </p>
      )}
      {ev.chosen === null ? (
        youChoose ? (
          def.options.map((o) => (
            <button key={o.id} className="big" onClick={() => net.act({ type: 'EVENT_CHOOSE', optionId: o.id } as any)}>
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
          <button className="big" disabled={state.advanceReady[you]} onClick={() => net.act({ type: 'ADVANCE' } as any)}>
            {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
          </button>
        </>
      )}
    </div>
  );
}

function Rest({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const rest = state.rest!;
  const chosen = rest.chosen[you];
  return (
    <div className="center">
      <h2>Rest Site</h2>
      <Log log={state.log} state={state} />
      {chosen === null ? (
        <>
          <button className="big" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'rest' } as any)}>Rest (heal 30%)</button>
          <button className="big" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'barter' } as any)}>Barter (gain 1 Covet charge)</button>
          <button className="big" disabled={state.rebraidUsed} onClick={() => net.act({ type: 'REST_CHOOSE', option: 'rebraid' } as any)}>
            Re-braid (+1 max Thread, once per run)
          </button>
        </>
      ) : (
        <>
          <p>You chose: <b>{chosen}</b>. Partner: <b>{rest.chosen[you === 'p1' ? 'p2' : 'p1'] ?? '…deciding'}</b></p>
          <button className="big" disabled={state.advanceReady[you]} onClick={() => net.act({ type: 'ADVANCE' } as any)}>
            {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
          </button>
        </>
      )}
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
    case 'damage': return `  → ${ename(e.target)} takes ${e.amount}`;
    case 'detonate': return `  ✸ ${ename(e.target)}: ${e.stacks} Hex detonate for ${e.damage}`;
    case 'hex': return `  ☠ ${ename(e.target)} +${e.amount} Hex`;
    case 'block': return `  🛡 ${e.target === 'p1' || e.target === 'p2' ? pname(e.target as PlayerId) : ename(e.target)} +${e.amount} Block`;
    case 'enemy_action': return `${ename(e.enemy)} ${e.detail}`;
    case 'enemy_dead': return `${ename(e.enemy)} is destroyed.`;
    case 'player_hit': return `${pname(e.player)} takes ${e.amount}.`;
    case 'thread_action': return `${pname(e.player)} uses ${e.kind}.`;
    case 'fray': return 'The Thread FRAYS — you both pay for it.';
    case 'resonance_ignite': return `✦ RESONANCE — the thread ignites through [${e.tags.join(' → ')}]`;
    case 'info': return e.detail;
    default: return JSON.stringify(e);
  }
}
