#!/bin/bash
# Double-click from Finder; the Python supervisor owns the server lifecycle.
set -e
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
if ! command -v python3 >/dev/null 2>&1; then
  printf '%s\n' 'Python 3 est introuvable. Installe Python 3 puis relance ce fichier.'
  read -r -p 'Entree pour fermer...' _reply
  exit 1
fi
exec python3 "$PROJECT_DIR/scripts/launch.py"
