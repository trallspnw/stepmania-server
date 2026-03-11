# stepmania-server

Next.js service for managing a queue of StepMania songs.

Current status:

- `docs/` is the canonical place for project knowledge, context, deployment notes, references, and planning docs.
- The application scaffold lives at the repository root.
- The current mobile-first UI prototype now lives in the main app at the repository root.
- Docker deployment is supported for both local Compose usage and remote Compose managers such as Komodo.

## Getting started

```bash
pnpm install
pnpm dev
```

Use [`.env.example`](./.env.example) as the single env reference file.

- For local app development outside Docker, copy it to `.env.local` and set `DATABASE_URL` as needed.
- For Docker Compose overrides, copy it to `.env` beside `compose.yaml` and keep only the values you want Compose to read, such as `POSTGRES_DATA_DIR`.
- When running `pnpm dev` on your host against the Compose Postgres container, use `localhost` in `.env.local` for `DATABASE_URL`.

## Agents

Project context and working documentation live under [`docs/`](./docs/).

Start with [`docs/README.md`](./docs/README.md) for the documentation structure, then use [`docs/index.md`](./docs/index.md) as the discovery index for knowledge, deployment notes, references, tasks, and plans.

## Docker

For local development or a local production-style smoke test, build and run from a clone of this repository with Docker Compose:

```bash
docker compose up --build
```

The app will be available on `http://localhost:3000`.

The stack now includes:

- `stepmania-server`: Next.js app
- `postgres`: PostgreSQL with a bind-mounted data directory

The app connects through `DATABASE_URL`. A simple connection probe is available at `GET /api/health/db`.

Compose reads `DATABASE_URL` from the environment with a default fallback, so you can explicitly override it in a stack `.env` file without editing `compose.yaml`.

The checked-in [`compose.yaml`](./compose.yaml) uses `build.context: .`, which is intended for local use from a working copy of the repo.

## Komodo

For Komodo, use a remote Git build context instead of relying on a local checkout on the host. This is the current deployment approach:

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
      - postgres
    restart: unless-stopped
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: stepmania
      POSTGRES_USER: stepmania
      POSTGRES_PASSWORD: stepmania
    volumes:
      - ${POSTGRES_DATA_DIR:-./data/postgres}:/var/lib/postgresql/data
    restart: unless-stopped
```

Notes:

- The container listens on port `3000`; `3011:3000` publishes it on host port `3011`.
- `HOSTNAME=0.0.0.0` is required so the Next.js server binds to the container interface.
- `DATABASE_URL` is read from the environment with a Compose fallback. When both services run in the same stack, it should point at the Compose Postgres service name, not `localhost`.
- `POSTGRES_DATA_DIR` can be set in a Compose `.env` file if you want to override the default `./data/postgres` bind mount.
- If you change branches, update the `#main` suffix in the Git build context.

The current prototype is still mostly frontend-only. The next steps are schema design, user data modeling, song directory ingestion, and replacing hardcoded mock data with real application state.
