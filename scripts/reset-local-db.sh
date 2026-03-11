#!/bin/sh

set -eu

docker compose up -d postgres
docker compose exec -T postgres psql -U stepmania -d stepmania -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

if [ -f ./.env.local ]; then
  set -a
  . ./.env.local
  set +a
fi

pnpm prisma:migrate:deploy
