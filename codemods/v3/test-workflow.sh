#!/usr/bin/env bash
# Runs the composed workflow against fixtures that a single script cannot see.
set -euo pipefail

root="$(cd "$(dirname "$0")" && pwd)"
fixture="$root/tests/workflow/react-native-unhandled"
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

cp -R "$fixture/input/." "$tmp/"

npx codemod@latest workflow run \
	--workflow "$root/workflow.yaml" \
	--target "$tmp" \
	--no-interactive \
	--allow-dirty \
	--disable-analytics \
	--no-color

diff -u "$fixture/expected/setup.ts" "$tmp/setup.ts"
