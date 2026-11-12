#!/usr/bin/env bash
set -euo pipefail
ssh -o BatchMode=yes -o ConnectTimeout=15 root@109.123.239.182 'sha256sum /var/www/web/dist/index.html; test ! -d /var/www/web/.deploy-staging' | grep -q '^88ab74847eefd25aa709b74011e2c84191510d3d4c525dc4d75ea280de0f9617 '
export DEPLOY_SOURCE=/c/Capstone_Project_Web/scratch/kuya-sugo-20261028-natural-deploy/release
export DEPLOY_ROOT=/var/www/web
export DEPLOY_LABEL=web
export DEPLOY_URL=https://portal.sugo-express.org
bash /c/Capstone_Project_Web/scripts/deploy-site.sh --no-build
