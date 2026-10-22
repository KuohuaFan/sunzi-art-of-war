#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
project_root="$(cd -- "$script_dir/.." && pwd -P)"
cd "$project_root"

fail() {
  printf 'pages:deploy: %s\n' "$1" >&2
  exit 1
}

command -v git >/dev/null 2>&1 || fail "git is required"
command -v npm >/dev/null 2>&1 || fail "npm is required"
command -v pnpm >/dev/null 2>&1 || fail "pnpm is required"
git rev-parse --show-toplevel >/dev/null 2>&1 || fail "project root is not a Git repository"

remote_url="$(git remote get-url origin 2>/dev/null)" || fail "origin remote is not configured"
[[ -n "$remote_url" ]] || fail "origin remote is empty"
if ! git ls-remote "$remote_url" >/dev/null 2>&1; then
  fail "origin remote is not reachable"
fi

git_name="$(git config --get user.name 2>/dev/null || true)"
git_email="$(git config --get user.email 2>/dev/null || true)"
[[ -n "$git_name" ]] || fail "git user.name is not configured"
[[ -n "$git_email" ]] || fail "git user.email is not configured"

pnpm test
pnpm check
pnpm pages:build
pnpm pages:verify

pages_output_dir="${PAGES_CLIENT_OUT_DIR:-dist/pages}"
if [[ "$pages_output_dir" != /* ]]; then
  pages_output_dir="$project_root/$pages_output_dir"
fi
[[ -d "$pages_output_dir" ]] || fail "Pages build output is missing"

tmp_parent="$(mktemp -d)"
deploy_dir="$tmp_parent/site"
trap 'rm -rf "$tmp_parent"' EXIT

if git ls-remote --exit-code --heads "$remote_url" gh-pages >/dev/null 2>&1; then
  git clone --quiet --branch gh-pages --single-branch "$remote_url" "$deploy_dir"
else
  mkdir -p "$deploy_dir"
  git -C "$deploy_dir" init --quiet -b gh-pages
  git -C "$deploy_dir" remote add origin "$remote_url"
fi

git -C "$deploy_dir" config user.name "$git_name"
git -C "$deploy_dir" config user.email "$git_email"
find "$deploy_dir" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf -- {} +
cp -a "$pages_output_dir"/. "$deploy_dir"/
git -C "$deploy_dir" add -A

if git -C "$deploy_dir" diff --cached --quiet; then
  printf '%s\n' 'pages:deploy: no changes; nothing to push'
  exit 0
fi

git -C "$deploy_dir" commit --quiet -m "deploy: GitHub Pages $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git -C "$deploy_dir" push --quiet origin HEAD:gh-pages
printf '%s\n' 'pages:deploy: gh-pages updated'
