// ─── BYKI Workshop Partners ──────────────────────────────────────────
// Content for the partner landing pages at /partner/[slug].
// Everything partner-specific (copy, contact details, images) lives here;
// the layout and shared labels live in components/partner-landing.tsx.

export type Lang = 'bm' | 'en';
export type L10n = Record<Lang, string>;

export type SymptomGroup = 'gearbox' | 'aircond' | 'engine' | 'warning' | 'general';

export interface PartnerSymptom {
  id: string;
  group: SymptomGroup;
  label: L10n;
}

export interface PartnerService {
  id: string;
  group: SymptomGroup;
  title: L10n;
  blurb: L10n;
  items: L10n[];
  tags?: string[];
  image?: { src: string; width: number; height: number; kind: 'cutout' | 'photo' };
  featured?: boolean;
  cta: L10n;
}

export interface PartnerPoint {
  title: L10n;
  desc: L10n;
}

/** Rendered label-first: "Full overhaul warranty up to" / "6 months". */
export interface PartnerStat {
  value: L10n;
  label: L10n;
}

type PartnerImage = { src: string; width: number; height: number; alt: L10n };

/**
 * A running offer. While a partner has one, their page leads with it: the hero,
 * the claim steps and form, and every WhatsApp message are about the offer.
 * Delete the `campaign` block to return the page to the standard layout.
 */
export interface PartnerCampaign {
  /** Short id used in tracking events. */
  id: string;
  /** `image` is the 1200x630 share image, as a path under /public. */
  seo: { title: string; description: string; image: string };
  eyebrow: L10n;
  /** Wrap the words to highlight in asterisks, e.g. "Car scanner *PERCUMA* ...". */
  title: L10n;
  sub: L10n;
  cta: L10n;
  ctaShort: L10n;
  bullets: L10n[];
  badge: { top: L10n; bottom: L10n };
  productImage: PartnerImage;
  terms: L10n;
  /** Opening line of every WhatsApp message while the campaign runs. */
  waIntro: L10n;
  explainer: {
    title: L10n;
    sub: L10n;
    benefits: { title: L10n; desc: L10n }[];
    link: L10n;
  };
  photos: { title: L10n; sub: L10n; items: PartnerImage[] };
  claim: {
    title: L10n;
    steps: { title: L10n; desc: L10n }[];
    form: {
      title: L10n;
      sub: L10n;
      carLabel: L10n;
      carPlaceholder: L10n;
      serviceLabel: L10n;
      services: L10n[];
      submit: L10n;
      note: L10n;
    };
  };
  servicesTitle: L10n;
  servicesSub: L10n;
  /** Shown ahead of the partner's standing FAQ. */
  faq: { q: L10n; a: L10n }[];
  finalCta: { title: L10n; sub: L10n };
}

export interface Partner {
  slug: string;
  /** Name customers know the workshop by. */
  name: string;
  /** Registered / trading name. */
  legalName: string;
  /** Short line shown under the name. */
  subtitle: string;
  /** How the WhatsApp greeting addresses the workshop. */
  greetingName: string;
  area: L10n;

  /** Digits only, with country code — used for wa.me links. */
  whatsapp: string;
  phoneE164: string;
  phoneDisplay: string;
  email?: string;
  address: { lines: string[]; postcode: string; city: string; state: string };

  /** Sunday-first week; each day is [openMinute, closeMinute] in Malaysia time, or null when closed. */
  hours: ([number, number] | null)[];

  links: {
    maps: string;
    waze: string;
    googleReviews: string;
    website?: string;
    facebook?: string;
    tiktok?: string;
    instagram?: string;
  };

  /** Public figures captured from the profiles on the date noted — refresh occasionally. */
  proof: {
    asOf: string;
    googleRating: number;
    googleReviews: number;
    tiktokFollowers?: string;
    facebookFollowers?: string;
  };

  logo: { src: string; width: number; height: number };
  affiliationLogo?: { src: string; width: number; height: number; alt: string };
  heroImage: { src: string; width: number; height: number };
  gallery: { src: string; width: number; height: number; alt: L10n }[];

  /** `image` is the 1200x630 share image, as a path under /public. */
  seo: { title: string; description: string; image: string };
  hero: { title: L10n; sub: L10n };
  stats: PartnerStat[];
  symptoms: PartnerSymptom[];
  servicesSub: L10n;
  /** The featured service leads; the next one sits beside it; the rest follow as a row of cards. */
  services: PartnerService[];
  /** Extra offer under the services. `ask` and `field` build its WhatsApp message. */
  banner?: { id: string; title: L10n; desc: L10n; cta: L10n; ask: L10n; field: L10n };
  points: PartnerPoint[];
  steps: { title: L10n; desc: L10n }[];
  proofTitle: L10n;
  faq: { q: L10n; a: L10n }[];
  finalCta: { title: L10n; sub: L10n };
  campaign?: PartnerCampaign;
}

const IMG = '/partners/dseventeen';

const dseventeen: Partner = {
  slug: 'dseventeen',
  name: 'Pakar Gearbox Tampoi',
  legalName: 'DSeventeen Work Motor',
  subtitle: 'DSeventeen Work Motor',
  greetingName: 'DSeventeen',
  area: { bm: 'Tampoi, Johor Bahru', en: 'Tampoi, Johor Bahru' },

  whatsapp: '60197199503',
  phoneE164: '+60197199503',
  phoneDisplay: '019-719 9503',
  email: 'd7teenworkjb@gmail.com',
  address: {
    lines: ['18, Jalan Mangga', 'Taman Tampoi'],
    postcode: '81200',
    city: 'Johor Bahru',
    state: 'Johor',
  },

  // Mon–Sat 9:30am–6:30pm, closed Sunday (per the Google Business Profile).
  hours: [null, [570, 1110], [570, 1110], [570, 1110], [570, 1110], [570, 1110], [570, 1110]],

  links: {
    maps: 'https://maps.google.com/?cid=11913601188609467370',
    waze: 'https://waze.com/ul?q=DSEVENTEEN%20WORK%20MOTOR%20(PAKAR%20GEARBOX%20TAMPOI)&navigate=yes',
    googleReviews: 'https://share.google/7YnwveTpgKShaN0Fc',
    website: 'https://dseventeen.com/',
    facebook: 'https://www.facebook.com/p/Pakar-Gearbox-Tampoi-61556944482962/',
    tiktok: 'https://www.tiktok.com/@d7teenworkjb',
    instagram: 'https://www.instagram.com/pakargearboxtampoi/',
  },

  proof: {
    asOf: '2026-11-17',
    googleRating: 4.8,
    googleReviews: 63,
    tiktokFollowers: '22K+',
    facebookFollowers: '3K+',
  },

  logo: { src: `${IMG}/logo-d7teen.png`, width: 400, height: 314 },
  affiliationLogo: {
    src: `${IMG}/logo-jv-autolube.png`,
    width: 539,
    height: 251,
    alt: 'JV Auto Lube',
  },
  heroImage: { src: `${IMG}/workshop-lifts.webp`, width: 1400, height: 1050 },
  gallery: [
    {
      src: `${IMG}/team-gearbox.webp`,
      width: 600,
      height: 361,
      alt: {
        bm: 'Mekanik DSeventeen membaik pulih gearbox',
        en: 'DSeventeen mechanics rebuilding a gearbox',
      },
    },
    {
      src: `${IMG}/workshop-floor.webp`,
      width: 720,
      height: 1280,
      alt: { bm: 'Ruang kerja bengkel di Tampoi', en: 'The workshop floor in Tampoi' },
    },
    {
      src: `${IMG}/svc-torque.webp`,
      width: 680,
      height: 453,
      alt: { bm: 'Torque converter sedang diperiksa', en: 'A torque converter being inspected' },
    },
  ],

  // Campaign: a free BYKI OBD2 car scanner with a service at DSeventeen.
  // Qualifying services, dates and stock limits were not specified when this was
  // written, so the copy stays general and points to the workshop for terms.
  campaign: {
    id: 'free-car-scanner',
    seo: {
      title: 'Car Scanner Percuma Bila Servis di DSeventeen, Johor Bahru',
      description:
        'Servis kereta di DSeventeen (Pakar Gearbox Tampoi), Johor Bahru dan dapatkan car scanner BYKI OBD2 percuma. Gearbox, enjin, aircond dan servis berkala.',
      image: `${IMG}/og-free-car-scanner.jpg`,
    },
    eyebrow: { bm: 'Promosi DSeventeen × BYKI · Johor Bahru', en: 'DSeventeen × BYKI offer · Johor Bahru' },
    title: {
      bm: 'Car scanner *PERCUMA* bila servis kereta di DSeventeen.',
      en: 'A *FREE* car scanner when you service your car at DSeventeen.',
    },
    sub: {
      bm: 'BYKI OBD2 ialah alat kecil yang dipasang pada kereta dan disambung ke telefon. Ia tunjuk kesihatan enjin dan terangkan lampu check engine dalam bahasa mudah.',
      en: "BYKI OBD2 is a small device that plugs into your car and connects to your phone. It shows your engine's health and explains a check-engine light in plain language.",
    },
    cta: { bm: 'Tuntut car scanner percuma', en: 'Claim my free car scanner' },
    ctaShort: { bm: 'Tuntut percuma', en: 'Claim free scanner' },
    bullets: [
      { bm: 'BYKI OBD2 percuma dengan servis di DSeventeen', en: 'BYKI OBD2 free with a service at DSeventeen' },
      { bm: 'Pemeriksaan & diagnosis awal percuma', en: 'Free initial inspection & diagnosis' },
      { bm: 'Sebut harga jelas sebelum kerja bermula', en: 'Clear quote before any work starts' },
    ],
    badge: { top: { bm: 'PERCUMA', en: 'FREE' }, bottom: { bm: 'dengan servis', en: 'with a service' } },
    productImage: {
      src: '/brand/obdii.png',
      width: 1169,
      height: 796,
      alt: { bm: 'Car scanner BYKI OBD2 dan aplikasi BYKI di telefon', en: 'The BYKI OBD2 car scanner and the BYKI app on a phone' },
    },
    terms: {
      bm: 'Tertakluk pada terma & syarat. Tanya bengkel servis yang layak semasa WhatsApp.',
      en: 'Terms and conditions apply. Ask the workshop which services qualify when you WhatsApp.',
    },
    waIntro: {
      bm: 'Hi DSeventeen, saya nak tuntut car scanner percuma (BYKI OBD2) dengan servis kereta.',
      en: "Hi DSeventeen, I'd like to claim the free car scanner (BYKI OBD2) with a car service.",
    },

    explainer: {
      title: { bm: 'Apa fungsi car scanner ini', en: 'What the car scanner does' },
      sub: {
        bm: 'Ia dipasang pada port OBD2 di bawah dashboard dan disambung ke telefon melalui Bluetooth.',
        en: 'It plugs into the OBD2 port under the dashboard and connects to your phone over Bluetooth.',
      },
      benefits: [
        {
          title: { bm: 'Baca kod lampu check engine', en: 'Read check-engine codes' },
          desc: {
            bm: 'Scanner baca kod kerosakan dan terangkan maksudnya dalam bahasa mudah.',
            en: 'The scanner reads the fault code and explains what it means in plain language.',
          },
        },
        {
          title: { bm: 'Semak kesihatan kereta', en: "Check your car's health" },
          desc: {
            bm: 'Skor kesihatan kereta dipaparkan di telefon.',
            en: 'A car health score shown on your phone.',
          },
        },
        {
          title: { bm: 'Tahu masalah sebelum ke bengkel', en: 'Know the problem before the workshop' },
          desc: {
            bm: 'Anda tahu apa masalahnya sebelum bincang harga.',
            en: 'You know what is wrong before discussing price.',
          },
        },
        {
          title: { bm: 'Kesan masalah awal', en: 'Catch problems early' },
          desc: {
            bm: 'Masalah kecil dikesan sebelum jadi pembaikan yang mahal.',
            en: 'Small issues are spotted before they become expensive repairs.',
          },
        },
      ],
      link: { bm: 'Lihat cara BYKI berfungsi', en: 'See how BYKI works' },
    },

    photos: {
      title: { bm: 'Pemandu dengan BYKI OBD2', en: 'Drivers with the BYKI OBD2' },
      sub: { bm: 'Alat ini muat dalam tapak tangan.', en: 'The device fits in the palm of your hand.' },
      items: [
        { src: `${IMG}/customers/byki-driver-1.webp`, width: 720, height: 900, alt: { bm: 'Pemandu memegang BYKI OBD2 di dalam kereta', en: 'A driver holding the BYKI OBD2 in his car' } },
        { src: `${IMG}/customers/byki-driver-2.webp`, width: 720, height: 900, alt: { bm: 'Pemandu menunjukkan BYKI di telefon bersama alat OBD2', en: 'A driver showing BYKI on his phone with the OBD2 device' } },
        { src: `${IMG}/customers/byki-driver-3.webp`, width: 720, height: 900, alt: { bm: 'Pemandu memegang BYKI OBD2 di tempat duduk pemandu', en: 'A driver holding the BYKI OBD2 in the driver seat' } },
        { src: `${IMG}/customers/byki-driver-4.webp`, width: 720, height: 900, alt: { bm: 'Pemandu memegang BYKI OBD2 di sebelah keretanya', en: 'A driver holding the BYKI OBD2 beside his car' } },
        { src: `${IMG}/customers/byki-driver-5.webp`, width: 720, height: 900, alt: { bm: 'Pemandu memegang BYKI OBD2', en: 'A driver holding the BYKI OBD2' } },
        { src: `${IMG}/customers/byki-driver-6.webp`, width: 720, height: 900, alt: { bm: 'Pemandu memegang BYKI OBD2 di dalam kereta', en: 'A driver holding the BYKI OBD2 in his car' } },
      ],
    },

    claim: {
      title: { bm: 'Cara tuntut', en: 'How to claim' },
      steps: [
        {
          title: { bm: 'WhatsApp DSeventeen', en: 'WhatsApp DSeventeen' },
          desc: {
            bm: 'Beritahu model kereta dan servis yang anda perlukan.',
            en: 'Tell them your car model and the service you need.',
          },
        },
        {
          title: { bm: 'Servis kereta di Tampoi', en: 'Service your car in Tampoi' },
          desc: {
            bm: 'Pemeriksaan awal percuma, dan harga dipersetujui sebelum kerja bermula.',
            en: 'The initial inspection is free, and the price is agreed before work starts.',
          },
        },
        {
          title: { bm: 'Bawa balik BYKI OBD2', en: 'Take home your BYKI OBD2' },
          desc: {
            bm: 'Car scanner anda, percuma dengan servis.',
            en: 'Your car scanner, free with your service.',
          },
        },
      ],
      form: {
        title: { bm: 'Tuntut car scanner percuma anda', en: 'Claim your free car scanner' },
        sub: {
          bm: 'Isi dua perkara ini. WhatsApp akan terbuka dengan mesej siap ditulis untuk DSeventeen.',
          en: 'Fill in these two things. WhatsApp opens with a message already written for DSeventeen.',
        },
        carLabel: { bm: 'Model kereta', en: 'Car model' },
        carPlaceholder: { bm: 'cth. Perodua Myvi 2018', en: 'e.g. Perodua Myvi 2018' },
        serviceLabel: { bm: 'Servis yang diperlukan', en: 'Service needed' },
        services: [
          { bm: 'Servis berkala (minyak hitam)', en: 'Regular service (engine oil)' },
          { bm: 'Gearbox', en: 'Gearbox' },
          { bm: 'Aircond', en: 'Air-cond' },
          { bm: 'Enjin', en: 'Engine' },
          { bm: 'Suspension / brek', en: 'Suspension / brakes' },
          { bm: 'Belum pasti, nak periksa dulu', en: 'Not sure yet, inspect first' },
        ],
        submit: { bm: 'Hantar di WhatsApp', en: 'Send on WhatsApp' },
        note: {
          bm: 'Maklumat ini hanya dihantar kepada DSeventeen melalui WhatsApp anda. Tiada apa disimpan di laman ini.',
          en: 'This is sent only to DSeventeen through your own WhatsApp. Nothing is stored on this page.',
        },
      },
    },

    servicesTitle: { bm: 'Servis di DSeventeen', en: 'Services at DSeventeen' },
    servicesSub: {
      bm: 'WhatsApp bengkel untuk servis yang anda perlukan dan tanya tentang car scanner percuma.',
      en: 'WhatsApp the workshop for the service you need and ask about the free car scanner.',
    },

    faq: [
      {
        q: { bm: 'Betul ke car scanner ni percuma?', en: 'Is the car scanner really free?' },
        a: {
          bm: 'Ya. BYKI OBD2 diberi percuma apabila anda servis kereta di DSeventeen Work Motor. Tertakluk pada terma & syarat, jadi tanya bengkel servis yang layak semasa WhatsApp.',
          en: 'Yes. The BYKI OBD2 is given free when you service your car at DSeventeen Work Motor. Terms and conditions apply, so ask the workshop which services qualify when you WhatsApp.',
        },
      },
      {
        q: { bm: 'Apa itu BYKI OBD2?', en: 'What is BYKI OBD2?' },
        a: {
          bm: 'Alat kecil yang dipasang pada port OBD2 kereta, biasanya di bawah dashboard. Ia bersambung ke telefon melalui Bluetooth, dan BYKI menunjukkan kesihatan kereta serta menerangkan kod kerosakan dalam bahasa mudah.',
          en: "A small device that plugs into your car's OBD2 port, usually under the dashboard. It connects to your phone over Bluetooth, and BYKI shows your car's health and explains fault codes in plain language.",
        },
      },
      {
        q: { bm: 'Kereta saya boleh guna?', en: 'Will it work with my car?' },
        a: {
          bm: 'Kebanyakan kereta moden ada port OBD2. Tak pasti? Beritahu model kereta anda di WhatsApp dan bengkel akan semak.',
          en: 'Most modern cars have an OBD2 port. Not sure? Tell the workshop your car model on WhatsApp and they will check.',
        },
      },
      {
        q: { bm: 'Telefon apa yang boleh guna?', en: 'Which phones does it work with?' },
        a: {
          bm: 'Buat masa ini BYKI berjalan dalam pelayar Chrome atau Edge pada telefon Android yang ada Bluetooth. Aplikasi BYKI untuk iOS & Android akan datang.',
          en: 'For now BYKI runs in the Chrome or Edge browser on Android phones with Bluetooth. BYKI apps for iOS and Android are coming.',
        },
      },
    ],

    finalCta: {
      title: { bm: 'Tuntut car scanner percuma', en: 'Claim your free car scanner' },
      sub: {
        bm: 'WhatsApp DSeventeen untuk tempah slot servis.',
        en: 'WhatsApp DSeventeen to book a service slot.',
      },
    },
  },

  seo: {
    title: 'Pakar Gearbox Tampoi, Johor Bahru | DSeventeen Work Motor',
    description:
      'Baik pulih gearbox, enjin dan aircond di Tampoi, Johor Bahru. Pemeriksaan percuma, sebut harga jelas, waranti overhaul hingga 6 bulan.',
    image: `${IMG}/og.jpg`,
  },

  hero: {
    title: {
      bm: 'Pakar gearbox di Tampoi, Johor Bahru.',
      en: 'Gearbox specialists in Tampoi, Johor Bahru.',
    },
    sub: {
      bm: 'DSeventeen Work Motor membaiki gearbox, enjin dan aircond, serta servis berkala. Pemeriksaan percuma, dan sebut harga jelas sebelum kerja bermula.',
      en: 'DSeventeen Work Motor repairs gearboxes, engines and air-cond, and handles regular servicing. Inspection is free, and you get a clear quote before any work starts.',
    },
  },

  stats: [
    {
      value: { bm: 'RM0', en: 'RM0' },
      label: { bm: 'Pemeriksaan & diagnosis awal', en: 'Initial inspection & diagnosis' },
    },
    {
      value: { bm: '6 bulan', en: '6 months' },
      label: { bm: 'Waranti full overhaul hingga', en: 'Full overhaul warranty up to' },
    },
    {
      value: { bm: '2019', en: '2019' },
      label: { bm: 'Beroperasi di Johor sejak', en: 'Serving Johor since' },
    },
  ],

  symptoms: [
    { id: 'jerk', group: 'gearbox', label: { bm: 'Gear tersentak (jerking)', en: 'Gear jerks when shifting' } },
    { id: 'slip', group: 'gearbox', label: { bm: 'Lambat masuk gear / slip', en: 'Slow to engage or slipping' } },
    { id: 'reverse', group: 'gearbox', label: { bm: 'Reverse tak masuk', en: "Reverse won't engage" } },
    { id: 'leak', group: 'gearbox', label: { bm: 'Minyak gearbox bocor', en: 'Gearbox oil leaking' } },
    { id: 'ac-warm', group: 'aircond', label: { bm: 'Aircond tak sejuk', en: 'Air-cond not cold' } },
    { id: 'ac-noise', group: 'aircond', label: { bm: 'Aircond berbunyi / berbau', en: 'Air-cond noisy or smelly' } },
    { id: 'cel', group: 'engine', label: { bm: 'Lampu check engine menyala', en: 'Check-engine light is on' } },
    { id: 'heat', group: 'engine', label: { bm: 'Enjin cepat panas / bergegar', en: 'Engine overheating or shaking' } },
    { id: 'knock', group: 'general', label: { bm: 'Bunyi dari suspension / brek', en: 'Noise from suspension or brakes' } },
    { id: 'service', group: 'general', label: { bm: 'Dah sampai masa servis', en: 'Due for a service' } },
  ],

  servicesSub: {
    bm: 'Satu bengkel untuk gearbox, enjin, aircond dan servis harian.',
    en: 'One workshop for gearbox, engine, air-cond and everyday servicing.',
  },

  services: [
    {
      id: 'gearbox',
      group: 'gearbox',
      featured: true,
      title: { bm: 'Gearbox & Transmisi', en: 'Gearbox & Transmission' },
      blurb: {
        bm: 'Panel Pakar Gearbox berdaftar JV Auto Lube untuk Johor. Automatik, CVT dan DSG.',
        en: 'Registered JV Auto Lube gearbox panel for Johor. Automatic, CVT and DSG.',
      },
      tags: ['ATF', 'CVT', 'DSG'],
      items: [
        { bm: 'Diagnostik & ujian jalan', en: 'Diagnostics & road test' },
        { bm: 'Overhaul gearbox', en: 'Gearbox overhaul' },
        { bm: 'Flushing minyak ATF, CVT & DSG', en: 'ATF, CVT & DSG fluid flushing' },
        { bm: 'Baik pulih valve body & solenoid', en: 'Valve body & solenoid repair' },
        { bm: 'Mechatronics (DSG & CVT)', en: 'Mechatronics (DSG & CVT)' },
        { bm: 'Reset ECU & TCU', en: 'ECU & TCU reset' },
      ],
      image: { src: `${IMG}/cutout-gearbox.webp`, width: 900, height: 484, kind: 'cutout' },
      cta: { bm: 'Tanya harga gearbox', en: 'Ask for a gearbox quote' },
    },
    {
      id: 'aircond',
      group: 'aircond',
      title: { bm: 'Aircond', en: 'Air-cond' },
      blurb: {
        bm: 'Untuk aircond tak sejuk, berbunyi atau berbau. Punca diperiksa dahulu sebelum alat ganti ditukar.',
        en: 'For air-cond that is not cold, noisy or smelly. The cause is checked before any part is replaced.',
      },
      items: [
        { bm: 'Servis kompresor', en: 'Compressor service' },
        { bm: 'Isi gas & semak kebocoran', en: 'Gas top-up & leak check' },
        { bm: 'Cooling coil & filter dryer', en: 'Cooling coil & filter dryer' },
        { bm: 'Expansion valve', en: 'Expansion valve' },
        { bm: 'Kipas kondenser & blower', en: 'Condenser fan & blower' },
      ],
      image: { src: `${IMG}/cutout-aircond.webp`, width: 900, height: 533, kind: 'cutout' },
      cta: { bm: 'Tanya harga aircond', en: 'Ask for an air-cond quote' },
    },
    {
      id: 'engine',
      group: 'engine',
      title: { bm: 'Enjin', en: 'Engine' },
      blurb: {
        bm: 'Lampu check engine, enjin bergegar atau cepat panas diperiksa dengan alat imbasan OBD.',
        en: 'A check-engine light, rough running or overheating is checked with OBD scan tools.',
      },
      items: [
        { bm: 'Diagnosis lampu check engine', en: 'Check-engine light diagnosis' },
        { bm: 'Servis & baik pulih enjin', en: 'Engine service & repair' },
        { bm: 'Kerja overhaul', en: 'Overhaul work' },
      ],
      image: { src: `${IMG}/workshop-civic.webp`, width: 900, height: 1200, kind: 'photo' },
      cta: { bm: 'Tanya tentang enjin', en: 'Ask about engine work' },
    },
    {
      id: 'servicing',
      group: 'general',
      title: { bm: 'Servis Berkala', en: 'Regular Servicing' },
      blurb: {
        bm: 'Servis berkala mengikut jadual.',
        en: 'Routine servicing on schedule.',
      },
      items: [
        { bm: 'Minyak hitam & oil filter', en: 'Engine oil & oil filter' },
        { bm: 'Auto filter', en: 'Transmission (auto) filter' },
        { bm: 'Pelincir JV Auto Lube', en: 'JV Auto Lube lubricants' },
      ],
      image: { src: `${IMG}/svc-oil.webp`, width: 900, height: 600, kind: 'photo' },
      cta: { bm: 'Tempah servis', en: 'Book a service' },
    },
    {
      id: 'undercarriage',
      group: 'general',
      title: { bm: 'Suspension, Brek & Driveshaft', en: 'Suspension, Brakes & Driveshaft' },
      blurb: {
        bm: 'Untuk bunyi ketuk, stereng bergegar atau brek kurang makan.',
        en: 'For knocking sounds, a shaky steering wheel or weak brakes.',
      },
      items: [
        { bm: 'Suspension', en: 'Suspension' },
        { bm: 'Brek', en: 'Brakes' },
        { bm: 'Driveshaft', en: 'Driveshaft' },
      ],
      image: { src: `${IMG}/workshop-bays.webp`, width: 1400, height: 1050, kind: 'photo' },
      cta: { bm: 'Tanya tentang kerja ini', en: 'Ask about this work' },
    },
  ],

  banner: {
    id: 'door-to-door',
    ask: {
      bm: 'Saya nak tanya tentang servis rumah ke rumah.',
      en: "I'd like to ask about door-to-door service.",
    },
    field: { bm: 'Kawasan: ', en: 'Area: ' },
    title: { bm: 'Servis rumah ke rumah', en: 'Door-to-door service' },
    desc: {
      bm: 'DSeventeen ada servis rumah ke rumah. WhatsApp untuk semak kawasan dan jenis kerja yang boleh dibuat.',
      en: 'DSeventeen offers door-to-door service. WhatsApp them to check the areas covered and what can be done on site.',
    },
    cta: { bm: 'Tanya servis ke rumah', en: 'Ask about door-to-door' },
  },

  points: [
    {
      title: { bm: 'Pemeriksaan percuma', en: 'Free inspection' },
      desc: {
        bm: 'Diagnosis awal tanpa caj untuk kenal pasti masalah.',
        en: 'Initial diagnosis at no charge to pin down the problem.',
      },
    },
    {
      title: { bm: 'Diagnosis tepat', en: 'Accurate diagnosis' },
      desc: {
        bm: 'Menggunakan alat imbasan OBD.',
        en: 'Uses OBD scan tools.',
      },
    },
    {
      title: { bm: 'Sebut harga jelas', en: 'Clear quotes' },
      desc: {
        bm: 'Harga dipersetujui dahulu. Tiada caj tersembunyi.',
        en: 'The price is agreed first. No hidden charges.',
      },
    },
    {
      title: { bm: 'Waranti hingga 6 bulan', en: "Up to 6 months' warranty" },
      desc: {
        bm: 'Jaminan servis untuk kerja full overhaul.',
        en: 'Service warranty on full overhaul jobs.',
      },
    },
    {
      title: { bm: 'Mekanik berpengalaman', en: 'Experienced mechanics' },
      desc: {
        bm: 'Pasukan pakar gearbox yang beroperasi sejak 2019.',
        en: 'A specialist gearbox team operating since 2019.',
      },
    },
    {
      title: { bm: 'Panel JV Auto Lube', en: 'JV Auto Lube panel' },
      desc: {
        bm: 'Kerja mengikut piawaian panel Pakar Gearbox JV Auto Lube.',
        en: 'Work follows the JV Auto Lube gearbox panel standards.',
      },
    },
  ],

  steps: [
    {
      title: { bm: 'WhatsApp bengkel', en: 'Message the workshop' },
      desc: {
        bm: 'Ceritakan masalah dan model kereta anda.',
        en: 'Tell them the problem and your car model.',
      },
    },
    {
      title: { bm: 'Pemeriksaan percuma', en: 'Free inspection' },
      desc: {
        bm: 'Bawa kereta untuk diagnosis awal tanpa caj.',
        en: 'Bring the car in for a no-charge initial diagnosis.',
      },
    },
    {
      title: { bm: 'Sebut harga jelas', en: 'Clear quote' },
      desc: {
        bm: 'Anda setuju dengan harga sebelum kerja bermula.',
        en: 'You agree on the price before work starts.',
      },
    },
    {
      title: { bm: 'Baiki & waranti', en: 'Repair & warranty' },
      desc: {
        bm: 'Kereta dibaiki. Full overhaul ada waranti hingga 6 bulan.',
        en: "The car is fixed. Full overhauls carry up to 6 months' warranty.",
      },
    },
  ],

  proofTitle: { bm: 'Ulasan dan media sosial', en: 'Reviews and social media' },

  finalCta: {
    title: { bm: 'Dapatkan pemeriksaan percuma', en: 'Get a free inspection' },
    sub: {
      bm: 'WhatsApp bengkel sekarang. Beritahu model kereta dan masalahnya, dan tempah slot pemeriksaan.',
      en: 'WhatsApp the workshop now. Tell them your car model and the problem, and book an inspection slot.',
    },
  },

  faq: [
    {
      q: { bm: 'Betul ke pemeriksaan percuma?', en: 'Is the inspection really free?' },
      a: {
        bm: 'Ya. Diagnosis awal untuk kenal pasti masalah adalah tanpa caj. Sebut harga pembaikan dibincang dan dipersetujui bersama sebelum kerja bermula.',
        en: 'Yes. The initial diagnosis to identify the problem is free of charge. The repair quote is discussed and agreed with you before any work starts.',
      },
    },
    {
      q: { bm: 'Gearbox jenis apa yang dibaiki?', en: 'Which gearbox types do they repair?' },
      a: {
        bm: 'Automatik (ATF), CVT dan DSG, termasuk overhaul, valve body, solenoid dan mechatronics.',
        en: 'Automatic (ATF), CVT and DSG, including overhauls, valve body, solenoid and mechatronics work.',
      },
    },
    {
      q: { bm: 'Ada waranti?', en: 'Is there a warranty?' },
      a: {
        bm: 'Ada. Kerja full overhaul dilindungi jaminan servis sehingga 6 bulan. Tanya bengkel untuk terma penuh.',
        en: 'Yes. Full overhaul jobs carry a service warranty of up to 6 months. Ask the workshop for the full terms.',
      },
    },
    {
      q: { bm: 'Perlu buat temujanji?', en: 'Do I need an appointment?' },
      a: {
        bm: 'Digalakkan. WhatsApp bengkel untuk tempah slot pemeriksaan supaya kereta anda dapat dilihat terus apabila sampai.',
        en: 'It is recommended. WhatsApp the workshop to book an inspection slot so your car can be seen as soon as you arrive.',
      },
    },
    {
      q: { bm: 'Boleh bengkel datang ke rumah?', en: 'Can the workshop come to me?' },
      a: {
        bm: 'Servis rumah ke rumah ada ditawarkan. WhatsApp bengkel untuk semak kawasan dan jenis kerja yang boleh dibuat.',
        en: 'Door-to-door service is offered. WhatsApp the workshop to check the areas covered and what work can be done on site.',
      },
    },
    {
      q: { bm: 'Apa kaitan BYKI dengan bengkel ini?', en: 'How is BYKI connected to this workshop?' },
      a: {
        bm: 'BYKI ialah aplikasi diagnostik kereta. DSeventeen Work Motor ialah rakan bengkel BYKI di Johor Bahru. Anda boleh scan kereta dengan BYKI, kemudian bawa laporan ke bengkel. Semua kerja, harga dan waranti adalah antara anda dan bengkel.',
        en: "BYKI is a car diagnostics app. DSeventeen Work Motor is BYKI's workshop partner in Johor Bahru. You can scan your car with BYKI, then take the report to the workshop. All work, pricing and warranty are between you and the workshop.",
      },
    },
  ],
};

const MNA_IMG = '/partners/mna-dynamic-torque';

const mna: Partner = {
  slug: 'mna-dynamic-torque',
  name: 'MNA Dynamic Torque',
  legalName: 'MNA Dynamic Torque – Pro Transmission',
  subtitle: 'Pro Transmission · CVT & Auto',
  greetingName: 'MNA Dynamic Torque',
  area: { bm: 'Alam Impian, Shah Alam', en: 'Alam Impian, Shah Alam' },

  whatsapp: '601111741442',
  phoneE164: '+601111741442',
  phoneDisplay: '011-1174 1442',
  address: {
    lines: ['No 13, Jalan Tok Janggut H35/H', 'Alam Impian'],
    postcode: '40470',
    city: 'Shah Alam',
    state: 'Selangor',
  },

  // Mon–Sat 10am–6pm, closed Sunday (per the Google Business Profile).
  hours: [null, [600, 1080], [600, 1080], [600, 1080], [600, 1080], [600, 1080], [600, 1080]],

  // No `website` link: mnadynamictorque.my still showed placeholder phone and
  // address details when this page was written (2026-11-17).
  links: {
    maps: 'https://maps.google.com/?cid=10768171555483465123',
    waze: 'https://waze.com/ul?ll=3.0148089,101.4992069&navigate=yes',
    googleReviews: 'https://share.google/fXBkncYjz9Gkwlqw9',
    facebook: 'https://www.facebook.com/share/18cpCsJAQT/',
    instagram: 'https://www.instagram.com/mnadynamictorque.my/',
  },

  proof: {
    asOf: '2026-11-17',
    googleRating: 5.0,
    googleReviews: 9,
  },

  logo: { src: `${MNA_IMG}/logo-mna.png`, width: 520, height: 255 },
  heroImage: { src: `${MNA_IMG}/workshop-exterior.webp`, width: 1280, height: 960 },
  gallery: [
    {
      src: `${MNA_IMG}/bench.webp`,
      width: 1280,
      height: 960,
      alt: {
        bm: 'Komponen gearbox disusun di meja kerja MNA',
        en: 'Gearbox components laid out on the MNA workbench',
      },
    },
    {
      src: `${MNA_IMG}/overhaul-kit.webp`,
      width: 900,
      height: 1200,
      alt: { bm: 'Overhaul kit dan alat ganti MNA', en: 'MNA overhaul kit and parts' },
    },
    {
      src: `${MNA_IMG}/pulleys.webp`,
      width: 900,
      height: 1200,
      alt: { bm: 'Barisan pulley CVT di bengkel', en: 'A row of CVT pulleys in the workshop' },
    },
  ],

  seo: {
    title: 'Pakar Gearbox CVT & Automatik Shah Alam | MNA Dynamic Torque',
    description:
      'Pakar gearbox CVT, automatik dan DSG di Alam Impian, Shah Alam. Diagnostik dahulu, sebut harga bertulis, waranti kerja 6 bulan.',
    image: `${MNA_IMG}/og.jpg`,
  },

  hero: {
    title: {
      bm: 'CVT sentap, slip atau delay? Jumpa pakar transmisi di Shah Alam.',
      en: 'CVT jerking, slip or delay? See the transmission specialists in Shah Alam.',
    },
    sub: {
      bm: 'MNA Dynamic Torque hanya membaiki gearbox: CVT, automatik dan DSG. Kerosakan dibuktikan dengan diagnostik dahulu, sebut harga bertulis sebelum kerja bermula, dan waranti kerja 6 bulan.',
      en: 'MNA Dynamic Torque works on gearboxes only: CVT, automatic and DSG. The fault is proven with diagnostics first, you get a written quote before work starts, and repairs carry a 6-month workmanship warranty.',
    },
  },

  stats: [
    {
      value: { bm: '6 bulan', en: '6 months' },
      label: { bm: 'Waranti kerja pembaikan & rebuild', en: 'Workmanship warranty on repairs & rebuilds' },
    },
    {
      value: { bm: 'Percuma', en: 'Free' },
      label: { bm: 'Perundingan & sebut harga', en: 'Consultation & quote' },
    },
    {
      value: { bm: 'CVT & Auto', en: 'CVT & Auto' },
      label: { bm: 'Kepakaran', en: 'Specialises in' },
    },
  ],

  symptoms: [
    { id: 'sentap-start', group: 'gearbox', label: { bm: 'Sentap masa mula bergerak', en: 'Jerking when pulling away' } },
    { id: 'slip', group: 'gearbox', label: { bm: 'RPM naik, kereta tak laju (slip)', en: 'RPM rises but the car is slow (slip)' } },
    { id: 'sentap-shift', group: 'gearbox', label: { bm: 'Sentap masa tukar gear', en: 'Jerking on gear changes' } },
    { id: 'delay-engage', group: 'gearbox', label: { bm: 'Delay masuk D atau R', en: 'Delay engaging D or R' } },
    { id: 'delay-throttle', group: 'gearbox', label: { bm: 'Delay bila tekan minyak', en: 'Delay when you accelerate' } },
    { id: 'light', group: 'warning', label: { bm: 'Lampu amaran / D berkelip', en: 'Warning light or flashing D' } },
    { id: 'whine', group: 'gearbox', label: { bm: 'Bunyi berdengung dari gearbox', en: 'Whining noise from the gearbox' } },
    { id: 'leak', group: 'gearbox', label: { bm: 'Minyak gearbox bocor', en: 'Gearbox oil leaking' } },
    { id: 'fluid', group: 'general', label: { bm: 'Masa tukar minyak gearbox', en: 'Gearbox fluid change is due' } },
    { id: 'buying', group: 'general', label: { bm: 'Nak beli kereta CVT terpakai', en: 'Buying a used CVT car' } },
  ],

  servicesSub: {
    bm: 'Bengkel ini hanya membaiki transmisi: CVT, automatik dan DSG.',
    en: 'This workshop only works on transmissions: CVT, automatic and DSG.',
  },

  services: [
    {
      id: 'cvt',
      group: 'gearbox',
      featured: true,
      title: { bm: 'Baiki & Rebuild CVT', en: 'CVT Repair & Rebuild' },
      blurb: {
        bm: 'Punca sentap, slip dan delay dikesan dahulu, kemudian gearbox dibaiki atau dibina semula mengikut spesifikasi.',
        en: 'The cause of jerking, slip and delay is traced first, then the gearbox is repaired or fully rebuilt to spec.',
      },
      tags: ['Proton', 'Perodua', 'Honda', 'Nissan', 'Toyota', 'Mitsubishi'],
      items: [
        { bm: 'Belt / rantai CVT', en: 'CVT belt / chain' },
        { bm: 'Pulley & variator', en: 'Pulleys & variator' },
        { bm: 'Valve body & solenoid', en: 'Valve body & solenoids' },
        { bm: 'Bearing', en: 'Bearings' },
        { bm: 'Baiki sentap & slip', en: 'Jerking & slip fixes' },
        { bm: 'Alat ganti tulen & gred OEM', en: 'Genuine & OEM-grade parts' },
      ],
      image: { src: `${MNA_IMG}/rebuild-clutch.webp`, width: 960, height: 1280, kind: 'photo' },
      cta: { bm: 'Tanya harga baiki CVT', en: 'Ask for a CVT repair quote' },
    },
    {
      id: 'diagnostic',
      group: 'warning',
      title: { bm: 'Diagnostik 3D & Imbasan Kod', en: '3D Diagnostic & Code Scan' },
      blurb: {
        bm: 'Data langsung dibaca dan dipetakan pada model 3D gearbox, supaya anda nampak apa yang berlaku di dalam.',
        en: 'Live data is read and mapped onto a 3D model of the gearbox, so you can see what is happening inside.',
      },
      items: [
        { bm: 'Tekanan, nisbah & belt slip', en: 'Pressures, ratio & belt slip' },
        { bm: 'Arus solenoid', en: 'Solenoid currents' },
        { bm: 'Bacaan kod kerosakan (DTC)', en: 'Fault-code (DTC) read' },
        { bm: 'Punca sentap & delay dikesan', en: 'Cause of jerking & delay traced' },
        { bm: 'Penerangan dalam bahasa mudah', en: 'Plain-language explanation' },
      ],
      cta: { bm: 'Tempah diagnostik', en: 'Book a diagnostic' },
    },
    {
      id: 'automatic',
      group: 'gearbox',
      title: { bm: 'Automatik, DSG & DCT', en: 'Automatic, DSG & DCT' },
      blurb: {
        bm: 'Transmisi automatik konvensional, dwi-klac dan kereta continental turut dibaiki.',
        en: 'Conventional automatics, dual-clutch units and continental cars are repaired too.',
      },
      items: [
        { bm: 'Overhaul transmisi automatik', en: 'Automatic transmission overhaul' },
        { bm: 'DSG / DCT', en: 'DSG / DCT' },
        { bm: 'Automatik continental', en: 'Continental automatics' },
      ],
      image: { src: `${MNA_IMG}/gearset.webp`, width: 1280, height: 960, kind: 'photo' },
      cta: { bm: 'Tanya harga overhaul', en: 'Ask for an overhaul quote' },
    },
    {
      id: 'fluid',
      group: 'general',
      title: { bm: 'Servis Minyak CVT & ATF', en: 'CVT & ATF Fluid Service' },
      blurb: {
        bm: 'Minyak yang betul, ditukar pada masanya, dengan flush penuh.',
        en: 'The correct fluid, changed on time, with a full flush.',
      },
      items: [
        { bm: 'Tukar minyak CVT', en: 'CVT fluid change' },
        { bm: 'Tukar minyak ATF', en: 'ATF change' },
        { bm: 'Flush penuh', en: 'Full flush' },
      ],
      image: { src: `${MNA_IMG}/teardown.webp`, width: 1072, height: 800, kind: 'photo' },
      cta: { bm: 'Tempah servis minyak', en: 'Book a fluid service' },
    },
    {
      id: 'prepurchase',
      group: 'general',
      title: { bm: 'Pemeriksaan Sebelum Beli', en: 'Pre-Purchase Inspection' },
      blurb: {
        bm: 'Untuk pembeli kereta CVT terpakai. Gearbox diperiksa sebelum anda beli.',
        en: 'For buyers of used CVT cars. The gearbox is inspected before you buy.',
      },
      items: [
        { bm: 'Imbasan kod & data langsung', en: 'Code scan & live data' },
        { bm: 'Ujian jalan', en: 'Road test' },
        { bm: 'Penemuan bertulis', en: 'Written findings' },
      ],
      image: { src: `${MNA_IMG}/mechanic.webp`, width: 1080, height: 720, kind: 'photo' },
      cta: { bm: 'Tempah pemeriksaan', en: 'Book an inspection' },
    },
  ],

  banner: {
    id: 'parts',
    ask: { bm: 'Saya nak tanya tentang alat ganti gearbox.', en: "I'd like to ask about gearbox parts." },
    field: { bm: 'Alat ganti / kod gearbox: ', en: 'Part / gearbox code: ' },
    title: { bm: 'Alat ganti gearbox', en: 'Gearbox parts' },
    desc: {
      bm: 'MNA membekalkan alat ganti CVT dan automatik: belt, variator, valve body, torque converter, overhaul kit dan minyak. Runcit dan borong, dihantar ke seluruh Malaysia.',
      en: 'MNA supplies CVT and automatic transmission parts: belts, variators, valve bodies, torque converters, overhaul kits and fluids. Retail and wholesale, shipped Malaysia-wide.',
    },
    cta: { bm: 'Tanya alat ganti', en: 'Ask about parts' },
  },

  points: [
    {
      title: { bm: 'Diagnostik dahulu', en: 'Diagnostics first' },
      desc: {
        bm: 'Kerosakan dibuktikan dengan data sebelum harga diberi.',
        en: 'The fault is proven with data before a price is given.',
      },
    },
    {
      title: { bm: 'Sebut harga bertulis', en: 'Written quotes' },
      desc: {
        bm: 'Harga jelas sebelum kerja bermula.',
        en: 'A clear price before work starts.',
      },
    },
    {
      title: { bm: 'Waranti kerja 6 bulan', en: '6-month workmanship warranty' },
      desc: {
        bm: 'Untuk setiap pembaikan dan rebuild.',
        en: 'On every repair and rebuild.',
      },
    },
    {
      title: { bm: 'Alat ganti tulen & gred OEM', en: 'Genuine & OEM-grade parts' },
      desc: {
        bm: 'Alat ganti mempunyai waranti pengeluar masing-masing.',
        en: 'Parts carry their own manufacturer warranty.',
      },
    },
    {
      title: { bm: 'Hanya transmisi', en: 'Transmissions only' },
      desc: {
        bm: 'Gearbox ialah fokus harian bengkel ini: CVT, automatik dan DSG.',
        en: "Gearboxes are this workshop's daily focus: CVT, automatic and DSG.",
      },
    },
    {
      title: { bm: 'Alat ganti lama dipulangkan', en: 'Old parts returned' },
      desc: {
        bm: 'Atas permintaan, supaya anda nampak apa yang ditukar.',
        en: 'On request, so you can see what was replaced.',
      },
    },
  ],

  steps: [
    {
      title: { bm: 'WhatsApp bengkel', en: 'Message the workshop' },
      desc: {
        bm: 'Beritahu model kereta dan simptomnya. Anda dinasihatkan sama ada ia perlu diperiksa.',
        en: "Tell them the car and the symptom. They'll advise whether it needs a check.",
      },
    },
    {
      title: { bm: 'Diagnostik', en: 'Diagnostic' },
      desc: {
        bm: 'Kereta diimbas dan punca sebenar dikenal pasti.',
        en: 'The car is scanned and the real fault pinpointed.',
      },
    },
    {
      title: { bm: 'Sebut harga jelas', en: 'Clear quote' },
      desc: {
        bm: 'Sebut harga terperinci, diterangkan dalam bahasa mudah.',
        en: 'An itemised quote, explained in plain language.',
      },
    },
    {
      title: { bm: 'Baiki & waranti', en: 'Repair & warranty' },
      desc: {
        bm: 'Dibaiki, diuji jalan dan dipulangkan dengan waranti kerja 6 bulan.',
        en: 'Fixed, test-driven and handed back with a 6-month workmanship warranty.',
      },
    },
  ],

  proofTitle: { bm: 'Ulasan Google', en: 'Google reviews' },

  finalCta: {
    title: { bm: 'Tempah diagnostik gearbox anda', en: 'Book your gearbox diagnostic' },
    sub: {
      bm: 'WhatsApp bengkel sekarang. Beritahu model kereta dan simptomnya, dan mereka akan nasihatkan langkah seterusnya.',
      en: "WhatsApp the workshop now. Tell them your car model and the symptom, and they'll advise the next step.",
    },
  },

  faq: [
    {
      q: { bm: 'Berapa kos diagnostik?', en: 'How much does a diagnostic cost?' },
      a: {
        bm: 'WhatsApp bengkel dengan model kereta dan simptom untuk harga semasa. Yuran diagnostik biasanya ditolak daripada kos pembaikan jika anda teruskan.',
        en: 'WhatsApp the workshop with your car model and symptoms for current pricing. The diagnostic fee is typically credited toward the repair if you go ahead.',
      },
    },
    {
      q: { bm: 'Jenama kereta apa yang dibaiki?', en: 'Which car brands do they handle?' },
      a: {
        bm: 'Kebanyakan transmisi CVT dan automatik: Proton, Perodua, Honda, Nissan, Toyota, Mitsubishi dan lain-lain. Hantar model kereta anda untuk pengesahan.',
        en: 'Most CVT and automatic transmissions: Proton, Perodua, Honda, Nissan, Toyota, Mitsubishi and more. Send your car model and they will confirm.',
      },
    },
    {
      q: { bm: 'Gear kereta saya delay. Boleh bantu?', en: 'My gears are slow to engage. Can they help?' },
      a: {
        bm: 'Boleh. Delay boleh berpunca daripada beberapa perkara, jadi kereta diimbas dahulu. Kod dibaca dan diterangkan, dan anda diberitahu apa yang perlu dibuat untuk menyelesaikannya.',
        en: 'Yes. A delay can have several causes, so the car is scanned first. The codes are read and explained, and you are told what it will take to fix it properly.',
      },
    },
    {
      q: { bm: 'Ada waranti?', en: 'Is there a warranty?' },
      a: {
        bm: 'Ada. Setiap pembaikan dan rebuild disertakan waranti kerja 6 bulan. Alat ganti mempunyai waranti pengeluar masing-masing. Tanya bengkel untuk terma penuh.',
        en: 'Yes. Every repair and rebuild comes with a 6-month workmanship warranty, and parts carry their own manufacturer warranty. Ask the workshop for the full terms.',
      },
    },
    {
      q: { bm: 'Boleh beli alat ganti sahaja?', en: 'Can I buy parts only?' },
      a: {
        bm: 'Boleh. MNA membekalkan alat ganti CVT dan automatik secara runcit dan borong, dengan penghantaran ke seluruh Malaysia.',
        en: 'Yes. MNA supplies CVT and automatic transmission parts, retail and wholesale, with shipping across Malaysia.',
      },
    },
    {
      q: { bm: 'Apa kaitan BYKI dengan bengkel ini?', en: 'How is BYKI connected to this workshop?' },
      a: {
        bm: 'BYKI ialah aplikasi diagnostik kereta. MNA Dynamic Torque ialah rakan bengkel BYKI di Shah Alam. Anda boleh scan kereta dengan BYKI, kemudian bawa laporan ke bengkel. Semua kerja, harga dan waranti adalah antara anda dan bengkel.',
        en: "BYKI is a car diagnostics app. MNA Dynamic Torque is BYKI's workshop partner in Shah Alam. You can scan your car with BYKI, then take the report to the workshop. All work, pricing and warranty are between you and the workshop.",
      },
    },
  ],
};

export const PARTNERS: Partner[] = [dseventeen, mna];

export function getPartner(slug: string): Partner | null {
  return PARTNERS.find((p) => p.slug === slug) ?? null;
}

export function waLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
