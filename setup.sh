#!/usr/bin/env bash
# Dev Tracker monorepo setup.
#
# Creates any missing directories and env files, then installs every dependency:
#   backend/  Express + Mongoose API        (npm)
#   web/      Next.js + Tailwind dashboard  (npm)
#   mobile/   Flutter iOS app               (flutter pub get, CocoaPods on macOS)
#
# Usage: ./setup.sh [--skip-backend] [--skip-web] [--skip-mobile]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_BACKEND=false
SKIP_WEB=false
SKIP_MOBILE=false

for arg in "$@"; do
  case "$arg" in
    --skip-backend) SKIP_BACKEND=true ;;
    --skip-web) SKIP_WEB=true ;;
    --skip-mobile) SKIP_MOBILE=true ;;
    -h|--help)
      sed -n '2,10p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

bold() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

random_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 48
  else
    node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  fi
}

# Copies .env.example to the target env file once, never overwriting real settings.
init_env() {
  local dir="$1" target="$2"
  if [[ -f "$dir/$target" ]]; then
    ok "$dir/$target already exists (left untouched)"
    return
  fi
  cp "$dir/.env.example" "$dir/$target"
  ok "created $dir/$target from .env.example"
}

bold "Checking prerequisites"
if ! $SKIP_BACKEND || ! $SKIP_WEB; then
  command -v node >/dev/null 2>&1 || fail "Node.js 20+ is required (https://nodejs.org)"
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
  [[ "$NODE_MAJOR" -ge 20 ]] || fail "Node.js 20+ is required, found $(node -v)"
  ok "node $(node -v), npm $(npm -v)"
fi
if ! $SKIP_MOBILE; then
  if command -v flutter >/dev/null 2>&1; then
    ok "$(flutter --version 2>/dev/null | head -n1)"
  else
    warn "flutter not found, skipping the mobile app (https://docs.flutter.dev/get-started/install)"
    SKIP_MOBILE=true
  fi
fi

bold "Preparing directories"
mkdir -p "$ROOT"/backend/src/{config,jobs,middleware,models,routes,services,utils} "$ROOT"/backend/test
mkdir -p "$ROOT"/web/src/{app,components,lib} "$ROOT"/web/public
mkdir -p "$ROOT"/mobile/lib/{models,screens,services,state,utils,widgets} "$ROOT"/mobile/test
ok "monorepo layout in place"

if ! $SKIP_BACKEND; then
  bold "Backend (Express + MongoDB)"
  cd "$ROOT/backend"
  if [[ ! -f .env ]]; then
    init_env "$ROOT/backend" .env
    secret="$(random_secret)"
    # Portable in-place edit (GNU and BSD sed).
    sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${secret}|" .env && rm -f .env.bak
    ok "generated a random JWT_SECRET"
    warn "set MONGODB_URI and GEMINI_API_KEY in backend/.env"
  else
    ok "backend/.env already exists (left untouched)"
  fi
  npm ci --no-audit --no-fund
  ok "backend dependencies installed"
fi

if ! $SKIP_WEB; then
  bold "Web (Next.js + Tailwind)"
  cd "$ROOT/web"
  init_env "$ROOT/web" .env.local
  npm ci --no-audit --no-fund
  ok "web dependencies installed"
fi

if ! $SKIP_MOBILE; then
  bold "Mobile (Flutter, iOS)"
  cd "$ROOT/mobile"
  if [[ ! -d ios/Runner.xcodeproj ]]; then
    # Regenerates the iOS runner without touching existing Dart code.
    flutter create --org com.devtracker --project-name dev_tracker --platforms ios .
  fi
  flutter pub get
  ok "Flutter packages installed"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    if command -v pod >/dev/null 2>&1 && [[ -f ios/Podfile ]]; then
      (cd ios && pod install)
      ok "CocoaPods installed"
    fi
  else
    warn "iOS builds need macOS with Xcode; Dart code still analyzes and tests here"
  fi
fi

bold "Done"
cat <<'MSG'
  Next steps:
    1. Edit backend/.env: MONGODB_URI (MongoDB Atlas) and GEMINI_API_KEY.
    2. Start the API:      npm --prefix backend run dev      (http://localhost:4000)
    3. Start the web app:  npm --prefix web run dev          (http://localhost:3000)
    4. Run the iOS app:    cd mobile && flutter run -d ios --dart-define=API_URL=http://localhost:4000
MSG
