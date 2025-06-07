import { create } from 'zustand';

type Vector = { id: string; content: string; embedding?: number[] };
type VectorStore = {
  vectors: Vector[];
  stats: { count: number; dimensions: number };
  search: (query: string) => Promise<void>;
  add: (doc: Vector) => Promise<void>;
  delete: (id: string) => Promise<void>;
  loadStats: () => Promise<void>;
};

export const useVectorStore = create<VectorStore>((set) => ({
  vectors: [],
  stats: { count: 0, dimensions: 0 },

  search: async (query) => {
    const res = await window.electron.ipc.invoke('vector:search', query);
    set({ vectors: res });
  },

  add: async (doc) => {
    await window.electron.ipc.invoke('vector:add', doc);
    await useVectorStore.getState().search('');
    await useVectorStore.getState().loadStats();
  },

  delete: async (id) => {
    await window.electron.ipc.invoke('vector:delete', id);
    await useVectorStore.getState().search('');
    await useVectorStore.getState().loadStats();
  },

  loadStats: async () => {
    const stats = await window.electron.ipc.invoke('vector:stats');
    set({ stats });
  }
})); 