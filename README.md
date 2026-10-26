# stepmania-server

Backend for a home StepMania/ITGmania setup: friends queue songs from their phones, and a cabinet running the [Simply-Love-Plus](https://github.com/trallspnw/Simply-Love-Plus) theme plays them in fair turn order and reports the scores.

## Features

- **Player web app** (`/dashboard`, mobile-first): shared queue that round-robins across players; song library with search, packs, popular songs and audio previews; play history; profile. Accounts are invite-only, with a login name for signing in and a separate display name.
- **Child profiles:** profiles without logins that any adult can switch to, so queued songs and history are credited to the child.
- **Admin console** (`/admin`): library and ingestion, live queue, machine tokens and settings, users and invites, play history, and a test panel for the machine API.
- **Machine API** for cabinets, authenticated with a machine token: the current queue song and its start/skip/finish lifecycle, plus a library manifest and song/pack downloads that let a cabinet sync its songs from the server. Contract: [`docs/machine-api.md`](./docs/machine-api.md).

Built with Next.js, Prisma, PostgreSQL and NextAuth.

## Local development

```bash
cp .env.example .env.local   # then set DATABASE_URL to localhost and a real NEXTAUTH_SECRET
pnpm install
pnpm deps:up                 # Postgres in Docker
pnpm prisma:migrate:deploy
pnpm dev                     # http://localhost:3000
```

- A fresh database starts at `/setup`, which creates the first admin. After that, `/setup` is closed and sign-in is at `/login`.
- `pnpm test:queue` runs the queue-ordering tests.
- `pnpm db:reset:local` wipes the local database and reapplies the migrations.

## Database migrations

Prisma migrations are the source of truth for the schema.

- Create one with `pnpm prisma:migrate:dev`, and commit it together with `prisma/schema.prisma` and the code that needs it.
- Never edit a migration that has already been applied anywhere shared; add a new one.
- Deployed containers run `prisma migrate deploy` on startup, so committed migrations apply automatically.

## Song library

- Songs live in a folder set by `SONGS_DIR` (default `.data/Songs`), in the standard StepMania layout: `Pack/Song/files`. Each pack can carry a [`pack.ini`](./docs/pack-ini.md).
- **Ingestion** (admin console → Library) scans the folder into packs, songs and charts. Run it after any change to the folder.
  - It's idempotent: it updates what changed and marks songs whose folders are gone as unavailable, keeping their play history.
  - Each song and pack gets a checksum over every file in its folder (`lib/ingestion/folderChecksum.ts`). A song is re-parsed only when its checksum changes, and cabinets use the same checksums to decide what to download.
  - Charts are updated in place, so play history and queue entries survive re-ingestion.

## Deployment

The app ships as a Docker image (see `Dockerfile` and `compose.yaml`). `docker compose up --build` runs the app and Postgres locally on port 3000.

For a server, build from the Git repository instead of a local checkout:

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
      SONGS_DIR: /data/Songs
      NEXTAUTH_SECRET: ${NEXTAUTH_SECRET}
      NEXTAUTH_URL: ${NEXTAUTH_URL}
      NODE_ENV: production
      HOSTNAME: 0.0.0.0
      PORT: 3000
    volumes:
      - ${HOST_SONGS_DIR}:/data/Songs:ro
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

- `HOSTNAME=0.0.0.0` makes Next.js listen on the container's interface.
- `DATABASE_URL` should use the Compose service name (`postgres`), not `localhost`.
- The song folder is mounted read-only; the app never writes to it.
- The image is built from `main` at deploy time, so picking up new commits needs a rebuild, not just a restart. With Komodo, that's a Deploy with building enabled.
- `GET /api/health/db` checks the database connection.
