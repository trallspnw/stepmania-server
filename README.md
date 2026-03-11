# stepmania-server

Next.js service for managing a queue of StepMania songs.

Current status:

- `docs/v0-design/` contains the initial reference design.
- The application scaffold lives at the repository root.
- Docker Compose support is included for app-only deployment.

## Getting started

```bash
pnpm install
pnpm dev
```

## Docker

Build and run with Docker Compose:

```bash
docker compose up --build
```

The app will be available on `http://localhost:3000`.

The initial template is intentionally minimal. The next steps are song directory ingestion, Postgres integration, and porting the `docs/v0-design` UI into the app.
