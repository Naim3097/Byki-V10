import type { Metadata } from "next";
import AppShellWrapper from "../components/app-shell-wrapper";
import "./globals.css";

export const metadata: Metadata = {
  title: "BYKI — OBD2 Vehicle Diagnostics",
  description: "Browser-based OBD2 vehicle diagnostic scanner powered by Web Bluetooth",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased font-sans">
        <AppShellWrapper>{children}</AppShellWrapper>
      </body>
    </html>
  );
}
