#!/bin/sh
# Mirror this repo to an exec-capable filesystem and run an npm script there.
#
# The repo lives on Android shared storage, which is mounted noexec and cannot
# create symlinks. npm install (bin links) and native addons (Rolldown, Lightning
# CSS) both fail there. /opt is on the container's root filesystem and supports
# both, so the build runs from a mirror.
#
# Usage: sh scripts/cf-run.sh <install|dev|build|start|deploy|test|typecheck>
set -e

SRC=$(cd "$(dirname "$0")/.." && pwd)
BUILD=/opt/mt-build/moscooltech-next
NODE_BIN=/opt/node22/bin

if [ ! -x "$NODE_BIN/node" ]; then
  echo "Node 22 not found at $NODE_BIN — run: sh scripts/setup-env.sh" >&2
  exit 1
fi
PATH="$NODE_BIN:$PATH"
export PATH

TASK=${1:-build}

mkdir -p "$BUILD"
tar -cf - -C "$SRC" \
  --exclude=node_modules --exclude=dist --exclude=.git \
  --exclude=.wrangler --exclude=.vinext . | tar -xf - -C "$BUILD"

cd "$BUILD"

case "$TASK" in
  install|i)
    exec npm install --no-audit --no-fund
    ;;
  *)
    if [ ! -d node_modules ]; then
      echo "Dependencies missing — installing first…"
      npm install --no-audit --no-fund
    fi
    exec npm run "$TASK"
    ;;
esac
