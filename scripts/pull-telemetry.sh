#!/usr/bin/env bash
# S6.2: pull hosted telemetry + feedback local for analysis
# (scripts/aggregate-human.mjs reads the telemetry dir directly).
#
# Render services accept SSH once a key is added in the dashboard
# (Settings → SSH Public Keys). The SSH address is on the service page,
# shaped like: srv-xxxxxxxxxxxx@ssh.oregon.render.com
#
# Usage:
#   TB_SSH_HOST=srv-xxxx@ssh.oregon.render.com scripts/pull-telemetry.sh [dest]
#   TB_REMOTE_DATA=/data scripts/pull-telemetry.sh          # override remote root
#
# Any rsync-able host works the same way (S6.7: nothing here assumes Render
# beyond the default /data layout).

set -euo pipefail

HOST="${TB_SSH_HOST:-}"
REMOTE="${TB_REMOTE_DATA:-/data}"
DEST="${1:-./pulled}"

if [ -z "$HOST" ]; then
  echo "usage: TB_SSH_HOST=<ssh-address> $0 [dest-dir]" >&2
  echo "  e.g. TB_SSH_HOST=srv-xxxx@ssh.oregon.render.com $0 ./pulled" >&2
  exit 1
fi

mkdir -p "$DEST/telemetry" "$DEST/feedback"
# review fix: a fresh service has neither dir yet — under `set -e` an
# unguarded rsync failed the whole script, so both pulls are best-effort
rsync -avz -e ssh "$HOST:$REMOTE/telemetry/" "$DEST/telemetry/" || echo "(no telemetry dir yet)"
rsync -avz -e ssh "$HOST:$REMOTE/feedback/" "$DEST/feedback/" || echo "(no feedback dir yet)"

echo "pulled → $DEST  (aggregate: node scripts/aggregate-human.mjs $DEST/telemetry)"
