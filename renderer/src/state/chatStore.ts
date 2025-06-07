import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  status: 'sending' | 'sent' | 'error';
  error?: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

interface ChatState {
  messages: ChatMessage[];
  isProcessing: boolean;
  currentModel: string;
  availableModels: OllamaModel[];
  modelPullProgress: number;
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp' | 'status'>) => Promise<void>;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;
  sendMessage: (content: string) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  loadModels: () => Promise<void>;
  setModel: (modelName: string) => Promise<void>;
  pullModel: (modelName: string) => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [
    {
      id: 'welcome-1',
      content: 'Welcome to HelloGPT! How can I help you today?',
      role: 'assistant',
      timestamp: Date.now(),
      status: 'sent'
    }
  ],
  isProcessing: false,
  currentModel: 'llama2',
  availableModels: [],
  modelPullProgress: 0,

  addMessage: async (message) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}`,
      timestamp: Date.now(),
      status: 'sending'
    };

    set(state => ({
      messages: [...state.messages, newMessage]
    }));

    try {
      // Send message to main process
      const response = await window.electronAPI.ipc.invoke('chat:send-message', message.content);

      // Update message status
      set(state => ({
        messages: state.messages.map(msg =>
          msg.id === newMessage.id
            ? { ...msg, status: 'sent' }
            : msg
        )
      }));

      // Add assistant's response
      if (response?.content) {
        set(state => ({
          messages: [...state.messages, {
            id: response.id,
            content: response.content,
            role: 'assistant',
            timestamp: response.timestamp,
            status: response.status
          }]
        }));
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      set(state => ({
        messages: state.messages.map(msg =>
          msg.id === newMessage.id
            ? { ...msg, status: 'error', error: (error as Error).message }
            : msg
        )
      }));
    }
  },

  updateMessage: (id, updates) => {
    set(state => ({
      messages: state.messages.map(msg =>
        msg.id === id ? { ...msg, ...updates } : msg
      )
    }));
  },

  clearMessages: async () => {
    await window.electronAPI.ipc.invoke('chat:clear-history');
    set({ messages: [] });
  },

  sendMessage: async (content: string) => {
    const { addMessage, isProcessing } = get();
    if (isProcessing || !content.trim()) return;

    set({ isProcessing: true });
    try {
      await addMessage({
        content: content.trim(),
        role: 'user'
      });
    } finally {
      set({ isProcessing: false });
    }
  },

  deleteMessage: async (id: string) => {
    await window.electronAPI.ipc.invoke('chat:delete-message', id);
    set(state => ({
      messages: state.messages.filter(msg => msg.id !== id)
    }));
  },

  loadModels: async () => {
    try {
      const models = await window.electronAPI.ipc.invoke('chat:get-models');
      set({ availableModels: models });
    } catch (error) {
      console.error('Failed to load models:', error);
    }
  },

  setModel: async (modelName: string) => {
    try {
      await window.electronAPI.ipc.invoke('chat:set-model', modelName);
      set({ currentModel: modelName });
    } catch (error) {
      console.error('Failed to set model:', error);
    }
  },

  pullModel: async (modelName: string) => {
    try {
      // Listen for progress updates
      const progressHandler = (_: any, data: { modelName: string; progress: number }) => {
        if (data.modelName === modelName) {
          set({ modelPullProgress: data.progress });
        }
      };

      const cleanup = window.electronAPI.ipc.on('model-pull-progress', progressHandler);

      // Start pulling the model
      await window.electronAPI.ipc.invoke('chat:pull-model', modelName);

      // Clean up progress listener
      cleanup();
      set({ modelPullProgress: 0 });

      // Refresh available models
      await get().loadModels();
    } catch (error) {
      console.error('Failed to pull model:', error);
      set({ modelPullProgress: 0 });
    }
  }
})); 