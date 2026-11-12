#!/usr/bin/env bash
set -euo pipefail
ssh -o BatchMode=yes -o ConnectTimeout=15 root@109.123.239.182 'sha256sum /var/www/web/dist/index.html; test ! -d /var/www/web/.deploy-staging' | grep -q '^2aa394ebb9bedde6f80a4a61ec2a721d23fda8cb0487aeb99afe0e860dddc207 '
export DEPLOY_SOURCE=/c/Capstone_Project_Web/scratch/rates-entrance-20261027/deployment/release
export DEPLOY_ROOT=/var/www/web
export DEPLOY_LABEL=web
export DEPLOY_URL=https://portal.sugo-express.org
bash /c/Capstone_Project_Web/scripts/deploy-site.sh --no-build
