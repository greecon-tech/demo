"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const navItems: ReadonlyArray<{ href: string; label: string; icon: ReactNode }> = [
  {
    href: "/",
    label: "Overview",
    icon: (
      <>
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </>
    )
  },
  {
    href: "/sites/22222222-2222-4222-8222-222222222201",
    label: "Sites",
    icon: (
      <>
        <path d="M8 14s5-4.5 5-8a5 5 0 0 0-10 0c0 3.5 5 8 5 8Z" />
        <circle cx="8" cy="6" r="1.6" />
      </>
    )
  },
  { href: "/monitoring", label: "Monitoring", icon: <path d="M1.5 8h3l2-4.5 3 9 2-4.5h3" /> },
  { href: "/automation", label: "Automation", icon: <path d="M8.5 1.5 3 9h4l-1 5.5L13 7H9l-.5-5.5Z" /> },
  {
    href: "/alerts",
    label: "Alerts",
    icon: (
      <>
        <path d="M8 1.8a3.6 3.6 0 0 0-3.6 3.6v2.3c0 .6-.24 1.18-.66 1.6L3 10.1h10l-.74-.8a2.3 2.3 0 0 1-.66-1.6V5.4A3.6 3.6 0 0 0 8 1.8Z" />
        <path d="M6.3 12.3a1.7 1.7 0 0 0 3.4 0" />
      </>
    )
  },
  { href: "/analytics", label: "Analytics", icon: <path d="M2.5 13.5v-4M7 13.5v-7M11.5 13.5v-9" /> },
  {
    href: "/devices",
    label: "Devices",
    icon: (
      <>
        <rect x="4" y="4" width="8" height="8" rx="1.2" />
        <path d="M6 1.5v2M10 1.5v2M6 12.5v2M10 12.5v2M1.5 6h2M1.5 10h2M12.5 6h2M12.5 10h2" />
      </>
    )
  },
  {
    href: "/reports",
    label: "Reports",
    icon: (
      <>
        <rect x="3" y="1.8" width="10" height="12.4" rx="1.2" />
        <path d="M5.5 5h5M5.5 8h5M5.5 11h3" />
      </>
    )
  },
  {
    href: "/audit",
    label: "Audit",
    icon: (
      <>
        <path d="M4.5 4h8M4.5 8h8M4.5 12h5" />
        <circle cx="2" cy="4" r=".7" fill="currentColor" stroke="none" />
        <circle cx="2" cy="8" r=".7" fill="currentColor" stroke="none" />
        <circle cx="2" cy="12" r=".7" fill="currentColor" stroke="none" />
      </>
    )
  },
  { href: "/admin", label: "Admin", icon: <path d="M8 1.7 13 3.6v3.8c0 3.6-2.3 6.2-5 7-2.7-.8-5-3.4-5-7V3.6Z" /> },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <>
        <circle cx="8" cy="8" r="2.6" />
        <path d="M8 2v1.6M8 12.4V14M14 8h-1.6M3.6 8H2M11.9 4.1l-1.1 1.1M5.2 10.7l-1.1 1.1M11.9 11.9l-1.1-1.1M5.2 5.3 4.1 4.1" />
      </>
    )
  }
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="main-nav" aria-label="Sections">
      {navItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link href={item.href} key={item.href} aria-current={active ? "page" : undefined}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {item.icon}
            </svg>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
