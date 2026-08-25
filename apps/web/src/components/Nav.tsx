"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="main-nav" aria-label="Sections">
      {navItems.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link href={item.href} key={item.href} aria-current={active ? "page" : undefined}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
