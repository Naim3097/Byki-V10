'use client';

// ─── BYKI Workshop Partner landing page ──────────────────────────────
// A sales page for a partner workshop: bilingual (BM default / EN), every
// call-to-action contacts the workshop directly. The BYKI scanner is only
// linked to, never embedded. Content comes from lib/partners.ts.

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  waLink,
  type L10n,
  type Lang,
  type Partner,
  type PartnerService,
  type SymptomGroup,
} from '@/lib/partners';

// ── Shared labels ───────────────────────────────────────────────────

const UI = {
  partnerTag: { bm: 'Rakan Bengkel', en: 'Workshop Partner' },
  eyebrow: { bm: 'Rakan Bengkel BYKI', en: 'BYKI Workshop Partner' },
  waCta: { bm: 'WhatsApp bengkel', en: 'WhatsApp the workshop' },
  call: { bm: 'Telefon', en: 'Call' },
  directions: { bm: 'Arah ke bengkel', en: 'Get directions' },
  onGoogle: { bm: 'di Google', en: 'on Google' },
  reviews: { bm: 'ulasan', en: 'reviews' },
  googleRating: { bm: 'Rating Google', en: 'Google rating' },

  symptomsTitle: { bm: 'Pilih masalah kereta anda', en: "Pick your car's problem" },
  symptomsSub: {
    bm: 'Tekan satu dan WhatsApp akan terbuka dengan mesej untuk bengkel.',
    en: 'Tap one and WhatsApp opens with a message for the workshop.',
  },
  symptomsOther: { bm: 'Masalah lain: tulis sendiri di WhatsApp', en: 'Other problem: describe it on WhatsApp' },

  servicesTitle: { bm: 'Servis', en: 'Services' },
  speciality: { bm: 'Kepakaran utama', en: 'Speciality' },

  whyTitle: { bm: 'Kenapa servis di sini', en: 'Why service here' },
  registeredPanel: { bm: 'Panel berdaftar', en: 'Registered panel' },

  stepsTitle: { bm: 'Cara ia berjalan', en: 'How it works' },

  bykiTitle: {
    bm: 'Scan kereta sendiri dengan BYKI',
    en: 'Scan your car yourself with BYKI',
  },
  bykiBody: {
    bm: 'BYKI membaca komputer kereta anda melalui telefon dan menerangkan keputusannya dalam bahasa mudah. Anda boleh bawa laporan itu ke bengkel.',
    en: "BYKI reads your car's computer through your phone and explains the results in plain language. You can take the report to the workshop.",
  },
  bykiPoints: [
    { bm: 'Skor kesihatan kereta', en: 'A car health score' },
    { bm: 'Kod kerosakan (DTC) diterangkan dalam bahasa mudah', en: 'Trouble codes (DTC) explained in plain language' },
    { bm: 'Hantar laporan ke bengkel melalui WhatsApp', en: 'Send the report to the workshop on WhatsApp' },
  ],
  bykiCta: { bm: 'Cuba BYKI, percuma', en: "Try BYKI, it's free" },
  bykiNote: { bm: 'Perlukan penyesuai OBD2 Bluetooth.', en: 'Needs a Bluetooth OBD2 adapter.' },

  readReviews: { bm: 'Baca ulasan', en: 'Read the reviews' },
  googleReviewsLabel: { bm: 'ulasan Google', en: 'Google reviews' },
  tiktokLabel: { bm: 'pengikut TikTok', en: 'TikTok followers' },
  watchTiktok: { bm: 'Lihat TikTok', en: 'See TikTok' },
  facebookLabel: { bm: 'pengikut Facebook', en: 'Facebook followers' },
  seeFacebook: { bm: 'Lihat Facebook', en: 'See Facebook' },
  officialSite: { bm: 'Laman web rasmi', en: 'Official website' },

  locationTitle: { bm: 'Lokasi dan waktu operasi', en: 'Location and opening hours' },
  address: { bm: 'Alamat', en: 'Address' },
  hours: { bm: 'Waktu operasi', en: 'Opening hours' },
  contact: { bm: 'Hubungi', en: 'Contact' },
  closed: { bm: 'Tutup', en: 'Closed' },
  openMaps: { bm: 'Buka Google Maps', en: 'Open Google Maps' },
  openWaze: { bm: 'Buka Waze', en: 'Open Waze' },

  faqTitle: { bm: 'Soalan lazim', en: 'Common questions' },

  footerNote: {
    bm: 'Halaman ini disediakan oleh BYKI untuk rakan bengkelnya. Servis, harga dan waranti disediakan oleh',
    en: 'This page is provided by BYKI for its workshop partner. Services, pricing and warranty are provided by',
  },
  footerByki: { bm: 'Laman BYKI', en: 'BYKI home' },
  footerPrivacy: { bm: 'Privasi', en: 'Privacy' },
} as const;

const GROUP_LABEL: Record<SymptomGroup, L10n> = {
  gearbox: { bm: 'Gearbox', en: 'Gearbox' },
  aircond: { bm: 'Aircond', en: 'Air-cond' },
  engine: { bm: 'Enjin', en: 'Engine' },
  warning: { bm: 'Amaran', en: 'Warning' },
  general: { bm: 'Lain-lain', en: 'Other' },
};

const DAYS: Record<Lang, string[]> = {
  bm: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

// ── Button styles ───────────────────────────────────────────────────

const BTN =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]';
const BTN_PRIMARY = `${BTN} bg-[var(--accent)] text-black hover:brightness-110`;
const BTN_GHOST = `${BTN} border border-white/12 bg-white/[0.04] text-white/85 hover:bg-white/[0.08] hover:text-white`;
const BTN_OUTLINE = `${BTN} border border-[var(--accent)]/30 text-[var(--accent)] hover:bg-[var(--accent)]/10`;

const EXTERNAL = { target: '_blank', rel: 'noopener noreferrer' } as const;

const FIELD =
  'w-full rounded-xl border border-white/12 bg-black/50 px-4 py-3.5 text-base text-white outline-none transition-colors [color-scheme:dark] placeholder:text-white/30 focus:border-[var(--accent)]/60';

// Proof cards: one sits centred, two or three share a row.
const PROOF_GRID: Record<number, string> = {
  1: 'mx-auto max-w-md',
  2: 'mx-auto max-w-3xl sm:grid-cols-2',
  3: 'sm:grid-cols-3',
};

// ── Time helpers (workshop hours are in Malaysia time, UTC+8) ───────

function fmtTime(min: number, lang: Lang): string {
  const h24 = Math.floor(min / 60);
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const clock = `${h12}:${String(min % 60).padStart(2, '0')}`;
  if (lang === 'en') return `${clock} ${h24 < 12 ? 'am' : 'pm'}`;
  const part = h24 < 12 ? 'pagi' : h24 < 14 ? 'tengah hari' : h24 < 19 ? 'petang' : 'malam';
  return `${clock} ${part}`;
}

type OpenStatus =
  | { open: true; closeMin: number }
  | { open: false; day: number; openMin: number; offset: number };

function computeStatus(hours: Partner['hours']): OpenStatus | null {
  const myt = new Date(Date.now() + 8 * 3600_000);
  const day = myt.getUTCDay();
  const min = myt.getUTCHours() * 60 + myt.getUTCMinutes();
  const today = hours[day];
  if (today && min >= today[0] && min < today[1]) return { open: true, closeMin: today[1] };
  for (let offset = 0; offset <= 7; offset++) {
    const d = (day + offset) % 7;
    const span = hours[d];
    if (!span) continue;
    if (offset === 0 && min >= span[0]) continue;
    return { open: false, day: d, openMin: span[0], offset };
  }
  return null;
}

function statusText(s: OpenStatus, lang: Lang): string {
  if (s.open) {
    return lang === 'bm'
      ? `Buka sekarang · tutup ${fmtTime(s.closeMin, lang)}`
      : `Open now · closes ${fmtTime(s.closeMin, lang)}`;
  }
  const when =
    s.offset === 0
      ? lang === 'bm' ? 'hari ini' : 'today'
      : s.offset === 1
        ? lang === 'bm' ? 'esok' : 'tomorrow'
        : DAYS[lang][s.day];
  return lang === 'bm'
    ? `Tutup sekarang · buka ${when}, ${fmtTime(s.openMin, lang)}`
    : `Closed now · opens ${when}, ${fmtTime(s.openMin, lang)}`;
}

/** Collapse the week (Monday first) into runs of days that share the same hours. */
function groupHours(hours: Partner['hours']) {
  const groups: { days: number[]; span: [number, number] | null }[] = [];
  for (const d of [1, 2, 3, 4, 5, 6, 0]) {
    const span = hours[d];
    const last = groups[groups.length - 1];
    const same =
      last &&
      (last.span === null
        ? span === null
        : span !== null && last.span[0] === span[0] && last.span[1] === span[1]);
    if (same) last.days.push(d);
    else groups.push({ days: [d], span });
  }
  return groups;
}

// ── Page ────────────────────────────────────────────────────────────

export default function PartnerLanding({ partner: p }: { partner: Partner }) {
  const [lang, setLang] = useState<Lang>('bm');
  const [status, setStatus] = useState<OpenStatus | null>(null);
  const [today, setToday] = useState<number | null>(null);
  // Claim form (campaign only): the answers are written into the WhatsApp message.
  const [car, setCar] = useState('');
  const [svc, setSvc] = useState(0);
  const c = p.campaign;

  // Language: ?lang= wins, then the visitor's last choice, then BM.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('lang');
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem('byki-lang');
    } catch {
      /* storage unavailable — fall back to the default */
    }
    const pick = q ?? stored;
    if (pick === 'en') setLang('en');
    else if (pick === 'bm' || pick === 'ms') setLang('bm');
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'bm' ? 'ms' : 'en';
  }, [lang]);

  // Open/closed is worked out on the client so it reflects the visitor's "now".
  useEffect(() => {
    const tick = () => {
      setStatus(computeStatus(p.hours));
      setToday(new Date(Date.now() + 8 * 3600_000).getUTCDay());
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [p.hours]);

  const t = (s: L10n) => s[lang];

  const chooseLang = (next: Lang) => {
    setLang(next);
    try {
      window.localStorage.setItem('byki-lang', next);
    } catch {
      /* ignore */
    }
  };

  const track = (action: string, detail?: string) => {
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer?.push({ event: 'partner_cta', partner: p.slug, campaign: c?.id, cta_action: action, cta_detail: detail, lang });
    if (c && action === 'whatsapp') {
      w.dataLayer?.push({ event: 'generate_lead', partner: p.slug, campaign: c.id, lead_source: detail, lang });
    }
  };

  // ── WhatsApp messages ──
  // While a campaign runs, every message opens by claiming the offer.
  const intro = c
    ? c.waIntro[lang]
    : lang === 'bm'
      ? `Hi ${p.greetingName}, saya jumpa bengkel ini melalui BYKI.`
      : `Hi ${p.greetingName}, I found your workshop through BYKI.`;
  const carLine = lang === 'bm' ? 'Model kereta: ' : 'Car model: ';
  const problemLine = lang === 'bm' ? 'Masalah: ' : 'Problem: ';
  const serviceLine = lang === 'bm' ? 'Servis: ' : 'Service: ';

  const waGeneral = waLink(
    p.whatsapp,
    c
      ? `${intro}\n\n${carLine}\n${serviceLine}`
      : `${intro}\n\n${lang === 'bm' ? 'Saya nak tanya tentang kereta saya.' : "I'd like to ask about my car."}\n${carLine}\n${problemLine}`,
  );
  const waClaim = c
    ? waLink(p.whatsapp, `${intro}\n\n${carLine}${car.trim()}\n${serviceLine}${c.claim.form.services[svc][lang]}`)
    : waGeneral;
  const waSymptom = (label: string) =>
    waLink(
      p.whatsapp,
      `${intro}\n\n${lang === 'bm' ? 'Berkenaan' : 'Regarding'}: ${label}\n${carLine}\n\n${
        lang === 'bm' ? 'Boleh saya tempah slot pemeriksaan?' : 'Can I book an inspection slot?'
      }`,
    );
  const waService = (title: string) =>
    waLink(
      p.whatsapp,
      c
        ? `${intro}\n\n${serviceLine}${title}\n${carLine}`
        : `${intro}\n\n${lang === 'bm' ? 'Saya nak tanya harga untuk' : "I'd like a quote for"}: ${title}\n${carLine}\n${problemLine}`,
    );
  const waBanner = p.banner
    ? waLink(p.whatsapp, `${intro}\n\n${p.banner.ask[lang]}\n${carLine}\n${p.banner.field[lang]}`)
    : waGeneral;

  const telHref = `tel:${p.phoneE164}`;
  const fullAddress = `${p.address.lines.join(', ')}, ${p.address.postcode} ${p.address.city}, ${p.address.state}`;
  const featured = p.services.find((s) => s.featured);
  const otherServices = p.services.filter((s) => s !== featured);
  const proofCount =
    1 + (p.links.tiktok && p.proof.tiktokFollowers ? 1 : 0) + (p.links.facebook && p.proof.facebookFollowers ? 1 : 0);
  const hourGroups = groupHours(p.hours);
  const faqs = c ? [...c.faq, ...p.faq] : p.faq;
  const ctaLabel = c ? t(c.cta) : t(UI.waCta);

  const statusBadge = status && (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
        status.open
          ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
          : 'border-white/10 bg-black/60 text-white/70'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${status.open ? 'bg-emerald-400' : 'bg-white/35'}`} />
      {statusText(status, lang)}
    </span>
  );

  return (
    <div className="relative min-h-screen overflow-x-clip pb-24 md:pb-0">

      {/* ── Header ─────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="BYKI">
            <Image src="/brand/byki-logo-nav.png" alt="BYKI" width={80} height={24} className="h-5 w-auto" priority />
            <span className="h-4 w-px bg-white/15" />
            <span className="truncate text-[10px] font-medium uppercase tracking-[0.1em] text-white/50 sm:tracking-[0.18em]">
              {t(UI.partnerTag)}
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2.5">
            <div
              role="group"
              aria-label="Bahasa / Language"
              className="flex rounded-full border border-white/10 bg-white/[0.04] p-0.5"
            >
              {(['bm', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  aria-pressed={lang === l}
                  onClick={() => chooseLang(l)}
                  className={`min-h-8 rounded-full px-3.5 text-[11px] font-bold tracking-wide transition-colors ${
                    lang === l ? 'bg-[var(--accent)] text-black' : 'text-white/55 hover:text-white'
                  }`}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
            <a
              href={waGeneral}
              {...EXTERNAL}
              onClick={() => track('whatsapp', 'header')}
              className={`${BTN_PRIMARY} px-4 py-2 text-xs max-md:hidden`}
            >
              <WhatsAppIcon size={15} />
              {c ? t(c.ctaShort) : t(UI.waCta)}
            </a>
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ── Campaign hero ──────────────────────────── */}
        {c && (
          <section className="mx-auto grid max-w-6xl items-center gap-9 px-5 pb-10 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-14 lg:pt-14">
            <div>
              <p className="text-sm font-medium text-[var(--accent)]">{t(c.eyebrow)}</p>
              <h1 className="mt-5 text-balance !text-[2.2rem] font-bold !leading-[1.05] tracking-tight text-white sm:!text-5xl sm:!leading-[1.04] lg:!text-[3.4rem]">
                <Emphasis text={t(c.title)} />
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">{t(c.sub)}</p>

              <ul className="mt-5 grid gap-2">
                {c.bullets.map((b) => (
                  <Bullet key={b.en}>{t(b)}</Bullet>
                ))}
              </ul>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href={waGeneral}
                  {...EXTERNAL}
                  onClick={() => track('whatsapp', 'hero')}
                  className={`${BTN_PRIMARY} px-7 py-4 text-base`}
                >
                  <WhatsAppIcon size={20} />
                  {t(c.cta)}
                </a>
                <a href={telHref} onClick={() => track('call', 'hero')} className={`${BTN_GHOST} px-6 py-4 text-base`}>
                  <PhoneIcon size={18} />
                  {p.phoneDisplay}
                </a>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/40">{t(c.terms)}</p>

              {/* Who is making the offer */}
              <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
                <Image
                  src={p.logo.src}
                  alt={`${p.legalName} logo`}
                  width={p.logo.width}
                  height={p.logo.height}
                  className="h-12 w-auto rounded-lg bg-black"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold leading-tight text-white">{p.name}</div>
                  <a
                    href={p.links.googleReviews}
                    {...EXTERNAL}
                    onClick={() => track('reviews', 'hero')}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs text-white/65 hover:text-white"
                  >
                    <Stars />
                    <span>
                      <strong className="font-bold text-white">{p.proof.googleRating.toFixed(1)}</strong> {t(UI.onGoogle)} ·{' '}
                      {p.proof.googleReviews} {t(UI.reviews)}
                    </span>
                  </a>
                </div>
                {statusBadge}
              </div>
            </div>

            <div className="relative">
              <div className="relative grid grid-cols-2 gap-3">
                <div className="relative col-span-2 overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-[#050505]">
                  <Image
                    src={c.productImage.src}
                    alt={t(c.productImage.alt)}
                    width={c.productImage.width}
                    height={c.productImage.height}
                    className="relative mx-auto h-auto w-full max-w-md px-6 pt-8"
                    priority
                  />
                  <div className="absolute left-4 top-4 rounded-2xl bg-[var(--accent)] px-4 py-2 text-center text-black">
                    <div className="text-xl font-black leading-none tracking-tight">{t(c.badge.top)}</div>
                    <div className="mt-1 text-[11px] font-semibold leading-none">{t(c.badge.bottom)}</div>
                  </div>
                  <div className="relative px-5 pb-4 pt-1 text-center text-sm font-semibold text-white/80">BYKI OBD2</div>
                </div>
                {c.photos.items.slice(0, 2).map((ph) => (
                  <div key={ph.src} className="overflow-hidden rounded-2xl border border-white/10">
                    <Image
                      src={ph.src}
                      alt={t(ph.alt)}
                      width={ph.width}
                      height={ph.height}
                      className="aspect-[4/5] h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Hero ───────────────────────────────────── */}
        {!c && (
          <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-10 pt-10 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-14 lg:pt-16">
            <div>
              <p className="text-sm font-medium text-[var(--accent)]">{t(UI.eyebrow)} · {t(p.area)}</p>
              <h1 className="mt-5 text-balance !text-[2.15rem] font-bold !leading-[1.06] tracking-tight text-white sm:!text-5xl sm:!leading-[1.04] lg:!text-[3.35rem]">
                {t(p.hero.title)}
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">{t(p.hero.sub)}</p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <a
                  href={waGeneral}
                  {...EXTERNAL}
                  onClick={() => track('whatsapp', 'hero')}
                  className={`${BTN_PRIMARY} px-7 py-4 text-base`}
                >
                  <WhatsAppIcon size={20} />
                  {t(UI.waCta)}
                </a>
                <a href={telHref} onClick={() => track('call', 'hero')} className={`${BTN_GHOST} px-6 py-4 text-base`}>
                  <PhoneIcon size={18} />
                  {p.phoneDisplay}
                </a>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
                <a
                  href={p.links.googleReviews}
                  {...EXTERNAL}
                  onClick={() => track('reviews', 'hero')}
                  className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
                >
                  <Stars />
                  <span>
                    <strong className="font-bold text-white">{p.proof.googleRating.toFixed(1)}</strong> {t(UI.onGoogle)} ·{' '}
                    {p.proof.googleReviews} {t(UI.reviews)}
                  </span>
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--bg-card)]">
                <Image
                  src={p.heroImage.src}
                  alt={`${p.name} — ${p.subtitle}`}
                  width={p.heroImage.width}
                  height={p.heroImage.height}
                  className="aspect-[4/3] h-full w-full object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <Image
                      src={p.logo.src}
                      alt={`${p.legalName} logo`}
                      width={p.logo.width}
                      height={p.logo.height}
                      className="h-14 w-auto rounded-xl border border-white/10 bg-black p-1 sm:h-16"
                    />
                    <div className="min-w-0">
                      <div className="text-base font-bold leading-tight text-white sm:text-lg">{p.name}</div>
                      <div className="text-xs text-white/60">{p.subtitle}</div>
                    </div>
                  </div>
                  <div className="min-h-[30px]">{statusBadge}</div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Key facts ──────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-6 sm:px-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {p.stats.map((s) => (
              <div key={s.label.en} className="glass rounded-2xl px-4 py-4 sm:px-5">
                <div className="text-[11px] leading-snug text-white/55 sm:text-xs">{t(s.label)}</div>
                <div className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{t(s.value)}</div>
              </div>
            ))}
            <a
              href={p.links.googleReviews}
              {...EXTERNAL}
              onClick={() => track('reviews', 'stats')}
              className="glass glass-hover rounded-2xl px-4 py-4 transition-colors sm:px-5"
            >
              <div className="text-[11px] leading-snug text-white/55 sm:text-xs">
                {t(UI.googleRating)} · {p.proof.googleReviews} {t(UI.reviews)}
              </div>
              <div className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                {p.proof.googleRating.toFixed(1)}
                <StarIcon size={20} className="text-amber-400" />
              </div>
            </a>
          </div>
        </section>

        {/* ── Campaign: what the scanner does ────────── */}
        {c && (
          <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
            <SectionHead title={t(c.explainer.title)} sub={t(c.explainer.sub)} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {c.explainer.benefits.map((b) => (
                <div key={b.title.en} className="glass rounded-2xl p-5">
                  <h3 className="!text-base font-bold !leading-snug text-white">{t(b.title)}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{t(b.desc)}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-sm">
              <Link
                href="/"
                onClick={() => track('byki', 'explainer')}
                className="text-white/55 underline decoration-white/20 underline-offset-4 hover:text-[var(--accent)]"
              >
                {t(c.explainer.link)}
              </Link>
            </p>
          </section>
        )}

        {/* ── Campaign: people with the scanner ──────── */}
        {c && c.photos.items.length > 0 && (
          <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
            <SectionHead title={t(c.photos.title)} sub={t(c.photos.sub)} />
            <div className="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-3 overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
              {c.photos.items.map((ph) => (
                <div
                  key={ph.src}
                  className="w-[44%] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 sm:w-[30%] md:w-auto"
                >
                  <Image
                    src={ph.src}
                    alt={t(ph.alt)}
                    width={ph.width}
                    height={ph.height}
                    className="aspect-[4/5] h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Campaign: how to claim ─────────────────── */}
        {c && (
          <section id="claim" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-10 sm:px-6 sm:py-14">
            <SectionHead title={t(c.claim.title)} />
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              <ol className="grid content-start gap-3">
                {c.claim.steps.map((step, i) => (
                  <li key={step.title.en} className="glass flex items-start gap-4 rounded-2xl p-5">
                    <span className="w-5 shrink-0 text-xl font-bold tabular-nums leading-tight text-[var(--accent)]">{i + 1}</span>
                    <div>
                      <h3 className="!text-base font-bold text-white">{t(step.title)}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-white/65">{t(step.desc)}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="rounded-2xl border border-[var(--accent)]/25 bg-white/[0.03] p-6 sm:p-7">
                <h3 className="!text-xl font-bold tracking-tight text-white">{t(c.claim.form.title)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-white/65">{t(c.claim.form.sub)}</p>
                <div className="mt-5 grid gap-4">
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-white/75">{t(c.claim.form.carLabel)}</span>
                    <input
                      type="text"
                      value={car}
                      onChange={(e) => setCar(e.target.value)}
                      placeholder={t(c.claim.form.carPlaceholder)}
                      maxLength={60}
                      autoComplete="off"
                      className={FIELD}
                    />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="text-xs font-semibold text-white/75">{t(c.claim.form.serviceLabel)}</span>
                    <select value={svc} onChange={(e) => setSvc(Number(e.target.value))} className={FIELD}>
                      {c.claim.form.services.map((option, i) => (
                        <option key={option.en} value={i}>
                          {t(option)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <a
                    href={waClaim}
                    {...EXTERNAL}
                    onClick={() => track('whatsapp', 'claim-form')}
                    className={`${BTN_PRIMARY} px-6 py-4 text-base`}
                  >
                    <WhatsAppIcon size={20} />
                    {t(c.claim.form.submit)}
                  </a>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/40">{t(c.claim.form.note)}</p>
              </div>
            </div>
          </section>
        )}

        {/* ── Symptoms ───────────────────────────────── */}
        {!c && (
          <section id="symptoms" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-10 sm:px-6 sm:py-14">
            <SectionHead title={t(UI.symptomsTitle)} sub={t(UI.symptomsSub)} />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {p.symptoms.map((s) => (
                <a
                  key={s.id}
                  href={waSymptom(t(s.label))}
                  {...EXTERNAL}
                  onClick={() => track('whatsapp', `symptom:${s.id}`)}
                  className="glass block rounded-2xl p-4 transition-colors hover:border-white/20"
                >
                  <div>
                    <div className="text-sm font-semibold leading-snug text-white/90">{t(s.label)}</div>
                    <div className="mt-1 text-xs text-white/45">
                      {t(GROUP_LABEL[s.group])}
                    </div>
                  </div>
                </a>
              ))}
            </div>
            <p className="mt-5 text-sm">
              <a
                href={waGeneral}
                {...EXTERNAL}
                onClick={() => track('whatsapp', 'symptom:other')}
                className="text-white/55 underline decoration-white/20 underline-offset-4 hover:text-[var(--accent)]"
              >
                {t(UI.symptomsOther)}
              </a>
            </p>
          </section>
        )}

        {/* ── Services ───────────────────────────────── */}
        <section id="services" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-10 sm:px-6 sm:py-14">
          <SectionHead
            title={c ? t(c.servicesTitle) : t(UI.servicesTitle)}
            sub={c ? t(c.servicesSub) : t(p.servicesSub)}
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured && (
              <article className="relative flex flex-col overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-white/[0.03] p-6 sm:p-8 md:col-span-2">
                <div className="grid flex-1 items-center gap-6 sm:grid-cols-[1.15fr_1fr]">
                  <div>
                    <span className="text-sm font-medium text-[var(--accent)]">
                      {t(UI.speciality)}
                    </span>
                    <h3 className="mt-3 !text-2xl font-bold tracking-tight text-white sm:!text-3xl">{t(featured.title)}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-white/70">{t(featured.blurb)}</p>
                    {featured.tags && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {featured.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[11px] font-semibold text-white/75"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {featured.image && (
                    <Image
                      src={featured.image.src}
                      alt=""
                      width={featured.image.width}
                      height={featured.image.height}
                      className={
                        featured.image.kind === 'cutout'
                          ? 'mx-auto h-auto w-full max-w-sm'
                          : 'aspect-[16/10] h-full w-full rounded-2xl border border-white/10 object-cover sm:aspect-[4/3]'
                      }
                    />
                  )}
                </div>
                <ul className="mt-6 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {featured.items.map((item) => (
                    <Bullet key={item.en}>{t(item)}</Bullet>
                  ))}
                </ul>
                <a
                  href={waService(t(featured.title))}
                  {...EXTERNAL}
                  onClick={() => track('whatsapp', `service:${featured.id}`)}
                  className={`${BTN_PRIMARY} mt-7 w-full px-6 py-3.5 text-sm sm:w-auto sm:self-start`}
                >
                  <WhatsAppIcon size={17} />
                  {t(featured.cta)}
                </a>
              </article>
            )}

            {otherServices.map((svc) => (
              <ServiceCard
                key={svc.id}
                title={t(svc.title)}
                blurb={t(svc.blurb)}
                items={svc.items.map(t)}
                image={svc.image}
                cta={t(svc.cta)}
                href={waService(t(svc.title))}
                onClick={() => track('whatsapp', `service:${svc.id}`)}
              />
            ))}
          </div>

          {p.banner && (
            <div className="glass mt-4 flex flex-col gap-4 rounded-2xl p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="flex items-start gap-4">
                <div>
                  <h3 className="!text-lg font-bold tracking-tight text-white">{t(p.banner.title)}</h3>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/70">{t(p.banner.desc)}</p>
                </div>
              </div>
              <a
                href={waBanner}
                {...EXTERNAL}
                onClick={() => track('whatsapp', `banner:${p.banner?.id}`)}
                className={`${BTN_GHOST} shrink-0 px-5 py-3 text-sm`}
              >
                <WhatsAppIcon size={16} />
                {t(p.banner.cta)}
              </a>
            </div>
          )}
        </section>

        {/* ── Why this workshop ──────────────────────── */}
        <section id="why" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-10 sm:px-6 sm:py-14">
          <SectionHead title={t(UI.whyTitle)} />
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <div className="grid content-start gap-3 sm:grid-cols-2">
              {p.points.map((pt) => (
                <div key={pt.title.en} className="glass rounded-2xl p-5">
                  <div>
                    <h3 className="!text-[15px] font-bold !leading-snug text-white">{t(pt.title)}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-white/65">{t(pt.desc)}</p>
                  </div>
                </div>
              ))}
              {p.affiliationLogo && (
                <div className="flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-black p-4 sm:col-span-2">
                  <Image
                    src={p.logo.src}
                    alt={`${p.legalName} logo`}
                    width={p.logo.width}
                    height={p.logo.height}
                    className="h-14 w-auto"
                  />
                  <span className="h-8 w-px bg-white/10" />
                  <Image
                    src={p.affiliationLogo.src}
                    alt={p.affiliationLogo.alt}
                    width={p.affiliationLogo.width}
                    height={p.affiliationLogo.height}
                    className="h-12 w-auto"
                  />
                  <span className="ml-auto hidden text-xs text-white/45 sm:block">
                    {t(UI.registeredPanel)}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {p.gallery.map((g, i) => (
                <div
                  key={g.src}
                  className={`overflow-hidden rounded-2xl border border-white/[0.08] ${i === 0 ? 'col-span-2' : ''}`}
                >
                  <Image
                    src={g.src}
                    alt={t(g.alt)}
                    width={g.width}
                    height={g.height}
                    className={`h-full w-full object-cover ${i === 0 ? 'aspect-[5/3]' : 'aspect-[4/5]'}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ───────────────────────────── */}
        {!c && (
          <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
            <SectionHead title={t(UI.stepsTitle)} />
            <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {p.steps.map((s, i) => (
                <li key={s.title.en} className="glass rounded-2xl p-4 sm:p-5">
                  <span className="text-xl font-bold tabular-nums text-[var(--accent)]">{i + 1}</span>
                  <h3 className="mt-2 !text-base font-bold text-white">{t(s.title)}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{t(s.desc)}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex">
              <a
                href={waGeneral}
                {...EXTERNAL}
                onClick={() => track('whatsapp', 'steps')}
                className={`${BTN_PRIMARY} w-full px-7 py-4 text-base sm:w-auto`}
              >
                <WhatsAppIcon size={20} />
                {t(UI.waCta)}
              </a>
            </div>
          </section>
        )}

        {/* ── BYKI ───────────────────────────────────── */}
        {!c && (
          <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#050505]">
              <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <Image src="/brand/byki-logo.png" alt="BYKI" width={90} height={24} className="h-5 w-auto" />
                  </div>
                  <h2 className="mt-5 text-balance !text-[1.6rem] font-bold tracking-tight text-white sm:!text-[2rem]">
                    {t(UI.bykiTitle)}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">{t(UI.bykiBody)}</p>
                  <ul className="mt-5 grid gap-2.5">
                    {UI.bykiPoints.map((pt) => (
                      <Bullet key={pt.en}>{t(pt)}</Bullet>
                    ))}
                  </ul>
                  <div className="mt-7 flex flex-col items-start gap-2.5">
                    <Link href="/" onClick={() => track('byki', 'band')} className={`${BTN_OUTLINE} px-6 py-3.5 text-sm`}>
                      {t(UI.bykiCta)}
                    </Link>
                    <span className="text-xs text-white/40">{t(UI.bykiNote)}</span>
                  </div>
                </div>
                <Image
                  src="/brand/obdii.png"
                  alt=""
                  width={1169}
                  height={796}
                  className="mx-auto h-auto w-full max-w-md"
                />
              </div>
            </div>
          </section>
        )}

        {/* ── Proof ──────────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-14">
          <SectionHead title={t(p.proofTitle)} />
          <div className={`grid gap-3 ${PROOF_GRID[proofCount]}`}>
            <ProofCard
              href={p.links.googleReviews}
              onClick={() => track('reviews', 'proof')}
              name="Google"
              value={p.proof.googleRating.toFixed(1)}
              extra={<Stars />}
              label={`${p.proof.googleReviews} ${t(UI.googleReviewsLabel)}`}
              action={t(UI.readReviews)}
            />
            {p.links.tiktok && p.proof.tiktokFollowers && (
              <ProofCard
                href={p.links.tiktok}
                onClick={() => track('social', 'tiktok')}
                name="TikTok"
                value={p.proof.tiktokFollowers}
                label={t(UI.tiktokLabel)}
                action={t(UI.watchTiktok)}
              />
            )}
            {p.links.facebook && p.proof.facebookFollowers && (
              <ProofCard
                href={p.links.facebook}
                onClick={() => track('social', 'facebook')}
                name="Facebook"
                value={p.proof.facebookFollowers}
                label={t(UI.facebookLabel)}
                action={t(UI.seeFacebook)}
              />
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/50">
            {p.links.instagram && (
              <a
                href={p.links.instagram}
                {...EXTERNAL}
                onClick={() => track('social', 'instagram')}
                className="underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                Instagram
              </a>
            )}
            {p.links.facebook && !p.proof.facebookFollowers && (
              <a
                href={p.links.facebook}
                {...EXTERNAL}
                onClick={() => track('social', 'facebook')}
                className="underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                Facebook
              </a>
            )}
            {p.links.website && (
              <a
                href={p.links.website}
                {...EXTERNAL}
                onClick={() => track('social', 'website')}
                className="underline decoration-white/20 underline-offset-4 hover:text-white"
              >
                {t(UI.officialSite)}
              </a>
            )}
          </div>
        </section>

        {/* ── Location & hours ───────────────────────── */}
        <section id="location" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-10 sm:px-6 sm:py-14">
          <SectionHead title={t(UI.locationTitle)} />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-[#070707] p-6 sm:p-8">
              <div className="relative flex items-start gap-4">
                <div>
                  <div className="text-lg font-bold leading-tight text-white">{p.name}</div>
                  <div className="text-xs text-white/55">{p.subtitle}</div>
                  <address className="mt-3 text-sm not-italic leading-relaxed text-white/80">
                    {p.address.lines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                    <span className="block">
                      {p.address.postcode} {p.address.city}, {p.address.state}
                    </span>
                  </address>
                </div>
              </div>
              <div className="relative mt-8 flex flex-col gap-2.5 sm:flex-row">
                <a
                  href={p.links.maps}
                  {...EXTERNAL}
                  onClick={() => track('directions', 'google-maps')}
                  className={`${BTN_PRIMARY} flex-1 px-5 py-3.5 text-sm`}
                >
                  {t(UI.openMaps)}
                </a>
                <a
                  href={p.links.waze}
                  {...EXTERNAL}
                  onClick={() => track('directions', 'waze')}
                  className={`${BTN_GHOST} flex-1 px-5 py-3.5 text-sm`}
                >
                  {t(UI.openWaze)}
                </a>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="!text-base font-bold text-white">{t(UI.hours)}</h3>
                {statusBadge}
              </div>
              <dl className="mt-4 divide-y divide-white/[0.06]">
                {hourGroups.map((g) => {
                  const first = DAYS[lang][g.days[0]];
                  const last = DAYS[lang][g.days[g.days.length - 1]];
                  const isToday = today !== null && g.days.includes(today);
                  return (
                    <div key={g.days.join('-')} className="flex items-center justify-between gap-4 py-3 text-sm">
                      <dt className={isToday ? 'font-semibold text-white' : 'text-white/70'}>
                        {g.days.length > 1 ? `${first} – ${last}` : first}
                      </dt>
                      <dd className={g.span ? (isToday ? 'font-semibold text-white' : 'text-white/85') : 'text-white/45'}>
                        {g.span ? `${fmtTime(g.span[0], lang)} – ${fmtTime(g.span[1], lang)}` : t(UI.closed)}
                      </dd>
                    </div>
                  );
                })}
              </dl>

              <h3 className="mt-6 !text-base font-bold text-white">{t(UI.contact)}</h3>
              <div className="mt-3 grid gap-2.5">
                <a
                  href={waGeneral}
                  {...EXTERNAL}
                  onClick={() => track('whatsapp', 'location')}
                  className="flex items-center gap-3 text-sm text-white/85 hover:text-[var(--accent)]"
                >
                  WhatsApp · {p.phoneDisplay}
                </a>
                <a
                  href={telHref}
                  onClick={() => track('call', 'location')}
                  className="flex items-center gap-3 text-sm text-white/85 hover:text-[var(--accent)]"
                >
                  {t(UI.call)} · {p.phoneDisplay}
                </a>
                {p.email && (
                  <a
                    href={`mailto:${p.email}`}
                    onClick={() => track('email', 'location')}
                    className="flex items-center gap-3 break-all text-sm text-white/85 hover:text-[var(--accent)]"
                  >
                    {p.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────── */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-10 sm:px-6 sm:py-14">
          <SectionHead title={t(UI.faqTitle)} />
          <div className="grid gap-2.5">
            {faqs.map((f) => (
              <details key={f.q.en} className="group glass rounded-2xl">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold text-white/90 [&::-webkit-details-marker]:hidden">
                  {t(f.q)}
                  <span aria-hidden className="shrink-0 text-lg leading-none text-white/40 group-open:hidden">+</span>
                  <span aria-hidden className="hidden shrink-0 text-lg leading-none text-white/40 group-open:inline">−</span>
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-white/70">{t(f.a)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/20 bg-white/[0.03] px-6 py-12 text-center sm:px-10 sm:py-16">
            <div className="relative">
              <h2 className="mx-auto max-w-xl text-balance !text-[1.75rem] font-bold tracking-tight text-white sm:!text-4xl">
                {t((c ?? p).finalCta.title)}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/70 sm:text-base">{t((c ?? p).finalCta.sub)}</p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <a
                  href={waGeneral}
                  {...EXTERNAL}
                  onClick={() => track('whatsapp', 'final')}
                  className={`${BTN_PRIMARY} px-7 py-4 text-base`}
                >
                  <WhatsAppIcon size={20} />
                  {ctaLabel}
                </a>
                <a href={telHref} onClick={() => track('call', 'final')} className={`${BTN_GHOST} px-6 py-4 text-base`}>
                  <PhoneIcon size={18} />
                  {p.phoneDisplay}
                </a>
              </div>
              <div className="mt-5 flex min-h-[30px] justify-center">{statusBadge}</div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ─────────────────────────────────── */}
      <footer className="relative border-t border-white/5">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Image src="/brand/byki-logo-nav.png" alt="BYKI" width={80} height={24} className="mt-0.5 h-4 w-auto opacity-70" />
            <p className="max-w-lg text-xs leading-relaxed text-white/40">
              {t(UI.footerNote)} {p.legalName}.
            </p>
          </div>
          <div className="flex gap-5 text-xs text-white/50">
            <Link href="/" className="hover:text-white">
              {t(UI.footerByki)}
            </Link>
            <Link href="/privacy" className="hover:text-white">
              {t(UI.footerPrivacy)}
            </Link>
          </div>
        </div>
      </footer>

      {/* ── Sticky contact bar (mobile) ────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-black/85 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
        <div className="flex gap-2">
          <a
            href={waGeneral}
            {...EXTERNAL}
            onClick={() => track('whatsapp', 'sticky')}
            className={`${BTN_PRIMARY} h-12 flex-1 text-sm`}
          >
            <WhatsAppIcon size={18} />
            {ctaLabel}
          </a>
          <a
            href={telHref}
            onClick={() => track('call', 'sticky')}
            aria-label={`${t(UI.call)} ${p.phoneDisplay}`}
            className={`${BTN_GHOST} h-12 w-12 shrink-0`}
          >
            <PhoneIcon size={18} />
          </a>
          <a
            href={p.links.maps}
            {...EXTERNAL}
            onClick={() => track('directions', 'sticky')}
            aria-label={t(UI.directions)}
            className={`${BTN_GHOST} h-12 w-12 shrink-0`}
          >
            <PinIcon size={18} />
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Pieces ──────────────────────────────────────────────────────────

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-7 max-w-2xl">
      <h2 className="!text-[1.6rem] font-bold tracking-tight text-white sm:!text-[2rem]">{title}</h2>
      {sub && <p className="mt-2 text-sm leading-relaxed text-white/65 sm:text-base">{sub}</p>}
    </div>
  );
}

function ServiceCard({
  title, blurb, items, image, cta, href, onClick,
}: {
  title: string;
  blurb: string;
  items: string[];
  image?: PartnerService['image'];
  cta: string;
  href: string;
  onClick: () => void;
}) {
  const isPhoto = image?.kind === 'photo';
  return (
    <article className="glass flex flex-col overflow-hidden rounded-2xl">
      {image && isPhoto && (
        <div className="relative">
          <Image
            src={image.src}
            alt=""
            width={image.width}
            height={image.height}
            className="aspect-[2/1] h-full w-full object-cover sm:aspect-[16/9]"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        {image && !isPhoto && (
          <Image
            src={image.src}
            alt=""
            width={image.width}
            height={image.height}
            className="mx-auto mb-4 h-36 w-auto object-contain"
          />
        )}
        <h3 className="!text-lg font-bold tracking-tight text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{blurb}</p>
        <ul className="mt-4 grid gap-2">
          {items.map((item) => (
            <Bullet key={item}>{item}</Bullet>
          ))}
        </ul>
        <a href={href} {...EXTERNAL} onClick={onClick} className={`${BTN_OUTLINE} mt-6 px-5 py-3 text-sm md:mt-auto`}>
          <WhatsAppIcon size={16} />
          {cta}
        </a>
      </div>
    </article>
  );
}

/** Renders "Car scanner *PERCUMA* ..." with the starred words in the accent colour. */
function Emphasis({ text }: { text: string }) {
  return (
    <>
      {text.split('*').map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className="text-[var(--accent)]">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug text-white/85">
      <span aria-hidden className="mt-[0.5em] h-1 w-1 shrink-0 rounded-full bg-white/50" />
      <span>{children}</span>
    </li>
  );
}

function ProofCard({
  href, onClick, name, value, extra, label, action,
}: {
  href: string;
  onClick: () => void;
  name: string;
  value: string;
  extra?: React.ReactNode;
  label: string;
  action: string;
}) {
  return (
    <a
      href={href}
      {...EXTERNAL}
      onClick={onClick}
      className="glass block rounded-2xl p-5 transition-colors hover:border-white/20 sm:p-6"
    >
      <div className="text-sm text-white/60">{name}</div>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{value}</span>
        {extra}
      </div>
      <div className="mt-1 text-sm text-white/60">{label}</div>
      <div className="mt-4 text-sm font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-4">
        {action}
      </div>
    </a>
  );
}

function Stars() {
  return (
    <span className="inline-flex gap-0.5 text-amber-400" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <StarIcon key={i} size={14} />
      ))}
    </span>
  );
}

// ── Icons ───────────────────────────────────────────────────────────

type IconProps = { size?: number; className?: string };

function WhatsAppIcon({ size = 18, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function PhoneIcon({ size = 18, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 4h3.5l1.7 4.3-2.1 1.5a12 12 0 006.1 6.1l1.5-2.1L20 15.5V19a1.5 1.5 0 01-1.6 1.5C10.6 20 4 13.4 3.5 5.6A1.5 1.5 0 015 4z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PinIcon({ size = 18, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 21s7-6.2 7-11.5a7 7 0 10-14 0C5 14.8 12 21 12 21z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="9.5" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function StarIcon({ size = 16, className = '' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.6l-5.9 3.1 1.2-6.6L2.5 9.5l6.6-.9L12 2.5z" />
    </svg>
  );
}
