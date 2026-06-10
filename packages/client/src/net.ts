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
}

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
      const token = localStorage.getItem('tb_token');
      if (token) this.send({ type: 'hello', token });
    };
    this.ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      switch (msg.type) {
        case 'state': return this.events.onState(msg.state);
        case 'joined':
          localStorage.setItem('tb_token', msg.token);
          localStorage.setItem('tb_code', msg.code);
          return this.events.onJoined(msg);
        case 'presence': return this.events.onPresence(msg.partnerConnected);
        case 'error':
          if (msg.message === 'unknown session') {
            localStorage.removeItem('tb_token');
            localStorage.removeItem('tb_code');
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
}
