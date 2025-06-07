import React from 'react';

export default function AppHeaderDebug() {
  console.log('[DEBUG] AppHeader mounted');
  return (
    <div className="bg-pink-500 text-white p-4 text-center text-xl font-bold shadow-md">
      AppHeader ✅
    </div>
  );
} 