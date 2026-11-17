import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PartnerLanding from '@/components/partner-landing';
import { PARTNERS, getPartner, type Partner } from '@/lib/partners';
import { SITE_NAME, SITE_URL } from '@/lib/site';

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return PARTNERS.map((p) => ({ slug: p.slug }));
}

/** A running campaign sets the page's title and share image so they match the ad. */
const seoFor = (partner: Partner) => partner.campaign?.seo ?? partner.seo;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const partner = getPartner(slug);
  if (!partner) return {};
  const seo = seoFor(partner);
  // One address per page: ?lang= and ad tracking parameters all point back here.
  const path = `/partner/${partner.slug}`;
  const image = { url: seo.image, width: 1200, height: 630, alt: seo.title };
  return {
    title: seo.title,
    description: seo.description,
    alternates: { canonical: path },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: path,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'ms_MY',
      alternateLocale: ['en_MY'],
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.title,
      description: seo.description,
      images: [image.url],
    },
  };
}

const SCHEMA_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const hhmm = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export default async function PartnerPage({ params }: Params) {
  const { slug } = await params;
  const partner = getPartner(slug);
  if (!partner) notFound();

  // Local-business structured data so search engines can show address, hours and phone.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: partner.legalName.includes(partner.name)
      ? partner.legalName
      : `${partner.legalName} (${partner.name})`,
    description: partner.seo.description,
    image: `${SITE_URL}${partner.heroImage.src}`,
    logo: `${SITE_URL}${partner.logo.src}`,
    telephone: partner.phoneE164,
    email: partner.email,
    url: partner.links.website ?? `${SITE_URL}/partner/${partner.slug}`,
    hasMap: partner.links.maps,
    address: {
      '@type': 'PostalAddress',
      streetAddress: partner.address.lines.join(', '),
      postalCode: partner.address.postcode,
      addressLocality: partner.address.city,
      addressRegion: partner.address.state,
      addressCountry: 'MY',
    },
    openingHoursSpecification: partner.hours.flatMap((span, day) =>
      span
        ? [{
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: SCHEMA_DAYS[day],
            opens: hhmm(span[0]),
            closes: hhmm(span[1]),
          }]
        : [],
    ),
    sameAs: [partner.links.facebook, partner.links.tiktok, partner.links.instagram].filter(Boolean),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <PartnerLanding partner={partner} />
    </>
  );
}
