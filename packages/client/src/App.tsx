// Threadbound client — M3: controller-first (B1), tooltips (B2), thread cord
// (B3), chain choreography (B4), enemy presence (B5), sigil art (B6),
// procedural audio (C), tutorial (D). Renders state, sends intents (§11).

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CARDS, EVENTS, ENEMIES, RELICS_BY_ID, POWERS, witnessPoolLines, CardDef, CardInstance, GameEvent, MapNode, PlayerId,
  ASCENSION_MAX, ASCENSION_RUNGS, ascensionMods,
  applyGrowth, computeForcedLinks, computeLinksFired, computePlannedBlock, computePlannedDamage, computeResonanceSlots, effectiveDef,
  eventEffectClause, eventOptionAvailable, eventOptionDeepens, eventStageAt,
  hasPassive, reclaimEchoShape, removalPrice,
} from '@threadbound/engine';
import { ClientState, Net, ServerStatus } from './net';
import { VERSION_STAMP } from './build';
import { exportProfile, importProfile, loadProfile, mergeProfiles, recordClear, saveProfile, setTelemetryConsent } from './profile';
import { CHAR_NAME } from './chars';
import { GLYPH, linkBody } from './keywords';
import { controller, GLYPHS } from './gamepad';
import { audio } from './sfx';
import { CharacterMark, Mark, MarkDefs } from './sigils';
import { InspectPanel, inspectElement, previewInspect } from './Tooltip';
import { ThreadCord } from './ThreadCord';
import { ResolutionTheater, isResolution, displayHp } from './Theater';
import { StyleScreen } from './StyleScreen';
import { Tutorial } from './Tutorial';
import { DeckOverlay } from './DeckOverlay';
import { TapestryOverlay } from './TapestryOverlay';
import { LoomEye } from './LoomEye';
import { BirthRiteTrio, RiteOffer, RitePips, seatName } from './Rites';
import { CodexButton } from './Codex';
import { RunSummary } from './Summary';
import { Hints } from './Hints';

type Character = 'vess' | 'bram';
const PCOLOR: Record<PlayerId, string> = { p1: 'var(--p1)', p2: 'var(--p2)' };
const ACT_NAME: Record<number, string> = { 1: 'Act 1 — The Undercroft', 2: 'Act 2 — The Hollow Choir', 3: 'The Last Braid' };
const NODE_ICON: Record<string, string> = {
  combat: '⚔', elite: '☠', boss: '♛', event: '?', rest: '♨', shop: '⚖', treasure: '✦', loom: '◉',
};
// S6.7: kinds whose display name isn't the kind itself (the finale shrine)
const NODE_NAME: Record<string, string> = { loom: 'The Loom’s Eye' };

function inst(state: ClientState, owner: PlayerId, id: string): CardInstance | undefined {
  const p = state.players[owner];
  return p.deck.find((c) => c.instanceId === id) ?? p.combatCards.find((c) => c.instanceId === id);
}

function defFor(state: ClientState, owner: PlayerId, id: string): CardDef {
  const i = inst(state, owner, id);
  // S9d: growers render their grown numbers everywhere (applyGrowth is a
  // pass-through for non-growers and unflagged runs)
  return i ? applyGrowth(effectiveDef(i), state.tallies, owner) : ({ name: '?', text: '', cost: 0, tag: 'Strike', base: [] } as unknown as CardDef);
}

/** Display name for an enemy instance. When the same enemy NAME appears more
 *  than once in the fight, append its 1-based ordinal ("Cinder Husk 2") so a
 *  card's target is unambiguous. Ordinal is by spawn order (stable as enemies
 *  die — the survivor keeps its number). */
function enemyName(combat: ClientState['combat'], enemyId: string): string {
  if (!combat) return enemyId;
  const enemy = combat.enemies.find((e) => e.id === enemyId);
  if (!enemy) return enemyId;
  // nt-slice S6.5: the shrine's bossFace reveal renames the finale boss
  const name = enemy.nameOverride ?? ENEMIES[enemy.defId]?.name ?? enemy.defId;
  const sameName = combat.enemies.filter((e) => (e.nameOverride ?? ENEMIES[e.defId]?.name ?? e.defId) === name);
  if (sameName.length < 2) return name;
  return `${name} ${sameName.findIndex((e) => e.id === enemyId) + 1}`;
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
  // playback HP: while the theater narrates, the bars show live hp + these
  // offsets so damage lands per-beat instead of snapping to the final state
  const [hpOffsets, setHpOffsets] = useState<Record<string, number> | null>(null);
  const [joined, setJoined] = useState<{ code: string; playerId: PlayerId; character: string } | null>(null);
  const [error, setError] = useState('');
  const [partnerOn, setPartnerOn] = useState(false);
  const [connected, setConnected] = useState(false);
  const [, padTick] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  const [tapestryOpen, setTapestryOpen] = useState(false);
  const [concedeOpen, setConcedeOpen] = useState(false);
  const [toast, setToast] = useState('');
  // S6.2/S6.3: server-declared lifecycle status (drain, telemetry collection)
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [, consentTick] = useState(0);
  const netRef = useRef<Net | null>(null);
  // S6.6: the `t` hotkey exists only when the server pushed a truth
  // projection — a ref, because the key handler outlives any one state
  const truthRef = useRef(false);
  const prevBoardLen = useRef<number | null>(null);

  useEffect(() => {
    netRef.current = new Net({
      onState: (s) => {
        truthRef.current = !!s.truth;
        setState(s);
        if (s.log?.length && isResolution(s.log)) setResolutionLog(s.log);
      },
      onJoined: (info) => setJoined(info),
      onError: (m) => { setError(m); setTimeout(() => setError(''), 4000); },
      onPresence: setPartnerOn,
      onConnection: setConnected,
      onFeedbackAck: (mood) => {
        setToast(mood === 'bug' ? 'bug report sent — seed + build attached. Thank you.'
          : mood === 'survey' ? 'noted — thank you.'
          : `stamped: felt ${mood === 'note' ? 'noted' : mood}`);
        setTimeout(() => setToast(''), 1600);
      },
      onStatus: setStatus,
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
      else if (e.key === 't' && truthRef.current) {
        // S6.6 · S6.8: opens report to telemetry (board-use signal)
        setTapestryOpen((o) => {
          if (!o) netRef.current?.act({ type: 'BOARD_OPENED' });
          return !o;
        });
      }
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

  // S6.6 pin toast: a fragment landed on YOUR board since the last state.
  // Growth only (never on first sight of a board — reconnects stay quiet);
  // the fragment itself is read on the Tapestry, not here.
  useEffect(() => {
    const len = state?.truth ? state.truth.board.length : null;
    if (len !== null && prevBoardLen.current !== null && len > prevBoardLen.current) {
      setToast('A thread pins to your Tapestry — T to view.');
      setTimeout(() => setToast(''), 2600);
    }
    prevBoardLen.current = len;
  }, [state?.truth]);

  // S2.2: per-act CSS atmosphere — class on <body>, tokens do the rest
  useEffect(() => {
    const act = state && state.phase !== 'lobby' ? state.map.act : 0;
    document.body.classList.remove('act-1', 'act-2', 'act-3');
    if (act) document.body.classList.add(`act-${act}`);
  }, [state?.map.act, state?.phase]);

  const net = netRef.current;

  if (new URLSearchParams(location.search).has('style')) return <StyleScreen />;
  if (!net || !connected) return <div className="center">Connecting…</div>;

  // S6.3: the consent card appears ONLY when the server declares telemetry
  // collection active AND this browser has never answered. Local dev never asks.
  const needConsent = !!status?.telemetryActive && loadProfile().telemetryConsent === null;

  return (
    <>
      <MarkDefs />
      <div id="fx-overlay" />
      <VersionFooter />
      {needConsent && <ConsentCard net={net} onDone={() => consentTick((n) => n + 1)} />}
      <InspectPanel />
      {!joined || !state ? (
        <Home net={net} error={error} status={status} />
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
              {state.phase !== 'lobby' && state.truth && (
                // S6.6: only on flagged runs — no truth projection, no board
                <button className="chip" data-gp="META" onClick={() => {
                  if (!tapestryOpen) net.act({ type: 'BOARD_OPENED' }); // S6.8 telemetry
                  setTapestryOpen(!tapestryOpen);
                }}>
                  Tapestry (t) · {state.truth.board.length}
                </button>
              )}
              {!['lobby', 'game_over', 'victory'].includes(state.phase) && (
                <button className="chip" data-gp="META" onClick={() => setConcedeOpen(!concedeOpen)}>
                  abandon…
                </button>
              )}
              <button className="chip" data-gp="META" title="fullscreen (f)" onClick={toggleFullscreen}>⛶</button>
              <Settings net={net} solo={!!state.botSeat} telemetryActive={!!status?.telemetryActive} />
              <span className={partnerOn ? 'on' : 'off'}>
                {state.botSeat ? '● the Witness' : partnerOn ? '● partner' : '○ partner'}
              </span>
            </span>
          </header>
          <RelicBar state={state} />
          {error && <div className="error">{error}</div>}
          <Phase state={state} net={net} partnerOn={partnerOn} hpOffsets={hpOffsets} />
          <ResolutionTheater log={resolutionLog} pname={(p) => state.players[p].character} ename={(id) => enemyName(state.combat, id)} onOffsets={setHpOffsets} />
          <Tutorial state={state} />
          <Hints state={state} />
          <HintBar />
          {deckOpen && <DeckOverlay state={state} onClose={() => setDeckOpen(false)} />}
          {tapestryOpen && state.truth && <TapestryOverlay state={state} onClose={() => setTapestryOpen(false)} />}
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
              <button data-gp="META" onClick={() => net.act({ type: 'CONCEDE', confirm: !state.concede[state.you] })}>
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

/** S6.1: build identity, small and always visible — a bug report or
 *  screenshot without its build is unusable once data pools across patches. */
function VersionFooter(): JSX.Element {
  return <div className="version-footer">{VERSION_STAMP}</div>;
}

/** S6.3 opt-in consent card (first launch, only while the server declares
 *  telemetry collection active). Plain language; the choice lives in the
 *  profile and is changeable in settings (♪). */
function ConsentCard({ net, onDone }: { net: Net; onDone: () => void }): JSX.Element {
  const choose = (consent: boolean) => {
    setTelemetryConsent(consent);
    net.updateProfile(); // refresh the seat's claim if already in a room
    onDone();
  };
  return (
    <div className="feedback-overlay consent-card">
      <div className="tutorial-step">A QUESTION, BEFORE THE DESCENT</div>
      <p>
        This server can record <b>anonymous gameplay statistics</b> from finished runs to help
        balance the game: cards played, damage, HP lost, the run’s seed, the build version, and a
        random anonymous id stored in this browser.
      </p>
      <p>
        <b>Never collected:</b> names, emails, chat, or anything you type — except feedback you
        explicitly send. In a two-player run a file is written only if <b>both</b> players say yes.
      </p>
      <p className="muted">
        <a href="data-note" target="_blank" rel="noreferrer">read the full data note</a> · change
        your mind any time in settings (♪)
      </p>
      <button className="big" data-gp="META" onClick={() => choose(true)}>Yes — count my runs</button>
      <button data-gp="META" onClick={() => choose(false)}>No thanks</button>
    </div>
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

function Settings({ net, solo, telemetryActive }: { net: Net; solo: boolean; telemetryActive: boolean }): JSX.Element {
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
          {telemetryActive && (
            // S6.3: consent is changeable here any time collection is active
            <label title="anonymous run statistics — see /data-note">
              share run stats
              <input type="checkbox" checked={loadProfile().telemetryConsent === true}
                onChange={(e) => {
                  setTelemetryConsent(e.target.checked);
                  net.updateProfile();
                  tick((n) => n + 1);
                }} />
            </label>
          )}
          {/* S6.5: the pause/menu-area bug report lives here */}
          <BugReportButton net={net} />
          {/* S9a: the codex from the run's pause surface */}
          <CodexButton />
          {solo && (
            <label>
              bot speed
              <select data-gp="META" value={botSpeed} onChange={(e) => {
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
        {left ? <CharacterMark who={left} size={84} /> : <span className="title-empty">?</span>}
      </div>
      <svg width="220" height="56" viewBox="0 0 220 56" aria-hidden>
        <path className={`cord-line ${left && right ? '' : 'cord-dim'}`} d="M 0 20 Q 110 52 220 20" fill="none" />
      </svg>
      <div className={`title-frame ${right ? 'filled' : ''}`}>
        {right ? <CharacterMark who={right} size={84} /> : <span className="title-empty">?</span>}
      </div>
    </div>
  );
}

// S6.5 community link — one obvious const.
// TODO(designer): replace with the real invite once the Discord server exists
// (ruled: small, 3–4 channels incl. #looking-for-thread).
const DISCORD_URL = 'https://discord.gg/REPLACE-ME-threadbound';
// review fix: until the real invite lands, don't show players a dead link —
// the footer link and the blurb's Discord sentence hide themselves
const DISCORD_READY = !DISCORD_URL.includes('REPLACE-ME');

/** S6.5 one-tap bug report: the server attaches seed, turn, act, build,
 *  pair, and ascension — the text is optional garnish. */
function BugReportButton({ net }: { net: Net }): JSX.Element {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  return open ? (
    <span className="bug-panel">
      <input placeholder="what went wrong? (optional)" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="chip" data-gp="META" onClick={() => { net.bug(text.trim() || undefined); setText(''); setOpen(false); }}>send</button>
      <button className="chip" data-gp="META" onClick={() => setOpen(false)}>cancel</button>
    </span>
  ) : (
    <button className="chip" data-gp="META" title="one tap attaches seed, turn, act, build, pair, ascension"
      onClick={() => setOpen(true)}>report a bug…</button>
  );
}

/** S6.5 end-of-run micro-survey: two items max, one-tap skippable, and never
 *  in the way of the return-to-title button. Once per run (seed-keyed). */
function MicroSurvey({ net, runKey }: { net: Net; runKey: string }): JSX.Element | null {
  const [done, setDone] = useState(() => localStorage.getItem(`tb_survey_${runKey}`) === '1');
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  if (done) return null;
  const finish = (send: boolean) => {
    localStorage.setItem(`tb_survey_${runKey}`, '1');
    if (send && rating) net.survey(rating, text.trim() || undefined);
    setDone(true);
  };
  return (
    <div className="panel survey">
      <b>How was this run?</b>{' '}
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} className="chip" data-gp="META"
          style={rating === n ? { borderColor: 'var(--p1)' } : undefined}
          onClick={() => setRating(n)}>{n}</button>
      ))}
      {rating > 0 && (
        <input placeholder="a word or two (optional)" value={text} onChange={(e) => setText(e.target.value)} />
      )}
      {rating > 0 && <button className="chip" data-gp="META" onClick={() => finish(true)}>send</button>}
      <button className="chip" data-gp="META" onClick={() => finish(false)}>skip</button>
    </div>
  );
}

/** S6.6 first-visit blurb: strangers arrive with no one to explain rooms.
 *  Dismissible; the choice lives in localStorage. No accounts, no email. */
function FirstVisitBlurb(): JSX.Element | null {
  const [seen, setSeen] = useState(() => localStorage.getItem('tb_blurb_seen') === '1');
  if (seen) return null;
  return (
    <div className="panel blurb">
      <h3>New here? Threadbound in three lines</h3>
      <p className="muted">
        <b>Rooms are the whole lobby:</b> one of you creates a room and reads the 5-letter code to
        the other, who joins with it. Refreshing is always safe — your seat waits for you.
      </p>
      <p className="muted">
        <b>No partner handy?</b> Descend alone — the Witness (a grudging voice) plays the other
        seat.{DISCORD_READY && <> Looking for a partner? Try <code>#looking-for-thread</code> on the Discord below.</>}
      </p>
      <p className="muted">
        <b>Something felt great, bad, or broken?</b> Press <b>]</b> / <b>[</b> / <b>\</b> during a
        run to stamp the moment, or use “report a bug…” in the ♪ menu — the links below the panels
        do the rest.
      </p>
      <button className="chip" data-gp="META" onClick={() => { localStorage.setItem('tb_blurb_seen', '1'); setSeen(true); }}>
        got it — don’t show this again
      </button>
    </div>
  );
}

const LOBBY_GREETINGS = [
  'Ah. It brought a friend. The thread shudders with delight, presumably.',
  'Two of you now. The arithmetic of disappointment doubles.',
  'The second one arrives. Fashionably late to its own funeral.',
  'Oh good, reinforcements. The Undercroft was getting worried.',
];

function Home({ net, error, status }: { net: Net; error: string; status: ServerStatus | null }): JSX.Element {
  const [code, setCode] = useState('');
  const [character, setCharacter] = useState<Character>('vess');
  const [soloCharacter, setSoloCharacter] = useState<Character>('vess');
  const [botCharacter, setBotCharacter] = useState<Character>('bram');
  return (
    <div className="center home">
      <h1 className="game-title">THREADBOUND</h1>
      <TitleCord left={null} right={null} />
      <p className="muted">Two spirit-binders, one thread. Bring a friend.</p>
      {/* S6.2 drain window: no new rooms; runs in progress play on */}
      {status?.drain && (
        <div className="error">The loom is being restrung — no new rooms for a moment. Runs in progress play on; rejoining works.</div>
      )}
      {error && <div className="error">{error}</div>}
      <FirstVisitBlurb />
      <div className="panel">
        <h3>Create a room</h3>
        <label>
          Play as{' '}
          <select data-gp="META" value={character} onChange={(e) => setCharacter(e.target.value as Character)}>
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
        <p className="muted">The Witness will assist. It is thrilled.</p>
        <div>
          <label>
            You{' '}
            <select data-gp="META" value={soloCharacter} onChange={(e) => setSoloCharacter(e.target.value as Character)}>
              <option value="vess">Vess, the Hexweaver</option>
              <option value="bram">Bram, the Cinderfist</option>
            </select>
          </label>{' '}
          <label>
            The Witness plays{' '}
            <select data-gp="META" value={botCharacter} onChange={(e) => setBotCharacter(e.target.value as Character)}>
              <option value="bram">Bram, the Cinderfist</option>
              <option value="vess">Vess, the Hexweaver</option>
            </select>
          </label>
        </div>
        {/* own line: the two inline selects were shoving this button off the
            pad's vertical column — move()'s cross-axis penalty made it a
            navigation dead spot (controller bug report) */}
        <div>
          <button data-gp="META" onClick={() => { goFullscreen(); net.createSolo(soloCharacter, botCharacter); }}>Descend alone</button>
        </div>
      </div>
      {/* S9a: the codex, from the title (the other door is the ♪ pop in-run) */}
      <div className="panel" style={{ opacity: 0.85 }}>
        <CodexButton />
      </div>
      <ProfilePanel />
      {/* S6.5 title footer: version stamp lives in the fixed corner footer;
          links stay relative to the page origin (S6.7 — no absolute URLs
          except the community link, which is external by nature) */}
      <p className="muted footer-links">
        <a href="data-note" target="_blank" rel="noreferrer">what data this server collects</a>
        {DISCORD_READY && <>
          {' · '}
          <a href={DISCORD_URL} target="_blank" rel="noreferrer">community + feedback (Discord)</a>
        </>}
      </p>
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

/** S4.4 lobby ascension select · S7.7 (OQ#44, ruled): the picker is
 *  HOST-ONLY — p1, the room creator, holds the dial; the non-host seat sees
 *  the selected rung read-only, mirrored from state. Wire protocol
 *  unchanged (still SET_ASCENSION votes; server-side enforcement is a
 *  separate commit). Levels above this browser's unlocked max are shown
 *  locked; the server clamps regardless (profiles are claims, not
 *  authority). */
function AscensionPicker({ state, net, solo }: { state: ClientState; net: Net; solo: boolean }): JSX.Element {
  const you = state.you;
  const votes = state.ascensionVotes ?? { p1: 0, p2: 0 };
  const host = you === 'p1';
  const level = votes.p1; // the host's selection is THE rung
  if (!host) {
    if (level === 0) return <></>; // nothing set: keep the lobby quiet
    return (
      <div className="panel">
        <h3>Ascension</h3>
        <p>
          <b>A{level}</b> <span className="muted">— set by the host</span>
        </p>
        <p className="muted">
          {Array.from({ length: level }, (_, i) => ASCENSION_RUNGS[i + 1]).join(' · ')}
        </p>
      </div>
    );
  }
  const myMax = loadProfile().ascensionUnlocked[state.players[you].character] ?? 0;
  if (myMax === 0 && level === 0) {
    return <></>; // nothing unlocked, nothing set: keep the lobby quiet
  }
  return (
    <div className="panel">
      <h3>Ascension</h3>
      <label>
        Level{' '}
        <select data-gp="META" value={level} onChange={(e) => net.act({ type: 'SET_ASCENSION', level: Number(e.target.value) })}>
          {Array.from({ length: ASCENSION_MAX + 1 }, (_, n) => (
            <option key={n} value={n} disabled={n > myMax}>A{n}{n > myMax ? ' 🔒' : ''}</option>
          ))}
        </select>
      </label>
      {level > 0 && (
        <p className="muted">
          {Array.from({ length: level }, (_, i) => ASCENSION_RUNGS[i + 1]).join(' · ')}
        </p>
      )}
      {!solo && <p className="muted">You hold the dial — the rung binds both seats.</p>}
    </div>
  );
}

function Phase({ state, net, partnerOn, hpOffsets }: {
  state: ClientState; net: Net; partnerOn: boolean;
  hpOffsets: Record<string, number> | null;
}): JSX.Element {
  switch (state.phase) {
    case 'lobby': {
      const solo = !!state.botSeat;
      // S2.1: in solo the Witness resents being drafted; co-op keeps its greeting
      const soloLines = witnessPoolLines('solo_greeting');
      const soloPool = soloLines.length > 0 ? soloLines : LOBBY_GREETINGS;
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
    case 'rites':
      return <RiteOffer state={state} net={net} />;
    case 'map':
      return <MapView state={state} net={net} />;
    case 'combat':
      return <Combat state={state} net={net} hpOffsets={hpOffsets} />;
    case 'reward':
      return <Reward state={state} net={net} />;
    case 'event':
      return <EventView state={state} net={net} />;
    case 'rest':
      return <Rest state={state} net={net} />;
    case 'covet_treasure':
      return <CovetTreasure state={state} net={net} />;
    case 'shop':
      return <Shop state={state} net={net} />;
    case 'loom':
      return <LoomEye state={state} net={net} />;
    case 'victory':
      return (
        <div className="center end-screen end-victory">
          <TitleCord left={state.players.p1.character} right={state.botSeat ? 'witness' : state.players.p2.character} />
          <h2>The Unraveled lies still.</h2>
          <RunSummary state={state} won={true} />
          <p className="muted">A full clear — screenshot this for the calibration pile.</p>
          <MicroSurvey net={net} runKey={String(state.seed)} />
          <button className="big" data-gp="META" onClick={() => net.leave()}>Leave room (descend again)</button>
          <BugReportButton net={net} />
        </div>
      );
    case 'game_over':
      return (
        <div className="center end-screen end-defeat">
          <h2>The descent ends here.</h2>
          <RunSummary state={state} won={false} />
          <p className="muted">Death is a fresh run — screenshot this for the calibration pile first.</p>
          <MicroSurvey net={net} runKey={String(state.seed)} />
          <button className="big" data-gp="META" onClick={() => net.leave()}>Leave room (descend again)</button>
          <BugReportButton net={net} />
        </div>
      );
    default:
      return <div className="center">…</div>;
  }
}

// ---------------------------------------------------------------------------
// Map
// ---------------------------------------------------------------------------

/** S11.7: variant nodes wear their own names — the price is visible from
 *  the map (both seats see the same face; scouting is the asymmetric layer) */
function nodeName(n: MapNode): string {
  if (n.variant === 'toll') return 'toll-door';
  if (n.variant === 'covet') return 'covet cache';
  return NODE_NAME[n.kind] ?? n.kind;
}

function nodeLabel(map: ClientState['map'], id: number): string {
  const n = map.nodes.find((x) => x.id === id);
  return n ? `${NODE_ICON[n.kind]} ${nodeName(n)}` : '?';
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
  // S11.8 braid maps: lane is a strand COLUMN (truth 0 · knot 1 · power 2,
  // widened slots 1/3) and lanes within a layer can be sparse — stranded
  // nodes and the knots keep their absolute lane so the two warps read as
  // parallel verticals crossing only at the knots. Density-centering a
  // braid layer shears the columns (and pushes lane 3 off-canvas). Only
  // strandless layers (the shared breath, the boss) center; non-braid maps
  // have dense lanes and keep the old layout exactly.
  const braid = map.nodes.some((n) => n.strand);
  const maxLanes = braid
    ? Math.max(...map.nodes.map((n) => n.lane)) + 1
    : Math.max(...laneCounts.values());
  const COL = 168, ROW = 92;
  const W = maxLanes * COL, H = layerCount * ROW;
  const pos = (n: MapNode): { x: number; y: number } => {
    const absolute = braid && (!!n.strand || n.kind === 'elite');
    const offset = absolute ? 0 : ((maxLanes - (laneCounts.get(n.layer) ?? 1)) * COL) / 2;
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
          You<RitePips state={state} pid={you} />: <b>{map.picks[you] !== null ? nodeLabel(map, map.picks[you]!) : 'choosing…'}</b>
        </span>
        {' · '}
        <span style={{ color: PCOLOR[partner] }}>
          {state.players[partner].character}<RitePips state={state} pid={partner} />: <b>{map.picks[partner] !== null ? nodeLabel(map, map.picks[partner]!) : 'choosing…'}</b>
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
              className={`mapnode ${here ? 'here' : ''} ${can ? 'can' : ''} ${cleared ? 'cleared' : ''} ${myPick ? 'mypick' : ''} ${theirPick ? 'theirpick' : ''} ${myPick && theirPick ? 'agreed' : ''} ${n.strand ? `strand-${n.strand}` : ''}`}
              style={{
                left: x, top: y,
                ...(myPick ? { outlineColor: PCOLOR[you] } : {}),
                ...(theirPick ? { boxShadow: `0 0 14px ${PCOLOR[partner]}`, borderColor: PCOLOR[partner] } : {}),
              }}
              disabled={!can}
              onClick={() => { audio.play('map_move'); net.act({ type: 'NODE_PICK', nodeId: n.id }); }}
            >
              {NODE_ICON[n.kind]} {nodeName(n)}
              {/* S11.6 asymmetric scouting: YOUR seat's face for this node —
                  the partner sees their own (or nothing). Say it out loud. */}
              {!cleared && state.scout?.[n.id] && (
                <span className="map-scout">{state.scout[n.id]}</span>
              )}
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
  // S10a The Unstrung: the dilemma read is an attack-or-Fray fork — it wears
  // the attack tint so the one intent that most wants attention has one
  read_chain: 'tel-attack',
  block: 'tel-guard', block_all: 'tel-guard',
  buff_strength: 'tel-buff', buff_strength_all: 'tel-buff',
  debuff_weak: 'tel-debuff', debuff_vulnerable: 'tel-debuff', sever: 'tel-debuff',
};

function Combat({ state, net, hpOffsets }: { state: ClientState; net: Net; hpOffsets: Record<string, number> | null }): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const me = state.players[you];
  const combat = state.combat!;
  const [partnerHandOpen, setPartnerHandOpen] = useState(false);
  const [pendingCard, setPendingCard] = useState<string | null>(null);
  const [pendingSever, setPendingSever] = useState(false);
  const [pendingPulse, setPendingPulse] = useState(false);
  const [reclaimOpen, setReclaimOpen] = useState(false);
  // PT3: per-enemy damage forecast — toggle-able, ON by default (localStorage
  // so it survives reloads; easy to flip off if it ever needs reverting)
  const [showDmg, setShowDmg] = useState(() => localStorage.getItem('tb_dmgPreview') !== '0');
  const toggleDmg = () => setShowDmg((v) => { localStorage.setItem('tb_dmgPreview', v ? '0' : '1'); return !v; });

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
  // S9c.6: same def resolver as engine resolution — preview == reality
  const resonance = useMemo(
    () => computeResonanceSlots(combat.chain, firedAll, (slot) => defFor(state, slot.owner, slot.cardInstanceId)),
    [combat.chain, firedAll, state],
  );
  const plannedBlock = useMemo(() => {
    try { return computePlannedBlock(state); } catch { return { p1: 0, p2: 0 } as Record<PlayerId, number>; }
  }, [state]);
  // PT3: per-enemy HP-loss forecast from the staged chain (§11 static preview)
  const plannedDamage = useMemo(() => {
    try { return computePlannedDamage(state); } catch { return {} as Record<string, number>; }
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
    net.act({ type: 'STAGE_CARD', cardInstanceId: cardId, slot: combat.chain.length, targetId });
    setPendingCard(null);
  };

  const onHandClick = (cardId: string) => {
    const def = defFor(state, you, cardId);
    if (def.needsTarget) setPendingCard(pendingCard === cardId ? null : cardId);
    else stage(cardId);
  };

  const onEnemyClick = (enemyId: string) => {
    if (pendingSever) {
      net.act({ type: 'DECLARE_THREAD', kind: 'sever', targetId: enemyId });
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
          // playback: while the theater narrates, show HP as of the last
          // played beat instead of the broadcast's final value
          const ehp = displayHp(hpOffsets, e.id, e.hp, e.maxHp);
          // PT3: predicted HP loss from the staged chain (estimate)
          const dmg = showDmg && ehp > 0 ? Math.min(ehp, plannedDamage[e.id] ?? 0) : 0;
          const curPct = (100 * ehp) / e.maxHp;
          const postPct = (100 * (ehp - dmg)) / e.maxHp;
          return (
            <div
              key={e.id}
              data-fxid={e.id}
              data-gp={e.hp > 0 && !e.untargetable ? 'ENEMIES' : undefined}
              data-inspect={`enemy:${e.defId}`}
              className={`enemy ${def.boss ? 'boss' : ''} ${def.elite ? 'elite' : ''} ${fraying ? 'sigil-fraying' : ''} ${ehp <= 0 ? 'dead' : ''} ${e.untargetable ? 'untargetable' : ''} ${pendingCard || pendingSever ? 'targetable' : ''} ${TELEGRAPH[e.intent.kind] ?? ''}`}
              style={{ borderColor: e.boundTo ? PCOLOR[e.boundTo] : 'var(--line)', animationDelay: `${(i * 0.7) % 2}s` }}
              onClick={() => e.hp > 0 && !e.untargetable && onEnemyClick(e.id)}
            >
              <Mark id={e.defId} tier={def.boss ? 'boss' : def.elite ? 'elite' : 'normal'} act={def.act} size={sigilSize} className="enemy-sigil" />
              <div className="ename">{enemyName(combat, e.id)}{def.elite ? ' ☠' : def.boss ? ' ♛' : ''}</div>
              <div className="hpbar">
                <div className="hpfill" style={{ width: `${curPct}%` }} />
                {/* PT3: the chunk the staged chain will remove */}
                {dmg > 0 && <div className="hppreview" style={{ left: `${postPct}%`, width: `${curPct - postPct}%` }} />}
              </div>
              <div>
                {ehp}/{e.maxHp}{e.block > 0 && <span className="chipblock"> 🛡{e.block}</span>}
                {dmg > 0 && (ehp - dmg <= 0
                  ? <b className="dmg-lethal" data-inspect="kw:block-planned"> ☠ lethal</b>
                  : <span className="dmg-forecast" data-inspect="kw:block-planned"> −{dmg} → {ehp - dmg}</span>)}
              </div>
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
              <div className="intent">{ehp > 0 && intentText(e.intent, e.strength, e.weak)}</div>
              {/* S10a legibility rule: the co-op hook is stated, not autopsied */}
              {ehp > 0 && def.mechanicLine && <div className="mech-reveal">{def.mechanicLine}</div>}
              {/* nt-slice S6.5: shrine-earned mechanic reveals + the pre-fire
                  whisper of a hidden mechanic — rendered strings only */}
              {e.hp > 0 && e.revealedMechanics?.map((line, m) => (
                <div key={m} className="mech-reveal">{line}</div>
              ))}
              {e.hp > 0 && e.telegraph && <div className="mech-telegraph">{e.telegraph}</div>}
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
          net.act({ type: 'DECLARE_THREAD', kind: 'pulse', targetId: cardInstanceId });
          setPendingPulse(false);
        }} />

      {/* one row: player panels are the cord's endpoints (screen-height budget) */}
      <div className="combat-table">
        <PStat state={state} pid={you} plannedBlock={plannedBlock[you]} partnerHandOpen={partnerHandOpen} setPartnerHandOpen={setPartnerHandOpen} hpOffsets={hpOffsets} />
        <ThreadCord value={state.thread} max={state.threadMax} mode={cordMode} compact
          left={state.players.p1.character} right={state.players.p2.character} />
        <PStat state={state} pid={partner} plannedBlock={plannedBlock[partner]} partnerHandOpen={partnerHandOpen} setPartnerHandOpen={setPartnerHandOpen} hpOffsets={hpOffsets} />
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
        <button data-gp="THREAD" data-inspect="kw:steady" disabled={me.ready || me.fallen || severed || anyFallen} onClick={() => net.act({ type: 'DECLARE_THREAD', kind: 'steady' })}>Steady (1)</button>
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
              // S9b.1-3: show what the card will BE on arrival — its
              // post-mutation cost, and Quickening's upgrade marker. The
              // shape comes from the same helper the reducer builds the
              // echo from, so this preview cannot drift from reality.
              const srcDefId = inst(state, partner, id)!.defId;
              const shape = reclaimEchoShape(state.players[you], srcDefId);
              const arrival = effectiveDef({ instanceId: 'preview', ...shape });
              return (
                <button key={id} className="chip" data-gp={claimed ? undefined : 'THREAD'} disabled={claimed}
                  data-inspect={`card:${srcDefId}:mprev`}
                  onClick={() => {
                    if (claimed) return;
                    net.act({ type: 'DECLARE_THREAD', kind: 'reclaim', targetId: id });
                    setReclaimOpen(false);
                  }}>
                  <span className="cost">{arrival.cost}</span> {defFor(state, partner, id).name}{shape.upgraded && !shape.mutated ? ` ${GLYPH.upgraded}` : ''}{CARDS[srcDefId].mutation ? ' ◈' : ''}{claimed ? ' (reclaiming)' : ''}
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
          onClick={() => { audio.play(you === 'p1' ? 'ready_p1' : 'ready_p2'); net.act({ type: 'SET_READY', ready: !me.ready }); }}>
          {me.ready ? 'Unready' : 'Ready'}
        </button>
        <span className="muted">turn {combat.turn}</span>
        {state.players[partner].ready && !me.ready && <span className="nudge">your partner is ready</span>}
        <button className="chip" data-gp="META" title="forecast each enemy's HP loss when the turn resolves (estimate)"
          onClick={toggleDmg}>
          dmg preview: {showDmg ? 'on' : 'off'}
        </button>
        <span className="muted">
          draw {state.counts[you].draw} · discard {me.discard.length}
        </span>
      </div>

      <Log log={state.log} state={state} />
    </div>
  );
}

function PStat({ state, pid, plannedBlock, partnerHandOpen, setPartnerHandOpen, hpOffsets }: {
  state: ClientState; pid: PlayerId; plannedBlock?: number;
  partnerHandOpen: boolean; setPartnerHandOpen: (o: boolean) => void;
  hpOffsets?: Record<string, number> | null;
}): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const p = state.players[pid];
  const hp = displayHp(hpOffsets ?? null, pid, p.hp, p.maxHp);
  return (
    <div data-fxid={pid} className={`pstat ${p.fallen ? 'fallen' : ''}`} style={{ borderColor: PCOLOR[pid] }}>
      <b style={{ color: PCOLOR[pid] }}>{CHAR_NAME[p.character]}</b> {pid === you && '(you)'}
      <RitePips state={state} pid={pid} />{/* S7.3: glanceable on flagged runs only */}
      {pid === state.botSeat && <span className="muted"> · the Witness</span>}
      {p.fallen && <b className="fray" data-inspect="kw:fallen"> — FALLEN</b>}
      <div>
        HP {hp}/{p.maxHp}
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
  // PT3: mouse drag-to-reorder your staged cards (parallels the ◀▶ buttons /
  // pad L2-R2). dropAt is the insertion GAP (0..len) in the current order.
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const reorderable = (i: number): boolean => chain[i].owner === you && !pendingPulse;
  const onCardDragOver = (e: React.DragEvent, i: number): void => {
    if (!dragId) return;
    e.preventDefault(); // allow the drop
    const r = e.currentTarget.getBoundingClientRect();
    setDropAt(e.clientX > r.left + r.width / 2 ? i + 1 : i);
  };
  const onCardDrop = (e: React.DragEvent): void => {
    e.preventDefault();
    const si = dragId ? chain.findIndex((s) => s.cardInstanceId === dragId) : -1;
    if (si >= 0 && dropAt !== null) {
      // reducer removes then splices at `slot`, so the final index is `slot`;
      // a gap past the source shifts left by one once the source is pulled out
      const f = Math.max(0, Math.min(chain.length - 1, dropAt > si ? dropAt - 1 : dropAt));
      if (f !== si) net.act({ type: 'REORDER', cardInstanceId: dragId!, slot: f });
    }
    setDragId(null);
    setDropAt(null);
  };
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
            <div
              className={`chaincard ${lit ? 'fires' : ''} ${resonance.has(i) ? 'resonates' : ''} ${reorderable(i) ? 'draggable' : ''} ${dragId === slot.cardInstanceId ? 'dragging' : ''} ${dropAt === i ? 'drop-left' : ''} ${dropAt === chain.length && i === chain.length - 1 ? 'drop-right' : ''}`}
              style={{ borderColor: PCOLOR[slot.owner] }}
              draggable={reorderable(i)}
              onDragStart={(e) => { setDragId(slot.cardInstanceId); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', slot.cardInstanceId); }}
              onDragOver={(e) => onCardDragOver(e, i)}
              onDrop={onCardDrop}
              onDragEnd={() => { setDragId(null); setDropAt(null); }}>
              <div className="slotnum">{i + 1}</div>
              <Card def={def} small echo={!!inst(state, slot.owner, slot.cardInstanceId)?.echo}
                upgraded={!!inst(state, slot.owner, slot.cardInstanceId)?.upgraded}
                mutated={!!inst(state, slot.owner, slot.cardInstanceId)?.mutated}
                badge={momentumBonus[i] > 0 ? `➤+${momentumBonus[i]}` : undefined}
                gpZone={mine && !pendingPulse ? 'CHAIN' : undefined}
                inspect={inspectKeyFor(state, slot.owner, slot.cardInstanceId)}
                onClick={() => mine && !pendingPulse && net.act({ type: 'UNSTAGE_CARD', cardInstanceId: slot.cardInstanceId })} />
              {target && <div className="target">→ {enemyName(combat, target.id)}</div>}
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
              {resonance.has(i) && (() => {
                // S9c.5 rung i: the multiplier renders explicitly — base
                // ×1.5 → result (per hit) instead of an abstract "+50%"
                const prim = resolvedEffects.find((e) => (e as { primary?: boolean }).primary && 'amount' in e) as { amount: number } | undefined;
                return (
                  <div className="resonance" data-inspect="kw:resonance">
                    {prim && scales ? `✦ ${prim.amount} ×1.5 → ${Math.ceil(prim.amount * 1.5)}` : '✦ RESONANCE · streak only'}
                  </div>
                );
              })()}
              {mine && !pendingPulse && (
                <div className="reorder">
                  <button data-gp-reorder="left" onClick={() => net.act({ type: 'REORDER', cardInstanceId: slot.cardInstanceId, slot: Math.max(0, i - 1) })}>◀</button>
                  <button data-gp-reorder="right" onClick={() => net.act({ type: 'REORDER', cardInstanceId: slot.cardInstanceId, slot: Math.min(chain.length - 1, i + 1) })}>▶</button>
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
              onClick={() => t.player === you && net.act({ type: 'UNDECLARE_THREAD', kind: t.kind })}>
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
      className={`card tag-${def.tag} r-${def.rarity ?? 'common'} ${small ? 'small' : ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''} ${echo ? 'echo' : ''} ${upgraded ? 'upgraded' : ''} ${mutated ? 'mutated' : ''} ${def.riteOnly ? 'rite-card' : ''}`}
      data-gp={!disabled && onClick ? gpZone : undefined}
      data-inspect={inspect ?? `card:${def.id}`}
      onClick={onClick}>
      {badge && <div className="card-badge" data-inspect="kw:momentum">{badge}</div>}
      {/* S9d.3: the tally chip — the Machine's bookkeeping made visible */}
      {(def.grownStep ?? 0) > 0 && (
        <div className="card-badge tally-chip">{def.growsWith?.tiers ? `▲${'·'.repeat(def.grownStep!)}` : `▲+${def.grownStep}`}</div>
      )}
      <div className="cardtop"><span className="cost">{def.cost}</span> <span className="cname">{upgraded ? `${GLYPH.upgraded} ` : ''}{def.name}</span></div>
      <div className="ctag">{GLYPH[def.tag]} {def.tag}{def.keep ? ' · Keep' : ''}{def.exhaust ? ' · Exhaust' : ''}{echo ? ` · ${GLYPH.echo} Echo` : ''}{mutated ? ` · ${GLYPH.mutated} Mutated` : ''}</div>
      {/* upgrade texts restate the link clause inline; the ⚡ line below is
          the canonical display — trim the duplicate so links don't read twice */}
      <div className="ctext">{def.link && def.text.includes('Link (') ? def.text.slice(0, def.text.indexOf('Link (')).trim() : def.text}</div>
      {def.link && <div className="clink"><b>{GLYPH.link} Link ({def.link.condition}):</b> {linkBody(def.link.text)}</div>}
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
    // S10a The Unstrung: the dilemma is the intent — both branches shown
    case 'read_chain': return `reads the Chain — Resonate: FRAY ${intent.fray} · hold back: ⚔ ${s(intent.amount)}×2${w}`;
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
                            if (canPick) { audio.play('purchase'); net.act({ type: 'REWARD_PICK', pick: defId }); }
                            else if (canCovet) { audio.play('covet'); net.act({ type: 'COVET_PICK', pick: defId }); }
                          }} />
                        {taken && <div className="muted">taken</div>}
                      </div>
                    );
                  })}
                </div>
                {pid === you && r.picked[you] === null && (
                  <button data-gp="META" onClick={() => net.act({ type: 'REWARD_PICK', pick: 'skip' })}>Skip</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      <div>
        {/* OQ#42: no separate "Pass on Coveting" — ADVANCE auto-passes an undecided Covet */}
        <button className="big" data-gp="META" disabled={(!treasureOnly && (r.picked.p1 === null || r.picked.p2 === null)) || state.advanceReady[you]}
          onClick={() => net.act({ type: 'ADVANCE' })}>
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
  // S11.4: the current stage (existing events are 1-stage at path [])
  const stage = eventStageAt(def, ev.stagePath ?? []);
  const deepened = (ev.stagePath ?? []).length > 0;
  // unmet keyed options never render (R6: unseen doors); stubs are GENERATED
  const options = stage.options.filter((o) => eventOptionAvailable(state as never, ev.subject, o));
  const stub = (effects: readonly { op: string }[]): string =>
    effects.map((e) => eventEffectClause(e as never)).filter(Boolean).join(' · ');
  // S7.4: the mirror sacrament arrives HERE, at the event result — the engine
  // gates the owed seat's ADVANCE, so the trio stands where Onward would be
  const owedYou = state.ritesState?.birthChoice === you;
  const owedPartner = state.ritesState?.birthChoice != null && !owedYou;
  return (
    <div className="center event">
      <h2>{def.name}</h2>
      <p className="prose" data-inspect={`scan:${stage.prose}`}>{stage.prose}</p>
      {/* S11.4: the POT — visible while the wager deepens */}
      {deepened && ev.chosen === null && (ev.pot?.length ?? 0) > 0 && (
        <p className="muted pot">In the pot: {stub(ev.pot!)}</p>
      )}
      {def.crossed && (
        <p className="crossed">
          Crossed choice: <b style={{ color: PCOLOR[ev.chooser] }}>{state.players[ev.chooser].character}</b> decides
          for <b style={{ color: PCOLOR[ev.subject] }}>{state.players[ev.subject].character}</b>.
          {youChoose ? ' The choice is yours.' : ' Your fate is in their hands.'}
        </p>
      )}
      {ev.chosen === null ? (
        youChoose ? (
          options.map((o) => (
            <button key={o.id} className="big event-option" data-gp="META" data-inspect={`scan:${o.label}`}
              onClick={() => net.act({ type: 'EVENT_CHOOSE', optionId: o.id })}>
              {o.label}
              {/* S11.4 effect stub: generated from the effects array, never
                  hand-authored; secret riders are not ops, so omission IS
                  the secrecy (R6) */}
              {stub(o.effects) && <span className="stub"> — {stub(o.effects)}</span>}
              {/* S11.5: the depth marker only where the door actually opens
                  (unflagged runs resolve this option terminal — no tease) */}
              {eventOptionDeepens(state as never, o) && <span className="stub"> …it goes deeper</span>}
            </button>
          ))
        ) : (
          <p className="muted">Waiting for {state.players[ev.chooser].character} to choose…</p>
        )
      ) : (
        <>
          <p className="prose" data-inspect={`scan:${ev.resultText}`}>{ev.resultText}</p>
          {/* S11.4 delta line: exactly what changed, generated */}
          {ev.deltaLine && <p className="delta" data-inspect="scan:delta">Δ {ev.deltaLine}</p>}
          <Log log={state.log} state={state} />
          {owedYou ? (
            <BirthRiteTrio state={state} net={net} />
          ) : (
            <>
              {owedPartner && (
                <p className="muted">The loom holds its breath — {seatName(state, you === 'p1' ? 'p2' : 'p1')} must choose.</p>
              )}
              <button className="big" data-gp="META" disabled={state.advanceReady[you]} onClick={() => net.act({ type: 'ADVANCE' })}>
                {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
              </button>
            </>
          )}
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
  // S11.7 toll door: one seat heals (1.5× a plain rest), named by vote-match
  if (rest.toll) {
    const toll = rest.toll;
    const healPct = Math.round(ascensionMods(state.ascension ?? 0).restHeal * 1.5 * 100);
    return (
      <div className="center">
        <h2>Toll-Door Rest</h2>
        <p className="prose">
          The door grants ONE mercy — a deeper rest ({healPct}% HP) for a single traveler.
          Name who takes it. You must both name the same seat.
        </p>
        <Log log={state.log} state={state} />
        {toll.healed === null ? (
          <>
            {(['p1', 'p2'] as PlayerId[]).map((pid) => (
              <button key={pid} className="big" data-gp="META"
                style={toll.votes[you] === pid ? { outlineColor: PCOLOR[pid], outlineStyle: 'solid' } : {}}
                onClick={() => net.act({ type: 'TOLL_PICK', seat: pid })}>
                <span style={{ color: PCOLOR[pid] }}>{state.players[pid].character}</span>
                {' '}takes it ({state.players[pid].hp}/{state.players[pid].maxHp} HP)
              </button>
            ))}
            <p className="muted">
              You: <b>{toll.votes[you] ? state.players[toll.votes[you]!].character : 'naming…'}</b>
              {' · '}
              {state.players[partner].character}: <b>{toll.votes[partner] ? 'has named' : 'naming…'}</b>
              {' '}(disagreement resets both)
            </p>
          </>
        ) : (
          <>
            <p>The door opened for <b style={{ color: PCOLOR[toll.healed] }}>{state.players[toll.healed].character}</b> alone.</p>
            <button className="big" data-gp="META" disabled={state.advanceReady[you]} onClick={() => net.act({ type: 'ADVANCE' })}>
              {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
            </button>
          </>
        )}
      </div>
    );
  }
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
          <button className="big" data-gp="META" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'rest' })}>
            Rest (heal {Math.round(ascensionMods(state.ascension ?? 0).restHeal * 100)}%)
          </button>
          <button className="big" data-gp="META" data-inspect="kw:upgrade" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'upgrade' })}>Upgrade a card</button>
          <button className="big" data-gp="META" data-inspect="kw:covet" onClick={() => net.act({ type: 'REST_CHOOSE', option: 'barter' })}>Barter (+1 Covet charge)</button>
          <button className="big" data-gp="META" disabled={state.rebraidUsed} onClick={() => net.act({ type: 'REST_CHOOSE', option: 'rebraid' })}>
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
                  onClick={() => net.act({ type: 'UPGRADE_PICK', cardInstanceId: c.instanceId })}>
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
          <button className="big" data-gp="META" disabled={state.advanceReady[you]} onClick={() => net.act({ type: 'ADVANCE' })}>
            {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
          </button>
        </>
      )}
      {hasKnife && chosen !== null && !needUpgradePick && <Wedding state={state} net={net} />}
    </div>
  );
}

/** S11.7 covet cache: the treasure rolled its usual spoils, but the pair
 *  takes ONE by vote-match — and a Covet charge seizes the other. */
function CovetTreasure({ state, net }: { state: ClientState; net: Net }): JSX.Element {
  const you = state.you;
  const partner: PlayerId = you === 'p1' ? 'p2' : 'p1';
  const ct = state.covetTreasure!;
  const relic = RELICS_BY_ID[ct.relicId];
  const me = state.players[you];
  return (
    <div className="center">
      <h2>Covet Cache</h2>
      <p className="prose">
        Coin and a keepsake behind old glass. The case opens ONCE — take one, leave the other.
        You must both name the same prize.
      </p>
      <Log log={state.log} state={state} />
      {ct.taken === null ? (
        <>
          <button className="big" data-gp="META"
            style={ct.votes[you] === 'gold' ? { outlineStyle: 'solid' } : {}}
            onClick={() => net.act({ type: 'TREASURE_PICK', choice: 'gold' })}>
            The coin — {ct.gold} gold
          </button>
          <button className="big" data-gp="META" data-inspect={`relic:${ct.relicId}`}
            style={ct.votes[you] === 'relic' ? { outlineStyle: 'solid' } : {}}
            onClick={() => net.act({ type: 'TREASURE_PICK', choice: 'relic' })}>
            {relic?.name ?? ct.relicId} — to <span style={{ color: PCOLOR[ct.owner] }}>{state.players[ct.owner].character}</span>
          </button>
          <p className="muted">
            You: <b>{ct.votes[you] ?? 'naming…'}</b> · {state.players[partner].character}: <b>{ct.votes[partner] ? 'has named' : 'naming…'}</b>
            {' '}(disagreement resets both)
          </p>
        </>
      ) : (
        <>
          <p>Taken: <b>{ct.taken === 'gold' ? `${ct.gold} gold` : relic?.name ?? ct.relicId}</b>.</p>
          {ct.seizedBy === null ? (
            <button className="big" data-gp="META" data-inspect="kw:covet" disabled={me.covetCharges < 1}
              onClick={() => net.act({ type: 'TREASURE_SEIZE' })}>
              Covet the rest ({ct.taken === 'gold' ? relic?.name ?? ct.relicId : `${ct.gold} gold`}) — 1 charge
              {me.covetCharges < 1 ? ' (none left)' : ''}
            </button>
          ) : (
            <p className="crossed">{state.players[ct.seizedBy].character} coveted the rest. The case stands empty.</p>
          )}
          <button className="big" data-gp="META" disabled={state.advanceReady[you]} onClick={() => net.act({ type: 'ADVANCE' })}>
            {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
          </button>
        </>
      )}
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
                onClick={() => net.act({ type: 'WEDDING_PICK', cardInstanceId: c.instanceId })} />
            ))}
          </div>
          {w?.offers.p1 && w?.offers.p2 && (
            <button className="big" data-gp="META" disabled={w.confirmed[you]} onClick={() => net.act({ type: 'WEDDING_CONFIRM' })}>
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
                      if (!item.sold && pid === you) { audio.play('purchase'); net.act({ type: 'SHOP_BUY', itemId: item.id }); }
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
              onClick={() => { audio.play('purchase'); net.act({ type: 'SHOP_BUY', itemId: item.id }); }}>
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
                  net.act({ type: 'SHOP_REMOVE', itemId: removing, cardInstanceId: c.instanceId });
                  setRemoving(null);
                }} />
            ))}
          </div>
        )}
      </div>
      <button className="big" data-gp="META" disabled={state.advanceReady[you]} onClick={() => net.act({ type: 'ADVANCE' })}>
        {state.advanceReady[you] ? 'waiting for partner…' : 'Onward'}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function Log({ log, state }: { log: GameEvent[]; state: ClientState }): JSX.Element {
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
  const ename = (id: string) => enemyName(state.combat, id);
  // freeform engine `detail` strings carry wire seat ids — render them with
  // the same names the typed events use
  const subj = (s: string) => s.replace(/\bp1\b/g, pname('p1')).replace(/\bp2\b/g, pname('p2'));
  switch (e.e) {
    case 'witness': return `THE WITNESS: “${e.line}”`;
    case 'card': return `[${e.slot + 1}] ${pname(e.player)} plays ${e.card}${e.linkFired ? ' ⚡' : ''}${e.resonance ? ' ✦' : ''}`;
    case 'damage': return `  → ${ename(e.target)} loses ${e.hpLoss} HP${e.blocked ? ` (${e.blocked} blocked)` : ''}`;
    case 'detonate': return `  ✸ ${ename(e.target)}: ${e.stacks} Hex detonate for ${e.damage}`;
    case 'hex': return `  ☠ ${ename(e.target)} +${e.amount} Hex`;
    case 'block': return `  🛡 ${e.target === 'p1' || e.target === 'p2' ? pname(e.target as PlayerId) : ename(e.target)} +${e.amount} Block`;
    case 'enemy_action': return `${ename(e.enemy)} ${subj(e.detail)}`;
    case 'enemy_dead': return `${ename(e.enemy)} is destroyed.`;
    case 'player_hit': return `${pname(e.player)} loses ${e.hpLoss} HP${e.blocked ? ` (${e.blocked} blocked)` : ''}.`;
    case 'fallen': return `${pname(e.player)} has FALLEN. The Thread goes slack.`;
    case 'revived': return `${pname(e.player)} is carried out and revives at 1 HP.`;
    case 'thread_severed': return `THE THREAD IS SEVERED for ${e.turns} turns.`;
    case 'thread_reignited': return 'THE THREAD REIGNITES at full strength.';
    case 'thread_action': return `${pname(e.player)} uses ${e.kind}.`;
    case 'fray': return 'The Thread FRAYS — you both pay for it.';
    // S9c.5 rung i: the log line names the streak length and the ignited card
    case 'resonance_ignite': return `✦ RESONANCE — ${e.card ? `${e.card} ignites off ` : ''}a ${e.tags.length}-card streak [${e.tags.join(' → ')}]`;
    case 'relic': return `${pname(e.player)} claims a relic: ${RELICS_BY_ID[e.relic]?.name ?? e.relic}.`;
    case 'info': return subj(e.detail);
    default: return JSON.stringify(e);
  }
}
