import React from 'react';
import { Globe } from 'lucide-react';
import { Button } from './ui/button';

interface InternetToggleProps {
  isEnabled?: boolean;
  onToggle?: () => void;
}

export function InternetToggle({ isEnabled = false, onToggle }: InternetToggleProps) {
  return (
    <Button
      size="icon"
      variant="ghost"
      onClick={onToggle}
      className={`text-muted-foreground hover:text-foreground ${isEnabled ? 'text-blue-400' : ''}`}
      title={isEnabled ? 'Internet access enabled' : 'Internet access disabled'}
    >
      <Globe className="w-4 h-4" />
    </Button>
  );
} 