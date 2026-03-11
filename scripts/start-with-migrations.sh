#!/bin/sh
set -eu

attempt=1
max_attempts=30

until ./node_modules/.bin/prisma migrate deploy; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Prisma migrations failed after ${max_attempts} attempts" >&2
    exit 1
  fi

  echo "Migration attempt ${attempt}/${max_attempts} failed; retrying in 2s..." >&2
  attempt=$((attempt + 1))
  sleep 2
done

exec node server.js
