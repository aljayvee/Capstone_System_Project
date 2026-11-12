#!/usr/bin/env bash
set -euo pipefail
ssh -o BatchMode=yes -o ConnectTimeout=15 root@109.123.239.182 'sha256sum /var/www/web/dist/index.html; test ! -d /var/www/web/.deploy-staging' | grep -q '^e3f3b987acd29ff08428289c47eb8f14bce73ad5b385af3c03444e745fac0306 '
export DEPLOY_SOURCE=/c/Capstone_Project_Web/scratch/merchant-entrance-20261027/deployment/release
export DEPLOY_ROOT=/var/www/web
export DEPLOY_LABEL=web
export DEPLOY_URL=https://portal.sugo-express.org
bash /c/Capstone_Project_Web/scripts/deploy-site.sh --no-build
