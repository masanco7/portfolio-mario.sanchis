#!/usr/bin/env bash
#
# Redeploy the portfolio container from the current git state.
#
#   sudo bash deploy/docker/update.sh
#
# Runs as root because it drives Docker, but every git and file operation is
# done as the `portfolio` user so the repo never ends up owned by root.
#
# The script is safe to re-run: if the new image does not come up healthy it
# retags the previous image back to :actual and recreates the container, so a
# bad commit leaves the site running the last good build instead of down.

set -euo pipefail

# Per-host settings, if any. Optional on purpose: where the file does not
# exist the compose default wins. Mode 600 root, like every other
# /etc/<project>.env.
if [ -f /etc/portfolio.env ]; then
    set -a
    . /etc/portfolio.env
    set +a
fi

REPO_DIR="${REPO_DIR:-/opt/portfolio/repo}"
SERVICE_USER="${SERVICE_USER:-portfolio}"
IMAGE="portfolio-masanco-hub"
COMPOSE_DIR="${REPO_DIR}/deploy/docker"
PORT="${PORTFOLIO_PORT:-8110}"
HEALTH_URL="http://127.0.0.1:${PORT}/"
# A 200 is not proof that this is the portfolio answering: on 2026-09-12 a
# canary running on a neighbouring port ended up validating against somebody
# else's site. Every health check demands this string in the body too.
MARCADOR="Mario Sanchis Colomer"
HEALTH_TIMEOUT=60
LOCK_FILE=/var/lock/portfolio-mantenimiento.lock

log() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31m!! %s\033[0m\n' "$*" >&2; exit 1; }

# Body captured into a variable, never piped straight into `grep -q`: with
# pipefail, curl streaming a ~74 KB page can get SIGPIPE the instant grep -q
# finds the marker and closes its end, which used to surface as a false
# "not healthy" and a rollback of a perfectly good deploy.
health_ok() {
    local cuerpo
    cuerpo="$(curl -fsS --max-time 10 "$HEALTH_URL" 2>/dev/null)" || return 1
    grep -qF -- "$MARCADOR" <<<"$cuerpo"
}

[ "$(id -u)" -eq 0 ] || fail "run me with sudo: sudo bash deploy/docker/update.sh"
[ -d "$REPO_DIR/.git" ] || fail "no git repo at $REPO_DIR"

# --- 0. Lock -------------------------------------------------------------
# Same lock file as the Saturday maintenance script: a manual update.sh and
# an unattended mantenimiento.sh must never retag :actual/:anterior at once.
# Non-blocking on purpose — a manual deploy should fail fast and loud, not
# queue up silently behind whichever one got there first.
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
    fail "ya hay un mantenimiento o despliegue en curso (lock $LOCK_FILE); prueba mas tarde"
fi

# --- 1. Pull -----------------------------------------------------------------
log "1/5 git pull (as $SERVICE_USER)"
# --ff-only so a diverged history stops here loudly rather than opening a merge.
sudo -u "$SERVICE_USER" -H git -C "$REPO_DIR" pull --ff-only
REVISION="$(sudo -u "$SERVICE_USER" -H git -C "$REPO_DIR" rev-parse --short HEAD)"
echo "revision: $REVISION"

# --- 2. Keep the current image as the rollback target ------------------------
log "2/5 tagging current image as :anterior"
if docker image inspect "${IMAGE}:actual" >/dev/null 2>&1; then
    docker image tag "${IMAGE}:actual" "${IMAGE}:anterior"
    echo "rollback target ready"
else
    # First deploy: there is nothing to roll back to, and that is fine.
    echo "no previous image — first deploy"
fi

# --- 3. Build ----------------------------------------------------------------
# Build before touching the running container: a failing `npm run build` must
# not take the live site down with it.
log "3/5 docker compose build"
REVISION="$REVISION" docker compose --project-directory "$COMPOSE_DIR" build

# --- 4. Swap -----------------------------------------------------------------
log "4/5 docker compose up -d"
REVISION="$REVISION" docker compose --project-directory "$COMPOSE_DIR" up -d

# --- 5. Verify ---------------------------------------------------------------
log "5/5 waiting for health (up to ${HEALTH_TIMEOUT}s)"
deadline=$(( SECONDS + HEALTH_TIMEOUT ))
until health_ok; do
    if [ "$SECONDS" -ge "$deadline" ]; then
        printf '\n\033[1;31m!! not healthy — rolling back\033[0m\n' >&2
        docker compose --project-directory "$COMPOSE_DIR" logs --tail 40 || true
        if docker image inspect "${IMAGE}:anterior" >/dev/null 2>&1; then
            docker image tag "${IMAGE}:anterior" "${IMAGE}:actual"
            docker compose --project-directory "$COMPOSE_DIR" up -d --force-recreate
            fail "rolled back to the previous image; site should be up again"
        fi
        fail "no previous image to roll back to — site is DOWN, investigate now"
    fi
    sleep 2
done

echo
echo "OK — portfolio serving on $HEALTH_URL (revision $REVISION)"
echo "running image: $(docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' portfolio-web)"
