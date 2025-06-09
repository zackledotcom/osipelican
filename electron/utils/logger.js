"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = exports.Logger = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const date_fns_1 = require("date-fns");
class Logger {
    constructor() {
        this.logDir = path_1.default.join(electron_1.app.getPath('userData'), 'logs');
        this.logFile = path_1.default.join(this.logDir, `app-${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd')}.log`);
        // Create logs directory if it doesn't exist
        if (!fs_1.default.existsSync(this.logDir)) {
            fs_1.default.mkdirSync(this.logDir, { recursive: true });
        }
    }
    formatMessage(level, message, error) {
        const timestamp = (0, date_fns_1.format)(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS');
        const errorDetails = error ? `\nError: ${error instanceof Error ? error.stack : error}` : '';
        return `[${timestamp}] ${level}: ${message}${errorDetails}\n`;
    }
    writeToFile(message) {
        try {
            fs_1.default.appendFileSync(this.logFile, message);
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    info(message) {
        const formattedMessage = this.formatMessage('INFO', message);
        console.info(formattedMessage);
        this.writeToFile(formattedMessage);
    }
    error(message, error) {
        const formattedMessage = this.formatMessage('ERROR', message, error);
        console.error(formattedMessage);
        this.writeToFile(formattedMessage);
    }
    warn(message, error) {
        const formattedMessage = this.formatMessage('WARN', message, error);
        console.warn(formattedMessage);
        this.writeToFile(formattedMessage);
    }
    debug(message, error) {
        const formattedMessage = this.formatMessage('DEBUG', message, error);
        console.debug(formattedMessage);
        this.writeToFile(formattedMessage);
    }
}
exports.Logger = Logger;
exports.logger = new Logger();
