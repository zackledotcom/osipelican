import React from 'react';
import { MemoryCommitPanel } from '../MemoryCommitPanel';
import { StatusBar } from '../StatusBar';
import { CanvasPanel } from '../CanvasPanel';
import { useCanvasMode } from '@/hooks/useCanvasMode';
import { motion, AnimatePresence } from 'framer-motion';
import { PerformanceMetrics } from '../PerformanceMetrics';
import { SettingsPanel } from '../SettingsPanel';
import { Cog, BarChart2 } from 'lucide-react';
import { Button } from '../ui/button';

export function LayoutRightSidebar() {
  console.log('[DEBUG] LayoutRightSidebar mounted');
  const { isCanvasMode } = useCanvasMode();
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [isMetricsOpen, setIsMetricsOpen] = React.useState(false);

  return (
    <div className="flex">
      <div className="fixed top-20 right-0 w-10 flex flex-col items-center space-y-2 p-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsSettingsOpen(!isSettingsOpen)}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <Cog className="w-3 h-3" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsMetricsOpen(!isMetricsOpen)}
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
        >
          <BarChart2 className="w-3 h-3" />
        </Button>
      </div>

      <AnimatePresence>
        {(isSettingsOpen || isMetricsOpen || isCanvasMode) && (
          <motion.aside
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="w-80 bg-white/5 backdrop-blur-md border-l border-white/10 shadow-inner overflow-y-auto"
          >
            <div className="p-4 space-y-4">
              <AnimatePresence>
                {isCanvasMode && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CanvasPanel />
                  </motion.div>
                )}
              </AnimatePresence>
              {isSettingsOpen && <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />}
              {isMetricsOpen && <PerformanceMetrics />}
              <MemoryCommitPanel />
              <StatusBar />
              <div className="rounded-lg p-2 text-xs text-gray-500 dark:text-gray-400 border border-white/10">
                Coming soon: <span className="italic">Visual Memory Map</span>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
} 