import express, { Request, Response } from 'express';
import { BaseService, ServiceConfig } from './Service';
import { logger } from '../utils/logger';
import http from 'http';

export class ExpressService extends BaseService {
  private app: express.Application;
  private server: any;

  constructor(config: ServiceConfig) {
    super(config);
    this.app = express();
  }

  protected async initialize(): Promise<void> {
    try {
      // Initialize Express application
      logger.info('Initializing Express service...');
      
      // Setup middleware
      this.app.use(express.json());
      this.app.use(express.urlencoded({ extended: true }));

      // Setup routes
      this.setupRoutes();

      // Start server
      const port = process.env.PORT || 3000;
      this.server = this.app.listen(port, () => {
        logger.info(`Express server listening on port ${port}`);
      });

      // Handle server errors
      if (this.server) {
        this.server.on('error', (error) => {
          logger.error('Express server error:', error);
          this.handleError(error);
        });
      }

    } catch (error) {
      logger.error('Failed to initialize Express service:', error);
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    try {
      // Cleanup Express server
      logger.info('Cleaning up Express service...');
      
      if (this.server) {
        await new Promise<void>((resolve) => {
          this.server.close(() => {
            logger.info('Express server stopped');
            resolve();
          });
        });
        this.server = null;
      }
    } catch (error) {
      logger.error('Failed to cleanup Express service:', error);
      throw error;
    }
  }

  protected async checkHealth(): Promise<boolean> {
    try {
      // Check if server is running
      if (!this.server) {
        return false;
      }

      // TODO: Implement more comprehensive health check
      return true;
    } catch (error) {
      logger.error('Express health check failed:', error);
      return false;
    }
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    // TODO: Add more routes as needed
  }
} 