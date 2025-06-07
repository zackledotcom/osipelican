#!/usr/bin/env node

/**
 * This script analyzes all package.json files in the project and generates a report
 * of duplicate dependencies with different versions, helping to consolidate them.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Paths to check for package.json files
const rootDir = path.resolve(__dirname, '..');
const packageJsonPaths = [
  path.join(rootDir, 'package.json'),
  path.join(rootDir, 'electron-app', 'package.json'),
  path.join(rootDir, 'renderer', 'package.json'),
];

// Additional paths that might contain package.json files
const additionalDirs = [
  path.join(rootDir, 'packages'),
];

// Find all package.json files in additional directories
additionalDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const subdirs = fs.readdirSync(dir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(dir, dirent.name));
    
    subdirs.forEach(subdir => {
      const packageJsonPath = path.join(subdir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        packageJsonPaths.push(packageJsonPath);
      }
    });
  }
});

// Store all dependencies
const allDependencies = {};
const packageNames = {};

// Read all package.json files and collect dependencies
packageJsonPaths.forEach(packageJsonPath => {
  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const packageName = packageJson.name || path.relative(rootDir, packageJsonPath);
      packageNames[packageJsonPath] = packageName;
      
      // Process dependencies
      ['dependencies', 'devDependencies'].forEach(depType => {
        if (packageJson[depType]) {
          Object.entries(packageJson[depType]).forEach(([dep, version]) => {
            if (!allDependencies[dep]) {
              allDependencies[dep] = [];
            }
            allDependencies[dep].push({
              package: packageName,
              path: packageJsonPath,
              version,
              type: depType
            });
          });
        }
      });
    } catch (error) {
      console.error(`Error processing ${packageJsonPath}:`, error.message);
    }
  }
});

// Find duplicates with different versions
const duplicatesWithDifferentVersions = {};
Object.entries(allDependencies).forEach(([dep, instances]) => {
  const versions = new Set(instances.map(i => i.version));
  if (versions.size > 1) {
    duplicatesWithDifferentVersions[dep] = instances;
  }
});

// Generate report
console.log('# Dependency Consolidation Report\n');
console.log('## Packages Analyzed\n');
Object.entries(packageNames).forEach(([path, name]) => {
  console.log(`- ${name} (${path})`);
});

console.log('\n## Dependencies with Different Versions\n');
if (Object.keys(duplicatesWithDifferentVersions).length === 0) {
  console.log('No dependencies with different versions found. Great job!');
} else {
  Object.entries(duplicatesWithDifferentVersions).forEach(([dep, instances]) => {
    console.log(`### ${dep}\n`);
    instances.forEach(instance => {
      console.log(`- ${instance.package}: ${instance.version} (${instance.type})`);
    });
    
    // Recommend latest version
    const versions = instances.map(i => i.version.replace(/[^0-9.]/g, ''));
    const latestVersion = versions.sort((a, b) => {
      const aParts = a.split('.').map(Number);
      const bParts = b.split('.').map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const aPart = aParts[i] || 0;
        const bPart = bParts[i] || 0;
        if (aPart !== bPart) {
          return bPart - aPart;
        }
      }
      return 0;
    })[0];
    
    console.log(`\nRecommended version: ${latestVersion}\n`);
  });
}

// Save report to file
const reportPath = path.join(rootDir, 'dependency-report.md');
fs.writeFileSync(reportPath, 
  `# Dependency Consolidation Report

## Packages Analyzed

${Object.entries(packageNames).map(([path, name]) => `- ${name} (${path})`).join('\n')}

## Dependencies with Different Versions

${Object.keys(duplicatesWithDifferentVersions).length === 0 ? 
  'No dependencies with different versions found. Great job!' : 
  Object.entries(duplicatesWithDifferentVersions).map(([dep, instances]) => 
    `### ${dep}\n\n${instances.map(instance => 
      `- ${instance.package}: ${instance.version} (${instance.type})`
    ).join('\n')}\n\nRecommended version: ${
      instances.map(i => i.version.replace(/[^0-9.]/g, '')).sort((a, b) => {
        const aParts = a.split('.').map(Number);
        const bParts = b.split('.').map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aPart = aParts[i] || 0;
          const bPart = bParts[i] || 0;
          if (aPart !== bPart) {
            return bPart - aPart;
          }
        }
        return 0;
      })[0]
    }`
  ).join('\n\n')
}`
);

console.log(`\nReport saved to ${reportPath}`);

// Make the script executable
try {
  execSync(`chmod +x "${path.join(__dirname, 'consolidate-dependencies.js')}"`);
} catch (error) {
  console.error('Failed to make script executable:', error.message);
}
