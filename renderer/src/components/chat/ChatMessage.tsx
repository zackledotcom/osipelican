import React from 'react';
import { User, Bot } from 'lucide-react';
import { ChatMessageWrapper } from './ChatMessageWrapper';
import { v4 as uuidv4 } from 'uuid';
import { MessageCommentButton } from './MessageCommentButton';

interface ChatMessageProps {
  content: string;
  role: 'user' | 'assistant';
  id?: string;
}

export function ChatMessage({ content, role, id = uuidv4() }: ChatMessageProps) {
  return (
    <ChatMessageWrapper messageId={id} role={role} content={content}>
      <div className="group relative flex gap-3">
        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageCommentButton onClick={() => console.log('comment')} />
        </div>
        <div className="flex-shrink-0">
          {role === 'user' ? (
            <div className="w-6 h-6 rounded-full bg-mint-400/20 dark:bg-coral-400/20 flex items-center justify-center">
              <User className="w-3 h-3 text-mint-400 dark:text-coral-400" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-200/20 dark:bg-gray-700/20 flex items-center justify-center">
              <Bot className="w-3 h-3 text-gray-500 dark:text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{content}</div>
        </div>
      </div>
    </ChatMessageWrapper>
  );
} 