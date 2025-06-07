import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src')
        }
    },
    build: {
        outDir: 'dist',
        emptyOutDir: true,
        // Ensure CSS is output as separate files
        cssCodeSplit: true,
        // Configure rollup options for better CSS handling
        rollupOptions: {
            output: {
                // Configure asset file names
                assetFileNames: function (assetInfo) {
                    var name = assetInfo.name || '';
                    if (/\.(css|scss|sass|less|styl)$/.test(name)) {
                        return "assets/css/[name]-[hash][extname]";
                    }
                    return "assets/[name]-[hash][extname]";
                },
                // Configure chunk file names
                chunkFileNames: 'assets/js/[name]-[hash].js',
                // Configure entry file names
                entryFileNames: 'assets/js/[name]-[hash].js',
            }
        }
    },
    // Configure CSS options
    css: {
        // Ensure CSS modules work correctly
        modules: {
            localsConvention: 'camelCase',
            generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
        // Ensure CSS is extracted
        devSourcemap: true,
        // Use postcss for processing
        postcss: './postcss.config.js',
    },
    server: {
        port: 5173,
        strictPort: true
    },
    base: process.env.NODE_ENV === 'development' ? '/' : './'
});
