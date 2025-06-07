import React, { useState } from 'react';
import { MessageSquare, Pin, Link, Smile } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MessageActionStripProps {
  onComment: () => void;
  onPin: () => void;
  onLink: () => void;
  onReact: () => void;
  isPinned?: boolean;
  hasComments?: boolean;
  hasReactions?: boolean;
}

export function MessageActionStrip({
  onComment,
  onPin,
  onLink,
  onReact,
  isPinned = false,
  hasComments = false,
  hasReactions = false
}: MessageActionStripProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs text-white/60 hover:text-white/90 transition-colors">
      <button
        onClick={onComment}
        className={`p-1.5 rounded-md hover:bg-white/5 transition-colors ${
          hasComments ? 'text-blue-400' : ''
        }`}
        title="Add comment"
      >
        <MessageSquare className="w-3.5 h-3.5" />
      </button>

      <button
        onClick={onPin}
        className={`p-1.5 rounded-md hover:bg-white/5 transition-colors ${
          isPinned ? 'text-yellow-400' : ''
        }`}
        title={isPinned ? 'Unpin message' : 'Pin message'}
      >
        <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
      </button>

      <button
        onClick={onLink}
        className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
        title="Link to memory"
      >
        <Link className="w-3.5 h-3.5" />
      </button>

      <div className="relative">
        <button
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-1.5 rounded-md hover:bg-white/5 transition-colors ${
            hasReactions ? 'text-pink-400' : ''
          }`}
          title="Add reaction"
        >
          <Smile className="w-3.5 h-3.5" />
        </button>

        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-full right-0 mb-2 p-2 rounded-lg bg-white/10 
                backdrop-blur-sm border border-white/10 shadow-lg"
            >
              <div className="grid grid-cols-6 gap-1">
                {['👍', '❤️', '😂', '😮', '😢', '🎉'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact();
                      setShowEmojiPicker(false);
                    }}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
} 