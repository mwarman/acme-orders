#!/usr/bin/env bash
# Start a lab from its published starting point, on a fresh branch.
#   scripts/lab-start.sh m5        (creates branch work/m5 from tag lab/m5-start)
#   scripts/lab-start.sh list      (show available labs)
set -euo pipefail
cd "$(dirname "$0")/.."

tag_for() {
  case "$1" in
    m2|m3|m4|m5|m6|m7|m8|m9) echo "lab/$1-start" ;;
    m10-b)                echo "lab/m10-b" ;;
    *) return 1 ;;
  esac
}

if [ "${1:-}" = "list" ] || [ $# -ne 1 ]; then
  echo "Usage: scripts/lab-start.sh <lab>"
  echo "Labs:  m2  m3  m4  m5  m6  m7  m8  m9  m10-b   (m10-a is your own repo: no starting point needed)"
  exit 0
fi

lab="$1"
tag="$(tag_for "$lab")" || { echo "Unknown lab '$lab'. Run: scripts/lab-start.sh list" >&2; exit 1; }
git rev-parse -q --verify "refs/tags/${tag}" >/dev/null || { echo "Tag ${tag} not found. Fetch tags: git fetch --tags" >&2; exit 1; }

if [ -n "$(git status --porcelain)" ]; then
  echo "You have uncommitted changes. Commit or stash them first." >&2
  exit 1
fi

branch="work/${lab}"
if git show-ref -q --verify "refs/heads/${branch}"; then
  echo "Branch ${branch} already exists. To start over: git switch <other-branch> && git branch -D ${branch}" >&2
  exit 1
fi

git switch -c "${branch}" "${tag}"
npm ci
npm run db:reset
echo
echo "Lab ${lab} ready on branch ${branch} (from ${tag}). Instructions: docs/labs/${lab}.md"
