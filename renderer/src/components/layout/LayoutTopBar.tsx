import React from 'react';
import { ThemeToggle } from '../ThemeToggle';
import { ModelSelector } from '../ModelSelector';
import { CustomInstructionsToggle } from '../CustomInstructionsToggle';
import { CanvasModeToggle } from '../CanvasModeToggle';
import { ServiceStatusPanel } from '../ServiceStatusPanel';
import { SettingsButton } from '../SettingsButton';

interface LayoutTopBarProps {
  isCanvasMode: boolean;
  setIsCanvasMode: (value: boolean) => void;
}

export function LayoutTopBar({ isCanvasMode, setIsCanvasMode }: LayoutTopBarProps) {
  const [isServiceStatusExpanded, setIsServiceStatusExpanded] = React.useState(false);

  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white/10 backdrop-blur-sm border-b border-white/10 shadow-sm z-10">
      <div className="flex items-center gap-3">
        <img src="/logo.svg" alt="HelloGPT" className="h-6 w-auto opacity-90" />
        <span className="text-lg font-semibold text-white/80">HelloGPT</span>
      </div>
      <div className="flex items-center gap-3">
        <ModelSelector />
        <ThemeToggle />
        <CustomInstructionsToggle />
        <CanvasModeToggle isActive={isCanvasMode} onToggle={() => setIsCanvasMode(!isCanvasMode)} />
        <SettingsButton />
        <ServiceStatusPanel
          isExpanded={isServiceStatusExpanded}
          onToggle={() => setIsServiceStatusExpanded(!isServiceStatusExpanded)}
          serviceStatuses={new Map()}
          onRetry={() => {}}
        />
      </div>
    </header>
  );
} 