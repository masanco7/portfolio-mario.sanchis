# Deploy — portfolio.masanco-hub.com

Despliegue del portfolio público de Mario Sanchis Colomer. Sitio **estático puro**
(Astro 6 con `output: 'static'`), 2 idiomas (`/` ES, `/en/` EN), sin backend, sin auth.

Desde 2026-09-10 corre **en Docker**. Es la primera app del VPS que se contenedoriza
dentro del plan de migración al servidor casero; el objetivo es que mover el sitio a
otra máquina sea copiar el repo y ejecutar un comando, sin reinstalar node ni recordar
qué versión hacía falta.

## Arquitectura

```
Cloudflare (proxy on, cert wildcard *.masanco-hub.com)
   │
   ▼  443
nginx del HOST  ─── /etc/nginx/sites-enabled/portfolio.masanco-hub.com.conf
   │                  solo TLS + security headers + proxy_pass
   ▼  127.0.0.1:8101
contenedor `portfolio-web`  (nginx-unprivileged :8080)
   │                  cache policy + rutas ES/EN + gzip
   ▼
/usr/share/nginx/html   ← dist/ de Astro, horneado en la imagen
```

**El sitio ya no se sirve desde el disco del host.** No hay `/opt/portfolio/dist`,
no hay symlink, no hay `npm run build` en el servidor: el build ocurre dentro de la
imagen (stage `node:22-alpine`) y el resultado se copia al stage de nginx.

- **Puerto:** `127.0.0.1:8101`. Convención del VPS: `80xx` = servicios bare-metal
  (polybot :8000, gym-api :8001), `81xx` = apps en Docker (integras :8100, portfolio :8101).
- **Estado:** ninguno. El contenedor es `read_only: true` y no monta volúmenes.
  Todo lo que sirve viene de la imagen, así que un `docker compose up` en otra
  máquina da exactamente el mismo sitio.
- **SSL:** sigue en el nginx del host, reutilizando `/etc/ssl/cloudflare/origin.pem`.
  Es la fase 1 del plan; la fase 2 mueve el proxy a un contenedor (ver más abajo).

## Ficheros

| Fichero | Qué es |
|---|---|
| `docker/Dockerfile` | Build multi-stage: Astro → nginx-unprivileged |
| `docker/Dockerfile.dockerignore` | Qué NO entra en el contexto de build |
| `docker/nginx-site.conf` | vhost **interno** del contenedor (cache, ES/EN, gzip) |
| `docker/docker-compose.yml` | Servicio, puerto, logging, read-only |
| `docker/update.sh` | Redespliegue con rollback automático |
| `nginx/portfolio.masanco-hub.com.conf` | vhost del **host**: TLS + proxy_pass |

## Migración de bare-metal a Docker (una sola vez)

El sitio ya está desplegado en `/opt/portfolio/repo`. Estos pasos lo mueven a Docker
sin borrar nada: si algo falla, restaurar el vhost viejo devuelve el sitio en segundos.

### 0. Permiso de Docker para `deploy` (opcional, recomendado)

`deploy` está en el grupo `sudo` pero no en `docker`, así que hoy todo comando
`docker` necesita `sudo`. Para no arrastrar eso en cada despliegue:

```bash
sudo usermod -aG docker deploy
# cierra la sesión SSH y vuelve a entrar para que el grupo tome efecto
```

> Ojo: pertenecer a `docker` equivale a root en la práctica. `deploy` ya tiene `sudo`,
> así que no baja el listón de seguridad, pero conviene saberlo.

### 1. Traer el commit con los ficheros de Docker

```bash
sudo -u portfolio -H git -C /opt/portfolio/repo pull --ff-only
ls /opt/portfolio/repo/deploy/docker/
```

Esperado: `Dockerfile`, `docker-compose.yml`, `nginx-site.conf`, `update.sh`.

### 2. Construir y levantar el contenedor

Todavía sin tocar nginx: el sitio sigue sirviéndose desde disco mientras tanto.

```bash
cd /opt/portfolio/repo/deploy/docker
# El `git` va como `portfolio` a proposito: el repo es suyo, y si lo lanzas como
# `deploy` git aborta con "detected dubious ownership", la variable llega vacia
# y la imagen queda etiquetada como `unknown` en vez de con el commit.
REV="$(sudo -u portfolio -H git -C /opt/portfolio/repo rev-parse --short HEAD)"
sudo REVISION="$REV" docker compose build
sudo docker compose up -d
sudo docker compose ps
```

Esperado: `portfolio-web` en estado `Up (healthy)`. El primer build tarda ~2-3 min
(descarga node:22-alpine + `npm ci`); los siguientes reutilizan capas.

### 3. Verificar el contenedor ANTES de mover el tráfico

```bash
curl -I http://127.0.0.1:8101/                    # 200, text/html
curl -I http://127.0.0.1:8101/en/                 # 200
curl -I http://127.0.0.1:8101/cv-salesforce.pdf   # 200, application/pdf
curl -sI http://127.0.0.1:8101/_astro/ -o /dev/null -w '%{http_code}\n'   # 403/404, no 500
```

Si algo de esto falla, **para aquí**: el sitio público sigue intacto.

### 4. Cambiar el vhost del host a proxy

```bash
sudo cp /etc/nginx/sites-available/portfolio.masanco-hub.com.conf \
        /root/portfolio.vhost.bak.$(date +%Y%m%d)      # red de seguridad
sudo cp /opt/portfolio/repo/deploy/nginx/portfolio.masanco-hub.com.conf \
        /etc/nginx/sites-available/
sudo nginx -t && sudo systemctl reload nginx
```

**`reload`, no `restart`.** nginx es compartido con polybot, gym e integras.

### 5. Verificar en público

```bash
curl -I https://portfolio.masanco-hub.com/
curl -I https://portfolio.masanco-hub.com/en/
curl -I https://portfolio.masanco-hub.com/cv-completo.pdf
```

Y abrir el sitio en el navegador: las imágenes de proyectos y los PDFs deben cargar.

### 6. Limpiar el despliegue viejo (solo cuando lleve unos días bien)

```bash
sudo -u portfolio rm -rf /opt/portfolio/repo/node_modules /opt/portfolio/repo/dist
sudo -u portfolio rm -f /opt/portfolio/dist        # el symlink
```

No borres `/opt/portfolio/repo`: es de donde sale el build.

## Update workflow (cada cambio)

Desde el PC, como siempre:

```bash
git add -A && git commit -m "descripcion" && git push
```

En el VPS, un solo comando:

```bash
sudo bash /opt/portfolio/repo/deploy/docker/update.sh
```

Hace `git pull` como `portfolio`, etiqueta la imagen actual como `:anterior`,
reconstruye, levanta y espera health hasta 60s. **Si no queda sana, vuelve sola a
la imagen anterior** y sale con error. No toca nginx.

Si cambiaste `deploy/nginx/portfolio.masanco-hub.com.conf`, el script te recuerda
al final los dos comandos para copiarlo y recargar nginx.

## Rollback manual

```bash
sudo docker image tag portfolio-masanco-hub:anterior portfolio-masanco-hub:actual
cd /opt/portfolio/repo/deploy/docker && sudo docker compose up -d --force-recreate
```

Para saber qué commit está corriendo ahora mismo:

```bash
sudo docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' portfolio-web
```

## Logs y diagnóstico

```bash
sudo docker compose -p portfolio logs -f            # access/error log de nginx del contenedor
sudo docker compose -p portfolio ps                 # estado + healthcheck
sudo tail -f /var/log/nginx/error.log               # nginx del host (compartido)
```

Los logs del contenedor están capados a 10 MB × 5 ficheros, así que no pueden
llenar el disco.

**502 en el sitio público** → el contenedor está caído o el puerto no coincide:
`sudo docker compose -p portfolio ps` y `curl -I http://127.0.0.1:8101/`.

## Cambiar PDFs del CV

Ya no se pueden reemplazar en caliente por `scp`: los PDFs viven dentro de la imagen.
El flujo es el normal — reemplazar el fichero en `public/`, commit, push, `update.sh`.
Es un paso más, pero a cambio la imagen y el repo nunca se desincronizan.

## Dónde vive esto ahora (2026-09-13)

**El sitio se sirve desde `masancoserver`, el servidor de casa.** El contenedor
del VPS quedó parado pero intacto ese mismo día.

```
Internet → Cloudflare → túnel saliente (cloudflared) → edge-proxy → portfolio-web
```

| | VPS (antes) | masancoserver (ahora) |
|---|---|---|
| Puerto de la app | 8101 | **8110** |
| Canario | — | 8111 |
| Entrada | 80/443 abiertos, cert Origin | túnel saliente, sin puertos |
| Upstream del edge | `127.0.0.1:8101` | `portfolio-web:8080` |
| Usuario de servicio | `portfolio` uid 995 | `portfolio` uid **1500** |

El puerto no está en el repo: sale de `PORTFOLIO_PORT` en `/etc/portfolio.env`
(600 root), que leen tanto `update.sh` como el mantenimiento. Donde ese fichero
no existe manda el valor por defecto del compose, que es el del VPS. Mismo
código en las dos máquinas.

**Marcha atrás del cutover**, si alguna vez hiciera falta: en Cloudflare, DNS →
registro `A` para `portfolio` → `138.68.185.149` con el proxy activado, y en el
VPS `sudo docker compose -f /opt/portfolio/repo/deploy/docker/docker-compose.yml
start`. Por eso el contenedor de allí se paró con `stop` y no con `down`.

## Mantenimiento semanal

Sábados a las **02:00** (Europe/Madrid), justo después del mantenimiento del
host. Ficheros en `deploy/scripts/` y `deploy/systemd/`.

```bash
sudo /opt/portfolio/repo/deploy/scripts/mantenimiento.sh --seco   # ensayo
sudo systemctl start portfolio-mantenimiento                       # de verdad
journalctl -u portfolio-mantenimiento --since '1 day ago'
```

**Para qué sirve en un sitio estático.** No hay dependencias en ejecución ni
datos que migrar: lo único que envejece es la imagen base. El `docker build
--pull` vuelve a resolver `node:22-alpine` y `nginx-unprivileged`, que es la
única vía por la que las actualizaciones de seguridad llegan al contenedor.

**Cómo promociona.** Construye `:candidato`, lo prueba en el puerto 8111 en un
contenedor aparte, y solo entonces reetiqueta `:actual` → `:anterior` y
`:candidato` → `:actual`. Reetiquetar es instantáneo y no puede fallar a medias,
que es lo que hace fiable la reversión.

**Dos cosas que no son obvias y conviene no tocar:**

- Las comprobaciones exigen la cadena `Mario Sanchis Colomer` en el cuerpo, no
  un 200. El 12/09 el canario de Integras validó un despliegue suyo contra este
  portfolio: un 200 no demuestra que quien contesta seas tú.
- Después de promocionar comprueba **a través del edge**, con la cabecera `Host`
  real, no solo por el puerto 8110. Ese salto es el que se rompe en silencio si
  cambia el nombre del contenedor o la red compartida, y validar desde dentro es
  justo lo que no detectó el 522 del primer cutover del VPS.

Si el fallo ocurre **después** de promocionar, revierte sin preguntarle a la
salud: los fallos posteriores a poner a servir son precisamente los que la salud
no ve.

El bot de Telegram es propio del proyecto (`notify-telegram-portfolio.sh`, con
el token en `/etc/portfolio.env`). El aislamiento viene del token: si este se
compromete, alcanza este canal y ninguno más.

## ~~Fase 2 — proxy dentro de Docker~~ (hecho, 2026-09-10)

Cuando las tres apps (portfolio, gym, polybot) estén contenedorizadas, el nginx del
host se sustituye por un contenedor de proxy en una red `edge` compartida. Para este
sitio el cambio ya está preparado en `docker-compose.yml`: se descomentan los bloques
`networks:` y se borra el bloque `ports:`. El proxy alcanzará el contenedor como
`portfolio:8080` y no habrá nada publicado en el host.
