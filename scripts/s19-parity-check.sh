#!/usr/bin/env bash
# S19.1 — the cheap per-commit parity instrument (sprint doc Part 1).
#
# Every S19 policy/content commit must leave the SIM FLEET byte-identical:
# n=100 vb braid, same seeds as S18-P2000's window, TB_SIM_ITEMS rows on,
# socket-free transport (deterministic per seed by construction, S16.0c),
# TB_SIM_SHARDS pinned to 4 (the loud shard header is part of the bytes).
#
# Usage:
#   scripts/s19-parity-check.sh --bank    bank the baseline (pre-change build)
#   scripts/s19-parity-check.sh           diff the current build vs the bank
#
# Exit 0 = byte-identical. Any diff is a scope violation, full stop (the
# sprint's hard rule: every behavior change sits behind mode==='solo' /
# state.botSeat and must be invisible to the fleet).
set -euo pipefail
cd "$(dirname "$0")/.."

BANK=docs/reference/s19-parity-vb100.txt
OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  npm run build >/dev/null 2>&1
fi

# S20.1: rites/tracks default ON now — this bank was cut in the rites-off /
# tracks-off era, so the instrument pins that environment explicitly to stay
# runnable as archaeology. The living instrument is scripts/s20-parity-check.sh.
SEED=20000 PAIR=vb TB_KNOTWORK=1 TB_RITES=0 TB_TRACKS=0 TB_SIM_ITEMS=1 TB_SIM_SHARDS=4 \
  node packages/bots/dist/sim.js 100 >"$OUT" 2>/dev/null

if [ "${1:-}" = "--bank" ]; then
  mkdir -p "$(dirname "$BANK")"
  cp "$OUT" "$BANK"
  echo "banked: $BANK ($(wc -c <"$BANK") bytes, sha256 $(sha256sum "$BANK" | cut -d' ' -f1))"
  exit 0
fi

if [ ! -f "$BANK" ]; then
  echo "FAIL: no banked baseline at $BANK — run with --bank on the pre-change build first" >&2
  exit 1
fi

if cmp -s "$BANK" "$OUT"; then
  echo "PASS: sim fleet byte-identical to the banked pre-S19 read ($(sha256sum "$BANK" | cut -d' ' -f1))"
else
  echo "FAIL: sim fleet DIVERGED from the banked read — scope violation (sprint rule: fleet byte-identical)" >&2
  diff "$BANK" "$OUT" | head -40 >&2
  exit 1
fi
