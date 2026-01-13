import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from "path"

import { nodePolyfills } from 'vite-plugin-node-polyfills';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Enable polyfills for specific modules
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Polyfill specific Node.js modules
      protocolImports: true,
    }),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['simple-peer'],
  },
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      util: 'util',
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
