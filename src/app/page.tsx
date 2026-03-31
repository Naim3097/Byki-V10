'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useBluetoothStore } from '@/stores/bluetooth-store';
import { Card, Button } from '@/components/ui';
import NeonGrid from '@/components/neon-grid';

const FEATURES = [
  {
    href: '/diag',
    title: 'Health Scan',
    desc: 'Get a clear health score for your car — like a check-up report you can actually understand.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="14" cy="14" r="4" fill="currentColor" fillOpacity="0.4" />
        <circle cx="14" cy="14" r="1.5" fill="currentColor" />
      </svg>
    ),
    primary: true,
  },
  {
    href: '/diag',
    title: 'Live Data',
    desc: 'Watch your engine sensors in real-time — temperature, speed, fuel efficiency, and more.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <polyline points="2,14 7,7 12,18 17,10 22,16 26,8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/diag',
    title: 'Trouble Codes',
    desc: 'Find out why your check-engine light is on — with plain-language explanations and next steps.',
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <path d="M14 4L25 23H3L14 4z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="14" y1="11" x2="14" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="14" cy="19" r="1" fill="currentColor" />
      </svg>
    ),
  },
];

const STEPS = [
  { num: '01', title: 'Plug In', desc: 'Connect a small Bluetooth adapter to your car\'s OBD2 port (under the dashboard)' },
  { num: '02', title: 'Scan', desc: 'BYKI reads your car\'s sensors automatically — no technical knowledge needed' },
  { num: '03', title: 'Understand', desc: 'Get a simple health score and clear advice on what needs attention' },
  { num: '04', title: 'Get Help', desc: 'Send your report to us on WhatsApp — we\'ll review it and help you book a fix' },
];

const BENEFITS = [
  {
    title: 'Know before it breaks',
    desc: 'Catch small issues early — before they become expensive repairs. BYKI monitors the same sensors your mechanic checks.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: 'Speak your mechanic\'s language',
    desc: 'When you do visit the shop, you\'ll understand what they\'re talking about — and know if the repair is really needed.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    title: 'Check-engine light? Don\'t panic',
    desc: 'That warning light doesn\'t always mean something serious. BYKI tells you exactly what triggered it and how urgent it really is.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
      </svg>
    ),
  },
  {
    title: 'Your car talks — BYKI translates',
    desc: 'Every modern car has hundreds of sensors. BYKI reads them and turns the data into simple insights about your engine, fuel system, and more.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

const PLAIN_LANGUAGE = [
  { sensor: 'Engine Temperature', meaning: 'Is your engine running too hot? Overheating can cause breakdowns — BYKI warns you early.' },
  { sensor: 'Fuel Efficiency', meaning: 'See how well your engine burns fuel. A drop could mean something needs attention.' },
  { sensor: 'Engine Load', meaning: 'How hard your engine is working. Consistently high load might mean a clogged filter or sensor issue.' },
  { sensor: 'Emission Readings', meaning: 'Will your car pass inspection? BYKI checks the same emission sensors that MOT/smog tests use.' },
];

export default function HomePage() {
  const bt = useBluetoothStore();

  return (
    <div className="relative">
      {/* Background grid + green gradient + neon lines */}
      <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-green-gradient pointer-events-none" />
      <NeonGrid />

      {/* ── Hero ──────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center min-h-[70vh] px-6 pt-8 pb-12 text-center overflow-hidden">
        <div className="animate-fade-up">
          <Image
            src="/brand/byki-logo.png"
            alt="BYKI"
            width={135}
            height={38}
            className="mx-auto drop-shadow-[0_0_30px_var(--accent-glow)]"
            priority
          />
          <h1 className="text-white/90 text-2xl sm:text-3xl md:text-4xl font-bold mt-4 max-w-md mx-auto leading-tight tracking-tight">
            Understand your car&apos;s health — no mechanic degree required
          </h1>
          <p className="text-white/60 text-sm sm:text-base mt-3 max-w-sm mx-auto leading-relaxed">
            A simple scan that reads your car&apos;s sensors and tells you what&apos;s good, what to watch, and what needs fixing.
          </p>
        </div>

        {/* Hero car visual */}
        <div className="relative mt-8 animate-fade-up w-full max-w-md mx-auto" style={{ animationDelay: '0.05s' }}>
          <Image
            src="/brand/hero-car-v10.png"
            alt="Vehicle diagnostics"
            width={800}
            height={500}
            className="w-full h-auto drop-shadow-[0_10px_40px_rgba(0,255,136,0.08)]"
            priority
          />
        </div>

        {/* Connection quick-status */}
        <div className="mt-6 animate-fade-up" style={{ animationDelay: '0.1s' }}>
          {bt.isConnected ? (
            <Card className="flex items-center gap-3 !px-5 !py-3">
              <span className="w-2 h-2 rounded-full bg-emerald-400 status-dot" />
              <span className="text-sm text-emerald-400 font-medium">{bt.connectedAdapter?.deviceName ?? 'Adapter Connected'}</span>
            </Card>
          ) : (
            <Card className="flex items-center gap-3 !px-5 !py-3">
              <span className="w-2 h-2 rounded-full bg-white/15" />
              <span className="text-sm text-white/60">No adapter connected</span>
            </Card>
          )}
        </div>

        {/* CTA */}
        <div className="mt-8 animate-fade-up flex flex-col items-center gap-3" style={{ animationDelay: '0.2s' }}>
          <Link href="/diag">
            <Button size="lg" className="text-base">
              Start Diagnostics
            </Button>
          </Link>
          <span className="text-xs text-white/60">Free · Works in your browser</span>
        </div>
      </section>

      {/* ── What is BYKI? ─────────────────────────── */}
      <section className="relative max-w-3xl mx-auto px-6 pb-16">
        <div className="text-center mb-10">
          <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase mb-4">What is BYKI?</h2>
          <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            Every car made after 1996 has a hidden computer that tracks how your engine, fuel system, 
            and emissions are doing. <strong className="text-[var(--accent)]">BYKI connects to it through your phone&apos;s browser</strong> and 
            turns that raw data into a simple health report anyone can understand.
          </p>
        </div>
      </section>

      {/* ── How it helps you ──────────────────────── */}
      <section className="relative max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase text-center mb-8">How BYKI helps you</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <Card key={b.title} className="card-green-hover flex gap-4 items-start transition-all cursor-pointer">
              <div className="text-[var(--accent)]/60 flex-shrink-0 mt-0.5">{b.icon}</div>
              <div>
                <h3 className="text-sm font-semibold text-white/90 mb-1">{b.title}</h3>
                <p className="text-xs text-white/70 leading-relaxed">{b.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── OBDII visual ────────────────────────── */}
      <section className="relative max-w-md mx-auto px-6 pb-16">
        <div className="animate-fade-up">
          <Image
            src="/brand/obdii.png"
            alt="OBD2 adapter"
            width={800}
            height={500}
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* ── What sensors mean ─────────────────────── */}
      <section className="relative max-w-3xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase mb-3">What your car is telling you</h2>
          <p className="text-white/70 text-sm max-w-md mx-auto leading-relaxed">
            Your car has sensors that monitor everything. Here&apos;s what they mean in everyday terms:
          </p>
        </div>
        <div className="space-y-3">
          {PLAIN_LANGUAGE.map((item) => (
            <Card key={item.sensor} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
              <span className="text-sm font-semibold text-[var(--accent)]/70 sm:w-40 flex-shrink-0">{item.sensor}</span>
              <p className="text-xs text-white/70 leading-relaxed">{item.meaning}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Feature cards ─────────────────────────── */}
      <section className="relative max-w-4xl mx-auto px-6 pb-16">
        <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase text-center mb-8">What you can do</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f) => (
            <Link key={f.title} href={f.href} className="group">
              <Card hover className={`h-full flex flex-col gap-3 animate-fade-up ${f.primary ? 'border-[var(--accent)]/15' : ''}`} >
                <div className={`${f.primary ? 'text-[var(--accent)]' : 'text-white/30 group-hover:text-white/60'} transition-colors`}>
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                <p className="text-xs text-white/70 leading-relaxed">{f.desc}</p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────── */}
      <section className="relative max-w-3xl mx-auto px-6 pb-16">
        <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase text-center mb-8">How it works</h2>
        <div className="grid gap-6 sm:grid-cols-4">
          {STEPS.map(s => (
            <div key={s.num} className="flex flex-col items-center text-center gap-2">
              <span className="text-2xl font-bold text-[var(--accent)]/30 font-mono">{s.num}</span>
              <span className="text-sm font-semibold text-white/90">{s.title}</span>
              <span className="text-xs text-white/70 leading-relaxed">{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── What you'll need ─────────────────────── */}
      <section className="relative max-w-3xl mx-auto px-6 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-xs font-mono text-white/60 tracking-widest uppercase mb-3">What you&apos;ll need</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="text-center">
            <div className="text-[var(--accent)]/40 flex justify-center mb-2">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="7" y="2" width="14" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <line x1="12" y1="22" x2="16" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white/90 mb-1">Your Phone</h3>
            <p className="text-xs text-white/70 leading-relaxed">Any phone with Chrome or Edge browser (Bluetooth-enabled)</p>
          </Card>
          <Card className="text-center">
            <div className="text-[var(--accent)]/40 flex justify-center mb-2">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <rect x="4" y="8" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 12h2M8 16h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="19" cy="14" r="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white/90 mb-1">ELM327 Adapter</h3>
            <p className="text-xs text-white/70 leading-relaxed">A small Bluetooth OBD2 adapter (available for ~$15 online)</p>
          </Card>
          <Card className="text-center">
            <div className="text-[var(--accent)]/40 flex justify-center mb-2">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M14 4C8.477 4 4 8.477 4 14s4.477 10 10 10 10-4.477 10-10S19.523 4 14 4z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 14h20" stroke="currentColor" strokeWidth="1.5" />
                <path d="M14 4c2.5 2.5 4 6 4 10s-1.5 7.5-4 10c-2.5-2.5-4-6-4-10s1.5-7.5 4-10z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-white/90 mb-1">Any Car (1996+)</h3>
            <p className="text-xs text-white/70 leading-relaxed">Works with all OBD2-compatible vehicles — that&apos;s nearly every car on the road</p>
          </Card>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────── */}
      <section className="relative max-w-3xl mx-auto px-6 pb-16 text-center">
        <Card className="!p-8 sm:!p-10 border-[var(--accent)]/10">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white/90 mb-2">Ready to check your car?</h2>
          <p className="text-sm text-white/70 mb-6 max-w-sm mx-auto leading-relaxed">
            It takes about 30 seconds. No downloads — just connect and scan.
          </p>
          <Link href="/diag">
            <Button size="lg" className="text-base">
              Start Diagnostics
            </Button>
          </Link>
        </Card>
      </section>

      {/* ── WhatsApp direct ──────────────────────── */}
      <section className="relative max-w-3xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-2xl border border-[#25D366]/15 bg-gradient-to-br from-[#25D366]/[0.04] to-transparent p-6 sm:p-8 text-center">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full opacity-10 blur-[60px] pointer-events-none bg-[#25D366]" />
          <div className="relative space-y-4">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-[#25D366]">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight text-white/90">Have questions? We&apos;re here to help</h3>
              <p className="text-sm text-white/70 mt-1.5 max-w-sm mx-auto leading-relaxed">
                After your scan, you can send your results directly to us on WhatsApp. We&apos;ll review your report and advise you — for free.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href="https://wa.me/601133095095?text=Hi%2C%20I%27d%20like%20to%20know%20more%20about%20BYKI%20vehicle%20diagnostics."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:brightness-110 transition-all active:scale-[0.97] shadow-[0_0_20px_rgba(37,211,102,0.2)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat with Us
              </a>
              <a
                href="https://wa.me/601133095095?text=Hi%2C%20I%27d%20like%20a%20live%20video%20call%20consultation%20for%20my%20vehicle."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/[0.06] border border-[#25D366]/25 text-[#25D366] text-sm font-semibold hover:bg-[#25D366]/10 transition-all active:scale-[0.97]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[#25D366]">
                  <rect x="2" y="4" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <polygon points="10,8.5 16,11 10,13.5" fill="currentColor" />
                  <path d="M18 18l3 3M18 21l3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Live Video Call
              </a>
            </div>
            <p className="text-xs text-white/12">No automated bots — you&apos;ll talk to a real person</p>
          </div>
        </div>
      </section>
    </div>
  );
}
