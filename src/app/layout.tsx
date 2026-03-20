import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppShellWrapper from "../components/app-shell-wrapper";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased font-[family-name:var(--font-inter)]">
        <AppShellWrapper>{children}</AppShellWrapper>
      </body>
    </html>
  );
}
