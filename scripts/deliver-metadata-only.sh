#!/usr/bin/env bash
# `fastlane deliver run` expects --api_key_path to a JSON bundle (not raw .p8).
# Builds a temp JSON from keys/AuthKey_HD4HWHHYDK.p8 and runs deliver with metadata only.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
P8="$ROOT/keys/AuthKey_HD4HWHHYDK.p8"
if [[ ! -f "$P8" ]]; then
  echo "Missing $P8 — download the key from App Store Connect and place it here." >&2
  exit 1
fi
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
ruby -rjson -e '
  p8 = ARGV[0]
  out = ARGV[1]
  key = File.read(p8)
  j = {
    "key_id" => "HD4HWHHYDK",
    "issuer_id" => "a6c8bd6a-8f60-4aed-a0a6-d129cb2aaf7a",
    "key" => key
  }
  File.write(out, JSON.dump(j))
' "$P8" "$TMP"

exec bundle exec fastlane deliver run \
  --api_key_path "$TMP" \
  -a com.erparris.orbital \
  --skip_binary_upload \
  --skip_screenshots \
  --force \
  --metadata_path ./fastlane/metadata
