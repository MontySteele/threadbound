// B2 — keyword tooltip registry. Data-driven: name, one-line rule, flavor.
// The Witness gets one dry line per panel, low rotation.

export interface KeywordDef {
  id: string;
  name: string;
  rule: string;
  flavor?: string;
}

export const KEYWORDS: Record<string, KeywordDef> = {};
function kw(k: KeywordDef): void {
  KEYWORDS[k.id] = k;
}

kw({ id: 'link', name: 'Link', rule: 'Fires when the card in the previous Chain slot matches the named tag — yours or your partner’s. Pure bonus; the card always works without it.', flavor: 'The weave reads itself.' });
kw({ id: 'resonance', name: 'Resonance', rule: '3+ consecutive fired links with both players in the streak: the final card gets +50%. Solo streaks never ignite.', flavor: 'The Thread only burns for both of you.' });
kw({ id: 'thread', name: 'Thread', rule: 'Shared pool (max 10, +2 each turn). Spend it on Pulse, Reclaim, Sever Binding, Steady. Overdrafting Frays you both.', flavor: 'One line between two lives.' });
kw({ id: 'hex', name: 'Hex', rule: 'A charge placed on enemies. Inert until detonated: 4 damage per stack, ignoring Block.', flavor: 'A curse is patience with teeth.' });
kw({ id: 'detonate', name: 'Detonate', rule: 'Consumes Hex stacks on the target: 4 damage per stack, ignoring Block.', flavor: 'Patience, repaid.' });
kw({ id: 'momentum', name: 'Momentum', rule: 'Your next Strike deals +N (once), then Momentum halves. Some cards keep or multiply it.', flavor: 'An argument he is winning.' });
kw({ id: 'kindled', name: 'Kindled', rule: 'Gain N energy at the start of your next turn. Banks and stacks; clears on use.', flavor: 'Coals carried overnight.' });
kw({ id: 'keep', name: 'Keep', rule: 'Not discarded at end of turn. (Everything else in hand at commit is.)', flavor: 'Some things you don’t put down.' });
kw({ id: 'frayed', name: 'Frayed', rule: 'You take +25% damage per stack this turn. Both of you. Caused by overdrafting the Thread.', flavor: 'The bill arrives addressed to both of you.' });
kw({ id: 'fallen', name: 'Fallen', rule: 'At 0 HP: no turns, Powers dormant, enemies rebind to your partner, the Thread goes slack. Revive at 1 HP if your partner wins.', flavor: 'Not dead. Carried.' });
kw({ id: 'bound', name: 'Bound', rule: 'Each enemy targets only the player it is bound to (AoE excepted). Sever Binding (3 Thread) or taunts move it.', flavor: 'It has chosen you. How flattering.' });
kw({ id: 'sever', name: 'Sever Binding', rule: '3 Thread: move one enemy’s binding to the other player. On a chorus: rotates which body stands forward.', flavor: 'Trade your monsters like debts.' });
kw({ id: 'echo', name: 'Echo', rule: 'An ethereal copy taken via Reclaim. Exhausts at end of combat.', flavor: 'Borrowed, never owned.' });
kw({ id: 'mutated', name: 'Mutated', rule: 'A Reclaimed card arrives rewritten for its new owner — deterministic, learnable, discussable.', flavor: 'It crossed the Thread and came back different.' });
kw({ id: 'pulse', name: 'Pulse', rule: '2 Thread: your partner’s next card with a number gets +3. Skips cards with nothing to boost.', flavor: 'A squeeze of the hand, weaponized.' });
kw({ id: 'steady', name: 'Steady', rule: '1 Thread: remove a Frayed stack from you both, or shield against the next Fray this turn.', flavor: 'Breathe. Hold the line still.' });
kw({ id: 'reclaim', name: 'Reclaim', rule: '2 Thread: copy a card from your partner’s discard into your hand as a mutated Echo.', flavor: 'What’s theirs is yours, briefly.' });
kw({ id: 'covet', name: 'Covet', rule: 'After your partner picks a reward, spend a charge to take a card they passed over. +1 charge per elite; Barter at rest sites.', flavor: 'The commandments saw you coming.' });
kw({ id: 'weak', name: 'Weak', rule: 'Deals 25% less damage this turn per stack (rounds down).' });
kw({ id: 'vulnerable', name: 'Vulnerable', rule: 'Takes 50% more damage while it lasts.' });
kw({ id: 'stun', name: 'Stun', rule: 'Skips its next turn. Rare for a reason.' });
kw({ id: 'exhaust', name: 'Exhaust', rule: 'Removed from play until the end of combat after being played.' });
kw({ id: 'upgrade', name: 'Upgrade', rule: 'Each card has one hand-authored upgrade, taken at rest sites. Upgrades prefer deepening the Link — wider conditions, bigger payoffs.', flavor: 'Tighten the weave.' });
kw({ id: 'severed_thread', name: 'Severed Thread', rule: 'No Thread actions; links do not fire between your cards and your partner’s. Your engines must briefly survive solo.', flavor: 'Prove you can stand apart. Then stop doing that.' });
kw({ id: 'untargetable', name: 'Unbound', rule: 'Cannot be targeted while unbound. Sever a binding onto it to bring it forward.' });
kw({ id: 'starter', name: 'Starter', rule: 'Starter-only cards never appear in rewards. Shops will help you forget them.' });

/** Scan rules text + mechanics for keyword mentions → tooltip panel contents. */
export function keywordsIn(...texts: (string | undefined)[]): KeywordDef[] {
  const hay = texts.filter(Boolean).join(' ').toLowerCase();
  const hits: KeywordDef[] = [];
  const tests: Array<[string, RegExp]> = [
    ['link', /link \(/], ['resonance', /resonance/], ['thread', /thread/],
    ['hex', /hex/], ['detonate', /detonat/], ['momentum', /momentum/],
    ['kindled', /kindled/], ['keep', /\bkeep\b/], ['frayed', /fray/],
    ['fallen', /fallen/], ['bound', /\bbound\b|binding/], ['echo', /echo/],
    ['mutated', /mutat/], ['pulse', /pulse/], ['steady', /steady/],
    ['reclaim', /reclaim/], ['covet', /covet/], ['weak', /\bweak\b/],
    ['vulnerable', /vulnerable/], ['stun', /\bstun/], ['exhaust', /exhaust/],
    ['severed_thread', /severed/], ['untargetable', /untargetable|unbound/],
  ];
  for (const [id, re] of tests) {
    if (re.test(hay)) hits.push(KEYWORDS[id]);
  }
  return hits;
}
