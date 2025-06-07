export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  id: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export type Role = 'user' | 'assistant' | 'system';
