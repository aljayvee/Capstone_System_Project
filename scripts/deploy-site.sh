#!/usr/bin/env bash
#
# Deploy a built static site to the Contabo VPS, self-cleaning.
#
# The engine behind scripts/deploy-web.sh and scripts/deploy-landing.sh.
# Replaces `scp -r dist/*`, which copies over but NEVER deletes: by 2026-09-23
# the staff portal had accumulated 433 files and 43 MB, and the landing page 17
# hashed assets where its build produces 2.
#
# Why the upload is staged instead of rsyncing straight from here: rsync has to
# exist on BOTH ends, and the Windows workstation has none (the VPS has 3.2.7).
# A tar stream into a staging directory plus a server-side sync needs only ssh
# and tar locally, and works from any machine.
#
# Configured entirely by environment:
#   DEPLOY_HOST    ssh target                    (default root@109.123.239.182)
#   DEPLOY_ROOT    remote dir holding dist/      (required)
#   DEPLOY_SOURCE  local dir holding dist/       (required)
#   DEPLOY_URL     public URL for the live check (required)
#   DEPLOY_LABEL   used in the backup path       (required)
#   DEPLOY_HEAVY   space-separated paths under dist/ that are large and rarely
#                  change. Compared by size then md5; when identical they are
#                  neither uploaded nor deleted. The landing page's 125 MB APK
#                  would otherwise cross the wire on every single deploy.
#
set -euo pipefail

HOST="${DEPLOY_HOST:-root@109.123.239.182}"
: "${DEPLOY_ROOT:?DEPLOY_ROOT is required}"
: "${DEPLOY_SOURCE:?DEPLOY_SOURCE is required}"
: "${DEPLOY_URL:?DEPLOY_URL is required}"
: "${DEPLOY_LABEL:?DEPLOY_LABEL is required}"
HEAVY="${DEPLOY_HEAVY:-}"

REMOTE_DIST="$DEPLOY_ROOT/dist"
STAGING="$DEPLOY_ROOT/.deploy-staging"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/root/deploy-backups/$DEPLOY_LABEL-$STAMP"

cd "$DEPLOY_SOURCE"

# ── build ──────────────────────────────────────────────────────────────────
if [ "${1:-}" != "--no-build" ]; then
  echo "==> building $DEPLOY_LABEL"
  npm run build
fi

[ -f dist/index.html ] || { echo "dist/index.html missing - nothing to deploy"; exit 1; }
LOCAL_COUNT=$(find dist -type f | wc -l)

# ── decide which heavy paths can be skipped ────────────────────────────────
# Compared by size first (free), then md5 only if the sizes agree. Skipping an
# identical 125 MB APK turns a two-minute deploy into a two-second one.
TAR_EXCLUDE=()
RSYNC_EXCLUDE=()
SKIPPED_FILES=0

for path in $HEAVY; do
  [ -e "dist/$path" ] || continue
  local_sum=$(find "dist/$path" -type f -exec md5sum {} + 2>/dev/null \
              | awk '{print $1}' | sort | md5sum | cut -d' ' -f1)
  remote_sum=$(ssh -o BatchMode=yes "$HOST" \
    "find '$REMOTE_DIST/$path' -type f -exec md5sum {} + 2>/dev/null \
     | awk '{print \$1}' | sort | md5sum | cut -d' ' -f1" || echo "none")

  if [ "$local_sum" = "$remote_sum" ]; then
    n=$(find "dist/$path" -type f | wc -l)
    SKIPPED_FILES=$((SKIPPED_FILES + n))
    # Excluded from rsync too, which also protects it from --delete: rsync does
    # not delete excluded paths unless --delete-excluded is given.
    TAR_EXCLUDE+=(--exclude="./$path")
    RSYNC_EXCLUDE+=(--exclude="/$path")
    echo "==> $path unchanged on the server ($n file(s)) - not re-uploading"
  else
    echo "==> $path differs - will upload"
  fi
done

UPLOAD_COUNT=$((LOCAL_COUNT - SKIPPED_FILES))
echo "==> local build: $LOCAL_COUNT files, uploading $UPLOAD_COUNT"

# ── upload into a staging directory ────────────────────────────────────────
echo "==> uploading to $STAGING"
ssh -o BatchMode=yes "$HOST" "rm -rf '$STAGING' && mkdir -p '$STAGING' '$BACKUP_DIR'"
tar -czf - -C dist "${TAR_EXCLUDE[@]+"${TAR_EXCLUDE[@]}"}" . \
  | ssh -o BatchMode=yes "$HOST" "tar -xzf - -C '$STAGING'"

REMOTE_STAGED=$(ssh -o BatchMode=yes "$HOST" "find '$STAGING' -type f | wc -l")
if [ "$REMOTE_STAGED" -ne "$UPLOAD_COUNT" ]; then
  echo "!! staged $REMOTE_STAGED files but expected $UPLOAD_COUNT - aborting before touching the live tree"
  ssh -o BatchMode=yes "$HOST" "rm -rf '$STAGING'"
  exit 1
fi
echo "==> staged $REMOTE_STAGED files, matches expectation"

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
#                     not -a, so owner and group are left alone.
echo "==> syncing into $REMOTE_DIST (--delete-after, deleted files parked)"
ssh -o BatchMode=yes "$HOST" bash -s <<EOF
set -euo pipefail
rsync -rlpt --delete-after \
      --backup --backup-dir='$BACKUP_DIR' \
      --chmod=F644,D755 \
      --itemize-changes \
      ${RSYNC_EXCLUDE[@]+${RSYNC_EXCLUDE[@]}} \
      '$STAGING/' '$REMOTE_DIST/' | tail -20
rm -rf '$STAGING'
echo "live: \$(find '$REMOTE_DIST' -type f | wc -l) files, \$(du -sh '$REMOTE_DIST' | cut -f1)"
echo "parked: \$(find '$BACKUP_DIR' -type f 2>/dev/null | wc -l) files in $BACKUP_DIR"
EOF

# ── verify ─────────────────────────────────────────────────────────────────
# A deploy that silently drops a lazy-loaded chunk looks fine until someone
# navigates. nginx's `try_files ... /index.html` means a missing chunk is
# served as HTML, so the browser reports a syntax error rather than a 404 -
# which is exactly the failure this check exists to catch. Chunks referenced
# from INSIDE the JS matter as much as those named in index.html: the portal's
# DispatcherPortal bundle is lazy-imported and appears in no HTML at all.
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

# Probed server-side with --resolve so it hits local nginx with the right SNI,
# bypassing Cloudflare. Going through the CDN answers the wrong question twice
# over: it can serve a cached copy of the previous deploy, and the landing
# zone's bot protection challenges curl outright (403 with cf-mitigated:
# challenge) while real browsers are served normally. A deploy check that
# reports 403 on success is a check nobody will read.
echo "==> live check (direct to nginx, bypassing any CDN)"
DEPLOY_DOMAIN="${DEPLOY_URL#https://}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN%%/*}"
ssh -o BatchMode=yes "$HOST" \
  "curl -sk -o /dev/null -w '  $DEPLOY_URL -> HTTP %{http_code}\n' -m 20 \
   --resolve '$DEPLOY_DOMAIN:443:127.0.0.1' '$DEPLOY_URL'"

cat <<EOF

Deployed $DEPLOY_LABEL. Rollback if needed:
  ssh $HOST "rsync -rlpt '$BACKUP_DIR/' '$REMOTE_DIST/'"

Note: --delete removes superseded chunks immediately. A browser tab left open
across this deploy may fail to lazy-load a chunk it has not fetched yet; a
refresh fixes it, and index.html is served no-cache so the refresh always gets
the current manifest.
EOF
