// B1 — controller support. Gamepad API polled in a rAF loop; coexists with
// mouse/keyboard (last device wins). Navigation is DOM-driven: anything
// interactive carries data-gp="ZONE"; confirm synthesizes a click so the
// controller reuses the exact mouse handlers on every screen.

export type PadFlavor = 'ps' | 'xbox';

export interface GlyphSet {
  confirm: string; cancel: string; menu: string; inspect: string;
  zone: string; reorder: string; ready: string; overview: string; scroll: string;
}

export const GLYPHS: Record<PadFlavor, GlyphSet> = {
  ps: { confirm: '✕', cancel: '○', menu: '□', inspect: '△', zone: 'L1/R1', reorder: 'L2/R2', ready: 'Options (hold)', overview: 'Create', scroll: 'R-stick' },
  xbox: { confirm: 'A', cancel: 'B', menu: 'X', inspect: 'Y', zone: 'LB/RB', reorder: 'LT/RT', ready: 'Menu (hold)', overview: 'View', scroll: 'R-stick' },
};

const ZONE_ORDER = ['ENEMIES', 'CHAIN', 'THREAD', 'HAND', 'META'];
const READY_HOLD_MS = 300;
const REPEAT_FIRST_MS = 280;
const REPEAT_MS = 140;

interface PadState {
  buttons: boolean[];
  axes: number[];
}

export class Controller {
  flavor: PadFlavor = 'ps';
  connected = false;
  active = false; // last input device was the pad
  focused: HTMLElement | null = null;
  onChange: (() => void) | null = null; // hint bar re-render
  onInspect: ((el: HTMLElement | null) => void) | null = null;
  onFeedback: (() => void) | null = null; // L1+R1 chord
  private prev: PadState = { buttons: [], axes: [] };
  private repeatTimers: Record<string, number> = {};
  private readyHeldSince = 0;
  private readyFired = false;
  private raf = 0;

  start(): void {
    const loop = () => {
      this.poll();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
    window.addEventListener('mousedown', () => this.setActive(false));
    window.addEventListener('gamepadconnected', (e) => {
      this.connected = true;
      const id = (e as GamepadEvent).gamepad.id.toLowerCase();
      this.flavor = /054c|dualsense|dualshock|playstation|sony/.test(id) ? 'ps' : 'xbox';
      this.onChange?.();
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.connected = false;
      this.setActive(false);
    });
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  private setActive(on: boolean): void {
    if (this.active === on) return;
    this.active = on;
    if (!on) this.setFocus(null);
    document.body.classList.toggle('pad-active', on);
    this.onChange?.();
  }

  private pad(): Gamepad | null {
    for (const p of navigator.getGamepads?.() ?? []) if (p) return p;
    return null;
  }

  private poll(): void {
    const pad = this.pad();
    if (!pad) return;
    const now = performance.now();
    const cur: PadState = {
      buttons: pad.buttons.map((b) => b.pressed),
      axes: [...pad.axes],
    };
    const pressed = (i: number) => cur.buttons[i] && !this.prev.buttons[i];
    const anyInput = cur.buttons.some(Boolean) || cur.axes.some((a) => Math.abs(a) > 0.5);
    if (anyInput) this.setActive(true);
    if (!this.active) {
      this.prev = cur;
      return;
    }

    // pad presses never fire pointerdown/keydown — anything that dismisses
    // "on any input" (hints) listens for this instead
    if (cur.buttons.some((b, i) => b && !this.prev.buttons[i])) {
      window.dispatchEvent(new CustomEvent('gp-input'));
    }

    // right stick pans the view (the map outgrows the viewport; the fixed
    // hint bar covers its foot). Left stick / dpad keep moving the focus.
    const rx = cur.axes[2] ?? 0;
    const ry = cur.axes[3] ?? 0;
    if (Math.abs(rx) > 0.3 || Math.abs(ry) > 0.3) {
      window.scrollBy(Math.abs(rx) > 0.3 ? rx * 24 : 0, Math.abs(ry) > 0.3 ? ry * 24 : 0);
    }

    // directional: dpad 12-15 + left stick, with hold-repeat
    const dirDown = {
      up: cur.buttons[12] || cur.axes[1] < -0.55,
      down: cur.buttons[13] || cur.axes[1] > 0.55,
      left: cur.buttons[14] || cur.axes[0] < -0.55,
      right: cur.buttons[15] || cur.axes[0] > 0.55,
    };
    for (const dir of ['up', 'down', 'left', 'right'] as const) {
      if (dirDown[dir]) {
        const t = this.repeatTimers[dir] ?? 0;
        if (t === 0) {
          this.move(dir);
          this.repeatTimers[dir] = now + REPEAT_FIRST_MS;
        } else if (now >= t) {
          this.move(dir);
          this.repeatTimers[dir] = now + REPEAT_MS;
        }
      } else {
        this.repeatTimers[dir] = 0;
      }
    }

    if (pressed(0)) this.confirm();
    if (pressed(1)) this.cancel();
    if (pressed(2)) this.jumpZone('THREAD'); // thread-action menu
    if (pressed(3)) this.onInspect?.(this.focused);
    // L1+R1 chord = feedback stamp overlay (playtest); single bumpers cycle zones
    if ((pressed(4) && cur.buttons[5]) || (pressed(5) && cur.buttons[4])) {
      this.onFeedback?.();
    } else {
      if (pressed(4)) this.cycleZone(-1);
      if (pressed(5)) this.cycleZone(1);
    }
    if (pressed(6)) this.reorder('left');
    if (pressed(7)) this.reorder('right');
    if (pressed(8) || pressed(17)) this.clickAction('overview'); // Create / touchpad

    // Options: hold-to-ready (B1 — prevents accidents)
    if (cur.buttons[9]) {
      if (this.readyHeldSince === 0) this.readyHeldSince = now;
      if (!this.readyFired && now - this.readyHeldSince >= READY_HOLD_MS) {
        this.readyFired = true;
        this.clickAction('ready');
      }
    } else {
      this.readyHeldSince = 0;
      this.readyFired = false;
    }

    this.prev = cur;
  }

  // ---- DOM navigation -------------------------------------------------------

  private items(): HTMLElement[] {
    return [...document.querySelectorAll<HTMLElement>('[data-gp]')].filter(
      (el) => !(el as HTMLButtonElement).disabled && el.offsetParent !== null,
    );
  }

  private zonesPresent(): string[] {
    const present = new Set(this.items().map((el) => el.dataset.gp!));
    return ZONE_ORDER.filter((z) => present.has(z));
  }

  setFocus(el: HTMLElement | null): void {
    if (this.focused === el) return;
    this.focused?.classList.remove('gp-focus');
    this.focused = el;
    if (el) {
      el.classList.add('gp-focus');
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    this.onChange?.();
  }

  /** Re-acquire focus after re-renders detach the focused node. */
  ensureFocus(): void {
    if (!this.active) return;
    if (this.focused && document.contains(this.focused)) return;
    const items = this.items();
    const zone = this.focused?.dataset.gp;
    const inZone = items.filter((el) => el.dataset.gp === zone);
    this.setFocus(inZone[0] ?? items[0] ?? null);
  }

  private move(dir: 'up' | 'down' | 'left' | 'right'): void {
    const items = this.items();
    if (items.length === 0) return;
    if (!this.focused || !document.contains(this.focused)) {
      this.setFocus(items[0]);
      return;
    }
    const zone = this.focused.dataset.gp!;
    const inZone = items.filter((el) => el.dataset.gp === zone);
    const from = this.focused.getBoundingClientRect();
    const fc = { x: from.left + from.width / 2, y: from.top + from.height / 2 };
    const horiz = dir === 'left' || dir === 'right';
    const measure = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      // edge-to-edge travel in the pressed direction (small overlaps allowed)
      const along =
        dir === 'left' ? from.left - r.right
        : dir === 'right' ? r.left - from.right
        : dir === 'up' ? from.top - r.bottom
        : r.top - from.bottom;
      // do our spans actually overlap on the perpendicular axis?
      const overlap = horiz
        ? Math.min(from.bottom, r.bottom) - Math.max(from.top, r.top)
        : Math.min(from.right, r.right) - Math.max(from.left, r.left);
      const across = horiz ? Math.abs(r.top + r.height / 2 - fc.y) : Math.abs(r.left + r.width / 2 - fc.x);
      return { el, along, overlap, across };
    };
    // Rectangle navigation, not center-distance: a move lands on something
    // your row/column actually faces. Tiers: aligned in-zone → aligned
    // anywhere → (vertical only) nearest with a heavy diagonal penalty, so
    // up/down always traverses but never warps far sideways; left/right
    // dead-end rather than teleport diagonally.
    const best = (pool: HTMLElement[], aligned: boolean) =>
      pool
        .filter((el) => el !== this.focused)
        .map(measure)
        .filter((c) => c.along > -6 && (!aligned || c.overlap > 2))
        .sort((a, b) => a.along + a.across * (aligned ? 0.3 : 2.5) - (b.along + b.across * (aligned ? 0.3 : 2.5)))[0]?.el;
    let next = best(inZone, true) ?? best(items, true);
    if (!next && !horiz) next = best(items, false);
    if (next) this.setFocus(next);
  }

  private cycleZone(delta: number): void {
    const zones = this.zonesPresent();
    if (zones.length === 0) return;
    const cur = this.focused?.dataset.gp;
    const idx = Math.max(0, zones.indexOf(cur ?? ''));
    const zone = zones[(idx + delta + zones.length) % zones.length];
    this.jumpZone(zone);
  }

  private jumpZone(zone: string): void {
    const first = this.items().find((el) => el.dataset.gp === zone);
    if (first) this.setFocus(first);
  }

  private confirm(): void {
    this.ensureFocus();
    this.focused?.click();
    queueMicrotask(() => this.ensureFocus());
  }

  private cancel(): void {
    // several cancelables can coexist (pending-target chip, narration
    // theater, deck overlay) — peel the TOPMOST, i.e. the last one rendered.
    // No offsetParent check: fixed-position overlays report null for it.
    const els = [...document.querySelectorAll<HTMLElement>('[data-gp-action="cancel"]')].filter(
      (el) => !(el as HTMLButtonElement).disabled && el.getClientRects().length > 0,
    );
    const top = els[els.length - 1];
    if (top) top.click();
    else this.onInspect?.(null);
  }

  private reorder(dir: 'left' | 'right'): void {
    // L2/R2 reorder the focused (own) chain card via its arrow buttons
    const btn = this.focused?.parentElement?.querySelector<HTMLElement>(`[data-gp-reorder="${dir}"]`)
      ?? this.focused?.querySelector<HTMLElement>(`[data-gp-reorder="${dir}"]`);
    btn?.click();
  }

  private clickAction(action: string): boolean {
    const el = document.querySelector<HTMLElement>(`[data-gp-action="${action}"]`);
    if (el && !(el as HTMLButtonElement).disabled) {
      el.click();
      return true;
    }
    return false;
  }
}

export const controller = new Controller();
