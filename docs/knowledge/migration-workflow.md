# Migration Workflow

This project uses Prisma migrations as the source of truth for database evolution.

## Rules

- Never edit an old committed migration after it has been applied anywhere shared.
- Always create a new migration to move the schema forward.
- Commit schema changes and migration files together.
- Production and deployed environments should only apply existing committed migrations.

## Local Development

When you are creating a new schema change:

```bash
pnpm prisma:migrate:dev
```

This does two things:

- updates the local database
- creates a new migration in `prisma/migrations/`

After that, commit:

- `prisma/schema.prisma`
- the new migration directory
- any application code that depends on the schema change

Useful local commands:

```bash
pnpm db:reset:local
pnpm prisma:generate
pnpm prisma:migrate:status
pnpm prisma:studio
```

`pnpm db:reset:local` is the local wipe path for testing first-run flows. It drops and recreates the local `public` schema in the Compose Postgres container, then runs `prisma migrate deploy`.

## Pulling Latest Changes

If your local database is behind the committed migrations on `main`, apply them with:

```bash
pnpm prisma:migrate:deploy
```

Use this when you want your local database to catch up to already-committed migrations without creating a new one.

## Deployments

The app container runs:

```bash
prisma migrate deploy
```

before starting the Next.js server.

That means the deployment flow is:

1. code and migrations are committed to `main`
2. Komodo rebuilds the image
3. container starts
4. pending committed migrations are applied
5. app server boots

## Practical Split

- `prisma migrate dev`: create new migrations during development
- `prisma migrate deploy`: apply committed migrations safely in local sync, CI, and production

Related:

- [`../deployment/README.md`](../deployment/README.md)
- [`../../prisma/schema.prisma`](../../prisma/schema.prisma)
