#!/usr/bin/env bash
# Build and send nightly test report to Telegram.
# Called from .github/workflows/nightly.yml notify job.
#
# Required env vars:
#   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
#   SERVER_RESULT, CLIENT_RESULT, EXAMPLES_RESULT  (GitHub job results)
#   ARTIFACTS_DIR  (path to downloaded artifacts)
#   RUN_URL        (link to the GitHub Actions run)
set -euo pipefail

ARTIFACTS_DIR="${ARTIFACTS_DIR:-artifacts}"

strip_ansi() { sed 's/\x1b\[[0-9;]*m//g' "$1"; }

summary() {
  local f="${ARTIFACTS_DIR}/$1/results.txt"
  if [ -f "$f" ]; then
    strip_ansi "$f" | grep -E '^\s*(Test Files|Tests|Duration)' | sed 's/^\s*//' | head -3
  else
    echo "skipped"
  fi
}

failures() {
  local f="${ARTIFACTS_DIR}/$1/results.txt"
  [ -f "$f" ] || return 0
  strip_ansi "$f" | grep -E 'FAIL\s+src/' | sed 's/^\s*//' | head -5
  strip_ansi "$f" | grep -E '^\s*×' | sed 's/^\s*//' | head -10
}

icon() {
  case "$1" in
    success) echo "✅" ;;
    skipped) echo "⏭️" ;;
    *) echo "❌" ;;
  esac
}

suite_icon() {
  local f="${ARTIFACTS_DIR}/$1/results.txt"
  if [ ! -f "$f" ]; then echo "⏭️"; return; fi
  if strip_ansi "$f" | grep -qE 'FAIL\s+src/'; then echo "❌"; else echo "✅"; fi
}

# --- Build message ---

MSG="$(icon "$SERVER_RESULT")$(icon "$CLIENT_RESULT")$(icon "$EXAMPLES_RESULT") Nightly $(date -u +%m/%d)

$(icon "$SERVER_RESULT") Server:
$(summary server)

$(icon "$CLIENT_RESULT") Client:
$(summary client)

$(suite_icon examples-low) Examples low:
$(summary examples-low)

$(suite_icon examples-medium) Examples medium:
$(summary examples-medium)

$(suite_icon examples-high) Examples high:
$(summary examples-high)"

FAILS=""
for suite in server client examples-low examples-medium examples-high; do
  F=$(failures "$suite")
  if [ -n "$F" ]; then
    FAILS="${FAILS}
${suite}:
${F}"
  fi
done

if [ -n "$FAILS" ]; then
  MSG="$MSG

Failures:${FAILS}"
fi

MSG="$MSG

${RUN_URL}"

curl -sf -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d chat_id="${TELEGRAM_CHAT_ID}" \
  -d text="$MSG" \
  -d disable_web_page_preview=true
