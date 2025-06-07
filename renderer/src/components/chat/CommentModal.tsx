import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  messageContent: string;
}

export function CommentModal({ isOpen, onClose, onSubmit, messageContent }: CommentModalProps) {
  const [comment, setComment] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim()) {
      onSubmit(comment.trim());
      setComment('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg p-6 rounded-lg bg-white/5 border border-white/10 backdrop-blur-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white/90">Add Comment</h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-4 p-3 rounded-md bg-white/5 text-sm text-white/70">
              {messageContent}
            </div>

            <form onSubmit={handleSubmit}>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write your comment..."
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md
                  text-white placeholder-white/50
                  focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                  transition-all resize-none"
                rows={3}
              />

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 
                    text-white/80 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!comment.trim()}
                  className="px-4 py-2 rounded-md bg-blue-500/20 text-blue-300
                    hover:bg-blue-500/30 border border-blue-500/20 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Comment
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 