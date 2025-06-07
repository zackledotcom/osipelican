import React from 'react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '../contexts/ThemeContext';
import ErrorBoundary from './ErrorBoundary';
import AppHeader from './AppHeader';
import { LayoutLeftSidebar } from './LayoutLeftSidebar';
import { ChatUI } from './ChatUI';

export const AppLayout: React.FC = () => {
  console.log('[DEBUG] AppLayout mounting');
  
  return (
    <ThemeProvider>
      <Toaster position="top-right" />
      <div className="flex flex-col h-screen bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-900 dark:to-gray-800">
        <AppHeader />
        <div className="flex flex-1 overflow-hidden">
          <LayoutLeftSidebar />
          <main className="flex-1 overflow-hidden">
            <ErrorBoundary>
              <ChatUI />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
};

export default AppLayout; 