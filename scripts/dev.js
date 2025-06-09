const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

let viteProcess;
let electronProcess;

// Check if port is available
function checkPort(port, callback) {
  const options = {
    host: 'localhost',
    port: port,
    timeout: 2000
  };

  const req = http.request(options, (res) => {
    callback(true);
  });

  req.on('error', () => {
    callback(false);
  });

  req.end();
}

// Wait for Vite to be ready
function waitForVite(callback) {
  const checkInterval = setInterval(() => {
    checkPort(5173, (isReady) => {
      if (isReady) {
        clearInterval(checkInterval);
        callback();
      }
    });
  }, 1000);
}

// Start Vite dev server
function startVite() {
  console.log(`${colors.magenta}[Vite]${colors.reset} Starting development server...`);
  
  viteProcess = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '../renderer'),
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  viteProcess.stdout.on('data', (data) => {
    console.log(`${colors.magenta}[Vite]${colors.reset} ${data.toString().trim()}`);
  });

  viteProcess.stderr.on('data', (data) => {
    console.error(`${colors.red}[Vite Error]${colors.reset} ${data.toString().trim()}`);
  });

  viteProcess.on('close', (code) => {
    console.log(`${colors.magenta}[Vite]${colors.reset} Process exited with code ${code}`);
  });
}

// Start Electron
function startElectron() {
  console.log(`${colors.cyan}[Electron]${colors.reset} Starting application...`);
  
  electronProcess = spawn('electron', ['.'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'development' }
  });

  electronProcess.stdout.on('data', (data) => {
    console.log(`${colors.cyan}[Electron]${colors.reset} ${data.toString().trim()}`);
  });

  electronProcess.stderr.on('data', (data) => {
    // Filter out common Electron warnings
    const message = data.toString().trim();
    if (!message.includes('Autofill.enable') && !message.includes('Autofill.setAddresses')) {
      console.error(`${colors.red}[Electron Error]${colors.reset} ${message}`);
    }
  });

  electronProcess.on('close', (code) => {
    console.log(`${colors.cyan}[Electron]${colors.reset} Process exited with code ${code}`);
    cleanup();
  });
}

// Cleanup function
function cleanup() {
  console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);
  
  if (viteProcess && !viteProcess.killed) {
    viteProcess.kill();
  }
  
  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }
  
  process.exit();
}

// Handle exit signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Main execution
console.log(`${colors.green}🚀 Starting osiPelican Development Environment${colors.reset}\n`);

// Start Vite first
startVite();

// Wait for Vite to be ready, then start Electron
console.log(`${colors.yellow}Waiting for Vite to be ready...${colors.reset}`);
waitForVite(() => {
  console.log(`${colors.green}✓ Vite is ready!${colors.reset}\n`);
  startElectron();
  console.log(`\n${colors.green}✓ Development environment is running!${colors.reset}`);
  console.log(`${colors.yellow}Press Ctrl+C to stop${colors.reset}\n`);
});
