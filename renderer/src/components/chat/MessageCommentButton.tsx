import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';

interface MessageCommentButtonProps {
  onClick: () => void;
}

export function MessageCommentButton({ onClick }: MessageCommentButtonProps) {
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={onClick}
      className="h-6 w-6 text-muted-foreground hover:text-foreground"
    >
      <MessageSquare className="w-3 h-3" />
    </Button>
  );
} 