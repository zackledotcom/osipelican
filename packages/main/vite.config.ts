import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      formats: ['cjs'],
      fileName: () => 'index.js',
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
        entryFileNames: 'index.js',
      },
    },
    target: 'node16',
  },
}); 