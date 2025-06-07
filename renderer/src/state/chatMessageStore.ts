import { create } from 'zustand';
import { ipcRenderer } from 'electron';

type ChatMessageMeta = {
  id: string;
  comments: string[];
  pinned: boolean;
  linkedMemoryId?: string;
  reactions?: string[];
};

type ChatMessageStore = {
  metadata: Record<string, ChatMessageMeta>;
  addComment: (id: string, comment: string) => Promise<void>;
  togglePin: (id: string) => Promise<void>;
  linkMemory: (id: string, memoryId: string) => Promise<void>;
  addReaction: (id: string, reaction: string) => Promise<void>;
  initializeMessage: (id: string) => void;
};

export const useChatMessageStore = create<ChatMessageStore>((set) => ({
  metadata: {},
  
  initializeMessage: (id) =>
    set((state) => {
      if (!state.metadata[id]) {
        return {
          metadata: {
            ...state.metadata,
            [id]: { id, comments: [], pinned: false, reactions: [] },
          },
        };
      }
      return state;
    }),

  addComment: async (id, comment) => {
    try {
      await ipcRenderer.invoke('chat:add-comment', { id, comment });
      set((state) => {
        const entry = state.metadata[id] ?? { id, comments: [], pinned: false };
        return {
          metadata: {
            ...state.metadata,
            [id]: { ...entry, comments: [...entry.comments, comment] },
          },
        };
      });
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  },

  togglePin: async (id) => {
    try {
      await ipcRenderer.invoke('chat:toggle-pin', { id });
      set((state) => {
        const entry = state.metadata[id] ?? { id, comments: [], pinned: false };
        return {
          metadata: {
            ...state.metadata,
            [id]: { ...entry, pinned: !entry.pinned },
          },
        };
      });
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  },

  linkMemory: async (id, memoryId) => {
    try {
      await ipcRenderer.invoke('chat:link-memory', { id, memoryId });
      set((state) => {
        const entry = state.metadata[id] ?? { id, comments: [], pinned: false };
        return {
          metadata: {
            ...state.metadata,
            [id]: { ...entry, linkedMemoryId: memoryId },
          },
        };
      });
    } catch (error) {
      console.error('Failed to link memory:', error);
    }
  },

  addReaction: async (id, reaction) => {
    try {
      await ipcRenderer.invoke('chat:add-reaction', { id, reaction });
      set((state) => {
        const entry = state.metadata[id] ?? { id, comments: [], pinned: false, reactions: [] };
        return {
          metadata: {
            ...state.metadata,
            [id]: {
              ...entry,
              reactions: [...(entry.reactions ?? []), reaction],
            },
          },
        };
      });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  },
})); 