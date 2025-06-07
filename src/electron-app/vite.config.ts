import { defineConfig } from 'vite';
import electronVite from 'electron-vite';

export default defineConfig({
  plugins: [electronVite.default ? electronVite.default() : electronVite()],
  build: {
    rollupOptions: {
      input: {
        main: 'packages/main/src/index.ts',
        renderer: 'packages/renderer/src/main.tsx',
      },
    },
  },
});
