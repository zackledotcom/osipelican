"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryVectorStore = void 0;
class InMemoryVectorStore {
    constructor(dimension = 1536) {
        this.vectors = new Map();
        this.dimension = dimension;
    }
    add(id, vector, metadata = {}) {
        if (vector.length !== this.dimension) {
            throw new Error(`Vector dimension mismatch. Expected ${this.dimension}, got ${vector.length}`);
        }
        this.vectors.set(id, { id, vector, metadata });
    }
    search(queryVector, k = 5) {
        if (queryVector.length !== this.dimension) {
            throw new Error(`Query vector dimension mismatch. Expected ${this.dimension}, got ${queryVector.length}`);
        }
        const entries = Array.from(this.vectors.values());
        const results = entries.map(entry => ({
            ...entry,
            similarity: this.cosineSimilarity(queryVector, entry.vector)
        }));
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, k);
    }
    delete(id) {
        this.vectors.delete(id);
    }
    clear() {
        this.vectors.clear();
    }
    size() {
        return this.vectors.size;
    }
    cosineSimilarity(a, b) {
        const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
        const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
        const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (magnitudeA * magnitudeB);
    }
}
exports.InMemoryVectorStore = InMemoryVectorStore;
//# sourceMappingURL=InMemoryVectorStore.js.map