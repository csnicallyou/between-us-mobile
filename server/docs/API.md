# API contract

All application routes are below `/v1`. Send access tokens as `Authorization: Bearer <accessToken>`. Errors always use:

```json
{ "error": { "code": "INVALID_REQUEST", "message": "Invalid request" } }
```

## Authentication and account

- `POST /auth/register` — `{email,password,displayName,deviceLabel?}` → `{user,accessToken,refreshToken}`. Sends a 6-digit email verification code; the account is created unverified.
- `POST /auth/login` — `{email,password,deviceLabel?}` → the same session shape.
- `POST /auth/refresh` — `{refreshToken}` → a rotated access/refresh pair. Replace the stored refresh token atomically.
- `POST /auth/logout` — `{refreshToken}` → `204`.
- `GET /auth/me` — current user, includes `emailVerified`.
- `GET /users/me`, `PATCH /users/me` — current profile; patch accepts `{displayName}`.
- `POST /auth/verify-email` — `{code}` (authenticated) → `204`. 6-digit code, 15-minute expiry, 5 wrong attempts before it must be resent.
- `POST /auth/resend-verification` — (authenticated) → `204`. 60-second cooldown enforced server-side in addition to the route rate limit; no-ops if already verified.
- `POST /auth/forgot-password` — `{email}` → always `202` with a generic message regardless of whether the account exists. Sends a 6-digit reset code if it does.
- `POST /auth/reset-password` — `{email,code,newPassword}` → `204`. Revokes every active session for the account on success (forces re-login everywhere).
- `GET /auth/sessions` — (authenticated) → `{items:[{familyId,deviceLabel,createdAt,lastSeenAt,current}]}`, one entry per active refresh-token family.
- `DELETE /auth/sessions/:familyId` — (authenticated) → `204`. Revokes that device's session family.

Email delivery goes through `SMTP_URL`/`MAIL_FROM` (see `server/docs/OPERATIONS.md`). With no `SMTP_URL` configured, codes are written to the server log instead of sent — usable end to end for the beta, not for real users.

## Pair lifecycle

- `GET /pairs/me` → `{pair:null}` or a pair with members and stable `owner|partner` slots.
- `POST /pairs` — `{name,relationshipStartedOn?}` → `{pair,invite}`. Requires a verified email (`403 EMAIL_NOT_VERIFIED` otherwise).
- `POST /pairs/invites` → `{invite}` for a not-yet-full pair.
- `DELETE /pairs/invites/:id` → revoke an unused invite.
- `POST /pairs/join` — `{secret}` accepts either the raw token from a link or the human 12-character code → `{pair}`. Requires a verified email.

An invite is `{id,token,code,expiresAt,link}` and is only returned at creation. The deep link currently uses the custom scheme `betweenus://pair/join?secret=...`.

## Shared data

- `GET|POST /entries`, `GET|PATCH|DELETE /entries/:id`. Kinds: `plan`, `journal`, `memory`, `about`, `agreement`, `conflict`. Payload is a bounded JSON object; PATCH may include `expectedVersion` for conflict detection.
- `GET /moods`, `PUT /moods/me` with `{mood}`.
- `GET /appearance`, `PUT /appearance/me` with `{backgroundKind,backgroundValue,backgroundLuminance}`. Mirrors `/moods`: each member's own background is writable only by them, both members' current background is readable by the pair, so a device can optionally show the partner's background instead of its own.
- `GET|POST /chat/messages`; lists use `limit` and optional ISO `before` cursor.
- `POST /feedback` with `{content}` is intentionally write-only and returns a receipt, never content.
- `POST /media` uses `multipart/form-data` with one file. `GET|DELETE /media/:id` are private pair-scoped operations.

## Push notifications

- `PUT /devices/push-token` — `{expoPushToken,platform,quietHoursStart?,quietHoursEnd?,timezone?}` → `204`. Upserts by `expoPushToken` (globally unique), so re-registering the same device just updates ownership/preferences.
- `DELETE /devices/push-token` — `{expoPushToken}` → `204`. Called on sign-out.

`POST /chat/messages` sends a generic push ("Новое сообщение в общем чате", no message content) to the other pair member via `server/src/lib/push.ts` (Expo push service), skipping tokens inside their configured quiet hours. Failures never affect the chat response. This is the only trigger implemented so far — plans/memories/agreements/conflicts don't push yet. Real delivery on this beta's free-signed sideload IPA is unverified (push notification entitlements generally need a paid Apple Developer account).

The authoritative machine-readable surface is `openapi.yaml`. Entry payload sub-schemas remain versioned by the mobile/domain layer; the API preserves the object and supplies record versioning and tenant isolation.
