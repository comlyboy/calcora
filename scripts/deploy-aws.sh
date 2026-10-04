#!/usr/bin/env bash
# Deploys the production build to S3 + CloudFront.
# Run from anywhere: ./scripts/deploy-aws.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUCKET="calcora.pwa"
DISTRIBUTION_ID="E2OYTSAOD8J8I4"
NO_CACHE="no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"

echo "--- Building ---"
cd "$REPO_ROOT"
npm run build

cd "$REPO_ROOT/dist/calcora/browser"

# Full sync with --delete first, covering every file with no excludes, so orphan
# detection compares the complete bucket against the complete local build. The
# cache-control set here is just a placeholder default — every file type that
# needs something different gets its header corrected by the cp calls below,
# which only adjust metadata on keys sync already placed (no adds/removes).
echo "--- 1. Full sync with --delete (removes orphaned files from old builds) ---"
aws s3 sync . "s3://$BUCKET/" --delete --cache-control "public, max-age=3600"

echo "--- 2. Hashed JS/CSS bundles: long-cache, immutable (filenames are content-hashed) ---"
aws s3 cp . "s3://$BUCKET/" --recursive \
  --exclude "*" --include "*.js" --include "*.css" \
  --exclude "ngsw-worker.js" --exclude "worker-basic.min.js" --exclude "safety-worker.js" \
  --cache-control "public, max-age=31536000, immutable"

echo "--- 3. Service worker files + index.html: always revalidate ---"
aws s3 cp index.html "s3://$BUCKET/index.html" --cache-control "$NO_CACHE" --content-type "text/html; charset=UTF-8"
aws s3 cp ngsw.json "s3://$BUCKET/ngsw.json" --cache-control "$NO_CACHE" --content-type "application/json"
aws s3 cp ngsw-worker.js "s3://$BUCKET/ngsw-worker.js" --cache-control "$NO_CACHE" --content-type "application/javascript"
aws s3 cp worker-basic.min.js "s3://$BUCKET/worker-basic.min.js" --cache-control "$NO_CACHE" --content-type "application/javascript"
aws s3 cp safety-worker.js "s3://$BUCKET/safety-worker.js" --cache-control "$NO_CACHE" --content-type "application/javascript"

echo "--- 4. Manifest: moderate cache, correct content type ---"
aws s3 cp manifest.webmanifest "s3://$BUCKET/manifest.webmanifest" --cache-control "public, max-age=3600" --content-type "application/manifest+json"

echo "--- 5. Invalidating CloudFront entry points ---"
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION_ID" \
  --paths "/" "/index.html" "/ngsw.json" "/ngsw-worker.js" "/manifest.webmanifest"

echo "--- Done ---"
aws s3 ls "s3://$BUCKET/" --recursive --human-readable
