#!/usr/bin/env bash
# The "hello repo" gate. Every attendee must pass this before the first session.
#   bash .devcontainer/smoke-test.sh          environment and repo checks
#   bash .devcontainer/smoke-test.sh --auth   also makes one small Claude Code request
set -uo pipefail
cd "$(dirname "$0")/.."

failures=0
check() { # check "<label>" <command...>
  local label="$1"; shift
  if "$@" >/tmp/smoke.out 2>&1; then
    printf '  PASS  %s\n' "$label"
  else
    printf '  FAIL  %s\n' "$label"; sed 's/^/        /' /tmp/smoke.out | tail -8
    failures=$((failures + 1))
  fi
}

expected_node="$(cat .node-version)"
check "Node.js is ${expected_node}" test "$(node --version)" = "v${expected_node}"
check "dependencies installed" test -d node_modules/@nestjs/core
check "local .env exists" test -f .env
check "typecheck" npm run --silent typecheck
check "lint" npm run --silent lint
check "tests" npm run --silent test
check "MCP lab server self-test" npm --prefix tools/orders-db-mcp run --silent test
check "claude is installed" claude --version
pinned="$(sed -n 's/^ARG CLAUDE_CODE_VERSION=//p' .devcontainer/Dockerfile)"
check "claude matches the pinned version ${pinned}" bash -c "claude --version | grep -q '${pinned}'"

echo
if [ -n "${CLAUDE_CODE_USE_BEDROCK:-}" ]; then
  echo "  INFO  Bedrock mode is on (AWS_REGION=${AWS_REGION:-<unset: required>})."
elif [ -n "${ANTHROPIC_API_KEY:-}" ]; then
  echo "  INFO  ANTHROPIC_API_KEY is set."
else
  echo "  INFO  No API key or Bedrock variables found. Run \`claude\` once and sign in."
fi

if [ "${1:-}" = "--auth" ]; then
  check "claude can answer a request" timeout 120 claude -p "Reply with the single word: ok"
fi

echo
if [ "$failures" -eq 0 ]; then echo "All checks passed."; else echo "${failures} check(s) failed."; fi
exit "$failures"
