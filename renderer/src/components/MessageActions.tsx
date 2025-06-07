import React from 'react';
import { MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';

interface MessageActionsProps {
  onComment: () => void;
  onReact: (reaction: 'like' | 'dislike') => void;
  className?: string;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
  onComment,
  onReact,
  className = ''
}) => {
  return (
    <div className={`flex items-center justify-between text-sm ${className}`}>
      <button
        onClick={onComment}
        className="flex items-center gap-1 px-2 py-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span>Comment</span>
      </button>
      <div className="flex gap-1">
        <button
          onClick={() => onReact('like')}
          className="p-1 rounded-md text-gray-400 hover:text-green-400 hover:bg-white/10 transition-colors"
        >
          <ThumbsUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => onReact('dislike')}
          className="p-1 rounded-md text-gray-400 hover:text-red-400 hover:bg-white/10 transition-colors"
        >
          <ThumbsDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}; 