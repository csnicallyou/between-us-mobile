# Operations and VPN isolation

No deployment is performed by this repository. On the current VPN VPS, preserve all existing services, firewall rules, ports, DNS, routing, Xray, Hysteria, subscription service, and dashboard unchanged.

Deploy the application later as a separate Unix user, directory, PostgreSQL role/database, systemd unit, upload directory, and localhost-only listener (for example `127.0.0.1:3100`). Put TLS reverse proxying on a new hostname and a deliberately selected port/path; do not bind or reconfigure ports already documented in the VPN handoff. Before and after any deployment, capture service state, listening ports, firewall rules, memory/disk, and VPN smoke tests. A failed comparison is a rollback condition.

For a small alpha, use conservative limits: Node heap around 192 MiB, PostgreSQL pool `max=5`, systemd memory ceiling around 256 MiB, log rotation, and a quota/alert for uploads. PostgreSQL should not be exposed publicly. Back up PostgreSQL and the media directory together; restore tests belong on a separate host.

Recommended health checks:

- process: `GET /health` returns `200` only when PostgreSQL answers;
- resource alerts: available RAM, swap activity, disk free space, upload growth, PostgreSQL connections;
- application: 5xx rate, latency, auth failures and rate-limit events without logging credentials or tokens;
- VPN regression: existing unit status and actual client connectivity, not merely open ports.

The full public launch should move this API, database, and media to a dedicated host. No application code depends on VPN services, so migration is a DNS/configuration change plus database/media restore.

## Transactional email

Email verification and password reset codes go through `SMTP_URL` (a standard `smtp://user:pass@host:port` connection string) and `MAIL_FROM`. Neither is set on the beta `/etc/between-us-api.env` yet, so the server logs the code instead of sending it (`journalctl -u between-us-api | grep "logging mail instead"`) — usable end to end for the current two-person beta, not for real users. Before inviting anyone outside the beta pair, add a real SMTP provider's `SMTP_URL` and a `MAIL_FROM` address to the env file and restart `between-us-api.service`.
