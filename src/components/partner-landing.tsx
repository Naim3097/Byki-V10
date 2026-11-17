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
  type PartnerPoint,
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

  symptomsPill: { bm: 'Simptom', en: 'Symptoms' },
  symptomsTitle: { bm: 'Kereta anda ada masalah ini?', en: 'Is your car doing any of these?' },
  symptomsSub: {
    bm: 'Tekan simptom yang paling hampir. WhatsApp akan terbuka dengan mesej yang siap ditulis untuk bengkel.',
    en: 'Tap the closest match. WhatsApp opens with a message already written for the workshop.',
  },
  symptomsOther: { bm: 'Masalah lain? Tulis sendiri di WhatsApp', en: 'Something else? Describe it on WhatsApp' },

  servicesPill: { bm: 'Servis', en: 'Services' },
  servicesTitle: { bm: 'Apa yang bengkel ini baiki', en: 'What the workshop fixes' },
  speciality: { bm: 'Kepakaran utama', en: 'Speciality' },

  whyPill: { bm: 'Kenapa di sini', en: 'Why here' },
  whyTitle: { bm: 'Tahu masalah dan harganya sebelum bayar', en: 'Know the problem and the price before you pay' },
  registeredPanel: { bm: 'Panel berdaftar', en: 'Registered panel' },

  stepsPill: { bm: 'Cara ia berjalan', en: 'How it works' },
  stepsTitle: { bm: 'Dari WhatsApp ke kereta siap dibaiki', en: 'From a WhatsApp message to a fixed car' },

  bykiPill: { bm: 'Dikuasakan oleh BYKI', en: 'Powered by BYKI' },
  bykiTitle: {
    bm: 'Belum pasti apa masalahnya? Scan dulu dengan BYKI.',
    en: "Not sure what's wrong? Scan with BYKI first.",
  },
  bykiBody: {
    bm: 'BYKI membaca komputer kereta anda melalui telefon dan menerangkan keputusannya dalam bahasa mudah. Bawa laporan itu ke bengkel supaya perbincangan lebih cepat dan jelas.',
    en: "BYKI reads your car's computer through your phone and explains the results in plain language. Take the report to the workshop so the conversation is quicker and clearer.",
  },
  bykiPoints: [
    { bm: 'Skor kesihatan kereta yang mudah difahami', en: 'A health score you can actually understand' },
    { bm: 'Kod kerosakan (DTC) diterangkan dalam bahasa mudah', en: 'Trouble codes (DTC) explained in plain language' },
    { bm: 'Hantar laporan terus ke bengkel melalui WhatsApp', en: 'Send the report straight to the workshop on WhatsApp' },
  ],
  bykiCta: { bm: 'Cuba BYKI — percuma', en: "Try BYKI — it's free" },
  bykiNote: { bm: 'Perlukan penyesuai OBD2 Bluetooth.', en: 'Needs a Bluetooth OBD2 adapter.' },

  proofPill: { bm: 'Bukti', en: 'Proof' },
  readReviews: { bm: 'Baca ulasan', en: 'Read the reviews' },
  googleReviewsLabel: { bm: 'ulasan Google', en: 'Google reviews' },
  tiktokLabel: { bm: 'pengikut TikTok', en: 'TikTok followers' },
  watchTiktok: { bm: 'Tonton kerja bengkel', en: 'Watch the workshop at work' },
  facebookLabel: { bm: 'pengikut Facebook', en: 'Facebook followers' },
  seeFacebook: { bm: 'Lihat halaman', en: 'See the page' },
  officialSite: { bm: 'Laman web rasmi', en: 'Official website' },

  locationPill: { bm: 'Lokasi', en: 'Location' },
  locationTitle: { bm: 'Datang ke bengkel', en: 'Visit the workshop' },
  address: { bm: 'Alamat', en: 'Address' },
  hours: { bm: 'Waktu operasi', en: 'Opening hours' },
  contact: { bm: 'Hubungi', en: 'Contact' },
  closed: { bm: 'Tutup', en: 'Closed' },
  openMaps: { bm: 'Buka Google Maps', en: 'Open Google Maps' },
  openWaze: { bm: 'Buka Waze', en: 'Open Waze' },

  faqPill: { bm: 'Soalan lazim', en: 'FAQ' },
  faqTitle: { bm: 'Sebelum anda WhatsApp', en: 'Before you message' },

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

const GROUP_TONE: Record<SymptomGroup, string> = {
  gearbox: 'text-[var(--accent)] bg-[var(--accent)]/10',
  aircond: 'text-sky-300 bg-sky-400/10',
  engine: 'text-amber-300 bg-amber-400/10',
  warning: 'text-amber-300 bg-amber-400/10',
  general: 'text-white/70 bg-white/[0.07]',
};

const DAYS: Record<Lang, string[]> = {
  bm: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

// ── Button styles ───────────────────────────────────────────────────

const BTN =
  'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]';
const BTN_PRIMARY = `${BTN} bg-[var(--accent)] text-black hover:brightness-110 shadow-[0_0_24px_rgba(0,255,136,0.25)]`;
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
      <span className={`h-1.5 w-1.5 rounded-full ${status.open ? 'bg-emerald-400 status-dot' : 'bg-white/35'}`} />
      {statusText(status, lang)}
    </span>
  );

  return (
    <div className="relative min-h-screen overflow-x-clip pb-24 md:pb-0">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
      <div className="pointer-events-none absolute inset-0 bg-green-gradient" />

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
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/[0.06] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] status-dot" />
                {t(c.eyebrow)}
              </span>
              <h1 className="mt-5 text-balance !text-[2.2rem] font-bold !leading-[1.05] tracking-tight text-white sm:!text-5xl sm:!leading-[1.04] lg:!text-[3.4rem]">
                <Emphasis text={t(c.title)} />
              </h1>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">{t(c.sub)}</p>

              <ul className="mt-5 grid gap-2">
                {c.bullets.map((b) => (
                  <CheckItem key={b.en}>{t(b)}</CheckItem>
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

            <div className="relative animate-fade-up" style={{ animationDelay: '0.08s' }}>
              <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[var(--accent)]/[0.08] blur-3xl" />
              <div className="relative grid grid-cols-2 gap-3">
                <div className="relative col-span-2 overflow-hidden rounded-3xl border border-[var(--accent)]/20 bg-[#050505]">
                  <div className="pointer-events-none absolute inset-0 bg-grid opacity-70" />
                  <Image
                    src={c.productImage.src}
                    alt={t(c.productImage.alt)}
                    width={c.productImage.width}
                    height={c.productImage.height}
                    className="relative mx-auto h-auto w-full max-w-md px-6 pt-8"
                    priority
                  />
                  <div className="absolute left-4 top-4 -rotate-6 rounded-2xl bg-[var(--accent)] px-4 py-2 text-center text-black shadow-[0_0_30px_rgba(0,255,136,0.45)]">
                    <div className="text-xl font-black leading-none tracking-tight">{t(c.badge.top)}</div>
                    <div className="mt-1 text-[10px] font-bold uppercase leading-none tracking-[0.08em]">{t(c.badge.bottom)}</div>
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
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/[0.06] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--accent)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)] status-dot" />
                {t(UI.eyebrow)} · {t(p.area)}
              </span>
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

            <div className="relative animate-fade-up" style={{ animationDelay: '0.08s' }}>
              <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[var(--accent)]/[0.07] blur-3xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--bg-card)]">
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
            <SectionHead pill={t(c.explainer.pill)} title={t(c.explainer.title)} sub={t(c.explainer.sub)} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {c.explainer.benefits.map((b) => (
                <div key={b.title.en} className="glass rounded-2xl p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                    <PointIcon icon={b.icon} />
                  </span>
                  <h3 className="mt-4 !text-base font-bold !leading-snug text-white">{t(b.title)}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{t(b.desc)}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-center text-sm">
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
            <SectionHead pill={t(c.photos.pill)} title={t(c.photos.title)} sub={t(c.photos.sub)} />
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
                    className="aspect-[3/4] h-full w-full object-cover object-[50%_30%]"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Campaign: how to claim ─────────────────── */}
        {c && (
          <section id="claim" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-10 sm:px-6 sm:py-14">
            <SectionHead pill={t(c.claim.pill)} title={t(c.claim.title)} />
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              <ol className="grid content-start gap-3">
                {c.claim.steps.map((step, i) => (
                  <li key={step.title.en} className="glass flex items-start gap-4 rounded-2xl p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold tabular-nums text-black shadow-[0_0_18px_rgba(0,255,136,0.3)]">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <h3 className="!text-base font-bold text-white">{t(step.title)}</h3>
                      <p className="mt-1 text-[13px] leading-relaxed text-white/65">{t(step.desc)}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <div className="rounded-3xl border border-[var(--accent)]/25 bg-gradient-to-b from-[var(--accent)]/[0.09] to-transparent p-6 sm:p-7">
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
            <SectionHead pill={t(UI.symptomsPill)} title={t(UI.symptomsTitle)} sub={t(UI.symptomsSub)} />
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {p.symptoms.map((s) => (
                <a
                  key={s.id}
                  href={waSymptom(t(s.label))}
                  {...EXTERNAL}
                  onClick={() => track('whatsapp', `symptom:${s.id}`)}
                  className="group glass card-green-hover flex min-h-[112px] flex-col justify-between gap-3 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${GROUP_TONE[s.group]}`}>
                      <GroupIcon group={s.group} />
                    </span>
                    <ArrowIcon className="text-white/20 transition-colors group-hover:text-[var(--accent)]" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold leading-snug text-white/90">{t(s.label)}</div>
                    <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-white/35">
                      {t(GROUP_LABEL[s.group])}
                    </div>
                  </div>
                </a>
              ))}
            </div>
            <p className="mt-5 text-center text-sm">
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
            pill={t(UI.servicesPill)}
            title={c ? t(c.servicesTitle) : t(UI.servicesTitle)}
            sub={c ? t(c.servicesSub) : t(p.servicesSub)}
          />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featured && (
              <article className="relative flex flex-col overflow-hidden rounded-3xl border border-[var(--accent)]/20 bg-gradient-to-br from-[var(--accent)]/[0.08] via-white/[0.02] to-transparent p-6 sm:p-8 md:col-span-2">
                <div className="grid flex-1 items-center gap-6 sm:grid-cols-[1.15fr_1fr]">
                  <div>
                    <span className="inline-block rounded-full bg-[var(--accent)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-black">
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
                          ? 'mx-auto h-auto w-full max-w-sm drop-shadow-[0_20px_40px_rgba(0,255,136,0.12)]'
                          : 'aspect-[16/10] h-full w-full rounded-2xl border border-white/10 object-cover sm:aspect-[4/3]'
                      }
                    />
                  )}
                </div>
                <ul className="mt-6 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {featured.items.map((item) => (
                    <CheckItem key={item.en}>{t(item)}</CheckItem>
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
                icon={svc.icon}
                cta={t(svc.cta)}
                href={waService(t(svc.title))}
                onClick={() => track('whatsapp', `service:${svc.id}`)}
              />
            ))}
          </div>

          {p.banner && (
            <div className="glass mt-4 flex flex-col gap-4 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                  {p.banner.icon === 'home' ? <HomeIcon /> : <PointIcon icon="parts" />}
                </span>
                <div>
                  <h3 className="!text-lg font-bold tracking-tight text-white">{t(p.banner.title)}</h3>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-white/70">{t(p.banner.desc)}</p>
                </div>
              </div>
              <a
                href={waBanner}
                {...EXTERNAL}
                onClick={() => track('whatsapp', `banner:${p.banner?.icon}`)}
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
          <SectionHead pill={t(UI.whyPill)} title={t(UI.whyTitle)} />
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8">
            <div className="grid content-start gap-3 sm:grid-cols-2">
              {p.points.map((pt) => (
                <div key={pt.icon} className="glass flex gap-3.5 rounded-2xl p-5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
                    <PointIcon icon={pt.icon} />
                  </span>
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
                  <span className="ml-auto hidden text-[10px] font-medium uppercase tracking-[0.14em] text-white/40 sm:block">
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
            <SectionHead pill={t(UI.stepsPill)} title={t(UI.stepsTitle)} />
            <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {p.steps.map((s, i) => (
                <li key={s.title.en} className="glass rounded-2xl p-4 sm:p-5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold tabular-nums text-black shadow-[0_0_18px_rgba(0,255,136,0.3)]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="mt-4 !text-base font-bold text-white">{t(s.title)}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{t(s.desc)}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 flex justify-center">
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
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#050505]">
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-60" />
              <div className="pointer-events-none absolute -right-24 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-[var(--accent)]/10 blur-[100px]" />
              <div className="relative grid items-center gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_1fr]">
                <div>
                  <div className="flex items-center gap-3">
                    <Image src="/brand/byki-logo.png" alt="BYKI" width={90} height={24} className="h-5 w-auto" />
                    <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-white/45">
                      {t(UI.bykiPill)}
                    </span>
                  </div>
                  <h2 className="mt-5 text-balance !text-[1.6rem] font-bold tracking-tight text-white sm:!text-[2rem]">
                    {t(UI.bykiTitle)}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">{t(UI.bykiBody)}</p>
                  <ul className="mt-5 grid gap-2.5">
                    {UI.bykiPoints.map((pt) => (
                      <CheckItem key={pt.en}>{t(pt)}</CheckItem>
                    ))}
                  </ul>
                  <div className="mt-7 flex flex-col items-start gap-2.5">
                    <Link href="/" onClick={() => track('byki', 'band')} className={`${BTN_OUTLINE} px-6 py-3.5 text-sm`}>
                      {t(UI.bykiCta)}
                      <ArrowIcon />
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
          <SectionHead pill={t(UI.proofPill)} title={t(p.proofTitle)} />
          <div className={`grid gap-3 ${PROOF_GRID[proofCount]}`}>
            <ProofCard
              href={p.links.googleReviews}
              onClick={() => track('reviews', 'proof')}
              icon={<GoogleIcon />}
              value={p.proof.googleRating.toFixed(1)}
              extra={<Stars />}
              label={`${p.proof.googleReviews} ${t(UI.googleReviewsLabel)}`}
              action={t(UI.readReviews)}
            />
            {p.links.tiktok && p.proof.tiktokFollowers && (
              <ProofCard
                href={p.links.tiktok}
                onClick={() => track('social', 'tiktok')}
                icon={<TikTokIcon />}
                value={p.proof.tiktokFollowers}
                label={t(UI.tiktokLabel)}
                action={t(UI.watchTiktok)}
              />
            )}
            {p.links.facebook && p.proof.facebookFollowers && (
              <ProofCard
                href={p.links.facebook}
                onClick={() => track('social', 'facebook')}
                icon={<FacebookIcon />}
                value={p.proof.facebookFollowers}
                label={t(UI.facebookLabel)}
                action={t(UI.seeFacebook)}
              />
            )}
          </div>
          <div className="mt-5 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-white/50">
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
          <SectionHead pill={t(UI.locationPill)} title={t(UI.locationTitle)} />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="relative flex min-h-[280px] flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-[#070707] p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-grid opacity-80" />
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/10 blur-[70px]" />
              <div className="relative flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-[0_0_24px_rgba(0,255,136,0.4)]">
                  <PinIcon size={22} />
                </span>
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
                  <PinIcon size={16} />
                  {t(UI.openMaps)}
                </a>
                <a
                  href={p.links.waze}
                  {...EXTERNAL}
                  onClick={() => track('directions', 'waze')}
                  className={`${BTN_GHOST} flex-1 px-5 py-3.5 text-sm`}
                >
                  <NavIcon />
                  {t(UI.openWaze)}
                </a>
              </div>
            </div>

            <div className="glass rounded-3xl p-6 sm:p-8">
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
                  <WhatsAppIcon size={17} className="text-[var(--accent)]" />
                  WhatsApp · {p.phoneDisplay}
                </a>
                <a
                  href={telHref}
                  onClick={() => track('call', 'location')}
                  className="flex items-center gap-3 text-sm text-white/85 hover:text-[var(--accent)]"
                >
                  <PhoneIcon size={17} className="text-[var(--accent)]" />
                  {t(UI.call)} · {p.phoneDisplay}
                </a>
                {p.email && (
                  <a
                    href={`mailto:${p.email}`}
                    onClick={() => track('email', 'location')}
                    className="flex items-center gap-3 break-all text-sm text-white/85 hover:text-[var(--accent)]"
                  >
                    <MailIcon className="shrink-0 text-[var(--accent)]" />
                    {p.email}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ────────────────────────────────────── */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-10 sm:px-6 sm:py-14">
          <SectionHead pill={t(UI.faqPill)} title={t(UI.faqTitle)} />
          <div className="grid gap-2.5">
            {faqs.map((f) => (
              <details key={f.q.en} className="group glass rounded-2xl">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-semibold text-white/90 [&::-webkit-details-marker]:hidden">
                  {t(f.q)}
                  <ChevronIcon className="shrink-0 text-white/40 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-white/70">{t(f.a)}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── Final CTA ──────────────────────────────── */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-[var(--accent)]/20 bg-gradient-to-b from-[var(--accent)]/[0.1] to-transparent px-6 py-12 text-center sm:px-10 sm:py-16">
            <div className="pointer-events-none absolute left-1/2 top-0 h-56 w-56 -translate-x-1/2 rounded-full bg-[var(--accent)]/15 blur-[90px]" />
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

function SectionHead({ pill, title, sub }: { pill: string; title: string; sub?: string }) {
  return (
    <div className="mb-9 text-center">
      <span className="section-pill">{pill}</span>
      <h2 className="mx-auto mt-5 max-w-2xl text-balance !text-[1.7rem] font-bold tracking-tight text-white sm:!text-4xl">
        {title}
      </h2>
      {sub && <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">{sub}</p>}
    </div>
  );
}

function ServiceCard({
  title, blurb, items, image, icon, cta, href, onClick,
}: {
  title: string;
  blurb: string;
  items: string[];
  image?: PartnerService['image'];
  icon?: PartnerPoint['icon'];
  cta: string;
  href: string;
  onClick: () => void;
}) {
  const isPhoto = image?.kind === 'photo';
  return (
    <article className="glass flex flex-col overflow-hidden rounded-3xl">
      {image && isPhoto && (
        <div className="relative">
          <Image
            src={image.src}
            alt=""
            width={image.width}
            height={image.height}
            className="aspect-[2/1] h-full w-full object-cover sm:aspect-[16/9]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b0b] via-transparent to-transparent" />
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
        {!image && icon && (
          <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent)]/10 text-[var(--accent)]">
            <PointIcon icon={icon} />
          </span>
        )}
        <h3 className="!text-lg font-bold tracking-tight text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/70">{blurb}</p>
        <ul className="mt-4 grid gap-2">
          {items.map((item) => (
            <CheckItem key={item}>{item}</CheckItem>
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

function CheckItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-snug text-white/85">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden>
        <path d="M3.5 8.5l3 3 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span>{children}</span>
    </li>
  );
}

function ProofCard({
  href, onClick, icon, value, extra, label, action,
}: {
  href: string;
  onClick: () => void;
  icon: React.ReactNode;
  value: string;
  extra?: React.ReactNode;
  label: string;
  action: string;
}) {
  return (
    // A compact row on phones, a stacked card from tablet up.
    <a
      href={href}
      {...EXTERNAL}
      onClick={onClick}
      className="group glass card-green-hover flex items-center gap-4 rounded-3xl p-5 sm:flex-col sm:items-start sm:gap-0 sm:p-6"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-white/80">
        {icon}
      </span>
      <div className="min-w-0 flex-1 sm:mt-5 sm:flex-none">
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold tracking-tight text-white sm:text-4xl">{value}</span>
          {extra}
        </div>
        <div className="text-sm text-white/60 sm:mt-1">{label}</div>
      </div>
      <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--accent)] sm:mt-5">
        <span className="max-sm:sr-only">{action}</span>
        <ArrowIcon className="transition-transform group-hover:translate-x-0.5" />
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

function NavIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M20.5 3.5L3.5 10.2l6.8 2.5 2.5 6.8 7.7-16z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon({ className = '' }: IconProps) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M4 7.5l8 6 8-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
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

function ArrowIcon({ className = '' }: IconProps) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden>
      <path d="M3.5 8h9M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronIcon({ className = '' }: IconProps) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className} aria-hidden>
      <path d="M4.5 7l4.5 4.5L13.5 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M3.5 11.5L12 4l8.5 7.5V20a1 1 0 01-1 1h-5v-6h-5v6h-5a1 1 0 01-1-1v-8.5z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27 3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10 5.35 0 9.25-3.67 9.25-9.09 0-1.15-.15-1.81-.15-1.81z" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M16.6 5.82A4.278 4.278 0 0115.54 3h-3.09v12.4a2.592 2.592 0 01-2.59 2.5c-1.42 0-2.6-1.16-2.6-2.6 0-1.72 1.66-3.01 3.37-2.48V9.66c-3.45-.46-6.47 2.22-6.47 5.64 0 3.33 2.76 5.7 5.69 5.7 3.14 0 5.69-2.55 5.69-5.7V9.01a7.35 7.35 0 004.3 1.38V7.3s-1.88.09-3.24-1.48z" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
    </svg>
  );
}

function GroupIcon({ group }: { group: SymptomGroup }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true } as const;
  const stroke = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (group) {
    case 'gearbox':
      // Gear lever gate
      return (
        <svg {...common}>
          <path d="M6 5v14M12 5v14M18 5v7M6 12h12" {...stroke} />
          <circle cx="6" cy="5" r="1.6" fill="currentColor" />
          <circle cx="12" cy="5" r="1.6" fill="currentColor" />
          <circle cx="18" cy="5" r="1.6" fill="currentColor" />
        </svg>
      );
    case 'aircond':
      // Snowflake
      return (
        <svg {...common}>
          <path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" {...stroke} />
        </svg>
      );
    case 'engine':
    case 'warning':
      // Warning triangle
      return (
        <svg {...common}>
          <path d="M12 4l9 15.5H3L12 4z" {...stroke} />
          <path d="M12 10v4.5" {...stroke} />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" />
        </svg>
      );
    default:
      // Wrench
      return (
        <svg {...common}>
          <path d="M14.5 6.5a4 4 0 005 5L11 20a2.1 2.1 0 01-3-3l8.5-8.5a4 4 0 00-2-2z" {...stroke} />
        </svg>
      );
  }
}

function PointIcon({ icon }: { icon: PartnerPoint['icon'] }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': true } as const;
  const stroke = { stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  switch (icon) {
    case 'free':
      // Magnifier with a check
      return (
        <svg {...common}>
          <circle cx="10.5" cy="10.5" r="6.5" {...stroke} />
          <path d="M15.5 15.5L20 20M7.8 10.6l1.9 1.9 3.5-3.8" {...stroke} />
        </svg>
      );
    case 'scan':
      // Pulse line
      return (
        <svg {...common}>
          <path d="M3 12h4l2.5-6 4 12 2.5-6h5" {...stroke} />
        </svg>
      );
    case 'quote':
      // Receipt
      return (
        <svg {...common}>
          <path d="M6 3.5h12V21l-3-1.8-3 1.8-3-1.8L6 21V3.5zM9 8.5h6M9 12.5h6" {...stroke} />
        </svg>
      );
    case 'warranty':
      // Shield with a check
      return (
        <svg {...common}>
          <path d="M12 3l7.5 3v5.5c0 4.5-3.2 8.2-7.5 9.5-4.3-1.3-7.5-5-7.5-9.5V6L12 3z" {...stroke} />
          <path d="M8.8 12l2.3 2.3 4.2-4.6" {...stroke} />
        </svg>
      );
    case 'team':
      // Two people
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3.2" {...stroke} />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5.2a3.2 3.2 0 010 5.6M17.5 14.4c2.1.8 3.5 2.9 3.5 5.6" {...stroke} />
        </svg>
      );
    case 'alert':
      // Warning triangle
      return (
        <svg {...common}>
          <path d="M12 4l9 15.5H3L12 4z" {...stroke} />
          <path d="M12 10v4.5" {...stroke} />
          <circle cx="12" cy="17" r="0.9" fill="currentColor" />
        </svg>
      );
    case 'parts':
      // Cog
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" {...stroke} />
          <path
            d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8"
            {...stroke}
          />
          <circle cx="12" cy="12" r="6.5" {...stroke} />
        </svg>
      );
    case 'return':
      // Return arrow
      return (
        <svg {...common}>
          <path d="M8 6L4 10l4 4" {...stroke} />
          <path d="M4 10h10a5 5 0 010 10h-3" {...stroke} />
        </svg>
      );
    default:
      // Badge
      return (
        <svg {...common}>
          <circle cx="12" cy="9" r="5.5" {...stroke} />
          <path d="M8.5 13.5L7 21l5-2.5 5 2.5-1.5-7.5" {...stroke} />
        </svg>
      );
  }
}
