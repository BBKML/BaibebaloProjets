import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.{js,jsx}'],
    globals: true,
  },
  server: {
    port: 5173, // Port différent du backend
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://192.168.1.11:5000', // En dev réseau : définir VITE_BACKEND_URL dans .env (IP affichée au démarrage du backend)
        changeOrigin: true,
        secure: false,
        ws: true, // Pour WebSocket si nécessaire
      },
    },
  },
})
