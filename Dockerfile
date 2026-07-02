# Threadbound hosted server (S6.2): one node process builds and serves the
# client dist + websockets. All storage paths are env-driven (S6.7); on
# Render mount the persistent disk at /data and point HUMAN_TELEMETRY /
# TB_FEEDBACK_DIR / PERSIST there (see render.yaml).

FROM node:20-alpine
WORKDIR /app

# manifests first so the npm ci layer caches across code-only changes
COPY package.json package-lock.json ./
COPY packages/engine/package.json packages/engine/
COPY packages/server/package.json packages/server/
COPY packages/client/package.json packages/client/
COPY packages/bots/package.json packages/bots/
RUN npm ci --no-audit --no-fund

COPY . .

# S6.1 build identity: no .git in the image — inject the commit at build
# time. Render passes RENDER_GIT_COMMIT to Docker builds automatically;
# other hosts can pass --build-arg BUILD_SHA=$(git rev-parse --short HEAD).
# review fix: nested ENV defaulting (${A:-${B:-c}}) breaks under legacy
# builders — resolve the default in a RUN-time shell instead. The resolved
# sha is baked into the client bundle here and persisted to .build-sha for
# the runtime server (build.ts reads it when BUILD_SHA env is unset).
ARG RENDER_GIT_COMMIT=
ARG BUILD_SHA=
RUN sha="${BUILD_SHA:-${RENDER_GIT_COMMIT:-dev}}" \
 && printf '%s' "$sha" > .build-sha \
 && BUILD_SHA="$sha" npm run build \
 && npm prune --omit=dev

ENV PORT=8080
EXPOSE 8080
CMD ["node", "packages/server/dist/index.js"]
