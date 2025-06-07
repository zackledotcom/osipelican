import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = '' }) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-sm rounded-lg" />
        <div className="relative h-8 w-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            H
          </span>
        </div>
      </div>
      <span className="text-lg font-semibold bg-gradient-to-r from-white/90 to-white/70 bg-clip-text text-transparent">
        HelloGPT
      </span>
    </div>
  );
}; 