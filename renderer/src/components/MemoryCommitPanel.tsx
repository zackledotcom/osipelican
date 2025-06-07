import React, { useState } from 'react';
import { Save, X, Clock, Tag, Loader2 } from 'lucide-react';
import { useCorrectionStore } from '../state/correctionStore';

export const MemoryCommitPanel: React.FC = () => {
  const { corrections, update, commit } = useCorrectionStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (corrections.length === 0) return null;

  const handleCommit = async () => {
    setIsLoading(true);
    try {
      await commit();
      setCommitMessage('');
      setIsExpanded(false);
    } catch (error) {
      console.error('Failed to commit:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white/90">Memory Commit</h2>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            disabled={isLoading}
          >
            {isExpanded ? (
              <X className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/80">
              Commit Message
            </label>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Describe what you want to remember..."
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-md
                text-white placeholder-white/50
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent
                transition-all resize-none"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-white/60">
            <Clock className="w-4 h-4" />
            <span>Last commit: 2 hours ago</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button 
              className="px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-300 
                border border-blue-500/20 hover:bg-blue-500/30 transition-colors
                flex items-center gap-1.5"
              disabled={isLoading}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Add Tag</span>
            </button>
            <button 
              className="px-3 py-1.5 rounded-full bg-white/5 text-white/80 
                border border-white/10 hover:bg-white/10 transition-colors"
              disabled={isLoading}
            >
              #context
            </button>
            <button 
              className="px-3 py-1.5 rounded-full bg-white/5 text-white/80 
                border border-white/10 hover:bg-white/10 transition-colors"
              disabled={isLoading}
            >
              #important
            </button>
          </div>

          <button 
            onClick={handleCommit}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg
              hover:bg-blue-500/30 border border-blue-500/20 transition-colors
              flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Committing...' : 'Commit to Memory'}</span>
          </button>
        </div>
      )}
    </div>
  );
}; 