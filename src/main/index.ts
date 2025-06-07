import { app } from 'electron';
import { setupMemoryHandlers } from './ipc/memoryHandlers';

app.whenReady().then(() => {
  setupMemoryHandlers();
}); 