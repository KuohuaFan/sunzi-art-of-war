#!/usr/bin/env bash
set -euo pipefail

pnpm pages:build
pnpm pages:verify

tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
cp -a dist/pages/. "$tmp_dir/"

git -C "$tmp_dir" init -b gh-pages
git -C "$tmp_dir" config user.name "$(git config user.name || echo 'GitHub Pages')"
git -C "$tmp_dir" config user.email "$(git config user.email || echo 'pages@users.noreply.github.com')"
git -C "$tmp_dir" add -A
git -C "$tmp_dir" commit -m "deploy: GitHub Pages $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git -C "$tmp_dir" remote add origin "$(git remote get-url origin)"
git -C "$tmp_dir" push --force origin gh-pages
