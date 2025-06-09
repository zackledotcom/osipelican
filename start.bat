@echo off
echo Starting osiPelican Electron App...
echo.

REM Check if renderer dependencies are installed
if not exist "renderer\node_modules" (
    echo Installing renderer dependencies...
    cd renderer
    call npm install
    cd ..
)

REM Check if main dependencies are installed
if not exist "node_modules" (
    echo Installing main dependencies...
    call npm install
)

echo Starting development servers...
set NODE_ENV=development

REM Start both processes
start /B cmd /c "cd renderer && npm run dev"

REM Wait a bit for Vite to start
echo Waiting for Vite to start...
timeout /t 5 /nobreak > nul

REM Start Electron
electron .

pause
