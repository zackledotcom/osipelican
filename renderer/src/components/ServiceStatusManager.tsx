import React, { useState } from 'react';
import { ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';

type ServiceStatus = 'available' | 'unavailable' | 'loading';

interface ServiceState {
  status: ServiceStatus;
  error?: string;
}

interface ServiceStatusManagerProps {
  services: Record<string, ServiceState>;
  onRetry: (serviceName: string) => void;
}

export const ServiceStatusManager: React.FC<ServiceStatusManagerProps> = ({ services, onRetry }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0">
      <div className="max-w-7xl mx-auto px-4">
        <div className="backdrop-blur-sm bg-white/5 border-t border-white/10 rounded-t-lg">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-2 flex items-center justify-between text-white/80 hover:text-white transition-colors"
          >
            <span className="font-medium">Service Status</span>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>

          {isExpanded && (
            <div className="px-4 pb-4 space-y-2">
              {Object.entries(services).map(([name, state]) => (
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
          )}
        </div>
      </div>
    </div>
  );
}; 