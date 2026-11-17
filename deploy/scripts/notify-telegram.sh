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
# Byte cuts below are only safe if the locale is UTF-8 (and iconv -c drops any
# half character a byte cut leaves behind).
export LC_ALL=C.UTF-8

ENV_FILE=/etc/portfolio.env

[ -f "$ENV_FILE" ] || { echo "no existe $ENV_FILE" >&2; exit 1; }
set -a
. "$ENV_FILE"
set +a

: "${TELEGRAM_TOKEN:?falta TELEGRAM_TOKEN en $ENV_FILE}"
: "${TELEGRAM_CHAT_ID:?falta TELEGRAM_CHAT_ID en $ENV_FILE}"

mensaje="${1:?uso: $0 \"mensaje\"}"

# Telegram rejects anything over 4096 characters outright - the whole report
# would be lost, not trimmed. Keep the BEGINNING: the headline and "lo que hay
# que mirar" come first; the log tail at the end is the part that can go.
if [ "${#mensaje}" -gt 3900 ]; then
    # iconv -c exits 1 when it drops a byte, hence the `|| true`. If it leaves
    # nothing, fall back to the raw cut; if that is empty too, there is no message.
    recorte="$(printf '%s' "$mensaje" | head -c 3850 | iconv -c -f UTF-8 -t UTF-8 || true)"
    [ -n "$recorte" ] || recorte="$(printf '%s' "$mensaje" | head -c 3850)"
    [ -n "$recorte" ] || { echo "el mensaje ha quedado vacio tras el recorte" >&2; exit 1; }
    mensaje="${recorte}
[...recortado...]"
fi

# The response body is kept rather than discarded, because Telegram explains
# itself in it and a rejected notice is exactly when the reason matters.
#
# `--fail` with `-o /dev/null` used to be here, and it hid the cause behind a
# bare "curl: (22) error 400". The first send to a bot the recipient has never
# pressed Start on returns 400 "chat not found", which is indistinguishable from
# a bad token until you can read the description. That happened on 2026-09-13,
# the very first time this ran.
#
# The URL (it carries the token) goes in through a curl config on stdin, not in
# argv, so it never shows up in `ps`. printf is a builtin: no process either.
respuesta="$(printf 'url = "https://api.telegram.org/bot%s/sendMessage"\n' "$TELEGRAM_TOKEN" \
  | curl -sS -K - --retry 3 --retry-all-errors --connect-timeout 10 --max-time 30 \
    -X POST \
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
