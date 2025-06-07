import { Vector } from '@shared/types/ipc';
import { logger } from '../utils/logger';

export class VectorStore {
  private vectors: Map<string, Vector> = new Map();

  async update(id: string, content: string): Promise<void> {
    const vector = this.vectors.get(id);
    if (vector) {
      vector.content = content;
      this.vectors.set(id, vector);
    }
  }

  async get(id: string): Promise<Vector | undefined> {
    return this.vectors.get(id);
  }

  async list(): Promise<Vector[]> {
    return Array.from(this.vectors.values());
  }

  async add(vector: Vector): Promise<void> {
    this.vectors.set(vector.id, vector);
  }

  async delete(id: string): Promise<void> {
    this.vectors.delete(id);
  }

  async clear(): Promise<void> {
    this.vectors.clear();
  }

  async search(query: string): Promise<Vector[]> {
    // Simple search implementation - can be enhanced with vector similarity search
    return Array.from(this.vectors.values()).filter(vector => 
      vector.content.toLowerCase().includes(query.toLowerCase())
    );
  }

  async stats(): Promise<{ count: number; dimensions: number }> {
    return {
      count: this.vectors.size,
      dimensions: 0 // TODO: Implement actual dimension tracking
    };
  }
}

export const vectorStore = new VectorStore(); 