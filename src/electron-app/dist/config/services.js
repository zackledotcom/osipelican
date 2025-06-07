"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEALTH_CHECK_CONFIG = exports.ensureServiceDirectories = exports.getServicePath = exports.SERVICE_CONFIG = void 0;
const electron_1 = require("electron");
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const fs_1 = __importDefault(require("fs"));
// Base paths for different operating systems
const BASE_PATHS = {
    darwin: {
        ollama: path.join(os.homedir(), '.ollama'),
        chroma: path.join(os.homedir(), '.chroma'),
    },
    win32: {
        ollama: path.join(os.homedir(), 'AppData', 'Local', 'Ollama'),
        chroma: path.join(os.homedir(), 'AppData', 'Local', 'Chroma'),
    },
    linux: {
        ollama: path.join(os.homedir(), '.ollama'),
        chroma: path.join(os.homedir(), '.chroma'),
    },
};
// Service configuration
exports.SERVICE_CONFIG = {
    // Ollama configuration
    ollama: {
        basePath: process.platform === 'darwin'
            ? path.join(electron_1.app.getPath('home'), 'Library', 'Application Support', 'Ollama')
            : process.platform === 'win32'
                ? path.join(electron_1.app.getPath('appData'), 'Ollama')
                : path.join(electron_1.app.getPath('home'), '.ollama'),
        modelsPath: path.join(electron_1.app.getPath('userData'), 'models'),
        configPath: path.join(electron_1.app.getPath('userData'), 'config'),
        defaultModel: 'llama2',
        apiEndpoint: 'http://localhost:11434',
        timeout: 30000,
        maxRetries: 3,
        retryDelay: 1000,
        healthCheckInterval: 5000,
    },
    // Chroma configuration
    chroma: {
        dataPath: path.join(electron_1.app.getPath('userData'), 'chroma'),
        collectionName: 'documents',
        embeddingDimension: 1536,
        apiEndpoint: 'http://localhost:8000',
        timeout: 30000,
        healthCheckInterval: 5000,
    },
    // Application-specific paths
    app: {
        userData: electron_1.app.getPath('userData'),
        logs: path.join(electron_1.app.getPath('userData'), 'logs'),
        temp: path.join(electron_1.app.getPath('temp'), 'osipelican'),
        cache: path.join(electron_1.app.getPath('userData'), 'cache'),
    },
    // Service status tracking
    status: {
        checkInterval: 5000,
        timeout: 5000,
        maxRetries: 3,
    },
};
// Helper functions
const getServicePath = (service) => {
    const config = exports.SERVICE_CONFIG[service];
    if ('basePath' in config) {
        return config.basePath;
    }
    if ('dataPath' in config) {
        return config.dataPath;
    }
    throw new Error(`Invalid service: ${service}`);
};
exports.getServicePath = getServicePath;
const ensureServiceDirectories = () => {
    // Ensure Ollama directories exist
    fs_1.default.mkdirSync(exports.SERVICE_CONFIG.ollama.modelsPath, { recursive: true });
    fs_1.default.mkdirSync(exports.SERVICE_CONFIG.ollama.configPath, { recursive: true });
    // Ensure Chroma directory exists
    fs_1.default.mkdirSync(exports.SERVICE_CONFIG.chroma.dataPath, { recursive: true });
    // Ensure app directories exist
    fs_1.default.mkdirSync(exports.SERVICE_CONFIG.app.logs, { recursive: true });
    fs_1.default.mkdirSync(exports.SERVICE_CONFIG.app.temp, { recursive: true });
    fs_1.default.mkdirSync(exports.SERVICE_CONFIG.app.cache, { recursive: true });
};
exports.ensureServiceDirectories = ensureServiceDirectories;
// Service health check configuration
exports.HEALTH_CHECK_CONFIG = {
    ollama: {
        endpoint: `${exports.SERVICE_CONFIG.ollama.apiEndpoint}/api/health`,
        timeout: exports.SERVICE_CONFIG.ollama.timeout,
    },
    chroma: {
        endpoint: `${exports.SERVICE_CONFIG.chroma.apiEndpoint}/api/v1/heartbeat`,
        timeout: exports.SERVICE_CONFIG.chroma.timeout,
    },
};
//# sourceMappingURL=services.js.map