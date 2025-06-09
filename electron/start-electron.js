// Enable debugging
const DEBUG_NAMESPACES = 'electron:*,vite:*';
process.env.DEBUG = process.env.DEBUG || DEBUG_NAMESPACES;

// Improved error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('FATAL: Uncaught exception in main process:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('FATAL: Unhandled promise rejection in main process:', reason);
});

// Import and run the main application
require('./main');