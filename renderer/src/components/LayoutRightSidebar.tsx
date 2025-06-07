import React from 'react';
import { MemoryCommitPanel } from '../components/MemoryCommitPanel';
import { StatusBar } from '../components/StatusBar';

export const LayoutRightSidebar: React.FC = () => {
  return (
    <aside className="w-80 border-l border-white/10 bg-white/5 backdrop-blur dark:bg-black/10 p-4 space-y-4">
      <MemoryCommitPanel />
      <StatusBar />
    </aside>
  );
};

export default LayoutRightSidebar;
