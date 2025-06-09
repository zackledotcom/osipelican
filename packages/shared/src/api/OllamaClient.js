"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaClient = void 0;
const events_1 = require("events");
const logger_1 = require("@shared/utils/logger");
const node_fetch_1 = __importDefault(require("node-fetch"));
const OLLAMA_BASE_URL = 'http://localhost:11434';
const MAX_RETRIES = 3;
const TIMEOUT_MS = 300000; // 5 minutes
const POLL_INTERVAL = 500; // 500ms
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function withRetryAndTimeout(fn, retries = MAX_RETRIES) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
        return await fn();
    }
    catch (error) {
        if (retries > 0 && !controller.signal.aborted) {
            await delay(1000 * (MAX_RETRIES - retries));
            return withRetryAndTimeout(fn, retries - 1);
        }
        throw error;
    }
    finally {
        clearTimeout(timeout);
    }
}
class OllamaClient extends events_1.EventEmitter {
    constructor() {
        super();
        this.baseUrl = OLLAMA_BASE_URL;
        this.currentModel = 'llama2';
        this.fallbackModels = ['mistral', 'codellama', 'neural-chat'];
        this.connectionPool = new Set();
        this.maxConnections = 5;
        this.requestQueue = [];
        this.isProcessingQueue = false;
        this.healthCheckInterval = null;
        this.connectionStatus = { status: 'disconnected', lastChecked: Date.now() };
        this.loadingState = {
            status: 'loaded',
            isLoading: false,
            modelName: '',
            progress: 0,
            estimatedTimeRemaining: 0
        };
        this.abortController = null;
        this.isInitialized = false;
    }
    static getInstance() {
        if (!OllamaClient.instance) {
            OllamaClient.instance = new OllamaClient();
        }
        return OllamaClient.instance;
    }
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        logger_1.logger.debug(`Making request to ${url}`);
        try {
            const headers = {
                'Content-Type': 'application/json',
                ...(options.headers || {})
            };
            const response = await (0, node_fetch_1.default)(url, {
                ...options,
                headers
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Request failed: ${response.statusText}, ${errorText}`);
            }
            return response.json();
        }
        catch (error) {
            logger_1.logger.error(`Request to ${url} failed:`, error);
            throw error;
        }
    }
    async initialize() {
        if (this.isInitialized) {
            logger_1.logger.info('OllamaClient already initialized');
            return;
        }
        logger_1.logger.info('Initializing OllamaClient...');
        try {
            logger_1.logger.debug('Checking Ollama connection...');
            const status = await this.checkConnection();
            if (status.status !== 'connected') {
                logger_1.logger.warn('Ollama service is not available. Some features may be limited.');
                this.connectionStatus = status;
                return;
            }
            // Load available models
            try {
                logger_1.logger.debug('Loading available models...');
                const models = await this.listModels();
                logger_1.logger.info(`Successfully loaded ${models.result?.models.length} models: ${models.result?.models.map(m => m.name).join(', ')}`);
                this.emit('modelsLoaded', models.result?.models);
            }
            catch (error) {
                logger_1.logger.error('Error loading models:', error);
                // Continue initialization even if model loading fails
            }
            this.connectionStatus = status;
            this.isInitialized = true;
            this.startHealthCheck();
            logger_1.logger.info('OllamaClient initialized successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize OllamaClient:', error);
            this.connectionStatus = {
                status: 'disconnected',
                lastChecked: Date.now(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async checkConnection() {
        const retries = 3;
        const delay = 1000;
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                logger_1.logger.debug(`Connection attempt ${attempt}/${retries}...`);
                await this.makeRequest('/api/tags');
                const status = {
                    status: 'connected',
                    lastChecked: Date.now()
                };
                logger_1.logger.info('Successfully connected to Ollama service');
                this.connectionStatus = status;
                return status;
            }
            catch (error) {
                logger_1.logger.warn(`Connection attempt ${attempt}/${retries} failed. Retrying in ${delay}ms...`, error);
                if (attempt < retries) {
                    await new Promise(res => setTimeout(res, delay));
                }
            }
        }
        logger_1.logger.error('All connection attempts failed');
        const status = {
            status: 'disconnected',
            lastChecked: Date.now(),
            error: 'All connection attempts failed'
        };
        this.connectionStatus = status;
        return status;
    }
    getWebSocketUrl(path) {
        return this.baseUrl
            .replace(/^http:\/\//, 'ws://')
            .replace(/^https:\/\//, 'wss://')
            + path;
    }
    async createConnection() {
        const wsUrl = this.getWebSocketUrl('/api/chat');
        logger_1.logger.debug(`Creating WebSocket connection to ${wsUrl}`);
        const ws = new WebSocket(wsUrl);
        return new Promise((resolve, reject) => {
            ws.onopen = () => {
                logger_1.logger.info(`WebSocket connection established at ${wsUrl}`);
                resolve(ws);
            };
            ws.onerror = (error) => {
                logger_1.logger.error('WebSocket connection error:', error);
                reject(error);
            };
            ws.onclose = () => {
                logger_1.logger.info('WebSocket connection closed');
                this.connectionPool.delete(ws);
            };
        });
    }
    async getConnection() {
        // Try to get an existing connection
        for (const conn of this.connectionPool) {
            if (conn.readyState === WebSocket.OPEN) {
                return conn;
            }
        }
        // Create new connection if pool isn't full
        if (this.connectionPool.size < this.maxConnections) {
            const conn = await this.createConnection();
            this.connectionPool.add(conn);
            return conn;
        }
        // Wait for a connection to become available
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                for (const conn of this.connectionPool) {
                    if (conn.readyState === WebSocket.OPEN) {
                        clearInterval(checkInterval);
                        resolve(conn);
                        return;
                    }
                }
            }, 100);
        });
    }
    async queueRequest(request, maxRetries = 3) {
        return new Promise((resolve, reject) => {
            const queueItem = {
                id: Math.random().toString(36).substr(2, 9),
                request,
                retries: 0,
                maxRetries,
                resolve,
                reject,
            };
            this.requestQueue.push(queueItem);
            this.processQueue();
        });
    }
    async processQueue() {
        if (this.isProcessingQueue || this.requestQueue.length === 0)
            return;
        this.isProcessingQueue = true;
        const item = this.requestQueue[0];
        try {
            const result = await item.request();
            item.resolve(result);
        }
        catch (error) {
            if (item.retries < item.maxRetries) {
                item.retries++;
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, item.retries) * 1000));
                this.processQueue();
                return;
            }
            item.reject(error);
        }
        this.requestQueue.shift();
        this.isProcessingQueue = false;
        this.processQueue();
    }
    async parseStream(response, options) {
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        for (const line of lines) {
            try {
                const chunk = JSON.parse(line);
                options.onChunk(chunk.response || '');
            }
            catch (parseError) {
                options.onError(new Error(`Failed to parse chunk: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
            }
        }
        options.onComplete();
    }
    async tryFallbackModel(error) {
        const currentIndex = this.fallbackModels.indexOf(this.currentModel);
        if (currentIndex === -1 || currentIndex === this.fallbackModels.length - 1) {
            logger_1.logger.warn('No more fallback models available');
            return false;
        }
        const nextModel = this.fallbackModels[currentIndex + 1];
        try {
            logger_1.logger.info(`Attempting to fall back to model ${nextModel}...`);
            const result = await this.setModel(nextModel);
            if (!result.success) {
                throw new Error(result.error || 'Failed to set model');
            }
            logger_1.logger.info(`Successfully fell back to model ${nextModel}`);
            return true;
        }
        catch (fallbackError) {
            logger_1.logger.error(`Failed to fall back to model ${nextModel}:`, fallbackError);
            return false;
        }
    }
    async sendMessage(message) {
        return this.queueRequest(async () => {
            try {
                return await this.makeRequest('/api/chat', {
                    method: 'POST',
                    body: JSON.stringify({
                        model: this.currentModel,
                        messages: [message]
                    })
                });
            }
            catch (error) {
                if (await this.tryFallbackModel(error)) {
                    return this.sendMessage(message);
                }
                throw error;
            }
        });
    }
    async sendMessageStream(message, options) {
        return this.queueRequest(async () => {
            try {
                const response = await (0, node_fetch_1.default)(`${this.baseUrl}/api/chat`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: this.currentModel,
                        messages: [message],
                        stream: true
                    })
                });
                if (!response.ok) {
                    throw new Error(`Ollama API error: ${response.statusText}`);
                }
                const text = await response.text();
                const lines = text.split('\n').filter(line => line.trim());
                for (const line of lines) {
                    try {
                        const chunk = JSON.parse(line);
                        options.onChunk(chunk.response || '');
                    }
                    catch (parseError) {
                        options.onError(new Error(`Failed to parse chunk: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`));
                    }
                }
                options.onComplete();
            }
            catch (error) {
                if (await this.tryFallbackModel(error)) {
                    return this.sendMessageStream(message, options);
                }
                throw error;
            }
        });
    }
    async listModels() {
        return this.queueRequest(async () => {
            try {
                const data = await this.makeRequest('/api/tags');
                if (!data || !data.models || !Array.isArray(data.models)) {
                    logger_1.logger.error('Invalid response format from Ollama API:', data);
                    return {
                        success: false,
                        error: 'Invalid response format from Ollama API'
                    };
                }
                const models = data.models.map((model) => ({
                    name: model.name,
                    size: model.size || 0,
                    digest: model.digest || '',
                    modified_at: model.modified_at || new Date().toISOString(),
                    details: {
                        format: model.details?.format || 'gguf',
                        family: model.details?.family || 'llama',
                        families: model.details?.families || ['llama'],
                        parameter_size: model.details?.parameter_size || '7B',
                        quantization_level: model.details?.quantization_level || 'Q4_0'
                    }
                }));
                return {
                    success: true,
                    result: { models }
                };
            }
            catch (error) {
                logger_1.logger.error('Error listing models:', error);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to list models'
                };
            }
        });
    }
    async setModel(modelName) {
        if (this.currentModel === modelName) {
            return { success: true };
        }
        try {
            await this.loadModel(modelName);
            this.currentModel = modelName;
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error(`Failed to set model to ${modelName}:`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    startHealthCheck(interval = 30000) {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        this.healthCheckInterval = setInterval(async () => {
            const status = await this.checkConnection();
            this.emit('healthCheck', status);
        }, interval);
    }
    stopHealthCheck() {
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
    }
    getConnectionStatus() {
        return this.connectionStatus;
    }
    getCurrentModel() {
        return this.currentModel;
    }
    async getModelStatus(modelName) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/api/tags`);
            const data = await response.json();
            const model = data.models.find((m) => m.name === modelName);
            return {
                progress: model ? 100 : 0
            };
        }
        catch (error) {
            console.error('Error getting model status:', error);
            return { progress: 0 };
        }
    }
    async loadModel(modelName) {
        const startTime = Date.now();
        this.loadingState = {
            status: 'loading',
            isLoading: true,
            modelName,
            progress: 0,
            estimatedTimeRemaining: 0
        };
        this.emit('modelLoadingStateChanged', this.loadingState);
        try {
            // Poll model status every 500ms
            const pollInterval = setInterval(async () => {
                const status = await this.getModelStatus(modelName);
                this.loadingState.progress = status.progress;
                this.emit('modelLoadingStateChanged', this.loadingState);
            }, POLL_INTERVAL);
            this.abortController = new AbortController();
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/api/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: modelName, stream: true }),
                signal: this.abortController.signal
            });
            if (!response.ok) {
                throw new Error(`Failed to load model: ${response.statusText}`);
            }
            const text = await response.text();
            const lines = text.split('\n').filter(line => line.trim());
            for (const line of lines) {
                try {
                    const data = JSON.parse(line);
                    if (data.status === 'pulling') {
                        this.loadingState.progress = data.completed || 0;
                        this.loadingState.estimatedTimeRemaining = data.remaining || 0;
                        this.emit('modelLoadingStateChanged', this.loadingState);
                    }
                }
                catch (error) {
                    logger_1.logger.error('Error parsing stream:', error);
                }
            }
            clearInterval(pollInterval);
            this.loadingState.isLoading = false;
            this.emit('modelLoadingStateChanged', this.loadingState);
        }
        catch (error) {
            this.loadingState.isLoading = false;
            this.loadingState.error = error instanceof Error ? error.message : 'Failed to load model';
            this.emit('modelLoadingStateChanged', this.loadingState);
            throw error;
        }
        finally {
            this.abortController = null;
        }
    }
    async cancelLoad() {
        if (this.abortController) {
            this.abortController.abort();
            this.loadingState.isLoading = false;
            this.loadingState.error = 'Model loading cancelled';
            this.emit('modelLoadingStateChanged', this.loadingState);
        }
    }
    async generate(message) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    prompt: message,
                    stream: false,
                }),
            });
            if (!response.ok) {
                throw new Error(`Failed to generate response: ${response.statusText}`);
            }
            const data = await response.json();
            return { response: data.response };
        }
        catch (error) {
            logger_1.logger.error('Error generating response:', error);
            throw error;
        }
    }
    async embed(text) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.currentModel,
                    prompt: text,
                }),
            });
            if (!response.ok) {
                throw new Error(`Failed to generate embedding: ${response.statusText}`);
            }
            const data = await response.json();
            return data.embedding;
        }
        catch (error) {
            logger_1.logger.error('Error generating embedding:', error);
            throw error;
        }
    }
    async pullModel(modelName) {
        const response = await (0, node_fetch_1.default)(`${this.baseUrl}/api/pull`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: modelName })
        });
        if (!response.ok) {
            throw new Error(`Failed to pull model: ${response.statusText}`);
        }
        const text = await response.text();
        const lines = text.split('\n').filter(line => line.trim());
        try {
            for (const line of lines) {
                if (line.trim()) {
                    try {
                        const status = JSON.parse(line);
                        this.emit('modelLoadingStateChanged', {
                            status: 'loading',
                            isLoading: true,
                            modelName,
                            progress: status.progress || 0,
                            estimatedTimeRemaining: status.estimatedTimeRemaining
                        });
                    }
                    catch (parseError) {
                        logger_1.logger.error('Failed to parse pull status:', parseError);
                    }
                }
            }
            this.emit('modelLoadingStateChanged', {
                status: 'loaded',
                isLoading: false,
                modelName,
                progress: 100
            });
        }
        catch (error) {
            this.emit('modelLoadingStateChanged', {
                status: 'error',
                isLoading: false,
                modelName,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
}
exports.OllamaClient = OllamaClient;
