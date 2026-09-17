# deploy/ — portfolio.masanco-hub.com

Material de despliegue del portfolio: un sitio **estático puro** (Astro 6 con
`output: 'static'`, `/` en ES y `/en/` en EN), sin backend y sin autenticación.

**Cómo se opera en el servidor** (desplegar, volver atrás, logs, mantenimiento,
averías) está en **[../GUIA-SERVIDOR.md](../GUIA-SERVIDOR.md)**. Aquí solo
queda qué es cada fichero y por qué está hecho así.

## Ficheros

| Fichero | Qué es | Dónde acaba en el servidor |
|---|---|---|
| `docker/Dockerfile` | Build multi-stage: Astro (`node:22-alpine`) → `nginx-unprivileged` | imagen `portfolio-masanco-hub` |
| `docker/Dockerfile.dockerignore` | Qué no entra en el contexto de build | — |
| `docker/nginx-site.conf` | vhost **interno** del contenedor: caché, rutas ES/EN, gzip | dentro de la imagen |
| `docker/docker-compose.yml` | Servicio `portfolio-web`, puerto, red `edge`, solo lectura, logs | se usa desde el repo |
| `docker/update.sh` | Redespliegue manual con vuelta atrás automática | se ejecuta desde el repo (`sudo bash .../update.sh`) |
| `scripts/mantenimiento.sh` | Mantenimiento de los sábados (candidato → canario → promoción) | copiado a `/usr/local/lib/portfolio-mantenimiento/` (root) |
| `scripts/avisar-fallo.sh` | Aviso cuando el mantenimiento muere sin llegar a su `trap` | copiado a `/usr/local/lib/portfolio-mantenimiento/` (root) |
| `scripts/notify-telegram.sh` | Envío al bot de Telegram propio del proyecto | copiado a `/usr/local/bin/notify-telegram-portfolio.sh` |
| `systemd/portfolio-mantenimiento.{service,timer}` | Sábados 02:00 Europe/Madrid | copiados a `/etc/systemd/system/` |
| `systemd/portfolio-mantenimiento-fallo.service` | Lo dispara `OnFailure=` | copiado a `/etc/systemd/system/` |

El vhost que está en uso es el del edge. No está en este repo: vive en
`/opt/edge/nginx/conf.d/portfolio.masanco-hub.com.conf`, con copia en
`Pruebas/masanco-hub-edge-casa/`.

## Decisiones de diseño

- **Sin estado.** El contenedor es `read_only: true`, sin volúmenes, con `tmpfs`
  solo para el pid y las carpetas temporales de nginx (uid/gid 101, el usuario
  de la imagen). Todo lo que se sirve está horneado en la imagen, así que un
  `docker compose up` en otra máquina da exactamente el mismo sitio. No hay nada
  que respaldar.
- **El build ocurre dentro de la imagen.** No hay `node` ni `dist/` en el host.
  Las dependencias se copian primero, así que mientras `package-lock.json` no
  cambie, la capa de `npm ci` se reutiliza.
- **Caché y rutas dentro de la imagen, no en el proxy.** Así las reglas viajan
  con la app y el proxy de delante se limita a cabeceras y reparto.
  - `/_astro/`: un año, `immutable` (los ficheros llevan hash de contenido).
  - `/projects/`: 30 días.
  - `cv-*.pdf`: 1 hora en origen.
  - Resto de imágenes y fuentes: 7 días.
  - HTML: siempre revalidado.
- **`nginx-unprivileged`**: la imagen corre sin root y escucha en 8080.
- **Etiquetas en lugar de reconstruir.** El orden es `:candidato` → `:actual` →
  `:anterior`. Promocionar y volver atrás son reetiquetados: instantáneos y sin
  riesgo de quedarse a medias.
- **La etiqueta `org.opencontainers.image.revision`** lleva el commit, así que
  siempre se puede saber qué versión está sirviendo.
- **El puerto no está en el repo.** Sale de `PORTFOLIO_PORT` en
  `/etc/portfolio.env`, que leen `update.sh` y el mantenimiento. En
  `masancoserver` vale 8110 (bloque 8110-8119, canario 8111), que es también el
  valor por defecto en el compose y en los scripts: sin `/etc/portfolio.env` se
  publica igualmente en el puerto real de esta máquina.
- **Publicado en `127.0.0.1` además de en la red `edge`.** El edge entra por
  `portfolio-web:8080`. El puerto del host solo lo usan las comprobaciones de
  `update.sh` y del mantenimiento.
- **Las comprobaciones exigen la cadena `Mario Sanchis Colomer`**, no un 200. El
  2026-09-12, el canario de INTEGRAS validó un despliegue suyo contra este
  portfolio. `update.sh` hace la misma comprobación de contenido, no solo de
  código HTTP.
- **`mantenimiento.sh` y `avisar-fallo.sh` corren como una copia de root**, no
  desde el repo. El repo vive en `/opt/portfolio/repo`, escribible por el
  usuario `portfolio`; que systemd ejecutara como root un fichero que ese
  usuario puede modificar sería un vector de escalada. La copia vive en
  `/usr/local/lib/portfolio-mantenimiento/` (`root:root`, 755) y es la que
  apuntan las `.service`. `notify-telegram.sh` corre como root igual (lo
  invoca `mantenimiento.sh`) y va a `/usr/local/bin/notify-telegram-portfolio.sh`
  (`root:root`, 750). Tras su `git pull`, `mantenimiento.sh` compara (`cmp`)
  las tres copias del repo con las instaladas; si alguna difiere, no se
  autoinstala nada — lo añade al informe de Telegram como aviso, con el
  comando de reinstalación exacto para cada destino, para que Mario
  reinstale a mano. Cambiar código que corre como root exige una acción
  deliberada, no un `git pull`.
- **`update.sh` toma el mismo `flock`** (`/var/lock/portfolio-mantenimiento.lock`)
  que `mantenimiento.sh`, sin bloquearse: si el mantenimiento del sábado está
  en marcha, un despliegue manual sale con un mensaje claro en vez de pisarle
  el reetiquetado de `:actual`/`:anterior`.
- **La limpieza de imágenes del sábado no lleva `-a`.** `docker image prune -f`
  solo borra imágenes sin etiqueta (colgantes); con `-a` borraría cualquier
  imagen sin contenedor de cualquier proyecto del host, incluido un
  `:anterior` de más de 30 días que dejó de ser el `:actual`. `:anterior`
  sigue etiquetada, así que el prune sin `-a` nunca la toca.

## Histórico

- **Hasta 2026-09-10:** bare-metal en el VPS de DigitalOcean. El nginx del host
  servía `dist/` desde disco.
- **2026-09-10:** en Docker en el VPS, en `127.0.0.1:8101`, detrás del nginx del
  host y después del `edge-proxy`.
- **2026-09-13:** cutover a `masancoserver`, el primer servicio migrado. Pasa a
  entrar por el túnel de Cloudflare, al puerto 8110 y al usuario `portfolio`
  con uid 1500 (en el VPS era el 995).
- **2026-09-17 (deuda técnica):** se borra `deploy/nginx/` (el vhost del nginx
  del host en el VPS, sin uso desde el cutover) y se limpian del resto de
  ficheros los comentarios y valores por defecto que seguían asumiendo el VPS.
- **2026-09-19:** se destruye el VPS. Desde ese día no hay marcha atrás a otra
  máquina.

## Cambiar los PDF del CV o la imagen OG

Ya no se reemplazan en caliente: viven dentro de la imagen. Se regeneran en el
PC ([cv-src/README.md](../cv-src/README.md), [og-src/README.md](../og-src/README.md)),
se commitean en `public/` y se despliegan como cualquier otro cambio. Los pasos
están en la guía, en «Regenerar los CV en PDF y la imagen OG».
