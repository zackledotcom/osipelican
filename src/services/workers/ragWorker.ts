import { parentPort, workerData } from 'worker_threads';
import { logger } from '../../utils/logger';

interface WorkerData {
  workerId: number;
  config: {
    maxWorkers: number;
    taskQueueSize: number;
    workerTimeout: number;
    retryAttempts: number;
  };
}

interface Task {
  id: string;
  type: string;
  data: any;
  priority: number;
}

if (!parentPort) {
  throw new Error('This module must be run as a worker thread');
}

const { workerId, config } = workerData as WorkerData;

// Handle messages from the main thread
parentPort.on('message', async (message: any) => {
  try {
    if (message.type === 'health_check') {
      parentPort?.postMessage({ type: 'health_check_response' });
      return;
    }

    if (message.type === 'task') {
      const { task } = message;
      const result = await processTask(task);

      parentPort?.postMessage({
        type: 'task_complete',
        taskId: task.id,
        result
      });
    }
  } catch (error) {
    logger.error(`Worker ${workerId} error:`, error);
    parentPort?.postMessage({
      type: 'task_error',
      taskId: message.task?.id,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

async function processTask(task: Task): Promise<any> {
  // This is a placeholder - the actual task processing will be injected
  // by the service that uses this worker
  return task.data;
}

// Handle worker termination
process.on('SIGTERM', () => {
  logger.info(`Worker ${workerId} shutting down`);
  process.exit(0);
}); 