import type { NextConfig } from "next";
import { withBotId } from "botid/next/config";

// Google Tag Manager and the Google Analytics 4 tag inside the GTM container.
// A tag for another platform (Meta Pixel, TikTok, Google Ads) added in GTM
// needs its own hosts listed here, or the browser will block it.
const GTM = "https://*.googletagmanager.com";
const GA4 = "https://*.google-analytics.com https://*.analytics.google.com";

// The Satoshi brand font (imported in globals.css): its stylesheet is served
// from api.fontshare.com and the font files from cdn.fontshare.com.
const FONT_CSS = "https://api.fontshare.com";
const FONT_FILES = "https://cdn.fontshare.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${GTM}`,
  `style-src 'self' 'unsafe-inline' ${FONT_CSS}`,
  `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com ${GTM} ${GA4}`,
  `font-src 'self' https://fonts.gstatic.com ${FONT_FILES}`,
  `img-src 'self' data: https://*.googleusercontent.com ${GTM} ${GA4}`,
  `frame-src 'self' https://*.firebaseapp.com ${GTM}`,
].join("; ");

// Security headers, carried over from the Firebase Hosting config.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "bluetooth=(self)" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withBotId(nextConfig);
