import { create } from 'zustand';
import { OllamaModel, OllamaResponse } from '@shared/types/ollama';

interface ModelState {
  models: OllamaModel[];
  current: string | null;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  set: (modelName: string) => Promise<void>;
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  current: null,
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const response = await window.electronAPI.ollama.listModels();
      if (!response.success) {
        throw new Error(response.error || 'Failed to load models');
      }
      const models = response.result?.models || [];
      set({ models, loading: false });
      if (models.length > 0 && !get().current) {
        await get().set(models[0].name);
      }
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load models',
        loading: false 
      });
    }
  },

  set: async (modelName: string) => {
    set({ loading: true, error: null });
    try {
      const response = await window.electronAPI.ollama.setModel(modelName);
      if (!response.success) {
        throw new Error(response.error || 'Failed to set model');
      }
      set({ current: modelName, loading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to set model',
        loading: false 
      });
    }
  }
})); 