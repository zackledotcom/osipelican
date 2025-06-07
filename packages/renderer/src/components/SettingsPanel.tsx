import React from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  console.log('[DEBUG] SettingsPanel mounting');
  if (!isOpen) return null;

  return (
    <div className="bg-red-500/30 p-4 rounded">
      SettingsPanel ✅
    </div>
  );
} 