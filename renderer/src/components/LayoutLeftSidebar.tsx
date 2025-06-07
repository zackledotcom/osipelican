import React, { useState } from 'react';
import { ConversationList } from '../components/ConversationList';
import { SettingsPanel } from '../components/SettingsPanel';
import { Button } from '../components/ui/button';
import { Cog } from 'lucide-react';
import { MemoryManager } from '../components/MemoryManager';

export const LayoutLeftSidebar: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <aside className="w-80 p-4 space-y-4 border-r border-white/10 bg-white/5 backdrop-blur dark:bg-black/10">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium tracking-wide text-gray-500 dark:text-gray-400 uppercase">Conversations</h2>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <Cog className="w-3 h-3" />
        </Button>
      </div>
      <ConversationList />
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <div className="mt-4">
        <MemoryManager />
      </div>
    </aside>
  );
};

export default LayoutLeftSidebar;