import React from 'react';

export function MemoryHealthIndicator() {
  console.log('[DEBUG] MemoryHealthIndicator mounting');
  return (
    <div className="bg-red-500/30 p-4 rounded">
      MemoryHealthIndicator ✅
    </div>
  );
} 