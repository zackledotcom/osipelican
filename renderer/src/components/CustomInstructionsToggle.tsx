import React from 'react';
import { FileText } from 'lucide-react';

export const CustomInstructionsToggle: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white 
        border border-white/10 backdrop-blur-sm transition-colors"
      title="Custom Instructions"
    >
      <FileText className="w-5 h-5" />
    </button>
  );
}; 