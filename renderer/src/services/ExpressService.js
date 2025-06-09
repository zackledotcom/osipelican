"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpressService = void 0;
const express_1 = __importDefault(require("express"));
const Service_1 = require("./Service");
const logger_1 = require("../utils/logger");
class ExpressService extends Service_1.BaseService {
    constructor(config) {
        super(config);
        this.app = (0, express_1.default)();
    }
    async initialize() {
        try {
            // Initialize Express application
            logger_1.logger.info('Initializing Express service...');
            // Setup middleware
            this.app.use(express_1.default.json());
            this.app.use(express_1.default.urlencoded({ extended: true }));
            // Setup routes
            this.setupRoutes();
            // Start server
            const port = process.env.PORT || 3000;
            this.server = this.app.listen(port, () => {
                logger_1.logger.info(`Express server listening on port ${port}`);
            });
            // Handle server errors
            if (this.server) {
                this.server.on('error', (error) => {
                    logger_1.logger.error('Express server error:', error);
                    this.handleError(error);
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to initialize Express service:', error);
            throw error;
        }
    }
    async cleanup() {
        try {
            // Cleanup Express server
            logger_1.logger.info('Cleaning up Express service...');
            if (this.server) {
                await new Promise((resolve) => {
                    this.server.close(() => {
                        logger_1.logger.info('Express server stopped');
                        resolve();
                    });
                });
                this.server = null;
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to cleanup Express service:', error);
            throw error;
        }
    }
    async checkHealth() {
        try {
            // Check if server is running
            if (!this.server) {
                return false;
            }
            // TODO: Implement more comprehensive health check
            return true;
        }
        catch (error) {
            logger_1.logger.error('Express health check failed:', error);
            return false;
        }
    }
    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'ok' });
        });
        // TODO: Add more routes as needed
    }
}
exports.ExpressService = ExpressService;
//# sourceMappingURL=ExpressService.js.map