import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOllama } from '../hooks/useOllama';
import { useModelStatus } from '../hooks/useModelStatus';
import { Plug, Unplug, ChevronDown, AlertCircle, CheckCircle2, Loader2, BatteryFull, BatteryMedium, BatteryLow, Activity, Cpu, HardDrive, Timer } from 'lucide-react';
import { ServiceName, ServiceState, ServiceStatus } from '@shared/types/services';

interface Metrics {
  fps: number;
  memory: number;
  cpuPressure: number;
  renderTime: number;
  ollamaLatency: number;
  vectorIndexingTime: number;
}

export const StatusBar: React.FC = () => {
  const {
    isConnected,
    currentModel,
    availableModels,
    isLoading,
    error,
    setModel,
    checkHealth,
    healthScore = 100 // Default to 100 if not provided
  } = useOllama();

  const {
    isLoading: isModelLoading,
    modelName: loadingModelName,
    progress,
    estimatedTimeRemaining,
    error: modelError
  } = useModelStatus();

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [lastHealthCheck, setLastHealthCheck] = useState<number>(Date.now());

  const handleModelSelect = useCallback(async (modelName: string) => {
    await setModel(modelName);
    setIsModelMenuOpen(false);
  }, [setModel]);

  const handleHealthCheck = useCallback(async () => {
    await checkHealth();
    setLastHealthCheck(Date.now());
  }, [checkHealth]);

  const getStatusIcon = () => {
    if (isModelLoading) return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (isLoading) return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (error || modelError) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return isConnected ? <Plug className="w-4 h-4 text-green-500" /> : <Unplug className="w-4 h-4 text-gray-500" />;
  };

  const getBatteryIcon = () => {
    if (healthScore > 66) return (
      <div title="Healthy">
        <BatteryFull className="w-4 h-4 text-green-500" />
      </div>
    );
    if (healthScore > 33) return (
      <div title="Moderate health">
        <BatteryMedium className="w-4 h-4 text-yellow-500" />
      </div>
    );
    return (
      <div title="Low health - reduce input size or restart model">
        <BatteryLow className="w-4 h-4 text-red-500" />
      </div>
    );
  };

  // In a real implementation, these would be actual metrics
  const metrics: Metrics = {
    fps: 60,
    memory: 256,
    cpuPressure: 45,
    renderTime: 16,
    ollamaLatency: 120,
    vectorIndexingTime: 50
  };

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-white/80">
            <Activity className="w-3 h-3 text-green-400" />
            <span>FPS: {metrics.fps}</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <HardDrive className="w-3 h-3 text-blue-400" />
            <span>Memory: {metrics.memory}MB</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-white/80">
            <Cpu className="w-3 h-3 text-yellow-400" />
            <span>CPU: {metrics.cpuPressure}%</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Timer className="w-3 h-3 text-purple-400" />
            <span>Render: {metrics.renderTime}ms</span>
          </div>
        </div>

        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-white/80">
              <Timer className="w-3 h-3 text-indigo-400" />
              <span>Ollama: {metrics.ollamaLatency}ms</span>
            </div>
            <div className="flex items-center gap-2 text-white/80">
              <Timer className="w-3 h-3 text-pink-400" />
              <span>Vector: {metrics.vectorIndexingTime}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};