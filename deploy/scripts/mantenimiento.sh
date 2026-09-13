#!/usr/bin/env bash
# ==============================================================================
# Portfolio - weekly maintenance.
# ==============================================================================
# Run by portfolio-mantenimiento.timer, Saturdays at 02:00 Europe/Madrid, right
# after the host maintenance at 01:00.
#
#   sudo /opt/portfolio/repo/deploy/scripts/mantenimiento.sh [options]
#
#     --seco       check and build, but never promote.
#     --sin-aviso  do not send the Telegram report.
#
# What it is FOR, given that this site is static and nothing writes at runtime:
# rebuilding with `--pull` is what picks up security updates in node:22-alpine
# and nginx-unprivileged. A container that is never rebuilt keeps serving from
# a base image that ages quietly.
#
# The promotion is a retag, never a rebuild:
#     :candidato  -> just built, on trial
#     :actual     -> what the container runs
#     :anterior   -> where a rollback goes
# Retagging is instantaneous and cannot fail halfway, which is what makes the
# rollback trustworthy.
# ==============================================================================

# -E is what makes the ERR trap fire INSIDE functions, which is where the
# commands that can actually fail live. Without it the trap below is dead code
# and this script dies in silence.
set -eEuo pipefail

REPO_DIR="${REPO_DIR:-/opt/portfolio/repo}"
SERVICE_USER="${SERVICE_USER:-portfolio}"
IMAGEN=portfolio-masanco-hub
CONTENEDOR=portfolio-web
COMPOSE_DIR="${REPO_DIR}/deploy/docker"
NOTIFY=/usr/local/bin/notify-telegram-portfolio.sh
LOCK_FILE=/var/lock/portfolio-mantenimiento.lock

# The canary lives in this project's own port block (8110-8119), one above the
# app. That separation is not cosmetic: on 2026-09-12 four projects shared the
# consecutive 8100-8103 and the Integras canary ended up interrogating the
# portfolio, validating a deployment against somebody else's website.
PUERTO_CANARIO=8111
CONTENEDOR_CANARIO=portfolio-canario

# Belt and braces for exactly that failure: a 200 is not proof that whatever
# answered is ours. Every check below demands this string in the body.
MARCADOR="Mario Sanchis Colomer"

# The public hostname, used to test through the edge - the real path a visitor
# takes, which is the one worth testing.
DOMINIO=portfolio.masanco-hub.com
EDGE=edge-proxy

SECO=0
AVISAR=1

registro() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }
paso()     { printf '\n=== %s ===\n' "$*"; }

[ "$(id -u)" -eq 0 ] || { echo "Este script necesita root: sudo $0" >&2; exit 1; }

for argumento in "$@"; do
    case "$argumento" in
        --seco)      SECO=1 ;;
        --sin-aviso) AVISAR=0 ;;
        *) echo "Opcion desconocida: $argumento" >&2; exit 2 ;;
    esac
done

# --- One run at a time --------------------------------------------------------
# The timer is Persistent=true: if the server was off on Saturday, systemd
# fires this on the next boot, which could land on top of a manual update.sh.
# Both would be retagging :actual and :anterior at once, and the resulting
# :anterior would be nobody's previous version.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    registro "ya hay un mantenimiento o despliegue en curso; no se hace nada"
    exit 0
fi

BITACORA="$(mktemp /tmp/portfolio-mantenimiento-XXXXXX.log)"
exec > >(tee -a "$BITACORA") 2>&1

FECHA="$(date '+%Y-%m-%d %H:%M')"

# Once :actual has been retagged, any later failure has to be undone. Without
# this flag terminar_mal cannot tell "failed before touching anything" from
# "failed with the new version already serving", and those need opposite
# reactions.
PROMOCIONADO=0

RESUMEN=""
apuntar() { RESUMEN+="$1"$'\n'; }

AVISOS=""
alertar() { AVISOS+="$1"$'\n'; }

avisar_telegram() {
    [ "$AVISAR" -eq 1 ] || return 0
    if [ ! -x "$NOTIFY" ]; then
        registro "AVISO: no existe $NOTIFY; nadie recibira el informe"
        return 0
    fi
    "$NOTIFY" "$1" || registro "AVISO: no se ha podido enviar el aviso por Telegram"
}

# --- Helpers ------------------------------------------------------------------

id_de_imagen() {
    docker image inspect --format '{{.Id}}' "${IMAGEN}:${1}" 2>/dev/null || true
}

limpiar_canario() {
    docker rm -f "$CONTENEDOR_CANARIO" >/dev/null 2>&1 || true
}

# A GET whose body must contain the marker. Non-zero if the port does not
# answer, answers something else, or answers somebody else's site.
comprobar_url() {
    local url="$1" descripcion="$2" cuerpo
    cuerpo="$(curl -fsS --max-time 10 "$url" 2>/dev/null)" || {
        registro "FALLO: $descripcion no responde ($url)"
        return 1
    }
    if ! printf '%s' "$cuerpo" | grep -qF "$MARCADOR"; then
        registro "FALLO: $descripcion responde, pero el contenido no es el portfolio"
        return 1
    fi
    registro "ok: $descripcion"
}

esperar_url() {
    local url="$1" descripcion="$2" segundos="${3:-45}"
    local limite=$(( SECONDS + segundos ))
    until comprobar_url "$url" "$descripcion" >/dev/null 2>&1; do
        if [ "$SECONDS" -ge "$limite" ]; then
            comprobar_url "$url" "$descripcion"   # once more, this time loudly
            return 1
        fi
        sleep 2
    done
    registro "ok: $descripcion"
}

revertir() {
    registro "volviendo a la imagen :anterior"
    if [ -z "$(id_de_imagen anterior)" ]; then
        registro "no hay imagen :anterior a la que volver"
        return 1
    fi
    docker image tag "${IMAGEN}:anterior" "${IMAGEN}:actual"
    docker compose --project-directory "$COMPOSE_DIR" up -d --force-recreate >/dev/null 2>&1 || true
    esperar_url "http://127.0.0.1:${PUERTO_APP}/" "el sitio tras revertir" 45
}

# --- Bail out loudly ----------------------------------------------------------

terminar_mal() {
    # A failure inside this function must not re-enter through the trap.
    trap - ERR
    local donde="$1"
    paso "Ha fallado: ${donde}"

    limpiar_canario

    local estado_servicio cambio_aplicado urgencia

    if [ "$PROMOCIONADO" -eq 1 ]; then
        # The new version was already serving. Health is NOT consulted here:
        # the failures that happen after promoting are precisely the ones that
        # health does not see. Roll back unconditionally.
        registro "el fallo es posterior a la promocion: se vuelve atras sin preguntar"
        if revertir; then
            estado_servicio="Se ha vuelto a la version anterior, y el sitio funciona."
        else
            estado_servicio="ATENCION: el portfolio NO responde. Hay que mirarlo cuanto antes."
        fi
        cambio_aplicado="Se habia llegado a poner la version nueva y se ha deshecho."
        urgencia="Conviene revisarlo hoy mismo."
    else
        estado_servicio="El sitio sigue disponible con la version de siempre."
        if ! comprobar_url "http://127.0.0.1:${PUERTO_APP}/" "el sitio" >/dev/null 2>&1; then
            registro "el sitio no responde; intentando volver a la version anterior"
            if revertir; then
                estado_servicio="Ha habido que volver a la version anterior, y funciona."
            else
                estado_servicio="ATENCION: el portfolio NO responde. Hay que mirarlo cuanto antes."
            fi
        fi
        cambio_aplicado="No se ha cambiado nada: sigue sirviendo la version de siempre."
        urgencia="No hay nada urgente, pero conviene revisarlo antes del lunes."
    fi

    sleep 1
    local cola
    # A single log line can be an entire HTML dump: if the canary ever ends up
    # interrogating another app, its whole index.html lands in the log. Telegram
    # cuts at 4096 keeping the END, so without trimming here the verdict is
    # exactly what gets dropped and what arrives is somebody's page footer.
    cola="$(tail -n 25 "$BITACORA" | cut -c1-200 | tail -c 1500)"

    avisar_telegram "PORTFOLIO · mantenimiento del sabado
Servidor: $(hostname -s) (${DOMINIO})
Fecha: ${FECHA}

RESULTADO: NO SE HA PODIDO ACTUALIZAR.

${estado_servicio}
${cambio_aplicado}
${urgencia}

Ha fallado en: ${donde}

--- detalle tecnico ---
${RESUMEN}
--- ultimas lineas del registro ---
${cola}

Registro completo:
  sudo journalctl -u portfolio-mantenimiento --since '1 day ago'"

    printf '\n=== Mantenimiento TERMINADO CON FALLOS ===\n'
    exit 1
}

trap 'terminar_mal "un error inesperado (linea $LINENO)"' ERR

# The port comes from the host file, same as update.sh: the VPS serves on 8101
# and this server on 8110, same repo and same script.
if [ -f /etc/portfolio.env ]; then
    set -a
    . /etc/portfolio.env
    set +a
fi
PUERTO_APP="${PORTFOLIO_PORT:-8101}"

# ------------------------------------------------------------------------------
paso "Mantenimiento del portfolio · ${FECHA}"
[ "$SECO" -eq 1 ] && registro "modo --seco: se construye y se prueba, pero no se promociona"
# ------------------------------------------------------------------------------

paso "1/7  Como esta antes de tocar nada"
if ! comprobar_url "http://127.0.0.1:${PUERTO_APP}/" "el sitio antes de empezar"; then
    terminar_mal "el sitio ya estaba caido antes de empezar"
fi
revision_antes="$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$CONTENEDOR" 2>/dev/null || echo desconocida)"
apuntar "Version que estaba sirviendo: ${revision_antes}"
registro "sirviendo la revision ${revision_antes} en el puerto ${PUERTO_APP}"

paso "2/7  Codigo del repositorio"
# --ff-only so a diverged history stops here loudly instead of opening a merge.
sudo -u "$SERVICE_USER" -H git -C "$REPO_DIR" pull --ff-only
REVISION="$(sudo -u "$SERVICE_USER" -H git -C "$REPO_DIR" rev-parse --short HEAD)"
if [ "$REVISION" = "$revision_antes" ]; then
    registro "sin commits nuevos (${REVISION})"
    apuntar "Codigo: sin cambios."
else
    registro "hay codigo nuevo: ${revision_antes} -> ${REVISION}"
    apuntar "Codigo: ${revision_antes} -> ${REVISION}"
fi

paso "3/7  Construir el candidato"
# --pull is the whole point of this job on a static site: it re-resolves
# node:22-alpine and nginx-unprivileged, which is how base-image security
# updates ever reach the container.
docker build --pull \
    -f "${REPO_DIR}/deploy/docker/Dockerfile" \
    --build-arg "REVISION=${REVISION}" \
    -t "${IMAGEN}:candidato" \
    "$REPO_DIR"
id_candidato="$(id_de_imagen candidato)"
id_actual="$(id_de_imagen actual)"
if [ "$id_candidato" = "$id_actual" ]; then
    registro "la imagen construida es identica a la que ya sirve"
    apuntar "Imagen: sin cambios (ni codigo ni imagen base)."
    hay_cambios=0
else
    registro "imagen nueva construida"
    apuntar "Imagen: reconstruida (codigo o imagen base actualizados)."
    hay_cambios=1
fi

paso "4/7  Prueba de humo del candidato"
# On its own port, in its own container: the live site is not touched until the
# candidate has proved it serves the real thing.
limpiar_canario
docker run -d --name "$CONTENEDOR_CANARIO" \
    -p "127.0.0.1:${PUERTO_CANARIO}:8080" \
    "${IMAGEN}:candidato" >/dev/null

canario_ok=1
esperar_url "http://127.0.0.1:${PUERTO_CANARIO}/" "el candidato (portada ES)" 45 || canario_ok=0
if [ "$canario_ok" -eq 1 ]; then
    comprobar_url "http://127.0.0.1:${PUERTO_CANARIO}/en/" "el candidato (portada EN)" || canario_ok=0
    # The CVs are half the reason this site exists; a build that silently
    # stopped copying public/ would still serve a perfect looking home page.
    tipo_pdf="$(curl -fsS -o /dev/null -w '%{content_type}' --max-time 10 \
        "http://127.0.0.1:${PUERTO_CANARIO}/cv-completo.pdf" 2>/dev/null || true)"
    if [ "$tipo_pdf" = "application/pdf" ]; then
        registro "ok: el candidato sirve los CV en PDF"
    else
        registro "FALLO: el CV en PDF no se sirve (content-type: ${tipo_pdf:-ninguno})"
        canario_ok=0
    fi
fi
limpiar_canario

if [ "$canario_ok" -ne 1 ]; then
    apuntar "Prueba de humo: FALLIDA. No se ha promocionado nada."
    terminar_mal "la prueba de humo del candidato"
fi
apuntar "Prueba de humo: superada (ES, EN y los CV en PDF)."

paso "5/7  Poner a servir"
if [ "$SECO" -eq 1 ]; then
    registro "modo --seco: no se promociona nada"
    apuntar "Ensayo: no se ha promocionado."
elif [ "$hay_cambios" -eq 0 ]; then
    registro "no hay nada nuevo que promocionar"
    apuntar "No habia nada nuevo que poner a servir."
else
    [ -n "$id_actual" ] && docker image tag "${IMAGEN}:actual" "${IMAGEN}:anterior"
    # Set BEFORE promoting: from this line on, any failure leaves a state that
    # has to be undone, even if the retag itself dies halfway.
    PROMOCIONADO=1
    docker image tag "${IMAGEN}:candidato" "${IMAGEN}:actual"
    docker compose --project-directory "$COMPOSE_DIR" up -d --force-recreate
    registro "promocionada la revision ${REVISION}"
fi

paso "6/7  Comprobar por el camino de verdad"
esperar_url "http://127.0.0.1:${PUERTO_APP}/" "el sitio en su puerto" 45 \
    || terminar_mal "el sitio no responde despues de promocionar"

# Testing from the container's own port is not enough - that lesson cost a full
# outage on the VPS cutover. What a visitor actually traverses is Cloudflare ->
# tunnel -> edge -> container, and the edge hop is the one that breaks silently
# if the container name or the shared network ever changes.
if docker ps --format '{{.Names}}' | grep -qx "$EDGE"; then
    if docker exec "$EDGE" wget -q -O- --header "Host: ${DOMINIO}" http://127.0.0.1/ 2>/dev/null | grep -qF "$MARCADOR"; then
        registro "ok: el edge sirve el portfolio en ${DOMINIO}"
        apuntar "Comprobado a traves del edge: correcto."
    else
        terminar_mal "el edge no sirve el portfolio (estaria caido para los visitantes)"
    fi
else
    # The edge being absent is not this project's fault, so it does not trigger
    # a rollback - but it does mean nobody outside can see the site.
    registro "AVISO: el contenedor ${EDGE} no esta corriendo"
    alertar "El edge (${EDGE}) no estaba corriendo: el sitio no es accesible desde internet."
fi

paso "7/7  Limpieza"
# Loose images from past weeks. 30 days because :anterior is never untagged and
# therefore never pruned, so the rollback target is not at risk.
liberado="$(docker image prune -af --filter "until=720h" 2>/dev/null | awk '/Total reclaimed space/ {print $4, $5}' | xargs)"
registro "espacio liberado: ${liberado:-nada}"
apuntar "Limpieza de imagenes: ${liberado:-nada que borrar}."

# ------------------------------------------------------------------------------
paso "Informe"
# ------------------------------------------------------------------------------

if [ "$SECO" -eq 1 ]; then
    titular="ENSAYO. Se ha revisado y construido, pero no se ha promocionado nada."
elif [ -n "$AVISOS" ]; then
    titular="ACTUALIZADO, PERO HAY COSAS QUE MIRAR."
elif [ "$hay_cambios" -eq 0 ]; then
    titular="TODO CORRECTO. No habia nada que actualizar."
else
    titular="ACTUALIZADO CORRECTAMENTE."
fi

mensaje="PORTFOLIO · mantenimiento del sabado
Servidor: $(hostname -s) (${DOMINIO})
Fecha: ${FECHA}

RESULTADO: ${titular}
"

[ -n "$AVISOS" ] && mensaje+="
--- lo que hay que mirar ---
${AVISOS}"

# Asked of the running container, never assumed from REVISION: in --seco
# nothing was promoted, and after a rollback the serving version is the old one.
# Reporting the version that was BUILT as the version that is SERVING is the
# kind of small lie that makes a report untrustworthy exactly when it matters.
revision_ahora="$(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "$CONTENEDOR" 2>/dev/null || echo desconocida)"

mensaje+="
--- que se ha hecho ---
${RESUMEN}
--- estado ---
Sirviendo la revision: ${revision_ahora}
Disco libre: $(df -h /var/lib/docker --output=avail 2>/dev/null | tail -1 | tr -d ' ')"

avisar_telegram "$mensaje"

trap - ERR
printf '\n=== Mantenimiento terminado correctamente ===\n'
rm -f "$BITACORA"
