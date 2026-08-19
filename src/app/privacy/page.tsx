import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'BYKI — Privacy Policy',
  description:
    'How the BYKI application handles your information. BYKI stores your vehicles, scan results and reports only on your own device.',
};

const CONTACT_EMAIL = 'sales@nexovadigital.com';
const EFFECTIVE_DATE = '19 August 2026';

// ── Local building blocks ───────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="text-lg font-bold tracking-tight text-white pb-2 border-b border-white/10">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-white/60">{children}</div>
    </section>
  );
}

function Perm({ name, codes }: { name: string; codes?: string[] }) {
  return (
    <p className="text-white/80 font-semibold">
      {name}
      {codes && (
        <span className="ml-2 font-normal">
          {codes.map((c) => (
            <code
              key={c}
              className="mr-1.5 inline-block rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-[var(--accent)]/80"
            >
              {c}
            </code>
          ))}
        </span>
      )}
    </p>
  );
}

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-[0.55rem] h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ── Page ────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
      <header>
        <span className="section-pill">Legal</span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-widest text-white/35">
          BYKI · Effective {EFFECTIVE_DATE}
        </p>
      </header>

      <p className="mt-8 text-sm leading-relaxed text-white/60">
        This policy explains how the BYKI mobile application (&ldquo;BYKI&rdquo;, &ldquo;the
        app&rdquo;) handles your information. It applies to the Android application published as{' '}
        <code className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-[var(--accent)]/80">
          my.byki.app
        </code>
        .
      </p>

      <div className="glass mt-6 rounded-2xl border-l-2 border-l-[var(--accent)] p-5 text-sm leading-relaxed text-white/70">
        <strong className="font-bold text-white">Summary:</strong> BYKI does not transmit your
        personal data to us or to any third party. Everything the app records — your vehicles, scan
        results, reports and settings — is stored only on your own device.
      </div>

      <div className="mt-10">
        <Section title="Information we collect">
          <p className="text-white/80">
            <strong>
              We do not collect, transmit, or store any personal information on our servers.
            </strong>{' '}
            BYKI has no user accounts in this release and no backend service that receives your
            data.
          </p>
          <p>
            The app creates and stores the following <em>locally on your device only</em>:
          </p>
          <Bullets
            items={[
              'Vehicle details you enter, such as make, model and registration.',
              'Diagnostic results read from your OBD2 adapter, including fault codes, system scan results and live engine data.',
              'Inspection and health-scan reports you generate.',
              'Service records, bookings and shopping cart contents.',
              'App preferences and settings.',
            ]}
          />
          <p>
            This data remains on your device. It is removed when you uninstall the app or clear its
            storage. We have no ability to access it.
          </p>
        </Section>

        <Section title="Device permissions and why we need them">
          <Perm
            name="Bluetooth"
            codes={['BLUETOOTH_SCAN', 'BLUETOOTH_CONNECT', 'BLUETOOTH_ADVERTISE']}
          />
          <p>
            Used to discover and connect to your OBD2 diagnostic adapter and to read vehicle data
            from it. BYKI communicates only with the adapter you choose to connect to. Vehicle data
            read over Bluetooth is stored on your device and is not sent anywhere.
          </p>

          <Perm name="Location" codes={['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION']} />
          <p>Location permission is required for two reasons:</p>
          <Bullets
            items={[
              <>
                <strong className="text-white/80">Bluetooth scanning.</strong> Android requires apps
                to hold location permission in order to scan for nearby Bluetooth devices. BYKI
                needs this to find your OBD2 adapter, even though it does not use your location for
                that purpose.
              </>,
              <>
                <strong className="text-white/80">Location features.</strong> Finding nearby
                workshops and attaching your position to an emergency assistance request.
              </>,
            ]}
          />
          <p>
            Your location is used on your device to serve these features and is not transmitted to
            us or stored on any server. You can deny or revoke location permission in Android
            Settings; Bluetooth scanning and location-based features will stop working, but the rest
            of the app continues to function.
          </p>

          <Perm name="Internet and network state" codes={['INTERNET', 'ACCESS_NETWORK_STATE']} />
          <p>
            Used to load images and content shown in the app, and to open external links such as
            maps, phone calls and WhatsApp when you tap them.
          </p>

          <Perm name="Photos" />
          <p>
            If you attach a photo to a request, the app uses the Android system photo picker. BYKI
            can access only the specific images you select, and those images stay on your device.
          </p>
        </Section>

        <Section title="Leaving the app">
          <p>
            BYKI can open other apps and websites at your request — for example a phone dialler,
            WhatsApp, or a map application for directions to a workshop. Once you leave BYKI, the
            privacy policy of that other app or website applies. We are not responsible for how
            those services handle your information.
          </p>
        </Section>

        <Section title="Third-party services">
          <p>
            This release of BYKI does not use analytics, advertising, crash reporting, or tracking
            services of any kind. No advertising identifier is collected. No third-party account
            sign-in is active in this release.
          </p>
        </Section>

        <Section title="Children">
          <p>
            BYKI is a vehicle diagnostic tool intended for vehicle owners and motor trade
            professionals. It is not directed at children under 13, and we do not knowingly collect
            information from children.
          </p>
        </Section>

        <Section title="Your choices">
          <Bullets
            items={[
              'Revoke Bluetooth or location permission at any time in Android Settings.',
              "Delete all app data by clearing the app's storage or uninstalling BYKI.",
            ]}
          />
          <p>
            Because we hold no copy of your data, deleting it on your device deletes it entirely.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If a future version of BYKI collects or transmits data — for example if user accounts
            are introduced — this policy will be updated before that version is released, and the
            effective date above will change.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions about this policy can be sent to{' '}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[var(--accent)] underline underline-offset-4 hover:brightness-110"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>

      <footer className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-5 text-xs text-white/35 sm:flex-row sm:items-center sm:justify-between">
        <span>BYKI · Last updated {EFFECTIVE_DATE}</span>
        <Link href="/" className="text-white/45 transition-colors hover:text-[var(--accent)]">
          ← Back to BYKI
        </Link>
      </footer>
    </div>
  );
}
