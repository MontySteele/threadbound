// WebSocket plumbing: the client renders state and sends intents — it never
// computes game outcomes (§11). Session token in localStorage → reconnection.

import { Action, GameState, PlayerId } from '@threadbound/engine';

export interface ClientState extends GameState {
  you: PlayerId;
  counts: Record<PlayerId, { hand: number; draw: number }>;
}

export interface NetEvents {
  onState: (s: ClientState) => void;
  onJoined: (info: { token: string; code: string; playerId: PlayerId; character: string }) => void;
  onError: (message: string) => void;
  onPresence: (partnerConnected: boolean) => void;
  onConnection: (up: boolean) => void;
  onFeedbackAck?: (mood: string) => void;
}

// Storage keys are namespaced by an optional ?tab= query param so one browser
// can hold both seats for local testing (e.g. /?tab=2 in a second tab). Seats
// are token-based server-side; without distinct keys, tab 2 would say hello
// with tab 1's token and steal its seat.
const SEAT_NS = new URLSearchParams(location.search).get('tab') ?? '';
const TOKEN_KEY = `tb_token${SEAT_NS}`;
const CODE_KEY = `tb_code${SEAT_NS}`;

export class Net {
  private ws: WebSocket | null = null;
  private closed = false;

  constructor(private events: NetEvents) {
    this.connect();
  }

  private url(): string {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${proto}://${location.host}/ws`;
  }

  private connect(): void {
    this.ws = new WebSocket(this.url());
    this.ws.onopen = () => {
      this.events.onConnection(true);
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) this.send({ type: 'hello', token });
    };
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      switch (msg.type) {
        case 'state': return this.events.onState(msg.state);
        case 'joined':
          localStorage.setItem(TOKEN_KEY, msg.token);
          localStorage.setItem(CODE_KEY, msg.code);
          return this.events.onJoined(msg);
        case 'presence': return this.events.onPresence(msg.partnerConnected);
        case 'feedback_ack': return this.events.onFeedbackAck?.(msg.mood);
        case 'error':
          if (msg.message === 'unknown session') {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(CODE_KEY);
          }
          return this.events.onError(msg.message);
      }
    };
    this.ws.onclose = () => {
      this.events.onConnection(false);
      if (!this.closed) setTimeout(() => this.connect(), 1000); // auto-reconnect
    };
  }

  send(msg: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  create(character: 'vess' | 'bram'): void {
    this.send({ type: 'create', character });
  }

  join(code: string): void {
    this.send({ type: 'join', code });
  }

  start(): void {
    this.send({ type: 'start' });
  }

  act(action: Omit<Action, 'player'>): void {
    this.send({ type: 'action', action });
  }

  /** Playtest feedback stamp ([ bad / ] good / \ note, or pad L1+R1). */
  feedback(mood: 'good' | 'bad' | 'note', note?: string): void {
    this.send({ type: 'feedback', mood, note });
  }
}
