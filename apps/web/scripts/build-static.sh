#!/bin/sh
# Builds the static GitHub Pages export (see docs/12-deployment-github-pages.md).
#
# Two route files have a static-only twin that gets swapped in just for this build, then
# restored once it finishes (or fails), so local dev and live SSR deployments always see the
# real files:
#
#   automation/page.tsx  — imports RuleForm/RuleActions, which call Server Actions to let an
#     Owner/Admin manage rules. Next.js's static export flatly refuses to build ANY app
#     containing a Server Action, even one never actually rendered in that build.
#
#   sites/[siteId]/page.tsx — the SSR version deliberately has no generateStaticParams (see its
#     own comment: merely having that function present, even gated to return [], made Next.js
#     throw DYNAMIC_SERVER_USAGE on a live request). The static export needs the opposite: every
#     site pre-rendered at build time, since there's no live API to query at request time.
set -e

cd "$(dirname "$0")/.."

restore() {
  mv src/app/automation/page.live.tsx src/app/automation/page.tsx
  mv "src/app/sites/[siteId]/page.live.tsx" "src/app/sites/[siteId]/page.tsx"
}

cp src/app/automation/page.tsx src/app/automation/page.live.tsx
cp src/app/automation/page.static.tsx src/app/automation/page.tsx
cp "src/app/sites/[siteId]/page.tsx" "src/app/sites/[siteId]/page.live.tsx"
cp "src/app/sites/[siteId]/page.static.tsx" "src/app/sites/[siteId]/page.tsx"
trap restore EXIT

NEXT_OUTPUT_EXPORT=1 npx next build
