import React from 'react';
import { ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';

type ServiceStatus = 'available' | 'unavailable' | 'loading';

interface ServiceState {
  status: ServiceStatus;
  error?: string;
}

interface ServiceStatusPanelProps {
  isExpanded: boolean;
  onToggle: () => void;
  serviceStatuses: Map<string, ServiceState>;
  onRetry: (serviceName: string) => void;
}

export const ServiceStatusPanel: React.FC<ServiceStatusPanelProps> = ({
  isExpanded,
  onToggle,
  serviceStatuses,
  onRetry,
}) => {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white 
          border border-white/10 backdrop-blur-sm transition-colors"
        title="Service Status"
      >
        {isExpanded ? (
          <ChevronUp className="w-5 h-5" />
        ) : (
          <ChevronDown className="w-5 h-5" />
        )}
      </button>

      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg bg-white/5 border border-white/10 
          backdrop-blur-sm shadow-lg overflow-hidden">
          <div className="p-3 space-y-2">
            {Array.from(serviceStatuses.entries()).map(([name, state]) => (
              <div
                key={name}
                className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      state.status === 'available'
                        ? 'bg-green-500'
                        : state.status === 'loading'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className="font-medium text-white/90">{name}</span>
                  {state.error && (
                    <span className="text-sm text-white/50">{state.error}</span>
                  )}
                </div>
                {state.status === 'unavailable' && (
                  <button
                    onClick={() => onRetry(name)}
                    className="p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 