import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { format } from 'date-fns';

export class Logger {
  public logDir: string;
  public logFile: string;

  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    this.logFile = path.join(this.logDir, `app-${format(new Date(), 'yyyy-MM-dd')}.log`);

    // Create logs directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  public formatMessage(level: string, message: string, error?: any): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS');
    const errorDetails = error ? `\nError: ${error instanceof Error ? error.stack : error}` : '';
    return `[${timestamp}] ${level}: ${message}${errorDetails}\n`;
  }

  public writeToFile(message: string): void {
    try {
      fs.appendFileSync(this.logFile, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  public info(message: string): void {
    const formattedMessage = this.formatMessage('INFO', message);
    console.info(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  public error(message: string, error?: any): void {
    const formattedMessage = this.formatMessage('ERROR', message, error);
    console.error(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  public warn(message: string, error?: any): void {
    const formattedMessage = this.formatMessage('WARN', message, error);
    console.warn(formattedMessage);
    this.writeToFile(formattedMessage);
  }

  public debug(message: string, error?: any): void {
    const formattedMessage = this.formatMessage('DEBUG', message, error);
    console.debug(formattedMessage);
    this.writeToFile(formattedMessage);
  }
}

export const logger = new Logger(); 