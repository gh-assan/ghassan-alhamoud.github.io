#!/usr/bin/env bash
# Generic black-box smoke test for a terminal UI.
# Example:
#   APP_COMMAND='python -m myapp.tui' \
#   READY_PATTERN='Dashboard' \
#   NEXT_KEY='n' \
#   NEXT_PATTERN='New project' \
#   ./tmux-tui-smoke-test.sh
set -euo pipefail

SESSION="tui-smoke-$$"
SOCKET_PATH="${TMPDIR:-/tmp}/tui-smoke-$$.sock"
APP_COMMAND=${APP_COMMAND:-"python -m myapp.tui"}
READY_PATTERN=${READY_PATTERN:-"Dashboard"}
NEXT_KEY=${NEXT_KEY:-}
NEXT_PATTERN=${NEXT_PATTERN:-}
WIDTH=${WIDTH:-120}
HEIGHT=${HEIGHT:-36}
TIMEOUT_SECONDS=${TIMEOUT_SECONDS:-30}

tmux_cmd() {
  tmux -S "$SOCKET_PATH" "$@"
}

cleanup() {
  tmux_cmd kill-server 2>/dev/null || true
  rm -f "$SOCKET_PATH"
}
trap cleanup EXIT INT TERM

snapshot() {
  tmux_cmd capture-pane -t "$SESSION":0.0 -p -S -
}

wait_for() {
  local pattern=$1
  local deadline=$((SECONDS + TIMEOUT_SECONDS))
  until snapshot | grep -qE "$pattern"; do
    if (( SECONDS >= deadline )); then
      printf 'Timed out waiting for: %s\n' "$pattern" >&2
      snapshot >&2
      return 1
    fi
    sleep 0.2
  done
}

tmux_cmd new-session -d -s "$SESSION" -x "$WIDTH" -y "$HEIGHT" \
  "export TERM=screen-256color; $APP_COMMAND"

wait_for "$READY_PATTERN"

if [[ -n "$NEXT_KEY" ]]; then
  tmux_cmd send-keys -t "$SESSION":0.0 "$NEXT_KEY"
fi

if [[ -n "$NEXT_PATTERN" ]]; then
  wait_for "$NEXT_PATTERN"
fi

snapshot
