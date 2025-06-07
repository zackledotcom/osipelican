"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaClient = void 0;
const OLLAMA_BASE_URL = 'http://localhost:11434';
class OllamaClient {
    currentModel = 'llama2';
    async sendMessage(message) {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.currentModel,
                messages: [message]
            })
        });
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }
        return response.json();
    }
    async sendMessageStream(message, onChunk) {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.currentModel,
                messages: [message],
                stream: true
            })
        });
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Failed to get response reader');
        }
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const chunk = decoder.decode(value);
            onChunk(chunk);
        }
    }
    async healthCheck() {
        try {
            const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }
            return { status: 'ok' };
        }
        catch (error) {
            return {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async listModels() {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }
        const data = await response.json();
        return data.models.map((model) => ({
            name: model.name,
            size: model.size,
            digest: model.digest,
            modifiedAt: model.modified_at
        }));
    }
    async setModel(model) {
        try {
            const response = await fetch(`${OLLAMA_BASE_URL}/api/pull`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: model })
            });
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }
            this.currentModel = model;
            return { success: true };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async checkConnection() {
        try {
            const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }
            return {
                status: 'connected',
                lastChecked: Date.now()
            };
        }
        catch (error) {
            return {
                status: 'error',
                lastChecked: Date.now(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
exports.OllamaClient = OllamaClient;
