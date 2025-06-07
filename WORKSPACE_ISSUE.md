# Workspace Protocol Issue in HelloGPT

## Problem

When running `npm install` or `./dev-start.sh`, you might encounter the following error:

```
npm error code EUNSUPPORTEDPROTOCOL
npm error Unsupported URL Type "workspace:": workspace:*
```

This happens because the project uses the `workspace:*` protocol in some package.json files, which is not supported by all npm versions.

## Solutions

### Option 1: Run the Fix Script

We've created a script to automatically fix workspace dependencies:

```bash
# Make the script executable
chmod +x fix-workspace-deps.sh

# Run the script
./fix-workspace-deps.sh
```

This script will replace `workspace:*` references with `file:` paths, which are supported by all npm versions.

### Option 2: Update npm

Ensure you're using a recent version of npm that supports workspace protocol:

```bash
npm install -g npm@latest
```

### Option 3: Use Yarn or pnpm

Both Yarn and pnpm have better workspace support out of the box:

For Yarn:
```bash
npm install -g yarn
yarn install
```

For pnpm:
```bash
npm install -g pnpm
pnpm install
```

### Option 4: Manual Fix

If the automatic fix doesn't work, you can manually edit the package.json files to replace `workspace:*` with the appropriate `file:` paths:

1. In `renderer/package.json`:
   - Replace `"@electron-app/types": "workspace:*"` with `"@electron-app/types": "file:../electron-app/src/types"`

2. In other package.json files:
   - Replace `"@app/shared": "workspace:*"` with `"@app/shared": "file:../packages/shared"`

## After Fixing

After applying one of these solutions, you should be able to run:

```bash
./dev-start.sh
```

And the application should start without workspace protocol errors.

## Technical Details

The workspace protocol (`workspace:*`) is a feature used in monorepos to reference local packages. It's supported by Yarn and pnpm by default, but npm requires specific configuration and a recent version.

The fix script replaces these references with `file:` paths, which point directly to the local package directories and are supported by all package managers.
