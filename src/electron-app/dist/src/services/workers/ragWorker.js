"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const logger_1 = require("../../utils/logger");
if (!worker_threads_1.parentPort) {
    throw new Error('This module must be run as a worker thread');
}
const { workerId, config } = worker_threads_1.workerData;
// Handle messages from the main thread
worker_threads_1.parentPort.on('message', async (message) => {
    try {
        if (message.type === 'health_check') {
            worker_threads_1.parentPort?.postMessage({ type: 'health_check_response' });
            return;
        }
        if (message.type === 'task') {
            const { task } = message;
            const result = await processTask(task);
            worker_threads_1.parentPort?.postMessage({
                type: 'task_complete',
                taskId: task.id,
                result
            });
        }
    }
    catch (error) {
        logger_1.logger.error(`Worker ${workerId} error:`, error);
        worker_threads_1.parentPort?.postMessage({
            type: 'task_error',
            taskId: message.task?.id,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
async function processTask(task) {
    // This is a placeholder - the actual task processing will be injected
    // by the service that uses this worker
    return task.data;
}
// Handle worker termination
process.on('SIGTERM', () => {
    logger_1.logger.info(`Worker ${workerId} shutting down`);
    process.exit(0);
});
//# sourceMappingURL=ragWorker.js.map