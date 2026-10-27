#!/usr/bin/env bash
set -euo pipefail

# Match `make start`: the portable Go entrypoint owns local defaults.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
exec "${GO_BIN:-go}" -C "$ROOT_DIR/backend" run ./cmd/dev
