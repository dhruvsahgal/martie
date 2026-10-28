#!/usr/bin/env bash
set -euo pipefail
umask 077

export MARTIE_DATA_DIR="${MARTIE_DATA_DIR:-/data}"
export MARTIE_BROWSER_MODE="${MARTIE_BROWSER_MODE:-headless}"
export PORT="${PORT:-8080}"
export DISPLAY=:99
: "${MARTIE_OWNER_PASSWORD_HASH:?Set the owner password hash before deployment}"

if [[ "$(id -u)" == 0 ]]; then
  if [[ -n "${RAILWAY_ENVIRONMENT_ID:-}${RAILWAY_VOLUME_MOUNT_PATH:-}" ]]; then
    [[ "${RAILWAY_VOLUME_MOUNT_PATH:-}" == "$MARTIE_DATA_DIR" ]] || { echo 'Railway volume is required'; exit 1; }
  fi
  mountpoint -q "$MARTIE_DATA_DIR" || { echo 'Data directory is not a mounted volume'; exit 1; }
  mkdir -p "$MARTIE_DATA_DIR/martie"
  chown node:node "$MARTIE_DATA_DIR/martie"
  chmod 700 "$MARTIE_DATA_DIR/martie"
  exec gosu node "$0"
fi

pids=()
app_pid=''
cleanup() {
  trap - TERM INT
  if [[ -n "$app_pid" ]]; then
    kill -TERM "$app_pid" 2>/dev/null || true
    (sleep 20; kill -KILL "$app_pid" 2>/dev/null || true) & shutdown_timer=$!
    wait "$app_pid" 2>/dev/null || true
    kill "$shutdown_timer" 2>/dev/null || true
    wait "$shutdown_timer" 2>/dev/null || true
  fi
  if ((${#pids[@]})); then
    kill -TERM "${pids[@]}" 2>/dev/null || true
    wait "${pids[@]}" 2>/dev/null || true
  fi
}
trap 'cleanup; exit 0' TERM INT

if [[ "$MARTIE_BROWSER_MODE" == login ]]; then
  Xvfb :99 -screen 0 1280x800x24 -nolisten tcp & pids+=($!)
  for attempt in {1..50}; do
    if xdpyinfo -display :99 >/dev/null 2>&1; then break; fi
    sleep 0.1
  done
  xdpyinfo -display :99 >/dev/null
  x11vnc -display :99 -listen 127.0.0.1 -localhost -rfbport 5900 -forever -shared -nopw -quiet & pids+=($!)
  websockify --web=/usr/share/novnc 127.0.0.1:6080 127.0.0.1:5900 & pids+=($!)
fi

node dist/src/main.js & app_pid=$!; pids+=($app_pid)
caddy run --config deploy/Caddyfile --adapter caddyfile & pids+=($!)
set +e
wait -n "${pids[@]}"
result=$?
cleanup
((result == 0)) && result=1
exit "$result"
