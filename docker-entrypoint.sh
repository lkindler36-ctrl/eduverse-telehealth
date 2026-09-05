#!/bin/sh
set -eu

npx prisma migrate deploy

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  npx prisma db seed
fi

exec node server.js
