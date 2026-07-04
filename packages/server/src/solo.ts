// S1: the in-process solo partner. No loopback websocket — the driver is fed
// the SAME redacted view a remote client would receive and submits the same
// intents through the same reducer path, so protocol parity (§11) holds by
// construction. This file is pacing only; decisions live in the engine's
// BotPolicy (mode: 'solo').

import { Action, BotPolicy, BotView, PlayerId } from '@threadbound/engine';

export type BotSpeed = 'paced' | 'instant';

export class SoloBotDriver {
  private policy: BotPolicy;
  private lastView: BotView | null = null;
  private pending: NodeJS.Timeout | null = null;
  private watchdog: NodeJS.Timeout;
  private stopped = false;

  constructor(
    public seat: PlayerId,
    private getSpeed: () => BotSpeed,
    private submit: (action: Action) => void,
  ) {
    // S13.1b surface note (on record): BotPolicy is shared with the sim
    // fleet, so TB_BOT_DRAFT_V2 governs the solo partner's drafting too.
    // Default OFF this sprint (D7) — the flag protects the public build
    // until v2 has a clean battery behind it; the default flip is a
    // decision made in one loud re-anchor, not a side effect.
    this.policy = new BotPolicy({
      mode: 'solo',
      draftV2: process.env.TB_BOT_DRAFT_V2 === '1',
    });
    // safety net: re-decide if a broadcast was missed or an action bounced
    this.watchdog = setInterval(() => {
      if (!this.pending && this.lastView) this.schedule(this.lastView);
    }, 700);
    this.watchdog.unref?.();
  }

  onState(view: BotView): void {
    this.lastView = view;
    this.schedule(view);
  }

  stop(): void {
    this.stopped = true;
    if (this.pending) clearTimeout(this.pending);
    clearInterval(this.watchdog);
  }

  private schedule(view: BotView): void {
    if (this.stopped) return;
    if (this.pending) clearTimeout(this.pending);
    // policy seed derives from the run seed: decisions are reproducible across
    // reconnects and server restarts without persisting driver state
    this.policy.seed = (view.seed ^ 0x501f) >>> 0;
    const action = this.policy.decide(view);
    if (!action) {
      this.pending = null;
      return;
    }
    this.pending = setTimeout(() => {
      this.pending = null;
      this.submit(action);
    }, this.delayFor(view, action));
    this.pending.unref?.();
  }

  /** `paced` keeps human-ish rhythm; `instant` is the designer's testing gear.
   *  Readying gets the long beat (S1.2: "readies within ~2s" after the human),
   *  everything else lands fast enough to plan around. */
  private delayFor(view: BotView, action: Action): number {
    if (this.getSpeed() === 'instant') return 0;
    if (action.type === 'SET_READY') return 1700 + (view.seed % 500);
    if (view.phase === 'combat') return 550 + ((view.seed >> 3) % 350);
    return 700 + ((view.seed >> 5) % 400);
  }
}
