import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, proxy /api/* to the backend so the browser sees same-origin
// (no CORS). Override the target with VITE_API_TARGET if you run the
// backend locally (e.g. http://localhost:5050).
const API_TARGET = process.env.VITE_API_TARGET || 'https://bloomknights2026.onrender.com'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
