import Link from "next/link";
import { ReactNode } from "react";
import { GREECON_COMPANY, GREECON_DOMAIN } from "@greecon/shared";
import { Nav } from "./Nav";

export function Shell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Link href="/" className="brand">
          <img src={`${process.env.NEXT_BASE_PATH ?? ""}/greecon-logo.svg`} alt="" width="28" height="39" />
          <span>Greecon</span>
        </Link>
        <Nav />
        <div className="sidebar-foot">
          <p>{GREECON_COMPANY}</p>
          <span>{GREECON_DOMAIN}</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Greecon Platform</p>
            <h1>{title}</h1>
            {subtitle ? <p className="topbar__subtitle">{subtitle}</p> : null}
          </div>
          <div className="access-chip">
            <span>Secure access</span>
            <strong>Operator</strong>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
