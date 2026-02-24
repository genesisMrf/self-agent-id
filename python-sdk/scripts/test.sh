#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENV_DIR="$ROOT_DIR/.venv"
PYTHON_BIN="${PYTHON:-python3}"

if [ ! -d "$VENV_DIR" ]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

if ! "$VENV_DIR/bin/python" - <<'PY'
import importlib.util
import sys

required = ["pytest", "web3", "eth_account", "httpx"]
missing = [name for name in required if importlib.util.find_spec(name) is None]
sys.exit(0 if not missing else 1)
PY
then
  "$VENV_DIR/bin/python" -m pip install --upgrade pip
  "$VENV_DIR/bin/pip" install -e "$ROOT_DIR[test]"
fi

exec "$VENV_DIR/bin/python" -m pytest -q "$@"
