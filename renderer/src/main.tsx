import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { Toaster } from 'react-hot-toast';
import './styles/index.css';
import './styles/test.css'; // Import test CSS file to verify extraction

console.log('[DEBUG] main.tsx started');
const rootElement = document.getElementById('root');
console.log('[DEBUG] Root DOM:', rootElement);

if (!rootElement) {
  console.error('[ERROR] Root element not found!');
  throw new Error('Root element not found');
}

// Create a single root
const root = ReactDOM.createRoot(rootElement);

// Import ErrorBoundary
import { ErrorBoundary } from './components/ErrorBoundary';

// Render with error handling
try {
  console.log('[DEBUG] Attempting to render React app');
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <ThemeProvider>
          <App />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </ErrorBoundary>
    </React.StrictMode>
  );
  console.log('[DEBUG] React app rendered successfully');
} catch (error) {
  console.error('[ERROR] Failed to render React app:', error);
} 