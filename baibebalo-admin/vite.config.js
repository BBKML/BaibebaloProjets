import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Port différent du backend
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:5000', // Backend sur port 5000
        changeOrigin: true,
        secure: false,
        ws: true, // Pour WebSocket si nécessaire
      },
    },
  },
})
