#!/usr/bin/env bash
# Publish the game. Usage: scripts/deploy.sh test | production
#   test       -> https://test.zerozeronumetal.pages.dev  (its own room server: Worker zerozero-rooms-test)
#   production -> https://zerozeronumetal.pages.dev       (room server: Worker zerozero-rooms)
# Runs every test first. Stamps a game version, so players with an old copy of the page can't join a room.
set -euo pipefail
cd "$(dirname "$0")/.."
case "${1:-}" in
  test) branch=test; worker_env=(--env test) ;;
  production) branch=main; worker_env=(--env "") ;;
  *) echo "usage: $0 test|production"; exit 1 ;;
esac
bunx vitest run
version="$(cat jogo/index.html jogo/jogo.js | sha256sum | cut -c1-10)"
out=.deploy/jogo
rm -rf .deploy && mkdir -p "$out" && cp jogo/* "$out"/
sed -i "s/const VERSION='dev';/const VERSION='$version';/" "$out/jogo.js"
grep -q "const VERSION='$version';" "$out/jogo.js" || { echo "could not stamp the version"; exit 1; }
# the room server first: the game's Pages Function points to it
bunx wrangler deploy -c server/wrangler.toml "${worker_env[@]}"
bunx wrangler pages deploy "$out" --project-name zerozeronumetal --branch "$branch" --commit-dirty=true
echo "published version $version ($1)"
