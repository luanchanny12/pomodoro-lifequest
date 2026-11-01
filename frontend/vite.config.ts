import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  // @ts-ignore
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/__tests__/setup.ts',
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/')
          if (
            normalized.includes('preload-helper') ||
            normalized.includes('vite/') ||
            normalized.includes('commonjsHelpers')
          ) {
            return 'vendor'
          }
          if (normalized.includes('/node_modules/')) {
            // Core common utilities must be in vendor so other chunks don't hold them hostage
            if (
              normalized.includes('/react/') ||
              normalized.includes('/react-dom/') ||
              normalized.includes('/react-router-dom/') ||
              normalized.includes('/scheduler/') ||
              normalized.includes('/clsx/') ||
              normalized.includes('/tailwind-merge/') ||
              normalized.includes('/class-variance-authority/') ||
              normalized.includes('/@babel/runtime/') ||
              normalized.includes('/tslib/') ||
              normalized.includes('vite/') ||
              normalized.includes('commonjsHelpers')
            ) {
              return 'vendor'
            }
            // Only purely 3D modules go to three
            if (
              normalized.includes('/three/') ||
              normalized.includes('/@react-three/') ||
              normalized.includes('/three-stdlib/') ||
              normalized.includes('/stats.js/')
            ) {
              return 'three'
            }
            // Only purely recharts modules go to charts
            if (
              normalized.includes('/recharts/') ||
              normalized.includes('/recharts-scale/') ||
              normalized.includes('/victory-vendor/') ||
              normalized.includes('/d3-')
            ) {
              return 'charts'
            }
            if (normalized.includes('/@tanstack/')) {
              return 'query'
            }
            if (normalized.includes('/framer-motion/')) {
              return 'motion'
            }
            if (
              normalized.includes('/lucide-react/') ||
              normalized.includes('/sonner/') ||
              normalized.includes('/date-fns/')
            ) {
              return 'ui'
            }
          }
        },
      },
    },
  },
})
