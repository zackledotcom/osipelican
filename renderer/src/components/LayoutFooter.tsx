import React from 'react';
import { ServiceStatusManager } from './ServiceStatusManager';
import { PerformanceMetrics } from './PerformanceMetrics';
import { CanvasToggle } from './CanvasToggle';

interface LayoutFooterProps {
  services?: Record<string, { status: 'available' | 'unavailable' | 'loading'; error?: string }>;
  onServiceRetry?: (serviceName: string) => void;
  isCanvasEnabled?: boolean;
  onCanvasToggle?: () => void;
}

export const LayoutFooter: React.FC<LayoutFooterProps> = ({
  services = {},
  onServiceRetry = () => {},
  isCanvasEnabled = false,
  onCanvasToggle = () => {},
}) => {
  return (
    <footer className="flex items-center justify-between px-4 py-2 border-t border-white/10 bg-black/10 backdrop-blur">
      <ServiceStatusManager services={services} onRetry={onServiceRetry} />
      <div className="flex items-center space-x-4">
        <PerformanceMetrics />
        <CanvasToggle isEnabled={isCanvasEnabled} onToggle={onCanvasToggle} />
      </div>
    </footer>
  );
};

export default LayoutFooter; 