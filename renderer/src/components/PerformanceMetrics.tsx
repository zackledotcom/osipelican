import React from 'react';
import { BarChart2, Cpu, HardDrive, Clock } from 'lucide-react';

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend?: string;
}

function MetricCard({ icon, label, value, trend }: MetricCardProps) {
  return (
    <div className="p-3 rounded-lg border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <div className="text-sm font-medium">{value}</div>
        {trend && (
          <div className="text-xs text-mint-400 dark:text-coral-400">{trend}</div>
        )}
      </div>
    </div>
  );
}

export function PerformanceMetrics() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Performance Metrics</h3>
      </div>
      <div className="grid gap-3">
        <MetricCard
          icon={<Cpu className="w-3 h-3" />}
          label="CPU Usage"
          value="32%"
          trend="↓ 2%"
        />
        <MetricCard
          icon={<HardDrive className="w-3 h-3" />}
          label="Memory Usage"
          value="1.2 GB"
          trend="↑ 0.1 GB"
        />
        <MetricCard
          icon={<Clock className="w-3 h-3" />}
          label="Response Time"
          value="120ms"
          trend="↓ 5ms"
        />
      </div>
    </div>
  );
} 