#!/usr/bin/env bash
# Refresh the local Homebrew Postgres copy from dating-prod's own database.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="$ROOT/.local-db/dating.dump"
PG17="/opt/homebrew/opt/postgresql@17/bin"
export PATH="$PG17:$PATH"

mkdir -p "$ROOT/.local-db"

if ! ssh -o BatchMode=yes -o ConnectTimeout=8 dating 'docker exec dating-db pg_isready -U dating -d dating' >/dev/null 2>&1; then
  echo "dating-db is not ready. SSH host \`dating\` must reach the dating-prod Postgres container." >&2
  exit 1
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

echo "==> Dumping dating-prod"
rm -f "$DUMP"
ssh -o BatchMode=yes dating 'docker exec dating-db pg_dump -U dating -Fc --no-owner --no-acl dating' > "$DUMP"

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
DELETE FROM "_prisma_migrations";
SQL

echo "==> Marking the baseline migration applied"
DATABASE_URL="postgresql://dating:dating_local@127.0.0.1:5432/dating?schema=public&sslmode=disable" \
  npx prisma migrate resolve --applied 20261116000000_baseline

echo "==> Done. Profiles: $(psql -d dating -tAc 'SELECT count(*) FROM \"DatingProfile\"')"
echo "    Point DATABASE_URL at:"
echo "    postgresql://dating:dating_local@127.0.0.1:5432/dating?schema=public&sslmode=disable"
