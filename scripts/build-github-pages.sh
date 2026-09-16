#!/usr/bin/env bash
set -euo pipefail

github_repository="${GITHUB_REPOSITORY:-}"
repo_name="${github_repository##*/}"
if [[ -z "$repo_name" || "$repo_name" == "$github_repository" ]]; then
  repo_name="sunzi-art-of-war"
fi

export NODE_ENV=production
export VITE_STATIC_EXPORT=true
export PAGES_BASE_PATH="${PAGES_BASE_PATH:-/$repo_name/}"
export PAGES_CLIENT_OUT_DIR="${PAGES_CLIENT_OUT_DIR:-dist/pages}"
export PAGES_SSR_OUT_DIR="${PAGES_SSR_OUT_DIR:-dist/pages-ssr}"

vite build
vite build --config vite.config.ssr.ts
tsx scripts/export-github-pages.ts
