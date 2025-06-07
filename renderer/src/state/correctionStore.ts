import { create } from 'zustand';

type Correction = {
  id: number;
  original: string;
  revised: string;
};

export const useCorrectionStore = create<{
  corrections: Correction[];
  mark: (id: number, text: string) => void;
  update: (id: number, revised: string) => void;
  commit: () => Promise<void>;
}>((set, get) => ({
  corrections: [],
  mark: (id, original) => {
    set(state => ({
      corrections: [...state.corrections, { id, original, revised: original }]
    }));
  },
  update: (id, revised) => {
    set(state => ({
      corrections: state.corrections.map(c =>
        c.id === id ? { ...c, revised } : c
      )
    }));
  },
  commit: async () => {
    for (const c of get().corrections) {
      await window.electron.ipc.invoke('vector:add', {
        id: `correction-${Date.now()}`,
        content: c.revised
      });
    }
    set({ corrections: [] });
  }
})); 