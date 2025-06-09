import React, { useState } from 'react';
import { useChatStore } from '../../state/chatStore';
import { useCorrectionStore } from '../../state/correctionStore';
import { MessageActions } from '../MessageActions';
import { Send } from 'lucide-react';

export const ChatInterface = () => {
  const [input, setInput] = useState('');
  const { messages, loading, ask, selectedMessageIndex, selectMessage, clearSelection } = useChatStore();
  const { mark } = useCorrectionStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    await ask(input);
    setInput('');
  };

  const handleComment = (index: number) => {
    // TODO: Implement comment functionality
    console.log('Comment on message:', index);
  };

  const handleReact = (index: number, reaction: 'like' | 'dislike') => {
    // TODO: Implement reaction functionality
    console.log('React to message:', index, reaction);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-4 rounded-lg backdrop-blur-sm border border-white/10 transition-all
              ${m.role === 'user' 
                ? 'bg-blue-500/10 ml-4' 
                : 'bg-white/5 mr-4'
              }
              ${selectedMessageIndex === i ? 'ring-2 ring-yellow-400/50' : ''}
              hover:bg-white/10
            `}
            onClick={() => {
              if (m.role === 'ai') {
                mark(i, m.content);
                selectMessage(i);
              }
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-white/90">
                {m.role === 'user' ? 'You' : 'Assistant'}
              </div>
              <MessageActions
                onComment={() => handleComment(i)}
                onReact={(reaction) => handleReact(i, reaction)}
              />
            </div>
            <div className="whitespace-pre-wrap text-white/80">
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500/50"></div>
          </div>
        )}
      </div>
      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg 
              text-white placeholder-white/50
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
              transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-500/20 text-white rounded-lg 
              hover:bg-blue-500/30 disabled:opacity-50 
              focus:outline-none focus:ring-2 focus:ring-blue-500/50
              border border-white/10 transition-all
              flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;