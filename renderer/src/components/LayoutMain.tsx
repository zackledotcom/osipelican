import React from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { ChatUI } from '../components/ChatUI';

export const LayoutMain: React.FC = () => {
  return (
    <main className="flex-1 overflow-hidden">
      <ErrorBoundary>
        <ChatUI />
      </ErrorBoundary>
    </main>
  );
};

export default LayoutMain;
