#!/usr/bin/env bash
#
# Deploy the Web & Staff Portal (https://portal.sugo-express.org).
#
# The portal moved off the bare domain on 2026-10-03: nginx serves
# /var/www/web/dist under portal.sugo-express.org, and sugo-express.org now
# answers every path with a deliberate 410. The live check below probes the
# portal, so a 410 here would be a real failure, not the retired domain.
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
DEPLOY_URL=https://portal.sugo-express.org \
  exec "$HERE/deploy-site.sh" "$@"
