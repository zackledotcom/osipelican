"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.vectorStore = exports.VectorStore = void 0;
class VectorStore {
    constructor() {
        this.vectors = new Map();
    }
    async update(id, content) {
        const vector = this.vectors.get(id);
        if (vector) {
            vector.content = content;
            this.vectors.set(id, vector);
        }
    }
    async get(id) {
        return this.vectors.get(id);
    }
    async list() {
        return Array.from(this.vectors.values());
    }
    async add(vector) {
        this.vectors.set(vector.id, vector);
    }
    async delete(id) {
        this.vectors.delete(id);
    }
    async clear() {
        this.vectors.clear();
    }
    async search(query) {
        // Simple search implementation - can be enhanced with vector similarity search
        return Array.from(this.vectors.values()).filter(vector => vector.content.toLowerCase().includes(query.toLowerCase()));
    }
    async stats() {
        return {
            count: this.vectors.size,
            dimensions: 0 // TODO: Implement actual dimension tracking
        };
    }
}
exports.VectorStore = VectorStore;
exports.vectorStore = new VectorStore();
//# sourceMappingURL=VectorStore.js.map