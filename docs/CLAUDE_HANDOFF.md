---
artifact_contract: "ce-handoff/v1"
created_at: "2026-08-12T02:15:00Z"
title: "Between Us mobile handoff for Claude Code"
summary: "Complete local, GitHub, Expo, iOS beta, backend, and next-work context for continuing development on the same PC."
keywords: ["between-us", "expo", "ios", "fastify", "postgresql", "claude-code"]
cwd: "D:\\between-us-mobile"
resume_focus: "Confirm the widget/push IPA on both physical iPhones, decide on a real SMTP provider, keep working the roadmap queue below."
repository: "between-us-mobile"
branch: "master"
worktree_path: "D:\\between-us-mobile"
---

# Continuation state

## User intent

Build «Между нами» as a real multi-user iOS/Android product. Anton and Liza are the first test pair, not hard-coded identities. They install independently, create accounts, join one relationship via QR/link/code, and use synchronized features. Later: many users, AI mediation, Telegram, notifications, widgets, stores, and multiple isolated relationship spaces.

## Machine and source access

- Repository: `D:\between-us-mobile`
- Private GitHub remote: `https://github.com/csnicallyou/between-us-mobile.git`
- Default branch: `master`. Overnight work landed as three merged PRs (#4 date/appearance fixes, #5 calendar+diagnostics, #6 upload fix, #7 auth hardening) plus one open feature branch `feature/widget-last-journal-entry` (widget + push notifications) awaiting a build check before merge.
- GitHub auth is configured on this PC. Verify with `gh auth status`; never print credentials.
- Expo account: `csniacllyou`; project ID `4e2b6915-5b8f-4aea-9f71-e69179ece785` in `app.json`.
- Verify Expo with `npx eas whoami` — as of this handoff, `npx eas whoami` failed locally ("could not determine executable to run" / "Not logged in" via `npx eas-cli`); OTA publishing this session went through the GitHub Actions workflow's own `EXPO_TOKEN` secret instead, which works fine. If you need the local CLI, log in first.
- API: `https://186.246.45.4.nip.io:9444`.
- Local build/archive area: `D:\between-us-mobile-builds`.
- Legacy web/import sources: `C:\Users\csnicallyou\Downloads\AyuGram Desktop\ChatExport_2026-08-10\relationship-observatory`. **Import already performed** (see below) — do not re-run casually, though the import script is idempotent by `legacyId` if it ever needs to run again.

## Current release

- Mobile version `0.3.0`; runtime policy is `appVersion` — **no, this was changed tonight to `fingerprint`** (see "What changed overnight"). This is the correct policy going forward; do not revert it.
- Server: currently deployed release is `/opt/between-us-api/releases/20260812-3` (auth hardening + date fix + appearance sync + upload fix), migrations through `004_push_tokens.sql` applied.
- Mobile: the currently-installed IPA on both phones predates tonight's widget/push native additions. A new build is in flight on `feature/widget-last-journal-entry` (GitHub Actions run, check `gh run list`) — **once it succeeds and the branch is merged, both phones need to reinstall via Sideloadly/AltStore again.** Everything else tonight (auth, date fix, appearance sync, upload fix, calendar picker) already shipped via OTA and needs no reinstall.
- Free Apple signing normally expires after seven days from whenever it was last (re)installed. OTA updates JS/assets only; native dependency/config changes need a new IPA — this bit the project once tonight already (see incident below), the fix (`runtimeVersion.policy: fingerprint`) prevents it recurring.

## What changed overnight (2026-08-11 → 2026-08-12), in order

1. **Production incident, found and fixed**: right after Anton/Liza physically joined a pair for the first time, the app white-screen-crashed on both phones. Root cause: `expo-sqlite` was added as a native dependency while `runtimeVersion.policy` was still `appVersion` (doesn't account for native module changes) — an OTA update landed on a binary that didn't have the native module compiled in. Fixed by switching to `policy: fingerprint`, lazy-loading `expo-sqlite/kv-store` with a safe fallback, and adding a root `ErrorBoundary`. A second, unrelated incident during the same deploy: restarting `between-us-api.service` cascade-restarted `between-us-edge.service` (its `Requires=`), which exposed a pre-existing `ProtectSystem=strict` misconfiguration (missing `ReadWritePaths=/var/lib/nginx`) that had never been hit before — fixed live and in `server/deploy/between-us-edge.service`.
2. **Second bug, found via the new diagnostic**: `RangeError: Invalid time value` — node-postgres coerces Postgres `date` columns into JS `Date` objects; `JSON.stringify` then serializes `relationship_started_on` as a full ISO datetime instead of the bare date every consumer assumed, so the client's own `T00:00:00Z` suffix produced a double timestamp. Fixed with `types.setTypeParser(1082, v => v)` in `server/src/db.ts`, plus defensive `Number.isNaN` guards on the client so a bad date degrades to a placeholder instead of crashing.
3. **Manual data fix**: the live pair's `relationship_started_on` had been typo'd to `2001-02-10` via the (now-replaced) free-text date field. Corrected to `2026-02-10` directly in Postgres (one-row `UPDATE`, shown to and confirmed by Anton first).
4. **Calendar date picker**: onboarding's free-text relationship-start-date field replaced with `@react-native-community/datetimepicker` (already a dependency, no native change) — this is exactly the input that caused #3.
5. **Home screen duration math fix**: `relationshipDuration()` used `days / 30.44` for months, which drifts from calendar months (Anton noticed a 6-month-exact anniversary showing "5 мес. и 30 дн."). Replaced with real year/month/day arithmetic.
6. **Shared/partner appearance**: new `appearances` table + `GET/PUT /appearance(/me)`, mirroring `/moods`. New "Использовать фон партнёра" toggle on the appearance screen. Found and fixed along the way: background **image** uploads (for this feature and, latently, for plan/memory photos too) were silently failing — `FormData.append("file", {uri,name,type})` throws `Unsupported FormDataPart implementation` on this RN/expo-file-system version. Replaced with `expo-file-system`'s native `File.upload()`. This was a real live bug caught via a device screenshot the user sent, not guessed.
7. **Idempotent legacy import**: ran per `docs/LEGACY_IMPORT.md` after Anton confirmed both accounts were in one pair. Source: `.private/initial-vault.json` (the live/current vault, matching the doc's "45 conflict episodes" fact exactly). Imported 11 memories (events), 8 agreements, 45 conflict analyses. 0 skipped (fresh import), each row tagged with a `legacyId` in its payload so a second run would no-op. Journal/plans/profiles were empty in the source — nothing to import there.
8. **Auth hardening** (PR #7): mandatory email verification (6-digit code, 15 min expiry, resend cooldown) gating `POST /pairs` and `POST /pairs/join` only — the already-joined beta pair is unaffected. Password recovery (forgot/reset via email code, revokes all sessions on reset). Active session/device list + revoke (`GET/DELETE /auth/sessions`). Mailer defaults to logging the code server-side (`journalctl -u between-us-api | grep "logging mail instead"`) since no `SMTP_URL` is configured yet — **decide on a real transactional provider before this matters for anyone besides Anton/Liza.**
9. **First example widget**: iOS home-screen widget showing the last journal entry, via the official `expo-widgets` package (verified real/SDK-56-compatible on npm before installing). Layout authored entirely in TSX (`src/widgets/LastJournalEntryWidget.tsx`) — no hand-written Swift; the config plugin generates the WidgetKit extension from `app.json` alone. **Compiles in CI; nobody has seen it on an actual home screen yet.**
10. **Push notification groundwork**: per-device Expo push token registration (`PUT/DELETE /devices/push-token`), quiet hours, and one real trigger — a new chat message pushes a content-free notification to the partner. **Real delivery is unverified** and may not work at all on a free-signed sideload IPA (the Push Notifications entitlement generally needs a paid Apple Developer account) — this is a genuine open question, not a formality.

Items 9 and 10 are bundled into one native-dependency branch (`feature/widget-last-journal-entry`) specifically so both land in a single new IPA instead of two separate reinstalls.

## Implemented state

- Expo SDK 56 / React Native 0.85 / Expo Router for iOS and Android.
- Email/password registration and login; rotating refresh tokens in SecureStore; **mandatory email verification before pair creation/join**; password recovery; session/device list with revoke.
- Pair creation and one-time 24-hour invite via custom deep link, QR, or 12-character code. **Physically confirmed working on both iPhones** (this is what triggered the crash-fix session above — the physical test itself succeeded).
- Server-side pair authorization and synchronized entries, moods, chat, private feedback, and media.
- Cache separated by user and pair, optimistic mutations, periodic refresh.
- Plans, calendar, memories, journal, about-us, agreements, conflict archive, chat, moods, custom personal **or partner-shared** backgrounds (color and photo), compressed images.
- Quiet Channel payload encrypted at rest with no partner-readable endpoint.
- Fastify/PostgreSQL backend with rate limits, Helmet, Argon2id, JWT, refresh rotation, parameterized SQL, media validation, pair membership checks, and now email verification/password-reset/session-management endpoints.
- Push notification registration pipeline and a first iOS widget exist in code; neither is confirmed working on a physical device yet.

## Shared VPN VPS: application access and isolation

SSH is configured locally:

```powershell
ssh -i C:\Users\csnicallyou\.ssh\hostkey_vpn root@186.246.45.4
```

`D:\claude\vpn\HANDOFF.md` is the sensitive infrastructure reference. It contains credentials. Read only when required; never reproduce or commit its secrets.

Application-only resources:

- `between-us-api.service`; `between-us-edge.service`; PostgreSQL.
- user/group `between-us`.
- releases `/opt/between-us-api/releases/`; active symlink `/opt/between-us-api/current` (currently `20260812-3`).
- secrets `/etc/between-us-api.env` — never print or copy. Does **not** yet contain `SMTP_URL`/`MAIL_FROM` — add both before real users need email delivery.
- uploads `/var/lib/between-us-api/uploads`.
- API `127.0.0.1:3100`; isolated nginx `/etc/between-us-nginx/nginx.conf` (now includes `ReadWritePaths=/var/lib/nginx` in the edge systemd unit — do not remove it, that's the fix from incident #1 above); public TLS `9444`.

Read-only checks:

```powershell
Invoke-RestMethod https://186.246.45.4.nip.io:9444/health
ssh -i C:\Users\csnicallyou\.ssh\hostkey_vpn root@186.246.45.4 "systemctl is-active between-us-api between-us-edge postgresql"
```

Before/after any approved server mutation follow `server/docs/OPERATIONS.md`. Capture states and ports, mutate only app resources, test app plus VPN, and roll back on regression. Never restart/edit x-ui, xray-vless, hysteria, vpn-sub, vpn-dashboard, dnsmasq, firewall, routing, or VPN ports.

## Unfinished work in priority order

1. **Merge and verify `feature/widget-last-journal-entry`.** Check the CI build succeeded (`gh run list --branch feature/widget-last-journal-entry`), merge to master, build+deploy the server side (push_tokens migration) same as previous deploys, then get a new IPA onto both phones and confirm: does the widget actually render and update on a home screen? Does a chat-message push notification actually arrive? Neither is proven — code review and CI compilation are not the same as a device confirming it.
2. **Decide on a real transactional email provider** and set `SMTP_URL`/`MAIL_FROM` in `/etc/between-us-api.env` — needed before anyone besides Anton/Liza can realistically complete email verification or password reset (right now the code goes to the server log).
3. ✅ **Push notification categories**: plan/journal/memory/agreement creation now also push (server-only change, deployed as release `20260812-3`, no new IPA needed). Deliberately excludes "about"/"conflict" entries (reference/analysis content, not urgent-interrupt material). Still unverified on a device, same as chat. Remaining gap: linking `push_tokens` to `refresh_tokens.family_id` so revoking a session via the account screen also revokes that device's push token (currently only explicit sign-out does).
4. **iOS widget: privacy toggle** — the roadmap's stated requirement ("hide mood/plan text/partner name on lock screen by default") isn't implemented; tonight's widget is a plain proof of concept.
5. **Android widgets**, once the iOS one is confirmed working on a device.
6. **TestFlight/App Store, Android validation, backup/restore, monitoring, privacy/legal, dedicated production infrastructure** — unchanged from before, still ahead.

## Verification baseline

Last reported (2026-08-12, this handoff): mobile typecheck, source check (56 files), Expo doctor 21/21 all passed repeatedly through the night, after every change. Server build, 12/12 tests (up from 4 — added `requireVerifiedEmail` gate tests and quiet-hours wraparound math tests), `npm audit` 0 vulnerabilities on the server. Mobile `npm audit` still shows the same 21 pre-existing, already-documented, build-tool-only findings (metro/config-plugins toolchain — not runtime code, not fixable without downgrading Expo; see README.md's existing note) — installing `expo-widgets`/`expo-notifications` did not add new ones, same cluster.

Physical-device confirmations obtained tonight: pair join, crash fix, date fix, calendar picker, appearance sync (color), image upload fix — Anton relayed real results (including one screenshot with the exact error text) for several of these. **Not yet confirmed on a device**: the widget rendering, and push notification delivery. Re-run verification before claiming either works.

## Safe continuation

Read `CLAUDE.md`, this handoff, `docs/ROADMAP.md`, then check Git status, `gh auth status`, live health read-only. The established pattern this session for shipping a change: implement → `npm run typecheck && check:source && doctor` (mobile) / `npm run build && test && audit` (server) → commit → PR → merge → for client-only changes, OTA publishes automatically via the `Publish preview update` workflow; for native changes, a new IPA builds via `Build unsigned iOS IPA` and needs manual reinstall on both phones; for server changes, deploy manually via SSH following `server/docs/OPERATIONS.md` (new release dir, migrate, symlink flip, restart, verify health + existing data counts before/after).
