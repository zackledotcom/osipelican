import React, { createContext, useContext, useState, useCallback } from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatContextType {
  messages: Message[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Use streaming API
      await window.electronAPI.chat.sendMessageStream(content);
      
      let assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: '',
        role: 'assistant',
        timestamp: new Date(),
      };

      // Listen for streaming chunks
      const unsubscribeChunk = window.electronAPI.chat.onStreamChunk((chunk: string) => {
        assistantMessage.content += chunk;
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.role === 'assistant') {
            lastMessage.content = assistantMessage.content;
          } else {
            newMessages.push({ ...assistantMessage });
          }
          return newMessages;
        });
      });

      // Listen for stream end
      const unsubscribeEnd = window.electronAPI.chat.onStreamEnd(() => {
        setIsLoading(false);
        unsubscribeChunk();
        unsubscribeEnd();
      });

      // Listen for stream error
      const unsubscribeError = window.electronAPI.chat.onStreamError((error: string) => {
        console.error('Stream error:', error);
        setIsLoading(false);
        setMessages(prev => [
          ...prev,
          {
            id: (Date.now() + 2).toString(),
            content: `Error: ${error}`,
            role: 'assistant',
            timestamp: new Date(),
          },
        ]);
        unsubscribeChunk();
        unsubscribeEnd();
        unsubscribeError();
      });
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <ChatContext.Provider value={{ messages, isLoading, sendMessage, clearMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
