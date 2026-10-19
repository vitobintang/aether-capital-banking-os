import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AETHER // CAPITAL — Institutional Treasury Operating System",
  description:
    "Dual-view banking & financial OS: real-time multi-currency wealth dashboard, 3D card management, cross-border FX wire engine, fraud risk detection and a native mobile mockup.",
  applicationName: "AETHER // CAPITAL",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
