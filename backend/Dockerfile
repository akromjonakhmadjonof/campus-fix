# Build context is repository root: docker build -f backend/Dockerfile .
FROM node:24.22.1-bookworm-slim AS manifests
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN npm install --global pnpm@11.17.0
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY backend/package.json backend/package.json
FROM manifests AS dependencies
# Skip lifecycle scripts and generate the backend client explicitly.
RUN pnpm --filter @campus-fix/backend install --frozen-lockfile --ignore-scripts
RUN pnpm --filter @campus-fix/backend rebuild @prisma/engines

FROM dependencies AS build
COPY backend backend
WORKDIR /app/backend
RUN pnpm build

# Dedicated release job includes Prisma CLI; never invoked by the runtime entrypoint.
FROM build AS migrate
USER node
CMD ["node", "scripts/migrate.mjs", "deploy"]

FROM manifests AS production-dependencies
RUN pnpm --filter @campus-fix/backend --prod install --frozen-lockfile --ignore-scripts

FROM node:24.22.1-bookworm-slim AS runtime
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4000
WORKDIR /app
COPY --from=production-dependencies /app/node_modules ./node_modules
COPY --from=production-dependencies /app/backend/node_modules ./backend/node_modules
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/backend/dist ./backend/dist
WORKDIR /app/backend
RUN mkdir -p /app/backend/uploads && chown node:node /app/backend/uploads
VOLUME ["/app/backend/uploads"]
USER node
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:4000/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
