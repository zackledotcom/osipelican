import React from 'react';

export default function AppHeader() {
  console.log('[DEBUG] AppHeader mounting');
  return (
    <div className="bg-blue-500/20 p-4 w-full">
      <div className="bg-blue-500/30 p-4 rounded">
        AppHeader ✅
      </div>
    </div>
  );
} 