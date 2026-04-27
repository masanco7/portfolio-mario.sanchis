# Deploy — portfolio.masanco-hub.com

Despliegue del portfolio público de Mario Sanchis Colomer en el VPS masanco-hub
(compartido con POLYBOT y Gym Tracker). Sitio **estático puro** (Astro 6 con
`output: 'static'`), 2 idiomas (`/` ES, `/en/` EN), sin backend, sin auth.

## Arquitectura

```
Cloudflare (proxy on, cert wildcard *.masanco-hub.com)
   │
   ▼  443
nginx  ─── /etc/nginx/sites-enabled/portfolio.masanco-hub.com
              │ root /opt/portfolio/dist
              ▼
           /opt/portfolio/
              ├── .git/
              ├── src/…
              ├── package.json
              └── dist/                 ← producto de `npm run build`
                  ├── index.html        (ES)
                  ├── en/index.html     (EN)
                  ├── _astro/*.css      (hashed)
                  ├── projects/*.png
                  └── cv-*.pdf
```

- **Usuario de servicio:** `portfolio:portfolio` con HOME en `/opt/portfolio/`
  (mismo patrón que `polybot:polybot` y `gym:gym`).
- **SSL:** reutiliza `/etc/ssl/cloudflare/origin.pem` (wildcard ya existente).
- **Sin systemd:** nginx sirve los estáticos directamente. No hay backend.

## Pre-requisitos

- [x] VPS con POLYBOT y Gym Tracker desplegados.
- [x] Certificado Cloudflare Origin wildcard `*.masanco-hub.com`.
- [x] Snippet `/etc/nginx/snippets/common-ssl.conf` existente.
- [ ] Registro DNS `portfolio.masanco-hub.com` → IP droplet (A record, proxy Cloudflare ON).
- [ ] Repo GitHub `masanco7/portfolio-mario.sanchis` creado y con `main` subido.

## Setup inicial (una sola vez)

SSH como `deploy` y ejecuta por bloques.

### 1. Usuario de servicio

```bash
sudo useradd --system --create-home --home-dir /opt/portfolio --shell /bin/bash portfolio
sudo chmod 755 /opt/portfolio
id portfolio
```

### 2. Clonar el repo (público, sin PAT)

```bash
sudo -u portfolio -H git clone https://github.com/masanco7/portfolio-mario.sanchis.git /opt/portfolio/repo
```

Astro necesita node 22+ (POLYBOT y Gym ya lo usan, así que está disponible). Build inicial:

```bash
sudo -u portfolio -H bash -c 'cd /opt/portfolio/repo && npm ci && npm run build'
sudo -u portfolio -H ln -sfn /opt/portfolio/repo/dist /opt/portfolio/dist
ls -la /opt/portfolio/dist/index.html
```

El symlink `dist` apunta dentro del repo — así `update.sh` solo hace `git pull && npm run build` sin tocar nginx.

### 3. nginx vhost

```bash
sudo cp /opt/portfolio/repo/deploy/nginx/portfolio.masanco-hub.com.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/portfolio.masanco-hub.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. DNS Cloudflare

En el panel de Cloudflare → DNS, crear A record:
- Name: `portfolio`
- IPv4: `138.68.185.149`
- Proxy: ON (nube naranja)
- TTL: Auto

Comprobar: `curl -I https://portfolio.masanco-hub.com/` debe devolver 200.

## Update workflow (cada cambio)

Desde tu PC:

```bash
git add -A
git commit -m "descripcion"
git push
```

En el VPS:

```bash
ssh -i ~/.ssh/id_ed25519_digitalocean deploy@138.68.185.149
sudo -u portfolio -H bash -c 'cd /opt/portfolio/repo && git pull --ff-only && npm ci && npm run build'
```

No hace falta reload de nginx — sirve los nuevos estáticos al siguiente request
(salvo si cambia `nginx/portfolio.masanco-hub.com.conf`, en cuyo caso `sudo cp …` y
`sudo systemctl reload nginx`).

## Verificación

```bash
# HTTP/2 200, Content-Type: text/html
curl -I https://portfolio.masanco-hub.com/
curl -I https://portfolio.masanco-hub.com/en/

# CV se descarga
curl -I https://portfolio.masanco-hub.com/cv-salesforce.pdf

# Imágenes de proyectos
curl -I https://portfolio.masanco-hub.com/projects/jasb.png
```

Logs si algo falla:

```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Cambiar PDFs sin redeploy

Si solo quieres reemplazar un CV sin tocar código:

```bash
scp -i ~/.ssh/id_ed25519_digitalocean ./public/cv-completo.pdf deploy@138.68.185.149:/tmp/
ssh -i ~/.ssh/id_ed25519_digitalocean deploy@138.68.185.149 \
  "sudo -u portfolio cp /tmp/cv-completo.pdf /opt/portfolio/repo/public/ && \
   sudo -u portfolio bash -c 'cd /opt/portfolio/repo && npm run build'"
```

(O hazlo en local, commit y push como cualquier otro cambio.)
