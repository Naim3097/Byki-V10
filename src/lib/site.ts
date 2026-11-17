// Public address of the site: used for canonical links, share images,
// robots.txt and the sitemap.
//
// Set NEXT_PUBLIC_SITE_URL to pin it. Otherwise Vercel's production domain is
// used (which follows a custom domain once one is attached), and finally the
// project's vercel.app address.
const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? fromVercel ?? 'https://byki-v10.vercel.app').replace(/\/+$/, '');

export const SITE_NAME = 'BYKI';
