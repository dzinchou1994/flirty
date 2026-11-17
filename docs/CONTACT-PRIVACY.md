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

## Migration location

Dating owns its database and `prisma/migrations`. The 0031 columns are in the
baseline migration. `docs/intimgram-migrations/` is the historical handoff
that was applied on the shared database before the fork.
