import React from 'react';
import { Globe } from 'lucide-react';
import { useEnvironmentMode } from '../hooks/useEnvironmentMode';

export function InternetModeToggle() {
  const { mode, setMode } = useEnvironmentMode();
  const isCloud = mode === 'cloud';

  return (
    <button
      onClick={() => setMode(isCloud ? 'local' : 'cloud')}
      className={`absolute right-4 top-4 p-2 rounded-full shadow-md border transition-all duration-200
        ${isCloud 
          ? 'bg-blue-500/20 border-blue-400/30 text-blue-100 hover:bg-blue-500/30' 
          : 'bg-slate-600/30 border-slate-400/30 text-slate-100 hover:bg-slate-600/40'
        }`}
      title={isCloud ? 'Switch to Local Mode' : 'Switch to Cloud Mode'}
    >
      <Globe className="w-4 h-4" />
    </button>
  );
} 