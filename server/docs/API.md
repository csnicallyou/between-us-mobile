# API contract

All application routes are below `/v1`. Send access tokens as `Authorization: Bearer <accessToken>`. Errors always use:

```json
{ "error": { "code": "INVALID_REQUEST", "message": "Invalid request" } }
```

## Authentication and account

- `POST /auth/register` — `{email,password,displayName}` → `{user,accessToken,refreshToken}`.
- `POST /auth/login` — `{email,password}` → the same session shape.
- `POST /auth/refresh` — `{refreshToken}` → a rotated access/refresh pair. Replace the stored refresh token atomically.
- `POST /auth/logout` — `{refreshToken}` → `204`.
- `GET /auth/me` — current user.
- `GET /users/me`, `PATCH /users/me` — current profile; patch accepts `{displayName}`.

## Pair lifecycle

- `GET /pairs/me` → `{pair:null}` or a pair with members and stable `owner|partner` slots.
- `POST /pairs` — `{name,relationshipStartedOn?}` → `{pair,invite}`.
- `POST /pairs/invites` → `{invite}` for a not-yet-full pair.
- `DELETE /pairs/invites/:id` → revoke an unused invite.
- `POST /pairs/join` — `{secret}` accepts either the raw token from a link or the human 12-character code → `{pair}`.

An invite is `{id,token,code,expiresAt,link}` and is only returned at creation. The deep link currently uses the custom scheme `betweenus://pair/join?secret=...`.

## Shared data

- `GET|POST /entries`, `GET|PATCH|DELETE /entries/:id`. Kinds: `plan`, `journal`, `memory`, `about`, `agreement`, `conflict`. Payload is a bounded JSON object; PATCH may include `expectedVersion` for conflict detection.
- `GET /moods`, `PUT /moods/me` with `{mood}`.
- `GET|POST /chat/messages`; lists use `limit` and optional ISO `before` cursor.
- `POST /feedback` with `{content}` is intentionally write-only and returns a receipt, never content.
- `POST /media` uses `multipart/form-data` with one file. `GET|DELETE /media/:id` are private pair-scoped operations.

The authoritative machine-readable surface is `openapi.yaml`. Entry payload sub-schemas remain versioned by the mobile/domain layer; the API preserves the object and supplies record versioning and tenant isolation.
