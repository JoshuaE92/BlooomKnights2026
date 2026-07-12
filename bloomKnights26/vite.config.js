import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In dev, proxy /api/* to the backend so the browser sees same-origin
// (no CORS). Defaults to the local backend; set VITE_API_TARGET to point
// elsewhere (e.g. https://bloomknights2026.onrender.com).
const API_TARGET = process.env.VITE_API_TARGET || 'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: API_TARGET.startsWith('https'),
      },
    },
  },
})
