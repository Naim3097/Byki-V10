import type { MetadataRoute } from 'next';
import { PARTNERS } from '@/lib/partners';
import { SITE_URL } from '@/lib/site';

// Pages worth finding in search: the home page, the privacy policy and each
// workshop partner page. App screens (scan, live data, login) are left out.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 },
    ...PARTNERS.map((p) => ({
      url: `${SITE_URL}/partner/${p.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    { url: `${SITE_URL}/privacy`, changeFrequency: 'yearly', priority: 0.2 },
  ];
}
