"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaService = void 0;
const events_1 = require("events");
const Service_1 = require("./Service");
const node_fetch_1 = __importDefault(require("node-fetch"));
const os_1 = __importDefault(require("os"));
class OllamaService extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.name = 'ollama';
        this.status = Service_1.ServiceStatus.STOPPED;
        this.metrics = {
            uptime: 0,
            memoryUsage: 0,
            cpuUsage: 0,
            restartCount: 0,
        };
        this.startTime = null;
        this.currentModel = null;
        this.config = config;
        this.baseUrl = config.config?.baseUrl || 'http://localhost:11434';
    }
    async start() {
        this.status = Service_1.ServiceStatus.STARTING;
        this.emit('status', this.status);
        const healthy = await this.ping();
        if (!healthy) {
            this.status = Service_1.ServiceStatus.ERROR;
            this.emit('status', this.status);
            throw new Error('Ollama API not reachable');
        }
        this.status = Service_1.ServiceStatus.RUNNING;
        this.startTime = Date.now();
        this.emit('status', this.status);
    }
    async stop() {
        this.status = Service_1.ServiceStatus.STOPPING;
        this.emit('status', this.status);
        this.status = Service_1.ServiceStatus.STOPPED;
        this.startTime = null;
        this.emit('status', this.status);
    }
    async restart() {
        await this.stop();
        await this.start();
    }
    async getStatus() {
        return this.status;
    }
    async getMetrics() {
        if (this.startTime) {
            this.metrics.uptime = Math.floor((Date.now() - this.startTime) / 1000);
        }
        const mem = process.memoryUsage();
        this.metrics.memoryUsage = mem.rss;
        const cpus = os_1.default.cpus();
        this.metrics.cpuUsage = cpus.reduce((acc, cpu) => acc + cpu.times.user, 0) / cpus.length;
        return this.metrics;
    }
    async isHealthy() {
        return this.ping();
    }
    // Health check
    async ping() {
        try {
            const res = await (0, node_fetch_1.default)(`${this.baseUrl}/api/tags`);
            return res.ok;
        }
        catch {
            return false;
        }
    }
    // List available models
    async listModels() {
        const res = await (0, node_fetch_1.default)(`${this.baseUrl}/api/tags`);
        if (!res.ok)
            throw new Error('Failed to fetch models');
        const data = (await res.json());
        return data.models.map((m) => m.name);
    }
    // Set the current model (verifies existence)
    async setModel(name) {
        const models = await this.listModels();
        if (!models.includes(name)) {
            throw new Error(`Model '${name}' not found`);
        }
        this.currentModel = name;
    }
    // Pull/download a model
    async pullModel(name) {
        const res = await (0, node_fetch_1.default)(`${this.baseUrl}/api/pull`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
        });
        if (!res.ok)
            throw new Error('Failed to pull model');
    }
    // Stream chat completions (if supported by Ollama API)
    async streamChat(prompt, model, onData) {
        const res = await (0, node_fetch_1.default)(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, model: model || this.currentModel }),
        });
        if (!res.ok || !res.body)
            throw new Error('Failed to stream chat');
        // @ts-ignore
        const reader = res.body.getReader();
        let decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read();
            if (done)
                break;
            const chunk = decoder.decode(value);
            if (onData)
                onData(chunk);
        }
    }
}
exports.OllamaService = OllamaService;
