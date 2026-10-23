#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  printf '%s\n' 'Primera preparación: entorno Python local y dependencias de BI. Requiere Python 3.11+ e Internet.'
  node scripts/setup.mjs
fi
exec node scripts/workspace.mjs --open
