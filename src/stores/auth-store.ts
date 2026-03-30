// ─── Auth Store (Zustand) ────────────────────────────────────────────
// Firebase Authentication state management.

import { create } from 'zustand';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;

  // Actions
  initialize: () => () => void;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'Invalid email address';
    case 'auth/user-disabled':
      return 'This account has been disabled';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters';
    case 'auth/too-many-requests':
      return 'Too many attempts — please try again later';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed';
    case 'auth/network-request-failed':
      return 'Network error — check your connection';
    default:
      return 'Something went wrong — please try again';
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,

  initialize: () => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false, isAuthenticated: !!user });
    });
    return unsubscribe;
  },

  loginWithEmail: async (email, password) => {
    set({ error: null, loading: true });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      set({ error: friendlyAuthError(code), loading: false });
    }
  },

  registerWithEmail: async (email, password) => {
    set({ error: null, loading: true });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      set({ error: friendlyAuthError(code), loading: false });
    }
  },

  loginWithGoogle: async () => {
    set({ error: null, loading: true });
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      set({ error: friendlyAuthError(code), loading: false });
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch {
      // Force local state clear even if remote signout fails
    }
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));
