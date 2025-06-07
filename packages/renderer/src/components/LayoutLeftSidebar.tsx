import React, { useState } from 'react';
import { ConversationList } from './ConversationList';
import { SettingsPanel } from './SettingsPanel';
import { MemoryHealthIndicator } from './MemoryHealthIndicator';
import { ServiceToggle } from './ServiceToggle';

export function LayoutLeftSidebar() {
  console.log('[DEBUG] LayoutLeftSidebar mounting');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <aside className="w-80 bg-red-500/20 backdrop-blur border-r border-white/10 flex flex-col justify-between">
      <div className="p-4 space-y-4">
        <div className="bg-red-500/50 p-2 rounded">
          <ConversationList />
        </div>
        {isSettingsOpen && (
          <div className="animate-fade-in bg-red-500/50 p-2 rounded">
            <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
          </div>
        )}
      </div>
      <div className="p-4 border-t border-white/10">
        <div className="bg-red-500/50 p-2 rounded mb-2">
          <MemoryHealthIndicator />
        </div>
        <div className="bg-red-500/50 p-2 rounded">
          <ServiceToggle />
        </div>
      </div>
    </aside>
  );
} 