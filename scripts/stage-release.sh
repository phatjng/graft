#!/usr/bin/env bash
# Stages every package whose version isn't on npm yet. Nothing goes live until
# a maintainer approves it with 2FA on npmjs.com (Staged Packages), so a
# compromised CI run can't publish on its own. Run by release.yml.
set -euo pipefail

pnpm build

# pnpm packs the tarballs, which replaces `workspace:*` with real versions.
# `npm stage publish` would pack with npm and leave `workspace:*` in.
rm -rf .release
pnpm changeset pack --out-dir .release

# publish-plan.json lists the packed packages in dependency order.
tarballs=$(node -p '
  const { plan } = JSON.parse(require("fs").readFileSync(".release/publish-plan.json", "utf8"));
  plan.flat().filter((r) => r.tarball).map((r) => r.tarball.path).join("\n");
')

for tarball in $tarballs; do
  npm stage publish ".release/$tarball" --access public "$@"
done

# Tags each new version, which the Changesets action pushes and turns into a
# GitHub release.
if [[ " $* " != *" --dry-run "* ]]; then
  pnpm changeset git-tag
fi
