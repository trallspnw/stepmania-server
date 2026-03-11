# stepmania-server

Next.js service for managing a queue of StepMania songs.

Current status:

- `docs/v0-design/` contains the initial reference design.
- The application scaffold lives at the repository root.
- Docker Compose and Postgres will be added after the initial app setup.

## Getting started

```bash
pnpm install
pnpm dev
```

The initial template is intentionally minimal. The next steps are Docker Compose, Postgres integration, song directory ingestion, and porting the `docs/v0-design` UI into the app.
