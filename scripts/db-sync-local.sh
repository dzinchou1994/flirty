#!/usr/bin/env bash
# Refresh the local Homebrew Postgres copy from intimgram-prod (via SSH tunnel).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="$ROOT/.local-db/intimgram.dump"
PG17="/opt/homebrew/opt/postgresql@17/bin"
export PATH="$PG17:$PATH"

# The production connection string is a secret and must never live in this
# file. Put it in .env.sync.local (gitignored), as:
#   REMOTE_DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5434/intimgram
# or export REMOTE_DATABASE_URL before running this script.
if [ -z "${REMOTE_DATABASE_URL:-}" ] && [ -f "$ROOT/.env.sync.local" ]; then
  # shellcheck disable=SC1091
  set -a; . "$ROOT/.env.sync.local"; set +a
fi

if [ -z "${REMOTE_DATABASE_URL:-}" ]; then
  cat >&2 <<'MSG'
REMOTE_DATABASE_URL is not set.

Create .env.sync.local in the repo root (it is gitignored) containing:

  REMOTE_DATABASE_URL=postgresql://USER:PASSWORD@127.0.0.1:5434/intimgram

The password is the one in /root/intimgram/.env on intimgram-prod:

  ssh intimgram 'grep ^DATABASE_URL /root/intimgram/.env'
MSG
  exit 1
fi

REMOTE_URL="$REMOTE_DATABASE_URL"

mkdir -p "$ROOT/.local-db"

if ! nc -z 127.0.0.1 5434 2>/dev/null; then
  echo "==> Starting SSH tunnel (intimgram → localhost:5434)"
  ssh -f -N -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 \
    -L 5434:127.0.0.1:5432 intimgram
  sleep 1
fi

if ! pg_isready -q; then
  echo "==> Starting postgresql@17"
  brew services start postgresql@17
  sleep 2
fi

psql -d postgres -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dating') THEN
    CREATE ROLE dating LOGIN PASSWORD 'dating_local';
  END IF;
END$$;
SQL

echo "==> Dumping remote DB"
rm -f "$DUMP"
pg_dump --dbname="$REMOTE_URL" --no-owner --no-acl --format=custom --file="$DUMP"

echo "==> Recreating local database 'dating'"
dropdb --if-exists dating
createdb -O dating dating

echo "==> Restoring"
pg_restore --no-owner --no-acl -d dating "$DUMP" || true

psql -d dating -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
GRANT ALL ON SCHEMA public TO dating;
GRANT ALL ON ALL TABLES IN SCHEMA public TO dating;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO dating;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO dating;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO dating;
SQL

echo "==> Done. Profiles: $(psql -d dating -tAc 'SELECT count(*) FROM \"DatingProfile\"')"
echo "    Point DATABASE_URL at:"
echo "    postgresql://dating:dating_local@127.0.0.1:5432/dating?schema=public&sslmode=disable"
