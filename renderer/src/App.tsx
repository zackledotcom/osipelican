import React from 'react';
import { ChatInterface } from './components/chat/ChatInterface';
import { ThemeProvider } from './contexts/ThemeContext';
import { ChatProvider } from './contexts/ChatContext';

function App() {
  return (
    <ThemeProvider>
      <ChatProvider>
        <div className="h-screen flex flex-col bg-background">
          <ChatInterface />
        </div>
      </ChatProvider>
    </ThemeProvider>
  );
}

export default App;
