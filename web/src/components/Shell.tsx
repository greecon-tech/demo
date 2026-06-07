import Link from "next/link";
import { ReactNode } from "react";
import { tenant } from "../lib/demo-data";

const navItems = [
  { href: "/", label: "Overview" },
  { href: "/sites/22222222-2222-4222-8222-222222222201", label: "Sites" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/automation", label: "Automation" },
  { href: "/alerts", label: "Alerts" },
  { href: "/analytics", label: "Analytics" },
  { href: "/devices", label: "Devices" },
  { href: "/reports", label: "Reports" },
  { href: "/audit", label: "Audit" },
  { href: "/admin", label: "Admin" },
  { href: "/settings", label: "Settings" }
] as const;

export function Shell({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Link href="/" className="brand">
          <img src="/greecon-logo-placeholder.svg" alt="Greecon" />
        </Link>
        <nav className="main-nav">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <p>{tenant.company}</p>
          <span>{tenant.domain}</span>
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
