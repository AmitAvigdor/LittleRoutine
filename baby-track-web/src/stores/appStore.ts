import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Baby, AppSettings } from '@/types';
import { isNightModeTime } from '@/types';

interface AppState {
  // Auth
  userId: string | null;
  isAuthenticated: boolean;

  // Selected baby
  selectedBabyId: string | null;
  selectedBaby: Baby | null;

  // All babies
  babies: Baby[];

  // Settings
  settings: AppSettings | null;

  // UI State
  nightMode: boolean;
  sidebarOpen: boolean;

  // Actions
  setUserId: (userId: string | null) => void;
  setSelectedBabyId: (babyId: string | null) => void;
  setSelectedBaby: (baby: Baby | null) => void;
  setBabies: (babies: Baby[]) => void;
  setSettings: (settings: AppSettings | null) => void;
  setNightMode: (enabled: boolean) => void;
  toggleSidebar: () => void;
  updateNightModeFromSettings: () => void;
  reset: () => void;
}

const initialState = {
  userId: null,
  isAuthenticated: false,
  selectedBabyId: null,
  selectedBaby: null,
  babies: [],
  settings: null,
  nightMode: false,
  sidebarOpen: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUserId: (userId) =>
        set({ userId, isAuthenticated: !!userId }),

      setSelectedBabyId: (babyId) => {
        const { babies } = get();
        const baby = babies.find((b) => b.id === babyId) || null;
        set({ selectedBabyId: babyId, selectedBaby: baby });
      },

      setSelectedBaby: (baby) =>
        set({ selectedBaby: baby, selectedBabyId: baby?.id || null }),

      setBabies: (babies) => {
        console.log('appStore.setBabies: Received babies:', babies);
        const { selectedBabyId } = get();
        console.log('appStore.setBabies: Current selectedBabyId:', selectedBabyId);
        let selectedBaby = babies.find((b) => b.id === selectedBabyId) || null;

        // If no baby is selected, select the active one or the first one
        if (!selectedBaby && babies.length > 0) {
          selectedBaby = babies.find((b) => b.isActive) || babies[0];
          console.log('appStore.setBabies: Auto-selected baby:', selectedBaby?.name);
        }

        console.log('appStore.setBabies: Setting state with', babies.length, 'babies, selected:', selectedBaby?.name);
        set({
          babies,
          selectedBaby,
          selectedBabyId: selectedBaby?.id || null,
        });
      },

      setSettings: (settings) => {
        set({ settings });
        get().updateNightModeFromSettings();
      },

      setNightMode: (enabled) => set({ nightMode: enabled }),

      toggleSidebar: () =>
        set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      updateNightModeFromSettings: () => {
        const { settings } = get();
        if (settings) {
          const nightMode = isNightModeTime(settings);
          set({ nightMode });
        }
      },

      reset: () => set(initialState),
    }),
    {
      name: 'baby-track-store',
      partialize: (state) => ({
        selectedBabyId: state.selectedBabyId,
      }),
    }
  )
);
