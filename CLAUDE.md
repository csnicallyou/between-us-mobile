# Claude Code project guide

## Mission

«Между нами» is a private relationship workspace that will grow into a public iOS/Android product. Anton and Liza are the first real beta pair. The product stores shared plans, calendar events, memories, journal entries, moods, agreements, conflict reviews, chat, media, and private feedback for a future AI mediator.

Read before changing code:

1. `docs/CLAUDE_HANDOFF.md` — current machine, release, server, and unfinished-work state.
2. `docs/ROADMAP.md` — ordered roadmap and immediate queue.
3. `README.md` — verified capabilities and local commands.
4. `docs/PRODUCT.md` and `docs/ARCHITECTURE.md` — product and architecture.
5. `server/docs/API.md` and `server/docs/OPERATIONS.md` for backend work.

## Repository map

```text
src/app/          Expo Router screens: auth, onboarding, tabs, features
src/components/   shared mobile UI, forms, Liquid Glass surfaces
src/domain/       platform-neutral domain types and labels
src/services/     API client, SecureStore, cache/sync, media processing
src/state/        auth, pair, appearance and shared-data providers
server/           Fastify + PostgreSQL API and migrations
docs/             product, architecture, operations and handoff docs
.github/workflows iOS IPA build and Expo OTA publication
```

## Non-negotiable constraints

- Never commit passwords, access tokens, Apple credentials, Expo tokens, `.env` files, private keys, Telegram exports, private feedback, or raw relationship correspondence.
- Do not modify, restart, reconfigure, or reuse ports of the VPN stack. The app is isolated. Read `D:\claude\vpn\HANDOFF.md` only when server access is necessary; it contains secrets and must never be copied into this repository or output.
- Before dependency installation, deployment, migration, database change, server mutation, or external publication, show the exact action and obtain Anton's approval.
- Preserve data and backward compatibility. Migrations must be additive, tested, and reversible where practical.
- Pair authorization is enforced on the server, never only in the UI. Secrets are hashed; sessions remain in SecureStore/Keychain/Keystore.
- Quiet Channel source text must never be readable by the partner. AI must not reveal or closely paraphrase it.
- AI changes require preview, confirmation, audit log, and undo.
- Custom backgrounds are per-user; shared data is per relationship space.
- Use no emoji in product UI. Maintain Android compatibility even for iOS-first work.

## Working method

- Read before editing and preserve unrelated changes.
- Use a meaningful feature branch for behavior changes; do not commit auth work directly to `master`.
- Prefer existing components and typed contracts. Keep files under roughly 500 lines.
- Validate external input with Zod or an equivalent typed boundary.
- Add focused backend/auth/security tests and exercise the real integration path where practical.
- Do not claim QR, push, widgets, email delivery, OTA, or an IPA works until verified on the relevant device/live service.

## Verification

```powershell
cd D:\between-us-mobile
npm run typecheck
npm run check:source
npm run doctor
npm run export:web

cd D:\between-us-mobile\server
npm run build
npm test
npm audit

Invoke-RestMethod https://186.246.45.4.nip.io:9444/health
```

## Current priority

Continue from `docs/CLAUDE_HANDOFF.md`. First verify two-iPhone registration and QR/deep-link joining. Then implement email verification and calendar/structured relationship-date input. After both users join the same pair, perform the idempotent import in `docs/LEGACY_IMPORT.md`. Notifications and widgets follow after reliable account/device identity.
