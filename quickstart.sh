#!/bin/bash

echo "🚀 Quick start for osiPelican..."

# Copy preload to dist
echo "Setting up preload script..."
mkdir -p electron-app/dist/preload
cp electron-app/src/preload/index.js electron-app/dist/preload/

# Use the simpler main.js from src for now
echo "Using simplified main process..."

# Update package.json to use src/main.js temporarily
sed -i.bak 's|"main": "electron-app/dist/main.js"|"main": "src/main.js"|' package.json

# Start the app
echo "Starting app..."
npm start

# Restore package.json
mv package.json.bak package.json
