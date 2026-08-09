#!/usr/bin/env bash
# Verifies that the hosts in .env are reachable, WITHOUT printing credentials.
# Only host, port, and reachability are ever echoed — never the password.
#
#   bash scripts/check-db-reachable.sh

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

if [ ! -f .env ]; then
  echo "✗ .env not found. Copy .env.example to .env and fill it in."
  exit 1
fi

# Next.js loads .env.local at HIGHER precedence than .env. If both exist, the
# file you edited may be silently overridden by the one you forgot about.
if [ -f .env.local ]; then
  echo "⚠  BOTH .env and .env.local exist."
  echo "   .env.local wins, so values in .env may be silently ignored."
  echo "   This project uses .env only — delete .env.local."
  echo
fi

check() {
  local name="$1"
  local url
  url=$(grep -E "^${name}=" .env | head -1 | cut -d= -f2- | tr -d '"'"'")

  if [ -z "$url" ] || [[ "$url" == *"<project-ref>"* ]] || [[ "$url" == *"<password>"* ]]; then
    echo "  ${name}: not filled in yet"
    return
  fi

  # strip scheme and credentials, keep host:port only
  local hostport host port
  hostport=${url#*@}
  hostport=${hostport%%/*}
  host=${hostport%:*}
  port=${hostport##*:}

  printf "  %-13s %s:%s  " "${name}:" "$host" "$port"

  if ! getent hosts "$host" >/dev/null 2>&1; then
    echo "✗ DNS does not resolve"
    return
  fi

  if timeout 10 bash -c "cat < /dev/null > /dev/tcp/${host}/${port}" 2>/dev/null; then
    echo "✓ reachable"
  else
    echo "✗ cannot connect (firewall, wrong port, or IPv6-only host on an IPv4 network)"
  fi
}

echo "Checking database hosts (credentials are never printed):"
check DATABASE_URL
check DIRECT_URL

echo
echo "Sanity checks:"
grep -q ':6543/' .env 2>/dev/null \
  && echo "  ✓ a :6543 (transaction pooler) URL is present" \
  || echo "  ✗ no :6543 URL — DATABASE_URL must be the TRANSACTION pooler"
grep -q ':5432/' .env 2>/dev/null \
  && echo "  ✓ a :5432 URL is present for migrations" \
  || echo "  ✗ no :5432 URL — DIRECT_URL must be the direct (or session pooler) connection"
