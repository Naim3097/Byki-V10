// ─── WhatsApp Location Store (Zustand) ────────────────────────────────
// Persists the customer's chosen branch/location across pages so the
// WhatsApp CTAs route to the right number.

import { create } from 'zustand';
import { WHATSAPP_LOCATIONS, type WhatsAppLocationId } from '@/lib/whatsapp-locations';

const STORAGE_KEY = 'byki:whatsapp-location';

function isValidId(v: string): v is WhatsAppLocationId {
  return WHATSAPP_LOCATIONS.some((l) => l.id === v);
}

export interface LocationState {
  selectedId: WhatsAppLocationId | null;
  hydrated: boolean;
  setLocation: (id: WhatsAppLocationId) => void;
  clearLocation: () => void;
  hydrate: () => void;
}

export const useLocationStore = create<LocationState>((set) => ({
  selectedId: null,
  hydrated: false,

  setLocation: (id) => {
    if (typeof window !== 'undefined') {
      try { window.localStorage.setItem(STORAGE_KEY, id); } catch {}
    }
    set({ selectedId: id });
  },

  clearLocation: () => {
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch {}
    }
    set({ selectedId: null });
  },

  hydrate: () => {
    if (typeof window === 'undefined') {
      set({ hydrated: true });
      return;
    }
    try {
      const v = window.localStorage.getItem(STORAGE_KEY);
      set({ selectedId: v && isValidId(v) ? v : null, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },
}));
