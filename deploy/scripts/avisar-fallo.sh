#!/usr/bin/env bash
# ==============================================================================
# Portfolio - report that the weekly maintenance died without finishing.
# ==============================================================================
# Fired by OnFailure= of portfolio-mantenimiento.service. Never run by hand.
#
# The script's own ERR trap cannot cover everything: it does not run if the
# kernel OOM-kills the process, if TimeoutStartSec expires, or on a kill -9.
# In all of those the maintenance vanishes without a word, and without this
# unit nobody would notice until the following Saturday.
#
# On a machine with 8 GB where an npm build shares memory with Ollama, the OOM
# case is not hypothetical.
# ==============================================================================

set -uo pipefail

NOTIFY=/usr/local/bin/notify-telegram-portfolio.sh
UNIDAD=portfolio-mantenimiento.service

[ -x "$NOTIFY" ] || { echo "no existe $NOTIFY" >&2; exit 1; }

motivo="$(systemctl show "$UNIDAD" -p Result --value 2>/dev/null)"
codigo="$(systemctl show "$UNIDAD" -p ExecMainStatus --value 2>/dev/null)"

# Only the lines from the run that just died, not last week's.
invocacion="$(systemctl show "$UNIDAD" -p InvocationID --value 2>/dev/null)"
if [ -n "$invocacion" ]; then
    cola="$(journalctl _SYSTEMD_INVOCATION_ID="$invocacion" -o cat --no-pager 2>/dev/null | tail -n 20)"
else
    cola="$(journalctl -u "$UNIDAD" -n 20 -o cat --no-pager 2>/dev/null)"
fi
# A single log line can be an entire HTML dump. Telegram truncates keeping the
# end, so without cutting here the verdict is exactly what gets dropped.
cola="$(printf '%s\n' "$cola" | cut -c1-200 | tail -c 1200)"

case "$motivo" in
    timeout)   explicacion="Se agoto el tiempo maximo y systemd lo corto." ;;
    oom-kill)  explicacion="El sistema se quedo sin memoria y lo mato. La construccion de Astro es lo que mas memoria pide del sabado." ;;
    signal)    explicacion="El proceso recibio una señal que lo termino." ;;
    exit-code) explicacion="Termino con error sin llegar a dar el informe." ;;
    success)   explicacion="No consta ningun fallo: si nadie lo ha lanzado a mano, esto es raro y conviene mirarlo." ;;
    *)         explicacion="Motivo de systemd: ${motivo:-desconocido}." ;;
esac

"$NOTIFY" "PORTFOLIO · mantenimiento del sabado
Servidor: $(hostname -s)

RESULTADO: EL MANTENIMIENTO SE HA CORTADO SIN TERMINAR.

${explicacion} (codigo ${codigo:-?})

No se sabe en que punto se quedo, asi que tampoco si llego a cambiar la version
que sirve. Lo primero que hay que mirar es si el sitio responde:

  curl -sI https://portfolio.masanco-hub.com

--- ultimas lineas del registro ---
${cola:-sin registro disponible}"
