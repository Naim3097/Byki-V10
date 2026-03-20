'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useBluetoothStore } from '@/stores/bluetooth-store';
import { useDtcStore } from '@/stores/dtc-store';
import type { DtcCode } from '@/models';
import { DtcSource } from '@/models';
import { Card, Button, Badge, severityColor } from '@/components/ui';

// ── DTC card ────────────────────────────────────────────────────────

function DtcCard({ dtc }: { dtc: DtcCode }) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="!p-0 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/3 transition-colors"
      >
        {/* Severity stripe */}
        <div className={`w-1 self-stretch rounded-full -my-4 -ml-4 mr-2 ${
          dtc.severity === 'CRITICAL' ? 'bg-red-500' :
          dtc.severity === 'MAJOR' ? 'bg-orange-500' :
          dtc.severity === 'MODERATE' ? 'bg-yellow-500' :
          dtc.severity === 'MINOR' ? 'bg-blue-500' : 'bg-white/10'
        }`} />

        <span className="text-sm font-mono font-bold text-[var(--accent)]">{dtc.code}</span>
        <span className="flex-1 text-sm text-white/60 truncate">{dtc.description || 'Unknown code'}</span>

        {dtc.severity && (
          <Badge className={severityColor(dtc.severity)}>{dtc.severity}</Badge>
        )}
        {dtc.source === DtcSource.PERMANENT && (
          <Badge color="red">PERM</Badge>
        )}

        <svg width="12" height="12" viewBox="0 0 12 12" className={`text-white/20 transition-transform ${open ? 'rotate-180' : ''}`}>
          <polyline points="2,4 6,8 10,4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/5 pt-3 animate-fade-up" style={{ animationDuration: '0.15s' }}>
          {dtc.system && (
            <p className="text-xs"><span className="text-white/25">System:</span> <span className="text-white/50">{dtc.system}</span></p>
          )}
          {dtc.possibleCauses && dtc.possibleCauses.length > 0 && (
            <div>
              <p className="text-xs text-white/25 mb-1">Possible causes</p>
              <ul className="text-xs text-white/50 list-disc list-inside space-y-0.5">
                {dtc.possibleCauses.map((c: string, i: number) => <li key={i}>{c}</li>)}
              </ul>
            </div>
          )}
          {dtc.consumerAdvice && (
            <p className="text-xs"><span className="text-white/25">Recommendation:</span> <span className="text-white/50">{dtc.consumerAdvice}</span></p>
          )}
          {dtc.estimatedCost && (
            <p className="text-xs"><span className="text-white/25">Est. cost:</span> <span className="text-white/50">{dtc.estimatedCost}</span></p>
          )}
        </div>
      )}
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ── DTC Page ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export default function DtcPage() {
  const bt = useBluetoothStore();
  const dtcStore = useDtcStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const confirmed = dtcStore.storedDtcs;
  const pending = dtcStore.pendingDtcs;
  const permanent = dtcStore.permanentDtcs;

  const matchesSearch = (dtc: DtcCode) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return dtc.code.toLowerCase().includes(q) || (dtc.description ?? '').toLowerCase().includes(q);
  };

  const filteredConfirmed = confirmed.filter(matchesSearch);
  const filteredPending = pending.filter(matchesSearch);
  const filteredPermanent = permanent.filter(matchesSearch);
  const totalFiltered = filteredConfirmed.length + filteredPending.length + filteredPermanent.length;

  // ── Not connected ─────────────────────────────────────────────
  if (!bt.isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 gap-4">
        <p className="text-sm text-white/30">Connect an adapter to read DTCs</p>
        <Link href="/scan">
          <Button variant="secondary">Go to Scan</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto space-y-5 animate-fade-up">

      {/* ── Summary banner ────────────────────── */}
      <div className="flex items-center gap-3 glass rounded-2xl p-3">
        <Button onClick={() => dtcStore.readDtcs()} disabled={dtcStore.state === 'reading'} size="sm">
          {dtcStore.state === 'reading' ? 'Reading…' : 'Read DTCs'}
        </Button>

        {dtcStore.totalCount > 0 && (
          <>
            {!confirmClear ? (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setConfirmClear(true)}
                disabled={dtcStore.state === 'clearing'}
              >
                Clear DTCs
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-400">Are you sure?</span>
                <Button variant="danger" size="sm" onClick={() => { dtcStore.clearDtcs(); setConfirmClear(false); }}>
                  Yes, clear
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Cancel</Button>
              </div>
            )}
          </>
        )}

        {/* Count chips */}
        <div className="ml-auto flex items-center gap-2">
          {confirmed.length > 0 && <Badge color="red">{confirmed.length} stored</Badge>}
          {pending.length > 0 && <Badge color="yellow">{pending.length} pending</Badge>}
          {permanent.length > 0 && <Badge color="orange">{permanent.length} perm</Badge>}
          {dtcStore.totalCount === 0 && dtcStore.state !== 'idle' && (
            <span className="text-xs text-white/20 font-mono">{dtcStore.totalCount} codes</span>
          )}
        </div>
      </div>

      {/* ── Error ─────────────────────────────── */}
      {dtcStore.errorMessage && (
        <Card className="border-red-500/15">
          <p className="text-sm text-red-400">{dtcStore.errorMessage}</p>
        </Card>
      )}

      {/* ── Search ────────────────────────────── */}
      {dtcStore.totalCount > 0 && (
        <div className="relative">
          <svg width="14" height="14" viewBox="0 0 14 14" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/15">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.3" fill="none" />
            <line x1="9.5" y1="9.5" x2="12.5" y2="12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search codes or descriptions…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 glass rounded-xl text-sm text-white placeholder-white/15 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
          />
        </div>
      )}

      {/* ── Code Lists ────────────────────────── */}
      {filteredConfirmed.length > 0 && (
        <CodeGroup label="Confirmed" color="red" count={filteredConfirmed.length}>
          {filteredConfirmed.map(dtc => <DtcCard key={`c-${dtc.code}`} dtc={dtc} />)}
        </CodeGroup>
      )}

      {filteredPending.length > 0 && (
        <CodeGroup label="Pending" color="yellow" count={filteredPending.length}>
          {filteredPending.map(dtc => <DtcCard key={`p-${dtc.code}`} dtc={dtc} />)}
        </CodeGroup>
      )}

      {filteredPermanent.length > 0 && (
        <CodeGroup label="Permanent" color="orange" count={filteredPermanent.length}>
          {filteredPermanent.map(dtc => <DtcCard key={`pm-${dtc.code}`} dtc={dtc} />)}
        </CodeGroup>
      )}

      {/* ── Empty states ──────────────────────── */}
      {dtcStore.state === 'complete' && totalFiltered === 0 && !searchQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/8 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-emerald-400">
              <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.5" />
              <polyline points="9,14 13,18 19,10" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-emerald-400 mb-1">No Trouble Codes</h3>
          <p className="text-sm text-white/30">Your vehicle has no stored DTCs</p>
        </div>
      )}

      {dtcStore.state === 'complete' && totalFiltered === 0 && searchQuery && (
        <p className="text-center py-8 text-white/25 text-sm">No codes match &quot;{searchQuery}&quot;</p>
      )}

      {dtcStore.state === 'idle' && dtcStore.totalCount === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm text-white/25">Press &quot;Read DTCs&quot; to scan for trouble codes</p>
        </div>
      )}
    </div>
  );
}

// ── Category group wrapper ──────────────────────────────────────────

function CodeGroup({ label, color, count, children }: {
  label: string; color: string; count: number; children: React.ReactNode;
}) {
  const dotColors: Record<string, string> = {
    red: 'bg-red-400', yellow: 'bg-yellow-400', orange: 'bg-orange-400',
  };
  return (
    <section>
      <h3 className="text-xs font-mono text-white/20 uppercase tracking-wider mb-2 flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${dotColors[color] ?? 'bg-white/20'}`} />
        {label} ({count})
      </h3>
      <div className="space-y-2">
        {children}
      </div>
    </section>
  );
}
