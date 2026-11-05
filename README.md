# Dating

Standalone dating product. Shares one PostgreSQL database with the community
app (same `User` table) but shares no code, branding, domain, or navigation.

## Hard rules

- **API-first** — every feature is a JSON endpoint under `/api/v1`. See `API.md`.
- **No migrations from this repo.** The community app owns `_prisma_migrations`.
  Only `npm run db:generate` exists here.
- **No sexology / kamasutra / quiz content** — dating only.
- **No community-app strings** in network traffic except the database name inside
  `DATABASE_URL`.

## Locales

- `/ka/...` — Georgian UI (default for visitors whose CDN country is `GE`)
- `/en/...` — English UI (default for everyone else)
- Bare URLs (`/`, `/gatsnoba/`) are redirected by middleware using
  `CF-IPCountry` / equivalent headers, then a sticky `dating_locale` cookie
  once the user has an explicit locale. Manual switch lives in the menu.

## Local setup

```bash
# One-time: local Postgres 17 + copy of prod (no SSH for day-to-day)
brew install postgresql@17
brew services start postgresql@17
bash scripts/db-sync-local.sh   # needs SSH host `intimgram` once

cp .env.example .env.local
# DATABASE_URL=postgresql://dating:dating_local@127.0.0.1:5432/dating?schema=public&sslmode=disable

npm install
npm run dev   # http://localhost:3003

# Refresh local data later:
bash scripts/db-sync-local.sh
```

## Account deletion

1. This app hard-deletes dating rows + dating messages immediately.
2. Inserts `UserDeletionRequest` (`pending`) for the community app to erase `User`.
3. Login / refresh / getAuth fail as soon as that row is pending — not after
   User erasure completes.

Migration SQL (community repo, **do not run from here**):
`docs/intimgram-migrations/0030_user_deletion_request.sql`

## Contact privacy / safety / discovery

See `docs/CONTACT-PRIVACY.md` and `docs/UI-SPEC.md`.

Intimgram migrations (hand over; **do not run from here**):

| File | Purpose |
|------|---------|
| `docs/intimgram-migrations/0030_user_deletion_request.sql` | Account erasure queue |
| `docs/intimgram-migrations/0031_dating_safety_privacy_discovery.sql` | Blocks, visibility, geohash, private albums, taps, report SLA |
| `docs/intimgram-migrations/0032_dating_profile_view.sql` | Profile view history (“Viewed Me”) |

After `0031`, grant `dating_app` on new tables:
`dating-app-infra/db/dating-db-role-safety-privacy.sql`.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next dev on 3003 |
| `npm run build` | Production build |
| `npm run test` | Unit tests (privacy, EXIF, buckets, push, private URLs) |
| `npm run db:generate` | `prisma generate` only |

There is **no** `db:migrate` / `db:push`.
