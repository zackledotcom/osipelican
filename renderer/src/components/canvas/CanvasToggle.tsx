import React from 'react';

interface CanvasToggleProps {
  isEnabled?: boolean;
  onToggle?: () => void;
}

export const CanvasToggle: React.FC<CanvasToggleProps> = ({ 
  isEnabled = false, 
  onToggle = () => {} 
}) => {
  return (
    <button
      onClick={onToggle}
      className={`px-3 py-1 rounded-md text-sm transition-colors ${
        isEnabled 
          ? 'bg-blue-500 text-white' 
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {isEnabled ? 'Canvas On' : 'Canvas Off'}
    </button>
  );
};

export default CanvasToggle;