# Deployment

This section holds deployment and runtime documentation.

## Current Deployment

The current deployment approach uses Komodo with a remote Git Docker build context.

Reference compose shape:

```yaml
services:
  stepmania-server:
    build:
      context: https://github.com/trallspnw/stepmania-server.git#main
      dockerfile: Dockerfile
    ports:
      - "3011:3000"
    environment:
      DATABASE_URL: ${DATABASE_URL:-postgresql://stepmania:stepmania@postgres:5432/stepmania}
      NODE_ENV: production
      HOSTNAME: 0.0.0.0
      PORT: 3000
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: stepmania
      POSTGRES_USER: stepmania
      POSTGRES_PASSWORD: stepmania
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 10
    volumes:
      - ${POSTGRES_DATA_DIR:-./data/postgres}:/var/lib/postgresql/data
    restart: unless-stopped
```

Notes:

- The app listens on container port `3000`.
- `HOSTNAME=0.0.0.0` is required so Next.js binds correctly inside the container.
- `DATABASE_URL` is read from the environment with a Compose fallback and should use the Compose service name (`postgres`) for in-stack connections.
- The app container runs `prisma migrate deploy` automatically before starting the server.
- `POSTGRES_DATA_DIR` can be set in the stack `.env` file. Use the root [`.env.example`](../../.env.example) as the reference source.
- With your stack at `/stacks/stepmania/compose.yaml`, the default resolves to `/stacks/stepmania/data/postgres`.
- The `#main` suffix in the Git build context controls which branch Komodo builds from.

## Updating In Komodo

This stack uses `build:` with a remote Git context, not `image:` with a registry tag.

That means the useful Komodo action for picking up new commits is:

- `Pre Build Images`

Operational guidance:

- `Pre Build Images` forces Komodo to rebuild services that use `build:`.
- `Pull Images` is mainly relevant for stacks that use `image:` from a registry.
- `Redeploy` reuses the image or build artifact Komodo already has unless a fresh build happens first.

If a new commit on `main` is not showing up after a normal redeploy, run `Pre Build Images` and then redeploy the stack.

## Root README

- Root deployment summary: [`../../README.md`](../../README.md)

Suggested contents:

- environment-specific setup
- compose manifests and examples
- operational runbooks
- hosting notes
- rollback and troubleshooting guides

Related:

- [`../index.md`](../index.md)
- [`../references/README.md`](../references/README.md)
