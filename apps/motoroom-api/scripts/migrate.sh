#!/bin/sh

set -eu

if [ -z "${POSTGRES_URL:-}" ]; then
  echo "POSTGRES_URL is required to run MotoRoom migrations." >&2
  exit 1
fi

psql "$POSTGRES_URL" -f migrations/001_initial_schema.sql
psql "$POSTGRES_URL" -f migrations/002_seed_vehicle_groups.sql

