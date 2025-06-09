#!/bin/bash

set -e

cd renderer || { echo "Renderer folder not found."; exit 1; }

LOG_FILE="renderer-js-cleanup-log.txt"
> $LOG_FILE

echo "🔧 Starting renderer JavaScript-only cleanup..." | tee -a $LOG_FILE

# === Backup package.json
cp package.json package.json.bak
echo "📦 Backed up package.json → package.json.bak" | tee -a $LOG_FILE

# === Remove TypeScript dependencies from package.json
echo "📦 Removing TypeScript-related dependencies..." | tee -a $LOG_FILE
jq 'del(
  .devDependencies.typescript,
  .devDependencies["@types/node"],
  .devDependencies["@types/react"],
  .devDependencies["@types/react-dom"],
  .devDependencies["@types/react-syntax-highlighter"],
  .devDependencies["@typescript-eslint/eslint-plugin"],
  .devDependencies["@typescript-eslint/parser"],
  .devDependencies["eslint-plugin-react-refresh"]
) |
  del(.dependencies["@electron-app/types"]) |
  .scripts |= with_entries(select(.key != "lint" and .key != "test" and .key != "test:coverage"))
' package.json > package-cleaned.json && mv package-cleaned.json package.json

echo "✅ package.json updated." | tee -a $LOG_FILE

# === Delete TypeScript source/config files
echo "🧹 Deleting .ts, .tsx, .d.ts, and TS config files..." | tee -a $LOG_FILE
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.d.ts" \) -print -delete >> $LOG_FILE
rm -f tsconfig.json tsconfig.*.json vitest.config.ts >> $LOG_FILE 2>&1

# === Rename vite.config.ts to .js if exists
if [ -f vite.config.ts ]; then
  mv vite.config.ts vite.config.js
  echo "🛠 Renamed vite.config.ts → vite.config.js" | tee -a $LOG_FILE
fi

echo ""
echo "🎯 Renderer is now JavaScript-only. See $LOG_FILE for details." | tee -a $LOG_FILE