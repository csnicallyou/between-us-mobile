#!/usr/bin/env bash
set -euo pipefail

archive="/tmp/between-us-api-deploy-20260811.tgz"
release="/opt/between-us-api/releases/20260811-1"
env_file="/etc/between-us-api.env"

if ss -H -lnt | awk '{print $4}' | grep -Eq '(^|:)3100$|(^|:)9444$'; then
  echo "Required application port is already occupied" >&2
  exit 1
fi

id between-us >/dev/null 2>&1 || useradd --system --home-dir /var/lib/between-us-api --create-home --shell /usr/sbin/nologin between-us
install -d -o root -g root -m 0755 /opt/between-us-api/releases
install -d -o between-us -g between-us -m 0750 /var/lib/between-us-api/uploads
install -d -o between-us -g between-us -m 0750 "$release"
tar -xzf "$archive" -C "$release"
chown -R between-us:between-us "$release"

if [[ ! -f "$env_file" ]]; then
  db_password="$(openssl rand -hex 24)"
  jwt_secret="$(openssl rand -base64 48 | tr -d '\n')"
  feedback_key="$(openssl rand -base64 32 | tr -d '\n')"
  if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='between_us'" | grep -q 1; then
    runuser -u postgres -- psql -v ON_ERROR_STOP=1 -c "CREATE ROLE between_us LOGIN PASSWORD '$db_password'"
  fi
  if ! runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='between_us'" | grep -q 1; then
    runuser -u postgres -- createdb --owner=between_us between_us
  fi
  install -o root -g between-us -m 0640 /dev/null "$env_file"
  printf '%s\n' \
    'NODE_ENV=production' \
    'HOST=127.0.0.1' \
    'PORT=3100' \
    "DATABASE_URL=postgresql://between_us:${db_password}@127.0.0.1:5432/between_us" \
    'DATABASE_SSL=false' \
    "JWT_SECRET=${jwt_secret}" \
    "FEEDBACK_ENCRYPTION_KEY=${feedback_key}" \
    'CORS_ORIGINS=https://shared-orbit-47.netlify.app' \
    'UPLOAD_DIR=/var/lib/between-us-api/uploads' \
    'MAX_UPLOAD_BYTES=5242880' \
    'ACCESS_TOKEN_TTL=15m' \
    'REFRESH_TOKEN_DAYS=30' \
    'TRUST_PROXY=true' > "$env_file"
fi

ln -sfn "$release" /opt/between-us-api/current
set -a
source "$env_file"
set +a
runuser -u between-us -- npm --prefix "$release" ci --include=dev
runuser -u between-us -- npm --prefix "$release" run build
runuser -u between-us -- env \
  NODE_ENV="$NODE_ENV" DATABASE_URL="$DATABASE_URL" DATABASE_SSL="$DATABASE_SSL" \
  JWT_SECRET="$JWT_SECRET" FEEDBACK_ENCRYPTION_KEY="$FEEDBACK_ENCRYPTION_KEY" \
  CORS_ORIGINS="$CORS_ORIGINS" UPLOAD_DIR="$UPLOAD_DIR" \
  npm --prefix "$release" run migrate
runuser -u between-us -- npm --prefix "$release" prune --omit=dev

install -o root -g root -m 0644 "$release/deploy/between-us-api.service" /etc/systemd/system/between-us-api.service
install -d -o root -g root -m 0755 /etc/between-us-nginx
install -o root -g root -m 0644 "$release/deploy/nginx.conf" /etc/between-us-nginx/nginx.conf
install -o root -g root -m 0644 "$release/deploy/between-us-edge.service" /etc/systemd/system/between-us-edge.service

systemctl daemon-reload
systemctl enable --now between-us-api.service
for _ in {1..15}; do
  if curl --fail --silent http://127.0.0.1:3100/health >/dev/null; then break; fi
  sleep 1
done
curl --fail --silent --show-error http://127.0.0.1:3100/health >/dev/null
/usr/sbin/nginx -t -c /etc/between-us-nginx/nginx.conf
systemctl enable --now between-us-edge.service
ufw allow 9444/tcp comment 'between-us beta api'

systemctl is-active --quiet between-us-api.service
systemctl is-active --quiet between-us-edge.service
curl --fail --silent --show-error https://186.246.45.4.nip.io:9444/health
