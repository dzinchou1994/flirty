# Dating

Standalone dating product. Its own Postgres, code, branding, and domain.
The database was forked once from Intimgram so existing users keep the same
username and password. New accounts are created only here.

## Hard rules

- **API-first** — every feature is a JSON endpoint under `/api/v1`. See `API.md`.
- **This repo owns migrations.** `npm run db:migrate` is `prisma migrate deploy`.
  Do not run `migrate dev` against production.
- **No sexology / kamasutra / quiz content** — dating only.
- **No community-app strings** in network traffic.

## Locales

- `/ka/...` — Georgian UI (default for visitors whose CDN country is `GE`)
- `/en/...` — English UI (default for everyone else)
- Bare URLs (`/`, `/gatsnoba/`) are redirected by middleware using
  `CF-IPCountry` / equivalent headers, then a sticky `dating_locale` cookie
  once the user has an explicit locale. Manual switch lives in the menu.

## Local setup

```bash
# One-time: local Postgres 17 + copy of dating-prod
brew install postgresql@17
brew services start postgresql@17
bash scripts/db-sync-local.sh   # SSH host `dating`

cp .env.example .env.local
# DATABASE_URL=postgresql://dating:dating_local@127.0.0.1:5432/dating?schema=public&sslmode=disable

npm install
npm run dev   # http://localhost:3003

# Refresh local data later:
bash scripts/db-sync-local.sh
```

## Account deletion

Deletes the `User` row in this database. Related dating rows cascade.
Intimgram is not notified. A leftover `UserDeletionRequest` in `pending` or
`processing` still blocks login.

## Contact privacy / safety / discovery

See `docs/CONTACT-PRIVACY.md` and `docs/UI-SPEC.md`.

`docs/intimgram-migrations/` is historical SQL from the shared-database period.
The current schema is `prisma/migrations/20261116000000_baseline`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next dev on 3003 |
| `npm run build` | Production build |
| `npm run test` | Unit tests (privacy, EXIF, buckets, push, private URLs) |
| `npm run db:generate` | `prisma generate` |
| `npm run db:migrate` | `prisma migrate deploy` (production and CI) |
| `npm run db:migrate:dev` | `prisma migrate dev` (local only) |
