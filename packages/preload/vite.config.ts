import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/exposed.ts'),
      formats: ['cjs'],
      fileName: () => 'exposed.js',
    },
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    sourcemap: true,
    rollupOptions: {
      external: [
        'electron',
        ...require('module').builtinModules,
      ],
      output: {
        entryFileNames: 'exposed.js',
      },
    },
    target: 'node16',
  },
}); 