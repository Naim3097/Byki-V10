'use client';

import { useState } from 'react';
import { findNearestLocation } from '@/lib/whatsapp-locations';
import { useLocationStore } from '@/stores/location-store';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface Props {
  variant?: 'dark' | 'light';
}

export function UseMyLocationButton({ variant = 'dark' }: Props) {
  const setLocation = useLocationStore((s) => s.setLocation);
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string>('');

  const handleClick = () => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setStatus('error');
      setMessage('Location not supported by this browser');
      return;
    }

    setStatus('loading');
    setMessage('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { location, distanceKm } = findNearestLocation(
          pos.coords.latitude,
          pos.coords.longitude,
        );
        setLocation(location.id);
        setStatus('success');
        setMessage(
          `Picked ${location.city} (${location.area}) — ~${
            distanceKm < 10 ? distanceKm.toFixed(1) : Math.round(distanceKm)
          } km away`,
        );
      },
      (err) => {
        setStatus('error');
        setMessage(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied — pick a branch below'
            : 'Could not get your location — pick a branch below',
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 },
    );
  };

  const isDark = variant === 'dark';
  const baseBtn = isDark
    ? 'border-[#25D366]/30 bg-[#25D366]/[0.06] text-[#25D366] hover:bg-[#25D366]/10'
    : 'border-[#25D366]/40 bg-[#25D366]/[0.06] text-[#1a8a4a] hover:bg-[#25D366]/10';
  const successColor = isDark ? 'text-[#25D366]' : 'text-[#1a8a4a]';
  const errorColor = isDark ? 'text-amber-300/80' : 'text-amber-700';

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={status === 'loading'}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all active:scale-[0.98] disabled:opacity-60 ${baseBtn}`}
      >
        {status === 'loading' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
            <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 22s7-7.582 7-13a7 7 0 10-14 0c0 5.418 7 13 7 13z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        )}
        {status === 'loading' ? 'Detecting…' : 'Use my location'}
      </button>
      {status === 'success' && message && (
        <p className={`text-[11px] ${successColor}`}>{message}</p>
      )}
      {status === 'error' && message && (
        <p className={`text-[11px] ${errorColor}`}>{message}</p>
      )}
    </div>
  );
}
