// S11.8 (Wave B) — strand composition targets. DATA, not code: the braid
// generator fills each strand against this table and the per-strand
// composition CI asserts it. Amendments are one-line (S11.11-4: the table
// is a sign-off row; sign-off gates the Wave B BATTERY, not this file's
// existence — proposal recorded in docs/S9B-S11-STATUS.md).
//
// Quotas count a strand's OWN nodes across its ~7 layers; knot/crossing
// layers belong to the weave, not to either strand. "min" quotas are
// generator guarantees (repair passes, same posture as S11.1); "max"
// quotas are caps the filler respects while dealing.

export type StrandId = 'truth' | 'power';

export interface StrandTargets {
  /** combats this strand deals across the act (min/max caps) */
  combats: { min?: number; max?: number };
  events: { min?: number; max?: number };
  shops: { min?: number };
  treasures: { min?: number };
  rests: { min?: number };
  /** clue events' queue-weight multiplier ON THIS STRAND (the truth
   *  strand is clue-biased; 1 = the normal B6 weights) */
  clueWeightScale: number;
  /** character-event opportunities per SEAT on this strand (D6/D7:
   *  birth-rite arrival must not become strand-gated — both strands
   *  carry every seat's doors) */
  characterOpportunitiesPerSeat: number;
}

export const STRAND_TARGETS: Record<StrandId, StrandTargets> = {
  truth: {
    combats: { max: 3 },
    events: { min: 3 },
    shops: {},
    treasures: {},
    rests: { min: 1 },
    clueWeightScale: 2,
    characterOpportunitiesPerSeat: 1,
  },
  power: {
    combats: { min: 4 },
    events: { max: 2 },
    shops: { min: 1 },
    treasures: { min: 1 },
    rests: { min: 1 },
    clueWeightScale: 1,
    characterOpportunitiesPerSeat: 1,
  },
};

/** Fixed crossing layers per act (knots ARE the crossings — the only way
 *  across the weave is through a snarl). A3's extra elite adds a third
 *  crossing layer (S11.11-1 recommendation: crossings stay scarce, so the
 *  extra knot gets its OWN layer rather than doubling an existing one —
 *  pending ruling, non-blocking to start). */
export const CROSSING_LAYERS: readonly number[] = [2, 4];
export const CROSSING_LAYER_A3 = 5;
