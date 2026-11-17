import type { Metadata } from "next";
import Script from "next/script";
import AppShellWrapper from "../components/app-shell-wrapper";
import { SITE_NAME, SITE_URL } from "../lib/site";
import "./globals.css";

const title = "BYKI — OBD2 Vehicle Diagnostics";
const description = "Browser-based OBD2 vehicle diagnostic scanner powered by Web Bluetooth";
const shareImage = { url: "/og-byki.jpg", width: 1200, height: 630, alt: "BYKI OBD2 vehicle diagnostics" };

export const metadata: Metadata = {
  // Makes relative canonical and share-image paths resolve to full addresses.
  metadataBase: new URL(SITE_URL),
  title,
  description,
  openGraph: { title, description, siteName: SITE_NAME, type: "website", images: [shareImage] },
  twitter: { card: "summary_large_image", title, description, images: [shareImage.url] },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <Script id="gtm" strategy="afterInteractive">
        {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-PQ9W3XGZ');`}
      </Script>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--fg)] antialiased font-sans">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-PQ9W3XGZ"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <AppShellWrapper>{children}</AppShellWrapper>
      </body>
    </html>
  );
}
