# stepmania-server

Next.js service for managing a queue of StepMania songs.

Current status:

- `docs/v0-design/` contains the initial reference design.
- `docs/` is the canonical place for project knowledge, context, deployment notes, references, and planning docs.
- The application scaffold lives at the repository root.
- Docker deployment is supported for both local Compose usage and remote Compose managers such as Komodo.

## Getting started

```bash
pnpm install
pnpm dev
```

## Agents

Project context and working documentation live under [`docs/`](./docs/).

Start with [`docs/README.md`](./docs/README.md) for the documentation structure, then use [`docs/index.md`](./docs/index.md) as the discovery index for knowledge, deployment notes, references, tasks, and plans.

## Docker

For local development or a local production-style smoke test, build and run from a clone of this repository with Docker Compose:

```bash
docker compose up --build
```

The app will be available on `http://localhost:3000`.

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
      NODE_ENV: production
      HOSTNAME: 0.0.0.0
      PORT: 3000
    restart: unless-stopped
```

Notes:

- The container listens on port `3000`; `3011:3000` publishes it on host port `3011`.
- `HOSTNAME=0.0.0.0` is required so the Next.js server binds to the container interface.
- If you change branches, update the `#main` suffix in the Git build context.

The initial template is intentionally minimal. The next steps are song directory ingestion, Postgres integration, and porting the `docs/v0-design` UI into the app.
