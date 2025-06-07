import React from 'react';
import { Brain, Trash2, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';

interface MemoryManagerProps {
  onClear?: () => void;
  onRefresh?: () => void;
}

export function MemoryManager({ onClear, onRefresh }: MemoryManagerProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Memory</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={onRefresh}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Refresh memory"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClear}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            title="Clear memory"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className="h-full bg-purple-400 w-3/4" />
      </div>
    </div>
  );
} 