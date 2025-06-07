import { create } from 'zustand';

type Mode = 'local' | 'cloud';

interface EnvironmentModeState {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

export const useEnvironmentMode = create<EnvironmentModeState>((set) => ({
  mode: 'local',
  setMode: (mode) => set({ mode }),
})); 