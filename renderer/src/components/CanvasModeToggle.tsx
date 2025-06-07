import React from 'react';
import { MonitorIcon } from 'lucide-react';

interface CanvasModeToggleProps {
  onToggle: () => void;
  isActive: boolean;
  className?: string;
}

export const CanvasModeToggle: React.FC<CanvasModeToggleProps> = ({
  onToggle,
  isActive,
  className = ''
}) => {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all
        ${isActive 
          ? 'bg-white/20 text-white shadow-lg shadow-white/10' 
          : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
        }
        ${className}
      `}
      title="Toggle Canvas Mode"
    >
      <MonitorIcon className="w-4 h-4" />
      <span className="hidden md:inline">Canvas</span>
    </button>
  );
}; 