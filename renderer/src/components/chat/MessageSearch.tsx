import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../state/chatStore';
import { Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function MessageSearch() {
  const { messages } = useChatStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<typeof messages>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    const query = searchQuery.toLowerCase();
    const results = messages.filter(
      (message) => message.content.toLowerCase().includes(query)
    );
    setSearchResults(results);
    setIsSearching(false);
  }, [searchQuery, messages]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-4"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
        >
          <Search className="h-5 w-5 text-white/40" />
        </motion.div>
        <motion.input
          whileFocus={{ scale: 1.02 }}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search messages..."
          className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
        />
        <AnimatePresence>
          {searchQuery && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <X className="h-5 w-5 text-white/40 hover:text-white/60" />
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center py-4"
          >
            <Loader2 className="w-6 h-6 animate-spin text-white/40" />
          </motion.div>
        ) : searchQuery ? (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
          >
            {searchResults.length > 0 ? (
              searchResults.map((message) => (
                <motion.div
                  key={message.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.02 }}
                  className="p-3 rounded-lg bg-white/5 hover:bg-white/10"
                >
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-sm text-white/60 mb-1"
                  >
                    {message.role === 'user' ? 'You' : 'Assistant'} •{' '}
                    {new Date(message.timestamp).toLocaleString()}
                  </motion.div>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-white/80"
                  >
                    {message.content}
                  </motion.div>
                </motion.div>
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-4 text-white/40"
              >
                No messages found
              </motion.div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
} 