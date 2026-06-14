// Threadbound client — M3: controller-first (B1), tooltips (B2), thread cord
// (B3), chain choreography (B4), enemy presence (B5), sigil art (B6),
// procedural audio (C), tutorial (D). Renders state, sends intents (§11).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CARDS, EVENTS, ENEMIES, RELICS_BY_ID, POWERS, WITNESS_POOLS, CardDef, CardInstance, GameEvent, MapNode, PlayerId,
  ASCENSION_MAX, ASCENSION_RUNGS, ascensionMods,
  computeForcedLinks, computeLinksFired, computePlannedBlock, computeResonanceSlots, effectiveDef, hasPassive, removalPrice,
} from '@threadbound/engine';
import { ClientState, Net } from './net';
import { exportProfile, importProfile, loadProfile, mergeProfiles, recordClear, saveProfile } from './profile';
import { GLYPH } from './keywords';
import { controller, GLYPHS } from './gamepad';
import { audio } from './sfx';
import { Sigil, CharacterSigil } from './sigils';
import { InspectPanel, inspectElement, previewInspect } from './Tooltip';
import { ThreadCord } from './ThreadCord';
import { ResolutionTheater, isResolution } from './Theater';
import { StyleScreen } from './StyleScreen';
import { Tutorial } from './Tutorial';
import { DeckOverlay } from './DeckOverlay';
import { RunSummary } from './Summary';
import { Hints } from './Hints';

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

// The game wants the whole screen. Browsers only grant fullscreen from a
// user gesture, so this rides the room-entry / descent clicks (and ⛶ / f).
function goFullscreen(): void {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
}

function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else goFullscreen();
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
  // resolution logs get their own slot: React coalesces rapid broadcasts, and
  // the bot's (or partner's) next staging states arrive instantly after a
  // resolution — keyed off state.log alone, the theater could miss it entirely
  const [resolutionLog, setResolutionLog] = useState<GameEvent[]>([]);
  const [joined, setJoined] = useState<{ code: string; playerId: PlayerId; character: string } | null>(null);
  const [error, setError] = useState('');
  const [partnerOn, setPartnerOn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [, padTick] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  const [concedeOpen, setConcedeOpen] = useState(false);
  const [toast, setToast] = useState('');
  const netRef = useRef<Net | null>(null);

  useEffect(() => {
    netRef.current = new Net({
      onState: (s) => {
        setState(s);
        if (s.log?.length && isResolution(s.log)) setResolutionLog(s.log);
      },
      onJoined: (info) => setJoined(info),
      onError: (m) => { setError(m); setTimeout(() => setError(''), 4000); },
      onPresence: setPartnerOn,
      onConnection: setConnected,
      onFeedbackAck: (mood) => {
        setToast(`stamped: felt ${mood === 'note' ? 'noted' : mood}`);
        setTimeout(() => setToast(''), 1600);
      },
    });
    controller.onChange = () => padTick((n) => n + 1);
    controller.onInspect = (el) => inspectElement(el);
    controller.onFocusInspect = (el) => previewInspect(el); // pad focus = hover
    controller.onFeedback = () => setFeedbackOpen(true);
    // playtest feedback hotkeys: [ felt bad, ] felt good, \ note (M3 review)
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA') return;
      if (e.key === 'd') setDeckOpen((o) => !o);
      else if (e.key === 'f') toggleFullscreen();
      else if (e.key === '[') netRef.current?.feedback('bad');
      else if (e.key === ']') netRef.current?.feedback('good');
      else if (e.key === '\\') {
        const note = window.prompt('Playtest note:');
        if (note) netRef.current?.feedback('note', note);
      }
    };
    window.addEventListener('keydown', onKey);
    controller.start();
    // NOT once: a pad-only session creates the context suspended (gamepad
    // input is no "user activation"), so later real gestures must retry resume
    const nudge = () => audio.nudge();
    window.addEventListener('pointerdown', nudge);
    window.addEventListener('keydown', nudge);
    window.addEventListener('gp-input', nudge);
    const refocus = setInterval(() => controller.ensureFocus(), 400);
    return () => {
      controller.stop();
      clearInterval(refocus);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', nudge);
      window.removeEventListener('keydown', nudge);
      window.removeEventListener('gp-input', nudge);
    };
  }, []);

  useEffect(() => {
    audio.setAmbient(state && state.phase !== 'lobby' ? state.map.act : 0);
  }, [state?.map.act, state?.phase]);

  // S4.5: bank the clear into the browser profile — once per run (room+seed
  // key), for the seat this browser holds. The partner's browser banks its
  // own seat; that's how credit accrues to BOTH profiles (union rule).
  useEffect(() => {
    if (state?.phase === 'victory' && joined) {
      const dedup = `tb_cleared_${joined.code}_${state.seed}`;
      if (!localStorage.getItem(dedup)) {
        localStorage.setItem(dedup, '1');
        recordClear(state.players[state.you].character, state.ascension ?? 0);
      }
    }
  }, [state?.phase, joined?.code]);

  // S2.2: per-act CSS atmosphere — class on <body>, tokens do the rest
  useEffect(() => {
    const act = state && state.phase !== 'lobby' ? state.map.act : 0;
    document.body.classList.remove('act-1', 'act-2', 'act-3');
    if (act) document.body.classList.add(`act-${act}`);
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
              {state.phase !== 'lobby' && (
                <button className="chip" data-gp="META" data-gp-action="overview" onClick={() => setDeckOpen(!deckOpen)}>
                  {/* PT2: deck SIZE in view at all times (removal decisions) */}
                  Deck (d) · {state.players[state.you].deck.length}
                </button>
              )}
              {!['lobby', 'game_over', 'victory'].includes(state.phase) && (
                <button className="chip" data-gp="META" onClick={() => setConcedeOpen(!concedeOpen)}>
                  abandon…
                </button>
              )}
              <button className="chip" data-gp="META" title="fullscreen (f)" onClick={toggleFullscreen}>⛶</button>
              <Settings net={net} solo={!!state.botSeat} />
              <span className={partnerOn ? 'on' : 'off'}>
                {state.botSeat ? '● the Witness' : partnerOn ? '● partner' : '○ partner'}
              </span>
            </span>
          </header>
          <RelicBar state={state} />
          {error && <div className="error">{error}</div>}
          <Phase state={state} net={net} partnerOn={partnerOn} />
          <ResolutionTheater log={resolutionLog} pname={(p) => state.players[p].character} />
          <Tutorial state={state} />
          <Hints state={state} />
          <HintBar />
          {deckOpen && <DeckOverlay state={state} onClose={() => setDeckOpen(false)} />}
          {concedeOpen && !['lobby', 'game_over', 'victory'].includes(state.phase) && (
            <div className="feedback-overlay">
              <div className="tutorial-step">ABANDON RUN</div>
              <p className="muted">
                {state.botSeat ? 'The Witness will follow your lead. Grumbling.'
                  : partnerOn ? 'Both of you must agree — even quitting is co-op.'
                  : 'Your partner is away — you may set the thread down alone.'}
              </p>
              <p>
                You: <b>{state.concede[state.you] ? 'ready to walk away' : 'undecided'}</b>
                {!state.botSeat && partnerOn && (
                  <> · Partner: <b>{state.concede[state.you === 'p1' ? 'p2' : 'p1'] ? 'ready to walk away' : 'undecided'}</b></>
                )}
              </p>
              <button data-gp="META" onClick={() => net.act({ type: 'CONCEDE', confirm: !state.concede[state.you] } as any)}>
                {state.concede[state.you] ? 'no — keep fighting' : 'yes, set the thread down'}
              </button>
              <button data-gp="META" onClick={() => setConcedeOpen(false)}>close</button>
            </div>
          )}
          {toast && <div className="toast">{toast}</div>}
          {feedbackOpen && (
            <div className="feedback-overlay">
              <div className="tutorial-step">PLAYTEST STAMP</div>
              <button data-gp="META" onClick={() => { net.feedback('good'); setFeedbackOpen(false); }}>felt good</button>
              <button data-gp="META" onClick={() => { net.feedback('bad'); setFeedbackOpen(false); }}>felt bad</button>
              <button data-gp="META" onClick={() => setFeedbackOpen(false)}>cancel</button>
            </div>
          )}
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
      <span><b>{g.scroll}</b> pan</span>
      <span><b>{g.zone}</b> zones</span>
      <span><b>{g.reorder}</b> reorder</span>
      <span><b>{g.ready}</b> ready</span>
      <span><b>L1+R1</b> stamp</span>
    </div>
  );
}

function Settings({ net, solo }: { net: Net; solo: boolean }): JSX.Element {
  const [open, setOpen] = useState(false);
  const [, tick] = useState(0);
  const [botSpeed, setBotSpeed] = useState<'paced' | 'instant'>(
    new URLSearchParams(location.search).get('botspeed') === 'instant' ? 'instant' : 'paced',
  );
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
          {solo && (
            <label>
              bot speed
              <select value={botSpeed} onChange={(e) => {
                const speed = e.target.value as 'paced' | 'instant';
                setBotSpeed(speed);
                net.setBotSpeed(speed);
              }}>
                <option value="paced">paced</option>
                <option value="instant">instant (testing)</option>
              </select>
            </label>
          )}
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
      {relics.map(({ pid, relic }, i) => {
        // §14.13: the Ring wears 0–2 charge pips — the count made visible
        const pips = relic?.id === 'pulsekeepers_ring' ? (state.players[pid].ringPulses ?? 0) % 3 : null;
        return (
          <span key={i} className="relic" data-gp="RELICS" style={{ borderColor: PCOLOR[pid] }} data-inspect={`relic:${relic?.id}`}>
            {relic?.name ?? '?'}
            {pips !== null && <span className="ring-pips"> {'●'.repeat(pips)}{'○'.repeat(2 - pips)}</span>}
          </span>
        );
      })}
    </div>
  );
}

function TitleCord({ left, right }: {
  left: 'vess' | 'bram' | 'witness' | null; right: 'vess' | 'bram' | 'witness' | null;
}): JSX.Element {
  return (
    <div className="title-cord">
      <div className={`title-frame ${left ? 'filled' : ''}`}>
        {left ? <CharacterSigil who={left} size={84} /> : <span className="title-empty">?</span>}
      </div>
      <svg width="220" height="56" viewBox="0 0 220 56" aria-hidden>
        <path className={`cord-line ${left && right ? '' : 'cord-dim'}`} d="M 0 20 Q 110 52 220 20" fill="none" />
      </svg>
      <div className={`title-frame ${right ? 'filled' : ''}`}>
        {right ? <CharacterSigil who={right} size={84} /> : <span className="title-empty">?</span>}
      </div>
    </div>
  );
}

const LOBBY_GREETINGS = [
  'Ah. It brought a friend. The thread shudders with delight, presumably.',
  'Two of you now. The arithmetic of disappointment doubles.',
  'The second one arrives. Fashionably late to its own funeral.',
  'Oh good, reinforcements. The Undercroft was getting worried.',
];

function Home({ net, error }: { net: Net; error: string }): JSX.Element {
  const [code, setCode] = useState('');
  const [character, setCharacter] = useState<Character>('vess');
  const [soloCharacter, setSoloCharacter] = useState<Character>('vess');
  const [botCharacter, setBotCharacter] = useState<Character>('bram');
  return (
    <div className="center home">
      <h1 className="game-title">THREADBOUND</h1>
      <TitleCord left={null} right={null} />
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
        <button data-gp="META" onClick={() => { goFullscreen(); net.create(character); }}>Create room</button>
      </div>
      <div className="panel">
        <h3>Join a room</h3>
        <input placeholder="5-letter code" value={code} maxLength={5} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <button data-gp="META" onClick={() => { goFullscreen(); net.join(code); }}>Join</button>
      </div>
      <div className="panel">
        <h3>Descend alone</h3>
        <p className="muted">The Witness will assist. He is thrilled.</p>
        <label>
          You{' '}
          <select value={soloCharacter} onChange={(e) => setSoloCharacter(e.target.value as Character)}>
            <option value="vess">Vess, the Hexweaver</option>
            <option value="bram">Bram, the Cinderfist</option>
          </select>
        </label>{' '}
        <label>
          The Witness plays{' '}
          <select value={botCharacter} onChange={(e) => setBotCharacter(e.target.value as Character)}>
            <option value="bram">Bram, the Cinderfist</option>
            <option value="vess">Vess, the Hexweaver</option>
          </select>
        </label>
        <button data-gp="META" onClick={() => { goFullscreen(); net.createSolo(soloCharacter, botCharacter); }}>Descend alone</button>
      </div>
      <ProfilePanel />
    </div>
  );
}

/** S4.5: the browser profile's export/import — the save-state until a real
 *  account layer exists (explicitly out of scope). Small, on the title screen. */
function ProfilePanel(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState('');
  const [, tick] = useState(0);
  const p = loadProfile();
  const clears = p.clears.vess.count + p.clears.bram.count;
  return (
    <div className="panel" style={{ opacity: 0.85 }}>
      <button className="chip" data-gp="META" onClick={() => setOpen(!open)}>
        profile — {clears} clear{clears === 1 ? '' : 's'} · A{p.ascensionUnlocked.vess}/{p.ascensionUnlocked.bram} unlocked {open ? '▴' : '▾'}
      </button>
      {open && (
        <div>
          <p className="muted">Progress lives in this browser. Carry it with the string below.</p>
          <textarea readOnly value={exportProfile(p)} rows={2} style={{ width: '100%' }}
            onFocus={(e) => e.currentTarget.select()} />
          <div>
            <input placeholder="paste an export string to import" value={importText}
              onChange={(e) => setImportText(e.target.value)} />
            <button className="chip" data-gp="META" onClick={() => {
              const imported = importProfile(importText);
              if (!imported) { setMsg('that string is corrupt — rejected'); return; }
              saveProfile(mergeProfiles(loadProfile(), imported)); // merge never downgrades
              setImportText('');
              setMsg('imported (merged — max/union)');
              tick((n) => n + 1);
            }}>import</button>
          </div>
          {msg && <p className="muted">{msg}</p>}
        </div>
      )}
    </div>
  );
}

/** S4.4: lobby ascension select — both players must land on the same level
 *  (concede pattern; in solo the Witness follows the human's vote). Levels
 *  above this browser's unlocked max are shown locked; the server clamps
 *  regardless (profiles are claims, not authority). */
function AscensionPicker({ state, net, solo }: { state: ClientState; net: Net; solo: boolean }): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const votes = state.ascensionVotes ?? { p1: 0, p2: 0 };
  const myMax = loadProfile().ascensionUnlocked[state.players[you].character] ?? 0;
  if (myMax === 0 && votes.p1 === 0 && votes.p2 === 0) {
    return <></>; // nothing unlocked, nothing voted: keep the lobby quiet
  }
  return (
    <div className="panel">
      <h3>Ascension</h3>
      <label>
        Level{' '}
        <select value={votes[you]} onChange={(e) => net.act({ type: 'SET_ASCENSION', level: Number(e.target.value) } as any)}>
          {Array.from({ length: ASCENSION_MAX + 1 }, (_, n) => (
            <option key={n} value={n} disabled={n > myMax}>A{n}{n > myMax ? ' 🔒' : ''}</option>
          ))}
        </select>
      </label>
      {votes[you] > 0 && (
        <p className="muted">
          {Array.from({ length: votes[you] }, (_, i) => ASCENSION_RUNGS[i + 1]).join(' · ')}
        </p>
      )}
      {!solo && (
        <p className="muted">
          You: <b>A{votes[you]}</b> · Partner: <b>A{votes[partner]}</b>
          {votes.p1 === votes.p2 ? ' — agreed' : ' — both must pick the same level'}
        </p>
      )}
    </div>
  );
}

function Phase({ state, net, partnerOn }: { state: ClientState; net: Net; partnerOn: boolean }): JSX.Element {
  switch (state.phase) {
    case 'lobby': {
      const solo = !!state.botSeat;
      // S2.1: in solo the Witness resents being drafted; co-op keeps its greeting
      const soloPool = WITNESS_POOLS.solo_greeting ?? LOBBY_GREETINGS;
      const greeting = solo
        ? soloPool[(state.seed >>> 3) % soloPool.length]
        : LOBBY_GREETINGS[(state.seed >>> 3) % LOBBY_GREETINGS.length];
      return (
        <div className="center">
          <h2>The Undercroft awaits</h2>
          <TitleCord left={state.players.p1.character} right={solo ? 'witness' : partnerOn ? state.players.p2.character : null} />
          <p>{solo ? 'The Witness holds the other end. Reluctantly.' : partnerOn ? 'The thread is strung.' : 'Share the room code — the far frame waits.'}</p>
          <button className="chip" data-gp="META" onClick={() => net.leave()}>leave room (join a different one)</button>
          {/* PT3: not gated on partnerOn — the host can set ascension before
              the partner connects; the vote persists into their arrival.
              (Self-hides when nothing is unlocked.) */}
          <AscensionPicker state={state} net={net} solo={solo} />
          {(partnerOn || solo) && <p className="witness">THE WITNESS: “{greeting}”</p>}
          {(partnerOn || solo) && <button className="big" data-gp="META" onClick={() => { goFullscreen(); net.start(); }}>Begin the descent</button>}
        </div>
      );
    }
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
        <div className="center end-screen end-victory">
          <TitleCord left={state.players.p1.character} right={state.botSeat ? 'witness' : state.players.p2.character} />
          <h2>The Unraveled lies still.</h2>
          <RunSummary state={state} won={true} />
          <p className="muted">A full clear — screenshot this for the calibration pile.</p>
          <button className="big" data-gp="META" onClick={() => net.leave()}>Leave room (descend again)</button>
        </div>
      );
    case 'game_over':
      return (
        <div className="center end-screen end-defeat">
          <h2>The descent ends here.</h2>
          <RunSummary state={state} won={false} />
          <p className="muted">Death is a fresh run — screenshot this for the calibration pile first.</p>
          <button className="big" data-gp="META" onClick={() => net.leave()}>Leave room (descend again)</button>
        </div>
      );
    default:
      return <div className="center">…</div>;
  }
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

function nodeLabel(map: ClientState['map'], id: number): string {
  const n = map.nodes.find((x) => x.id === id);
  return n ? `${NODE_ICON[n.kind]} ${n.kind}` : '?';
}

function MapView({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const map = state.map;
  const pickable: number[] =
    map.position === -1
      ? map.nodes.filter((n) => n.layer === 0).map((n) => n.id)
      : map.nodes.find((n) => n.id === map.position)?.edges ?? [];
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';

  // S2.2: nodes as knots on branching cord paths (the B3/B4 motif continued).
  // Pure layout math from layer/lane — no game data the old grid didn't show.
  const layerCount = Math.max(...map.nodes.map((n) => n.layer)) + 1;
  const laneCounts = new Map<number, number>();
  for (const n of map.nodes) laneCounts.set(n.layer, (laneCounts.get(n.layer) ?? 0) + 1);
  const maxLanes = Math.max(...laneCounts.values());
  const COL = 168, ROW = 92;
  const W = maxLanes * COL, H = layerCount * ROW;
  const pos = (n: MapNode): { x: number; y: number } => {
    const offset = ((maxLanes - (laneCounts.get(n.layer) ?? 1)) * COL) / 2;
    return { x: offset + (n.lane + 0.5) * COL, y: H - (n.layer + 0.5) * ROW };
  };
  const hereLayer = map.nodes.find((n) => n.id === map.position)?.layer ?? -1;
  const byId = new Map(map.nodes.map((n) => [n.id, n]));

  return (
    <div className="center">
      <h2>{ACT_NAME[map.act]}</h2>
      <p className="muted">
        Pick your next node — you must both pick the <i>same</i> one.
        {map.mismatchStreak > 0 && <span className="crossed"> You disagreed {map.mismatchStreak}× — picks reset.</span>}
      </p>
      <p className="map-picks">
        <span style={{ color: PCOLOR[you] }}>
          You: <b>{map.picks[you] !== null ? nodeLabel(map, map.picks[you]!) : 'choosing…'}</b>
        </span>
        {' · '}
        <span style={{ color: PCOLOR[partner] }}>
          {state.players[partner].character}: <b>{map.picks[partner] !== null ? nodeLabel(map, map.picks[partner]!) : 'choosing…'}</b>
        </span>
      </p>
      <div className={`mapwrap act-${map.act}`} style={{ width: W, height: H }}>
        <svg className="map-cords" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden>
          {map.nodes.flatMap((n) => {
            const from = pos(n);
            return n.edges.map((toId) => {
              const target = byId.get(toId);
              if (!target) return null;
              const to = pos(target);
              const cleared = n.layer < hereLayer; // walked-past cords dim
              const live = n.id === map.position && pickable.includes(toId);
              // a cord sags toward the midpoint — knots ride a hung thread
              const mx = (from.x + to.x) / 2 + (from.x === to.x ? 0 : (to.x - from.x) * 0.08);
              const my = (from.y + to.y) / 2 + 10;
              return (
                <path key={`${n.id}-${toId}`}
                  className={`map-cord ${cleared ? 'cord-cleared' : ''} ${live ? 'cord-live' : ''}`}
                  d={`M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`} fill="none" />
              );
            });
          })}
        </svg>
        {map.nodes.map((n) => {
          const { x, y } = pos(n);
          const here = n.id === map.position;
          const can = pickable.includes(n.id);
          const cleared = n.layer < hereLayer && !here;
          const myPick = map.picks[you] === n.id;
          const theirPick = map.picks[partner] === n.id;
          return (
            <button
              key={n.id}
              data-gp="MAP"
              className={`mapnode ${here ? 'here' : ''} ${can ? 'can' : ''} ${cleared ? 'cleared' : ''} ${myPick ? 'mypick' : ''} ${theirPick ? 'theirpick' : ''} ${myPick && theirPick ? 'agreed' : ''}`}
              style={{
                left: x, top: y,
                ...(myPick ? { outlineColor: PCOLOR[you] } : {}),
                ...(theirPick ? { boxShadow: `0 0 14px ${PCOLOR[partner]}`, borderColor: PCOLOR[partner] } : {}),
              }}
              disabled={!can}
              onClick={() => { audio.play('map_move'); net.act({ type: 'NODE_PICK', nodeId: n.id } as any); }}
            >
              {NODE_ICON[n.kind]} {n.kind}
              {(myPick || theirPick) && (
                <span className="pick-tags">
                  {myPick && <span className="pick-tag" style={{ background: PCOLOR[you] }}>you</span>}
                  {theirPick && <span className="pick-tag" style={{ background: PCOLOR[partner] }}>{state.players[partner].character}</span>}
                </span>
              )}
            </button>
          );
        })}
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
  const [partnerHandOpen, setPartnerHandOpen] = useState(false);
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [pendingSever, setPendingSever] = useState(false);
  const [pendingPulse, setPendingPulse] = useState(false);
  const [reclaimOpen, setReclaimOpen] = useState(false);

  // pad ergonomics: a pending target snaps focus to the enemies (or the
  // chain, for Pulse), and back to where the intent came from afterward
  const wasPending = useRef<'card' | 'sever' | 'pulse' | null>(null);
  useEffect(() => {
    const pending = pendingCard ? 'card' : pendingSever ? 'sever' : pendingPulse ? 'pulse' : null;
    if (pending && !wasPending.current) controller.snapZone(pending === 'pulse' ? 'CHAIN' : 'ENEMIES');
    else if (!pending && wasPending.current) controller.snapZone(wasPending.current === 'card' ? 'HAND' : 'THREAD');
    wasPending.current = pending;
  }, [pendingCard, pendingSever, pendingPulse]);

  const fired = useMemo(() => {
    try { return computeLinksFired(state, combat.chain); } catch { return combat.chain.map(() => false); }
  }, [state, combat.chain]);
  // §14.12: Pulse-forced links — lit, but visually distinct from natural fires
  const forced = useMemo(() => {
    try { return computeForcedLinks(state, combat.chain, fired); } catch { return combat.chain.map(() => false); }
  }, [state, combat.chain, fired]);
  const firedAll = useMemo(() => fired.map((f, i) => f || forced[i]), [fired, forced]);
  const resonance = useMemo(() => computeResonanceSlots(combat.chain, firedAll), [combat.chain, firedAll]);
  const plannedBlock = useMemo(() => {
    try { return computePlannedBlock(state); } catch { return { p1: 0, p2: 0 } as Record<PlayerId, number>; }
  }, [state]);
  // PT2/PT3: make Momentum legible — per-slot preview of the first-hit bonus
  // each staged Strike gets, halving after each spend (momentumNoHalve
  // honored; keep/per-hit riders not modeled). An estimate, like planned
  // Block; `next` is what a Strike staged NOW would receive.
  // PT3 fix: walk effects IN ORDER so Momentum GAINED earlier in the chain
  // (a card's `momentum` op) feeds the Strikes after it — the preview used to
  // ignore mid-turn gains entirely and read stale.
  const momentumPreview = useMemo(() => {
    const m: Record<PlayerId, number> = { p1: state.players.p1.momentum, p2: state.players.p2.momentum };
    const perSlot = combat.chain.map((slot, i) => {
      const def = defFor(state, slot.owner, slot.cardInstanceId);
      const owner = slot.owner;
      const effects = firedAll[i] && def.link
        ? def.link.replace ? def.link.effects : [...def.base, ...def.link.effects]
        : def.base;
      let shown = 0;
      let spent = false;
      for (const e of effects) {
        if (e.op === 'momentum') {
          m[owner] += e.amount; // gained mid-turn — feeds the Strikes after it
        } else if (
          def.tag === 'Strike' && !spent && m[owner] > 0 &&
          (e.op === 'damage' || e.op === 'damageAll' || e.op === 'damagePerHex' || e.op === 'momentumStrikeBonus')
        ) {
          shown = m[owner];
          spent = true;
          if (!hasPassive(state.players[owner], 'momentumNoHalve')) m[owner] = Math.floor(m[owner] / 2);
        }
      }
      return shown;
    });
    return { perSlot, next: m };
  }, [state, combat.chain, firedAll]);
  const severed = combat.severedTurns > 0;
  const anyFallen = state.players.p1.fallen || state.players.p2.fallen;
  // §14.12: Pulse targets = staged cards with a dead Link, not yet pulsed
  const pulseTargets = useMemo(() => new Set(
    combat.chain
      .filter((slot, i) => !firedAll[i] && !!defFor(state, slot.owner, slot.cardInstanceId).link)
      .map((slot) => slot.cardInstanceId),
  ), [state, combat.chain, firedAll]);
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
          // S2.2 boss presence: bigger composite sigils; the Unraveled's mark
          // visibly frays and parts while its sever phase holds
          const sigilSize = def.boss ? 104 : def.elite ? 82 : 64;
          const fraying = severed && !!def.unraveled;
          // Playtest 2: the §14.8 self-retether (elites/bosses, every 3rd
          // turn) happens during THIS turn's enemy phase — forecast the swap
          // so the displayed target isn't a lie. Mirrors the engine condition
          // exactly; deterministic, so the client may compute it (§11).
          const retetherTo =
            e.hp > 0 && (def.elite || def.boss) && combat.turn % 3 === 0 && e.boundTo &&
            !state.players[e.boundTo === 'p1' ? 'p2' : 'p1'].fallen
              ? (e.boundTo === 'p1' ? 'p2' : 'p1') as PlayerId
              : null;
          return (
            <div
              key={e.id}
              data-fxid={e.id}
              data-gp={e.hp > 0 && !e.untargetable ? 'ENEMIES' : undefined}
              data-inspect={`enemy:${e.defId}`}
              className={`enemy ${def.boss ? 'boss' : ''} ${def.elite ? 'elite' : ''} ${fraying ? 'sigil-fraying' : ''} ${e.hp <= 0 ? 'dead' : ''} ${e.untargetable ? 'untargetable' : ''} ${pendingCard || pendingSever ? 'targetable' : ''} ${TELEGRAPH[e.intent.kind] ?? ''}`}
              style={{ borderColor: e.boundTo ? PCOLOR[e.boundTo] : 'var(--line)', animationDelay: `${(i * 0.7) % 2}s` }}
              onClick={() => e.hp > 0 && !e.untargetable && onEnemyClick(e.id)}
            >
              <Sigil id={e.defId} size={sigilSize} aura={def.elite || def.boss} className="enemy-sigil" />
              <div className="ename">{def.name}{def.elite ? ' ☠' : def.boss ? ' ♛' : ''}</div>
              <div className="hpbar"><div className="hpfill" style={{ width: `${(100 * e.hp) / e.maxHp}%` }} /></div>
              <div>{e.hp}/{e.maxHp}{e.block > 0 && <span className="chipblock"> 🛡{e.block}</span>}</div>
              {e.hex > 0 && (
                <div className="hexmotes" data-inspect="kw:hex">
                  {Array.from({ length: Math.min(e.hex, 9) }, (_, m) => (
                    <span key={m} className="mote" style={{ animationDelay: `${m * 0.35}s` }} />
                  ))}
                  {/* Playtest 2: the count is the tracking number — always show it */}
                  <span className="motecount">{e.hex}</span>
                </div>
              )}
              <div className="statuses">
                {e.weak > 0 && <span data-inspect="kw:weak">{GLYPH.weak} Weak {e.weak}</span>}
                {e.vulnerable > 0 && <span data-inspect="kw:vulnerable">{GLYPH.vulnerable} Vuln {e.vulnerable}</span>}
                {e.stun > 0 && <span data-inspect="kw:stun">{GLYPH.stun} Stun {e.stun}</span>}
                {e.strength > 0 && <span>{GLYPH.strength} Str +{e.strength}</span>}
              </div>
              <div className="intent">{e.hp > 0 && intentText(e.intent, e.strength, e.weak)}</div>
              <div className="bound" style={{ color: retetherTo ? PCOLOR[retetherTo] : e.boundTo ? PCOLOR[e.boundTo] : 'var(--text-dim)' }} data-inspect="kw:bound">
                {e.untargetable ? 'unbound — untargetable'
                  : retetherTo ? `bound to ${state.players[e.boundTo!].character} — re-tethers this turn → ${state.players[retetherTo].character}`
                  : e.boundTo ? `bound to ${state.players[e.boundTo].character}` : 'unbound'}
              </div>
            </div>
          );
        })}
      </div>

      {(pendingCard || pendingSever || pendingPulse) && (
        <div className="hint">
          {pendingPulse
            ? 'Pick a dead link in the Chain — Pulse forces it to fire.'
            : `Pick an enemy to ${pendingSever ? 'sever its binding' : 'target'}.`}
          <button className="chip" data-gp-action="cancel" onClick={() => { setPendingCard(null); setPendingSever(false); setPendingPulse(false); }}>cancel</button>
        </div>
      )}

      <ChainTrack state={state} fired={fired} forced={forced} resonance={resonance} net={net}
        momentumBonus={momentumPreview.perSlot}
        pendingPulse={pendingPulse}
        onPulseTarget={(cardInstanceId) => {
          net.act({ type: 'DECLARE_THREAD', kind: 'pulse', targetId: cardInstanceId } as any);
          setPendingPulse(false);
        }} />

      {/* one row: player panels are the cord's endpoints (screen-height budget) */}
      <div className="combat-table">
        <PStat state={state} pid={you} plannedBlock={plannedBlock[you]} partnerHandOpen={partnerHandOpen} setPartnerHandOpen={setPartnerHandOpen} />
        <ThreadCord value={state.thread} max={state.threadMax} mode={cordMode} compact
          left={state.players.p1.character} right={state.players.p2.character} />
        <PStat state={state} pid={partner} plannedBlock={plannedBlock[partner]} partnerHandOpen={partnerHandOpen} setPartnerHandOpen={setPartnerHandOpen} />
      </div>

      <div className="thread-bar">
        {/* §14.13: when the Ring's next Pulse is the discounted third, the
            row shows the real price — the affordance matters more than the math */}
        <button data-gp="THREAD" data-inspect="kw:pulse" disabled={me.ready || me.fallen || severed || anyFallen || pulseTargets.size === 0}
          onClick={() => setPendingPulse(!pendingPulse)}>
          Pulse ({me.relics.includes('pulsekeepers_ring') && ((me.ringPulses ?? 0) + 1) % 3 === 0 ? 1 : 2})…
        </button>
        <button data-gp="THREAD" data-inspect="kw:reclaim" disabled={me.ready || me.fallen || severed || anyFallen} onClick={() => setReclaimOpen(!reclaimOpen)}>Reclaim (2)…</button>
        <button data-gp="THREAD" data-inspect="kw:sever" disabled={me.ready || me.fallen || severed || anyFallen} onClick={() => setPendingSever(!pendingSever)}>Sever (3)…</button>
        <button data-gp="THREAD" data-inspect="kw:steady" disabled={me.ready || me.fallen || severed || anyFallen} onClick={() => net.act({ type: 'DECLARE_THREAD', kind: 'steady' } as any)}>Steady (1)</button>
      </div>

      {reclaimOpen && (
        <div className="panel">
          <b>Partner’s discard</b> <span className="muted">(Reclaims arrive mutated — inspect to preview)</span>{' '}
          {state.players[partner].discard.length === 0 && <i>empty</i>}
          {/* PT3: bounded scroll list — more than one row was unreachable on
              the pad (focus-follow + right-stick now both scroll within it) */}
          <div className="reclaim-list">
            {state.players[partner].discard.map((id) => {
              // PT2: Reclaim copies — the original stays listed, so a card
              // already being reclaimed this turn must read as taken
              const claimed = combat.threadActions.some((t) => t.kind === 'reclaim' && t.targetId === id);
              return (
                <button key={id} className="chip" data-gp={claimed ? undefined : 'THREAD'} disabled={claimed}
                  data-inspect={`card:${inst(state, partner, id)!.defId}:mprev`}
                  onClick={() => {
                    if (claimed) return;
                    net.act({ type: 'DECLARE_THREAD', kind: 'reclaim', targetId: id } as any);
                    setReclaimOpen(false);
                  }}>
                  {defFor(state, partner, id).name}{CARDS[inst(state, partner, id)!.defId].mutation ? ' ◈' : ''}{claimed ? ' (reclaiming)' : ''}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* >7 cards: overlap instead of wrapping to a second row (which shoved
          Ready offscreen); hover/focus/selection pops a card fully visible */}
      <div
        className={`hand ${me.hand.length > 7 ? 'crowded' : ''}`}
        style={me.hand.length > 7
          ? { ['--card-overlap' as string]: `${Math.min(110, Math.ceil((me.hand.length * 166 - 1100) / (me.hand.length - 1)))}px` }
          : undefined}>
        {me.hand.map((id) => {
          const def = defFor(state, you, id);
          return (
            <Card key={id} def={def} echo={!!inst(state, you, id)?.echo}
              upgraded={!!inst(state, you, id)?.upgraded} mutated={!!inst(state, you, id)?.mutated}
              badge={def.tag === 'Strike' && momentumPreview.next[you] > 0 ? `➤+${momentumPreview.next[you]}` : undefined}
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
        <span className="muted">turn {combat.turn}</span>
        {state.players[partner].ready && !me.ready && <span className="nudge">your partner is ready</span>}
        <span className="muted">
          draw {state.counts[you].draw} · discard {me.discard.length}
        </span>
      </div>

      <Log log={state.log} state={state} />
    </div>
  );
}

function PStat({ state, pid, plannedBlock, partnerHandOpen, setPartnerHandOpen }: {
  state: ClientState; pid: PlayerId; plannedBlock?: number;
  partnerHandOpen: boolean; setPartnerHandOpen: (o: boolean) => void;
}): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const p = state.players[pid];
  return (
    <div data-fxid={pid} className={`pstat ${p.fallen ? 'fallen' : ''}`} style={{ borderColor: PCOLOR[pid] }}>
      <b style={{ color: PCOLOR[pid] }}>{CHAR_NAME[p.character]}</b> {pid === you && '(you)'}
      {pid === state.botSeat && <span className="muted"> · the Witness</span>}
      {p.fallen && <b className="fray" data-inspect="kw:fallen"> — FALLEN</b>}
      <div>
        HP {p.hp}/{p.maxHp}
        {/* live Block is structurally 0 while planning — show the staged plan */}
        <span data-inspect="kw:block-planned"> · {GLYPH.block} {(plannedBlock ?? 0) > 0
          ? <b className="planned-block">{plannedBlock} planned</b>
          : p.block}</span>
        {' '}· Energy {p.energy}
        {p.kindled > 0 && <span className="kindled" data-inspect="kw:kindled"> · {GLYPH.kindled} Kindled {p.kindled}</span>}
        {p.momentum > 0 && <span data-inspect="kw:momentum"> · {GLYPH.momentum} Momentum {p.momentum}</span>}
      </div>
      <div className="statuses">
        {p.statuses.frayed > 0 && <span className="fray" data-inspect="kw:frayed">{GLYPH.frayed} Frayed {p.statuses.frayed}</span>}
        {p.statuses.weak > 0 && <span data-inspect="kw:weak">{GLYPH.weak} Weak {p.statuses.weak}</span>}
        {p.statuses.vulnerable > 0 && <span data-inspect="kw:vulnerable">{GLYPH.vulnerable} Vuln {p.statuses.vulnerable}</span>}
        {p.powers.map((pw) => <span key={pw}>{POWERS[pw]?.name ?? pw}</span>)}
        {p.ready && <span className="ready">READY</span>}
      </div>
      {pid === partner && (
        <div className="partner-hand">
          <button className="chip" data-gp="META" onClick={() => setPartnerHandOpen(!partnerHandOpen)}>
            hand ({p.hand.length}) {partnerHandOpen ? '▴' : '▾'}
          </button>
          {partnerHandOpen && (
            <div className="hand partner-hand-pop">
              {p.hand.map((id) => (
                <Card key={id} def={defFor(state, partner, id)} small
                  echo={!!inst(state, partner, id)?.echo}
                  upgraded={!!inst(state, partner, id)?.upgraded}
                  mutated={!!inst(state, partner, id)?.mutated}
                  inspect={inspectKeyFor(state, partner, id)} />
              ))}
              {p.hand.length === 0 && <i className="muted">empty</i>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChainTrack({ state, fired, forced, resonance, net, pendingPulse, onPulseTarget, momentumBonus }: {
  state: ClientState; fired: boolean[]; forced: boolean[]; resonance: Set<number>; net: Net;
  pendingPulse: boolean; onPulseTarget: (cardInstanceId: string) => void;
  momentumBonus: number[];
}): JSX.Element {
  const you = state.you;
  const combat = state.combat!;
  const chain = combat.chain;
  // §14.12: which staged cards can still be Pulsed (dead link, not yet pulsed)
  const pulseable = (i: number): boolean => {
    const slot = chain[i];
    return !fired[i] && !forced[i] && !!defFor(state, slot.owner, slot.cardInstanceId).link;
  };
  const threadName = (t: { kind: string; targetId?: string }): string => {
    if (t.kind === 'pulse' && t.targetId) {
      const slot = chain.find((s) => s.cardInstanceId === t.targetId);
      if (slot) return `pulse → ${defFor(state, slot.owner, slot.cardInstanceId).name}`;
    }
    if (t.kind === 'sever' && t.targetId) {
      const e = combat.enemies.find((en) => en.id === t.targetId);
      if (e) return `sever → ${ENEMIES[e.defId].name}`;
    }
    return t.kind;
  };
  return (
    <div className="chain">
      <div className="chain-label">THE CHAIN</div>
      {chain.length === 0 && <i className="muted">stage cards here — they resolve left to right</i>}
      {chain.map((slot, i) => {
        const def = defFor(state, slot.owner, slot.cardInstanceId);
        const mine = slot.owner === you;
        const lit = fired[i] || forced[i];
        const canPulse = pendingPulse && pulseable(i);
        const target = slot.targetId ? combat.enemies.find((e) => e.id === slot.targetId) : null;
        // PT3: a resonating card with no `primary` effect scales nothing —
        // say so, instead of a bare "RESONANCE" that reads as a buff (OQ#31).
        // Resolved effects mirror the engine (a fired link may replace base).
        const resolvedEffects = lit && def.link
          ? def.link.replace ? def.link.effects : [...def.base, ...def.link.effects]
          : def.base;
        const scales = resolvedEffects.some((e) => (e as { primary?: boolean }).primary);
        return (
          <React.Fragment key={slot.cardInstanceId}>
            {i > 0 && (
              // B4: link arcs between adjacent staged cards; pre-light when
              // satisfied. §14.12: forced arcs glow in the ignition hue with a
              // thread-strand motif; dead arcs become Pulse targets.
              <div
                className={`arc ${lit ? 'arc-on' : ''} ${forced[i] ? 'arc-forced' : ''} ${resonance.has(i) ? 'arc-resonance' : ''} ${canPulse ? 'arc-pulse-target' : ''}`}
                data-inspect={forced[i] ? 'kw:pulse' : 'kw:link'}
                data-gp={canPulse ? 'CHAIN' : undefined}
                onClick={() => canPulse && onPulseTarget(slot.cardInstanceId)}
              >
                <svg viewBox="0 0 40 24" width="40" height="24">
                  <path d="M 2 22 Q 20 -8 38 22" fill="none" />
                  {forced[i] && <path className="strand" d="M 2 22 Q 20 -8 38 22" fill="none" />}
                </svg>
              </div>
            )}
            <div className={`chaincard ${lit ? 'fires' : ''} ${resonance.has(i) ? 'resonates' : ''}`}
              style={{ borderColor: PCOLOR[slot.owner] }}>
              <div className="slotnum">{i + 1}</div>
              <Card def={def} small echo={!!inst(state, slot.owner, slot.cardInstanceId)?.echo}
                upgraded={!!inst(state, slot.owner, slot.cardInstanceId)?.upgraded}
                mutated={!!inst(state, slot.owner, slot.cardInstanceId)?.mutated}
                badge={momentumBonus[i] > 0 ? `➤+${momentumBonus[i]}` : undefined}
                gpZone={mine && !pendingPulse ? 'CHAIN' : undefined}
                inspect={inspectKeyFor(state, slot.owner, slot.cardInstanceId)}
                onClick={() => mine && !pendingPulse && net.act({ type: 'UNSTAGE_CARD', cardInstanceId: slot.cardInstanceId } as any)} />
              {target && <div className="target">→ {ENEMIES[target.defId].name}</div>}
              {def.link && (
                <div
                  className={`linkstate ${lit ? 'on' : 'off'} ${canPulse ? 'pulse-target' : ''}`}
                  data-gp={canPulse && i === 0 ? 'CHAIN' : undefined}
                  data-inspect={forced[i] ? 'kw:pulse' : undefined}
                  onClick={() => canPulse && onPulseTarget(slot.cardInstanceId)}
                >
                  {forced[i] ? '⊕ forced' : lit ? '⚡ fires' : `link: ${def.link.condition}`}
                </div>
              )}
              {resonance.has(i) && (
                <div className="resonance" data-inspect="kw:resonance">
                  ✦ RESONANCE {scales ? '+50%' : '· streak only'}
                </div>
              )}
              {mine && !pendingPulse && (
                <div className="reorder">
                  <button data-gp-reorder="left" onClick={() => net.act({ type: 'REORDER', cardInstanceId: slot.cardInstanceId, slot: Math.max(0, i - 1) } as any)}>◀</button>
                  <button data-gp-reorder="right" onClick={() => net.act({ type: 'REORDER', cardInstanceId: slot.cardInstanceId, slot: Math.min(chain.length - 1, i + 1) } as any)}>▶</button>
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
      {combat.threadActions.length > 0 && (
        // §14.12 salience: declared thread actions live in the Chain margin,
        // in stage order, visible to both players while planning
        <div className="chain-margin">
          {combat.threadActions.map((t, i) => (
            <button key={i} className="chip" data-gp="THREAD" style={{ color: PCOLOR[t.player] }}
              onClick={() => t.player === you && net.act({ type: 'UNDECLARE_THREAD', kind: t.kind } as any)}>
              {threadName(t)}{t.player === you ? ' ✕' : ''}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Card({ def, onClick, small, selected, disabled, echo, upgraded, mutated, gpZone, inspect, badge }: {
  def: CardDef; onClick?: () => void; small?: boolean; selected?: boolean; disabled?: boolean; echo?: boolean;
  /** S2.2 frame treatments — presentation only, the def already carries the rules */
  upgraded?: boolean; mutated?: boolean;
  gpZone?: string; inspect?: string;
  /** PT2: corner chip for live-effect previews (momentum) */
  badge?: string;
}): JSX.Element {
  return (
    <div
      className={`card tag-${def.tag} r-${def.rarity ?? 'common'} ${small ? 'small' : ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${echo ? 'echo' : ''} ${upgraded ? 'upgraded' : ''} ${mutated ? 'mutated' : ''}`}
      data-gp={!disabled && onClick ? gpZone : undefined}
      data-inspect={inspect ?? `card:${def.id}`}
      onClick={onClick}>
      {badge && <div className="card-badge" data-inspect="kw:momentum">{badge}</div>}
      <div className="cardtop"><span className="cost">{def.cost}</span> <span className="cname">{upgraded ? `${GLYPH.upgraded} ` : ''}{def.name}</span></div>
      <div className="ctag">{GLYPH[def.tag]} {def.tag}{def.keep ? ' · Keep' : ''}{def.exhaust ? ' · Exhaust' : ''}{echo ? ` · ${GLYPH.echo} Echo` : ''}{mutated ? ` · ${GLYPH.mutated} Mutated` : ''}</div>
      {/* upgrade texts restate the link clause inline; the ⚡ line below is
          the canonical display — trim the duplicate so links don't read twice */}
      <div className="ctext">{def.link && def.text.includes('Link (') ? def.text.slice(0, def.text.indexOf('Link (')).trim() : def.text}</div>
      {def.link && <div className="clink"><b>{GLYPH.link} Link ({def.link.condition}):</b> {def.link.text}</div>}
    </div>
  );
}

function intentText(intent: any, strength: number, weak = 0): string {
  // PT3: mirror the engine's hitPlayer math so the telegraphed number is the
  // truth — Weak reduces the attacker's output 25% (after Strength), floored.
  // (Target-side Vulnerable/Frayed aren't applied here: they belong to whoever
  // it lands on, not the attacker's telegraph.)
  const s = (n: number) => (weak > 0 ? Math.floor((n + strength) * 0.75) : n + strength);
  const w = weak > 0 ? ' (Weak)' : '';
  switch (intent.kind) {
    case 'attack': return `⚔ ${s(intent.amount)}${intent.times ? `×${intent.times}` : ''}${w}`;
    case 'attack_all': return `⚔ ${s(intent.amount)} BOTH${w}`;
    case 'attack_momentum': return `⚔ ${s(intent.base)} + 2×your Momentum${w}`;
    case 'attack_drain': return `⚔ ${s(intent.amount)} & drains ${intent.threadDrain} Thread${w}`;
    case 'attack_fray': return `⚔ ${s(intent.amount)} & FRAYS${w}`;
    case 'block': return `🛡 ${intent.amount}`;
    case 'block_all': return `🛡 ${intent.amount} ALL`;
    case 'buff_strength': return `${GLYPH.strength} Str ${intent.amount}`;
    case 'buff_strength_all': return `${GLYPH.strength} Str ${intent.amount} ALL`;
    case 'debuff_weak': return `${GLYPH.weak} Weak ${intent.amount}`;
    case 'debuff_vulnerable': return `${GLYPH.vulnerable} Vuln ${intent.amount}`;
    case 'sever': return `${GLYPH.sever} moves its tether`;
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
      <p className="prose" data-inspect={`scan:${def.prose}`}>{def.prose}</p>
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
            <button key={o.id} className="big" data-gp="META" data-inspect={`scan:${o.label}`}
              onClick={() => net.act({ type: 'EVENT_CHOOSE', optionId: o.id } as any)}>
              {o.label}
            </button>
          ))
        ) : (
          <p className="muted">Waiting for {state.players[ev.chooser].character} to choose…</p>
        )
      ) : (
        <>
          <p className="prose" data-inspect={`scan:${ev.resultText}`}>{ev.resultText}</p>
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
      {/* Playtest 2: the heal decision needs the current number in view */}
      <p className="muted">
        {(['p1', 'p2'] as PlayerId[]).map((pid, i) => (
          <span key={pid}>
            {i > 0 && ' · '}
            <span style={{ color: PCOLOR[pid] }}>
              {state.players[pid].character}: <b>{state.players[pid].hp}/{state.players[pid].maxHp} HP</b>
            </span>
          </span>
        ))}
      </p>
      <Log log={state.log} state={state} />
      {chosen === null ? (
        <>
          <button className="big" data-gp="META" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'rest' } as any)}>
            Rest (heal {Math.round(ascensionMods(state.ascension ?? 0).restHeal * 100)}%)
          </button>
          <button className="big" data-gp="META" data-inspect="kw:upgrade" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'upgrade' } as any)}>Upgrade a card</button>
          <button className="big" data-gp="META" data-inspect="kw:covet" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'barter' } as any)}>Barter (+1 Covet charge)</button>
          <button className="big" data-gp="META" disabled={state.rebraidUsed} onClick={() => net.act({ type: 'REST_CHOOSE', option: 'rebraid' } as any)}>
            Re-braid (+1 max Thread, once per run)
          </button>
        </>
      ) : needUpgradePick ? (
        <>
          <p>Choose a card — the weave tightens into the version on the right:</p>
          <div className="hand">
            {me.deck.filter((c) => !c.upgraded && CARDS[c.defId].upgrade).map((c) => {
              const up = effectiveDef({ ...c, upgraded: true });
              // cost-only upgrades (most Powers) must still read as a change
              const cheaper = up.cost !== CARDS[c.defId].cost;
              return (
                <div key={c.instanceId} className={`upgrade-pair ${cheaper ? 'cost-improved' : ''}`} data-gp="META"
                  data-inspect={`card:${c.defId}:uprev`}
                  onClick={() => net.act({ type: 'UPGRADE_PICK', cardInstanceId: c.instanceId } as any)}>
                  <Card def={CARDS[c.defId]} small />
                  <div className="upgrade-arrow">→</div>
                  <Card def={up} small upgraded />
                </div>
              );
            })}
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
        {/* S4.2 (OQ#8): the removal service never sells out — your price
            escalates with YOUR removals this run; the partner's next price
            sits beside it because the negotiation is the point */}
        {(() => {
          const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
          const myRow = shop.items.find((i) => i.kind === 'removal' && (!i.forPlayer || i.forPlayer === you));
          if (!myRow) return null;
          const myPrice = removalPrice(state, you);
          const theirPrice = removalPrice(state, partner);
          return (
            <div>
              <button data-gp="META" disabled={myPrice > state.gold || state.players[you].deck.length <= 5}
                onClick={() => setRemoving(removing === myRow.id ? null : myRow.id)}>
                Remove a card from your deck — {myPrice}g
              </button>
              <span className="muted">
                {' '}unlimited; your price climbs +25g per cut, all run · {state.players[partner].character}’s next: {theirPrice}g
              </span>
            </div>
          );
        })()}
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
