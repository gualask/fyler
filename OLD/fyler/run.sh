#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

BIN_BASENAME="fyler"

case "$(uname -s)" in
  Darwin) BIN_PATH="build/bin/${BIN_BASENAME}.app/Contents/MacOS/${BIN_BASENAME}" ;;
  MINGW*|MSYS*|CYGWIN*) BIN_PATH="build/bin/${BIN_BASENAME}.exe" ;;
  *) BIN_PATH="build/bin/${BIN_BASENAME}" ;;
esac

if [[ ! -e "$BIN_PATH" ]]; then
  if command -v wails >/dev/null 2>&1; then
    wails build
  elif [[ -x "$HOME/go/bin/wails" ]]; then
    "$HOME/go/bin/wails" build
  else
    echo "Errore: 'wails' non trovato. Installa Wails oppure aggiungi '$HOME/go/bin' al PATH." >&2
    exit 127
  fi
fi

exec "$BIN_PATH" "$@"
