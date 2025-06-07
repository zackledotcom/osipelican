// Canonical shared types for app-level entities

export interface AppStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: number;
  details: {
    ollamaConnected: boolean;
    currentModel: string;
  };
}

export interface Document {
  id: string;
  content: string;
  metadata: {
    filename?: string;
    type?: string;
    size?: number;
    timestamp: number;
    source?: string;
    [key: string]: any;
  };
}

export interface Vector {
  id: string;
  content: string;
  embedding?: number[];
} 