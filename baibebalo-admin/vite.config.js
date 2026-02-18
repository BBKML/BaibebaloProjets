import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Port différent du backend
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://192.168.1.16:5000', // Backend (IP locale pour dev)
        changeOrigin: true,
        secure: false,
        ws: true, // Pour WebSocket si nécessaire
      },
    },
  },
})
