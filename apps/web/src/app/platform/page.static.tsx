import { Shell } from "../../components/Shell";

// Static-export twin of page.tsx (see apps/web/scripts/build-static.sh). Platform-admin status
// only ever comes from a real logged-in session (apps/api/src/common/principal.ts) — the static
// export has neither a server to log in against nor any session at all, so there is nothing real
// to show here regardless of which of the five demo-role builds this is.
export default function PlatformAdminPage() {
  return (
    <Shell title="Clients" subtitle="Onboard and manage every Greecon client account. Visible only to Greecon platform administrators.">
      <div className="panel">
        <p className="muted">
          Client onboarding requires a live deployment (Railway or Google Cloud) with a real logged-in platform-administrator session — this static
          build has no server and no session at all. See docs/12-deployment-github-pages.md.
        </p>
      </div>
    </Shell>
  );
}
