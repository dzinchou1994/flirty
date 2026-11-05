# Contact-based privacy

Sexology / kamasutra / quizzes stay in the community product. This app is
dating only.

## Goals

1. **Mutual contact exclusion** — either side uploads hashed contacts; if
   either book contains the other’s verified phone hash, **neither** profile
   is serialised to the other.
2. **Visibility modes** — `discoverable` | `mutual_only` | `incognito`
   (see FEATURES / API.md). Legacy `requireMutualInterest` maps to mutual_only.
3. **User blocks** — `DatingBlock`; symmetric; never notifies the blocked user.

All of the above are **SQL filters on every response that can leak a profile**,
not client-side post-filters.

## Schema

| Object | Notes |
|--------|--------|
| `DatingContactHash` | HMAC only; indexed on `phoneHash` (migration 0029) |
| `DatingProfile.phoneHash` | Verified own number, same HMAC |
| `DatingProfile.visibilityMode` | migration 0031 |
| `DatingBlock` | migration 0031 |

## Hashing (server-only)

```
normalise → E.164 (e.g. GE local → +995…)
phoneHash = hex(HMAC-SHA256(CONTACT_HASH_PEPPER, e164))
```

Never store, log, or return a raw number.

## Discovery filter (conceptual)

```
-- blocks (either direction)
NOT EXISTS DatingBlock between V and O

-- mutual contacts
NOT (V.phoneHash IN O's DatingContactHash)
AND NOT (O.phoneHash IN V's DatingContactHash)

-- visibilityMode
discoverable OR
(mutual_only AND O liked V) OR
(incognito AND (O liked V OR messaged V))
```

## Endpoints

| Endpoint | How |
|----------|-----|
| `GET /feed`, `/nearby`, `/nearby/grid` | WHERE clause |
| `GET /profiles/:username` | Same gate → `PROFILE_NOT_VISIBLE` |
| `GET/POST /likes`, `/taps`, `/matches`, `/messages` | SQL exclusion |
| `PUT/DELETE /me/contacts` | replace / clear hashes |
| `POST/DELETE /blocks` | create / remove block |

## Grants (intimgram DB after migrate)

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON
  "DatingContactHash", "DatingBlock", "DatingAlbumGrant", "DatingTap"
TO dating_app;
```

## Migration location

- `0029` contact hashes — already in Intimgram
- `0031` blocks / visibility / geohash / private albums / taps / report SLA —
  `GEOESKORT/prisma/migrations/0031_dating_safety_privacy_discovery/`
  (handoff copy: `docs/intimgram-migrations/0031_….sql`)
- **Not applied** from this Dating repo.
