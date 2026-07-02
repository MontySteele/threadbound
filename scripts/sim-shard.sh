#!/usr/bin/env bash
# Comfort pass: multi-core battery sharding. The sim server runs in-process,
# so one battery is bound to one core; this launches SHARDS processes with
# disjoint seed ranges and pools the win rate. Per-encounter tables print
# per shard (grep 'HP LOST' across the logs).
# Usage: PAIR=vb SHARDS=6 RUNS=300 scripts/sim-shard.sh
set -euo pipefail
SHARDS="${SHARDS:-4}"
RUNS="${RUNS:-200}"
PER=$(( RUNS / SHARDS ))
PAIR="${PAIR:-vb}"
BASE="${SEED:-1000}"
mkdir -p /tmp/tb-shards
pids=()
for i in $(seq 0 $((SHARDS-1))); do
  SEED=$(( BASE + i * PER )) PAIR="$PAIR" TB_SIM_CONC="${TB_SIM_CONC:-8}" \
    node packages/bots/dist/sim.js "$PER" > "/tmp/tb-shards/shard-$i.log" 2>&1 &
  pids+=($!)
done
fail=0
for p in "${pids[@]}"; do wait "$p" || fail=1; done
total=0; wins=0
for i in $(seq 0 $((SHARDS-1))); do
  line=$(grep -m1 "^runs:" "/tmp/tb-shards/shard-$i.log" || true)
  r=$(echo "$line" | sed -E 's/runs: ([0-9]+).*/\1/')
  v=$(echo "$line" | sed -E 's/.*victories: ([0-9]+).*/\1/')
  echo "shard $i: $line"
  total=$(( total + ${r:-0} )); wins=$(( wins + ${v:-0} ))
done
echo "POOLED: $total runs, $wins victories ($(( total > 0 ? 100 * wins / total : 0 ))%)"
exit $fail
