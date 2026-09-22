#!/usr/bin/env bash
#
# Deploy the Landing Page (https://sugoonthego.online).
#
#   scripts/deploy-landing.sh            # build, then deploy
#   scripts/deploy-landing.sh --no-build # deploy the existing dist/ as-is
#
# The landing page lives in its own folder OUTSIDE this repo, and that folder is
# not a git repository at all - so the script that deploys it is kept here,
# where it can be version controlled. Override DEPLOY_SOURCE if the checkout
# moves.
#
# DEPLOY_HEAVY names the customer APK: 125 MB of it, byte-identical between
# deploys, which would otherwise be tarred and pushed over ssh every single
# time. The engine compares it by size then md5 and skips it when unchanged -
# and because the skip is expressed as an rsync --exclude, --delete cannot
# remove it either.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

DEPLOY_LABEL=landing \
DEPLOY_ROOT=/var/www/landing \
DEPLOY_SOURCE="${LANDING_SOURCE:-C:/Capstone_Landing_Page}" \
DEPLOY_URL=https://sugoonthego.online \
DEPLOY_HEAVY="downloads" \
  exec "$HERE/deploy-site.sh" "$@"
