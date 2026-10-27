import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Commercial demos use light-first workspace (marketing family).
      mode: 'light',
      toggleMode: () => set({ mode: get().mode === 'light' ? 'dark' : 'light' }),
      setMode: (mode) => set({ mode }),
    }),
    { name: 'hap-theme' },
  ),
);
