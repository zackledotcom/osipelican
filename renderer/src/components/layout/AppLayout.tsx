import React from 'react';
import { LayoutHeader } from './LayoutHeader';
import { LayoutLeftSidebar } from './LayoutLeftSidebar';
import { LayoutRightSidebar } from './LayoutRightSidebar';
import { ChatUI } from '../chat/ChatUI';
import { ErrorBoundary } from '../ErrorBoundary';

export function AppLayout() {
  console.log('[DEBUG] AppLayout is rendering');

  return (
    <>
      <div className="flex h-screen bg-background">
        <ErrorBoundary>
          <LayoutLeftSidebar />
        </ErrorBoundary>
        <main className="flex-1 flex flex-col">
          <ErrorBoundary>
            <LayoutHeader />
          </ErrorBoundary>
          <div className="flex-1 overflow-hidden">
            <ErrorBoundary>
              <ChatUI />
            </ErrorBoundary>
          </div>
        </main>
        <ErrorBoundary>
          <LayoutRightSidebar />
        </ErrorBoundary>
      </div>
    </>
  );
} 