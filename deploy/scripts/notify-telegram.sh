#!/usr/bin/env bash
# ==============================================================================
# Portfolio - send a message to the project's own Telegram bot.
# ==============================================================================
#   notify-telegram-portfolio.sh "the message"
#
# One bot per project, as the server layout requires: the isolation comes from
# the token. If this one leaks, it reaches this channel and nothing else.
#
# Credentials live in /etc/portfolio.env (600 root) next to PORTFOLIO_PORT, so
# there is a single file per project holding its secrets.
# ==============================================================================

set -uo pipefail

ENV_FILE=/etc/portfolio.env

[ -f "$ENV_FILE" ] || { echo "no existe $ENV_FILE" >&2; exit 1; }
set -a
. "$ENV_FILE"
set +a

: "${TELEGRAM_TOKEN:?falta TELEGRAM_TOKEN en $ENV_FILE}"
: "${TELEGRAM_CHAT_ID:?falta TELEGRAM_CHAT_ID en $ENV_FILE}"

mensaje="${1:?uso: $0 \"mensaje\"}"

# Telegram rejects anything over 4096 characters outright - the whole report
# would be lost, not trimmed. Cut to 3900 keeping the END, because that is
# where the verdict and the last log lines are.
if [ "${#mensaje}" -gt 3900 ]; then
    mensaje="[...recortado...]
$(printf '%s' "$mensaje" | tail -c 3900)"
fi

# --fail so a rejected message is a non-zero exit and the caller can report it
# instead of assuming the notice went out.
curl -sS --fail --max-time 20 \
    -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${mensaje}" \
    --data-urlencode "disable_web_page_preview=true" \
    -o /dev/null
