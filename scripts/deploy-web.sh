#!/usr/bin/env bash
#
# Deploy the Web & Staff Portal (https://sugo-express.org).
#
#   scripts/deploy-web.sh            # build, then deploy
#   scripts/deploy-web.sh --no-build # deploy the existing dist/ as-is
#
# All the machinery lives in deploy-site.sh; this only names the target.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DEPLOY_LABEL=web \
DEPLOY_ROOT=/var/www/web \
DEPLOY_SOURCE="$(cd "$HERE/.." && pwd)" \
DEPLOY_URL=https://sugo-express.org \
  exec "$HERE/deploy-site.sh" "$@"
