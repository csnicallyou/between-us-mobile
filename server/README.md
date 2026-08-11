# Between Us API

Lightweight Fastify + PostgreSQL API for independent two-person pair spaces. The API is multi-tenant: every shared record is scoped to the authenticated user's active pair, while stable member slots are `owner` and `partner` rather than names from the alpha seed.

## Local setup

Requires Node.js 20+ and PostgreSQL 15+. Copy `.env.example` to `.env`, supply unique secrets, then explicitly install dependencies and run migrations:

```bash
npm ci
npm run migrate
npm run dev
```

Generate the feedback key with `openssl rand -base64 32` and the JWT secret with `openssl rand -base64 48`. Never put either secret in the mobile bundle. Migrations are not run automatically at application startup.

## Security model

- Passwords use Argon2id. Access JWTs are short lived; refresh tokens are random, hash-only in PostgreSQL, rotating, and revoke their whole family when reuse is detected.
- Invite tokens and 12-character codes are returned once, stored only as SHA-256 hashes, expire after 24 hours, and can be revoked. Joining locks the pair and invite in one transaction; a user can belong to one pair and a pair can contain at most two members.
- Pair authorization is repeated in every query. SQL parameters are never interpolated from request data.
- Private feedback has no read/list endpoint. The write endpoint encrypts it with AES-256-GCM before persistence and returns only a receipt. Neither author nor partner can retrieve raw text through this API.
- Media accepts one JPEG, PNG, or WebP up to the configured size. Both declared MIME type and file signature are checked. Files use random storage names and authenticated pair-scoped downloads.
- CORS is an exact allowlist. Global and sensitive-route rate limits, security headers, redacted logs, generic errors, bounded JSON bodies, and optimistic entry versions are enabled.

Mobile clients should store access and refresh tokens in Keychain/Keystore-backed secure storage, never AsyncStorage. TLS must terminate before traffic reaches this API in production.

## Checks

```bash
npm run typecheck
npm test
npm run build
```

See [docs/API.md](docs/API.md), [docs/openapi.yaml](docs/openapi.yaml), and [docs/OPERATIONS.md](docs/OPERATIONS.md).
