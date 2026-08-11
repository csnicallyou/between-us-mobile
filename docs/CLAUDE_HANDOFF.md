---
artifact_contract: "ce-handoff/v1"
created_at: "2026-08-11T19:40:00Z"
title: "Between Us mobile handoff for Claude Code"
summary: "Complete local, GitHub, Expo, iOS beta, backend, and next-work context for continuing development on the same PC."
keywords: ["between-us", "expo", "ios", "fastify", "postgresql", "claude-code"]
cwd: "D:\\between-us-mobile"
resume_focus: "Verify pair onboarding, add email verification and structured relationship date selection, then continue the roadmap."
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
- Default branch at handoff: `master`; latest pre-handoff commit: `90843ff`.
- GitHub auth is configured on this PC. Verify with `gh auth status`; never print credentials.
- Expo account: `csniacllyou`; project ID `4e2b6915-5b8f-4aea-9f71-e69179ece785` in `app.json`.
- Verify Expo with `npx eas whoami`; reuse local/session auth and never request tokens in chat or Git.
- API: `https://186.246.45.4.nip.io:9444`.
- Local build/archive area: `D:\between-us-mobile-builds`.
- Legacy web/import sources: `C:\Users\csnicallyou\Downloads\AyuGram Desktop\ChatExport_2026-08-10\relationship-observatory`. Its `.private`, Telegram exports, analyses, keys, and raw messages are sensitive and must not be committed.

## Current release

- Mobile version `0.3.0`; runtime policy is `appVersion`.
- Release: `https://github.com/csnicallyou/between-us-mobile/releases/tag/v0.3.0`.
- Local packages:
  - `D:\between-us-mobile-builds\2026-08-11-v0.3.0\BetweenUs-Anton-Windows-v0.3.0.zip`
  - `D:\between-us-mobile-builds\2026-08-11-v0.3.0\BetweenUs-Liza-macOS-v0.3.0.zip`
- Recorded unsigned IPA SHA-256: `8CD709DB811E56590F0AEBC3330B0012754217C79E5C5EC00A5FA1695C90F920`.
- Windows uses Sideloadly; macOS can use Sideloadly/AltStore or Xcode. See `docs/IOS_USB_INSTALL.md`.
- Free Apple signing normally expires after seven days. OTA updates JS/assets only; native dependency/config changes need a new IPA.

## Implemented state

- Expo SDK 56 / React Native 0.85 / Expo Router for iOS and Android.
- Email/password registration and login; rotating refresh tokens in SecureStore.
- Pair creation and one-time 24-hour invite via custom deep link, QR, or 12-character code.
- Server-side pair authorization and synchronized entries, moods, chat, private feedback, and media.
- Cache separated by user and pair, optimistic mutations, periodic refresh.
- Plans, calendar, memories, journal, about-us, agreements, conflict archive, chat, moods, custom personal backgrounds, and compressed images.
- Quiet Channel payload encrypted at rest with no partner-readable endpoint.
- Fastify/PostgreSQL backend with rate limits, Helmet, Argon2id, JWT, refresh rotation, parameterized SQL, media validation, and pair membership checks.

## QR invitation: coded, physical acceptance still required

`src/components/PairInviteCard.tsx` encodes `invite.link`. Server invitations are random, hash-only, one-use, and expire after 24 hours. `app.json` registers `betweenus`; `src/state/PairContext.tsx` normalizes links/codes; onboarding joins via `/v1/pairs/join`.

Test on both iPhones: Anton registers, creates the pair with date `2026-02-10`, shows QR; Liza installs the same native build, registers separately, scans with Camera, sees a confirmation screen, joins, then both see shared data. Confirm the invite cannot be reused. If custom-scheme Camera opening is unreliable, use an HTTPS universal/app link with a safe fallback to code entry.

## Shared VPN VPS: application access and isolation

SSH is configured locally:

```powershell
ssh -i C:\Users\csnicallyou\.ssh\hostkey_vpn root@186.246.45.4
```

`D:\claude\vpn\HANDOFF.md` is the sensitive infrastructure reference. It contains credentials. Read only when required; never reproduce or commit its secrets.

Application-only resources:

- `between-us-api.service`; `between-us-edge.service`; PostgreSQL.
- user/group `between-us`.
- releases `/opt/between-us-api/releases/`; active symlink `/opt/between-us-api/current`.
- secrets `/etc/between-us-api.env` — never print or copy.
- uploads `/var/lib/between-us-api/uploads`.
- API `127.0.0.1:3100`; isolated nginx `/etc/between-us-nginx/nginx.conf`; public TLS `9444`.

Read-only checks:

```powershell
Invoke-RestMethod https://186.246.45.4.nip.io:9444/health
ssh -i C:\Users\csnicallyou\.ssh\hostkey_vpn root@186.246.45.4 "systemctl is-active between-us-api between-us-edge postgresql"
```

Before/after any approved server mutation follow `server/docs/OPERATIONS.md`. Capture states and ports, mutate only app resources, test app plus VPN, and roll back on regression. Never restart/edit x-ui, xray-vless, hysteria, vpn-sub, vpn-dashboard, dnsmasq, firewall, routing, or VPN ports.

## Unfinished work in priority order

1. Physical two-iPhone QR/deep-link and synchronization acceptance.
2. Required email verification before creating/joining a relationship: hashed one-use token/code, expiry, resend, rate limits, non-enumerating responses. No real mail provider is configured yet.
3. Password recovery plus active device/session management.
4. Replace free-text relationship date with calendar picker plus optional structured day/month/year fields; API stays strict ISO date.
5. After both real accounts join one pair, perform the idempotent import from `docs/LEGACY_IMPORT.md`; do not manually duplicate data.
6. Push notifications with per-device tokens, consent, privacy, quiet hours, deep links, and token revocation.
7. iOS WidgetKit then Android widgets with private limited shared snapshots; native work requires a new IPA.
8. TestFlight/App Store, Android validation, backup/restore, monitoring, privacy/legal, and dedicated production infrastructure.

## Verification baseline

Last reported: mobile typecheck, source check, Expo doctor 21/21, web export, server build, server tests 4/4, and server audit with zero vulnerabilities passed. A scripted two-account API flow passed; full physical-device onboarding is not yet proven. Re-run verification before claiming completion.

## Safe continuation

Read `CLAUDE.md`, this handoff, `docs/ROADMAP.md`, then check Git status, `gh auth status`, `npx eas whoami`, and live health read-only. Create a feature branch. Verify QR before modifying it. For email verification, first select a real transactional mail provider; obtain approval before dependency installation, DB migration, or deploy. Review token leakage, enumeration, replay, expiry, rate limits, and session issuance.
