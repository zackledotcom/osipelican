import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Settings, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { InternetModeToggle } from '../InternetModeToggle';
import { useChatStore } from '../../state/chatStore';
import { ChatMessage } from './ChatMessage';
import { ModelSelector } from './ModelSelector';
import { MessageSearch } from './MessageSearch';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';

export function ChatUI() {
  console.log('[DEBUG] ChatUI mounted');

  const [input, setInput] = useState('');
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isProcessing, sendMessage } = useChatStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Close sidebar with Escape
      if (e.key === 'Escape' && showSidebar) {
        setShowSidebar(false);
      }
      // Toggle sidebar with Cmd/Ctrl + ,
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setShowSidebar(prev => !prev);
      }
      // Focus input with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        const inputElement = document.querySelector('input[type="text"]') as HTMLInputElement;
        inputElement?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSidebar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      await sendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <AnimatePresence>
        {showSidebar && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-y-0 right-0 w-80 bg-gray-900 shadow-xl"
          >
            <div className="h-full flex flex-col">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="p-4 border-b border-white/10 flex justify-between items-center"
              >
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-semibold">Settings & Search</h2>
                  <span className="text-xs text-white/40">(Esc to close)</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowSidebar(false)}
                  className="p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </motion.div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex-1 overflow-y-auto"
              >
                <ModelSelector />
                <MessageSearch />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              id={message.id}
              content={message.content}
              role={message.role}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="relative border-t border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <InternetModeToggle />
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 rounded-lg hover:bg-white/10"
              title="Settings (⌘,)"
            >
              <Settings className="w-5 h-5" />
            </motion.button>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message... (⌘K to focus)"
              disabled={isProcessing}
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 
                text-white placeholder-white/50 focus:outline-none focus:ring-2 
                focus:ring-blue-500/50 focus:border-transparent
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!input.trim() || isProcessing}
              className="p-2 rounded-lg bg-blue-500/20 text-blue-300
                hover:bg-blue-500/30 border border-blue-500/20 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  );
} 