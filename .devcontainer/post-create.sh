#!/usr/bin/env bash
# Runs once when the dev container is created.
set -euo pipefail
cd "$(dirname "$0")/.."

git config --global --add safe.directory "$(pwd)"

# Labs make commits. Give git a placeholder identity only if the container has none.
# (VS Code and Codespaces normally pass your own identity through, and then this does nothing.)
git config --global user.name  >/dev/null || git config --global user.name  "Workshop Attendee"
git config --global user.email >/dev/null || git config --global user.email "attendee@example.test"

# The local .env is gitignored. Copying the example gives everyone the same fake values.
[ -f .env ] || cp .env.example .env

npm ci
npm ci --prefix tools/orders-db-mcp
npm run db:reset

echo
echo "Post-create finished. Next: bash .devcontainer/smoke-test.sh"
