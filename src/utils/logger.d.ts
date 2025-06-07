export declare class Logger {
    logDir: string;
    logFile: string;
    constructor();
    formatMessage(level: string, message: string, error?: any): string;
    writeToFile(message: string): void;
    info(message: string): void;
    error(message: string, error?: any): void;
    warn(message: string, error?: any): void;
    debug(message: string, error?: any): void;
}
export declare const logger: Logger;
