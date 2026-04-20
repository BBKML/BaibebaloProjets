import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // ================================
  // TESTS
  // ================================
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    globals: true,
  },

  // ================================
  // SERVEUR DEV
  // ================================
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://192.168.1.11:5000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
    },
    // ✅ Nécessaire pour que React Router fonctionne en dev
    historyApiFallback: true,
  },

  // ================================
  // BUILD PRODUCTION
  // ================================
  build: {
    outDir: 'dist',
    // ✅ Vide le dossier dist avant chaque build
    emptyOutDir: true,
  },

  // ================================
  // PREVIEW (vite preview)
  // ================================
  preview: {
    port: 5173,
    // ✅ Nécessaire pour que React Router fonctionne avec vite preview
    historyApiFallback: true,
  },
})
