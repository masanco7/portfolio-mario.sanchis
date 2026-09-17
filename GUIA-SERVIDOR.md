# Guía del servidor — Portfolio

> Verificada el 2026-09-17 contra `masancoserver`. Guía general de la máquina:
> `Pruebas/GUIA-SERVIDOR.md` (fuera de este repo). El porqué de las decisiones:
> `Pruebas/ESQUEMA-SERVIDOR.md`. Los detalles de diseño de los ficheros de
> despliegue están en [deploy/README.md](deploy/README.md).

Sitio estático (Astro 6, ES/EN), sin backend, sin base de datos y sin login.
Desde el 2026-09-13 se sirve en Docker desde `masancoserver`, el servidor de casa.
El VPS de DigitalOcean donde vivía antes se destruye el 2026-09-19. No queda
ningún entorno alternativo al que volver.

## Resumen

| | |
|---|---|
| URL | https://portfolio.masanco-hub.com (acceso **abierto**: el vhost del edge no lleva autenticación ni rate limit, y el sitio responde 200 sin pasar por Cloudflare Access) |
| Contenedores | `portfolio-web` (imagen `portfolio-masanco-hub:actual`, base `nginxinc/nginx-unprivileged:1-alpine`) |
| Puerto en el host | `127.0.0.1:8110` (canario `127.0.0.1:8111`, solo mientras corre el mantenimiento) |
| Nombre en la red `edge` | `portfolio-web:8080` |
| Proyecto Compose | `portfolio` (fijado con `name:` en el compose) |
| Usuario de servicio | `portfolio` (uid/gid 1500), home `/opt/portfolio` |
| Código | `/opt/portfolio/repo` (**el clon está en `repo/`**, no en la raíz del home) |
| Datos | ninguno: el sitio va horneado en la imagen y el contenedor es `read_only` |
| Secretos | `/etc/portfolio.env` (600 root): `PORTFOLIO_PORT`, `TELEGRAM_TOKEN`, `TELEGRAM_CHAT_ID` |
| Mantenimiento | sábados 02:00 Europe/Madrid (+0-10 min aleatorios), `portfolio-mantenimiento.timer` |
| Repo | https://github.com/masanco7/portfolio-mario.sanchis (público; el servidor clona por HTTPS sin credenciales) |

Camino de una visita:

```
Cloudflare (TLS) → cloudflared (túnel saliente) → edge-proxy (nginx, vhost
portfolio.masanco-hub.com.conf) → red edge → portfolio-web:8080
```

El vhost del edge vive en `/opt/edge/nginx/conf.d/portfolio.masanco-hub.com.conf`
(copia en `Pruebas/masanco-hub-edge-casa/`). Solo añade cabeceras de seguridad y
hace `proxy_pass`. Las reglas de caché y las rutas ES/EN van dentro de la imagen
(`deploy/docker/nginx-site.conf`).

## Conectarse

```bash
ssh server
```

`deploy` no está en el grupo `docker`, así que Docker se usa siempre con `sudo`.
git se usa siempre como `sudo -u portfolio -H`: como `deploy` da *dubious ownership*.

## Desplegar un cambio

1. En el PC: commit y push a `main`.
2. En el servidor:

   ```bash
   sudo bash /opt/portfolio/repo/deploy/docker/update.sh
   ```

Qué hace `update.sh`:

1. Toma el mismo `flock` que el mantenimiento
   (`/var/lock/portfolio-mantenimiento.lock`), sin bloquearse: si el
   mantenimiento del sábado está en marcha, sale con un mensaje claro sin
   tocar nada.
2. Carga `/etc/portfolio.env`, que es de donde sale el puerto 8110.
3. Ejecuta `git pull --ff-only` como `portfolio`.
4. Etiqueta `portfolio-masanco-hub:actual` como `:anterior`.
5. Ejecuta `docker compose build`: el `npm ci` y el `npm run build` se hacen dentro de la imagen.
6. Ejecuta `docker compose up -d`.
7. Espera hasta 60 s a que `http://127.0.0.1:8110/` responda **y** el cuerpo
   contenga «Mario Sanchis Colomer» (un 200 no basta). Si no, vuelve a
   etiquetar `:anterior` como `:actual`, recrea el contenedor y sale con error.

El tiempo es «por verificar» en esta máquina. En el VPS, el primer build en frío
tardaba unos 2-3 min; los siguientes reutilizan las capas de `npm ci` mientras
no cambie `package-lock.json`.

Comprobar:

```bash
curl -fsS http://127.0.0.1:8110/ | grep -c "Mario Sanchis Colomer"     # > 0
curl -fsS -o /dev/null -w '%{http_code} %{content_type}\n' http://127.0.0.1:8110/cv-completo.pdf
sudo docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' portfolio-web
curl -sI https://portfolio.masanco-hub.com/ | head -1
```

Exige el nombre en el cuerpo, no basta con un 200. El valor por defecto del
repo (8110) ya coincide con el real en `masancoserver`, así que aunque falte
`/etc/portfolio.env` el sitio se publica en el puerto correcto en esta
máquina.

### Volver a la versión anterior

```bash
sudo docker image tag portfolio-masanco-hub:anterior portfolio-masanco-hub:actual
sudo docker compose --env-file /etc/portfolio.env \
  -f /opt/portfolio/repo/deploy/docker/docker-compose.yml up -d --force-recreate
```

Solo hay un paso atrás. Además, cada ejecución de `update.sh` sobrescribe
`:anterior` con lo que estaba sirviendo, así que dos despliegues seguidos dejan
`:anterior` igual a `:actual`. Para ir más atrás, haz `git revert` en el PC,
push y vuelve a lanzar `update.sh`.

## Operar

```bash
sudo docker ps --filter name=portfolio                   # estado + (healthy)
sudo docker logs --tail 100 -f portfolio-web             # access/error log del nginx interno
sudo docker restart portfolio-web                        # reinicio sin recrear
sudo docker exec -it portfolio-web sh                    # shell (busybox, sistema de ficheros de solo lectura)
```

Para recrear el contenedor, **pasa siempre `--env-file /etc/portfolio.env`**
(ver «Trampas propias»):

```bash
sudo docker compose --env-file /etc/portfolio.env \
  -f /opt/portfolio/repo/deploy/docker/docker-compose.yml up -d --force-recreate
```

Ver lo que ve un visitante sin salir del servidor:

```bash
sudo docker exec edge-proxy wget -q -O- --header "Host: portfolio.masanco-hub.com" http://127.0.0.1/ | grep -c "Mario Sanchis Colomer"
```

Los logs del contenedor están limitados a 5 ficheros de 10 MB cada uno.

## Datos y copias

No hay datos. Todo lo que se sirve sale del repo, incluidos los CV en PDF
(`public/cv-*.pdf`) y la imagen OG (`public/og-image.png`), que se commitean ya
generados. Reconstruir el servicio desde cero:

1. Crear el usuario `portfolio` (1500), clonar el repo en `/opt/portfolio/repo` y
   crear la red `edge` si no existe.
2. Crear `/etc/portfolio.env` (600 root) con `PORTFOLIO_PORT=8110` y el token y
   el chat del bot de Telegram del portfolio.
3. Lanzar `sudo bash /opt/portfolio/repo/deploy/docker/update.sh`.
4. Instalar el mantenimiento: copiar `mantenimiento.sh` y `avisar-fallo.sh` a
   `/usr/local/lib/portfolio-mantenimiento/`, `notify-telegram.sh` a
   `/usr/local/bin/notify-telegram-portfolio.sh` y las tres units a
   `/etc/systemd/system/` (ver «Mantenimiento semanal» → «Instalación»).

No hay nada que copiar a restic. Lo único que no está en git es
`/etc/portfolio.env`, y se puede rehacer: el token sale de BotFather.

## Mantenimiento semanal

Se ejecuta los sábados a las 02:00 (Europe/Madrid) con `RandomizedDelaySec=10m`
y `Persistent=true`. Es el primero después del mantenimiento del host (01:00):

- El host va antes para que, si un `apt` rompe algo, se vea antes de que corra
  nada encima.
- El portfolio va justo después porque es el servicio que menos daño hace si
  falla. Así es el que descubre los problemas del propio mecanismo de
  mantenimiento antes de que lleguen a Polybot (03:00), Gym (04:00) e
  INTEGRAS (05:00).

**Para qué sirve en un sitio estático:** el `docker build --pull` vuelve a
resolver `node:22-alpine` y `nginx-unprivileged`. Es la única vía por la que
llegan al contenedor los parches de seguridad de la imagen base. Además
despliega los commits que haya en `main`.

Pasos de `deploy/scripts/mantenimiento.sh`:

1. Toma un `flock` en `/var/lock/portfolio-mantenimiento.lock`.
2. Comprueba que el sitio actual responde.
3. Ejecuta `git pull --ff-only`.
4. Construye `:candidato`.
5. Lo levanta como `portfolio-canario` en 8111 y comprueba la portada ES, la EN
   y el `cv-completo.pdf`.
6. Promociona por reetiquetado: `:actual` pasa a `:anterior` y `:candidato` a
   `:actual`. Después recrea el contenedor.
7. Comprueba el puerto 8110 y el camino real a través de `edge-proxy`.
8. Limpia las imágenes de más de 30 días.
9. Envía el informe por Telegram.

Si el fallo llega después de promocionar, revierte sin consultar el estado de
salud. Si el proceso muere sin llegar a su `trap` (OOM, timeout, kill -9),
`portfolio-mantenimiento-fallo.service` (vía `OnFailure=`) avisa igualmente.

Instalación en el servidor:

- Las tres units están **copiadas** (no enlazadas) en `/etc/systemd/system/`,
  y apuntan a `/usr/local/lib/portfolio-mantenimiento/`, no al repo.
- `mantenimiento.sh` y `avisar-fallo.sh` están **copiados** como root
  (`root:root`, 755) en `/usr/local/lib/portfolio-mantenimiento/`. El repo en
  `/opt/portfolio/repo` es escribible por el usuario `portfolio`, así que
  root nunca ejecuta el script directamente desde ahí: sería dejar que ese
  usuario cambiara código que corre como root con solo un commit.
- `notify-telegram.sh` está copiado como `/usr/local/bin/notify-telegram-portfolio.sh`
  (750 root).

Por eso, si cambias `mantenimiento.sh`, `avisar-fallo.sh`, una unit o
`notify-telegram.sh` en git, hay que volver a instalarlos — `mantenimiento.sh`
compara (`cmp`) las tres copias del repo con las instaladas (ver más abajo) y
avisa si alguna cambió, pero no reinstala nada solo. Este es también el
paso 4 de «Reconstruir el servicio desde cero»:

```bash
sudo mkdir -p /usr/local/lib/portfolio-mantenimiento
sudo install -o root -g root -m 755 \
    /opt/portfolio/repo/deploy/scripts/mantenimiento.sh \
    /opt/portfolio/repo/deploy/scripts/avisar-fallo.sh \
    /usr/local/lib/portfolio-mantenimiento/
sudo install -m 750 /opt/portfolio/repo/deploy/scripts/notify-telegram.sh /usr/local/bin/notify-telegram-portfolio.sh
sudo cp /opt/portfolio/repo/deploy/systemd/portfolio-mantenimiento*.{service,timer} /etc/systemd/system/
sudo systemctl daemon-reload
```

`mantenimiento.sh` no se reinstala solo: tras su `git pull`, compara (`cmp`)
las tres copias del repo (`mantenimiento.sh`, `avisar-fallo.sh` y
`notify-telegram.sh`) con las instaladas y, si alguna difiere, no toca nada —
lo deja como aviso en el informe de Telegram del sábado, con el comando de
reinstalación exacto para cada destino, para que la reinstalación sea una
decisión de Mario, no un efecto secundario del `git pull`.

Resultado y ejecución a mano:

```bash
systemctl list-timers portfolio-mantenimiento.timer
sudo journalctl -u portfolio-mantenimiento --since '1 day ago'
sudo journalctl -u portfolio-mantenimiento-fallo --since '1 day ago'
sudo /usr/local/lib/portfolio-mantenimiento/mantenimiento.sh --seco          # ensayo, no promociona
sudo /usr/local/lib/portfolio-mantenimiento/mantenimiento.sh --sin-aviso     # sin Telegram
sudo systemctl start portfolio-mantenimiento                                 # la ejecución de verdad
```

Estado a 2026-09-17: timer `enabled`, próxima ejecución el sábado 2026-09-19 a
las 02:01. Esa será **la primera ejecución programada**: el timer se instaló el
2026-09-13, el día después del sábado anterior. Que las ejecuciones manuales
del 13/09 terminaran bien es «por verificar», porque `deploy` no puede leer ese
journal sin sudo.

## Git en el servidor

```bash
sudo -u portfolio -H git -C /opt/portfolio/repo pull --ff-only
sudo -u portfolio -H git -C /opt/portfolio/repo log --oneline -3
```

No se commitea desde el servidor. `git add -A` no expone secretos aquí (el
`.env` vive en `/etc`), pero el flujo es siempre PC → GitHub → servidor.

## Si algo falla

1. **La web da 502/504.** Comprueba con `sudo docker ps --filter name=portfolio`.
   - Si el contenedor está parado: `sudo docker start portfolio-web`.
   - Si está en marcha: `curl -fsS http://127.0.0.1:8110/ | head` y la prueba a
     través del edge de «Operar». Si el puerto responde pero el edge no, revisa
     que el contenedor siga en la red `edge`:
     `sudo docker inspect -f '{{json .NetworkSettings.Networks}}' portfolio-web`.
2. **La web da 530/1033 (error de Cloudflare).** El túnel está caído y no es cosa
   del portfolio: `sudo docker logs --tail 50 cloudflared`. Ver la guía general.
3. **`update.sh` sale con «rolled back».** El build nuevo no respondía en 60 s.
   Mira las 40 líneas de log que imprime y reprodúcelo en el PC con
   `npm run build`.
4. **`update.sh` falla en el `git pull`.** El historial ha divergido (`--ff-only`).
   Averigua qué pasó en el PC; no fuerces nada en el servidor.
5. **El contenedor ha quedado publicado en un puerto distinto de 8110.**
   `PORTFOLIO_PORT` en `/etc/portfolio.env` tiene un valor viejo, o se ha
   recreado con un `PORTFOLIO_PORT` distinto en el entorno. Recréalo con
   `--env-file` como en «Operar» y revisa ese fichero.
6. **El informe del sábado no ha llegado.** Revisa `journalctl` de las dos
   units. Si `notify-telegram-portfolio.sh` devuelve «chat not found», pulsa
   Start en el bot desde Telegram.
7. **He cambiado un CV o la imagen OG y sigue saliendo la versión vieja.**
   Cloudflare los cachea: el 2026-09-17 `cv-completo.pdf` salía con
   `cf-cache-status: HIT` y `max-age=14400`. Purga la URL en Cloudflare
   (Caching → Configuration → Purge by URL). Para LinkedIn, además, usa
   https://www.linkedin.com/post-inspector/.

## Regenerar los CV en PDF y la imagen OG (paso local, en el PC)

Ninguno de los dos se genera en el servidor ni durante el build: el
`Dockerfile.dockerignore` excluye `cv-src/` y `og-src/`, y la imagen solo copia
lo que ya está en `public/`.

- **CV:** edita `cv-src/*.html` o `cv-src/cv.css`, ábrelo en Chrome o Edge y
  exporta con Ctrl+P → Guardar como PDF (A4, márgenes «Ninguno», gráficos de
  fondo activados, sin encabezados). Guarda encima de `public/cv-*.pdf`.
  Detalles en [cv-src/README.md](cv-src/README.md).
- **Imagen OG:** tras cambiar `hero.title` o `hero.tagline` en `src/i18n/es.ts`,
  ejecuta `npm run og` en el PC. Regenera `public/og-image.png` y
  `og-src/og-image.svg`. Se hace en Windows por las fuentes (Segoe UI y
  Cascadia Mono como sustitutas); en un Linux sin esas fuentes saldría distinta.
  Detalles en [og-src/README.md](og-src/README.md).

Después, en los dos casos:

1. Commit y push.
2. `update.sh` en el servidor, o esperar al sábado.
3. Purgar la URL en Cloudflare.

## Trampas propias

- **El clon está en `/opt/portfolio/repo`**, no en `/opt/portfolio`.
- **El puerto por defecto del repo ya es el de `masancoserver` (8110).**
  `docker-compose.yml`, `update.sh` y `mantenimiento.sh` usan
  `${PORTFOLIO_PORT:-8110}`, así que un `docker compose` lanzado sin
  `/etc/portfolio.env` publica igualmente en el puerto correcto en esta
  máquina. En otra máquina con un reparto de puertos distinto, ese valor por
  defecto seguiría sin ser el correcto: sigue haciendo falta
  `/etc/portfolio.env` fuera de `masancoserver`. El 2026-09-12 el canario de
  INTEGRAS llegó a validar un despliegue contra el portfolio, por otra causa
  (puertos consecutivos entre proyectos); por eso ninguna comprobación se
  conforma con un 200.
- **No hay nginx en el host.** `deploy/nginx/` (vhost heredado del VPS) se
  borró el 2026-09-17. El vhost real es el del edge
  (`/opt/edge/nginx/conf.d/`, copia en `Pruebas/masanco-hub-edge-casa/`).
- **El 200 no prueba nada**: comprueba siempre la cadena `Mario Sanchis Colomer`.
- **Probar desde el puerto no basta.** El salto edge → contenedor es el que se
  rompe en silencio si cambian el nombre del contenedor o la red.
- **Editar los scripts desde Windows** puede perder el bit `+x` (systemd da
  `203/EXEC`) o meter CRLF. Usa `git update-index --chmod=+x`.
- **El vhost del edge aún lista `casa-portfolio.masanco-hub.com`**, el hostname
  canario del cutover. Su DNS ya no existe (NXDOMAIN el 2026-09-17). Que la ruta
  del túnel también esté borrada es «por verificar».
