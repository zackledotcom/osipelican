import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { SettingsMenu } from './SettingsMenu';
import { SettingsErrorBoundary } from './SettingsErrorBoundary';
import { useSettingsStore } from '../stores/settingsStore';

interface SettingsButtonProps {
  className?: string;
}

/**
 * Button component that opens the settings menu
 */
export const SettingsButton: React.FC<SettingsButtonProps> = ({ className = '' }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { lastError, setLastError } = useSettingsStore();
  
  // Clear any settings errors when closing the menu
  useEffect(() => {
    if (!isSettingsOpen && lastError) {
      setLastError(null);
    }
  }, [isSettingsOpen, lastError, setLastError]);
  
  // Handle keyboard shortcut (Cmd/Ctrl+,)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setIsSettingsOpen(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  return (
    <SettingsErrorBoundary>
      <button
        onClick={() => setIsSettingsOpen(true)}
        className={`p-2 rounded-md transition-colors text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800 ${className}`}
        title="Settings (Ctrl+,)"
        aria-label="Open Settings"
        aria-haspopup="dialog"
      >
        <SettingsIcon className="w-5 h-5" />
      </button>
      
      <SettingsMenu 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
      />
    </SettingsErrorBoundary>
  );
};

export default SettingsButton;
