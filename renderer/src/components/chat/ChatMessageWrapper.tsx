import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageActionStrip } from './MessageActionStrip';
import { CommentModal } from './CommentModal';
import { useChatMessageStore } from '../../state/chatMessageStore';

interface ChatMessageWrapperProps {
  messageId: string;
  children: React.ReactNode;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatMessageWrapper({ messageId, children, role, content }: ChatMessageWrapperProps) {
  const [showActions, setShowActions] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(false);
  const { 
    messageMetadata,
    addComment,
    togglePin,
    linkToMemory,
    addReaction,
    initializeMessage
  } = useChatMessageStore();

  useEffect(() => {
    if (!messageMetadata[messageId]) {
      initializeMessage(messageId);
    }
  }, [messageId, initializeMessage, messageMetadata]);

  const metadata = messageMetadata[messageId] || {
    comments: [],
    pinned: false,
    reactions: []
  };

  const handleComment = () => {
    setShowCommentModal(true);
  };

  const handleCommentSubmit = (comment: string) => {
    addComment(messageId, comment);
  };

  const handlePin = () => {
    togglePin(messageId);
  };

  const handleLink = () => {
    // TODO: Implement memory linking dialog
    linkToMemory(messageId, 'memory-123');
  };

  const handleReact = (reaction: string) => {
    addReaction(messageId, reaction);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`group relative rounded-lg ${
          role === 'user' 
            ? 'bg-blue-500/10 border-blue-500/20' 
            : 'bg-white/5 border-white/10'
        } border backdrop-blur-sm`}
        onMouseEnter={() => setShowActions(true)}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="p-4">
          {children}
        </div>

        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/20 to-transparent"
            >
              <MessageActionStrip
                onComment={handleComment}
                onPin={handlePin}
                onLink={handleLink}
                onReact={() => handleReact('👍')}
                isPinned={metadata.pinned}
                hasComments={metadata.comments.length > 0}
                hasReactions={metadata.reactions.length > 0}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {metadata.pinned && (
          <div className="absolute top-2 right-2">
            <span className="text-yellow-400 text-xs">⭐️ Pinned</span>
          </div>
        )}

        {metadata.reactions.length > 0 && (
          <div className="absolute bottom-2 right-2 flex gap-1">
            {metadata.reactions.map((reaction, index) => (
              <span key={index} className="text-xs">{reaction}</span>
            ))}
          </div>
        )}

        {metadata.comments.length > 0 && (
          <div className="absolute bottom-2 left-2">
            <span className="text-blue-400 text-xs">💬 {metadata.comments.length}</span>
          </div>
        )}
      </motion.div>

      <CommentModal
        isOpen={showCommentModal}
        onClose={() => setShowCommentModal(false)}
        onSubmit={handleCommentSubmit}
        messageContent={content}
      />
    </>
  );
} 