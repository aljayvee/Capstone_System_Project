#!/usr/bin/env bash
set -euo pipefail
ssh -o BatchMode=yes -o ConnectTimeout=15 root@109.123.239.182 'sha256sum /var/www/web/dist/index.html; test ! -d /var/www/web/.deploy-staging' | grep -q '^0c363ef305a21a6a29c65f973418217d65d4155efd1dc47df3940421a36e0eb5 '
export DEPLOY_SOURCE=/c/Capstone_Project_Web/scratch/owner-entrance-deploy-20261027/release
export DEPLOY_ROOT=/var/www/web
export DEPLOY_LABEL=web
export DEPLOY_URL=https://portal.sugo-express.org
bash /c/Capstone_Project_Web/scripts/deploy-site.sh --no-build
