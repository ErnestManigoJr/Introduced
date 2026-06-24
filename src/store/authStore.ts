import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppUser } from '../types/database';
import { supabase } from '../lib/supabase';

interface AuthState {
  appUser: AppUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  connectionStyleComplete: boolean;

  setAppUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
  setOnboardingComplete: (v: boolean) => void;
  setConnectionStyleComplete: (v: boolean) => void;
  signOut: () => Promise<void>;
  reset: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      appUser: null,
      isLoading: false,
      isAuthenticated: false,
      onboardingComplete: false,
      connectionStyleComplete: false,

      setAppUser: (user) =>
        set({
          appUser: user,
          isAuthenticated: !!user,
          onboardingComplete: user?.onboarding_status === 'complete',
          connectionStyleComplete: user?.connection_style_complete ?? false,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setOnboardingComplete: (v) => set({ onboardingComplete: v }),

      setConnectionStyleComplete: (v) => set({ connectionStyleComplete: v }),

      signOut: async () => {
        await supabase.auth.signOut();
        set({
          appUser: null,
          isAuthenticated: false,
          onboardingComplete: false,
          connectionStyleComplete: false,
        });
      },

      reset: () =>
        set({
          appUser: null,
          isLoading: false,
          isAuthenticated: false,
          onboardingComplete: false,
          connectionStyleComplete: false,
        }),
    }),
    {
      name: 'introduced-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        appUser: state.appUser,
        isAuthenticated: state.isAuthenticated,
        onboardingComplete: state.onboardingComplete,
        connectionStyleComplete: state.connectionStyleComplete,
      }),
    }
  )
);
