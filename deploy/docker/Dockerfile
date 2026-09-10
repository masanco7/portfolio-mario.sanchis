# The build context is the repo root, not this folder: the COPY paths are
# written from there. docker-compose.yml already sets `context: ../..`, so
# `docker compose up` from this directory is enough.
#
# What stays out of the image is listed in Dockerfile.dockerignore, next to this
# file. BuildKit looks for it there before the context root.

# Stage 1: build the static site.
FROM node:22-alpine AS build

WORKDIR /build

# Dependencies first: as long as package-lock.json does not change, Docker
# reuses this layer and a rebuild skips the install entirely.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .

# astro.config.mjs is `output: 'static'`, so this emits a plain dist/ tree:
# index.html (ES), en/index.html (EN), content-hashed assets under _astro/ and
# the CV PDFs copied straight from public/.
RUN npm run build


# Stage 2: serve it.
#
# nginx-unprivileged rather than the plain nginx image: it already runs as a
# non-root user and listens on 8080, so nothing inside the container needs root.
FROM nginxinc/nginx-unprivileged:1-alpine

# Git revision this image was built from. Lets you tell which commit is running
# by looking at the image alone: `docker inspect --format
# '{{index .Config.Labels "org.opencontainers.image.revision"}}' portfolio-web`.
ARG REVISION=unknown
LABEL org.opencontainers.image.title="Portfolio — Mario Sanchis Colomer" \
      org.opencontainers.image.source="https://github.com/masanco7/portfolio-mario.sanchis" \
      org.opencontainers.image.revision="${REVISION}"

# Cache policy and the ES/EN routing live here, not in the host vhost. That way
# the rules travel with the image and the proxy in front stays a thin TLS
# terminator — which is what makes moving this to another server a copy job.
COPY deploy/docker/nginx-site.conf /etc/nginx/conf.d/default.conf

COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 8080

# wget comes from busybox in the alpine base, so there is nothing extra to
# install. `--spider` would not fetch the body; here a real GET of / is the
# point, since that is what a broken build would fail to serve.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
