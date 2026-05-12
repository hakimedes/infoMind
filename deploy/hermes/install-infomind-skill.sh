#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
INFOMIND_BASE_URL="${INFOMIND_BASE_URL:-http://127.0.0.1:3456}"

SKILL_SRC="$PROJECT_ROOT/deploy/hermes/infomind/SKILL.md"
SKILL_DIR="$HERMES_HOME/skills/infomind"
ENV_FILE="$HERMES_HOME/.env"

if [[ ! -f "$SKILL_SRC" ]]; then
  echo "InfoMind skill not found: $SKILL_SRC" >&2
  exit 1
fi

mkdir -p "$SKILL_DIR"
cp "$SKILL_SRC" "$SKILL_DIR/SKILL.md"

touch "$ENV_FILE"
if grep -q '^INFOMIND_BASE_URL=' "$ENV_FILE"; then
  sed -i.bak "s#^INFOMIND_BASE_URL=.*#INFOMIND_BASE_URL=$INFOMIND_BASE_URL#" "$ENV_FILE"
else
  printf '\nINFOMIND_BASE_URL=%s\n' "$INFOMIND_BASE_URL" >> "$ENV_FILE"
fi

echo "Installed InfoMind skill:"
echo "  $SKILL_DIR/SKILL.md"
echo "Configured:"
echo "  INFOMIND_BASE_URL=$INFOMIND_BASE_URL"

if command -v curl >/dev/null 2>&1; then
  if curl -fsS "$INFOMIND_BASE_URL/api/health" >/dev/null 2>&1; then
    echo "InfoMind API health check: ok"
  else
    echo "InfoMind API health check failed. Check that InfoMind is running at $INFOMIND_BASE_URL" >&2
  fi
fi

if command -v pgrep >/dev/null 2>&1; then
  gateway_processes="$(pgrep -af 'hermes gateway' || true)"
  if [[ -n "$gateway_processes" ]]; then
    echo "Running Hermes gateway processes:"
    echo "$gateway_processes"
    echo "Restart Hermes gateway after installing the skill so Feishu/Lark reloads it."
  else
    echo "No running 'hermes gateway' process found. Start or restart the gateway after installing the skill."
  fi
fi
