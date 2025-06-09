#!/bin/bash

set -e

LOG_FILE="structure-migration-log.txt"
> $LOG_FILE

echo "🔁 Starting full project structure migration..." | tee -a $LOG_FILE

mkdir -p electron/ipc
mkdir -p renderer
mkdir -p scripts

# === Move Electron main and preload ===
if [ -f electron-app/src/main.js ]; then
  mv electron-app/src/main.js electron/main.js
  echo "✅ Moved main.js → electron/main.js" | tee -a $LOG_FILE
fi

if [ -f electron-app/src/preload.js ]; then
  mv electron-app/src/preload.js electron/preload.js
  echo "✅ Moved preload.js → electron/preload.js" | tee -a $LOG_FILE
fi

# === Move IPC files ===
if [ -d electron-app/src/ipc ]; then
  mv electron-app/src/ipc/* electron/ipc/
  echo "✅ Moved all IPC modules → electron/ipc/" | tee -a $LOG_FILE
fi

# === Move renderer Vite entry files ===
if [ -f electron-app/renderer/index.html ]; then
  mv electron-app/renderer/index.html renderer/index.html
  echo "✅ Moved index.html → renderer/index.html" | tee -a $LOG_FILE
fi

if [ -f electron-app/renderer/main.js ]; then
  mv electron-app/renderer/main.js renderer/main.js
  echo "✅ Moved main.js → renderer/main.js" | tee -a $LOG_FILE
fi

# === Delete legacy electron-app folder if emptied ===
if [ -d electron-app ]; then
  rm -rf electron-app
  echo "✅ Removed legacy electron-app directory" | tee -a $LOG_FILE
fi

# === Remove TypeScript files and configs ===
echo "" | tee -a $LOG_FILE
echo "🧹 Removing TypeScript files..." | tee -a $LOG_FILE
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.d.ts" \) -print -delete >> $LOG_FILE
find . -type f -name "tsconfig*.json" -print -delete >> $LOG_FILE
echo "✅ TypeScript files and configs removed." | tee -a $LOG_FILE

# === Fix package.json "main" field ===
echo "" | tee -a $LOG_FILE
echo "🛠 Updating package.json main entry..." | tee -a $LOG_FILE
if grep -q '"main":' package.json; then
  sed -i.bak 's|"main": *".*"|"main": "electron/main.js"|' package.json
  echo "✅ Updated package.json main field to electron/main.js" | tee -a $LOG_FILE
else
  echo "⚠️  No 'main' field found in package.json — please verify manually" | tee -a $LOG_FILE
fi

# === Warn if Electron not in dependencies ===
if ! grep -q '"electron"' package.json; then
  echo "⚠️  Electron not found in package.json — run: npm install electron --save-dev" | tee -a $LOG_FILE
fi

# === Check start.sh ===
if [ -f start.sh ] && ! grep -q "electron ." start.sh; then
  echo "⚠️  start.sh may not point to the correct Electron entry — ensure it runs: electron ." | tee -a $LOG_FILE
fi

echo "" | tee -a $LOG_FILE
echo "🎯 Migration complete. Review $LOG_FILE for moved/deleted files." | tee -a $LOG_FILE