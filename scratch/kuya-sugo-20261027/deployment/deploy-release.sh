#!/usr/bin/env bash
set -euo pipefail
ssh -o BatchMode=yes -o ConnectTimeout=15 root@109.123.239.182 'sha256sum /var/www/web/dist/index.html; test ! -d /var/www/web/.deploy-staging' | grep -q '^8d1e7d4311bc75c4d33a224482b947d8983f5c4ffac2c3cb0dbb4259b96474e9 '
export DEPLOY_SOURCE=/c/Capstone_Project_Web/scratch/kuya-sugo-20261027/deployment/release
export DEPLOY_ROOT=/var/www/web
export DEPLOY_LABEL=web
export DEPLOY_URL=https://portal.sugo-express.org
bash /c/Capstone_Project_Web/scripts/deploy-site.sh --no-build
