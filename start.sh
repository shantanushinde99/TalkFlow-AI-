#!/usr/bin/env bash
# Starts token server, agent worker and frontend. Ctrl+C stops all three.
set -e
cd "$(dirname "$0")"
trap 'kill 0' EXIT

.venv/bin/python -m app.token_server &
.venv/bin/python -m app.main dev &
(cd frontend && npm run dev) &
wait
