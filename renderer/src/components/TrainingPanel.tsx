import React from 'react';
import { Brain, Upload, Database, Settings } from 'lucide-react';

interface TrainingOptionProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}

function TrainingOption({ icon, title, description, onClick }: TrainingOptionProps) {
  return (
    <button
      onClick={onClick}
      className="w-full p-4 rounded-lg border border-white/10 bg-white/5 
        hover:bg-white/10 transition-all duration-200 text-left group"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-md bg-white/10 group-hover:bg-white/20 transition-colors">
          {icon}
        </div>
        <div>
          <h3 className="font-medium text-white/90">{title}</h3>
          <p className="text-sm text-white/60 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}

export function TrainingPanel() {
  return (
    <div className="p-6 text-white space-y-6 rounded-lg border border-white/10 
      bg-gradient-to-b from-slate-800/50 to-slate-950/70 shadow-lg">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Brain className="w-5 h-5" />
          Training Mode
        </h2>
        <button className="p-2 rounded-md hover:bg-white/10 transition-colors">
          <Settings className="w-4 h-4 text-white/60" />
        </button>
      </div>

      <div className="grid gap-4">
        <TrainingOption
          icon={<Database className="w-5 h-5 text-blue-400" />}
          title="Train on Memory"
          description="Fine-tune models using your conversation history and memory nodes"
        />
        <TrainingOption
          icon={<Upload className="w-5 h-5 text-purple-400" />}
          title="Upload Training Data"
          description="Import custom datasets for specialized training"
        />
      </div>

      <div className="mt-6 p-4 rounded-lg bg-white/5 border border-white/10">
        <h3 className="text-sm font-medium text-white/80 mb-2">Training Logs</h3>
        <div className="text-xs text-white/60 space-y-1">
          <p>• No active training sessions</p>
          <p>• Last checkpoint: None</p>
          <p>• Available models: 3</p>
        </div>
      </div>
    </div>
  );
} 