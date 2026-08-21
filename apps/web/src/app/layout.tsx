import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greecon Platform",
  description: "Operational platform foundation for Greecon Sh.p.k."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
