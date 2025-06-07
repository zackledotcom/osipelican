import React from 'react';
import AppHeaderDebug from './AppHeaderDebug';

export default function AppLayoutDebug() {
  console.log('[DEBUG] AppLayout mounted');

  return (
    <div className="h-screen w-screen bg-black text-white flex overflow-hidden">
      <div className="w-64 bg-red-600 flex items-center justify-center text-lg font-bold">
        LeftSidebar ✅
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AppHeaderDebug />

        <main className="flex-1 overflow-y-auto bg-gray-900 flex items-center justify-center text-lg font-bold">
          ChatUI ✅
        </main>

        <div className="h-12 bg-green-600 flex items-center justify-center text-sm">
          ServiceStatusManager ✅
        </div>
      </div>

      <div className="w-64 bg-yellow-400 flex items-center justify-center text-lg font-bold text-black">
        RightSidebar ✅
      </div>
    </div>
  );
} 