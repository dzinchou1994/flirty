# Dating API v1

Base: `/api/v1`  
Envelope:

```ts
type ApiOk<T> = { ok: true; data: T }
type ApiErr = { ok: false; error: { code: string; message: string; field?: string } }
```

Clients branch on `error.code`. `message` is localised and may change.  
Timestamps are ISO 8601 UTC. Media URLs are absolute (except private album
paths, which are short-lived app URLs).  
Lists use cursor pagination: `?cursor=&limit=` → `{ items, nextCursor }`.

Auth: `Authorization: Bearer <access>` **or** httpOnly `dating_session` cookie.
`POST /auth/login` returns tokens in the body and sets cookies.

Age gate: `ageConfirmed: true` required on register/login/OAuth.

**Visibility rule:** anything that filters who can see whom is a **server-side
condition in the query**. Hidden profiles never leave the server.

---

## Health

### `GET /health`
→ `{ db: "up" }`  
Errors: `DB_DOWN`

## Auth

### `POST /auth/register`
Body: `{ username, password, email?, gender?, ageConfirmed: true }`  
→ `{ user, accessToken, refreshToken, expiresIn, tokenType }`  
Errors: `AGE_GATE_REQUIRED`, `USERNAME_TAKEN`, `EMAIL_TAKEN`, `VALIDATION_ERROR`

### `POST /auth/login`
Body: `{ username, password, ageConfirmed: true }`  
→ same session shape  
Errors: `INVALID_CREDENTIALS`, `ACCOUNT_DELETED`, `AGE_GATE_REQUIRED`

### `POST /auth/refresh`
Body: `{ refreshToken }` (or refresh cookie)  
Errors: `INVALID_TOKEN`, `ACCOUNT_DELETED`

### `POST /auth/logout`
### `GET /auth/me`
### `GET /api/auth/google` → Google → `GET /api/auth/google/callback`
Browser redirect OAuth (same Google client as Intimgram). Requires
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` and the Dating callback URI in
Google Console. Query: `mode=login|register`, `age=1`, optional `next`.

### `GET /api/v1/auth/intimgram/callback?code&locale&next`
Exchanges a short-lived SSO code minted by Intimgram
(`GET {INTIMGRAM}/api/dating-sso/start?return=…`) for a Dating session.
Requires matching `DATING_SSO_SECRET` (or `COMMUNITY_AUTH_SECRET`) on both apps
and `DATING_APP_ORIGINS` allow-list on Intimgram.

### `POST /auth/google` / `POST /auth/apple`
Body: `{ idToken, ageConfirmed: true }`  
Errors: `OAUTH_FAILED`, `ACCOUNT_DELETED`, `AGE_GATE_REQUIRED`

## Discovery & profiles

### `GET|POST /views`
GET — who viewed my profile (`viewedAt` desc).  
POST `{ profileUserId }` — record that I opened their profile (upsert).

### Messaging (no match required)
Anyone with a dating profile may open a thread. Unanswered outbound messages
are capped (`MESSAGE_LIMIT`, default 3; +2 for premium) until the peer replies
or you become a mutual match.

### `GET /feed?cursor&limit&bucket&city&…filters`
Applies **block**, **mutual contact exclusion**, **visibilityMode**, **passes**,
plus `genderBucket` / `city` / `showMe` / `isVisible` / `moderationStatus`.

Additional query filters (shared Zod schema in `lib/api/schemas/discovery-filters.ts`;
also used by the browse page). All attribute filters treat `null` / empty as
**unknown** — unanswered profiles are kept:

| Param | Notes |
|---|---|
| `ageMin` / `ageMax` | 18–99 |
| `heightMin` / `heightMax` | cm |
| `distance` | `1km` \| `3km` \| `10km` \| `any` (geohash buckets only) |
| `onlineOnly` | `1` — requires `presenceEnabled` + recent `lastActiveAt` |
| `bodyType` / `relationshipStatus` / `lookingForTags` / `meetAt` / `languages` / `position` / `communityTags` | CSV multi-select; arrays use Postgres `hasSome` |

`?countOnly=1` returns `{ count }` for the filter sheet live counter (no persist).  
Successful list responses upsert `DatingFilterPreset` for the viewer (`persist=0` to skip).

When the viewer has a `geohashCell`, items are ordered by **distance bucket**
then `lastActiveAt` (Grindr-style) and include `distanceBucket` /
`presence`. Without a cell, falls back to `updatedAt`.  
Rate-limited per account.  
Errors: `UNAUTHORIZED`, `RATE_LIMITED`, `PROFILE_LOCKED`, `PROFILE_BLOCKED`

### `GET /nearby/grid?cursor&limit&bucket&city`
Same distance ranking as `/feed` (kept for clients that already call it).  
Errors: `LOCATION_REQUIRED`, `RATE_LIMITED`

### `GET|POST /nearby`
Map members with **fuzzed** coords only (`nearbyFuzzM`). Privacy in SQL.  
POST body: `{ lat, lng, fuzzM? }`, `{ cityFallback: true }` (place near the
centre of the user's dating city), or `{ stop: true }`. Updates `geohashCell`
only when the user leaves their current ~1 km cell.

### `GET /profiles/:username`
Full privacy gate → else `PROFILE_NOT_VISIBLE`. Private photos only as signed
paths when an album grant exists.

### `GET|PUT /me/profile`
PUT may set `visibilityMode` (`discoverable` | `mutual_only` | `incognito`),
`presenceEnabled`, legacy `hideFromContacts` / `requireMutualInterest`, age ≥ 18.

Optional attributes (all nullable; LGBT-only `position` / `communityTags` cleared
outside non-straight `presetCase`): `weightKg`, `bodyType`, `relationshipStatus`,
`lookingForTags[]` (preferred over deprecated `lookingFor`), `meetAt[]`,
`pronouns`, `genderIdentity`, `languages[]`, `smoking`, `drinking`, `kids`,
`education`, `work` (≤60).

### `POST|PATCH|DELETE /me/photos`
Multipart `file` + optional `visibility=public|private`.  
EXIF (including GPS) stripped before R2 write.  
PATCH `{ photoId, visibility }`. Private photos never returned as public R2 URLs.

### `GET /media/private?t=`
Streams a private photo after short-lived HMAC token + album grant check.

### `PUT|DELETE /me/contacts`
Body: `{ phones: string[] }` — server HMAC-SHA256; raw discarded.  
DELETE clears all uploaded hashes.

### `DELETE /me/account`
Body: `{ username, password }` → dating data deleted; User erasure queued  
Errors: `USERNAME_MISMATCH`, `INVALID_PASSWORD`, `ACCOUNT_DELETED` on later login

## Social

### `GET|POST|DELETE /likes`
GET `?dir=received|sent` — blocked / contact-excluded peers omitted in SQL.  
POST `{ profileId }` — target must pass privacy filters (`PROFILE_NOT_VISIBLE`).  
Response may include `push` (neutral payload shape; see below).

### `GET|POST /taps`
Lightweight signal; does **not** create a match. One tap per pair per 24h.  
Rate-limited. Blocked peers never appear.

### `GET /matches`
Mutual likes; still applies contact exclusion + blocks.

### `GET|POST /messages`
`GET ?peerId&cursor` for thread; without peerId = inbox.  
Blocked peers disappear from inbox and cannot open threads.  
Errors: `MESSAGE_DENIED`

### `POST /reports` `{ profileId, reason }`
Records `receivedAt`. Admin resolution sets `resolvedAt` (24h SLA).

### `GET|POST|DELETE /blocks`
POST `{ userId }` — symmetric effect, **no notification** to the blocked user.  
Archives dating messages both ways; removes likes/taps/album grants between the pair.

### `GET|POST|DELETE /album/grants`
GET returns peers with access (`username`, `name`, `avatar`).  
POST `{ viewerUserId }` — grant private album access. DELETE `?viewerUserId=`.  
Album UI: `/{locale}/user/dating/album/` (burger → Private album). New uploads
default to `visibility=private`; PATCH flips public/private.

## Push payload shape (A3)

Built now so APNs cannot later leak content:

```ts
{ title: "New message" | "New like" | "New match" | "Someone tapped you" | "Album update",
  id: string,   // opaque
  kind: "message" | "like" | "match" | "tap" | "album_grant",
  ref?: string  // opaque deep-link id — never a name
}
```

Never includes message text or sender name. Client fetches after unlock.

## Admin (isAdmin users)

### `GET /admin/queue` — pending photos, open reports (`receivedAt`, ageHours), restricted (24h SLA)
### `PATCH /admin/profiles/:id` `{ status, reason? }` — also sets `resolvedAt` on open reports
### `PATCH /admin/photos/:id` `{ action: "approve"|"reject" }`

## Stable error codes (non-exhaustive)

`UNAUTHORIZED`, `VALIDATION_ERROR`, `AGE_GATE_REQUIRED`, `ACCOUNT_DELETED`,
`PROFILE_NOT_VISIBLE`, `PROFILE_LOCKED`, `PROFILE_BLOCKED`, `PHOTO_REJECTED`,
`RATE_LIMITED`, `MESSAGE_DENIED`, `INVALID_CREDENTIALS`, `DB_DOWN`,
`LOCATION_REQUIRED`, `TAP_COOLDOWN`, `CANNOT_BLOCK_SELF`, `FORBIDDEN`
