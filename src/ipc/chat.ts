import { ipcMain } from 'electron';
import { OllamaClient } from '@shared/src/api/OllamaClient';
import { logger } from '../utils/logger';
import type { ChatMessage } from '@shared/types/ipc';
import { Role } from '@shared/types/ipc';
import { CHANNELS, Chat } from './types';
import { ChatService } from '../services/ChatService';
import { v4 as uuidv4 } from 'uuid';

const client = OllamaClient.getInstance();

ipcMain.handle('chat:ask', async (event, prompt: string) => {
  return new Promise((resolve) => {
    let reply = '';
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: Role.User,
      content: prompt,
      timestamp: Date.now()
    };
    
    client.sendMessageStream(message, {
      onChunk: (token: string) => {
        reply += token;
        event.sender.send('chat:token', token);
      },
      onComplete: () => {
        resolve(reply);
      },
      onError: (error: Error) => {
        logger.error('Chat error:', error);
        event.sender.send('chat:error', error.message);
        resolve('');
      }
    });
  });
});

export function registerChatHandlers(chatService: ChatService) {
  // Send message handler
  ipcMain.handle(CHANNELS.CHAT.SEND_MESSAGE, async (_, request: Chat.SendMessageRequest): Promise<Chat.SendMessageResponse> => {
    try {
      const message = {
        id: uuidv4(),
        content: request.content,
        role: Role.User,
        timestamp: Date.now(),
      };
      const response = await chatService.sendMessage(message);
      return {
        success: true,
        data: response,
      };
    } catch (error) {
      logger.error('Failed to send message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Get conversations handler
  ipcMain.handle(CHANNELS.CHAT.GET_CONVERSATIONS, async (): Promise<Chat.GetConversationsResponse> => {
    try {
      const conversations = await chatService.listConversations();
      return {
        success: true,
        data: conversations,
      };
    } catch (error) {
      logger.error('Failed to get conversations:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Get conversation handler
  ipcMain.handle(CHANNELS.CHAT.GET_CONVERSATION, async (_, conversationId: string): Promise<Chat.GetConversationResponse> => {
    try {
      const messages = await chatService.getConversation(conversationId);
      return {
        success: true,
        data: {
          id: conversationId,
          messages,
          title: '', // TODO: Get title from conversation
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };
    } catch (error) {
      logger.error('Failed to get conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Create conversation handler
  ipcMain.handle(CHANNELS.CHAT.CREATE_CONVERSATION, async (_, title: string): Promise<Chat.CreateConversationResponse> => {
    try {
      const conversationId = await chatService.createConversation(title);
      return {
        success: true,
        data: {
          id: conversationId,
          title,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      };
    } catch (error) {
      logger.error('Failed to create conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  });

  // Update conversation title handler
  ipcMain.handle(
    CHANNELS.CHAT.UPDATE_CONVERSATION_TITLE,
    async (_, conversationId: string, title: string): Promise<Chat.UpdateConversationTitleResponse> => {
      try {
        await chatService.updateConversationTitle(conversationId, title);
        return {
          success: true,
        };
      } catch (error) {
        logger.error('Failed to update conversation title:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        };
      }
    }
  );
} 