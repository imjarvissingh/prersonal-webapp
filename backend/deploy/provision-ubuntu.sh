#!/usr/bin/env bash
# One-time provisioning for an Ubuntu 22.04/24.04 VPS.
# Run from the backend/ directory of a checkout as a sudo-capable user:
#   bash deploy/provision-ubuntu.sh api.example.com
set -euo pipefail

DOMAIN="${1:?Usage: provision-ubuntu.sh <api-domain>}"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> Installing Node.js 22, nginx and certbot"
if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
sudo apt-get install -y nginx certbot python3-certbot-nginx
sudo npm install -g pm2

echo "==> Installing API dependencies"
cd "$APP_DIR"
npm ci --omit=dev --no-audit --no-fund
if [[ ! -f .env ]]; then
  cp .env.example .env
  sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" .env
  sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 48)|" .env
  echo "!! Edit $APP_DIR/.env (MONGODB_URI, GEMINI_API_KEY, CORS_ORIGINS, APP_TIMEZONE) and re-run this script."
  exit 1
fi

echo "==> Starting the API with PM2"
pm2 startOrReload deploy/ecosystem.config.js
pm2 save
sudo env PATH="$PATH" pm2 startup systemd -u "$USER" --hp "$HOME" >/dev/null

echo "==> Configuring nginx for $DOMAIN"
sed "s/api.example.com/$DOMAIN/g" deploy/nginx.conf | sudo tee /etc/nginx/sites-available/dev-tracker-api >/dev/null
sudo ln -sf /etc/nginx/sites-available/dev-tracker-api /etc/nginx/sites-enabled/dev-tracker-api
sudo nginx -t
sudo systemctl reload nginx

echo "==> Requesting a TLS certificate"
sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || \
  echo "!! certbot failed; point DNS for $DOMAIN at this server and run: sudo certbot --nginx -d $DOMAIN"

echo "==> Done. Health check: curl https://$DOMAIN/api/health"
