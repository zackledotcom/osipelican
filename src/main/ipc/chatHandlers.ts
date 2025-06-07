import { ipcMain } from 'electron';
import { OllamaClient } from '../../services/OllamaClient';
import { DatabaseService } from '../../services/DatabaseService';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: number;
  status: 'sending' | 'sent' | 'error';
  error?: string;
}

const ollamaClient = new OllamaClient();
const dbService = new DatabaseService();

export function setupChatHandlers() {
  // Send a message and get a response
  ipcMain.handle('chat:send-message', async (_, message: string) => {
    try {
      const messageId = `msg-${Date.now()}`;
      
      // Add user message to database
      const userMessage: ChatMessage = {
        id: messageId,
        content: message,
        role: 'user',
        timestamp: Date.now(),
        status: 'sending'
      };
      await dbService.saveMessage(userMessage);

      // Update message status to sent
      userMessage.status = 'sent';
      await dbService.saveMessage(userMessage);

      // Generate response using Ollama with streaming
      let assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        content: '',
        role: 'assistant',
        timestamp: Date.now(),
        status: 'sending'
      };
      await dbService.saveMessage(assistantMessage);

      const response = await ollamaClient.generateResponse(message, async (chunk: string) => {
        assistantMessage.content += chunk;
        await dbService.saveMessage(assistantMessage);
      });

      // Update final message status
      assistantMessage.status = 'sent';
      await dbService.saveMessage(assistantMessage);

      return assistantMessage;
    } catch (error) {
      console.error('Error in chat:send-message:', error);
      throw error;
    }
  });

  // Get chat history
  ipcMain.handle('chat:get-history', async () => {
    return await dbService.getMessages();
  });

  // Clear chat history
  ipcMain.handle('chat:clear-history', async () => {
    await dbService.clearMessages();
    return { success: true };
  });

  // Delete a message
  ipcMain.handle('chat:delete-message', async (_, messageId: string) => {
    await dbService.deleteMessage(messageId);
    return { success: true };
  });

  // Get available models
  ipcMain.handle('chat:get-models', async () => {
    return await ollamaClient.listModels();
  });

  // Set current model
  ipcMain.handle('chat:set-model', async (_, modelName: string) => {
    ollamaClient.setModel(modelName);
    return { success: true };
  });

  // Pull a new model
  ipcMain.handle('chat:pull-model', async (_, modelName: string) => {
    await ollamaClient.pullModel(modelName, (progress: number) => {
      // Send progress updates to renderer
      ipcMain.emit('model-pull-progress', { modelName, progress });
    });
    return { success: true };
  });
} 