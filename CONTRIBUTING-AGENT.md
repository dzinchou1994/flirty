# Working on this project — read before changing anything

Last updated 2026-11-11. Written after the app went live, so that the next
session does not undo work or repeat an outage.

## What this is

A standalone dating app, **live at https://dating.intimgram.com**, running on
its own Hetzner server (`dating-prod`, 91.99.91.148) behind Caddy.

It shares **one PostgreSQL database and one `User` table** with the community
app intimgram.com, reached over a WireGuard tunnel at `10.90.0.1:5432` as the
least-privilege role `dating_app`. There is no account sync and no second
identity system — that is deliberate.

| Path | What it is |
|---|---|
| `~/Documents/Projects/Dating` | **this repo** — the dating app, dev on port 3003 |
| `~/Documents/Projects/Intimgram` | the community app, intimgram.com. **Owns `prisma/migrations`.** |
| `~/Documents/Projects/dating-app-infra` | server config, deploy script, runbooks |

If the header says something other than the dating app's name, you are
probably running the wrong project. The brand comes only from
`NEXT_PUBLIC_APP_NAME` in `.env.local`; nothing is hardcoded.

## Hard rules

**Never run a migration from this repo.** `prisma/migrations` belongs to the
Intimgram repo. Here there is only `npm run db:generate`. New SQL goes in
`prisma/pending-intimgram-migrations/NNNN_name/migration.sql` and is applied
from the other repo following `dating-app-infra/docs/APPLY-MIGRATIONS.md`.

**The schema and the live database must move together.** On 10 November a
deploy shipped a `schema.prisma` containing migration 0033's columns before
0033 had been applied. Prisma then generated a client that selected
`DatingProfile.weightKg`, Postgres rejected every query, and the dating page
on intimgram.com went blank for the public. The error is silent: a wrapper
catches it and returns an empty list, so it looks like "no profiles" rather
than a crash. **Migrations 0033 and 0034 are now applied.**

**Always run both checks before deploying.** Two production incidents in one
evening came from skipping them:

```bash
npx tsc --noEmit && npm test
```

**Deploy with:**

```bash
cd ~/Documents/Projects/dating-app-infra && ./deploy.sh ~/Documents/Projects/Dating
```

It rsyncs the working tree — **including uncommitted changes** — and rebuilds.
There is no staging environment. What you deploy is what users get.

## Changes made on 10 November, and why

Do not revert these without understanding the reason.

**Photo moderation no longer refuses everything.** `app/api/v1/me/photos/route.ts`
rejects outright only `explicit`. `noFace`, `drawing` and `unavailable` now
store the photo with `status: 'pending'` for the admin queue. Previously any of
them refused the upload *and* told the user their photo was nude, because
`profile-client.ts` mapped every `PHOTO_REJECTED` to the explicit message.
**intimgram.com has told its hosting provider, in writing, that uploads are
reviewed before publication — keep a review path in place.**

**HEIC handling.** `lib/media/process-image.ts` tries sharp first and falls
back to `heic-convert`; `next.config.ts` marks `heic-convert`, `heic-decode`
and `libheif-js` as external and traces their files. A bare `require()` of
that package resolves at build but throws at runtime, which broke every iPhone
upload. `types/heic-convert.d.ts` exists because the package ships no types.

**Profiles without photos appear while online.** `lib/dating/feed.ts` and
`lib/dating/grid.ts` accept a profile with no approved photo if
`user.lastActiveAt` is within `ONLINE_MS` (15 min), via `onlineSince()` in
`lib/dating/presence.ts`. Many accounts have no photo and the grid was thin.
They drop out again when they go offline. The i18n strings were updated to
match — do not reintroduce "without a photo your profile won't appear".

**A broken image shows the brand mark**, not the browser's broken-image icon
— pure CSS at the end of `app/dating.css`, no JS, no extra request.

**The header avatar opens your own public profile**, not the editor, so you can
see what others see. Your own profile page opens even when hidden or
photoless; those rules still apply to everyone else's.

**The profile page was rebuilt** as a full-bleed paged photo carousel with a
sticky action bar. It previously used `--com-*` CSS variables from the
community app that are not defined here, so every surface rendered unstyled.

## Known open issues

- Uploads can land with `visibility: 'private'` when they should be public,
  and private photos render with an empty `src`. Root cause not yet found.
- `/ka/terms/`, `/ka/privacy/`, `/ka/settings/` intermittently return **503**
  under a burst of RSC prefetches. `DATABASE_URL` has `connection_limit=10`;
  raising it to ~25 is the likely fix.
- `@tensorflow/tfjs-node` and the face-api models are **not copied into the
  runner image**, so the NSFW classifier may not run at all in production and
  everything may be falling through to `pending`.
- No app icons, so `app/manifest.ts` ships an empty icon list.
- `NEXT_PUBLIC_LEGAL_ENTITY`, `_ADDRESS`, `_EMAIL` are unset, so `/terms/` and
  `/privacy/` render `TODO-LEGAL-ENTITY`. Must be filled before the App Store.

## Things that are deliberate, not bugs

- Distances are **buckets**, never numbers, and location is a coarse geohash
  cell. Push payloads carry no name or message text. Blocking is symmetric.
  Private album photos are served through short-lived signed URLs. This is the
  product's differentiator and the basis of its App Store argument — do not
  "simplify" any of it.
- Individual profile pages set `noindex`. A username search must never surface
  someone here.
- `trailingSlash: true`. Internal links need the trailing slash.
