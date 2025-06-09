const esbuild = require('esbuild');
const path = require('path');

esbuild.build({
  entryPoints: [path.resolve(__dirname, '../src/preload.ts')],
  bundle: true,
  platform: 'node',
  outfile: path.resolve(__dirname, '../dist/preload.js'),
  sourcemap: true,
  external: ['electron'],
}).catch(() => process.exit(1));
