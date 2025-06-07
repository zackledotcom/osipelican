import React, { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import type { OllamaConnectionStatus } from '../types/ollama';

export function OllamaConnectionNotification() {
  const [connectionStatus, setConnectionStatus] = useState<OllamaConnectionStatus | null>(null);
  const [hasShownToast, setHasShownToast] = useState(false);

  useEffect(() => {
    // Check Ollama connection status on component mount
    const checkConnection = async () => {
      try {
        const status = await window.electronAPI.getServiceStatus('ollama');
        if (status && status.status === 'error') {
          setConnectionStatus({
            status: 'disconnected',
            lastChecked: status.lastCheck,
            error: status.error
          });
        } else if (status && status.status === 'running') {
          setConnectionStatus({
            status: 'connected',
            lastChecked: status.lastCheck
          });
        }
      } catch (error) {
        console.error('Failed to check Ollama connection:', error);
        setConnectionStatus({
          status: 'disconnected',
          lastChecked: Date.now(),
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    checkConnection();

    // Set up listener for service status changes
    const unsubscribe = window.electronAPI.onServiceStatusChange((event) => {
      if (event.serviceName === 'ollama') {
        setConnectionStatus({
          status: event.status === 'running' ? 'connected' : 'disconnected',
          lastChecked: Date.now(),
          error: event.error
        });
      }
    });

    // Check connection periodically
    const interval = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  // Show toast notification when Ollama is disconnected
  useEffect(() => {
    if (connectionStatus && connectionStatus.status === 'disconnected' && !hasShownToast) {
      toast.error(
        <div className="flex flex-col gap-2">
          <div className="font-medium">Ollama Service Unavailable</div>
          <div className="text-sm">
            The Ollama service is not running or cannot be reached. Some features may be limited.
          </div>
          <div className="flex items-center gap-2 mt-1">
            <button
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs flex items-center gap-1"
              onClick={() => window.electronAPI.restartService('ollama')}
            >
              Retry Connection
            </button>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs flex items-center gap-1"
            >
              Install Ollama <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        </div>,
        {
          duration: 10000,
          icon: <AlertCircle className="text-red-500" />,
          style: {
            borderRadius: '10px',
            background: '#1e1e2e',
            color: '#cdd6f4',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }
      );
      setHasShownToast(true);
    }
  }, [connectionStatus, hasShownToast]);

  // Reset toast flag when connection status changes to connected
  useEffect(() => {
    if (connectionStatus && connectionStatus.status === 'connected') {
      setHasShownToast(false);
    }
  }, [connectionStatus]);

  // This component doesn't render anything visible
  return null;
}
