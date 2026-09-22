#!/usr/bin/env bash
#
# Deploy the built web portal to the Contabo VPS, self-cleaning.
#
# Replaces `scp -r dist/* root@host:/var/www/web/dist/`, which copies over but
# NEVER deletes. By 2026-09-23 that had left 433 files and 43 MB in
# dist/assets - 33 DispatcherPortal bundles going back a week - and made "which
# build is actually live?" unanswerable by looking at the directory.
#
# Why the upload is staged instead of `rsync`ing straight from here: rsync has
# to exist on BOTH ends, and the Windows workstation has no rsync (the VPS has
# 3.2.7). Uploading a tar stream into a staging directory and running the
# --delete sync server-side needs nothing installed locally, and works from any
# machine with ssh and tar.
#
# Usage:
#   scripts/deploy-web.sh            # build, then deploy
#   scripts/deploy-web.sh --no-build # deploy the existing dist/ as-is
#
set -euo pipefail

HOST="${DEPLOY_HOST:-root@109.123.239.182}"
REMOTE_ROOT="${DEPLOY_ROOT:-/var/www/web}"
REMOTE_DIST="$REMOTE_ROOT/dist"
STAGING="$REMOTE_ROOT/.deploy-staging"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/root/deploy-backups/web-$STAMP"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── build ──────────────────────────────────────────────────────────────────
if [ "${1:-}" != "--no-build" ]; then
  echo "==> building"
  npm run build
fi

[ -f dist/index.html ] || { echo "dist/index.html missing - nothing to deploy"; exit 1; }
LOCAL_COUNT=$(find dist -type f | wc -l)
echo "==> local build: $LOCAL_COUNT files"

# ── upload into a staging directory ────────────────────────────────────────
# One tar stream rather than scp's per-file round trips. Staging lives beside
# dist/ on the same filesystem so the sync below is a local move, not a copy.
echo "==> uploading to $STAGING"
ssh -o BatchMode=yes "$HOST" "rm -rf '$STAGING' && mkdir -p '$STAGING' '$BACKUP_DIR'"
tar -czf - -C dist . | ssh -o BatchMode=yes "$HOST" "tar -xzf - -C '$STAGING'"

REMOTE_STAGED=$(ssh -o BatchMode=yes "$HOST" "find '$STAGING' -type f | wc -l")
if [ "$REMOTE_STAGED" -ne "$LOCAL_COUNT" ]; then
  echo "!! staged $REMOTE_STAGED files but built $LOCAL_COUNT - aborting before touching the live tree"
  ssh -o BatchMode=yes "$HOST" "rm -rf '$STAGING'"
  exit 1
fi
echo "==> staged $REMOTE_STAGED files, matches the build"

# ── sync into place ────────────────────────────────────────────────────────
# --delete-after    : new files land BEFORE old ones disappear, so the tree is
#                     never missing a chunk mid-deploy.
# --backup-dir      : deleted and replaced files are parked, not destroyed.
#                     Outside the destination tree so rsync does not sync it.
# --chmod=F644,D755 : normalises permissions. The scp history left a mix of
#                     -rwxr-xr-x and -rw-r--r-- on static assets.
# -p is required    : without it rsync does not manage permissions at all, so
#                     --chmod only reaches files it actually transfers and an
#                     unchanged file keeps whatever mode scp gave it. -rlpt,
#                     not -a, so owner and group are still left alone.
echo "==> syncing into $REMOTE_DIST (--delete-after, deleted files parked)"
ssh -o BatchMode=yes "$HOST" bash -s <<EOF
set -euo pipefail
rsync -rlpt --delete-after \
      --backup --backup-dir='$BACKUP_DIR' \
      --chmod=F644,D755 \
      --itemize-changes \
      '$STAGING/' '$REMOTE_DIST/' | tail -20
rm -rf '$STAGING'
echo "live: \$(find '$REMOTE_DIST' -type f | wc -l) files, \$(du -sh '$REMOTE_DIST' | cut -f1)"
echo "parked: \$(find '$BACKUP_DIR' -type f 2>/dev/null | wc -l) files in $BACKUP_DIR"
EOF

# ── verify ─────────────────────────────────────────────────────────────────
# A deploy that silently drops a lazy-loaded chunk looks fine until a
# dispatcher navigates. nginx's `try_files ... /index.html` means a missing
# chunk is served as HTML, so the browser reports a syntax error rather than a
# 404 - which is exactly the failure this check exists to catch.
echo "==> verifying"
ssh -o BatchMode=yes "$HOST" bash -s <<EOF
set -uo pipefail
missing=0
for f in \$(grep -oE 'assets/[A-Za-z0-9_.-]+\.(js|css)' '$REMOTE_DIST/index.html' | sort -u); do
  [ -f "$REMOTE_DIST/\$f" ] || { echo "  MISSING \$f"; missing=\$((missing+1)); }
done
for js in '$REMOTE_DIST'/assets/*.js; do
  [ -f "\$js" ] || continue
  for ref in \$(grep -oE '"\./[A-Za-z0-9_.-]+\.js"' "\$js" 2>/dev/null | tr -d '"' | sed 's|^\./||' | sort -u); do
    [ -f "$REMOTE_DIST/assets/\$ref" ] || { echo "  DANGLING \$ref (from \$(basename "\$js"))"; missing=\$((missing+1)); }
  done
done
if [ "\$missing" -eq 0 ]; then
  echo "  every referenced chunk resolves"
else
  echo "  \$missing broken reference(s) - restore with:"
  echo "    rsync -rlpt '$BACKUP_DIR/' '$REMOTE_DIST/'"
  exit 1
fi
EOF

echo "==> live check"
curl -s -o /dev/null -w "  https://sugo-express.org -> HTTP %{http_code}\n" -m 20 https://sugo-express.org/

cat <<EOF

Deployed. Rollback if needed:
  ssh $HOST "rsync -rlpt '$BACKUP_DIR/' '$REMOTE_DIST/'"

Note: --delete removes superseded chunks immediately. A browser tab left open
across this deploy may fail to lazy-load a chunk it has not fetched yet; a
refresh fixes it, and index.html is served no-cache so the refresh always gets
the current manifest.
EOF
