#!/usr/bin/env bash
set -euo pipefail
ssh -o BatchMode=yes -o ConnectTimeout=15 root@109.123.239.182 'sha256sum /var/www/web/dist/index.html; test ! -d /var/www/web/.deploy-staging' | grep -q '^b57f04064d720241cce422d618e8cfedba2e7b4039e5b4393cac815a4ca7a277 '
export DEPLOY_SOURCE=/c/Capstone_Project_Web/scratch/login-fullscreen-20261102/deployment/release
export DEPLOY_ROOT=/var/www/web
export DEPLOY_LABEL=web-login
export DEPLOY_URL=https://portal.sugo-express.org
bash /c/Capstone_Project_Web/scripts/deploy-site.sh --no-build
