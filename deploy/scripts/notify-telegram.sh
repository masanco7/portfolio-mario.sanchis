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

# The response body is kept rather than discarded, because Telegram explains
# itself in it and a rejected notice is exactly when the reason matters.
#
# `--fail` with `-o /dev/null` used to be here, and it hid the cause behind a
# bare "curl: (22) error 400". The first send to a bot the recipient has never
# pressed Start on returns 400 "chat not found", which is indistinguishable from
# a bad token until you can read the description. That happened on 2026-09-13,
# the very first time this ran.
respuesta="$(curl -sS --max-time 20 \
    -X POST "https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${mensaje}" \
    --data-urlencode "disable_web_page_preview=true" 2>&1)" || {
    echo "no se ha podido contactar con Telegram: ${respuesta}" >&2
    exit 1
}

case "$respuesta" in
    *'"ok":true'*) exit 0 ;;
esac

# grep -o and not a JSON parser on purpose: this script must not depend on jq
# being installed on a machine where its whole job is to report that something
# else is broken.
motivo="$(printf '%s' "$respuesta" | grep -o '"description":"[^"]*"' | cut -d: -f2- | tr -d '"')"
echo "Telegram ha rechazado el mensaje: ${motivo:-$respuesta}" >&2
echo "Si dice 'chat not found', abre Telegram y dale a Start en el bot: no puede" >&2
echo "iniciar una conversacion con alguien que nunca le ha hablado." >&2
exit 1
