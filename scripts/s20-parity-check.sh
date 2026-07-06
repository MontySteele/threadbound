#!/usr/bin/env bash
# S20-R1 — the cheap per-commit parity instrument under the NEW CANON
# (sprint doc Part 1, item 4; successor to scripts/s19-parity-check.sh,
# which stays runnable as archaeology with its flags pinned off).
#
# Every policy/content commit must leave the SIM FLEET byte-identical:
# n=100 vb braid+rites+tracks, seeds 20001..20100, TB_SIM_ITEMS rows on,
# socket-free transport (deterministic per seed, S16.0c), TB_SIM_SHARDS
# pinned to 4 (the loud shard header is part of the bytes). Flags are
# EXPLICIT even though they are now the defaults — the parity instrument
# must not drift with future default changes.
#
# Usage:
#   scripts/s20-parity-check.sh --bank    bank the baseline (pre-change build)
#   scripts/s20-parity-check.sh           diff the current build vs the bank
#
# Exit 0 = byte-identical. Any diff is content/behavior attribution owed:
# strings-only diffs are shown and re-banked in the same commit (golden-
# regen discipline); anything else is a scope conversation.
set -euo pipefail
cd "$(dirname "$0")/.."

BANK=docs/reference/s20-parity-vb100.txt
OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  npm run build >/dev/null 2>&1
fi

SEED=20000 PAIR=vb TB_RITES=1 TB_TRACKS=1 TB_KNOTWORK=1 TB_SIM_ITEMS=1 TB_SIM_SHARDS=4 \
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
  echo "PASS: sim fleet byte-identical to the banked S20-R1 read ($(sha256sum "$BANK" | cut -d' ' -f1))"
else
  echo "FAIL: sim fleet DIVERGED from the banked read — attribution owed (strings-only diffs re-bank in-commit; anything else is scope)" >&2
  diff "$BANK" "$OUT" | head -40 >&2
  exit 1
fi
