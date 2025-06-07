import React from 'react';
import { LayoutFooter } from './LayoutFooter';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <main className="flex-1">
        {children}
      </main>
      <LayoutFooter />
    </div>
  );
};

export default AppLayout;
